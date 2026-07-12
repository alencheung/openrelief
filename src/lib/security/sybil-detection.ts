/**
 * Pure detection helpers for the Sybil Attack Prevention System.
 *
 * Extracted from sybil-prevention.ts. These functions implement behavioral
 * analysis (burst activity, timing regularity, automation signals) and
 * static utilities (location parsing, severity mapping, risk scoring). They
 * do not touch the engine instance state.
 */

import { SybilFlagType } from './sybil-types'
import type {
  ActivityPattern,
  AuditLogRow,
  CoordinatedAttackResult,
  EmergencyEventRow,
  EventConfirmationRow,
  LocationHistory,
  NetworkConnection,
  ReportingHistory,
  SybilFlag,
  TimedAction,
  UserProfileRow,
  VotingHistory
} from './sybil-types'

// Detection thresholds and configuration
export const DETECTION_CONFIG = {
  // Account creation thresholds
  accountCreation: {
    maxAccountsPerHour: 10,
    maxAccountsPerIP: 5,
    suspiciousTrustScoreThreshold: 0.2,
    accountAgeSuspicionThreshold: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Behavioral analysis thresholds
  behavior: {
    maxActionsPerHour: 100,
    suspiciousConsistencyThreshold: 0.9,
    automatedBehaviorThreshold: 0.8,
    burstActivityThreshold: 20
  },

  // Network analysis thresholds
  network: {
    maxSimilarConnections: 10,
    reciprocityThreshold: 0.1,
    clusteringThreshold: 0.7,
    isolationThreshold: 0.1
  },

  // Voting analysis thresholds
  voting: {
    consensusAlignmentThreshold: 0.3,
    targetVotingThreshold: 5,
    timingSimilarityThreshold: 0.8,
    clusterSizeThreshold: 5
  },

  // Location analysis thresholds
  location: {
    maxSpeedKmh: 1000, // Supersonic speed threshold
    proximityThreshold: 100, // meters
    reportingRadiusThreshold: 500, // meters
    timeWindowThreshold: 60 * 60 * 1000 // 1 hour
  },

  // Trust score thresholds
  trust: {
    manipulationThreshold: 0.1,
    rapidIncreaseThreshold: 0.05,
    suspiciousVarianceThreshold: 0.2
  }
}

/**
 * Analyze an activity log to derive an ActivityPattern.
 */
export function analyzeActivityPattern(activityHistory: AuditLogRow[]): ActivityPattern {
  const actions: TimedAction[] = activityHistory.map(log => ({
    action: log.action,
    timestamp: new Date(log.timestamp).getTime()
  }))

  // Calculate actions per hour
  const actionsPerHour = new Map<number, number>()
  for (const action of actions) {
    const hour = new Date(action.timestamp).getHours()
    actionsPerHour.set(hour, (actionsPerHour.get(hour) || 0) + 1)
  }

  const averageActionsPerHour =
    Array.from(actionsPerHour.values()).reduce((sum, count) => sum + count, 0) /
      actionsPerHour.size || 0

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
  const timeBetweenActions: number[] = []
  for (let i = 1; i < actions.length; i++) {
    const curr = actions[i]
    const prev = actions[i - 1]
    if (curr && prev) {
      timeBetweenActions.push(curr.timestamp - prev.timestamp)
    }
  }

  // Detect burst activity
  const burstActivityCount = detectBurstActivity(actions)

  // Check for consistent timing (automated behavior)
  const consistentTiming = checkConsistentTiming(timeBetweenActions)

  // Check for automated behavior patterns
  const automatedBehavior = detectAutomatedBehavior(actions, timeBetweenActions)

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

/**
 * Count actions occurring within short time windows (5-minute bursts).
 */
export function detectBurstActivity(actions: TimedAction[]): number {
  let maxBurst = 0
  const windowSize = 5 * 60 * 1000 // 5 minutes

  for (let i = 0; i < actions.length; i++) {
    const windowStart = actions[i]!.timestamp
    const windowEnd = windowStart + windowSize

    const burstCount = actions.filter(
      action => action.timestamp >= windowStart && action.timestamp <= windowEnd
    ).length

    maxBurst = Math.max(maxBurst, burstCount)
  }

  return maxBurst
}

/**
 * Check whether the time between actions is suspiciously consistent (low
 * coefficient of variation), which indicates automation.
 */
export function checkConsistentTiming(timeBetweenActions: number[]): boolean {
  if (timeBetweenActions.length < 10) {
    return false
  }

  const mean =
    timeBetweenActions.reduce((sum, time) => sum + time, 0) / timeBetweenActions.length
  const variance =
    timeBetweenActions.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
    timeBetweenActions.length
  const standardDeviation = Math.sqrt(variance)

  const coefficientOfVariation = standardDeviation / mean
  return coefficientOfVariation < 0.1
}

/**
 * Detect automated behavior using multiple indicators.
 */
export function detectAutomatedBehavior(
  actions: TimedAction[],
  timeBetweenActions: number[]
): boolean {
  const consistentTiming = checkConsistentTiming(timeBetweenActions)
  const burstActivity =
    detectBurstActivity(actions) > DETECTION_CONFIG.behavior.burstActivityThreshold
  const regularIntervals = checkRegularIntervals(timeBetweenActions)

  return consistentTiming || burstActivity || regularIntervals
}

/**
 * Check whether actions occur at near-regular intervals.
 */
export function checkRegularIntervals(timeBetweenActions: number[]): boolean {
  if (timeBetweenActions.length < 5) {
    return false
  }

  const intervals = timeBetweenActions.slice(0, 20) // Check first 20 intervals
  const commonInterval = findMostCommonInterval(intervals)

  const regularCount = intervals.filter(
    interval => Math.abs(interval - commonInterval) < commonInterval * 0.1
  ).length

  return regularCount > intervals.length * 0.7
}

/**
 * Find the most frequently occurring interval (in milliseconds).
 */
export function findMostCommonInterval(intervals: number[]): number {
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

/**
 * Build a VotingHistory summary from raw confirmation rows.
 *
 * Cluster / timing-pattern detection is left as a simplified stub because the
 * upstream code still stubs it.
 */
export function summarizeVotingHistory(votes: EventConfirmationRow[]): VotingHistory {
  const totalVotes = votes.length
  const confirmVotes = votes.filter(v => v.confirmation_type === 'confirm').length
  const disputeVotes = votes.filter(v => v.confirmation_type === 'dispute').length

  // Calculate consensus alignment (simplified)
  const consensusAlignment = 0.5 // Would need actual consensus data

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
    votingClusters: [],
    timingPatterns: [],
    targetVoting
  }
}

/**
 * Map event-confirmations into network-connection objects.
 */
export function mapNetworkConnections(
  rows: EventConfirmationRow[] | null
): NetworkConnection[] {
  return (rows || []).map(connection => ({
    connectedUserId: connection.event_id, // Simplified - would need proper relation
    connectionType: connection.confirmation_type as NetworkConnection['connectionType'],
    timestamp: new Date(connection.created_at),
    trustWeight: connection.trust_weight ?? 0,
    reciprocity: false // Would need additional analysis
  }))
}

/**
 * Build a ReportingHistory summary from raw emergency-event rows.
 */
export function summarizeReportingHistory(reports: EmergencyEventRow[]): ReportingHistory {
  const totalReports = reports.length
  const confirmedReports = reports.filter(r => r.status === 'resolved').length
  const disputedReports = reports.filter(r => r.status === 'disputed').length

  const severities = reports.map(r => severityToNumber(r.severity))
  const averageSeverity =
    severities.reduce((sum, s) => sum + s, 0) / severities.length || 0

  return {
    totalReports,
    confirmedReports,
    disputedReports,
    averageSeverity,
    reportClusters: [],
    locationProximity: []
  }
}

/**
 * Map raw location rows into LocationHistory entries.
 */
export function mapLocationHistory(
  locations: Pick<UserProfileRow, 'last_known_location' | 'updated_at'>[]
): LocationHistory[] {
  return locations.map(loc => {
    const coords = parseLocation(loc.last_known_location ?? '')
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

/**
 * Compute a composite risk score from a user's behavioral sub-profiles.
 */
export function calculateRiskScore(profile: {
  activityPattern: ActivityPattern
  networkConnections: NetworkConnection[]
  votingHistory: VotingHistory
  reportingHistory: ReportingHistory
  locationHistory: LocationHistory[]
  trustScore: number
}): number {
  let riskScore = 0.5 // Base risk score

  if (profile.activityPattern.automatedBehavior) {
    riskScore += 0.2
  }
  if (
    profile.activityPattern.burstActivityCount >
    DETECTION_CONFIG.behavior.burstActivityThreshold
  ) {
    riskScore += 0.15
  }
  if (profile.activityPattern.consistentTiming) {
    riskScore += 0.1
  }

  if (
    profile.networkConnections.length < DETECTION_CONFIG.network.isolationThreshold
  ) {
    riskScore += 0.1
  }

  if (
    profile.votingHistory.consensusAlignment <
    DETECTION_CONFIG.voting.consensusAlignmentThreshold
  ) {
    riskScore += 0.15
  }

  if (profile.reportingHistory.totalReports > 50) {
    riskScore += 0.1
  }

  if (
    profile.trustScore <
    DETECTION_CONFIG.accountCreation.suspiciousTrustScoreThreshold
  ) {
    riskScore += 0.2
  }

  return Math.min(1.0, Math.max(0.0, riskScore))
}

/**
 * Detect Sybil flags from a behavioral profile.
 */
export function detectSybilFlags(profile: {
  activityPattern: ActivityPattern
  networkConnections: NetworkConnection[]
  votingHistory: VotingHistory
}): SybilFlag[] {
  const flags: SybilFlag[] = []

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

/**
 * Detect a burst of new-account creations within the last hour.
 */
export function detectAccountCreationBurstFromRows(
  recentUsers: UserProfileRow[]
): CoordinatedAttackResult {
  if (recentUsers.length > DETECTION_CONFIG.accountCreation.maxAccountsPerHour) {
    const suspiciousUsers = recentUsers.filter(
      user =>
        user.trust_score <
        DETECTION_CONFIG.accountCreation.suspiciousTrustScoreThreshold
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
            averageTrustScore:
              suspiciousUsers.reduce((sum, u) => sum + u.trust_score, 0) /
              suspiciousUsers.length
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

/** An attack that was not detected — the empty result. */
export const NO_ATTACK_DETECTED: CoordinatedAttackResult = {
  detected: false,
  attackType: '',
  involvedUsers: [],
  confidence: 0,
  evidence: []
}

/**
 * Convert a severity string to a numeric weight.
 */
export function severityToNumber(severity: string): number {
  const severityMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  }
  return severityMap[severity] || 2
}

/**
 * Parse a PostGIS POINT string into a lat/lng pair.
 */
export function parseLocation(locationString: string): { lat: number; lng: number } {
  const match = locationString.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
  if (match && match[1] && match[2]) {
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2])
    }
  }
  return { lat: 0, lng: 0 }
}

/**
 * Map a numeric risk score to a categorical risk level.
 */
export function getRiskLevel(
  riskScore: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore < 0.3) {
    return 'low'
  }
  if (riskScore < 0.6) {
    return 'medium'
  }
  if (riskScore < 0.8) {
    return 'high'
  }
  return 'critical'
}

/**
 * Generate human-readable recommendations for a user profile.
 */
export function generateRecommendations(profile: {
  activityPattern: ActivityPattern
  networkConnections: NetworkConnection[]
  votingHistory: VotingHistory
  trustScore: number
}): string[] {
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
