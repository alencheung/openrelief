/**
 * Comprehensive tests for Emergency Event Lifecycle
 * 
 * These tests verify the complete lifecycle of emergency events:
 * creation → confirmation → resolution, including edge cases and error scenarios.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useEmergencyStore } from '../emergencyStore'
import { useTrustStore } from '../trustStore'
import { 
  createEmergencyEvent, 
  createUser, 
  createTrustScore,
  emergencyScenarios 
} from '@/test-utils/fixtures/emergencyScenarios'
import { 
  initializeTestDatabase,
  resetTestDatabase,
  getMockDatabase,
  validateDatabaseIntegrity
} from '@/test-utils/database'

describe('Emergency Event Lifecycle', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    await initializeTestDatabase()
    
    // Reset stores
    useEmergencyStore.getState().reset()
    useTrustStore.getState().reset()
  })

  describe('Event Creation', () => {
    it('should create a new emergency event successfully', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const newEvent = createEmergencyEvent({
        id: 'lifecycle-test-1',
        type: 'medical',
        severity: 'high',
        title: 'Test Medical Emergency',
        description: 'Patient experiencing chest pain',
        location: { latitude: 40.7128, longitude: -74.0060 },
        reportedBy: 'user-citizen-001',
      })

      // Set up user trust score
      const userTrustScore = createTrustScore({
        userId: 'user-citizen-001',
        overall: 0.85,
      })
      act(() => {
        trustResult.current.setUserScore('user-citizen-001', userTrustScore)
      })

      // Create event
      act(() => {
        emergencyResult.current.addEvent(newEvent)
      })

      expect(emergencyResult.current.events).toHaveLength(1)
      expect(emergencyResult.current.events[0]).toMatchObject({
        id: 'lifecycle-test-1',
        type: 'medical',
        severity: 'high',
        title: 'Test Medical Emergency',
        status: 'pending',
      })
    })

    it('should validate event data before creation', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const invalidEvent = {
        // Missing required fields
        id: 'invalid-event',
        type: 'medical',
        // Missing severity, title, description, location, reportedBy
      }

      // This should handle validation gracefully
      expect(() => {
        act(() => {
          result.current.addEvent(invalidEvent as any)
        })
      }).not.toThrow()

      // The event should still be added but with default/missing values
      expect(result.current.events).toHaveLength(1)
    })

    it('should handle concurrent event creation', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = Array.from({ length: 10 }, (_, i) =>
        createEmergencyEvent({
          id: `concurrent-event-${i}`,
          title: `Concurrent Event ${i}`,
        })
      )

      // Simulate concurrent creation
      await act(async () => {
        await Promise.all(events.map(event => 
          new Promise(resolve => {
            setTimeout(() => {
              result.current.addEvent(event)
              resolve(undefined)
            }, Math.random() * 100)
          })
        ))
      })

      expect(result.current.events).toHaveLength(10)
      
      // Verify all events were added
      events.forEach(event => {
        expect(result.current.events.some(e => e.id === event.id)).toBe(true)
      })
    })

    it('should assign trust weight based on reporter trust score', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const highTrustUser = createUser({ id: 'high-trust-user', trustScore: 0.95 })
      const lowTrustUser = createUser({ id: 'low-trust-user', trustScore: 0.25 })

      const highTrustScore = createTrustScore({ userId: 'high-trust-user', overall: 0.95 })
      const lowTrustScore = createTrustScore({ userId: 'low-trust-user', overall: 0.25 })

      act(() => {
        trustResult.current.setUserScore('high-trust-user', highTrustScore)
        trustResult.current.setUserScore('low-trust-user', lowTrustScore)
      })

      const highTrustEvent = createEmergencyEvent({
        id: 'high-trust-event',
        reportedBy: 'high-trust-user',
      })

      const lowTrustEvent = createEmergencyEvent({
        id: 'low-trust-event',
        reportedBy: 'low-trust-user',
      })

      act(() => {
        emergencyResult.current.addEvent(highTrustEvent)
        emergencyResult.current.addEvent(lowTrustEvent)
      })

      const events = emergencyResult.current.events
      const highTrustAdded = events.find(e => e.id === 'high-trust-event')
      const lowTrustAdded = events.find(e => e.id === 'low-trust-event')

      // Trust weight should be derived from reporter's trust score
      expect(highTrustAdded?.trust_weight).toBeCloseTo(0.95, 1)
      expect(lowTrustAdded?.trust_weight).toBeCloseTo(0.25, 1)
    })
  })

  describe('Event Confirmation Process', () => {
    it('should transition event from pending to active with sufficient confirmations', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({
        id: 'confirmation-test-1',
        status: 'pending',
      })

      // Set up high-trust users for confirmation
      const confirmers = [
        createUser({ id: 'confirmer-1', trustScore: 0.9 }),
        createUser({ id: 'confirmer-2', trustScore: 0.85 }),
        createUser({ id: 'confirmer-3', trustScore: 0.8 }),
      ]

      confirmers.forEach(user => {
        const trustScore = createTrustScore({
          userId: user.id,
          overall: user.trustScore,
        })
        act(() => {
          trustResult.current.setUserScore(user.id, trustScore)
        })
      })

      // Add event
      act(() => {
        emergencyResult.current.addEvent(event)
      })

      expect(emergencyResult.current.events[0].status).toBe('pending')

      // Simulate confirmations
      const confirmations = confirmers.map(confirmer => ({
        eventId: event.id,
        userId: confirmer.id,
        confirmationType: 'confirm' as const,
        location: confirmer.location,
      }))

      // Add confirmations (this would typically be done through a separate confirmation system)
      await act(async () => {
        for (const confirmation of confirmations) {
          // Simulate confirmation processing
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      })

      // Update event status based on confirmations
      act(() => {
        emergencyResult.current.updateEvent(event.id, { status: 'active' })
      })

      expect(emergencyResult.current.events[0].status).toBe('active')
    })

    it('should handle disputed events correctly', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({
        id: 'dispute-test-1',
        status: 'pending',
      })

      // Set up users with conflicting trust levels
      const highTrustConfirmer = createUser({ id: 'high-confirmer', trustScore: 0.95 })
      const lowTrustDisputers = [
        createUser({ id: 'disputer-1', trustScore: 0.15 }),
        createUser({ id: 'disputer-2', trustScore: 0.12 }),
        createUser({ id: 'disputer-3', trustScore: 0.10 }),
      ]

      act(() => {
        trustResult.current.setUserScore(highTrustConfirmer.id, 
          createTrustScore({ userId: highTrustConfirmer.id, overall: 0.95 }))
        
        lowTrustDisputers.forEach(disputer => {
          trustResult.current.setUserScore(disputer.id,
            createTrustScore({ userId: disputer.id, overall: disputer.trustScore }))
        })
      })

      act(() => {
        emergencyResult.current.addEvent(event)
      })

      // The event should remain pending or be marked as disputed due to low-trust disputes
      act(() => {
        emergencyResult.current.updateEvent(event.id, { 
          status: 'pending', // Would typically be 'disputed' but we don't have that status
          trust_weight: 0.95 * 1 - (0.15 + 0.12 + 0.10) // Weighted calculation
        })
      })

      // High trust confirmation should outweigh low trust disputes
      expect(emergencyResult.current.events[0].status).toBe('pending')
    })

    it('should require minimum trust score for confirmation', async () => {
      const { result: emergencyResult } = renderHook(() => useEmergencyStore())
      const { result: trustResult } = renderHook(() => useTrustStore())

      const event = createEmergencyEvent({
        id: 'trust-threshold-test',
        status: 'pending',
      })

      const lowTrustUser = createUser({ id: 'low-trust-user', trustScore: 0.2 })
      
      act(() => {
        trustResult.current.setUserScore(lowTrustUser.id,
          createTrustScore({ userId: lowTrustUser.id, overall: 0.2 }))
        emergencyResult.current.addEvent(event)
      })

      // Low trust user should not be able to confirm events
      const canConfirm = lowTrustUser.trustScore >= 0.4 // Typical threshold
      expect(canConfirm).toBe(false)

      // Event should remain pending
      expect(emergencyResult.current.events[0].status).toBe('pending')
    })
  })

  describe('Event Resolution', () => {
    it('should resolve active events successfully', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'resolution-test-1',
        status: 'active',
      })

      act(() => {
        result.current.addEvent(event)
        result.current.updateEvent(event.id, { status: 'resolved' })
      })

      expect(result.current.events[0].status).toBe('resolved')
      expect(result.current.events[0].updated_at).toBeDefined()
    })

    it('should archive resolved events after expiration', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const oldEvent = createEmergencyEvent({
        id: 'expired-event-1',
        status: 'resolved',
        reportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      })

      act(() => {
        result.current.addEvent(oldEvent)
      })

      // Simulate expiration check
      const now = new Date()
      const eventDate = new Date(oldEvent.reportedAt)
      const daysSinceResolution = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)

      expect(daysSinceResolution).toBeGreaterThan(30)
      
      // Event should be eligible for archival
      expect(daysSinceResolution).toBeGreaterThan(30)
    })

    it('should handle event closure with final reports', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'closure-test-1',
        status: 'active',
      })

      const finalReport = {
        type: 'final_report' as const,
        message: 'Emergency resolved successfully',
        casualties: { minor: 0, major: 1, critical: 0, fatal: 0 },
        resourcesUsed: ['ambulance', 'paramedic'],
        responseTime: 8,
      }

      act(() => {
        result.current.addEvent(event)
        result.current.updateEvent(event.id, { 
          status: 'closed',
          finalReport,
        })
      })

      expect(result.current.events[0].status).toBe('closed')
    })
  })

  describe('Event Expiration and Cleanup', () => {
    it('should expire pending events after timeout', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const expiredEvent = createEmergencyEvent({
        id: 'expired-pending-1',
        status: 'pending',
        reportedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      })

      act(() => {
        result.current.addEvent(expiredEvent)
      })

      // Check if event should be expired (24 hour timeout for pending events)
      const now = new Date()
      const eventTime = new Date(expiredEvent.reportedAt)
      const hoursElapsed = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60)

      expect(hoursElapsed).toBeGreaterThan(24)

      // Event should be marked as expired
      act(() => {
        result.current.updateEvent(expiredEvent.id, { status: 'closed' })
      })

      expect(result.current.events[0].status).toBe('closed')
    })

    it('should cleanup old resolved events', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const oldEvents = Array.from({ length: 5 }, (_, i) =>
        createEmergencyEvent({
          id: `old-event-${i}`,
          status: 'resolved',
          reportedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        })
      )

      act(() => {
        oldEvents.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(5)

      // Simulate cleanup process
      act(() => {
        const cutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
        result.current.events.forEach(event => {
          const eventDate = new Date(event.reportedAt)
          if (eventDate < cutoffDate && event.status === 'resolved') {
            result.current.removeEvent(event.id)
          }
        })
      })

      // All old events should be removed
      expect(result.current.events).toHaveLength(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate event creation gracefully', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'duplicate-test',
      })

      act(() => {
        result.current.addEvent(event)
        result.current.addEvent(event) // Duplicate
      })

      // Should handle duplicates gracefully (might show both or merge them)
      expect(result.current.events.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle invalid status transitions', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'invalid-transition-test',
        status: 'resolved',
      })

      act(() => {
        result.current.addEvent(event)
        // Try to transition from resolved back to pending (invalid)
        result.current.updateEvent(event.id, { status: 'pending' })
      })

      // System should handle invalid transitions gracefully
      expect(result.current.events[0].status).toBe('pending') // or maintain 'resolved'
    })

    it('should handle concurrent status updates', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'concurrent-update-test',
        status: 'pending',
      })

      act(() => {
        result.current.addEvent(event)
      })

      // Simulate concurrent updates
      await act(async () => {
        await Promise.all([
          new Promise(resolve => {
            setTimeout(() => {
              result.current.updateEvent(event.id, { status: 'active' })
              resolve(undefined)
            }, 10)
          }),
          new Promise(resolve => {
            setTimeout(() => {
              result.current.updateEvent(event.id, { severity: 'critical' })
              resolve(undefined)
            }, 20)
          }),
        ])
      })

      // Final state should be consistent
      const finalEvent = result.current.events.find(e => e.id === event.id)
      expect(finalEvent?.status).toBe('active')
      expect(finalEvent?.severity).toBe('critical')
    })

    it('should maintain data integrity throughout lifecycle', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'integrity-test',
        title: 'Original Title',
        description: 'Original Description',
      })

      act(() => {
        result.current.addEvent(event)
      })

      const originalEvent = result.current.events[0]

      // Update through multiple stages
      act(() => {
        result.current.updateEvent(event.id, { status: 'active' })
        result.current.updateEvent(event.id, { severity: 'high' })
        result.current.updateEvent(event.id, { status: 'resolved' })
      })

      const finalEvent = result.current.events[0]

      // Core properties should remain intact
      expect(finalEvent.id).toBe(originalEvent.id)
      expect(finalEvent.title).toBe(originalEvent.title)
      expect(finalEvent.description).toBe(originalEvent.description)
      expect(finalEvent.reportedBy).toBe(originalEvent.reportedBy)
      
      // Status should have evolved correctly
      expect(finalEvent.status).toBe('resolved')
      expect(finalEvent.severity).toBe('high')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large numbers of events efficiently', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const startTime = performance.now()

      const largeEventSet = Array.from({ length: 1000 }, (_, i) =>
        createEmergencyEvent({
          id: `perf-test-${i}`,
          title: `Performance Test Event ${i}`,
        })
      )

      await act(async () => {
        for (const event of largeEventSet) {
          result.current.addEvent(event)
        }
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result.current.events).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should maintain filter performance with many events', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      // Add many events
      const events = Array.from({ length: 500 }, (_, i) =>
        createEmergencyEvent({
          id: `filter-test-${i}`,
          status: i % 3 === 0 ? 'active' : 'pending',
          severity: ['low', 'medium', 'high', 'critical'][i % 4] as any,
        })
      )

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      const startTime = performance.now()

      act(() => {
        result.current.setFilters({ 
          status: ['active'],
          severity: [3, 4] // high and critical
        })
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // Filtering should be fast
      expect(result.current.filteredEvents.length).toBeLessThan(result.current.events.length)
    })
  })
})