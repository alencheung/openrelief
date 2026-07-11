/**
 * Current User Profile API.
 *
 * - GET   : the caller's own user_profiles row (RLS enforces self-access)
 * - PATCH : update user-editable fields only. System-controlled fields
 *   (trust_score, risk_score, risk_factors) are rejected.
 *
 * Uses the RLS-bound SSR client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type SSRClient = SupabaseClient

// Columns the user is allowed to set. Anything else is rejected.
const EDITABLE_FIELDS = new Set([
  'display_name',
  'avatar_url',
  'notification_preferences',
  'privacy_settings',
  'privacy_level'
])

const ALLOWED_PRIVACY_LEVELS = new Set(['basic', 'standard', 'enhanced', 'maximum'])

async function requireUser(supabase: SSRClient): Promise<string | NextResponse> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return user.id
}

// GET — the caller's profile.
export async function GET(_request: NextRequest) {
  try {
    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'user_id, display_name, avatar_url, trust_score, notification_preferences, privacy_settings, privacy_level, data_anonymized, risk_score, created_at, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    if (!data) {
      // Should not happen (handle_new_user trigger creates the row), but
      // handle gracefully.
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in users/me GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update user-editable fields only.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (!EDITABLE_FIELDS.has(key)) {
        return NextResponse.json(
          { error: `Field '${key}' is not user-editable` },
          { status: 400 }
        )
      }
      // Type checks for known fields.
      if (key === 'display_name' || key === 'avatar_url') {
        if (typeof value !== 'string') {
          return NextResponse.json({ error: `${key} must be a string` }, { status: 400 })
        }
        if (value.length > 200) {
          return NextResponse.json({ error: `${key} too long (max 200 chars)` }, { status: 400 })
        }
      }
      if (key === 'notification_preferences' || key === 'privacy_settings') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return NextResponse.json({ error: `${key} must be an object` }, { status: 400 })
        }
      }
      if (key === 'privacy_level') {
        if (typeof value !== 'string' || !ALLOWED_PRIVACY_LEVELS.has(value)) {
          return NextResponse.json(
            { error: `privacy_level must be one of: ${[...ALLOWED_PRIVACY_LEVELS].join(', ')}` },
            { status: 400 }
          )
        }
      }
      patch[key] = value
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('user_id', userId)
      .select(
        'user_id, display_name, avatar_url, trust_score, notification_preferences, privacy_settings, privacy_level, updated_at'
      )
      .maybeSingle()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in users/me PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
