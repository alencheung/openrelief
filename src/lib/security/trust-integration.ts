/**
 * Trust Score Integration for Attack Resistance
 * 
 * This module integrates trust scores with security decisions to provide
 * attack resistance based on user reputation and behavior patterns.
 * It implements dynamic trust scoring, reputation systems,
 * and trust-based access controls.
 */

import { createHash } from 'crypto'
import { securityMonitor } from './security-monitor'
import { supabaseAdmin } from '@/lib/supabase'

// Trust score interfaces
export interface TrustScore {
  userId: string
  overall: number
  factors: TrustFactors
  history: TrustScoreHistory[]
  reputation: Reputation
  lastUpdated: Date
  confidence: number
}

export interface TrustFactors {
  reportingAccuracy: number
  confirmationAccuracy: number
  disputeAccuracy: number
  responseTime: number
  locationAccuracy: number
  contributionFrequency: number
  communityEndorsement: number
  expertiseAreas: string[]
  penaltyScore: number
  consistencyScore: number
}

export interface TrustScoreHistory {
  timestamp: Date
  score: number
  action: string
  context: string
  reason: string
  impact: number
}

export interface Reputation {
  globalScore: number
  communityScore: number
  domainScore: number
  endorsements: number
  reports: number
  disputes: number
  lastActivity: Date
}

export interface TrustThreshold {
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  minScore: number
  maxScore: number
  permissions: string[]
  restrictions: string[]
  requirements: string[]
}

export interface AttackResistanceConfig {
  trustWeightMultiplier: number
  consensusThreshold: number
  sybilThreshold: number
  reputationThreshold: number
  adaptiveThresholds: boolean
  emergencyMode: boolean
}

