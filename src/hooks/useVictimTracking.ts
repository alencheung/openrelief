import { useCallback, useMemo } from 'react'
import { useVictimStore } from '@/store/victimStore'
import {
  Victim,
  VictimCheckIn,
  VictimFilter,
  VictimStatus,
  VictimPriority,
  Location
} from '@/types/victim'

interface UseVictimTrackingReturn {
  victim: Victim | null
  victims: Victim[]
  filteredVictims: Victim[]
  selectedVictim: Victim | null
  loading: boolean
  error: string | null
  checkIns: VictimCheckIn[]

  addVictim: (victimData: Omit<Victim, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVictim: (victimId: string, updates: Partial<Victim>) => void
  removeVictim: (victimId: string) => void
  selectVictim: (victim: Victim | null) => void

  checkIn: (checkInData: Omit<VictimCheckIn, 'id' | 'timestamp'>) => void
  getCheckInsForVictim: (victimId: string) => VictimCheckIn[]

  updateStatus: (victimId: string, status: VictimStatus) => void
  updatePriority: (victimId: string, priority: VictimPriority) => void
  updateLocation: (victimId: string, location: Location) => void

  setFilters: (filters: Partial<VictimFilter>) => void
  clearFilters: () => void
  searchVictims: (query: string) => void

  getVictimsByStatus: (status: VictimStatus) => Victim[]
  getVictimsByPriority: (priority: VictimPriority) => Victim[]
  getVictimsInRadius: (center: Location, radius: number) => Victim[]

  reset: () => void
}

const generateId = (): string => {
  return `victim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useVictimTracking = (victimId?: string): UseVictimTrackingReturn => {
  const {
    victims,
    filteredVictims,
    selectedVictim,
    checkIns,
    filters,
    loading,
    error,
    addVictim: storeAddVictim,
    updateVictim: storeUpdateVictim,
    removeVictim: storeRemoveVictim,
    setSelectedVictim,
    addCheckIn,
    getCheckInsForVictim,
    setFilters: storeSetFilters,
    clearFilters: storeClearFilters,
    setSearchQuery,
    reset
  } = useVictimStore()

  const victim = useMemo(() => {
    if (!victimId) {
      return null
    }
    return victims.find(v => v.id === victimId) ?? null
  }, [victimId, victims])

  const addVictim = useCallback(
    (victimData: Omit<Victim, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date()
      const newVictim: Victim = {
        ...victimData,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      }
      storeAddVictim(newVictim)
    },
    [storeAddVictim]
  )

  const updateVictim = useCallback(
    (id: string, updates: Partial<Victim>) => {
      storeUpdateVictim(id, updates)
    },
    [storeUpdateVictim]
  )

  const removeVictim = useCallback(
    (id: string) => {
      storeRemoveVictim(id)
    },
    [storeRemoveVictim]
  )

  const selectVictim = useCallback(
    (victim: Victim | null) => {
      setSelectedVictim(victim)
    },
    [setSelectedVictim]
  )

  const checkIn = useCallback(
    (checkInData: Omit<VictimCheckIn, 'id' | 'timestamp'>) => {
      const newCheckIn: VictimCheckIn = {
        ...checkInData,
        id: `checkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      }
      addCheckIn(newCheckIn)
    },
    [addCheckIn]
  )

  const updateStatus = useCallback(
    (id: string, status: VictimStatus) => {
      storeUpdateVictim(id, { status })
    },
    [storeUpdateVictim]
  )

  const updatePriority = useCallback(
    (id: string, priority: VictimPriority) => {
      storeUpdateVictim(id, { priority })
    },
    [storeUpdateVictim]
  )

  const updateLocation = useCallback(
    (id: string, location: Location) => {
      storeUpdateVictim(id, { location })
    },
    [storeUpdateVictim]
  )

  const setFilters = useCallback(
    (newFilters: Partial<VictimFilter>) => {
      storeSetFilters(newFilters)
    },
    [storeSetFilters]
  )

  const clearFilters = useCallback(() => {
    storeClearFilters()
  }, [storeClearFilters])

  const searchVictims = useCallback(
    (query: string) => {
      setSearchQuery(query)
    },
    [setSearchQuery]
  )

  const getVictimsByStatus = useCallback(
    (status: VictimStatus): Victim[] => {
      return victims.filter(v => v.status === status)
    },
    [victims]
  )

  const getVictimsByPriority = useCallback(
    (priority: VictimPriority): Victim[] => {
      return victims.filter(v => v.priority === priority)
    },
    [victims]
  )

  const getVictimsInRadius = useCallback(
    (center: Location, radius: number): Victim[] => {
      const R = 6371e3
      return victims.filter(v => {
        const φ1 = (center.lat * Math.PI) / 180
        const φ2 = (v.location.lat * Math.PI) / 180
        const Δφ = ((v.location.lat - center.lat) * Math.PI) / 180
        const Δλ = ((v.location.lng - center.lng) * Math.PI) / 180

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        return distance <= radius
      })
    },
    [victims]
  )

  return {
    victim,
    victims,
    filteredVictims,
    selectedVictim,
    loading,
    error,
    checkIns,

    addVictim,
    updateVictim,
    removeVictim,
    selectVictim,

    checkIn,
    getCheckInsForVictim,

    updateStatus,
    updatePriority,
    updateLocation,

    setFilters,
    clearFilters,
    searchVictims,

    getVictimsByStatus,
    getVictimsByPriority,
    getVictimsInRadius,

    reset
  }
}

export default useVictimTracking
