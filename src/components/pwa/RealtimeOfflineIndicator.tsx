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
  WifiIcon,
  UsersIcon,
  MessageSquareIcon,
  BellIcon,
  BellOffIcon,
  ActivityIcon,
  ClockIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  RadioIcon,
  RadioOffIcon,
  SatelliteIcon,
  SatelliteOffIcon,
  ZapIcon,
  ZapOffIcon,
  DatabaseIcon,
  CloudIcon,
  CloudOffIcon,
  SettingsIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  InfoIcon,
  ShieldIcon,
  ShieldOffIcon,
  MapIcon,
  MapOffIcon,
  NavigationIcon,
  NavigationOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
  MicIcon,
  MicOffIcon,
  ShareIcon,
  ShareOffIcon,
  SendIcon,
  SendOffIcon,
  HeartIcon,
  HeartOffIcon
} from 'lucide-react'

interface RealtimeFeature {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  offlineIcon: React.ComponentType<{ className?: string }>
  available: boolean
  active: boolean
  offlineCapable: boolean
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresNetwork: boolean
  requiresLocation: boolean
  requiresCamera: boolean
  requiresMicrophone: boolean
  lastActivity?: Date
  connectionType?: 'websocket' | 'sse' | 'polling' | 'push'
  status?: 'connected' | 'disconnected' | 'connecting' | 'error'
  latency?: number
  messageCount?: number
  activeUsers?: number
}

interface RealtimeStatus {
  features: RealtimeFeature[]
  overallStatus: 'online' | 'offline' | 'degraded' | 'error'
  lastUpdate: Date
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
  activeConnections: number
  totalConnections: number
  messageQueue: number
  failedMessages: number
}

