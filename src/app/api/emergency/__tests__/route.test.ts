/**
 * Tests for Emergency Management API Routes
 *
 * These tests verify the API endpoints for emergency event management
 * including CRUD operations, validation, and error handling.
 */

import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../route'
import { createMockSupabaseClient } from '@/test-utils/mocks/supabase'
import { createEmergencyEvent, createUser } from '@/test-utils/fixtures/emergencyScenarios'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: () => ({
    get: jest.fn((name) => {
      if (name === 'authorization') {
        return 'Bearer test-token'
      }
      return null
    })
  })
}))

describe('Emergency API Routes', () => {
  let mockSupabase: any

  beforeEach(() => {
    const { supabase } = require('@/lib/supabase')
    mockSupabase = supabase
    mockSupabase.__resetDatabase()
  })

  describe('GET /api/emergency', () => {
    it('should fetch emergency events with default parameters', async () => {
      const mockEvents = [
        createEmergencyEvent({ id: 'event-1' }),
        createEmergencyEvent({ id: 'event-2' })
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockEvents,
                error: null,
                count: 2
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)
    })

    it('should fetch emergency events with filters', async () => {
      const mockFilteredEvents = [
        createEmergencyEvent({
          id: 'event-3',
          emergency_type_id: 1, // Fire
          severity: 'high'
        })
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: mockFilteredEvents,
                    error: null,
                    count: 1
                  })
                })
              })
            })
          })
        })
      })

      const request = new NextRequest(
        'http://localhost:3000/api/emergency?type=1&severity=high&status=pending'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toHaveLength(1)
      expect(data.events[0].emergency_type_id).toBe(1)
      expect(data.events[0].severity).toBe('high')
    })

    it('should fetch emergency events with spatial filtering', async () => {
      const mockNearbyEvents = [
        createEmergencyEvent({
          id: 'event-4',
          location: 'POINT(-74.0060 40.7128)' // NYC
        })
      ]

      mockSupabase.rpc.mockReturnValue({
        data: mockNearbyEvents,
        error: null
      })

      const request = new NextRequest(
        'http://localhost:3000/api/emergency?lat=40.7128&lng=-74.0060&radius=10'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toHaveLength(1)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_nearby_emergency_events', {
        center_lat: 40.7128,
        center_lng: -74.0060,
        radius_km: 10
      })
    })

    it('should handle pagination correctly', async () => {
      const mockPaginatedEvents = Array.from({ length: 5 }, (_, i) =>
        createEmergencyEvent({ id: `event-${i + 5}` })
      )

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockPaginatedEvents,
                error: null,
                count: 25 // Total 25 events
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency?page=2&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.events).toHaveLength(5)
      expect(data.pagination.total).toBe(25)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
      expect(data.pagination.totalPages).toBe(5)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
                count: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to fetch emergency events')
    })

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/emergency?page=invalid&limit=1000')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid query parameters')
    })
  })

  describe('POST /api/emergency', () => {
    it('should create a new emergency event successfully', async () => {
      const newEventData = {
        title: 'Test Fire Emergency',
        description: 'Test fire at downtown location',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)',
        estimated_duration: 120,
        affected_radius: 5
      }

      const createdEvent = createEmergencyEvent({
        id: 'new-event-1',
        ...newEventData
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdEvent,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(newEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.event).toBeDefined()
      expect(data.event.title).toBe(newEventData.title)
      expect(data.event.emergency_type_id).toBe(newEventData.emergency_type_id)
    })

    it('should validate required fields', async () => {
      const incompleteEventData = {
        title: 'Test Emergency'
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(incompleteEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Required fields missing')
    })

    it('should validate emergency type', async () => {
      const invalidEventData = {
        title: 'Test Emergency',
        description: 'Invalid emergency type',
        emergency_type_id: 999, // Non-existent type
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null, // No emergency type found
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(invalidEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid emergency type')
    })

    it('should validate severity levels', async () => {
      const invalidEventData = {
        title: 'Test Emergency',
        description: 'Invalid severity',
        emergency_type_id: 1,
        severity: 'critical', // Invalid severity
        location: 'POINT(-74.0060 40.7128)'
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(invalidEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid severity level')
    })

    it('should validate location format', async () => {
      const invalidEventData = {
        title: 'Test Emergency',
        description: 'Invalid location',
        emergency_type_id: 1,
        severity: 'high',
        location: 'invalid-location-format'
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(invalidEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid location format')
    })

    it('should handle database errors during creation', async () => {
      const validEventData = {
        title: 'Test Emergency',
        description: 'Valid emergency data',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database constraint violation' }
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(validEventData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create emergency event')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: 'invalid-json{',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid JSON')
    })
  })

  describe('PUT /api/emergency', () => {
    it('should update an emergency event successfully', async () => {
      const updateData = {
        id: 'event-to-update',
        title: 'Updated Emergency Title',
        description: 'Updated description',
        severity: 'medium'
      }

      const existingEvent = createEmergencyEvent({
        id: updateData.id,
        title: 'Original Title',
        severity: 'high'
      })

      const updatedEvent = {
        ...existingEvent,
        ...updateData,
        updated_at: new Date().toISOString()
      }

      // Mock fetching existing event
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingEvent,
              error: null
            })
          })
        })
      })

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedEvent,
                error: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.event).toBeDefined()
      expect(data.event.title).toBe(updateData.title)
      expect(data.event.severity).toBe(updateData.severity)
    })

    it('should require event ID for updates', async () => {
      const updateData = {
        title: 'Updated Title'
        // Missing ID
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Event ID is required')
    })

    it('should handle non-existent event', async () => {
      const updateData = {
        id: 'non-existent-event',
        title: 'Updated Title'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Emergency event not found')
    })

    it('should prevent updating resolved events', async () => {
      const updateData = {
        id: 'resolved-event',
        title: 'Should not update'
      }

      const resolvedEvent = createEmergencyEvent({
        id: updateData.id,
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: resolvedEvent,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot update resolved event')
    })

    it('should validate update data', async () => {
      const updateData = {
        id: 'event-to-validate',
        severity: 'invalid-severity',
        emergency_type_id: 'not-a-number'
      }

      const existingEvent = createEmergencyEvent({ id: updateData.id })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingEvent,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid update data')
    })
  })

  describe('DELETE /api/emergency', () => {
    it('should delete an emergency event successfully', async () => {
      const eventId = 'event-to-delete'
      const existingEvent = createEmergencyEvent({ id: eventId })

      // Mock fetching existing event
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingEvent,
              error: null
            })
          })
        })
      })

      // Mock deletion
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null
            })
          })
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/emergency?id=${eventId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('Emergency event deleted successfully')
    })

    it('should require event ID for deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Event ID is required')
    })

    it('should handle non-existent event deletion', async () => {
      const eventId = 'non-existent-event'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/emergency?id=${eventId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Emergency event not found')
    })

    it('should prevent deletion of active events', async () => {
      const eventId = 'active-event'
      const activeEvent = createEmergencyEvent({
        id: eventId,
        status: 'active'
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: activeEvent,
              error: null
            })
          })
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/emergency?id=${eventId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot delete active event')
    })

    it('should handle database errors during deletion', async () => {
      const eventId = 'event-delete-error'
      const existingEvent = createEmergencyEvent({ id: eventId, status: 'pending' })

      // Mock fetching existing event
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingEvent,
              error: null
            })
          })
        })
      })

      // Mock deletion error
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Foreign key constraint violation' }
            })
          })
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/emergency?id=${eventId}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to delete emergency event')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing authorization header', async () => {
      // Mock headers without authorization
      jest.doMock('next/headers', () => ({
        headers: () => ({
          get: jest.fn(() => null)
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authorization required')
    })

    it('should handle rate limiting', async () => {
      // Mock rate limiter
      jest.doMock('@/lib/rate-limiter', () => ({
        checkRateLimit: jest.fn().mockResolvedValue(false)
      }))

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should handle large payloads', async () => {
      const largePayload = {
        title: 'Test Emergency',
        description: 'A'.repeat(100000), // Very large description
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(largePayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toContain('Payload too large')
    })

    it('should handle concurrent requests', async () => {
      const eventData = {
        title: 'Concurrent Test Emergency',
        description: 'Testing concurrent requests',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      const createdEvent = createEmergencyEvent(eventData)

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdEvent,
              error: null
            })
          })
        })
      })

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        new NextRequest('http://localhost:3000/api/emergency', {
          method: 'POST',
          body: JSON.stringify(eventData),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))

      // All requests should succeed (or fail gracefully)
      responses.forEach(response => {
        expect([201, 409, 500]).toContain(response.status) // Created, Conflict, or Server Error
      })
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should sanitize HTML in text fields', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>Emergency',
        description: '<img src=x onerror=alert("xss")>Malicious content',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      const sanitizedEvent = createEmergencyEvent({
        ...maliciousData,
        title: 'Emergency', // Script removed
        description: 'Malicious content' // HTML removed
      })

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: sanitizedEvent,
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(maliciousData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.event.title).toBe('Emergency')
      expect(data.event.description).toBe('Malicious content')
      expect(data.event.title).not.toContain('<script>')
      expect(data.event.description).not.toContain('<img')
    })

    it('should validate coordinate ranges', async () => {
      const invalidCoordinates = {
        title: 'Invalid Coordinates',
        description: 'Test with invalid coordinates',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(200 100)' // Invalid coordinates
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(invalidCoordinates),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid coordinates')
    })

    it('should validate string lengths', async () => {
      const longTitle = {
        title: 'A'.repeat(300), // Exceeds title length limit
        description: 'Valid description',
        emergency_type_id: 1,
        severity: 'high',
        location: 'POINT(-74.0060 40.7128)'
      }

      const request = new NextRequest('http://localhost:3000/api/emergency', {
        method: 'POST',
        body: JSON.stringify(longTitle),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Title too long')
    })
  })
})