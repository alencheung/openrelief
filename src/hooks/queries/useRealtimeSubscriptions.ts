import { useEffect, useRef, useCallback } from 'react'
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
}

// Real-time subscription hook
export const useRealtimeSubscription = (config: SubscriptionConfig) => {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(config.callback)

  // Update callback ref when config changes
  useEffect(() => {
    callbackRef.current = config.callback
  }, [config.callback])

  const subscribe = useCallback(() => {
    // Unsubscribe from existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel
    const channelName = `realtime-${config.table}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table as string,
          filter: config.filter,
        },
        (payload: any) => {
          const enhancedPayload = {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString(),
          }

          callbackRef.current(enhancedPayload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${config.table}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Error subscribing to ${config.table}`)
        }
      })

    channelRef.current = channel
  }, [config.table, config.event, config.filter])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      console.log(`[Realtime] Unsubscribed from ${config.table}`)
    }
  }, [])

  // Subscribe on mount and unsubscribe on unmount
  useEffect(() => {
    subscribe()
    return unsubscribe
  }, [subscribe, unsubscribe])

  return {
    subscribe,
    unsubscribe,
    isSubscribed: !!channelRef.current,
  }
}

// Emergency events subscription
export const useEmergencyEventsSubscription = () => {
  const { addEvent, updateEvent, removeEvent, setRealtimeEnabled, updateLastSyncTime } = useEmergencyStore.getState()
  const { createEmergencyNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()

  return useRealtimeSubscription({
    table: 'emergency_events',
    event: '*',
    callback: async (payload) => {
      console.log('[Realtime] Emergency event change:', payload)

      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            addEvent(payload.new)

            // Create notification for new high-priority events
            if (payload.new.severity >= 4) {
              createEmergencyNotification({
                eventId: payload.new.id,
                type: 'emergency',
                severity: payload.new.severity >= 5 ? 'critical' : 'warning',
                title: `New ${payload.new.severity >= 5 ? 'Critical' : 'High'} Emergency`,
                message: payload.new.title,
                location: payload.new.location,
              })
            }
          }
          break

        case 'UPDATE':
          if (payload.new && payload.old) {
            updateEvent(payload.new.id, payload.new)

            // Notification for status changes
            if (payload.old.status !== payload.new.status) {
              if (payload.new.status === 'resolved') {
                createEmergencyNotification({
                  eventId: payload.new.id,
                  type: 'emergency',
                  severity: 'success',
                  title: 'Emergency Resolved',
                  message: payload.new.title,
                  location: payload.new.location,
                })
              } else if (payload.new.status === 'active') {
                createEmergencyNotification({
                  eventId: payload.new.id,
                  type: 'emergency',
                  severity: 'warning',
                  title: 'Emergency Activated',
                  message: payload.new.title,
                  location: payload.new.location,
                })
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
    },
  })
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
        const confirmationType = payload.new.confirmation_type
        updateEvent(payload.new.event_id, {
          confirmation_count: confirmationType === 'confirm' ? 1 : 0,
          dispute_count: confirmationType === 'dispute' ? 1 : 0,
        })

        // Update trust score for confirmation
        await updateTrustForAction(
          payload.new.user_id,
          payload.new.event_id,
          confirmationType,
          'success',
          {
            trust_weight: payload.new.trust_weight,
            location: payload.new.location,
          }
        )

        // Create trust notification
        const trustScore = useTrustStore.getState().getUserScore(payload.new.user_id)
        if (trustScore) {
          createTrustNotification({
            userId: payload.new.user_id,
            scoreChange: 0.01, // Small positive change for confirming
            newScore: trustScore.score,
            reason: `Confirmed emergency event`,
          })
        }
      }
    },
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
              expertiseAreas: [],
            },
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
    },
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
          timestamp: new Date(payload.new.created_at),
        })

        // Create notification for significant trust changes
        if (Math.abs(payload.new.trust_change) > 0.1) {
          createTrustNotification({
            userId: payload.new.user_id,
            scoreChange: payload.new.trust_change,
            newScore: payload.new.new_score,
            reason: payload.new.reason || `Trust score updated`,
          })
        }
      }
    },
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
    },
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
    },
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
            filter: config.filter,
          },
          (payload: any) => {
            const enhancedPayload = {
              eventType: payload.eventType,
              old: payload.old,
              new: payload.new,
              timestamp: new Date().toISOString(),
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
    isSubscribed: channelsRef.current.length > 0,
  }
}

// Connection status monitoring
export const useRealtimeConnection = () => {
  const { setRealtimeEnabled, updateLastSyncTime } = useEmergencyStore.getState()
  const { isOnline } = useOfflineStore.getState()

  useEffect(() => {
    const handleConnect = () => {
      console.log('[Realtime] Connected to Supabase')
      setRealtimeEnabled(true)
      updateLastSyncTime()
    }

    const handleDisconnect = () => {
      console.log('[Realtime] Disconnected from Supabase')
      setRealtimeEnabled(false)
    }

    const handleError = (error: any) => {
      console.error('[Realtime] Connection error:', error)
      setRealtimeEnabled(false)
    }

    // Listen to connection events
    const channel = supabase.channel('system')
      .on('system', {}, (payload) => {
        console.log('[Realtime] System event:', payload)
      })
      .subscribe((status) => {
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setRealtimeEnabled, updateLastSyncTime, isOnline])
}

// Presence tracking for active users
export const usePresenceTracking = (userId: string, userLocation?: { lat: number; lng: number }) => {
  useEffect(() => {
    if (!userId || !userLocation) return

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
            status: 'active',
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, userLocation])
}

// Broadcast for emergency coordination
export const useEmergencyBroadcast = (eventId?: string) => {
  const broadcast = useCallback(async (event: string, payload: any) => {
    const channelName = eventId ? `emergency-${eventId}` : 'emergency-global'
    const channel = supabase.channel(channelName)

    await channel.send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        senderId: useEmergencyStore.getState().selectedEvent?.reporter_id,
      },
    })
  }, [eventId])

  const subscribe = useCallback((event: string, callback: (payload: any) => void) => {
    const channelName = eventId ? `emergency-${eventId}` : 'emergency-global'
    const channel = supabase.channel(channelName)
      .on('broadcast', { event }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { broadcast, subscribe }
}