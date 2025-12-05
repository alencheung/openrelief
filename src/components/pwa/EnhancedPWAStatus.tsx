'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { PWACacheManager, OfflineStorage, NetworkUtils, PWAPerformance, formatFileSize, formatDuration } from '@/lib/pwa-utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  WifiIcon,
  WifiOffIcon,
  DatabaseIcon,
  HardDriveIcon,
  ActivityIcon,
  RefreshCwIcon,
  TrashIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ClockIcon,
  ZapIcon,
  ShieldIcon,
  DownloadIcon,
  UploadIcon,
  SettingsIcon,
  SmartphoneIcon,
  MonitorIcon,
  GlobeIcon,
  CpuIcon,
  MemoryStickIcon,
  BatteryIcon,
  SignalIcon,
  RouterIcon,
  ServerIcon,
  CloudIcon,
  CloudOffIcon,
  Loader2Icon,
  InfoIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react'

interface CacheStatus {
  name: string
  size: number
  entries: number
  lastModified: Date
  type: 'static' | 'dynamic' | 'emergency' | 'offline'
}

interface PerformanceMetrics {
  loadComplete: number
  domContentLoaded: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  cacheHitRate: number
  totalRequests: number
  cachedRequests: number
}

interface ServiceWorkerStatus {
  supported: boolean
  enabled: boolean
  state: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant'
  version: string
  lastUpdate: Date | null
  updateAvailable: boolean
}

