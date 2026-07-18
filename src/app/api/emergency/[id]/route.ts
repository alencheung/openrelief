/**
 * Single Emergency Event API (dynamic route).
 *
 * - GET    : fetch one event by id (RLS enforces visibility)
 * - PATCH  : owner updates their own event (reporter_id === caller)
 * - DELETE : owner cancels their own event (soft-delete via status)
 *
 * Uses the RLS-bound SSR client so row-level security is actually enforced
 * (unlike routes that use the service-role key).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Validation schema for PATCH /api/emergency/[id]. All fields are optional
// (partial update). Mirrors the previously hand-rolled checks so behavior is
// preserved. NOTE: src/app/api/emergency/route.ts validates its create/update
// bodies via the legacy inputValidator (VALIDATION_SCHEMAS), not Zod, so there
// is no existing Zod schema to import — defining one here.
const emergencyPatchSchema = z
  .object({
    description: z.string().max(2000, 'description too long (max 2000 chars)').optional(),
    severity: z.number().int().min(1, 'severity must be an integer 1-5').max(5, 'severity must be an integer 1-5').optional(),
    radius_meters: z
      .number()
      .positive('radius_meters must be a positive number up to 100000')
      .max(100000, 'radius_meters must be a positive number up to 100000')
      .optional(),
    status: z
      // Must match the DB enum emergency_events_status exactly.
      // ('closed'/'cancelled' are NOT valid enum values and would 500 at the DB.)
      .enum(['pending', 'active', 'resolved', 'expired'])
      .optional()
  })
  .strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'No updatable fields provided'
  })

// emergency_events is typed in Database, but cast for safety against drift.
type SSRClient = SupabaseClient

interface EmergencyRow {
  id: string
  reporter_id: string
  type_id: number
  severity: number
  status: string
  description: string | null
  radius_meters: number
  expires_at: string | null
}

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

// GET — fetch a single event.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult

    const { data, error } = await supabase
      .from('emergency_events')
      .select(
        'id, reporter_id, type_id, severity, status, description, radius_meters, created_at, expires_at, confirmation_count, dispute_count'
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching emergency event:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in emergency/[id] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — owner updates their own event.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    // Fetch + ownership check.
    const { data: existing, error: fetchError } = await supabase
      .from('emergency_events')
      .select('id, reporter_id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching event for update:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    if ((existing as EmergencyRow).reporter_id !== userId) {
      return NextResponse.json(
        { error: 'Only the reporter may update this event' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = emergencyPatchSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Invalid request body'
      // Preserve the existing single-error response shape while surfacing
      // the full detail set for debugging.
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
      .from('emergency_events')
      .update(patch)
      .eq('id', id)
      .select(
        'id, reporter_id, type_id, severity, status, description, radius_meters, updated_at'
      )
      .maybeSingle()

    if (error) {
      console.error('Error updating emergency event:', error)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in emergency/[id] PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — owner soft-cancels their own event.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    const { data: existing, error: fetchError } = await supabase
      .from('emergency_events')
      .select('id, reporter_id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching event for delete:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    if ((existing as EmergencyRow).reporter_id !== userId) {
      return NextResponse.json(
        { error: 'Only the reporter may cancel this event' },
        { status: 403 }
      )
    }

    // Soft-cancel: preserves audit trail + consensus history. Map "cancelled by
    // owner" to the 'expired' enum value (the DB enum is pending|active|resolved|
    // expired — there is no 'cancelled' value), so the event is withdrawn from
    // active circulation without a hard delete.
    const { error } = await supabase
      .from('emergency_events')
      .update({ status: 'expired' })
      .eq('id', id)

    if (error) {
      console.error('Error cancelling emergency event:', error)
      return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Event cancelled' })
  } catch (error) {
    console.error('Error in emergency/[id] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
