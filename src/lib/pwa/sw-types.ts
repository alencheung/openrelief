/**
 * Service Worker type definitions
 *
 * Shared types and interfaces for the service worker optimizer and related
 * managers (cache, background sync, push notifications, offline fallback,
 * performance, emergency mode).
 */

// Service worker configuration
export interface ServiceWorkerConfig {
  version: string
  cacheName: string
  emergencyCacheName: string
  precacheAssets: string[]
  runtimeCaches: RuntimeCacheConfig[]
  backgroundSync: BackgroundSyncConfig
  pushNotifications: PushNotificationConfig
  offlineFallback: OfflineFallbackConfig
  performance: PerformanceConfig
  emergencyMode: EmergencyModeConfig
}

// Runtime cache configuration
export interface RuntimeCacheConfig {
  name: string
  strategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'cacheOnly' | 'networkOnly'
  maxAge: number // seconds
  maxEntries: number
  match: string | RegExp | ((url: URL) => boolean)
  networkTimeoutSeconds?: number
  cacheableResponse?: {
    statuses: number[]
    headers: Record<string, string>
  }
}

// Background sync configuration
export interface BackgroundSyncConfig {
  enabled: boolean
  minRetries: number
  maxRetries: number
  retryDelay: number // milliseconds
  backoffMultiplier: number
  maxRetryDelay: number // milliseconds
  syncQueue: string[]
}

// Push notification configuration
export interface PushNotificationConfig {
  enabled: boolean
  vapidPublicKey: string
  emergencyPriority: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:MM
    end: string // HH:MM
    timezone: string
  }
  maxRetries: number
  retryDelay: number // milliseconds
}

// Offline fallback configuration
export interface OfflineFallbackConfig {
  enabled: boolean
  html: string
  image: string
  routes: Record<string, string>
  emergencyContent: {
    enabled: boolean
    criticalAlerts: boolean
    basicMap: boolean
    emergencyContacts: boolean
  }
}

// Performance configuration
export interface PerformanceConfig {
  maxCacheSize: number // bytes
  cleanupInterval: number // milliseconds
  compressionEnabled: boolean
  compressionLevel: number // 1-9
  deduplicationEnabled: boolean
  preloadCriticalResources: boolean
  lazyLoadNonCritical: boolean
}

// Emergency mode configuration
export interface EmergencyModeConfig {
  enabled: boolean
  autoActivate: boolean
  activationTriggers: EmergencyTrigger[]
  cacheStrategy: 'aggressive' | 'conservative'
  maxCacheSize: number // bytes
  criticalResources: string[]
  reducedFunctionality: boolean
  batteryOptimization: boolean
}

// Emergency trigger
export interface EmergencyTrigger {
  type: 'push' | 'network' | 'geolocation' | 'manual'
  condition: any
  action: 'activate' | 'prepare' | 'notify'
}

// Service worker metrics
export interface ServiceWorkerMetrics {
  version: string
  timestamp: Date
  cache: {
    totalSize: number
    entries: number
    hitRate: number
    missRate: number
    evictionRate: number
  }
  network: {
    requestsSaved: number
    bytesSaved: number
    averageLatencyReduction: number
  }
  backgroundSync: {
    queuedOperations: number
    successfulSyncs: number
    failedSyncs: number
    retryCount: number
  }
  pushNotifications: {
    received: number
    displayed: number
    clicked: number
    failed: number
  }
  performance: {
    startupTime: number
    averageResponseTime: number
    memoryUsage: number
    cpuUsage: number
  }
  emergencyMode: {
    active: boolean
    activationTime?: Date
    cacheHitRate: number
    criticalResourceAvailability: number
  }
}

// Cache entry metadata
export interface CacheEntryMetadata {
  url: string
  timestamp: number
  size: number
  etag?: string
  lastModified?: string
  expires?: number
  accessCount: number
  lastAccessed: number
  priority: 'low' | 'normal' | 'high' | 'critical'
  emergency: boolean
}
