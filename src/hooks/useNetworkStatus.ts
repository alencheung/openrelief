'use client'

import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
  reconnectAttempts: number
  lastOnlineTime: Date | null
  lastOfflineTime: Date | null
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true, // Default to true for SSR consistency
    isOffline: false, // Default to false for SSR consistency
    reconnectAttempts: 0,
    lastOnlineTime: null,
    lastOfflineTime: null,
  })

  const updateNetworkStatus = useCallback((online: boolean) => {
    const now = new Date()

    setNetworkStatus(prev => {
      const wasOffline = prev.isOffline
      const newState = {
        ...prev,
        isOnline: online,
        isOffline: !online,
        lastOnlineTime: online ? now : prev.lastOnlineTime,
        lastOfflineTime: !online ? now : prev.lastOfflineTime,
        reconnectAttempts: online ? 0 : (wasOffline ? prev.reconnectAttempts + 1 : 1),
        connectionType: getConnectionType(),
        effectiveType: getEffectiveType(),
        downlink: getDownlink(),
        rtt: getRtt(),
      } as NetworkStatus

      // Store in localStorage for persistence across page reloads (outside setState to avoid recursion)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('openrelief-network-status', JSON.stringify({
            isOnline: online,
            lastOnlineTime: online ? now.toISOString() : null,
            lastOfflineTime: !online ? now.toISOString() : null,
            reconnectAttempts: online ? 0 : 1,
          }))
        } catch (error) {
          console.warn('[Network] Failed to save status to localStorage:', error)
        }
      }

      return newState
    })
  }, []) // No dependencies - we use the functional setState pattern

  // Get connection information from Network Information API
  function getConnectionType(): string | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      return connection?.type || connection?.effectiveType
    }
    return undefined
  }

  function getEffectiveType(): string | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection?.effectiveType
    }
    return undefined
  }

  function getDownlink(): number | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection?.downlink
    }
    return undefined
  }

  function getRtt(): number | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection?.rtt
    }
    return undefined
  }

  // Load saved network status from localStorage - only once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('openrelief-network-status')
        if (saved) {
          const parsed = JSON.parse(saved)
          setNetworkStatus({
            isOnline: navigator.onLine,
            isOffline: !navigator.onLine,
            reconnectAttempts: parsed.reconnectAttempts || 0,
            lastOnlineTime: parsed.lastOnlineTime ? new Date(parsed.lastOnlineTime) : null,
            lastOfflineTime: parsed.lastOfflineTime ? new Date(parsed.lastOfflineTime) : null,
          })
        } else {
          // Initialize with actual navigator state on client side
          setNetworkStatus({
            isOnline: navigator.onLine,
            isOffline: !navigator.onLine,
            reconnectAttempts: 0,
            lastOnlineTime: null,
            lastOfflineTime: null,
          })
        }
      } catch (error) {
        console.error('Failed to load network status from localStorage:', error)
        // Fallback to navigator state
        setNetworkStatus({
          isOnline: navigator.onLine,
          isOffline: !navigator.onLine,
          reconnectAttempts: 0,
          lastOnlineTime: null,
          lastOfflineTime: null,
        })
      }
    }
  }, []) // Empty dependency - only run once on mount

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Connection restored')
      updateNetworkStatus(true)

      // Trigger service worker sync if available
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration: any) => {
          registration.sync.register('emergency-offline-sync')
        })
      }
    }

    const handleOffline = () => {
      console.log('[Network] Connection lost')
      updateNetworkStatus(false)
    }

    // Listen for connection changes
    const handleConnectionChange = () => {
      updateNetworkStatus(navigator.onLine)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes if Network Information API is available
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', handleConnectionChange)
    }

    // Periodic connection check (every 30 seconds)
    const connectionCheckInterval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          // Try a lightweight request to verify actual connectivity
          const response = await fetch('/api/health', {
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000) // Increased timeout for better reliability
          })

          if (response.ok) {
            // Only update if we were previously offline
            setNetworkStatus(currentState => {
              if (!currentState.isOnline) {
                updateNetworkStatus(true)
              }
              return currentState
            })
          } else {
            // Server responded but with error status
            setNetworkStatus(currentState => {
              if (currentState.isOnline) {
                updateNetworkStatus(false)
              }
              return currentState
            })
          }
        } catch (error) {
          // Handle different types of errors
          let isNetworkError = false

          if (error instanceof DOMException && error.name === 'AbortError') {
            console.warn('[Network] Health check timeout')
            isNetworkError = true
          } else if (error instanceof TypeError) {
            // Network error (failed to fetch)
            console.warn('[Network] Health check failed:', error.message)
            isNetworkError = true
          } else {
            console.error('[Network] Unexpected health check error:', error)
            isNetworkError = true
          }

          if (isNetworkError) {
            setNetworkStatus(currentState => {
              if (currentState.isOnline) {
                updateNetworkStatus(false)
              }
              return currentState
            })
          }
        }
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection
        connection.removeEventListener('change', handleConnectionChange)
      }

      clearInterval(connectionCheckInterval)
    }
  }, []) // Empty dependency - all callbacks are stable

  return networkStatus
}

// Hook for managing offline actions
export function useOfflineActions() {
  const { isOnline } = useNetworkStatus()

  const queueOfflineAction = useCallback(async (action: {
    type: string
    data: any
    endpoint: string
    method?: string
  }) => {
    try {
      // Store action in IndexedDB for later sync
      const db = await openOfflineDB()
      const transaction = db.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')

      await store.add({
        ...action,
        id: generateId(),
        timestamp: Date.now(),
        synced: false
      })

      // Register for background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration: any = await navigator.serviceWorker.ready
        await registration.sync.register('emergency-offline-sync')
      }

      return { success: true, id: generateId() }
    } catch (error) {
      console.error('Failed to queue offline action:', error)
      return { success: false, error }
    }
  }, [])

  const getQueuedActions = useCallback(async () => {
    try {
      const db = await openOfflineDB()
      const transaction = db.transaction(['actions'], 'readonly')
      const store = transaction.objectStore('actions')
      const request = store.getAll()
      const actions = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      return actions.filter((action: any) => !action.synced)
    } catch (error) {
      console.error('Failed to get queued actions:', error)
      return []
    }
  }, [])

  return {
    queueOfflineAction,
    getQueuedActions,
    isOnline
  }
}

// Helper functions for offline storage
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }

    try {
      const request = indexedDB.open('OpenReliefOffline', 1)

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error)
        reject(request.error || new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        console.log('[IndexedDB] Database opened successfully')
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result

          if (!db.objectStoreNames.contains('actions')) {
            const store = db.createObjectStore('actions', { keyPath: 'id' })
            store.createIndex('timestamp', 'timestamp', { unique: false })
            store.createIndex('type', 'type', { unique: false })
            store.createIndex('synced', 'synced', { unique: false })
            console.log('[IndexedDB] Created actions object store')
          }
        } catch (error) {
          console.error('[IndexedDB] Failed to upgrade database:', error)
          reject(error)
        }
      }

      request.onblocked = () => {
        console.warn('[IndexedDB] Database open blocked - another connection might be open')
      }

    } catch (error) {
      console.error('[IndexedDB] Exception while opening database:', error)
      reject(error)
    }
  })
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}