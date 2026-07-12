/**
 * Edge routing selection logic for the edge optimizer.
 *
 * Pure functions (no instance state): given a set of candidate edge locations,
 * the client's location, the active routing strategy, and a latency lookup,
 * pick the best edge. Extracted from `edge-optimizer.ts` to keep the main
 * class focused on lifecycle and orchestration.
 */

import { calculateDistance } from './edge-helpers'
import {
  RoutingStrategy
} from './edge-types'
import type {
  Coordinates,
  EdgeLocation,
  EdgePerformanceMetrics,
  EdgeRoutingRequest
} from './edge-types'

/**
 * Resolve recent p95 latency for an edge from its metric history, with a
 * 100ms default when no metrics are available yet.
 */
export function getEdgeLatency(
  edgeId: string,
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): number {
  const metrics = performanceMetrics.get(edgeId)
  if (metrics && metrics.length > 0) {
    const latest = metrics[metrics.length - 1]
    return latest!.latency.p95
  }
  return 100 // Default 100ms
}

/**
 * Select the nearest edge to the client by great-circle distance.
 */
export function getNearestEdge(
  candidates: EdgeLocation[],
  clientLocation: Coordinates
): EdgeLocation {
  return candidates.reduce((nearest, edge) => {
    const distance = calculateDistance(clientLocation, edge.coordinates)
    return distance < calculateDistance(clientLocation, nearest.coordinates) ? edge : nearest
  }, candidates[0]!)
}

/**
 * Select the edge with the lowest recent p95 latency.
 */
export function getLowestLatencyEdge(
  candidates: EdgeLocation[],
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): EdgeLocation {
  return candidates.reduce((best, edge) =>
    getEdgeLatency(edge.id, performanceMetrics) < getEdgeLatency(best.id, performanceMetrics) ? edge : best
  , candidates[0]!)
}

/**
 * Select the edge with the lowest current load.
 */
export function getLeastLoadedEdge(candidates: EdgeLocation[]): EdgeLocation {
  return candidates.reduce((least, current) =>
    current.load.current < least.load.current ? current : least
  )
}

/**
 * Weighted round-robin selection using load-balancing weights.
 */
export function getRoundRobinEdge(
  candidates: EdgeLocation[],
  loadBalancingWeights: Map<string, number>
): EdgeLocation {
  const weights = Array.from(loadBalancingWeights.values())
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < candidates.length; i++) {
    random -= loadBalancingWeights.get(candidates[i]!.id) || 1
    if (random <= 0) {
      return candidates[i]!
    }
  }

  return candidates[0]!
}

/**
 * Select an edge preferring healthy over degraded over unhealthy, breaking
 * ties by lowest load.
 */
export function getHealthAwareEdge(candidates: EdgeLocation[]): EdgeLocation {
  const healthyEdges = candidates.filter(edge => edge.load.health === 'healthy')
  const degradedEdges = candidates.filter(edge => edge.load.health === 'degraded')

  if (healthyEdges.length > 0) {
    return getLeastLoadedEdge(healthyEdges)
  } else if (degradedEdges.length > 0) {
    return getLeastLoadedEdge(degradedEdges)
  }

  return candidates[0]!
}

/**
 * Select an edge by a weighted performance score combining distance, latency,
 * and current load (lower is better).
 */
export function getPerformanceBasedEdge(
  candidates: EdgeLocation[],
  clientLocation: Coordinates,
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): EdgeLocation {
  const scoredEdges = candidates.map(edge => {
    const distance = calculateDistance(clientLocation, edge.coordinates)
    const latency = getEdgeLatency(edge.id, performanceMetrics)
    const load = edge.load.current
    const score = (distance * 0.3) + (latency * 0.4) + (load * 1000 * 0.3)
    return { edge, score }
  })

  scoredEdges.sort((a, b) => a.score - b.score)
  return scoredEdges[0]!.edge
}

/**
 * Apply the active routing strategy to pick a single edge from the candidates.
 */
export function applyRoutingStrategy(
  candidates: EdgeLocation[],
  clientLocation: Coordinates,
  strategy: RoutingStrategy,
  loadBalancingWeights: Map<string, number>,
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): EdgeLocation {
  switch (strategy) {
    case RoutingStrategy.NEAREST:
      return getNearestEdge(candidates, clientLocation)

    case RoutingStrategy.LOWEST_LATENCY:
      return getLowestLatencyEdge(candidates, performanceMetrics)

    case RoutingStrategy.LEAST_LOADED:
      return getLeastLoadedEdge(candidates)

    case RoutingStrategy.ROUND_ROBIN:
      return getRoundRobinEdge(candidates, loadBalancingWeights)

    case RoutingStrategy.HEALTH_AWARE:
      return getHealthAwareEdge(candidates)

    case RoutingStrategy.PERFORMANCE_BASED:
      return getPerformanceBasedEdge(candidates, clientLocation, performanceMetrics)

    default:
      return candidates[0]!
  }
}

/**
 * Calculate a 0..1 confidence score for a routing decision based on the
 * selected edge's health and latency stability.
 */
export function calculateRoutingConfidence(
  selectedEdge: EdgeLocation,
  performanceMetrics: Map<string, EdgePerformanceMetrics[]>
): number {
  const healthScore = selectedEdge.load.health === 'healthy' ? 1.0
    : selectedEdge.load.health === 'degraded' ? 0.7 : 0.3

  const metrics = performanceMetrics.get(selectedEdge.id)
  const performanceScore = metrics && metrics.length > 1
    ? 1.0 - (Math.abs(metrics[metrics.length - 1]!.latency.p95 - metrics[metrics.length - 2]!.latency.p95) / metrics[metrics.length - 2]!.latency.p95) : 0.8

  return (healthScore + performanceScore) / 2
}

/**
 * Build a human-readable routing-decision summary string.
 */
export function generateRoutingDecision(
  selectedEdge: EdgeLocation,
  strategy: RoutingStrategy,
  request: EdgeRoutingRequest
): string {
  const reasons: string[] = []

  reasons.push(`Selected ${selectedEdge.name} (${selectedEdge.provider})`)
  reasons.push(`Strategy: ${strategy}`)
  reasons.push(`Health: ${selectedEdge.load.health}`)
  reasons.push(`Load: ${(selectedEdge.load.current * 100).toFixed(1)}%`)

  if (request.priority === 'critical') {
    reasons.push('Priority: CRITICAL - fastest path selected')
  }

  return reasons.join('; ')
}

/**
 * Collect healthy, cache-capable candidate edge locations, optionally
 * filtered to compute-capable edges for emergency API paths.
 */
export function getCandidateEdgeLocations(
  edgeLocations: Map<string, EdgeLocation>,
  path?: string
): EdgeLocation[] {
  const candidates: EdgeLocation[] = []

  for (const edge of Array.from(edgeLocations.values())) {
    if (edge.load.health === 'healthy' && edge.capabilities.cache) {
      candidates.push(edge)
    }
  }

  // Only use edges with compute capabilities for emergency APIs
  if (path?.includes('/api/emergency')) {
    return candidates.filter(edge => edge.capabilities.compute)
  }

  return candidates
}

/**
 * Pick a fallback edge when normal routing fails: prefer the first healthy
 * edge, falling back to any edge if none are healthy.
 */
export function getFallbackEdgeLocation(
  edgeLocations: Map<string, EdgeLocation>
): EdgeLocation {
  const healthyEdges = Array.from(edgeLocations.values())
    .filter(edge => edge.load.health === 'healthy')

  if (healthyEdges.length === 0) {
    return Array.from(edgeLocations.values())[0]!
  }

  return healthyEdges[0]!
}
