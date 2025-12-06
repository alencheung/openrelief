/**
 * Tests for Trust Store
 * 
 * These tests verify the functionality of trust score management,
 * including score calculations, history tracking, and user permissions.
 */

import { renderHook, act } from '@testing-library/react'
import { 
  useTrustStore,
  useTrustScore,
  useTrustThresholds,
  useTrustHistory,
  useTrustActions,
  canUserReport,
  canUserConfirm,
  canUserDispute,
  isHighTrustUser,
  isLowTrustUser,
} from '../trustStore'
import { trustScoreData } from '@/test-utils/fixtures/emergencyScenarios'

describe('Trust Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useTrustStore.getState()
    reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTrustStore())
      const state = result.current

      expect(state.userScores).toEqual(new Map())
      expect(state.currentUserScore).toBeNull()
      expect(state.calculations).toEqual(new Map())
      expect(state.history).toEqual([])
      expect(state.loadingHistory).toBe(false)

      expect(state.thresholds.reporting).toBe(0.3)
      expect(state.thresholds.confirming).toBe(0.4)
      expect(state.thresholds.disputing).toBe(0.5)
      expect(state.thresholds.highTrust).toBe(0.8)
      expect(state.thresholds.lowTrust).toBe(0.2)

      expect(state.weights.reportingAccuracy).toBe(0.25)
      expect(state.weights.confirmationAccuracy).toBe(0.20)
      expect(state.weights.disputeAccuracy).toBe(0.15)
      expect(state.weights.responseTime).toBe(0.10)
      expect(state.weights.locationAccuracy).toBe(0.10)
      expect(state.weights.contributionFrequency).toBe(0.10)
      expect(state.weights.communityEndorsement).toBe(0.05)
      expect(state.weights.penaltyScore).toBe(0.05)

      expect(state.isRealtimeEnabled).toBe(true)
      expect(state.lastUpdateTime).toBeNull()
      expect(state.cacheExpiry).toBe(5 * 60 * 1000)
      expect(state.lastCacheUpdate).toBeNull()
    })
  })

  describe('Score Management', () => {
    describe('setUserScore', () => {
      it('should set user score', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        expect(result.current.userScores.get('user-1')).toEqual(score)
      })

      it('should update current user score if matching', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        expect(result.current.currentUserScore).toEqual(score)
      })

      it('should not update current user score if not matching', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        expect(result.current.currentUserScore).toBeNull()
      })
    })

    describe('updateUserScore', () => {
      it('should update existing user score', () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.highTrust
        const updates = { score: 0.9, lastUpdated: new Date() }

        act(() => {
          result.current.setUserScore('user-1', initialScore)
          result.current.updateUserScore(updates)
        })

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.score).toBe(0.9)
        expect(updatedScore?.lastUpdated).toEqual(updates.lastUpdated)
      })

      it('should not update if no current user score', () => {
        const { result } = renderHook(() => useTrustStore())
        const updates = { score: 0.9 }

        act(() => {
          result.current.updateUserScore(updates)
        })

        expect(result.current.userScores.size).toBe(0)
      })
    })

    describe('getUserScore', () => {
      it('should return user score', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        expect(result.current.getUserScore('user-1')).toEqual(score)
      })

      it('should return undefined for non-existent user', () => {
        const { result } = renderHook(() => useTrustStore())

        expect(result.current.getUserScore('non-existent')).toBeUndefined()
      })
    })

    describe('clearUserScore', () => {
      it('should clear user score', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
          result.current.clearUserScore('user-1')
        })

        expect(result.current.userScores.get('user-1')).toBeUndefined()
      })

      it('should clear current user score if matching', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
          result.current.clearUserScore('user-1')
        })

        expect(result.current.currentUserScore).toBeNull()
      })
    })
  })

  describe('Trust Calculation', () => {
    describe('calculateTrustScore', () => {
      it('should calculate trust score with all factors', async () => {
        const { result } = renderHook(() => useTrustStore())
        const factors = {
          reportingAccuracy: 0.8,
          confirmationAccuracy: 0.9,
          disputeAccuracy: 0.7,
          responseTime: 15, // 15 minutes
          locationAccuracy: 0.85,
          contributionFrequency: 5, // 5 per week
          communityEndorsement: 0.6,
          penaltyScore: 0.1,
          expertiseAreas: [1, 2], // Medical and fire expertise
        }

        const calculation = await result.current.calculateTrustScore('user-1', factors)

        expect(calculation.userId).toBe('user-1')
        expect(calculation.factors).toEqual(factors)
        expect(calculation.baseScore).toBeGreaterThan(0)
        expect(calculation.weightedScore).toBeGreaterThan(0)
        expect(calculation.confidence).toBeGreaterThanOrEqual(0)
        expect(calculation.confidence).toBeLessThanOrEqual(1)
        expect(calculation.lastCalculation).toBeInstanceOf(Date)
      })

      it('should normalize factors correctly', async () => {
        const { result } = renderHook(() => useTrustStore())
        const factors = {
          reportingAccuracy: 1.5, // Should be clamped to 1
          confirmationAccuracy: -0.5, // Should be clamped to 0
          responseTime: 120, // 2 hours = 0 normalized
          contributionFrequency: 15, // Should be clamped to 1
          communityEndorsement: 2, // Should be clamped to 1
          penaltyScore: 1.5, // Should be clamped to 1
          expertiseAreas: [1],
        }

        const calculation = await result.current.calculateTrustScore('user-1', factors)

        expect(calculation.factors.reportingAccuracy).toBe(1)
        expect(calculation.factors.confirmationAccuracy).toBe(0)
        expect(calculation.factors.responseTime).toBe(0)
        expect(calculation.factors.contributionFrequency).toBe(1)
        expect(calculation.factors.communityEndorsement).toBe(1)
        expect(calculation.factors.penaltyScore).toBe(1)
      })

      it('should store calculation result', async () => {
        const { result } = renderHook(() => useTrustStore())
        const factors = {
          reportingAccuracy: 0.8,
          confirmationAccuracy: 0.9,
          disputeAccuracy: 0.7,
          responseTime: 15,
          locationAccuracy: 0.85,
          contributionFrequency: 5,
          communityEndorsement: 0.6,
          penaltyScore: 0.1,
          expertiseAreas: [1],
        }

        await result.current.calculateTrustScore('user-1', factors)

        expect(result.current.calculations.get('user-1')).toBeDefined()
        expect(result.current.calculations.get('user-1')?.userId).toBe('user-1')
      })
    })

    describe('updateTrustFactors', () => {
      it('should update trust factors for user', () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.highTrust
        const factorUpdates = {
          reportingAccuracy: 0.95,
          responseTime: 10,
        }

        act(() => {
          result.current.setUserScore('user-1', initialScore)
          result.current.updateTrustFactors('user-1', factorUpdates)
        })

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.factors.reportingAccuracy).toBe(0.95)
        expect(updatedScore?.factors.responseTime).toBe(10)
        expect(updatedScore?.factors.confirmationAccuracy).toBe(initialScore.factors.confirmationAccuracy)
      })

      it('should not update if user score not found', () => {
        const { result } = renderHook(() => useTrustStore())
        const factorUpdates = { reportingAccuracy: 0.95 }

        act(() => {
          result.current.updateTrustFactors('user-1', factorUpdates)
        })

        expect(result.current.userScores.size).toBe(0)
      })
    })

    describe('recalculateScore', () => {
      it('should recalculate score with existing factors', async () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', initialScore)
        })

        await result.current.recalculateScore('user-1')

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.lastUpdated).not.toEqual(initialScore.lastUpdated)
      })

      it('should not recalculate if user score not found', async () => {
        const { result } = renderHook(() => useTrustStore())

        await result.current.recalculateScore('user-1')

        expect(result.current.userScores.size).toBe(0)
      })
    })
  })

  describe('History Management', () => {
    describe('addToHistory', () => {
      it('should add entry to history', () => {
        const { result } = renderHook(() => useTrustStore())
        const entry = {
          id: 'history-1',
          userId: 'user-1',
          eventId: 'emergency-1',
          actionType: 'report' as const,
          change: 0.05,
          previousScore: 0.8,
          newScore: 0.85,
          timestamp: new Date(),
        }

        act(() => {
          result.current.addToHistory(entry)
        })

        expect(result.current.history).toHaveLength(1)
        expect(result.current.history[0]).toEqual(entry)
      })

      it('should preserve existing history', () => {
        const { result } = renderHook(() => useTrustStore())
        const existingEntry = {
          id: 'history-1',
          userId: 'user-1',
          eventId: 'emergency-1',
          actionType: 'report' as const,
          change: 0.05,
          previousScore: 0.8,
          newScore: 0.85,
          timestamp: new Date(),
        }
        const newEntry = {
          id: 'history-2',
          userId: 'user-1',
          eventId: 'emergency-2',
          actionType: 'confirm' as const,
          change: 0.03,
          previousScore: 0.85,
          newScore: 0.88,
          timestamp: new Date(),
        }

        act(() => {
          result.current.addToHistory(existingEntry)
          result.current.addToHistory(newEntry)
        })

        expect(result.current.history).toHaveLength(2)
        expect(result.current.history[0]).toEqual(existingEntry)
        expect(result.current.history[1]).toEqual(newEntry)
      })
    })

    describe('loadHistory', () => {
      it('should set loading state during load', async () => {
        const { result } = renderHook(() => useTrustStore())

        act(() => {
          result.current.loadHistory('user-1')
        })

        expect(result.current.loadingHistory).toBe(true)
      })

      it('should clear loading state after load', async () => {
        const { result } = renderHook(() => useTrustStore())

        await act(async () => {
          await result.current.loadHistory('user-1')
        })

        expect(result.current.loadingHistory).toBe(false)
      })
    })

    describe('clearHistory', () => {
      it('should clear all history', () => {
        const { result } = renderHook(() => useTrustStore())
        const entries = [
          { id: 'history-1', userId: 'user-1', actionType: 'report' as const },
          { id: 'history-2', userId: 'user-2', actionType: 'confirm' as const },
        ]

        act(() => {
          entries.forEach(entry => result.current.addToHistory(entry))
          result.current.clearHistory()
        })

        expect(result.current.history).toEqual([])
      })

      it('should clear history for specific user', () => {
        const { result } = renderHook(() => useTrustStore())
        const entries = [
          { id: 'history-1', userId: 'user-1', actionType: 'report' as const },
          { id: 'history-2', userId: 'user-2', actionType: 'confirm' as const },
        ]

        act(() => {
          entries.forEach(entry => result.current.addToHistory(entry))
          result.current.clearHistory('user-1')
        })

        expect(result.current.history).toHaveLength(1)
        expect(result.current.history[0].userId).toBe('user-2')
      })
    })
  })

  describe('Trust Actions', () => {
    describe('updateTrustForAction', () => {
      it('should update trust for successful report', async () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.mediumTrust

        act(() => {
          result.current.setUserScore('user-1', initialScore)
        })

        await act(async () => {
          await result.current.updateTrustForAction(
            'user-1',
            'emergency-1',
            'report',
            'success'
          )
        })

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.score).toBeGreaterThan(initialScore.score)
        expect(result.current.history).toHaveLength(1)
        expect(result.current.history[0].actionType).toBe('report')
        expect(result.current.history[0].outcome).toBe('success')
      })

      it('should update trust for failed report', async () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.mediumTrust

        act(() => {
          result.current.setUserScore('user-1', initialScore)
        })

        await act(async () => {
          await result.current.updateTrustForAction(
            'user-1',
            'emergency-1',
            'report',
            'failure'
          )
        })

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.score).toBeLessThan(initialScore.score)
        expect(result.current.history[0].outcome).toBe('failure')
      })

      it('should update trust for confirmation', async () => {
        const { result } = renderHook(() => useTrustStore())
        const initialScore = trustScoreData.mediumTrust

        act(() => {
          result.current.setUserScore('user-1', initialScore)
        })

        await act(async () => {
          await result.current.updateTrustForAction(
            'user-1',
            'emergency-1',
            'confirm',
            'success'
          )
        })

        expect(result.current.history[0].actionType).toBe('confirm')
        expect(result.current.history[0].change).toBeGreaterThan(0)
      })

      it('should handle default score for new users', async () => {
        const { result } = renderHook(() => useTrustStore())

        await act(async () => {
          await result.current.updateTrustForAction(
            'new-user',
            'emergency-1',
            'report',
            'success'
          )
        })

        expect(result.current.userScores.get('new-user')).toBeDefined()
        expect(result.current.userScores.get('new-user')?.score).toBe(0.5)
      })

      it('should update factors based on action type', async () => {
        const { result } = renderHook(() => useTrustStore())
        const initialFactors = {
          reportingAccuracy: 0.8,
          contributionFrequency: 2,
          expertiseAreas: [1],
        }

        act(() => {
          result.current.setUserScore('user-1', {
            userId: 'user-1',
            score: 0.7,
            previousScore: 0.65,
            lastUpdated: new Date(),
            history: [],
            factors: initialFactors,
          })
        })

        await act(async () => {
          await result.current.updateTrustForAction(
            'user-1',
            'emergency-1',
            'report',
            'success'
          )
        })

        const updatedScore = result.current.userScores.get('user-1')
        expect(updatedScore?.factors.reportingAccuracy).toBeGreaterThan(initialFactors.reportingAccuracy)
        expect(updatedScore?.factors.contributionFrequency).toBeGreaterThan(initialFactors.contributionFrequency)
      })
    })
  })

  describe('Configuration', () => {
    describe('updateThresholds', () => {
      it('should update thresholds', () => {
        const { result } = renderHook(() => useTrustStore())
        const newThresholds = {
          reporting: 0.4,
          confirming: 0.5,
          highTrust: 0.9,
        }

        act(() => {
          result.current.updateThresholds(newThresholds)
        })

        expect(result.current.thresholds.reporting).toBe(0.4)
        expect(result.current.thresholds.confirming).toBe(0.5)
        expect(result.current.thresholds.highTrust).toBe(0.9)
        expect(result.current.thresholds.disputing).toBe(0.5) // Should preserve default
      })
    })

    describe('updateWeights', () => {
      it('should update weights', () => {
        const { result } = renderHook(() => useTrustStore())
        const newWeights = {
          reportingAccuracy: 0.30,
          confirmationAccuracy: 0.25,
          responseTime: 0.15,
        }

        act(() => {
          result.current.updateWeights(newWeights)
        })

        expect(result.current.weights.reportingAccuracy).toBe(0.30)
        expect(result.current.weights.confirmationAccuracy).toBe(0.25)
        expect(result.current.weights.responseTime).toBe(0.15)
        expect(result.current.weights.disputeAccuracy).toBe(0.15) // Should preserve default
      })
    })
  })

  describe('Cache Management', () => {
    describe('isCacheExpired', () => {
      it('should return true when cache is expired', () => {
        const { result } = renderHook(() => useTrustStore())
        const oldTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago

        act(() => {
          result.current.updateLastUpdateTime()
          // Manually set old time for testing
          result.current.lastUpdateTime = oldTime
        })

        expect(result.current.isCacheExpired()).toBe(true)
      })

      it('should return false when cache is fresh', () => {
        const { result } = renderHook(() => useTrustStore())

        act(() => {
          result.current.updateLastUpdateTime()
        })

        expect(result.current.isCacheExpired()).toBe(false)
      })

      it('should return true when no cache update time', () => {
        const { result } = renderHook(() => useTrustStore())

        expect(result.current.isCacheExpired()).toBe(true)
      })
    })

    describe('clearCache', () => {
      it('should clear cache update time', () => {
        const { result } = renderHook(() => useTrustStore())

        act(() => {
          result.current.updateLastUpdateTime()
          result.current.clearCache()
        })

        expect(result.current.lastCacheUpdate).toBeNull()
      })
    })
  })

  describe('Utility Functions', () => {
    describe('canUserReport', () => {
      it('should return true when user score meets threshold', () => {
        const thresholds = { reporting: 0.3 }

        expect(canUserReport(0.5, thresholds)).toBe(true)
        expect(canUserReport(0.3, thresholds)).toBe(true)
      })

      it('should return false when user score below threshold', () => {
        const thresholds = { reporting: 0.3 }

        expect(canUserReport(0.2, thresholds)).toBe(false)
      })

      it('should return false when user score is null', () => {
        const thresholds = { reporting: 0.3 }

        expect(canUserReport(null, thresholds)).toBe(false)
      })
    })

    describe('canUserConfirm', () => {
      it('should return true when user score meets threshold', () => {
        const thresholds = { confirming: 0.4 }

        expect(canUserConfirm(0.5, thresholds)).toBe(true)
      })

      it('should return false when user score below threshold', () => {
        const thresholds = { confirming: 0.4 }

        expect(canUserConfirm(0.3, thresholds)).toBe(false)
      })
    })

    describe('canUserDispute', () => {
      it('should return true when user score meets threshold', () => {
        const thresholds = { disputing: 0.5 }

        expect(canUserDispute(0.6, thresholds)).toBe(true)
      })

      it('should return false when user score below threshold', () => {
        const thresholds = { disputing: 0.5 }

        expect(canUserDispute(0.4, thresholds)).toBe(false)
      })
    })

    describe('isHighTrustUser', () => {
      it('should return true when user score meets high trust threshold', () => {
        const thresholds = { highTrust: 0.8 }

        expect(isHighTrustUser(0.85, thresholds)).toBe(true)
      })

      it('should return false when user score below high trust threshold', () => {
        const thresholds = { highTrust: 0.8 }

        expect(isHighTrustUser(0.7, thresholds)).toBe(false)
      })
    })

    describe('isLowTrustUser', () => {
      it('should return true when user score meets low trust threshold', () => {
        const thresholds = { lowTrust: 0.2 }

        expect(isLowTrustUser(0.1, thresholds)).toBe(true)
      })

      it('should return false when user score above low trust threshold', () => {
        const thresholds = { lowTrust: 0.2 }

        expect(isLowTrustUser(0.3, thresholds)).toBe(false)
      })
    })
  })

  describe('Selectors', () => {
    describe('useTrustScore', () => {
      it('should return current user score when userId provided', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        const { result: scoreResult } = renderHook(() => useTrustScore('user-1'))
        expect(scoreResult.current).toEqual(score)
      })

      it('should return current user score when no userId provided', () => {
        const { result } = renderHook(() => useTrustStore())
        const score = trustScoreData.highTrust

        act(() => {
          result.current.setUserScore('user-1', score)
        })

        const { result: scoreResult } = renderHook(() => useTrustScore())
        expect(scoreResult.current).toEqual(score)
      })
    })

    describe('useTrustThresholds', () => {
      it('should return current thresholds', () => {
        const { result } = renderHook(() => useTrustStore())
        const { result: thresholdsResult } = renderHook(() => useTrustThresholds())
        expect(thresholdsResult.current).toEqual(result.current.thresholds)
      })
    })

    describe('useTrustHistory', () => {
      it('should return all history when no userId provided', () => {
        const { result } = renderHook(() => useTrustStore())
        const entries = [
          { id: 'history-1', userId: 'user-1', actionType: 'report' as const },
          { id: 'history-2', userId: 'user-2', actionType: 'confirm' as const },
        ]

        act(() => {
          entries.forEach(entry => result.current.addToHistory(entry))
        })

        const { result: historyResult } = renderHook(() => useTrustHistory())
        expect(historyResult.current).toEqual(entries)
      })

      it('should return filtered history when userId provided', () => {
        const { result } = renderHook(() => useTrustStore())
        const entries = [
          { id: 'history-1', userId: 'user-1', actionType: 'report' as const },
          { id: 'history-2', userId: 'user-2', actionType: 'confirm' as const },
        ]

        act(() => {
          entries.forEach(entry => result.current.addToHistory(entry))
        })

        const { result: historyResult } = renderHook(() => useTrustHistory('user-1'))
        expect(historyResult.current).toHaveLength(1)
        expect(historyResult.current[0].userId).toBe('user-1')
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle trust score evolution over time', async () => {
      const { result } = renderHook(() => useTrustStore())
      
      // Initial score
      const initialScore = {
        userId: 'user-1',
        score: 0.5,
        previousScore: 0.5,
        lastUpdated: new Date(),
        history: [],
        factors: {
          reportingAccuracy: 0.5,
          confirmationAccuracy: 0.5,
          disputeAccuracy: 0.5,
          responseTime: 30,
          locationAccuracy: 0.5,
          contributionFrequency: 1,
          communityEndorsement: 0.5,
          penaltyScore: 0,
          expertiseAreas: [1],
        },
      }

      act(() => {
        result.current.setUserScore('user-1', initialScore)
      })

      // Series of successful reports
      await act(async () => {
        await result.current.updateTrustForAction('user-1', 'emergency-1', 'report', 'success')
        await result.current.updateTrustForAction('user-1', 'emergency-2', 'report', 'success')
        await result.current.updateTrustForAction('user-1', 'emergency-3', 'confirm', 'success')
      })

      const finalScore = result.current.userScores.get('user-1')
      expect(finalScore?.score).toBeGreaterThan(initialScore.score)
      expect(result.current.history).toHaveLength(3)
    })

    it('should handle penalty for false reports', async () => {
      const { result } = renderHook(() => useTrustStore())
      const initialScore = trustScoreData.highTrust

      act(() => {
        result.current.setUserScore('user-1', initialScore)
      })

      await act(async () => {
        await result.current.updateTrustForAction('user-1', 'emergency-1', 'report', 'failure')
      })

      const penalizedScore = result.current.userScores.get('user-1')
      expect(penalizedScore?.score).toBeLessThan(initialScore.score)
      expect(penalizedScore?.factors.penaltyScore).toBeGreaterThan(initialScore.factors.penaltyScore)
    })

    it('should handle expertise area bonuses', async () => {
      const { result } = renderHook(() => useTrustStore())
      const medicalExpert = {
        userId: 'medical-expert',
        score: 0.7,
        factors: {
          reportingAccuracy: 0.8,
          expertiseAreas: [1], // Medical expertise
          contributionFrequency: 2,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          communityEndorsement: 0.6,
          penaltyScore: 0,
        },
      }

      act(() => {
        result.current.setUserScore('medical-expert', medicalExpert)
      })

      await act(async () => {
        await result.current.updateTrustForAction('medical-expert', 'medical-emergency', 'report', 'success')
      })

      const expertScore = result.current.userScores.get('medical-expert')
      expect(expertScore?.score).toBeGreaterThan(0.7) // Should get expertise bonus
    })

    it('should handle cache expiry and refresh', async () => {
      const { result } = renderHook(() => useTrustStore())

      // Set up expired cache
      const oldTime = new Date(Date.now() - 10 * 60 * 1000)
      act(() => {
        result.current.updateLastUpdateTime()
        result.current.lastUpdateTime = oldTime
      })

      expect(result.current.isCacheExpired()).toBe(true)

      // Refresh cache
      act(() => {
        result.current.updateLastUpdateTime()
      })

      expect(result.current.isCacheExpired()).toBe(false)
    })
  })
})