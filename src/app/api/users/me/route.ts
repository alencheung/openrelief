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
import { z } from 'zod'

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

// Validation schema for PATCH /api/users/me. All fields are optional (partial
// update). The EDITABLE_FIELDS allowlist is still enforced separately below so
// the explicit per-field error messages are preserved.
const profilePatchSchema = z
  .object({
    display_name: z.string().max(200, 'display_name too long (max 200 chars)').optional(),
    avatar_url: z.string().max(200, 'avatar_url too long (max 200 chars)').optional(),
    notification_preferences: z
      .record(z.unknown())
      .optional(),
    privacy_settings: z
      .record(z.unknown())
      .optional(),
    privacy_level: z.enum(['basic', 'standard', 'enhanced', 'maximum']).optional()
  })
  .strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'No updatable fields provided'
  })

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

    // First, reject any non-editable fields with the explicit message the UI
    // depends on, before running the strict Zod schema (which would produce a
    // generic "unrecognized key" error instead).
    if (body && typeof body === 'object') {
      for (const key of Object.keys(body)) {
        if (!EDITABLE_FIELDS.has(key)) {
          return NextResponse.json(
            { error: `Field '${key}' is not user-editable` },
            { status: 400 }
          )
        }
      }
    }

    const parsed = profilePatchSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Invalid request body'
      if (parsed.error.issues.some(i => i.message === 'No updatable fields provided')) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
      }
      return NextResponse.json(
        { error: message, details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const patch: Record<string, unknown> = { ...parsed.data }

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
