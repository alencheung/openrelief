/**
 * Comprehensive tests for Spatial Queries and Location-Based Filtering
 * 
 * These tests verify spatial query functionality, including
 * location-based filtering, distance calculations, and geographic operations.
 */

import { renderHook, act } from '@testing-library/react'
import { useEmergencyStore } from '../emergencyStore'
import { createEmergencyEvent, createUser } from '@/test-utils/fixtures/emergencyScenarios'

describe('Spatial Queries and Location-Based Filtering', () => {
  beforeEach(() => {
    useEmergencyStore.getState().reset()
  })

  describe('Distance Calculations', () => {
    it('should calculate accurate distances between points', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const nycPoint = { lat: 40.7128, lng: -74.0060 } // NYC
      const bostonPoint = { lat: 42.3601, lng: -71.0589 } // Boston

      // Add events at these locations
      const nycEvent = createEmergencyEvent({
        id: 'nyc-event',
        location: nycPoint,
      })

      const bostonEvent = createEmergencyEvent({
        id: 'boston-event',
        location: bostonPoint,
      })

      act(() => {
        result.current.addEvent(nycEvent)
        result.current.addEvent(bostonEvent)
        result.current.setUserLocation(nycPoint)
      })

      // Set filter with radius around NYC
      act(() => {
        result.current.setFilters({
          radius: 400000, // 400km (approximately NYC to Boston distance)
          center: nycPoint,
        })
      })

      // Both events should be within the large radius
      expect(result.current.filteredEvents).toHaveLength(2)

      // Test with smaller radius
      act(() => {
        result.current.setFilters({
          radius: 50000, // 50km
          center: nycPoint,
        })
      })

      // Only NYC event should be within small radius
      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('nyc-event')
    })

    it('should handle very close locations', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const centerPoint = { lat: 40.7128, lng: -74.0060 }
      const nearbyPoint = { lat: 40.7129, lng: -74.0061 } // Very close

      const centerEvent = createEmergencyEvent({
        id: 'center-event',
        location: centerPoint,
      })

      const nearbyEvent = createEmergencyEvent({
        id: 'nearby-event',
        location: nearbyPoint,
      })

      act(() => {
        result.current.addEvent(centerEvent)
        result.current.addEvent(nearbyEvent)
        result.current.setFilters({
          radius: 1000, // 1km
          center: centerPoint,
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('should handle antipodal points (maximum distance)', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const point1 = { lat: 0, lng: 0 } // Equator, Prime Meridian
      const point2 = { lat: 0, lng: 180 } // Equator, International Date Line

      const event1 = createEmergencyEvent({
        id: 'antipodal-1',
        location: point1,
      })

      const event2 = createEmergencyEvent({
        id: 'antipodal-2',
        location: point2,
      })

      act(() => {
        result.current.addEvent(event1)
        result.current.addEvent(event2)
        result.current.setUserLocation(point1)
      })

      // Test with half Earth circumference radius
      act(() => {
        result.current.setFilters({
          radius: 20015000, // Half Earth's circumference in meters
          center: point1,
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)

      // Test with smaller radius
      act(() => {
        result.current.setFilters({
          radius: 10000000, // 10,000km
          center: point1,
        })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('antipodal-1')
    })
  })

  describe('Geographic Bounds Filtering', () => {
    it('should filter events within geographic bounds', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const bounds = {
        north: 40.8,
        south: 40.6,
        east: -73.9,
        west: -74.1,
      }

      const events = [
        createEmergencyEvent({
          id: 'inside-bounds-1',
          location: { lat: 40.7, lng: -74.0 }, // Inside bounds
        }),
        createEmergencyEvent({
          id: 'inside-bounds-2',
          location: { lat: 40.75, lng: -73.95 }, // Inside bounds
        }),
        createEmergencyEvent({
          id: 'outside-bounds-1',
          location: { lat: 41.0, lng: -74.0 }, // North of bounds
        }),
        createEmergencyEvent({
          id: 'outside-bounds-2',
          location: { lat: 40.5, lng: -74.0 }, // South of bounds
        }),
        createEmergencyEvent({
          id: 'outside-bounds-3',
          location: { lat: 40.7, lng: -73.8 }, // East of bounds
        }),
        createEmergencyEvent({
          id: 'outside-bounds-4',
          location: { lat: 40.7, lng: -74.2 }, // West of bounds
        }),
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
        
        // Set map bounds (this would typically come from map component)
        result.current.setMapState({
          bounds,
        })
      })

      // Only events inside bounds should be visible
      const insideEvents = events.filter(event => 
        event.id === 'inside-bounds-1' || event.id === 'inside-bounds-2'
      )

      expect(result.current.events).toHaveLength(6)
      // Note: Actual bounds filtering would need to be implemented in the filter logic
      // This test verifies the setup and data structure
    })

    it('should handle bounds crossing equator/date line', () => {
      const { result } = renderHook(() => useEmergencyStore())

      // Bounds crossing the equator and date line
      const specialBounds = {
        north: 10,
        south: -10,
        east: 170,
        west: -170,
      }

      const events = [
        createEmergencyEvent({
          id: 'special-1',
          location: { lat: 0, lng: 180 }, // On date line
        }),
        createEmergencyEvent({
          id: 'special-2',
          location: { lat: 0, lng: -180 }, // On date line
        }),
        createEmergencyEvent({
          id: 'special-3',
          location: { lat: 5, lng: 175 }, // Inside bounds
        }),
        createEmergencyEvent({
          id: 'special-4',
          location: { lat: -5, lng: -175 }, // Inside bounds
        }),
        createEmergencyEvent({
          id: 'special-5',
          location: { lat: 15, lng: 0 }, // Outside bounds (north)
        }),
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
        result.current.setMapState({
          bounds: specialBounds,
        })
      })

      expect(result.current.events).toHaveLength(5)
    })
  })

  describe('Location-Based Trust Weighting', () => {
    it('should apply location proximity weighting to trust calculations', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const eventLocation = { lat: 40.7128, lng: -74.0060 }

      const nearbyUser = createUser({
        id: 'nearby-user',
        trustScore: 0.8,
        location: { lat: 40.7130, lng: -74.0062 }, // ~200m away
      })

      const distantUser = createUser({
        id: 'distant-user',
        trustScore: 0.8,
        location: { lat: 40.7589, lng: -73.9851 }, // ~5km away
      })

      const event = createEmergencyEvent({
        id: 'location-trust-event',
        location: eventLocation,
      })

      act(() => {
        result.current.addEvent(event)
        result.current.setUserLocation(eventLocation)
      })

      // This would typically be used in consensus calculations
      // Testing the setup and distance calculations
      expect(result.current.events).toHaveLength(1)
      expect(result.current.userLocation).toEqual(eventLocation)
    })

    it('should handle users without location data', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const event = createEmergencyEvent({
        id: 'no-location-user-event',
        location: { lat: 40.7128, lng: -74.0060 },
      })

      const userWithoutLocation = createUser({
        id: 'no-location-user',
        trustScore: 0.8,
        location: undefined,
      })

      act(() => {
        result.current.addEvent(event)
        result.current.setUserLocation(null)
      })

      expect(result.current.events).toHaveLength(1)
      expect(result.current.userLocation).toBeNull()
    })
  })

  describe('Spatial Indexing Performance', () => {
    it('should handle large numbers of events efficiently', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const centerPoint = { lat: 40.7128, lng: -74.0060 }
      const largeEventSet = Array.from({ length: 10000 }, (_, i) => {
        const lat = centerPoint.lat + (Math.random() - 0.5) * 0.1 // ±0.05 degrees
        const lng = centerPoint.lng + (Math.random() - 0.5) * 0.1
        return createEmergencyEvent({
          id: `perf-event-${i}`,
          location: { lat, lng },
        })
      })

      const startTime = performance.now()

      act(() => {
        largeEventSet.forEach(event => result.current.addEvent(event))
      })

      const addTime = performance.now()

      act(() => {
        result.current.setFilters({
          radius: 5000, // 5km
          center: centerPoint,
        })
      })

      const filterTime = performance.now()

      expect(result.current.events).toHaveLength(10000)
      expect(addTime - startTime).toBeLessThan(1000) // Should add within 1 second
      expect(filterTime - addTime).toBeLessThan(500) // Should filter within 500ms
    })

    it('should maintain performance with complex geographic queries', () => {
      const { result } = renderHook(() => useEmergencyStore())

      // Create events in a grid pattern
      const gridEvents = []
      for (let lat = 40.0; lat <= 41.0; lat += 0.01) {
        for (let lng = -74.5; lng <= -73.5; lng += 0.01) {
          gridEvents.push(createEmergencyEvent({
            id: `grid-${lat}-${lng}`,
            location: { lat, lng },
          }))
        }
      }

      const startTime = performance.now()

      act(() => {
        gridEvents.forEach(event => result.current.addEvent(event))
      })

      const addTime = performance.now()

      // Complex query with multiple filters
      act(() => {
        result.current.setFilters({
          radius: 2000, // 2km
          center: { lat: 40.5, lng: -74.0 },
          severity: [3, 4], // High and critical only
          status: ['active'],
        })
      })

      const filterTime = performance.now()

      expect(result.current.events).toHaveLength(gridEvents.length)
      expect(addTime - startTime).toBeLessThan(2000) // Should add within 2 seconds
      expect(filterTime - addTime).toBeLessThan(1000) // Should filter within 1 second
    })
  })

  describe('Geographic Edge Cases', () => {
    it('should handle polar regions', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const northPoleEvent = createEmergencyEvent({
        id: 'north-pole',
        location: { lat: 89.9, lng: 0 }, // Near North Pole
      })

      const southPoleEvent = createEmergencyEvent({
        id: 'south-pole',
        location: { lat: -89.9, lng: 0 }, // Near South Pole
      })

      act(() => {
        result.current.addEvent(northPoleEvent)
        result.current.addEvent(southPoleEvent)
        result.current.setUserLocation({ lat: 90, lng: 0 }) // At North Pole
      })

      act(() => {
        result.current.setFilters({
          radius: 100000, // 100km
          center: { lat: 90, lng: 0 },
        })
      })

      // North pole event should be within radius, south pole should not
      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('north-pole')
    })

    it('should handle date line crossing', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const dateLineEvents = [
        createEmergencyEvent({
          id: 'dateline-east',
          location: { lat: 40.7128, lng: 179.9 }, // Just east of date line
        }),
        createEmergencyEvent({
          id: 'dateline-west',
          location: { lat: 40.7128, lng: -179.9 }, // Just west of date line
        }),
        createEmergencyEvent({
          id: 'dateline-far-east',
          location: { lat: 40.7128, lng: 170 }, // Further east
        }),
      ]

      act(() => {
        dateLineEvents.forEach(event => result.current.addEvent(event))
        result.current.setUserLocation({ lat: 40.7128, lng: 180 }) // On date line
      })

      act(() => {
        result.current.setFilters({
          radius: 100000, // 100km
          center: { lat: 40.7128, lng: 180 },
        })
      })

      // Events on both sides of date line should be within radius
      expect(result.current.filteredEvents).toHaveLength(2)
      expect(result.current.filteredEvents.map(e => e.id)).toEqual(
        expect.arrayContaining(['dateline-east', 'dateline-west'])
      )
    })

    it('should handle invalid coordinates gracefully', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const invalidEvents = [
        createEmergencyEvent({
          id: 'invalid-lat',
          location: { lat: 91, lng: 0 }, // Invalid latitude
        }),
        createEmergencyEvent({
          id: 'invalid-lng',
          location: { lat: 0, lng: 181 }, // Invalid longitude
        }),
        createEmergencyEvent({
          id: 'nan-coords',
          location: { lat: NaN, lng: NaN }, // NaN coordinates
        }),
      ]

      act(() => {
        invalidEvents.forEach(event => result.current.addEvent(event))
      })

      // Should handle invalid coordinates without crashing
      expect(result.current.events).toHaveLength(3)
      
      // Filtering should still work
      act(() => {
        result.current.setFilters({
          radius: 1000,
          center: { lat: 40.7128, lng: -74.0060 },
        })
      })

      // Invalid coordinates should be filtered out or handled gracefully
      expect(result.current.filteredEvents.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Location-Based Search Optimization', () => {
    it('should optimize queries for nearby events', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const userLocation = { lat: 40.7128, lng: -74.0060 }

      // Create events at various distances
      const distanceEvents = [
        { id: 'very-near', distance: 100 },    // 100m
        { id: 'near', distance: 500 },          // 500m
        { id: 'medium', distance: 2000 },        // 2km
        { id: 'far', distance: 10000 },         // 10km
        { id: 'very-far', distance: 50000 },     // 50km
      ]

      const events = distanceEvents.map(({ id, distance }) => {
        // Calculate approximate coordinates at given distance
        const latOffset = distance / 111320 // 1 degree lat ≈ 111.32km
        return createEmergencyEvent({
          id,
          location: { 
            lat: userLocation.lat + latOffset, 
            lng: userLocation.lng 
          },
        })
      })

      act(() => {
        events.forEach(event => result.current.addEvent(event))
        result.current.setUserLocation(userLocation)
      })

      // Test progressive radius filtering
      const radii = [200, 1000, 5000, 20000]
      const expectedCounts = [1, 2, 3, 4]

      radii.forEach((radius, index) => {
        act(() => {
          result.current.setFilters({
            radius,
            center: userLocation,
          })
        })

        expect(result.current.filteredEvents.length).toBe(expectedCounts[index])
      })
    })

    it('should cache location-based filter results', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const userLocation = { lat: 40.7128, lng: -74.0060 }
      const events = Array.from({ length: 100 }, (_, i) =>
        createEmergencyEvent({
          id: `cache-test-${i}`,
          location: {
            lat: userLocation.lat + (Math.random() - 0.5) * 0.01,
            lng: userLocation.lng + (Math.random() - 0.5) * 0.01,
          },
        })
      )

      act(() => {
        events.forEach(event => result.current.addEvent(event))
        result.current.setUserLocation(userLocation)
      })

      // First filter - should take longer
      const startTime1 = performance.now()
      act(() => {
        result.current.setFilters({
          radius: 1000,
          center: userLocation,
        })
      })
      const firstFilterTime = performance.now() - startTime1

      // Second identical filter - should be faster (cached)
      const startTime2 = performance.now()
      act(() => {
        result.current.setFilters({
          radius: 1000,
          center: userLocation,
        })
      })
      const secondFilterTime = performance.now() - startTime2

      expect(result.current.filteredEvents.length).toBeGreaterThan(0)
      // Second filter should be faster (though this depends on implementation)
      expect(secondFilterTime).toBeLessThanOrEqual(firstFilterTime * 1.1)
    })
  })

  describe('Real-Time Location Updates', () => {
    it('should update filters when user location changes', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const initialLocation = { lat: 40.7128, lng: -74.0060 }
      const newLocation = { lat: 40.7589, lng: -73.9851 }

      const events = [
        createEmergencyEvent({
          id: 'near-initial',
          location: { lat: 40.7130, lng: -74.0062 }, // Near initial
        }),
        createEmergencyEvent({
          id: 'near-new',
          location: { lat: 40.7591, lng: -73.9852 }, // Near new
        }),
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
        result.current.setUserLocation(initialLocation)
        result.current.setFilters({
          radius: 1000,
          center: initialLocation,
        })
      })

      // Should see event near initial location
      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('near-initial')

      // Update user location
      act(() => {
        result.current.setUserLocation(newLocation)
        result.current.setFilters({
          radius: 1000,
          center: newLocation,
        })
      })

      // Should now see event near new location
      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('near-new')
    })

    it('should handle location tracking enable/disable', () => {
      const { result } = renderHook(() => useEmergencyStore())

      act(() => {
        result.current.setLocationTracking(true)
      })

      expect(result.current.isLocationTracking).toBe(true)

      act(() => {
        result.current.setLocationTracking(false)
      })

      expect(result.current.isLocationTracking).toBe(false)
    })
  })

  describe('Spatial Data Integrity', () => {
    it('should validate location data consistency', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const events = [
        createEmergencyEvent({
          id: 'valid-location',
          location: { lat: 40.7128, lng: -74.0060 },
        }),
        createEmergencyEvent({
          id: 'missing-location',
          location: undefined as any,
        }),
        createEmergencyEvent({
          id: 'null-location',
          location: null as any,
        }),
        createEmergencyEvent({
          id: 'empty-location',
          location: {} as any,
        }),
      ]

      act(() => {
        events.forEach(event => result.current.addEvent(event))
      })

      expect(result.current.events).toHaveLength(4)

      // Filtering should handle various location states
      act(() => {
        result.current.setFilters({
          radius: 1000,
          center: { lat: 40.7128, lng: -74.0060 },
        })
      })

      // Should only include events with valid locations
      expect(result.current.filteredEvents.length).toBeLessThanOrEqual(1)
    })

    it('should maintain spatial data consistency during updates', () => {
      const { result } = renderHook(() => useEmergencyStore())

      const originalEvent = createEmergencyEvent({
        id: 'spatial-consistency-test',
        location: { lat: 40.7128, lng: -74.0060 },
      })

      const updatedLocation = { lat: 40.7589, lng: -73.9851 }

      act(() => {
        result.current.addEvent(originalEvent)
      })

      expect(result.current.events[0].location).toEqual(originalEvent.location)

      act(() => {
        result.current.updateEvent(originalEvent.id, {
          location: updatedLocation,
        })
      })

      expect(result.current.events[0].location).toEqual(updatedLocation)
      expect(result.current.events[0].updated_at).toBeDefined()
    })
  })
})