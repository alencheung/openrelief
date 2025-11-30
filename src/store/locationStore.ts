import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// Types
export interface LocationPoint {
  lat: number
  lng: number
  accuracy?: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

export interface Geofence {
  id: string
  name: string
  center: { lat: number; lng: number }
  radius: number // in meters
  type: 'emergency' | 'safe_zone' | 'restricted' | 'custom'
  isActive: boolean
  createdAt: Date
  expiresAt?: Date
  metadata?: {
    description?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
    emergencyTypeId?: number
    createdBy?: string
  }
}

export interface LocationTrackingSession {
  id: string
  startTime: Date
  endTime?: Date
  points: LocationPoint[]
  purpose: 'emergency_response' | 'patrol' | 'evacuation' | 'general'
  isActive: boolean
  metadata?: any
}

export interface LocationPermission {
  granted: boolean
  accuracy: 'high' | 'low' | 'denied'
  background: boolean
  lastRequested?: Date
}

export interface LocationSettings {
  trackingEnabled: boolean
  backgroundTracking: boolean
  highAccuracy: boolean
  updateInterval: number // milliseconds
  maxAge: number // maximum age of cached position
  enableGeofences: boolean
  shareWithEmergencyServices: boolean
  retentionPeriod: number // days
}

export interface ProximityAlert {
  id: string
  type: 'event_proximity' | 'user_proximity' | 'geofence_entry' | 'geofence_exit'
  targetId: string
  targetType: 'event' | 'user' | 'geofence'
  distance: number
  threshold: number
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: Date
  acknowledged: boolean
}

// Location Store State
interface LocationState {
  // Current location
  currentLocation: LocationPoint | null
  lastKnownLocation: LocationPoint | null
  locationPermission: LocationPermission

  // Location tracking
  isTracking: boolean
  trackingSession: LocationTrackingSession | null
  trackingHistory: LocationTrackingSession[]

  // Settings
  settings: LocationSettings

  // Geofences
  geofences: Geofence[]
  activeGeofences: string[] // IDs of active geofences
  geofenceHistory: {
    geofenceId: string
    action: 'enter' | 'exit'
    timestamp: Date
  }[]

  // Proximity alerts
  proximityAlerts: ProximityAlert[]
  proximityThresholds: {
    events: number // meters
    users: number // meters
    geofences: number // meters
  }

  // Watchers and listeners
  watchId: number | null
  geofenceWatchers: Map<string, number>

  // Performance
  lastUpdate: Date | null
  updateCount: number
  errorCount: number
  lastError: string | null
}

// Location Store Actions
interface LocationActions {
  // Location management
  setCurrentLocation: (location: LocationPoint) => void
  clearCurrentLocation: () => void
  setLastKnownLocation: (location: LocationPoint) => void

  // Permission management
  requestLocationPermission: (highAccuracy?: boolean) => Promise<LocationPermission>
  checkLocationPermission: () => Promise<LocationPermission>
  setPermission: (permission: LocationPermission) => void

  // Tracking management
  startTracking: (purpose?: LocationTrackingSession['purpose'], metadata?: any) => Promise<void>
  stopTracking: () => void
  pauseTracking: () => void
  resumeTracking: () => void
  addTrackingPoint: (point: LocationPoint) => void

  // Settings management
  updateSettings: (settings: Partial<LocationSettings>) => void
  resetSettings: () => void

  // Geofence management
  addGeofence: (geofence: Omit<Geofence, 'id' | 'createdAt'>) => string
  removeGeofence: (geofenceId: string) => void
  updateGeofence: (geofenceId: string, updates: Partial<Geofence>) => void
  toggleGeofence: (geofenceId: string) => void
  checkGeofences: (location: LocationPoint) => void
  clearExpiredGeofences: () => void

  // Proximity alerts
  addProximityAlert: (alert: Omit<ProximityAlert, 'id' | 'timestamp' | 'acknowledged'>) => void
  acknowledgeAlert: (alertId: string) => void
  clearAlert: (alertId: string) => void
  clearAllAlerts: () => void
  updateProximityThresholds: (thresholds: Partial<LocationState['proximityThresholds']>) => void
  checkProximity: (targetLocation: { lat: number; lng: number }, targetType: ProximityAlert['targetType'], targetId: string) => void

  // Utility functions
  calculateDistance: (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) => number
  isPointInGeofence: (point: LocationPoint, geofence: Geofence) => boolean
  getLocationHistory: (sessionId?: string, limit?: number) => LocationPoint[]

