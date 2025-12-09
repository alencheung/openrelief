/**
 * Consensus engine testing utilities for OpenRelief emergency coordination system
 *
 * This file provides comprehensive testing utilities for the consensus engine,
 * including trust-weighted voting, Sybil attack prevention, and edge case scenarios.
 */

import { createEmergencyEvent, createUser, createTrustScore } from '../fixtures/emergencyScenarios'

export interface ConsensusScenario {
  id: string
  name: string
  description: string
  event: any
  participants: any[]
  expectedOutcome: 'confirm' | 'dispute' | 'undecided'
  trustDistribution: 'high' | 'medium' | 'low' | 'mixed'
  attackVector?: 'sybil' | 'collusion' | 'none'
}

export interface VoteResult {
  userId: string
  voteType: 'confirm' | 'dispute'
  trustWeight: number
  timestamp: string
  location?: { lat: number; lng: number }
  distanceFromEvent?: number
}

export interface ConsensusResult {
  eventId: string
  totalVotes: number
  confirmVotes: number
  disputeVotes: number
  weightedConfirmScore: number
  weightedDisputeScore: number
  consensus: 'confirm' | 'dispute' | 'undecided'
  confidence: number
  participants: string[]
  votingHistory: VoteResult[]
  anomalies: string[]
}

export class ConsensusTestUtils {
  // Create consensus scenarios for testing
  static createScenarios(): ConsensusScenario[] {
    return [
      {
        id: 'high-trust-consensus',
        name: 'High Trust Consensus',
        description: 'Multiple high-trust users confirm an event',
        event: createEmergencyEvent({
          id: 'event-high-trust',
          type: 'medical',
          severity: 'high',
          title: 'Medical Emergency - High Trust Area'
        }),
        participants: [
          createUser({ id: 'user-1', trustScore: 0.95, role: 'responder' }),
          createUser({ id: 'user-2', trustScore: 0.92, role: 'responder' }),
          createUser({ id: 'user-3', trustScore: 0.88, role: 'citizen' })
        ],
        expectedOutcome: 'confirm',
        trustDistribution: 'high',
        attackVector: 'none'
      },
      {
        id: 'mixed-trust-dispute',
        name: 'Mixed Trust Dispute',
        description: 'Mixed trust users with conflicting votes',
        event: createEmergencyEvent({
          id: 'event-mixed-trust',
          type: 'fire',
          severity: 'critical',
          title: 'Building Fire - Disputed'
        }),
        participants: [
          createUser({ id: 'user-4', trustScore: 0.90, role: 'responder' }),
          createUser({ id: 'user-5', trustScore: 0.60, role: 'citizen' }),
          createUser({ id: 'user-6', trustScore: 0.40, role: 'citizen' })
        ],
        expectedOutcome: 'confirm',
        trustDistribution: 'mixed',
        attackVector: 'none'
      },
      {
        id: 'sybil-attack-scenario',
        name: 'Sybil Attack Scenario',
        description: 'Multiple low-trust accounts attempt to manipulate consensus',
        event: createEmergencyEvent({
          id: 'event-sybil',
          type: 'security',
          severity: 'high',
          title: 'Security Threat - Potential False Report'
        }),
        participants: [
          createUser({ id: 'user-legit-1', trustScore: 0.85, role: 'responder' }),
          createUser({ id: 'user-sybil-1', trustScore: 0.15, role: 'citizen' }),
          createUser({ id: 'user-sybil-2', trustScore: 0.12, role: 'citizen' }),
          createUser({ id: 'user-sybil-3', trustScore: 0.10, role: 'citizen' }),
          createUser({ id: 'user-sybil-4', trustScore: 0.08, role: 'citizen' }),
          createUser({ id: 'user-sybil-5', trustScore: 0.05, role: 'citizen' })
        ],
        expectedOutcome: 'confirm',
        trustDistribution: 'low',
        attackVector: 'sybil'
      },
      {
        id: 'collusion-scenario',
        name: 'Collusion Scenario',
        description: 'Group of medium-trust users attempt to collude',
        event: createEmergencyEvent({
          id: 'event-collusion',
          type: 'accident',
          severity: 'medium',
          title: 'Traffic Accident - Potential Collusion'
        }),
        participants: [
          createUser({ id: 'user-collusion-1', trustScore: 0.65, role: 'citizen' }),
          createUser({ id: 'user-collusion-2', trustScore: 0.62, role: 'citizen' }),
          createUser({ id: 'user-collusion-3', trustScore: 0.58, role: 'citizen' }),
          createUser({ id: 'user-independent-1', trustScore: 0.90, role: 'responder' })
        ],
        expectedOutcome: 'dispute',
        trustDistribution: 'medium',
        attackVector: 'collusion'
      },
      {
        id: 'insufficient-consensus',
        name: 'Insufficient Consensus',
        description: 'Not enough votes to reach consensus',
        event: createEmergencyEvent({
          id: 'event-insufficient',
          type: 'utility',
          severity: 'low',
          title: 'Utility Issue - Low Participation'
        }),
        participants: [
          createUser({ id: 'user-single', trustScore: 0.75, role: 'citizen' })
        ],
        expectedOutcome: 'undecided',
        trustDistribution: 'medium',
        attackVector: 'none'
      }
    ]
  }

