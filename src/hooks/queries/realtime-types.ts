import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Notification } from '@/store/notificationStore'

// Realtime postgres_changes payload shape, parameterized by the
// concrete table-row type so callbacks get strongly-typed `old`/`new`.
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  old: T | null
  new: T | null
  // Raw payloads from Supabase also carry schema/table/commit_timestamp;
  // we type these loosely since subscribers only read old/new.
  schema?: string
  table?: string
  commit_timestamp?: string
  type?: string
}

// Enhanced payload delivered to user callbacks — old/new plus a derived
// server timestamp. This is the type SubscriptionCallback receives.
export interface RealtimeChange<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: T | null
  new: T | null
  timestamp: string
}

export type SubscriptionCallback<T = Record<string, unknown>> = (
  payload: RealtimeChange<T>
) => void

export type SubscriptionConfig<T extends keyof Database['public']['Tables'] = keyof Database['public']['Tables']> = {
  table: T
  filter?: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  callback: SubscriptionCallback
  priority?: 'low' | 'medium' | 'high' | 'critical'
  maxRetries?: number
  retryDelay?: number
}

export type SubscriptionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'retrying'

export type SubscriptionResult = {
  subscribe: () => Promise<void>
  unsubscribe: () => void
  isSubscribed: boolean
  status: SubscriptionStatus
  error: string | null
  retryCount: number
  lastErrorTime: number | null
  canRetry: boolean
}

// Table row aliases for use by per-table subscription hooks.
export type EmergencyEventRow = Database['public']['Tables']['emergency_events']['Row']
export type EventConfirmationRow =
  Database['public']['Tables']['event_confirmations']['Row']
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
export type UserTrustHistoryRow =
  Database['public']['Tables']['user_trust_history']['Row']
export type NotificationQueueRow =
  Database['public']['Tables']['notification_queue']['Row']
export type SystemMetricRow = Database['public']['Tables']['system_metrics']['Row']

// Minimal view of a RealtimeChannel that exposes the runtime-only
// `state` field and the optional second `subscribe` callback overload.
// The supabase-js type only types `state` as a private REALTIME_* enum,
// so we widen to the string values the code actually compares against.
export interface SharedChannelState {
  state?: string
  subscribe?: (
    callback?: (status: string, err?: unknown) => void
  ) => RealtimeChannel | Promise<RealtimeChannel>
}

// Severity string accepted by createEmergencyNotification.
export type EmergencyNotificationSeverity = Notification['severity']

// Input shape for createEmergencyNotification, mirrored from the
// notification store action so the realtime helpers don't need to import
// the store directly.
export interface EmergencyNotificationInput {
  eventId: string
  type: string
  severity: EmergencyNotificationSeverity
  title: string
  message: string
  location?: string
}

export type CreateEmergencyNotification = (
  data: EmergencyNotificationInput
) => string

// Broadcast status used by useEmergencyBroadcast.
export type BroadcastStatus = 'idle' | 'sending' | 'sent' | 'error'

// Status callback reported by RealtimeChannel.subscribe().
export type ChannelStatusCallback = (status: string) => void

// Generic presence/broadcast event handler signatures. Supabase's
// channel `.on()` overload for presence/system/broadcast events is not
// fully typed in v2, so we type only the callback contract here.
export type PresenceHandler = (state: unknown) => void
export type BroadcastHandler = (payload: Record<string, unknown>) => void
export type SystemHandler = (payload: unknown) => void

// Shared-channel message listener signature (matches the contract
// `acquireSharedChannel` expects).
export type SharedChannelMessageHandler = (payload: RealtimePayload) => void
