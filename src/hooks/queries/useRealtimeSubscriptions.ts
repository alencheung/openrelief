import { useEffect, useRef, useCallback, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useOfflineStore } from '@/store'
import { classifyError, createRetryFunction } from '@/lib/errorHandling'
import {
  logSubscriptionAttempt,
  logSubscriptionError
} from '@/lib/realtimeLogger'
import { acquireSharedChannel } from '@/lib/realtime/shared-channels'
import type {
  RealtimePayload,
  SharedChannelState,
  SubscriptionConfig,
  SubscriptionStatus
} from './realtime-types'
import {
  applyChannelStatus,
  createSharedChannelListener,
  reflectChannelState
} from './realtime-helpers'

// Re-export public types so existing imports keep working.
export type {
  SubscriptionCallback,
  SubscriptionConfig
} from './realtime-types'

// Re-export the per-table, composite, connection, presence, and broadcast
// hooks so consumers that import from this module continue to resolve.
export {
  useEmergencyEventsSubscription,
  useEventConfirmationsSubscription,
  useUserProfilesSubscription,
  useTrustHistorySubscription,
  useNotificationQueueSubscription,
  useSystemMetricsSubscription,
  useMultipleRealtimeSubscriptions
} from './realtime-table-hooks'

export {
  useRealtimeConnection,
  usePresenceTracking,
  useEmergencyBroadcast
} from './realtime-presence'

// Real-time subscription hook with enhanced error handling.
//
// Channel-sharing strategy: every subscriber to the same
// (table, event, filter) tuple reuses ONE shared Supabase channel. The
// previous implementation suffixed each channel name with `Date.now()`,
// producing ~6 unique channels per user (600K channels at 100K users) and
// forcing Supabase Realtime to re-evaluate RLS per message per channel.
// Sharing channels collapses that to O(distinct filters) channels globally.
export const useRealtimeSubscription = (
  config: SubscriptionConfig
): {
  subscribe: () => Promise<void>
  unsubscribe: () => void
  isSubscribed: boolean
  status: SubscriptionStatus
  error: string | null
  retryCount: number
  lastErrorTime: number | null
  canRetry: boolean
} => {
  const channelRef = useRef<RealtimeChannel | null>(null)
  // Disposer returned by `acquireSharedChannel` — detaches this hook's
  // listener and decrements the shared channel's refcount on unmount.
  const channelReleaseRef = useRef<(() => void) | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null)

  const { isOnline } = useOfflineStore.getState()
  const maxRetries = config.maxRetries || 5
  const retryDelay = config.retryDelay || 2000
  const priority = config.priority || 'medium'

  // Subscribe function recreated on each config change. The previous
  // implementation stored `config.callback` in a ref; here we read it
  // directly off `config` because the subscribe closure captures it and
  // the effect re-runs whenever `config.callback` identity changes.
  const subscribe = useCallback(async () => {
    logSubscriptionAttempt(
      'useRealtimeSubscription',
      config.table as string,
      retryCount + 1,
      maxRetries
    )

    if (!isOnline) {
      logSubscriptionError(
        'useRealtimeSubscription',
        config.table as string,
        new Error('Offline - cannot establish connection'),
        retryCount
      )
      console.warn(`[Realtime] Cannot subscribe to ${config.table} - offline`)
      setStatus('disconnected')
      setError('Offline - cannot establish connection')
      return
    }

    setStatus('connecting')
    setError(null)

    // Release any previously acquired shared channel before re-acquiring.
    // The registry holds a single channel per (table, event, filter) tuple
    // shared across all subscribers; releasing here decrements its refcount.
    if (channelReleaseRef.current) {
      channelReleaseRef.current()
      channelReleaseRef.current = null
    }
    channelRef.current = null

    // Shared-channel listener. createSharedChannelListener wraps each
    // payload in a RealtimeChange and forwards to the subscriber callback,
    // isolating payload errors so they never break the underlying channel.
    const listener = createSharedChannelListener(
      (change) => config.callback(change),
      config.table as string
    )

    // Create retry function with exponential backoff
    const retrySubscribe = createRetryFunction(
      async () => {
        console.log(
          `[Realtime] Attempting to subscribe to ${config.table} (attempt ${retryCount + 1})`
        )

        // Acquire the shared channel for this (table, event, filter) tuple.
        // All subscribers to the same filter share one underlying Supabase
        // channel, collapsing 600K per-client channels down to O(filters).
        const { channel, release } = acquireSharedChannel(
          {
            table: config.table as string,
            event: config.event,
            filter: config.filter
          },
          listener as unknown as (payload: Record<string, unknown>) => void
        )

        channelReleaseRef.current = release
        channelRef.current = channel

        // Reflect the shared channel's status. The shared channel may
        // already be SUBSCRIBED; in that case mark connected immediately.
        reflectChannelState(
          channel as SharedChannelState,
          setStatus,
          setError,
          setRetryCount
        )
        // Listen for subsequent status transitions on the shared channel.
        // We pass a no-op subscribe callback because acquireSharedChannel
        // already called subscribe(); we only attach for status reflection.
        try {
          const channelState = channel as SharedChannelState
          channelState.subscribe?.((channelStatus: string) => {
            applyChannelStatus(channelStatus, setStatus, setError)
          })
        } catch {
          // Older supabase-js builds re-subscribe when subscribe() is called
          // twice; swallow and rely on the initial subscription state.
        }

        return channel
      },
      {
        maxRetries,
        baseDelay: retryDelay,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: true,
        onRetry: (attempt, err) => {
          logSubscriptionAttempt(
            'useRealtimeSubscription',
            config.table as string,
            attempt,
            maxRetries
          )
          logSubscriptionError('useRealtimeSubscription', config.table as string, err, attempt)
          console.warn(`[Realtime] Retry attempt ${attempt} for ${config.table}:`, err)
          setStatus('retrying')
          setError(`Connection failed, retrying... (${attempt}/${maxRetries})`)
          setRetryCount(attempt)
        },
        onFailure: (err, attempts) => {
          logSubscriptionError('useRealtimeSubscription', config.table as string, err, attempts)
          console.error(
            `[Realtime] Failed to subscribe to ${config.table} after ${attempts} attempts:`,
            err
          )
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
  }, [
    config.table,
    config.event,
    config.filter,
    config.callback,
    isOnline,
    retryCount,
    maxRetries,
    retryDelay,
    priority
  ])

  // Enhanced unsubscribe function
  const unsubscribe = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Release our subscription on the shared channel rather than removing
    // the channel outright (other subscribers may still depend on it).
    if (channelReleaseRef.current) {
      channelReleaseRef.current()
      channelReleaseRef.current = null
    }
    channelRef.current = null
    console.log(`[Realtime] Released subscription to ${config.table}`)
    setStatus('disconnected')
  }, [config.table])

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
