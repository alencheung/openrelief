'use client'

import React, { useEffect, createContext, useContext, useCallback, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  useAuthStore,
  useEmergencyStore,
  useTrustStore,
  useLocationStore,
  useNotificationStore,
  useOfflineStore,
  initializeStores,
  checkStoreHealth
} from '@/store'
import {
  useEmergencyEventsSubscription,
  useEventConfirmationsSubscription,
  useUserProfilesSubscription,
  useTrustHistorySubscription,
  useRealtimeConnection
} from '@/hooks/queries'
import { globalErrorBoundary, classifyError, reportError } from '@/lib/errorHandling'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// Create context for state management
interface StateManagementContextValue {
  isInitialized: boolean
  storeHealth: any
  error: any
  retry: () => void
}

const StateManagementContext = createContext<StateManagementContextValue | null>(null)

// Create query client with optimized defaults
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
          const errorInfo = classifyError(error)
          return errorInfo.retryable && failureCount < (errorInfo.maxRetries || 3)
        },
        retryDelay: (attemptIndex, error) => {
          const errorInfo = classifyError(error)
          if (errorInfo.type === 'rate_limit' && errorInfo.nextRetry) {
            return Math.max(0, errorInfo.nextRetry - Date.now())
          }
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
        retry: (failureCount, error) => {
          const errorInfo = classifyError(error)
          return errorInfo.retryable && failureCount < (errorInfo.maxRetries || 3)
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        networkMode: 'online',
      },
    },
  })
}

interface StateManagementProviderProps {
  children: React.ReactNode
  enableDevtools?: boolean
}

