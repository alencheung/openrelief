import { useEffect, useRef, useCallback, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import {
  useEmergencyStore,
  useTrustStore,
  useNotificationStore,
  useLocationStore,
  useOfflineStore
} from '@/store'
import { classifyError, createRetryFunction } from '@/lib/errorHandling'
import {
  logSubscriptionAttempt,
  logSubscriptionSuccess,
  logSubscriptionError,
  logConnectionState,
  logBroadcastAttempt,
  logBroadcastSuccess,
  logBroadcastError,
  logOfflineQueue,
  logPerformanceMetric,
  realtimeLogger,
  checkRealtimeHealth
} from '@/lib/realtimeLogger'

// Types
export type SubscriptionCallback<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: T | null
  new: T | null
  timestamp: string
}) => void

export type SubscriptionConfig = {
  table: keyof Database['public']['Tables']
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  callback: SubscriptionCallback
  priority?: 'low' | 'medium' | 'high' | 'critical'
  maxRetries?: number
  retryDelay?: number
}

export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'retrying'

// Real-time subscription hook with enhanced error handling
export const useRealtimeSubscription = (config: SubscriptionConfig) => {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(config.callback)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null)

  const { isOnline } = useOfflineStore.getState()
  const maxRetries = config.maxRetries || 5
  const retryDelay = config.retryDelay || 2000
  const priority = config.priority || 'medium'

  // Update callback ref when config changes
  useEffect(() => {
    callbackRef.current = config.callback
  }, [config.callback])

  // Enhanced subscribe function with retry logic
  const subscribe = useCallback(async () => {
    logSubscriptionAttempt('useRealtimeSubscription', config.table as string, retryCount + 1, maxRetries)

    if (!isOnline) {
      logSubscriptionError('useRealtimeSubscription', config.table as string, new Error('Offline - cannot establish connection'), retryCount)
      console.warn(`[Realtime] Cannot subscribe to ${config.table} - offline`)
      setStatus('disconnected')
      setError('Offline - cannot establish connection')
      return
    }

    setStatus('connecting')
    setError(null)

    // Unsubscribe from existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Create retry function with exponential backoff
    const retrySubscribe = createRetryFunction(
      async () => {
        const channelName = `realtime-${config.table}-${Date.now()}`
        console.log(`[Realtime] Attempting to subscribe to ${config.table} (attempt ${retryCount + 1})`)

        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes' as any,
            {
              event: config.event || '*',
              schema: 'public',
              table: config.table as string,
              filter: config.filter
            },
            (payload: any) => {
              try {
                const enhancedPayload = {
                  eventType: payload.eventType,
                  old: payload.old,
                  new: payload.new,
                  timestamp: new Date().toISOString()
                }

                callbackRef.current(enhancedPayload)
              } catch (err) {
                console.error(`[Realtime] Error processing payload for ${config.table}:`, err)
                // Don't let payload processing errors break the subscription
              }
            }
          )
          .subscribe((status) => {
            console.log(`[Realtime] Subscription status for ${config.table}:`, status)

            switch (status) {
              case 'SUBSCRIBED':
                console.log(`[Realtime] Successfully subscribed to ${config.table}`)
                setStatus('connected')
                setError(null)
                setRetryCount(0)
                break
              case 'CHANNEL_ERROR':
                console.error(`[Realtime] Channel error for ${config.table}`)
                setStatus('error')
                setError('Channel subscription error')
                break
              case 'TIMED_OUT':
                console.error(`[Realtime] Subscription timeout for ${config.table}`)
                setStatus('error')
                setError('Subscription timeout')
                break
              case 'CLOSED':
                console.log(`[Realtime] Channel closed for ${config.table}`)
                setStatus('disconnected')
                break
            }
          })

        channelRef.current = channel
        return channel
      },
      {
        maxRetries,
        baseDelay: retryDelay,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: true,
        onRetry: (attempt, err) => {
          logSubscriptionAttempt('useRealtimeSubscription', config.table as string, attempt, maxRetries)
          logSubscriptionError('useRealtimeSubscription', config.table as string, err, attempt)
          console.warn(`[Realtime] Retry attempt ${attempt} for ${config.table}:`, err)
          setStatus('retrying')
          setError(`Connection failed, retrying... (${attempt}/${maxRetries})`)
          setRetryCount(attempt)
        },
        onFailure: (err, attempts) => {
          logSubscriptionError('useRealtimeSubscription', config.table as string, err, attempts)
          console.error(`[Realtime] Failed to subscribe to ${config.table} after ${attempts} attempts:`, err)
          setStatus('error')
          setError(`Failed to connect after ${attempts} attempts`)
          setLastErrorTime(Date.now())

          // Log error for debugging
          const errorInfo = classifyError(err, {
            action: 'realtime_subscription',
            table: config.table,
            attempts,
            priority
          })
          console.error('[Realtime] Subscription error details:', errorInfo)
        }
      }
    )

    try {
      await retrySubscribe()
    } catch (err) {
      console.error(`[Realtime] Critical error subscribing to ${config.table}:`, err)
      setStatus('error')
      setError('Critical subscription error')
    }
  }, [config.table, config.event, config.filter, isOnline, retryCount, maxRetries, retryDelay, priority])

  // Enhanced unsubscribe function
  const unsubscribe = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      console.log(`[Realtime] Unsubscribed from ${config.table}`)
      setStatus('disconnected')
    }
  }, [])

  // Auto-retry on connection loss
  useEffect(() => {
    if (status === 'error' && isOnline && retryCount < maxRetries) {
      const delay = Math.min(retryDelay * Math.pow(2, retryCount), 30000)
      retryTimeoutRef.current = setTimeout(() => {
        console.log(`[Realtime] Auto-retrying connection to ${config.table} after ${delay}ms`)
        subscribe()
      }, delay)
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [status, isOnline, retryCount, maxRetries, retryDelay, config.table, subscribe])

  // Subscribe on mount and unsubscribe on unmount
  useEffect(() => {
    if (isOnline) {
      subscribe()
    }

    return unsubscribe
  }, [subscribe, unsubscribe, isOnline])

  // Handle network status changes
  useEffect(() => {
    if (isOnline && status === 'disconnected') {
      console.log(`[Realtime] Network restored, attempting to reconnect to ${config.table}`)
      subscribe()
    } else if (!isOnline && status === 'connected') {
      console.log(`[Realtime] Network lost, disconnecting from ${config.table}`)
      unsubscribe()
    }
  }, [isOnline, status, config.table, subscribe, unsubscribe])

  return {
    subscribe,
    unsubscribe,
    isSubscribed: status === 'connected',
    status,
    error,
    retryCount,
    lastErrorTime,
    canRetry: status === 'error' && isOnline && retryCount < maxRetries
  }
}

// Emergency events subscription with enhanced error handling
export const useEmergencyEventsSubscription = () => {
  const { addEvent, updateEvent, removeEvent, setRealtimeEnabled, updateLastSyncTime } = useEmergencyStore.getState()
  const { createEmergencyNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()
  const { isOnline } = useOfflineStore.getState()

  const subscriptionResult = useRealtimeSubscription({
    table: 'emergency_events',
    event: '*',
    priority: 'critical', // Emergency events are highest priority
    maxRetries: 10, // More retries for critical data
    retryDelay: 1000, // Faster retry for emergencies
    callback: async (payload) => {
      try {
        console.log('[Realtime] Emergency event change:', payload)

        // Update realtime status in store
        setRealtimeEnabled(true)

        switch (payload.eventType) {
          case 'INSERT':
            if (payload.new) {
              addEvent(payload.new)

              // Create notification for new high-priority events
              if (payload.new.severity >= 4) {
                try {
                  await createEmergencyNotification({
                    eventId: payload.new.id,
                    type: 'emergency',
                    severity: payload.new.severity >= 5 ? 'critical' : 'warning',
                    title: `New ${payload.new.severity >= 5 ? 'Critical' : 'High'} Emergency`,
                    message: payload.new.title,
                    location: payload.new.location
                  })
                } catch (notificationError) {
                  console.error('[Realtime] Failed to create emergency notification:', notificationError)
                  // Don't let notification failure break subscription
                }
              }
            }
            break

          case 'UPDATE':
            if (payload.new && payload.old) {
              updateEvent(payload.new.id, payload.new)

              // Notification for status changes
              if (payload.old.status !== payload.new.status) {
                try {
                  if (payload.new.status === 'resolved') {
                    await createEmergencyNotification({
                      eventId: payload.new.id,
                      type: 'emergency',
                      severity: 'success',
                      title: 'Emergency Resolved',
                      message: payload.new.title,
                      location: payload.new.location
                    })
                  } else if (payload.new.status === 'active') {
                    await createEmergencyNotification({
                      eventId: payload.new.id,
                      type: 'emergency',
                      severity: 'warning',
                      title: 'Emergency Activated',
                      message: payload.new.title,
                      location: payload.new.location
                    })
                  }
                } catch (notificationError) {
                  console.error('[Realtime] Failed to create status change notification:', notificationError)
                }
              }
            }
            break

          case 'DELETE':
            if (payload.old) {
              removeEvent(payload.old.id)
            }
            break
        }

        updateLastSyncTime()
      } catch (error) {
        console.error('[Realtime] Error processing emergency event:', error)
        const errorInfo = classifyError(error, {
          action: 'emergency_event_processing',
          eventType: payload.eventType,
          eventId: payload.new?.id || payload.old?.id
        })
        console.error('[Realtime] Emergency event processing error details:', errorInfo)

        // Don't rethrow - we don't want processing errors to break the subscription
      }
    }
  })

  // Monitor subscription status and update store accordingly
  useEffect(() => {
    if (subscriptionResult.status === 'connected') {
      setRealtimeEnabled(true)
    } else if (subscriptionResult.status === 'error' || subscriptionResult.status === 'disconnected') {
      setRealtimeEnabled(false)

      // If offline, queue emergency data for when we come back online
      if (!isOnline) {
        console.log('[Realtime] Emergency events offline - will sync when online')
      }
    }
  }, [subscriptionResult.status, isOnline, setRealtimeEnabled])

  return subscriptionResult
}

// Event confirmations subscription
export const useEventConfirmationsSubscription = () => {
  const { updateEvent } = useEmergencyStore.getState()
  const { createTrustNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()

  return useRealtimeSubscription({
    table: 'event_confirmations',
    event: 'INSERT',
    callback: async (payload) => {
      if (payload.new) {
        console.log('[Realtime] New confirmation:', payload.new)

        // Update event confirmation count
        const confirmationType = payload.new.confirmation_type as 'confirm' | 'dispute'
        updateEvent(payload.new.event_id, {
          confirmation_count: confirmationType === 'confirm' ? 1 : 0,
          dispute_count: confirmationType === 'dispute' ? 1 : 0
        })

        // Update trust score for confirmation
        await updateTrustForAction(
          payload.new.user_id,
          payload.new.event_id,
          confirmationType,
          'success',
          {
            trust_weight: payload.new.trust_weight,
            location: payload.new.location
          }
        )

        // Create trust notification
        const trustScore = useTrustStore.getState().getUserScore(payload.new.user_id)
        if (trustScore) {
          createTrustNotification({
            userId: payload.new.user_id,
            scoreChange: 0.01, // Small positive change for confirming
            newScore: trustScore.score,
            reason: 'Confirmed emergency event'
          })
        }
      }
    }
  })
}

// User profiles subscription
export const useUserProfilesSubscription = () => {
  const { setUserScore } = useTrustStore.getState()
  const { checkProximity } = useLocationStore.getState()

  return useRealtimeSubscription({
    table: 'user_profiles',
    event: 'UPDATE',
    filter: 'last_known_location=not.null',
    callback: (payload) => {
      if (payload.new && payload.old) {
        console.log('[Realtime] User profile updated:', payload.new)

        // Update trust score if changed
        if (payload.old.trust_score !== payload.new.trust_score) {
          setUserScore(payload.new.user_id, {
            userId: payload.new.user_id,
            score: payload.new.trust_score,
            previousScore: payload.old.trust_score,
            lastUpdated: new Date(payload.new.updated_at),
            history: [],
            factors: {
              reportingAccuracy: 0.5,
              confirmationAccuracy: 0.5,
              disputeAccuracy: 0.5,
              responseTime: 30,
              locationAccuracy: 0.5,
              contributionFrequency: 0,
              communityEndorsement: 0.5,
              penaltyScore: 0,
              expertiseAreas: []
            }
          })
        }

        // Check proximity if location updated
        if (payload.old.last_known_location !== payload.new.last_known_location && payload.new.last_known_location) {
          const location = payload.new.last_known_location
          const coords = location.match(/POINT\(([^ ]+) ([^ ]+)\)/)
          if (coords) {
            checkProximity(
              { lat: parseFloat(coords[2]), lng: parseFloat(coords[1]) },
              'user',
              payload.new.user_id
            )
          }
        }
      }
    }
  })
}

// Trust history subscription
export const useTrustHistorySubscription = () => {
  const { addToHistory, loadHistory } = useTrustStore.getState()
  const { createTrustNotification } = useNotificationStore.getState()

  return useRealtimeSubscription({
    table: 'user_trust_history',
    event: 'INSERT',
    callback: (payload) => {
      if (payload.new) {
        console.log('[Realtime] Trust history entry:', payload.new)

        addToHistory({
          id: payload.new.id,
          userId: payload.new.user_id,
          eventId: payload.new.event_id,
          actionType: payload.new.action_type,
          change: payload.new.trust_change,
          previousScore: payload.new.previous_score,
          newScore: payload.new.new_score,
          reason: payload.new.reason || undefined,
          timestamp: new Date(payload.new.created_at)
        })

        // Create notification for significant trust changes
        if (Math.abs(payload.new.trust_change) > 0.1) {
          createTrustNotification({
            userId: payload.new.user_id,
            scoreChange: payload.new.trust_change,
            newScore: payload.new.new_score,
            reason: payload.new.reason || 'Trust score updated'
          })
        }
      }
    }
  })
}

// Notification queue subscription
export const useNotificationQueueSubscription = () => {
  const { processQueue } = useOfflineStore.getState()

  return useRealtimeSubscription({
    table: 'notification_queue',
    event: 'INSERT',
    callback: (payload) => {
      if (payload.new) {
        console.log('[Realtime] New notification in queue:', payload.new)

        // Process notification queue if online
        if (navigator.onLine) {
          processQueue()
        }
      }
    }
  })
}

// System metrics subscription
export const useSystemMetricsSubscription = () => {
  return useRealtimeSubscription({
    table: 'system_metrics',
    event: 'INSERT',
    callback: (payload) => {
      if (payload.new) {
        console.log('[Realtime] System metric:', payload.new)

        // Handle critical system metrics
        if (payload.new.metric_name.includes('error') || payload.new.metric_name.includes('critical')) {
          // Could trigger alerts or UI updates
          console.warn(`[System] Critical metric: ${payload.new.metric_name} = ${payload.new.metric_value}`)
        }
      }
    }
  })
}

// Composite subscription hook for multiple tables
export const useMultipleRealtimeSubscriptions = (configs: SubscriptionConfig[]) => {
  const channelsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    // Subscribe to all configs
    const channels: RealtimeChannel[] = []

    configs.forEach((config, index) => {
      const channelName = `realtime-multi-${config.table}-${index}-${Date.now()}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table as string,
            filter: config.filter
          },
          (payload: any) => {
            const enhancedPayload = {
              eventType: payload.eventType,
              old: payload.old,
              new: payload.new,
              timestamp: new Date().toISOString()
            }

            config.callback(enhancedPayload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to ${config.table}`)
          }
        })

      channels.push(channel)
    })

    channelsRef.current = channels

    // Cleanup
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [configs])

  return {
    unsubscribe: () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    },
    isSubscribed: channelsRef.current.length > 0
  }
}

