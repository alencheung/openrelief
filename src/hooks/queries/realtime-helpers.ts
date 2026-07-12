import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ShardedPresenceState } from '@/lib/realtime/channel-sharding'
import type {
  CreateEmergencyNotification,
  EmergencyEventRow,
  RealtimeChange,
  RealtimePayload,
  SharedChannelState
} from './realtime-types'

// Supabase's RealtimeChannel.on() overload is narrowly typed and only
// accepts a small set of literal event names. 'presence' and 'system'
// work at runtime but are not in the public string union, so calls in
// the realtime hooks route through this minimal typed view to avoid
// casting the event name to `any`.
export type UntypedEventChannel = {
  on(
    type: string,
    filter: { event?: string } | Record<string, never>,
    callback: (payload: unknown) => void
  ): UntypedEventChannel
  subscribe(
    callback?: (status: string, err?: unknown) => void
  ): RealtimeChannel
  track(presence: ShardedPresenceState): Promise<void>
}

// Cast a RealtimeChannel to the untyped-event view above. This is a
// structural widening — the runtime object still exposes the standard
// RealtimeChannel methods; we only loosen the `.on()` event-name typing.
export const asUntypedEventChannel = (channel: RealtimeChannel): UntypedEventChannel =>
  channel as unknown as UntypedEventChannel

// Build the enhanced payload (RealtimeChange) handed to user callbacks,
// attaching a server-derived timestamp. Kept in one place so the single-
// and multi-subscription hooks produce identical shapes.
export const buildEnhancedPayload = <T = Record<string, unknown>>(
  raw: RealtimePayload<T>
): RealtimeChange<T> => ({
  eventType: normalizeEventType(raw.eventType),
  old: raw.old,
  new: raw.new,
  timestamp: new Date().toISOString()
})

// Supabase may deliver eventType '*' from wildcard subscriptions; narrow
// it to the union the rest of the codebase switches on. Unknown values
// pass through as INSERT/UPDATE/DELETE is the exhaustive switch target —
// callers already default-case unknown event types.
const normalizeEventType = (
  eventType: RealtimePayload['eventType']
): 'INSERT' | 'UPDATE' | 'DELETE' => {
  if (
    eventType === 'INSERT' ||
    eventType === 'UPDATE' ||
    eventType === 'DELETE'
  ) {
    return eventType
  }
  // Wildcard '*' or any unexpected value — default to UPDATE which the
  // downstream switch treats as an in-place row change.
  return 'UPDATE'
}

// Reflect a shared channel's current state into a status updater. The
// shared channel may already be SUBSCRIBED when acquired (other
// subscribers came first); in that case mark connected immediately so
// the caller doesn't wait for a redundant status callback.
export const reflectChannelState = (
  channel: { state?: string } | SharedChannelState,
  setStatus: (status: 'connected' | 'connecting' | 'error' | 'disconnected') => void,
  setError: (error: string | null) => void,
  setRetryCount: (count: number) => void
): void => {
  const state = (channel as SharedChannelState).state
  if (state === 'joined' || state === 'SUBSCRIBED') {
    setStatus('connected')
    setError(null)
    setRetryCount(0)
  }
}

// Map a RealtimeChannel.subscribe() status string onto the
// SubscriptionStatus state values used by the hook.
export const applyChannelStatus = (
  status: string,
  setStatus: (status: 'connected' | 'error' | 'disconnected') => void,
  setError: (error: string | null) => void
): void => {
  switch (status) {
    case 'SUBSCRIBED':
      setStatus('connected')
      setError(null)
      break
    case 'CHANNEL_ERROR':
      setStatus('error')
      setError('Channel subscription error')
      break
    case 'TIMED_OUT':
      setStatus('error')
      setError('Subscription timeout')
      break
    case 'CLOSED':
      setStatus('disconnected')
      break
  }
}

// Narrow an unknown realtime payload into an EmergencyEventRow-shaped
// change so the notification helpers can read typed fields. We only ever
// read `severity`, `status`, `id`, `title`, `location` — all of which
// exist on EmergencyEventRow — so the cast is sound for the
// emergency_events subscription this is used from.
const asEmergencyChange = (
  payload: RealtimeChange
): RealtimeChange<EmergencyEventRow> =>
  payload as unknown as RealtimeChange<EmergencyEventRow>

// Fire a notification when a new high-severity emergency is inserted.
// Severities < 4 are ignored to avoid notifying on routine reports.
export const handleInsertNotification = async (
  payload: RealtimeChange,
  createEmergencyNotification: CreateEmergencyNotification
): Promise<void> => {
  const change = asEmergencyChange(payload)
  const event = change.new
  if (!event || event.severity < 4) {
    return
  }

  try {
    createEmergencyNotification({
      eventId: event.id,
      type: 'emergency',
      severity: event.severity >= 5 ? 'critical' : 'warning',
      title: `New ${event.severity >= 5 ? 'Critical' : 'High'} Emergency`,
      message: event.title,
      location: event.location
    })
  } catch (notificationError) {
    console.error('[Realtime] Failed to create emergency notification:', notificationError)
  }
}

// Fire a notification when an emergency's status transitions. Only
// `resolved` and `active` transitions produce notifications.
export const handleUpdateNotification = async (
  payload: RealtimeChange,
  createEmergencyNotification: CreateEmergencyNotification
): Promise<void> => {
  const change = asEmergencyChange(payload)
  const next = change.new
  const prev = change.old
  if (!next || !prev || prev.status === next.status) {
    return
  }

  try {
    if (next.status === 'resolved') {
      createEmergencyNotification({
        eventId: next.id,
        type: 'emergency',
        severity: 'success',
        title: 'Emergency Resolved',
        message: next.title,
        location: next.location
      })
    } else if (next.status === 'active') {
      createEmergencyNotification({
        eventId: next.id,
        type: 'emergency',
        severity: 'warning',
        title: 'Emergency Activated',
        message: next.title,
        location: next.location
      })
    }
  } catch (notificationError) {
    console.error('[Realtime] Failed to create status change notification:', notificationError)
  }
}

// Default factory for the shared-channel message handler used by both
// the single and multi subscription hooks. It wraps the raw payload in
// a RealtimeChange and forwards to the subscriber callback, isolating
// payload errors so they never break the underlying subscription.
export const createSharedChannelListener = (
  onEnhanced: (change: RealtimeChange) => void,
  table: string
): ((payload: RealtimePayload) => void) => {
  return (payload: RealtimePayload) => {
    try {
      const enhancedPayload = buildEnhancedPayload(payload)
      onEnhanced(enhancedPayload)
    } catch (err) {
      console.error(`[Realtime] Error processing payload for ${table}:`, err)
      // Don't let payload processing errors break the subscription
    }
  }
}
