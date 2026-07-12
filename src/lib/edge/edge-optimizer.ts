/**
 * Edge Caching and Geographic Routing Optimizer
 *
 * This module provides comprehensive edge optimization for:
 * - Geographic edge routing and load balancing
 * - Multi-level caching strategies
 * - CDN configuration and tuning
 * - Edge function optimization
 * - Real-time performance adaptation
 *
 * The implementation has been split across focused modules:
 * - `edge-types.ts` — shared enums, interfaces, and type aliases
 * - `edge-helpers.ts` — pure utilities (distance math, TTL/header generation, geolocation)
 * - `edge-config.ts` — default cache config and geographic seed data
 * - `edge-routing.ts` — routing strategy selection and confidence/decision math
 * - `edge-metrics.ts` — metrics collection, health checks, and status summary
 *
 * This file re-exports everything above and retains the singleton orchestrator
 * class so existing imports from `@/lib/edge/edge-optimizer` keep working.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { RoutingStrategy } from './edge-types'
import type {
  CacheConfig,
  EdgeLocation,
  EdgePerformanceMetrics,
  GeographicRegion,
  CacheableResource,
  EdgeRoutingRequest,
  EdgeRoutingResult
} from './edge-types'
import {
  applyCacheHeaders,
  calculateEstimatedLatency,
  calculateTTL,
  determineCacheLevel,
  getClientLocation,
  invalidateCacheAcrossEdges,
  resolveInvalidationTargets
} from './edge-helpers'
import {
  applyEmergencyCacheOverrides,
  createDefaultCacheConfig,
  getInitialEdgeLocations,
  getInitialRegions,
  restoreDefaultCacheOverrides
} from './edge-config'
import {
  applyRoutingStrategy,
  calculateRoutingConfidence,
  generateRoutingDecision,
  getCandidateEdgeLocations as resolveCandidateEdges,
  getFallbackEdgeLocation as resolveFallbackEdge
} from './edge-routing'
import {
  checkEdgeHealth,
  collectMetricsForEdges,
  collectPerformanceMetrics,
  getEdgeStatus,
  preloadEmergencyResources,
  type EdgeStatusSummary
} from './edge-metrics'

export * from './edge-types'
export * from './edge-helpers'
export * from './edge-config'
export * from './edge-routing'
export * from './edge-metrics'

class EdgeOptimizer {
  private static instance: EdgeOptimizer
  private regions: Map<string, GeographicRegion> = new Map()
  private edgeLocations: Map<string, EdgeLocation> = new Map()
  private cacheConfig: CacheConfig
  private routingStrategy: RoutingStrategy
  private performanceMetrics: Map<string, EdgePerformanceMetrics[]> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private loadBalancingWeights: Map<string, number> = new Map()

  private constructor() {
    this.cacheConfig = createDefaultCacheConfig()
    this.routingStrategy = RoutingStrategy.PERFORMANCE_BASED
    this.initializeGeographicRegions()
    this.initializeEdgeLocations()
    this.startHealthMonitoring()
    this.startPerformanceCollection()
  }

  static getInstance(): EdgeOptimizer {
    if (!EdgeOptimizer.instance) {
      EdgeOptimizer.instance = new EdgeOptimizer()
    }
    return EdgeOptimizer.instance
  }

  /**
   * Get optimal edge location for request
   */
  async getOptimalEdgeLocation(
    request: EdgeRoutingRequest,
    fallbackStrategy?: RoutingStrategy
  ): Promise<EdgeRoutingResult> {
    const timerId = performanceMonitor.startTimer('edge_routing', {
      routing_strategy: this.routingStrategy
    })

    try {
      // Determine client location
      const clientLocation = await getClientLocation(request.clientIP)

      // Get candidate edge locations
      const candidates = this.getCandidateEdgeLocations(request.path)

      // Apply routing strategy
      const selectedEdge = this.applyRoutingStrategy(candidates, clientLocation)

      // Calculate routing metrics
      const estimatedLatency = calculateEstimatedLatency(clientLocation, selectedEdge.coordinates)
      const confidence = this.calculateRoutingConfidence(selectedEdge)

      const routingDecision = this.generateRoutingDecision(selectedEdge, request)

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'edge_routing_decision_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'edge_routing_latency',
        value: executionTime,
        unit: 'ms',
        tags: {
          selected_edge: selectedEdge.id,
          routing_strategy: this.routingStrategy,
          confidence: confidence.toString()
        }
      })

      return {
        edgeLocation: selectedEdge,
        routingDecision,
        estimatedLatency,
        confidence
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'edge_routing_decision_time', {
        error: 'true'
      })

      // Fallback to nearest edge
      const fallbackEdge = this.getFallbackEdgeLocation(fallbackStrategy)

      return {
        edgeLocation: fallbackEdge,
        routingDecision: 'fallback_nearest',
        estimatedLatency: 1000, // Conservative estimate
        confidence: 0.5
      }
    }
  }

  /**
   * Optimize cache headers for response
   */
  optimizeCacheHeaders(response: Response, resource: CacheableResource): Response {
    const timerId = performanceMonitor.startTimer('cache_optimization', {
      resource_type: resource.type,
      priority: resource.priority
    })

    try {
      // Determine cache level and TTL, then apply all cache headers
      const cacheLevel = determineCacheLevel(resource, this.cacheConfig)
      const ttl = calculateTTL(resource, cacheLevel, this.cacheConfig)
      applyCacheHeaders(response, resource, cacheLevel, ttl, this.cacheConfig)

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'cache_header_optimization_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'cache_optimization_time',
        value: executionTime,
        unit: 'ms',
        tags: {
          resource_type: resource.type,
          cache_level: cacheLevel.name,
          ttl: ttl.toString()
        }
      })

      return response
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'cache_header_optimization_time', {
        error: 'true'
      })

      return response
    }
  }

  /**
   * Invalidate cache across edge locations
   */
  async invalidateCache(
    pattern: string,
    options: {
      urgent?: boolean
      regions?: string[]
      edgeLocations?: string[]
      cacheLevels?: string[]
    } = {}
  ): Promise<{
    success: boolean
    invalidatedLocations: string[]
    executionTime: number
    errors: string[]
  }> {
    const timerId = performanceMonitor.startTimer('cache_invalidation', {
      pattern,
      urgent: options.urgent?.toString() || 'false'
    })

    try {
      const targetEdges = resolveInvalidationTargets(this.edgeLocations, options.edgeLocations)
      const { success, invalidatedLocations, errors } = await invalidateCacheAcrossEdges(targetEdges, pattern)

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'cache_invalidation_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'cache_invalidation_time',
        value: executionTime,
        unit: 'ms',
        tags: {
          pattern,
          success_count: invalidatedLocations.length.toString(),
          total_edges: targetEdges.length.toString(),
          urgent: options.urgent?.toString() || 'false'
        }
      })

      return {
        success,
        invalidatedLocations,
        executionTime,
        errors
      }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'cache_invalidation_time', {
        error: 'true'
      })

      return {
        success: false,
        invalidatedLocations: [],
        executionTime: 0,
        errors: [(error as Error).message]
      }
    }
  }

  /**
   * Get edge performance metrics
   */
  async getEdgePerformanceMetrics(
    region?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<EdgePerformanceMetrics[]> {
    const timerId = performanceMonitor.startTimer('edge_metrics_collection', {
      region: region || 'all'
    })

    try {
      // Collect metrics from all edge locations or specific region
      const targetEdges = region
        ? this.getEdgesByRegion(region)
        : Array.from(this.edgeLocations.values())

      const metrics = await collectMetricsForEdges(targetEdges, timeRange)

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'edge_metrics_collection_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'edge_metrics_collection_time',
        value: executionTime,
        unit: 'ms',
        tags: {
          edge_count: targetEdges.length.toString(),
          region: region || 'all'
        }
      })

      return metrics
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'edge_metrics_collection_time', {
        error: 'true'
      })

      throw new Error(`Failed to collect edge metrics: ${(error as Error).message}`)
    }
  }

  /**
   * Optimize for emergency mode
   */
  async enableEmergencyMode(): Promise<void> {
    const timerId = performanceMonitor.startTimer('emergency_mode_enable')

    try {
      // Switch to lowest latency routing
      this.routingStrategy = RoutingStrategy.LOWEST_LATENCY

      // Apply emergency cache overrides and preload critical resources
      applyEmergencyCacheOverrides(this.cacheConfig)
      await this.preloadEmergencyResources()
      this.startEmergencyHealthMonitoring()

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'emergency_mode_enable_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'emergency_mode_enable_time',
        value: executionTime,
        unit: 'ms'
      })

      console.log('[EdgeOptimizer] Emergency mode enabled')
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'emergency_mode_enable_time', {
        error: 'true'
      })

      throw error
    }
  }

  /**
   * Disable emergency mode
   */
  async disableEmergencyMode(): Promise<void> {
    const timerId = performanceMonitor.startTimer('emergency_mode_disable')

    try {
      // Restore normal routing strategy and cache config
      this.routingStrategy = RoutingStrategy.PERFORMANCE_BASED
      restoreDefaultCacheOverrides(this.cacheConfig)
      this.startHealthMonitoring()

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'emergency_mode_disable_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'emergency_mode_disable_time',
        value: executionTime,
        unit: 'ms'
      })

      console.log('[EdgeOptimizer] Emergency mode disabled')
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'edge', 'emergency_mode_disable_time', {
        error: 'true'
      })

      throw error
    }
  }

  // --- Region / edge location initialization ---------------------------------

  private initializeGeographicRegions(): void {
    getInitialRegions().forEach(region => {
      this.regions.set(region.id, region)
    })
  }

  private initializeEdgeLocations(): void {
    getInitialEdgeLocations().forEach(edge => {
      this.edgeLocations.set(edge.id, edge)
      const region = this.regions.get(edge.region)
      if (region) {
        region.edgeLocations.push(edge)
      }
    })
  }

  // --- Routing ---------------------------------------------------------------

  private getCandidateEdgeLocations(path?: string): EdgeLocation[] {
    return resolveCandidateEdges(this.edgeLocations, path)
  }

  private applyRoutingStrategy(
    candidates: EdgeLocation[],
    clientLocation: { lat: number; lng: number }
  ): EdgeLocation {
    return applyRoutingStrategy(
      candidates,
      clientLocation,
      this.routingStrategy,
      this.loadBalancingWeights,
      this.performanceMetrics
    )
  }

  private calculateRoutingConfidence(selectedEdge: EdgeLocation): number {
    return calculateRoutingConfidence(selectedEdge, this.performanceMetrics)
  }

  private generateRoutingDecision(selectedEdge: EdgeLocation, request: EdgeRoutingRequest): string {
    return generateRoutingDecision(selectedEdge, this.routingStrategy, request)
  }

  private getFallbackEdgeLocation(strategy?: RoutingStrategy): EdgeLocation {
    return resolveFallbackEdge(this.edgeLocations)
  }

  // --- Cache invalidation & metrics ------------------------------------------

  private getEdgesByRegion(regionId: string): EdgeLocation[] {
    const region = this.regions.get(regionId)
    return region ? region.edgeLocations : []
  }

  private async preloadEmergencyResources(): Promise<void> {
    await preloadEmergencyResources()
  }

  // --- Health monitoring -----------------------------------------------------

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.healthCheckInterval = setInterval(async () => {
      await checkEdgeHealth(this.edgeLocations)
    }, 30000)
  }

  private startEmergencyHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.healthCheckInterval = setInterval(async () => {
      await checkEdgeHealth(this.edgeLocations)
    }, 10000)
  }

  private startPerformanceCollection(): void {
    setInterval(async () => {
      await collectPerformanceMetrics(this.edgeLocations, this.performanceMetrics)
    }, 60000)
  }

  // --- Public API ------------------------------------------------------------

  async getRoutingStrategy(): Promise<RoutingStrategy> {
    return this.routingStrategy
  }

  async setRoutingStrategy(strategy: RoutingStrategy): Promise<void> {
    this.routingStrategy = strategy
    console.log(`[EdgeOptimizer] Routing strategy changed to: ${strategy}`)
  }

  async getCacheConfig(): Promise<CacheConfig> {
    return { ...this.cacheConfig }
  }

  async updateCacheConfig(updates: Partial<CacheConfig>): Promise<void> {
    this.cacheConfig = { ...this.cacheConfig, ...updates }
    console.log('[EdgeOptimizer] Cache configuration updated')
  }

  async getEdgeStatus(): Promise<EdgeStatusSummary> {
    return getEdgeStatus(this.edgeLocations)
  }
}

