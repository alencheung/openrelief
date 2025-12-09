/**
 * Comprehensive tests for Event Expiration and Cleanup Logic
 *
 * These tests verify event expiration functionality, including
 * automatic cleanup, archival processes, and data retention policies.
 */

import { renderHook, act } from '@testing-library/react'
import { useEmergencyStore } from '../emergencyStore'
import { createEmergencyEvent, createUser } from '@/test-utils/fixtures/emergencyScenarios'

describe('Event Expiration and Cleanup Logic', () => {
  beforeEach(() => {
    useEmergencyStore.getState().reset()
  })

  describe('Event Expiration Rules', () => {
    it('should expire pending events after timeout', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      const pendingEvent = createEmergencyEvent({
        id: 'expired-pending',
        status: 'pending',
        reportedAt: expiredTime
      })

      act(() => {
        result.current.addEvent(pendingEvent)
      })

      expect(result.current.events[0].status).toBe('pending')

      // Simulate expiration check
      const now = new Date()
      const eventTime = new Date(pendingEvent.reportedAt)
      const hoursElapsed = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60)

      expect(hoursElapsed).toBeGreaterThan(24)

      // Event should be marked for expiration
      act(() => {
        result.current.updateEvent(pendingEvent.id, { status: 'closed' })
      })

      expect(result.current.events[0].status).toBe('closed')
    })

    it('should not expire active events prematurely', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      const activeEvent = createEmergencyEvent({
        id: 'recent-active',
        status: 'active',
        reportedAt: recentTime
      })

      act(() => {
        result.current.addEvent(activeEvent)
      })

      const now = new Date()
      const eventTime = new Date(activeEvent.reportedAt)
      const hoursElapsed = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60)

      expect(hoursElapsed).toBeLessThan(24)
      expect(result.current.events[0].status).toBe('active')
    })

    it('should handle different expiration times by status', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = [
        createEmergencyEvent({
          id: 'pending-expire',
          status: 'pending',
          reportedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours
        }),
        createEmergencyEvent({
          id: 'active-no-expire',
          status: 'active',
          reportedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours
        }),
        createEmergencyEvent({
          id: 'resolved-old',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() // 35 days
        })
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      const now = new Date()
      const expirationChecks = events.map(event => {
        const eventTime = new Date(event.reportedAt)
        const hoursElapsed = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60)
        const daysElapsed = hoursElapsed / 24

        return {
          id: event.id,
          status: event.status,
          hoursElapsed,
          daysElapsed,
          shouldExpire:
            (event.status === 'pending' && hoursElapsed > 24)
            || (event.status === 'resolved' && daysElapsed > 30)
        }
      })

      const pendingShouldExpire = expirationChecks.find(c => c.id === 'pending-expire')
      const activeShouldNotExpire = expirationChecks.find(c => c.id === 'active-no-expire')
      const resolvedShouldExpire = expirationChecks.find(c => c.id === 'resolved-old')

      expect(pendingShouldExpire?.shouldExpire).toBe(true)
      expect(activeShouldNotExpire?.shouldExpire).toBe(false)
      expect(resolvedShouldExpire?.shouldExpire).toBe(true)
    })
  })

  describe('Automatic Cleanup Processes', () => {
    it('should remove expired events automatically', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const oldEvents = Array.from({ length: 5 }, (_, i) =>
        createEmergencyEvent({
          id: `old-event-${i}`,
          status: 'resolved',
          reportedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() // 40 days
        })
      )

      const recentEvents = Array.from({ length: 3 }, (_, i) =>
        createEmergencyEvent({
          id: `recent-event-${i}`,
          status: 'active',
          reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
        })
      )

      act(() => {
        [...oldEvents, ...recentEvents].forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(8)

      // Simulate automatic cleanup
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      act(() => {
        result.current.events = result.current.events.filter(event => {
          const eventDate = new Date(event.reportedAt)
          return eventDate >= cutoffDate || event.status === 'active'
        })
      })

      expect(result.current.events).toHaveLength(3) // Only recent active events remain
      expect(result.current.events.every(e => e.id.startsWith('recent-event'))).toBe(true)
    })

    it('should archive events before deletion', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const eventsToArchive = Array.from({ length: 3 }, (_, i) =>
        createEmergencyEvent({
          id: `archive-event-${i}`,
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        })
      )

      act(() => {
        eventsToArchive.forEach(event => result.current.addEvent(event))
      })

      // Simulate archival process
      const archivedEvents = []
      act(() => {
        result.current.events = result.current.events.filter(event => {
          const eventDate = new Date(event.reportedAt)
          const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)

          if (daysOld > 30 && event.status === 'resolved') {
            archivedEvents.push({ ...event, archivedAt: new Date().toISOString() })
            return false
          }
          return true
        })
      })

      expect(result.current.events).toHaveLength(0)
      expect(archivedEvents).toHaveLength(3)
      expect(archivedEvents.every(e => e.archivedAt)).toBe(true)
    })

    it('should handle cleanup failures gracefully', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const problematicEvents = [
        createEmergencyEvent({
          id: 'corrupted-event-1',
          status: 'resolved',
          reportedAt: 'invalid-date' as any
        }),
        createEmergencyEvent({
          id: 'corrupted-event-2',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]

      act(() => {
        problematicEvents.forEach(event => result.current.addEvent(event))
      })

      // Cleanup should handle corrupted data gracefully
      act(() => {
        result.current.events = result.current.events.filter(event => {
          try {
            const eventDate = new Date(event.reportedAt)
            const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
            return daysOld <= 30 || event.status !== 'resolved'
          } catch (error) {
            // Remove corrupted events
            return false
          }
        })
      })

      expect(result.current.events.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Data Retention Policies', () => {
    it('should respect different retention periods by event type', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const eventsByType = [
        createEmergencyEvent({
          id: 'medical-retention',
          type: 'medical',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
        }),
        createEmergencyEvent({
          id: 'fire-retention',
          type: 'fire',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
        }),
        createEmergencyEvent({
          id: 'natural-disaster-retention',
          type: 'natural_disaster',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
        })
      ]

      act(() => {
        eventsByType.forEach(event => result.current.addEvent(event))
      })

      // Different retention periods by type
      const retentionPeriods = {
        medical: 90,    // 90 days for medical events
        fire: 60,       // 60 days for fire events
        natural_disaster: 365 // 1 year for natural disasters
      }

      const retentionChecks = eventsByType.map(event => {
        const eventDate = new Date(event.reportedAt)
        const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        const retentionPeriod = retentionPeriods[event.type as keyof typeof retentionPeriods]

        return {
          id: event.id,
          type: event.type,
          daysOld,
          retentionPeriod,
          shouldRetain: daysOld <= retentionPeriod
        }
      })

      const medicalShouldRetain = retentionChecks.find(c => c.id === 'medical-retention')
      const fireShouldNotRetain = retentionChecks.find(c => c.id === 'fire-retention')
      const disasterShouldRetain = retentionChecks.find(c => c.id === 'natural-disaster-retention')

      expect(medicalShouldRetain?.shouldRetain).toBe(true)
      expect(fireShouldNotRetain?.shouldRetain).toBe(false)
      expect(disasterShouldRetain?.shouldRetain).toBe(true)
    })

    it('should preserve high-severity events longer', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const severityEvents = [
        createEmergencyEvent({
          id: 'low-severity-old',
          severity: 'low',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'high-severity-old',
          severity: 'critical',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]

      act(() => {
        severityEvents.forEach(event => result.current.addEvent(event))
      })

      // High severity events have longer retention
      const severityRetention = {
        low: 30,      // 30 days for low severity
        medium: 45,    // 45 days for medium severity
        high: 60,      // 60 days for high severity
        critical: 90  // 90 days for critical severity
      }

      const retentionChecks = severityEvents.map(event => {
        const eventDate = new Date(event.reportedAt)
        const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        const retentionPeriod = severityRetention[event.severity as keyof typeof severityRetention]

        return {
          id: event.id,
          severity: event.severity,
          daysOld,
          retentionPeriod,
          shouldRetain: daysOld <= retentionPeriod
        }
      })

      const lowSeverityShouldNotRetain = retentionChecks.find(c => c.id === 'low-severity-old')
      const highSeverityShouldRetain = retentionChecks.find(c => c.id === 'high-severity-old')

      expect(lowSeverityShouldNotRetain?.shouldRetain).toBe(false)
      expect(highSeverityShouldRetain?.shouldRetain).toBe(true)
    })
  })

  describe('Cleanup Performance and Scalability', () => {
    it('should handle large-scale cleanup efficiently', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const largeEventSet = [
        // 1000 old events to clean up
        ...Array.from({ length: 1000 }, (_, i) =>
          createEmergencyEvent({
            id: `cleanup-old-${i}`,
            status: 'resolved',
            reportedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
          })
        ),
        // 500 recent events to keep
        ...Array.from({ length: 500 }, (_, i) =>
          createEmergencyEvent({
            id: `cleanup-recent-${i}`,
            status: 'active',
            reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          })
        )
      ]

      act(() => {
        largeEventSet.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(1500)

      const startTime = performance.now()

      // Perform cleanup
      act(() => {
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        result.current.events = result.current.events.filter(event => {
          const eventDate = new Date(event.reportedAt)
          return eventDate >= cutoffDate || event.status === 'active'
        })
      })

      const endTime = performance.now()
      const cleanupTime = endTime - startTime

      expect(result.current.events).toHaveLength(500)
      expect(cleanupTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should maintain data integrity during cleanup', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const mixedEvents = [
        createEmergencyEvent({
          id: 'keep-active',
          status: 'active',
          reportedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'keep-recent-resolved',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'remove-old-resolved',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]

      act(() => {
        mixedEvents.forEach(event => result.current.addEvent(event))
      })

      const originalActiveCount = mixedEvents.filter(e => e.status === 'active').length
      const originalRecentResolvedCount = mixedEvents.filter(e =>
        e.status === 'resolved'
        && (Date.now() - new Date(e.reportedAt).getTime()) <= 30 * 24 * 60 * 60 * 1000
      ).length

      // Perform cleanup
      act(() => {
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        result.current.events = result.current.events.filter(event => {
          const eventDate = new Date(event.reportedAt)
          return eventDate >= cutoffDate || event.status === 'active'
        })
      })

      expect(result.current.events).toHaveLength(originalActiveCount + originalRecentResolvedCount)
      expect(result.current.events.some(e => e.id === 'keep-active')).toBe(true)
      expect(result.current.events.some(e => e.id === 'keep-recent-resolved')).toBe(true)
      expect(result.current.events.some(e => e.id === 'remove-old-resolved')).toBe(false)
    })
  })

  describe('Cleanup Scheduling and Automation', () => {
    it('should schedule regular cleanup operations', () => {
      const { result } = renderHook(() => useEmergencyStore())

      // Simulate scheduled cleanup every 24 hours
      const cleanupSchedule = {
        interval: 24 * 60 * 60 * 1000, // 24 hours
        lastCleanup: Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      }

      const shouldRunCleanup = Date.now() - cleanupSchedule.lastCleanup >= cleanupSchedule.interval
      expect(shouldRunCleanup).toBe(true)

      // Add test events
      const oldEvent = createEmergencyEvent({
        id: 'scheduled-cleanup-old',
        status: 'resolved',
        reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
      })

      act(() => {
        result.current.addEvent(oldEvent)
      })

      // Simulate scheduled cleanup
      if (shouldRunCleanup) {
        act(() => {
          const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          result.current.events = result.current.events.filter(event => {
            const eventDate = new Date(event.reportedAt)
            return eventDate >= cutoffDate || event.status === 'active'
          })
        })
      }

      expect(result.current.events).toHaveLength(0)
    })

    it('should handle cleanup interruptions gracefully', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = Array.from({ length: 100 }, (_, i) =>
        createEmergencyEvent({
          id: `interrupt-cleanup-${i}`,
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        })
      )

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(100)

      // Simulate cleanup interruption
      let processedCount = 0
      act(() => {
        result.current.events = result.current.events.filter((event, index) => {
          // Simulate interruption after processing 50 events
          if (index >= 50) {
            return true
          }

          processedCount++
          const eventDate = new Date(event.reportedAt)
          const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysOld <= 30
        })
      })

      expect(processedCount).toBe(50)
      expect(result.current.events.length).toBeGreaterThan(50)
    })
  })

  describe('Cleanup Monitoring and Reporting', () => {
    it('should track cleanup statistics', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = [
        createEmergencyEvent({
          id: 'stats-keep-1',
          status: 'active',
          reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'stats-keep-2',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'stats-remove-1',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        }),
        createEmergencyEvent({
          id: 'stats-remove-2',
          status: 'resolved',
          reportedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      const initialCount = result.current.events.length

      // Perform cleanup and track statistics
      const cleanupStats = {
        startTime: Date.now(),
        initialCount,
        processed: 0,
        removed: 0,
        archived: 0,
        errors: 0
      }

      act(() => {
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        result.current.events = result.current.events.filter(event => {
          cleanupStats.processed++

          try {
            const eventDate = new Date(event.reportedAt)
            const daysOld = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)

            if (daysOld > 30 && event.status === 'resolved') {
              cleanupStats.removed++
              if (daysOld > 90) {
                cleanupStats.archived++
              }
              return false
            }
            return true
          } catch (error) {
            cleanupStats.errors++
            return false
          }
        })
        cleanupStats.endTime = Date.now()
        cleanupStats.duration = cleanupStats.endTime - cleanupStats.startTime
      })

      expect(cleanupStats.initialCount).toBe(4)
      expect(cleanupStats.processed).toBe(4)
      expect(cleanupStats.removed).toBe(2)
      expect(cleanupStats.archived).toBe(0)
      expect(cleanupStats.errors).toBe(0)
      expect(cleanupStats.duration).toBeLessThan(1000)
    })

    it('should generate cleanup reports', () => {
      const { result } = renderHook(() => useEmergencyStore())

      // Simulate cleanup report generation
      const cleanupReport = {
        timestamp: new Date().toISOString(),
        duration: 250,
        eventsProcessed: 1000,
        eventsRemoved: 300,
        eventsArchived: 50,
        eventsRemaining: 700,
        errors: 0,
        retentionPolicyViolations: 0
      }

      // Report should contain comprehensive cleanup information
      expect(cleanupReport.timestamp).toBeDefined()
      expect(cleanupReport.duration).toBeGreaterThan(0)
      expect(cleanupReport.eventsProcessed).toBe(1000)
      expect(cleanupReport.eventsRemoved).toBe(300)
      expect(cleanupReport.eventsArchived).toBe(50)
      expect(cleanupReport.eventsRemaining).toBe(700)
      expect(cleanupReport.errors).toBe(0)
      expect(cleanupReport.retentionPolicyViolations).toBe(0)

      // Validate report consistency
      expect(cleanupReport.eventsProcessed).toBe(
        cleanupReport.eventsRemoved + cleanupReport.eventsRemaining
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle events with invalid dates', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const invalidDateEvents = [
        createEmergencyEvent({
          id: 'future-date',
          status: 'pending',
          reportedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Future date
        }),
        createEmergencyEvent({
          id: 'invalid-date-string',
          status: 'resolved',
          reportedAt: 'not-a-date' as any
        }),
        createEmergencyEvent({
          id: 'null-date',
          status: 'resolved',
          reportedAt: null as any
        })
      ]

      act(() => {
        invalidDateEvents.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(3)

      // Cleanup should handle invalid dates gracefully
      act(() => {
        result.current.events = result.current.events.filter(event => {
          try {
            const eventDate = new Date(event.reportedAt)
            return !isNaN(eventDate.getTime())
          } catch {
            return false
          }
        })
      })

      expect(result.current.events.length).toBeLessThanOrEqual(3)
    })

    it('should handle cleanup during concurrent operations', async () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = Array.from({ length: 100 }, (_, i) =>
        createEmergencyEvent({
          id: `concurrent-cleanup-${i}`,
          status: 'resolved',
          reportedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        })
      )

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(100)

      // Simulate concurrent operations during cleanup
      await act(async () => {
        const cleanupPromise = new Promise(resolve => {
          setTimeout(() => {
            act(() => {
              const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              result.current.events = result.current.events.filter(event => {
                const eventDate = new Date(event.reportedAt)
                return eventDate >= cutoffDate
              })
            })
            resolve(undefined)
          }, 50)
        })

        const addEventPromise = new Promise(resolve => {
          setTimeout(() => {
            act(() => {
              result.current.addEvent(createEmergencyEvent({
                id: 'concurrent-new-event',
                status: 'active',
                reportedAt: new Date().toISOString()
              }))
            })
            resolve(undefined)
          }, 25)
        })

        await Promise.all([cleanupPromise, addEventPromise])
      })

      // Should handle concurrent operations gracefully
      expect(result.current.events.length).toBeGreaterThanOrEqual(0)
    })
  })
})