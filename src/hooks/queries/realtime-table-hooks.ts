import { useEffect, useRef } from 'react'
import { acquireSharedChannel } from '@/lib/realtime/shared-channels'
import {
  useEmergencyStore,
  useTrustStore,
  useNotificationStore,
  useOfflineStore
} from '@/store'
import { classifyError } from '@/lib/errorHandling'
import type {
  CreateEmergencyNotification,
  EmergencyEventRow,
  EventConfirmationRow,
  NotificationQueueRow,
  RealtimePayload,
  SubscriptionConfig,
  SystemMetricRow,
  UserProfileRow,
  UserTrustHistoryRow
} from './realtime-types'
import {
  handleInsertNotification,
  handleUpdateNotification,
  createSharedChannelListener
} from './realtime-helpers'
import { useRealtimeSubscription } from './useRealtimeSubscriptions'

// Emergency events subscription with enhanced error handling
export const useEmergencyEventsSubscription = () => {
  const { addEvent, updateEvent, removeEvent, setRealtimeEnabled, updateLastSyncTime } =
    useEmergencyStore.getState()
  const { createEmergencyNotification } = useNotificationStore.getState()
  const { isOnline } = useOfflineStore.getState()

  const subscriptionResult = useRealtimeSubscription({
    table: 'emergency_events',
    event: '*',
    priority: 'critical', // Emergency events are highest priority
    // More retries for critical data, but with exponential backoff + jitter
    // rather than a flat 1s. The previous 1s base × 10 attempts produced a
    // thundering herd of 100K clients reconnecting every second during a
    // Supabase outage, compounding the outage itself.
    maxRetries: 10,
    retryDelay: 5000,
    callback: async payload => {
      try {
        console.log('[Realtime] Emergency event change:', payload)
        const create = createEmergencyNotification as CreateEmergencyNotification

        // Update realtime status in store
        setRealtimeEnabled(true)

        switch (payload.eventType) {
          case 'INSERT':
            if (payload.new) {
              addEvent(payload.new as EmergencyEventRow)
              await handleInsertNotification(payload, create)
            }
            break

          case 'UPDATE':
            if (payload.new && payload.old) {
              const event = payload.new as EmergencyEventRow
              updateEvent(event.id, event)
              await handleUpdateNotification(payload, create)
            }
            break

          case 'DELETE':
            if (payload.old) {
              removeEvent((payload.old as EmergencyEventRow).id)
            }
            break
        }

        updateLastSyncTime()
      } catch (err) {
        console.error('[Realtime] Error processing emergency event:', err)
        const errorInfo = classifyError(err, {
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
    } else if (
      subscriptionResult.status === 'error' ||
      subscriptionResult.status === 'disconnected'
    ) {
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

  return useRealtimeSubscription({
    table: 'event_confirmations',
    event: 'INSERT',
    callback: async payload => {
      const confirmation = payload.new as EventConfirmationRow | null
      if (!confirmation) {
        return
      }
      console.log('[Realtime] New confirmation:', confirmation)

      // Update event confirmation count
      const confirmationType = confirmation.confirmation_type
      updateEvent(confirmation.event_id, {
        confirmation_count: confirmationType === 'confirm' ? 1 : 0,
        dispute_count: confirmationType === 'dispute' ? 1 : 0
      })

      // Update trust score for confirmation
      await useTrustStore
        .getState()
        .updateTrustForAction(
          confirmation.user_id,
          confirmation.event_id,
          confirmationType,
          'success',
          {
            trust_weight: confirmation.trust_weight,
            location: confirmation.location
          }
        )

      // Create trust notification
      const trustScore = useTrustStore.getState().getUserScore(confirmation.user_id)
      if (trustScore) {
        createTrustNotification({
          userId: confirmation.user_id,
          scoreChange: 0.01, // Small positive change for confirming
          newScore: trustScore.score,
          reason: 'Confirmed emergency event'
        })
      }
    }
  })
}

// User profiles subscription.
//
// SCALABILITY NOTE: the previous filter `last_known_location=not.null`
// caused every location update from every user to be broadcast to every
// subscriber — a write-amplification storm at 100K users (each location
// ping = ~100K realtime messages). Location presence is already handled
// by the sharded presence channel; the `postgres_changes` subscription
// here is reserved for trust-score changes only, which are rare and
// high-signal. Trust updates are what actually need to refresh the UI.
export const useUserProfilesSubscription = () => {
  const { setUserScore } = useTrustStore.getState()

  return useRealtimeSubscription({
    table: 'user_profiles',
    event: 'UPDATE',
    // Filter to only trust_score-bearing rows. Without a column-equality
    // filter Supabase cannot push this down; we accept the broader filter
    // and gate work inside the callback on whether trust actually changed.
    // Location-driven presence is handled by the sharded presence channel,
    // NOT here, to avoid the write-amplification storm.
    callback: payload => {
      const next = payload.new as UserProfileRow | null
      const prev = payload.old as UserProfileRow | null
      if (!next || !prev) {
        return
      }
      // Only act on trust-score changes — ignore location/other updates.
      if (prev.trust_score !== next.trust_score) {
        setUserScore(next.user_id, {
          userId: next.user_id,
          score: next.trust_score,
          previousScore: prev.trust_score,
          lastUpdated: new Date(next.updated_at),
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

      // Proximity checks are intentionally NOT triggered from this
      // subscription. Per-user location updates are too high-frequency
      // to fan out via postgres_changes; presence-channel proximity is
      // handled in usePresenceTracking instead.
    }
  })
}

// Trust history subscription
export const useTrustHistorySubscription = () => {
  const { addToHistory } = useTrustStore.getState()
  const { createTrustNotification } = useNotificationStore.getState()

  return useRealtimeSubscription({
    table: 'user_trust_history',
    event: 'INSERT',
    callback: payload => {
      const entry = payload.new as UserTrustHistoryRow | null
      if (!entry) {
        return
      }
      console.log('[Realtime] Trust history entry:', entry)

      addToHistory({
        id: entry.id,
        userId: entry.user_id,
        eventId: entry.event_id,
        actionType: entry.action_type,
        change: entry.trust_change,
        previousScore: entry.previous_score,
        newScore: entry.new_score,
        reason: entry.reason || undefined,
        timestamp: new Date(entry.created_at)
      })

      // Create notification for significant trust changes
      if (Math.abs(entry.trust_change) > 0.1) {
        createTrustNotification({
          userId: entry.user_id,
          scoreChange: entry.trust_change,
          newScore: entry.new_score,
          reason: entry.reason || 'Trust score updated'
        })
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
    callback: payload => {
      const notification = payload.new as NotificationQueueRow | null
      if (!notification) {
        return
      }
      console.log('[Realtime] New notification in queue:', notification)

      // Process notification queue if online
      if (navigator.onLine) {
        processQueue()
      }
    }
  })
}

// System metrics subscription
export const useSystemMetricsSubscription = () => {
  return useRealtimeSubscription({
    table: 'system_metrics',
    event: 'INSERT',
    callback: payload => {
      const metric = payload.new as SystemMetricRow | null
      if (!metric) {
        return
      }
      console.log('[Realtime] System metric:', metric)

      // Handle critical system metrics
      if (metric.metric_name.includes('error') || metric.metric_name.includes('critical')) {
        // Could trigger alerts or UI updates
        console.warn(`[System] Critical metric: ${metric.metric_name} = ${metric.metric_value}`)
      }
    }
  })
}

// Composite subscription hook for multiple tables.
//
// Uses the shared-channel registry so multiple subscriptions to the same
// (table, event, filter) tuple collapse onto a single Supabase channel.
export const useMultipleRealtimeSubscriptions = (configs: SubscriptionConfig[]) => {
  const releasesRef = useRef<Array<() => void>>([])

  useEffect(() => {
    const releases: Array<() => void> = []

    configs.forEach((config) => {
      const listener = createSharedChannelListener(
        (change) => config.callback(change),
        config.table as string
      )
      const { release } = acquireSharedChannel(
        {
          table: config.table as string,
          event: config.event,
          filter: config.filter
        },
        listener as (payload: RealtimePayload) => void
      )
      releases.push(release)
      console.log(`[Realtime] Subscribed to ${config.table}`)
    })

    releasesRef.current = releases

    // Cleanup — release each shared channel subscription. Channels whose
    // refcount drops to zero are removed by the registry.
    return () => {
      releases.forEach(release => release())
      releasesRef.current = []
    }
  }, [configs])

  return {
    unsubscribe: () => {
      releasesRef.current.forEach(release => release())
      releasesRef.current = []
    },
    isSubscribed: releasesRef.current.length > 0
  }
}
