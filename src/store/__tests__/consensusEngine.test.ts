/**
 * Comprehensive tests for Consensus Engine
 * 
 * These tests verify consensus engine functionality, including
 * trust-weighted voting, Sybil attack prevention, and edge case scenarios.
 */

import { renderHook, act } from '@testing-library/react'
import { useTrustStore } from '../trustStore'
import { useEmergencyStore } from '../emergencyStore'
import { ConsensusTestUtils, ConsensusScenario, VoteResult, ConsensusResult } from '@/test-utils/consensus'
import { createUser, createEmergencyEvent, createTrustScore } from '@/test-utils/fixtures/emergencyScenarios'

describe('Consensus Engine', () => {
  beforeEach(() => {
    useTrustStore.getState().reset()
    useEmergencyStore.getState().reset()
  })

  describe('Basic Consensus Calculation', () => {
    it('should reach consensus with high-trust confirmations', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())

      const scenario = ConsensusTestUtils.createScenarios()[0] // high-trust-consensus
      const event = scenario.event

      // Set up user trust scores
      scenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      // Add event to emergency store
      act(() => {
        emergencyResult.current.addEvent(event)
      })

      // Simulate voting
      const votes = ConsensusTestUtils.simulateVoting(scenario, 'trust-based')
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm')
      expect(consensus.confidence).toBeGreaterThan(0.7)
      expect(consensus.anomalies).toHaveLength(0)
    })

    it('should handle mixed consensus correctly', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())

      const scenario = ConsensusTestUtils.createScenarios()[1] // mixed-trust-dispute
      const event = scenario.event

      // Set up user trust scores
      scenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      act(() => {
        emergencyResult.current.addEvent(event)
      })

      // Simulate voting with mixed trust levels
      const votes = ConsensusTestUtils.simulateVoting(scenario, 'trust-based')
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm') // High trust should outweigh low trust
      expect(consensus.confidence).toBeGreaterThan(0.5)
      expect(consensus.weightedConfirmScore).toBeGreaterThan(consensus.weightedDisputeScore)
    })

    it('should remain undecided with insufficient votes', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())

      const scenario = ConsensusTestUtils.createScenarios()[4] // insufficient-consensus
      const event = scenario.event

      // Set up single user
      scenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      act(() => {
        emergencyResult.current.addEvent(event)
      })

      const votes = ConsensusTestUtils.simulateVoting(scenario, 'trust-based')
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('undecided')
      expect(consensus.confidence).toBeLessThan(0.5)
      expect(consensus.totalVotes).toBe(1)
    })
  })

  describe('Trust-Weighted Voting', () => {
    it('should weight votes by trust scores', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const highTrustUser = createUser({ id: 'high-trust-voter', trustScore: 0.95 })
      const lowTrustUser = createUser({ id: 'low-trust-voter', trustScore: 0.15 })

      const event = createEmergencyEvent({ id: 'weight-test-event' })

      // Set up trust scores
      act(() => {
        trustResult.current.setUserScore(highTrustUser.id, 
          createTrustScore({ userId: highTrustUser.id, overall: 0.95 }))
        trustResult.current.setUserScore(lowTrustUser.id,
          createTrustScore({ userId: lowTrustUser.id, overall: 0.15 }))
      })

      const votes: VoteResult[] = [
        {
          userId: highTrustUser.id,
          voteType: 'confirm',
          trustWeight: 0.95,
          timestamp: new Date().toISOString(),
        },
        {
          userId: lowTrustUser.id,
          voteType: 'dispute',
          trustWeight: 0.15,
          timestamp: new Date().toISOString(),
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm')
      expect(consensus.weightedConfirmScore).toBe(0.95)
      expect(consensus.weightedDisputeScore).toBe(0.15)
    })

    it('should handle multiple high-trust confirmations', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const highTrustUsers = Array.from({ length: 5 }, (_, i) =>
        createUser({ id: `high-trust-${i}`, trustScore: 0.9 + (i * 0.01) })
      )

      const event = createEmergencyEvent({ id: 'multi-high-trust-event' })

      // Set up trust scores
      highTrustUsers.forEach(user => {
        act(() => {
          trustResult.current.setUserScore(user.id,
            createTrustScore({ userId: user.id, overall: user.trustScore }))
        })
      })

      const votes: VoteResult[] = highTrustUsers.map(user => ({
        userId: user.id,
        voteType: 'confirm' as const,
        trustWeight: user.trustScore,
        timestamp: new Date().toISOString(),
      }))

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm')
      expect(consensus.confidence).toBeGreaterThan(0.9)
      expect(consensus.weightedConfirmScore).toBeGreaterThan(4.5) // 5 users * ~0.9 trust
    })
  })

  describe('Location-Based Voting Weight', () => {
    it('should give more weight to nearby voters', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({
        id: 'location-weight-event',
        location: { latitude: 40.7128, longitude: -74.0060 },
      })

      const nearbyVoter = createUser({
        id: 'nearby-voter',
        trustScore: 0.8,
        location: { latitude: 40.7130, longitude: -74.0062 }, // Very close
      })

      const distantVoter = createUser({
        id: 'distant-voter',
        trustScore: 0.8,
        location: { latitude: 40.7589, longitude: -73.9851 }, // Far away
      })

      // Set up trust scores
      [nearbyVoter, distantVoter].forEach(user => {
        act(() => {
          trustResult.current.setUserScore(user.id,
            createTrustScore({ userId: user.id, overall: user.trustScore }))
        })
      })

      const votes: VoteResult[] = [
        {
          userId: nearbyVoter.id,
          voteType: 'confirm',
          trustWeight: 0.8,
          timestamp: new Date().toISOString(),
          location: nearbyVoter.location,
          distanceFromEvent: ConsensusTestUtils['calculateDistance'](
            nearbyVoter.location,
            event.location
          ),
        },
        {
          userId: distantVoter.id,
          voteType: 'dispute',
          trustWeight: 0.8,
          timestamp: new Date().toISOString(),
          location: distantVoter.location,
          distanceFromEvent: ConsensusTestUtils['calculateDistance'](
            distantVoter.location,
            event.location
          ),
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // Nearby vote should have more influence due to distance weighting
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.distanceAdjustedConfirmScore).toBeGreaterThan(consensus.distanceAdjustedDisputeScore)
    })

    it('should handle voters without location data', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({
        id: 'no-location-event',
        location: { latitude: 40.7128, longitude: -74.0060 },
      })

      const voterWithoutLocation = createUser({
        id: 'no-location-voter',
        trustScore: 0.8,
        location: undefined,
      })

      act(() => {
        trustResult.current.setUserScore(voterWithoutLocation.id,
          createTrustScore({ userId: voterWithoutLocation.id, overall: voterWithoutLocation.trustScore }))
      })

      const votes: VoteResult[] = [
        {
          userId: voterWithoutLocation.id,
          voteType: 'confirm',
          trustWeight: 0.8,
          timestamp: new Date().toISOString(),
          location: undefined,
          distanceFromEvent: undefined,
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // Should handle gracefully without location
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.anomalies).not.toContain(
        expect.stringContaining('location')
      )
    })
  })

  describe('Sybil Attack Prevention', () => {
    it('should resist Sybil attacks with low-trust accounts', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const scenario = ConsensusTestUtils.createScenarios()[2] // sybil-attack-scenario
      const event = scenario.event

      // Set up trust scores for all participants
      scenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      const votes = ConsensusTestUtils.simulateVoting(scenario, 'trust-based')
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // High trust legitimate user should outweigh multiple low trust Sybil accounts
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.anomalies).toContain(
        'High proportion of low-trust voters (potential Sybil attack)'
      )
    })

    it('should test Sybil attack resistance systematically', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const baseScenario = ConsensusTestUtils.createScenarios()[0] // high-trust-consensus
      const sybilTest = ConsensusTestUtils.testSybilAttackResistance(baseScenario, 20)

      // Set up trust scores
      baseScenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      expect(sybilTest.legitimateVotes).toBe(baseScenario.participants.length)
      expect(sybilTest.sybilVotes).toBe(20)
      expect(sybilTest.attackSuccessful).toBe(false)
      expect(sybilTest.weightedInfluence.legitimate).toBeGreaterThan(sybilTest.weightedInfluence.sybil)
    })

    it('should detect suspicious voting patterns', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'suspicious-pattern-event' })

      // Create suspicious voting pattern - many low-trust users voting together
      const suspiciousVoters = Array.from({ length: 10 }, (_, i) =>
        createUser({ id: `suspicious-${i}`, trustScore: 0.1 + (i * 0.01) })
      )

      // Set up trust scores
      suspiciousVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      const votes: VoteResult[] = suspiciousVoters.map(voter => ({
        userId: voter.id,
        voteType: 'dispute' as const, // All voting the same way
        trustWeight: voter.trustScore,
        timestamp: new Date(Date.now() + Math.random() * 1000).toISOString(), // Similar timing
      }))

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.anomalies.length).toBeGreaterThan(0)
      expect(consensus.anomalies).toContain(
        'High proportion of low-trust voters (potential Sybil attack)'
      )
    })
  })

  describe('Collusion Detection', () => {
    it('should detect potential collusion patterns', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const scenario = ConsensusTestUtils.createScenarios()[3] // collusion-scenario
      const event = scenario.event

      // Set up trust scores
      scenario.participants.forEach(participant => {
        const trustScore = createTrustScore({
          userId: participant.id,
          overall: participant.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(participant.id, trustScore)
        })
      })

      const votes = ConsensusTestUtils.simulateVoting(scenario, 'malicious')
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // Should detect collusion between medium-trust users
      expect(consensus.consensus).toBe('dispute') // High trust user outweighs collusion
      expect(consensus.anomalies.length).toBeGreaterThan(0)
    })

    it('should handle mixed trust collusion scenarios', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'mixed-collusion-event' })

      // Mixed group attempting collusion
      const colludingGroup = [
        createUser({ id: 'colluder-1', trustScore: 0.6 }),
        createUser({ id: 'colluder-2', trustScore: 0.55 }),
        createUser({ id: 'colluder-3', trustScore: 0.5 }),
        createUser({ id: 'colluder-4', trustScore: 0.45 }),
      ]

      const independentUser = createUser({ id: 'independent', trustScore: 0.9 })

      // Set up trust scores
      [...colludingGroup, independentUser].forEach(user => {
        act(() => {
          trustResult.current.setUserScore(user.id,
            createTrustScore({ userId: user.id, overall: user.trustScore }))
        })
      })

      const votes: VoteResult[] = [
        ...colludingGroup.map(user => ({
          userId: user.id,
          voteType: 'confirm' as const,
          trustWeight: user.trustScore,
          timestamp: new Date().toISOString(),
        })),
        {
          userId: independentUser.id,
          voteType: 'dispute' as const,
          trustWeight: independentUser.trustScore,
          timestamp: new Date().toISOString(),
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // High trust independent user should outweigh colluding medium trust group
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.weightedConfirmScore).toBeGreaterThan(consensus.weightedDisputeScore)
    })
  })

  describe('Consensus Confidence Calculation', () => {
    it('should calculate high confidence with unanimous high-trust votes', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'high-confidence-event' })

      const highTrustVoters = Array.from({ length: 5 }, (_, i) =>
        createUser({ id: `high-trust-${i}`, trustScore: 0.9 + (i * 0.01) })
      )

      // Set up trust scores
      highTrustVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      const votes: VoteResult[] = highTrustVoters.map(voter => ({
        userId: voter.id,
        voteType: 'confirm' as const,
        trustWeight: voter.trustScore,
        timestamp: new Date().toISOString(),
      }))

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm')
      expect(consensus.confidence).toBeGreaterThan(0.9)
      expect(consensus.totalVotes).toBe(5)
      expect(consensus.confirmVotes).toBe(5)
      expect(consensus.disputeVotes).toBe(0)
    })

    it('should calculate low confidence with mixed voting', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'low-confidence-event' })

      const mixedVoters = [
        createUser({ id: 'mixed-1', trustScore: 0.8 }),
        createUser({ id: 'mixed-2', trustScore: 0.7 }),
        createUser({ id: 'mixed-3', trustScore: 0.6 }),
        createUser({ id: 'mixed-4', trustScore: 0.5 }),
      ]

      // Set up trust scores
      mixedVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      const votes: VoteResult[] = mixedVoters.map((voter, i) => ({
        userId: voter.id,
        voteType: i % 2 === 0 ? 'confirm' : 'dispute',
        trustWeight: voter.trustScore,
        timestamp: new Date().toISOString(),
      }))

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('undecided')
      expect(consensus.confidence).toBeLessThan(0.7)
      expect(consensus.confirmVotes).toBe(2)
      expect(consensus.disputeVotes).toBe(2)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty voting gracefully', async () => {
      const event = createEmergencyEvent({ id: 'empty-voting-event' })

      const votes: VoteResult[] = []
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('undecided')
      expect(consensus.confidence).toBe(0.1) // Very low confidence
      expect(consensus.totalVotes).toBe(0)
      expect(consensus.anomalies).toHaveLength(0)
    })

    it('should handle single vote scenarios', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'single-vote-event' })

      const singleVoter = createUser({ id: 'single-voter', trustScore: 0.8 })

      act(() => {
        trustResult.current.setUserScore(singleVoter.id,
          createTrustScore({ userId: singleVoter.id, overall: singleVoter.trustScore }))
      })

      const votes: VoteResult[] = [{
        userId: singleVoter.id,
        voteType: 'confirm',
        trustWeight: 0.8,
        timestamp: new Date().toISOString(),
      }]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('undecided') // Insufficient votes for consensus
      expect(consensus.confidence).toBe(0.1)
      expect(consensus.totalVotes).toBe(1)
    })

    it('should handle extreme trust score differences', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'extreme-diff-event' })

      const extremeVoters = [
        createUser({ id: 'extreme-high', trustScore: 0.99 }),
        createUser({ id: 'extreme-low', trustScore: 0.01 }),
      ]

      // Set up trust scores
      extremeVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      const votes: VoteResult[] = [
        {
          userId: extremeVoters[0].id,
          voteType: 'confirm',
          trustWeight: 0.99,
          timestamp: new Date().toISOString(),
        },
        {
          userId: extremeVoters[1].id,
          voteType: 'dispute',
          trustWeight: 0.01,
          timestamp: new Date().toISOString(),
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      expect(consensus.consensus).toBe('confirm')
      expect(consensus.weightedConfirmScore).toBe(0.99)
      expect(consensus.weightedDisputeScore).toBe(0.01)
    })

    it('should handle concurrent voting scenarios', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'concurrent-voting-event' })

      const concurrentVoters = Array.from({ length: 20 }, (_, i) =>
        createUser({ id: `concurrent-${i}`, trustScore: 0.5 + (Math.random() * 0.5) })
      )

      // Set up trust scores
      concurrentVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      // Simulate concurrent voting
      const votes: VoteResult[] = concurrentVoters.map(voter => ({
        userId: voter.id,
        voteType: Math.random() > 0.5 ? 'confirm' : 'dispute',
        trustWeight: voter.trustScore,
        timestamp: new Date(Date.now() + Math.random() * 1000).toISOString(),
      }))

      const startTime = performance.now()
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)
      const endTime = performance.now()

      expect(consensus.totalVotes).toBe(20)
      expect(consensus.consensus).toBeDefined()
      expect(endTime - startTime).toBeLessThan(100) // Should be fast even with many votes
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large-scale voting efficiently', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({ id: 'large-scale-event' })

      const largeVoterSet = Array.from({ length: 1000 }, (_, i) =>
        createUser({ id: `large-scale-${i}`, trustScore: 0.3 + (Math.random() * 0.7) })
      )

      // Set up trust scores for a subset (to test performance)
      const sampleVoters = largeVoterSet.slice(0, 100)
      sampleVoters.forEach(voter => {
        act(() => {
          trustResult.current.setUserScore(voter.id,
            createTrustScore({ userId: voter.id, overall: voter.trustScore }))
        })
      })

      const votes: VoteResult[] = largeVoterSet.map(voter => ({
        userId: voter.id,
        voteType: Math.random() > 0.4 ? 'confirm' : 'dispute',
        trustWeight: voter.trustScore,
        timestamp: new Date(Date.now() + Math.random() * 5000).toISOString(),
      }))

      const startTime = performance.now()
      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)
      const endTime = performance.now()

      expect(consensus.totalVotes).toBe(1000)
      expect(consensus.consensus).toBeDefined()
      expect(endTime - startTime).toBeLessThan(500) // Should complete within 500ms
    })

    it('should maintain accuracy under stress', async () => {
      const stressScenarios = ConsensusTestUtils.generateStressTestScenarios()

      // Test high volume scenario
      const highVolumeScenario = stressScenarios.highVolume
      expect(highVolumeScenario.parameters.eventCount).toBe(100)
      expect(highVolumeScenario.parameters.votesPerEvent).toBe(1000)
      expect(highVolumeScenario.parameters.concurrentUsers).toBe(500)

      // Test rapid fire scenario
      const rapidFireScenario = stressScenarios.rapidFire
      expect(rapidFireScenario.parameters.eventCount).toBe(10)
      expect(rapidFireScenario.parameters.votesPerEvent).toBe(100)
      expect(rapidFireScenario.parameters.voteInterval).toBe(100)

      // Test mixed trust scenario
      const mixedTrustScenario = stressScenarios.mixedTrust
      expect(mixedTrustScenario.parameters.distributions).toHaveLength(3)
    })
  })
})