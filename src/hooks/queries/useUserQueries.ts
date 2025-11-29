import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseHelpers, supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { useTrustStore, useNotificationStore, useOfflineStore } from '@/store'

// Types
type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
type UserTrustHistory = Database['public']['Tables']['user_trust_history']['Row']
type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
type UserNotificationSettings = Database['public']['Tables']['user_notification_settings']['Row']

// User profile queries
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      try {
        const data = await supabaseHelpers.getUserProfile(userId)
        
        // Update trust store
        useTrustStore.getState().setUserScore(userId, {
          userId,
          score: data.trust_score,
          previousScore: data.trust_score,
          lastUpdated: new Date(data.updated_at),
          history: [],
          factors: {
            reportingAccuracy: 0.5,
            confirmationAccuracy: 0.5,
            disputeAccuracy: 0.5,
            responseTime: 30,
            locationAccuracy: 0.5,
            contributionFrequency: 0,
            communityEndorsement: 0.5,
            penaltyScore: 0,
            expertiseAreas: [],
          },
        })

        // Cache for offline use
        useOfflineStore.getState().setCache(`user-profile-${userId}`, data, {
          tags: ['user', 'profile'],
          expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
        })

        return data
      } catch (error) {
        // Fallback to cache
        const cachedData = useOfflineStore.getState().getCache(`user-profile-${userId}`)
        if (cachedData) {
          return cachedData
        }
        
        throw error
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export const useCreateUserProfile = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  
  return useMutation({
    mutationFn: async (profile: UserProfileInsert) => {
      try {
        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'create',
            table: 'user_profiles',
            data: profile,
            priority: 'high',
            maxRetries: 5,
          })
          
          addNotification({
            type: 'system',
            title: 'Profile Queued',
            message: 'Your profile will be created when you\'re back online.',
            severity: 'info',
            priority: 'medium',
            channels: { inApp: true, push: false, email: false, sms: false },
          })
          
          return profile
        }

        const data = await supabaseHelpers.createUserProfile(profile)
        
        addNotification({
          type: 'system',
          title: 'Profile Created',
          message: 'Your profile has been successfully created.',
          severity: 'success',
          priority: 'medium',
          channels: { inApp: true, push: true, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to create user profile:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.setQueryData(['user-profile', data.user_id], data)
    },
  })
}

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: UserProfileUpdate }) => {
      try {
        // Optimistic update
        queryClient.setQueryData(['user-profile', userId], (old: any) => 
          old ? { ...old, ...updates, updated_at: new Date().toISOString() } : old
        )

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'update',
            table: 'user_profiles',
            data: { userId, updates },
            priority: 'medium',
            maxRetries: 3,
          })
          
          addNotification({
            type: 'system',
            title: 'Profile Update Queued',
            message: 'Your profile update will be synced when you\'re back online.',
            severity: 'info',
            priority: 'medium',
            channels: { inApp: true, push: false, email: false, sms: false },
          })
          
          return { userId, updates }
        }

        const data = await supabaseHelpers.updateUserProfile(userId, updates)
        
        addNotification({
          type: 'system',
          title: 'Profile Updated',
          message: 'Your profile has been successfully updated.',
          severity: 'success',
          priority: 'medium',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to update user profile:', error)
        
        // Rollback optimistic update
        queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
        
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', variables.userId] })
    },
  })
}

