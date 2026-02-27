import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator } from '@/lib/security/input-validation'
import { securityMonitor } from '@/lib/audit/security-monitor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: settings, error: settingsError } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', context.userId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences', details: settingsError.message },
        { status: 500 }
      )
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('user_push_subscriptions')
      .select('id, endpoint, created_at, is_active')
      .eq('user_id', context.userId)
      .eq('is_active', true)

    if (subsError) {
      console.warn('Error fetching push subscriptions:', subsError)
    }

    const { data: topicSubscriptions, error: topicError } = await supabase
      .from('user_subscriptions')
      .select(
        `
        *,
        emergency_types (
          id,
          name,
          slug
        )
      `
      )
      .eq('user_id', context.userId)
      .eq('is_active', true)

    if (topicError) {
      console.warn('Error fetching topic subscriptions:', topicError)
    }

    return NextResponse.json({
      preferences: settings || {
        push_enabled: true,
        email_enabled: false,
        sms_enabled: false,
        radius_meters: 5000,
        severity_filter: ['high', 'critical'],
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null
      },
      push_subscriptions: subscriptions || [],
      topic_subscriptions: topicSubscriptions || []
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const body = await request.json()
    const { subscription, preferences } = body

    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (subscription) {
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

      const { error: upsertError } = await supabase.from('user_push_subscriptions').upsert(
        {
          user_id: context.userId,
          endpoint: sub.endpoint,
          p256dh_key: sub.keys.p256dh,
          auth_key: sub.keys.auth,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'endpoint'
        }
      )

      if (upsertError) {
        console.error('Error saving push subscription:', upsertError)
        return NextResponse.json(
          { error: 'Failed to register push subscription', details: upsertError.message },
          { status: 500 }
        )
      }

      await securityMonitor.createAlert(
        'api_access' as any,
        'low' as any,
        `Push subscription registered for user ${context.userId}`,
        `Endpoint: ${sub.endpoint.substring(0, 50)}...`,
        'notifications'
      )
    }

    if (preferences) {
      const { error: prefsError } = await supabase.from('user_notification_settings').upsert({
        user_id: context.userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })

      if (prefsError) {
        console.error('Error saving notification preferences:', prefsError)
        return NextResponse.json(
          { error: 'Failed to save notification preferences', details: prefsError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated'
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (endpoint) {
      const { error: deleteError } = await supabase
        .from('user_push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', context.userId)
        .eq('endpoint', endpoint)

      if (deleteError) {
        console.error('Error unsubscribing:', deleteError)
        return NextResponse.json(
          { error: 'Failed to unsubscribe', details: deleteError.message },
          { status: 500 }
        )
      }
    } else {
      const { error: deleteAllError } = await supabase
        .from('user_push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', context.userId)

      if (deleteAllError) {
        console.error('Error unsubscribing all:', deleteAllError)
        return NextResponse.json(
          { error: 'Failed to unsubscribe all devices', details: deleteAllError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: endpoint ? 'Device unsubscribed' : 'All devices unsubscribed'
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
