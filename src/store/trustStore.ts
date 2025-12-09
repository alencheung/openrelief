import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { Database } from '@/types/database'

// Types
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
  change: number
  previousScore: number
  newScore: number
  reason?: string
  timestamp: Date
  metadata?: any
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
  updateTrustForAction: (
    userId: string,
    eventId: string,
    actionType: 'report' | 'confirm' | 'dispute',
    outcome: 'success' | 'failure' | 'pending',
    metadata?: any
  ) => Promise<void>

  // Configuration
  updateThresholds: (thresholds: Partial<TrustThresholds>) => void
  updateWeights: (weights: Partial<TrustState['weights']>) => void

  // Real-time
  setRealtimeEnabled: (enabled: boolean) => void
  updateLastUpdateTime: () => void

  // Cache management
  clearCache: () => void
  isCacheExpired: () => boolean

  // Utility
  setLoadingHistory: (loading: boolean) => void
  reset: () => void
}

type TrustStore = TrustState & TrustActions

// Initial thresholds and weights
const defaultThresholds: TrustThresholds = {
  reporting: 0.3,
  confirming: 0.4,
  disputing: 0.5,
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

// Trust calculation algorithms
const calculateTrustScore = (
  factors: TrustFactors,
  weights: TrustState['weights']
): { score: number; confidence: number } => {
  // Normalize factors to 0-1 range
  const normalizedFactors = {
    reportingAccuracy: Math.max(0, Math.min(1, factors.reportingAccuracy)),
    confirmationAccuracy: Math.max(0, Math.min(1, factors.confirmationAccuracy)),
    disputeAccuracy: Math.max(0, Math.min(1, factors.disputeAccuracy)),
    responseTime: Math.max(0, Math.min(1, 1 - (factors.responseTime / 60))), // Convert to 0-1 (60min = 0)
    locationAccuracy: Math.max(0, Math.min(1, factors.locationAccuracy)),
    contributionFrequency: Math.max(0, Math.min(1, Math.min(factors.contributionFrequency / 10, 1))), // 10+ per week = 1
    communityEndorsement: Math.max(0, Math.min(1, factors.communityEndorsement)),
    penaltyScore: Math.max(0, Math.min(1, factors.penaltyScore))
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
  const dataCompleteness = Object.values(normalizedFactors).filter(v => v > 0).length / Object.keys(normalizedFactors).length
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
  factors: TrustFactors
): number => {
  const baseChanges = {
    report: { success: 0.05, failure: -0.1, pending: 0.01 },
    confirm: { success: 0.03, failure: -0.05, pending: 0.005 },
    dispute: { success: 0.04, failure: -0.08, pending: 0.008 }
  }

  const baseChange = baseChanges[actionType][outcome]

  // Adjust based on current score (harder to gain at high scores, easier to lose)
  const scoreMultiplier = currentScore > 0.7 ? 0.8 : currentScore < 0.3 ? 1.2 : 1.0

  // Adjust based on user's expertise in this area
  const expertiseMultiplier = actionType === 'report' && factors.expertiseAreas.length > 0 ? 1.1 : 1.0

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

          const calculation: TrustCalculation = {
            userId,
            baseScore: score,
            factors,
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
            history: [entry, ...state.history]
          }))
        },

        loadHistory: async (userId) => {
          set({ loadingHistory: true })
          try {
            // This would typically fetch from Supabase
            // For now, we'll simulate loading
            await new Promise(resolve => setTimeout(resolve, 500))
            set({ loadingHistory: false })
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
          const currentScore = get().getUserScore(userId) || {
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

          const change = calculateTrustChange(actionType, outcome, currentScore.score, currentScore.factors)
          const newScore = Math.max(0, Math.min(1, currentScore.score + change))

          const historyEntry: TrustHistoryEntry = {
            id: `${userId}-${eventId}-${Date.now()}`,
            userId,
            eventId,
            actionType,
            change,
            previousScore: currentScore.score,
            newScore,
            reason: `${actionType} ${outcome}`,
            timestamp: new Date(),
            metadata
          }

          // Update factors based on action
          const updatedFactors = { ...currentScore.factors }

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
            history: [historyEntry, ...currentScore.history]
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

        // Cache management
        clearCache: () => set({ lastCacheUpdate: null }),

        isCacheExpired: () => {
          const { lastCacheUpdate, cacheExpiry } = get()
          if (!lastCacheUpdate) {
            return true
          }
          return Date.now() - lastCacheUpdate.getTime() > cacheExpiry
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
            state.userScores = new Map(state.userScores as any)
            state.calculations = new Map(state.calculations as any)
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