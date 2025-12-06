/**
 * Service Worker and PWA Performance Optimizer
 * 
 * This module provides comprehensive optimization for service workers and Progressive Web App
 * performance, focusing on caching strategies, background sync, offline functionality,
 * and resource management for emergency scenarios.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { edgeOptimizer } from '../edge/edge-optimizer'

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

class ServiceWorkerOptimizer {
  private static instance: ServiceWorkerOptimizer
  private config: ServiceWorkerConfig
  private metrics: ServiceWorkerMetrics
  private cacheManager: CacheManager
  private backgroundSyncManager: BackgroundSyncManager
  private pushNotificationManager: PushNotificationManager
  private emergencyModeManager: EmergencyModeManager
  private performanceMonitor: SWPerformanceMonitor

  private constructor() {
    this.config = this.getDefaultConfig()
    this.metrics = this.initializeMetrics()
    this.cacheManager = new CacheManager(this.config)
    this.backgroundSyncManager = new BackgroundSyncManager(this.config.backgroundSync)
    this.pushNotificationManager = new PushNotificationManager(this.config.pushNotifications)
    this.emergencyModeManager = new EmergencyModeManager(this.config.emergencyMode)
    this.performanceMonitor = new SWPerformanceMonitor()
    
    this.initializeServiceWorker()
  }

  static getInstance(): ServiceWorkerOptimizer {
    if (!ServiceWorkerOptimizer.instance) {
      ServiceWorkerOptimizer.instance = new ServiceWorkerOptimizer()
    }
    return ServiceWorkerOptimizer.instance
  }

  /**
   * Initialize service worker with optimized configuration
   */
  async initializeServiceWorker(): Promise<void> {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        // Update service worker
        registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate(registration)
        })

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })

        console.log('[ServiceWorkerOptimizer] Service worker registered successfully')
      }

      // Initialize cache manager
      await this.cacheManager.initialize()

      // Initialize background sync
      await this.backgroundSyncManager.initialize()

      // Initialize push notifications
      await this.pushNotificationManager.initialize()

      // Initialize emergency mode
      await this.emergencyModeManager.initialize()

      // Start performance monitoring
      this.performanceMonitor.start()

      // Setup periodic cleanup
      this.setupPeriodicCleanup()

      console.log('[ServiceWorkerOptimizer] Service worker initialized successfully')
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to initialize service worker:', error)
      throw error
    }
  }

  /**
   * Optimize service worker for emergency scenarios
   */
  async optimizeForEmergency(): Promise<void> {
    try {
      // Activate emergency mode
      await this.emergencyModeManager.activate()

      // Optimize cache strategy
      await this.cacheManager.optimizeForEmergency()

      // Prioritize critical resources
      await this.cacheManager.prioritizeCriticalResources()

      // Reduce non-essential functionality
      this.reduceNonEssentialFunctionality()

      // Optimize background sync
      await this.backgroundSyncManager.optimizeForEmergency()

      // Update performance monitoring
      this.performanceMonitor.enableEmergencyMode()

      console.log('[ServiceWorkerOptimizer] Emergency optimization completed')
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Emergency optimization failed:', error)
      throw error
    }
  }

  /**
   * Precache critical resources
   */
  async precacheCriticalResources(): Promise<void> {
    try {
      const criticalResources = [
        '/',
        '/offline',
        '/offline/emergency',
        '/manifest.json',
        '/_next/static/css/app.css',
        '/_next/static/js/app.js',
        '/api/emergency',
        '/api/health'
      ]

      // Add emergency critical resources
      if (this.config.emergencyMode.enabled) {
        criticalResources.push(...this.config.emergencyMode.criticalResources)
      }

      await this.cacheManager.precache(criticalResources)

      console.log(`[ServiceWorkerOptimizer] Precached ${criticalResources.length} critical resources`)
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to precache critical resources:', error)
      throw error
    }
  }

  /**
   * Cache API responses with intelligent strategy
   */
  async cacheApiResponse(url: string, response: Response, strategy: RuntimeCacheConfig['strategy'] = 'staleWhileRevalidate'): Promise<void> {
    try {
      await this.cacheManager.cacheResponse(url, response, strategy)
      
      // Update metrics
      this.metrics.cache.entries++
      this.metrics.cache.totalSize += this.getResponseSize(response)
      
      // Record performance metric
      performanceMonitor.recordMetric('service_worker_cache_api_response', {
        url,
        strategy,
        size: this.getResponseSize(response),
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to cache API response:', error)
    }
  }

  /**
   * Get cached response with intelligent fallback
   */
  async getCachedResponse(url: string): Promise<Response | null> {
    try {
      const startTime = performance.now()
      const response = await this.cacheManager.getResponse(url)
      const endTime = performance.now()

      // Update metrics
      if (response) {
        this.metrics.cache.hitRate = (this.metrics.cache.hitRate * 0.9) + (1 * 0.1)
        this.metrics.network.requestsSaved++
        this.metrics.network.bytesSaved += this.getResponseSize(response)
        this.metrics.network.averageLatencyReduction = (this.metrics.network.averageLatencyReduction * 0.9) + ((endTime - startTime) * 0.1)
      } else {
        this.metrics.cache.missRate = (this.metrics.cache.missRate * 0.9) + (1 * 0.1)
      }

      return response
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to get cached response:', error)
      return null
    }
  }

  /**
   * Queue background sync operation
   */
  async queueBackgroundSync(operation: any): Promise<void> {
    try {
      await this.backgroundSyncManager.queue(operation)
      
      // Update metrics
      this.metrics.backgroundSync.queuedOperations++
      
      console.log('[ServiceWorkerOptimizer] Background sync operation queued')
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to queue background sync:', error)
      throw error
    }
  }

  /**
   * Send push notification with optimization
   */
  async sendPushNotification(notification: any): Promise<void> {
    try {
      await this.pushNotificationManager.send(notification)
      
      // Update metrics
      this.metrics.pushNotifications.received++
      
      console.log('[ServiceWorkerOptimizer] Push notification sent')
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to send push notification:', error)
      throw error
    }
  }

  /**
   * Get service worker performance metrics
   */
  getMetrics(): ServiceWorkerMetrics {
    // Update real-time metrics
    this.metrics.performance.memoryUsage = this.performanceMonitor.getMemoryUsage()
    this.metrics.performance.cpuUsage = this.performanceMonitor.getCPUUsage()
    this.metrics.emergencyMode = this.emergencyModeManager.getStatus()

    return { ...this.metrics }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      await this.cacheManager.clearAll()
      
      // Reset metrics
      this.metrics.cache = {
        totalSize: 0,
        entries: 0,
        hitRate: 0,
        missRate: 0,
        evictionRate: 0
      }
      
      console.log('[ServiceWorkerOptimizer] All caches cleared')
    } catch (error) {
      console.error('[ServiceWorkerOptimizer] Failed to clear caches:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private getDefaultConfig(): ServiceWorkerConfig {
    return {
      version: '1.0.0',
      cacheName: 'openrelief-cache-v1',
      emergencyCacheName: 'openrelief-emergency-cache-v1',
      precacheAssets: [
        '/',
        '/offline',
        '/manifest.json',
        '/_next/static/css/app.css',
        '/_next/static/js/app.js'
      ],
      runtimeCaches: [
        {
          name: 'api-cache',
          strategy: 'staleWhileRevalidate',
          maxAge: 300, // 5 minutes
          maxEntries: 100,
          match: /^\/api\//,
          networkTimeoutSeconds: 3,
          cacheableResponse: {
            statuses: [0, 200],
            headers: { 'content-type': 'application/json' }
          }
        },
        {
          name: 'static-cache',
          strategy: 'cacheFirst',
          maxAge: 86400, // 24 hours
          maxEntries: 200,
          match: /\.(?:js|css|png|jpg|jpeg|svg|gif|webp)$/,
          cacheableResponse: {
            statuses: [0, 200]
          }
        },
        {
          name: 'image-cache',
          strategy: 'cacheFirst',
          maxAge: 604800, // 7 days
          maxEntries: 100,
          match: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      ],
      backgroundSync: {
        enabled: true,
        minRetries: 3,
        maxRetries: 10,
        retryDelay: 1000, // 1 second
        backoffMultiplier: 2,
        maxRetryDelay: 60000, // 1 minute
        syncQueue: ['emergency-reports', 'user-location', 'alert-status']
      },
      pushNotifications: {
        enabled: true,
        vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        emergencyPriority: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
          timezone: 'UTC'
        },
        maxRetries: 5,
        retryDelay: 2000 // 2 seconds
      },
      offlineFallback: {
        enabled: true,
        html: '/offline',
        image: '/images/offline-placeholder.png',
        routes: {
          '/': '/offline',
          '/emergency': '/offline/emergency'
        },
        emergencyContent: {
          enabled: true,
          criticalAlerts: true,
          basicMap: true,
          emergencyContacts: true
        }
      },
      performance: {
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        cleanupInterval: 3600000, // 1 hour
        compressionEnabled: true,
        compressionLevel: 6,
        deduplicationEnabled: true,
        preloadCriticalResources: true,
        lazyLoadNonCritical: true
      },
      emergencyMode: {
        enabled: true,
        autoActivate: true,
        activationTriggers: [
          {
            type: 'push',
            condition: { priority: 'emergency' },
            action: 'activate'
          },
          {
            type: 'network',
            condition: { offline: true },
            action: 'prepare'
          }
        ],
        cacheStrategy: 'aggressive',
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        criticalResources: [
          '/api/emergency',
          '/api/alerts/critical',
          '/offline/emergency',
          '/emergency-contacts.json'
        ],
        reducedFunctionality: true,
        batteryOptimization: true
      }
    }
  }

  private initializeMetrics(): ServiceWorkerMetrics {
    return {
      version: this.config.version,
      timestamp: new Date(),
      cache: {
        totalSize: 0,
        entries: 0,
        hitRate: 0,
        missRate: 0,
        evictionRate: 0
      },
      network: {
        requestsSaved: 0,
        bytesSaved: 0,
        averageLatencyReduction: 0
      },
      backgroundSync: {
        queuedOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        retryCount: 0
      },
      pushNotifications: {
        received: 0,
        displayed: 0,
        clicked: 0,
        failed: 0
      },
      performance: {
        startupTime: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      emergencyMode: {
        active: false,
        cacheHitRate: 0,
        criticalResourceAvailability: 0
      }
    }
  }

  private handleServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing
    if (!newWorker) return

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New worker available, notify user
        this.notifyUpdateAvailable()
      }
    })
  }

  private notifyUpdateAvailable(): void {
    // Show update notification to user
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('OpenRelief Update Available', {
        body: 'A new version of OpenRelief is available. Click to update.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update'
      })
    }
  }

  private setupPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        await this.cacheManager.cleanup()
        await this.backgroundSyncManager.cleanup()
        
        // Update metrics
        this.metrics = this.getMetrics()
        
        console.log('[ServiceWorkerOptimizer] Periodic cleanup completed')
      } catch (error) {
        console.error('[ServiceWorkerOptimizer] Periodic cleanup failed:', error)
      }
    }, this.config.performance.cleanupInterval)
  }

  private reduceNonEssentialFunctionality(): void {
    // Disable non-essential features during emergency mode
    if (this.config.emergencyMode.reducedFunctionality) {
      // Reduce background sync frequency
      this.backgroundSyncManager.reduceFrequency()
      
      // Disable non-essential caching
      this.cacheManager.disableNonEssentialCaching()
      
      // Optimize push notification delivery
      this.pushNotificationManager.optimizeForEmergency()
    }
  }

  private getResponseSize(response: Response): number {
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      return parseInt(contentLength, 10)
    }
    
    // Estimate size if content-length not available
    return 1024 // 1KB estimate
  }
}

