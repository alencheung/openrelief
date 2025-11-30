'use client'

import { useEffect, useState } from 'react'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { NetworkStatusIndicator } from './NetworkStatusIndicator'
import { PWAStatus } from './PWAStatus'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface PWAManagerProps {
  children: React.ReactNode
}

export function PWAManager({ children }: PWAManagerProps) {
  const { isOnline, isOffline, lastOnlineTime } = useNetworkStatus()
  const { requestPermission } = usePushNotifications()
  const [showOfflineWarning, setShowOfflineWarning] = useState(false)
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)

  useEffect(() => {
    // Initialize service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration)
          setServiceWorkerReady(true)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  handleNewVersionAvailable()
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    }

    // Request notification permission after user interaction
    const handleUserInteraction = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        // Don't request immediately, wait for a meaningful interaction
        setTimeout(() => {
          requestPermission().catch(() => {
            // Permission denied, that's okay
          })
        }, 5000)
      }

      // Remove listener after first interaction
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }

    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [requestPermission])

  useEffect(() => {
    let timer: NodeJS.Timeout

    // Show offline warning if offline for more than 10 seconds
    if (isOffline) {
      timer = setTimeout(() => {
        setShowOfflineWarning(true)
      }, 10000)
    } else {
      setShowOfflineWarning(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isOffline])

  const handleNewVersionAvailable = () => {
    if (confirm('A new version of OpenRelief is available. Would you like to update?')) {
      // Skip waiting and activate new service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        })
      }
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <>
      {children}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Network Status Indicator */}
      <NetworkStatusIndicator />

      {/* Offline Warning */}
      {showOfflineWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 text-center">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-medium">
                You're currently offline. Emergency features remain available.
              </span>
              {lastOnlineTime && (
                <span className="text-xs opacity-75">
                  Last online: {lastOnlineTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowOfflineWarning(false)}
              className="text-white hover:text-gray-200 p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Service Worker Update Notification */}
      {!serviceWorkerReady && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span>
              ⚡ OpenRelief is loading offline capabilities...
            </span>
          </div>
        </div>
      )}
    </>
  )
}


// Hook for PWA status and management
export function usePWAStatus() {
  const [isReady, setIsReady] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<any>(null)

  useEffect(() => {
    // Check PWA readiness
    const checkPWAStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          setIsReady(true)

          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'SW_UPDATED') {
              setHasUpdate(true)
            }
          })

          // Get cache info
          if (registration.active) {
            registration.active.postMessage({ type: 'GET_CACHE_INFO' })
          }
        } catch (error) {
          console.error('[PWA] Failed to check status:', error)
        }
      }
    }

    checkPWAStatus()
  }, [])

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      })
    }
  }

  const clearCache = async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: 'CLEAR_CACHE' })
      })
    }
  }

  return {
    isReady,
    hasUpdate,
    cacheInfo,
    updateApp,
    clearCache
  }
}