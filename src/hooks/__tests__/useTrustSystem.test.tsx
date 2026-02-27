/**
 * Tests for useTrustSystem Hook
 * 
 * These tests verify the trust system hook functionality including
 * score calculations, permissions, and consensus participation.
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTrustSystem } from '../useTrustSystem'
import { createMockSupabaseClient } from '@/test-utils/mocks/supabase'
import { createUser, createTrustScore } from '@/test-utils/fixtures/emergencyScenarios'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
  supabaseHelpers: {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    createUserProfile: jest.fn(),
    getEmergencyEvents: jest.fn(),
    createEmergencyEvent: jest.fn(),
    updateEmergencyEvent: jest.fn(),
    confirmEvent: jest.fn(),
    getEventConfirmations: jest.fn(),
    getEmergencyTypes: jest.fn(),
    subscribeToEmergencyEvents: jest.fn(),
  },
}))

describe('useTrustSystem Hook', () => {
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
    mockSupabase.__resetDatabase()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('Trust Score Queries', () => {
    it('should fetch trust calculation for user', async () => {
      const userId = 'test-user-1'
      const mockTrustData = {
        user_id: userId,
        overall_score: 0.85,
        trust_score_factors: {
          reporting_accuracy: 0.9,
          confirmation_accuracy: 0.8,
          dispute_accuracy: 0.85,
          response_time: 15,
          location_accuracy: 0.9,
          contribution_frequency: 5,
          community_endorsement: 0.75,
          penalty_score: 0.05,
          expertise_areas: [1, 2],
        },
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
        expect(result.current.trustCalculation).toBeDefined()
      })

      expect(result.current.trustCalculation?.userId).toBe(userId)
      expect(result.current.trustCalculation?.score).toBe(0.85)
      expect(result.current.trustCalculation?.confidence).toBeGreaterThan(0)
    })

    it('should handle missing user gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem('non-existent-user'), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      expect(result.current.trustCalculation).toBeNull()
    })

    it('should refetch trust calculation data', async () => {
      const userId = 'test-user-2'
      const initialData = {
        user_id: userId,
        overall_score: 0.7,
        trust_score_factors: { reporting_accuracy: 0.7 },
        last_updated: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      }

      const updatedData = {
        ...initialData,
        overall_score: 0.75,
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({ data: initialData, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({ data: updatedData, error: null })
            })
          })
        })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
        expect(result.current.trustCalculation?.score).toBe(0.7)
      })

      // Trigger refetch
      act(() => {
        result.current.recalculateTrust()
      })

      await waitFor(() => {
        expect(result.current.trustCalculation?.score).toBe(0.75)
      })
    })
  })

  describe('Trust History Queries', () => {
    it('should fetch trust history for user', async () => {
      const userId = 'test-user-3'
      const mockHistory = [
        {
          id: 'history-1',
          user_id: userId,
          event_id: 'event-1',
          action_type: 'report',
          change: 0.05,
          previous_score: 0.8,
          new_score: 0.85,
          reason: 'Successful report',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: 'history-2',
          user_id: userId,
          event_id: 'event-2',
          action_type: 'confirm',
          change: 0.03,
          previous_score: 0.85,
          new_score: 0.88,
          reason: 'Accurate confirmation',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockHistory, error: null })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false)
      })

      expect(result.current.trustHistory).toHaveLength(2)
      expect(result.current.trustHistory[0].actionType).toBe('report')
      expect(result.current.trustHistory[1].actionType).toBe('confirm')
    })

    it('should return empty array for user with no history', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem('new-user'), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false)
      })

      expect(result.current.trustHistory).toEqual([])
    })
  })

  describe('Consensus Participation Queries', () => {
    it('should fetch consensus participation for user', async () => {
      const userId = 'test-user-4'
      const mockParticipation = [
        {
          id: 'participation-1',
          event_id: 'event-1',
          user_id: userId,
          confirmation_type: 'confirm',
          trust_weight: 0.8,
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
        {
          id: 'participation-2',
          event_id: 'event-2',
          user_id: userId,
          confirmation_type: 'dispute',
          trust_weight: 0.8,
          created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: mockParticipation, 
                error: null 
              })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingConsensus).toBe(false)
      })

      expect(result.current.consensusParticipation).toHaveLength(2)
      expect(result.current.consensusParticipation[0].voteType).toBe('confirm')
      expect(result.current.consensusParticipation[1].voteType).toBe('dispute')
    })

    it('should handle consensus data with location information', async () => {
      const userId = 'test-user-5'
      const mockParticipationWithLocation = [
        {
          id: 'participation-location-1',
          event_id: 'event-location-1',
          user_id: userId,
          confirmation_type: 'confirm',
          trust_weight: 0.75,
          location: 'POINT(-74.0060 40.7128)',
          created_at: new Date().toISOString(),
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: mockParticipationWithLocation, 
                error: null 
              })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingConsensus).toBe(false)
      })

      expect(result.current.consensusParticipation).toHaveLength(1)
      expect(result.current.consensusParticipation[0].location).toBe('POINT(-74.0060 40.7128)')
    })
  })

  describe('Trust Score Mutations', () => {
    it('should update trust score for successful action', async () => {
      const userId = 'test-user-6'
      const initialTrustData = {
        user_id: userId,
        overall_score: 0.8,
        trust_score_factors: {
          reporting_accuracy: 0.8,
          confirmation_accuracy: 0.8,
          dispute_accuracy: 0.8,
          response_time: 20,
          location_accuracy: 0.8,
          contribution_frequency: 3,
          community_endorsement: 0.7,
          penalty_score: 0,
          expertise_areas: [1],
        },
        last_updated: new Date().toISOString(),
      }

      // Mock initial fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: initialTrustData, error: null })
          })
        })
      })

      // Mock update
      const updatedTrustData = {
        ...initialTrustData,
        overall_score: 0.85,
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: updatedTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      const mutation = result.current.updateTrustMutation

      await act(async () => {
        await mutation.mutateAsync({
          userId,
          eventId: 'test-event-1',
          actionType: 'report',
          outcome: 'success',
          metadata: { response_time: 15 },
        })
      })

      expect(mutation.isSuccess).toBe(true)
    })

    it('should handle trust score update failure', async () => {
      const userId = 'test-user-7'
      const mockError = new Error('Database constraint violation')

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      const mutation = result.current.updateTrustMutation

      await act(async () => {
        await mutation.mutateAsync({
          userId,
          eventId: 'test-event-2',
          actionType: 'confirm',
          outcome: 'failure',
        })
      })

      expect(mutation.isError).toBe(true)
      expect(mutation.error).toBeDefined()
    })

    it('should handle trust score recalculation', async () => {
      const userId = 'test-user-8'
      const currentTrustData = {
        user_id: userId,
        overall_score: 0.75,
        trust_score_factors: {
          reporting_accuracy: 0.75,
          confirmation_accuracy: 0.75,
          dispute_accuracy: 0.75,
          response_time: 25,
          location_accuracy: 0.75,
          contribution_frequency: 2,
          community_endorsement: 0.6,
          penalty_score: 0.1,
          expertise_areas: [1],
        },
        last_updated: new Date(Date.now() - 86400000).toISOString(),
      }

      // Mock current trust data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: currentTrustData, error: null })
          })
        })
      })

      // Mock recalculated trust data
      const recalculatedTrustData = {
        ...currentTrustData,
        overall_score: 0.78, // Slight increase due to recent positive actions
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: recalculatedTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      const recalculationMutation = result.current.recalculateTrustMutation

      await act(async () => {
        await recalculationMutation.mutateAsync(userId)
      })

      expect(recalculationMutation.isSuccess).toBe(true)
    })
  })

  describe('User Permissions', () => {
    it('should calculate correct permissions based on trust score', async () => {
      const userId = 'test-user-9'
      const trustScore = 0.75

      const mockTrustData = {
        user_id: userId,
        overall_score: trustScore,
        trust_score_factors: {
          reporting_accuracy: 0.8,
          confirmation_accuracy: 0.7,
          dispute_accuracy: 0.75,
          response_time: 18,
          location_accuracy: 0.9,
          contribution_frequency: 4,
          community_endorsement: 0.8,
          penalty_score: 0.05,
          expertise_areas: [1, 2],
        },
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      expect(result.current.userPermissions.canReport).toBe(true) // 0.75 >= 0.3
      expect(result.current.userPermissions.canConfirm).toBe(true) // 0.75 >= 0.4
      expect(result.current.userPermissions.canDispute).toBe(true) // 0.75 >= 0.5
      expect(result.current.userPermissions.isHighTrust).toBe(false) // 0.75 < 0.8
      expect(result.current.userPermissions.isLowTrust).toBe(false) // 0.75 > 0.2
    })

    it('should restrict permissions for low trust users', async () => {
      const userId = 'test-user-10'
      const lowTrustScore = 0.15

      const mockTrustData = {
        user_id: userId,
        overall_score: lowTrustScore,
        trust_score_factors: {
          reporting_accuracy: 0.2,
          confirmation_accuracy: 0.1,
          dispute_accuracy: 0.15,
          response_time: 60,
          location_accuracy: 0.3,
          contribution_frequency: 0,
          community_endorsement: 0.1,
          penalty_score: 0.3,
          expertise_areas: [],
        },
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      expect(result.current.userPermissions.canReport).toBe(false) // 0.15 < 0.3
      expect(result.current.userPermissions.canConfirm).toBe(false) // 0.15 < 0.4
      expect(result.current.userPermissions.canDispute).toBe(false) // 0.15 < 0.5
      expect(result.current.userPermissions.isHighTrust).toBe(false) // 0.15 < 0.8
      expect(result.current.userPermissions.isLowTrust).toBe(true) // 0.15 <= 0.2
    })

    it('should handle user with no trust score', async () => {
      const userId = 'test-user-11'

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      expect(result.current.userPermissions.canReport).toBe(false)
      expect(result.current.userPermissions.canConfirm).toBe(false)
      expect(result.current.userPermissions.canDispute).toBe(false)
      expect(result.current.userPermissions.isHighTrust).toBe(false)
      expect(result.current.userPermissions.isLowTrust).toBe(false)
    })
  })

  describe('Trust Level Classification', () => {
    it('should classify trust levels correctly', async () => {
      const testCases = [
        { score: 0.05, expectedLevel: 'very-low' },
        { score: 0.15, expectedLevel: 'low' },
        { score: 0.35, expectedLevel: 'medium' },
        { score: 0.65, expectedLevel: 'high' },
        { score: 0.85, expectedLevel: 'very-high' },
        { score: 0.95, expectedLevel: 'very-high' },
      ]

      for (const testCase of testCases) {
        const userId = `test-level-${testCase.score}`
        const mockTrustData = {
          user_id: userId,
          overall_score: testCase.score,
          trust_score_factors: {
            reporting_accuracy: testCase.score,
            confirmation_accuracy: testCase.score,
            dispute_accuracy: testCase.score,
            response_time: 30,
            location_accuracy: testCase.score,
            contribution_frequency: 2,
            community_endorsement: testCase.score,
            penalty_score: 0,
            expertise_areas: [],
          },
          last_updated: new Date().toISOString(),
        }

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockTrustData, error: null })
            })
          })
        })

        const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

        await waitFor(() => {
          expect(result.current.isCalculating).toBe(false)
        })

        expect(result.current.trustLevel).toBe(testCase.expectedLevel)
      }
    })
  })

  describe('Trust Trend Analysis', () => {
    it('should analyze trust score trends', async () => {
      const userId = 'test-user-12'
      const mockHistory = [
        {
          id: 'trend-1',
          user_id: userId,
          change: 0.05,
          new_score: 0.75,
          timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
        },
        {
          id: 'trend-2',
          user_id: userId,
          change: 0.03,
          new_score: 0.78,
          timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), // 6 days ago
        },
        {
          id: 'trend-3',
          user_id: userId,
          change: 0.02,
          new_score: 0.80,
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
        },
        {
          id: 'trend-4',
          user_id: userId,
          change: -0.01,
          new_score: 0.79,
          timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
        },
        {
          id: 'trend-5',
          user_id: userId,
          change: 0.04,
          new_score: 0.83,
          timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockHistory, error: null })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false)
      })

      expect(result.current.trustTrend).toBe('increasing') // Overall upward trend
      expect(result.current.trustHistory).toHaveLength(6)
    })

    it('should handle stable trust trend', async () => {
      const userId = 'test-user-13'
      const mockStableHistory = [
        {
          id: 'stable-1',
          user_id: userId,
          change: 0.02,
          new_score: 0.75,
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: 'stable-2',
          user_id: userId,
          change: -0.01,
          new_score: 0.74,
          timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
        {
          id: 'stable-3',
          user_id: userId,
          change: 0.01,
          new_score: 0.75,
          timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockStableHistory, error: null })
            })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoadingHistory).toBe(false)
      })

      expect(result.current.trustTrend).toBe('stable') // No clear trend
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const userId = 'test-user-14'
      const networkError = new Error('Network timeout')

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(networkError)
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      expect(result.current.trustCalculation).toBeNull()
      expect(result.current.userPermissions.canReport).toBe(false)
    })

    it('should handle malformed data gracefully', async () => {
      const userId = 'test-user-15'
      const malformedData = {
        user_id: userId,
        overall_score: 'invalid-score', // Should be number
        trust_score_factors: null, // Missing factors
        last_updated: 'invalid-date',
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: malformedData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      // Should handle malformed data gracefully
      expect(result.current.trustCalculation).toBeDefined()
      expect(typeof result.current.trustCalculation?.score).toBe('number')
    })
  })

  describe('Performance and Caching', () => {
    it('should cache trust calculation results', async () => {
      const userId = 'test-user-16'
      const mockTrustData = {
        user_id: userId,
        overall_score: 0.8,
        trust_score_factors: {
          reporting_accuracy: 0.8,
          confirmation_accuracy: 0.8,
          dispute_accuracy: 0.8,
          response_time: 20,
          location_accuracy: 0.8,
          contribution_frequency: 4,
          community_endorsement: 0.8,
          penalty_score: 0,
          expertise_areas: [1, 2],
        },
        last_updated: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrustData, error: null })
          })
        })
      })

      const { result, rerender } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
      })

      const firstCallTime = Date.now()

      // Re-render should use cached data
      rerender()

      const secondCallTime = Date.now()

      // Should not make second request due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
      expect(secondCallTime - firstCallTime).toBeLessThan(100) // Very fast due to cache
    })

    it('should invalidate cache on trust score updates', async () => {
      const userId = 'test-user-17'
      const initialTrustData = {
        user_id: userId,
        overall_score: 0.7,
        last_updated: new Date(Date.now() - 60000).toISOString(),
      }

      const updatedTrustData = {
        ...initialTrustData,
        overall_score: 0.75,
        last_updated: new Date().toISOString(),
      }

      // Mock initial fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: initialTrustData, error: null })
          })
        })
      })

      // Mock update fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({ data: updatedTrustData, error: null })
          })
        })
      })

      const { result } = renderHook(() => useTrustSystem(userId), { wrapper })

      await waitFor(() => {
        expect(result.current.isCalculating).toBe(false)
        expect(result.current.trustCalculation?.score).toBe(0.7)
      })

      // Update trust score
      await act(async () => {
        await result.current.updateTrustMutation.mutateAsync({
          userId,
          eventId: 'cache-test-event',
          actionType: 'confirm',
          outcome: 'success',
        })
      })

      await waitFor(() => {
        expect(result.current.trustCalculation?.score).toBe(0.75)
      })

      // Should have made second request after update
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    })
  })
})