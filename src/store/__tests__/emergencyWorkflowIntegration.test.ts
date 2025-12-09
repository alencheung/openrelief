/**
 * Comprehensive Integration Tests for Complete Emergency Workflow
 * 
 * These tests verify the end-to-end emergency response workflow,
 * including event creation, trust evaluation, consensus building, and resolution.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useEmergencyStore } from '../emergencyStore'
import { useTrustStore } from '../trustStore'
import { ConsensusTestUtils } from '@/test-utils/consensus'
import { 
  initializeTestDatabase,
  resetTestDatabase,
  getMockDatabase,
  validateDatabaseIntegrity
} from '@/test-utils/database'
import { 
  createEmergencyEvent, 
  createUser, 
  createTrustScore,
  emergencyScenarios,
  testUsers 
} from '@/test-utils/fixtures/emergencyScenarios'

describe('Emergency Workflow Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    await initializeTestDatabase()
    
    // Reset stores
    useEmergencyStore.getState().reset()
    useTrustStore.getState().reset()
  })

  describe('Complete Emergency Response Workflow', () => {
    it('should handle full workflow from report to resolution', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Step 1: User reports emergency
      const reporter = testUsers.citizenUser
      const reporterTrustScore = createTrustScore({
        userId: reporter.id,
        overall: reporter.trustScore,
      })

      act(() => {
        trustResult.current.setUserScore(reporter.id, reporterTrustScore)
      })

      const emergencyEvent = createEmergencyEvent({
        id: 'integration-test-1',
        type: 'medical',
        severity: 'high',
        title: 'Cardiac Emergency - Integration Test',
        description: 'Patient experiencing chest pain at downtown location',
        location: { latitude: 40.7128, longitude: -74.0060 },
        reportedBy: reporter.id,
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(emergencyEvent)
      })

      expect(emergencyResult.current.events).toHaveLength(1)
      expect(emergencyResult.current.events[0].status).toBe('pending')

      // Step 2: System evaluates trust and determines if action needed
      const canReport = reporter.trustScore >= 0.3
      expect(canReport).toBe(true)

      // Step 3: Other users confirm the event
      const confirmers = [
        testUsers.paramedicUser,
        testUsers.firefighterUser,
        createUser({ id: 'witness-1', trustScore: 0.75 }),
        createUser({ id: 'witness-2', trustScore: 0.65 }),
      ]

      confirmers.forEach(confirmer => {
        const trustScore = createTrustScore({
          userId: confirmer.id,
          overall: confirmer.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(confirmer.id, trustScore)
        })
      })

      // Step 4: Build consensus
      const votes = [
        {
          userId: testUsers.paramedicUser.id,
          voteType: 'confirm',
          trustWeight: testUsers.paramedicUser.trustScore,
          timestamp: new Date().toISOString(),
          location: testUsers.paramedicUser.location,
        },
        {
          userId: testUsers.firefighterUser.id,
          voteType: 'confirm',
          trustWeight: testUsers.firefighterUser.trustScore,
          timestamp: new Date().toISOString(),
          location: testUsers.firefighterUser.location,
        },
        {
          userId: 'witness-1',
          voteType: 'confirm',
          trustWeight: 0.75,
          timestamp: new Date().toISOString(),
          location: { latitude: 40.7130, longitude: -74.0062 },
        },
        {
          userId: 'witness-2',
          voteType: 'confirm',
          trustWeight: 0.65,
          timestamp: new Date().toISOString(),
          location: { latitude: 40.7125, longitude: -74.0058 },
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(votes, emergencyEvent)
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.confidence).toBeGreaterThan(0.8)

      // Step 5: Update event status based on consensus
      act(() => {
        emergencyResult.current.updateEvent(emergencyEvent.id, { 
          status: 'active',
          trust_weight: consensus.weightedConfirmScore,
        })
      })

      expect(emergencyResult.current.events[0].status).toBe('active')

      // Step 6: Responders update event status
      const responderUpdates = [
        {
          userId: testUsers.paramedicUser.id,
          timestamp: new Date().toISOString(),
          type: 'status_change',
          message: 'Paramedics on scene, assessing patient condition',
        },
        {
          userId: testUsers.paramedicUser.id,
          timestamp: new Date().toISOString(),
          type: 'resource_update',
          message: 'Patient stabilized, preparing for transport',
          data: { vitals: { heartRate: 85, bloodPressure: '120/80' } },
        },
      ]

      // Step 7: Event resolution
      act(() => {
        emergencyResult.current.updateEvent(emergencyEvent.id, { 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          finalReport: {
            type: 'final_report',
            message: 'Emergency resolved successfully',
            casualties: { minor: 0, major: 1, critical: 0, fatal: 0 },
            resourcesUsed: ['ambulance', 'paramedic'],
            responseTime: 8,
          },
        })
      })

      expect(emergencyResult.current.events[0].status).toBe('resolved')

      // Step 8: Update trust scores based on outcome
      await act(async () => {
        await trustResult.current.updateTrustForAction(
          reporter.id,
          emergencyEvent.id,
          'report',
          'success'
        )
        
        await trustResult.current.updateTrustForAction(
          testUsers.paramedicUser.id,
          emergencyEvent.id,
          'confirm',
          'success'
        )
        
        await trustResult.current.updateTrustForAction(
          testUsers.firefighterUser.id,
          emergencyEvent.id,
          'confirm',
          'success'
        )
      })

      // Verify final state
      const finalReporterScore = trustResult.current.getUserScore(reporter.id)
      const finalParamedicScore = trustResult.current.getUserScore(testUsers.paramedicUser.id)
      const finalFirefighterScore = trustResult.current.getUserScore(testUsers.firefighterUser.id)

      expect(finalReporterScore?.score).toBeGreaterThan(reporter.trustScore)
      expect(finalParamedicScore?.score).toBeGreaterThan(testUsers.paramedicUser.trustScore))
      expect(finalFirefighterScore?.score).toBeGreaterThan(testUsers.firefighterUser.trustScore))
    })

    it('should handle disputed emergency workflow', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Step 1: Low-trust user reports suspicious event
      const suspiciousReporter = createUser({
        id: 'suspicious-reporter',
        trustScore: 0.2, // Low trust
      })

      const reporterTrustScore = createTrustScore({
        userId: suspiciousReporter.id,
        overall: suspiciousReporter.trustScore,
      })

      act(() => {
        trustResult.current.setUserScore(suspiciousReporter.id, reporterTrustScore)
      })

      const suspiciousEvent = createEmergencyEvent({
        id: 'disputed-test-1',
        type: 'security',
        severity: 'critical',
        title: 'Suspicious Package - Disputed',
        description: 'Suspicious package reported at public venue',
        location: { latitude: 40.7614, longitude: -73.9776 },
        reportedBy: suspiciousReporter.id,
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(suspiciousEvent)
      })

      // Step 2: Mixed responses from community
      const mixedResponders = [
        testUsers.coordinatorUser, // High trust, disputes
        createUser({ id: 'low-trust-1', trustScore: 0.15 }), // Low trust, confirms
        createUser({ id: 'low-trust-2', trustScore: 0.12 }), // Low trust, confirms
        createUser({ id: 'medium-trust-1', trustScore: 0.6 }), // Medium trust, confirms
      ]

      mixedResponders.forEach(responder => {
        const trustScore = createTrustScore({
          userId: responder.id,
          overall: responder.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(responder.id, trustScore)
        })
      })

      // Step 3: Build consensus with conflicting votes
      const conflictingVotes = [
        {
          userId: testUsers.coordinatorUser.id,
          voteType: 'dispute',
          trustWeight: testUsers.coordinatorUser.trustScore,
          timestamp: new Date().toISOString(),
        },
        {
          userId: 'low-trust-1',
          voteType: 'confirm',
          trustWeight: 0.15,
          timestamp: new Date().toISOString(),
        },
        {
          userId: 'low-trust-2',
          voteType: 'confirm',
          trustWeight: 0.12,
          timestamp: new Date().toISOString(),
        },
        {
          userId: 'medium-trust-1',
          voteType: 'confirm',
          trustWeight: 0.6,
          timestamp: new Date().toISOString(),
        },
      ]

      const consensus = ConsensusTestUtils.calculateConsensus(conflictingVotes, suspiciousEvent)
      
      // High trust user should outweigh multiple low trust users
      expect(consensus.consensus).toBe('dispute')
      expect(consensus.anomalies).toContain(
        'Low-trust users opposing high-trust consensus'
      )

      // Step 4: Handle disputed outcome
      act(() => {
        emergencyResult.current.updateEvent(suspiciousEvent.id, { 
          status: 'closed', // Disputed events are closed
          disputed: true,
          dispute_reason: 'Insufficient trust weight for confirmation',
        })
      })

      expect(emergencyResult.current.events[0].status).toBe('closed')

      // Step 5: Update trust scores based on dispute outcome
      await act(async () => {
        await trustResult.current.updateTrustForAction(
          suspiciousReporter.id,
          suspiciousEvent.id,
          'report',
          'failure' // False report
        )
      })

      const finalReporterScore = trustResult.current.getUserScore(suspiciousReporter.id)
      expect(finalReporterScore?.score).toBeLessThan(suspiciousReporter.trustScore)
      expect(finalReporterScore?.factors.penaltyScore).toBeGreaterThan(0)
    })
  })

  describe('Multi-Event Emergency Scenarios', () => {
    it('should handle concurrent emergency events in same area', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const areaLocation = { latitude: 40.7589, longitude: -73.9851 }

      // Create multiple related events
      const relatedEvents = [
        createEmergencyEvent({
          id: 'multi-event-1',
          type: 'fire',
          severity: 'critical',
          title: 'Building Fire - Main Building',
          location: areaLocation,
          reportedBy: 'reporter-1',
        }),
        createEmergencyEvent({
          id: 'multi-event-2',
          type: 'medical',
          severity: 'high',
          title: 'Medical Emergency - Fire Victims',
          location: { latitude: 40.7590, longitude: -73.9850 },
          reportedBy: 'reporter-2',
        }),
        createEmergencyEvent({
          id: 'multi-event-3',
          type: 'security',
          severity: 'medium',
          title: 'Security Threat - Evacuation',
          location: { latitude: 40.7588, longitude: -73.9852 },
          reportedBy: 'reporter-3',
        }),
      ]

      // Add all events
      act(() => {
        relatedEvents.forEach(event => emergencyResult.current.addEvent(event))
      })

      expect(emergencyResult.current.events).toHaveLength(3)

      // Set up user location for proximity filtering
      act(() => {
        emergencyResult.current.setUserLocation(areaLocation)
        emergencyResult.current.setFilters({
          radius: 500, // 500m radius
          center: areaLocation,
        })
      })

      // All events should be within radius
      expect(emergencyResult.current.filteredEvents).toHaveLength(3)

      // Set up responders
      const responders = [
        testUsers.firefighterUser,
        testUsers.paramedicUser,
        testUsers.coordinatorUser,
      ]

      responders.forEach(responder => {
        const trustScore = createTrustScore({
          userId: responder.id,
          overall: responder.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(responder.id, trustScore)
        })
      })

      // Simulate coordinated response
      const responseActions = [
        {
          eventId: 'multi-event-1',
          userId: testUsers.firefighterUser.id,
          action: 'confirm',
          outcome: 'success',
        },
        {
          eventId: 'multi-event-2',
          userId: testUsers.paramedicUser.id,
          action: 'confirm',
          outcome: 'success',
        },
        {
          eventId: 'multi-event-3',
          userId: testUsers.coordinatorUser.id,
          action: 'confirm',
          outcome: 'success',
        },
      ]

      // Process all responses
      await act(async () => {
        for (const response of responseActions) {
          await trustResult.current.updateTrustForAction(
            response.userId,
            response.eventId,
            'confirm',
            response.outcome
          )
          
          emergencyResult.current.updateEvent(response.eventId, {
            status: 'active',
          })
        }
      })

      // Verify all events are active
      expect(emergencyResult.current.events.every(event => event.status === 'active')).toBe(true)

      // Verify trust scores increased
      const finalFirefighterScore = trustResult.current.getUserScore(testUsers.firefighterUser.id)
      const finalParamedicScore = trustResult.current.getUserScore(testUsers.paramedicUser.id)
      const finalCoordinatorScore = trustResult.current.getUserScore(testUsers.coordinatorUser.id)

      expect(finalFirefighterScore?.score).toBeGreaterThan(testUsers.firefighterUser.trustScore)
      expect(finalParamedicScore?.score).toBeGreaterThan(testUsers.paramedicUser.trustScore))
      expect(finalCoordinatorScore?.score).toBeGreaterThan(testUsers.coordinatorUser.trustScore))
    })

    it('should handle emergency event escalation', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Initial event report
      const initialEvent = createEmergencyEvent({
        id: 'escalation-test-1',
        type: 'medical',
        severity: 'medium',
        title: 'Medical Emergency - Initial Report',
        description: 'Person injured in accident',
        location: { latitude: 40.7128, longitude: -74.0060 },
        reportedBy: 'initial-reporter',
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(initialEvent)
      })

      // Initial confirmations
      const initialConfirmers = [
        createUser({ id: 'confirmer-1', trustScore: 0.7 }),
        createUser({ id: 'confirmer-2', trustScore: 0.6 }),
      ]

      initialConfirmers.forEach(confirmer => {
        const trustScore = createTrustScore({
          userId: confirmer.id,
          overall: confirmer.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(confirmer.id, trustScore)
        })
      })

      // Initial consensus
      const initialVotes = initialConfirmers.map(confirmer => ({
        userId: confirmer.id,
        voteType: 'confirm' as const,
        trustWeight: confirmer.trustScore,
        timestamp: new Date().toISOString(),
      }))

      const initialConsensus = ConsensusTestUtils.calculateConsensus(initialVotes, initialEvent)
      expect(initialConsensus.consensus).toBe('confirm')

      // Activate event
      act(() => {
        emergencyResult.current.updateEvent(initialEvent.id, { 
          status: 'active',
          severity: 'high', // Escalate severity
        })
      })

      // Additional information arrives - more victims
      const escalationUpdate = {
        userId: 'first-responder',
        timestamp: new Date().toISOString(),
        type: 'casualty_update',
        message: 'Multiple victims discovered, need additional resources',
        data: { casualties: { minor: 2, major: 1, critical: 0, fatal: 0 } },
      }

      // Update event with escalation
      act(() => {
        emergencyResult.current.updateEvent(initialEvent.id, {
          severity: 'critical', // Further escalation
          priority: 'critical',
          updates: [escalationUpdate],
        })
      })

      expect(emergencyResult.current.events[0].severity).toBe('critical')
      expect(emergencyResult.current.events[0].priority).toBe('critical')

      // High-trust responders confirm escalation
      const escalationConfirmers = [
        testUsers.firefighterUser,
        testUsers.paramedicUser,
        testUsers.coordinatorUser,
      ]

      escalationConfirmers.forEach(confirmer => {
        const trustScore = createTrustScore({
          userId: confirmer.id,
          overall: confirmer.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(confirmer.id, trustScore)
        })
      })

      // Escalation consensus
      const escalationVotes = escalationConfirmers.map(confirmer => ({
        userId: confirmer.id,
        voteType: 'confirm' as const,
        trustWeight: confirmer.trustScore,
        timestamp: new Date().toISOString(),
      }))

      const escalationConsensus = ConsensusTestUtils.calculateConsensus(escalationVotes, initialEvent)
      expect(escalationConsensus.consensus).toBe('confirm')
      expect(escalationConsensus.confidence).toBeGreaterThan(initialConsensus.confidence)

      // Final resolution
      act(() => {
        emergencyResult.current.updateEvent(initialEvent.id, {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          escalation_level: 'high',
          resources_deployed: ['fire_truck', 'ambulance', 'rescue_team'],
        })
      })

      expect(emergencyResult.current.events[0].status).toBe('resolved')
      expect(emergencyResult.current.events[0].escalation_level).toBe('high')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle system failures during emergency workflow', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const emergencyEvent = createEmergencyEvent({
        id: 'error-handling-test-1',
        type: 'natural_disaster',
        severity: 'critical',
        title: 'Flood - System Error Test',
        location: { latitude: 40.7282, longitude: -74.0776 },
        reportedBy: 'error-test-reporter',
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(emergencyEvent)
      })

      // Simulate partial system failure - some confirmations lost
      const confirmations = [
        { userId: 'confirmer-1', success: true },
        { userId: 'confirmer-2', success: false, error: 'Network timeout' },
        { userId: 'confirmer-3', success: true },
        { userId: 'confirmer-4', success: false, error: 'Database error' },
        { userId: 'confirmer-5', success: true },
      ]

      // Process confirmations with error handling
      const processedConfirmations = []
      for (const confirmation of confirmations) {
        try {
          if (confirmation.success) {
            const user = createUser({ id: confirmation.userId, trustScore: 0.7 })
            const trustScore = createTrustScore({
              userId: user.id,
              overall: user.trustScore,
            })
            
            act(() => {
              trustResult.current.setUserScore(user.id, trustScore)
            })
            
            processedConfirmations.push({
              userId: confirmation.userId,
              voteType: 'confirm',
              trustWeight: user.trustScore,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (error) {
          // Log error but continue processing
          console.error(`Confirmation failed for ${confirmation.userId}:`, error)
        }
      }

      // Build consensus with available confirmations
      const consensus = ConsensusTestUtils.calculateConsensus(processedConfirmations, emergencyEvent)
      
      // Should still reach consensus with partial data
      expect(processedConfirmations.length).toBe(3)
      expect(consensus.consensus).toBe('confirm')
      expect(consensus.anomalies.length).toBeGreaterThan(0)

      // System should recover and continue workflow
      act(() => {
        emergencyResult.current.updateEvent(emergencyEvent.id, {
          status: 'active',
          error_recovery: true,
          partial_data: true,
        })
      })

      expect(emergencyResult.current.events[0].status).toBe('active')
      expect(emergencyResult.current.events[0].error_recovery).toBe(true)
    })

    it('should handle data corruption gracefully', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Create event with some corrupted data
      const corruptedEvent = createEmergencyEvent({
        id: 'corruption-test-1',
        type: 'medical',
        severity: 'high',
        title: 'Medical Emergency - Corruption Test',
        location: { latitude: 40.7128, longitude: -74.0060 },
        reportedBy: 'corruption-test-reporter',
        status: 'pending',
      })

      act(() => {
        emergencyResult.current.addEvent(corruptedEvent)
      })

      // Simulate data corruption during updates
      const corruptionScenarios = [
        { field: 'location', value: 'INVALID_COORDINATES' },
        { field: 'severity', value: 'INVALID_SEVERITY' },
        { field: 'trust_weight', value: -1 },
        { field: 'reported_by', value: null },
      ]

      corruptionScenarios.forEach(scenario => {
        try {
          act(() => {
            emergencyResult.current.updateEvent(corruptedEvent.id, {
              [scenario.field]: scenario.value,
            })
          })
        } catch (error) {
          // Should handle corruption gracefully
          expect(error).toBeDefined()
        }
      })

      // Verify event still exists with valid data
      const currentEvent = emergencyResult.current.events.find(e => e.id === corruptedEvent.id)
      expect(currentEvent).toBeDefined()
      expect(currentEvent?.id).toBe(corruptedEvent.id)

      // System should mark event for review
      act(() => {
        emergencyResult.current.updateEvent(corruptedEvent.id, {
          data_integrity_flag: true,
          review_required: true,
        })
      })

      const flaggedEvent = emergencyResult.current.events.find(e => e.id === corruptedEvent.id)
      expect(flaggedEvent?.data_integrity_flag).toBe(true)
      expect(flaggedEvent?.review_required).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-volume emergency scenarios', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Create large number of emergency events
      const highVolumeEvents = Array.from({ length: 100 }, (_, i) =>
        createEmergencyEvent({
          id: `high-volume-${i}`,
          type: (['medical', 'fire', 'accident'] as any)[i % 3],
          severity: ['medium', 'high', 'critical'][i % 3] as any,
          title: `High Volume Emergency ${i}`,
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          },
          reportedBy: `reporter-${i}`,
          status: 'pending',
        })
      )

      const startTime = performance.now()

      // Add all events
      act(() => {
        highVolumeEvents.forEach(event => emergencyResult.current.addEvent(event))
      })

      const addTime = performance.now() - startTime

      expect(emergencyResult.current.events).toHaveLength(100)
      expect(addTime).toBeLessThan(1000) // Should complete within 1 second

      // Process confirmations efficiently
      const confirmationStartTime = performance.now()

      const confirmations = highVolumeEvents.slice(0, 50).map((event, i) => ({
        eventId: event.id,
        userId: `confirmer-${i}`,
        trustWeight: 0.7 + (Math.random() * 0.2),
        timestamp: new Date().toISOString(),
      }))

      // Batch process confirmations
      await act(async () => {
        for (const confirmation of confirmations) {
          const user = createUser({ 
            id: confirmation.userId, 
            trustScore: confirmation.trustWeight 
          })
          const trustScore = createTrustScore({
            userId: user.id,
            overall: user.trustScore,
          })
          
          act(() => {
            trustResult.current.setUserScore(user.id, trustScore)
          })
          
          // Update event status
          emergencyResult.current.updateEvent(confirmation.eventId, {
            status: 'active',
          })
        }
      })

      const confirmationTime = performance.now() - confirmationStartTime

      // Verify performance
      expect(confirmationTime).toBeLessThan(2000) // Should complete within 2 seconds
      
      const activeEvents = emergencyResult.current.events.filter(e => e.status === 'active')
      expect(activeEvents.length).toBe(50)
    })

    it('should maintain data integrity under load', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      // Create concurrent emergency scenarios
      const concurrentScenarios = Array.from({ length: 10 }, (_, i) => ({
        event: createEmergencyEvent({
          id: `concurrent-${i}`,
          type: 'medical',
          severity: 'high',
          title: `Concurrent Emergency ${i}`,
          location: {
            latitude: 40.7128 + (i * 0.01),
            longitude: -74.0060 + (i * 0.01),
          },
          reportedBy: `reporter-${i}`,
          status: 'pending',
        }),
        confirmers: Array.from({ length: 5 }, (_, j) =>
          createUser({ 
            id: `confirmer-${i}-${j}`, 
            trustScore: 0.6 + (Math.random() * 0.3) 
          })
        ),
      }))

      // Process all scenarios concurrently
      await act(async () => {
        const promises = concurrentScenarios.map(async (scenario, scenarioIndex) => {
          // Add event
          act(() => {
            emergencyResult.current.addEvent(scenario.event)
          })

          // Process confirmations
          const confirmationPromises = scenario.confirmers.map(async confirmer => {
            const trustScore = createTrustScore({
              userId: confirmer.id,
              overall: confirmer.trustScore,
            })
            
            act(() => {
              trustResult.current.setUserScore(confirmer.id, trustScore)
            })

            // Small delay to simulate real processing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
          })

          await Promise.all(confirmationPromises)

          // Update event status
          act(() => {
            emergencyResult.current.updateEvent(scenario.event.id, {
              status: 'active',
            })
          })

          return scenario.event.id
        })

        await Promise.all(promises)
      })

      // Verify data integrity
      expect(emergencyResult.current.events).toHaveLength(10)
      expect(emergencyResult.current.events.every(e => e.status === 'active')).toBe(true)
      
      // Verify no data corruption
      const integrityCheck = validateDatabaseIntegrity()
      expect(integrityCheck.isValid).toBe(true)
      expect(integrityCheck.issues).toHaveLength(0)
    })
  })

  describe('Real-Time Workflow Integration', () => {
    it('should handle real-time event updates', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const realtimeEvent = createEmergencyEvent({
        id: 'realtime-test-1',
        type: 'accident',
        severity: 'high',
        title: 'Real-Time Traffic Accident',
        location: { latitude: 40.7580, longitude: -73.9855 },
        reportedBy: 'realtime-reporter',
        status: 'pending',
      })

      // Add initial event
      act(() => {
        emergencyResult.current.addEvent(realtimeEvent)
      })

      expect(emergencyResult.current.events[0].status).toBe('pending')

      // Simulate real-time updates
      const realtimeUpdates = [
        {
          timestamp: Date.now() + 5000,
          update: { status: 'active' },
          source: 'first_responder',
        },
        {
          timestamp: Date.now() + 15000,
          update: { 
            severity: 'critical',
            casualties: { minor: 2, major: 1 }
          },
          source: 'paramedic',
        },
        {
          timestamp: Date.now() + 30000,
          update: { 
            status: 'resolved',
            resolved_at: new Date().toISOString()
          },
          source: 'coordinator',
        },
      ]

      // Process real-time updates
      for (const update of realtimeUpdates) {
        await new Promise(resolve => setTimeout(resolve, update.timestamp - Date.now()))
        
        act(() => {
          emergencyResult.current.updateEvent(realtimeEvent.id, update.update)
        })

        // Verify update was applied
        const currentEvent = emergencyResult.current.events.find(e => e.id === realtimeEvent.id)
        expect(currentEvent).toBeDefined()
        
        Object.keys(update.update).forEach(key => {
          expect(currentEvent[key]).toEqual(update.update[key])
        })
      }

      // Verify final state
      const finalEvent = emergencyResult.current.events.find(e => e.id === realtimeEvent.id)
      expect(finalEvent?.status).toBe('resolved')
      expect(finalEvent?.severity).toBe('critical')
      expect(finalEvent?.casualties).toEqual({ minor: 2, major: 1 })
    })
  })
})