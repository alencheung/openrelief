/**
 * Push subscription registration (browser-facing).
 *
 * Secured: requires an authenticated user (via withAPISecurity); the user_id
 * is taken from the session, never the request body. Writes to
 * push_subscriptions via the RLS-bound SSR client, so RLS also enforces that
 * the row belongs to the caller.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator } from '@/lib/security/input-validation'
import type { SupabaseClient } from '@supabase/supabase-js'

// push_subscriptions is not yet modelled in Database types; cast to untyped.
type SSRClient = SupabaseClient

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  expirationTime?: number | null
}

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const body = await request.json()
      const { subscription } = body as { subscription?: PushSubscriptionData }

      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: 'Valid push subscription required' }, { status: 400 })
      }

      const validationResult = inputValidator.validateAndSanitizeObject(
        { subscription },
        {
          subscription: [
            { name: 'endpoint', required: true, type: 'string', maxLength: 2048 }
          ]
        }
      )
      if (!validationResult.isValid) {
        return NextResponse.json(
          { error: 'Invalid subscription data', details: validationResult.errors },
          { status: 400 }
        )
      }

      const supabase = (await createClient()) as SSRClient

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: context.userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          is_active: true,
          expires_at: subscription.expirationTime
            ? new Date(subscription.expirationTime).toISOString()
            : null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )

      if (error) {
        console.error('Failed to save push subscription:', error)
        return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
  }
)
