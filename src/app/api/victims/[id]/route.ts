/**
 * Single Victim API (dynamic route).
 *
 * - GET    : fetch one victim by id
 * - PUT    : owner updates their victim record (reporter_id === caller)
 * - DELETE : owner deletes their victim record (reporter_id === caller)
 *
 * Follows the same RLS-bound SSR-client pattern as src/app/api/emergency/[id].
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

type SSRClient = SupabaseClient

interface VictimRow {
  id: string
  reporter_id: string | null
}

// PUT body: partial update. All fields optional.
const victimUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    age: z.number().int().min(0).max(150).nullable().optional(),
    status: z
      .enum(['safe', 'injured', 'trapped', 'missing', 'deceased', 'unknown'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        address: z.string().max(500).optional()
      })
      .nullable()
      .optional(),
    phone: z.string().max(50).nullable().optional(),
    email: z.string().email().max(254).nullable().optional(),
    emergency_contact: z
      .object({
        name: z.string().max(200).optional(),
        phone: z.string().max(50).optional(),
        relationship: z.string().max(100).optional()
      })
      .nullable()
      .optional(),
    notes: z.string().max(5000).nullable().optional(),
    injuries: z
      .array(
        z.object({
          type: z.string().max(200).optional(),
          severity: z.enum(['minor', 'moderate', 'severe', 'critical']).optional(),
          description: z.string().max(2000).optional()
        })
      )
      .nullable()
      .optional()
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

// GET — fetch a single victim.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Victim id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult

    const { data, error } = await supabase
      .from('victims')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching victim:', error)
      return NextResponse.json({ error: 'Failed to fetch victim' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Victim not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in victims/[id] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — owner updates their victim record.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Victim id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    // Fetch + ownership check.
    const { data: existing, error: fetchError } = await supabase
      .from('victims')
      .select('id, reporter_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching victim for update:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch victim' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Victim not found' }, { status: 404 })
    }
    if ((existing as VictimRow).reporter_id !== userId) {
      return NextResponse.json(
        { error: 'Only the reporter may update this victim record' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = victimUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Invalid request body'
      if (parsed.error.issues.some(i => i.message === 'No updatable fields provided')) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
      }
      return NextResponse.json({ error: message, details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('victims')
      .update(parsed.data)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Error updating victim:', error)
      return NextResponse.json({ error: 'Failed to update victim' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in victims/[id] PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — owner deletes their victim record.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Victim id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    const { data: existing, error: fetchError } = await supabase
      .from('victims')
      .select('id, reporter_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching victim for delete:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch victim' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Victim not found' }, { status: 404 })
    }
    if ((existing as VictimRow).reporter_id !== userId) {
      return NextResponse.json(
        { error: 'Only the reporter may delete this victim record' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('victims').delete().eq('id', id)

    if (error) {
      console.error('Error deleting victim:', error)
      return NextResponse.json({ error: 'Failed to delete victim' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Victim record deleted successfully' })
  } catch (error) {
    console.error('Error in victims/[id] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
