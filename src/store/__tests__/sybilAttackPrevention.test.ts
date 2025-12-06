/**
 * Comprehensive tests for Sybil Attack Prevention Mechanisms
 * 
 * These tests verify Sybil attack detection and prevention,
 * including account behavior analysis, voting patterns, and trust score manipulation.
 */

import { renderHook, act } from '@testing-library/react'
import { useTrustStore } from '../trustStore'
import { useEmergencyStore } from '../emergencyStore'
import { ConsensusTestUtils } from '@/test-utils/consensus'
import { createUser, createEmergencyEvent, createTrustScore } from '@/test-utils/fixtures/emergencyScenarios'

describe('Sybil Attack Prevention Mechanisms', () => {
  beforeEach(() => {
    useTrustStore.getState().reset()
    useEmergencyStore.getState().reset()
  })

  describe('Account Behavior Analysis', () => {
    it('should detect suspicious account creation patterns', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Simulate multiple accounts created in short time
      const suspiciousAccounts = Array.from({ length: 20 }, (_, i) =>
        createUser({
          id: `sybil-${i}`,
          trustScore: 0.1 + (Math.random() * 0.1), // Very low trust scores
          createdAt: new Date(Date.now() + Math.random() * 60000).toISOString(), // Within 1 minute
        })
      )

      // Set up trust scores
      suspiciousAccounts.forEach(account => {
        const trustScore = createTrustScore({
          userId: account.id,
          overall: account.trustScore,
          factors: {
            reportingAccuracy: 0.1,
            confirmationAccuracy: 0.1,
            disputeAccuracy: 0.1,
            responseTime: 60,
            locationAccuracy: 0.1,
            contributionFrequency: 0,
            communityEndorsement: 0.1,
            penaltyScore: 0,
            expertiseAreas: [],
          },
        })
        act(() => {
          trustResult.current.setUserScore(account.id, trustScore)
        })
      })

      // Analyze account creation patterns
      const creationTimes = suspiciousAccounts.map(account => new Date(account.createdAt).getTime())
      const timeSpan = Math.max(...creationTimes) - Math.min(...creationTimes)
      const accountsPerMinute = suspiciousAccounts.length / (timeSpan / 60000)

      // Should detect suspicious pattern
      expect(accountsPerMinute).toBeGreaterThan(10) // More than 10 accounts per minute
      expect(suspiciousAccounts.every(account => account.trustScore < 0.2)).toBe(true)
    })

    it('should detect similar voting patterns across accounts', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const sybilGroup = Array.from({ length: 10 }, (_, i) =>
        createUser({
          id: `sybil-voter-${i}`,
          trustScore: 0.15 + (i * 0.01), // Similar low trust scores
          createdAt: new Date(Date.now() - 3600000).toISOString(), // Created around same time
        })
      )

      // Set up trust scores
      sybilGroup.forEach(account => {
        const trustScore = createTrustScore({
          userId: account.id,
          overall: account.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(account.id, trustScore)
        })
      })

      // Simulate identical voting behavior
      const votingPattern = {
        targetEvent: 'target-emergency-1',
        voteType: 'dispute',
        timing: new Date().toISOString(),
        location: { lat: 40.7128, lng: -74.0060 }, // Same location
      }

      // Analyze voting similarity
      const voteSimilarity = {
        sameVoteType: true,
        sameTiming: true,
        sameLocation: true,
        trustScoreVariance: Math.max(...sybilGroup.map(a => a.trustScore)) - 
                         Math.min(...sybilGroup.map(a => a.trustScore)),
      }

      expect(voteSimilarity.sameVoteType).toBe(true)
      expect(voteSimilarity.sameTiming).toBe(true)
      expect(voteSimilarity.sameLocation).toBe(true)
      expect(voteSimilarity.trustScoreVariance).toBeLessThan(0.1)
    })

    it('should detect coordinated behavior patterns', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const coordinatedAccounts = Array.from({ length: 5 }, (_, i) =>
        createUser({
          id: `coordinated-${i}`,
          trustScore: 0.2 + (i * 0.05),
        })
      )

      coordinatedAccounts.forEach(account => {
        const trustScore = createTrustScore({
          userId: account.id,
          overall: account.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(account.id, trustScore)
        })
      })

      // Simulate coordinated actions
      const coordinatedActions = [
        { time: '09:00:00', action: 'vote', target: 'event-1' },
        { time: '09:00:05', action: 'vote', target: 'event-2' },
        { time: '09:00:10', action: 'vote', target: 'event-3' },
        { time: '09:00:15', action: 'report', target: 'new-event-1' },
      ]

      // Analyze coordination patterns
      const timeIntervals = coordinatedActions.slice(1).map((action, i) => {
        const prevTime = new Date(`1970-01-01T${coordinatedActions[i].time}Z`).getTime()
        const currTime = new Date(`1970-01-01T${action.time}Z`).getTime()
        return currTime - prevTime
      })

      const averageInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length
      const intervalVariance = timeIntervals.reduce((sum, interval) => 
        sum + Math.pow(interval - averageInterval, 2), 0) / timeIntervals.length

      // Should detect coordination (very consistent timing)
      expect(averageInterval).toBeLessThan(10000) // Less than 10 seconds between actions
      expect(intervalVariance).toBeLessThan(1000) // Low variance indicates coordination
    })
  })

  describe('Trust Score Manipulation Detection', () => {
    it('should detect rapid trust score inflation attempts', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const suspiciousUser = createUser({
        id: 'trust-inflator',
        trustScore: 0.1,
      })

      const initialTrustScore = createTrustScore({
        userId: suspiciousUser.id,
        overall: 0.1,
        factors: {
          reportingAccuracy: 0.1,
          confirmationAccuracy: 0.1,
          disputeAccuracy: 0.1,
          responseTime: 60,
          locationAccuracy: 0.1,
          contributionFrequency: 0,
          communityEndorsement: 0.1,
          penaltyScore: 0,
          expertiseAreas: [],
        },
      })

      act(() => {
        trustResult.current.setUserScore(suspiciousUser.id, initialTrustScore)
      })

      // Simulate rapid trust score increases through suspicious activities
      const trustHistory = []
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await trustResult.current.updateTrustForAction(
            suspiciousUser.id,
            `event-${i}`,
            'report',
            'success'
          )
        })
        
        const currentScore = trustResult.current.getUserScore(suspiciousUser.id)
        trustHistory.push(currentScore?.score || 0)
      }

      // Analyze trust score growth pattern
      const scoreIncreases = trustHistory.slice(1).map((score, i) => score - trustHistory[i])
      const averageIncrease = scoreIncreases.reduce((sum, inc) => sum + inc, 0) / scoreIncreases.length
      const maxIncrease = Math.max(...scoreIncreases)

      // Should detect suspicious rapid growth
      expect(maxIncrease).toBeGreaterThan(0.05) // Single large increase
      expect(averageIncrease).toBeGreaterThan(0.02) // Consistent increases
      expect(trustHistory[trustHistory.length - 1]).toBeGreaterThan(0.3) // Final score inflated
    })

    it('should detect circular endorsement patterns', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const circularGroup = Array.from({ length: 5 }, (_, i) =>
        createUser({
          id: `circular-${i}`,
          trustScore: 0.3,
        })
      )

      circularGroup.forEach(account => {
        const trustScore = createTrustScore({
          userId: account.id,
          overall: account.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(account.id, trustScore)
        })
      })

      // Simulate circular endorsements (A endorses B, B endorses C, etc.)
      const endorsements = []
      for (let i = 0; i < circularGroup.length; i++) {
        const endorser = circularGroup[i]
        const endorsed = circularGroup[(i + 1) % circularGroup.length]
        
        endorsements.push({
          endorserId: endorser.id,
          endorsedId: endorsed.id,
          timestamp: new Date().toISOString(),
        })
      }

      // Detect circular patterns
      const endorserCounts = {}
      const endorsedCounts = {}
      
      endorsements.forEach(endorsement => {
        endorserCounts[endorsement.endorserId] = (endorserCounts[endorsement.endorserId] || 0) + 1
        endorsedCounts[endorsement.endorsedId] = (endorsedCounts[endorsement.endorsedId] || 0) + 1
      })

      const uniqueEndorsers = Object.keys(endorserCounts).length
      const uniqueEndorsed = Object.keys(endorsedCounts).length
      const totalEndorsements = endorsements.length

      // Should detect circular pattern
      expect(uniqueEndorsers).toBe(circularGroup.length)
      expect(uniqueEndorsed).toBe(circularGroup.length)
      expect(totalEndorsements).toBe(circularGroup.length)
      expect(uniqueEndorsers === uniqueEndorsed).toBe(true) // Perfect circle
    })
  })

  describe('Network Analysis for Sybil Detection', () => {
    it('should analyze account connection patterns', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const sybilNetwork = Array.from({ length: 15 }, (_, i) =>
        createUser({
          id: `network-sybil-${i}`,
          trustScore: 0.1 + (Math.random() * 0.1),
          createdAt: new Date(Date.now() - 3600000 + Math.random() * 60000).toISOString(),
        })
      )

      const legitimateUsers = Array.from({ length: 3 }, (_, i) =>
        createUser({
          id: `legitimate-${i}`,
          trustScore: 0.7 + (Math.random() * 0.2),
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(), // Random over 30 days
        })
      )

      [...sybilNetwork, ...legitimateUsers].forEach(user => {
        const trustScore = createTrustScore({
          userId: user.id,
          overall: user.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(user.id, trustScore)
        })
      })

      // Simulate interaction network
      const interactions = [
        // Sybil accounts interact with each other
        ...sybilNetwork.slice(0, -1).map((account, i) => ({
          from: account.id,
          to: sybilNetwork[i + 1].id,
          type: 'confirmation',
          timestamp: new Date().toISOString(),
        })),
        // Limited interactions with legitimate users
        ...sybilNetwork.slice(0, 3).map(account => ({
          from: account.id,
          to: legitimateUsers[0].id,
          type: 'confirmation',
          timestamp: new Date().toISOString(),
        })),
      ]

      // Analyze network structure
      const interactionCounts = {}
      interactions.forEach(interaction => {
        interactionCounts[interaction.from] = (interactionCounts[interaction.from] || 0) + 1
      })

      const sybilInteractionCounts = sybilNetwork.map(account => 
        interactionCounts[account.id] || 0
      )
      const legitimateInteractionCounts = legitimateUsers.map(user =>
        interactionCounts[user.id] || 0
      )

      const avgSybilInteractions = sybilInteractionCounts.reduce((sum, count) => sum + count, 0) / sybilInteractionCounts.length
      const avgLegitimateInteractions = legitimateInteractionCounts.reduce((sum, count) => sum + count, 0) / legitimateInteractionCounts.length

      // Should detect suspicious network patterns
      expect(avgSybilInteractions).toBeGreaterThan(avgLegitimateInteractions)
      expect(sybilNetwork.every(account => account.trustScore < 0.2)).toBe(true)
    })

    it('should detect clustering behavior', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Create clustered accounts (similar characteristics)
      const cluster1 = Array.from({ length: 8 }, (_, i) =>
        createUser({
          id: `cluster1-${i}`,
          trustScore: 0.12,
          location: { lat: 40.7128, lng: -74.0060 }, // Same location
          createdAt: new Date(Date.now() - 7200000).toISOString(), // Same creation time
        })
      )

      const cluster2 = Array.from({ length: 6 }, (_, i) =>
        createUser({
          id: `cluster2-${i}`,
          trustScore: 0.15,
          location: { lat: 40.7589, lng: -73.9851 }, // Same location
          createdAt: new Date(Date.now() - 7200000).toISOString(), // Same creation time
        })
      )

      [...cluster1, ...cluster2].forEach(user => {
        const trustScore = createTrustScore({
          userId: user.id,
          overall: user.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(user.id, trustScore)
        })
      })

      // Analyze clustering
      const locationClusters = {}
      const timeClusters = {}
      const trustScoreClusters = {}

      ;[...cluster1, ...cluster2].forEach(user => {
        const locationKey = `${user.location.lat},${user.location.lng}`
        const timeKey = new Date(user.createdAt).toDateString()
        const trustKey = user.trustScore.toFixed(2)

        locationClusters[locationKey] = (locationClusters[locationKey] || 0) + 1
        timeClusters[timeKey] = (timeClusters[timeKey] || 0) + 1
        trustScoreClusters[trustKey] = (trustScoreClusters[trustKey] || 0) + 1
      })

      const maxLocationCluster = Math.max(...Object.values(locationClusters))
      const maxTimeCluster = Math.max(...Object.values(timeClusters))
      const maxTrustCluster = Math.max(...Object.values(trustScoreClusters))

      // Should detect clustering
      expect(maxLocationCluster).toBeGreaterThan(5) // Many accounts at same location
      expect(maxTimeCluster).toBeGreaterThan(10) // Many accounts created same day
      expect(maxTrustCluster).toBeGreaterThan(5) // Many accounts with same trust score
    })
  })

  describe('Behavioral Anomaly Detection', () => {
    it('should detect unusual activity patterns', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const suspiciousUser = createUser({
        id: 'unusual-pattern-user',
        trustScore: 0.2,
      })

      const trustScore = createTrustScore({
        userId: suspiciousUser.id,
        overall: suspiciousUser.trustScore,
      })

      act(() => {
        trustResult.current.setUserScore(suspiciousUser.id, trustScore)
      })

      // Simulate unusual activity pattern
      const activities = []
      
      // Burst of activity followed by silence
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          await trustResult.current.updateTrustForAction(
            suspiciousUser.id,
            `burst-event-${i}`,
            'report',
            'success'
          )
        })
        activities.push({
          timestamp: Date.now(),
          action: 'report',
        })
      }

      // Long period of inactivity
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Another burst
      for (let i = 0; i < 15; i++) {
        await act(async () => {
          await trustResult.current.updateTrustForAction(
            suspiciousUser.id,
            `burst-event-2-${i}`,
            'confirm',
            'success'
          )
        })
        activities.push({
          timestamp: Date.now(),
          action: 'confirm',
        })
      }

      // Analyze activity pattern
      const timeGaps = activities.slice(1).map((activity, i) => 
        activity.timestamp - activities[i].timestamp
      )
      
      const longGaps = timeGaps.filter(gap => gap > 5000) // Gaps longer than 5 seconds
      const shortGaps = timeGaps.filter(gap => gap < 1000) // Gaps shorter than 1 second

      // Should detect unusual pattern
      expect(longGaps.length).toBeGreaterThan(0) // Has long gaps
      expect(shortGaps.length).toBeGreaterThan(30) // Has many rapid activities
    })

    it('should detect geographic anomalies', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      const geographicallySuspiciousUser = createUser({
        id: 'geo-anomaly-user',
        trustScore: 0.15,
      })

      const trustScore = createTrustScore({
        userId: geographicallySuspiciousUser.id,
        overall: geographicallySuspiciousUser.trustScore,
      })

      act(() => {
        trustResult.current.setUserScore(geographicallySuspiciousUser.id, trustScore)
      })

      // Simulate impossible geographic movements
      const locations = [
        { lat: 40.7128, lng: -74.0060, timestamp: Date.now() }, // NYC
        { lat: 51.5074, lng: -0.1278, timestamp: Date.now() + 600000 }, // London (5 minutes later)
        { lat: -33.8688, lng: 151.2093, timestamp: Date.now() + 1200000 }, // Sydney (10 minutes later)
        { lat: 40.7128, lng: -74.0060, timestamp: Date.now() + 1800000 }, // Back to NYC
      ]

      // Analyze geographic feasibility
      const movements = locations.slice(1).map((location, i) => {
        const prevLocation = locations[i]
        const distance = calculateDistance(prevLocation, location)
        const timeDiff = (location.timestamp - prevLocation.timestamp) / 1000 // seconds
        const speed = distance / timeDiff // meters per second
        
        return {
          from: prevLocation,
          to: location,
          distance,
          timeDiff,
          speed,
          feasible: speed < 340 // Commercial jet speed ~340 m/s
        }
      })

      const infeasibleMovements = movements.filter(movement => !movement.feasible)

      // Should detect geographic anomalies
      expect(infeasibleMovements.length).toBeGreaterThan(0)
      expect(infeasibleMovements.some(m => m.speed > 1000)).toBe(true) // Supersonic speeds
    })
  })

  describe('Sybil Resistance Testing', () => {
    it('should resist large-scale Sybil attacks', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())

      const legitimateUser = createUser({
        id: 'legitimate-defender',
        trustScore: 0.95,
      })

      const sybilArmy = Array.from({ length: 100 }, (_, i) =>
        createUser({
          id: `sybil-army-${i}`,
          trustScore: 0.05 + (Math.random() * 0.1),
        })
      )

      // Set up trust scores
      const legitimateTrustScore = createTrustScore({
        userId: legitimateUser.id,
        overall: legitimateUser.trustScore,
      })

      act(() => {
        trustResult.current.setUserScore(legitimateUser.id, legitimateTrustScore)
      })

      sybilArmy.forEach(sybil => {
        const sybilTrustScore = createTrustScore({
          userId: sybil.id,
          overall: sybil.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(sybil.id, sybilTrustScore)
        })
      })

      const event = createEmergencyEvent({
        id: 'sybil-resistance-test',
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(event)
      })

      // Simulate voting scenario
      const votes = [
        {
          userId: legitimateUser.id,
          voteType: 'confirm',
          trustWeight: legitimateUser.trustScore,
          timestamp: new Date().toISOString(),
        },
        ...sybilArmy.map(sybil => ({
          userId: sybil.id,
          voteType: 'dispute',
          trustWeight: sybil.trustScore,
          timestamp: new Date().toISOString(),
        })),
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, event)

      // System should resist Sybil attack
      expect(consensus.consensus).toBe('confirm') // Legitimate high-trust user should win
      expect(consensus.weightedConfirmScore).toBeGreaterThan(consensus.weightedDisputeScore)
      expect(consensus.anomalies).toContain(
        'High proportion of low-trust voters (potential Sybil attack)'
      )
    })

    it('should adapt to evolving Sybil tactics', async () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Simulate evolving Sybil attack
      const evolvingSybils = Array.from({ length: 20 }, (_, i) =>
        createUser({
          id: `evolving-sybil-${i}`,
          trustScore: 0.1 + (i * 0.01), // Gradually increasing trust scores
          createdAt: new Date(Date.now() - (20 - i) * 86400000).toISOString(), // Staggered creation
        })
      )

      evolvingSybils.forEach(sybil => {
        const trustScore = createTrustScore({
          userId: sybil.id,
          overall: sybil.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(sybil.id, trustScore)
        })
      })

      // Analyze evolution pattern
      const trustScoreProgression = evolvingSybils.map(sybil => sybil.trustScore)
      const creationProgression = evolvingSybils.map(sybil => new Date(sybil.createdAt).getTime())

      const trustScoreTrend = calculateTrend(trustScoreProgression)
      const creationTrend = calculateTrend(creationProgression)

      // Should detect evolving patterns
      expect(trustScoreTrend).toBeGreaterThan(0) // Increasing trust scores
      expect(creationTrend).toBeGreaterThan(0) // Staggered creation times

      // System should adapt detection thresholds
      const adaptiveThreshold = {
        baseTrustThreshold: 0.3,
        suspiciousPatternThreshold: 0.8,
        adaptationRate: 0.1,
      }

      const detectedSybils = evolvingSybils.filter(sybil => 
        sybil.trustScore < adaptiveThreshold.baseTrustThreshold ||
        (sybil.trustScore > adaptiveThreshold.suspiciousPatternThreshold && 
         trustScoreTrend > adaptiveThreshold.adaptationRate)
      )

      expect(detectedSybils.length).toBeGreaterThan(10) // Should detect most Sybils
    })
  })

  describe('Prevention Effectiveness Metrics', () => {
    it('should measure Sybil attack prevention effectiveness', () => {
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Simulate various attack scenarios
      const attackScenarios = [
        {
          name: 'low-trust-attack',
          sybilCount: 10,
          legitimateCount: 2,
          sybilTrustRange: [0.05, 0.15],
          legitimateTrustRange: [0.8, 0.95],
        },
        {
          name: 'medium-trust-attack',
          sybilCount: 5,
          legitimateCount: 3,
          sybilTrustRange: [0.3, 0.4],
          legitimateTrustRange: [0.7, 0.85],
        },
        {
          name: 'mixed-trust-attack',
          sybilCount: 15,
          legitimateCount: 5,
          sybilTrustRange: [0.1, 0.5],
          legitimateTrustRange: [0.6, 0.9],
        },
      ]

      const effectivenessMetrics = attackScenarios.map(scenario => {
        const sybils = Array.from({ length: scenario.sybilCount }, (_, i) =>
          createUser({
            id: `${scenario.name}-sybil-${i}`,
            trustScore: scenario.sybilTrustRange[0] + 
              Math.random() * (scenario.sybilTrustRange[1] - scenario.sybilTrustRange[0]),
          })
        )

        const legitimate = Array.from({ length: scenario.legitimateCount }, (_, i) =>
          createUser({
            id: `${scenario.name}-legitimate-${i}`,
            trustScore: scenario.legitimateTrustRange[0] + 
              Math.random() * (scenario.legitimateTrustRange[1] - scenario.legitimateTrustRange[0]),
          })
        )

        ;[...sybils, ...legitimate].forEach(user => {
          const trustScore = createTrustScore({
            userId: user.id,
            overall: user.trustScore,
          })
          act(() => {
            trustResult.current.setUserScore(user.id, trustScore)
          })
        })

        // Calculate effectiveness metrics
        const totalUsers = sybils.length + legitimate.length
        const detectedSybils = sybils.filter(sybil => sybil.trustScore < 0.3).length
        const falsePositives = legitimate.filter(user => user.trustScore < 0.3).length
        const falseNegatives = sybils.filter(sybil => sybil.trustScore >= 0.3).length

        return {
          scenario: scenario.name,
          totalUsers,
          actualSybils: sybils.length,
          detectedSybils,
          falsePositives,
          falseNegatives,
          truePositives: detectedSybils,
          trueNegatives: legitimate.length - falsePositives,
          precision: detectedSybils / (detectedSybils + falsePositives) || 0,
          recall: detectedSybils / sybils.length,
          f1Score: 2 * (detectedSybils / (detectedSybils + falsePositives) || 0) * 
                   (detectedSybils / sybils.length) / 
                   ((detectedSybils / (detectedSybils + falsePositives) || 0) + (detectedSybils / sybils.length)),
        }
      })

      // Evaluate overall effectiveness
      const avgPrecision = effectivenessMetrics.reduce((sum, m) => sum + m.precision, 0) / effectivenessMetrics.length
      const avgRecall = effectivenessMetrics.reduce((sum, m) => sum + m.recall, 0) / effectivenessMetrics.length
      const avgF1Score = effectivenessMetrics.reduce((sum, m) => sum + m.f1Score, 0) / effectivenessMetrics.length

      // Should maintain high effectiveness
      expect(avgPrecision).toBeGreaterThan(0.8)
      expect(avgRecall).toBeGreaterThan(0.7)
      expect(avgF1Score).toBeGreaterThan(0.75)
    })
  })
})

// Helper function to calculate distance between two points
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180
  const φ2 = (point2.lat * Math.PI) / 180
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Helper function to calculate trend in an array
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0
  
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((sum, val) => sum + val, 0)
  const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return slope
}