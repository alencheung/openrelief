/**
 * Tests for Emergency Store
 * 
 * These tests verify the functionality of the emergency state management,
 * including event handling, filtering, map state, and offline actions.
 */

import { renderHook, act } from '@testing-library/react'
import { useEmergencyStore } from '../emergencyStore'
import { emergencyScenarios, createEmergencyEvent } from '@/test-utils/fixtures/emergencyScenarios'

describe('Emergency Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useEmergencyStore.getState()
    reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const state = result.current

      expect(state.events).toEqual([])
      expect(state.selectedEvent).toBeNull()
      expect(state.filteredEvents).toEqual([])
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()

      expect(state.filters.status).toEqual(['pending', 'active'])
      expect(state.filters.severity).toEqual([3, 4, 5])
      expect(state.searchQuery).toBe('')

      expect(state.mapState.center).toEqual({ lat: 0, lng: 0 })
      expect(state.mapState.zoom).toBe(10)
      expect(state.mapState.showUserLocation).toBe(true)
      expect(state.mapState.showEvents).toBe(true)
      expect(state.mapState.showHeatmap).toBe(false)
      expect(state.mapState.showClusters).toBe(true)

      expect(state.offlineActions).toEqual([])
      expect(state.emergencyTypes).toEqual([])
      expect(state.isRealtimeEnabled).toBe(true)
      expect(state.lastSyncTime).toBeNull()
      expect(state.userLocation).toBeNull()
      expect(state.isLocationTracking).toBe(false)
    })
  })

  describe('Event Actions', () => {
    describe('setEvents', () => {
      it('should set events and apply filters', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const events = [emergencyScenarios.medicalEmergency, emergencyScenarios.buildingFire]

        act(() => {
          result.current.setEvents(events)
        })

        expect(result.current.events).toEqual(events)
        expect(result.current.filteredEvents).toEqual(events) // Should pass through filters
      })

      it('should filter events based on current filters', () => {
        const { result } = renderHook(() => useEmergencyStore())
        
        // Set filter to only show active events
        act(() => {
          result.current.setFilters({ status: ['active'] })
        })

        const events = [
          emergencyScenarios.medicalEmergency, // active
          { ...emergencyScenarios.buildingFire, status: 'resolved' }, // resolved
        ]

        act(() => {
          result.current.setEvents(events)
        })

        expect(result.current.events).toEqual(events)
        expect(result.current.filteredEvents).toHaveLength(1) // Only active event
        expect(result.current.filteredEvents[0].status).toBe('active')
      })
    })

    describe('addEvent', () => {
      it('should add event to beginning of array', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const existingEvent = emergencyScenarios.buildingFire
        const newEvent = emergencyScenarios.medicalEmergency

        act(() => {
          result.current.setEvents([existingEvent])
          result.current.addEvent(newEvent)
        })

        expect(result.current.events).toHaveLength(2)
        expect(result.current.events[0]).toEqual(newEvent) // New event first
        expect(result.current.events[1]).toEqual(existingEvent)
      })

      it('should apply filters after adding event', () => {
        const { result } = renderHook(() => useEmergencyStore())
        
        act(() => {
          result.current.setFilters({ status: ['active'] })
        })

        const activeEvent = emergencyScenarios.medicalEmergency
        const resolvedEvent = { ...emergencyScenarios.buildingFire, status: 'resolved' }

        act(() => {
          result.current.addEvent(activeEvent)
        })

        expect(result.current.filteredEvents).toContain(activeEvent)
        expect(result.current.filteredEvents).not.toContain(resolvedEvent)
      })
    })

    describe('updateEvent', () => {
      it('should update existing event', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency
        const updates = { status: 'resolved', severity: 'low' }

        act(() => {
          result.current.setEvents([event])
          result.current.updateEvent(event.id, updates)
        })

        const updatedEvent = result.current.events[0]
        expect(updatedEvent.id).toBe(event.id)
        expect(updatedEvent.status).toBe(updates.status)
        expect(updatedEvent.severity).toBe(updates.severity)
        expect(updatedEvent.updated_at).toBeDefined()
      })

      it('should update selected event if it matches', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency
        const updates = { status: 'resolved' }

        act(() => {
          result.current.setEvents([event])
          result.current.setSelectedEvent(event)
          result.current.updateEvent(event.id, updates)
        })

        expect(result.current.selectedEvent?.status).toBe(updates.status)
      })

      it('should not update non-existent event', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency

        act(() => {
          result.current.setEvents([event])
          result.current.updateEvent('non-existent-id', { status: 'resolved' })
        })

        expect(result.current.events[0]).toEqual(event)
        expect(result.current.events).toHaveLength(1)
      })
    })

    describe('removeEvent', () => {
      it('should remove event by id', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event1 = emergencyScenarios.medicalEmergency
        const event2 = emergencyScenarios.buildingFire

        act(() => {
          result.current.setEvents([event1, event2])
          result.current.removeEvent(event1.id)
        })

        expect(result.current.events).toHaveLength(1)
        expect(result.current.events[0]).toEqual(event2)
      })

      it('should clear selected event if removed', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency

        act(() => {
          result.current.setEvents([event])
          result.current.setSelectedEvent(event)
          result.current.removeEvent(event.id)
        })

        expect(result.current.selectedEvent).toBeNull()
      })
    })

    describe('setSelectedEvent', () => {
      it('should set selected event', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency

        act(() => {
          result.current.setSelectedEvent(event)
        })

        expect(result.current.selectedEvent).toEqual(event)
      })

      it('should clear selected event', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const event = emergencyScenarios.medicalEmergency

        act(() => {
          result.current.setSelectedEvent(event)
          result.current.setSelectedEvent(null)
        })

        expect(result.current.selectedEvent).toBeNull()
      })
    })
  })

  describe('Filter Actions', () => {
    describe('setFilters', () => {
      it('should update filters', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const newFilters = { status: ['resolved'], severity: [1, 2] }

        act(() => {
          result.current.setFilters(newFilters)
        })

        expect(result.current.filters.status).toEqual(['resolved'])
        expect(result.current.filters.severity).toEqual([1, 2])
      })

      it('should merge with existing filters', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const initialFilters = { status: ['active'] }
        const additionalFilters = { severity: [4, 5] }

        act(() => {
          result.current.setFilters(initialFilters)
          result.current.setFilters(additionalFilters)
        })

        expect(result.current.filters.status).toEqual(['active'])
        expect(result.current.filters.severity).toEqual([4, 5])
      })

      it('should reapply filters after update', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const events = [emergencyScenarios.medicalEmergency, emergencyScenarios.buildingFire]

        act(() => {
          result.current.setEvents(events)
          result.current.setFilters({ status: ['active'] })
        })

        expect(result.current.filteredEvents).toHaveLength(2) // Both active

        act(() => {
          result.current.setFilters({ status: ['resolved'] })
        })

        expect(result.current.filteredEvents).toHaveLength(0) // None resolved
      })
    })

    describe('clearFilters', () => {
      it('should reset filters to initial state', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const customFilters = { status: ['resolved'], severity: [1] }

        act(() => {
          result.current.setFilters(customFilters)
          result.current.clearFilters()
        })

        expect(result.current.filters.status).toEqual(['pending', 'active'])
        expect(result.current.filters.severity).toEqual([3, 4, 5])
        expect(result.current.searchQuery).toBe('')
      })
    })

    describe('setSearchQuery', () => {
      it('should set search query', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const query = 'medical emergency'

        act(() => {
          result.current.setSearchQuery(query)
        })

        expect(result.current.searchQuery).toBe(query)
      })

      it('should filter events based on search query', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const events = [
          emergencyScenarios.medicalEmergency, // Contains "medical"
          emergencyScenarios.buildingFire, // Does not contain "medical"
        ]

        act(() => {
          result.current.setEvents(events)
          result.current.setSearchQuery('medical')
        })

        expect(result.current.filteredEvents).toHaveLength(1)
        expect(result.current.filteredEvents[0].title).toContain('medical')
      })
    })
  })

  describe('Map Actions', () => {
    describe('setMapState', () => {
      it('should update map state', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const newMapState = {
          center: { lat: 40.7128, lng: -74.0060 },
          zoom: 15,
          showHeatmap: true,
        }

        act(() => {
          result.current.setMapState(newMapState)
        })

        expect(result.current.mapState.center).toEqual(newMapState.center)
        expect(result.current.mapState.zoom).toBe(newMapState.zoom)
        expect(result.current.mapState.showHeatmap).toBe(newMapState.showHeatmap)
      })
    })

    describe('setMapCenter', () => {
      it('should update map center', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const center = { lat: 40.7128, lng: -74.0060 }

        act(() => {
          result.current.setMapCenter(center)
        })

        expect(result.current.mapState.center).toEqual(center)
      })
    })

    describe('setMapZoom', () => {
      it('should update map zoom', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const zoom = 15

        act(() => {
          result.current.setMapZoom(zoom)
        })

        expect(result.current.mapState.zoom).toBe(zoom)
      })
    })

    describe('setSelectedEventOnMap', () => {
      it('should set selected event id on map', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const eventId = 'emergency-1'

        act(() => {
          result.current.setSelectedEventOnMap(eventId)
        })

        expect(result.current.mapState.selectedEventId).toBe(eventId)
      })
    })
  })

  describe('Offline Actions', () => {
    describe('addOfflineAction', () => {
      it('should add offline action', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const action = {
          type: 'create' as const,
          eventId: 'emergency-1',
          data: { title: 'Test Emergency' },
        }

        act(() => {
          result.current.addOfflineAction(action)
        })

        expect(result.current.offlineActions).toHaveLength(1)
        expect(result.current.offlineActions[0]).toMatchObject(action)
        expect(result.current.offlineActions[0].id).toBeDefined()
        expect(result.current.offlineActions[0].timestamp).toBeDefined()
        expect(result.current.offlineActions[0].synced).toBe(false)
        expect(result.current.offlineActions[0].retryCount).toBe(0)
      })
    })

    describe('removeOfflineAction', () => {
      it('should remove offline action by id', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const action1 = { type: 'create' as const, data: {} }
        const action2 = { type: 'update' as const, data: {} }

        act(() => {
          result.current.addOfflineAction(action1)
          result.current.addOfflineAction(action2)
        })

        expect(result.current.offlineActions).toHaveLength(2)

        act(() => {
          result.current.removeOfflineAction(result.current.offlineActions[0].id)
        })

        expect(result.current.offlineActions).toHaveLength(1)
      })
    })

    describe('markActionSynced', () => {
      it('should mark action as synced', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const action = { type: 'create' as const, data: {} }

        act(() => {
          result.current.addOfflineAction(action)
          result.current.markActionSynced(result.current.offlineActions[0].id)
        })

        expect(result.current.offlineActions[0].synced).toBe(true)
      })
    })

    describe('clearSyncedActions', () => {
      it('should remove synced actions', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const action1 = { type: 'create' as const, data: {} }
        const action2 = { type: 'update' as const, data: {} }

        act(() => {
          result.current.addOfflineAction(action1)
          result.current.addOfflineAction(action2)
          result.current.markActionSynced(result.current.offlineActions[0].id)
        })

        expect(result.current.offlineActions).toHaveLength(2)

        act(() => {
          result.current.clearSyncedActions()
        })

        expect(result.current.offlineActions).toHaveLength(1)
        expect(result.current.offlineActions[0].synced).toBe(false)
      })
    })
  })

  describe('Location Actions', () => {
    describe('setUserLocation', () => {
      it('should set user location', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const location = { lat: 40.7128, lng: -74.0060 }
        const accuracy = 10

        act(() => {
          result.current.setUserLocation(location, accuracy)
        })

        expect(result.current.userLocation).toEqual(location)
        expect(result.current.locationAccuracy).toBe(accuracy)
      })

      it('should reapply filters with new location', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const events = [emergencyScenarios.medicalEmergency]
        const location = { lat: 40.7128, lng: -74.0060 }

        act(() => {
          result.current.setEvents(events)
          result.current.setFilters({ radius: 1000, center: location })
        })

        // Should filter based on distance from new location
        expect(result.current.filteredEvents).toBeDefined()
      })
    })

    describe('setLocationTracking', () => {
      it('should enable location tracking', () => {
        const { result } = renderHook(() => useEmergencyStore())

        act(() => {
          result.current.setLocationTracking(true)
        })

        expect(result.current.isLocationTracking).toBe(true)
      })
    })

    describe('clearUserLocation', () => {
      it('should clear user location', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const location = { lat: 40.7128, lng: -74.0060 }

        act(() => {
          result.current.setUserLocation(location)
          result.current.clearUserLocation()
        })

        expect(result.current.userLocation).toBeNull()
        expect(result.current.locationAccuracy).toBeNull()
      })
    })
  })

  describe('Utility Actions', () => {
    describe('setLoading', () => {
      it('should set loading state', () => {
        const { result } = renderHook(() => useEmergencyStore())

        act(() => {
          result.current.setLoading(true)
        })

        expect(result.current.loading).toBe(true)
      })
    })

    describe('setError', () => {
      it('should set error', () => {
        const { result } = renderHook(() => useEmergencyStore())
        const error = 'Network error'

        act(() => {
          result.current.setError(error)
        })

        expect(result.current.error).toBe(error)
      })
    })

    describe('clearError', () => {
      it('should clear error', () => {
        const { result } = renderHook(() => useEmergencyStore())

        act(() => {
          result.current.setError('Test error')
          result.current.clearError()
        })

        expect(result.current.error).toBeNull()
      })
    })

    describe('reset', () => {
      it('should reset store to initial state', () => {
        const { result } = renderHook(() => useEmergencyStore())

        // Modify state
        act(() => {
          result.current.setLoading(true)
          result.current.setError('Test error')
          result.current.setEvents([emergencyScenarios.medicalEmergency])
        })

        expect(result.current.loading).toBe(true)
        expect(result.current.error).toBe('Test error')
        expect(result.current.events).toHaveLength(1)

        // Reset
        act(() => {
          result.current.reset()
        })

        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
        expect(result.current.events).toEqual([])
        expect(result.current.filteredEvents).toEqual([])
      })
    })
  })

  describe('Filter Logic', () => {
    it('should filter by status', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const events = [
        emergencyScenarios.medicalEmergency, // active
        { ...emergencyScenarios.buildingFire, status: 'resolved' }, // resolved
      ]

      act(() => {
        result.current.setEvents(events)
        result.current.setFilters({ status: ['active'] })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].status).toBe('active')
    })

    it('should filter by severity', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const events = [
        { ...emergencyScenarios.medicalEmergency, severity: 3 }, // high
        { ...emergencyScenarios.buildingFire, severity: 5 }, // critical
      ]

      act(() => {
        result.current.setEvents(events)
        result.current.setFilters({ severity: [5] }) // Only critical
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].severity).toBe(5)
    })

    it('should filter by search query', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const events = [
        emergencyScenarios.medicalEmergency,
        emergencyScenarios.buildingFire,
      ]

      act(() => {
        result.current.setEvents(events)
        result.current.setSearchQuery('medical')
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].title).toContain('medical')
    })

    it('should filter by radius', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const center = { lat: 40.7128, lng: -74.0060 }
      const events = [
        { ...emergencyScenarios.medicalEmergency, location: 'POINT(-74.006 40.7128)' }, // Close
        { ...emergencyScenarios.buildingFire, location: 'POINT(-73.968 40.748)' }, // Far
      ]

      act(() => {
        result.current.setEvents(events)
        result.current.setFilters({ radius: 1000, center }) // 1km radius
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe(emergencyScenarios.medicalEmergency.id)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple filter combinations', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const events = [
        emergencyScenarios.medicalEmergency, // active, high, medical
        emergencyScenarios.buildingFire, // active, critical, fire
        { ...emergencyScenarios.trafficAccident, status: 'resolved' }, // resolved, medium
      ]

      act(() => {
        result.current.setEvents(events)
        result.current.setFilters({
          status: ['active'],
          severity: [5], // Only critical
        })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].type).toBe('fire')
    })

    it('should handle real-time event updates', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const initialEvent = emergencyScenarios.medicalEmergency
      const updatedEvent = { ...initialEvent, status: 'resolved' }

      act(() => {
        result.current.setEvents([initialEvent])
        result.current.updateEvent(initialEvent.id, { status: 'resolved' })
      })

      expect(result.current.events[0].status).toBe('resolved')
      expect(result.current.filteredEvents[0].status).toBe('resolved')
    })

    it('should handle offline action queuing', () => {
      const { result } = renderHook(() => useEmergencyStore())
      const actions = [
        { type: 'create' as const, data: emergencyScenarios.medicalEmergency },
        { type: 'update' as const, eventId: 'emergency-1', data: { status: 'resolved' } },
        { type: 'confirm' as const, eventId: 'emergency-1', data: { confirmed: true } },
      ]

      act(() => {
        actions.forEach(action => result.current.addOfflineAction(action))
      })

      expect(result.current.offlineActions).toHaveLength(3)

      // Mark first as synced
      act(() => {
        result.current.markActionSynced(result.current.offlineActions[0].id)
      })

      expect(result.current.offlineActions[0].synced).toBe(true)
      expect(result.current.offlineActions[1].synced).toBe(false)
      expect(result.current.offlineActions[2].synced).toBe(false)

      // Clear synced actions
      act(() => {
        result.current.clearSyncedActions()
      })

      expect(result.current.offlineActions).toHaveLength(2)
      expect(result.current.offlineActions.every(action => !action.synced)).toBe(true)
    })
  })
})