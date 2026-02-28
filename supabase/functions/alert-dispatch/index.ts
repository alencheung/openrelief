import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const FCM_BATCH_SIZE = 1000
const FCM_MAX_RETRIES = 3
const FCM_BASE_DELAY_MS = 1000
const FCM_MAX_DELAY_MS = 30000

interface AlertDispatchPayload {
  event_id: string
  type?: 'status_change' | 'new_event'
  batch_size?: number
}

interface NotificationPayload {
  user_id: string
  event_id: string
  title: string
  message: string
  data: Record<string, unknown>
  notification_type: 'new_event' | 'update' | 'resolution'
}

interface FCMBatchResult {
  successCount: number
  failureCount: number
  failedTokens: string[]
  invalidTokens: string[]
}

interface FCMResponse {
  success?: number
  failure?: number
  results?: Array<{
    message_id?: string
    error?: string
  }>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const RATE_LIMIT_WINDOW_MINUTES = 5
const MAX_NOTIFICATIONS_PER_WINDOW = 3
const DB_BATCH_SIZE = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateBackoffDelay(retryCount: number): number {
  const delay = Math.min(FCM_BASE_DELAY_MS * Math.pow(2, retryCount), FCM_MAX_DELAY_MS)
  return delay + Math.random() * 500
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

async function batchCheckRateLimits(userIds: string[]): Promise<Set<string>> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
  const allowedUserIds = new Set<string>()

  const { data, error } = await supabase
    .from('notification_queue')
    .select('user_id')
    .in('user_id', userIds)
    .gte('created_at', windowStart)

  if (error) {
    console.error('Batch rate limit check failed:', error)
    userIds.forEach(id => allowedUserIds.add(id))
    return allowedUserIds
  }

  const countByUser = new Map<string, number>()
  for (const row of data ?? []) {
    const current = countByUser.get(row.user_id) ?? 0
    countByUser.set(row.user_id, current + 1)
  }

  for (const userId of userIds) {
    const count = countByUser.get(userId) ?? 0
    if (count < MAX_NOTIFICATIONS_PER_WINDOW) {
      allowedUserIds.add(userId)
    }
  }

  return allowedUserIds
}

async function queueNotificationsBatch(payloads: NotificationPayload[]): Promise<void> {
  const batches = chunkArray(payloads, DB_BATCH_SIZE)

  for (const batch of batches) {
    const { error } = await supabase.from('notification_queue').insert(
      batch.map(p => ({
        user_id: p.user_id,
        event_id: p.event_id,
        notification_type: p.notification_type,
        title: p.title,
        message: p.message,
        data: p.data,
        status: 'pending'
      }))
    )

    if (error) {
      console.error('Failed to batch queue notifications:', error)
    }
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
): Promise<
  Array<{
    user_id: string
    email: string
    fcm_token?: string
    distance: number
    relevance_score: number
  }>
> {
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

async function sendFCMBatchRequest(
  tokens: string[],
  title: string,
  message: string,
  data: Record<string, unknown>,
  priority: string
): Promise<Response> {
  const serverKey = Deno.env.get('FCM_SERVER_KEY')

  if (!serverKey) {
    throw new Error('FCM_SERVER_KEY is not configured')
  }

  const ttl = priority === 'high' ? 3600 : 86400

  const payload = {
    registration_ids: tokens,
    notification: {
      title,
      body: message,
      priority,
      ttl
    },
    data: {
      priority,
      ...data
    },
    android: {
      priority,
      ttl
    },
    apns: {
      headers: {
        'apns-priority': priority === 'high' ? '10' : '5',
        'apns-expiration': new Date(Date.now() + ttl * 1000).toISOString()
      }
    }
  }

  return fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}

async function processFCMBatchResponse(
  response: Response,
  tokens: string[]
): Promise<FCMBatchResult> {
  const result: FCMBatchResult = {
    successCount: 0,
    failureCount: 0,
    failedTokens: [],
    invalidTokens: []
  }

  try {
    const responseData: FCMResponse = await response.json()

    if (!responseData.results) {
      if (responseData.success !== undefined) {
        result.successCount = responseData.success
      }
      if (responseData.failure !== undefined) {
        result.failureCount = responseData.failure
      }
      return result
    }

    responseData.results.forEach((fcmResult, index) => {
      const token = tokens[index]
      if (!token) return

      if (fcmResult.message_id) {
        result.successCount++
      } else if (fcmResult.error) {
        result.failureCount++
        result.failedTokens.push(token)

        if (fcmResult.error === 'InvalidRegistration' || fcmResult.error === 'NotRegistered') {
          result.invalidTokens.push(token)
        }
      }
    })
  } catch {
    result.successCount = tokens.length
  }

  return result
}

async function logInvalidTokens(tokens: string[]): Promise<void> {
  try {
    await supabase.from('invalid_fcm_tokens').insert(
      tokens.map(token => ({
        token,
        detected_at: new Date().toISOString(),
        cleanup_status: 'pending'
      }))
    )
  } catch {
    console.error('Failed to log invalid tokens for cleanup')
  }
}

interface PushUser {
  user_id: string
  fcm_token?: string | undefined
}

async function sendBatchPushNotifications(
  users: PushUser[],
  title: string,
  message: string,
  data: Record<string, unknown>,
  priority: string,
  batchSize: number
): Promise<FCMBatchResult> {
  const result: FCMBatchResult = {
    successCount: 0,
    failureCount: 0,
    failedTokens: [],
    invalidTokens: []
  }

  const usersWithTokens = users.filter(
    (u): u is { user_id: string; fcm_token: string } => !!u.fcm_token
  )
  if (usersWithTokens.length === 0) {
    return result
  }

  const tokens = usersWithTokens.map(u => u.fcm_token)
  const tokenBatches = chunkArray(tokens, batchSize)

  for (const batchTokens of tokenBatches) {
    let retryCount = 0

    while (retryCount <= FCM_MAX_RETRIES) {
      const response = await sendFCMBatchRequest(batchTokens, title, message, data, priority)

      if (response.status === 429) {
        retryCount++
        if (retryCount <= FCM_MAX_RETRIES) {
          const delay = calculateBackoffDelay(retryCount)
          await sleep(delay)
          continue
        }
        result.failureCount += batchTokens.length
        result.failedTokens.push(...batchTokens)
        break
      }

      if (!response.ok) {
        retryCount++
        if (retryCount <= FCM_MAX_RETRIES) {
          const delay = calculateBackoffDelay(retryCount)
          await sleep(delay)
          continue
        }
        result.failureCount += batchTokens.length
        result.failedTokens.push(...batchTokens)
        break
      }

      const batchResult = await processFCMBatchResponse(response, batchTokens)
      result.successCount += batchResult.successCount
      result.failureCount += batchResult.failureCount
      result.failedTokens.push(...batchResult.failedTokens)
      result.invalidTokens.push(...batchResult.invalidTokens)
      break
    }
  }

  if (result.invalidTokens.length > 0) {
    await logInvalidTokens(result.invalidTokens)
  }

  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: AlertDispatchPayload = await req.json()
    const { event_id, type = 'status_change', batch_size = FCM_BATCH_SIZE } = payload

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

    const userIds = users.map(u => u.user_id)
    const allowedUserIds = await batchCheckRateLimits(userIds)
    const skippedCount = users.length - allowedUserIds.size

    const usersToNotify = users.filter(u => allowedUserIds.has(u.user_id))

    const notificationPayloads: NotificationPayload[] = usersToNotify.map(user => ({
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
    }))

    await queueNotificationsBatch(notificationPayloads)

    const usersForPush: PushUser[] = []
    for (const u of usersToNotify) {
      usersForPush.push({ user_id: u.user_id, fcm_token: u.fcm_token })
    }

    const pushResult = await sendBatchPushNotifications(
      usersForPush,
      notificationTitle,
      notificationMessage,
      {
        event_id: event_id,
        event_type: event.emergency_types?.slug
      },
      event.severity === 'critical' ? 'high' : 'normal',
      batch_size
    )

    const batchCount = Math.ceil(usersToNotify.filter(u => u.fcm_token).length / batch_size)

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event_id,
        users_notified: usersToNotify.length,
        users_skipped: skippedCount,
        push_notifications: {
          success_count: pushResult.successCount,
          failure_count: pushResult.failureCount,
          invalid_tokens: pushResult.invalidTokens.length,
          batch_count: batchCount
        }
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
