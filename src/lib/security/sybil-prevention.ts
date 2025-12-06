/**
 * Sybil Attack Prevention System
 * 
 * This module provides real-time detection and prevention of Sybil attacks
 * through behavioral analysis, pattern recognition, and trust score integration.
 * It implements multiple layers of defense to protect the emergency coordination
 * system from coordinated misinformation campaigns.
 */

import { createHash } from 'crypto'
import { securityMonitor } from '@/lib/audit/security-monitor'
import { supabaseAdmin } from '@/lib/supabase'

// Sybil attack detection interfaces
export interface UserBehaviorProfile {
  userId: string
  createdAt: Date
  lastActivity: Date
  trustScore: number
  activityPattern: ActivityPattern
  networkConnections: NetworkConnection[]
  votingHistory: VotingHistory
  reportingHistory: ReportingHistory
  locationHistory: LocationHistory[]
  deviceFingerprint: string
  riskScore: number
  flags: SybilFlag[]
}

export interface ActivityPattern {
  averageActionsPerHour: number
  peakActivityHours: number[]
  actionDistribution: Record<string, number>
  timeBetweenActions: number[]
  burstActivityCount: number
  consistentTiming: boolean
  automatedBehavior: boolean
}

export interface NetworkConnection {
  connectedUserId: string
  connectionType: 'confirmation' | 'dispute' | 'endorsement' | 'report'
  timestamp: Date
  trustWeight: number
  reciprocity: boolean
}

export interface VotingHistory {
  totalVotes: number
  confirmVotes: number
  disputeVotes: number
  consensusAlignment: number
  votingClusters: VotingCluster[]
  timingPatterns: TimingPattern[]
  targetVoting: Record<string, number> // How many times voted for same target
}

export interface VotingCluster {
  clusterId: string
  users: string[]
  similarity: number
  timing: Date[]
  voteType: 'confirm' | 'dispute'
  detectedAt: Date
}

export interface TimingPattern {
  pattern: string
  frequency: number
  users: string[]
  detectedAt: Date
}

export interface ReportingHistory {
  totalReports: number
  confirmedReports: number
  disputedReports: number
  averageSeverity: number
  reportClusters: ReportCluster[]
  locationProximity: LocationProximity[]
}

export interface ReportCluster {
  clusterId: string
  users: string[]
  location: { lat: number; lng: number }
  radius: number
  timeWindow: number
  reportCount: number
  detectedAt: Date
}

export interface LocationProximity {
  user1Id: string
  user2Id: string
  distance: number
  timeWindow: number
  reportCount: number
  suspicious: boolean
}

export interface LocationHistory {
  latitude: number
  longitude: number
  timestamp: Date
  accuracy: number
  source: 'gps' | 'network' | 'manual'
  feasible: boolean
}

export interface SybilFlag {
  type: SybilFlagType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: any
  detectedAt: Date
  confidence: number
}

export enum SybilFlagType {
  ACCOUNT_CREATION_BURST = 'account_creation_burst',
  SIMILAR_BEHAVIOR = 'similar_behavior',
  COORDINATED_VOTING = 'coordinated_voting',
  CIRCULAR_ENDORSEMENT = 'circular_endorsement',
  IMPOSSIBLE_MOVEMENT = 'impossible_movement',
  CLUSTERED_REPORTING = 'clustered_reporting',
  TRUST_SCORE_MANIPULATION = 'trust_score_manipulation',
  AUTOMATED_BEHAVIOR = 'automated_behavior',
  NETWORK_ISOLATION = 'network_isolation',
  TEMPORAL_CORRELATION = 'temporal_correlation'
}

