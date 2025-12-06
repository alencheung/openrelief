/**
 * Edge Caching and Geographic Routing Optimizer
 * 
 * This module provides comprehensive edge optimization for:
 * - Geographic edge routing and load balancing
 * - Multi-level caching strategies
 * - CDN configuration and tuning
 * - Edge function optimization
 * - Real-time performance adaptation
 */

import { performanceMonitor } from '../performance/performance-monitor'

// Geographic region configuration
export interface GeographicRegion {
  id: string
  name: string
  code: string
  coordinates: {
    lat: number
    lng: number
  }
  edgeLocations: EdgeLocation[]
  population: number
  timezone: string
}

// Edge location configuration
export interface EdgeLocation {
  id: string
  name: string
  provider: 'cloudflare' | 'aws' | 'azure' | 'gcp'
  region: string
  city: string
  coordinates: {
    lat: number
    lng: number
  }
  capabilities: {
    cache: boolean
    compute: boolean
    storage: boolean
    functions: boolean
  }
  load: {
    current: number
    capacity: number
    health: 'healthy' | 'degraded' | 'unhealthy'
  }
}

// Cache configuration
export interface CacheConfig {
  levels: CacheLevel[]
  defaultTTL: number
  maxAge: {
    static: number
    api: number
    emergency: number
    user_data: number
  }
  compression: {
    enabled: boolean
    algorithm: 'gzip' | 'brotli' | 'zstd'
    level: number
  }
  invalidation: {
    strategies: InvalidationStrategy[]
    emergencyPurge: boolean
  }
}

// Cache level
export interface CacheLevel {
  name: string
  type: 'browser' | 'edge' | 'regional' | 'origin'
  maxSize: number // MB
  ttl: number // seconds
  priority: number
  compression: boolean
}

// Invalidation strategy
export interface InvalidationStrategy {
  type: 'time' | 'event' | 'api' | 'manual'
  pattern: string
  priority: 'high' | 'medium' | 'low'
}

// Routing strategy
export enum RoutingStrategy {
  NEAREST = 'nearest',
  LOWEST_LATENCY = 'lowest_latency',
  LEAST_LOADED = 'least_loaded',
  ROUND_ROBIN = 'round_robin',
  HEALTH_AWARE = 'health_aware',
  PERFORMANCE_BASED = 'performance_based'
}

