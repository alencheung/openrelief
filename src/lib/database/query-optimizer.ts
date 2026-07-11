import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { performanceMonitor } from '../performance/performance-monitor'
import {
  PoolManager,
  PoolConfig,
  PoolStats,
  getPoolStats,
  acquireConnection,
  releaseConnection
} from './pool-manager'

export interface QueryOptimizationConfig {
  enableConnectionPooling: boolean
  minConnections: number
  maxConnections: number
  connectionTimeout: number
  idleTimeout: number
  acquireTimeoutMillis: number
  queryTimeout: number
  enableQueryCache: boolean
  cacheTTL: number
  enableReadReplicas: boolean
  spatialIndexing: boolean
  materializedViews: boolean
}

interface QueryCacheEntry {
  query: string
  params: unknown[]
  result: unknown
  timestamp: number
  ttl: number
  hitCount: number
}

export interface QueryOptimizationResult {
  optimizedQuery: string
  optimizedParams: unknown[]
  strategy: 'index_scan' | 'sequential_scan' | 'bitmap_scan' | 'hash_join' | 'nested_loop'
  estimatedCost: number
  estimatedRows: number
  indexes: string[]
  cacheHit: boolean
}

export interface SpatialQueryOptimization {
  useSpatialIndex: boolean
  boundingBoxFilter: boolean
  clusteringOptimization: boolean
  partitionPruning: boolean
  parallelExecution: boolean
}

class DatabaseQueryOptimizer {
  private static instance: DatabaseQueryOptimizer
  private config: QueryOptimizationConfig
  private queryCache: Map<string, QueryCacheEntry> = new Map()
  private supabase: SupabaseClient
  private poolManager: PoolManager

