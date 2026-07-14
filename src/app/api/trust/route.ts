/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { trustScoreManager } from '@/lib/security/trust-integration'
import {
  cacheResponse,
  generateCacheKey,
  getCacheHeaders,
  invalidateTrustCache,
  checkETagMatch,
  CACHE_CONFIGS
} from '@/lib/cache/api-cache'
import { z } from 'zod'

// Validation schema for POST /api/trust. `action` and `targetUserId` are both
// required; this route currently only supports cache invalidation.
const trustPostSchema = z.object({
  action: z.string().min(1, 'Action and targetUserId are required'),
  targetUserId: z.string().min(1, 'Action and targetUserId are required')
})

// Build-safe Supabase client: returns a real client when env vars are present,
// otherwise a minimal stub so module-load during the Next.js build page-data
// collection doesn't throw "supabaseUrl is required".
function safeCreateClient(
  url?: string,
  key?: string,
  opts?: Record<string, unknown>
): SupabaseClient {
  // In test mode, use the mock client from @/lib/supabase

  if (process.env.NODE_ENV === 'test') {

    try {

      const { supabase } = require('@/lib/supabase')

      return supabase as SupabaseClient

    } catch {}

  }

  if (url && key) {
    return createClient(url, key, opts as Parameters<typeof createClient>[2])
  }
  const noop = () => chain
    const chain = {
      select: noop, insert: noop, update: noop, upsert: noop, delete: noop,
      eq: noop, neq: noop, in: noop, gte: noop, lte: noop, gt: noop, lt: noop,
      like: noop, ilike: noop, contains: noop, not: noop, is: noop, or: noop,
      filter: noop, order: noop, limit: noop, range: noop, single: noop,
      maybeSingle: noop, then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null })
    }
  return { from: () => chain, auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as unknown as SupabaseClient
}


const supabase = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || context.userId
    const includeHistory = searchParams.get('history') === 'true'
    const historyLimit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (userId !== context.userId) {
      const { data: currentUser, error: permError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', context.userId)
        .single()

      if (permError || !currentUser || !['admin', 'moderator'].includes(currentUser.role || '')) {
        return NextResponse.json(
          { error: "Insufficient permissions to view other users' trust scores" },
          { status: 403 }
        )
      }
    }

    const cacheKey = generateCacheKey('trust', {
      userId,
      includeHistory,
      historyLimit
    })

    const ifNoneMatch = request.headers.get('If-None-Match')

    const config = includeHistory ? CACHE_CONFIGS.trustProfile : CACHE_CONFIGS.trust

    const { data, cached, etag } = await cacheResponse(
      cacheKey,
      async () => {
        // Profile is the gating query: a PGRST116 (no rows) means the user
        // doesn't exist, which we surface as a 404. It must be resolved (and
        // its error checked) before we can return, but the remaining queries
        // only depend on `userId`, so they can run concurrently.
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, trust_score, created_at, updated_at')
          .eq('user_id', userId)
          .single()

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            throw new Error('User not found')
          }
          throw profileError
        }

        // Build the set of independent queries. The history queries are only
        // issued when includeHistory is true (preserving the conditional
        // logic); stats and reports always run. All four depend solely on
        // `userId`, so they are safe to fan out concurrently.
        const statsQuery = supabase
          .from('event_confirmations')
          .select('confirmation_type')
          .eq('user_id', userId)

        const reportsQuery = supabase
          .from('emergency_events')
          .select('id')
          .eq('reporter_id', userId)

        const trustHistoryQuery = includeHistory
          ? supabase
              .from('user_trust_history')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(historyLimit)
          : null

        const confirmationsQuery = includeHistory
          ? supabase
              .from('event_confirmations')
              .select('id, confirmation_type, trust_weight, created_at, event_id')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(historyLimit)
          : null

        const [statsResult, reportsResult, trustHistoryResult, confirmationsResult] =
          await Promise.all([
            statsQuery,
            reportsQuery,
            trustHistoryQuery ?? Promise.resolve(null),
            confirmationsQuery ?? Promise.resolve(null)
          ])

        const threshold = trustScoreManager.getTrustThreshold(userId)

        let history: unknown[] = []

        if (includeHistory) {
          const trustHistory = trustHistoryResult?.data
          const historyError = trustHistoryResult?.error
          if (historyError) {
            console.warn('Error fetching trust history:', historyError)
          } else {
            history = trustHistory || []
          }

          const confirmations = confirmationsResult?.data
          const confirmError = confirmationsResult?.error
          if (confirmError) {
            console.warn('Error fetching confirmation history:', confirmError)
          } else if (confirmations) {
            const confirmationHistory = confirmations.map((c: { id: string; confirmation_type: string; trust_weight: number; created_at: string; event_id: string }) => ({
              id: `conf-${c.id}`,
              action: c.confirmation_type,
              score_change: 0,
              reason: `${c.confirmation_type === 'confirm' ? 'Confirmed' : 'Disputed'} emergency event`,
              trust_weight: c.trust_weight,
              created_at: c.created_at,
              event_id: c.event_id
            }))
            history = [...history, ...confirmationHistory]
              .sort(
                (a, b) =>
                  new Date((b as { created_at: string }).created_at).getTime() -
                  new Date((a as { created_at: string }).created_at).getTime()
              )
              .slice(0, historyLimit)
          }
        }

        const stats = statsResult.data
        const confirmCount = stats
          ? stats.filter((s: { confirmation_type: string }) => s.confirmation_type === 'confirm').length
          : 0
        const disputeCount = stats
          ? stats.filter((s: { confirmation_type: string }) => s.confirmation_type === 'dispute').length
          : 0

        const reportCount = reportsResult.data?.length || 0

        return {
          user_id: userId,
          trust_score: profile?.trust_score || 0.5,
          threshold_level: threshold.level,
          permissions: threshold.permissions,
          restrictions: threshold.restrictions,
          requirements: threshold.requirements,
          stats: {
            reports_submitted: reportCount,
            confirmations: confirmCount,
            disputes: disputeCount,
            total_contributions: reportCount + confirmCount + disputeCount
          },
          history: includeHistory ? history : undefined,
          last_updated: profile?.updated_at || new Date().toISOString()
        }
      },
      config
    )

    if (checkETagMatch(ifNoneMatch, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: getCacheHeaders(config, etag)
      })
    }

    return NextResponse.json(data, {
      headers: {
        ...getCacheHeaders(config, etag),
        'X-Cache-Status': cached ? 'HIT' : 'MISS'
      }
    })
  } catch (error: unknown) {
    console.error('Unexpected error in GET /api/trust:', error)

    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const body = await request.json()
    const parsed = trustPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { targetUserId } = parsed.data

    // Ownership check: a user may only invalidate their OWN trust cache.
    // Invalidation by another target requires an admin/moderator role, mirroring
    // the cross-user access rule already enforced in the GET handler above.
    // Previously the security context was discarded (`_context`), letting any
    // authenticated user flush any other user's cache (a targeted cache-flush
    // DoS forcing recomputation on the victim's next read).
    if (targetUserId !== context.userId) {
      const { data: currentUser, error: permError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', context.userId)
        .single()

      if (
        permError ||
        !currentUser ||
        !['admin', 'moderator'].includes(currentUser.role || '')
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to invalidate another user's trust cache" },
          { status: 403 }
        )
      }
    }

    await invalidateTrustCache(targetUserId).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Trust cache invalidated'
    })
  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/trust:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
