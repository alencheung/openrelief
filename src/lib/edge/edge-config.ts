/**
 * Default configuration and seed data for the edge optimizer.
 *
 * Pure data only (no behavior): the default multi-level cache config, the
 * initial set of geographic regions, and the initial set of edge locations
 * per region. Extracted from `edge-optimizer.ts` to keep the main class
 * focused on behavior rather than static tables.
 */

import type { CacheConfig, EdgeLocation, GeographicRegion } from './edge-types'

/**
 * Default multi-level cache configuration used at startup.
 */
export function createDefaultCacheConfig(): CacheConfig {
  return {
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
}

/**
 * Initial set of major geographic regions covered by the optimizer.
 * Each region starts with an empty `edgeLocations` array; edge locations
 * are attached by `getInitialEdgeLocations`.
 */
export function getInitialRegions(): GeographicRegion[] {
  return [
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
}

/**
 * Initial set of edge locations, each tagged with the region it serves.
 */
export function getInitialEdgeLocations(): EdgeLocation[] {
  return [
    { id: 'cf-ewr', name: 'Cloudflare Newark', provider: 'cloudflare', region: 'na-east', city: 'Newark', coordinates: { lat: 40.7357, lng: -74.1724 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.3, capacity: 1.0, health: 'healthy' } },
    { id: 'aws-iad', name: 'AWS US East (N. Virginia)', provider: 'aws', region: 'na-east', city: 'Ashburn', coordinates: { lat: 39.0437, lng: -77.4875 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.4, capacity: 1.0, health: 'healthy' } },
    { id: 'cf-sfo', name: 'Cloudflare San Francisco', provider: 'cloudflare', region: 'na-west', city: 'San Francisco', coordinates: { lat: 37.7749, lng: -122.4194 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.2, capacity: 1.0, health: 'healthy' } },
    { id: 'cf-lhr', name: 'Cloudflare London', provider: 'cloudflare', region: 'eu-west', city: 'London', coordinates: { lat: 51.5074, lng: -0.1278 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.5, capacity: 1.0, health: 'healthy' } },
    { id: 'cf-fra', name: 'Cloudflare Frankfurt', provider: 'cloudflare', region: 'eu-central', city: 'Frankfurt', coordinates: { lat: 50.1109, lng: 8.6821 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.3, capacity: 1.0, health: 'healthy' } },
    { id: 'cf-nrt', name: 'Cloudflare Tokyo', provider: 'cloudflare', region: 'asia-east', city: 'Tokyo', coordinates: { lat: 35.6762, lng: 139.6503 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.4, capacity: 1.0, health: 'healthy' } },
    { id: 'cf-sin', name: 'Cloudflare Singapore', provider: 'cloudflare', region: 'asia-southeast', city: 'Singapore', coordinates: { lat: 1.3521, lng: 103.8198 }, capabilities: { cache: true, compute: true, storage: true, functions: true }, load: { current: 0.2, capacity: 1.0, health: 'healthy' } }
  ]
}

/**
 * Apply emergency-mode overrides to the cache config in place: shorter
 * emergency TTL, faster edge-level cache, and emergency purge enabled.
 */
export function applyEmergencyCacheOverrides(cacheConfig: CacheConfig): void {
  cacheConfig.maxAge.emergency = 30 // 30 seconds
  cacheConfig.levels.forEach(level => {
    if (level.name === 'edge') {
      level.ttl = 300 // 5 minutes
    }
  })
  cacheConfig.invalidation.emergencyPurge = true
}

/**
 * Restore normal cache config values after emergency mode is disabled.
 */
export function restoreDefaultCacheOverrides(cacheConfig: CacheConfig): void {
  cacheConfig.maxAge.emergency = 60 // 1 minute
  cacheConfig.levels.forEach(level => {
    if (level.name === 'edge') {
      level.ttl = 600 // 10 minutes
    }
  })
  cacheConfig.invalidation.emergencyPurge = false
}
