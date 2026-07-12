import { useEffect, useRef, useCallback, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useEmergencyStore, useOfflineStore } from '@/store'
import { classifyError } from '@/lib/errorHandling'
import {
  getPresenceChannel,
  getEmergencyBroadcastShard,
  getShardCount,
  isShardingEnabled,
  isPresenceFromOtherUser,
  getUserIdsInShard,
  type ShardedPresenceState
} from '@/lib/realtime/channel-sharding'
import type { BroadcastStatus } from './realtime-types'
import { asUntypedEventChannel } from './realtime-helpers'

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

      console.log(
        `[Realtime] Scheduling reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`
      )

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(
          `[Realtime] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
        )
        // Force reconnection by recreating the connection
        establishConnection()
      }, delay)
    }
  }, [isOnline, setRealtimeEnabled])

  const handleError = useCallback(
    (error: unknown) => {
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
    },
    [setRealtimeEnabled, handleDisconnect]
  )

  const establishConnection = useCallback(() => {
    if (!isOnline) {
      console.log('[Realtime] Cannot establish connection - offline')
      return null
    }

    console.log('[Realtime] Establishing connection to Supabase')

    // Listen to connection events. Route through the untyped-event view
    // because 'system' is a valid runtime event but not part of the
    // supabase-js literal union for `.on()`.
    const channel = asUntypedEventChannel(supabase.channel('system-connection'))
    channel.on('system', {}, (payload: unknown) => {
      console.log('[Realtime] System event:', payload)
    })
    channel.subscribe((channelStatus: string) => {
      console.log(`[Realtime] Connection status: ${channelStatus}`)

      switch (channelStatus) {
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

    return channel as unknown as RealtimeChannel
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

  return {
    status: connectionStatusRef.current,
    error: null as string | null
  }
}

/**
 * Presence tracking for active users with channel sharding
 *
 * Uses sharded presence channels to prevent channel exhaustion at scale.
 * Instead of 1 channel per user (500K channels), users are distributed
 * across N shards (default 5000), reducing total channels by 100x.
 *
 * Within each shard, presence events are filtered by userId to maintain
 * individual user tracking while sharing the channel with ~100 other users.
 *
 * @param userId - The current user's unique identifier
 * @param userLocation - Optional user location for proximity features
 */
export const usePresenceTracking = (
  userId: string,
  userLocation?: { lat: number; lng: number }
) => {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId || !userLocation) {
      return
    }

    const channelName = getPresenceChannel(userId)
    const isSharded = isShardingEnabled()

    console.log(
      `[Realtime] Setting up presence tracking for user ${userId} on ${channelName}`,
      isSharded ? `(sharded, total shards: ${getShardCount()})` : '(legacy mode)'
    )

    const presenceChannel = asUntypedEventChannel(supabase.channel(channelName))
    presenceChannel
      .on('presence', { event: 'sync' }, (state: unknown) => {
        if (isSharded) {
          const userIds = getUserIdsInShard(state as Parameters<typeof getUserIdsInShard>[0])
          console.log(
            `[Realtime] Presence sync on ${channelName}: ${userIds.length} users in shard`
          )
        } else {
          console.log('[Realtime] Presence sync:', state)
        }
      })
      .on('presence', { event: 'join' }, (newState: unknown) => {
        if (isSharded) {
          const payload = newState as { newPresences?: Record<string, ShardedPresenceState> }
          const joiningUsers = Object.values(payload.newPresences || {}) as ShardedPresenceState[]
          const otherUsers = joiningUsers.filter(p => isPresenceFromOtherUser(p, userId))
          if (otherUsers.length > 0) {
            console.log(`[Realtime] ${otherUsers.length} other user(s) joined shard ${channelName}`)
          }
        } else {
          console.log('[Realtime] User joined:', newState)
        }
      })
      .on('presence', { event: 'leave' }, (leftState: unknown) => {
        if (isSharded) {
          const payload = leftState as { leftPresences?: Record<string, ShardedPresenceState> }
          const leavingUsers = Object.values(payload.leftPresences || {}) as ShardedPresenceState[]
          const otherUsers = leavingUsers.filter(p => isPresenceFromOtherUser(p, userId))
          if (otherUsers.length > 0) {
            console.log(`[Realtime] ${otherUsers.length} other user(s) left shard ${channelName}`)
          }
        } else {
          console.log('[Realtime] User left:', leftState)
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          const presenceState: ShardedPresenceState = {
            user_id: userId,
            location: userLocation,
            online_at: new Date().toISOString(),
            status: 'active'
          }
          await presenceChannel.track(presenceState)
          console.log(`[Realtime] Tracking presence on ${channelName} for user ${userId}`)
        }
      })

    channelRef.current = presenceChannel as unknown as RealtimeChannel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, userLocation])
}

// Broadcast payload received from emergency broadcast channels. The
// sender attaches `timestamp`, `senderId`, and `eventId` — all optional
// on the wire so receivers can target a specific eventId.
interface EmergencyBroadcastPayload {
  timestamp?: string
  senderId?: string
  eventId?: string
  [key: string]: unknown
}

/**
 * Enhanced broadcast for emergency coordination with offline handling
 *
 * Uses sharded emergency broadcast channels to prevent channel exhaustion.
 * Emergency events are distributed across shards using consistent hashing.
 *
 * @param eventId - Optional emergency event ID for targeted broadcasts
 */
export const useEmergencyBroadcast = (eventId?: string) => {
  const { isOnline, addAction } = useOfflineStore.getState()
  const [broadcastStatus, setBroadcastStatus] = useState<BroadcastStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)

  const broadcast = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      const channelName = eventId ? getEmergencyBroadcastShard(eventId) : 'emergency-global'

      try {
        setBroadcastStatus('sending')
        setLastError(null)

        const enhancedPayload: EmergencyBroadcastPayload = {
          ...payload,
          timestamp: new Date().toISOString(),
          senderId: useEmergencyStore.getState().selectedEvent?.reporter_id,
          eventId
        }

        if (!isOnline) {
          console.log('[Realtime] Offline - queuing emergency broadcast')

          addAction({
            type: 'create',
            table: 'emergency_broadcasts',
            data: {
              channelName,
              event,
              payload: enhancedPayload
            },
            priority: 'critical',
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

        setBroadcastStatus('sent')
        console.log('[Realtime] Emergency broadcast sent successfully')

        return { queued: false, offline: false }
      } catch (err) {
        console.error('[Realtime] Failed to send emergency broadcast:', err)

        const errorInfo = classifyError(err, {
          action: 'emergency_broadcast',
          channelName,
          event,
          eventId
        })

        console.error('[Realtime] Broadcast error details:', errorInfo)
        setLastError(errorInfo.message)
        setBroadcastStatus('error')

        if (errorInfo.type === 'network' || errorInfo.type === 'offline') {
          addAction({
            type: 'create',
            table: 'emergency_broadcasts',
            data: {
              channelName,
              event,
              payload: {
                ...payload,
                timestamp: new Date().toISOString(),
                senderId: useEmergencyStore.getState().selectedEvent?.reporter_id,
                eventId
              }
            },
            priority: 'critical',
            maxRetries: 10
          })
        }

        throw err
      }
    },
    [eventId, isOnline, addAction]
  )

  const subscribe = useCallback(
    (event: string, callback: (payload: EmergencyBroadcastPayload) => void) => {
      const channelName = eventId ? getEmergencyBroadcastShard(eventId) : 'emergency-global'

      if (!isOnline) {
        console.log('[Realtime] Cannot subscribe to emergency broadcast - offline')
        return () => {}
      }

      console.log(`[Realtime] Subscribing to emergency broadcasts: ${event} on ${channelName}`)

      const channel = supabase
        .channel(channelName)
        .on('broadcast', { event }, (payload: EmergencyBroadcastPayload) => {
          try {
            if (eventId && payload.eventId && payload.eventId !== eventId) {
              return
            }
            console.log(`[Realtime] Received emergency broadcast: ${event}`, payload)
            callback(payload)
          } catch (err) {
            console.error('[Realtime] Error processing emergency broadcast:', err)
          }
        })
        .subscribe((status: string) => {
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
    },
    [eventId, isOnline]
  )

  return {
    broadcast,
    subscribe,
    status: broadcastStatus,
    error: lastError,
    canBroadcast: isOnline || broadcastStatus === 'sent' // Can always queue when offline
  }
}