// Enhanced connection status monitoring with reconnection handling
export const useRealtimeConnection = () => {
  const { setRealtimeEnabled, updateLastSyncTime } = useEmergencyStore.getState()
  const { isOnline } = useOfflineStore.getState()
  const connectionStatusRef = useRef<'connected' | 'disconnected' | 'error'>('disconnected')
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 10

  const handleConnect = useCallback(() => {
    console.log('[Realtime] Connected to Supabase')
    connectionStatusRef.current = 'connected'
    reconnectAttemptsRef.current = 0
    setRealtimeEnabled(true)
    updateLastSyncTime()

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [setRealtimeEnabled, updateLastSyncTime])

  const handleDisconnect = useCallback(() => {
    console.log('[Realtime] Disconnected from Supabase')
    connectionStatusRef.current = 'disconnected'
    setRealtimeEnabled(false)

    // Attempt reconnection if online
    if (isOnline && reconnectAttemptsRef.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
      reconnectAttemptsRef.current++

      console.log(`[Realtime] Scheduling reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[Realtime] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
        // Force reconnection by recreating the connection
        establishConnection()
      }, delay)
    }
  }, [isOnline, setRealtimeEnabled])

  const handleError = useCallback((error: any) => {
    console.error('[Realtime] Connection error:', error)
    connectionStatusRef.current = 'error'
    setRealtimeEnabled(false)

    // Log error for debugging
    const errorInfo = classifyError(error, {
      action: 'realtime_connection',
      connectionStatus: connectionStatusRef.current,
      reconnectAttempts: reconnectAttemptsRef.current
    })
    console.error('[Realtime] Connection error details:', errorInfo)

    // Attempt recovery
    handleDisconnect()
  }, [setRealtimeEnabled, handleDisconnect])

  const establishConnection = useCallback(() => {
    if (!isOnline) {
      console.log('[Realtime] Cannot establish connection - offline')
      return
    }

    console.log('[Realtime] Establishing connection to Supabase')

    // Listen to connection events
    const channel = supabase.channel('system-connection')
      .on('system', {}, (payload) => {
        console.log('[Realtime] System event:', payload)
      })
      .subscribe((status) => {
        console.log(`[Realtime] Connection status: ${status}`)

        switch (status) {
          case 'SUBSCRIBED':
            handleConnect()
            break
          case 'CHANNEL_ERROR':
            handleError('Channel subscription error')
            break
          case 'TIMED_OUT':
            handleError('Connection timeout')
            break
          case 'CLOSED':
            handleDisconnect()
            break
        }
      })

    return channel
  }, [isOnline, handleConnect, handleError, handleDisconnect])

  useEffect(() => {
    const channel = establishConnection()

    // Handle network status changes
    const handleOnline = () => {
      console.log('[Realtime] Network restored, attempting to reconnect')
      if (connectionStatusRef.current !== 'connected') {
        reconnectAttemptsRef.current = 0
        establishConnection()
      }
    }

    const handleOffline = () => {
      console.log('[Realtime] Network lost')
      connectionStatusRef.current = 'disconnected'
      setRealtimeEnabled(false)

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [establishConnection, setRealtimeEnabled])
}

// Presence tracking for active users
export const usePresenceTracking = (userId: string, userLocation?: { lat: number; lng: number }) => {
  useEffect(() => {
    if (!userId || !userLocation) {
      return
    }

    const channel = supabase.channel(`presence-${userId}`)
      .on('presence' as any, { event: 'sync' }, (state: any) => {
        console.log('[Realtime] Presence sync:', state)
      })
      .on('presence' as any, { event: 'join' }, (newState: any) => {
        console.log('[Realtime] User joined:', newState)
      })
      .on('presence' as any, { event: 'leave' }, (leftState: any) => {
        console.log('[Realtime] User left:', leftState)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: userId,
            location: userLocation,
            online_at: new Date().toISOString(),
            status: 'active'
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, userLocation])
}

// Enhanced broadcast for emergency coordination with offline handling
export const useEmergencyBroadcast = (eventId?: string) => {
  const { isOnline, addAction } = useOfflineStore.getState()
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const broadcast = useCallback(async (event: string, payload: any) => {
    const channelName = eventId ? `emergency-${eventId}` : 'emergency-global'

    try {
      setBroadcastStatus('sending')
      setLastError(null)

      const enhancedPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        senderId: useEmergencyStore.getState().selectedEvent?.reporter_id
      }

      logBroadcastAttempt('useEmergencyBroadcast', channelName, eventId)

      if (!isOnline) {
        logOfflineQueue('useEmergencyBroadcast', 'broadcast', 'emergency_broadcasts', 'critical')
        console.log('[Realtime] Offline - queuing emergency broadcast')

        // Queue broadcast for when we come back online
        addAction({
          type: 'create',
          table: 'emergency_broadcasts',
          data: {
            channelName,
            event,
            payload: enhancedPayload
          },
          priority: 'critical', // Emergency broadcasts are highest priority
          maxRetries: 10
        })

        setBroadcastStatus('sent')
        return { queued: true, offline: true }
      }

      console.log(`[Realtime] Broadcasting emergency event: ${event} to ${channelName}`)

      const channel = supabase.channel(channelName)

      await channel.send({
        type: 'broadcast',
        event,
        payload: enhancedPayload
      })

      logBroadcastSuccess('useEmergencyBroadcast', channelName, eventId)
      setBroadcastStatus('sent')
      console.log('[Realtime] Emergency broadcast sent successfully')

      return { queued: false, offline: false }
    } catch (error) {
      logBroadcastError('useEmergencyBroadcast', channelName, error, eventId)
      console.error('[Realtime] Failed to send emergency broadcast:', error)

      const errorInfo = classifyError(error, {
        action: 'emergency_broadcast',
        channelName,
        event,
        eventId
      })

      console.error('[Realtime] Broadcast error details:', errorInfo)
      setLastError(errorInfo.message)
      setBroadcastStatus('error')

      // Queue for retry if it's a network error
      if (errorInfo.type === 'network' || errorInfo.type === 'offline') {
        logOfflineQueue('useEmergencyBroadcast', 'broadcast', 'emergency_broadcasts', 'critical')
        addAction({
          type: 'create',
          table: 'emergency_broadcasts',
          data: {
            channelName,
            event,
            payload: {
              ...payload,
              timestamp: new Date().toISOString(),
              senderId: useEmergencyStore.getState().selectedEvent?.reporter_id
            }
          },
          priority: 'critical',
          maxRetries: 10
        })
      }

      throw error
    }
  }, [eventId, isOnline, addAction])

  const subscribe = useCallback((event: string, callback: (payload: any) => void) => {
    const channelName = eventId ? `emergency-${eventId}` : 'emergency-global'

    if (!isOnline) {
      console.log('[Realtime] Cannot subscribe to emergency broadcast - offline')
      return () => { } // Return empty unsubscribe function
    }

    console.log(`[Realtime] Subscribing to emergency broadcasts: ${event} on ${channelName}`)

    const channel = supabase.channel(channelName)
      .on('broadcast', { event }, (payload) => {
        try {
          console.log(`[Realtime] Received emergency broadcast: ${event}`, payload)
          callback(payload)
        } catch (error) {
          console.error('[Realtime] Error processing emergency broadcast:', error)
          // Don't let processing errors break the subscription
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to emergency broadcasts: ${event}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Failed to subscribe to emergency broadcasts: ${event}`)
        }
      })

    return () => {
      console.log(`[Realtime] Unsubscribing from emergency broadcasts: ${event}`)
      supabase.removeChannel(channel)
    }
  }, [eventId, isOnline])

  return {
    broadcast,
    subscribe,
    status: broadcastStatus,
    error: lastError,
    canBroadcast: isOnline || broadcastStatus === 'sent' // Can always queue when offline
  }
}