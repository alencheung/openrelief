import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import {
  StatusCheckIn,
  CheckInSummary,
  CheckInFilter,
  CheckInCreateInput,
  CheckInUpdateInput,
  SafetyStatus,
  Location
} from '@/types/checkin'

interface CheckInState {
  // Authoritative source of truth — NEVER overwritten by a filtered result.
  // Prior to this fix, mutations wrote filterCheckIns(...) back into checkIns,
  // which permanently destroyed expired / non-matching records (data loss).
  checkIns: StatusCheckIn[]
  // Derived view of checkIns after applying filters/search/expiry. Consumers
  // that want the "current visible list" should read filteredCheckIns.
  filteredCheckIns: StatusCheckIn[]
  myCheckIns: StatusCheckIn[]
  selectedCheckIn: StatusCheckIn | null
  filters: CheckInFilter
  searchQuery: string
  loading: boolean
  error: string | null
}

interface CheckInActions {
  checkIn: (input: CheckInCreateInput) => StatusCheckIn
  updateStatus: (checkInId: string, input: CheckInUpdateInput) => void
  removeCheckIn: (checkInId: string) => void
  setPublicVisibility: (checkInId: string, isPublic: boolean) => void
  setSelectedCheckIn: (checkIn: StatusCheckIn | null) => void

