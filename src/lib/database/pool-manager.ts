import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface PoolConfig {
  minConnections: number
  maxConnections: number
  connectionTimeout: number
  idleTimeout: number
  acquireTimeoutMillis: number
}

export interface PoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  healthyConnections: number
  primaryPoolSize: number
  replicaPoolSize: number
}

export interface ReadReplicaConfig {
  url: string
  serviceKey: string
  enabled: boolean
}

interface ConnectionEntry {
  client: SupabaseClient
  inUse: boolean
  lastUsed: number
  created: number
  queryCount: number
  isHealthy: boolean
  lastHealthCheck: number
  pool: 'primary' | 'replica'
}

interface WaitingRequest {
  resolve: (client: SupabaseClient) => void
  reject: (error: Error) => void
  timestamp: number
  prefersReplica: boolean
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  minConnections: parseInt(process.env.DB_POOL_MIN || '10', 10),
  maxConnections: parseInt(process.env.DB_POOL_MAX || '100', 10),
  connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10),
  idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '3000', 10)
}

export class PoolManager {
  private static instance: PoolManager | null = null
  private config: PoolConfig
  private primaryPool: ConnectionEntry[] = []
  private replicaPool: ConnectionEntry[] = []
  private waitingQueue: WaitingRequest[] = []
  private maintenanceInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private isShuttingDown = false
  private supabaseUrl: string
  private supabaseKey: string
  private replicaConfig: ReadReplicaConfig | null = null
  private queryTimeout: number