  // Error handling
  setError: (error: string) => void
  clearError: () => void
  reset: () => void
}

type LocationStore = LocationState & LocationActions

// Default settings
const defaultSettings: LocationSettings = {
  trackingEnabled: false,
  backgroundTracking: false,
  highAccuracy: true,
  updateInterval: 5000, // 5 seconds
  maxAge: 60000, // 1 minute
  enableGeofences: true,
  shareWithEmergencyServices: true,
  retentionPeriod: 30, // 30 days
}

const defaultProximityThresholds = {
  events: 1000, // 1km
  users: 500, // 500m
  geofences: 50, // 50m
}

// Utility functions
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

const isPointInGeofence = (point: LocationPoint, geofence: Geofence): boolean => {
  const distance = calculateDistance(
    point.lat,
    point.lng,
    geofence.center.lat,
    geofence.center.lng
  )
  return distance <= geofence.radius
}

// Create Store
export const useLocationStore = create<LocationStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        currentLocation: null,
        lastKnownLocation: null,
        locationPermission: {
          granted: false,
          accuracy: 'denied',
          background: false,
        },

        isTracking: false,
        trackingSession: null,
        trackingHistory: [],

        settings: defaultSettings,

        geofences: [],
        activeGeofences: [],
        geofenceHistory: [],

        proximityAlerts: [],
        proximityThresholds: defaultProximityThresholds,

        watchId: null,
        geofenceWatchers: new Map(),

        lastUpdate: null,
        updateCount: 0,
        errorCount: 0,
        lastError: null,

        // Location management
        setCurrentLocation: (location) => {
          set((state) => ({
            currentLocation: location,
            lastKnownLocation: location,
            lastUpdate: new Date(),
            updateCount: state.updateCount + 1,
          }))

          // Check geofences and proximity
          get().checkGeofences(location)
        },

        clearCurrentLocation: () => {
          set({ currentLocation: null })
        },

        setLastKnownLocation: (location) => {
          set({ lastKnownLocation: location })
        },

