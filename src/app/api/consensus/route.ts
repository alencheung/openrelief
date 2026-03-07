import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { securityMonitor } from '@/lib/audit/security-monitor'
import { trustScoreManager } from '@/lib/security/trust-integration'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const confirmVotes = confirmations?.filter(c => c.confirmation_type === 'confirm') || []
    const disputeVotes = confirmations?.filter(c => c.confirmation_type === 'dispute') || []

    const weightedConfirmScore = confirmVotes.reduce((sum, c) => sum + (c.trust_weight || 0), 0)
    const weightedDisputeScore = disputeVotes.reduce((sum, c) => sum + (c.trust_weight || 0), 0)

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
    const { event_id, confirmation_type, location } = body

    if (!event_id || !confirmation_type) {
      return NextResponse.json(
        { error: 'Event ID and confirmation type are required' },
        { status: 400 }
      )
    }

    if (!['confirm', 'dispute'].includes(confirmation_type)) {
      return NextResponse.json(
        { error: 'Confirmation type must be "confirm" or "dispute"' },
        { status: 400 }
      )
    }

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
        'api_access' as any,
        'low' as any,
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

      const trustWeight = userProfile?.trust_score || 0.5

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

    try {
      await trustScoreManager.calculateTrustScore(
        context.userId,
        confirmation_type === 'confirm' ? 'confirm' : 'dispute',
        { eventId: event_id, timestamp: new Date().toISOString() }
      )
    } catch (trustError) {
      console.warn('Failed to update trust score:', trustError)
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
