/**
 * Sybil Attack Prevention System
 *
 * This module provides real-time detection and prevention of Sybil attacks
 * through behavioral analysis, pattern recognition, and trust score integration.
 * It implements multiple layers of defense to protect the emergency coordination
 * system from coordinated misinformation campaigns.
 *
 * Implementation is split across companion modules:
 * - sybil-types.ts       type definitions
 * - sybil-detection.ts   pure detection helpers + thresholds config
 * - sybil-queries.ts     Supabase data-access helpers
 */

import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import type {
  ActivityPattern,
  CoordinatedAttackDetection,
  CoordinatedAttackResult,
  LocationHistory,
  NetworkConnection,
  ReportingHistory,
  UserBehaviorProfile,
  UserProfileRow,
  UserRiskAssessment,
  VotingHistory
} from './sybil-types'
import {
  analyzeActivityPattern,
  calculateRiskScore,
  detectAccountCreationBurstFromRows,
  detectSybilFlags as detectSybilFlagsHelper,
  generateRecommendations as generateRecommendationsHelper,
  getRiskLevel as getRiskLevelHelper,
  NO_ATTACK_DETECTED
} from './sybil-detection'
import {
  fetchLocationHistory,
  fetchNetworkConnections,
  fetchRecentAccountCreations,
  fetchRecentUserProfiles,
  fetchReportingHistory,
  fetchUserProfile,
  fetchUserActivityHistory,
  fetchVotingHistory,
  generateDeviceFingerprint,
  suspendUser
} from './sybil-queries'

// Re-export public types so existing imports keep working.
export type {
  ActivityPattern,
  CoordinatedAttackDetection,
  CoordinatedAttackResult,
  LocationHistory,
  NetworkConnection,
  ReportingHistory,
  UserBehaviorProfile,
  UserRiskAssessment,
  VotingHistory
}
// Re-export the enum (runtime value) and the audit row types.
export { SybilFlagType } from './sybil-types'
export type {
  AuditLogRow,
  EmergencyEventRow,
  EventConfirmationRow,
  UserProfileRow
} from './sybil-types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Sybil Attack Prevention Engine
 */
export class SybilPreventionEngine {
  private userProfiles: Map<string, UserBehaviorProfile> = new Map()
  private detectionActive = false
  private analysisInterval: NodeJS.Timeout | null = null

  constructor() {
    // Do NOT auto-start the full-table sweep on construction. Previously
    // every serverless instance spun this singleton up on import, each
    // running `SELECT * FROM user_profiles WHERE created_at > NOW()-7d`
    // (no LIMIT) plus 6 queries per user every 5 minutes — 600K queries
    // per sweep per instance at 100K users, with no cross-instance
    // deduplication, and three of the key detectors stubbed out.
    //
    // Incremental risk scoring now lives in the database
    // (increment_user_risk() trigger + scan_high_risk_users() cron — see
    // migration 20240620000004_incremental_sybil.sql). The in-app sweep
    // is retained for single-instance / self-hosted deployments that opt
    // in explicitly via startDetection(); in multi-instance production it
    // MUST stay off to avoid the per-instance fan-out.
    if (this.shouldAutoStart()) {
      this.startDetection()
    }
  }

  /**
   * Auto-start only in environments where we know we run as a single
   * instance (local dev, test, or when explicitly enabled). In default
   * serverless/production deployments this returns false and the
   * DB-driven scoring is the source of truth.
   */
  private shouldAutoStart(): boolean {
    if (process.env.NODE_ENV === 'test') return false
    return process.env.SYBIL_ENGINE_AUTOSTART === 'true'
  }

