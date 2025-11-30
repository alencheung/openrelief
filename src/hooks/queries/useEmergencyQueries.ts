import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabaseHelpers, supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { useEmergencyStore, useOfflineStore, useTrustStore, useNotificationStore } from '@/store'

// Types
export type EmergencyEvent = Database['public']['Tables']['emergency_events']['Row']
export type EmergencyEventInsert = Database['public']['Tables']['emergency_events']['Insert']
export type EmergencyEventUpdate = Database['public']['Tables']['emergency_events']['Update']
export type EmergencyType = Database['public']['Tables']['emergency_types']['Row']
export type EventConfirmation = Database['public']['Tables']['event_confirmations']['Row']
export type EventConfirmationInsert = Database['public']['Tables']['event_confirmations']['Insert']

// Enhanced hooks with offline support and optimistic updates
export const useEmergencyEvents = (filters?: {
  status?: Database['public']['Enums']['emergency_events_status'][]
  type_ids?: number[]
  severity?: number[]
  radius?: number
  center?: { lat: number; lng: number }
  limit?: number
  offset?: number
}) => {
  return useQuery({
    queryKey: ['emergency-events', filters],
    queryFn: async () => {
      try {
        // Try online first
        const params: any = {}
        if (filters?.limit !== undefined) params.limit = filters.limit
        if (filters?.status?.[0] !== undefined) params.status = filters.status[0]
        if (filters?.type_ids?.[0] !== undefined) params.type_id = filters.type_ids[0]

        const data = await supabaseHelpers.getEmergencyEvents(params)

        // Update local store
        useEmergencyStore.getState().setEvents(data)

        // Cache for offline use
        useOfflineStore.getState().setCache('emergency-events', data, {
          tags: ['emergency', 'events'],
          expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        })

        return data
      } catch (error) {
        console.error('Failed to fetch emergency events:', error)

        // Fallback to cache
        const cachedData = useOfflineStore.getState().getCache('emergency-events')
        if (cachedData) {
          return cachedData
        }

        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (status >= 400 && status < 500) return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export const useInfiniteEmergencyEvents = (filters?: {
  limit?: number
  status?: Database['public']['Enums']['emergency_events_status'][]
  type_ids?: number[]
}) => {
  return useInfiniteQuery({
    queryKey: ['emergency-events-infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const params: any = {
        limit: filters?.limit || 20,
      }
      if (pageParam !== undefined) params.offset = pageParam
      if (filters?.status?.[0] !== undefined) params.status = filters.status[0]
      if (filters?.type_ids?.[0] !== undefined) params.type_id = filters.type_ids[0]

      const data = await supabaseHelpers.getEmergencyEvents(params)

      return {
        data,
        nextPage: pageParam + (filters?.limit || 20),
        hasMore: data.length === (filters?.limit || 20),
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: 30 * 1000,
  })
}

export const useEmergencyEvent = (id: string) => {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['emergency-event', id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('emergency_events')
          .select(`
            *,
            emergency_types (*),
            reporter: user_profiles (
              user_id,
              trust_score
            ),
            confirmations: event_confirmations (
              *,
              user: user_profiles (
                user_id,
                trust_score
              )
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error

        // Update local store
        useEmergencyStore.getState().addEvent(data)

        return data
      } catch (error) {
        // Try cache first
        const cachedEvent = useEmergencyStore.getState().events.find(e => e.id === id)
        if (cachedEvent) {
          return cachedEvent
        }

        throw error
      }
    },
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds
    retry: 2,
  })
}

export const useCreateEmergencyEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()

  return useMutation({
    mutationFn: async (event: EmergencyEventInsert) => {
      const userId = event.reporter_id

      try {
        // Check trust score first
        const userScore = useTrustStore.getState().getUserScore(userId)
        if (userScore && userScore.score < 0.3) {
          throw new Error('Insufficient trust score to report emergencies')
        }

        // Optimistic update
        const optimisticId = `temp-${Date.now()}`
        const optimisticEvent: any = {
          ...event,
          id: optimisticId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'pending' as const,
          confirmation_count: 0,
          dispute_count: 0,
          trust_weight: userScore?.score || 0.5,
          description: event.description || null,
          radius_meters: event.radius_meters || 1000,
          severity: event.severity || 3,
          expires_at: event.expires_at || null,
          resolved_at: null,
          resolved_by: null,
        }

        // Add to local store immediately
        useEmergencyStore.getState().addEvent(optimisticEvent)

        // Add to offline queue if needed
        if (!navigator.onLine) {
          const actionId = useOfflineStore.getState().addAction({
            type: 'create',
            table: 'emergency_events',
            data: event,
            priority: 'high',
            maxRetries: 5,
          })

          addNotification({
            type: 'system',
            title: 'Emergency Report Queued',
            message: 'Your emergency report will be synced when you\'re back online.',
            severity: 'info',
            priority: 'medium',
            channels: { inApp: true, push: false, email: false, sms: false },
          })

          return optimisticEvent
        }

        // Create on server
        const data: any = await supabaseHelpers.createEmergencyEvent(event)

        // Update trust score
        await updateTrustForAction(userId, data.id, 'report', 'pending', {
          severity: event.severity,
          type: event.type_id,
        })

        // Create notification
        addNotification({
          type: 'emergency',
          title: 'Emergency Report Submitted',
          message: 'Your emergency report has been successfully submitted.',
          severity: 'success',
          priority: 'high',
          channels: { inApp: true, push: true, email: false, sms: false },
          metadata: { eventId: data.id, category: 'emergency' },
        })

        return data
      } catch (error) {
        console.error('Failed to create emergency event:', error)

        addNotification({
          type: 'system',
          title: 'Report Failed',
          message: error instanceof Error ? error.message : 'Failed to submit emergency report',
          severity: 'critical',
          priority: 'high',
          channels: { inApp: true, push: true, email: false, sms: false },
        })

        throw error
      }
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', data.id], data)

      // Update local store with real data
      if (data.id.startsWith('temp-')) {
        useEmergencyStore.getState().removeEvent(data.id)
      }
      useEmergencyStore.getState().addEvent(data)
    },
    onError: (error, variables) => {
      // Rollback optimistic update
      if (variables.id && variables.id.startsWith('temp-')) {
        useEmergencyStore.getState().removeEvent(variables.id)
      }

      console.error('Create emergency event mutation error:', error)
    },
  })
}

export const useUpdateEmergencyEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EmergencyEventUpdate }) => {
      try {
        // Optimistic update
        const currentEvent = useEmergencyStore.getState().events.find(e => e.id === id)
        if (!currentEvent) throw new Error('Event not found')

        const optimisticEvent = {
          ...currentEvent,
          ...updates,
          updated_at: new Date().toISOString(),
        }

        useEmergencyStore.getState().updateEvent(id, updates)

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'update',
            table: 'emergency_events',
            data: { id, updates },
            priority: 'medium',
            maxRetries: 3,
          })

          return optimisticEvent
        }

        // Update on server
        const data = await supabaseHelpers.updateEmergencyEvent(id, updates)

        addNotification({
          type: 'system',
          title: 'Event Updated',
          message: 'Emergency event has been updated successfully.',
          severity: 'success',
          priority: 'medium',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to update emergency event:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', data.id], data)
    },
    onError: (error, variables) => {
      // Rollback would require storing previous state
      console.error('Update emergency event mutation error:', error)
    },
  })
}

export const useConfirmEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      confirmationType,
      location,
    }: {
      eventId: string
      userId: string
      confirmationType: 'confirm' | 'dispute'
      location?: { lat: number; lng: number }
    }) => {
      try {
        // Check trust score
        const userScore = useTrustStore.getState().getUserScore(userId)
        const requiredScore = confirmationType === 'dispute' ? 0.5 : 0.4

        if (userScore && userScore.score < requiredScore) {
          throw new Error(`Insufficient trust score to ${confirmationType} this event`)
        }

        // Optimistic update
        const optimisticConfirmation = {
          id: `temp-${Date.now()}`,
          event_id: eventId,
          user_id: userId,
          confirmation_type: confirmationType,
          trust_weight: userScore?.score || 0.5,
          location: location ? `POINT(${location.lng} ${location.lat})` : null,
          distance_from_event: null,
          created_at: new Date().toISOString(),
        }

        // Update local store immediately
        useEmergencyStore.getState().updateEvent(eventId, {
          confirmation_count: confirmationType === 'confirm' ? 1 : 0,
          dispute_count: confirmationType === 'dispute' ? 1 : 0,
        })

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: confirmationType === 'confirm' ? 'confirm' : 'dispute',
            table: 'event_confirmations',
            data: { eventId, userId, confirmationType, location },
            priority: 'medium',
            maxRetries: 3,
          })

          return optimisticConfirmation
        }

        // Confirm on server
        const data = await supabaseHelpers.confirmEvent(eventId, userId, confirmationType, location)

        // Update trust score
        await updateTrustForAction(userId, eventId, confirmationType, 'pending', {
          location,
        })

        addNotification({
          type: 'system',
          title: `Event ${confirmationType === 'confirm' ? 'Confirmed' : 'Disputed'}`,
          message: `You have successfully ${confirmationType}ed this emergency event.`,
          severity: 'success',
          priority: 'medium',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to confirm event:', error)
        throw error
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-confirmations', variables.eventId] })
    },
    onError: (error) => {
      console.error('Confirm event mutation error:', error)
    },
  })
}

export const useEventConfirmations = (eventId: string) => {
  return useQuery({
    queryKey: ['event-confirmations', eventId],
    queryFn: () => supabaseHelpers.getEventConfirmations(eventId),
    enabled: !!eventId,
    staleTime: 15 * 1000, // 15 seconds
  })
}

export const useEmergencyTypes = () => {
  return useQuery({
    queryKey: ['emergency-types'],
    queryFn: async () => {
      try {
        const data = await supabaseHelpers.getEmergencyTypes()

        // Update local store
        useEmergencyStore.getState().setEmergencyTypes(data)

        // Cache for offline use
        useOfflineStore.getState().setCache('emergency-types', data, {
          tags: ['emergency', 'types'],
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        })

        return data
      } catch (error) {
        // Fallback to cache
        const cachedData = useOfflineStore.getState().getCache('emergency-types')
        if (cachedData) {
          return cachedData
        }

        throw error
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  })
}

// Advanced query for events within radius
export const useNearbyEmergencyEvents = (
  center: { lat: number; lng: number },
  radius: number = 5000, // 5km default
  filters?: {
    status?: Database['public']['Enums']['emergency_events_status'][]
    severity?: number[]
  }
) => {
  return useQuery({
    queryKey: ['nearby-emergency-events', center, radius, filters],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_nearby_emergency_events', {
        p_lat: center.lat,
        p_lng: center.lng,
        p_radius_meters: radius,
        p_status: filters?.status || null,
        p_min_severity: filters?.severity?.[0] || null,
      })

      if (error) throw error

      // Calculate distance for each event
      const eventsWithDistance = (data as any[]).map((event: any) => ({
        ...event,
        distance: calculateDistance(
          center.lat,
          center.lng,
          parseFloat(event.location.split(' ')[1]),
          parseFloat(event.location.split(' ')[0])
        ),
        isWithinRadius: true,
      }))

      return eventsWithDistance
    },
    enabled: !!(center.lat && center.lng),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  })
}

// Query for user's reported events
export const useUserEmergencyEvents = (userId: string, status?: Database['public']['Enums']['emergency_events_status']) => {
  return useQuery({
    queryKey: ['user-emergency-events', userId, status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_events')
        .select(`
          *,
          emergency_types (*),
          confirmations: event_confirmations (
            confirmation_type,
            user_id,
            created_at
          )
        `)
        .eq('reporter_id', userId)
        .eq(status ? 'status' : 'status', status || 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })
}

// Utility function
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}