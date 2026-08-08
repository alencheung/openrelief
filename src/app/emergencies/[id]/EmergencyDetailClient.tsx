'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEmergencyEvent, useConfirmEvent } from '@/hooks/useEmergencyEvents'
import { EmergencySeverityAlerts } from '@/components/alerts/EmergencySeverityAlerts'
import { EmergencyWorkflowManager } from '@/components/emergency/EmergencyWorkflowManager'
import { useAuth } from '@/store/authStore'
import { useCurrentLocation } from '@/store/locationStore'
import {
  cn,
  formatRelativeTime,
  parseGeoLocation
} from '@/lib/utils'

// Shape returned by GET /api/consensus?event_id= (see src/app/api/consensus/route.ts).
interface ConsensusStatus {
  event_id: string
  consensus: 'confirmed' | 'disputed' | 'undecided'
  confidence: number
  total_votes: number
  confirm_votes: number
  dispute_votes: number
  weighted_confirm_score: number
  weighted_dispute_score: number
  confirm_ratio: number
  event_trust_weight: number
  confirmation_count: number
  dispute_count: number
}

// The joined row returned by useEmergencyEvent (emergency_events + emergency_types
// + reporter user_profiles). Declared explicitly because the generated Database
// type's `[_ in never]: never` index signatures make supabase-ts infer joins as
// `never`.
interface EmergencyTypeRef {
  slug: string
  name: string
}
interface EmergencyDetail {
  id: string
  title: string
  description: string | null
  location: string
  severity: number
  status: 'pending' | 'active' | 'resolved' | 'expired'
  trust_weight: number
  confirmation_count: number
  dispute_count: number
  created_at: string
  updated_at: string
  expires_at: string
  emergency_types: EmergencyTypeRef | null
}

async function fetchConsensus(eventId: string): Promise<ConsensusStatus> {
  const res = await fetch(`/api/consensus?event_id=${encodeURIComponent(eventId)}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed (${res.status})`)
  }
  return (await res.json()) as ConsensusStatus
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800'
} as const