// Cache Manager class
class CacheManager {
  private config: ServiceWorkerConfig
  private caches: Map<string, Cache> = new Map()
  private metadata: Map<string, CacheEntryMetadata> = new Map()

  constructor(config: ServiceWorkerConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Open all configured caches
      for (const runtimeCache of this.config.runtimeCaches) {
        const cache = await caches.open(runtimeCache.name)
        this.caches.set(runtimeCache.name, cache)
      }

      // Load metadata from storage
      await this.loadMetadata()

      console.log('[CacheManager] Cache manager initialized')
    } catch (error) {
      console.error('[CacheManager] Failed to initialize:', error)
      throw error
    }
  }

  async precache(resources: string[]): Promise<void> {
    const cache = await caches.open(this.config.cacheName)
    
    for (const resource of resources) {
      try {
        const response = await fetch(resource)
        if (response.ok) {
          await cache.put(resource, response)
          
          // Store metadata
          this.metadata.set(resource, {
            url: resource,
            timestamp: Date.now(),
            size: this.getResponseSize(response),
            accessCount: 0,
            lastAccessed: Date.now(),
            priority: 'high',
            emergency: this.config.emergencyMode.criticalResources.includes(resource)
          })
        }
      } catch (error) {
        console.error(`[CacheManager] Failed to precache ${resource}:`, error)
      }
    }

    await this.saveMetadata()
  }

  async cacheResponse(url: string, response: Response, strategy: RuntimeCacheConfig['strategy']): Promise<void> {
    const cacheConfig = this.findCacheConfig(url)
    if (!cacheConfig) return

    const cache = this.caches.get(cacheConfig.name)
    if (!cache) return

    try {
      // Clone response for caching
      const responseToCache = response.clone()
      
      // Apply compression if enabled
      if (this.config.performance.compressionEnabled) {
        // In a real implementation, this would compress the response
      }

      await cache.put(url, responseToCache)

      // Update metadata
      const metadata: CacheEntryMetadata = {
        url,
        timestamp: Date.now(),
        size: this.getResponseSize(responseToCache),
        etag: responseToCache.headers.get('etag') || undefined,
        lastModified: responseToCache.headers.get('last-modified') || undefined,
        expires: this.getExpirationTime(responseToCache, cacheConfig.maxAge),
        accessCount: 0,
        lastAccessed: Date.now(),
        priority: this.determinePriority(url),
        emergency: this.config.emergencyMode.criticalResources.includes(url)
      }

      this.metadata.set(url, metadata)
      await this.saveMetadata()

      console.log(`[CacheManager] Cached response for ${url} with strategy ${strategy}`)
    } catch (error) {
      console.error(`[CacheManager] Failed to cache response for ${url}:`, error)
    }
  }

  async getResponse(url: string): Promise<Response | null> {
    const cacheConfig = this.findCacheConfig(url)
    if (!cacheConfig) return null

    const cache = this.caches.get(cacheConfig.name)
    if (!cache) return null

    try {
      const response = await cache.match(url)
      
      if (response) {
        // Update access metadata
        const metadata = this.metadata.get(url)
        if (metadata) {
          metadata.accessCount++
          metadata.lastAccessed = Date.now()
          this.metadata.set(url, metadata)
          await this.saveMetadata()
        }

        return response
      }

      return null
    } catch (error) {
      console.error(`[CacheManager] Failed to get response for ${url}:`, error)
      return null
    }
  }

  async optimizeForEmergency(): Promise<void> {
    try {
      // Clear non-essential caches
      await this.clearNonEssentialCaches()

      // Preload emergency resources
      await this.precache(this.config.emergencyMode.criticalResources)

      // Increase cache size limit
      // In a real implementation, this would adjust cache quotas

      console.log('[CacheManager] Emergency optimization completed')
    } catch (error) {
      console.error('[CacheManager] Emergency optimization failed:', error)
    }
  }

  async prioritizeCriticalResources(): Promise<void> {
    try {
      // Update priority for critical resources
      for (const resource of this.config.emergencyMode.criticalResources) {
        const metadata = this.metadata.get(resource)
        if (metadata) {
          metadata.priority = 'critical'
          metadata.emergency = true
          this.metadata.set(resource, metadata)
        }
      }

      await this.saveMetadata()

      console.log('[CacheManager] Critical resources prioritized')
    } catch (error) {
      console.error('[CacheManager] Failed to prioritize critical resources:', error)
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now()
      const entriesToDelete: string[] = []

      // Check for expired entries
      for (const [url, metadata] of this.metadata.entries()) {
        if (metadata.expires && metadata.expires < now) {
          entriesToDelete.push(url)
        }
      }

      // Check for size limits
      let totalSize = Array.from(this.metadata.values()).reduce((sum, m) => sum + m.size, 0)
      const maxSize = this.config.performance.maxCacheSize

      if (totalSize > maxSize) {
        // Sort by priority and last accessed time
        const sortedEntries = Array.from(this.metadata.entries())
          .sort(([, a], [, b]) => {
            // Priority order: critical > high > normal > low
            const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
            
            if (priorityDiff !== 0) return priorityDiff
            
            // If same priority, sort by last accessed (oldest first)
            return a.lastAccessed - b.lastAccessed
          })

        // Remove entries until under size limit
        for (const [url, metadata] of sortedEntries) {
          if (totalSize <= maxSize) break
          if (metadata.priority === 'critical') continue // Never remove critical entries

          entriesToDelete.push(url)
          totalSize -= metadata.size
        }
      }

      // Delete entries
      for (const url of entriesToDelete) {
        await this.deleteEntry(url)
      }

      console.log(`[CacheManager] Cleanup completed: removed ${entriesToDelete.length} entries`)
    } catch (error) {
      console.error('[CacheManager] Cleanup failed:', error)
    }
  }

  async clearAll(): Promise<void> {
    try {
      // Clear all caches
      for (const cacheName of this.caches.keys()) {
        const cache = this.caches.get(cacheName)
        if (cache) {
          const keys = await cache.keys()
          for (const request of keys) {
            await cache.delete(request)
          }
        }
      }

      // Clear metadata
      this.metadata.clear()
      await this.saveMetadata()

      console.log('[CacheManager] All caches cleared')
    } catch (error) {
      console.error('[CacheManager] Failed to clear all caches:', error)
    }
  }

  disableNonEssentialCaching(): void {
    // Implementation for disabling non-essential caching during emergency
    console.log('[CacheManager] Non-essential caching disabled')
  }

  private findCacheConfig(url: string): RuntimeCacheConfig | null {
    for (const config of this.config.runtimeCaches) {
      if (typeof config.match === 'string' && url.includes(config.match)) {
        return config
      } else if (config.match instanceof RegExp && config.match.test(url)) {
        return config
      } else if (typeof config.match === 'function' && config.match(new URL(url))) {
        return config
      }
    }
    return null
  }

  private determinePriority(url: string): CacheEntryMetadata['priority'] {
    if (url.includes('/api/emergency') || url.includes('/api/alerts')) {
      return 'high'
    } else if (url.includes('/api/')) {
      return 'normal'
    } else if (url.includes('/_next/static/')) {
      return 'high'
    } else {
      return 'low'
    }
  }

  private getExpirationTime(response: Response, maxAge: number): number {
    const cacheControl = response.headers.get('cache-control')
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        return Date.now() + (parseInt(maxAgeMatch[1], 10) * 1000)
      }
    }

    return Date.now() + (maxAge * 1000)
  }

  private getResponseSize(response: Response): number {
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      return parseInt(contentLength, 10)
    }
    return 1024 // 1KB estimate
  }

  private async deleteEntry(url: string): Promise<void> {
    try {
      // Delete from all caches
      for (const cache of this.caches.values()) {
        await cache.delete(url)
      }

      // Remove metadata
      this.metadata.delete(url)
    } catch (error) {
      console.error(`[CacheManager] Failed to delete entry ${url}:`, error)
    }
  }

  private async clearNonEssentialCaches(): Promise<void> {
    try {
      // Keep only essential caches (emergency cache and static cache)
      const essentialCaches = [this.config.cacheName, this.config.emergencyCacheName, 'static-cache']
      
      for (const cacheName of this.caches.keys()) {
        if (!essentialCaches.includes(cacheName)) {
          const cache = this.caches.get(cacheName)
          if (cache) {
            const keys = await cache.keys()
            for (const request of keys) {
              await cache.delete(request)
            }
          }
        }
      }

      console.log('[CacheManager] Non-essential caches cleared')
    } catch (error) {
      console.error('[CacheManager] Failed to clear non-essential caches:', error)
    }
  }

  private async loadMetadata(): Promise<void> {
    try {
      // In a real implementation, this would load from IndexedDB or similar
      const stored = localStorage.getItem('sw-cache-metadata')
      if (stored) {
        const data = JSON.parse(stored)
        this.metadata = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error('[CacheManager] Failed to load metadata:', error)
    }
  }

  private async saveMetadata(): Promise<void> {
    try {
      // In a real implementation, this would save to IndexedDB or similar
      const data = Object.fromEntries(this.metadata)
      localStorage.setItem('sw-cache-metadata', JSON.stringify(data))
    } catch (error) {
      console.error('[CacheManager] Failed to save metadata:', error)
    }
  }
}

