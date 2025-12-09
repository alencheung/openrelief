/**
 * Comprehensive tests for Trust Score Calculations
 *
 * These tests verify trust score calculation algorithms, including
 * various scenarios, edge cases, and performance under different conditions.
 */

import { renderHook, act } from '@testing-library/react'
import { useTrustStore } from '../trustStore'
import { createUser, createTrustScore } from '@/test-utils/fixtures/emergencyScenarios'

describe('Trust Score Calculations', () => {
  beforeEach(() => {
    useTrustStore.getState().reset()
  })

  describe('Basic Trust Score Calculation', () => {
    it('should calculate trust score with all factors', async () => {
      const { result } = renderHook(() => useTrustStore())

      const factors = {
        reportingAccuracy: 0.9,
        confirmationAccuracy: 0.85,
        disputeAccuracy: 0.8,
        responseTime: 15, // 15 minutes
        locationAccuracy: 0.95,
        contributionFrequency: 8, // 8 per week
        communityEndorsement: 0.75,
        penaltyScore: 0.05,
        expertiseAreas: [1, 2]
      }

      const calculation = await act(async () =>
        result.current.calculateTrustScore('user-1', factors)
      )

      expect(calculation.userId).toBe('user-1')
      expect(calculation.factors).toEqual(factors)
      expect(calculation.baseScore).toBeGreaterThan(0)
      expect(calculation.weightedScore).toBeGreaterThan(0)
      expect(calculation.confidence).toBeGreaterThanOrEqual(0)
      expect(calculation.confidence).toBeLessThanOrEqual(1)
    })

    it('should normalize factors correctly', async () => {
      const { result } = renderHook(() => useTrustStore())

      const factors = {
        reportingAccuracy: 1.5, // Should be clamped to 1
        confirmationAccuracy: -0.5, // Should be clamped to 0
        responseTime: 120, // Should be normalized to 0
        contributionFrequency: 15, // Should be clamped to 1
        communityEndorsement: 2, // Should be clamped to 1
        penaltyScore: 1.5, // Should be clamped to 1
        disputeAccuracy: 0.5,
        locationAccuracy: 0.7,
        expertiseAreas: []
      }

      const calculation = await act(async () =>
        result.current.calculateTrustScore('user-1', factors)
      )

      // Verify normalization
      expect(calculation.factors.reportingAccuracy).toBe(1)
      expect(calculation.factors.confirmationAccuracy).toBe(0)
      expect(calculation.factors.responseTime).toBe(0)
      expect(calculation.factors.contributionFrequency).toBe(1)
      expect(calculation.factors.communityEndorsement).toBe(1)
      expect(calculation.factors.penaltyScore).toBe(1)
    })

    it('should calculate confidence based on data completeness', async () => {
      const { result } = renderHook(() => useTrustStore())

      // Complete data set
      const completeFactors = {
        reportingAccuracy: 0.8,
        confirmationAccuracy: 0.8,
        disputeAccuracy: 0.8,
        responseTime: 20,
        locationAccuracy: 0.8,
        contributionFrequency: 5,
        communityEndorsement: 0.8,
        penaltyScore: 0.1,
        expertiseAreas: [1]
      }

      // Incomplete data set
      const incompleteFactors = {
        reportingAccuracy: 0.8,
        confirmationAccuracy: 0, // Missing
        disputeAccuracy: 0, // Missing
        responseTime: 20,
        locationAccuracy: 0.8,
        contributionFrequency: 0, // Missing
        communityEndorsement: 0, // Missing
        penaltyScore: 0.1,
        expertiseAreas: []
      }

      const completeCalculation = await act(async () =>
        result.current.calculateTrustScore('user-1', completeFactors)
      )

      const incompleteCalculation = await act(async () =>
        result.current.calculateTrustScore('user-2', incompleteFactors)
      )

      expect(completeCalculation.confidence).toBeGreaterThan(incompleteCalculation.confidence)
    })
  })

  describe('Trust Score Evolution', () => {
    it('should increase trust score with successful actions', async () => {
      const { result } = renderHook(() => useTrustStore())

      const initialScore = createTrustScore({
        userId: 'user-evolution',
        overall: 0.5,
        factors: {
          reportingAccuracy: 0.5,
          confirmationAccuracy: 0.5,
          disputeAccuracy: 0.5,
          responseTime: 30,
          locationAccuracy: 0.5,
          contributionFrequency: 1,
          communityEndorsement: 0.5,
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      act(() => {
        result.current.setUserScore('user-evolution', initialScore)
      })

      // Simulate series of successful reports
      await act(async () => {
        await result.current.updateTrustForAction('user-evolution', 'event-1', 'report', 'success')
        await result.current.updateTrustForAction('user-evolution', 'event-2', 'confirm', 'success')
        await result.current.updateTrustForAction('user-evolution', 'event-3', 'report', 'success')
      })

      const finalScore = result.current.getUserScore('user-evolution')
      expect(finalScore?.score).toBeGreaterThan(initialScore.score)
      expect(result.current.history).toHaveLength(3)
    })

    it('should decrease trust score with failed actions', async () => {
      const { result } = renderHook(() => useTrustStore())

      const initialScore = createTrustScore({
        userId: 'user-decline',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 3,
          communityEndorsement: 0.7,
          penaltyScore: 0,
          expertiseAreas: [1]
        }
      })

      act(() => {
        result.current.setUserScore('user-decline', initialScore)
      })

      // Simulate failed reports
      await act(async () => {
        await result.current.updateTrustForAction('user-decline', 'event-1', 'report', 'failure')
        await result.current.updateTrustForAction('user-decline', 'event-2', 'report', 'failure')
        await result.current.updateTrustForAction('user-decline', 'event-3', 'confirm', 'failure')
      })

      const finalScore = result.current.getUserScore('user-decline')
      expect(finalScore?.score).toBeLessThan(initialScore.score)
      expect(finalScore?.factors.penaltyScore).toBeGreaterThan(initialScore.factors.penaltyScore)
    })

    it('should apply score changes based on current score level', async () => {
      const { result } = renderHook(() => useTrustStore())

      // High trust user (harder to gain)
      const highTrustUser = createTrustScore({
        userId: 'high-trust-user',
        overall: 0.9
      })

      // Low trust user (easier to gain)
      const lowTrustUser = createTrustScore({
        userId: 'low-trust-user',
        overall: 0.2
      })

      act(() => {
        result.current.setUserScore('high-trust-user', highTrustUser)
        result.current.setUserScore('low-trust-user', lowTrustUser)
      })

      await act(async () => {
        await result.current.updateTrustForAction('high-trust-user', 'event-1', 'report', 'success')
        await result.current.updateTrustForAction('low-trust-user', 'event-2', 'report', 'success')
      })

      const finalHighTrust = result.current.getUserScore('high-trust-user')
      const finalLowTrust = result.current.getUserScore('low-trust-user')

      const highTrustChange = finalHighTrust!.score - highTrustUser.score
      const lowTrustChange = finalLowTrust!.score - lowTrustUser.score

      // Low trust user should gain more relatively
      expect(Math.abs(lowTrustChange)).toBeGreaterThan(Math.abs(highTrustChange))
    })
  })

  describe('Expertise Area Bonuses', () => {
    it('should apply expertise bonuses for relevant actions', async () => {
      const { result } = renderHook(() => useTrustStore())

      const medicalExpert = createTrustScore({
        userId: 'medical-expert',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.8,
          expertiseAreas: [1], // Medical expertise
          contributionFrequency: 2,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          communityEndorsement: 0.6,
          penaltyScore: 0
        }
      })

      const generalUser = createTrustScore({
        userId: 'general-user',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.8,
          expertiseAreas: [], // No expertise
          contributionFrequency: 2,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          communityEndorsement: 0.6,
          penaltyScore: 0
        }
      })

      act(() => {
        result.current.setUserScore('medical-expert', medicalExpert)
        result.current.setUserScore('general-user', generalUser)
      })

      await act(async () => {
        await result.current.updateTrustForAction('medical-expert', 'medical-event', 'report', 'success')
        await result.current.updateTrustForAction('general-user', 'medical-event', 'report', 'success')
      })

      const expertFinalScore = result.current.getUserScore('medical-expert')
      const generalFinalScore = result.current.getUserScore('general-user')

      // Expert should get bonus for relevant domain
      expect(expertFinalScore?.score).toBeGreaterThan(generalFinalScore?.score)
    })

    it('should not apply expertise bonuses for irrelevant actions', async () => {
      const { result } = renderHook(() => useTrustStore())

      const medicalExpert = createTrustScore({
        userId: 'medical-expert-2',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.8,
          expertiseAreas: [1], // Medical expertise only
          contributionFrequency: 2,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          communityEndorsement: 0.6,
          penaltyScore: 0
        }
      })

      const generalUser = createTrustScore({
        userId: 'general-user-2',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.8,
          expertiseAreas: [],
          contributionFrequency: 2,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          communityEndorsement: 0.6,
          penaltyScore: 0
        }
      })

      act(() => {
        result.current.setUserScore('medical-expert-2', medicalExpert)
        result.current.setUserScore('general-user-2', generalUser)
      })

      await act(async () => {
        await result.current.updateTrustForAction('medical-expert-2', 'fire-event', 'report', 'success')
        await result.current.updateTrustForAction('general-user-2', 'fire-event', 'report', 'success')
      })

      const expertFinalScore = result.current.getUserScore('medical-expert-2')
      const generalFinalScore = result.current.getUserScore('general-user-2')

      // No expertise bonus for irrelevant domain
      expect(expertFinalScore?.score).toBeCloseTo(generalFinalScore?.score, 2)
    })
  })

  describe('Response Time Impact', () => {
    it('should reward fast response times', async () => {
      const { result } = renderHook(() => useTrustStore())

      const fastResponder = createTrustScore({
        userId: 'fast-responder',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 5, // 5 minutes - very fast
          locationAccuracy: 0.7,
          contributionFrequency: 2,
          communityEndorsement: 0.6,
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      const slowResponder = createTrustScore({
        userId: 'slow-responder',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 60, // 60 minutes - very slow
          locationAccuracy: 0.7,
          contributionFrequency: 2,
          communityEndorsement: 0.6,
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      act(() => {
        result.current.setUserScore('fast-responder', fastResponder)
        result.current.setUserScore('slow-responder', slowResponder)
      })

      const fastCalculation = await act(async () =>
        result.current.calculateTrustScore('fast-responder', fastResponder.factors)
      )

      const slowCalculation = await act(async () =>
        result.current.calculateTrustScore('slow-responder', slowResponder.factors)
      )

      // Fast responder should have higher score due to better response time factor
      expect(fastCalculation.weightedScore).toBeGreaterThan(slowCalculation.weightedScore)
    })
  })

  describe('Community Endorsement Impact', () => {
    it('should increase trust score with community endorsements', async () => {
      const { result } = renderHook(() => useTrustStore())

      const endorsedUser = createTrustScore({
        userId: 'endorsed-user',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 3,
          communityEndorsement: 0.9, // High community endorsement
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      const nonEndorsedUser = createTrustScore({
        userId: 'non-endorsed-user',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 3,
          communityEndorsement: 0.1, // Low community endorsement
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      act(() => {
        result.current.setUserScore('endorsed-user', endorsedUser)
        result.current.setUserScore('non-endorsed-user', nonEndorsedUser)
      })

      const endorsedCalculation = await act(async () =>
        result.current.calculateTrustScore('endorsed-user', endorsedUser.factors)
      )

      const nonEndorsedCalculation = await act(async () =>
        result.current.calculateTrustScore('non-endorsed-user', nonEndorsedUser.factors)
      )

      // Endorsed user should have higher score
      expect(endorsedCalculation.weightedScore).toBeGreaterThan(nonEndorsedCalculation.weightedScore)
    })
  })

  describe('Penalty System', () => {
    it('should apply penalties for false reports', async () => {
      const { result } = renderHook(() => useTrustStore())

      const userWithPenalties = createTrustScore({
        userId: 'penalty-user',
        overall: 0.7,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 3,
          communityEndorsement: 0.6,
          penaltyScore: 0.3, // Already has some penalties
          expertiseAreas: []
        }
      })

      act(() => {
        result.current.setUserScore('penalty-user', userWithPenalties)
      })

      const calculationWithPenalties = await act(async () =>
        result.current.calculateTrustScore('penalty-user', userWithPenalties.factors)
      )

      const userWithoutPenalties = {
        ...userWithPenalties,
        factors: {
          ...userWithPenalties.factors,
          penaltyScore: 0
        }
      }

      const calculationWithoutPenalties = await act(async () =>
        result.current.calculateTrustScore('penalty-user', userWithoutPenalties.factors)
      )

      // Penalties should reduce the score
      expect(calculationWithPenalties.weightedScore).toBeLessThan(calculationWithoutPenalties.weightedScore)
    })

    it('should accumulate penalties over time', async () => {
      const { result } = renderHook(() => useTrustStore())

      const initialScore = createTrustScore({
        userId: 'accumulating-penalty-user',
        overall: 0.8,
        factors: {
          reportingAccuracy: 0.8,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.8,
          responseTime: 15,
          locationAccuracy: 0.8,
          contributionFrequency: 4,
          communityEndorsement: 0.7,
          penaltyScore: 0,
          expertiseAreas: [1, 2]
        }
      })

      act(() => {
        result.current.setUserScore('accumulating-penalty-user', initialScore)
      })

      // Accumulate multiple penalties
      await act(async () => {
        await result.current.updateTrustForAction('accumulating-penalty-user', 'event-1', 'report', 'failure')
        await result.current.updateTrustForAction('accumulating-penalty-user', 'event-2', 'report', 'failure')
        await result.current.updateTrustForAction('accumulating-penalty-user', 'event-3', 'report', 'failure')
      })

      const finalScore = result.current.getUserScore('accumulating-penalty-user')
      expect(finalScore?.factors.penaltyScore).toBeGreaterThan(initialScore.factors.penaltyScore)
      expect(finalScore?.score).toBeLessThan(initialScore.score)
    })
  })

  describe('Contribution Frequency Impact', () => {
    it('should reward consistent contributors', async () => {
      const { result } = renderHook(() => useTrustStore())

      const activeContributor = createTrustScore({
        userId: 'active-contributor',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 10, // High contribution frequency
          communityEndorsement: 0.6,
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      const inactiveContributor = createTrustScore({
        userId: 'inactive-contributor',
        overall: 0.6,
        factors: {
          reportingAccuracy: 0.7,
          confirmationAccuracy: 0.7,
          disputeAccuracy: 0.7,
          responseTime: 20,
          locationAccuracy: 0.7,
          contributionFrequency: 0.5, // Low contribution frequency
          communityEndorsement: 0.6,
          penaltyScore: 0,
          expertiseAreas: []
        }
      })

      act(() => {
        result.current.setUserScore('active-contributor', activeContributor)
        result.current.setUserScore('inactive-contributor', inactiveContributor)
      })

      const activeCalculation = await act(async () =>
        result.current.calculateTrustScore('active-contributor', activeContributor.factors)
      )

      const inactiveCalculation = await act(async () =>
        result.current.calculateTrustScore('inactive-contributor', inactiveContributor.factors)
      )

      // Active contributor should have higher score
      expect(activeCalculation.weightedScore).toBeGreaterThan(inactiveCalculation.weightedScore)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle new users with default scores', async () => {
      const { result } = renderHook(() => useTrustStore())

      // New user with no history
      await act(async () => {
        await result.current.updateTrustForAction('new-user', 'event-1', 'report', 'success')
      })

      const newUserScore = result.current.getUserScore('new-user')
      expect(newUserScore).toBeDefined()
      expect(newUserScore?.score).toBe(0.5) // Default score
      expect(newUserScore?.history).toHaveLength(1)
    })

    it('should handle extreme factor values gracefully', async () => {
      const { result } = renderHook(() => useTrustStore())

      const extremeFactors = {
        reportingAccuracy: Number.MAX_SAFE_INTEGER,
        confirmationAccuracy: Number.MIN_SAFE_INTEGER,
        disputeAccuracy: NaN,
        responseTime: Infinity,
        locationAccuracy: -Infinity,
        contributionFrequency: null as any,
        communityEndorsement: undefined as any,
        penaltyScore: 'invalid' as any,
        expertiseAreas: null as any
      }

      // Should not crash and should handle gracefully
      const calculation = await act(async () =>
        result.current.calculateTrustScore('extreme-user', extremeFactors)
      )

      expect(calculation).toBeDefined()
      expect(calculation.weightedScore).toBeGreaterThanOrEqual(0)
      expect(calculation.weightedScore).toBeLessThanOrEqual(1)
    })

    it('should maintain score bounds (0-1)', async () => {
      const { result } = renderHook(() => useTrustStore())

      const perfectFactors = {
        reportingAccuracy: 1,
        confirmationAccuracy: 1,
        disputeAccuracy: 1,
        responseTime: 0,
        locationAccuracy: 1,
        contributionFrequency: 10,
        communityEndorsement: 1,
        penaltyScore: 0,
        expertiseAreas: [1, 2, 3, 4, 5]
      }

      const worstFactors = {
        reportingAccuracy: 0,
        confirmationAccuracy: 0,
        disputeAccuracy: 0,
        responseTime: 120,
        locationAccuracy: 0,
        contributionFrequency: 0,
        communityEndorsement: 0,
        penaltyScore: 1,
        expertiseAreas: []
      }

      const perfectCalculation = await act(async () =>
        result.current.calculateTrustScore('perfect-user', perfectFactors)
      )

      const worstCalculation = await act(async () =>
        result.current.calculateTrustScore('worst-user', worstFactors)
      )

      expect(perfectCalculation.weightedScore).toBeLessThanOrEqual(1)
      expect(worstCalculation.weightedScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle批量信任分数计算 efficiently', async () => {
      const { result } = renderHook(() => useTrustStore())

      const startTime = performance.now()

      const factors = {
        reportingAccuracy: 0.8,
        confirmationAccuracy: 0.8,
        disputeAccuracy: 0.8,
        responseTime: 20,
        locationAccuracy: 0.8,
        contributionFrequency: 5,
        communityEndorsement: 0.7,
        penaltyScore: 0.1,
        expertiseAreas: [1]
      }

      // Calculate trust scores for many users
      const calculations = await act(async () => {
        const promises = Array.from({ length: 1000 }, (_, i) =>
          result.current.calculateTrustScore(`user-${i}`, factors)
        )
        return Promise.all(promises)
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(calculations).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should maintain calculation consistency under load', async () => {
      const { result } = renderHook(() => useTrustStore())

      const factors = {
        reportingAccuracy: 0.75,
        confirmationAccuracy: 0.75,
        disputeAccuracy: 0.75,
        responseTime: 25,
        locationAccuracy: 0.75,
        contributionFrequency: 4,
        communityEndorsement: 0.65,
        penaltyScore: 0.05,
        expertiseAreas: [1, 2]
      }

      // Calculate same score multiple times
      const calculations = await act(async () => {
        const promises = Array.from({ length: 100 }, () =>
          result.current.calculateTrustScore('consistency-user', factors)
        )
        return Promise.all(promises)
      })

      // All calculations should yield the same result
      const scores = calculations.map(c => c.weightedScore)
      const uniqueScores = [...new Set(scores)]

      expect(uniqueScores).toHaveLength(1)
      expect(scores[0]).toBeGreaterThan(0)
      expect(scores[0]).toBeLessThan(1)
    })
  })
})