const CONSENSUS_META = {
  confirmed: { label: 'Confirmed', color: 'text-green-700', Icon: CheckCircle2 },
  disputed: { label: 'Disputed', color: 'text-red-700', Icon: XCircle },
  undecided: { label: 'Undecided', color: 'text-yellow-700', Icon: Clock }
} as const

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default'
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'confirm' | 'dispute'
}) {
  const toneClass =
    tone === 'confirm'
      ? 'text-green-700'
      : tone === 'dispute'
        ? 'text-red-700'
        : 'text-gray-900'
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <Icon className={cn('h-5 w-5 mx-auto mb-1.5', toneClass)} />
      <div className={cn('text-2xl font-bold', toneClass)}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function EmergencyDetailClient() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const eventId = params?.id ?? ''
  const { user } = useAuth()
  const currentLocation = useCurrentLocation()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    data: rawEvent,
    isLoading: eventLoading,
    isError: eventError,
    error: eventErr
  } = useEmergencyEvent(eventId)
  const event = (rawEvent as unknown as EmergencyDetail) ?? null

  const {
    data: consensus,
    isLoading: consensusLoading,
    isError: consensusError,
    error: consensusErr,
    refetch: refetchConsensus
  } = useQuery({
    queryKey: ['consensus', eventId],
    queryFn: () => fetchConsensus(eventId),
    enabled: !!eventId,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000
  })

  const confirmEvent = useConfirmEvent()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['consensus', eventId] })
    queryClient.invalidateQueries({ queryKey: ['emergency-event', eventId] })
    queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
  }

  const handleVote = (confirmationType: 'confirm' | 'dispute') => {
    setActionError(null)
    if (!user) {
      router.push('/login')
      return
    }
    const location = currentLocation
      ? { lat: currentLocation.lat, lng: currentLocation.lng }
      : undefined
    confirmEvent.mutate(
      { eventId, userId: user.id, confirmationType, location },
      {
        onSuccess: () => invalidateAll(),
        onError: err => {
          setActionError(err instanceof Error ? err.message : 'Failed to record your vote.')
        }
      }
    )
  }

  if (eventLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="loading-spinner h-8 w-8 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Loading emergency…</p>
      </div>
    )
  }

  if (eventError || !event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 font-medium">Emergency not found.</p>
        <p className="text-sm text-gray-500 mt-1">
          {eventErr instanceof Error ? eventErr.message : 'It may have been removed.'}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/emergencies')}>
          Back to emergencies
        </Button>
      </div>
    )
  }

  const loc = parseGeoLocation(event.location)
  const severity = event.severity
  const meta = consensus ? CONSENSUS_META[consensus.consensus] : null
  const confidencePct = consensus ? Math.round(consensus.confidence * 100) : null
  const totalWeighted = consensus
    ? consensus.weighted_confirm_score + consensus.weighted_dispute_score
    : null
  const confirmShare = consensus && totalWeighted && totalWeighted > 0
    ? Math.round((consensus.weighted_confirm_score / totalWeighted) * 100)
    : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/emergencies')}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        All emergencies
      </button>

      <Card className="overflow-hidden">
        <div className="bg-red-600 px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-7 w-7 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold break-words">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-red-100">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Severity {severity}/5
                </span>
                {event.emergency_types?.name && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {event.emergency_types.name}
                  </span>
                )}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-semibold capitalize',
                    STATUS_BADGE[event.status]
                  )}
                >
                  {event.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5">
          {event.description && (
            <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Reported {formatRelativeTime(event.created_at)}</span>
            </div>
            {loc && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>
                  {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="h-4 w-4 text-gray-400" />
              <span>Trust weight {event.trust_weight.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live consensus panel — driven entirely by GET /api/consensus (no mock data). */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Consensus status
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchConsensus()}
              loading={consensusLoading}
              aria-label="Refresh consensus"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {consensusLoading ? (
            <p className="text-sm text-gray-500 text-center py-6">Loading consensus…</p>
          ) : consensusError ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 font-medium">Consensus unavailable.</p>
              <p className="text-xs text-gray-500 mt-1">
                {consensusErr instanceof Error ? consensusErr.message : 'Try refreshing.'}
              </p>
            </div>
          ) : consensus && meta ? (
            <>
              <div className={cn('flex items-center gap-2 text-lg font-semibold', meta.color)}>
                <meta.Icon className="h-5 w-5" />
                {meta.label}
                {confidencePct !== null && (
                  <span className="text-sm font-normal text-gray-500">
                    · {confidencePct}% confidence
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label="Confirm votes"
                  value={consensus.confirm_votes}
                  icon={ThumbsUp}
                  tone="confirm"
                />
                <Stat
                  label="Dispute votes"
                  value={consensus.dispute_votes}
                  icon={ThumbsDown}
                  tone="dispute"
                />
                <Stat label="Total votes" value={consensus.total_votes} icon={Shield} />
                <Stat
                  label="Confirm share"
                  value={confirmShare !== null ? `${confirmShare}%` : '—'}
                  icon={CheckCircle2}
                />
              </div>

              {totalWeighted !== null && totalWeighted > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Trust-weighted votes</span>
                    <span>
                      {consensus.weighted_confirm_score.toFixed(2)} confirm ·{' '}
                      {consensus.weighted_dispute_score.toFixed(2)} dispute
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-red-200 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${(consensus.weighted_confirm_score / totalWeighted) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">No consensus data yet.</p>
          )}

          {actionError && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {actionError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => handleVote('confirm')}
              loading={confirmEvent.isPending}
              disabled={!user}
              title={!user ? 'Sign in to confirm' : undefined}
            >
              <ThumbsUp className="h-4 w-4" />
              Confirm this report
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-600 text-red-700 hover:bg-red-50"
              onClick={() => handleVote('dispute')}
              loading={confirmEvent.isPending}
              disabled={!user}
              title={!user ? 'Sign in to dispute' : undefined}
            >
              <ThumbsDown className="h-4 w-4" />
              Dispute this report
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-gray-400 text-center">
              <button onClick={() => router.push('/login')} className="underline">
                Sign in
              </button>{' '}
              to participate in consensus.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Severity alerts + workflow manager (previously DEAD components) */}
      <div className="mt-6">
        <EmergencySeverityAlerts />
      </div>
      {user && (
        <div className="mt-6">
          <EmergencyWorkflowManager />
        </div>
      )}
    </div>
  )
}