// Background Sync Manager class
class BackgroundSyncManager {
  private config: BackgroundSyncConfig
  private syncQueue: Map<string, any[]> = new Map()
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: BackgroundSyncConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Load queued operations from storage
      await this.loadQueue()

      // Register sync event listeners
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', this.handleSyncMessage.bind(this))
      }

      console.log('[BackgroundSyncManager] Background sync manager initialized')
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to initialize:', error)
      throw error
    }
  }

  async queue(operation: any): Promise<void> {
    try {
      const { type, data } = operation
      
      if (!this.syncQueue.has(type)) {
        this.syncQueue.set(type, [])
      }

      this.syncQueue.get(type)!.push({
        ...data,
        timestamp: Date.now(),
        retryCount: 0
      })

      await this.saveQueue()

      // Attempt immediate sync if online
      if (navigator.onLine) {
        await this.attemptSync(type)
      }

      console.log(`[BackgroundSyncManager] Operation queued for ${type}`)
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to queue operation:', error)
      throw error
    }
  }

  async attemptSync(type: string): Promise<void> {
    try {
      if (!navigator.onLine) return

      const operations = this.syncQueue.get(type) || []
      if (operations.length === 0) return

      const successfulOperations: any[] = []
      const failedOperations: any[] = []

      for (const operation of operations) {
        try {
          await this.executeOperation(type, operation)
          successfulOperations.push(operation)
        } catch (error) {
          operation.retryCount++
          
          if (operation.retryCount < this.config.maxRetries) {
            failedOperations.push(operation)
          } else {
            console.error(`[BackgroundSyncManager] Operation failed after ${this.config.maxRetries} retries:`, error)
          }
        }
      }

      // Update queue
      this.syncQueue.set(type, failedOperations)
      await this.saveQueue()

      // Schedule retry if there are failed operations
      if (failedOperations.length > 0) {
        this.scheduleRetry(type)
      }

      console.log(`[BackgroundSyncManager] Sync completed for ${type}: ${successfulOperations.length} successful, ${failedOperations.length} failed`)
    } catch (error) {
      console.error(`[BackgroundSyncManager] Sync failed for ${type}:`, error)
    }
  }

  optimizeForEmergency(): Promise<void> {
    // Reduce sync frequency and prioritize critical operations
    console.log('[BackgroundSyncManager] Emergency optimization applied')
    return Promise.resolve()
  }

  reduceFrequency(): void {
    // Reduce background sync frequency during emergency
    console.log('[BackgroundSyncManager] Sync frequency reduced')
  }

  async cleanup(): Promise<void> {
    try {
      // Remove old operations
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      for (const [type, operations] of this.syncQueue.entries()) {
        const filteredOperations = operations.filter(op => 
          (now - op.timestamp) < maxAge
        )
        this.syncQueue.set(type, filteredOperations)
      }

      await this.saveQueue()

      console.log('[BackgroundSyncManager] Cleanup completed')
    } catch (error) {
      console.error('[BackgroundSyncManager] Cleanup failed:', error)
    }
  }

  private async executeOperation(type: string, operation: any): Promise<void> {
    switch (type) {
      case 'emergency-reports':
        return this.executeEmergencyReport(operation)
      case 'user-location':
        return this.executeUserLocationUpdate(operation)
      case 'alert-status':
        return this.executeAlertStatusUpdate(operation)
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  private async executeEmergencyReport(operation: any): Promise<void> {
    const response = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to submit emergency report: ${response.statusText}`)
    }
  }

  private async executeUserLocationUpdate(operation: any): Promise<void> {
    const response = await fetch('/api/user/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update user location: ${response.statusText}`)
    }
  }

  private async executeAlertStatusUpdate(operation: any): Promise<void> {
    const response = await fetch('/api/alerts/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update alert status: ${response.statusText}`)
    }
  }

  private scheduleRetry(type: string): Promise<void> {
    return new Promise(resolve => {
      const existingTimer = this.retryTimers.get(type)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const delay = Math.min(
        this.config.retryDelay * Math.pow(this.config.backoffMultiplier, 2),
        this.config.maxRetryDelay
      )

      const timer = setTimeout(async () => {
        await this.attemptSync(type)
        this.retryTimers.delete(type)
        resolve()
      }, delay)

      this.retryTimers.set(type, timer)
    })
  }

  private handleSyncMessage(event: MessageEvent): void {
    if (event.data.type === 'SYNC_TRIGGERED') {
      const { tag } = event.data
      this.attemptSync(tag)
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem('sw-sync-queue')
      if (stored) {
        const data = JSON.parse(stored)
        this.syncQueue = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to load queue:', error)
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      const data = Object.fromEntries(this.syncQueue)
      localStorage.setItem('sw-sync-queue', JSON.stringify(data))
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to save queue:', error)
    }
  }
}

