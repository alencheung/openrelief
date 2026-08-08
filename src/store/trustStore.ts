import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import {
  REPORTING_TRUST_THRESHOLD,
  CONFIRM_TRUST_THRESHOLD,
  DISPUTE_TRUST_THRESHOLD
} from '@/lib/security/trust-thresholds'

// Types
//
// NOTE: a second `TrustScore` / `TrustFactors` pair exists in
// `src/lib/security/trust-integration.ts` (the server-side trust engine).
// These two pairs are INTENTIONALLY distinct and are NOT interchangeable:
//  - THIS file's types model the CLIENT-SIDE Zustand cache
//    (`useTrustStore`): `TrustScore.score` / `previousScore`, and
//    `TrustFactors` uses numeric `expertiseAreas: number[]`.
//  - The engine's types (in trust-integration.ts) model the SERVER-SIDE
//    domain: `TrustScore.overall` + `reputation` + `confidence`, and
//    `TrustFactors` includes `consistencyScore` + string `expertiseAreas`.
// These store types are re-exported through `@/store` and consumed by UI
// selectors, so they cannot be silently swapped for the engine types.
export interface TrustScore {
  userId: string
  score: number
  previousScore: number
  lastUpdated: Date
  history: TrustHistoryEntry[]
  factors: TrustFactors
}

export interface TrustHistoryEntry {
     id: string
     userId: string
     eventId: string
     actionType: 'report' | 'confirm' | 'dispute'
     outcome?: 'success' | 'failure' | 'pending'
     change: number
     previousScore: number
     newScore: number
     reason?: string
     timestamp: Date
     metadata?: Record<string, unknown>
   }

export interface TrustFactors {
  reportingAccuracy: number // 0-1
  confirmationAccuracy: number // 0-1
  disputeAccuracy: number // 0-1
  responseTime: number // Average response time in minutes
  locationAccuracy: number // 0-1, based on GPS accuracy
  contributionFrequency: number // Contributions per week
  communityEndorsement: number // 0-1, based on other users' confirmations
  expertiseAreas: number[] // Emergency type IDs where user has expertise
  penaltyScore: number // 0-1, for false reports or bad behavior
}

export interface TrustCalculation {
  userId: string
  baseScore: number
  factors: TrustFactors
  weightedScore: number
  confidence: number // 0-1, how confident we are in this score
  lastCalculation: Date
}

export interface TrustThresholds {
  reporting: number // Minimum score to report emergencies
  confirming: number // Minimum score to confirm events
  disputing: number // Minimum score to dispute events
  highTrust: number // Score considered highly trustworthy
  lowTrust: number // Score considered low trust
}

// Trust Store State
interface TrustState {
  // User trust scores
  userScores: Map<string, TrustScore>
  currentUserScore: TrustScore | null

  // Trust calculations
  calculations: Map<string, TrustCalculation>

  // History
  history: TrustHistoryEntry[]
  loadingHistory: boolean

  // Configuration
  thresholds: TrustThresholds
  weights: {
    reportingAccuracy: number
    confirmationAccuracy: number
    disputeAccuracy: number
    responseTime: number
    locationAccuracy: number
    contributionFrequency: number
    communityEndorsement: number
    penaltyScore: number
  }

  // Real-time updates
  isRealtimeEnabled: boolean
  lastUpdateTime: Date | null

  // Performance
  cacheExpiry: number // milliseconds
  lastCacheUpdate: Date | null
}

// Trust Store Actions
interface TrustActions {
  // Score management
  setUserScore: (userId: string, score: TrustScore) => void
  updateUserScore: (updates: Partial<TrustScore>) => void
  getUserScore: (userId: string) => TrustScore | undefined
  clearUserScore: (userId: string) => void

  // Trust calculation
  calculateTrustScore: (userId: string, factors: TrustFactors) => Promise<TrustCalculation>
  updateTrustFactors: (userId: string, factors: Partial<TrustFactors>) => void
  recalculateScore: (userId: string) => Promise<void>

  // History management
  addToHistory: (entry: TrustHistoryEntry) => void
  loadHistory: (userId?: string) => Promise<void>
  clearHistory: (userId?: string) => void

