/**
 * Push subscription removal (browser-facing).
 *
 * Secured: requires an authenticated user; the user_id is taken from the
 * session, never the request body. Deletes from push_subscriptions scoped to
 * the caller, so a user can only remove their own subscription.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// push_subscriptions is not yet modelled in Database types; cast to untyped.
type SSRClient = SupabaseClient

// Validation schema for unsubscribe requests. `endpoint` is the Web Push
// subscription endpoint URL; cap its length to avoid abuse.
const unsubscribeSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .min(1, 'Endpoint required')
    .max(2048, 'Endpoint too long')
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const body = await request.json()
      const parsed = unsubscribeSchema.safeParse(body)
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors
        const firstMessage =
          (fieldErrors.endpoint?.[0]) || 'Invalid request body'
        return NextResponse.json(
          { error: firstMessage, details: parsed.error.flatten() },
          { status: 400 }
        )
      }
      const { endpoint } = parsed.data

      const supabase = (await createClient()) as SSRClient

      // Scoped to the caller: a user can only remove their own subscription.
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
        .eq('user_id', context.userId)

      if (error) {
        console.error('Failed to remove push subscription:', error)
        return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
  }
)
