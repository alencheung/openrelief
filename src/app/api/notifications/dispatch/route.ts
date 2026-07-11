/**
 * Notification dispatch API.
 *
 * Drains pending rows from notification_queue, fetches each target user's push
 * subscriptions (from push_subscriptions, which is the same table every writer
 * uses), and delivers them via Web Push. Stale subscriptions (404/410) are
 * pruned. Designed to be invoked by a cron job / scheduled trigger (Vercel
 * Cron, Supabase scheduled function).
 *
 * Secured with a shared internal key (INTERNAL_CRON_KEY header) so only the
 * scheduler can trigger mass dispatch — this is a billing/abuse control.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { broadcastWebPush, isWebPushConfigured, type PushSubscription } from '@/lib/notifications/web-push'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Constant-time string comparison. Returns false when lengths differ without
// leaking which side mismatched. Both inputs are encoded as UTF-8 buffers.
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) {
    // Compare b against itself to keep the timing roughly constant, then
    // return false. Avoids short-circuiting on length mismatch.
    timingSafeEqual(bBuf, bBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

export async function POST(request: NextRequest) {
  // Internal-only: protect the dispatch endpoint so it cannot be invoked by
  // arbitrary clients (it sends real push notifications = real FCF/web-push
  // cost). Fail closed if INTERNAL_CRON_KEY is not configured.
  const cronKey = process.env.INTERNAL_CRON_KEY
  if (!cronKey) {
    console.error('notifications/dispatch: INTERNAL_CRON_KEY is not set')
    return NextResponse.json(
      { error: 'Dispatch is not configured (INTERNAL_CRON_KEY missing)' },
      { status: 503 }
    )
  }
  const provided = request.headers.get('x-api-key')
  if (!provided || !safeCompare(provided, cronKey)) {
    return unauthorized()
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: 'Web Push not configured (VAPID keys missing)' },
      { status: 503 }
    )
  }

  // Pull a batch of pending notifications, oldest first.
  const { data: pending, error } = await supabaseAdmin
    .from('notification_queue')
    .select('id, user_id, title, message, data, attempts, max_attempts')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let noSubscribers = 0
  const expiredEndpoints: string[] = []

  for (const item of pending ?? []) {
    // Fetch this user's push subscriptions (separate p256dh/auth columns).
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', item.user_id)
      .eq('is_active', true)

    const subscriptions: PushSubscription[] = ((subs as Array<{ endpoint: string; p256dh: string | null; auth: string | null }> | null) ?? [])
      .filter(s => s.p256dh && s.auth)
      .map(s => ({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh as string, auth: s.auth as string }
      }))

    if (subscriptions.length === 0) {
      // Distinct from "sent": surfaces that the user has no usable push
      // endpoint, so the issue is observable instead of silently swallowed.
      await supabaseAdmin
        .from('notification_queue')
        .update({ status: 'no_subscribers', sent_at: new Date().toISOString() })
        .eq('id', item.id)
      noSubscribers++
      continue
    }

    const itemData = (item.data as Record<string, unknown> | null) ?? {}
    const result = await broadcastWebPush(subscriptions, {
      title: item.title,
      body: item.message,
      data: { ...itemData, notificationId: item.id },
      tag:
        typeof itemData.tag === 'string'
          ? itemData.tag
          : `event-${itemData.eventId ?? item.id}`
    })

    sent += result.sent
    failed += result.failed

    for (const sub of result.expired) {
      expiredEndpoints.push(sub.endpoint)
    }

    const fullyDelivered = result.failed === 0
    await supabaseAdmin
      .from('notification_queue')
      .update({
        status: fullyDelivered ? 'sent' : item.attempts + 1 >= item.max_attempts ? 'failed' : 'pending',
        attempts: item.attempts + 1,
        sent_at: fullyDelivered ? new Date().toISOString() : null,
        error_message: fullyDelivered ? null : `${result.failed} subscription(s) failed`
      })
      .eq('id', item.id)
  }

  // Prune stale subscriptions discovered during this run.
  if (expiredEndpoints.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return NextResponse.json({ sent, failed, noSubscribers, pruned: expiredEndpoints.length })
}