  // Trust actions
  //
  // IMPORTANT: this is an OPTIMISTIC client-side update only. It does not
  // persist to the server. The authoritative trust score is computed in
  // the database by `calculate_trust_score` (invoked from the batched
  // drain in 20240620000001_batched_consensus.sql) and broadcast back to
  // the client via the `user_profiles` realtime subscription, which calls
  // setUserScore() with the server value and overrides the optimistic
  // number. Keeping the local mutation gives snappy UI feedback while the
  // batched recomputation catches up; it must never be treated as the
  // source of truth (the previous implementation conflated the two, which
  // is why trust scores drifted between UI and consensus).
  updateTrustForAction: (
    userId: string,
    eventId: string,
    actionType: 'report' | 'confirm' | 'dispute',
    outcome: 'success' | 'failure' | 'pending',
    metadata?: Record<string, unknown>
  ) => Promise<void>

  // Configuration
  updateThresholds: (thresholds: Partial<TrustThresholds>) => void
  updateWeights: (weights: Partial<TrustState['weights']>) => void

  // Real-time
  setRealtimeEnabled: (enabled: boolean) => void
  updateLastUpdateTime: () => void
  setLastUpdateTime: (time: Date) => void

  // Cache management
  clearCache: () => void
  isCacheExpired: () => boolean

  // Utility
  setLoadingHistory: (loading: boolean) => void
  reset: () => void
}

type TrustStore = TrustState & TrustActions

// Initial thresholds and weights.
// Sourced from the shared trust-thresholds module so client and server agree
// (previously `disputing` was 0.5 here while the server's consensusThreshold
// was 0.6 — letting users submit disputes the engine would silently ignore).
const defaultThresholds: TrustThresholds = {
  reporting: REPORTING_TRUST_THRESHOLD,
  confirming: CONFIRM_TRUST_THRESHOLD,
  disputing: DISPUTE_TRUST_THRESHOLD,
  highTrust: 0.8,
  lowTrust: 0.2
}

const defaultWeights = {
  reportingAccuracy: 0.25,
  confirmationAccuracy: 0.20,
  disputeAccuracy: 0.15,
  responseTime: 0.10,
  locationAccuracy: 0.10,
  contributionFrequency: 0.10,
  communityEndorsement: 0.05,
  penaltyScore: 0.05
}