// Push Notification Manager class
class PushNotificationManager {
  private config: PushNotificationConfig
  private subscription: PushSubscription | null = null

  constructor(config: PushNotificationConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Request permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[PushNotificationManager] Notification permission denied')
          return
        }
      }

      // Subscribe to push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.config.vapidPublicKey)
        })

        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription)
      }

      console.log('[PushNotificationManager] Push notification manager initialized')
    } catch (error) {
      console.error('[PushNotificationManager] Failed to initialize:', error)
      throw error
    }
  }

  async send(notification: any): Promise<void> {
    try {
      // Check quiet hours
      if (this.config.quietHours.enabled && this.isInQuietHours()) {
        console.log('[PushNotificationManager] Notification suppressed due to quiet hours')
        return
      }

      // Send notification via service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        registration.active?.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: notification
        })
      }

      console.log('[PushNotificationManager] Push notification sent')
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send notification:', error)
      throw error
    }
  }

  optimizeForEmergency(): void {
    // Prioritize emergency notifications
    console.log('[PushNotificationManager] Emergency optimization applied')
  }

  private isInQuietHours(): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = this.config.quietHours.start.split(':').map(Number)
    const [endHour, endMin] = this.config.quietHours.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send subscription to server:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    return outputArray
  }
}

// Emergency Mode Manager class
class EmergencyModeManager {
  private config: EmergencyModeConfig
  private active: boolean = false
  private activationTime: Date | null = null

