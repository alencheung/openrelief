/**
 * Enhanced PWA Status Tab Panels
 *
 * Overview, Network, and Sync tab content extracted from EnhancedPWAStatus.
 * Storage and Performance tabs live in enhanced-pwa-status-storage-performance.tsx
 * and are re-exported here for convenience.
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  WifiIcon,
  WifiOffIcon,
  DatabaseIcon,
  HardDriveIcon,
  ActivityIcon,
  CheckCircle2Icon,
  ClockIcon,
  ZapIcon,
  ShieldIcon,
  SmartphoneIcon,
  MonitorIcon,
  GlobeIcon,
  RefreshCwIcon,
  SignalIcon,
  Loader2Icon
} from 'lucide-react'
import type {
  CacheStatus,
  PerformanceMetrics,
  ServiceWorkerStatus
} from './enhanced-pwa-status-helpers'
import {
  getConnectionQualityColor,
  getPerformanceGrade,
  getQualityLabel
} from './enhanced-pwa-status-helpers'

// Re-export StorageTab and PerformanceTab for convenience
export { StorageTab, PerformanceTab } from './enhanced-pwa-status-storage-performance'

interface OverviewTabProps {
  isOnline: boolean
  connectionType: string | null
  downlink: number | null
  isSyncing: boolean
  pendingActions: number
  storageQuota: { used: number; quota: number; percentage: number }
  performanceMetrics: PerformanceMetrics
  serviceWorkerStatus: ServiceWorkerStatus
  cacheStatus: CacheStatus[]
}

export function OverviewTab({
  isOnline,
  connectionType,
  downlink,
  isSyncing,
  pendingActions,
  storageQuota,
  performanceMetrics,
  serviceWorkerStatus,
  cacheStatus
}: OverviewTabProps) {
  return (
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
            {connectionType &&
              `${connectionType} • ${downlink ? downlink.toFixed(1) + ' Mbps' : 'Unknown speed'}`}
          </div>
        </Card>

        {/* Sync Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Sync</h3>
            {(() => {
              if (isSyncing) {
                return <Loader2Icon className="w-5 h-5 animate-spin text-blue-600" />
              }
              if (pendingActions > 0) {
                return <ClockIcon className="w-5 h-5 text-orange-600" />
              }
              return <CheckCircle2Icon className="w-5 h-5 text-green-600" />
            })()}
          </div>
          <div className="text-2xl font-bold text-gray-900">{pendingActions}</div>
          <div className="text-sm text-gray-600">Pending actions</div>
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
                ${
                  storageQuota.percentage > 80
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
          <div className="text-sm text-gray-600">Page load grade</div>
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
  )
}

interface NetworkTabProps {
  networkQuality: { effectiveType: string; downlink: number; rtt: number; saveData: boolean }
}

export function NetworkTab({ networkQuality }: NetworkTabProps) {
  const {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    lastOnlineTime,
    lastOfflineTime
  } = useNetworkStatus()

  return (
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
                {connectionType === 'cellular' && (
                  <SmartphoneIcon className="w-4 h-4 text-purple-600" />
                )}
                {connectionType === 'ethernet' && (
                  <MonitorIcon className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium">{connectionType || 'Unknown'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Effective Type</span>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionQualityColor(effectiveType || 'unknown')}`}
              >
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
              <span className="text-sm font-medium">{rtt ? `${rtt}ms` : 'Unknown'}</span>
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
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionQualityColor(effectiveType || 'unknown')}`}
              >
                {getQualityLabel(effectiveType)}
              </div>
            </div>
          </div>

          {/* Network Quality Visualization */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Signal Quality</h4>
            <div className="flex items-center gap-2">
              <SignalIcon className="w-5 h-5 text-blue-600" />
              <div className="flex-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(bar => (
                  <div
                    key={bar}
                    className={`
                      h-4 rounded-sm transition-all duration-300
                      ${
                        effectiveType === '4g' && bar <= 5
                          ? 'bg-green-500'
                          : effectiveType === '3g' && bar <= 4
                            ? 'bg-yellow-500'
                            : effectiveType === '2g' && bar <= 3
                              ? 'bg-orange-500'
                              : effectiveType === 'slow-2g' && bar <= 2
                                ? 'bg-red-500'
                                : 'bg-gray-300'
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
                {getQualityLabel(effectiveType)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SyncTab() {
  const { isSyncing, syncProgress, metrics, settings } = useOfflineStore()
  const pendingActions = metrics.pendingActions
  const failedActions = metrics.failedActions

  return (
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
              <span className="text-sm font-medium text-orange-600">{pendingActions}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failed Actions</span>
              <span className="text-sm font-medium text-red-600">{failedActions}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Sync</span>
              <span className="text-sm font-medium">
                {metrics.lastSyncTime
                  ? new Date(metrics.lastSyncTime).toLocaleString()
                  : 'Never'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium">{Math.round(metrics.successRate)}%</span>
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
              <span className="text-sm font-medium">{settings.syncInterval} minutes</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Max Retries</span>
              <span className="text-sm font-medium">{settings.maxRetries}</span>
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
  )
}

// Tab navigation metadata
export const TAB_DEFINITIONS = [
  { id: 'overview', label: 'Overview', icon: GlobeIcon },
  { id: 'network', label: 'Network', icon: WifiIcon },
  { id: 'storage', label: 'Storage', icon: HardDriveIcon },
  { id: 'performance', label: 'Performance', icon: ActivityIcon },
  { id: 'sync', label: 'Sync', icon: RefreshCwIcon }
] as const