export const StateManagementProvider: React.FC<StateManagementProviderProps> = ({
  children,
  enableDevtools = process.env.NODE_ENV === 'development',
}) => {
  const [queryClient] = useState(() => createQueryClient())
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<any>(null)
  const { isOnline } = useNetworkStatus()

  // Initialize stores
  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined

    const initialize = async () => {
      try {
        console.log('[StateManagement] Initializing stores...')

        // Initialize all stores
        await initializeStores()

        // Check store health
        const health = checkStoreHealth()
        console.log('[StateManagement] Store health:', health)

        // Set up error boundary
        const unsubscribe = globalErrorBoundary.subscribe((state) => {
          if (state.hasError && state.error) {
            console.error('[StateManagement] Error boundary triggered:', state.error)
            setError(state.error)

            // Report error
            reportError(state.error)
          }
        })

        unsubscribeFn = unsubscribe
        setIsInitialized(true)
      } catch (err) {
        console.error('[StateManagement] Failed to initialize:', err)
        setError(classifyError(err))
      }
    }

    initialize()

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn()
      }
    }
  }, [])

  // Coordinated real-time subscriptions with dependency management
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false)
  const [subscriptionErrors, setSubscriptionErrors] = useState<string[]>([])

  // Initialize subscriptions in priority order with error handling
  useEffect(() => {
    if (!isOnline || !isInitialized) return

    console.log('[StateManagement] Initializing real-time subscriptions...')

    const initializeSubscriptions = async () => {
      const errors: string[] = []

      try {
        // 1. Critical: Emergency events (highest priority)
        console.log('[StateManagement] Initializing emergency events subscription...')
        const emergencySub = useEmergencyEventsSubscription()

        // Wait for emergency subscription to connect before proceeding
        if (emergencySub.status === 'error') {
          errors.push(`Emergency events subscription failed: ${emergencySub.error}`)
        }
      } catch (error) {
        errors.push(`Emergency events subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        // 2. High: Event confirmations
        console.log('[StateManagement] Initializing event confirmations subscription...')
        const confirmationSub = useEventConfirmationsSubscription()

        if (confirmationSub.status === 'error') {
          errors.push(`Event confirmations subscription failed: ${confirmationSub.error}`)
        }
      } catch (error) {
        errors.push(`Event confirmations subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        // 3. Medium: User profiles (location-dependent)
        console.log('[StateManagement] Initializing user profiles subscription...')
        const profileSub = useUserProfilesSubscription()

        if (profileSub.status === 'error') {
          errors.push(`User profiles subscription failed: ${profileSub.error}`)
        }
      } catch (error) {
        errors.push(`User profiles subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        // 4. Low: Trust history (non-critical)
        console.log('[StateManagement] Initializing trust history subscription...')
        const trustSub = useTrustHistorySubscription()

        if (trustSub.status === 'error') {
          errors.push(`Trust history subscription failed: ${trustSub.error}`)
        }
      } catch (error) {
        errors.push(`Trust history subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        // 5. System: Connection monitoring (always active)
        console.log('[StateManagement] Initializing connection monitoring...')
        useRealtimeConnection()
      } catch (error) {
        errors.push(`Connection monitoring error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      setSubscriptionErrors(errors)

      if (errors.length === 0) {
        console.log('[StateManagement] All subscriptions initialized successfully')
        setSubscriptionsInitialized(true)
      } else {
        console.error('[StateManagement] Subscription initialization errors:', errors)

        // Report errors for debugging
        errors.forEach((error, index) => {
          reportError(classifyError(new Error(error), {
            action: 'subscription_initialization',
            errorIndex: index,
            totalErrors: errors.length,
          }))
        })
      }
    }

    // Add delay to prevent overwhelming the connection
    const timeoutId = setTimeout(initializeSubscriptions, 1000)

    return () => clearTimeout(timeoutId)
  }, [isOnline, isInitialized])

  // Update emergency store with subscription status
  useEffect(() => {
    const { setRealtimeEnabled } = useEmergencyStore.getState()

    if (subscriptionErrors.length === 0 && subscriptionsInitialized) {
      setRealtimeEnabled(true)
    } else {
      setRealtimeEnabled(false)
    }
  }, [subscriptionErrors, subscriptionsInitialized])

  // Handle network status changes
  useEffect(() => {
    const { startSync, stopSync } = useOfflineStore.getState()

    if (isOnline) {
      startSync()
    } else {
      stopSync()
    }
  }, [isOnline])

  // Handle visibility changes (pause/resume sync when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const { isSyncing, startSync, stopSync } = useOfflineStore.getState()

      if (document.hidden) {
        // Pause non-critical operations when tab is hidden
        if (isSyncing) {
          stopSync()
        }
      } else {
        // Resume operations when tab is visible
        startSync()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Handle beforeunload (cleanup)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Stop ongoing operations
      useOfflineStore.getState().stopSync()
      useLocationStore.getState().stopTracking()

      // Save any pending state
      console.log('[StateManagement] Cleaning up before unload...')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Retry initialization
  const retry = useCallback(() => {
    setIsInitialized(false)
    setError(null)

    // Reset error boundary
    globalErrorBoundary.reset()

    // Re-initialize
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }, [])

  // Context value
  const contextValue = useMemo(() => ({
    isInitialized,
    storeHealth: checkStoreHealth(),
    error,
    retry,
  }), [isInitialized, error, retry])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing OpenRelief...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initialization Failed</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="text-left bg-gray-50 p-4 rounded-lg mb-4">
              <p className="font-medium text-gray-900 mb-2">Suggestions:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {error.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={retry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <StateManagementContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>
        {children}
        {enableDevtools && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </StateManagementContext.Provider>
  )
}

// Hook to use state management context
export const useStateManagement = () => {
  const context = useContext(StateManagementContext)
  if (!context) {
    throw new Error('useStateManagement must be used within StateManagementProvider')
  }
  return context
}

import { useQueryClient } from '@tanstack/react-query'

// Performance monitoring hook
export const useStateManagementPerformance = () => {
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isOnline) return

    const monitorPerformance = () => {
      // Monitor query performance
      const queryCache = queryClient.getQueryCache()
      const queries = queryCache.getAll()

      const performance = {
        totalQueries: queries.length,
        activeQueries: queries.filter((q: any) => q.state.fetchStatus === 'fetching').length,
        staleQueries: queries.filter((q: any) => q.isStale()).length,
        errorQueries: queries.filter((q: any) => q.state.status === 'error').length,
        averageQueryTime: queries.reduce((acc: number, q: any) => acc + (q.state.dataFetchTime || 0), 0) / queries.length,
      }

      // Log performance metrics
      console.log('[Performance] Query metrics:', performance)

      // Report poor performance
      if (performance.errorQueries > performance.totalQueries * 0.1) {
        console.warn('[Performance] High error rate detected')
      }

      if (performance.averageQueryTime > 5000) { // 5 seconds
        console.warn('[Performance] Slow queries detected')
      }
    }

    const interval = setInterval(monitorPerformance, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [isOnline])
}

// Emergency mode hook
export const useEmergencyMode = () => {
  const { events } = useEmergencyStore()
  const { addNotification } = useNotificationStore.getState()

  useEffect(() => {
    // Check for high-priority emergencies
    const criticalEvents = events.filter(e => e.severity >= 5 && e.status === 'active')

    if (criticalEvents.length > 0) {
      // Enable emergency mode
      document.body.classList.add('emergency-mode')

      addNotification({
        type: 'emergency',
        title: 'Emergency Mode Active',
        message: `${criticalEvents.length} critical emergency event(s) detected. Emergency mode has been activated.`,
        severity: 'critical',
        priority: 'urgent',
        channels: { inApp: true, push: true, email: true, sms: true },
      })
    } else {
      // Disable emergency mode
      document.body.classList.remove('emergency-mode')
    }

    return () => {
      document.body.classList.remove('emergency-mode')
    }
  }, [events])
}

// Export the provider
export default StateManagementProvider