export function RealtimeOfflineIndicator() {
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
    pendingActions, 
    failedActions,
    metrics
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [expanded, setExpanded] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({
    features: [],
    overallStatus: 'online',
    lastUpdate: new Date(),
    connectionQuality: 'excellent',
    activeConnections: 0,
    totalConnections: 0,
    messageQueue: 0,
    failedMessages: 0
  })

  // Initialize realtime features
  useEffect(() => {
    const features: RealtimeFeature[] = [
      {
        id: 'live-chat',
        name: 'Live Chat',
        description: 'Real-time emergency communication and coordination',
        icon: MessageSquareIcon,
        offlineIcon: MessageSquareIcon,
        available: true,
        active: isOnline,
        offlineCapable: false,
        priority: 'critical',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: true,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt,
        messageCount: 0,
        activeUsers: isOnline ? 127 : 0
      },
      {
        id: 'emergency-alerts',
        name: 'Emergency Alerts',
        description: 'Real-time emergency notifications and broadcasts',
        icon: BellIcon,
        offlineIcon: BellOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'critical',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'push',
        status: isOnline ? 'connected' : 'disconnected',
        messageCount: isOnline ? 3 : 0
      },
      {
        id: 'location-tracking',
        name: 'Location Tracking',
        description: 'Real-time location sharing and tracking',
        icon: NavigationIcon,
        offlineIcon: NavigationOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'high',
        requiresNetwork: true,
        requiresLocation: true,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt,
        lastActivity: new Date()
      },
      {
        id: 'live-map',
        name: 'Live Map Updates',
        description: 'Real-time map updates and emergency markers',
        icon: MapIcon,
        offlineIcon: MapOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'high',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'sse',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt
      },
      {
        id: 'video-conference',
        name: 'Video Conference',
        description: 'Emergency video communication and coordination',
        icon: VideoIcon,
        offlineIcon: VideoOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: false,
        priority: 'high',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: true,
        requiresMicrophone: true,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt,
        activeUsers: isOnline ? 5 : 0
      },
      {
        id: 'voice-communication',
        name: 'Voice Communication',
        description: 'Push-to-talk emergency voice channels',
        icon: MicIcon,
        offlineIcon: MicOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: false,
        priority: 'high',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: true,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt
      },
      {
        id: 'data-sync',
        name: 'Data Synchronization',
        description: 'Real-time data synchronization across devices',
        icon: DatabaseIcon,
        offlineIcon: DatabaseIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'medium',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt
      },
      {
        id: 'collaboration',
        name: 'Emergency Collaboration',
        description: 'Real-time collaboration and coordination tools',
        icon: UsersIcon,
        offlineIcon: UsersIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'medium',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt,
        activeUsers: isOnline ? 23 : 0
      },
      {
        id: 'broadcast',
        name: 'Emergency Broadcast',
        description: 'Live emergency broadcasting to all users',
        icon: RadioIcon,
        offlineIcon: RadioOffIcon,
        available: true,
        active: isOnline,
        offlineCapable: false,
        priority: 'critical',
        requiresNetwork: true,
        requiresLocation: false,
        requiresCamera: true,
        requiresMicrophone: true,
        connectionType: 'websocket',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt
      },
      {
        id: 'sensor-monitoring',
        name: 'Sensor Monitoring',
        description: 'Real-time environmental and safety sensor data',
        icon: ActivityIcon,
        offlineIcon: ActivityIcon,
        available: true,
        active: isOnline,
        offlineCapable: true,
        priority: 'medium',
        requiresNetwork: true,
        requiresLocation: true,
        requiresCamera: false,
        requiresMicrophone: false,
        connectionType: 'sse',
        status: isOnline ? 'connected' : 'disconnected',
        latency: rtt
      }
    ]

    setRealtimeStatus(prev => ({
      ...prev,
      features: features.map(feature => ({
        ...feature,
        active: isOnline && feature.available,
        status: isOnline && feature.available ? 'connected' : 'disconnected',
        latency: rtt
      })),
      overallStatus: isOnline ? 'online' : 'offline',
      connectionQuality: getConnectionQuality(),
      activeConnections: isOnline ? features.filter(f => f.available).length : 0,
      totalConnections: features.filter(f => f.available).length
    }))
  }, [isOnline, rtt])

  // Get connection quality
  const getConnectionQuality = (): RealtimeStatus['connectionQuality'] => {
    if (!isOnline) return 'offline'
    if (!rtt) return 'fair'
    
    if (rtt < 50) return 'excellent'
    if (rtt < 100) return 'good'
    if (rtt < 200) return 'fair'
    return 'poor'
  }

  // Get status color
  const getStatusColor = (status: RealtimeFeature['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'connecting':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: RealtimeFeature['priority']) => {
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

  // Get connection quality color
  const getConnectionQualityColor = () => {
    switch (realtimeStatus.connectionQuality) {
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

  // Handle feature toggle
  const handleFeatureToggle = (featureId: string) => {
    const feature = realtimeStatus.features.find(f => f.id === featureId)
    if (!feature) return

    const newStatus = feature.active ? 'disconnected' : 'connected'
    
    setRealtimeStatus(prev => ({
      ...prev,
      features: prev.features.map(f => 
        f.id === featureId 
          ? { ...f, active: !f.active, status: newStatus }
          : f
      )
    }))

    announcePolite(
      feature.active 
        ? `${feature.name} disabled`
        : `${feature.name} enabled`
    )
  }

  // Handle reconnect all
  const handleReconnectAll = async () => {
    announcePolite('Attempting to reconnect all real-time features')
    
    setRealtimeStatus(prev => ({
      ...prev,
      features: prev.features.map(f => ({
        ...f,
        status: 'connecting',
        active: false
      }))
    }))

    // Simulate reconnection
    setTimeout(() => {
      setRealtimeStatus(prev => ({
        ...prev,
        features: prev.features.map(f => ({
          ...f,
          status: isOnline ? 'connected' : 'disconnected',
          active: isOnline && f.available
        }))
      }))
      
      if (isOnline) {
        announcePolite('All real-time features reconnected')
      } else {
        announceAssertive('Failed to reconnect: no network connection')
      }
    }, 3000)
  }

  const activeFeatures = realtimeStatus.features.filter(f => f.active)
  const criticalFeatures = realtimeStatus.features.filter(f => f.priority === 'critical')
  const offlineFeatures = realtimeStatus.features.filter(f => !f.active && f.available)

  return (
    <>
      {/* Main Real-time Status Indicator */}
      <div className="fixed top-4 left-4 z-50 max-w-sm">
        <div className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${isOnline 
            ? 'bg-white/90 border border-gray-200 text-gray-900' 
            : 'bg-red-600/90 border border-red-700 text-white'
          }
          ${prefersReducedMotion ? '' : 'hover:shadow-xl'}
        `}>
          {/* Status Icon and Text */}
          <div className="flex items-center gap-2">
            <div className={`
              relative flex items-center justify-center w-8 h-8 rounded-full
              transition-all duration-300
              ${isOnline ? 'bg-green-100' : 'bg-red-100'}
            `}>
              {isOnline ? (
                <ActivityIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ActivityIcon className="w-4 h-4 text-red-600" />
              )}
              
              {/* Pulse animation for active connection */}
              {isOnline && !prefersReducedMotion && (
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {isOnline ? 'Real-time Active' : 'Real-time Offline'}
              </span>
              <span className="text-xs opacity-75">
                {activeFeatures.length} of {realtimeStatus.totalConnections} features
              </span>
            </div>
          </div>

          {/* Connection Quality */}
          <div className="flex items-center gap-1">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionQualityColor()}`}>
              {realtimeStatus.connectionQuality.charAt(0).toUpperCase() + realtimeStatus.connectionQuality.slice(1)}
            </div>
          </div>

          {/* Critical Features Status */}
          {criticalFeatures.filter(f => !f.active).length > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangleIcon className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">
                {criticalFeatures.filter(f => !f.active).length} critical
              </span>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 p-0"
            aria-label={expanded ? 'Hide real-time features' : 'Show real-time features'}
          >
            {expanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Features Panel */}
      {expanded && (
        <div className={`
          absolute top-full left-0 mt-2 p-4 w-96 max-h-96 overflow-y-auto
          bg-white rounded-xl shadow-2xl border border-gray-200
          ${prefersReducedMotion ? '' : 'animate-slide-in-up'}
        `}>
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Real-time Features
              </h3>
              <div className="flex items-center gap-2">
                <StatusIndicator
                  status={isOnline ? 'active' : 'inactive'}
                  size="sm"
                  label={isOnline ? 'Online' : 'Offline'}
                />
                <Button
                  onClick={handleReconnectAll}
                  disabled={isOnline}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCwIcon className="w-3 h-3 mr-2" />
                  Reconnect All
                </Button>
              </div>
            </div>

            {/* Connection Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Connection Quality</span>
                  <p className={`font-medium ${getConnectionQualityColor()}`}>
                    {realtimeStatus.connectionQuality.charAt(0).toUpperCase() + realtimeStatus.connectionQuality.slice(1)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Latency</span>
                  <p className="font-medium">
                    {rtt ? `${rtt}ms` : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Active Features</span>
                  <p className="font-medium text-green-600">
                    {activeFeatures.length}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Offline Features</span>
                  <p className="font-medium text-red-600">
                    {offlineFeatures.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-2">
              {realtimeStatus.features.map((feature) => (
                <div
                  key={feature.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    transition-all duration-200 cursor-pointer
                    ${feature.active 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => handleFeatureToggle(feature.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-lg
                      ${feature.active 
                        ? 'bg-green-100' 
                        : 'bg-gray-100'
                      }
                    `}>
                      {feature.active ? (
                        <feature.icon className="w-5 h-5 text-green-600" />
                      ) : (
                        <feature.offlineIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {feature.name}
                        </h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(feature.priority)}`}>
                          {feature.priority}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIndicator
                          status={feature.status === 'connected' ? 'active' : 
                                 feature.status === 'connecting' ? 'pending' : 
                                 feature.status === 'error' ? 'critical' : 'inactive'}
                          size="sm"
                          animated={feature.status === 'connecting'}
                        />
                        {feature.latency && (
                          <span className="text-xs text-gray-500">
                            {feature.latency}ms
                          </span>
                        )}
                        {feature.messageCount !== undefined && (
                          <span className="text-xs text-gray-500">
                            {feature.messageCount} messages
                          </span>
                        )}
                        {feature.activeUsers !== undefined && (
                          <span className="text-xs text-gray-500">
                            {feature.activeUsers} users
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {feature.offlineCapable && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Offline capable" />
                    )}
                    {feature.requiresNetwork && (
                      <WifiIcon className="w-3 h-3 text-gray-400" title="Requires network" />
                    )}
                    {feature.requiresLocation && (
                      <NavigationIcon className="w-3 h-3 text-gray-400" title="Requires location" />
                    )}
                    {feature.requiresCamera && (
                      <VideoIcon className="w-3 h-3 text-gray-400" title="Requires camera" />
                    )}
                    {feature.requiresMicrophone && (
                      <MicIcon className="w-3 h-3 text-gray-400" title="Requires microphone" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeatureToggle(feature.id)}
                    >
                      {feature.active ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Critical Features</span>
                  <p className="font-medium">
                    {criticalFeatures.filter(f => f.active).length} / {criticalFeatures.length}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">High Priority</span>
                  <p className="font-medium">
                    {realtimeStatus.features.filter(f => f.priority === 'high' && f.active).length} active
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Message Queue</span>
                  <p className="font-medium">
                    {realtimeStatus.messageQueue}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Failed Messages</span>
                  <p className="font-medium text-red-600">
                    {realtimeStatus.failedMessages}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOnline ? 'Real-time features are online' : 'Real-time features are offline'}
          {activeFeatures.length > 0 && `${activeFeatures.length} real-time features are active`}
          {offlineFeatures.length > 0 && `${offlineFeatures.length} real-time features are offline`}
          {criticalFeatures.filter(f => !f.active).length > 0 && `${criticalFeatures.filter(f => !f.active).length} critical features are offline`}
          {rtt && `Current latency: ${rtt}ms`}
        </div>
      </ScreenReaderOnly>
    </>
  )
}