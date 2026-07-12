/**
 * Type definitions for the Sybil Attack Prevention System.
 *
 * Extracted from sybil-prevention.ts so the engine file stays focused on
 * detection logic and stays under the 500 line lint budget.
 */

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
  evidence: Record<string, unknown>
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

/**
 * Row shapes for the Supabase tables read by this engine. These describe only
 * the columns the code below actually accesses; they are intentionally narrow
 * rather than mirroring the full generated `Database` types so that field
 * accesses stay auditable.
 */
export interface UserProfileRow {
  user_id: string
  trust_score: number
  created_at: string
  updated_at: string
  last_activity?: string
  last_known_location?: string | null
  status?: string
}

export interface AuditLogRow {
  action: string
  timestamp: string
}

export interface EventConfirmationRow {
  event_id: string
  confirmation_type: string
  created_at: string
  trust_weight?: number
}

export interface EmergencyEventRow {
  status: string
  severity: string
}

/** An activity-log entry reduced to the two fields used for timing analysis. */
export interface TimedAction {
  action: string
  timestamp: number
}

/**
 * Result of a coordinated-attack detection sub-scan. Used as the shared return
 * shape of detectAccountCreationBurst / detectCoordinatedVoting / etc.
 */
export interface CoordinatedAttackResult {
  detected: boolean
  attackType: string
  involvedUsers: string[]
  confidence: number
  evidence: Record<string, unknown>[]
}

/**
 * Public result shape returned by detectCoordinatedAttacks().
 */
export interface CoordinatedAttackDetection {
  attackDetected: boolean
  attackType: string
  involvedUsers: string[]
  confidence: number
  evidence: Record<string, unknown>[]
}

/**
 * Public result shape returned by getUserRiskAssessment().
 */
export interface UserRiskAssessment {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  flags: SybilFlag[]
  recommendations: string[]
}
