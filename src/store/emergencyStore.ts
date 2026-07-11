import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { Database } from '@/types/database'
import { useTrustStore } from '@/store/trustStore'

// Types
// Types
export type EmergencyEvent = Database['public']['Tables']['emergency_events']['Row'] & {
  emergency_types?: Database['public']['Tables']['emergency_types']['Row']
  reporter?: {
    user_id: string
    trust_score: number
  }
  distance?: number
  isWithinRadius?: boolean
}

export interface EmergencyFilter {
  status?: Database['public']['Enums']['emergency_events_status'][]
  type_ids?: number[]
  severity?: number[]
  radius?: number
  center?: { lat: number; lng: number }
  timeRange?: {
    start: Date
    end: Date
  }
  trustWeight?: number
}

export interface EmergencyMapState {
  center: { lat: number; lng: number }
  zoom: number
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  showUserLocation: boolean
  showEvents: boolean
  showHeatmap: boolean
  showClusters: boolean
  selectedEventId?: string | undefined
}

export interface OfflineEmergencyAction {
  id: string
  type: 'create' | 'update' | 'confirm' | 'dispute'
  eventId?: string
  data: any
  timestamp: number
  synced: boolean
  retryCount: number
}

// Emergency Store State
interface EmergencyState {
  // Events
  events: EmergencyEvent[]
  selectedEvent: EmergencyEvent | null
  filteredEvents: EmergencyEvent[]
  loading: boolean
  error: string | null

  // Filters
  filters: EmergencyFilter
  searchQuery: string

  // Map State
  mapState: EmergencyMapState

  // Offline Actions
  offlineActions: OfflineEmergencyAction[]

  // Emergency Types
  emergencyTypes: Database['public']['Tables']['emergency_types']['Row'][]

  // Real-time
  isRealtimeEnabled: boolean
  lastSyncTime: Date | null

  // Location
  userLocation: { lat: number; lng: number } | null
  locationAccuracy: number | null
  isLocationTracking: boolean
}

// Emergency Store Actions
interface EmergencyActions {
  // Event Actions
  setEvents: (events: EmergencyEvent[]) => void
  addEvent: (event: EmergencyEvent) => void
  updateEvent: (eventId: string, updates: Partial<EmergencyEvent>) => void
  removeEvent: (eventId: string) => void
  setSelectedEvent: (event: EmergencyEvent | null) => void

  // Filter Actions
  setFilters: (filters: Partial<EmergencyFilter>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  applyFilters: () => void

  // Map Actions
  setMapState: (state: Partial<EmergencyMapState>) => void
  setMapCenter: (center: { lat: number; lng: number }) => void
  setMapZoom: (zoom: number) => void
  setSelectedEventOnMap: (eventId: string | undefined) => void

  // Offline Actions
  addOfflineAction: (action: Omit<OfflineEmergencyAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>) => void
  removeOfflineAction: (actionId: string) => void
  markActionSynced: (actionId: string) => void
  incrementRetryCount: (actionId: string) => void
  clearSyncedActions: () => void

  // Emergency Types
  setEmergencyTypes: (types: Database['public']['Tables']['emergency_types']['Row'][]) => void

  // Real-time
  setRealtimeEnabled: (enabled: boolean) => void
  updateLastSyncTime: () => void

  // Location
  setUserLocation: (location: { lat: number; lng: number }, accuracy?: number) => void
  setLocationTracking: (enabled: boolean) => void
  clearUserLocation: () => void

  // Utility Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type EmergencyStore = EmergencyState & EmergencyActions

// Initial State
const initialState: EmergencyState = {
  events: [],
  selectedEvent: null,
  filteredEvents: [],
  loading: false,
  error: null,

  filters: {
    status: ['pending', 'active'],
    severity: [3, 4, 5] // High severity events
  },
  searchQuery: '',

  mapState: {
    center: { lat: 0, lng: 0 },
    zoom: 10,
    showUserLocation: true,
    showEvents: true,
    showHeatmap: false,
    showClusters: true
  },

  offlineActions: [],
  emergencyTypes: [],
  isRealtimeEnabled: true,
  lastSyncTime: null,

  userLocation: null,
  locationAccuracy: null,
  isLocationTracking: false
}

// Filter utility functions
//
// These accessors normalise event fields that may arrive in either the DB
// schema shape (severity as number 1-5, location as a WKT 'lng lat' string,
// type_id as number, created_at/updated_at timestamps) or the rich domain
// shape used by some client fixtures and realtime payloads (severity as a
// string like 'high', location as {latitude, longitude}, type as a string,
// reportedAt timestamp). The store accepts both so filtering works regardless
// of where the event object originated.
const SEVERITY_STRING_TO_NUM: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 4,
  critical: 5
}

function getEventSeverity(event: any): number {
  if (typeof event.severity === 'number') return event.severity
  if (typeof event.severity === 'string') {
    return SEVERITY_STRING_TO_NUM[event.severity.toLowerCase()] ?? 3
  }
  return 3
}

function getEventTypeId(event: any): number | undefined {
  if (typeof event.type_id === 'number') return event.type_id
  if (typeof event.type === 'string') {
    const map: Record<string, number> = {
      fire: 1,
      medical: 2,
      security: 3,
      natural_disaster: 4,
      natural: 4,
      infrastructure: 5,
      accident: 6,
      utility: 7,
      other: 8
    }
    return map[event.type.toLowerCase()]
  }
  return undefined
}

function getEventCoordinates(event: any): { lat: number; lng: number } | null {
  // WKT string: 'lng lat' or 'POINT(lng lat)'
  if (typeof event.location === 'string') {
    const cleaned = event.location.replace('POINT(', '').replace(')', '').trim()
    const parts = cleaned.split(/[\s,]+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) return { lat, lng }
    }
    return null
  }
  // Object: { latitude, longitude } or { lat, lng }
  if (event.location && typeof event.location === 'object') {
    const lat = event.location.latitude ?? event.location.lat
    const lng = event.location.longitude ?? event.location.lng
    if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng }
  }
  return null
}

