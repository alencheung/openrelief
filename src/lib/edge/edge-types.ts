/**
 * Shared types, enums, and interfaces for the edge optimizer.
 *
 * Extracted from `edge-optimizer.ts` to keep the main module focused on
 * orchestration. Re-exported from the optimizer for backward compatibility.
 */

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

// A geographic coordinate
export interface Coordinates {
  lat: number
  lng: number
}

// Shape of a request passed into getOptimalEdgeLocation
export interface EdgeRoutingRequest {
  clientIP?: string
  userAgent?: string
  path?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

// Shape of a resource passed into optimizeCacheHeaders
export interface CacheableResource {
  type: 'static' | 'api' | 'emergency' | 'user_data'
  priority: 'low' | 'medium' | 'high' | 'critical'
  location?: string
  lastModified?: Date
  etag?: string
}

// Result returned from getOptimalEdgeLocation
export interface EdgeRoutingResult {
  edgeLocation: EdgeLocation
  routingDecision: string
  estimatedLatency: number
  confidence: number
}
