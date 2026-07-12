/**
 * Trust Score Integration Helpers for OpenRelief
 *
 * Configuration constants and pure helper functions extracted from
 * trust-integration. These do not depend on TrustScoreManager instance state.
 */

import type {
  TrustFactors,
  TrustScore,
  ActionContext,
  ActionImpact,
  Reputation,
  TrustThreshold
} from './trust-integration-types'

// Trust score configuration
export const TRUST_CONFIG = {
  // Score ranges
  scoreRanges: {
    very_low: { min: 0.0, max: 0.2 },
    low: { min: 0.2, max: 0.4 },
    medium: { min: 0.4, max: 0.6 },
    high: { min: 0.6, max: 0.8 },
    very_high: { min: 0.8, max: 1.0 }
  },

  // Trust thresholds
  thresholds: {
    very_low: {
      minScore: 0.0,
      maxScore: 0.2,
      permissions: ['read_public'],
      restrictions: ['no_reporting', 'no_voting', 'no_confirmation', 'rate_limit_strict'],
      requirements: ['mfa_required', 'manual_review']
    },
    low: {
      minScore: 0.2,
      maxScore: 0.4,
      permissions: ['read_public', 'comment'],
      restrictions: ['limited_reporting', 'no_voting', 'rate_limit_moderate'],
      requirements: ['mfa_required']
    },
    medium: {
      minScore: 0.4,
      maxScore: 0.6,
      permissions: ['read_public', 'comment', 'report', 'vote'],
      restrictions: ['standard_rate_limit', 'content_filtering'],
      requirements: ['mfa_optional']
    },
    high: {
      minScore: 0.6,
      maxScore: 0.8,
      permissions: ['read_public', 'comment', 'report', 'vote', 'moderate'],
      restrictions: ['enhanced_rate_limit', 'priority_access'],
      requirements: ['mfa_optional']
    },
    very_high: {
      minScore: 0.8,
      maxScore: 1.0,
      permissions: ['read_public', 'comment', 'report', 'vote', 'moderate', 'admin'],
      restrictions: ['full_access'],
      requirements: ['trusted_user']
    }
  },

  // Factor weights
  factorWeights: {
    reportingAccuracy: 0.25,
    confirmationAccuracy: 0.2,
    disputeAccuracy: 0.15,
    responseTime: 0.1,
    locationAccuracy: 0.1,
    contributionFrequency: 0.1,
    communityEndorsement: 0.05,
    penaltyScore: -0.3,
    consistencyScore: 0.15
  },

  // Decay and growth
  decay: {
    dailyDecayRate: 0.001,
    maxDecayAmount: 0.3,
    inactivityThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
    boostAmount: 0.05,
    boostDecayRate: 0.01
  },

  // Attack resistance
  attackResistance: {
    trustWeightMultiplier: 2.0,
    consensusThreshold: 0.6,
    sybilThreshold: 0.3,
    reputationThreshold: 0.4,
    adaptiveThresholds: true,
    emergencyMode: false
  }
}

// Get action-specific impact on trust factors
export const getActionImpact = (
  action: string,
  _context: ActionContext
): ActionImpact => {
  const penaltyImpact: ActionImpact = {
    impact: -0.05,
    reason: 'Penalty applied',
    factor: 'penaltyScore'
  }
  const impacts: Record<string, ActionImpact> = {
    report: { impact: 0.02, reason: 'Emergency report submitted', factor: 'reportingAccuracy' },
    confirm: {
      impact: 0.03,
      reason: 'Emergency event confirmed',
      factor: 'confirmationAccuracy'
    },
    dispute: { impact: -0.02, reason: 'Emergency event disputed', factor: 'disputeAccuracy' },
    endorse: { impact: 0.01, reason: 'User endorsed', factor: 'communityEndorsement' },
    moderate: { impact: 0.01, reason: 'Content moderated', factor: 'communityEndorsement' },
    penalty: penaltyImpact,
    boost: { impact: 0.05, reason: 'Trust boost applied', factor: 'communityEndorsement' }
  }

  return impacts[action] ?? penaltyImpact
}

