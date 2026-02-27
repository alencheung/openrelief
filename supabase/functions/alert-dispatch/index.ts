import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface AlertDispatchPayload {
  event_id: string
  type?: 'status_change' | 'new_event'
}

interface NotificationPayload {
  user_id: string
  event_id: string
  title: string
  message: string
  data: Record<string, unknown>
  notification_type: 'new_event' | 'update' | 'resolution'
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const RATE_LIMIT_WINDOW_MINUTES = 5
const MAX_NOTIFICATIONS_PER_WINDOW = 3

async function checkRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('notification_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  if (error) {
    console.error('Rate limit check failed:', error)
    return true
  }

  return (count ?? 0) < MAX_NOTIFICATIONS_PER_WINDOW
}

async function queueNotification(payload: NotificationPayload): Promise<void> {
  const { error } = await supabase.from('notification_queue').insert({
    user_id: payload.user_id,
    event_id: payload.event_id,
    notification_type: payload.notification_type,
    title: payload.title,
    message: payload.message,
    data: payload.data,
    status: 'pending'
  })

  if (error) {
    console.error('Failed to queue notification:', error)
    throw error
  }
}

async function getEventDetails(eventId: string) {
  const { data, error } = await supabase
    .from('emergency_events')
    .select(
      `
      id,
      title,
      description,
      severity,
      status,
      type_id,
      location,
      radius_meters,
      emergency_types(name, slug)
    `
    )
    .eq('id', eventId)
    .single()

  if (error) throw error
  return data
}

async function getUsersForAlert(
  eventId: string,
  maxDistance: number
): Promise<Array<{ user_id: string; email: string; distance: number; relevance_score: number }>> {
  const { data, error } = await supabase.rpc('get_users_for_alert_dispatch', {
    p_event_id: eventId,
    p_max_distance: maxDistance
  })

  if (error) {
    console.error('Failed to get users for alert:', error)
    return []
  }

  return data ?? []
}

async function sendPushNotification(
  _userId: string,
  _title: string,
  _message: string,
  _data: Record<string, unknown>
): Promise<void> {
  // Placeholder for push notification service integration
  // In production, integrate with FCM, APNS, or push service
  console.log('Push notification would be sent')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: AlertDispatchPayload = await req.json()
    const { event_id, type = 'status_change' } = payload

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const event = await getEventDetails(event_id)

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (event.status !== 'active' && type === 'status_change') {
      return new Response(JSON.stringify({ message: 'Event is not active, skipping dispatch' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const maxDistance = event.radius_meters ?? 10000
    const users = await getUsersForAlert(event_id, maxDistance)

    if (users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to notify' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const notificationType = type === 'new_event' ? 'new_event' : 'update'

    const notificationTitle = `Emergency Alert: ${event.title}`
    const notificationMessage =
      event.description ?? 'A new emergency event has been reported in your area.'

    let notifiedCount = 0
    let skippedCount = 0

    for (const user of users) {
      const canNotify = await checkRateLimit(user.user_id)

      if (!canNotify) {
        skippedCount++
        continue
      }

      await queueNotification({
        user_id: user.user_id,
        event_id: event_id,
        title: notificationTitle,
        message: notificationMessage,
        data: {
          event_type: event.emergency_types?.slug,
          severity: event.severity,
          distance: user.distance
        },
        notification_type: notificationType
      })

      await sendPushNotification(user.user_id, notificationTitle, notificationMessage, {
        event_id: event_id,
        event_type: event.emergency_types?.slug
      })

      notifiedCount++
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event_id,
        users_notified: notifiedCount,
        users_skipped: skippedCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Alert dispatch error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
