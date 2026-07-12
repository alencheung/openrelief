/**
 * Trust Score Integration for Attack Resistance
 *
 * This module integrates trust scores with security decisions to provide
 * attack resistance based on user reputation and behavior patterns.
 * It implements dynamic trust scoring, reputation systems,
 * and trust-based access controls.
 */

import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'

// Re-export types and helpers for backward compatibility
export * from './trust-integration-types'
export * from './trust-integration-helpers'
import type {
  TrustScore,
  TrustFactors,
  TrustScoreHistory,
  Reputation,
  TrustThreshold,
  AttackResistanceConfig,
  ActionContext,
  ActionImpact,
  AdjustedData
} from './trust-integration-types'
import {
  TRUST_CONFIG,
  RATE_LIMITS,
  getActionImpact,
  updateTrustFactors,
  calculateOverallScore,
  calculateConfidence,
  updateReputation,
  getActionPermissions,
  checkRapidScoreChanges,
  applyConsensusResistance,
  applyReputationResistance,
  determineOverallResistance,
  createDefaultReputation,
  getThresholdForScore,
  applyDecayAndGrowth
} from './trust-integration-helpers'
import {
  fetchUserTrustScore,
  saveTrustScoreToDb,
  loadTrustScoresFromDb,
  checkMFAEnabled
} from './trust-integration-data'

/**
 * Trust Score Manager
 */
export class TrustScoreManager {
  private trustScores: Map<string, TrustScore> = new Map()
  private reputationCache: Map<string, Reputation> = new Map()
  private attackResistanceConfig: AttackResistanceConfig

  constructor() {
    this.attackResistanceConfig = TRUST_CONFIG.attackResistance
    this.loadTrustScores()
  }

  /**
   * Calculate trust score for user action
   */
  async calculateTrustScore(
    userId: string,
    action: 'report' | 'confirm' | 'dispute' | 'endorse' | 'moderate' | 'penalty',
    context: ActionContext
  ): Promise<{
    newScore: number
    previousScore: number
    change: number
    factors: TrustFactors
  }> {
    try {
      const currentScore = await this.getUserTrustScore(userId)
      const previousScore = currentScore.overall

      const actionImpact = getActionImpact(action, context)
      const updatedFactors = updateTrustFactors(currentScore.factors, action, actionImpact)
      const newScore = calculateOverallScore(updatedFactors)
      const adjustedScore = applyDecayAndGrowth(
        newScore,
        currentScore.lastUpdated.getTime(),
        action
      )

      const historyEntry: TrustScoreHistory = {
        timestamp: new Date(),
        score: adjustedScore,
        action,
        context: JSON.stringify(context),
        reason: actionImpact.reason,
        impact: actionImpact.impact
      }

      const updatedScore: TrustScore = {
        ...currentScore,
        overall: adjustedScore,
        factors: updatedFactors,
        history: [...currentScore.history, historyEntry].slice(-100),
        reputation: this.updateReputation(userId, adjustedScore, action),
        lastUpdated: new Date(),
        confidence: calculateConfidence(updatedFactors)
      }

      this.trustScores.set(userId, updatedScore)
      await this.saveTrustScore(updatedScore)

      if (Math.abs(adjustedScore - previousScore) > 0.1) {
        await this.logTrustScoreChange(userId, previousScore, adjustedScore, action)
      }

      return {
        newScore: adjustedScore,
        previousScore,
        change: adjustedScore - previousScore,
        factors: updatedFactors
      }
    } catch (error) {
      console.error('Error calculating trust score:', error)
      throw error
    }
  }

  /**
   * Get user's trust threshold level
   */
  getTrustThreshold(userId: string): TrustThreshold {
    const trustScore = this.trustScores.get(userId)
    if (!trustScore) {
      return { level: 'very_low', ...TRUST_CONFIG.thresholds.very_low }
    }

    return getThresholdForScore(trustScore.overall)
  }

