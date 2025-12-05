'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  WifiIcon,
  WifiOffIcon,
  Loader2Icon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  SignalIcon,
  SignalLowIcon,
  SignalMediumIcon,
  SignalHighIcon,
  RefreshCwIcon,
  SettingsIcon,
  XIcon,
  RouterIcon,
  SmartphoneIcon,
  EthernetIcon
} from 'lucide-react'

interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  speed: string
  latency: string
  signalStrength: number
  color: string
}

interface NetworkType {
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown' | 'offline'
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}

export function EnhancedNetworkStatusIndicator() {
  const { 
    isOnline, 
    isOffline, 
    reconnectAttempts,
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
    metrics
  } = useOfflineStore()
  
  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()
  
  const [expanded, setExpanded] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'stable' | 'unstable' | 'connecting' | 'offline'>('stable')
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastStatusChange, setLastStatusChange] = useState<Date | null>(null)

  // Determine connection quality
  const getConnectionQuality = (): ConnectionQuality => {
    if (!isOnline || !downlink) {
      return {
        level: 'unknown',
        speed: 'Unknown',
        latency: 'Unknown',
        signalStrength: 0,
        color: 'text-gray-500'
      }
    }

    const speed = downlink // in Mbps
    const latency = rtt || 0 // in ms

    let level: ConnectionQuality['level']
    let color: string

    if (speed >= 10 && latency < 100) {
      level = 'excellent'
      color = 'text-green-600'
    } else if (speed >= 5 && latency < 200) {
      level = 'good'
      color = 'text-green-500'
    } else if (speed >= 2 && latency < 300) {
      level = 'fair'
      color = 'text-yellow-600'
    } else {
      level = 'poor'
      color = 'text-orange-600'
    }

    return {
      level,
      speed: `${speed.toFixed(1)} Mbps`,
      latency: `${latency}ms`,
      signalStrength: Math.min(100, (speed / 20) * 100),
      color
    }
  }

  // Determine network type
  const getNetworkType = (): NetworkType => {
    if (!isOnline) {
      return {
        type: 'offline',
        icon: WifiOffIcon,
        label: 'Offline',
        color: 'text-red-600'
      }
    }

    const type = connectionType?.toLowerCase() || effectiveType?.toLowerCase() || 'unknown'

    switch (type) {
      case 'wifi':
      case 'wimax':
        return {
          type: 'wifi',
          icon: WifiIcon,
          label: 'Wi-Fi',
          color: 'text-blue-600'
        }
      case 'cellular':
      case '4g':
      case '3g':
      case '2g':
        return {
          type: 'cellular',
          icon: SmartphoneIcon,
          label: 'Cellular',
          color: 'text-purple-600'
        }
      case 'ethernet':
        return {
          type: 'ethernet',
          icon: EthernetIcon,
          label: 'Ethernet',
          color: 'text-green-600'
        }
      case 'bluetooth':
        return {
          type: 'bluetooth',
          icon: RouterIcon,
          label: 'Bluetooth',
          color: 'text-indigo-600'
        }
      default:
        return {
          type: 'unknown',
          icon: RouterIcon,
          label: 'Unknown',
          color: 'text-gray-600'
        }
    }
  }

  // Get signal strength icon
  const getSignalIcon = () => {
    const quality = getConnectionQuality()
    
    switch (quality.level) {
      case 'excellent':
        return SignalHighIcon
      case 'good':
        return SignalHighIcon
      case 'fair':
        return SignalMediumIcon
      case 'poor':
        return SignalLowIcon
      default:
        return SignalIcon
    }
  }

  // Handle connection status changes
  useEffect(() => {
    const now = new Date()
    setLastStatusChange(now)

    if (!isOnline) {
      setConnectionStatus('offline')
      announceAssertive('Connection lost. You are now offline.')
    } else if (isConnecting) {
      setConnectionStatus('connecting')
      announcePolite('Attempting to reconnect...')
    } else if (reconnectAttempts > 0) {
      setConnectionStatus('unstable')
      announcePolite('Connection restored but may be unstable.')
    } else {
      setConnectionStatus('stable')
      setShowSuccess(true)
      announcePolite('Connection restored successfully.')
      
      // Hide success indicator after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }, [isOnline, isConnecting, reconnectAttempts, announcePolite, announceAssertive])

  // Handle manual reconnection
  const handleReconnect = async () => {
    setIsConnecting(true)
    try {
      // Test connectivity
      const response = await fetch('/api/health', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        setIsConnecting(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      setIsConnecting(false)
    }
  }

  const quality = getConnectionQuality()
  const networkType = getNetworkType()
  const SignalIconComponent = getSignalIcon()
  const NetworkIcon = networkType.icon

  return (
    <>
      {/* Main Status Indicator */}
      <div className="fixed bottom-4 left-4 z-50">
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
              {isConnecting ? (
                <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
              ) : isOnline ? (
                <NetworkIcon className={`w-4 h-4 ${networkType.color}`} />
              ) : (
                <WifiOffIcon className="w-4 h-4 text-red-600" />
              )}
              
              {/* Pulse animation for active connection */}
              {isOnline && !prefersReducedMotion && (
                <span className="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping" />
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {isConnecting ? 'Connecting...' : isOnline ? 'Online' : 'Offline'}
              </span>
              {isOnline && (
                <span className="text-xs opacity-75">
                  {networkType.label} • {quality.speed}
                </span>
              )}
            </div>
          </div>

          {/* Connection Quality Indicator */}
          {isOnline && (
            <div className="flex items-center gap-1">
              <SignalIconComponent className={`w-4 h-4 ${quality.color}`} />
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`
                      w-1 h-3 rounded-sm transition-all duration-300
                      ${quality.signalStrength >= bar * 25 
                        ? quality.color.replace('text', 'bg') 
                        : 'bg-gray-300'
                      }
                    `}
                    style={{
                      height: `${bar * 3}px`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sync Status */}
          {(isSyncing || pendingActions.length > 0) && (
            <div className="flex items-center gap-2">
              {isSyncing && (
                <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
              )}
              {pendingActions.length > 0 && (
                <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {pendingActions.length} pending
                </span>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 p-0"
            aria-label={expanded ? 'Hide network details' : 'Show network details'}
          >
            {expanded ? (
              <XIcon className="w-4 h-4" />
            ) : (
              <SettingsIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Success Indicator */}
        {showSuccess && isOnline && (
          <div className={`
            absolute -top-12 left-0 right-0 mx-auto w-fit
            px-3 py-2 bg-green-600 text-white text-sm font-medium
            rounded-lg shadow-lg flex items-center gap-2
            ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
          `}>
            <CheckCircle2Icon className="w-4 h-4" />
            Connection Restored
          </div>
        )}

        {/* Expanded Details Panel */}
        {expanded && (
          <div className={`
            absolute bottom-full left-0 right-0 mb-2 p-4
            bg-white rounded-xl shadow-2xl border border-gray-200
            ${prefersReducedMotion ? '' : 'animate-slide-in-up'}
          `}>
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Connection Status</span>
                <StatusIndicator
                  status={isOnline ? 'active' : 'inactive'}
                  size="sm"
                  label={isOnline ? 'Online' : 'Offline'}
                />
              </div>

              {/* Network Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network Type</span>
                <div className="flex items-center gap-2">
                  <NetworkIcon className={`w-4 h-4 ${networkType.color}`} />
                  <span className="text-sm font-medium">{networkType.label}</span>
                </div>
              </div>

              {/* Connection Quality */}
              {isOnline && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connection Quality</span>
                    <span className={`text-sm font-medium ${quality.color}`}>
                      {quality.level.charAt(0).toUpperCase() + quality.level.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Speed</span>
                      <p className="text-sm font-medium">{quality.speed}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Latency</span>
                      <p className="text-sm font-medium">{quality.latency}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              {(pendingActions.length > 0 || failedActions.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sync Status</span>
                    {isSyncing && (
                      <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Pending</span>
                      <p className="text-sm font-medium text-orange-600">
                        {pendingActions.length} items
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Failed</span>
                      <p className="text-sm font-medium text-red-600">
                        {failedActions.length} items
                      </p>
                    </div>
                  </div>

                  {isSyncing && syncProgress.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(syncProgress.current / syncProgress.total) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Connection Times */}
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Last Online</span>
                  <p className="text-sm font-medium">
                    {lastOnlineTime ? lastOnlineTime.toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                {lastOfflineTime && (
                  <div>
                    <span className="text-xs text-gray-500">Last Offline</span>
                    <p className="text-sm font-medium">
                      {lastOfflineTime.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Reconnect Button */}
              {!isOnline && (
                <Button
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  className="w-full"
                  variant="outline"
                >
                  {isConnecting ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="w-4 h-4 mr-2" />
                      Try Reconnecting
                    </>
                  )}
                </Button>
              )}

              {/* Reconnect Attempts */}
              {reconnectAttempts > 0 && (
                <div className="text-center">
                  <span className="text-xs text-gray-500">
                    Reconnect attempts: {reconnectAttempts}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOnline ? 'You are online' : 'You are offline'}
          {isSyncing && 'Sync in progress'}
          {pendingActions.length > 0 && `You have ${pendingActions.length} pending actions`}
        </div>
      </ScreenReaderOnly>
    </>
  )
}