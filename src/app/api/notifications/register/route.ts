import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator } from '@/lib/security/input-validation'
import { securityMonitor } from '@/lib/audit/security-monitor'

// Build-safe Supabase client: returns a real client when env vars are present,
// otherwise a minimal stub so module-load during the Next.js build page-data
// collection doesn't throw "supabaseUrl is required".
function safeCreateClient(url?: string, key?: string, opts?: any): import('@supabase/supabase-js').SupabaseClient {
  // In test mode, use the mock client from @/lib/supabase

  if (process.env.NODE_ENV === 'test') {

    try {

      const { supabase } = require('@/lib/supabase')

      return supabase as any

    } catch {}

  }

  if (url && key) {
    return createClient(url, key, opts)
  }
  const noop = () => chain
    const chain = {
      select: noop, insert: noop, update: noop, upsert: noop, delete: noop,
      eq: noop, neq: noop, in: noop, gte: noop, lte: noop, gt: noop, lt: noop,
      like: noop, ilike: noop, contains: noop, not: noop, is: noop, or: noop,
      filter: noop, order: noop, limit: noop, range: noop, single: noop,
      maybeSingle: noop, then: (resolve: any) => resolve({ data: [], error: null })
    }
  return { from: () => chain, auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as any
}

const supabase = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  expirationTime?: number
}

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, device_info } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Push subscription object with endpoint is required' },
        { status: 400 }
      )
    }

    const validationResult = inputValidator.validateAndSanitizeObject(subscription, {
      endpoint: [{ name: 'endpoint', required: true, type: 'url' }],
      keys: [{ name: 'keys', required: true, type: 'object' }]
    })

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid subscription data', details: validationResult.errors },
        { status: 400 }
      )
    }

    const sub = subscription as PushSubscriptionData

    const { data: existingSub, error: _checkError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', sub.endpoint)
      .single()

    if (existingSub) {
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          user_id: context.userId,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          is_active: true,
          device_info: device_info || {},
          expires_at: sub.expirationTime ? new Date(sub.expirationTime).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error('Error updating push subscription:', updateError)
        return NextResponse.json(
          { error: 'Failed to update push subscription', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Push subscription updated',
        subscription_id: existingSub.id
      })
    }

    const { data: newSub, error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: context.userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        is_active: true,
        device_info: device_info || {},
        expires_at: sub.expirationTime ? new Date(sub.expirationTime).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error registering push subscription:', insertError)
      return NextResponse.json(
        { error: 'Failed to register push subscription', details: insertError.message },
        { status: 500 }
      )
    }

    await securityMonitor.createAlert(
      'api_access' as any,
      'low' as any,
      `Push subscription registered for user ${context.userId}`,
      `Subscription ID: ${newSub?.id}`,
      'notifications'
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Push subscription registered successfully',
        subscription_id: newSub?.id
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/register:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', context.userId)
      .eq('endpoint', endpoint)

    if (deleteError) {
      console.error('Error unregistering push subscription:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unregister push subscription', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription unregistered'
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/notifications/register:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