  private constructor(config: Partial<PoolConfig> = {}, queryTimeout: number = 10000) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    this.queryTimeout = queryTimeout
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    this.initializeReplicaConfig()
    this.initializePools()
    this.startMaintenance()
    this.startHealthChecks()
  }

  static getInstance(config?: Partial<PoolConfig>, queryTimeout?: number): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager(config, queryTimeout)
    }
    return PoolManager.instance
  }

  private initializeReplicaConfig(): void {
    const replicaUrl = process.env.SUPABASE_REPLICA_URL
    const replicaKey = process.env.SUPABASE_REPLICA_SERVICE_KEY
    const poolerUrl = process.env.SUPABASE_POOLER_URL

    if (poolerUrl) {
      this.replicaConfig = {
        url: poolerUrl,
        serviceKey: this.supabaseKey,
        enabled: true
      }
    } else if (replicaUrl && replicaKey) {
      this.replicaConfig = {
        url: replicaUrl,
        serviceKey: replicaKey,
        enabled: true
      }
    }
  }

  private initializePools(): void {
    const primaryMin = Math.max(1, Math.floor(this.config.minConnections * 0.7))
    const replicaMin = this.replicaConfig?.enabled
      ? Math.max(1, Math.floor(this.config.minConnections * 0.3))
      : 0

    for (let i = 0; i < primaryMin; i++) {
      this.primaryPool.push(this.createConnectionEntry('primary'))
    }

    for (let i = 0; i < replicaMin; i++) {
      this.replicaPool.push(this.createConnectionEntry('replica'))
    }

    console.log(
      `[PoolManager] Initialized pools: ${this.primaryPool.length} primary, ${this.replicaPool.length} replica`
    )
  }

  private createConnectionEntry(pool: 'primary' | 'replica'): ConnectionEntry {
    const client =
      pool === 'replica' && this.replicaConfig?.enabled
        ? this.createReplicaClient()
        : this.createPrimaryClient()

    return {
      client,
      inUse: false,
      lastUsed: Date.now(),
      created: Date.now(),
      queryCount: 0,
      isHealthy: true,
      lastHealthCheck: Date.now(),
      pool
    }
  }

  private createPrimaryClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseKey)
  }

  private createReplicaClient(): SupabaseClient {
    if (!this.replicaConfig?.enabled) {
      return this.createPrimaryClient()
    }

    return createClient(this.replicaConfig.url, this.replicaConfig.serviceKey)
  }

  async acquire(preferReplica: boolean = false): Promise<SupabaseClient> {
    if (this.isShuttingDown) {
      throw new Error('PoolManager is shutting down')
    }

    const targetPool =
      preferReplica && this.replicaConfig?.enabled ? this.replicaPool : this.primaryPool
    const fallbackPool = preferReplica ? this.primaryPool : this.replicaPool

    const availableConnection = targetPool.find(conn => !conn.inUse && conn.isHealthy)

    if (availableConnection) {
      return this.activateConnection(availableConnection)
    }

    if (preferReplica && this.replicaConfig?.enabled) {
      const fallbackConnection = fallbackPool.find(conn => !conn.inUse && conn.isHealthy)
      if (fallbackConnection) {
        return this.activateConnection(fallbackConnection)
      }
    }

    const totalConnections = this.primaryPool.length + this.replicaPool.length
    if (totalConnections < this.config.maxConnections) {
      const pool =
        this.replicaConfig?.enabled && preferReplica ? this.replicaPool : this.primaryPool
      const newEntry = this.createConnectionEntry(pool === this.replicaPool ? 'replica' : 'primary')
      pool.push(newEntry)
      return this.activateConnection(newEntry)
    }

    return this.waitForConnection(preferReplica)
  }

  private activateConnection(entry: ConnectionEntry): SupabaseClient {
    entry.inUse = true
    entry.lastUsed = Date.now()
    entry.queryCount++
    return entry.client
  }

  private waitForConnection(preferReplica: boolean): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.waitingQueue.findIndex(r => r.resolve === resolve)
        if (index !== -1) {
          this.waitingQueue.splice(index, 1)
          reject(
            new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMillis}ms`)
          )
        }
      }, this.config.acquireTimeoutMillis)

      const request: WaitingRequest = {
        resolve: client => {
          clearTimeout(timeoutId)
          resolve(client)
        },
        reject: error => {
          clearTimeout(timeoutId)
          reject(error)
        },
        timestamp: Date.now(),
        prefersReplica: preferReplica
      }

      this.waitingQueue.push(request)
    })
  }

  release(client: SupabaseClient): void {
    const entry = this.findConnectionEntry(client)
    if (!entry) {
      return
    }

    entry.inUse = false
    entry.lastUsed = Date.now()

    if (this.waitingQueue.length > 0) {
      const nextRequest = this.waitingQueue.shift()
      if (nextRequest) {
        this.activateConnection(entry)
        nextRequest.resolve(entry.client)
      }
    }
  }

  private findConnectionEntry(client: SupabaseClient): ConnectionEntry | undefined {
    return (
      this.primaryPool.find(e => e.client === client) ||
      this.replicaPool.find(e => e.client === client)
    )
  }

  async healthCheck(): Promise<{
    healthy: boolean
    primaryHealthy: number
    replicaHealthy: number
    details: string[]
  }> {
    const details: string[] = []
    let primaryHealthy = 0
    let replicaHealthy = 0

    for (const entry of this.primaryPool) {
      const isHealthy = await this.checkConnectionHealth(entry)
      entry.isHealthy = isHealthy
      entry.lastHealthCheck = Date.now()
      if (isHealthy) {
        primaryHealthy++
      }
    }

    for (const entry of this.replicaPool) {
      const isHealthy = await this.checkConnectionHealth(entry)
      entry.isHealthy = isHealthy
      entry.lastHealthCheck = Date.now()
      if (isHealthy) {
        replicaHealthy++
      }
    }

    if (primaryHealthy === 0) {
      details.push('CRITICAL: No healthy primary connections')
    }

    if (this.replicaConfig?.enabled && replicaHealthy === 0) {
      details.push('WARNING: No healthy replica connections')
    }

    return {
      healthy: primaryHealthy > 0,
      primaryHealthy,
      replicaHealthy,
      details
    }
  }

  private async checkConnectionHealth(entry: ConnectionEntry): Promise<boolean> {
    try {
      const result = await entry.client.from('_health_check').select('1').limit(1).maybeSingle()
      return !result.error || result.error.code === '42P01'
    } catch {
      return false
    }
  }

  getStats(): PoolStats {
    const allConnections = [...this.primaryPool, ...this.replicaPool]

    return {
      totalConnections: allConnections.length,
      activeConnections: allConnections.filter(c => c.inUse).length,
      idleConnections: allConnections.filter(c => !c.inUse).length,
      waitingRequests: this.waitingQueue.length,
      healthyConnections: allConnections.filter(c => c.isHealthy).length,
      primaryPoolSize: this.primaryPool.length,
      replicaPoolSize: this.replicaPool.length
    }
  }

  private startMaintenance(): void {
    this.maintenanceInterval = setInterval(() => {
      this.maintainPools()
    }, 60000)
  }

  private maintainPools(): void {
    const now = Date.now()

    this.maintainPool(this.primaryPool, now, 'primary')

    if (this.replicaConfig?.enabled) {
      this.maintainPool(this.replicaPool, now, 'replica')
    }

    this.cleanupWaitingQueue(now)
  }

  private maintainPool(
    pool: ConnectionEntry[],
    now: number,
    poolName: 'primary' | 'replica'
  ): void {
    const minSize =
      poolName === 'primary'
        ? Math.floor(this.config.minConnections * 0.7)
        : Math.floor(this.config.minConnections * 0.3)

    for (let i = pool.length - 1; i >= 0; i--) {
      const entry = pool[i]
      if (!entry) {
        continue
      }

      if (!entry.inUse && now - entry.lastUsed > this.config.idleTimeout) {
        if (pool.length > minSize) {
          pool.splice(i, 1)
        }
      }
    }

    while (pool.length < minSize) {
      pool.push(this.createConnectionEntry(poolName))
    }
  }

  private cleanupWaitingQueue(now: number): void {
    const maxWait = this.config.acquireTimeoutMillis * 2
    for (let i = this.waitingQueue.length - 1; i >= 0; i--) {
      const request = this.waitingQueue[i]
      if (request && now - request.timestamp > maxWait) {
        this.waitingQueue.splice(i, 1)
        request.reject(new Error('Request expired'))
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck()
    }, 30000)
  }

  async drain(): Promise<void> {
    this.isShuttingDown = true

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
      this.maintenanceInterval = null
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    for (const request of this.waitingQueue) {
      request.reject(new Error('Pool is draining'))
    }
    this.waitingQueue = []

    const allConnections = [...this.primaryPool, ...this.replicaPool]
    await Promise.allSettled(
      allConnections.map(async entry => {
        if (entry.inUse) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      })
    )

    this.primaryPool = []
    this.replicaPool = []
    PoolManager.instance = null

    console.log('[PoolManager] Pool drained and shutdown complete')
  }

  getPrimaryClient(): SupabaseClient {
    const entry = this.primaryPool[0]
    return entry?.client ?? this.createPrimaryClient()
  }

  getReplicaClient(): SupabaseClient | null {
    if (!this.replicaConfig?.enabled) {
      return null
    }
    const entry = this.replicaPool[0]
    return entry?.client ?? null
  }

  hasReplica(): boolean {
    return this.replicaConfig?.enabled ?? false
  }
}

export const poolManager = PoolManager.getInstance()

export function getPoolStats(): PoolStats {
  return poolManager.getStats()
}

export async function acquireConnection(preferReplica: boolean = false): Promise<SupabaseClient> {
  return poolManager.acquire(preferReplica)
}

export function releaseConnection(client: SupabaseClient): void {
  poolManager.release(client)
}

export default poolManager
