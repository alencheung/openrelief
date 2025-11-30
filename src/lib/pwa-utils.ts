// PWA utility functions for OpenRelief emergency coordination platform

// Type definition for BeforeInstallPromptEvent (not in standard TypeScript definitions)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface CacheInfo {
  name: string
  size: number
  entries: number
  lastModified: Date
}

export interface OfflineAction {
  id: string
  type: string
  data: any
  endpoint: string
  method: string
  timestamp: number
  synced: boolean
}

// Cache management utilities
export class PWACacheManager {
  private static instance: PWACacheManager
  private cacheNames = {
    static: 'openrelief-static-v2.0.0',
    dynamic: 'openrelief-dynamic-v2.0.0',
    emergency: 'openrelief-emergency-v2.0.0',
    offline: 'openrelief-offline-v2.0.0'
  }

  static getInstance(): PWACacheManager {
    if (!PWACacheManager.instance) {
      PWACacheManager.instance = new PWACacheManager()
    }
    return PWACacheManager.instance
  }

  async getCacheInfo(): Promise<CacheInfo[]> {
    const cacheNames = await caches.keys()
    const cacheInfo: CacheInfo[] = []

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      let totalSize = 0

      for (const request of keys.slice(0, 10)) { // Sample first 10 entries
        const response = await cache.match(request)
        if (response) {
          const clonedResponse = response.clone()
          const buffer = await clonedResponse.arrayBuffer()
          totalSize += buffer.byteLength
        }
      }

      // Estimate total size based on sample
      const estimatedSize = Math.round((totalSize / Math.min(keys.length, 10)) * keys.length)

      cacheInfo.push({
        name,
        size: estimatedSize,
        entries: keys.length,
        lastModified: new Date()
      })
    }

    return cacheInfo
  }

  async clearCache(cacheName?: string): Promise<void> {
    if (cacheName) {
      await caches.delete(cacheName)
    } else {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
  }

  async preloadCriticalAssets(): Promise<void> {
    const criticalAssets = [
      '/',
      '/offline',
      '/offline/emergency',
      '/manifest.json',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png'
    ]

    const cache = await caches.open(this.cacheNames.static)

    try {
      await cache.addAll(criticalAssets.map(asset => new Request(asset, { cache: 'no-cache' })))
      console.log('[PWA] Critical assets preloaded successfully')
    } catch (error) {
      console.error('[PWA] Failed to preload critical assets:', error)
    }
  }

  async estimateStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: Number(estimate.usage) || 0,
        quota: Number(estimate.quota) || 0,
        percentage: ((Number(estimate.usage) || 0) / (Number(estimate.quota) || 1)) * 100
      }
    }

    return { used: 0, quota: 0, percentage: 0 }
  }
}

// Offline storage utilities
export class OfflineStorage {
  private static instance: OfflineStorage
  private db: IDBDatabase | null = null

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage()
    }
    return OfflineStorage.instance
  }

  async initDB(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OpenReliefOffline', 2)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('actions')) {
          const store = db.createObjectStore('actions', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
        }

        if (!db.objectStoreNames.contains('emergencyData')) {
          const store = db.createObjectStore('emergencyData', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('settings')) {
          const store = db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  async saveAction(action: OfflineAction): Promise<void> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      const request = store.add(action)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getActions(type?: string, synced: boolean = false): Promise<OfflineAction[]> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readonly')
      const store = transaction.objectStore('actions')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let actions = request.result

        if (type) {
          actions = actions.filter((action: OfflineAction) => action.type === type)
        }

        actions = actions.filter((action: OfflineAction) => action.synced === synced)

        resolve(actions)
      }
    })
  }

  async markActionSynced(actionId: string): Promise<void> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      const request = store.get(actionId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const action = request.result
        if (action) {
          action.synced = true
          const updateRequest = store.put(action)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        }
      }
    })
  }

  async saveEmergencyData(data: any): Promise<void> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['emergencyData'], 'readwrite')
      const store = transaction.objectStore('emergencyData')
      const request = store.put({
        ...data,
        id: `emergency_${Date.now()}`,
        timestamp: Date.now()
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getEmergencyData(type?: string): Promise<any[]> {
    await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['emergencyData'], 'readonly')
      const store = transaction.objectStore('emergencyData')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let data = request.result

        if (type) {
          data = data.filter((item: any) => item.type === type)
        }

        resolve(data)
      }
    })
  }
}

// Network utilities
export class NetworkUtils {
  static isOnline(): boolean {
    return navigator.onLine
  }

  static getConnectionType(): string | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return connection?.effectiveType || connection?.type || null
    }
    return null
  }

  static async testConnectivity(url: string = '/api/health'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  static async getNetworkQuality(): Promise<{
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      }
    }

    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    }
  }
}

// PWA installation utilities
export class PWAInstallUtils {
  static isInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
    )
  }

  static isInstallable(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  static getInstallPrompt(): Promise<BeforeInstallPromptEvent | null> {
    return new Promise((resolve) => {
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        resolve(e as BeforeInstallPromptEvent)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      // Timeout if no prompt received
      setTimeout(() => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        resolve(null)
      }, 10000)
    })
  }
}

// Performance monitoring
export class PWAPerformance {
  static async measurePageLoad(): Promise<{
    domContentLoaded: number
    loadComplete: number
    firstContentfulPaint?: number
    largestContentfulPaint?: number
  }> {
    return new Promise((resolve) => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      const metrics: {
        domContentLoaded: number
        loadComplete: number
        firstContentfulPaint?: number
        largestContentfulPaint?: number
      } = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      }

      // Get Web Vitals if available
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()

            for (const entry of entries) {
              if (entry.name === 'first-contentful-paint') {
                metrics.firstContentfulPaint = entry.startTime
              } else if (entry.name === 'largest-contentful-paint') {
                metrics.largestContentfulPaint = entry.startTime
              }
            }

            resolve(metrics)
          })

          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })

          // Fallback timeout
          setTimeout(() => resolve(metrics), 5000)
        } catch {
          resolve(metrics)
        }
      } else {
        resolve(metrics)
      }
    })
  }

  static async getCacheHitRate(): Promise<number> {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const transferSize = navigation.transferSize || 0
      const encodedBodySize = navigation.encodedBodySize || 0

      if (transferSize === 0 && encodedBodySize === 0) return 100
      if (encodedBodySize === 0) return 0

      return Math.max(0, 100 - (transferSize / encodedBodySize) * 100)
    } catch {
      return 0
    }
  }
}

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}