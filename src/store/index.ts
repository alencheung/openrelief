// Export all stores for easy importing
export { useAuthStore, useAuth, useAuthActions } from './authStore'
export { 
  useEmergencyStore, 
  useEmergencyEvents, 
  useEmergencyFilters, 
  useEmergencyMap, 
  useOfflineActions as useEmergencyOfflineActions,
  useEmergencyActions 
} from './emergencyStore'
export { 
  useTrustStore, 
  useTrustScore, 
  useTrustThresholds, 
  useTrustHistory, 
  useTrustActions,
  canUserReport,
  canUserConfirm,
  canUserDispute,
  isHighTrustUser,
  isLowTrustUser
} from './trustStore'
export { 
  useLocationStore, 
  useCurrentLocation, 
  useLocationTracking, 
  useGeofences, 
  useProximityAlerts,
  useLocationActions,
  calculateDistance,
  isPointInGeofence
} from './locationStore'
export { 
  useNotificationStore, 
  useNotifications, 
  useNotificationSettings, 
  useNotificationUI,
  useNotificationActions,
  useUnreadCount,
  isInQuietHours
} from './notificationStore'
export { 
  useOfflineStore, 
  useOfflineActions,
  useOfflineCache,
  useOfflineMetrics,
  useOfflineSettings,
  generateId as generateOfflineId,
  estimateDataSize,
  compressData,
  decompressData
} from './offlineStore'

// Re-export types for convenience
export type {
  User,
  AuthState,
  AuthActions,
} from './authStore'

export type {
  EmergencyEvent,
  EmergencyFilter,
  EmergencyMapState,
  OfflineEmergencyAction,
} from './emergencyStore'

export type {
  TrustScore,
  TrustHistoryEntry,
  TrustFactors,
  TrustCalculation,
  TrustThresholds,
} from './trustStore'

export type {
  LocationPoint,
  Geofence,
  LocationTrackingSession,
  LocationPermission,
  LocationSettings,
  ProximityAlert,
} from './locationStore'

export type {
  Notification,
  NotificationAction,
  NotificationSettings,
  NotificationQueue,
  NotificationStats,
} from './notificationStore'

export type {
  OfflineAction,
  OfflineCache,
  SyncQueue,
  OfflineMetrics,
  OfflineSettings,
  ConflictResolution,
} from './offlineStore'

// Utility functions for store initialization
export const initializeStores = async () => {
  // Initialize any stores that need async setup
  const { requestLocationPermission } = useLocationStore.getState()
  const { requestPushPermission } = useNotificationStore.getState()
  const { registerBackgroundSync } = useOfflineStore.getState()

  // Request permissions if needed
  try {
    await Promise.allSettled([
      requestLocationPermission(),
      requestPushPermission(),
      registerBackgroundSync(),
    ])
  } catch (error) {
    console.error('Failed to initialize some stores:', error)
  }
}

// Store health check
export const checkStoreHealth = () => {
  const stores = [
    { name: 'auth', store: useAuthStore.getState() },
    { name: 'emergency', store: useEmergencyStore.getState() },
    { name: 'trust', store: useTrustStore.getState() },
    { name: 'location', store: useLocationStore.getState() },
    { name: 'notification', store: useNotificationStore.getState() },
    { name: 'offline', store: useOfflineStore.getState() },
  ]

  const health = stores.map(({ name, store }) => ({
    name,
    healthy: store !== null && typeof store === 'object',
    error: store?.error || null,
  }))

  return {
    overall: health.every(s => s.healthy),
    stores: health,
  }
}

// Store reset utility
export const resetAllStores = () => {
  useAuthStore.getState().reset()
  useEmergencyStore.getState().reset()
  useTrustStore.getState().reset()
  useLocationStore.getState().reset()
  useNotificationStore.getState().reset()
  useOfflineStore.getState().reset()
}

// Store persistence utilities
export const exportStoreData = () => {
  return {
    auth: useAuthStore.getState(),
    emergency: useEmergencyStore.getState(),
    trust: useTrustStore.getState(),
    location: useLocationStore.getState(),
    notification: useNotificationStore.getState(),
    offline: useOfflineStore.getState(),
  }
}

export const importStoreData = (data: any) => {
  if (data.auth) useAuthStore.setState(data.auth)
  if (data.emergency) useEmergencyStore.setState(data.emergency)
  if (data.trust) useTrustStore.setState(data.trust)
  if (data.location) useLocationStore.setState(data.location)
  if (data.notification) useNotificationStore.setState(data.notification)
  if (data.offline) useOfflineStore.setState(data.offline)
}