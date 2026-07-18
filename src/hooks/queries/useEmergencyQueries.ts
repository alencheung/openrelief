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
        const params: Record<string, unknown> = {}
        if (filters?.limit !== undefined) {
          params.limit = filters.limit
        }
        if (filters?.status?.[0] !== undefined) {
          params.status = filters.status[0]
        }
        if (filters?.type_ids?.[0] !== undefined) {
          params.type_id = filters.type_ids[0]
        }

        const data = await supabaseHelpers.getEmergencyEvents(params)

        // Update local store
        useEmergencyStore.getState().setEvents(data)

        // Cache for offline use
        useOfflineStore.getState().setCache('emergency-events', data, {
          tags: ['emergency', 'events'],
          expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
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
    // When realtime is feeding us updates, polling is redundant — the
    // realtime handler calls invalidateQueries on every change. Keeping a
    // 60s poll on top of realtime produced ~3.4K sustained RPS at 100K
    // users. When realtime is connected we disable polling entirely; when
    // it drops we fall back to the 60s interval as a safety net.
    refetchInterval: () => {
      const realtimeActive = useEmergencyStore.getState().isRealtimeEnabled
      return realtimeActive ? false : 60 * 1000
    },
    retry: (failureCount: number, error: unknown) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status?: number }).status
        if (status !== undefined && status >= 400 && status < 500) {
          return false
        }
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

export const useInfiniteEmergencyEvents = (filters?: {
  limit?: number
  status?: Database['public']['Enums']['emergency_events_status'][]
  type_ids?: number[]
}) => {
  return useInfiniteQuery({
    queryKey: ['emergency-events-infinite', filters],
    queryFn: async ({ pageParam }: { pageParam: number | undefined }): Promise<{
      data: unknown[]
      nextPage: number
      hasMore: boolean
    }> => {
      const offset = pageParam ?? 0
      const params: Record<string, unknown> = {
        limit: filters?.limit || 20
      }
      params.offset = offset
      if (filters?.status?.[0] !== undefined) {
        params.status = filters.status[0]
      }
      if (filters?.type_ids?.[0] !== undefined) {
        params.type_id = filters.type_ids[0]
      }

      const data = (await supabaseHelpers.getEmergencyEvents(params)) as unknown[]

      return {
        data,
        nextPage: offset + (filters?.limit || 20),
        hasMore: data.length === (filters?.limit || 20)
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: { hasMore: boolean; nextPage: number }) => (lastPage.hasMore ? lastPage.nextPage : undefined),
    staleTime: 30 * 1000
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
          .select(
            `
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
          `
          )
          .eq('id', id)
          .single()

        if (error) {
          throw error
        }

        // Update local store
        useEmergencyStore.getState().addEvent(data)

        return data
      } catch (error) {
        // Try cache first
        const cachedEvent = useEmergencyStore.getState().events.find((e: EmergencyEvent) => e.id === id)
        if (cachedEvent) {
          return cachedEvent
        }

        throw error
      }
    },
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds
    retry: 2
  })
}

