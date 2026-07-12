/**
 * Edge metrics collection and health monitoring helpers.
 *
 * Pure functions (no instance state): simulated metrics generation, health
 * checks, performance metrics roll-up with a 24h retention window, edge
 * status summarization, and emergency resource preloading. Extracted from
 * `edge-optimizer.ts` to keep the main class focused on orchestration.
 */

import type {
  EdgeLocation,
  EdgePerformanceMetrics
} from './edge-types'

/**
 * Shape of an edge status summary returned by getEdgeStatus.
 */
export interface EdgeStatusSummary {
  totalEdges: number
  healthyEdges: number
  degradedEdges: number
  unhealthyEdges: number
  averageLoad: number
}

/**
 * Collect metrics for every edge in the list, preserving order.
 */
export async function collectMetricsForEdges(
  edges: EdgeLocation[],
  timeRange?: { start: Date; end: Date }
): Promise<EdgePerformanceMetrics[]> {
  const metrics: EdgePerformanceMetrics[] = []
  for (const edge of edges) {
    const edgeMetrics = await collectEdgeMetrics(edge, timeRange)
    metrics.push(edgeMetrics)
  }
  return metrics
}

/**
 * Generate simulated performance metrics for an edge location.
 * In a real implementation this would query the edge provider's metrics API.
 */
export async function collectEdgeMetrics(
  edge: EdgeLocation,
  timeRange?: { start: Date; end: Date }
): Promise<EdgePerformanceMetrics> {
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

/**
 * Perform a single edge health probe. Simulated at ~95% success rate.
 */
export async function performHealthCheck(edge: EdgeLocation): Promise<boolean> {
  return Math.random() > 0.05
}

/**
 * Run health checks across all edge locations and update their health/load
 * status in place.
 */
export async function checkEdgeHealth(
  edgeLocations: Map<string, EdgeLocation>
): Promise<void> {
  for (const edge of Array.from(edgeLocations.values())) {
    try {
      const isHealthy = await performHealthCheck(edge)
      edge.load.health = isHealthy ? 'healthy'
        : edge.load.health === 'unhealthy' ? 'unhealthy' : 'degraded'
      edge.load.current = Math.random() * 0.8
    } catch (error) {
      edge.load.health = 'unhealthy'
      console.warn(`Health check failed for ${edge.id}:`, error)
    }
  }
}

/**
 * Collect a fresh performance sample for every edge and append it to the
 * metrics history, retaining only the most recent 24 hours of samples.
 */
export async function collectPerformanceMetrics(
  edgeLocations: Map<string, EdgeLocation>,
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): Promise<void> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  for (const edge of Array.from(edgeLocations.values())) {
    const metrics = await collectEdgeMetrics(edge, {
      start: oneHourAgo,
      end: now
    })

    if (!performanceMetrics.has(edge.id)) {
      performanceMetrics.set(edge.id, [])
    }

    const edgeMetrics = performanceMetrics.get(edge.id)!
    edgeMetrics.push(metrics)

    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const filteredMetrics = edgeMetrics.filter(m => m.timestamp > cutoffTime)
    performanceMetrics.set(edge.id, filteredMetrics)
  }
}

/**
 * Summarize the health and load of all edge locations.
 */
export function getEdgeStatus(
  edgeLocations: Map<string, EdgeLocation>
): EdgeStatusSummary {
  const edges = Array.from(edgeLocations.values())
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

/**
 * Emergency-critical resources to preload via link headers.
 */
export const EMERGENCY_PRELOAD_RESOURCES = [
  '/api/emergency',
  '/emergency-map.js',
  '/emergency-alerts.js',
  '/offline/emergency'
]

/**
 * Inject <link rel="preload"> tags for emergency-critical resources so the
 * browser fetches them eagerly. Runs only in a browser environment.
 */
export async function preloadEmergencyResources(): Promise<void> {
  for (const resource of EMERGENCY_PRELOAD_RESOURCES) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    link.as = resource.endsWith('.js') ? 'script' : 'fetch'
    document.head.appendChild(link)
  }
}