        // Permission management
        requestLocationPermission: async (highAccuracy = true) => {
          if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            throw new Error('Geolocation is not supported')
          }

          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                const permission: LocationPermission = {
                  granted: true,
                  accuracy: highAccuracy ? 'high' : 'low',
                  background: false, // Will be updated separately
                  lastRequested: new Date(),
                }
                get().setPermission(permission)
                resolve(permission)
              },
              (error) => {
                const permission: LocationPermission = {
                  granted: false,
                  accuracy: 'denied',
                  background: false,
                  lastRequested: new Date(),
                }
                get().setPermission(permission)
                resolve(permission)
              },
              {
                enableHighAccuracy: highAccuracy,
                timeout: 10000,
                maximumAge: get().settings.maxAge,
              }
            )
          })
        },

        checkLocationPermission: async () => {
          if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
            return get().locationPermission
          }

          try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
            const permission: LocationPermission = {
              granted: result.state === 'granted',
              accuracy: result.state === 'granted' ? (get().settings.highAccuracy ? 'high' : 'low') : 'denied',
              background: false, // Requires separate check
              lastRequested: new Date(),
            }
            get().setPermission(permission)
            return permission
          } catch {
            return get().locationPermission
          }
        },

        setPermission: (permission) => {
          set({ locationPermission: permission })
        },

        // Tracking management
        startTracking: async (purpose = 'general', metadata) => {
          if (get().isTracking) return

          const permission = await get().checkLocationPermission()
          if (!permission.granted) {
            throw new Error('Location permission not granted')
          }

          const sessionId = `tracking-${Date.now()}`
          const session: LocationTrackingSession = {
            id: sessionId,
            startTime: new Date(),
            points: [],
            purpose,
            isActive: true,
            metadata,
          }

          set({ isTracking: true, trackingSession: session })

          // Start watching position
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const point: LocationPoint = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  ...(position.coords.altitude !== null && { altitude: position.coords.altitude }),
                  ...(position.coords.altitudeAccuracy !== null && { altitudeAccuracy: position.coords.altitudeAccuracy }),
                  ...(position.coords.heading !== null && { heading: position.coords.heading }),
                  ...(position.coords.speed !== null && { speed: position.coords.speed }),
                  timestamp: position.timestamp,
                }

                get().setCurrentLocation(point)
                get().addTrackingPoint(point)
              },
              (error) => {
                console.error('Location tracking error:', error)
                get().setError(error.message)
                set((state) => ({ errorCount: state.errorCount + 1 }))
              },
              {
                enableHighAccuracy: get().settings.highAccuracy,
                timeout: 15000,
                maximumAge: get().settings.maxAge,
              }
            )

            set({ watchId })
          }
        },

        stopTracking: () => {
          const { watchId, trackingSession } = get()

          if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(watchId)
          }

          if (trackingSession) {
            const completedSession = {
              ...trackingSession,
              endTime: new Date(),
              isActive: false,
            }

            set((state) => ({
              isTracking: false,
              watchId: null,
              trackingSession: null,
              trackingHistory: [completedSession, ...state.trackingHistory],
            }))
          }
        },

        pauseTracking: () => {
          const { watchId } = get()

          if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(watchId)
          }

          set({ watchId: null, isTracking: false })
        },

        resumeTracking: () => {
          const trackingSession = get().trackingSession
          if (trackingSession) {
            get().startTracking(trackingSession.purpose, trackingSession.metadata)
          }
        },

        addTrackingPoint: (point) => {
          const { trackingSession } = get()
          if (!trackingSession) return

          set((state) => ({
            trackingSession: state.trackingSession ? {
              ...state.trackingSession,
              points: [...state.trackingSession.points, point],
            } : null,
          }))
        },

        // Settings management
        updateSettings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }))
        },

        resetSettings: () => {
          set({ settings: defaultSettings })
        },

        // Geofence management
        addGeofence: (geofence) => {
          // FIXED: Enhanced ID generation with better collision avoidance
          const timestamp = Date.now()
          const randomPart = Math.random().toString(36).substr(2, 9)
          const id = `geofence-${timestamp}-${randomPart}`

          console.log('Debug: Generating geofence ID:', id)
          console.log('Debug: Geofence data being added:', geofence)

          const newGeofence: Geofence = {
            ...geofence,
            id,
            createdAt: new Date(),
          }

          console.log('Debug: Complete geofence object created:', newGeofence)

          set((state) => {
            const updatedState = {
              geofences: [...state.geofences, newGeofence],
            }
            console.log('Debug: Updated geofences array length:', updatedState.geofences.length)
            return updatedState
          })

          return id
        },

        removeGeofence: (geofenceId) => {
          set((state) => ({
            geofences: state.geofences.filter(g => g.id !== geofenceId),
            activeGeofences: state.activeGeofences.filter(id => id !== geofenceId),
          }))
        },

        updateGeofence: (geofenceId, updates) => {
          set((state) => ({
            geofences: state.geofences.map(g =>
              g.id === geofenceId ? { ...g, ...updates } : g
            ),
          }))
        },

        toggleGeofence: (geofenceId) => {
          set((state) => {
            const geofence = state.geofences.find(g => g.id === geofenceId)
            if (!geofence) return state

            const updatedGeofence = { ...geofence, isActive: !geofence.isActive }
            const activeGeofences = geofence.isActive
              ? state.activeGeofences.filter(id => id !== geofenceId)
              : [...state.activeGeofences, geofenceId]

            return {
              geofences: state.geofences.map(g =>
                g.id === geofenceId ? updatedGeofence : g
              ),
              activeGeofences,
            }
          })
        },

        checkGeofences: (location) => {
          const { geofences, activeGeofences, geofenceHistory } = get()

          geofences.forEach(geofence => {
            if (!geofence.isActive) return

            const wasInside = activeGeofences.includes(geofence.id)
            const isInside = isPointInGeofence(location, geofence)

            if (wasInside && !isInside) {
              // Exit geofence
              set((state) => ({
                activeGeofences: state.activeGeofences.filter(id => id !== geofence.id),
                geofenceHistory: [
                  {
                    geofenceId: geofence.id,
                    action: 'exit',
                    timestamp: new Date(),
                  },
                  ...state.geofenceHistory,
                ],
              }))
            } else if (!wasInside && isInside) {
              // Enter geofence
              set((state) => ({
                activeGeofences: [...state.activeGeofences, geofence.id],
                geofenceHistory: [
                  {
                    geofenceId: geofence.id,
                    action: 'enter',
                    timestamp: new Date(),
                  },
                  ...state.geofenceHistory,
                ],
              }))
            }
          })
        },

        clearExpiredGeofences: () => {
          const now = new Date()
          set((state) => ({
            geofences: state.geofences.filter(g => !g.expiresAt || g.expiresAt > now),
          }))
        },

        // Proximity alerts
        addProximityAlert: (alert) => {
          const newAlert: ProximityAlert = {
            ...alert,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false,
          }

          set((state) => ({
            proximityAlerts: [newAlert, ...state.proximityAlerts],
          }))
        },

        acknowledgeAlert: (alertId) => {
          set((state) => ({
            proximityAlerts: state.proximityAlerts.map(alert =>
              alert.id === alertId ? { ...alert, acknowledged: true } : alert
            ),
          }))
        },

        clearAlert: (alertId) => {
          set((state) => ({
            proximityAlerts: state.proximityAlerts.filter(alert => alert.id !== alertId),
          }))
        },

        clearAllAlerts: () => {
          set({ proximityAlerts: [] })
        },

        updateProximityThresholds: (thresholds) => {
          set((state) => ({
            proximityThresholds: { ...state.proximityThresholds, ...thresholds },
          }))
        },

        checkProximity: (targetLocation, targetType, targetId) => {
          const { currentLocation, proximityThresholds } = get()
          if (!currentLocation) return

          const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            targetLocation.lat,
            targetLocation.lng
          )

          const threshold = proximityThresholds[targetType as keyof typeof proximityThresholds] || 1000

          if (distance <= threshold) {
            get().addProximityAlert({
              type: targetType === 'event' ? 'event_proximity' :
                targetType === 'user' ? 'user_proximity' : 'geofence_entry',
              targetId,
              targetType,
              distance,
              threshold,
              message: `Proximity alert: ${Math.round(distance)}m away`,
              severity: distance < threshold / 2 ? 'critical' : 'warning',
            })
          }
        },

        // Utility functions
        calculateDistance: (point1, point2) => {
          return calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng)
        },

        isPointInGeofence: (point, geofence) => {
          return isPointInGeofence(point, geofence)
        },

        getLocationHistory: (sessionId, limit) => {
          const { trackingHistory, trackingSession } = get()

          if (sessionId) {
            const session = trackingHistory.find(s => s.id === sessionId) || trackingSession
            return session ? session.points.slice(-(limit || Infinity)) : []
          }

          // Return all points from all sessions
          const allPoints = trackingHistory.flatMap(s => s.points)
          if (trackingSession) {
            allPoints.push(...trackingSession.points)
          }

          return allPoints.slice(-(limit || Infinity))
        },

        // Error handling
        setError: (error) => {
          set({ lastError: error })
        },

        clearError: () => {
          set({ lastError: null })
        },

        reset: () => {
          // Stop tracking if active
          if (get().isTracking) {
            get().stopTracking()
          }

          set({
            currentLocation: null,
            lastKnownLocation: null,
            isTracking: false,
            trackingSession: null,
            activeGeofences: [],
            proximityAlerts: [],
            watchId: null,
            lastUpdate: null,
            updateCount: 0,
            errorCount: 0,
            lastError: null,
          })
        },
      }),
      {
        name: 'location-storage',
        partialize: (state) => ({
          settings: state.settings,
          geofences: state.geofences,
          proximityThresholds: state.proximityThresholds,
          trackingHistory: state.trackingHistory.slice(0, 50), // Limit history size
          geofenceHistory: state.geofenceHistory.slice(0, 100), // Limit history size
        }),
      }
    )
  )
)

// Selectors for common use cases
export const useCurrentLocation = () => useLocationStore(state => state.currentLocation)

export const useLocationTracking = () => useLocationStore(state => ({
  isTracking: state.isTracking,
  trackingSession: state.trackingSession,
  settings: state.settings,
  permission: state.locationPermission,
}))

export const useGeofences = () => useLocationStore(state => ({
  geofences: state.geofences,
  activeGeofences: state.activeGeofences,
  geofenceHistory: state.geofenceHistory,
}))

export const useProximityAlerts = () => useLocationStore(state => ({
  alerts: state.proximityAlerts,
  unacknowledgedCount: state.proximityAlerts.filter(a => !a.acknowledged).length,
}))

export const useLocationActions = () => useLocationStore(state => ({
  startTracking: state.startTracking,
  stopTracking: state.stopTracking,
  requestLocationPermission: state.requestLocationPermission,
  addGeofence: state.addGeofence,
  removeGeofence: state.removeGeofence,
  toggleGeofence: state.toggleGeofence,
  acknowledgeAlert: state.acknowledgeAlert,
  clearAlert: state.clearAlert,
  updateSettings: state.updateSettings,
}))

// Utility exports
export { calculateDistance, isPointInGeofence }