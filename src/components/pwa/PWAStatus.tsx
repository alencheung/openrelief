'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PWACacheManager, OfflineStorage, NetworkUtils, PWAPerformance, formatFileSize, formatDuration } from '@/lib/pwa-utils'
import { 
  WifiIcon, 
  WifiOffIcon, 
  DatabaseIcon, 
  HardDriveIcon,
  ActivityIcon,
  RefreshCwIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon
} from 'lucide-react'

interface CacheStatus {
  name: string
  size: number
  entries: number
  lastModified: Date
}

interface StorageStatus {
  used: number
  quota: number
  percentage: number
}

export function PWAStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus[]>([])
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({ used: 0, quota: 0, percentage: 0 })
  const [networkQuality, setNetworkQuality] = useState<any>({})
  const [performance, setPerformance] = useState<any>({})
  const [queuedActions, setQueuedActions] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadStatus()
    
    // Listen for network changes
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadStatus = async () => {
    try {
      // Load cache status
      const cacheManager = PWACacheManager.getInstance()
      const caches = await cacheManager.getCacheInfo()
      setCacheStatus(caches)

      // Load storage status
      const storage = await cacheManager.estimateStorageUsage()
      setStorageStatus(storage)

      // Load network quality
      const quality = await NetworkUtils.getNetworkQuality()
      setNetworkQuality(quality)

      // Load performance metrics
      const perf = await PWAPerformance.measurePageLoad()
      setPerformance(perf)

      // Load queued actions
      const offlineStorage = OfflineStorage.getInstance()
      const actions = await offlineStorage.getActions()
      setQueuedActions(actions.filter((action: any) => !action.synced))
    } catch (error) {
      console.error('Failed to load PWA status:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadStatus()
    setIsRefreshing(false)
  }

  const handleClearCache = async (cacheName?: string) => {
    try {
      const cacheManager = PWACacheManager.getInstance()
      await cacheManager.clearCache(cacheName)
      await loadStatus()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const handlePreloadAssets = async () => {
    try {
      const cacheManager = PWACacheManager.getInstance()
      await cacheManager.preloadCriticalAssets()
      await loadStatus()
    } catch (error) {
      console.error('Failed to preload assets:', error)
    }
  }

  const getConnectionColor = (effectiveType: string) => {
    switch (effectiveType) {
      case '4g': return 'text-green-600'
      case '3g': return 'text-yellow-600'
      case '2g': return 'text-orange-600'
      case 'slow-2g': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPerformanceGrade = (loadTime: number) => {
    if (loadTime < 1000) return { grade: 'A', color: 'text-green-600' }
    if (loadTime < 2000) return { grade: 'B', color: 'text-yellow-600' }
    if (loadTime < 3000) return { grade: 'C', color: 'text-orange-600' }
    return { grade: 'D', color: 'text-red-600' }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">PWA Status</h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Network Status */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          {isOnline ? (
            <WifiIcon className="h-6 w-6 text-green-600" />
          ) : (
            <WifiOffIcon className="h-6 w-6 text-red-600" />
          )}
          <h2 className="text-xl font-semibold text-gray-900">
            Network Status
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Connection</div>
            <div className="text-lg font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Effective Type</div>
            <div className={`text-lg font-medium ${getConnectionColor(networkQuality.effectiveType)}`}>
              {networkQuality.effectiveType?.toUpperCase() || 'Unknown'}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Downlink</div>
            <div className="text-lg font-medium">
              {networkQuality.downlink ? `${networkQuality.downlink} Mbps` : 'Unknown'}
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Status */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <HardDriveIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Storage Status
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Storage Usage</span>
              <span className="text-sm font-medium">
                {formatFileSize(storageStatus.used)} / {formatFileSize(storageStatus.quota)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  storageStatus.percentage > 80 ? 'bg-red-600' : 
                  storageStatus.percentage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(storageStatus.percentage, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Queued Actions</div>
              <div className="text-lg font-medium text-orange-600">
                {queuedActions.length} items
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Cache Entries</div>
              <div className="text-lg font-medium">
                {cacheStatus.reduce((sum, cache) => sum + cache.entries, 0)} items
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cache Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DatabaseIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Cache Status
            </h2>
          </div>
          <div className="space-x-2">
            <Button onClick={handlePreloadAssets} size="sm" variant="outline">
              Preload Assets
            </Button>
            <Button onClick={() => handleClearCache()} size="sm" variant="outline">
              <TrashIcon className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {cacheStatus.map((cache, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{cache.name}</div>
                <div className="text-sm text-gray-600">
                  {cache.entries} entries • {formatFileSize(cache.size)}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {cache.lastModified.toLocaleTimeString()}
                </span>
                <Button
                  onClick={() => handleClearCache(cache.name)}
                  size="sm"
                  variant="ghost"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Status */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ActivityIcon className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Performance
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Page Load Time</div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium">
                {performance.loadComplete ? formatDuration(performance.loadComplete) : 'N/A'}
              </span>
              {performance.loadComplete && (
                <span className={`text-sm font-medium ${getPerformanceGrade(performance.loadComplete).color}`}>
                  Grade {getPerformanceGrade(performance.loadComplete).grade}
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">DOM Content Loaded</div>
            <div className="text-lg font-medium">
              {performance.domContentLoaded ? formatDuration(performance.domContentLoaded) : 'N/A'}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">First Contentful Paint</div>
            <div className="text-lg font-medium">
              {performance.firstContentfulPaint ? formatDuration(performance.firstContentfulPaint) : 'N/A'}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Largest Contentful Paint</div>
            <div className="text-lg font-medium">
              {performance.largestContentfulPaint ? formatDuration(performance.largestContentfulPaint) : 'N/A'}
            </div>
          </div>
        </div>
      </Card>

      {/* Queued Actions */}
      {queuedActions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ClockIcon className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Queued Actions ({queuedActions.length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {queuedActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{action.type}</div>
                  <div className="text-sm text-gray-600">
                    {action.endpoint} • {new Date(action.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Pending</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                These actions will be automatically synced when you regain internet connection.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}