  /**
   * Start Sybil attack detection
   */
  startDetection(): void {
    if (this.detectionActive) {
      return
    }

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
      const userRow = await fetchUserProfile(userId)
      const activityHistory = await fetchUserActivityHistory(userId)
      const activityPattern: ActivityPattern = analyzeActivityPattern(activityHistory)
      const networkConnections: NetworkConnection[] =
        await fetchNetworkConnections(userId)
      const votingHistory: VotingHistory = await fetchVotingHistory(userId)
      const reportingHistory: ReportingHistory = await fetchReportingHistory(userId)
      const locationHistory: LocationHistory[] = await fetchLocationHistory(userId)
      const deviceFingerprint = await generateDeviceFingerprint(userId)

      const riskScore = calculateRiskScore({
        activityPattern,
        networkConnections,
        votingHistory,
        reportingHistory,
        locationHistory,
        trustScore: userRow.trust_score
      })

      const flags = detectSybilFlagsHelper({
        activityPattern,
        networkConnections,
        votingHistory
      })

      const profile: UserBehaviorProfile = {
        userId,
        createdAt: new Date(userRow.created_at),
        lastActivity: new Date(userRow.updated_at),
        trustScore: userRow.trust_score,
        activityPattern,
        networkConnections,
        votingHistory,
        reportingHistory,
        locationHistory,
        deviceFingerprint,
        riskScore,
        flags
      }

      this.userProfiles.set(userId, profile)

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
  async detectCoordinatedAttacks(): Promise<CoordinatedAttackDetection> {
    const attacks: CoordinatedAttackResult[] = []

    const creationBurst = await this.detectAccountCreationBurst()
    if (creationBurst.detected) {
      attacks.push(creationBurst)
    }

    const coordinatedVoting = await this.detectCoordinatedVoting()
    if (coordinatedVoting.detected) {
      attacks.push(coordinatedVoting)
    }

    const clusteredReporting = await this.detectClusteredReporting()
    if (clusteredReporting.detected) {
      attacks.push(clusteredReporting)
    }

    const circularEndorsements = await this.detectCircularEndorsements()
    if (circularEndorsements.detected) {
      attacks.push(circularEndorsements)
    }

    if (attacks.length > 0) {
      const sortedAttacks = attacks.sort((a, b) => b.confidence - a.confidence)
      const top = sortedAttacks[0]
      if (top) {
        return {
          attackDetected: top.detected,
          attackType: top.attackType,
          involvedUsers: top.involvedUsers,
          confidence: top.confidence,
          evidence: top.evidence
        }
      }
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
  getUserRiskAssessment(userId: string): UserRiskAssessment {
    const profile = this.userProfiles.get(userId)
    if (!profile) {
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        flags: [],
        recommendations: ['User profile not available for analysis']
      }
    }

    const riskLevel = getRiskLevelHelper(profile.riskScore)
    const recommendations = generateRecommendationsHelper(profile)

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
      const users = await fetchRecentUserProfiles()

      for (const user of users) {
        // Analyze active users
        if (
          user.last_activity &&
          new Date(user.last_activity) > new Date(Date.now() - DAY_MS)
        ) {
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
      const attackResult = await this.detectCoordinatedAttacks()

      if (attackResult.attackDetected) {
        await this.handleCoordinatedAttack(attackResult)
      }

      for (const [userId, profile] of this.userProfiles.entries()) {
        if (profile.riskScore > 0.6) {
          await this.analyzeUserBehavior(userId)
        }
      }

      this.cleanupOldProfiles()
    } catch (error) {
      console.error('Error in real-time analysis:', error)
    }
  }

  private async detectAccountCreationBurst(): Promise<CoordinatedAttackResult> {
    const recentUsers = await fetchRecentAccountCreations()
    return detectAccountCreationBurstFromRows(recentUsers)
  }

  private async detectCoordinatedVoting(): Promise<CoordinatedAttackResult> {
    // This would analyze voting patterns across multiple users
    // Simplified implementation for demonstration
    return NO_ATTACK_DETECTED
  }

  private async detectClusteredReporting(): Promise<CoordinatedAttackResult> {
    // This would analyze geographic clustering of reports
    // Simplified implementation for demonstration
    return NO_ATTACK_DETECTED
  }

  private async detectCircularEndorsements(): Promise<CoordinatedAttackResult> {
    // This would detect circular endorsement patterns
    // Simplified implementation for demonstration
    return NO_ATTACK_DETECTED
  }

  private async handleHighRiskUser(profile: UserBehaviorProfile): Promise<void> {
    await securityMonitor.createAlert(
      SecurityIncidentType.MALICIOUS_ACTIVITY,
      IncidentSeverity.HIGH,
      `High-risk user detected: ${profile.userId}`,
      `Risk score: ${profile.riskScore}, Flags: ${profile.flags.length}`,
      'sybil_prevention'
    )

    if (profile.riskScore > 0.8) {
      await this.suspendUser(profile.userId, 'High Sybil risk detected')
    } else if (profile.riskScore > 0.7) {
      await this.increaseMonitoring(profile.userId)
    }
  }

  private async handleCoordinatedAttack(attack: {
    attackType: string
    involvedUsers: string[]
    confidence: number
    evidence: Record<string, unknown>[]
  }): Promise<void> {
    await securityMonitor.detectIncident(
      SecurityIncidentType.MALICIOUS_ACTIVITY,
      IncidentSeverity.HIGH,
      `Coordinated attack detected: ${attack.attackType}`,
      `${attack.involvedUsers.length} users involved, Confidence: ${attack.confidence}`,
      {
        attackVector: attack.attackType,
        affectedUsers: attack.involvedUsers,
        indicators: attack.evidence.map(e => JSON.stringify(e))
      }
    )

    for (const userId of attack.involvedUsers) {
      await this.suspendUser(userId, `Coordinated attack: ${attack.attackType}`)
    }
  }

  private async suspendUser(userId: string, reason: string): Promise<void> {
    try {
      await suspendUser(userId, reason)
      console.log(`User ${userId} suspended: ${reason}`)
    } catch (error) {
      console.error(`Error suspending user ${userId}:`, error)
    }
  }

  private async increaseMonitoring(userId: string): Promise<void> {
    // This would increase monitoring level for the user
    console.log(`Increased monitoring for user ${userId}`)
  }

  private cleanupOldProfiles(): void {
    const cutoffTime = Date.now() - DAY_MS // 24 hours ago

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
