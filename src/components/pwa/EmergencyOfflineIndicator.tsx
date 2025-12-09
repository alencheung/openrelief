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
  AlertTriangleIcon,
  WifiOffIcon,
  WifiIcon,
  CheckCircle2Icon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  FileTextIcon,
  UsersIcon,
  ActivityIcon,
  DatabaseIcon,
  CloudIcon,
  CloudOffIcon,
  BatteryIcon,
  SignalIcon,
  RefreshCwIcon,
  SettingsIcon,
  InfoIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  BellIcon,
  BellOffIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  SaveIcon,
  UploadIcon,
  DownloadIcon,
  AlertCircleIcon,
  HomeIcon,
  ZapIcon,
  HeartIcon,
  RadioIcon
} from 'lucide-react'

interface EmergencyFeature {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
  offlineCapable: boolean
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresLocation: boolean
  requiresCamera: boolean
  requiresNetwork: boolean
  dataUsage?: 'low' | 'medium' | 'high'
}

interface OfflineMode {
  enabled: boolean
  reason: 'network' | 'battery' | 'user' | 'emergency'
  features: string[]
  restrictions: string[]
  estimatedDuration: number | null
  lastActivated: Date | null
}

export function EmergencyOfflineIndicator() {
  const {
    isOnline,
    isOffline,
    connectionType,
    effectiveType,
    downlink,
    lastOnlineTime
  } = useNetworkStatus()

  const {
    pendingActions,
    failedActions,
    metrics,
    storageQuota
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [expanded, setExpanded] = useState(false)
  const [offlineMode, setOfflineMode] = useState<OfflineMode>({
    enabled: false,
    reason: 'network',
    features: [],
    restrictions: [],
    estimatedDuration: null,
    lastActivated: null
  })
  const [emergencyFeatures, setEmergencyFeatures] = useState<EmergencyFeature[]>([])
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isCharging, setIsCharging] = useState<boolean | null>(null)

  // Initialize emergency features
  useEffect(() => {
    const features: EmergencyFeature[] = [
      {
        id: 'emergency-report',
        name: 'Emergency Report',
        description: 'Report emergency situations with location and details',
        icon: AlertTriangleIcon,
        available: true,
        offlineCapable: true,
        priority: 'critical',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'medium'
      },
      {
        id: 'medical-emergency',
        name: 'Medical Emergency',
        description: 'Request immediate medical assistance',
        icon: HeartIcon,
        available: true,
        offlineCapable: true,
        priority: 'critical',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'low'
      },
      {
        id: 'security-alert',
        name: 'Security Alert',
        description: 'Report security threats or suspicious activity',
        icon: ShieldIcon,
        available: true,
        offlineCapable: true,
        priority: 'high',
        requiresLocation: true,
        requiresCamera: true,
        requiresNetwork: false,
        dataUsage: 'medium'
      },
      {
        id: 'missing-person',
        name: 'Missing Person',
        description: 'Report missing person with last known location',
        icon: UsersIcon,
        available: true,
        offlineCapable: true,
        priority: 'high',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'high'
      },
      {
        id: 'infrastructure-failure',
        name: 'Infrastructure Failure',
        description: 'Report damaged infrastructure or utilities',
        icon: RadioIcon,
        available: true,
        offlineCapable: true,
        priority: 'medium',
        requiresLocation: true,
        requiresCamera: true,
        requiresNetwork: false,
        dataUsage: 'medium'
      },
      {
        id: 'natural-disaster',
        name: 'Natural Disaster',
        description: 'Report natural disasters and weather events',
        icon: ZapIcon,
        available: true,
        offlineCapable: true,
        priority: 'critical',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'high'
      },
      {
        id: 'emergency-contact',
        name: 'Emergency Contact',
        description: 'Access emergency contacts and services',
        icon: PhoneIcon,
        available: true,
        offlineCapable: true,
        priority: 'high',
        requiresLocation: false,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'low'
      },
      {
        id: 'first-aid-guide',
        name: 'First Aid Guide',
        description: 'Access medical first aid instructions',
        icon: FileTextIcon,
        available: true,
        offlineCapable: true,
        priority: 'medium',
        requiresLocation: false,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'low'
      },
      {
        id: 'evacuation-routes',
        name: 'Evacuation Routes',
        description: 'View cached evacuation routes and safe zones',
        icon: MapPinIcon,
        available: true,
        offlineCapable: true,
        priority: 'high',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'medium'
      },
      {
        id: 'emergency-shelters',
        name: 'Emergency Shelters',
        description: 'Find nearby emergency shelters and facilities',
        icon: HomeIcon,
        available: true,
        offlineCapable: true,
        priority: 'high',
        requiresLocation: true,
        requiresCamera: false,
        requiresNetwork: false,
        dataUsage: 'medium'
      }
    ]

    setEmergencyFeatures(features)
  }, [])

  // Monitor battery status
  useEffect(() => {
    const monitorBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setBatteryLevel(battery.level * 100)
          setIsCharging(battery.charging)

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100)
          })

          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging)
          })
        } catch (error) {
          console.warn('Battery API not available:', error)
        }
      }
    }

    monitorBattery()
  }, [])

  // Update offline mode status
  useEffect(() => {
    const reason = isOffline ? 'network'
      : batteryLevel !== null && batteryLevel < 20 && !isCharging ? 'battery'
        : 'user'

    const features = emergencyFeatures
      .filter(feature => feature.offlineCapable)
      .map(feature => feature.id)

    const restrictions = isOffline
      ? ['real-time-sync', 'live-updates', 'push-notifications']
      : []

    setOfflineMode({
      enabled: isOffline || (batteryLevel !== null && batteryLevel < 20 && !isCharging),
      reason,
      features,
      restrictions,
      estimatedDuration: isOffline && lastOnlineTime
        ? Date.now() - lastOnlineTime.getTime() : null,
      lastActivated: isOffline ? new Date() : null
    })

    if (isOffline) {
      announceAssertive('Emergency offline mode activated. Critical features remain available.')
    } else {
      announcePolite('Emergency offline mode deactivated. Full functionality restored.')
    }
  }, [isOffline, batteryLevel, isCharging, lastOnlineTime, emergencyFeatures, announcePolite, announceAssertive])

  // Handle feature selection
  const handleFeatureSelect = (featureId: string) => {
    setSelectedFeature(selectedFeature === featureId ? null : featureId)
    const feature = emergencyFeatures.find(f => f.id === featureId)
    if (feature) {
      announcePolite(`Selected ${feature.name}. ${feature.offlineCapable ? 'Available offline.' : 'Requires network connection.'}`)
    }
  }

  // Get priority color
  const getPriorityColor = (priority: EmergencyFeature['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get data usage color
  const getDataUsageColor = (usage?: EmergencyFeature['dataUsage']) => {
    switch (usage) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get battery color
  const getBatteryColor = () => {
    if (batteryLevel === null) {
      return 'text-gray-600'
    }
    if (batteryLevel < 20) {
      return 'text-red-600'
    }
    if (batteryLevel < 50) {
      return 'text-yellow-600'
    }
    return 'text-green-600'
  }

  const isOfflineMode = offlineMode.enabled
  const availableFeatures = emergencyFeatures.filter(f => f.available && f.offlineCapable)
  const criticalFeatures = availableFeatures.filter(f => f.priority === 'critical')
  const highPriorityFeatures = availableFeatures.filter(f => f.priority === 'high')

  return (
    <>
      {/* Main Emergency Offline Indicator */}
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <div className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${isOfflineMode
      ? 'bg-red-600/90 border border-red-700 text-white'
      : 'bg-green-600/90 border border-green-700 text-white'
    }
          ${prefersReducedMotion ? '' : 'hover:shadow-xl'}
        `}>
          {/* Status Icon and Text */}
          <div className="flex items-center gap-2">
            <div className={`
              relative flex items-center justify-center w-8 h-8 rounded-full
              transition-all duration-300
              ${isOfflineMode ? 'bg-white/20' : 'bg-white/20'}
            `}>
              {isOfflineMode ? (
                <WifiOffIcon className="w-4 h-4" />
              ) : (
                <WifiIcon className="w-4 h-4" />
              )}

              {/* Pulse animation for active emergency mode */}
              {isOfflineMode && !prefersReducedMotion && (
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {isOfflineMode ? 'Emergency Mode' : 'Normal Mode'}
              </span>
              <span className="text-xs opacity-75">
                {isOfflineMode
                  ? `${criticalFeatures.length} critical features available`
                  : 'All systems operational'
                }
              </span>
            </div>
          </div>

          {/* Battery Status */}
          {batteryLevel !== null && (
            <div className="flex items-center gap-1">
              <BatteryIcon className={`w-4 h-4 ${getBatteryColor()}`} />
              <span className="text-xs font-medium">
                {Math.round(batteryLevel)}%
              </span>
              {isCharging && (
                <RefreshCwIcon className="w-3 h-3 animate-spin" />
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 p-0 text-white hover:bg-white/10"
            aria-label={expanded ? 'Hide emergency features' : 'Show emergency features'}
          >
            {expanded ? (
              <ChevronRightIcon className="w-4 h-4 rotate-90" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded Emergency Features Panel */}
        {expanded && (
          <div className={`
            absolute top-full right-0 mt-2 p-4 w-96
            bg-white rounded-xl shadow-2xl border border-gray-200
            ${prefersReducedMotion ? '' : 'animate-slide-in-up'}
          `}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Emergency Features
                </h3>
                <StatusIndicator
                  status={isOfflineMode ? 'critical' : 'active'}
                  size="sm"
                  label={isOfflineMode ? 'Emergency Mode' : 'Normal'}
                />
              </div>

              {/* Mode Status */}
              <div className={`
                p-3 rounded-lg border
                ${isOfflineMode
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
          }
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${isOfflineMode ? 'bg-red-100' : 'bg-green-100'}
                  `}>
                    {isOfflineMode ? (
                      <AlertTriangleIcon className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle2Icon className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {isOfflineMode ? 'Emergency Offline Mode' : 'Normal Operation'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {isOfflineMode
                        ? `Reason: ${offlineMode.reason === 'network' ? 'No network connection'
                          : offlineMode.reason === 'battery' ? 'Low battery'
                            : 'Manual activation'}`
                        : 'All systems operational with full network access'
                      }
                    </p>

                    {offlineMode.estimatedDuration && (
                      <p className="text-xs text-gray-500 mt-1">
                        Duration: {Math.round(offlineMode.estimatedDuration / 1000 / 60)} minutes
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Critical Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Critical Features</h4>
                <div className="grid gap-2">
                  {criticalFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        transition-all duration-200 cursor-pointer
                        ${selectedFeature === feature.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                        ${getPriorityColor(feature.priority)}
                      `}
                      onClick={() => handleFeatureSelect(feature.id)}
                    >
                      <div className="flex items-center gap-2">
                        <feature.icon className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">{feature.name}</p>
                          <p className="text-xs text-gray-600">
                            {feature.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {feature.offlineCapable && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Available offline" />
                        )}
                        {feature.dataUsage && (
                          <div className={`w-2 h-2 rounded-full ${getDataUsageColor(feature.dataUsage).replace('text', 'bg').replace('-600', '-500')}`}
                            title={`Data usage: ${feature.dataUsage}`} />
                        )}
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Priority Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">High Priority Features</h4>
                <div className="grid gap-2">
                  {highPriorityFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        transition-all duration-200 cursor-pointer
                        ${selectedFeature === feature.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                        ${getPriorityColor(feature.priority)}
                      `}
                      onClick={() => handleFeatureSelect(feature.id)}
                    >
                      <div className="flex items-center gap-2">
                        <feature.icon className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">{feature.name}</p>
                          <p className="text-xs text-gray-600">
                            {feature.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {feature.offlineCapable && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Available offline" />
                        )}
                        {feature.dataUsage && (
                          <div className={`w-2 h-2 rounded-full ${getDataUsageColor(feature.dataUsage).replace('text', 'bg').replace('-600', '-500')}`}
                            title={`Data usage: ${feature.dataUsage}`} />
                        )}
                        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Details */}
              {selectedFeature && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const feature = emergencyFeatures.find(f => f.id === selectedFeature)
                    if (!feature) {
                      return null
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">
                            {feature.name}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFeature(null)}
                          >
                            <AlertCircleIcon className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <StatusIndicator
                              status={feature.offlineCapable ? 'active' : 'inactive'}
                              size="sm"
                              label={feature.offlineCapable ? 'Offline' : 'Online Only'}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Priority:</span>
                            <span className={`font-medium ${getPriorityColor(feature.priority)}`}>
                              {feature.priority.charAt(0).toUpperCase() + feature.priority.slice(1)}
                            </span>
                          </div>

                          {feature.requiresLocation && (
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="w-3 h-3 text-blue-600" />
                              <span className="text-gray-600">Location</span>
                            </div>
                          )}

                          {feature.requiresCamera && (
                            <div className="flex items-center gap-2">
                              <EyeIcon className="w-3 h-3 text-purple-600" />
                              <span className="text-gray-600">Camera</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => window.location.href = `/emergency/${feature.id}`}
                          >
                            <AlertTriangleIcon className="w-3 h-3 mr-1" />
                            Use Feature
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* System Status */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pending Actions:</span>
                    <p className="font-medium text-orange-600">
                      {pendingActions.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Storage Used:</span>
                    <p className="font-medium text-gray-900">
                      {Math.round(storageQuota.percentage)}%
                    </p>
                  </div>
                  {batteryLevel !== null && (
                    <div>
                      <span className="text-gray-600">Battery:</span>
                      <p className={`font-medium ${getBatteryColor()}`}>
                        {Math.round(batteryLevel)}%
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Network:</span>
                    <p className="font-medium">
                      {isOnline ? 'Available' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOfflineMode && 'Emergency offline mode is active'}
          {isOfflineMode && `${criticalFeatures.length} critical features available`}
          {batteryLevel !== null && batteryLevel < 20 && `Battery level is critically low at ${Math.round(batteryLevel)}%`}
          {pendingActions.length > 0 && `You have ${pendingActions.length} pending emergency actions`}
        </div>
      </ScreenReaderOnly>
    </>
  )
}