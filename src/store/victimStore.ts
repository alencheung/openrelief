import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  Victim,
  VictimCheckIn,
  VictimFilter,
  OfflineVictimAction,
  VictimStatus,
  VictimPriority,
  Injury,
  Location
} from '@/types/victim'

// Shape of a row from GET /api/victims (DB column names). All fields are
// nullable at the DB level, so the mapper coerces defensively.
interface VictimRow {
  id: string
  name?: string
  age?: number | null
  status?: string
  priority?: string
  location?: { lat: number; lng: number; address?: string } | null
  phone?: string | null
  email?: string | null
  emergency_contact?: { name?: string; phone?: string; relationship?: string } | null
  notes?: string | null
  injuries?: Injury[] | null
  reporter_id?: string | null
  created_at?: string
  updated_at?: string
}

const VALID_STATUSES: VictimStatus[] = [
  'safe',
  'injured',
  'trapped',
  'missing',
  'deceased',
  'unknown'
]

const toDate = (value: string | null | undefined): Date => {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

// Map a DB row to the store's Victim type. Coerces unknown enum values to safe
// defaults rather than throwing, so a bad row can't poison the list.
const mapVictimRow = (row: VictimRow): Victim => {
  const status = (VALID_STATUSES.includes(row.status as VictimStatus)
    ? (row.status as VictimStatus)
    : 'unknown')
  const priority = (['low', 'medium', 'high', 'critical'].includes(row.priority ?? '')
    ? (row.priority as VictimPriority)
    : 'medium')

  const location: Location = row.location ?? { lat: 0, lng: 0 }

  return {
    id: row.id,
    name: row.name ?? 'Unknown',
    age: row.age ?? 0,
    gender: 'unknown',
    status,
    priority,
    location,
    injuries: row.injuries ?? [],
    contactInfo:
      row.phone || row.email ? { phone: row.phone ?? undefined, email: row.email ?? undefined } : undefined,
    emergencyContact: row.emergency_contact
      ? {
          name: row.emergency_contact.name ?? 'Unknown',
          relationship: row.emergency_contact.relationship ?? 'unknown',
          phone: row.emergency_contact.phone ?? ''
        }
      : undefined,
    reporterId: row.reporter_id ?? 'unknown',
    notes: row.notes ?? undefined,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at)
  }
}

interface VictimState {
  victims: Victim[]
  filteredVictims: Victim[]
  selectedVictim: Victim | null
  checkIns: VictimCheckIn[]
  filters: VictimFilter
  searchQuery: string
  loading: boolean
  error: string | null
  offlineActions: OfflineVictimAction[]
}

interface VictimActions {
  loadVictims: () => Promise<void>
  setVictims: (victims: Victim[]) => void
  addVictim: (victim: Victim) => void
  updateVictim: (victimId: string, updates: Partial<Victim>) => void
  removeVictim: (victimId: string) => void
  setSelectedVictim: (victim: Victim | null) => void

  addCheckIn: (checkIn: VictimCheckIn) => void
  getCheckInsForVictim: (victimId: string) => VictimCheckIn[]

  setFilters: (filters: Partial<VictimFilter>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  applyFilters: () => void

  addOfflineAction: (
    action: Omit<OfflineVictimAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>
  ) => void
  removeOfflineAction: (actionId: string) => void
  markActionSynced: (actionId: string) => void
  incrementRetryCount: (actionId: string) => void
  clearSyncedActions: () => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type VictimStore = VictimState & VictimActions

const initialState: VictimState = {
  victims: [],
  filteredVictims: [],
  selectedVictim: null,
  checkIns: [],
  filters: {},
  searchQuery: '',
  loading: false,
  error: null,
  offlineActions: []
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const filterVictims = (victims: Victim[], filters: VictimFilter, searchQuery: string): Victim[] => {
  return victims.filter(victim => {
    if (filters.status && !filters.status.includes(victim.status)) {
      return false
    }

    if (filters.priority && !filters.priority.includes(victim.priority)) {
      return false
    }

    if (filters.timeRange) {
      const victimTime = new Date(victim.createdAt)
      if (victimTime < filters.timeRange.start || victimTime > filters.timeRange.end) {
        return false
      }
    }

    if (filters.radius && filters.center) {
      const distance = calculateDistance(
        filters.center.lat,
        filters.center.lng,
        victim.location.lat,
        victim.location.lng
      )
      if (distance > filters.radius) {
        return false
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = victim.name.toLowerCase().includes(query)
      const matchesNotes = victim.notes?.toLowerCase().includes(query)
      const matchesAddress = victim.location.address?.toLowerCase().includes(query)

      if (!matchesName && !matchesNotes && !matchesAddress) {
        return false
      }
    }

    return true
  })
}

const sortVictimsByPriority = (victims: Victim[]): Victim[] => {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  }
  return [...victims].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] ?? 99
    const priorityB = priorityOrder[b.priority] ?? 99
    return priorityA - priorityB
  })
}

