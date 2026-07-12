import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseHelpers, supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

// NOTE on duplicate hooks: a richer implementation of these hooks lives in
// `src/hooks/queries/useEmergencyQueries.ts` (offline-aware, API-route
// backed, trust-integrated). This file retains the original, thinner
// implementations because existing callers and tests depend on their exact
// behaviour. There is NO runtime double-poll risk from both existing:
// TanStack Query deduplicates observers by query key, so any components
// using `useEmergencyEvents()` — whether imported from here or from
// `queries/useEmergencyQueries` — share ONE underlying query and ONE
// polling timer for a given ['emergency-events', filters] key.

type EmergencyEvent = Database['public']['Tables']['emergency_events']['Row']
type EmergencyEventInsert = Database['public']['Tables']['emergency_events']['Insert']

export const useEmergencyEvents = (filters?: {
  status?: Database['public']['Enums']['emergency_events_status']
  type_id?: number
  limit?: number
}) => {
  return useQuery({
    queryKey: ['emergency-events', filters],
    queryFn: () => supabaseHelpers.getEmergencyEvents(filters),
    // 30 seconds
    staleTime: 30 * 1000,
    // 1 minute
    refetchInterval: 60 * 1000
  })
}

export const useEmergencyEvent = (id: string) => {
  return useQuery({
    queryKey: ['emergency-event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_events')
        .select(
          `
          *,
          emergency_types (*),
          reporter: user_profiles (
            user_id,
            trust_score
          )
        `
        )
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }
      return data
    },
    enabled: !!id,
    // 10 seconds
    staleTime: 10 * 1000
  })
}

export const useCreateEmergencyEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (event: EmergencyEventInsert) => {
      return await supabaseHelpers.createEmergencyEvent(event)
    },
    onSuccess: (newEvent: { id: string } & Record<string, unknown>) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', newEvent.id], newEvent)
    },
    onError: error => {
      console.error('Failed to create emergency event:', error)
    }
  })
}

export const useUpdateEmergencyEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmergencyEvent> }) => {
      return await supabaseHelpers.updateEmergencyEvent(id, updates)
    },
    onSuccess: (updatedEvent: { id: string } & Record<string, unknown>) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-events'] })
      queryClient.setQueryData(['emergency-event', updatedEvent.id], updatedEvent)
    },
    onError: error => {
      console.error('Failed to update emergency event:', error)
    }
  })
}

export const useConfirmEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
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
      return await supabaseHelpers.confirmEvent(eventId, userId, confirmationType, location)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-event', variables.eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-confirmations', variables.eventId] })
    },
    onError: error => {
      console.error('Failed to confirm event:', error)
    }
  })
}

export const useEventConfirmations = (eventId: string) => {
  return useQuery({
    queryKey: ['event-confirmations', eventId],
    queryFn: () => supabaseHelpers.getEventConfirmations(eventId),
    enabled: !!eventId,
    // 15 seconds
    staleTime: 15 * 1000
  })
}

export const useEmergencyTypes = () => {
  return useQuery({
    queryKey: ['emergency-types'],
    queryFn: () => supabaseHelpers.getEmergencyTypes(),
    // 5 minutes
    staleTime: 5 * 60 * 1000
  })
}

// Real-time subscriptions
export const useEmergencyEventsSubscription = (callback: (payload: Record<string, unknown>) => void) => {
  return useQuery({
    queryKey: ['emergency-events-subscription'],
    queryFn: () => {
      const subscription = supabaseHelpers.subscribeToEmergencyEvents(callback)

      return {
        subscription,
        unsubscribe: () => subscription.unsubscribe()
      }
    },
    // Never refetch
    staleTime: Infinity
  })
}

// Utility functions for optimistic updates
export const getOptimisticEvent = (
  currentEvent: EmergencyEvent,
  updates: Partial<EmergencyEvent>
): EmergencyEvent => {
  return {
    ...currentEvent,
    ...updates,
    updated_at: new Date().toISOString()
  }
}

export const getOptimisticConfirmation = (
  eventId: string,
  userId: string,
  confirmationType: 'confirm' | 'dispute',
  location?: { lat: number; lng: number }
) => {
  return {
    id: `temp-${Date.now()}`,
    event_id: eventId,
    user_id: userId,
    confirmation_type: confirmationType,
    trust_weight: 0.1,
    location: location ? `POINT(${location.lng} ${location.lat})` : null,
    distance_from_event: null,
    created_at: new Date().toISOString()
  }
}
