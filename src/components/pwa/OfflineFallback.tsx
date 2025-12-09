'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { WifiOffIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react'

export function OfflineFallback() {
  const { isOnline, reconnectAttempts } = useNetworkStatus()
  const [isRetrying, setIsRetrying] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Get last sync time from localStorage
    const stored = localStorage.getItem('openrelief-last-sync')
    if (stored) {
      setLastSyncTime(new Date(stored))
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)

    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch('/api/health', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        // Connection restored, reload the page
        window.location.reload()
      }
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const emergencyActions = [
    {
      title: 'Report Emergency',
      description: 'File an emergency report (will sync when online)',
      icon: AlertTriangleIcon,
      action: () => window.location.href = '/report',
      available: true
    },
    {
      title: 'View Offline Map',
      description: 'Access cached map data and locations',
      icon: CheckCircleIcon,
      action: () => window.location.href = '/offline/map',
      available: true
    },
    {
      title: 'Emergency Contacts',
      description: 'View cached emergency contact information',
      icon: CheckCircleIcon,
      action: () => window.location.href = '/offline/contacts',
      available: true
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Offline Status Card */}
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
              {isOnline ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              ) : (
                <WifiOffIcon className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </h1>

          <p className="text-gray-600 mb-4">
            {isOnline
              ? 'Your connection has been restored. You can continue using OpenRelief.'
              : 'OpenRelief is working offline. Emergency features remain available.'
            }
          </p>

          {!isOnline && (
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full"
                variant="outline"
              >
                {isRetrying ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Checking Connection...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Retry Connection
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

        {/* Emergency Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Emergency Actions Available Offline
          </h2>

          <div className="space-y-3">
            {emergencyActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                variant="ghost"
                className="w-full justify-start h-auto p-3"
                disabled={!action.available}
              >
                <action.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-gray-500">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </Card>

        {/* Offline Information */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Offline Mode Active</p>
              <p className="text-blue-700">
                OpenRelief continues to work offline for 24+ hours. Your emergency reports
                and actions will be synced automatically when you reconnect.
              </p>
              {lastSyncTime && (
                <p className="text-blue-600 mt-2 text-xs">
                  Last sync: {lastSyncTime.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Cache Status */}
        <div className="text-center text-xs text-gray-500">
          <p>OpenRelief Emergency Platform v2.0.0</p>
          <p>Offline-capable PWA</p>
        </div>
      </div>
    </div>
  )
}