export const useVictimStore = create<VictimStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Fetch victims from GET /api/victims and populate the store.
        // Failures are non-fatal: the store keeps whatever it had and surfaces
        // the error so the UI can show a retry affordance.
        loadVictims: async () => {
          set({ loading: true, error: null })
          try {
            const res = await fetch('/api/victims')
            if (!res.ok) {
              throw new Error(`Request failed with status ${res.status}`)
            }
            const payload = (await res.json()) as { data?: VictimRow[] } | VictimRow[]
            const rows = Array.isArray(payload) ? payload : (payload.data ?? [])
            const victims = rows.map(mapVictimRow)
            set({ victims, loading: false })
            get().applyFilters()
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load victims'
            set({ loading: false, error: message })
          }
        },

        setVictims: victims => {
          set({ victims })
          get().applyFilters()
        },

        addVictim: victim => {
          set(state => {
            const newVictims = [victim, ...state.victims]
            return {
              victims: newVictims,
              filteredVictims: sortVictimsByPriority(
                filterVictims(newVictims, state.filters, state.searchQuery)
              )
            }
          })
          console.log('Victim added:', victim.id)
        },

        updateVictim: (victimId, updates) => {
          set(state => {
            const newVictims = state.victims.map(victim =>
              victim.id === victimId ? { ...victim, ...updates, updatedAt: new Date() } : victim
            )
            return {
              victims: newVictims,
              selectedVictim:
                state.selectedVictim?.id === victimId
                  ? { ...state.selectedVictim, ...updates, updatedAt: new Date() }
                  : state.selectedVictim,
              filteredVictims: sortVictimsByPriority(
                filterVictims(newVictims, state.filters, state.searchQuery)
              )
            }
          })
          console.log('Victim updated:', victimId)
        },

        removeVictim: victimId => {
          set(state => {
            const newVictims = state.victims.filter(victim => victim.id !== victimId)
            return {
              victims: newVictims,
              selectedVictim: state.selectedVictim?.id === victimId ? null : state.selectedVictim,
              filteredVictims: sortVictimsByPriority(
                filterVictims(newVictims, state.filters, state.searchQuery)
              )
            }
          })
          console.log('Victim removed:', victimId)
        },

        setSelectedVictim: victim => set({ selectedVictim: victim }),

        addCheckIn: checkIn => {
          set(state => ({
            checkIns: [checkIn, ...state.checkIns]
          }))
          const updates: Partial<Victim> = {
            lastCheckIn: checkIn.timestamp,
            status: checkIn.status,
            ...(checkIn.location && { location: checkIn.location })
          }
          get().updateVictim(checkIn.victimId, updates)
          console.log('Check-in added for victim:', checkIn.victimId)
        },

        getCheckInsForVictim: victimId => {
          return get().checkIns.filter(checkIn => checkIn.victimId === victimId)
        },

        setFilters: filters => {
          set(state => ({ filters: { ...state.filters, ...filters } }))
          get().applyFilters()
        },

        clearFilters: () => {
          set({
            filters: initialState.filters,
            searchQuery: ''
          })
          get().applyFilters()
        },

        setSearchQuery: query => {
          set({ searchQuery: query })
          get().applyFilters()
        },

        applyFilters: () => {
          const { victims, filters, searchQuery } = get()
          const filteredVictims = sortVictimsByPriority(
            filterVictims(victims, filters, searchQuery)
          )
          set({ filteredVictims })
        },

        addOfflineAction: action => {
          const newAction: OfflineVictimAction = {
            ...action,
            id: `${action.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            synced: false,
            retryCount: 0
          }
          set(state => ({
            offlineActions: [...state.offlineActions, newAction]
          }))
        },

        removeOfflineAction: actionId => {
          set(state => ({
            offlineActions: state.offlineActions.filter(action => action.id !== actionId)
          }))
        },

        markActionSynced: actionId => {
          set(state => ({
            offlineActions: state.offlineActions.map(action =>
              action.id === actionId ? { ...action, synced: true } : action
            )
          }))
        },

        incrementRetryCount: actionId => {
          set(state => ({
            offlineActions: state.offlineActions.map(action =>
              action.id === actionId ? { ...action, retryCount: action.retryCount + 1 } : action
            )
          }))
        },

        clearSyncedActions: () => {
          set(state => ({
            offlineActions: state.offlineActions.filter(action => !action.synced)
          }))
        },

        setLoading: loading => set({ loading }),
        setError: error => set({ error }),
        clearError: () => set({ error: null }),

        reset: () => set(initialState)
      }),
      {
        name: 'victim-storage',
        partialize: state => ({
          filters: state.filters,
          searchQuery: state.searchQuery,
          offlineActions: state.offlineActions.filter(action => !action.synced)
        })
      }
    )
  )
)

export const useVictims = () =>
  useVictimStore(state => ({
    victims: state.victims,
    filteredVictims: state.filteredVictims,
    loading: state.loading,
    error: state.error
  }))

export const useVictimFilters = () =>
  useVictimStore(state => ({
    filters: state.filters,
    searchQuery: state.searchQuery,
    filteredVictims: state.filteredVictims
  }))

export const useSelectedVictim = () => useVictimStore(state => state.selectedVictim)

export const useVictimCheckIns = () =>
  useVictimStore(state => ({
    checkIns: state.checkIns,
    addCheckIn: state.addCheckIn,
    getCheckInsForVictim: state.getCheckInsForVictim
  }))

export const useVictimActions = () =>
  useVictimStore((state: VictimState & VictimActions) => ({
    loadVictims: state.loadVictims,
    setVictims: state.setVictims,
    addVictim: state.addVictim,
    updateVictim: state.updateVictim,
    removeVictim: state.removeVictim,
    setSelectedVictim: state.setSelectedVictim,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    setSearchQuery: state.setSearchQuery,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    reset: state.reset
  }))

export const useOfflineVictimActions = () =>
  useVictimStore((state: VictimState & VictimActions) => ({
    offlineActions: state.offlineActions,
    addOfflineAction: state.addOfflineAction,
    removeOfflineAction: state.removeOfflineAction,
    markActionSynced: state.markActionSynced,
    incrementRetryCount: state.incrementRetryCount,
    clearSyncedActions: state.clearSyncedActions
  }))