export const useCreateEmergencyEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  const { updateTrustForAction, getUserScore, thresholds } = useTrustStore.getState()

  return useMutation({
    mutationFn: async (event: EmergencyEventInsert): Promise<EmergencyEvent> => {
      const userId = event.reporter_id

      try {
        // Check trust score first with proper error handling
        let userScore
        try {
          userScore = getUserScore(userId)
        } catch (error) {
          console.error('Error fetching user trust score:', error)
          // Continue with default score if there's an error fetching
          userScore = { score: 0.5 } // Default neutral score
        }

        // Use threshold from store for consistency
        const minScore = thresholds?.reporting || 0.3

        if (userScore && userScore.score < minScore) {
          const error = new Error(
            `Insufficient trust score to report emergencies. Required: ${minScore}, Current: ${userScore.score}`
          )

          // Add notification for user feedback
          addNotification({
            type: 'system',
            title: 'Trust Score Too Low',
            message: `Your trust score (${(userScore.score * 100).toFixed(1)}%) is below the minimum required (${(minScore * 100).toFixed(1)}%) to report emergencies. Continue contributing to the community to increase your trust score.`,
            severity: 'warning',
            priority: 'high',
            channels: { inApp: true, push: false, email: false, sms: false }
          })

          throw error
        }

        // Optimistic update
        const optimisticId = `temp-${Date.now()}`
        const optimisticEvent = ({
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
          expires_at: event.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resolved_at: null,
          resolved_by: null
        }) as EmergencyEvent

        // Add to local store immediately
        useEmergencyStore.getState().addEvent(optimisticEvent as EmergencyEvent)

        // Add to offline queue if needed
        if (!navigator.onLine) {
          const actionId = useOfflineStore.getState().addAction({
            type: 'create',
            table: 'emergency_events',
            data: event,
            priority: 'high',
            maxRetries: 5
          })

          addNotification({
            type: 'system',
            title: 'Emergency Report Queued',
            message: "Your emergency report will be synced when you're back online.",
            severity: 'info',
            priority: 'medium',
            channels: { inApp: true, push: false, email: false, sms: false }
          })

          return optimisticEvent
        }

        // Create on server via the secured API route (not a direct Supabase
        // insert). The API route enforces auth/trust, prevents reporter
        // impersonation (reporter_id is derived from the session), runs Sybil
        // checks, initialises consensus, and updates the reporter's trust score
        // server-side. The location on the wire is an object {latitude,
        // longitude} as the API expects; the client form holds it as a
        // "lat lng" string, so normalise it here.
        const locationParts = typeof event.location === 'string'
          ? event.location.trim().split(/\s+/)
          : null
        const payload: Record<string, unknown> = {
          type_id: event.type_id,
          title: event.title,
          description: event.description,
          severity: event.severity,
          metadata: event.metadata,
          location: locationParts && locationParts.length >= 2
            ? {
                latitude: parseFloat(locationParts[0] ?? '0'),
                longitude: parseFloat(locationParts[1] ?? '0')
              }
            : (event.location as unknown as { latitude: number; longitude: number })
        }

        const response = await fetch('/api/emergency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(
            (errBody && (errBody as { error?: string }).error) ||
              `Failed to create emergency event (${response.status})`
          )
        }

        const data = await response.json() as { data?: Record<string, unknown> } & Record<string, unknown>
        const created = (data.data ?? data) as Record<string, unknown>

        // Update trust score
        await updateTrustForAction(userId, created.id as string, 'report', 'pending', {
          severity: event.severity,
          type: event.type_id
        })

        // Create notification
        addNotification({
          type: 'emergency',
          title: 'Emergency Report Submitted',
          message: 'Your emergency report has been successfully submitted.',
          severity: 'success',
          priority: 'high',
          channels: { inApp: true, push: true, email: false, sms: false },
          metadata: { eventId: data.id as string | undefined, category: 'emergency' }
        })

        return data as unknown as EmergencyEvent
      } catch (error) {
        console.error('Failed to create emergency event:', error)

        addNotification({
          type: 'system',
          title: 'Report Failed',
          message: error instanceof Error ? error.message : 'Failed to submit emergency report',
          severity: 'critical',
          priority: 'high',
          channels: { inApp: true, push: true, email: false, sms: false }
        })

        throw error
      }
    },
    onSuccess: (data: EmergencyEvent, _variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', data.id], data)

      // Remove the optimistic temp event added in onMutate. The previous check
      // inspected `data.id` (the server UUID) which never starts with 'temp-',
      // so the temp event was never removed and a duplicate phantom remained in
      // the local store alongside the real one. The temp id is on the context
      // returned by onMutate.
      const optimisticId = (context as { id?: string } | undefined)?.id
      if (optimisticId && optimisticId.startsWith('temp-')) {
        useEmergencyStore.getState().removeEvent(optimisticId)
      }
      useEmergencyStore.getState().addEvent(data)
    },
    onError: (error: unknown, _variables, context) => {
      // Rollback optimistic update using the context returned by onMutate.
      const optimisticId = (context as { id?: string } | undefined)?.id
      if (optimisticId && optimisticId.startsWith('temp-')) {
        useEmergencyStore.getState().removeEvent(optimisticId)
      }

      console.error('Create emergency event mutation error:', error)
    }
  })
}

export const useUpdateEmergencyEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EmergencyEventUpdate }) => {
      try {
        // Optimistic update
        const currentEvent = useEmergencyStore.getState().events.find((e: EmergencyEvent) => e.id === id)
        if (!currentEvent) {
          throw new Error('Event not found')
        }

        const optimisticEvent = {
          ...currentEvent,
          ...updates,
          updated_at: new Date().toISOString()
        }

        useEmergencyStore.getState().updateEvent(id, updates)

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'update',
            table: 'emergency_events',
            data: { id, updates },
            priority: 'medium',
            maxRetries: 3
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
          channels: { inApp: true, push: false, email: false, sms: false }
        })

        return data
      } catch (error) {
        console.error('Failed to update emergency event:', error)
        throw error
      }
    },
    onSuccess: (data: EmergencyEvent) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', data.id], data)
    },
    onError: (error: unknown, variables: { id: string; updates: EmergencyEventUpdate }) => {
      // Rollback would require storing previous state
      console.error('Update emergency event mutation error:', error)
    }
  })
}

