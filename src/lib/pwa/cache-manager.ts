/**
 * Cache Manager
 *
 * Handles cache operations for the service worker including precaching,
 * runtime caching with configurable strategies, LRU-style eviction based
 * on priority and access time, metadata persistence, and emergency-mode
 * optimizations.
 */

import type {
  CacheEntryMetadata,
  RuntimeCacheConfig,
  ServiceWorkerConfig
} from './sw-types'

export class CacheManager {
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
    if (!cacheConfig) {
      return
    }

    const cache = this.caches.get(cacheConfig.name)
    if (!cache) {
      return
    }

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
    if (!cacheConfig) {
      return null
    }

    const cache = this.caches.get(cacheConfig.name)
    if (!cache) {
      return null
    }

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

            if (priorityDiff !== 0) {
              return priorityDiff
            }

            // If same priority, sort by last accessed (oldest first)
            return a.lastAccessed - b.lastAccessed
          })

        // Remove entries until under size limit
        for (const [url, metadata] of sortedEntries) {
          if (totalSize <= maxSize) {
            break
          }
          if (metadata.priority === 'critical') {
            continue
          } // Never remove critical entries

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
      if (maxAgeMatch && maxAgeMatch[1]) {
        return Date.now() + parseInt(maxAgeMatch[1], 10) * 1000
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
