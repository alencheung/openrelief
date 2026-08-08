/**
 * Hook for Trust System Operations
 *
 * This hook provides access to trust system functionality including
 * score calculations, user permissions, and consensus participation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTrustStore, useTrustScore, useTrustActions, useTrustThresholds } from '@/store/trustStore'
import type { TrustThresholds } from '@/store/trustStore'
import { supabaseHelpers, supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

// Types
export interface TrustSystemUser {
  userId: string
  trustScore: number
  canReport: boolean
  canConfirm: boolean
  canDispute: boolean
  isHighTrust: boolean
  isLowTrust: boolean
}

export interface TrustCalculationResult {
  userId: string
  score: number
  confidence: number
  factors: Record<string, unknown>
  lastUpdated: string
}

export interface TrustHistoryEntry {
  id: string
  userId: string
  eventId: string
  actionType: 'report' | 'confirm' | 'dispute'
  change: number
  previousScore: number
  newScore: number
  reason: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ConsensusParticipation {
  eventId: string
  userId: string
  voteType: 'confirm' | 'dispute'
  trustWeight: number
  timestamp: string
  location?: { lat: number; lng: number }
}

// Main hook for trust system operations
export const useTrustSystem = (userId?: string) => {
  const queryClient = useQueryClient()

  // Store-based state
  const currentUserScore = useTrustScore(userId)
  const thresholds = useTrustThresholds()
  const trustActions = useTrustActions()

  // Check user permissions — will be computed after trustCalculation is
  // available (moved below the useQuery calls to avoid temporal dead zone).
  // Placeholder; the real computation happens after the queries.

  // Query for trust score calculation. Reads from the trust_score_cache table
  // (written by the server-side TrustScoreManager) — previously targeted
  // non-existent `trust_scores` / `trust_score_factors` tables.
  const { data: trustCalculation, isLoading: isCalculating } = useQuery({
    queryKey: ['trust-calculation', userId],
    queryFn: async () => {
      if (!userId) {
        return null
      }

      const { data, error } = await supabase
        .from('trust_score_cache')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }
      if (!data) {
        return null
      }

      const scoreRow = data as {
        user_id: string
        overall_score: number
        confidence: number | null
        factors: Record<string, unknown>
        updated_at: string
      }
      return {
        userId: scoreRow.user_id,
        score: typeof scoreRow.overall_score === 'number' ? scoreRow.overall_score : Number(scoreRow.overall_score) || 0,
        confidence: scoreRow.confidence ?? calculateConfidence(scoreRow),
        factors: scoreRow.factors,
        lastUpdated: scoreRow.updated_at
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Query for trust history. user_trust_history is the real table name in the
  // schema (was previously querying the non-existent trust_score_history).
  const { data: trustHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['trust-history', userId],
    queryFn: async () => {
      if (!userId) {
        return []
      }

      const { data, error } = await supabase
        .from('user_trust_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }
      // Map snake_case DB columns to the camelCase shape consumers expect.
      // NOTE: getTrustTrend() reads `entry.change`, and the TrustHistoryEntry
      // type also uses `change`, so map trust_change -> change explicitly
      // (previously only `trustChange` was mapped, leaving `change` undefined
      // and making the trend always resolve to 'stable').
      return (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        actionType: row.action_type ?? row.actionType,
        change: row.trust_change ?? row.change ?? row.trustChange,
        trustChange: row.trust_change ?? row.trustChange,
        previousScore: row.previous_score ?? row.previousScore,
        newScore: row.new_score ?? row.newScore,
        createdAt: row.created_at ?? row.createdAt
      }))
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000 // 10 minutes
  })

  // Query for consensus participation
  const { data: consensusParticipation, isLoading: isLoadingConsensus } = useQuery({
    queryKey: ['consensus-participation', userId],
    queryFn: async () => {
      if (!userId) {
        return []
      }

      const { data, error } = await supabase
        .from('event_confirmations')
        .select(`
          *,
          emergency_events (id, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }
      return data?.map((confirmation: Record<string, unknown>) => {
        const locationStr = typeof confirmation.location === 'string' ? confirmation.location : null
        const location = locationStr
          ? {
              lat: parseFloat(locationStr.split(' ')[1] ?? ''),
              lng: parseFloat(locationStr.split(' ')[0] ?? '')
            }
          : undefined
        return {
          eventId: confirmation.event_id,
          userId: confirmation.user_id,
          voteType: confirmation.confirmation_type as 'confirm' | 'dispute',
          trustWeight: confirmation.trust_weight,
          timestamp: confirmation.created_at,
          location
        }
      }) || []
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })

  // Check user permissions — computed here (after trustCalculation is defined)
  // to avoid temporal dead zone. Falls back to trustCalculation.score when the
  // store's currentUserScore isn't populated.
  const effectiveScore = currentUserScore?.score ?? trustCalculation?.score ?? null
  const userPermissions = {
    canReport: effectiveScore !== null && effectiveScore >= thresholds.reporting,
    canConfirm: effectiveScore !== null && effectiveScore >= thresholds.confirming,
    canDispute: effectiveScore !== null && effectiveScore >= thresholds.disputing,
    isHighTrust: effectiveScore !== null && effectiveScore >= thresholds.highTrust,
    isLowTrust: effectiveScore !== null && effectiveScore <= thresholds.lowTrust
  }

  // Mutation for updating trust score
  const updateTrustMutation = useMutation({
    mutationFn: async ({
      userId,
      eventId,
      actionType,
      outcome,
      metadata
    }: {
      userId: string
      eventId: string
      actionType: 'report' | 'confirm' | 'dispute'
      outcome: 'success' | 'failure' | 'pending'
      metadata?: Record<string, unknown>
    }) => {
      return await trustActions.updateTrustForAction(
        userId,
        eventId,
        actionType,
        outcome,
        metadata
      )
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['trust-calculation'] })
      queryClient.invalidateQueries({ queryKey: ['trust-history'] })
      queryClient.invalidateQueries({ queryKey: ['consensus-participation'] })
    },
    onError: (error) => {
      console.error('Failed to update trust score:', error)
    }
  })

  // Mutation for recalculating trust score
  const recalculateTrustMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await trustActions.recalculateScore(userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-calculation'] })
    },
    onError: (error) => {
      console.error('Failed to recalculate trust score:', error)
    }
  })

  // Helper function to calculate confidence
  //
  // The trust_score_cache row stores its JSONB factor blob under the `factors`
  // column (see migration 20240117000001) using the engine's camelCase keys
  // (reportingAccuracy, confirmationAccuracy, ...). The previous
  // implementation read `trust_score_factors` with snake_case keys, which never
  // exists on a real row — so this always returned the 0.5 fallback. Accept
  // both field names and both key casings so the calculation works against real
  // data while remaining compatible with older fixtures.
  const calculateConfidence = (trustData: Record<string, unknown>): number => {
    const rawFactors = trustData.factors ?? trustData.trust_score_factors
    if (!rawFactors || typeof rawFactors !== 'object') {
      return 0.5
    }

    const factors = rawFactors as Record<string, number | null | undefined>
    const factorCount = Object.keys(factors).filter(
      key => factors[key] !== null && factors[key] !== undefined
    ).length

    // Base confidence on data completeness
    const dataCompleteness = factorCount / 8 // Assuming 8 factors total

    // Adjust based on consistency (accept camelCase or snake_case factor keys)
    const reporting = factors.reportingAccuracy ?? factors.reporting_accuracy ?? 0.5
    const confirmation = factors.confirmationAccuracy ?? factors.confirmation_accuracy ?? 0.5
    const consistency = 1 - Math.abs(reporting - confirmation)

    return Math.max(0.1, Math.min(0.95, (dataCompleteness + consistency) / 2))
  }

  // Helper function to get trust trend
  const getTrustTrend = (history: TrustHistoryEntry[]): 'increasing' | 'decreasing' | 'stable' => {
    if (history.length < 2) {
      return 'stable'
    }

    const recent = history.slice(0, 10) // Last 10 entries
    const scoreChanges = recent.map(entry => entry.change)
    const averageChange = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length

    if (averageChange > 0.01) {
      return 'increasing'
    }
    if (averageChange < -0.01) {
      return 'decreasing'
    }
    return 'stable'
  }

  // Helper function to get trust level
  const getTrustLevel = (score: number): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' => {
    if (score < 0.1) {
      return 'very-low'
    }
    if (score < 0.3) {
      return 'low'
    }
    if (score < 0.5) {
      return 'medium'
    }
    if (score < 0.8) {
      return 'high'
    }
    return 'very-high'
  }

  // Computed trust level and trend derived from the current score/history so
  // consumers can read them as values rather than calling helper functions.
  const currentScoreValue = currentUserScore?.score ?? trustCalculation?.score ?? 0
  const trustLevel = getTrustLevel(currentScoreValue)
  const trustTrend = Array.isArray(trustHistory)
    ? getTrustTrend(trustHistory as unknown as TrustHistoryEntry[])
    : 'stable'

  return {
    // Current user state
    currentUserScore,
    userPermissions,
    trustCalculation,
    trustHistory,
    consensusParticipation,

    // Computed classification
    trustLevel,
    trustTrend,

    // Loading states
    isCalculating,
    isLoadingHistory,
    isLoadingConsensus,

    // Mutations
    updateTrustMutation,
    recalculateTrustMutation,
    // Alias matching the action name used by callers/tests
    recalculateTrust: () => recalculateTrustMutation.mutateAsync(userId as string),

    // Helper functions
    calculateConfidence,
    getTrustTrend,
    getTrustLevel,

    // Store actions
    trustActions
  }
}

// Export utility functions
export const canUserReport = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.reporting
}

export const canUserConfirm = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.confirming
}

export const canUserDispute = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.disputing
}

export const isHighTrustUser = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.highTrust
}

export const isLowTrustUser = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore <= thresholds.lowTrust
}

export default useTrustSystem