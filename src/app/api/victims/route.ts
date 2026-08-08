/**
 * API Route for Victim Tracking
 *
 * - GET  : list victims (optional status filter). Auth-scoped.
 * - POST : create a victim record (auth-required). `reporter_id` is derived
 *          from the authenticated caller, never the request body.
 *
 * Victim records are sensitive personal data. RLS permits public read of the
 * table, but this route is scoped to authenticated users; downstream privacy
 * controls should gate what is surfaced to the end user.
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

// Mirrors the migration CHECK constraint values for victims.status / .priority.
const victimStatusEnum = z.enum([
  'safe',
  'injured',
  'trapped',
  'missing',
  'deceased',
  'unknown'
])

const victimCreateSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z.string().min(1, 'name is required').max(200),
  age: z.number().int().min(0).max(150).nullable().optional(),
  status: victimStatusEnum.optional(),
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

// GET — list victims with optional status filter.
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  _context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const limitParam = searchParams.get('limit') ?? '100'
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500)

    if (status && !victimStatusEnum.safeParse(status).success) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }

    let query = getSupabase()
      .from('victims')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      // Table may not exist yet (migration not applied) — return empty rather
      // than 500 so the UI shows its real empty state.
      console.error('Error fetching victims:', error)
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error: unknown) {
    console.error('Unexpected error in GET /api/victims:', error)
    return NextResponse.json({ data: [] })
  }
})

// POST — create a victim record (auth-required).
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = victimCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data
    const now = new Date().toISOString()
    const insert = {
      id: input.id ?? `vic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name: input.name,
      age: input.age ?? null,
      status: input.status ?? 'unknown',
      priority: input.priority ?? 'medium',
      location: input.location ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      emergency_contact: input.emergency_contact ?? null,
      notes: input.notes ?? null,
      injuries: input.injuries ?? null,
      reporter_id: context.userId,
      created_at: now,
      updated_at: now
    }

    const { data, error } = await getSupabase()
      .from('victims')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating victim:', error)
      return NextResponse.json(
        { error: 'Failed to create victim', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, message: 'Victim record created successfully' }, { status: 201 })
  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/victims:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