// Trust score configuration
const TRUST_CONFIG = {
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
    confirmationAccuracy: 0.20,
    disputeAccuracy: 0.15,
    responseTime: 0.10,
    locationAccuracy: 0.10,
    contributionFrequency: 0.10,
    communityEndorsement: 0.05,
    penaltyScore: -0.30,
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
    action: 'report' | 'confirm' | 'dispute' | 'endorse' | 'moderate',
    context: any
  ): Promise<{
    newScore: number
    previousScore: number
    change: number
    factors: TrustFactors
  }> {
    try {
      const currentScore = await this.getUserTrustScore(userId)
      const previousScore = currentScore.overall
      
      // Get action-specific impact
      const actionImpact = this.getActionImpact(action, context)
      
      // Update trust factors
      const updatedFactors = await this.updateTrustFactors(
        currentScore.factors,
        action,
        actionImpact
      )
      
      // Calculate new overall score
      const newScore = this.calculateOverallScore(updatedFactors)
      
      // Apply decay and growth
      const adjustedScore = this.applyDecayAndGrowth(newScore, userId, action)
      
      // Create history entry
      const historyEntry: TrustScoreHistory = {
        timestamp: new Date(),
        score: adjustedScore,
        action,
        context: JSON.stringify(context),
        reason: actionImpact.reason,
        impact: actionImpact.impact
      }
      
      // Update trust score
      const updatedScore: TrustScore = {
        ...currentScore,
        overall: adjustedScore,
        factors: updatedFactors,
        history: [...currentScore.history, historyEntry].slice(-100), // Keep last 100 entries
        reputation: await this.updateReputation(userId, adjustedScore, action),
        lastUpdated: new Date(),
        confidence: this.calculateConfidence(updatedFactors)
      }
      
      // Save to cache and database
      this.trustScores.set(userId, updatedScore)
      await this.saveTrustScore(updatedScore)
      
      // Log significant changes
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
      return TRUST_CONFIG.thresholds.very_low
    }
    
    const score = trustScore.overall
    
    // Find appropriate threshold
    for (const [level, threshold] of Object.entries(TRUST_CONFIG.thresholds)) {
      if (score >= threshold.minScore && score <= threshold.maxScore) {
        return {
          level: level as any,
          ...threshold
        }
      }
    }
    
    return TRUST_CONFIG.thresholds.very_low
  }
  
  /**
   * Check if user can perform action based on trust
   */
  async canPerformAction(
    userId: string,
    action: string,
    context?: any
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
      
      // Check emergency mode
      if (this.attackResistanceConfig.emergencyMode) {
        // In emergency mode, relax some restrictions for trusted users
        if (trustScore.overall >= 0.4) {
          return { allowed: true }
        }
      }
      
      // Check action permissions
      const actionPermissions = this.getActionPermissions(action)
      const hasPermission = threshold.permissions.some(perm => 
        actionPermissions.includes(perm)
      )
      
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Insufficient trust level for action: ${action}`,
          requirements: threshold.requirements,
          restrictions: threshold.restrictions
        }
      }
      
      // Check for additional requirements
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
    data: any
  ): Promise<{
    allowed: boolean
    trustWeight: number
    resistance: string
    adjustedData?: any
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
      
      const threshold = this.getTrustThreshold(userId)
      
      // Calculate trust weight for this action
      let trustWeight = trustScore.overall
      
      // Apply multiplier for attack resistance
      if (this.attackResistanceConfig.trustWeightMultiplier > 1) {
        trustWeight = Math.min(1.0, trustWeight * this.attackResistanceConfig.trustWeightMultiplier)
      }
      
      // Check for Sybil attack indicators
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
      
      // Apply consensus-based resistance
      const consensusResistance = this.applyConsensusResistance(userId, trustScore, action, data)
      
      // Apply reputation-based resistance
      const reputationResistance = this.applyReputationResistance(userId, trustScore)
      
      // Determine overall resistance
      const resistance = this.determineOverallResistance(
        sybilResistance,
        consensusResistance,
        reputationResistance
      )
      
      // Adjust data based on trust level
      let adjustedData = data
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
    
    // Adjust rate limiting based on trust level
    const rateLimits = {
      very_low: { maxRequests: 10, windowMs: 15 * 60 * 1000, penaltyMultiplier: 2.0 },
      low: { maxRequests: 25, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.5 },
      medium: { maxRequests: 50, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.2 },
      high: { maxRequests: 100, windowMs: 15 * 60 * 1000, penaltyMultiplier: 1.0 },
      very_high: { maxRequests: 200, windowMs: 15 * 60 * 1000, penaltyMultiplier: 0.8 }
    }
    
    return rateLimits[threshold.level] || rateLimits.medium
  }
  
  /**
   * Private helper methods
   */
  
  private async getUserTrustScore(userId: string): Promise<TrustScore> {
    // Check cache first
    const cached = this.trustScores.get(userId)
    if (cached) {
      return cached
    }
    
    // Load from database
    const { data, error } = await supabaseAdmin
      .from('user_trust_scores')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      // Return default trust score for new users
      const defaultScore: TrustScore = {
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
      }
      
      this.trustScores.set(userId, defaultScore)
      return defaultScore
    }
    
    const trustScore: TrustScore = {
      userId,
      overall: data.overall_score,
      factors: data.factors,
      history: data.history || [],
      reputation: data.reputation || {},
      lastUpdated: new Date(data.updated_at),
      confidence: data.confidence || 0.5
    }
    
    this.trustScores.set(userId, trustScore)
    return trustScore
  }
  
  private getActionImpact(action: string, context: any): {
    impact: number
    reason: string
    factor: keyof TrustFactors
  } {
    const impacts = {
      report: { impact: 0.02, reason: 'Emergency report submitted', factor: 'reportingAccuracy' },
      confirm: { impact: 0.03, reason: 'Emergency event confirmed', factor: 'confirmationAccuracy' },
      dispute: { impact: -0.02, reason: 'Emergency event disputed', factor: 'disputeAccuracy' },
      endorse: { impact: 0.01, reason: 'User endorsed', factor: 'communityEndorsement' },
      moderate: { impact: 0.01, reason: 'Content moderated', factor: 'communityEndorsement' },
      penalty: { impact: -0.05, reason: 'Penalty applied', factor: 'penaltyScore' },
      boost: { impact: 0.05, reason: 'Trust boost applied', factor: 'communityEndorsement' }
    }
    
    return impacts[action] || impacts.penalty
  }
  
  private async updateTrustFactors(
    currentFactors: TrustFactors,
    action: string,
    actionImpact: any
  ): Promise<TrustFactors> {
    const updatedFactors = { ...currentFactors }
    
    // Update specific factor based on action
    if (actionImpact.factor) {
      const currentValue = updatedFactors[actionImpact.factor] || 0
      const newValue = Math.max(0, Math.min(1, currentValue + actionImpact.impact))
      updatedFactors[actionImpact.factor] = newValue
    }
    
    // Update contribution frequency
    if (['report', 'confirm', 'dispute'].includes(action)) {
      updatedFactors.contributionFrequency = Math.min(1, 
        updatedFactors.contributionFrequency + 0.01)
    }
    
    // Update consistency score
    updatedFactors.consistencyScore = this.calculateConsistencyScore(updatedFactors)
    
    return updatedFactors
  }
  
  private calculateOverallScore(factors: TrustFactors): number {
    const weights = TRUST_CONFIG.factorWeights
    
    let score = 0
    
    // Calculate weighted sum
    score += factors.reportingAccuracy * weights.reportingAccuracy
    score += factors.confirmationAccuracy * weights.confirmationAccuracy
    score += factors.disputeAccuracy * weights.disputeAccuracy
    score += (1 - factors.responseTime) * weights.responseTime // Faster response = higher score
    score += factors.locationAccuracy * weights.locationAccuracy
    score += factors.contributionFrequency * weights.contributionFrequency
    score += factors.communityEndorsement * weights.communityEndorsement
    score += factors.penaltyScore * weights.penaltyScore
    score += factors.consistencyScore * weights.consistencyScore
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, score))
  }
  
  private applyDecayAndGrowth(score: number, userId: string, action: string): number {
    const now = Date.now()
    const lastActivity = this.trustScores.get(userId)?.lastUpdated.getTime() || now
    
    const daysSinceLastActivity = (now - lastActivity) / (24 * 60 * 60 * 1000)
    
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
      const boostAmount = TRUST_CONFIG.decay.boostAmount * 
        Math.exp(-daysSinceLastActivity * TRUST_CONFIG.decay.boostDecayRate)
      adjustedScore = Math.min(1.0, adjustedScore + boostAmount)
    }
    
    return adjustedScore
  }
  
  private calculateConfidence(factors: TrustFactors): number {
    // Calculate confidence based on data availability and consistency
    let confidence = 0.5 // Base confidence
    
    // More data points = higher confidence
    const dataPoints = [
      factors.reportingAccuracy > 0,
      factors.confirmationAccuracy > 0,
      factors.disputeAccuracy > 0,
      factors.responseTime > 0,
      factors.locationAccuracy > 0,
      factors.contributionFrequency > 0,
      factors.communityEndorsement > 0
    ].filter(Boolean).length
    
    confidence += (dataPoints / 7) * 0.4 // Up to 0.4 for data
    
    // Consistency increases confidence
    confidence += factors.consistencyScore * 0.1
    
    return Math.min(1.0, confidence)
  }
  
  private async updateReputation(userId: string, score: number, action: string): Promise<Reputation> {
    const currentReputation = this.reputationCache.get(userId) || {
      globalScore: 0.5,
      communityScore: 0.5,
      domainScore: 0.5,
      endorsements: 0,
      reports: 0,
      disputes: 0,
      lastActivity: new Date()
    }
    
    // Update reputation based on action
    const updatedReputation = { ...currentReputation }
    
    if (action === 'report') {
      updatedReputation.reports++
      updatedReputation.communityScore = Math.min(1.0, 
        updatedReputation.communityScore + 0.01)
    } else if (action === 'confirm') {
      updatedReputation.communityScore = Math.min(1.0, 
        updatedReputation.communityScore + 0.02)
    } else if (action === 'dispute') {
      updatedReputation.disputes++
      updatedReputation.communityScore = Math.max(0.1, 
        updatedReputation.communityScore - 0.01)
    } else if (action === 'endorse') {
      updatedReputation.endorsements++
      updatedReputation.communityScore = Math.min(1.0, 
        updatedReputation.communityScore + 0.03)
    }
    
    // Update global score
    updatedReputation.globalScore = (
      updatedReputation.communityScore * 0.6 +
      updatedReputation.domainScore * 0.3 +
      updatedReputation.endorsements * 0.1
    )
    
    updatedReputation.lastActivity = new Date()
    
    this.reputationCache.set(userId, updatedReputation)
    return updatedReputation
  }
  
  private getActionPermissions(action: string): string[] {
    const permissions = {
      read_public: ['read', 'view', 'access'],
      comment: ['comment', 'post'],
      report: ['report', 'create', 'submit'],
      vote: ['vote', 'confirm', 'dispute'],
      moderate: ['moderate', 'review', 'flag'],
      admin: ['admin', 'manage', 'delete', 'ban']
    }
    
    return permissions[action] || []
  }
  
  private async checkRequirements(
    userId: string,
    requirements: string[],
    context?: any
  ): Promise<{ met: boolean; reason?: string }> {
    const trustScore = this.trustScores.get(userId)
    if (!trustScore) {
      return { met: false, reason: 'Trust score not found' }
    }
    
    // Check MFA requirement
    if (requirements.includes('mfa_required')) {
      const mfaEnabled = await this.checkMFAEnabled(userId)
      if (!mfaEnabled) {
        return { met: false, reason: 'MFA required but not enabled' }
      }
    }
    
    // Check manual review requirement
    if (requirements.includes('manual_review')) {
      const needsReview = trustScore.overall < 0.3
      if (needsReview) {
        return { met: false, reason: 'Manual review required' }
      }
    }
    
    // Check trusted user requirement
    if (requirements.includes('trusted_user')) {
      const isTrusted = trustScore.overall >= 0.8
      if (!isTrusted) {
        return { met: false, reason: 'Trusted user status required' }
      }
    }
    
    return { met: true }
  }
  
  private async checkMFAEnabled(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('mfa_enabled')
      .eq('user_id', userId)
      .single()
    
    return !error && data?.mfa_enabled || false
  }
  
  private async checkSybilResistance(
    userId: string,
    trustScore: TrustScore,
    action: string
  ): Promise<{ safe: boolean; risk: number }> {
    // Check for Sybil attack indicators
    const riskFactors = {
      lowTrustScore: trustScore.overall < this.attackResistanceConfig.sybilThreshold,
      rapidScoreChanges: this.checkRapidScoreChanges(trustScore),
      suspiciousPatterns: await this.checkSuspiciousPatterns(userId, action),
      networkAnomalies: await this.checkNetworkAnomalies(userId)
    }
    
    // Calculate overall risk
    let risk = 0
    if (riskFactors.lowTrustScore) risk += 0.3
    if (riskFactors.rapidScoreChanges) risk += 0.2
    if (riskFactors.suspiciousPatterns) risk += 0.3
    if (riskFactors.networkAnomalies) risk += 0.2
    
    const safe = risk < 0.5
    
    return { safe, risk }
  }
  
  private checkRapidScoreChanges(trustScore: TrustScore): boolean {
    if (trustScore.history.length < 5) return false
    
    const recentChanges = trustScore.history.slice(-5)
    const scoreChanges = recentChanges.map((entry, index) => {
      if (index === 0) return 0
      return Math.abs(entry.score - recentChanges[index - 1].score)
    })
    
    const avgChange = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length
    const maxChange = Math.max(...scoreChanges)
    
    // Flag if average change is high or there are very large changes
    return avgChange > 0.1 || maxChange > 0.2
  }
  
  private async checkSuspiciousPatterns(userId: string, action: string): Promise<boolean> {
    // This would integrate with the Sybil prevention system
    // For now, return false (no suspicious patterns detected)
    return false
  }
  
  private async checkNetworkAnomalies(userId: string): Promise<boolean> {
    // This would check for unusual network patterns
    // For now, return false (no anomalies detected)
    return false
  }
  
  private applyConsensusResistance(
    userId: string,
    trustScore: TrustScore,
    action: string,
    data: any
  ): string {
    // Apply consensus-based attack resistance
    if (action === 'vote' && trustScore.overall < this.attackResistanceConfig.consensusThreshold) {
      return 'consensus_limited'
    }
    
    return 'consensus_allowed'
  }
  
  private applyReputationResistance(
    userId: string,
    trustScore: TrustScore
  ): string {
    // Apply reputation-based attack resistance
    if (trustScore.reputation.globalScore < this.attackResistanceConfig.reputationThreshold) {
      return 'reputation_limited'
    }
    
    return 'reputation_allowed'
  }
  
  private determineOverallResistance(
    sybil: { safe: boolean; risk: number },
    consensus: string,
    reputation: string
  ): string {
    if (!sybil.safe || sybil.risk > 0.5) {
      return 'blocked'
    }
    
    if (consensus === 'consensus_limited' || reputation === 'reputation_limited') {
      return 'limited'
    }
    
    return 'allowed'
  }
  
  private async logTrustScoreChange(
    userId: string,
    previousScore: number,
    newScore: number,
    action: string
  ): Promise<void> {
    await securityMonitor.createAlert(
      'trust_score_change' as any,
      'low' as any,
      `Trust score changed for user ${userId}`,
      `Previous: ${previousScore}, New: ${newScore}, Action: ${action}`,
      'trust_system',
      {
        userId,
        previousScore,
        newScore,
        change: newScore - previousScore,
        action
      }
    )
  }
  
  private async saveTrustScore(trustScore: TrustScore): Promise<void> {
    await supabaseAdmin
      .from('user_trust_scores')
      .upsert({
        user_id: trustScore.userId,
        overall_score: trustScore.overall,
        factors: trustScore.factors,
        reputation: trustScore.reputation,
        confidence: trustScore.confidence,
        updated_at: new Date().toISOString()
      })
  }
  
  private async loadTrustScores(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_trust_scores')
        .select('*')
      
      if (error) throw error
      
      for (const scoreData of data || []) {
        const trustScore: TrustScore = {
          userId: scoreData.user_id,
          overall: scoreData.overall_score,
          factors: scoreData.factors,
          history: scoreData.history || [],
          reputation: scoreData.reputation || {},
          lastUpdated: new Date(scoreData.updated_at),
          confidence: scoreData.confidence || 0.5
        }
        
        this.trustScores.set(scoreData.user_id, trustScore)
      }
    } catch (error) {
      console.error('Error loading trust scores:', error)
    }
  }
}

// Global trust score manager instance
export const trustScoreManager = new TrustScoreManager()

export default trustScoreManager