  private constructor() {
    this.config = {
      enableConnectionPooling: true,
      minConnections: parseInt(process.env.DB_POOL_MIN || '10', 10),
      maxConnections: parseInt(process.env.DB_POOL_MAX || '100', 10),
      connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10),
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '3000', 10),
      queryTimeout: 10000,
      enableQueryCache: true,
      cacheTTL: 300000,
      enableReadReplicas: true,
      spatialIndexing: true,
      materializedViews: true
    }

    // Guard against missing env vars at build time (page data collection has
    // none). Use a placeholder client that will be replaced on first real use.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = url && key ? createClient(url, key) : (null as any)

    this.poolManager = PoolManager.getInstance(
      {
        minConnections: this.config.minConnections,
        maxConnections: this.config.maxConnections,
        connectionTimeout: this.config.connectionTimeout,
        idleTimeout: this.config.idleTimeout,
        acquireTimeoutMillis: this.config.acquireTimeoutMillis
      },
      this.config.queryTimeout
    )
  }

  static getInstance(): DatabaseQueryOptimizer {
    if (!DatabaseQueryOptimizer.instance) {
      DatabaseQueryOptimizer.instance = new DatabaseQueryOptimizer()
    }
    return DatabaseQueryOptimizer.instance
  }

  async executeQuery<T = unknown>(
    query: string,
    params: unknown[] = [],
    options: {
      useCache?: boolean
      useReadReplica?: boolean
      timeout?: number
      spatialOptimization?: SpatialQueryOptimization
    } = {}
  ): Promise<{ data: T | null; error: unknown; performance: unknown }> {
    const timerId = performanceMonitor.startTimer('database_query', {
      query_type: this.getQueryType(query),
      table_name: this.extractTableName(query)
    })

    try {
      if (options.useCache !== false && this.config.enableQueryCache) {
        const cachedResult = this.getFromCache(query, params) as T | null
        if (cachedResult !== null) {
          performanceMonitor.endTimer(timerId, 'database', 'database_query_execution_time', {
            cache_hit: 'true'
          })
          return {
            data: cachedResult,
            error: null,
            performance: { cacheHit: true, executionTime: 0 }
          }
        }
      }

      const connection = await this.getConnection(options.useReadReplica)

      try {
        const optimization = await this.optimizeQuery(query, params, options.spatialOptimization)
        const result = await this.executeWithTimeout<T>(
          connection,
          optimization.optimizedQuery,
          optimization.optimizedParams,
          options.timeout || this.config.queryTimeout
        )

        if (this.config.enableQueryCache && options.useCache !== false && result.data !== null) {
          this.setCache(query, params, result.data)
        }

        const stats = getPoolStats()
        const executionTime = performanceMonitor.endTimer(
          timerId,
          'database',
          'database_query_execution_time',
          {
            cache_hit: 'false',
            optimization_strategy: optimization.strategy,
            estimated_cost: optimization.estimatedCost.toString()
          }
        )

        performanceMonitor.recordDatabaseQuery({
          queryId: this.generateQueryId(),
          queryType: this.getQueryType(query),
          tableName: this.extractTableName(query),
          executionTime,
          rowsAffected: Array.isArray(result.data) ? result.data.length : 0,
          indexUsed: optimization.indexes[0] || 'none',
          cacheHit: false,
          concurrentConnections: stats.activeConnections
        })

        return {
          data: result.data,
          error: result.error,
          performance: { cacheHit: false, executionTime, optimization }
        }
      } finally {
        this.releaseConnection(connection)
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'database_query_execution_time', {
        cache_hit: 'false',
        error: 'true'
      })
      return { data: null, error, performance: { cacheHit: false, executionTime: 0, error } }
    }
  }

  async executeSpatialQuery<T = unknown>(
    baseQuery: string,
    spatialParams: { lat: number; lng: number; radiusMeters: number; limit?: number },
    additionalParams: unknown[] = []
  ): Promise<{ data: T[] | null; error: unknown; performance: unknown }> {
    const timerId = performanceMonitor.startTimer('spatial_query', {
      query_type: 'spatial_select',
      table_name: 'emergency_events'
    })

    try {
      const connection = await this.getConnection(true)

      try {
        const spatialOptimization: SpatialQueryOptimization = {
          useSpatialIndex: true,
          boundingBoxFilter: true,
          clusteringOptimization: true,
          partitionPruning: true,
          parallelExecution: true
        }

        const optimizedQuery = this.buildOptimizedSpatialQuery(
          baseQuery,
          spatialParams,
          spatialOptimization
        )
        const optimizedParams = [
          ...additionalParams,
          spatialParams.lat,
          spatialParams.lng,
          spatialParams.radiusMeters
        ]

        const result = await this.executeWithTimeout<T[]>(
          connection,
          optimizedQuery,
          optimizedParams,
          this.config.queryTimeout * 2
        )

        const stats = getPoolStats()
        const executionTime = performanceMonitor.endTimer(
          timerId,
          'database',
          'spatial_query_execution_time',
          {
            spatial_optimization: 'true',
            bounding_box: spatialOptimization.boundingBoxFilter.toString(),
            parallel_execution: spatialOptimization.parallelExecution.toString()
          }
        )

        performanceMonitor.recordDatabaseQuery({
          queryId: this.generateQueryId(),
          queryType: 'select',
          tableName: 'emergency_events',
          executionTime,
          rowsAffected: Array.isArray(result.data) ? result.data.length : 0,
          indexUsed: 'spatial_index',
          cacheHit: false,
          concurrentConnections: stats.activeConnections
        })

        return {
          data: result.data,
          error: result.error,
          performance: {
            executionTime,
            spatialOptimization,
            resultCount: Array.isArray(result.data) ? result.data.length : 0
          }
        }
      } finally {
        this.releaseConnection(connection)
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'spatial_query_execution_time', {
        error: 'true'
      })
      return { data: null, error, performance: { error } }
    }
  }

  async executeBatchAlertDispatch(
    alertQueries: Array<{
      query: string
      params: unknown[]
      priority: 'high' | 'medium' | 'low'
    }>
  ): Promise<{ results: unknown[]; errors: unknown[]; performance: unknown }> {
    const timerId = performanceMonitor.startTimer('batch_alert_dispatch', {
      query_count: alertQueries.length.toString()
    })

    try {
      const sortedQueries = [...alertQueries].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      const connections = await Promise.all(
        sortedQueries.map(async () => this.getConnection(false))
      )

      try {
        const results = await Promise.allSettled(
          sortedQueries.map((alertQuery, index) => {
            const conn = connections[index]
            if (!conn) {
              return Promise.reject(new Error('No connection available'))
            }
            return this.executeWithTimeout(
              conn,
              alertQuery.query,
              alertQuery.params,
              this.config.queryTimeout * 0.5
            )
          })
        )

        type QueryResult = { data: unknown; error: unknown }
        const successfulResults = results
          .filter(
            (result): result is PromiseFulfilledResult<QueryResult> => result.status === 'fulfilled'
          )
          .map(result => result.value)

        const errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason)

        const executionTime = performanceMonitor.endTimer(
          timerId,
          'database',
          'batch_alert_dispatch_time',
          {
            query_count: alertQueries.length.toString(),
            success_count: successfulResults.length.toString(),
            error_count: errors.length.toString()
          }
        )

        return {
          results: successfulResults,
          errors,
          performance: {
            executionTime,
            successRate: (successfulResults.length / alertQueries.length) * 100,
            parallelExecution: true
          }
        }
      } finally {
        connections.forEach(connection => this.releaseConnection(connection))
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'batch_alert_dispatch_time', {
        error: 'true'
      })
      return { results: [], errors: [error], performance: { error } }
    }
  }

  async getMaterializedViewData<T = unknown>(
    viewName: string,
    filters: Record<string, unknown> = {}
  ): Promise<{ data: T[] | null; error: unknown; performance: unknown }> {
    const timerId = performanceMonitor.startTimer('materialized_view_query', {
      view_name: viewName
    })

    try {
      const connection = await this.getConnection(true)

      try {
        let query = `SELECT * FROM ${viewName}`
        const params: unknown[] = []

        if (Object.keys(filters).length > 0) {
          const whereClause = Object.keys(filters)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(' AND ')
          query += ` WHERE ${whereClause}`
          params.push(...Object.values(filters))
        }

        const result = await this.executeWithTimeout<T[]>(
          connection,
          query,
          params,
          this.config.queryTimeout * 3
        )

        const executionTime = performanceMonitor.endTimer(
          timerId,
          'database',
          'materialized_view_query_time',
          {
            view_name: viewName,
            filter_count: Object.keys(filters).length.toString()
          }
        )

        return {
          data: result.data,
          error: result.error,
          performance: {
            executionTime,
            materializedView: true,
            filterCount: Object.keys(filters).length
          }
        }
      } finally {
        this.releaseConnection(connection)
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'materialized_view_query_time', {
        error: 'true'
      })
      return { data: null, error, performance: { error } }
    }
  }

  private async getConnection(useReadReplica: boolean = false): Promise<SupabaseClient> {
    if (!this.config.enableConnectionPooling) {
      return this.supabase
    }
    return this.poolManager.acquire(useReadReplica && this.config.enableReadReplicas)
  }

  private releaseConnection(client: SupabaseClient): void {
    if (this.config.enableConnectionPooling) {
      this.poolManager.release(client)
    }
  }

  async checkPoolHealth(): Promise<{
    healthy: boolean
    primaryHealthy: number
    replicaHealthy: number
    details: string[]
  }> {
    return this.poolManager.healthCheck()
  }

  getPoolStats(): PoolStats {
    return this.poolManager.getStats()
  }

  private async executeWithTimeout<T>(
    client: SupabaseClient,
    query: string,
    params: unknown[],
    timeout: number
  ): Promise<{ data: T | null; error: unknown }> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        resolve({ data: null, error: new Error('Query timeout') })
      }, timeout)

      const rpcPromise = client.rpc('execute_optimized_query', {
        query_text: query,
        query_params: params
      })

      Promise.resolve(rpcPromise)
        .then(result => {
          clearTimeout(timeoutId)
          resolve({ data: result.data as T | null, error: result.error })
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId)
          resolve({ data: null, error })
        })
    })
  }

  private async optimizeQuery(
    query: string,
    params: unknown[],
    _spatialOptimization?: SpatialQueryOptimization
  ): Promise<QueryOptimizationResult> {
    return {
      optimizedQuery: query,
      optimizedParams: params,
      strategy: 'index_scan',
      estimatedCost: 100,
      estimatedRows: 1000,
      indexes: ['idx_emergency_events_location', 'idx_emergency_events_created_at'],
      cacheHit: false
    }
  }

  private buildOptimizedSpatialQuery(
    baseQuery: string,
    spatialParams: { lat: number; lng: number; radiusMeters: number },
    optimization: SpatialQueryOptimization
  ): string {
    let optimizedQuery = baseQuery

    if (optimization.boundingBoxFilter) {
      const { lat, lng, radiusMeters } = spatialParams
      const latDelta = radiusMeters / 111320
      const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))

      optimizedQuery += ` AND location && ST_MakeEnvelope(
        ST_MakePoint(${lng - lngDelta}, ${lat - latDelta}),
        ST_MakePoint(${lng + lngDelta}, ${lat + latDelta})
      )`
    }

    if (optimization.useSpatialIndex) {
      optimizedQuery += ` AND ST_DWithin(
        location::geography,
        ST_MakePoint(${spatialParams.lng}, ${spatialParams.lat})::geography,
        ${spatialParams.radiusMeters}
      )`
    }

    return optimizedQuery
  }

  private getFromCache(query: string, params: unknown[]): unknown | null {
    const cacheKey = this.generateCacheKey(query, params)
    const entry = this.queryCache.get(cacheKey)

    if (!entry) {
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(cacheKey)
      return null
    }

    entry.hitCount++
    return entry.result
  }

  private setCache(query: string, params: unknown[], result: unknown): void {
    const cacheKey = this.generateCacheKey(query, params)

    this.queryCache.set(cacheKey, {
      query,
      params,
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
      hitCount: 0
    })

    if (this.queryCache.size > 1000) {
      this.cleanupCache()
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    const entries = Array.from(this.queryCache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  private generateCacheKey(query: string, params: unknown[]): string {
    return `${query}:${JSON.stringify(params)}`
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getQueryType(query: string): 'select' | 'insert' | 'update' | 'delete' | 'rpc' {
    const trimmedQuery = query.trim().toLowerCase()

    if (trimmedQuery.startsWith('select')) {
      return 'select'
    }
    if (trimmedQuery.startsWith('insert')) {
      return 'insert'
    }
    if (trimmedQuery.startsWith('update')) {
      return 'update'
    }
    if (trimmedQuery.startsWith('delete')) {
      return 'delete'
    }
    return 'rpc'
  }

  private extractTableName(query: string): string {
    const match = query.match(/from\s+(\w+)/i)
    const tableName = match?.[1]
    return tableName ?? 'unknown'
  }

  async getQueryPerformanceStats(): Promise<{
    activeConnections: number
    poolSize: number
    cacheSize: number
    cacheHitRate: number
    avgQueryTime: number
  }> {
    const stats = this.poolManager.getStats()
    const totalCacheHits = Array.from(this.queryCache.values()).reduce(
      (sum, entry) => sum + entry.hitCount,
      0
    )
    const cacheHitRate = this.queryCache.size > 0 ? totalCacheHits / this.queryCache.size : 0

    const recentMetrics = await performanceMonitor.getMetrics('database')
    const queryTimes = recentMetrics
      .filter(m => m.name === 'database_query_execution_time')
      .map(m => m.value)

    const avgQueryTime =
      queryTimes.length > 0
        ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
        : 0

    return {
      activeConnections: stats.activeConnections,
      poolSize: stats.totalConnections,
      cacheSize: this.queryCache.size,
      cacheHitRate: cacheHitRate * 100,
      avgQueryTime
    }
  }

  async warmupCache(): Promise<void> {
    const commonQueries = [
      { query: 'SELECT * FROM emergency_events WHERE status = $1', params: ['active'] },
      { query: 'SELECT * FROM emergency_types WHERE is_active = $1', params: [true] },
      {
        query: 'SELECT COUNT(*) FROM emergency_events WHERE created_at > $1',
        params: [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]
      }
    ]

    for (const { query, params } of commonQueries) {
      await this.executeQuery(query, params, { useCache: true })
    }

    console.log('[DatabaseQueryOptimizer] Cache warmed up with common queries')
  }

  async drainPool(): Promise<void> {
    await this.poolManager.drain()
  }
}

export const queryOptimizer = DatabaseQueryOptimizer.getInstance()

export function useQueryOptimizer() {
  return {
    executeQuery: queryOptimizer.executeQuery.bind(queryOptimizer),
    executeSpatialQuery: queryOptimizer.executeSpatialQuery.bind(queryOptimizer),
    executeBatchAlertDispatch: queryOptimizer.executeBatchAlertDispatch.bind(queryOptimizer),
    getMaterializedViewData: queryOptimizer.getMaterializedViewData.bind(queryOptimizer),
    getQueryPerformanceStats: queryOptimizer.getQueryPerformanceStats.bind(queryOptimizer),
    checkPoolHealth: queryOptimizer.checkPoolHealth.bind(queryOptimizer),
    getPoolStats: queryOptimizer.getPoolStats.bind(queryOptimizer),
    warmupCache: queryOptimizer.warmupCache.bind(queryOptimizer)
  }
}

export default queryOptimizer
