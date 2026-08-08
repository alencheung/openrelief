/**
 * API Route for Resources
 *
 * - GET  : list resources (optional type/status filter). Public-readable per
 *          RLS, but the route itself is scoped to authenticated users.
 * - POST : create a resource (auth-required). `managed_by` is derived from the
 *          authenticated caller, never the request body.
 *
 * Gracefully returns an empty list when the backing table is absent so the UI
 * shows its real empty state instead of a 500.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { z } from 'zod'

// Build-safe Supabase client: returns a real client when env vars are present,
// otherwise a minimal stub so module-load during the Next.js build page-data
// collection doesn't throw "supabaseUrl is required".
function safeCreateClient(
  url?: string,
  key?: string,
  opts?: Record<string, unknown>
): SupabaseClient {
  if (process.env.NODE_ENV === 'test') {
    try {
      const { supabase } = require('@/lib/supabase')
      return supabase as SupabaseClient
    } catch {
      // fall through to stub
    }
  }
  if (url && key) {
    return createClient(url, key, opts as Parameters<typeof createClient>[2])
  }
  const noop = () => chain
  const chain = {
    select: noop,
    insert: noop,
    update: noop,
    upsert: noop,
    delete: noop,
    eq: noop,
    neq: noop,
    in: noop,
    gte: noop,
    lte: noop,
    gt: noop,
    lt: noop,
    like: noop,
    ilike: noop,
    contains: noop,
    not: noop,
    is: noop,
    or: noop,
    filter: noop,
    order: noop,
    limit: noop,
    range: noop,
    single: noop,
    maybeSingle: noop,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null })
  }
  return ({
    from: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) }
  } as unknown) as SupabaseClient
}

// Lazy Supabase client — re-evaluated on each access so test mocks that reset
// between tests always get the current mock instance.
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (process.env.NODE_ENV === 'test') {
    try {
      return require('@/lib/supabase').supabase as SupabaseClient
    } catch {
      // fall through
    }
  }
  if (!_supabase) {
    _supabase = safeCreateClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabase
}

// Mirrors the migration CHECK constraint values for resources.type / .status.
const resourceTypeEnum = z.enum([
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
const resourceStatusEnum = z.enum([
  'available',
  'limited',
  'depleted',
  'requested'
])

// POST body schema. `managed_by` is intentionally absent — it is derived from
// the authenticated caller.
const resourceCreateSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z.string().min(1, 'name is required').max(200),
  type: resourceTypeEnum,
  status: resourceStatusEnum.optional(),
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

// GET — list resources with optional type/status filters.
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  _context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limitParam = searchParams.get('limit') ?? '100'
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500)

    if (type && !resourceTypeEnum.safeParse(type).success) {
      return NextResponse.json({ error: 'Invalid type filter' }, { status: 400 })
    }
    if (status && !resourceStatusEnum.safeParse(status).success) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }

    let query = getSupabase()
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('type', type)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      // Table may not exist yet (migration not applied) — return empty rather
      // than 500 so the UI shows its real empty state.
      console.error('Error fetching resources:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error: unknown) {
    console.error('Unexpected error in GET /api/resources:', error)
    return NextResponse.json({ data: [] })
  }
})

// POST — create a resource (auth-required).
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = resourceCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data
    const now = new Date().toISOString()
    const insert = {
      id: input.id ?? `res-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: input.name,
      type: input.type,
      status: input.status ?? 'available',
      quantity: input.quantity ?? 0,
      unit: input.unit ?? 'units',
      urgency: input.urgency ?? 'low',
      location: input.location ?? null,
      address: input.address ?? null,
      distance: input.distance ?? null,
      expires_at: input.expires_at ?? null,
      contact_info: input.contact_info ?? null,
      managed_by: context.userId,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now
    }

    const { data, error } = await getSupabase()
      .from('resources')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating resource:', error)
      return NextResponse.json(
        { error: 'Failed to create resource', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, message: 'Resource created successfully' }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/resources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