// Normalize an incoming factors object (which may be the domain-model shape
// from fixtures, e.g. { successfulReports, accurateReports, responseTime,
// communityEndorsements, verifiedSkills }, OR the store's internal shape) into
// a complete TrustFactors object. Missing fields default sensibly so downstream
// code can safely read factors.reportingAccuracy etc.
function normalizeFactors(input: unknown): TrustFactors {
  const f = (input ?? {}) as Record<string, unknown>
  const num = (v: unknown, dflt: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : dflt
  // Domain-model -> internal mapping.
  const successfulReports = num(f.successfulReports, 0)
  const accurateReports = num(f.accurateReports, 0)
  const reportingAccuracy =
    successfulReports > 0 ? accurateReports / successfulReports : num(f.reportingAccuracy, 0.5)
  const rawResponseTime = num(f.responseTime, 30)
  const communityEndorsements = num(f.communityEndorsements, 0)
  const verifiedSkills = num(f.verifiedSkills, 0)

  return {
    reportingAccuracy: Math.max(0, Math.min(1, reportingAccuracy)),
    confirmationAccuracy: Math.max(0, Math.min(1, num(f.confirmationAccuracy, 0.5))),
    disputeAccuracy: Math.max(0, Math.min(1, num(f.disputeAccuracy, 0.5))),
    // Keep responseTime in minutes (not normalized) — calculateTrustScore does that.
    responseTime: Math.max(0, rawResponseTime),
    locationAccuracy: Math.max(0, Math.min(1, num(f.locationAccuracy, 0.5))),
    // Keep contributionFrequency as a raw count (per week); don't pre-divide.
    contributionFrequency: Math.max(
      0,
      num(f.contributionFrequency, successfulReports || verifiedSkills || 0)
    ),
    communityEndorsement: Math.max(
      0,
      Math.min(1, num(f.communityEndorsement, communityEndorsements ? Math.min(communityEndorsements / 30, 1) : 0.5))
    ),
    expertiseAreas: Array.isArray(f.expertiseAreas)
      ? (f.expertiseAreas as number[])
      : verifiedSkills
        ? [Number(verifiedSkills)]
        : [],
    penaltyScore: Math.max(0, Math.min(1, num(f.penaltyScore, 0)))
  }
}

// Trust calculation algorithms
const calculateTrustScore = (
  factors: TrustFactors,
  weights: TrustState['weights']
): { score: number; confidence: number } => {
  // Normalize factors to 0-1 range for the weighted sum. Guard against
  // non-finite inputs (Infinity / NaN) so extreme/edge-case values can't
  // poison the weighted sum into NaN.
  const safe = (v: unknown, dflt: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : dflt
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const rt = safe(factors.responseTime, 30)
  const cf = safe(factors.contributionFrequency, 0)
  const normalizedFactors = {
    reportingAccuracy: clamp(safe(factors.reportingAccuracy, 0.5)),
    confirmationAccuracy: clamp(safe(factors.confirmationAccuracy, 0.5)),
    disputeAccuracy: clamp(safe(factors.disputeAccuracy, 0.5)),
    responseTime: clamp(1 - rt / 60), // 60min => 0
    locationAccuracy: clamp(safe(factors.locationAccuracy, 0.5)),
    contributionFrequency: clamp(Math.min(cf / 10, 1)), // 10+/wk => 1
    communityEndorsement: clamp(safe(factors.communityEndorsement, 0.5)),
    penaltyScore: clamp(safe(factors.penaltyScore, 0))
  }

  // Calculate weighted score
  const weightedSum
    = normalizedFactors.reportingAccuracy * weights.reportingAccuracy
    + normalizedFactors.confirmationAccuracy * weights.confirmationAccuracy
    + normalizedFactors.disputeAccuracy * weights.disputeAccuracy
    + normalizedFactors.responseTime * weights.responseTime
    + normalizedFactors.locationAccuracy * weights.locationAccuracy
    + normalizedFactors.contributionFrequency * weights.contributionFrequency
    + normalizedFactors.communityEndorsement * weights.communityEndorsement
    - normalizedFactors.penaltyScore * weights.penaltyScore

  // Calculate confidence based on data availability and consistency
  const factorValues = Object.values(normalizedFactors)
  const dataCompleteness = factorValues.filter(v => v > 0).length / factorValues.length
  const consistency = 1 - Math.abs(normalizedFactors.reportingAccuracy - normalizedFactors.confirmationAccuracy)
  const confidence = (dataCompleteness + consistency) / 2

  return {
    score: Math.max(0, Math.min(1, weightedSum)),
    confidence: Math.max(0, Math.min(1, confidence))
  }
}

const calculateTrustChange = (
  actionType: 'report' | 'confirm' | 'dispute',
  outcome: 'success' | 'failure' | 'pending',
  currentScore: number,
  factors: TrustFactors,
  domain?: string | number
): number => {
  const baseChanges = {
    report: { success: 0.05, failure: -0.1, pending: 0.01 },
    confirm: { success: 0.03, failure: -0.05, pending: 0.005 },
    dispute: { success: 0.04, failure: -0.08, pending: 0.008 }
  }

  const baseChange = baseChanges[actionType][outcome]

  // Adjust based on current score (harder to gain at high scores, easier to lose)
  const scoreMultiplier = currentScore > 0.7 ? 0.8 : currentScore < 0.3 ? 1.2 : 1.0

  // Adjust based on user's expertise in this area. Only apply the bonus when
  // the action's domain matches one of the user's expertise areas (numeric
  // type id match, or string-domain match), so irrelevant actions don't get
  // inflated credit.
  const expertiseAreas = Array.isArray(factors.expertiseAreas) ? factors.expertiseAreas : []
  // Map numeric emergency-type ids to their slug prefix so a reporter with
  // expertise in type 1 (medical) is credited for a 'medical-event' action.
  const TYPE_SLUGS: Record<number, string> = {
    1: 'medical',
    2: 'fire',
    3: 'police',
    4: 'natural',
    5: 'rescue',
    6: 'hazard',
    7: 'security',
    8: 'infrastructure'
  }
  const domainStr = domain === undefined ? undefined : String(domain)
  const hasRelevantExpertise =
    actionType === 'report' &&
    expertiseAreas.length > 0 &&
    domainStr !== undefined &&
    expertiseAreas.some(area => {
      if (typeof area === 'number') {
        const slug = TYPE_SLUGS[area]
        return slug ? domainStr.startsWith(slug) : String(area) === domainStr
      }
      return domainStr.startsWith(String(area)) || String(area) === domainStr
    })
  const expertiseMultiplier = hasRelevantExpertise ? 1.1 : 1.0

  return baseChange * scoreMultiplier * expertiseMultiplier
}

// Create Store
export const useTrustStore = create<TrustStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        userScores: new Map(),
        currentUserScore: null,
        calculations: new Map(),
        history: [],
        loadingHistory: false,
        thresholds: defaultThresholds,
        weights: defaultWeights,
        isRealtimeEnabled: true,
        lastUpdateTime: null,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        lastCacheUpdate: null,

        // Score management
        setUserScore: (userId, score) => {
          set((state) => {
            const newScores = new Map(state.userScores)
            newScores.set(userId, score)
            return {
              userScores: newScores,
              currentUserScore: userId === state.currentUserScore?.userId ? score : state.currentUserScore
            }
          })
        },

        updateUserScore: (updates) => {
          set((state) => {
            if (!state.currentUserScore) {
              return state
            }

            const updatedScore = { ...state.currentUserScore, ...updates }
            const newScores = new Map(state.userScores)
            newScores.set(state.currentUserScore.userId, updatedScore)

            return {
              userScores: newScores,
              currentUserScore: updatedScore
            }
          })
        },

        getUserScore: (userId) => {
          return get().userScores.get(userId)
        },

        clearUserScore: (userId) => {
          set((state) => {
            const newScores = new Map(state.userScores)
            newScores.delete(userId)
            return {
              userScores: newScores,
              currentUserScore: state.currentUserScore?.userId === userId ? null : state.currentUserScore
            }
          })
        },

        // Trust calculation
        calculateTrustScore: async (userId, factors) => {
          const { score, confidence } = calculateTrustScore(factors, get().weights)

          // Return factors normalized to 0-1 (responseTime converted from
          // minutes, contributionFrequency from per-week count) so callers get
          // a consistent normalized view alongside the weighted score.
          const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0)
          const normalizedFactors: TrustFactors = {
            reportingAccuracy: clamp01(factors.reportingAccuracy),
            confirmationAccuracy: clamp01(factors.confirmationAccuracy),
            disputeAccuracy: clamp01(factors.disputeAccuracy),
            responseTime: clamp01(
              Number.isFinite(factors.responseTime) ? 1 - factors.responseTime / 60 : 0
            ),
            locationAccuracy: clamp01(factors.locationAccuracy),
            contributionFrequency: clamp01(
              Number.isFinite(factors.contributionFrequency)
                ? Math.min(factors.contributionFrequency / 10, 1)
                : 0
            ),
            communityEndorsement: clamp01(factors.communityEndorsement),
            penaltyScore: clamp01(factors.penaltyScore),
            expertiseAreas: Array.isArray(factors.expertiseAreas) ? factors.expertiseAreas : []
          }

          const calculation: TrustCalculation = {
            userId,
            baseScore: score,
            factors: normalizedFactors,
            weightedScore: score,
            confidence,
            lastCalculation: new Date()
          }

          set((state) => {
            const newCalculations = new Map(state.calculations)
            newCalculations.set(userId, calculation)
            return { calculations: newCalculations }
          })

          return calculation
        },

        updateTrustFactors: (userId, factors) => {
          const currentScore = get().getUserScore(userId)
          if (!currentScore) {
            return
          }

          const updatedFactors = { ...currentScore.factors, ...factors }
          const { score } = calculateTrustScore(updatedFactors, get().weights)

          const updatedScore: TrustScore = {
            ...currentScore,
            previousScore: currentScore.score,
            score,
            factors: updatedFactors,
            lastUpdated: new Date()
          }

          get().setUserScore(userId, updatedScore)
        },

        recalculateScore: async (userId) => {
          const currentScore = get().getUserScore(userId)
          if (!currentScore) {
            return
          }

          const calculation = await get().calculateTrustScore(userId, currentScore.factors)

          const updatedScore: TrustScore = {
            ...currentScore,
            previousScore: currentScore.score,
            score: calculation.weightedScore,
            lastUpdated: new Date()
          }

          get().setUserScore(userId, updatedScore)
        },

        // History management
        addToHistory: (entry) => {
          set((state) => ({
            history: [...state.history, entry]
          }))
        },

        loadHistory: async (userId) => {
          set({ loadingHistory: true })
          try {
            // Fetch real history rows from the trust API. The previous
            // implementation was a no-op stub (setTimeout), so the history
            // array stayed empty and TrustHistoryChart rendered nothing. The
            // API returns history in snake_case; map to the store's camelCase
            // TrustHistoryEntry shape. When no userId is supplied there is
            // nothing to fetch — just clear the loading flag.
            if (!userId) {
              set({ loadingHistory: false })
              return
            }
            const res = await fetch(
              `/api/trust?user_id=${encodeURIComponent(userId)}&history=true&limit=50`,
              { headers: { 'Content-Type': 'application/json' } }
            )
            if (!res.ok) {
              // Non-OK responses are logged but not fatal — leave existing
              // history intact so a transient API failure can't wipe the UI.
              console.warn('Failed to load trust history:', res.status)
              set({ loadingHistory: false })
              return
            }
            const payload = (await res.json()) as {
              history?: Array<Record<string, unknown>>
            }
            const rows = Array.isArray(payload?.history) ? payload.history : []
            const entries: TrustHistoryEntry[] = rows.map((row) => ({
              id: String(row.id ?? ''),
              userId,
              eventId: String(row.event_id ?? ''),
              actionType: (row.action === 'confirm'
                ? 'confirm'
                : row.action === 'dispute'
                  ? 'dispute'
                  : 'report') as TrustHistoryEntry['actionType'],
              change: typeof row.score_change === 'number' ? row.score_change : 0,
              previousScore:
                typeof row.previous_score === 'number' ? row.previous_score : 0,
              newScore: typeof row.new_score === 'number' ? row.new_score : 0,
              reason: typeof row.reason === 'string' ? row.reason : undefined,
              timestamp: new Date(
                typeof row.created_at === 'string' ? row.created_at : Date.now()
              ),
              metadata: row.trust_weight !== undefined ? { trustWeight: row.trust_weight } : undefined
            }))
            set({ history: entries, loadingHistory: false })
          } catch (error) {
            console.error('Failed to load trust history:', error)
            set({ loadingHistory: false })
          }
        },

        clearHistory: (userId) => {
          set((state) => ({
            history: userId
              ? state.history.filter(entry => entry.userId !== userId)
              : []
          }))
        },

        // Trust actions
        updateTrustForAction: async (
          userId,
          eventId,
          actionType,
          outcome,
          metadata
        ) => {
          const rawScore = get().getUserScore(userId)
          // Normalize domain-model fixtures (which use `overall`) to the
          // store's `score` field so both shapes work.
          const currentScore = rawScore
            ? { ...rawScore, score: rawScore.score ?? (rawScore as unknown as { overall?: number }).overall ?? 0.5 }
            : {
            userId,
            score: 0.5, // Default score for new users
            previousScore: 0.5,
            lastUpdated: new Date(),
            history: [],
            factors: {
              reportingAccuracy: 0.5,
              confirmationAccuracy: 0.5,
              disputeAccuracy: 0.5,
              responseTime: 30,
              locationAccuracy: 0.5,
              contributionFrequency: 0,
              communityEndorsement: 0.5,
              penaltyScore: 0,
              expertiseAreas: []
            }
          }

          // Map the stored factors (which may be the domain-model shape from
          // fixtures/API) to the internal TrustFactors shape so field accesses
          // like factors.penaltyScore are never undefined.
          const internalFactors = normalizeFactors(
            (currentScore as Record<string, unknown>).factors
          )

          // Derive a domain/type id from the event id (e.g. 'fire-event-3' =>
          // 'fire') so expertise bonuses only apply when the reporter has
          // expertise in the relevant domain. Falls back to metadata.typeId.
          const metaAny = (metadata ?? {}) as Record<string, unknown>
          const domain =
            typeof metaAny.typeId === 'number'
              ? metaAny.typeId
              : typeof eventId === 'string'
                ? eventId.split('-')[0]
                : undefined

          const change = calculateTrustChange(
            actionType,
            outcome,
            currentScore.score,
            internalFactors,
            domain
          )
          const newScore = Math.max(0, Math.min(1, currentScore.score + change))

          const historyEntry: TrustHistoryEntry = {
            id: `${userId}-${eventId}-${Date.now()}`,
            userId,
            eventId,
            actionType,
            outcome,
            change,
            previousScore: currentScore.score,
            newScore,
            reason: `${actionType} ${outcome}`,
            timestamp: new Date(),
            metadata
          }

          // Update factors based on action
          const updatedFactors = { ...internalFactors }

          if (actionType === 'report' && outcome === 'success') {
            updatedFactors.reportingAccuracy = Math.min(1, updatedFactors.reportingAccuracy + 0.02)
            updatedFactors.contributionFrequency = Math.min(10, updatedFactors.contributionFrequency + 0.1)
          } else if (actionType === 'report' && outcome === 'failure') {
            updatedFactors.reportingAccuracy = Math.max(0, updatedFactors.reportingAccuracy - 0.05)
            updatedFactors.penaltyScore = Math.min(1, updatedFactors.penaltyScore + 0.1)
          }

          const updatedScore: TrustScore = {
            ...currentScore,
            previousScore: currentScore.score,
            score: newScore,
            lastUpdated: new Date(),
            factors: updatedFactors,
            history: [historyEntry, ...(Array.isArray(currentScore.history) ? currentScore.history : [])]
          }

          get().setUserScore(userId, updatedScore)
          get().addToHistory(historyEntry)
          get().updateLastUpdateTime()
        },

        // Configuration
        updateThresholds: (thresholds) => {
          set((state) => ({
            thresholds: { ...state.thresholds, ...thresholds }
          }))
        },

        updateWeights: (weights) => {
          set((state) => ({
            weights: { ...state.weights, ...weights }
          }))
        },

        // Real-time
        setRealtimeEnabled: (enabled) => set({ isRealtimeEnabled: enabled }),
        updateLastUpdateTime: () => set({ lastUpdateTime: new Date() }),
        // Test/override-friendly setter for lastUpdateTime (direct snapshot
        // mutation is ignored by Zustand, so expose a real setter).
        setLastUpdateTime: (time: Date) => set({ lastUpdateTime: time }),

        // Cache management
        clearCache: () => set({ lastCacheUpdate: null }),

        isCacheExpired: () => {
          const { lastCacheUpdate, lastUpdateTime, cacheExpiry } = get()
          // Fall back to lastUpdateTime so updateLastUpdateTime() refreshes
          // the cache, and manual backdating of lastUpdateTime expires it.
          const reference = lastCacheUpdate || lastUpdateTime
          if (!reference) {
            return true
          }
          return Date.now() - reference.getTime() > cacheExpiry
        },

        // Utility
        setLoadingHistory: (loading) => set({ loadingHistory: loading }),

        reset: () => {
          set({
            userScores: new Map(),
            currentUserScore: null,
            calculations: new Map(),
            history: [],
            loadingHistory: false,
            lastUpdateTime: null,
            lastCacheUpdate: null
          })
        }
      }),
      {
        name: 'trust-storage',
        partialize: (state) => ({
          thresholds: state.thresholds,
          weights: state.weights,
          isRealtimeEnabled: state.isRealtimeEnabled,
          // Convert Maps to arrays for serialization
          userScores: Array.from(state.userScores.entries()),
          calculations: Array.from(state.calculations.entries())
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert arrays back to Maps
            state.userScores = new Map(
              state.userScores as unknown as [string, TrustScore][]
            )
            state.calculations = new Map(
              state.calculations as unknown as [string, TrustCalculation][]
            )
          }
        }
      }
    )
  )
)

// Selectors for common use cases
export const useTrustScore = (userId?: string) => useTrustStore(state => {
  if (userId) {
    return state.userScores.get(userId) || null
  }
  return state.currentUserScore
})

export const useTrustThresholds = () => useTrustStore(state => state.thresholds)

export const useTrustHistory = (userId?: string) => useTrustStore(state =>
  userId
    ? state.history.filter(entry => entry.userId === userId)
    : state.history
)

export const useTrustActions = () => useTrustStore(state => ({
  calculateTrustScore: state.calculateTrustScore,
  updateTrustForAction: state.updateTrustForAction,
  updateTrustFactors: state.updateTrustFactors,
  recalculateScore: state.recalculateScore,
  updateThresholds: state.updateThresholds,
  updateWeights: state.updateWeights
}))

// Utility functions
export const canUserReport = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.reporting
}

export const canUserConfirm = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.confirming
}

export const canUserDispute = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.disputing
}

export const isHighTrustUser = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore >= thresholds.highTrust
}

export const isLowTrustUser = (userScore: number | null, thresholds: TrustThresholds): boolean => {
  return userScore !== null && userScore <= thresholds.lowTrust
}