// Detection thresholds and configuration
const DETECTION_CONFIG = {
  // Account creation thresholds
  accountCreation: {
    maxAccountsPerHour: 10,
    maxAccountsPerIP: 5,
    suspiciousTrustScoreThreshold: 0.2,
    accountAgeSuspicionThreshold: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Behavioral analysis thresholds
  behavior: {
    maxActionsPerHour: 100,
    suspiciousConsistencyThreshold: 0.9,
    automatedBehaviorThreshold: 0.8,
    burstActivityThreshold: 20,
  },
  
  // Network analysis thresholds
  network: {
    maxSimilarConnections: 10,
    reciprocityThreshold: 0.1,
    clusteringThreshold: 0.7,
    isolationThreshold: 0.1,
  },
  
  // Voting analysis thresholds
  voting: {
    consensusAlignmentThreshold: 0.3,
    targetVotingThreshold: 5,
    timingSimilarityThreshold: 0.8,
    clusterSizeThreshold: 5,
  },
  
  // Location analysis thresholds
  location: {
    maxSpeedKmh: 1000, // Supersonic speed threshold
    proximityThreshold: 100, // meters
    reportingRadiusThreshold: 500, // meters
    timeWindowThreshold: 60 * 60 * 1000, // 1 hour
  },
  
  // Trust score thresholds
  trust: {
    manipulationThreshold: 0.1,
    rapidIncreaseThreshold: 0.05,
    suspiciousVarianceThreshold: 0.2,
  }
}

/**
 * Sybil Attack Prevention Engine
 */
export class SybilPreventionEngine {
  private userProfiles: Map<string, UserBehaviorProfile> = new Map()
  private detectionActive = false
  private analysisInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startDetection()
  }
  
  /**
   * Start Sybil attack detection
   */
  startDetection(): void {
    if (this.detectionActive) return
    
    this.detectionActive = true
    this.loadUserProfiles()
    this.startRealTimeAnalysis()
    
    console.log('Sybil attack prevention system activated')
  }
  
  /**
   * Stop Sybil attack detection
   */
  stopDetection(): void {
    this.detectionActive = false
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }
    
    console.log('Sybil attack prevention system deactivated')
  }
  
  /**
   * Analyze user behavior for Sybil patterns
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorProfile> {
    try {
      // Get user data from database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (userError || !userData) {
        throw new Error(`User ${userId} not found`)
      }
      
      // Get user's activity history
      const activityHistory = await this.getUserActivityHistory(userId)
      
      // Analyze activity patterns
      const activityPattern = this.analyzeActivityPattern(activityHistory)
      
      // Analyze network connections
      const networkConnections = await this.analyzeNetworkConnections(userId)
      
      // Analyze voting history
      const votingHistory = await this.analyzeVotingHistory(userId)
      
      // Analyze reporting history
      const reportingHistory = await this.analyzeReportingHistory(userId)
      
      // Get location history
      const locationHistory = await this.getLocationHistory(userId)
      
      // Generate device fingerprint
      const deviceFingerprint = await this.generateDeviceFingerprint(userId)
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore({
        activityPattern,
        networkConnections,
        votingHistory,
        reportingHistory,
        locationHistory,
        trustScore: userData.trust_score
      })
      
      // Detect Sybil flags
      const flags = await this.detectSybilFlags({
        userId,
        userData,
        activityPattern,
        networkConnections,
        votingHistory,
        reportingHistory,
        locationHistory,
        deviceFingerprint
      })
      
      const profile: UserBehaviorProfile = {
        userId,
        createdAt: new Date(userData.created_at),
        lastActivity: new Date(userData.updated_at),
        trustScore: userData.trust_score,
        activityPattern,
        networkConnections,
        votingHistory,
        reportingHistory,
        locationHistory,
        deviceFingerprint,
        riskScore,
        flags
      }
      
      // Cache profile
      this.userProfiles.set(userId, profile)
      
      // Take action if high risk
      if (riskScore > 0.7) {
        await this.handleHighRiskUser(profile)
      }
      
      return profile
    } catch (error) {
      console.error(`Error analyzing user behavior for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Detect coordinated Sybil attacks
   */
  async detectCoordinatedAttacks(): Promise<{
    attackDetected: boolean
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }> {
    const attacks = []
    
    // Check for account creation bursts
    const creationBurst = await this.detectAccountCreationBurst()
    if (creationBurst.detected) {
      attacks.push(creationBurst)
    }
    
    // Check for coordinated voting
    const coordinatedVoting = await this.detectCoordinatedVoting()
    if (coordinatedVoting.detected) {
      attacks.push(coordinatedVoting)
    }
    
    // Check for clustered reporting
    const clusteredReporting = await this.detectClusteredReporting()
    if (clusteredReporting.detected) {
      attacks.push(clusteredReporting)
    }
    
    // Check for circular endorsements
    const circularEndorsements = await this.detectCircularEndorsements()
    if (circularEndorsements.detected) {
      attacks.push(circularEndorsements)
    }
    
    // Return highest confidence attack
    if (attacks.length > 0) {
      const sortedAttacks = attacks.sort((a, b) => b.confidence - a.confidence)
      return sortedAttacks[0]
    }
    
    return {
      attackDetected: false,
      attackType: '',
      involvedUsers: [],
      confidence: 0,
      evidence: []
    }
  }
  
  /**
   * Get user risk assessment
   */
  getUserRiskAssessment(userId: string): {
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    flags: SybilFlag[]
    recommendations: string[]
  } {
    const profile = this.userProfiles.get(userId)
    if (!profile) {
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        flags: [],
        recommendations: ['User profile not available for analysis']
      }
    }
    
    const riskLevel = this.getRiskLevel(profile.riskScore)
    const recommendations = this.generateRecommendations(profile)
    
    return {
      riskScore: profile.riskScore,
      riskLevel,
      flags: profile.flags,
      recommendations
    }
  }
  
  /**
   * Private helper methods
   */
  
  private async loadUserProfiles(): Promise<void> {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      
      if (error) throw error
      
      for (const user of users || []) {
        // Analyze active users
        if (user.last_activity > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          await this.analyzeUserBehavior(user.user_id)
        }
      }
    } catch (error) {
      console.error('Error loading user profiles:', error)
    }
  }
  
  private startRealTimeAnalysis(): void {
    this.analysisInterval = setInterval(async () => {
      if (this.detectionActive) {
        await this.performRealTimeAnalysis()
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }
  
  private async performRealTimeAnalysis(): Promise<void> {
    try {
      // Check for coordinated attacks
      const attackResult = await this.detectCoordinatedAttacks()
      
      if (attackResult.attackDetected) {
        await this.handleCoordinatedAttack(attackResult)
      }
      
      // Re-analyze high-risk users
      for (const [userId, profile] of this.userProfiles.entries()) {
        if (profile.riskScore > 0.6) {
          await this.analyzeUserBehavior(userId)
        }
      }
      
      // Cleanup old profiles
      this.cleanupOldProfiles()
    } catch (error) {
      console.error('Error in real-time analysis:', error)
    }
  }
  
  private async getUserActivityHistory(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: true })
    
    if (error) throw error
    return data || []
  }
  
  private analyzeActivityPattern(activityHistory: any[]): ActivityPattern {
    const actions = activityHistory.map(log => ({
      action: log.action,
      timestamp: new Date(log.timestamp).getTime()
    }))
    
    // Calculate actions per hour
    const actionsPerHour = new Map<number, number>()
    for (const action of actions) {
      const hour = new Date(action.timestamp).getHours()
      actionsPerHour.set(hour, (actionsPerHour.get(hour) || 0) + 1)
    }
    
    const averageActionsPerHour = Array.from(actionsPerHour.values()).reduce((sum, count) => sum + count, 0) / actionsPerHour.size || 0
    
    // Find peak activity hours
    const peakActivityHours = Array.from(actionsPerHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour)
    
    // Analyze action distribution
    const actionDistribution: Record<string, number> = {}
    for (const action of actions) {
      actionDistribution[action.action] = (actionDistribution[action.action] || 0) + 1
    }
    
    // Calculate time between actions
    const timeBetweenActions = []
    for (let i = 1; i < actions.length; i++) {
      timeBetweenActions.push(actions[i].timestamp - actions[i - 1].timestamp)
    }
    
    // Detect burst activity
    const burstActivityCount = this.detectBurstActivity(actions)
    
    // Check for consistent timing (automated behavior)
    const consistentTiming = this.checkConsistentTiming(timeBetweenActions)
    
    // Check for automated behavior patterns
    const automatedBehavior = this.detectAutomatedBehavior(actions, timeBetweenActions)
    
    return {
      averageActionsPerHour,
      peakActivityHours,
      actionDistribution,
      timeBetweenActions,
      burstActivityCount,
      consistentTiming,
      automatedBehavior
    }
  }
  
  private async analyzeNetworkConnections(userId: string): Promise<NetworkConnection[]> {
    const { data, error } = await supabaseAdmin
      .from('event_confirmations')
      .select(`
        *,
        user: user_profiles!inner(user_id, trust_score)
      `)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) throw error
    
    return (data || []).map(connection => ({
      connectedUserId: connection.event_id, // Simplified - would need proper relation
      connectionType: connection.confirmation_type as any,
      timestamp: new Date(connection.created_at),
      trustWeight: connection.trust_weight,
      reciprocity: false // Would need additional analysis
    }))
  }
  
  private async analyzeVotingHistory(userId: string): Promise<VotingHistory> {
    const { data, error } = await supabaseAdmin
      .from('event_confirmations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) throw error
    
    const votes = data || []
    const totalVotes = votes.length
    const confirmVotes = votes.filter(v => v.confirmation_type === 'confirm').length
    const disputeVotes = votes.filter(v => v.confirmation_type === 'dispute').length
    
    // Calculate consensus alignment (simplified)
    const consensusAlignment = 0.5 // Would need actual consensus data
    
    // Detect voting clusters
    const votingClusters = await this.detectVotingClusters(userId, votes)
    
    // Analyze timing patterns
    const timingPatterns = this.analyzeVotingTimingPatterns(votes)
    
    // Count target voting
    const targetVoting: Record<string, number> = {}
    for (const vote of votes) {
      targetVoting[vote.event_id] = (targetVoting[vote.event_id] || 0) + 1
    }
    
    return {
      totalVotes,
      confirmVotes,
      disputeVotes,
      consensusAlignment,
      votingClusters,
      timingPatterns,
      targetVoting
    }
  }
  
  private async analyzeReportingHistory(userId: string): Promise<ReportingHistory> {
    const { data, error } = await supabaseAdmin
      .from('emergency_events')
      .select('*')
      .eq('reported_by', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) throw error
    
    const reports = data || []
    const totalReports = reports.length
    const confirmedReports = reports.filter(r => r.status === 'resolved').length
    const disputedReports = reports.filter(r => r.status === 'disputed').length
    
    // Calculate average severity
    const severities = reports.map(r => this.severityToNumber(r.severity))
    const averageSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length || 0
    
    // Detect report clusters
    const reportClusters = await this.detectReportClusters(userId, reports)
    
    // Analyze location proximity
    const locationProximity = await this.analyzeLocationProximity(userId, reports)
    
    return {
      totalReports,
      confirmedReports,
      disputedReports,
      averageSeverity,
      reportClusters,
      locationProximity
    }
  }
  
  private async getLocationHistory(userId: string): Promise<LocationHistory[]> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('last_known_location, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
    
    if (error) throw error
    
    const locations = data || []
    return locations.map(loc => {
      const coords = this.parseLocation(loc.last_known_location)
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        timestamp: new Date(loc.updated_at),
        accuracy: 10, // Default accuracy
        source: 'gps' as const,
        feasible: true // Would need movement analysis
      }
    })
  }
  
  private async generateDeviceFingerprint(userId: string): Promise<string> {
    // This would collect various device characteristics
    // For now, return a hash of user ID and timestamp
    return createHash('sha256')
      .update(`${userId}:${Date.now()}`)
      .digest('hex')
      .substring(0, 16)
  }
  
  private calculateRiskScore(profile: {
    activityPattern: ActivityPattern
    networkConnections: NetworkConnection[]
    votingHistory: VotingHistory
    reportingHistory: ReportingHistory
    locationHistory: LocationHistory[]
    trustScore: number
  }): number {
    let riskScore = 0.5 // Base risk score
    
    // Activity pattern risk
    if (profile.activityPattern.automatedBehavior) {
      riskScore += 0.2
    }
    if (profile.activityPattern.burstActivityCount > DETECTION_CONFIG.behavior.burstActivityThreshold) {
      riskScore += 0.15
    }
    if (profile.activityPattern.consistentTiming) {
      riskScore += 0.1
    }
    
    // Network connection risk
    if (profile.networkConnections.length < DETECTION_CONFIG.network.isolationThreshold) {
      riskScore += 0.1
    }
    
    // Voting history risk
    if (profile.votingHistory.consensusAlignment < DETECTION_CONFIG.voting.consensusAlignmentThreshold) {
      riskScore += 0.15
    }
    
    // Reporting history risk
    if (profile.reportingHistory.totalReports > 50) {
      riskScore += 0.1
    }
    
    // Trust score risk
    if (profile.trustScore < DETECTION_CONFIG.accountCreation.suspiciousTrustScoreThreshold) {
      riskScore += 0.2
    }
    
    return Math.min(1.0, Math.max(0.0, riskScore))
  }
  
  private async detectSybilFlags(profile: {
    userId: string
    userData: any
    activityPattern: ActivityPattern
    networkConnections: NetworkConnection[]
    votingHistory: VotingHistory
    reportingHistory: ReportingHistory
    locationHistory: LocationHistory[]
    deviceFingerprint: string
  }): Promise<SybilFlag[]> {
    const flags: SybilFlag[] = []
    
    // Check for automated behavior
    if (profile.activityPattern.automatedBehavior) {
      flags.push({
        type: SybilFlagType.AUTOMATED_BEHAVIOR,
        severity: 'high',
        description: 'User exhibits automated behavior patterns',
        evidence: {
          consistentTiming: profile.activityPattern.consistentTiming,
          burstActivity: profile.activityPattern.burstActivityCount
        },
        detectedAt: new Date(),
        confidence: 0.8
      })
    }
    
    // Check for network isolation
    if (profile.networkConnections.length < 3) {
      flags.push({
        type: SybilFlagType.NETWORK_ISOLATION,
        severity: 'medium',
        description: 'User has limited network connections',
        evidence: {
          connectionCount: profile.networkConnections.length
        },
        detectedAt: new Date(),
        confidence: 0.6
      })
    }
    
    // Check for suspicious voting patterns
    if (profile.votingHistory.consensusAlignment < 0.3) {
      flags.push({
        type: SybilFlagType.COORDINATED_VOTING,
        severity: 'high',
        description: 'User voting patterns deviate significantly from consensus',
        evidence: {
          consensusAlignment: profile.votingHistory.consensusAlignment,
          totalVotes: profile.votingHistory.totalVotes
        },
        detectedAt: new Date(),
        confidence: 0.7
      })
    }
    
    return flags
  }
  
  private async detectAccountCreationBurst(): Promise<{
    detected: boolean
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
    
    if (error) throw error
    
    const recentUsers = data || []
    
    // Check for account creation burst
    if (recentUsers.length > DETECTION_CONFIG.accountCreation.maxAccountsPerHour) {
      const suspiciousUsers = recentUsers.filter(user => 
        user.trust_score < DETECTION_CONFIG.accountCreation.suspiciousTrustScoreThreshold
      )
      
      if (suspiciousUsers.length > DETECTION_CONFIG.accountCreation.maxAccountsPerIP) {
        return {
          detected: true,
          attackType: 'Account Creation Burst',
          involvedUsers: suspiciousUsers.map(u => u.user_id),
          confidence: 0.8,
          evidence: [
            {
              type: 'account_creation_burst',
              count: suspiciousUsers.length,
              timeWindow: '1 hour',
              averageTrustScore: suspiciousUsers.reduce((sum, u) => sum + u.trust_score, 0) / suspiciousUsers.length
            }
          ]
        }
      }
    }
    
    return {
      detected: false,
      attackType: '',
      involvedUsers: [],
      confidence: 0,
      evidence: []
    }
  }
  
  private async detectCoordinatedVoting(): Promise<{
    detected: boolean
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }> {
    // This would analyze voting patterns across multiple users
    // Simplified implementation for demonstration
    
    return {
      detected: false,
      attackType: '',
      involvedUsers: [],
      confidence: 0,
      evidence: []
    }
  }
  
  private async detectClusteredReporting(): Promise<{
    detected: boolean
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }> {
    // This would analyze geographic clustering of reports
    // Simplified implementation for demonstration
    
    return {
      detected: false,
      attackType: '',
      involvedUsers: [],
      confidence: 0,
      evidence: []
    }
  }
  
  private async detectCircularEndorsements(): Promise<{
    detected: boolean
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }> {
    // This would detect circular endorsement patterns
    // Simplified implementation for demonstration
    
    return {
      detected: false,
      attackType: '',
      involvedUsers: [],
      confidence: 0,
      evidence: []
    }
  }
  
  private async handleHighRiskUser(profile: UserBehaviorProfile): Promise<void> {
    // Log security incident
    await securityMonitor.createAlert(
      'malicious_activity' as any,
      'high' as any,
      `High-risk user detected: ${profile.userId}`,
      `Risk score: ${profile.riskScore}, Flags: ${profile.flags.length}`,
      'sybil_prevention'
    )
    
    // Apply restrictions based on risk level
    if (profile.riskScore > 0.8) {
      // Temporary suspension
      await this.suspendUser(profile.userId, 'High Sybil risk detected')
    } else if (profile.riskScore > 0.7) {
      // Increased monitoring
      await this.increaseMonitoring(profile.userId)
    }
  }
  
  private async handleCoordinatedAttack(attack: {
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: any[]
  }): Promise<void> {
    // Log security incident
    await securityMonitor.detectIncident(
      'malicious_activity' as any,
      'high' as any,
      `Coordinated attack detected: ${attack.attackType}`,
      `${attack.involvedUsers.length} users involved, Confidence: ${attack.confidence}`,
      {
        attackType: attack.attackType,
        involvedUsers: attack.involvedUsers,
        evidence: attack.evidence
      }
    )
    
    // Take action against involved users
    for (const userId of attack.involvedUsers) {
      await this.suspendUser(userId, `Coordinated attack: ${attack.attackType}`)
    }
  }
  
  private async suspendUser(userId: string, reason: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_profiles')
        .update({
          status: 'suspended',
          suspension_reason: reason,
          suspended_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      console.log(`User ${userId} suspended: ${reason}`)
    } catch (error) {
      console.error(`Error suspending user ${userId}:`, error)
    }
  }
  
  private async increaseMonitoring(userId: string): Promise<void> {
    // This would increase monitoring level for the user
    console.log(`Increased monitoring for user ${userId}`)
  }
  
  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore < 0.3) return 'low'
    if (riskScore < 0.6) return 'medium'
    if (riskScore < 0.8) return 'high'
    return 'critical'
  }
  
  private generateRecommendations(profile: UserBehaviorProfile): string[] {
    const recommendations: string[] = []
    
    if (profile.activityPattern.automatedBehavior) {
      recommendations.push('Review for automated behavior patterns')
    }
    
    if (profile.networkConnections.length < 3) {
      recommendations.push('Limited network connections - requires verification')
    }
    
    if (profile.votingHistory.consensusAlignment < 0.3) {
      recommendations.push('Voting patterns deviate from consensus')
    }
    
    if (profile.trustScore < 0.2) {
      recommendations.push('Low trust score - additional verification needed')
    }
    
    return recommendations
  }
  
  private detectBurstActivity(actions: any[]): number {
    // Count actions in short time windows
    let maxBurst = 0
    const windowSize = 5 * 60 * 1000 // 5 minutes
    
    for (let i = 0; i < actions.length; i++) {
      const windowStart = actions[i].timestamp
      const windowEnd = windowStart + windowSize
      
      const burstCount = actions.filter(action => 
        action.timestamp >= windowStart && action.timestamp <= windowEnd
      ).length
      
      maxBurst = Math.max(maxBurst, burstCount)
    }
    
    return maxBurst
  }
  
  private checkConsistentTiming(timeBetweenActions: number[]): boolean {
    if (timeBetweenActions.length < 10) return false
    
    // Calculate variance
    const mean = timeBetweenActions.reduce((sum, time) => sum + time, 0) / timeBetweenActions.length
    const variance = timeBetweenActions.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / timeBetweenActions.length
    const standardDeviation = Math.sqrt(variance)
    
    // Check if timing is too consistent (low variance)
    const coefficientOfVariation = standardDeviation / mean
    return coefficientOfVariation < 0.1
  }
  
  private detectAutomatedBehavior(actions: any[], timeBetweenActions: number[]): boolean {
    // Multiple indicators of automated behavior
    const consistentTiming = this.checkConsistentTiming(timeBetweenActions)
    const burstActivity = this.detectBurstActivity(actions) > DETECTION_CONFIG.behavior.burstActivityThreshold
    const regularIntervals = this.checkRegularIntervals(timeBetweenActions)
    
    return consistentTiming || burstActivity || regularIntervals
  }
  
  private checkRegularIntervals(timeBetweenActions: number[]): boolean {
    if (timeBetweenActions.length < 5) return false
    
    // Check for regular intervals (e.g., every 60 seconds)
    const intervals = timeBetweenActions.slice(0, 20) // Check first 20 intervals
    const commonInterval = this.findMostCommonInterval(intervals)
    
    const regularCount = intervals.filter(interval => 
      Math.abs(interval - commonInterval) < commonInterval * 0.1
    ).length
    
    return regularCount > intervals.length * 0.7
  }
  
  private findMostCommonInterval(intervals: number[]): number {
    const frequency = new Map<number, number>()
    
    for (const interval of intervals) {
      const rounded = Math.round(interval / 1000) // Round to seconds
      frequency.set(rounded, (frequency.get(rounded) || 0) + 1)
    }
    
    let maxCount = 0
    let mostCommon = 0
    
    for (const [interval, count] of frequency.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostCommon = interval * 1000 // Convert back to milliseconds
      }
    }
    
    return mostCommon
  }
  
  private async detectVotingClusters(userId: string, votes: any[]): Promise<VotingCluster[]> {
    // Simplified implementation
    return []
  }
  
  private analyzeVotingTimingPatterns(votes: any[]): TimingPattern[] {
    // Simplified implementation
    return []
  }
  
  private async detectReportClusters(userId: string, reports: any[]): Promise<ReportCluster[]> {
    // Simplified implementation
    return []
  }
  
  private async analyzeLocationProximity(userId: string, reports: any[]): Promise<LocationProximity[]> {
    // Simplified implementation
    return []
  }
  
  private parseLocation(locationString: string): { lat: number; lng: number } {
    // Parse PostGIS POINT format
    const match = locationString.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      }
    }
    return { lat: 0, lng: 0 }
  }
  
  private severityToNumber(severity: string): number {
    const severityMap: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    }
    return severityMap[severity] || 2
  }
  
  private cleanupOldProfiles(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
    
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (profile.lastActivity.getTime() < cutoffTime) {
        this.userProfiles.delete(userId)
      }
    }
  }
}

// Global Sybil prevention engine instance
export const sybilPreventionEngine = new SybilPreventionEngine()

export default sybilPreventionEngine