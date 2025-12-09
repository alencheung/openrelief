/**
 * Database Query Optimizer for High-Load Emergency Scenarios
 *
 * This module provides intelligent query optimization for:
 * - Spatial queries with geographic indexing
 * - Connection pooling and load balancing
 * - Query result caching strategies
 * - Materialized views for analytics
 * - Emergency-specific query patterns
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { performanceMonitor } from '../performance/performance-monitor'

// Query optimization configuration
export interface QueryOptimizationConfig {
  enableConnectionPooling: boolean
  maxConnections: number
  connectionTimeout: number
  queryTimeout: number
  enableQueryCache: boolean
  cacheTTL: number
  enableReadReplicas: boolean
  spatialIndexing: boolean
  materializedViews: boolean
}

// Query cache entry
interface QueryCacheEntry {
  query: string
  params: any[]
  result: any
  timestamp: number
  ttl: number
  hitCount: number
}

// Connection pool entry
interface ConnectionPoolEntry {
  client: SupabaseClient
  inUse: boolean
  lastUsed: number
  created: number
  queryCount: number
}

// Query optimization result
export interface QueryOptimizationResult {
  optimizedQuery: string
  optimizedParams: any[]
  strategy: 'index_scan' | 'sequential_scan' | 'bitmap_scan' | 'hash_join' | 'nested_loop'
  estimatedCost: number
  estimatedRows: number
  indexes: string[]
  cacheHit: boolean
}

// Spatial query optimization
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
  private connectionPool: ConnectionPoolEntry[] = []
  private activeConnections = 0
  private supabase: SupabaseClient
  private readReplicas: SupabaseClient[] = []

  private constructor() {
    this.config = {
      enableConnectionPooling: true,
      maxConnections: 20,
      connectionTimeout: 30000,
      queryTimeout: 10000,
      enableQueryCache: true,
      cacheTTL: 300000, // 5 minutes
      enableReadReplicas: true,
      spatialIndexing: true,
      materializedViews: true
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    this.initializeConnectionPool()
    this.startConnectionPoolMaintenance()
  }

  static getInstance(): DatabaseQueryOptimizer {
    if (!DatabaseQueryOptimizer.instance) {
      DatabaseQueryOptimizer.instance = new DatabaseQueryOptimizer()
    }
    return DatabaseQueryOptimizer.instance
  }

  /**
   * Execute optimized query
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      useCache?: boolean
      useReadReplica?: boolean
      timeout?: number
      spatialOptimization?: SpatialQueryOptimization
    } = {}
  ): Promise<{ data: T | null; error: any; performance: any }> {
    const timerId = performanceMonitor.startTimer('database_query', {
      query_type: this.getQueryType(query),
      table_name: this.extractTableName(query)
    })

    try {
      // Check cache first
      if (options.useCache !== false && this.config.enableQueryCache) {
        const cachedResult = this.getFromCache(query, params)
        if (cachedResult) {
          performanceMonitor.endTimer(timerId, 'database', 'database_query_execution_time', {
            cache_hit: 'true'
          })

          return {
            data: cachedResult,
            error: null,
            performance: {
              cacheHit: true,
              executionTime: 0
            }
          }
        }
      }

      // Get connection from pool
      const connection = await this.getConnection(options.useReadReplica)

      try {
        // Optimize query
        const optimization = await this.optimizeQuery(query, params, options.spatialOptimization)

        // Execute with timeout
        const result = await this.executeWithTimeout(
          connection,
          optimization.optimizedQuery,
          optimization.optimizedParams,
          options.timeout || this.config.queryTimeout
        )

        // Cache result
        if (this.config.enableQueryCache && options.useCache !== false) {
          this.setCache(query, params, result.data)
        }

        const executionTime = performanceMonitor.endTimer(timerId, 'database', 'database_query_execution_time', {
          cache_hit: 'false',
          optimization_strategy: optimization.strategy,
          estimated_cost: optimization.estimatedCost.toString()
        })

        // Record query metrics
        performanceMonitor.recordDatabaseQuery({
          queryId: this.generateQueryId(),
          queryType: this.getQueryType(query),
          tableName: this.extractTableName(query),
          executionTime,
          rowsAffected: Array.isArray(result.data) ? result.data.length : 0,
          indexUsed: optimization.indexes[0] || 'none',
          cacheHit: false,
          concurrentConnections: this.activeConnections
        })

        return {
          data: result.data,
          error: result.error,
          performance: {
            cacheHit: false,
            executionTime,
            optimization: optimization
          }
        }
      } finally {
        this.releaseConnection(connection)
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'database_query_execution_time', {
        cache_hit: 'false',
        error: 'true'
      })

      return {
        data: null,
        error,
        performance: {
          cacheHit: false,
          executionTime: 0,
          error
        }
      }
    }
  }

  /**
   * Execute emergency-optimized spatial query
   */
  async executeSpatialQuery<T = any>(
    baseQuery: string,
    spatialParams: {
      lat: number
      lng: number
      radiusMeters: number
      limit?: number
    },
    additionalParams: any[] = []
  ): Promise<{ data: T[] | null; error: any; performance: any }> {
    const timerId = performanceMonitor.startTimer('spatial_query', {
      query_type: 'spatial_select',
      table_name: 'emergency_events'
    })

    try {
      // Get connection optimized for spatial queries
      const connection = await this.getConnection(true) // Prefer read replicas for spatial queries

      try {
        // Apply spatial optimizations
        const spatialOptimization: SpatialQueryOptimization = {
          useSpatialIndex: true,
          boundingBoxFilter: true,
          clusteringOptimization: true,
          partitionPruning: true,
          parallelExecution: true
        }

        // Build optimized spatial query
        const optimizedQuery = this.buildOptimizedSpatialQuery(baseQuery, spatialParams, spatialOptimization)
        const optimizedParams = [...additionalParams, spatialParams.lat, spatialParams.lng, spatialParams.radiusMeters]

        // Execute with extended timeout for spatial queries
        const result = await this.executeWithTimeout(
          connection,
          optimizedQuery,
          optimizedParams,
          this.config.queryTimeout * 2 // Double timeout for spatial queries
        )

        const executionTime = performanceMonitor.endTimer(timerId, 'database', 'spatial_query_execution_time', {
          spatial_optimization: 'true',
          bounding_box: spatialOptimization.boundingBoxFilter.toString(),
          parallel_execution: spatialOptimization.parallelExecution.toString()
        })

        // Record spatial query metrics
        performanceMonitor.recordDatabaseQuery({
          queryId: this.generateQueryId(),
          queryType: 'select',
          tableName: 'emergency_events',
          executionTime,
          rowsAffected: Array.isArray(result.data) ? result.data.length : 0,
          indexUsed: 'spatial_index',
          cacheHit: false,
          concurrentConnections: this.activeConnections
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

      return {
        data: null,
        error,
        performance: {
          error
        }
      }
    }
  }

  /**
   * Execute batch emergency alert dispatch
   */
  async executeBatchAlertDispatch(
    alertQueries: Array<{
      query: string
      params: any[]
      priority: 'high' | 'medium' | 'low'
    }>
  ): Promise<{ results: any[]; errors: any[]; performance: any }> {
    const timerId = performanceMonitor.startTimer('batch_alert_dispatch', {
      query_count: alertQueries.length.toString()
    })

    try {
      // Sort by priority
      const sortedQueries = [...alertQueries].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      // Get multiple connections for parallel execution
      const connections = await Promise.all(
        sortedQueries.map(() => this.getConnection(false))
      )

      try {
        // Execute queries in parallel with priority considerations
        const results = await Promise.allSettled(
          sortedQueries.map((alertQuery, index) =>
            this.executeWithTimeout(
              connections[index],
              alertQuery.query,
              alertQuery.params,
              this.config.queryTimeout * 0.5 // Shorter timeout for alert queries
            )
          )
        )

        const successfulResults = results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)

        const errors = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason)

        const executionTime = performanceMonitor.endTimer(timerId, 'database', 'batch_alert_dispatch_time', {
          query_count: alertQueries.length.toString(),
          success_count: successfulResults.length.toString(),
          error_count: errors.length.toString()
        })

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
        // Release all connections
        connections.forEach(connection => this.releaseConnection(connection))
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'batch_alert_dispatch_time', {
        error: 'true'
      })

      return {
        results: [],
        errors: [error],
        performance: {
          error
        }
      }
    }
  }

  /**
   * Get materialized view data for analytics
   */
  async getMaterializedViewData<T = any>(
    viewName: string,
    filters: Record<string, any> = {}
  ): Promise<{ data: T[] | null; error: any; performance: any }> {
    const timerId = performanceMonitor.startTimer('materialized_view_query', {
      view_name: viewName
    })

    try {
      const connection = await this.getConnection(true) // Use read replica for analytics

      try {
        // Build query for materialized view
        let query = `SELECT * FROM ${viewName}`
        const params: any[] = []

        // Add filters
        if (Object.keys(filters).length > 0) {
          const whereClause = Object.keys(filters)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(' AND ')
          query += ` WHERE ${whereClause}`
          params.push(...Object.values(filters))
        }

        const result = await this.executeWithTimeout(
          connection,
          query,
          params,
          this.config.queryTimeout * 3 // Longer timeout for analytics
        )

        const executionTime = performanceMonitor.endTimer(timerId, 'database', 'materialized_view_query_time', {
          view_name: viewName,
          filter_count: Object.keys(filters).length.toString()
        })

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

      return {
        data: null,
        error,
        performance: {
          error
        }
      }
    }
  }

  /**
   * Private helper methods
   */

  private async initializeConnectionPool(): Promise<void> {
    if (!this.config.enableConnectionPooling) {
      return
    }

    // Initialize primary connections
    for (let i = 0; i < Math.floor(this.config.maxConnections * 0.7); i++) {
      this.connectionPool.push({
        client: this.createConnection(),
        inUse: false,
        lastUsed: Date.now(),
        created: Date.now(),
        queryCount: 0
      })
    }

    // Initialize read replica connections
    if (this.config.enableReadReplicas) {
      for (let i = 0; i < Math.floor(this.config.maxConnections * 0.3); i++) {
        const replicaClient = this.createReadReplicaConnection()
        if (replicaClient) {
          this.readReplicas.push(replicaClient)
        }
      }
    }

    console.log(`[DatabaseQueryOptimizer] Initialized connection pool with ${this.connectionPool.length} connections`)
  }

  private createConnection(): SupabaseClient {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          queryTimeout: this.config.queryTimeout
        }
      }
    )
  }

  private createReadReplicaConnection(): SupabaseClient | null {
    // In a real implementation, this would connect to read replica endpoints
    // For now, return primary connection as fallback
    return this.createConnection()
  }

  private async getConnection(useReadReplica: boolean = false): Promise<SupabaseClient> {
    if (!this.config.enableConnectionPooling) {
      return useReadReplica && this.readReplicas.length > 0
        ? this.readReplicas[0]
        : this.supabase
    }

    // Try to get available connection from pool
    const availableConnection = this.connectionPool.find(conn => !conn.inUse)

    if (availableConnection) {
      availableConnection.inUse = true
      availableConnection.lastUsed = Date.now()
      this.activeConnections++
      return availableConnection.client
    }

    // If no available connection and under limit, create new one
    if (this.connectionPool.length < this.config.maxConnections) {
      const newConnection = this.createConnection()
      this.connectionPool.push({
        client: newConnection,
        inUse: true,
        lastUsed: Date.now(),
        created: Date.now(),
        queryCount: 0
      })
      this.activeConnections++
      return newConnection
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const availableConnection = this.connectionPool.find(conn => !conn.inUse)
        if (availableConnection) {
          clearInterval(checkInterval)
          availableConnection.inUse = true
          availableConnection.lastUsed = Date.now()
          this.activeConnections++
          resolve(availableConnection.client)
        }
      }, 10)
    })
  }

  private releaseConnection(client: SupabaseClient): void {
    if (!this.config.enableConnectionPooling) {
      return
    }

    const connection = this.connectionPool.find(conn => conn.client === client)
    if (connection) {
      connection.inUse = false
      connection.lastUsed = Date.now()
      this.activeConnections--
    }
  }

  private async executeWithTimeout<T>(
    client: SupabaseClient,
    query: string,
    params: any[],
    timeout: number
  ): Promise<{ data: T | null; error: any }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ data: null, error: new Error('Query timeout') })
      }, timeout)

      client.rpc('execute_optimized_query', {
        query_text: query,
        query_params: params
      }).then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      }).catch(error => {
        clearTimeout(timeoutId)
        resolve({ data: null, error })
      })
    })
  }

  private async optimizeQuery(
    query: string,
    params: any[],
    spatialOptimization?: SpatialQueryOptimization
  ): Promise<QueryOptimizationResult> {
    // This would integrate with PostgreSQL's EXPLAIN ANALYZE
    // For now, return basic optimization info

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
      // Add bounding box filter for initial filtering
      const { lat, lng, radiusMeters } = spatialParams
      const latDelta = radiusMeters / 111320 // Approximate degrees
      const lngDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180))

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

  private getFromCache(query: string, params: any[]): any | null {
    const cacheKey = this.generateCacheKey(query, params)
    const entry = this.queryCache.get(cacheKey)

    if (!entry) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(cacheKey)
      return null
    }

    entry.hitCount++
    return entry.result
  }

  private setCache(query: string, params: any[], result: any): void {
    const cacheKey = this.generateCacheKey(query, params)

    this.queryCache.set(cacheKey, {
      query,
      params,
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
      hitCount: 0
    })

    // Clean up old cache entries
    if (this.queryCache.size > 1000) {
      this.cleanupCache()
    }
  }

  private cleanupCache(): void {
    const now = Date.now()

    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  private generateCacheKey(query: string, params: any[]): string {
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
    // Simple table name extraction - in real implementation, use query parser
    const match = query.match(/from\s+(\w+)/i)
    return match ? match[1] : 'unknown'
  }

  private startConnectionPoolMaintenance(): void {
    // Clean up idle connections every 5 minutes
    setInterval(() => {
      this.maintainConnectionPool()
    }, 5 * 60 * 1000)
  }

  private maintainConnectionPool(): void {
    const now = Date.now()
    const maxIdleTime = 10 * 60 * 1000 // 10 minutes

    // Remove old idle connections
    this.connectionPool = this.connectionPool.filter(conn => {
      if (!conn.inUse && (now - conn.lastUsed) > maxIdleTime) {
        // Close connection (in real implementation)
        return false
      }
      return true
    })
  }

  /**
   * Public API methods
   */

  async getQueryPerformanceStats(): Promise<{
    activeConnections: number
    poolSize: number
    cacheSize: number
    cacheHitRate: number
    avgQueryTime: number
  }> {
    const totalCacheHits = Array.from(this.queryCache.values())
      .reduce((sum, entry) => sum + entry.hitCount, 0)

    const cacheHitRate = this.queryCache.size > 0 ? totalCacheHits / this.queryCache.size : 0

    // Get recent query metrics
    const recentMetrics = await performanceMonitor.getMetrics('database')
    const queryTimes = recentMetrics
      .filter(m => m.name === 'database_query_execution_time')
      .map(m => m.value)

    const avgQueryTime = queryTimes.length > 0
      ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
      : 0

    return {
      activeConnections: this.activeConnections,
      poolSize: this.connectionPool.length,
      cacheSize: this.queryCache.size,
      cacheHitRate: cacheHitRate * 100, // percentage
      avgQueryTime
    }
  }

  async warmupCache(): Promise<void> {
    // Pre-cache common queries
    const commonQueries = [
      { query: 'SELECT * FROM emergency_events WHERE status = $1', params: ['active'] },
      { query: 'SELECT * FROM emergency_types WHERE is_active = $1', params: [true] },
      { query: 'SELECT COUNT(*) FROM emergency_events WHERE created_at > $1', params: [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()] }
    ]

    for (const { query, params } of commonQueries) {
      await this.executeQuery(query, params, { useCache: true })
    }

    console.log('[DatabaseQueryOptimizer] Cache warmed up with common queries')
  }
}

// Export singleton instance
export const queryOptimizer = DatabaseQueryOptimizer.getInstance()

// Export hooks for easy integration
export function useQueryOptimizer() {
  return {
    executeQuery: queryOptimizer.executeQuery.bind(queryOptimizer),
    executeSpatialQuery: queryOptimizer.executeSpatialQuery.bind(queryOptimizer),
    executeBatchAlertDispatch: queryOptimizer.executeBatchAlertDispatch.bind(queryOptimizer),
    getMaterializedViewData: queryOptimizer.getMaterializedViewData.bind(queryOptimizer),
    getQueryPerformanceStats: queryOptimizer.getQueryPerformanceStats.bind(queryOptimizer),
    warmupCache: queryOptimizer.warmupCache.bind(queryOptimizer)
  }
}

export default queryOptimizer