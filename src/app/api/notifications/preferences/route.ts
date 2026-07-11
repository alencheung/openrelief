import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator } from '@/lib/security/input-validation'

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

const DEFAULT_PREFERENCES = {
  push_enabled: true,
  email_enabled: false,
  sms_enabled: false,
  radius_meters: 5000,
  severity_filter: ['high', 'critical'],
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null
}

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: preferences, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', context.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      preferences: preferences || DEFAULT_PREFERENCES
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications/preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PUT = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    const validationResult = inputValidator.validateAndSanitizeObject(body, {
      push_enabled: [{ name: 'push_enabled', type: 'boolean' }],
      email_enabled: [{ name: 'email_enabled', type: 'boolean' }],
      sms_enabled: [{ name: 'sms_enabled', type: 'boolean' }],
      radius_meters: [{ name: 'radius_meters', type: 'number', min: 100, max: 100000 }],
      severity_filter: [{ name: 'severity_filter', type: 'array' }],
      quiet_hours_enabled: [{ name: 'quiet_hours_enabled', type: 'boolean' }],
      quiet_hours_start: [{ name: 'quiet_hours_start', type: 'string' }],
      quiet_hours_end: [{ name: 'quiet_hours_end', type: 'string' }]
    })

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validationResult.errors },
        { status: 400 }
      )
    }

    const updates = validationResult.sanitizedData

    if (updates.severity_filter) {
      const validSeverities = ['low', 'medium', 'high', 'critical']
      const invalidSeverities = updates.severity_filter.filter(
        (s: string) => !validSeverities.includes(s)
      )
      if (invalidSeverities.length > 0) {
        return NextResponse.json(
          { error: `Invalid severity values: ${invalidSeverities.join(', ')}` },
          { status: 400 }
        )
      }
    }

    if (updates.quiet_hours_start || updates.quiet_hours_end) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
      if (updates.quiet_hours_start && !timeRegex.test(updates.quiet_hours_start)) {
        return NextResponse.json(
          { error: 'quiet_hours_start must be in HH:MM format' },
          { status: 400 }
        )
      }
      if (updates.quiet_hours_end && !timeRegex.test(updates.quiet_hours_end)) {
        return NextResponse.json(
          { error: 'quiet_hours_end must be in HH:MM format' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: context.userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update notification preferences', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: data
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/notifications/preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