  setFilters: (filters: Partial<CheckInFilter>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  applyFilters: () => void

  getEventSummary: (eventId?: string) => CheckInSummary
  getNearbyCheckIns: (center: Location, radius: number) => StatusCheckIn[]
  getCheckInsByStatus: (status: SafetyStatus) => StatusCheckIn[]
  getMyCheckIns: (userId: string) => StatusCheckIn[]

  cleanExpiredCheckIns: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type CheckInStore = CheckInState & CheckInActions

const initialState: CheckInState = {
  checkIns: [],
  filteredCheckIns: [],
  myCheckIns: [],
  selectedCheckIn: null,
  filters: {},
  searchQuery: '',
  loading: false,
  error: null
}

// Recompute the derived filtered view from the authoritative source. Pure —
// never mutates checkIns.
const recomputeFiltered = (
  checkIns: StatusCheckIn[],
  filters: CheckInFilter,
  searchQuery: string
): StatusCheckIn[] => sortCheckInsByDate(filterCheckIns(checkIns, filters, searchQuery))

const generateId = (): string => {
  return `checkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a
    = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
    + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const filterCheckIns = (
  checkIns: StatusCheckIn[],
  filters: CheckInFilter,
  searchQuery: string
): StatusCheckIn[] => {
  const now = new Date()

  return checkIns.filter(checkIn => {
    if (new Date(checkIn.expiresAt) < now) {
      return false
    }

    if (filters.status && !filters.status.includes(checkIn.status)) {
      return false
    }

    if (filters.eventId && checkIn.eventId !== filters.eventId) {
      return false
    }

    if (filters.userId && checkIn.userId !== filters.userId) {
      return false
    }

    if (filters.isPublic !== undefined && checkIn.isPublic !== filters.isPublic) {
      return false
    }

    if (filters.timeRange) {
      const checkInTime = new Date(checkIn.createdAt)
      if (checkInTime < filters.timeRange.start || checkInTime > filters.timeRange.end) {
        return false
      }
    }

    if (filters.radius && filters.center && checkIn.location) {
      const distance = calculateDistance(
        filters.center.lat,
        filters.center.lng,
        checkIn.location.lat,
        checkIn.location.lng
      )
      if (distance > filters.radius) {
        return false
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = checkIn.userName?.toLowerCase().includes(query)
      const matchesMessage = checkIn.message?.toLowerCase().includes(query)
      const matchesAddress = checkIn.location?.address?.toLowerCase().includes(query)

      if (!matchesName && !matchesMessage && !matchesAddress) {
        return false
      }
    }

    return true
  })
}

const sortCheckInsByDate = (checkIns: StatusCheckIn[]): StatusCheckIn[] => {
  return [...checkIns].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return timeB - timeA
  })
}

export const useCheckInStore = create<CheckInStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        checkIn: input => {
          const now = new Date()
          const expiresAfterHours = input.expiresAfterHours ?? 72
          // Honor an explicit expiresAt override (used by tests/expiry
          // migration); otherwise compute from now + expiresAfterHours.
          const expiresAt = input.expiresAt
            ? new Date(input.expiresAt)
            : new Date(now.getTime() + expiresAfterHours * 60 * 60 * 1000)

          const newCheckIn: StatusCheckIn = {
            id: generateId(),
            userId: input.userId,
            userName: input.userName,
            status: input.status,
            location: input.location,
            message: input.message,
            needsHelpType: input.needsHelpType,
            contactNumber: input.contactNumber,
            emergencyContacts: input.emergencyContacts,
            isPublic: input.isPublic ?? false,
            visibleToContacts: input.visibleToContacts ?? true,
            eventId: input.eventId,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastUpdated: now.toISOString()
          }

          set(state => {
            const newCheckIns = [newCheckIn, ...state.checkIns]
            const userId = input.userId
            const myCheckIns = newCheckIns.filter(c => c.userId === userId)

            return {
              checkIns: sortCheckInsByDate(newCheckIns),
              filteredCheckIns: recomputeFiltered(newCheckIns, state.filters, state.searchQuery),
              myCheckIns: sortCheckInsByDate(myCheckIns)
            }
          })

          console.log('Check-in created:', newCheckIn.id)
          return newCheckIn
        },

        updateStatus: (checkInId, input) => {
          set(state => {
            const now = new Date()
            const updates: Record<string, unknown> = { ...input, lastUpdated: now.toISOString() }

            if (input.expiresAfterHours) {
              updates.expiresAt = new Date(now.getTime() + input.expiresAfterHours * 60 * 60 * 1000).toISOString()
            }
            delete updates.expiresAfterHours

            const newCheckIns = state.checkIns.map(checkIn =>
              checkIn.id === checkInId ? { ...checkIn, ...updates } : checkIn
            )

            const userId = state.checkIns.find(c => c.id === checkInId)?.userId
            const myCheckIns = userId ? newCheckIns.filter(c => c.userId === userId) : state.myCheckIns

            return {
              checkIns: newCheckIns,
              filteredCheckIns: recomputeFiltered(newCheckIns, state.filters, state.searchQuery),
              myCheckIns: sortCheckInsByDate(myCheckIns),
              selectedCheckIn:
                state.selectedCheckIn?.id === checkInId
                  ? { ...state.selectedCheckIn, ...updates }
                  : state.selectedCheckIn
            }
          })
          console.log('Check-in updated:', checkInId)
        },

        removeCheckIn: checkInId => {
          set(state => {
            const newCheckIns = state.checkIns.filter(checkIn => checkIn.id !== checkInId)
            const userId = state.checkIns.find(c => c.id === checkInId)?.userId
            const myCheckIns = userId ? newCheckIns.filter(c => c.userId === userId) : state.myCheckIns

            return {
              checkIns: newCheckIns,
              filteredCheckIns: recomputeFiltered(newCheckIns, state.filters, state.searchQuery),
              myCheckIns: sortCheckInsByDate(myCheckIns),
              selectedCheckIn: state.selectedCheckIn?.id === checkInId ? null : state.selectedCheckIn
            }
          })
          console.log('Check-in removed:', checkInId)
        },

        setPublicVisibility: (checkInId, isPublic) => {
          get().updateStatus(checkInId, { isPublic })
        },

        setSelectedCheckIn: checkIn => set({ selectedCheckIn: checkIn }),

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
          const { checkIns, filters, searchQuery } = get()
          // Only recompute the derived view; never mutate the source checkIns.
          set({ filteredCheckIns: recomputeFiltered(checkIns, filters, searchQuery) })
        },

        getEventSummary: eventId => {
          const { checkIns } = get()
          const relevantCheckIns = checkIns.filter(c => (eventId ? c.eventId === eventId : true))

          const summary: CheckInSummary = {
            eventId,
            totalCheckIns: relevantCheckIns.length,
            safe: relevantCheckIns.filter(c => c.status === 'safe').length,
            needHelp: relevantCheckIns.filter(c => c.status === 'need_help').length,
            notInArea: relevantCheckIns.filter(c => c.status === 'not_in_area').length,
            unknown: relevantCheckIns.filter(c => c.status === 'unknown').length,
            lastUpdated: new Date().toISOString()
          }

          return summary
        },

        getNearbyCheckIns: (center, radius) => {
          const { checkIns } = get()
          return checkIns.filter(checkIn => {
            if (!checkIn.location) {
              return false
            }
            const distance = calculateDistance(
              center.lat,
              center.lng,
              checkIn.location.lat,
              checkIn.location.lng
            )
            return distance <= radius
          })
        },

        getCheckInsByStatus: status => {
          const { checkIns } = get()
          return checkIns.filter(c => c.status === status)
        },

        getMyCheckIns: userId => {
          const { checkIns } = get()
          return checkIns.filter(c => c.userId === userId)
        },

        cleanExpiredCheckIns: () => {
          const now = new Date()
          set(state => {
            const remaining = state.checkIns.filter(checkIn => new Date(checkIn.expiresAt) >= now)
            return {
              checkIns: remaining,
              filteredCheckIns: recomputeFiltered(remaining, state.filters, state.searchQuery)
            }
          })
          console.log('Expired check-ins cleaned')
        },

        setLoading: loading => set({ loading }),
        setError: error => set({ error }),
        clearError: () => set({ error: null }),

        reset: () => set(initialState)
      }),
      {
        name: 'checkin-storage',
        partialize: state => ({
          // Persist only the authoritative source; filteredCheckIns is derived
          // and recomputed on rehydrate.
          checkIns: state.checkIns,
          filters: state.filters,
          searchQuery: state.searchQuery
        }),
        // After rehydrating checkIns/filters, rebuild the derived filtered view
        // so it doesn't start empty until the next mutation.
        onRehydrateStorage: () => state => {
          if (!state) return
          state.filteredCheckIns = recomputeFiltered(state.checkIns, state.filters, state.searchQuery)
        }
      }
    )
  )
)

export const useCheckIns = () =>
  useCheckInStore(state => ({
    // Expose the derived (filtered) view under the historical `checkIns` key so
    // consumers see the visible list. The unfiltered source remains on
    // state.checkIns and is exposed as allCheckIns for callers that need it.
    checkIns: state.filteredCheckIns,
    allCheckIns: state.checkIns,
    myCheckIns: state.myCheckIns,
    loading: state.loading,
    error: state.error
  }))

export const useCheckInFilters = () =>
  useCheckInStore(state => ({
    filters: state.filters,
    searchQuery: state.searchQuery,
    checkIns: state.filteredCheckIns
  }))

export const useSelectedCheckIn = () => useCheckInStore(state => state.selectedCheckIn)

export const useCheckInActions = () =>
  useCheckInStore(state => ({
    checkIn: state.checkIn,
    updateStatus: state.updateStatus,
    removeCheckIn: state.removeCheckIn,
    setPublicVisibility: state.setPublicVisibility,
    setSelectedCheckIn: state.setSelectedCheckIn,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    setSearchQuery: state.setSearchQuery,
    getEventSummary: state.getEventSummary,
    getNearbyCheckIns: state.getNearbyCheckIns,
    getCheckInsByStatus: state.getCheckInsByStatus,
    getMyCheckIns: state.getMyCheckIns,
    cleanExpiredCheckIns: state.cleanExpiredCheckIns,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    reset: state.reset
  }))
