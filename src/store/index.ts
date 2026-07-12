// Export all stores for easy importing
import { useAuthStore, useAuth, useAuthActions } from './authStore'
import {
  useEmergencyStore,
  useEmergencyEvents,
  useEmergencyFilters,
  useEmergencyMap,
  useOfflineActions as _useEmergencyOfflineActions,
  useEmergencyActions
} from './emergencyStore'
import {
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
import {
  useLocationStore,
  useCurrentLocation,
  useLocationTracking,
  useGeofences,
  useProximityAlerts,
  useLocationActions,
  calculateDistance,
  isPointInGeofence
} from './locationStore'
import {
  useNotificationStore,
  useNotifications,
  useNotificationSettings,
  useNotificationUI,
  useNotificationActions,
  useUnreadCount,
  isInQuietHours
} from './notificationStore'
import {
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
import {
  useCheckInStore,
  useCheckIns,
  useCheckInFilters,
  useSelectedCheckIn,
  useCheckInActions
} from './checkInStore'

// State shapes for each store, derived from the zustand hooks so the import
// helper can type its partial-restore casts without hand-maintained copies.
type AuthStoreState = ReturnType<typeof useAuthStore.getState>
type EmergencyStoreState = ReturnType<typeof useEmergencyStore.getState>
type TrustStoreState = ReturnType<typeof useTrustStore.getState>
type LocationStoreState = ReturnType<typeof useLocationStore.getState>
type NotificationStoreState = ReturnType<typeof useNotificationStore.getState>
type OfflineStoreState = ReturnType<typeof useOfflineStore.getState>
type CheckInStoreState = ReturnType<typeof useCheckInStore.getState>

export { useAuthStore, useAuth, useAuthActions }
export {
  useEmergencyStore,
  useEmergencyEvents,
  useEmergencyFilters,
  useEmergencyMap,
  useOfflineActions as useEmergencyOfflineActions,
  useEmergencyActions
}
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
}
export {
  useLocationStore,
  useCurrentLocation,
  useLocationTracking,
  useGeofences,
  useProximityAlerts,
  useLocationActions,
  calculateDistance,
  isPointInGeofence
}
export {
  useNotificationStore,
  useNotifications,
  useNotificationSettings,
  useNotificationUI,
  useNotificationActions,
  useUnreadCount,
  isInQuietHours
}
export {
  useOfflineStore,
  useOfflineActions,
  useOfflineCache,
  useOfflineMetrics,
  useOfflineSettings,
  generateOfflineId,
  estimateDataSize,
  compressData,
  decompressData
}
export {
  useCheckInStore,
  useCheckIns,
  useCheckInFilters,
  useSelectedCheckIn,
  useCheckInActions
}

// Re-export types for convenience
export type {
  User,
  AuthState,
  AuthActions
} from './authStore'

export type {
  EmergencyEvent,
  EmergencyFilter,
  EmergencyMapState,
  OfflineEmergencyAction
} from './emergencyStore'

export type {
  TrustScore,
  TrustHistoryEntry,
  TrustFactors,
  TrustCalculation,
  TrustThresholds
} from './trustStore'

export type {
  LocationPoint,
  Geofence,
  LocationTrackingSession,
  LocationPermission,
  LocationSettings,
  ProximityAlert
} from './locationStore'

export type {
  Notification,
  NotificationAction,
  NotificationSettings,
  NotificationQueue,
  NotificationStats
} from './notificationStore'

export type {
  OfflineAction,
  OfflineCache,
  SyncQueue,
  OfflineMetrics,
  OfflineSettings,
  ConflictResolution
} from './offlineStore'

export type {
  StatusCheckIn,
  CheckInSummary,
  CheckInFilter,
  CheckInCreateInput,
  CheckInUpdateInput
} from '@/types/checkin'

// Utility functions for store initialization
export const initializeStores = async () => {
  // Initialize any stores that need async setup
  const locationStore = useLocationStore.getState()
  const notificationStore = useNotificationStore.getState()
  const offlineStore = useOfflineStore.getState()

  // Request permissions if needed
  try {
    await Promise.allSettled([
      locationStore.requestLocationPermission(),
      notificationStore.requestPushPermission(),
      offlineStore.registerBackgroundSync()
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
    { name: 'offline', store: useOfflineStore.getState() }
  ]

  const health = stores.map(({ name, store }) => ({
    name,
    healthy: store !== null && typeof store === 'object',
    error: (store as { error?: unknown })?.error || null
  }))

  return {
    overall: health.every(s => s.healthy),
    stores: health
  }
}

// Store reset utility
export const resetAllStores = () => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    session: null
  })
  useEmergencyStore.getState().reset()
  useTrustStore.getState().reset()
  useLocationStore.getState().reset()
  useNotificationStore.getState().reset()
  useOfflineStore.getState().reset()
  useCheckInStore.getState().reset()
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
    checkIn: useCheckInStore.getState()
  }
}

export const importStoreData = (data: Record<string, unknown>) => {
  if (data.auth) {
    useAuthStore.setState(data.auth as Partial<AuthStoreState>)
  }
  if (data.emergency) {
    useEmergencyStore.setState(data.emergency as Partial<EmergencyStoreState>)
  }
  if (data.trust) {
    useTrustStore.setState(data.trust as Partial<TrustStoreState>)
  }
  if (data.location) {
    useLocationStore.setState(data.location as Partial<LocationStoreState>)
  }
  if (data.notification) {
    useNotificationStore.setState(data.notification as Partial<NotificationStoreState>)
  }
  if (data.offline) {
    useOfflineStore.setState(data.offline as Partial<OfflineStoreState>)
  }
  if (data.checkIn) {
    useCheckInStore.setState(data.checkIn as Partial<CheckInStoreState>)
  }
}