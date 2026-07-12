/**
 * Standalone helper functions for the edge optimizer.
 *
 * These are pure utilities (no instance state): geographic distance math,
 * TTL calculation, cache header/tag/key generation, cache level resolution,
 * and client-location geolocation. Extracted from `edge-optimizer.ts` to keep
 * the main class focused on orchestration and lifecycle.
 */

import type {
  CacheConfig,
  CacheLevel,
  CacheableResource,
  Coordinates,
  EdgeLocation
} from './edge-types'

/**
 * Convert degrees to radians.
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Great-circle distance between two coordinates (Haversine formula), in km.
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat)
  const dLng = toRadians(point2.lng - point1.lng)

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Estimate network latency from client to edge based on distance.
 * Minimum 10ms, ~0.5ms per km.
 */
export function calculateEstimatedLatency(
  clientLocation: Coordinates,
  edgeCoordinates: Coordinates
): number {
  const distance = calculateDistance(clientLocation, edgeCoordinates)
  return Math.max(10, distance * 0.5)
}

/**
 * Determine the most appropriate cache level for a resource type.
 */
export function determineCacheLevel(
  resource: Pick<CacheableResource, 'type'>,
  cacheConfig: CacheConfig
): CacheLevel {
  switch (resource.type) {
    case 'static':
      return cacheConfig.levels.find(level => level.name === 'edge') || cacheConfig.levels[0]!
    case 'api':
      return cacheConfig.levels.find(level => level.name === 'edge') || cacheConfig.levels[0]!
    case 'emergency':
      return cacheConfig.levels.find(level => level.name === 'browser') || cacheConfig.levels[0]!
    case 'user_data':
      return cacheConfig.levels.find(level => level.name === 'regional') || cacheConfig.levels[0]!
    default:
      return cacheConfig.levels[0]!
  }
}

/**
 * Calculate the effective TTL for a resource, factoring in priority.
 */
export function calculateTTL(
  resource: CacheableResource,
  cacheLevel: CacheLevel,
  cacheConfig: CacheConfig
): number {
  const baseTTL = cacheConfig.maxAge[resource.type] || cacheConfig.defaultTTL

  // Adjust TTL based on priority
  const priorityMultiplier = resource.priority === 'critical' ? 0.5
    : resource.priority === 'high' ? 0.7
      : resource.priority === 'medium' ? 0.9 : 1.0

  return Math.min(cacheLevel.ttl, baseTTL * priorityMultiplier)
}

/**
 * Build the Cache-Control header value for a cached response.
 */
export function buildCacheControlHeader(
  cacheLevel: CacheLevel,
  ttl: number,
  resource: CacheableResource
): string {
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

/**
 * Apply the full set of edge cache headers (Cache-Control, edge tags/keys,
 * compression, geography, priority, ETag, Last-Modified) to a response in
 * place, based on the resolved cache level, TTL, resource, and config.
 */
export function applyCacheHeaders(
  response: Response,
  resource: CacheableResource,
  cacheLevel: CacheLevel,
  ttl: number,
  cacheConfig: CacheConfig
): void {
  // Cache control + CDN-specific headers
  response.headers.set('Cache-Control', buildCacheControlHeader(cacheLevel, ttl, resource))
  response.headers.set('Edge-Cache-Tag', generateCacheTag(resource))
  response.headers.set('Edge-Cache-Key', generateCacheKey(resource))

  // Compression headers
  if (cacheConfig.compression.enabled) {
    response.headers.set('Content-Encoding', cacheConfig.compression.algorithm)
    response.headers.set('Vary', 'Accept-Encoding')
  }

  // Geographic header
  if (resource.location) {
    response.headers.set('X-Edge-Location', resource.location)
  }

  // Priority header
  response.headers.set('X-Priority', resource.priority)

  // ETag if provided
  if (resource.etag) {
    response.headers.set('ETag', resource.etag)
  }

  // Last-Modified if provided
  if (resource.lastModified) {
    response.headers.set('Last-Modified', resource.lastModified.toUTCString())
  }
}

/**
 * Generate a comma-separated edge cache tag for a resource.
 */
export function generateCacheTag(resource: CacheableResource): string {
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

/**
 * Generate a colon-separated cache key for a resource.
 */
export function generateCacheKey(resource: CacheableResource): string {
  const keyParts = [
    resource.type,
    resource.location || 'global',
    resource.lastModified?.getTime().toString() || '0'
  ]

  return keyParts.join(':')
}

/**
 * Resolve a client IP (or undefined) to approximate geographic coordinates.
 * Falls back to a New York default if geolocation fails.
 */
export async function getClientLocation(clientIP?: string): Promise<{
  lat: number
  lng: number
  country?: string
  city?: string
}> {
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

/**
 * Shape of the result returned by invalidateCacheAcrossEdges.
 */
export interface CacheInvalidationResult {
  success: boolean
  invalidatedLocations: string[]
  errors: string[]
}

/**
 * Resolve the target edge locations to invalidate against. If specific edge
 * ids are provided, only those (that exist) are used; otherwise all edges.
 */
export function resolveInvalidationTargets(
  edgeLocations: Map<string, EdgeLocation>,
  requestedEdgeIds?: string[]
): EdgeLocation[] {
  if (requestedEdgeIds) {
    return requestedEdgeIds
      .map(id => edgeLocations.get(id))
      .filter((e): e is EdgeLocation => Boolean(e))
  }
  return Array.from(edgeLocations.values())
}

/**
 * Run cache invalidation in parallel across the target edges, collecting
 * successes and per-edge failures.
 */
export async function invalidateCacheAcrossEdges(
  targetEdges: EdgeLocation[],
  pattern: string
): Promise<CacheInvalidationResult> {
  const invalidatedLocations: string[] = []
  const errors: string[] = []

  // In a real implementation, this would call each edge provider's API.
  // For now, every invalidation succeeds.
  const invalidationPromises = targetEdges.map(async (edge) => {
    try {
      invalidatedLocations.push(edge.id)
      return true
    } catch (error) {
      errors.push(`Failed to invalidate ${edge.id}: ${(error as Error).message}`)
      return false
    }
  })

  const results = await Promise.allSettled(invalidationPromises)
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length

  return {
    success: successCount === targetEdges.length,
    invalidatedLocations,
    errors
  }
}