  // Simulate voting process
  static simulateVoting(scenario: ConsensusScenario, votingPattern?: 'random' | 'trust-based' | 'malicious'): VoteResult[] {
    const votes: VoteResult[] = []

    scenario.participants.forEach(participant => {
      let voteType: 'confirm' | 'dispute'

      switch (votingPattern) {
        case 'random':
          voteType = Math.random() > 0.5 ? 'confirm' : 'dispute'
          break
        case 'trust-based':
          // Higher trust users are more likely to vote correctly
          const correctVoteProbability = participant.trustScore
          voteType = Math.random() < correctVoteProbability ? scenario.expectedOutcome
            : (scenario.expectedOutcome === 'confirm' ? 'dispute' : 'confirm')
          break
        case 'malicious':
          // Low trust users vote maliciously
          if (participant.trustScore < 0.3) {
            voteType = scenario.expectedOutcome === 'confirm' ? 'dispute' : 'confirm'
          } else {
            voteType = scenario.expectedOutcome
          }
          break
        default:
          voteType = scenario.expectedOutcome
      }

      votes.push({
        userId: participant.id,
        voteType,
        trustWeight: participant.trustScore,
        timestamp: new Date().toISOString(),
        location: participant.location,
        distanceFromEvent: this.calculateDistance(
          participant.location,
          scenario.event.location
        )
      })
    })

    return votes
  }

  // Calculate consensus result
  static calculateConsensus(votes: VoteResult[], event: any): ConsensusResult {
    const confirmVotes = votes.filter(v => v.voteType === 'confirm')
    const disputeVotes = votes.filter(v => v.voteType === 'dispute')

    // Calculate weighted scores
    const weightedConfirmScore = confirmVotes.reduce((sum, vote) => sum + vote.trustWeight, 0)
    const weightedDisputeScore = disputeVotes.reduce((sum, vote) => sum + vote.trustWeight, 0)

    // Apply distance-based weighting (closer votes have more weight)
    const distanceAdjustedConfirmScore = confirmVotes.reduce((sum, vote) => {
      const distanceWeight = vote.distanceFromEvent ? Math.max(0.1, 1 - vote.distanceFromEvent / 10000) : 1
      return sum + (vote.trustWeight * distanceWeight)
    }, 0)

    const distanceAdjustedDisputeScore = disputeVotes.reduce((sum, vote) => {
      const distanceWeight = vote.distanceFromEvent ? Math.max(0.1, 1 - vote.distanceFromEvent / 10000) : 1
      return sum + (vote.trustWeight * distanceWeight)
    }, 0)

    // Determine consensus
    const totalWeightedScore = distanceAdjustedConfirmScore + distanceAdjustedDisputeScore
    const confirmRatio = totalWeightedScore > 0 ? distanceAdjustedConfirmScore / totalWeightedScore : 0

    let consensus: 'confirm' | 'dispute' | 'undecided'
    let confidence = 0

    if (votes.length < 3) {
      consensus = 'undecided'
      confidence = 0.1
    } else if (confirmRatio >= 0.7) {
      consensus = 'confirm'
      confidence = Math.min(0.95, confirmRatio)
    } else if (confirmRatio <= 0.3) {
      consensus = 'dispute'
      confidence = Math.min(0.95, 1 - confirmRatio)
    } else {
      consensus = 'undecided'
      confidence = 0.5
    }

    // Detect anomalies
    const anomalies = this.detectAnomalies(votes, event)

    return {
      eventId: event.id,
      totalVotes: votes.length,
      confirmVotes: confirmVotes.length,
      disputeVotes: disputeVotes.length,
      weightedConfirmScore: distanceAdjustedConfirmScore,
      weightedDisputeScore: distanceAdjustedDisputeScore,
      consensus,
      confidence,
      participants: votes.map(v => v.userId),
      votingHistory: votes,
      anomalies
    }
  }