export function EnhancedPWAStatus() {
  const { 
    isOnline, 
    isOffline, 
    connectionType,
    effectiveType,
    downlink,
    rtt,
    lastOnlineTime,
    lastOfflineTime
  } = useNetworkStatus()
  
  const { 
    isSyncing, 
    syncProgress, 
    pendingActions, 
    failedActions,
    metrics,
    storageQuota,
    settings
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [activeTab, setActiveTab] = useState<'overview' | 'network' | 'storage' | 'performance' | 'sync'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    loadComplete: 0,
    domContentLoaded: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    cachedRequests: 0
  })
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>({
    supported: false,
    enabled: false,
    state: 'installed',
    version: '2.0.0',
    lastUpdate: null,
    updateAvailable: false
  })
  const [networkQuality, setNetworkQuality] = useState({
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  })

  // Load initial data
  useEffect(() => {
    loadStatus()
  }, [])

  // Update network quality
  useEffect(() => {
    const updateNetworkQuality = async () => {
      const quality = await NetworkUtils.getNetworkQuality()
      setNetworkQuality(quality)
    }
    
    updateNetworkQuality()
    
    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const handleChange = () => updateNetworkQuality()
      
      connection.addEventListener('change', handleChange)
      return () => connection.removeEventListener('change', handleChange)
    }
  }, [])

  // Load status data
  const loadStatus = async () => {
    try {
      // Load cache status
      const cacheManager = PWACacheManager.getInstance()
      const caches = await cacheManager.getCacheInfo()
      setCacheStatus(caches)

      // Load performance metrics
      const perf = await PWAPerformance.measurePageLoad()
      const cacheHitRate = await PWAPerformance.getCacheHitRate()
      
      setPerformanceMetrics({
        ...perf,
        cacheHitRate,
        totalRequests: 100, // Mock data - would come from actual monitoring
        cachedRequests: Math.round(100 * cacheHitRate / 100)
      })

      // Load service worker status
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        setServiceWorkerStatus({
          supported: true,
          enabled: true,
          state: registration.active?.state as any || 'installed',
          version: '2.0.0',
          lastUpdate: new Date(),
          updateAvailable: false
        })
      }

      // Load network quality
      const quality = await NetworkUtils.getNetworkQuality()
      setNetworkQuality(quality)
    } catch (error) {
      console.error('Failed to load PWA status:', error)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    announcePolite('Refreshing PWA status information')
    
    await loadStatus()
    
    setIsRefreshing(false)
    announcePolite('PWA status updated')
  }

  // Handle cache clear
  const handleClearCache = async (cacheName?: string) => {
    try {
      const cacheManager = PWACacheManager.getInstance()
      await cacheManager.clearCache(cacheName)
      await loadStatus()
      announcePolite(`Cache ${cacheName ? 'cleared' : 'cleared all'} successfully`)
    } catch (error) {
      announceAssertive('Failed to clear cache')
      console.error('Failed to clear cache:', error)
    }
  }

  // Handle preload assets
  const handlePreloadAssets = async () => {
    try {
      const cacheManager = PWACacheManager.getInstance()
      await cacheManager.preloadCriticalAssets()
      await loadStatus()
      announcePolite('Critical assets preloaded successfully')
    } catch (error) {
      announceAssertive('Failed to preload assets')
      console.error('Failed to preload assets:', error)
    }
  }

  // Get connection quality color
  const getConnectionQualityColor = (type: string) => {
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

  // Get performance grade
  const getPerformanceGrade = (loadTime: number) => {
    if (loadTime < 1000) return { grade: 'A', color: 'text-green-600' }
    if (loadTime < 2000) return { grade: 'B', color: 'text-yellow-600' }
    if (loadTime < 3000) return { grade: 'C', color: 'text-orange-600' }
    return { grade: 'D', color: 'text-red-600' }
  }

  // Get cache type color
  const getCacheTypeColor = (type: CacheStatus['type']) => {
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">PWA Status</h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCwIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview', icon: GlobeIcon },
          { id: 'network', label: 'Network', icon: WifiIcon },
          { id: 'storage', label: 'Storage', icon: HardDriveIcon },
          { id: 'performance', label: 'Performance', icon: ActivityIcon },
          { id: 'sync', label: 'Sync', icon: RefreshCwIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-4 py-3 font-medium transition-colors
              border-b-2 -mb-px
              ${activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Connection Status */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Connection</h3>
                  {isOnline ? (
                    <WifiIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOffIcon className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <StatusIndicator
                  status={isOnline ? 'active' : 'inactive'}
                  size="sm"
                  label={isOnline ? 'Online' : 'Offline'}
                />
                <div className="mt-2 text-sm text-gray-600">
                  {connectionType && `${connectionType} • ${downlink ? downlink.toFixed(1) + ' Mbps' : 'Unknown speed'}`}
                </div>
              </Card>

              {/* Sync Status */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Sync</h3>
                  {isSyncing ? (
                    <Loader2Icon className="w-5 h-5 animate-spin text-blue-600" />
                  ) : pendingActions.length > 0 ? (
                    <ClockIcon className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle2Icon className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pendingActions.length}
                </div>
                <div className="text-sm text-gray-600">
                  Pending actions
                </div>
              </Card>

              {/* Storage Status */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Storage</h3>
                  <HardDriveIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(storageQuota.used / 1024 / 1024)}MB
                </div>
                <div className="text-sm text-gray-600">
                  of {Math.round(storageQuota.quota / 1024 / 1024)}MB used
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`
                      h-2 rounded-full transition-all duration-300
                      ${storageQuota.percentage > 80 
                        ? 'bg-red-500' 
                        : storageQuota.percentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }
                    `}
                    style={{ width: `${Math.min(100, storageQuota.percentage)}%` }}
                  />
                </div>
              </Card>

              {/* Performance Status */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Performance</h3>
                  <ActivityIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {getPerformanceGrade(performanceMetrics.loadComplete).grade}
                </div>
                <div className="text-sm text-gray-600">
                  Page load grade
                </div>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <DatabaseIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {cacheStatus.reduce((sum, cache) => sum + cache.entries, 0)}
                  </div>
                  <div className="text-xs text-gray-600">Cache entries</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ZapIcon className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {Math.round(performanceMetrics.cacheHitRate)}%
                  </div>
                  <div className="text-xs text-gray-600">Cache hit rate</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ShieldIcon className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {serviceWorkerStatus.enabled ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-xs text-gray-600">Service Worker</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Network Status</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Connection Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Connection Information</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <StatusIndicator
                      status={isOnline ? 'active' : 'inactive'}
                      size="sm"
                      label={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Type</span>
                    <div className="flex items-center gap-2">
                      {connectionType === 'wifi' && <WifiIcon className="w-4 h-4 text-blue-600" />}
                      {connectionType === 'cellular' && <SmartphoneIcon className="w-4 h-4 text-purple-600" />}
                      {connectionType === 'ethernet' && <MonitorIcon className="w-4 h-4 text-green-600" />}
                      <span className="text-sm font-medium">{connectionType || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Effective Type</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionQualityColor(effectiveType || 'unknown')}`}>
                      {(effectiveType || 'unknown').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Downlink</span>
                    <span className="text-sm font-medium">
                      {downlink ? `${downlink.toFixed(1)} Mbps` : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">RTT</span>
                    <span className="text-sm font-medium">
                      {rtt ? `${rtt}ms` : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Save Data</span>
                    <StatusIndicator
                      status={networkQuality.saveData ? 'inactive' : 'active'}
                      size="sm"
                      label={networkQuality.saveData ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                </div>
              </div>

              {/* Connection History */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Connection History</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Online</span>
                    <span className="text-sm font-medium">
                      {lastOnlineTime ? lastOnlineTime.toLocaleString() : 'Never'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Offline</span>
                    <span className="text-sm font-medium">
                      {lastOfflineTime ? lastOfflineTime.toLocaleString() : 'Never'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Connection Quality</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionQualityColor(effectiveType || 'unknown')}`}>
                      {effectiveType === '4g' ? 'Excellent' :
                       effectiveType === '3g' ? 'Good' :
                       effectiveType === '2g' ? 'Fair' :
                       effectiveType === 'slow-2g' ? 'Poor' : 'Unknown'}
                    </div>
                  </div>
                </div>

                {/* Network Quality Visualization */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Signal Quality</h4>
                  <div className="flex items-center gap-2">
                    <SignalIcon className="w-5 h-5 text-blue-600" />
                    <div className="flex-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className={`
                            h-4 rounded-sm transition-all duration-300
                            ${effectiveType === '4g' && bar <= 5 ? 'bg-green-500' :
                             effectiveType === '3g' && bar <= 4 ? 'bg-yellow-500' :
                             effectiveType === '2g' && bar <= 3 ? 'bg-orange-500' :
                             effectiveType === 'slow-2g' && bar <= 2 ? 'bg-red-500' :
                             'bg-gray-300'
                            }
                          `}
                          style={{
                            width: '8px',
                            height: `${bar * 4}px`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {effectiveType === '4g' ? 'Excellent' :
                       effectiveType === '3g' ? 'Good' :
                       effectiveType === '2g' ? 'Fair' :
                       effectiveType === 'slow-2g' ? 'Poor' : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Storage Management</h2>
              <div className="flex gap-2">
                <Button onClick={handlePreloadAssets} size="sm" variant="outline">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Preload Assets
                </Button>
                <Button onClick={() => handleClearCache()} size="sm" variant="outline">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
            
            {/* Storage Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Storage Usage</h3>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Used Space</span>
                    <span className="text-sm font-medium">
                      {formatFileSize(storageQuota.used)} / {formatFileSize(storageQuota.quota)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`
                        h-3 rounded-full transition-all duration-300
                        ${storageQuota.percentage > 80 
                          ? 'bg-red-500' 
                          : storageQuota.percentage > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }
                      `}
                      style={{ width: `${Math.min(100, storageQuota.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-600 font-medium">
                      {Math.round(storageQuota.percentage)}%
                    </span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Cache Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {cacheStatus.length}
                    </div>
                    <div className="text-sm text-gray-600">Cache stores</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {cacheStatus.reduce((sum, cache) => sum + cache.entries, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total entries</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {formatFileSize(cacheStatus.reduce((sum, cache) => sum + cache.size, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total size</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {Math.round(performanceMetrics.cacheHitRate)}%
                    </div>
                    <div className="text-sm text-gray-600">Hit rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cache Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Cache Details</h3>
              
              <div className="space-y-3">
                {cacheStatus.map((cache, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCacheTypeColor(cache.type)}`}>
                        <DatabaseIcon className="w-5 h-5" />
                      </div>
                      
                      <div>
                        <div className="font-medium text-gray-900">{cache.name}</div>
                        <div className="text-sm text-gray-600">
                          {cache.entries} entries • {formatFileSize(cache.size)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getCacheTypeColor(cache.type)}`}>
                        {cache.type}
                      </div>
                      
                      <Button
                        onClick={() => handleClearCache(cache.name)}
                        size="sm"
                        variant="ghost"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Page Load Performance */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Page Load Performance</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Load Complete</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDuration(performanceMetrics.loadComplete)}
                      </span>
                      <span className={`text-sm font-medium ${getPerformanceGrade(performanceMetrics.loadComplete).color}`}>
                        Grade {getPerformanceGrade(performanceMetrics.loadComplete).grade}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">DOM Content Loaded</span>
                    <span className="text-sm font-medium">
                      {formatDuration(performanceMetrics.domContentLoaded)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">First Contentful Paint</span>
                    <span className="text-sm font-medium">
                      {performanceMetrics.firstContentfulPaint ? 
                        formatDuration(performanceMetrics.firstContentfulPaint) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Largest Contentful Paint</span>
                    <span className="text-sm font-medium">
                      {performanceMetrics.largestContentfulPaint ? 
                        formatDuration(performanceMetrics.largestContentfulPaint) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cache Performance */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Cache Performance</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cache Hit Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${performanceMetrics.cacheHitRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(performanceMetrics.cacheHitRate)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Requests</span>
                    <span className="text-sm font-medium">
                      {performanceMetrics.totalRequests}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cached Requests</span>
                    <span className="text-sm font-medium text-green-600">
                      {performanceMetrics.cachedRequests}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Network Requests</span>
                    <span className="text-sm font-medium text-orange-600">
                      {performanceMetrics.totalRequests - performanceMetrics.cachedRequests}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Visualization */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Performance Breakdown</h3>
              
              <div className="space-y-3">
                {[
                  { name: 'DNS Lookup', time: 50, color: 'bg-blue-500' },
                  { name: 'TCP Connect', time: 100, color: 'bg-green-500' },
                  { name: 'Request', time: 200, color: 'bg-yellow-500' },
                  { name: 'Response', time: 300, color: 'bg-purple-500' },
                  { name: 'Processing', time: 150, color: 'bg-orange-500' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24">{item.name}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div 
                        className={`${item.color} h-4 rounded-full transition-all duration-300`}
                        style={{ width: `${(item.time / 800) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {item.time}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Synchronization Status</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sync Status */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Current Status</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sync Status</span>
                    <StatusIndicator
                      status={isSyncing ? 'pending' : 'active'}
                      size="sm"
                      label={isSyncing ? 'Syncing' : 'Idle'}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Actions</span>
                    <span className="text-sm font-medium text-orange-600">
                      {pendingActions.length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Failed Actions</span>
                    <span className="text-sm font-medium text-red-600">
                      {failedActions.length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Sync</span>
                    <span className="text-sm font-medium">
                      {metrics.lastSyncTime ? 
                        new Date(metrics.lastSyncTime).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium">
                      {Math.round(metrics.successRate)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Sync Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Sync Settings</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Auto Sync</span>
                    <StatusIndicator
                      status={settings.autoSync ? 'active' : 'inactive'}
                      size="sm"
                      label={settings.autoSync ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sync Interval</span>
                    <span className="text-sm font-medium">
                      {settings.syncInterval} minutes
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Retries</span>
                    <span className="text-sm font-medium">
                      {settings.maxRetries}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Background Sync</span>
                    <StatusIndicator
                      status={settings.backgroundSync ? 'active' : 'inactive'}
                      size="sm"
                      label={settings.backgroundSync ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Priority Sync</span>
                    <StatusIndicator
                      status={settings.prioritySync ? 'active' : 'inactive'}
                      size="sm"
                      label={settings.prioritySync ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-3">Sync Progress</h3>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">
                    {syncProgress.currentAction || 'Processing...'}
                  </span>
                  <span className="text-sm text-blue-700">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                </div>
                
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOnline ? 'You are online' : 'You are currently offline'}
          {isSyncing && 'Synchronization is in progress'}
          {pendingActions.length > 0 && `You have ${pendingActions.length} pending actions`}
          {failedActions.length > 0 && `You have ${failedActions.length} failed actions`}
          {storageQuota.percentage > 80 && 'Storage usage is critically high'}
        </div>
      </ScreenReaderOnly>
    </div>
  )
}