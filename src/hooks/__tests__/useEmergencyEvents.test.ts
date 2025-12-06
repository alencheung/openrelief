/**
 * Tests for useEmergencyEvents Hook
 * 
 * These tests verify the functionality of emergency event management hooks,
 * including fetching, creating, updating, and real-time subscriptions.
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  useEmergencyEvents,
  useEmergencyEvent,
  useCreateEmergencyEvent,
  useUpdateEmergencyEvent,
  useConfirmEvent,
  useEventConfirmations,
  useEmergencyTypes,
  useEmergencyEventsSubscription,
  getOptimisticEvent,
  getOptimisticConfirmation,
} from '../useEmergencyEvents'
import { createMockSupabaseClient, setupMockDatabase } from '@/test-utils/mocks/supabase'
import { emergencyScenarios, createEmergencyEvent } from '@/test-utils/fixtures/emergencyScenarios'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
  supabaseHelpers: {
    getEmergencyEvents: jest.fn(),
    createEmergencyEvent: jest.fn(),
    updateEmergencyEvent: jest.fn(),
    confirmEvent: jest.fn(),
    getEventConfirmations: jest.fn(),
    getEmergencyTypes: jest.fn(),
    subscribeToEmergencyEvents: jest.fn(),
  },
}))

describe('useEmergencyEvents Hook', () => {
  let queryClient: QueryClient
  let mockSupabase: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    const { supabase } = require('@/lib/supabase')
    mockSupabase = supabase
    setupMockDatabase(mockSupabase)
    
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('useEmergencyEvents', () => {
    it('should fetch emergency events successfully', async () => {
      const mockEvents = [emergencyScenarios.medicalEmergency, emergencyScenarios.buildingFire]
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockResolvedValue(mockEvents)

      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(mockEvents)
      })

      expect(supabaseHelpers.getEmergencyEvents).toHaveBeenCalledWith(undefined)
    })

    it('should fetch events with filters', async () => {
      const filters = { status: 'active', type_id: 1, limit: 10 }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockResolvedValue([])

      renderHook(() => useEmergencyEvents(filters), { wrapper })

      await waitFor(() => {
        expect(supabaseHelpers.getEmergencyEvents).toHaveBeenCalledWith(filters)
      })
    })

    it('should handle fetch errors', async () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should refetch data at intervals', () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockResolvedValue([])

      renderHook(() => useEmergencyEvents(), { wrapper })

      // Verify that the query is configured for refetching
      expect(result.current.refetch).toBeDefined()
    })
  })

  describe('useEmergencyEvent', () => {
    it('should fetch single emergency event', async () => {
      const mockEvent = emergencyScenarios.medicalEmergency
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockEvent, error: null })
          })
        })
      })

      const { result } = renderHook(() => useEmergencyEvent('emergency-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(mockEvent)
      })
    })

    it('should not fetch when id is not provided', () => {
      const { result } = renderHook(() => useEmergencyEvent(''), { wrapper })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should handle single event fetch error', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      })

      const { result } = renderHook(() => useEmergencyEvent('invalid-id'), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useCreateEmergencyEvent', () => {
    it('should create emergency event successfully', async () => {
      const newEvent = createEmergencyEvent()
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.createEmergencyEvent.mockResolvedValue(newEvent)

      const { result } = renderHook(() => useCreateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate(newEvent)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(newEvent)
      })

      expect(supabaseHelpers.createEmergencyEvent).toHaveBeenCalledWith(newEvent)
    })

    it('should update cache on successful creation', async () => {
      const newEvent = createEmergencyEvent()
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.createEmergencyEvent.mockResolvedValue(newEvent)

      const { result } = renderHook(() => useCreateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate(newEvent)
      })

      await waitFor(() => {
        expect(queryClient.getQueryData(['emergency-event', newEvent.id])).toEqual(newEvent)
      })
    })

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed')
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.createEmergencyEvent.mockRejectedValue(error)

      const { result } = renderHook(() => useCreateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate(createEmergencyEvent())
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.error).toBeDefined()
      })
    })
  })

  describe('useUpdateEmergencyEvent', () => {
    it('should update emergency event successfully', async () => {
      const updates = { status: 'resolved', severity: 'low' }
      const updatedEvent = { ...emergencyScenarios.medicalEmergency, ...updates }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.updateEmergencyEvent.mockResolvedValue(updatedEvent)

      const { result } = renderHook(() => useUpdateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate({ id: 'emergency-1', updates })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(updatedEvent)
      })

      expect(supabaseHelpers.updateEmergencyEvent).toHaveBeenCalledWith('emergency-1', updates)
    })

    it('should update cache on successful update', async () => {
      const updates = { status: 'resolved' }
      const updatedEvent = { ...emergencyScenarios.medicalEmergency, ...updates }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.updateEmergencyEvent.mockResolvedValue(updatedEvent)

      const { result } = renderHook(() => useUpdateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate({ id: 'emergency-1', updates })
      })

      await waitFor(() => {
        expect(queryClient.getQueryData(['emergency-event', 'emergency-1'])).toEqual(updatedEvent)
      })
    })
  })

  describe('useConfirmEvent', () => {
    it('should confirm event successfully', async () => {
      const confirmationData = {
        eventId: 'emergency-1',
        userId: 'user-1',
        confirmationType: 'confirm' as const,
        location: { lat: 40.7128, lng: -74.0060 },
      }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.confirmEvent.mockResolvedValue({ id: 'confirmation-1', ...confirmationData })

      const { result } = renderHook(() => useConfirmEvent(), { wrapper })

      act(() => {
        result.current.mutate(confirmationData)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabaseHelpers.confirmEvent).toHaveBeenCalledWith(
        confirmationData.eventId,
        confirmationData.userId,
        confirmationData.confirmationType,
        confirmationData.location
      )
    })

    it('should dispute event', async () => {
      const disputeData = {
        eventId: 'emergency-1',
        userId: 'user-1',
        confirmationType: 'dispute' as const,
      }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.confirmEvent.mockResolvedValue({ id: 'dispute-1', ...disputeData })

      const { result } = renderHook(() => useConfirmEvent(), { wrapper })

      act(() => {
        result.current.mutate(disputeData)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabaseHelpers.confirmEvent).toHaveBeenCalledWith(
        disputeData.eventId,
        disputeData.userId,
        disputeData.confirmationType,
        undefined
      )
    })
  })

  describe('useEventConfirmations', () => {
    it('should fetch event confirmations', async () => {
      const mockConfirmations = [
        { id: 'conf-1', event_id: 'emergency-1', confirmation_type: 'confirm' },
        { id: 'conf-2', event_id: 'emergency-1', confirmation_type: 'dispute' },
      ]
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEventConfirmations.mockResolvedValue(mockConfirmations)

      const { result } = renderHook(() => useEventConfirmations('emergency-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(mockConfirmations)
      })

      expect(supabaseHelpers.getEventConfirmations).toHaveBeenCalledWith('emergency-1')
    })

    it('should not fetch when eventId is not provided', () => {
      const { result } = renderHook(() => useEventConfirmations(''), { wrapper })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useEmergencyTypes', () => {
    it('should fetch emergency types', async () => {
      const mockTypes = [
        { id: 1, name: 'Medical', icon: 'medical', color: 'red' },
        { id: 2, name: 'Fire', icon: 'fire', color: 'orange' },
      ]
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyTypes.mockResolvedValue(mockTypes)

      const { result } = renderHook(() => useEmergencyTypes(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual(mockTypes)
      })

      expect(supabaseHelpers.getEmergencyTypes).toHaveBeenCalled()
    })
  })

  describe('useEmergencyEventsSubscription', () => {
    it('should subscribe to emergency events', async () => {
      const mockSubscription = { unsubscribe: jest.fn() }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.subscribeToEmergencyEvents.mockReturnValue(mockSubscription)

      const { result } = renderHook(
        () => useEmergencyEventsSubscription(jest.fn()),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual({
          subscription: mockSubscription,
          unsubscribe: expect.any(Function),
        })
      })

      expect(supabaseHelpers.subscribeToEmergencyEvents).toHaveBeenCalled()
    })

    it('should handle subscription cleanup', () => {
      const mockSubscription = { unsubscribe: jest.fn() }
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.subscribeToEmergencyEvents.mockReturnValue(mockSubscription)

      const { unmount } = renderHook(
        () => useEmergencyEventsSubscription(jest.fn()),
        { wrapper }
      )

      unmount()

      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Utility Functions', () => {
    describe('getOptimisticEvent', () => {
      it('should create optimistic event with updates', () => {
        const currentEvent = emergencyScenarios.medicalEmergency
        const updates = { status: 'resolved', severity: 'low' }

        const optimisticEvent = getOptimisticEvent(currentEvent, updates)

        expect(optimisticEvent).toEqual({
          ...currentEvent,
          ...updates,
          updated_at: expect.any(String),
        })
      })

      it('should preserve original event properties', () => {
        const currentEvent = emergencyScenarios.medicalEmergency
        const updates = {}

        const optimisticEvent = getOptimisticEvent(currentEvent, updates)

        expect(optimisticEvent).toEqual({
          ...currentEvent,
          updated_at: expect.any(String),
        })
      })
    })

    describe('getOptimisticConfirmation', () => {
      it('should create optimistic confirmation with location', () => {
        const confirmation = getOptimisticConfirmation(
          'emergency-1',
          'user-1',
          'confirm',
          { lat: 40.7128, lng: -74.0060 }
        )

        expect(confirmation).toEqual({
          id: expect.stringMatching(/^temp-\d+-/),
          event_id: 'emergency-1',
          user_id: 'user-1',
          confirmation_type: 'confirm',
          trust_weight: 0.1,
          location: 'POINT(-74.006 40.7128)',
          distance_from_event: null,
          created_at: expect.any(String),
        })
      })

      it('should create optimistic confirmation without location', () => {
        const confirmation = getOptimisticConfirmation(
          'emergency-1',
          'user-1',
          'dispute'
        )

        expect(confirmation).toEqual({
          id: expect.stringMatching(/^temp-\d+-/),
          event_id: 'emergency-1',
          user_id: 'user-1',
          confirmation_type: 'dispute',
          trust_weight: 0.1,
          location: null,
          distance_from_event: null,
          created_at: expect.any(String),
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockRejectedValue(new Error('Network unavailable'))

      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.error).toBeDefined()
      })
    })

    it('should handle timeout errors', async () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockRejectedValue(new Error('Request timeout'))

      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    it('should handle validation errors', async () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.createEmergencyEvent.mockRejectedValue(new Error('Invalid data'))

      const { result } = renderHook(() => useCreateEmergencyEvent(), { wrapper })

      act(() => {
        result.current.mutate(createEmergencyEvent())
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.error?.message).toContain('Invalid data')
      })
    })
  })

  describe('Performance', () => {
    it('should not make unnecessary requests', () => {
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockResolvedValue([])

      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })
      const { rerender } = renderHook(() => useEmergencyEvents(), { wrapper })

      // Initial request
      expect(supabaseHelpers.getEmergencyEvents).toHaveBeenCalledTimes(1)

      // Rerender without props change should not trigger new request
      rerender()
      expect(supabaseHelpers.getEmergencyEvents).toHaveBeenCalledTimes(1)
    })

    it('should handle large datasets efficiently', async () => {
      const largeEvents = Array.from({ length: 1000 }, (_, i) =>
        createEmergencyEvent({ id: `emergency-${i}` })
      )
      const { supabaseHelpers } = require('@/lib/supabase')
      supabaseHelpers.getEmergencyEvents.mockResolvedValue(largeEvents)

      const startTime = performance.now()
      const { result } = renderHook(() => useEmergencyEvents(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toHaveLength(1000)
      })

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})