/**
 * Trust Score Integration Types for OpenRelief
 *
 * Type definitions extracted from trust-integration.
 *
 * NOTE: there is a second `TrustScore` / `TrustFactors` pair in
 * `src/store/trustStore.ts`. The two are INTENTIONALLY distinct models and
 * are NOT interchangeable:
 *  - These types model the SERVER-SIDE trust domain used by the trust
 *    engine (`trustScoreManager`): `TrustScore.overall` + `reputation` +
 *    `confidence`, and `TrustFactors` includes `consistencyScore`.
 *  - The store's types model the CLIENT-SIDE Zustand cache
 *    (`useTrustStore`): `TrustScore.score` / `previousScore`, and
 *    `TrustFactors` uses numeric `expertiseAreas: number[]`.
 * Merging them would break either the engine or the UI selectors that read
 * `score`/`previousScore`. If you need the engine type in a new module,
 * import it from here; if you need the store/cache type, import it from
 * `@/store`.
 */

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

/**
 * Action context: free-form metadata describing the action being scored.
 * Kept as `Record<string, unknown>` because callers (middleware, API routes)
 * pass heterogeneous payloads that are persisted verbatim into history and
 * logged for forensic review.
 */
export type ActionContext = Record<string, unknown>

/**
 * Impact of a scored action on a single trust factor.
 */
export interface ActionImpact {
  impact: number
  reason: string
  factor: keyof TrustFactors
}

/**
 * Data payload adjusted by attack-resistance. Includes optional trust-derived
 * flags that downstream consumers read to gate behavior.
 */
export interface AdjustedData {
  [key: string]: unknown
  trustWarning?: string
  requiresVerification?: boolean
  trustLimited?: boolean
  maxImpact?: number
}