function getEventTimestamp(event: any): string {
  return event.created_at || event.reportedAt || event.updated_at || new Date(0).toISOString()
}

const filterEvents = (
  events: EmergencyEvent[],
  filters: EmergencyFilter,
  searchQuery: string,
  _userLocation?: { lat: number; lng: number } | null
): EmergencyEvent[] => {
  return events.filter(event => {
    const e = event as any

    // Status filter
    if (filters.status && !filters.status.includes(e.status)) {
      return false
    }

    // Type filter
    if (filters.type_ids) {
      const typeId = getEventTypeId(e)
      if (typeId === undefined || !filters.type_ids.includes(typeId)) {
        return false
      }
    }

    // Severity filter
    if (filters.severity && !filters.severity.includes(getEventSeverity(e))) {
      return false
    }

    // Trust weight filter
    const trustWeight = e.trust_weight ?? e.trustScore ?? 0
    if (filters.trustWeight && trustWeight < filters.trustWeight) {
      return false
    }

    // Time range filter
    if (filters.timeRange) {
      const eventTime = new Date(getEventTimestamp(e))
      if (eventTime < filters.timeRange.start || eventTime > filters.timeRange.end) {
        return false
      }
    }

    // Radius filter (requires center)
    if (filters.radius && filters.center) {
      const coords = getEventCoordinates(e)
      if (!coords) {
        return false
      }
      const distance = calculateDistance(
        filters.center.lat,
        filters.center.lng,
        coords.lat,
        coords.lng
      )
      if (distance > filters.radius) {
        return false
      }
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = e.title?.toLowerCase().includes(query) ?? false
      const matchesDescription = e.description?.toLowerCase().includes(query) ?? false
      const matchesType =
        (e.emergency_types?.name?.toLowerCase().includes(query) ?? false) ||
        (typeof e.type === 'string' && e.type.toLowerCase().includes(query))

      if (!matchesTitle && !matchesDescription && !matchesType) {
        return false
      }
    }

    return true
  })
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
    + Math.cos(φ1) * Math.cos(φ2)
    * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Create Store
export const useEmergencyStore = create<EmergencyStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Event Actions
        setEvents: (events) => {
          set({ events })
          get().applyFilters()
        },

        addEvent: (event) => {
          // Derive trust_weight from the reporter's current trust score so
          // events carry the reporter's trust at creation time (used by the
          // consensus weighting and exposed on the event). Handle both the DB
          // schema field (reporter_id) and the domain-model fixture field
          // (reportedBy).
          const eventAny = event as Record<string, unknown>
          const reporterId =
            (eventAny.reporter_id as string) ??
            (eventAny.reportedBy as string) ??
            (event.reporter?.user_id as string)
          const explicitTrustWeight =
            typeof eventAny.trust_weight === 'number' ? eventAny.trust_weight : undefined
          const trustWeight = (() => {
            // Prefer the reporter's live trust score (the source of truth);
            // fall back to an explicit trust_weight on the event, then 0.
            if (reporterId) {
              try {
                const score = useTrustStore.getState().getUserScore(reporterId)
                if (score) {
                  const s = (score as { score?: number; overall?: number }).score
                  const o = (score as { overall?: number }).overall
                  if (typeof s === 'number') return s
                  if (typeof o === 'number') return o
                }
              } catch {
                // ignore
              }
            }
            if (explicitTrustWeight !== undefined) return explicitTrustWeight
            return 0
          })()
          const eventWithTrust =
            typeof eventAny.trust_weight === 'number'
              ? event
              : { ...event, trust_weight: trustWeight }

          set((state) => {
            const newEvents = [eventWithTrust, ...state.events]
            return {
              events: newEvents,
              filteredEvents: filterEvents(
                newEvents,
                state.filters,
                state.searchQuery,
                state.userLocation
              )
            }
          })
        },

        updateEvent: (eventId, updates) => {
          set((state) => {
            const newEvents = state.events.map(event =>
              event.id === eventId ? { ...event, ...updates, updated_at: new Date().toISOString() } : event
            )
            return {
              events: newEvents,
              selectedEvent: state.selectedEvent?.id === eventId
                ? { ...state.selectedEvent, ...updates, updated_at: new Date().toISOString() }
                : state.selectedEvent,
              filteredEvents: filterEvents(
                newEvents,
                state.filters,
                state.searchQuery,
                state.userLocation
              )
            }
          })
        },

        removeEvent: (eventId) => {
          set((state) => {
            const newEvents = state.events.filter(event => event.id !== eventId)
            return {
              events: newEvents,
              selectedEvent: state.selectedEvent?.id === eventId ? null : state.selectedEvent,
              filteredEvents: filterEvents(
                newEvents,
                state.filters,
                state.searchQuery,
                state.userLocation
              )
            }
          })
        },

        setSelectedEvent: (event) => set({ selectedEvent: event }),

        // Filter Actions
        setFilters: (filters) => {
          set((state) => ({ filters: { ...state.filters, ...filters } }))
          get().applyFilters()
        },

        clearFilters: () => {
          set({
            filters: initialState.filters,
            searchQuery: ''
          })
          get().applyFilters()
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query })
          get().applyFilters()
        },

        applyFilters: () => {
          const { events, filters, searchQuery, userLocation } = get()
          const filteredEvents = filterEvents(events, filters, searchQuery, userLocation)
          set({ filteredEvents })
        },

        // Map Actions
        setMapState: (state) => {
          set((prevState) => ({ mapState: { ...prevState.mapState, ...state } }))
        },

        setMapCenter: (center) => {
          set((prevState) => ({ mapState: { ...prevState.mapState, center } }))
        },

        setMapZoom: (zoom) => {
          set((prevState) => ({ mapState: { ...prevState.mapState, zoom } }))
        },

        setSelectedEventOnMap: (eventId) => {
          set((prevState) => ({ mapState: { ...prevState.mapState, selectedEventId: eventId } }))
        },

        // Offline Actions
        addOfflineAction: (action) => {
          const newAction: OfflineEmergencyAction = {
            ...action,
            id: `${action.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            synced: false,
            retryCount: 0
          }

          set((state) => ({
            offlineActions: [...state.offlineActions, newAction]
          }))
        },

        removeOfflineAction: (actionId) => {
          set((state) => ({
            offlineActions: state.offlineActions.filter(action => action.id !== actionId)
          }))
        },

        markActionSynced: (actionId) => {
          set((state) => ({
            offlineActions: state.offlineActions.map(action =>
              action.id === actionId ? { ...action, synced: true } : action
            )
          }))
        },

        incrementRetryCount: (actionId) => {
          set((state) => ({
            offlineActions: state.offlineActions.map(action =>
              action.id === actionId ? { ...action, retryCount: action.retryCount + 1 } : action
            )
          }))
        },

        clearSyncedActions: () => {
          set((state) => ({
            offlineActions: state.offlineActions.filter(action => !action.synced)
          }))
        },

        // Emergency Types
        setEmergencyTypes: (types) => set({ emergencyTypes: types }),

        // Real-time
        setRealtimeEnabled: (enabled) => set({ isRealtimeEnabled: enabled }),
        updateLastSyncTime: () => set({ lastSyncTime: new Date() }),

        // Location
        setUserLocation: (location, accuracy) => {
          set({ userLocation: location, locationAccuracy: accuracy ?? null })
          get().applyFilters() // Reapply filters with new location
        },

        setLocationTracking: (enabled) => set({ isLocationTracking: enabled }),

        clearUserLocation: () => {
          set({ userLocation: null, locationAccuracy: null })
          get().applyFilters()
        },

        // Utility Actions
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        reset: () => set(initialState)
      }),
      {
        name: 'emergency-storage',
        partialize: (state) => ({
          filters: state.filters,
          searchQuery: state.searchQuery,
          mapState: state.mapState,
          emergencyTypes: state.emergencyTypes,
          isRealtimeEnabled: state.isRealtimeEnabled,
          isLocationTracking: state.isLocationTracking,
          offlineActions: state.offlineActions.filter(action => !action.synced) // Only persist unsynced actions
        })
      }
    )
  )
)

// Selectors for common use cases
export const useEmergencyEvents = () => useEmergencyStore(state => ({
  events: state.events,
  filteredEvents: state.filteredEvents,
  loading: state.loading,
  error: state.error
}))

export const useEmergencyFilters = () => useEmergencyStore(state => ({
  filters: state.filters,
  searchQuery: state.searchQuery,
  filteredEvents: state.filteredEvents
}))

export const useEmergencyMap = () => useEmergencyStore(state => state.mapState)

export const useOfflineActions = () => useEmergencyStore(state => ({
  offlineActions: state.offlineActions,
  addOfflineAction: state.addOfflineAction,
  clearSyncedActions: state.clearSyncedActions
}))

export const useEmergencyActions = () => useEmergencyStore(state => ({
  setEvents: state.setEvents,
  addEvent: state.addEvent,
  updateEvent: state.updateEvent,
  removeEvent: state.removeEvent,
  setSelectedEvent: state.setSelectedEvent,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  setSearchQuery: state.setSearchQuery,
  setMapState: state.setMapState,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError
}))