// Edge performance metrics
export interface EdgePerformanceMetrics {
  region: string
  edgeLocation: string
  latency: {
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    requests_per_second: number
    bandwidth_mbps: number
  }
  cache: {
    hit_rate: number
    miss_rate: number
    size_utilization: number
  }
  availability: {
    uptime: number
    error_rate: number
    health_score: number
  }
  timestamp: Date
}

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
    this.cacheConfig = {
      levels: [
        {
          name: 'browser',
          type: 'browser',
          maxSize: 50, // 50MB
          ttl: 300, // 5 minutes
          priority: 1,
          compression: true
        },
        {
          name: 'edge',
          type: 'edge',
          maxSize: 500, // 500MB
          ttl: 600, // 10 minutes
          priority: 2,
          compression: true
        },
        {
          name: 'regional',
          type: 'regional',
          maxSize: 2000, // 2GB
          ttl: 1800, // 30 minutes
          priority: 3,
          compression: true
        },
        {
          name: 'origin',
          type: 'origin',
          maxSize: 10000, // 10GB
          ttl: 3600, // 1 hour
          priority: 4,
          compression: true
        }
      ],
      defaultTTL: 600, // 10 minutes
      maxAge: {
        static: 86400 * 30, // 30 days
        api: 300, // 5 minutes
        emergency: 60, // 1 minute
        user_data: 600 // 10 minutes
      },
      compression: {
        enabled: true,
        algorithm: 'brotli',
        level: 6
      },
      invalidation: {
        strategies: [
          { type: 'time', pattern: '*/5 * * * *', priority: 'medium' },
          { type: 'event', pattern: 'emergency_update', priority: 'high' },
          { type: 'api', pattern: '/api/invalidate', priority: 'high' }
        ],
        emergencyPurge: true
      }
    }

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
    request: {
      clientIP?: string
      userAgent?: string
      path?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
    },
    fallbackStrategy?: RoutingStrategy
  ): Promise<{
    edgeLocation: EdgeLocation
    routingDecision: string
    estimatedLatency: number
    confidence: number
  }> {
    const timerId = performanceMonitor.startTimer('edge_routing', {
      routing_strategy: this.routingStrategy
    })

    try {
      // Determine client location
      const clientLocation = await this.getClientLocation(request.clientIP)
      
      // Get candidate edge locations
      const candidates = this.getCandidateEdgeLocations(clientLocation, request.path)
      
      // Apply routing strategy
      const selectedEdge = this.applyRoutingStrategy(candidates, clientLocation, request)
      
      // Calculate routing metrics
      const estimatedLatency = this.calculateEstimatedLatency(clientLocation, selectedEdge)
      const confidence = this.calculateRoutingConfidence(selectedEdge, candidates)
      
      const routingDecision = this.generateRoutingDecision(selectedEdge, candidates, request)
      
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
  optimizeCacheHeaders(
    response: Response,
    resource: {
      type: 'static' | 'api' | 'emergency' | 'user_data'
      priority: 'low' | 'medium' | 'high' | 'critical'
      location?: string
      lastModified?: Date
      etag?: string
    }
  ): Response {
    const timerId = performanceMonitor.startTimer('cache_optimization', {
      resource_type: resource.type,
      priority: resource.priority
    })

    try {
      // Determine cache level and TTL
      const cacheLevel = this.determineCacheLevel(resource)
      const ttl = this.calculateTTL(resource, cacheLevel)
      
      // Set cache control headers
      response.headers.set('Cache-Control', this.buildCacheControlHeader(cacheLevel, ttl, resource))
      
      // Set CDN-specific headers
      response.headers.set('Edge-Cache-Tag', this.generateCacheTag(resource))
      response.headers.set('Edge-Cache-Key', this.generateCacheKey(resource))
      
      // Set compression headers
      if (this.cacheConfig.compression.enabled) {
        response.headers.set('Content-Encoding', this.cacheConfig.compression.algorithm)
        response.headers.set('Vary', 'Accept-Encoding')
      }
      
      // Set geographic headers
      if (resource.location) {
        response.headers.set('X-Edge-Location', resource.location)
      }
      
      // Set priority headers
      response.headers.set('X-Priority', resource.priority)
      
      // Set ETag if provided
      if (resource.etag) {
        response.headers.set('ETag', resource.etag)
      }
      
      // Set Last-Modified if provided
      if (resource.lastModified) {
        response.headers.set('Last-Modified', resource.lastModified.toUTCString())
      }

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
      const invalidatedLocations: string[] = []
      const errors: string[] = []

      // Determine target edge locations
      const targetEdges = options.edgeLocations 
        ? options.edgeLocations.map(id => this.edgeLocations.get(id)).filter(Boolean) as EdgeLocation[]
        : Array.from(this.edgeLocations.values())

      // Execute invalidation in parallel
      const invalidationPromises = targetEdges.map(async (edge) => {
        try {
          const success = await this.invalidateEdgeCache(edge, pattern, options)
          if (success) {
            invalidatedLocations.push(edge.id)
          }
          return success
        } catch (error) {
          errors.push(`Failed to invalidate ${edge.id}: ${error.message}`)
          return false
        }
      })

      const results = await Promise.allSettled(invalidationPromises)
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length

      const executionTime = performanceMonitor.endTimer(timerId, 'edge', 'cache_invalidation_time')

      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'cache_invalidation_time',
        value: executionTime,
        unit: 'ms',
        tags: {
          pattern,
          success_count: successCount.toString(),
          total_edges: targetEdges.length.toString(),
          urgent: options.urgent?.toString() || 'false'
        }
      })

      return {
        success: successCount === targetEdges.length,
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
        errors: [error.message]
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

      const metrics: EdgePerformanceMetrics[] = []

      for (const edge of targetEdges) {
        const edgeMetrics = await this.collectEdgeMetrics(edge, timeRange)
        metrics.push(edgeMetrics)
      }

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

      throw new Error(`Failed to collect edge metrics: ${error.message}`)
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
      
      // Reduce cache TTLs for emergency data
      this.cacheConfig.maxAge.emergency = 30 // 30 seconds
      
      // Increase cache priority for emergency resources
      this.cacheConfig.levels.forEach(level => {
        if (level.name === 'edge') {
          level.ttl = 300 // 5 minutes
        }
      })
      
      // Preload emergency-critical resources
      await this.preloadEmergencyResources()
      
      // Enable emergency purge capability
      this.cacheConfig.invalidation.emergencyPurge = true
      
      // Increase health check frequency
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
      // Restore normal routing strategy
      this.routingStrategy = RoutingStrategy.PERFORMANCE_BASED
      
      // Restore normal cache TTLs
      this.cacheConfig.maxAge.emergency = 60 // 1 minute
      
      // Restore normal cache levels
      this.cacheConfig.levels.forEach(level => {
        if (level.name === 'edge') {
          level.ttl = 600 // 10 minutes
        }
      })
      
      // Disable emergency purge capability
      this.cacheConfig.invalidation.emergencyPurge = false
      
      // Restore normal health monitoring
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

  /**
   * Private helper methods
   */

  private initializeGeographicRegions(): void {
    // Initialize major geographic regions
    const regions: GeographicRegion[] = [
      {
        id: 'na-east',
        name: 'North America East',
        code: 'US-EAST',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        edgeLocations: [],
        population: 50000000,
        timezone: 'America/New_York'
      },
      {
        id: 'na-west',
        name: 'North America West',
        code: 'US-WEST',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        edgeLocations: [],
        population: 40000000,
        timezone: 'America/Los_Angeles'
      },
      {
        id: 'eu-west',
        name: 'Europe West',
        code: 'EU-WEST',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        edgeLocations: [],
        population: 45000000,
        timezone: 'Europe/London'
      },
      {
        id: 'eu-central',
        name: 'Europe Central',
        code: 'EU-CENTRAL',
        coordinates: { lat: 52.5200, lng: 13.4050 },
        edgeLocations: [],
        population: 35000000,
        timezone: 'Europe/Berlin'
      },
      {
        id: 'asia-east',
        name: 'Asia East',
        code: 'ASIA-EAST',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        edgeLocations: [],
        population: 60000000,
        timezone: 'Asia/Tokyo'
      },
      {
        id: 'asia-southeast',
        name: 'Asia Southeast',
        code: 'ASIA-SE',
        coordinates: { lat: 1.3521, lng: 103.8198 },
        edgeLocations: [],
        population: 40000000,
        timezone: 'Asia/Singapore'
      }
    ]

    regions.forEach(region => {
      this.regions.set(region.id, region)
    })
  }

  private initializeEdgeLocations(): void {
    // Initialize edge locations for each region
    const edgeLocations: EdgeLocation[] = [
      // North America East
      {
        id: 'cf-ewr',
        name: 'Cloudflare Newark',
        provider: 'cloudflare',
        region: 'na-east',
        city: 'Newark',
        coordinates: { lat: 40.7357, lng: -74.1724 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.3, capacity: 1.0, health: 'healthy' }
      },
      {
        id: 'aws-iad',
        name: 'AWS US East (N. Virginia)',
        provider: 'aws',
        region: 'na-east',
        city: 'Ashburn',
        coordinates: { lat: 39.0437, lng: -77.4875 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.4, capacity: 1.0, health: 'healthy' }
      },
      
      // North America West
      {
        id: 'cf-sfo',
        name: 'Cloudflare San Francisco',
        provider: 'cloudflare',
        region: 'na-west',
        city: 'San Francisco',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.2, capacity: 1.0, health: 'healthy' }
      },
      
      // Europe West
      {
        id: 'cf-lhr',
        name: 'Cloudflare London',
        provider: 'cloudflare',
        region: 'eu-west',
        city: 'London',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.5, capacity: 1.0, health: 'healthy' }
      },
      
      // Europe Central
      {
        id: 'cf-fra',
        name: 'Cloudflare Frankfurt',
        provider: 'cloudflare',
        region: 'eu-central',
        city: 'Frankfurt',
        coordinates: { lat: 50.1109, lng: 8.6821 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.3, capacity: 1.0, health: 'healthy' }
      },
      
      // Asia East
      {
        id: 'cf-nrt',
        name: 'Cloudflare Tokyo',
        provider: 'cloudflare',
        region: 'asia-east',
        city: 'Tokyo',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.4, capacity: 1.0, health: 'healthy' }
      },
      
      // Asia Southeast
      {
        id: 'cf-sin',
        name: 'Cloudflare Singapore',
        provider: 'cloudflare',
        region: 'asia-southeast',
        city: 'Singapore',
        coordinates: { lat: 1.3521, lng: 103.8198 },
        capabilities: { cache: true, compute: true, storage: true, functions: true },
        load: { current: 0.2, capacity: 1.0, health: 'healthy' }
      }
    ]

    edgeLocations.forEach(edge => {
      this.edgeLocations.set(edge.id, edge)
      
      // Add to region
      const region = this.regions.get(edge.region)
      if (region) {
        region.edgeLocations.push(edge)
      }
    })
  }

  private async getClientLocation(clientIP?: string): Promise<{ lat: number; lng: number; country?: string; city?: string }> {
    // In a real implementation, this would use a geolocation service
    // For now, return approximate location based on IP or default
    
    if (clientIP) {
      // Use IP geolocation service
      try {
        const response = await fetch(`https://ipapi.co/${clientIP}/json/`)
        const data = await response.json()
        
        return {
          lat: data.latitude,
          lng: data.longitude,
          country: data.country_name,
          city: data.city
        }
      } catch (error) {
        console.warn('Failed to get client location from IP:', error)
      }
    }

    // Fallback to approximate location
    return { lat: 40.7128, lng: -74.0060 } // Default to New York
  }

  private getCandidateEdgeLocations(
    clientLocation: { lat: number; lng: number },
    path?: string
  ): EdgeLocation[] {
    const candidates: EdgeLocation[] = []
    
    // Get all healthy edge locations
    for (const edge of this.edgeLocations.values()) {
      if (edge.load.health === 'healthy' && edge.capabilities.cache) {
        candidates.push(edge)
      }
    }
    
    // Filter by path-specific requirements
    if (path?.includes('/api/emergency')) {
      // Only use edges with compute capabilities for emergency APIs
      return candidates.filter(edge => edge.capabilities.compute)
    }
    
    return candidates
  }

  private applyRoutingStrategy(
    candidates: EdgeLocation[],
    clientLocation: { lat: number; lng: number },
    request: any
  ): EdgeLocation {
    switch (this.routingStrategy) {
      case RoutingStrategy.NEAREST:
        return this.getNearestEdge(candidates, clientLocation)
      
      case RoutingStrategy.LOWEST_LATENCY:
        return this.getLowestLatencyEdge(candidates, clientLocation)
      
      case RoutingStrategy.LEAST_LOADED:
        return this.getLeastLoadedEdge(candidates)
      
      case RoutingStrategy.ROUND_ROBIN:
        return this.getRoundRobinEdge(candidates)
      
      case RoutingStrategy.HEALTH_AWARE:
        return this.getHealthAwareEdge(candidates)
      
      case RoutingStrategy.PERFORMANCE_BASED:
        return this.getPerformanceBasedEdge(candidates, clientLocation, request)
      
      default:
        return candidates[0]
    }
  }

  private getNearestEdge(candidates: EdgeLocation[], clientLocation: { lat: number; lng: number }): EdgeLocation {
    let nearestEdge = candidates[0]
    let minDistance = Infinity

    for (const edge of candidates) {
      const distance = this.calculateDistance(clientLocation, edge.coordinates)
      if (distance < minDistance) {
        minDistance = distance
        nearestEdge = edge
      }
    }

    return nearestEdge
  }

  private getLowestLatencyEdge(candidates: EdgeLocation[], clientLocation: { lat: number; lng: number }): EdgeLocation {
    let bestEdge = candidates[0]
    let minLatency = Infinity

    for (const edge of candidates) {
      const latency = this.getEdgeLatency(edge.id)
      if (latency < minLatency) {
        minLatency = latency
        bestEdge = edge
      }
    }

    return bestEdge
  }

  private getLeastLoadedEdge(candidates: EdgeLocation[]): EdgeLocation {
    return candidates.reduce((least, current) => 
      current.load.current < least.load.current ? current : least
    )
  }

  private getRoundRobinEdge(candidates: EdgeLocation[]): EdgeLocation {
    const weights = Array.from(this.loadBalancingWeights.values())
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < candidates.length; i++) {
      random -= this.loadBalancingWeights.get(candidates[i].id) || 1
      if (random <= 0) {
        return candidates[i]
      }
    }

    return candidates[0]
  }

  private getHealthAwareEdge(candidates: EdgeLocation[]): EdgeLocation {
    // Prioritize edges with better health scores
    const healthyEdges = candidates.filter(edge => edge.load.health === 'healthy')
    const degradedEdges = candidates.filter(edge => edge.load.health === 'degraded')
    
    if (healthyEdges.length > 0) {
      return this.getLeastLoadedEdge(healthyEdges)
    } else if (degradedEdges.length > 0) {
      return this.getLeastLoadedEdge(degradedEdges)
    }
    
    return candidates[0]
  }

  private getPerformanceBasedEdge(
    candidates: EdgeLocation[],
    clientLocation: { lat: number; lng: number },
    request: any
  ): EdgeLocation {
    // Calculate performance score for each edge
    const scoredEdges = candidates.map(edge => {
      const distance = this.calculateDistance(clientLocation, edge.coordinates)
      const latency = this.getEdgeLatency(edge.id)
      const load = edge.load.current
      
      // Weighted score (lower is better)
      const score = (distance * 0.3) + (latency * 0.4) + (load * 1000 * 0.3)
      
      return { edge, score }
    })

    // Sort by score and return best
    scoredEdges.sort((a, b) => a.score - b.score)
    return scoredEdges[0].edge
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    // Haversine formula
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat)
    const dLng = this.toRadians(point2.lng - point1.lng)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private getEdgeLatency(edgeId: string): number {
    // Get recent latency metrics for edge
    const metrics = this.performanceMetrics.get(edgeId)
    if (metrics && metrics.length > 0) {
      const latest = metrics[metrics.length - 1]
      return latest.latency.p95
    }
    
    // Fallback to estimated latency based on distance
    return 100 // Default 100ms
  }

  private calculateEstimatedLatency(
    clientLocation: { lat: number; lng: number },
    edge: EdgeLocation
  ): number {
    const distance = this.calculateDistance(clientLocation, edge.coordinates)
    // Base latency calculation (simplified)
    return Math.max(10, distance * 0.5) // Minimum 10ms, 0.5ms per km
  }

  private calculateRoutingConfidence(
    selectedEdge: EdgeLocation,
    candidates: EdgeLocation[]
  ): number {
    // Calculate confidence based on edge health and performance consistency
    const healthScore = selectedEdge.load.health === 'healthy' ? 1.0 : 
                       selectedEdge.load.health === 'degraded' ? 0.7 : 0.3
    
    const metrics = this.performanceMetrics.get(selectedEdge.id)
    const performanceScore = metrics && metrics.length > 1 ? 
      1.0 - (Math.abs(metrics[metrics.length - 1].latency.p95 - metrics[metrics.length - 2].latency.p95) / metrics[metrics.length - 2].latency.p95) : 0.8
    
    return (healthScore + performanceScore) / 2
  }

  private generateRoutingDecision(
    selectedEdge: EdgeLocation,
    candidates: EdgeLocation[],
    request: any
  ): string {
    const reasons: string[] = []
    
    reasons.push(`Selected ${selectedEdge.name} (${selectedEdge.provider})`)
    reasons.push(`Strategy: ${this.routingStrategy}`)
    reasons.push(`Health: ${selectedEdge.load.health}`)
    reasons.push(`Load: ${(selectedEdge.load.current * 100).toFixed(1)}%`)
    
    if (request.priority === 'critical') {
      reasons.push('Priority: CRITICAL - fastest path selected')
    }
    
    return reasons.join('; ')
  }

  private getFallbackEdgeLocation(strategy?: RoutingStrategy): EdgeLocation {
    const fallbackStrategy = strategy || RoutingStrategy.NEAREST
    const healthyEdges = Array.from(this.edgeLocations.values())
      .filter(edge => edge.load.health === 'healthy')
    
    if (healthyEdges.length === 0) {
      // Return any edge if none are healthy
      return Array.from(this.edgeLocations.values())[0]
    }
    
    switch (fallbackStrategy) {
      case RoutingStrategy.NEAREST:
        // Return first healthy edge (simplified)
        return healthyEdges[0]
      default:
        return healthyEdges[0]
    }
  }

  private determineCacheLevel(resource: any): CacheLevel {
    switch (resource.type) {
      case 'static':
        return this.cacheConfig.levels.find(level => level.name === 'edge') || this.cacheConfig.levels[0]
      case 'api':
        return this.cacheConfig.levels.find(level => level.name === 'edge') || this.cacheConfig.levels[0]
      case 'emergency':
        return this.cacheConfig.levels.find(level => level.name === 'browser') || this.cacheConfig.levels[0]
      case 'user_data':
        return this.cacheConfig.levels.find(level => level.name === 'regional') || this.cacheConfig.levels[0]
      default:
        return this.cacheConfig.levels[0]
    }
  }

  private calculateTTL(resource: any, cacheLevel: CacheLevel): number {
    const baseTTL = this.cacheConfig.maxAge[resource.type] || this.cacheConfig.defaultTTL
    
    // Adjust TTL based on priority
    const priorityMultiplier = resource.priority === 'critical' ? 0.5 :
                            resource.priority === 'high' ? 0.7 :
                            resource.priority === 'medium' ? 0.9 : 1.0
    
    return Math.min(cacheLevel.ttl, baseTTL * priorityMultiplier)
  }

  private buildCacheControlHeader(cacheLevel: CacheLevel, ttl: number, resource: any): string {
    const directives = [
      `max-age=${ttl}`,
      'public',
      `stale-while-revalidate=${Math.floor(ttl * 0.5)}`,
      `stale-if-error=${Math.floor(ttl * 0.2)}`
    ]
    
    if (resource.priority === 'critical') {
      directives.push('must-revalidate')
    }
    
    return directives.join(', ')
  }

  private generateCacheTag(resource: any): string {
    const tags = [
      resource.type,
      resource.priority || 'medium',
      resource.location || 'global'
    ]
    
    if (resource.type === 'emergency') {
      tags.push('emergency-data')
    }
    
    return tags.join(',')
  }

  private generateCacheKey(resource: any): string {
    const keyParts = [
      resource.type,
      resource.location || 'global',
      resource.lastModified?.getTime().toString() || '0'
    ]
    
    return keyParts.join(':')
  }

  private async invalidateEdgeCache(
    edge: EdgeLocation,
    pattern: string,
    options: any
  ): Promise<boolean> {
    // In a real implementation, this would call the edge provider's API
    // For now, simulate success
    return true
  }

  private getEdgesByRegion(regionId: string): EdgeLocation[] {
    const region = this.regions.get(regionId)
    return region ? region.edgeLocations : []
  }

  private async collectEdgeMetrics(
    edge: EdgeLocation,
    timeRange?: { start: Date; end: Date }
  ): Promise<EdgePerformanceMetrics> {
    // In a real implementation, this would collect actual metrics from the edge
    // For now, return simulated metrics
    return {
      region: edge.region,
      edgeLocation: edge.id,
      latency: {
        p50: 50 + Math.random() * 50,
        p95: 100 + Math.random() * 100,
        p99: 200 + Math.random() * 200
      },
      throughput: {
        requests_per_second: 1000 + Math.random() * 2000,
        bandwidth_mbps: 100 + Math.random() * 100
      },
      cache: {
        hit_rate: 0.8 + Math.random() * 0.15,
        miss_rate: 0.05 + Math.random() * 0.15,
        size_utilization: edge.load.current
      },
      availability: {
        uptime: 0.99 + Math.random() * 0.01,
        error_rate: 0.001 + Math.random() * 0.009,
        health_score: edge.load.health === 'healthy' ? 0.9 + Math.random() * 0.1 : 0.5 + Math.random() * 0.3
      },
      timestamp: new Date()
    }
  }

  private async preloadEmergencyResources(): Promise<void> {
    // Preload critical emergency resources
    const emergencyResources = [
      '/api/emergency',
      '/emergency-map.js',
      '/emergency-alerts.js',
      '/offline/emergency'
    ]
    
    for (const resource of emergencyResources) {
      // Trigger preload via link headers
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      link.as = resource.endsWith('.js') ? 'script' : 'fetch'
      document.head.appendChild(link)
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkEdgeHealth()
    }, 30000)
  }

  private startEmergencyHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Check health every 10 seconds in emergency mode
    this.healthCheckInterval = setInterval(async () => {
      await this.checkEdgeHealth()
    }, 10000)
  }

  private async checkEdgeHealth(): Promise<void> {
    for (const edge of this.edgeLocations.values()) {
      try {
        // Simulate health check
        const isHealthy = await this.performHealthCheck(edge)
        
        // Update edge health status
        edge.load.health = isHealthy ? 'healthy' : 
                           edge.load.health === 'unhealthy' ? 'unhealthy' : 'degraded'
        
        // Update load metrics
        edge.load.current = Math.random() * 0.8 // Simulated load
        
      } catch (error) {
        edge.load.health = 'unhealthy'
        console.warn(`Health check failed for ${edge.id}:`, error)
      }
    }
  }

  private async performHealthCheck(edge: EdgeLocation): Promise<boolean> {
    // In a real implementation, this would perform actual health checks
    // For now, simulate with 95% success rate
    return Math.random() > 0.05
  }

  private startPerformanceCollection(): void {
    // Collect performance metrics every minute
    setInterval(async () => {
      await this.collectPerformanceMetrics()
    }, 60000)
  }

  private async collectPerformanceMetrics(): Promise<void> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    for (const edge of this.edgeLocations.values()) {
      const metrics = await this.collectEdgeMetrics(edge, {
        start: oneHourAgo,
        end: now
      })
      
      if (!this.performanceMetrics.has(edge.id)) {
        this.performanceMetrics.set(edge.id, [])
      }
      
      const edgeMetrics = this.performanceMetrics.get(edge.id)!
      edgeMetrics.push(metrics)
      
      // Keep only last 24 hours of metrics
      const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const filteredMetrics = edgeMetrics.filter(m => m.timestamp > cutoffTime)
      this.performanceMetrics.set(edge.id, filteredMetrics)
    }
  }

  /**
   * Public API methods
   */

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

  async getEdgeStatus(): Promise<{
    totalEdges: number
    healthyEdges: number
    degradedEdges: number
    unhealthyEdges: number
    averageLoad: number
  }> {
    const edges = Array.from(this.edgeLocations.values())
    const healthyEdges = edges.filter(e => e.load.health === 'healthy').length
    const degradedEdges = edges.filter(e => e.load.health === 'degraded').length
    const unhealthyEdges = edges.filter(e => e.load.health === 'unhealthy').length
    const averageLoad = edges.reduce((sum, e) => sum + e.load.current, 0) / edges.length

    return {
      totalEdges: edges.length,
      healthyEdges,
      degradedEdges,
      unhealthyEdges,
      averageLoad
    }
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