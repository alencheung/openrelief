/**
 * Notification queue producer.
 *
 * The dispatch endpoint (`/api/notifications/dispatch`) reads rows from the
 * `notification_queue` table and fans them out via Web Push. Previously
 * nothing in the codebase wrote to that table, so dispatch always reported
 * sent:0 and no user ever received a server-side push. This helper is the
 * missing producer: it enqueues a notification for each user who should
 * receive an alert for a given emergency event.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type NotificationType = Database['public']['Enums']['notification_queue_notification_type']
type TypedSupabaseClient = SupabaseClient<Database>

interface EnqueueOptions {
  /** Supabase client with permission to insert into notification_queue. */
  supabase: TypedSupabaseClient
  /** The event these notifications are about. */
  eventId: string
  /** Short alert title, e.g. "New emergency nearby". */
  title: string
  /** Alert body, e.g. the event description (truncated). */
  message: string
  /** Which kind of alert — drives user filtering + dedupe. */
  notificationType: NotificationType
  /**
   * Optional explicit recipient list. When omitted the helper resolves
   * recipients via the `get_users_for_alert_dispatch` RPC (users with push
   * enabled whose notification settings match the event's location/severity).
   * IDs that belong to the event reporter are skipped so authors don't alert
   * themselves.
   */
  recipientUserIds?: string[]
  /** Reporter to exclude (the event's reporter_id). */
  excludeUserId?: string | null
  /** Max delivery attempts before the row is marked failed. */
  maxAttempts?: number
  /** Arbitrary JSON attached to the push payload (e.g. severity, location). */
  data?: Record<string, unknown>
}

/**
 * Enqueue per-user notification rows. Idempotent on (user_id, event_id,
 * notification_type) via a pre-insert de-dup query so re-runs (e.g. a retry of
 * the event-creation flow) don't spam users. Returns the number of rows
 * actually inserted.
 */
export async function enqueueEventNotifications({
  supabase,
  eventId,
  title,
  message,
  notificationType,
  recipientUserIds,
  excludeUserId,
  maxAttempts = 3,
  data
}: EnqueueOptions): Promise<number> {
  // Resolve recipients unless the caller supplied an explicit list.
  let userIds = recipientUserIds ?? []
  if (userIds.length === 0) {
    // The generated Database type includes an index signature `[_ in never]: never`
    // on Functions (supabase-ts quirk) that makes the typed client treat every
    // RPC's args as `never`. Cast to an untyped client for this call so the
    // explicit-arg signature from database.ts (p_event_id, p_max_distance?) is
    // honoured at runtime while avoiding a build-breaking type error.
    const untyped = supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: Array<{ user_id?: string; id?: string }> | null; error: { message: string } | null }>
    }
    const { data: rpcResult, error } = await untyped.rpc('get_users_for_alert_dispatch', {
      p_event_id: eventId
    })
    if (error) {
      // Non-fatal: better to skip enqueueing than to crash the caller (e.g.
      // emergency creation). The dispatch cron will simply have nothing to send.
      console.error('enqueueEventNotifications: RPC failed', error.message)
      return 0
    }
    // The RPC returns rows shaped like { user_id: string } (see database.ts).
    userIds = (rpcResult ?? [])
      .map(r => r.user_id ?? r.id ?? '')
      .filter((id): id is string => Boolean(id))
  }

  // Never alert the reporter about their own event.
  if (excludeUserId) {
    userIds = userIds.filter(id => id !== excludeUserId)
  }
  if (userIds.length === 0) return 0

  // De-dup: skip users who already have a pending/sent row for this event+type.
  const { data: existing, error: dupError } = await supabase
    .from('notification_queue')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('notification_type', notificationType)
    .in('status', ['pending', 'sent'])
  if (dupError) {
    console.error('enqueueEventNotifications: de-dup query failed', dupError.message)
    // Proceed best-effort without de-dup rather than dropping the batch.
  }
  const alreadyQueued = new Set(
    ((existing as Array<{ user_id: string }> | null) ?? []).map(r => r.user_id)
  )
  const toEnqueue = userIds.filter(id => !alreadyQueued.has(id))
  if (toEnqueue.length === 0) return 0

  const now = new Date().toISOString()
  type NotificationQueueInsert = Database['public']['Tables']['notification_queue']['Insert']
  const rows: NotificationQueueInsert[] = toEnqueue.map(userId => ({
    user_id: userId,
    event_id: eventId,
    notification_type: notificationType,
    title,
    message,
    // The notification_queue.data column is typed Json.
    data: (data ?? {}) as Database['public']['Tables']['notification_queue']['Insert']['data'],
    status: 'pending',
    attempts: 0,
    max_attempts: maxAttempts,
    scheduled_at: now
  }))

  // The generated Database type's `[_ in never]: never` index signature on
  // Tables (supabase-ts quirk) makes the typed client treat notification_queue
  // inserts as `never`. Cast through unknown to the runtime-shaped client so
  // the insert is allowed at runtime while staying self-documenting here.
  type QueueInsert = Database['public']['Tables']['notification_queue']['Insert']
  const { error: insertError } = await (supabase as unknown as {
    from: (t: string) => { insert: (rows: QueueInsert[]) => Promise<{ error: { message: string } | null }> }
  })
    .from('notification_queue')
    .insert(rows)
  if (insertError) {
    console.error('enqueueEventNotifications: insert failed', insertError.message)
    return 0
  }
  return rows.length
}
