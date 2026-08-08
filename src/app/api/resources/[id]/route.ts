/**
 * Single Resource API (dynamic route).
 *
 * - GET    : fetch one resource by id
 * - PUT    : owner updates their resource (managed_by === caller)
 * - DELETE : owner deletes their resource (managed_by === caller)
 *
 * Follows the same RLS-bound SSR-client pattern as src/app/api/emergency/[id].
 * Routes that mutate use ownership checks in-handler because the service-role
 * client bypasses RLS; the SSR client here respects it, but we still verify
 * ownership to give a clean 403 before any write.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

type SSRClient = SupabaseClient

interface ResourceRow {
  id: string
  managed_by: string | null
}

// PUT body: partial update. All fields optional.
const resourceUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: z
      .enum([
        'water',
        'food',
        'medical',
        'shelter',
        'transport',
        'communication',
        'power',
        'clothing',
        'other'
      ])
      .optional(),
    status: z.enum(['available', 'limited', 'depleted', 'requested']).optional(),
    quantity: z.number().int().min(0).optional(),
    unit: z.string().max(50).optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        address: z.string().max(500).optional()
      })
      .nullable()
      .optional(),
    address: z.string().max(500).optional(),
    distance: z.number().optional(),
    expires_at: z.string().datetime().nullable().optional(),
    contact_info: z
      .object({
        name: z.string().max(200).optional(),
        phone: z.string().max(50).optional(),
        email: z.string().email().max(254).optional(),
        organization: z.string().max(200).optional()
      })
      .nullable()
      .optional(),
    notes: z.string().max(5000).nullable().optional()
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

// GET — fetch a single resource.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Resource id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching resource:', error)
      return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in resources/[id] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — owner updates their resource.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Resource id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    // Fetch + ownership check.
    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('id, managed_by')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching resource for update:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    if ((existing as ResourceRow).managed_by !== userId) {
      return NextResponse.json(
        { error: 'Only the manager may update this resource' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = resourceUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Invalid request body'
      if (parsed.error.issues.some(i => i.message === 'No updatable fields provided')) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
      }
      return NextResponse.json({ error: message, details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('resources')
      .update(parsed.data)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Error updating resource:', error)
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in resources/[id] PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — owner deletes their resource.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Resource id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const authResult = await requireUser(supabase)
    if (authResult instanceof NextResponse) return authResult
    const userId = authResult

    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('id, managed_by')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching resource for delete:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    if ((existing as ResourceRow).managed_by !== userId) {
      return NextResponse.json(
        { error: 'Only the manager may delete this resource' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('resources').delete().eq('id', id)

    if (error) {
      console.error('Error deleting resource:', error)
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Resource deleted successfully' })
  } catch (error) {
    console.error('Error in resources/[id] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