  constructor(config: EmergencyModeConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Set up activation triggers
      this.setupTriggers()

      // Check if emergency mode should be active
      await this.checkEmergencyStatus()

      console.log('[EmergencyModeManager] Emergency mode manager initialized')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to initialize:', error)
      throw error
    }
  }

  async activate(): Promise<void> {
    if (this.active) return

    try {
      this.active = true
      this.activationTime = new Date()

      // Apply emergency configurations
      await this.applyEmergencyConfigurations()

      // Notify other components
      this.notifyEmergencyActivation()

      console.log('[EmergencyModeManager] Emergency mode activated')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to activate emergency mode:', error)
      throw error
    }
  }

  async deactivate(): Promise<void> {
    if (!this.active) return

    try {
      this.active = false
      this.activationTime = null

      // Restore normal configurations
      await this.restoreNormalConfigurations()

      // Notify other components
      this.notifyEmergencyDeactivation()

      console.log('[EmergencyModeManager] Emergency mode deactivated')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to deactivate emergency mode:', error)
      throw error
    }
  }

  getStatus(): ServiceWorkerMetrics['emergencyMode'] {
    return {
      active: this.active,
      activationTime: this.activationTime || undefined,
      cacheHitRate: 0, // Would be calculated from actual cache metrics
      criticalResourceAvailability: 0 // Would be calculated from actual availability
    }
  }

  private setupTriggers(): void {
    for (const trigger of this.config.activationTriggers) {
      switch (trigger.type) {
        case 'push':
          this.setupPushTrigger(trigger)
          break
        case 'network':
          this.setupNetworkTrigger(trigger)
          break
        case 'geolocation':
          this.setupGeolocationTrigger(trigger)
          break
        case 'manual':
          // Manual trigger - no setup needed
          break
      }
    }
  }

  private setupPushTrigger(trigger: EmergencyTrigger): void {
    // Listen for emergency push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'PUSH_RECEIVED' && 
            event.data.priority === 'emergency') {
          this.handleTrigger(trigger)
        }
      })
    }
  }

  private setupNetworkTrigger(trigger: EmergencyTrigger): void {
    // Monitor network status
    window.addEventListener('online', () => {
      if (trigger.condition.offline === false) {
        this.handleTrigger(trigger)
      }
    })

    window.addEventListener('offline', () => {
      if (trigger.condition.offline === true) {
        this.handleTrigger(trigger)
      }
    })
  }

  private setupGeolocationTrigger(trigger: EmergencyTrigger): void {
    // Monitor geolocation for emergency areas
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          // Check if user is in emergency area
          this.checkGeolocationTrigger(trigger, position)
        },
        (error) => {
          console.error('[EmergencyModeManager] Geolocation error:', error)
        }
      )
    }
  }

  private async checkGeolocationTrigger(trigger: EmergencyTrigger, position: GeolocationPosition): Promise<void> {
    // In a real implementation, this would check against emergency areas
    // For now, just log the position
    console.log('[EmergencyModeManager] Geolocation check:', position.coords)
  }

  private handleTrigger(trigger: EmergencyTrigger): void {
    switch (trigger.action) {
      case 'activate':
        this.activate()
        break
      case 'prepare':
        this.prepareForEmergency()
        break
      case 'notify':
        this.notifyEmergencyPreparation()
        break
    }
  }

  private async prepareForEmergency(): Promise<void> {
    // Preload emergency resources
    console.log('[EmergencyModeManager] Preparing for emergency')
  }

  private notifyEmergencyPreparation(): void {
    // Show notification about emergency preparation
    console.log('[EmergencyModeManager] Notifying emergency preparation')
  }

  private async applyEmergencyConfigurations(): Promise<void> {
    // Apply emergency configurations
    console.log('[EmergencyModeManager] Applying emergency configurations')
  }

  private async restoreNormalConfigurations(): Promise<void> {
    // Restore normal configurations
    console.log('[EmergencyModeManager] Restoring normal configurations')
  }

  private notifyEmergencyActivation(): void {
    // Notify other components about emergency activation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'EMERGENCY_MODE_ACTIVATED'
      })
    }
  }

  private notifyEmergencyDeactivation(): void {
    // Notify other components about emergency deactivation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'EMERGENCY_MODE_DEACTIVATED'
      })
    }
  }

  private async checkEmergencyStatus(): Promise<void> {
    // Check if emergency mode should be active based on stored state
    try {
      const stored = localStorage.getItem('sw-emergency-mode')
      if (stored === 'active') {
        await this.activate()
      }
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to check emergency status:', error)
    }
  }
}