  /**
   * Check if user can perform action based on trust
   */
  async canPerformAction(
    userId: string,
    action: string,
    context?: ActionContext
  ): Promise<{
    allowed: boolean
    reason?: string
    requirements?: string[]
    restrictions?: string[]
  }> {
    try {
      const threshold = this.getTrustThreshold(userId)
      const trustScore = this.trustScores.get(userId)

      if (!trustScore) {
        return {
          allowed: false,
          reason: 'User trust score not found',
          requirements: ['trust_score_required']
        }
      }

      if (this.attackResistanceConfig.emergencyMode) {
        if (trustScore.overall >= 0.4) {
          return { allowed: true }
        }
      }

      const actionPermissions = getActionPermissions(action)
      const hasPermission = threshold.permissions.some(perm => actionPermissions.includes(perm))

      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Insufficient trust level for action: ${action}`,
          requirements: threshold.requirements,
          restrictions: threshold.restrictions
        }
      }

      const requirements = await this.checkRequirements(userId, threshold.requirements, context)
      if (!requirements.met) {
        return {
          allowed: false,
          reason: requirements.reason,
          requirements: threshold.requirements,
          restrictions: threshold.restrictions
        }
      }

      return {
        allowed: true,
        requirements: threshold.requirements,
        restrictions: threshold.restrictions
      }
    } catch (error) {
      console.error('Error checking action permission:', error)
      return {
        allowed: false,
        reason: 'Error checking permissions'
      }
    }
  }

  /**
   * Apply trust-based attack resistance
   */
  async applyAttackResistance(
    userId: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<{
    allowed: boolean
    trustWeight: number
    resistance: string
    adjustedData?: AdjustedData
  }> {
    try {
      const trustScore = this.trustScores.get(userId)
      if (!trustScore) {
        return {
          allowed: false,
          trustWeight: 0,
          resistance: 'no_trust_data'
        }
      }

      let trustWeight = trustScore.overall
      if (this.attackResistanceConfig.trustWeightMultiplier > 1) {
        trustWeight = Math.min(1.0, trustWeight * this.attackResistanceConfig.trustWeightMultiplier)
      }

      const sybilResistance = await this.checkSybilResistance(userId, trustScore, action)
      if (!sybilResistance.safe) {
        return {
          allowed: false,
          trustWeight,
          resistance: 'sybil_detected',
          adjustedData: {
            ...data,
            trustWarning: 'Sybil attack pattern detected',
            requiresVerification: true
          }
        }
      }

      const consensusResistance = applyConsensusResistance(
        userId,
        trustScore,
        action,
        data,
        this.attackResistanceConfig.consensusThreshold
      )
      const reputationResistance = applyReputationResistance(
        userId,
        trustScore,
        this.attackResistanceConfig.reputationThreshold
      )
      const resistance = determineOverallResistance(
        sybilResistance,
        consensusResistance,
        reputationResistance
      )

      let adjustedData: AdjustedData | undefined = data
      if (trustScore.overall < this.attackResistanceConfig.sybilThreshold) {
        adjustedData = {
          ...data,
          trustLimited: true,
          maxImpact: trustScore.overall * 0.5,
          requiresVerification: true
        }
      }

      return {
        allowed: resistance !== 'blocked',
        trustWeight,
        resistance,
        adjustedData
      }
    } catch (error) {
      console.error('Error applying attack resistance:', error)
      return {
        allowed: false,
        trustWeight: 0,
        resistance: 'error'
      }
    }
  }

  /**
   * Get trust-based rate limiting parameters
   */
  getTrustBasedRateLimit(userId: string): {
    maxRequests: number
    windowMs: number
    penaltyMultiplier: number
  } {
    const trustScore = this.trustScores.get(userId)
    if (!trustScore) {
      return {
        maxRequests: 10,
        windowMs: 15 * 60 * 1000,
        penaltyMultiplier: 2.0
      }
    }

    const threshold = this.getTrustThreshold(userId)
    return RATE_LIMITS[threshold.level] || RATE_LIMITS.medium
  }

  /**
   * Private helper methods
   */

  private async getUserTrustScore(userId: string): Promise<TrustScore> {
    const cached = this.trustScores.get(userId)
    if (cached) {
      return cached
    }

    const trustScore = await fetchUserTrustScore(userId)
    this.trustScores.set(userId, trustScore)
    return trustScore
  }

  private updateReputation(
    userId: string,
    score: number,
    action: string
  ): Reputation {
    const currentReputation = this.reputationCache.get(userId) || createDefaultReputation()
    const updatedReputation = updateReputation(currentReputation, score, action)
    this.reputationCache.set(userId, updatedReputation)
    return updatedReputation
  }

  private async checkRequirements(
    userId: string,
    requirements: string[],
    _context?: ActionContext
  ): Promise<{ met: boolean; reason?: string }> {
    const trustScore = this.trustScores.get(userId)
    if (!trustScore) {
      return { met: false, reason: 'Trust score not found' }
    }

    if (requirements.includes('mfa_required')) {
      const mfaEnabled = await checkMFAEnabled(userId)
      if (!mfaEnabled) {
        return { met: false, reason: 'MFA required but not enabled' }
      }
    }

    if (requirements.includes('manual_review')) {
      const needsReview = trustScore.overall < 0.3
      if (needsReview) {
        return { met: false, reason: 'Manual review required' }
      }
    }

    if (requirements.includes('trusted_user')) {
      const isTrusted = trustScore.overall >= 0.8
      if (!isTrusted) {
        return { met: false, reason: 'Trusted user status required' }
      }
    }

    return { met: true }
  }

  private async checkSybilResistance(
    userId: string,
    trustScore: TrustScore,
    action: string
  ): Promise<{ safe: boolean; risk: number }> {
    const riskFactors = {
      lowTrustScore: trustScore.overall < this.attackResistanceConfig.sybilThreshold,
      rapidScoreChanges: checkRapidScoreChanges(trustScore),
      suspiciousPatterns: await this.checkSuspiciousPatterns(userId, action),
      networkAnomalies: await this.checkNetworkAnomalies(userId)
    }

    let risk = 0
    if (riskFactors.lowTrustScore) {
      risk += 0.3
    }
    if (riskFactors.rapidScoreChanges) {
      risk += 0.2
    }
    if (riskFactors.suspiciousPatterns) {
      risk += 0.3
    }
    if (riskFactors.networkAnomalies) {
      risk += 0.2
    }

    const safe = risk < 0.5
    return { safe, risk }
  }

  private async checkSuspiciousPatterns(_userId: string, _action: string): Promise<boolean> {
    // This would integrate with the Sybil prevention system
    return false
  }

  private async checkNetworkAnomalies(_userId: string): Promise<boolean> {
    // This would check for unusual network patterns
    return false
  }

  private async logTrustScoreChange(
    userId: string,
    previousScore: number,
    newScore: number,
    action: string
  ): Promise<void> {
    await securityMonitor.createAlert(
      SecurityIncidentType.ANOMALOUS_BEHAVIOR,
      IncidentSeverity.LOW,
      `Trust score changed for user ${userId}`,
      `Previous: ${previousScore}, New: ${newScore}, Action: ${action}`,
      'trust_system',
      {
        userId,
        metadata: {
          previousScore,
          newScore,
          change: newScore - previousScore,
          action
        }
      }
    )
  }

  private async saveTrustScore(trustScore: TrustScore): Promise<void> {
    await saveTrustScoreToDb(trustScore)
  }

  private async loadTrustScores(): Promise<void> {
    const scores = await loadTrustScoresFromDb()
    for (const trustScore of scores) {
      this.trustScores.set(trustScore.userId, trustScore)
    }
  }
}

// Global trust score manager instance
export const trustScoreManager = new TrustScoreManager()

/**
 * Update trust score from a user action
 *
 * This is a convenience function that wraps the TrustScoreManager's calculateTrustScore method.
 *
 * The `action` union includes `'penalty'` (which `calculateTrustScore` already
 * accepts and maps to a negative impact via `getActionImpact`) so that the
 * middleware-layer wrapper in `./trust-middleware` can translate a failed
 * action outcome into a penalty through this canonical entry point instead of
 * reimplementing the calculation.
 */
export async function updateTrustScoreFromAction(
  userId: string,
  action: 'report' | 'confirm' | 'dispute' | 'endorse' | 'moderate' | 'penalty',
  context: ActionContext
): Promise<{
  newScore: number
  previousScore: number
  change: number
  factors: TrustFactors
}> {
  const result = await trustScoreManager.calculateTrustScore(userId, action, context)
  return {
    ...result,
    change: result.change
  }
}

export default trustScoreManager
