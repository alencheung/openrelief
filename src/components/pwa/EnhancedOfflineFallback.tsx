'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  WifiOffIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MapIcon,
  PhoneIcon,
  FileTextIcon,
  ShieldIcon,
  DatabaseIcon,
  BatteryIcon,
  SignalIcon,
  SettingsIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  UsersIcon,
  ActivityIcon,
  ZapIcon
} from 'lucide-react'

interface EmergencyAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  available: boolean
  priority: 'high' | 'medium' | 'low'
  offlineCapable: boolean
  requiresSync: boolean
}

interface OfflineCapability {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
  storageUsed?: number
  storageLimit?: number
}

export function EnhancedOfflineFallback() {
  const {
    isOnline,
    reconnectAttempts,
    lastOnlineTime,
    connectionType,
    effectiveType,
    downlink
  } = useNetworkStatus()

  const {
    pendingActions,
    failedActions,
    metrics,
    storageQuota,
    settings
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [isRetrying, setIsRetrying] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'actions' | 'capabilities' | 'status'>('actions')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('offline')

  // Load last sync time
  useEffect(() => {
    const stored = localStorage.getItem('openrelief-last-sync')
    if (stored) {
      setLastSyncTime(new Date(stored))
    }
  }, [])

  // Determine connection quality
  useEffect(() => {
    if (!isOnline) {
      setConnectionQuality('offline')
      return
    }

    if (!downlink) {
      setConnectionQuality('fair')
      return
    }

    if (downlink >= 10) {
      setConnectionQuality('excellent')
    } else if (downlink >= 5) {
      setConnectionQuality('good')
    } else if (downlink >= 2) {
      setConnectionQuality('fair')
    } else {
      setConnectionQuality('poor')
    }
  }, [isOnline, downlink])

  // Handle manual reconnection
  const handleRetry = async () => {
    setIsRetrying(true)
    announcePolite('Attempting to reconnect to the network')

    try {
      const response = await fetch('/api/health', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        announcePolite('Connection restored successfully')
        window.location.reload()
      } else {
        announceAssertive('Reconnection failed. Please try again.')
      }
    } catch (error) {
      announceAssertive('Reconnection failed. Please check your network connection.')
    } finally {
      setIsRetrying(false)
    }
  }

  // Emergency actions available offline
  const emergencyActions: EmergencyAction[] = [
    {
      id: 'report-emergency',
      title: 'Report Emergency',
      description: 'File an emergency report (will sync when online)',
      icon: AlertTriangleIcon,
      action: () => window.location.href = '/report',
      available: true,
      priority: 'high',
      offlineCapable: true,
      requiresSync: true
    },
    {
      id: 'view-map',
      title: 'View Offline Map',
      description: 'Access cached map data and locations',
      icon: MapIcon,
      action: () => window.location.href = '/offline/map',
      available: true,
      priority: 'medium',
      offlineCapable: true,
      requiresSync: false
    },
    {
      id: 'emergency-contacts',
      title: 'Emergency Contacts',
      description: 'View cached emergency contact information',
      icon: PhoneIcon,
      action: () => window.location.href = '/offline/contacts',
      available: true,
      priority: 'high',
      offlineCapable: true,
      requiresSync: false
    },
    {
      id: 'medical-info',
      title: 'Medical Information',
      description: 'Access offline medical resources and guides',
      icon: FileTextIcon,
      action: () => window.location.href = '/offline/medical',
      available: true,
      priority: 'medium',
      offlineCapable: true,
      requiresSync: false
    },
    {
      id: 'safety-guide',
      title: 'Safety Guide',
      description: 'View offline safety procedures and protocols',
      icon: ShieldIcon,
      action: () => window.location.href = '/offline/safety',
      available: true,
      priority: 'medium',
      offlineCapable: true,
      requiresSync: false
    }
  ]

  // Offline capabilities
  const offlineCapabilities: OfflineCapability[] = [
    {
      id: 'emergency-reports',
      name: 'Emergency Reports',
      description: 'Create and store emergency reports offline',
      icon: AlertTriangleIcon,
      available: true,
      storageUsed: metrics.cacheSize,
      storageLimit: settings.cacheMaxSize * 1024 * 1024
    },
    {
      id: 'map-data',
      name: 'Map Data',
      description: 'Access cached maps and location data',
      icon: MapIcon,
      available: true,
      storageUsed: metrics.cacheSize * 0.4, // Estimate
      storageLimit: settings.cacheMaxSize * 1024 * 1024
    },
    {
      id: 'contact-info',
      name: 'Contact Information',
      description: 'Offline emergency contacts and resources',
      icon: PhoneIcon,
      available: true,
      storageUsed: metrics.cacheSize * 0.1, // Estimate
      storageLimit: settings.cacheMaxSize * 1024 * 1024
    },
    {
      id: 'medical-resources',
      name: 'Medical Resources',
      description: 'Offline medical guides and procedures',
      icon: FileTextIcon,
      available: true,
      storageUsed: metrics.cacheSize * 0.2, // Estimate
      storageLimit: settings.cacheMaxSize * 1024 * 1024
    },
    {
      id: 'sync-queue',
      name: 'Sync Queue',
      description: 'Queue actions for automatic sync when online',
      icon: DatabaseIcon,
      available: true,
      storageUsed: metrics.cacheSize * 0.3, // Estimate
      storageLimit: settings.cacheMaxSize * 1024 * 1024
    }
  ]

  // Get connection quality color
  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'good':
        return 'text-green-500 bg-green-50 border-green-200'
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: EmergencyAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header Card */}
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className={`
              relative p-4 rounded-full
              ${isOnline ? 'bg-green-100' : 'bg-red-100'}
            `}>
              {isOnline ? (
                <CheckCircle2Icon className="h-12 w-12 text-green-600" />
              ) : (
                <WifiOffIcon className="h-12 w-12 text-red-600" />
              )}

              {/* Pulse animation for online status */}
              {isOnline && !prefersReducedMotion && (
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </h1>

          <p className="text-lg text-gray-600 mb-4">
            {isOnline
              ? 'Your connection has been restored. OpenRelief is fully functional.'
              : 'OpenRelief is working offline. Emergency features remain available.'
            }
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <StatusIndicator
              status={isOnline ? 'active' : 'inactive'}
              size="md"
              label={isOnline ? 'Online' : 'Offline'}
            />

            {connectionType && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <SignalIcon className="w-4 h-4" />
                <span>{connectionType}</span>
                {downlink && (
                  <span>• {downlink.toFixed(1)} Mbps</span>
                )}
              </div>
            )}
          </div>

          {/* Connection Quality */}
          <div className={`
            inline-flex items-center gap-2 px-3 py-2 rounded-lg border
            ${getConnectionQualityColor()}
          `}>
            <ActivityIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)} Connection
            </span>
          </div>

          {/* Reconnect Button */}
          {!isOnline && (
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full"
                size="lg"
              >
                {isRetrying ? (
                  <>
                    <RefreshCwIcon className="h-5 w-5 mr-3 animate-spin" />
                    Checking Connection...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="h-5 w-5 mr-3" />
                    Try Reconnecting
                  </>
                )}
              </Button>

              {reconnectAttempts > 0 && (
                <p className="text-sm text-gray-500">
                  Reconnect attempts: {reconnectAttempts}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'actions', label: 'Emergency Actions', count: emergencyActions.filter(a => a.available).length },
            { id: 'capabilities', label: 'Offline Capabilities', count: offlineCapabilities.filter(c => c.available).length },
            { id: 'status', label: 'System Status', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`
                flex-1 px-4 py-3 text-center font-medium transition-colors
                border-b-2 -mb-px
                ${selectedTab === tab.id
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
            }
              `}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Emergency Actions Tab */}
          {selectedTab === 'actions' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Emergency Actions Available Offline
              </h2>

              <div className="grid gap-4">
                {emergencyActions.map((action) => (
                  <div
                    key={action.id}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      transition-all duration-200 cursor-pointer
                      ${action.available
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }
                    `}
                    onClick={() => action.available && action.action()}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-lg
                        ${getPriorityColor(action.priority)}
                      `}>
                        <action.icon className="w-6 h-6" />
                      </div>

                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {action.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {action.offlineCapable && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Offline Capable
                            </span>
                          )}
                          {action.requiresSync && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Requires Sync
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {action.available && (
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Capabilities Tab */}
          {selectedTab === 'capabilities' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Offline Capabilities
              </h2>

              <div className="grid gap-4">
                {offlineCapabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className={`
                      p-4 rounded-lg border
                      ${capability.available
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-100 bg-gray-50 opacity-50'
                  }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-lg
                        ${capability.available
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                  }
                      `}>
                        <capability.icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {capability.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {capability.description}
                        </p>

                        {/* Storage Usage */}
                        {capability.storageUsed !== undefined && capability.storageLimit !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">Storage Used</span>
                              <span className="text-xs text-gray-600">
                                {Math.round(capability.storageUsed / 1024 / 1024)}MB /
                                {Math.round(capability.storageLimit / 1024 / 1024)}MB
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`
                                  h-1.5 rounded-full transition-all duration-300
                                  ${(capability.storageUsed / capability.storageLimit) > 0.8
                            ? 'bg-red-500'
                            : (capability.storageUsed / capability.storageLimit) > 0.6
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }
                                `}
                                style={{
                                  width: `${Math.min(100, (capability.storageUsed / capability.storageLimit) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <StatusIndicator
                        status={capability.available ? 'active' : 'inactive'}
                        size="sm"
                        label={capability.available ? 'Available' : 'Unavailable'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Status Tab */}
          {selectedTab === 'status' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                System Status
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connection Status */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Connection</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <StatusIndicator
                        status={isOnline ? 'active' : 'inactive'}
                        size="sm"
                        label={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Quality</span>
                      <span className={`text-sm font-medium ${getConnectionQualityColor()}`}>
                        {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
                      </span>
                    </div>

                    {connectionType && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type</span>
                        <span className="text-sm font-medium">{connectionType}</span>
                      </div>
                    )}

                    {downlink && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Speed</span>
                        <span className="text-sm font-medium">{downlink.toFixed(1)} Mbps</span>
                      </div>
                    )}

                    {lastOnlineTime && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Online</span>
                        <span className="text-sm font-medium">
                          {lastOnlineTime.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sync Status */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Synchronization</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending Actions</span>
                      <span className="text-sm font-medium text-orange-600">
                        {pendingActions.length}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Failed Actions</span>
                      <span className="text-sm font-medium text-red-600">
                        {failedActions.length}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Sync</span>
                      <span className="text-sm font-medium">
                        {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="text-sm font-medium">
                        {Math.round(metrics.successRate)}%
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Size</span>
                      <span className="text-sm font-medium">
                        {Math.round(metrics.cacheSize / 1024 / 1024)}MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Storage Status */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Storage</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Used</span>
                      <span className="text-sm font-medium">
                        {Math.round(storageQuota.used / 1024 / 1024)}MB
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Available</span>
                      <span className="text-sm font-medium">
                        {Math.round(storageQuota.quota / 1024 / 1024)}MB
                      </span>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">Usage</span>
                        <span className="text-xs text-gray-600">
                          {Math.round(storageQuota.percentage)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
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
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Performance</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Sync Time</span>
                      <span className="text-sm font-medium">
                        {Math.round(metrics.averageSyncTime)}ms
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Actions</span>
                      <span className="text-sm font-medium">
                        {metrics.totalActions}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache Entries</span>
                      <span className="text-sm font-medium">
                        {metrics.cacheEntries}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Auto-Sync</span>
                      <StatusIndicator
                        status={settings.autoSync ? 'active' : 'inactive'}
                        size="sm"
                        label={settings.autoSync ? 'Enabled' : 'Disabled'}
                      />
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Background Sync</span>
                      <StatusIndicator
                        status={settings.backgroundSync ? 'active' : 'inactive'}
                        size="sm"
                        label={settings.backgroundSync ? 'Enabled' : 'Disabled'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <ZapIcon className="w-4 h-4" />
              <span>OpenRelief Emergency Platform</span>
            </div>
            <span>•</span>
            <span>Offline-capable PWA</span>
            <span>•</span>
            <span>Version 2.0.0</span>
          </div>
        </div>
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOnline ? 'You are online' : 'You are currently offline'}
          {pendingActions.length > 0 && `You have ${pendingActions.length} pending actions`}
          {failedActions.length > 0 && `You have ${failedActions.length} failed actions`}
          {lastSyncTime && `Last synchronization was at ${lastSyncTime.toLocaleString()}`}
        </div>
      </ScreenReaderOnly>
    </div>
  )
}