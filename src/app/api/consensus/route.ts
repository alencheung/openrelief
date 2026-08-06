import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { securityMonitor, SecurityIncidentType, IncidentSeverity } from '@/lib/audit/security-monitor'
import { trustScoreManager } from '@/lib/security/trust-integration'
import { z } from 'zod'

interface EventConfirmationRow {
  id: string
  event_id: string
  user_id: string
  confirmation_type: 'confirm' | 'dispute'
  trust_weight: number
  user?: { user_id: string; trust_score: number } | null
}

// Validation schema for a consensus vote (confirm/dispute) on an event.
const consensusVoteSchema = z.object({
  event_id: z.string().min(1, 'Event ID is required').max(100),
  confirmation_type: z.enum(['confirm', 'dispute'], {
    errorMap: () => ({ message: 'Confirmation type must be "confirm" or "dispute"' })
  }),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
    .nullable()
    .optional()
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
  _context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const { data: confirmations, error: confirmationsError } = await supabase
      .from('event_confirmations')
      .select(
        `
        *,
        user: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .eq('event_id', eventId)

    if (confirmationsError) {
      console.error('Error fetching confirmations:', confirmationsError)
      return NextResponse.json(
        { error: 'Failed to fetch consensus status', details: confirmationsError.message },
        { status: 500 }
      )
    }

    const { data: event, error: eventError } = await supabase
      .from('emergency_events')
      .select('trust_weight, confirmation_count, dispute_count')
      .eq('id', eventId)
      .single()

    if (eventError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const confirmVotes = confirmations?.filter((c: EventConfirmationRow) => c.confirmation_type === 'confirm') || []
    const disputeVotes = confirmations?.filter((c: EventConfirmationRow) => c.confirmation_type === 'dispute') || []

    const weightedConfirmScore = confirmVotes.reduce((sum: number, c: EventConfirmationRow) => sum + (c.trust_weight || 0), 0)
    const weightedDisputeScore = disputeVotes.reduce((sum: number, c: EventConfirmationRow) => sum + (c.trust_weight || 0), 0)

    const totalWeightedScore = weightedConfirmScore + weightedDisputeScore
    const confirmRatio = totalWeightedScore > 0 ? weightedConfirmScore / totalWeightedScore : 0

    let consensus: 'confirmed' | 'disputed' | 'undecided' = 'undecided'
    let confidence = 0

    if (totalWeightedScore >= 0.5) {
      if (confirmRatio >= 0.7) {
        consensus = 'confirmed'
        confidence = confirmRatio
      } else if (confirmRatio <= 0.3) {
        consensus = 'disputed'
        confidence = 1 - confirmRatio
      } else {
        confidence = Math.abs(confirmRatio - 0.5) * 2
      }
    }

    return NextResponse.json({
      event_id: eventId,
      consensus,
      confidence,
      total_votes: confirmations?.length || 0,
      confirm_votes: confirmVotes.length,
      dispute_votes: disputeVotes.length,
      weighted_confirm_score: weightedConfirmScore,
      weighted_dispute_score: weightedDisputeScore,
      confirm_ratio: confirmRatio,
      event_trust_weight: event?.trust_weight || 0,
      confirmation_count: event?.confirmation_count || 0,
      dispute_count: event?.dispute_count || 0
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/consensus:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const body = await request.json()
    const parsed = consensusVoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { event_id, confirmation_type, location } = parsed.data

    if (!context.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: existingConfirmation, error: _checkError } = await supabase
      .from('event_confirmations')
      .select('id, confirmation_type')
      .eq('event_id', event_id)
      .eq('user_id', context.userId)
      .single()

    if (existingConfirmation && existingConfirmation.confirmation_type !== confirmation_type) {
      const { error: updateError } = await supabase
        .from('event_confirmations')
        .update({
          confirmation_type,
          location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfirmation.id)

      if (updateError) {
        console.error('Error updating confirmation:', updateError)
        return NextResponse.json(
          { error: 'Failed to update confirmation', details: updateError.message },
          { status: 500 }
        )
      }

      await securityMonitor.createAlert(
        SecurityIncidentType.API_ACCESS,
        IncidentSeverity.LOW,
        `User ${context.userId} changed confirmation for event ${event_id}`,
        `Changed from ${existingConfirmation.confirmation_type} to ${confirmation_type}`,
        'consensus'
      )
    } else if (!existingConfirmation) {
      const { data: userProfile, error: _profileError } = await supabase
        .from('user_profiles')
        .select('trust_score')
        .eq('user_id', context.userId)
        .single()

      // Nullish coalescing: a legitimate trust_score of 0 must be honored,
      // not coerced to 0.5. Only null/undefined fall back to the default.
      const trustWeight = userProfile?.trust_score ?? 0.5

      const { error: insertError } = await supabase.from('event_confirmations').insert({
        event_id,
        user_id: context.userId,
        confirmation_type,
        trust_weight: trustWeight,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        created_at: new Date().toISOString()
      })

      if (insertError) {
        console.error('Error creating confirmation:', insertError)
        return NextResponse.json(
          { error: 'Failed to create confirmation', details: insertError.message },
          { status: 500 }
        )
      }
    }

    const { error: rpcError } = await supabase.rpc('update_event_consensus', {
      p_event_id: event_id
    })

    if (rpcError) {
      console.warn('Failed to update event consensus:', rpcError)
    }

    // Only recalculate the reporter's trust score on the FIRST vote.
    // Recalculating on every vote-update (e.g. a user flipping confirm→dispute→confirm)
    // would re-apply the action's factor delta each time and inflate the score.
    // Updating an existing confirmation still re-runs consensus above, but does
    // not re-bump trust factors.
    if (!existingConfirmation) {
      try {
        await trustScoreManager.calculateTrustScore(
          context.userId,
          confirmation_type === 'confirm' ? 'confirm' : 'dispute',
          { eventId: event_id, timestamp: new Date().toISOString() }
        )
      } catch (trustError) {
        console.warn('Failed to update trust score:', trustError)
      }
    }

    return NextResponse.json({
      success: true,
      message: existingConfirmation ? 'Confirmation updated' : 'Confirmation submitted',
      event_id,
      confirmation_type
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/consensus:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
