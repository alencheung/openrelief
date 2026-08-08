/**
 * Trust Score Integration Data Access for OpenRelief
 *
 * Database read/write helpers extracted from TrustScoreManager.
 */

import { supabaseAdmin } from '@/lib/supabase'
import type { TrustScore, Reputation } from './trust-integration-types'
import { createDefaultTrustScore } from './trust-integration-helpers'

// Load a single user's trust score from the database (or build a default).
export const fetchUserTrustScore = async (
  userId: string
): Promise<TrustScore> => {
  const { data, error } = await supabaseAdmin
    .from('user_trust_scores')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // PGRST116 (no rows) is expected for a brand-new user — a neutral 0.5
    // default is correct. Any other error is a real DB problem; the previous
    // code silently returned 0.5 for those too, masking outages as a sea of
    // "medium trust" users. Log it distinctly so it's diagnosable while still
    // degrading to a default (the engine always expects a TrustScore back).
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching trust score from DB, using default:', error)
    }
    return createDefaultTrustScore(userId)
  }

  const scoreData = data as unknown as {
    overall_score: number
    factors: TrustScore['factors']
    history: TrustScore['history'] | null
    reputation: TrustScore['reputation'] | null
    updated_at: string
    confidence: number | null
  }

  return {
    userId,
    overall: scoreData.overall_score,
    factors: scoreData.factors,
    history: scoreData.history || [],
    reputation: (scoreData.reputation || {}) as unknown as Reputation,
    lastUpdated: new Date(scoreData.updated_at),
    confidence: scoreData.confidence || 0.5
  }
}

// Persist a trust score to the cache table.
export const saveTrustScoreToDb = async (trustScore: TrustScore): Promise<void> => {
  // Persist computed factors to the `trust_score_cache` table. This was
  // previously an upsert into `user_trust_scores`, which is a VIEW (not
  // writable), so writes silently failed and trust state was lost on
  // process restart. A trigger mirrors overall_score onto user_profiles.
  try {
    await supabaseAdmin.from('trust_score_cache').upsert({
      user_id: trustScore.userId,
      overall_score: trustScore.overall,
      factors: trustScore.factors,
      reputation: trustScore.reputation,
      confidence: trustScore.confidence,
      history: trustScore.history,
      updated_at: new Date().toISOString()
    } as never)
  } catch (error) {
    console.error('Error persisting trust score:', error)
  }
}

// Load all cached trust scores from the database.
export const loadTrustScoresFromDb = async (): Promise<TrustScore[]> => {
  try {
    const { data, error } = await supabaseAdmin.from('trust_score_cache').select('*')

    if (error) {
      throw error
    }

    return (data || []).map((scoreData: Record<string, unknown>) => ({
      userId: scoreData.user_id as string,
      overall: scoreData.overall_score as number,
      factors: scoreData.factors as TrustScore['factors'],
      history: (scoreData.history as TrustScore['history']) || [],
      reputation: (scoreData.reputation as TrustScore['reputation']) || {},
      lastUpdated: new Date(scoreData.updated_at as string),
      confidence: (scoreData.confidence as number) || 0.5
    }))
  } catch (error) {
    console.error('Error loading trust scores:', error)
    return []
  }
}

// Check whether a user has MFA enabled.
export const checkMFAEnabled = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('mfa_enabled')
    .eq('user_id', userId)
    .single()

  return (!error && (data as unknown as { mfa_enabled?: boolean } | null)?.mfa_enabled) || false
}