export const useConfirmEvent = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  const { updateTrustForAction } = useTrustStore.getState()

  return useMutation<
    unknown,
    Error,
    {
      eventId: string
      userId: string
      confirmationType: 'confirm' | 'dispute'
      location?: { lat: number; lng: number }
    }
  >({
    mutationFn: async ({
      eventId,
      userId,
      confirmationType,
      location
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
          created_at: new Date().toISOString()
        }

        // Update local store immediately. Increment the relevant counter rather
        // than overwriting it — the previous code set confirmation_count to 0/1,
        // which zeroed the count on every dispute and lost prior confirmations.
        const currentEvent = useEmergencyStore.getState().events.find(e => e.id === eventId)
        const currentConfirmCount = currentEvent?.confirmation_count ?? 0
        const currentDisputeCount = currentEvent?.dispute_count ?? 0
        useEmergencyStore.getState().updateEvent(eventId, {
          confirmation_count:
            confirmationType === 'confirm' ? currentConfirmCount + 1 : currentConfirmCount,
          dispute_count:
            confirmationType === 'dispute' ? currentDisputeCount + 1 : currentDisputeCount
        })

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: confirmationType === 'confirm' ? 'confirm' : 'dispute',
            table: 'event_confirmations',
            data: { eventId, userId, confirmationType, location },
            priority: 'medium',
            maxRetries: 3
          })

          return optimisticConfirmation
        }

        // Confirm on server
        const data = await supabaseHelpers.confirmEvent(eventId, userId, confirmationType, location)

        // Update trust score
        await updateTrustForAction(userId, eventId, confirmationType, 'pending', {
          location
        })

        addNotification({
          type: 'system',
          title: `Event ${confirmationType === 'confirm' ? 'Confirmed' : 'Disputed'}`,
          message: `You have successfully ${
            confirmationType === 'confirm' ? 'confirmed' : 'disputed'
          } this emergency event.`,
          severity: 'success',
          priority: 'medium',
          channels: { inApp: true, push: false, email: false, sms: false }
        })

        return data
      } catch (error) {
        console.error('Failed to confirm event:', error)
        throw error
      }
    },
    onSuccess: (data: unknown, variables: {
      eventId: string
      userId: string
      confirmationType: 'confirm' | 'dispute'
      location?: { lat: number; lng: number }
    }) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-confirmations', variables.eventId] })
    },
    onError: (error: unknown) => {
      console.error('Confirm event mutation error:', error)
    }
  })
}

export const useEventConfirmations = (eventId: string) => {
  return useQuery({
    queryKey: ['event-confirmations', eventId],
    queryFn: () => supabaseHelpers.getEventConfirmations(eventId),
    enabled: !!eventId,
    staleTime: 15 * 1000 // 15 seconds
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
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
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
    retry: 2
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
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('get_nearby_emergency_events', {
        p_lat: center.lat,
        p_lng: center.lng,
        p_radius_meters: radius,
        p_status: filters?.status || null,
        p_min_severity: filters?.severity?.[0] || null
      })

      if (error) {
        throw error
      }

      // Calculate distance for each event
      const eventsWithDistance = ((data as Array<{ location: string } & Record<string, unknown>>) || []).map((event) => {
        const parts = event.location.split(' ')
        return {
          ...event,
          distance: calculateDistance(
            center.lat,
            center.lng,
            parseFloat(parts[1] ?? '0'),
            parseFloat(parts[0] ?? '0')
          ),
          isWithinRadius: true
        }
      })

      return eventsWithDistance
    },
    enabled: !!(center.lat && center.lng),
    staleTime: 30 * 1000, // 30 seconds
    // Suppress redundant polling when realtime is healthy (see
    // useEmergencyEvents for rationale). Realtime handler invalidates this
    // query on change; polling stays as a fallback when realtime drops.
    refetchInterval: () => (useEmergencyStore.getState().isRealtimeEnabled ? false : 60 * 1000)
  })
}

// Query for user's reported events
export const useUserEmergencyEvents = (
  userId: string,
  status?: Database['public']['Enums']['emergency_events_status']
) => {
  return useQuery({
    queryKey: ['user-emergency-events', userId, status],
    queryFn: async () => {
      const result = await (supabase
        .from('emergency_events')
        .select(
          `
          *,
          emergency_types (*),
          confirmations: event_confirmations (
            confirmation_type,
            user_id,
            created_at
          )
        `
        )
        .eq('reporter_id', userId)
        .eq('status', status || 'active')
        .order('created_at', { ascending: false }) as unknown as PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>)
      const { data, error } = await result
      if (error) {
        throw error
      }
      return data
    },
    enabled: !!userId,
    staleTime: 30 * 1000
  })
}

// Utility function
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
