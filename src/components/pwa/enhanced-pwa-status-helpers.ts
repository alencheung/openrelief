/**
 * Enhanced PWA Status Helpers
 *
 * Types, defaults, and pure helper functions extracted from EnhancedPWAStatus.
 */

export interface CacheStatus {
  name: string
  size: number
  entries: number
  lastModified: Date
  type: 'static' | 'dynamic' | 'emergency' | 'offline'
}

export interface PerformanceMetrics {
  loadComplete: number
  domContentLoaded: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  cacheHitRate: number
  totalRequests: number
  cachedRequests: number
}

export interface ServiceWorkerStatus {
  supported: boolean
  enabled: boolean
  state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant'
  version: string
  lastUpdate: Date | null
  updateAvailable: boolean
}

export type PwaTabId = 'overview' | 'network' | 'storage' | 'performance' | 'sync'

// Default performance metrics state
export const createDefaultPerformanceMetrics = (): PerformanceMetrics => ({
  loadComplete: 0,
  domContentLoaded: 0,
  cacheHitRate: 0,
  totalRequests: 0,
  cachedRequests: 0
})

// Default service worker status state
export const createDefaultServiceWorkerStatus = (): ServiceWorkerStatus => ({
  supported: false,
  enabled: false,
  state: 'installed',
  version: '2.0.0',
  lastUpdate: null,
  updateAvailable: false
})

// Default network quality state
export const createDefaultNetworkQuality = () => ({
  effectiveType: 'unknown',
  downlink: 0,
  rtt: 0,
  saveData: false
})

// Get connection quality color classes based on effective type
export const getConnectionQualityColor = (type: string) => {
  switch (type) {
    case '4g':
      return 'text-green-600 bg-green-50 border-green-200'
    case '3g':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case '2g':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'slow-2g':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// Get performance grade based on load time
export const getPerformanceGrade = (loadTime: number) => {
  if (loadTime < 1000) {
    return { grade: 'A', color: 'text-green-600' }
  }
  if (loadTime < 2000) {
    return { grade: 'B', color: 'text-yellow-600' }
  }
  if (loadTime < 3000) {
    return { grade: 'C', color: 'text-orange-600' }
  }
  return { grade: 'D', color: 'text-red-600' }
}

// Get cache type color classes
export const getCacheTypeColor = (type: CacheStatus['type']) => {
  switch (type) {
    case 'static':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'dynamic':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'emergency':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'offline':
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// Map an effective type string to a quality label
export const getQualityLabel = (effectiveType?: string): string => {
  switch (effectiveType) {
    case '4g':
      return 'Excellent'
    case '3g':
      return 'Good'
    case '2g':
      return 'Fair'
    case 'slow-2g':
      return 'Poor'
    default:
      return 'Unknown'
  }
}