// Update trust factors based on an action and its impact
export const updateTrustFactors = (
  currentFactors: TrustFactors,
  action: string,
  actionImpact: ActionImpact
): TrustFactors => {
  const updatedFactors = { ...currentFactors }

  if (actionImpact.factor) {
    const factorKey = actionImpact.factor
    const currentValue = (updatedFactors[factorKey] as number) || 0
    const newValue = Math.max(0, Math.min(1, currentValue + actionImpact.impact))
    ;(updatedFactors as Record<string, unknown>)[factorKey] = newValue
  }

  if (['report', 'confirm', 'dispute'].includes(action)) {
    updatedFactors.contributionFrequency = Math.min(
      1,
      updatedFactors.contributionFrequency + 0.01
    )
  }

  updatedFactors.consistencyScore = calculateConfidence(updatedFactors)

  return updatedFactors
}

// Calculate weighted overall score from trust factors
export const calculateOverallScore = (factors: TrustFactors): number => {
  const weights = TRUST_CONFIG.factorWeights

  let score = 0

  score += factors.reportingAccuracy * weights.reportingAccuracy
  score += factors.confirmationAccuracy * weights.confirmationAccuracy
  score += factors.disputeAccuracy * weights.disputeAccuracy
  score += (1 - factors.responseTime) * weights.responseTime
  score += factors.locationAccuracy * weights.locationAccuracy
  score += factors.contributionFrequency * weights.contributionFrequency
  score += factors.communityEndorsement * weights.communityEndorsement
  score += factors.penaltyScore * weights.penaltyScore
  score += factors.consistencyScore * weights.consistencyScore

  return Math.max(0, Math.min(1, score))
}

// Calculate confidence based on data availability and consistency
export const calculateConfidence = (factors: TrustFactors): number => {
  let confidence = 0.5

  const dataPoints = [
    factors.reportingAccuracy > 0,
    factors.confirmationAccuracy > 0,
    factors.disputeAccuracy > 0,
    factors.responseTime > 0,
    factors.locationAccuracy > 0,
    factors.contributionFrequency > 0,
    factors.communityEndorsement > 0
  ].filter(Boolean).length

  confidence += (dataPoints / 7) * 0.4
  confidence += factors.consistencyScore * 0.1

  return Math.min(1.0, confidence)
}

// Update reputation based on an action
export const updateReputation = (
  currentReputation: Reputation,
  _score: number,
  action: string
): Reputation => {
  const updatedReputation = { ...currentReputation }

  if (action === 'report') {
    updatedReputation.reports++
    updatedReputation.communityScore = Math.min(1.0, updatedReputation.communityScore + 0.01)
  } else if (action === 'confirm') {
    updatedReputation.communityScore = Math.min(1.0, updatedReputation.communityScore + 0.02)
  } else if (action === 'dispute') {
    updatedReputation.disputes++
    updatedReputation.communityScore = Math.max(0.1, updatedReputation.communityScore - 0.01)
  } else if (action === 'endorse') {
    updatedReputation.endorsements++
    updatedReputation.communityScore = Math.min(1.0, updatedReputation.communityScore + 0.03)
  }

  updatedReputation.globalScore
    = updatedReputation.communityScore * 0.6
    + updatedReputation.domainScore * 0.3
    + updatedReputation.endorsements * 0.1

  updatedReputation.lastActivity = new Date()

  return updatedReputation
}

// Map an action to its required permission categories
export const getActionPermissions = (action: string): string[] => {
  const permissions = {
    read_public: ['read', 'view', 'access'],
    comment: ['comment', 'post'],
    report: ['report', 'create', 'submit'],
    vote: ['vote', 'confirm', 'dispute'],
    moderate: ['moderate', 'review', 'flag'],
    admin: ['admin', 'manage', 'delete', 'ban']
  }

  return (permissions as Record<string, string[]>)[action] || []
}

// Detect rapid score changes in trust history (Sybil attack indicator)
export const checkRapidScoreChanges = (trustScore: TrustScore): boolean => {
  if (trustScore.history.length < 5) {
    return false
  }

  const recentChanges = trustScore.history.slice(-5)
  const scoreChanges = recentChanges.map((entry, index) => {
    if (index === 0) {
      return 0
    }
    const prev = recentChanges[index - 1]
    return prev ? Math.abs(entry.score - prev.score) : 0
  })

  const avgChange = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length
  const maxChange = Math.max(...scoreChanges)

  return avgChange > 0.1 || maxChange > 0.2
}

