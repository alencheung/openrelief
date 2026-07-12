/**
 * Trust Score Integration Data Access for OpenRelief
 *
 * Database read/write helpers extracted from TrustScoreManager.
 */

import { supabaseAdmin } from '@/lib/supabase'
import type { TrustScore } from './trust-integration-types'
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
    return createDefaultTrustScore(userId)
  }

  return {
    userId,
    overall: data.overall_score,
    factors: data.factors,
    history: data.history || [],
    reputation: data.reputation || {},
    lastUpdated: new Date(data.updated_at),
    confidence: data.confidence || 0.5
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
    })
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

  return (!error && data?.mfa_enabled) || false
}
