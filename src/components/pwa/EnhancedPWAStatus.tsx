'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import {
  PWACacheManager,
  PWAPerformance,
  NetworkUtils
} from '@/lib/pwa-utils'
import { Button } from '@/components/ui/Button'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import { RefreshCwIcon } from 'lucide-react'

// Re-export types and helpers for backward compatibility
export * from './enhanced-pwa-status-helpers'
import {
  createDefaultPerformanceMetrics,
  createDefaultServiceWorkerStatus,
  createDefaultNetworkQuality,
  type CacheStatus,
  type PerformanceMetrics,
  type ServiceWorkerStatus,
  type PwaTabId
} from './enhanced-pwa-status-helpers'
import {
  OverviewTab,
  NetworkTab,
  StorageTab,
  PerformanceTab,
  SyncTab,
  TAB_DEFINITIONS
} from './enhanced-pwa-status-tabs'

export function EnhancedPWAStatus() {
  const {
    isOnline,
    isOffline: _isOffline,
    connectionType,
    effectiveType,
    downlink,
    rtt
  } = useNetworkStatus()

  const { isSyncing, syncProgress, metrics, storageQuota, settings } = useOfflineStore()
  const pendingActions = metrics.pendingActions
  const failedActions = metrics.failedActions

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { isReduced: _prefersReducedMotion } = useReducedMotion()

  const [activeTab, setActiveTab] = useState<PwaTabId>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(
    createDefaultPerformanceMetrics()
  )
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus>(
    createDefaultServiceWorkerStatus()
  )
  const [networkQuality, setNetworkQuality] = useState(createDefaultNetworkQuality())

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
      const connection = (
        navigator as unknown as {
          connection?: {
            addEventListener: (event: string, handler: () => void) => void
            removeEventListener: (event: string, handler: () => void) => void
          }
        }
      ).connection
      const handleChange = () => updateNetworkQuality()

      connection?.addEventListener('change', handleChange)
      return () => connection?.removeEventListener('change', handleChange)
    }
    return undefined
  }, [])

  // Load status data
  const loadStatus = async () => {
    try {
      // Load cache status
      const cacheManager = PWACacheManager.getInstance()
      const caches = await cacheManager.getCacheInfo()
      setCacheStatus(
        caches.map(cache => ({
          ...cache,
          type: 'dynamic' as const
        }))
      )

      // Load performance metrics
      const perf = await PWAPerformance.measurePageLoad()
      const cacheHitRate = await PWAPerformance.getCacheHitRate()

      setPerformanceMetrics({
        ...perf,
        cacheHitRate,
        // Mock data - would come from actual monitoring
        totalRequests: 100,
        cachedRequests: Math.round((100 * cacheHitRate) / 100)
      })

      // Load service worker status
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        setServiceWorkerStatus({
          supported: true,
          enabled: true,
          state:
            (registration.active?.state as
              | 'installing'
              | 'installed'
              | 'activating'
              | 'activated'
              | 'redundant') || 'installed',
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">PWA Status</h1>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCwIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {TAB_DEFINITIONS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PwaTabId)}
            className={`
              flex items-center gap-2 px-4 py-3 font-medium transition-colors
              border-b-2 -mb-px
              ${
                activeTab === tab.id
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
        {activeTab === 'overview' && (
          <OverviewTab
            isOnline={isOnline}
            connectionType={connectionType ?? null}
            downlink={downlink ?? null}
            isSyncing={isSyncing}
            pendingActions={pendingActions}
            storageQuota={storageQuota}
            performanceMetrics={performanceMetrics}
            serviceWorkerStatus={serviceWorkerStatus}
            cacheStatus={cacheStatus}
          />
        )}

        {activeTab === 'network' && <NetworkTab networkQuality={networkQuality} />}

        {activeTab === 'storage' && (
          <StorageTab
            storageQuota={storageQuota}
            cacheStatus={cacheStatus}
            performanceMetrics={performanceMetrics}
            onPreloadAssets={handlePreloadAssets}
            onClearCache={handleClearCache}
            ButtonComp={Button}
          />
        )}

        {activeTab === 'performance' && <PerformanceTab performanceMetrics={performanceMetrics} />}

        {activeTab === 'sync' && <SyncTab />}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOnline ? 'You are online' : 'You are currently offline'}
          {isSyncing && 'Synchronization is in progress'}
          {pendingActions > 0 && `You have ${pendingActions} pending actions`}
          {failedActions > 0 && `You have ${failedActions} failed actions`}
          {storageQuota.percentage > 80 && 'Storage usage is critically high'}
        </div>
      </ScreenReaderOnly>
    </div>
  )
}