// Trust score queries
export const useTrustScore = (userId: string) => {
  return useQuery({
    queryKey: ['trust-score', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('calculate_trust_score', {
            p_user_id: userId,
          })

        if (error) throw error
        
        // Update trust store
        const currentScore = useTrustStore.getState().getUserScore(userId)
        if (currentScore) {
          useTrustStore.getState().updateUserScore({
            score: data,
            previousScore: currentScore.score,
            lastUpdated: new Date(),
          })
        }

        return data
      } catch (error) {
        // Fallback to local store
        const localScore = useTrustStore.getState().getUserScore(userId)
        if (localScore) {
          return localScore.score
        }
        
        throw error
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
}

export const useTrustHistory = (userId?: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['trust-history', userId, limit],
    queryFn: async () => {
      let query = supabase
        .from('user_trust_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error

      // Update trust store
      if (userId) {
        useTrustStore.getState().loadHistory(userId)
      }

      return data
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export const useUpdateTrustScore = () => {
  const queryClient = useQueryClient()
  const { updateTrustForAction } = useTrustStore.getState()
  
  return useMutation({
    mutationFn: async ({
      userId,
      eventId,
      actionType,
      outcome,
      metadata,
    }: {
      userId: string
      eventId: string
      actionType: 'report' | 'confirm' | 'dispute'
      outcome: 'success' | 'failure' | 'pending'
      metadata?: any
    }) => {
      try {
        // Update local trust score immediately
        await updateTrustForAction(userId, eventId, actionType, outcome, metadata)

        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'create',
            table: 'user_trust_history',
            data: {
              user_id: userId,
              event_id: eventId,
              action_type: actionType,
              trust_change: 0, // Will be calculated server-side
              previous_score: 0, // Will be filled server-side
              new_score: 0, // Will be filled server-side
              reason: `${actionType} ${outcome}`,
            },
            priority: 'medium',
            maxRetries: 3,
          })
          
          return { userId, eventId, actionType, outcome }
        }

        // Create trust history entry
        const { data, error } = await supabase
          .from('user_trust_history')
          .insert({
            user_id: userId,
            event_id: eventId,
            action_type: actionType,
            trust_change: 0, // Will be calculated by trigger
            previous_score: 0, // Will be filled by trigger
            new_score: 0, // Will be filled by trigger
            reason: `${actionType} ${outcome}`,
          })
          .select()
          .single()

        if (error) throw error

        return data
      } catch (error) {
        console.error('Failed to update trust score:', error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trust-score', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['trust-history', variables.userId] })
    },
  })
}

// User subscriptions
export const useUserSubscriptions = (userId: string) => {
  return useQuery({
    queryKey: ['user-subscriptions', userId],
    queryFn: async () => {
      try {
        const data = await supabaseHelpers.getUserSubscriptions(userId)
        
        // Cache for offline use
        useOfflineStore.getState().setCache(`user-subscriptions-${userId}`, data, {
          tags: ['user', 'subscriptions'],
          expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
        })

        return data
      } catch (error) {
        // Fallback to cache
        const cachedData = useOfflineStore.getState().getCache(`user-subscriptions-${userId}`)
        if (cachedData) {
          return cachedData
        }
        
        throw error
      }
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useSubscribeToTopic = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  
  return useMutation({
    mutationFn: async ({ userId, topicId }: { userId: string; topicId: number }) => {
      try {
        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'create',
            table: 'user_subscriptions',
            data: { user_id: userId, topic_id: topicId, is_active: true },
            priority: 'low',
            maxRetries: 3,
          })
          
          return { userId, topicId }
        }

        const data = await supabaseHelpers.subscribeToTopic(userId, topicId)
        
        addNotification({
          type: 'system',
          title: 'Subscription Added',
          message: 'You have successfully subscribed to this emergency type.',
          severity: 'success',
          priority: 'low',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to subscribe to topic:', error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', variables.userId] })
    },
  })
}

export const useUnsubscribeFromTopic = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  
  return useMutation({
    mutationFn: async ({ userId, topicId }: { userId: string; topicId: number }) => {
      try {
        // Add to offline queue if needed
        if (!navigator.onLine) {
          useOfflineStore.getState().addAction({
            type: 'update',
            table: 'user_subscriptions',
            data: { 
              user_id: userId, 
              topic_id: topicId, 
              updates: { is_active: false }
            },
            priority: 'low',
            maxRetries: 3,
          })
          
          return { userId, topicId }
        }

        const data = await supabaseHelpers.unsubscribeFromTopic(userId, topicId)
        
        addNotification({
          type: 'system',
          title: 'Subscription Removed',
          message: 'You have successfully unsubscribed from this emergency type.',
          severity: 'info',
          priority: 'low',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to unsubscribe from topic:', error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', variables.userId] })
    },
  })
}

// User notification settings
export const useUserNotificationSettings = (userId: string) => {
  return useQuery({
    queryKey: ['user-notification-settings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore.getState()
  
  return useMutation({
    mutationFn: async ({
      userId,
      topicId,
      settings,
    }: {
      userId: string
      topicId: number
      settings: Partial<UserNotificationSettings>
    }) => {
      try {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .upsert({
            user_id: userId,
            topic_id: topicId,
            ...settings,
          })
          .select()
          .single()

        if (error) throw error
        
        addNotification({
          type: 'system',
          title: 'Notification Settings Updated',
          message: 'Your notification preferences have been saved.',
          severity: 'success',
          priority: 'low',
          channels: { inApp: true, push: false, email: false, sms: false },
        })

        return data
      } catch (error) {
        console.error('Failed to update notification settings:', error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-notification-settings', variables.userId] })
    },
  })
}

// Advanced queries
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_stats', {
          p_user_id: userId,
        })

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useNearbyUsers = (
  center: { lat: number; lng: number },
  radius: number = 1000, // 1km default
  limit: number = 50
) => {
  return useQuery({
    queryKey: ['nearby-users', center, radius, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nearby_users', {
        p_lat: center.lat,
        p_lng: center.lng,
        p_radius_meters: radius,
        p_limit: limit,
      })

      if (error) throw error
      return data
    },
    enabled: !!(center.lat && center.lng),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  })
}

export const useUserExpertise = (userId: string) => {
  return useQuery({
    queryKey: ['user-expertise', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_expertise', {
          p_user_id: userId,
        })

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}