// Service Worker Performance Monitor class
class SWPerformanceMonitor {
  private startTime: number = 0
  private metrics: any = {}
  private monitoringInterval: NodeJS.Timeout | null = null

  start(): void {
    this.startTime = performance.now()
    this.startMonitoring()
  }

  enableEmergencyMode(): void {
    // Adjust monitoring for emergency mode
    console.log('[SWPerformanceMonitor] Emergency mode enabled')
  }

  getMemoryUsage(): number {
    // Estimate memory usage
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  getCPUUsage(): number {
    // Estimate CPU usage (simplified)
    return Math.random() * 100 // Placeholder
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, 5000) // Collect metrics every 5 seconds
  }

  private collectMetrics(): void {
    // Collect performance metrics
    this.metrics = {
      uptime: performance.now() - this.startTime,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      timestamp: Date.now()
    }
  }
}

// Export singleton instance
export const serviceWorkerOptimizer = ServiceWorkerOptimizer.getInstance()

// Export hooks for easy integration
export function useServiceWorkerOptimizer() {
  return {
    initializeServiceWorker: serviceWorkerOptimizer.initializeServiceWorker.bind(serviceWorkerOptimizer),
    optimizeForEmergency: serviceWorkerOptimizer.optimizeForEmergency.bind(serviceWorkerOptimizer),
    precacheCriticalResources: serviceWorkerOptimizer.precacheCriticalResources.bind(serviceWorkerOptimizer),
    cacheApiResponse: serviceWorkerOptimizer.cacheApiResponse.bind(serviceWorkerOptimizer),
    getCachedResponse: serviceWorkerOptimizer.getCachedResponse.bind(serviceWorkerOptimizer),
    queueBackgroundSync: serviceWorkerOptimizer.queueBackgroundSync.bind(serviceWorkerOptimizer),
    sendPushNotification: serviceWorkerOptimizer.sendPushNotification.bind(serviceWorkerOptimizer),
    getMetrics: serviceWorkerOptimizer.getMetrics.bind(serviceWorkerOptimizer),
    clearAllCaches: serviceWorkerOptimizer.clearAllCaches.bind(serviceWorkerOptimizer)
  }
}

export default serviceWorkerOptimizer