// Export singleton instance
export const edgeOptimizer = EdgeOptimizer.getInstance()

// Export hooks for easy integration
export function useEdgeOptimizer() {
  return {
    getOptimalEdgeLocation: edgeOptimizer.getOptimalEdgeLocation.bind(edgeOptimizer),
    optimizeCacheHeaders: edgeOptimizer.optimizeCacheHeaders.bind(edgeOptimizer),
    invalidateCache: edgeOptimizer.invalidateCache.bind(edgeOptimizer),
    getEdgePerformanceMetrics: edgeOptimizer.getEdgePerformanceMetrics.bind(edgeOptimizer),
    enableEmergencyMode: edgeOptimizer.enableEmergencyMode.bind(edgeOptimizer),
    disableEmergencyMode: edgeOptimizer.disableEmergencyMode.bind(edgeOptimizer),
    getRoutingStrategy: edgeOptimizer.getRoutingStrategy.bind(edgeOptimizer),
    setRoutingStrategy: edgeOptimizer.setRoutingStrategy.bind(edgeOptimizer),
    getCacheConfig: edgeOptimizer.getCacheConfig.bind(edgeOptimizer),
    updateCacheConfig: edgeOptimizer.updateCacheConfig.bind(edgeOptimizer),
    getEdgeStatus: edgeOptimizer.getEdgeStatus.bind(edgeOptimizer)
  }
}

export default edgeOptimizer