  // Detect voting anomalies
  private static detectAnomalies(votes: VoteResult[], event: any): string[] {
    const anomalies: string[] = []

    // Check for suspicious voting patterns
    const confirmVotes = votes.filter(v => v.voteType === 'confirm')
    const disputeVotes = votes.filter(v => v.voteType === 'dispute')

    // Check for low-trust users voting against high-trust consensus
    const highTrustVotes = votes.filter(v => v.trustWeight > 0.7)
    const lowTrustVotes = votes.filter(v => v.trustWeight < 0.3)

    if (highTrustVotes.length > 0) {
      const highTrustConsensus = highTrustVotes.filter(v => v.voteType === 'confirm').length
        > highTrustVotes.length / 2

      const lowTrustOpposition = lowTrustVotes.filter(v =>
        highTrustConsensus ? v.voteType === 'dispute' : v.voteType === 'confirm'
      ).length

      if (lowTrustOpposition > lowTrustVotes.length * 0.8) {
        anomalies.push('Low-trust users opposing high-trust consensus')
      }
    }

    // Check for geographic anomalies
    const votesWithLocation = votes.filter(v => v.location && v.distanceFromEvent !== undefined)
    if (votesWithLocation.length > 0) {
      const avgDistance = votesWithLocation.reduce((sum, v) => sum + (v.distanceFromEvent || 0), 0) / votesWithLocation.length
      const distantVotes = votesWithLocation.filter(v => (v.distanceFromEvent || 0) > avgDistance * 3)

      if (distantVotes.length > 0) {
        anomalies.push('Votes from unusually distant locations')
      }
    }

    // Check for timing anomalies (votes coming in too quickly)
    const timestamps = votes.map(v => new Date(v.timestamp).getTime()).sort()
    if (timestamps.length > 1) {
      const timeSpans = []
      for (let i = 1; i < timestamps.length; i++) {
        timeSpans.push(timestamps[i] - timestamps[i - 1])
      }
      const avgTimeSpan = timeSpans.reduce((sum, span) => sum + span, 0) / timeSpans.length

      if (avgTimeSpan < 1000) { // Less than 1 second between votes
        anomalies.push('Suspiciously rapid voting pattern')
      }
    }

    // Check for Sybil attack patterns
    const lowTrustUserCount = votes.filter(v => v.trustWeight < 0.2).length
    if (lowTrustUserCount > votes.length * 0.6) {
      anomalies.push('High proportion of low-trust voters (potential Sybil attack)')
    }

    return anomalies
  }

  // Calculate distance between two points
  private static calculateDistance(
    point1?: { latitude: number; longitude: number },
    point2?: { latitude: number; longitude: number }
  ): number {
    if (!point1 || !point2) {
      return Infinity
    }

    const R = 6371e3 // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180
    const φ2 = (point2.latitude * Math.PI) / 180
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
      + Math.cos(φ1) * Math.cos(φ2)
      * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Test Sybil attack resistance
  static testSybilAttackResistance(baseScenario: ConsensusScenario, sybilAccounts: number = 10) {
    const legitimateUsers = baseScenario.participants.filter(p => p.trustScore > 0.7)
    const sybilUsers = Array.from({ length: sybilAccounts }, (_, i) =>
      createUser({
        id: `sybil-${i}`,
        trustScore: 0.1 + Math.random() * 0.1, // Very low trust scores
        role: 'citizen'
      })
    )

    const allParticipants = [...legitimateUsers, ...sybilUsers]
    const votes: VoteResult[] = []

    // Legitimate users vote correctly
    legitimateUsers.forEach(user => {
      votes.push({
        userId: user.id,
        voteType: baseScenario.expectedOutcome,
        trustWeight: user.trustScore,
        timestamp: new Date().toISOString()
      })
    })

    // Sybil users vote maliciously
    sybilUsers.forEach(user => {
      votes.push({
        userId: user.id,
        voteType: baseScenario.expectedOutcome === 'confirm' ? 'dispute' : 'confirm',
        trustWeight: user.trustScore,
        timestamp: new Date().toISOString()
      })
    })

    const consensus = this.calculateConsensus(votes, baseScenario.event)

    return {
      scenario: baseScenario.id,
      legitimateVotes: legitimateUsers.length,
      sybilVotes: sybilUsers.length,
      consensus: consensus.consensus,
      confidence: consensus.confidence,
      attackSuccessful: consensus.consensus !== baseScenario.expectedOutcome,
      weightedInfluence: {
        legitimate: legitimateUsers.reduce((sum, u) => sum + u.trustScore, 0),
        sybil: sybilUsers.reduce((sum, u) => sum + u.trustScore, 0)
      },
      anomalies: consensus.anomalies
    }
  }

  // Generate stress test scenarios
  static generateStressTestScenarios() {
    return {
      highVolume: {
        name: 'High Volume Voting',
        description: 'Test system with thousands of concurrent votes',
        parameters: {
          eventCount: 100,
          votesPerEvent: 1000,
          concurrentUsers: 500
        }
      },
      rapidFire: {
        name: 'Rapid Fire Voting',
        description: 'Test system with rapid successive votes',
        parameters: {
          eventCount: 10,
          votesPerEvent: 100,
          voteInterval: 100 // milliseconds
        }
      },
      mixedTrust: {
        name: 'Mixed Trust Distribution',
        description: 'Test with various trust score distributions',
        parameters: {
          distributions: [
            { name: 'mostly-high', high: 0.7, medium: 0.2, low: 0.1 },
            { name: 'mostly-low', high: 0.1, medium: 0.2, low: 0.7 },
            { name: 'balanced', high: 0.33, medium: 0.34, low: 0.33 }
          ]
        }
      }
    }
  }
}

export default ConsensusTestUtils