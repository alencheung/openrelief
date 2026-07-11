import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { trustScoreManager } from '@/lib/security/trust-integration'

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
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const { pathname } = new URL(request.url)
    const segments = pathname.split('/')
    const userId = segments[segments.indexOf('trust') + 1]

    if (!userId || userId === 'trust') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('history') === 'true'
    const historyLimit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

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

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, trust_score, created_at, updated_at')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch trust score', details: profileError.message },
        { status: 500 }
      )
    }

    const threshold = trustScoreManager.getTrustThreshold(userId)

    let history: any[] = []

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
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/trust/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
