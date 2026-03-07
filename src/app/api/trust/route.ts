import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

        const threshold = trustScoreManager.getTrustThreshold(userId)

        let history: unknown[] = []

        if (includeHistory) {
          const { data: trustHistory, error: historyError } = await supabase
            .from('user_trust_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(historyLimit)

          if (historyError) {
            console.warn('Error fetching trust history:', historyError)
          } else {
            history = trustHistory || []
          }

          const { data: confirmations, error: confirmError } = await supabase
            .from('event_confirmations')
            .select('id, confirmation_type, trust_weight, created_at, event_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(historyLimit)

          if (confirmError) {
            console.warn('Error fetching confirmation history:', confirmError)
          } else if (confirmations) {
            const confirmationHistory = confirmations.map(c => ({
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

        const { data: stats, error: _statsError } = await supabase
          .from('event_confirmations')
          .select('confirmation_type')
          .eq('user_id', userId)

        let confirmCount = 0
        let disputeCount = 0

        if (stats) {
          confirmCount = stats.filter(s => s.confirmation_type === 'confirm').length
          disputeCount = stats.filter(s => s.confirmation_type === 'dispute').length
        }

        const { data: reports, error: _reportsError } = await supabase
          .from('emergency_events')
          .select('id')
          .eq('reporter_id', userId)

        const reportCount = reports?.length || 0

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
  _context
) => {
  try {
    const body = await request.json()
    const { action, targetUserId } = body

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Action and targetUserId are required' }, { status: 400 })
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
