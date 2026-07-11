/**
 * Service Worker and PWA Performance Optimizer
 *
 * This module provides comprehensive optimization for service workers and Progressive Web App
 * performance, focusing on caching strategies, background sync, offline functionality,
 * and resource management for emergency scenarios.
 *
 * Types and helper managers live in dedicated modules under src/lib/pwa/.
 * This file re-exports them for backward compatibility and hosts the
 * ServiceWorkerOptimizer facade class.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { edgeOptimizer } from '../edge/edge-optimizer'
import { CacheManager } from './cache-manager'
import { BackgroundSyncManager } from './sw-background-sync'
import { PushNotificationManager } from './sw-push-handler'
import { EmergencyModeManager } from './sw-emergency-mode'
import { SWPerformanceMonitor } from './sw-performance-monitor'
import { getDefaultServiceWorkerConfig } from './sw-config'
import type {
  RuntimeCacheConfig,
  ServiceWorkerConfig,
  ServiceWorkerMetrics
} from './sw-types'

// Backward-compatible re-exports
export * from './sw-types'
export { CacheManager } from './cache-manager'

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
    this.config = getDefaultServiceWorkerConfig()
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
      performanceMonitor.recordMetric({
        type: 'edge',
        name: 'service_worker_cache_api_response',
        value: this.getResponseSize(response),
        unit: 'bytes',
        tags: { url, strategy }
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
    if (!newWorker) {
      return
    }

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
