import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface ConsensusPayload {
  event_id: string
}

interface Confirmation {
  id: string
  user_id: string
  confirmation_type: 'confirm' | 'dispute'
  trust_weight: number
  distance_from_event: number | null
  created_at: string
}

interface EventStatus {
  id: string
  status: string
  trust_weight: number
  confirmation_count: number
  dispute_count: number
}

const CONSENSUS_THRESHOLD = 5.0
const DISPUTE_THRESHOLD = 5.0
const TIME_DECAY_30MIN = 1.0
const TIME_DECAY_1HR = 0.8
const TIME_DECAY_2HR = 0.6
const TIME_DECAY_OLD = 0.4

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function calculateTimeWeight(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageMinutes = ageMs / (1000 * 60)

  if (ageMinutes <= 30) return TIME_DECAY_30MIN
  if (ageMinutes <= 60) return TIME_DECAY_1HR
  if (ageMinutes <= 120) return TIME_DECAY_2HR
  return TIME_DECAY_OLD
}

function calculateDistanceWeight(distance: number | null): number {
  if (distance === null) return 1.0
  if (distance < 500) return 1.0
  if (distance < 1000) return 0.8
  if (distance < 2000) return 0.6
  return 0.4
}

async function getEventConfirmations(eventId: string): Promise<Confirmation[]> {
  const { data, error } = await supabase
    .from('event_confirmations')
    .select(
      `
      id,
      user_id,
      confirmation_type,
      trust_weight,
      distance_from_event,
      created_at
    `
    )
    .eq('event_id', eventId)

  if (error) {
    console.error('Failed to fetch confirmations:', error)
    return []
  }

  return data ?? []
}

async function getEventStatus(eventId: string): Promise<EventStatus | null> {
  const { data, error } = await supabase
    .from('emergency_events')
    .select('id, status, trust_weight, confirmation_count, dispute_count')
    .eq('id', eventId)
    .single()

  if (error) {
    console.error('Failed to fetch event status:', error)
    return null
  }

  return data
}

async function updateEventStatus(
  eventId: string,
  newStatus: string,
  trustWeight: number,
  confirmationCount: number,
  disputeCount: number
): Promise<void> {
  const { error } = await supabase
    .from('emergency_events')
    .update({
      status: newStatus,
      trust_weight: trustWeight,
      confirmation_count: confirmationCount,
      dispute_count: disputeCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)

  if (error) {
    console.error('Failed to update event status:', error)
    throw error
  }
}

async function notifyThresholdReached(eventId: string, newStatus: string): Promise<void> {
  const { error } = await supabase.from('notification_queue').insert({
    event_id: eventId,
    notification_type: newStatus === 'active' ? 'update' : 'resolution',
    title: 'Consensus Reached',
    message: `Event status changed to ${newStatus}`,
    data: {
      event_id: eventId,
      new_status: newStatus
    },
    status: 'pending'
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}

async function processConsensus(
  eventId: string
): Promise<{ status: string; confirmed: boolean; message: string }> {
  const eventStatus = await getEventStatus(eventId)

  if (!eventStatus) {
    return { status: 'error', confirmed: false, message: 'Event not found' }
  }

  if (eventStatus.status === 'resolved' || eventStatus.status === 'expired') {
    return {
      status: eventStatus.status,
      confirmed: false,
      message: 'Event is no longer active'
    }
  }

  const confirmations = await getEventConfirmations(eventId)

  let totalConfirmWeight = 0
  let totalDisputeWeight = 0
  let confirmCount = 0
  let disputeCount = 0

  for (const c of confirmations) {
    const userTrust = c.trust_weight
    const timeWeight = calculateTimeWeight(c.created_at)
    const distanceWeight = calculateDistanceWeight(c.distance_from_event)

    const weightedTrust = userTrust * timeWeight * distanceWeight

    if (c.confirmation_type === 'confirm') {
      totalConfirmWeight += weightedTrust
      confirmCount++
    } else {
      totalDisputeWeight += weightedTrust
      disputeCount++
    }
  }

  const netWeight = totalConfirmWeight - totalDisputeWeight

  if (totalConfirmWeight >= CONSENSUS_THRESHOLD && eventStatus.status === 'pending') {
    await updateEventStatus(eventId, 'active', totalConfirmWeight, confirmCount, disputeCount)

    await notifyThresholdReached(eventId, 'active')

    return {
      status: 'active',
      confirmed: true,
      message: 'Consensus reached, event activated'
    }
  }

  if (totalDisputeWeight >= DISPUTE_THRESHOLD && eventStatus.status === 'active') {
    await updateEventStatus(eventId, 'pending', netWeight, confirmCount, disputeCount)

    return {
      status: 'pending',
      confirmed: false,
      message: 'Dispute threshold reached, event pending review'
    }
  }

  await updateEventStatus(
    eventId,
    eventStatus.status,
    totalConfirmWeight,
    confirmCount,
    disputeCount
  )

  return {
    status: eventStatus.status,
    confirmed: false,
    message: 'Consensus updated but threshold not reached'
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: ConsensusPayload = await req.json()
    const { event_id } = payload

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result = await processConsensus(event_id)

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event_id,
        ...result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Consensus processing error:', error)
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
