// Export all query hooks for easy importing
export {
  useEmergencyEvents,
  useInfiniteEmergencyEvents,
  useEmergencyEvent,
  useCreateEmergencyEvent,
  useUpdateEmergencyEvent,
  useConfirmEvent,
  useEventConfirmations,
  useEmergencyTypes,
  useNearbyEmergencyEvents,
  useUserEmergencyEvents,
} from './useEmergencyQueries'

export {
  useUserProfile,
  useCreateUserProfile,
  useUpdateUserProfile,
  useTrustScore,
  useTrustHistory,
  useUpdateTrustScore,
  useUserSubscriptions,
  useSubscribeToTopic,
  useUnsubscribeFromTopic,
  useUserNotificationSettings,
  useUpdateNotificationSettings,
  useUserStats,
  useNearbyUsers,
  useUserExpertise,
} from './useUserQueries'

export {
  useRealtimeSubscription,
  useEmergencyEventsSubscription,
  useEventConfirmationsSubscription,
  useUserProfilesSubscription,
  useTrustHistorySubscription,
  useNotificationQueueSubscription,
  useSystemMetricsSubscription,
  useMultipleRealtimeSubscriptions,
  useRealtimeConnection,
  usePresenceTracking,
  useEmergencyBroadcast,
} from './useRealtimeSubscriptions'

// Re-export types for convenience
export type {
  EmergencyEvent,
  EmergencyEventInsert,
  EmergencyEventUpdate,
  EmergencyType,
  EventConfirmation,
  EventConfirmationInsert,
} from './useEmergencyQueries'

export type {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  UserTrustHistory,
  UserSubscription,
  UserNotificationSettings,
} from './useUserQueries'

export type {
  SubscriptionCallback,
  SubscriptionConfig,
} from './useRealtimeSubscriptions'

// Utility functions for query management
export const invalidateAllQueries = async (queryClient: any) => {
  await queryClient.invalidateQueries()
}

export const prefetchCriticalData = async (queryClient: any, userId?: string) => {
  // Prefetch emergency types
  await queryClient.prefetchQuery({
    queryKey: ['emergency-types'],
    queryFn: async () => {
      const { useEmergencyTypes } = await import('./useEmergencyQueries')
      // This would need to be implemented properly
      return []
    },
  })

  // Prefetch user profile if userId is provided
  if (userId) {
    await queryClient.prefetchQuery({
      queryKey: ['user-profile', userId],
      queryFn: async () => {
        const { useUserProfile } = await import('./useUserQueries')
        // This would need to be implemented properly
        return null
      },
    })
  }

  // Prefetch active emergency events
  await queryClient.prefetchQuery({
    queryKey: ['emergency-events', { status: ['active', 'pending'] }],
    queryFn: async () => {
      const { useEmergencyEvents } = await import('./useEmergencyQueries')
      // This would need to be implemented properly
      return []
    },
  })
}

// Query health check
export const checkQueryHealth = (queryClient: any) => {
  const cache = queryClient.getQueryCache()
  const queries = cache.getAll()
  
  const health = {
    totalQueries: queries.length,
    activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
    staleQueries: queries.filter(q => q.isStale()).length,
    errorQueries: queries.filter(q => q.state.status === 'error').length,
    cacheSize: cache.size,
  }

  return {
    overall: health.errorQueries === 0,
    ...health,
  }
}

// Query optimization utilities
export const optimizeQueryCache = (queryClient: any) => {
  const cache = queryClient.getQueryCache()
  
  // Remove old and unused queries
  cache.getAll().forEach(query => {
    const age = Date.now() - new Date(query.state.dataUpdatedAt).getTime()
    const isOld = age > 10 * 60 * 1000 // 10 minutes
    const isInactive = query.getObserversCount() === 0
    
    if (isOld && isInactive) {
      cache.remove(query)
    }
  })
}

// Query performance monitoring
export const trackQueryPerformance = (queryClient: any) => {
  const cache = queryClient.getQueryCache()
  
  cache.subscribe((event) => {
    if (event.type === 'observerAdded') {
      console.log(`[Query] Observer added to ${event.query.queryKey[0]}`)
    } else if (event.type === 'observerRemoved') {
      console.log(`[Query] Observer removed from ${event.query.queryKey[0]}`)
    } else if (event.type === 'queryUpdated') {
      console.log(`[Query] ${event.query.queryKey[0]} updated`, {
        fetchStatus: event.query.state.fetchStatus,
        status: event.query.state.status,
        dataUpdatedAt: event.query.state.dataUpdatedAt,
      })
    }
  })
}