// Apply consensus-based attack resistance
export const applyConsensusResistance = (
  _userId: string,
  trustScore: TrustScore,
  action: string,
  _data: Record<string, unknown>,
  consensusThreshold: number
): string => {
  if (action === 'vote' && trustScore.overall < consensusThreshold) {
    return 'consensus_limited'
  }

  return 'consensus_allowed'
}

// Apply reputation-based attack resistance
export const applyReputationResistance = (
  _userId: string,
  trustScore: TrustScore,
  reputationThreshold: number
): string => {
  if (trustScore.reputation.globalScore < reputationThreshold) {
    return 'reputation_limited'
  }

  return 'reputation_allowed'
}

// Determine overall resistance from individual resistance checks
export const determineOverallResistance = (
  sybil: { safe: boolean; risk: number },
  consensus: string,
  reputation: string
): string => {
  if (!sybil.safe || sybil.risk > 0.5) {
    return 'blocked'
  }

  if (consensus === 'consensus_limited' || reputation === 'reputation_limited') {
    return 'limited'
  }

  return 'allowed'
}

// Build the default trust score for a new user
export const createDefaultTrustScore = (userId: string): TrustScore => ({
  userId,
  overall: 0.5,
  factors: {
    reportingAccuracy: 0.5,
    confirmationAccuracy: 0.5,
    disputeAccuracy: 0.5,
    responseTime: 0.5,
    locationAccuracy: 0.5,
    contributionFrequency: 0,
    communityEndorsement: 0,
    penaltyScore: 0,
    consistencyScore: 0.5,
    expertiseAreas: []
  },
  history: [],
  reputation: {
    globalScore: 0.5,
    communityScore: 0.5,
    domainScore: 0.5,
    endorsements: 0,
    reports: 0,
    disputes: 0,
    lastActivity: new Date()
  },
  lastUpdated: new Date(),
  confidence: 0.5
})

// Build the default reputation for a new user
export const createDefaultReputation = (): Reputation => ({
  globalScore: 0.5,
  communityScore: 0.5,
  domainScore: 0.5,
  endorsements: 0,
  reports: 0,
  disputes: 0,
  lastActivity: new Date()
})

// Find the trust threshold level for a given score
export const getThresholdForScore = (
  score: number
): TrustThreshold => {
  for (const [level, threshold] of Object.entries(TRUST_CONFIG.thresholds)) {
    if (score >= threshold.minScore && score <= threshold.maxScore) {
      return {
        level: level as TrustThreshold['level'],
        ...threshold
      }
    }
  }

  return { level: 'very_low', ...TRUST_CONFIG.thresholds.very_low }
}

// Rate limit parameters per trust level
export const RATE_LIMITS = {
  very_low: { maxRequests: 10, windowMs: 15 * 60 * 1000, penaltyMultiplier: 2.0 },
  low: { maxRequests: 25, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.5 },
  medium: { maxRequests: 50, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.2 },
  high: { maxRequests: 100, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.0 },
  very_high: { maxRequests: 200, windowMs: 15 * 60 * 1000, penaltyMultiplier: 0.8 }
} as const

// Apply decay for inactivity and growth for positive actions.
// lastActivityMs is the timestamp (ms) of the user's previous trust update.
export const applyDecayAndGrowth = (
  score: number,
  lastActivityMs: number,
  action: string
): number => {
  const now = Date.now()
  const daysSinceLastActivity = (now - lastActivityMs) / (24 * 60 * 60 * 1000)

  let adjustedScore = score

  // Apply decay for inactivity
  if (daysSinceLastActivity > TRUST_CONFIG.decay.inactivityThreshold) {
    const decayAmount = Math.min(
      TRUST_CONFIG.decay.maxDecayAmount,
      daysSinceLastActivity * TRUST_CONFIG.decay.dailyDecayRate
    )
    adjustedScore = Math.max(0.1, score - decayAmount)
  }

  // Apply growth for positive actions
  if (['report', 'confirm', 'endorse'].includes(action)) {
    const boostAmount
      = TRUST_CONFIG.decay.boostAmount
      * Math.exp(-daysSinceLastActivity * TRUST_CONFIG.decay.boostDecayRate)
    adjustedScore = Math.min(1.0, adjustedScore + boostAmount)
  }

  return adjustedScore
}
