import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface TrustUpdatePayload {
  user_id: string
  action_type: 'report' | 'confirm' | 'dispute'
  event_id?: string
  metadata?: Record<string, unknown>
}

interface UserProfile {
  user_id: string
  trust_score: number
  created_at: string
  updated_at: string
}

interface TrustHistoryRecord {
  user_id: string
  event_id: string | null
  action_type: string
  trust_change: number
  previous_score: number
  new_score: number
  reason: string
}

const MIN_TRUST_SCORE = 0.0
const MAX_TRUST_SCORE = 1.0
const BASE_SCORE = 0.1

const ACTION_WEIGHTS: Record<string, number> = {
  report: 0.005,
  confirm: 0.01,
  dispute: -0.005
}

const RECENCY_MULTIPLIERS = {
  active: 1.2,
  normal: 1.0,
  inactive: 0.5
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getRecencyMultiplier(userCreatedAt: string): number {
  const daysSinceCreation = (Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceCreation < 7) return RECENCY_MULTIPLIERS.active
  if (daysSinceCreation < 30) return RECENCY_MULTIPLIERS.normal
  return RECENCY_MULTIPLIERS.inactive
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, trust_score, created_at, updated_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Failed to get user profile:', error)
    return null
  }

  return data
}

async function createTrustHistory(record: TrustHistoryRecord): Promise<void> {
  const { error } = await supabase.from('user_trust_history').insert({
    user_id: record.user_id,
    event_id: record.event_id,
    action_type: record.action_type,
    trust_change: record.trust_change,
    previous_score: record.previous_score,
    new_score: record.new_score,
    reason: record.reason
  })

  if (error) {
    console.error('Failed to create trust history:', error)
  }
}

async function updateUserTrustScore(userId: string, newScore: number): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      trust_score: newScore,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to update trust score:', error)
    throw error
  }
}

async function calculateAccuracyBonus(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: reports, error: reportsError } = await supabase
    .from('emergency_events')
    .select('id, status')
    .eq('reporter_id', userId)
    .gte('created_at', thirtyDaysAgo)

  if (reportsError || !reports || reports.length === 0) {
    return 0
  }

  const totalReports = reports.length
  const confirmedReports = reports.filter(
    (r: { id: string; status: string }) => r.status === 'resolved' || r.status === 'active'
  ).length

  return (confirmedReports / totalReports) * 0.1
}

async function updateTrust(
  payload: TrustUpdatePayload
): Promise<{ old_score: number; new_score: number }> {
  const { user_id, action_type, event_id, metadata } = payload

  const profile = await getUserProfile(user_id)

  if (!profile) {
    throw new Error('User profile not found')
  }

  const currentScore = profile.trust_score ?? BASE_SCORE
  const baseChange = ACTION_WEIGHTS[action_type] ?? 0
  const recencyMultiplier = getRecencyMultiplier(profile.created_at)
  const accuracyBonus = await calculateAccuracyBonus(user_id)

  let finalChange = baseChange * recencyMultiplier

  if (action_type === 'report' && accuracyBonus > 0) {
    finalChange += accuracyBonus * 0.1
  }

  if (metadata?.event_outcome === 'confirmed') {
    finalChange *= 1.5
  } else if (metadata?.event_outcome === 'disputed') {
    finalChange *= 0.5
  }

  const newScore = clamp(currentScore + finalChange, MIN_TRUST_SCORE, MAX_TRUST_SCORE)

  await updateUserTrustScore(user_id, newScore)

  const actionDescription =
    action_type === 'report'
      ? 'Reported emergency event'
      : action_type === 'confirm'
        ? 'Confirmed emergency event'
        : 'Disputed emergency event'

  await createTrustHistory({
    user_id,
    event_id: event_id ?? null,
    action_type,
    trust_change: finalChange,
    previous_score: currentScore,
    new_score: newScore,
    reason: actionDescription
  })

  return {
    old_score: currentScore,
    new_score: newScore
  }
}

async function recalculateTrust(userId: string): Promise<{ old_score: number; new_score: number }> {
  const profile = await getUserProfile(userId)

  if (!profile) {
    throw new Error('User profile not found')
  }

  const currentScore = profile.trust_score

  const { data: result, error } = await supabase.rpc('calculate_trust_score', {
    p_user_id: userId
  })

  if (error) {
    console.error('Trust recalculation failed:', error)
    throw error
  }

  const newScore = result ?? BASE_SCORE

  return {
    old_score: currentScore,
    new_score: newScore
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, ...payload } = body

    if (action === 'update' && payload.user_id && payload.action_type) {
      const updatePayload: TrustUpdatePayload = {
        user_id: payload.user_id,
        action_type: payload.action_type,
        event_id: payload.event_id,
        metadata: payload.metadata
      }

      const result = await updateTrust(updatePayload)

      return new Response(
        JSON.stringify({
          success: true,
          action: 'update',
          ...result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'recalculate' && payload.user_id) {
      const result = await recalculateTrust(payload.user_id)

      return new Response(
        JSON.stringify({
          success: true,
          action: 'recalculate',
          ...result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid action. Use "update" or "recalculate"'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Trust update error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
