import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  Shelter,
  ShelterFilter,
  ShelterAccessibility,
  ShelterAmenities
} from '@/types/resource'

interface ShelterState {
  shelters: Shelter[]
  filteredShelters: Shelter[]
  selectedShelter: Shelter | null
  filters: ShelterFilter
  loading: boolean
  error: string | null
}

interface ShelterActions {
  setShelters: (shelters: Shelter[]) => void
  addShelter: (shelter: Shelter) => void
  updateShelter: (shelterId: string, updates: Partial<Shelter>) => void
  removeShelter: (shelterId: string) => void
  setSelectedShelter: (shelter: Shelter | null) => void

  updateOccupancy: (shelterId: string, occupancy: number) => void
  incrementOccupancy: (shelterId: string, count?: number) => void
  decrementOccupancy: (shelterId: string, count?: number) => void

  assignVolunteer: (shelterId: string, volunteerId: string) => void
  unassignVolunteer: (shelterId: string, volunteerId: string) => void

  setFilters: (filters: Partial<ShelterFilter>) => void
  clearFilters: () => void
  applyFilters: () => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type ShelterStore = ShelterState & ShelterActions

const initialState: ShelterState = {
  shelters: [],
  filteredShelters: [],
  selectedShelter: null,
  filters: {},
  loading: false,
  error: null
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a
    = (Math.sin(Δφ / 2) * Math.sin(Δφ / 2))
    + (Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2))
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

const matchesAccessibility = (
  shelterAccessibility: ShelterAccessibility,
  filterAccessibility?: Partial<ShelterAccessibility>
): boolean => {
  if (!filterAccessibility) {
    return true
  }

  return Object.entries(filterAccessibility).every(([key, value]) => {
    if (value === undefined || value === null) {
      return true
    }
    return shelterAccessibility[key as keyof ShelterAccessibility] === value
  })
}

const matchesAmenities = (
  shelterAmenities: ShelterAmenities,
  filterAmenities?: Partial<ShelterAmenities>
): boolean => {
  if (!filterAmenities) {
    return true
  }

  return Object.entries(filterAmenities).every(([key, value]) => {
    if (value === undefined || value === null) {
      return true
    }
    return shelterAmenities[key as keyof ShelterAmenities] === value
  })
}

const filterShelters = (shelters: Shelter[], filters: ShelterFilter): Shelter[] => {
  return shelters.filter(shelter => {
    if (filters.type && !filters.type.includes(shelter.type)) {
      return false
    }

    if (filters.status && !filters.status.includes(shelter.status)) {
      return false
    }

    if (filters.hasCapacity !== undefined) {
      const hasCapacity = shelter.availableBeds > 0
      if (filters.hasCapacity !== hasCapacity) {
        return false
      }
    }

    if (!matchesAccessibility(shelter.accessibility, filters.accessibility)) {
      return false
    }

    if (!matchesAmenities(shelter.amenities, filters.amenities)) {
      return false
    }

    if (filters.petsAllowed !== undefined && shelter.petsAllowed !== filters.petsAllowed) {
      return false
    }

    if (filters.radius && filters.center) {
      const distance = calculateDistance(
        filters.center.lat,
        filters.center.lng,
        shelter.location.lat,
        shelter.location.lng
      )
      if (distance > filters.radius) {
        return false
      }
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const matchesName = shelter.name.toLowerCase().includes(query)
      const matchesAddress = shelter.address.toLowerCase().includes(query)
      const matchesContactName = shelter.contactInfo.name.toLowerCase().includes(query)

      if (!matchesName && !matchesAddress && !matchesContactName) {
        return false
      }
    }

    return true
  })
}

export const useShelterStore = create<ShelterStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        setShelters: shelters => {
          set({ shelters })
          get().applyFilters()
        },

        addShelter: shelter => {
          set(state => {
            const newShelters = [shelter, ...state.shelters]
            return {
              shelters: newShelters,
              filteredShelters: filterShelters(newShelters, state.filters)
            }
          })
        },

        updateShelter: (shelterId, updates) => {
          set(state => {
            const newShelters = state.shelters.map(shelter =>
              shelter.id === shelterId
                ? { ...shelter, ...updates, updatedAt: new Date().toISOString() }
                : shelter
            )
            return {
              shelters: newShelters,
              selectedShelter:
                state.selectedShelter?.id === shelterId
                  ? { ...state.selectedShelter, ...updates, updatedAt: new Date().toISOString() }
                  : state.selectedShelter,
              filteredShelters: filterShelters(newShelters, state.filters)
            }
          })
        },

        removeShelter: shelterId => {
          set(state => {
            const newShelters = state.shelters.filter(shelter => shelter.id !== shelterId)
            return {
              shelters: newShelters,
              selectedShelter:
                state.selectedShelter?.id === shelterId ? null : state.selectedShelter,
              filteredShelters: filterShelters(newShelters, state.filters)
            }
          })
        },

        setSelectedShelter: shelter => set({ selectedShelter: shelter }),

        updateOccupancy: (shelterId, occupancy) => {
          set(state => {
            const newShelters = state.shelters.map(shelter => {
              if (shelter.id === shelterId) {
                const newOccupancy = Math.max(0, Math.min(occupancy, shelter.capacity))
                const availableBeds = shelter.capacity - newOccupancy

                let newStatus = shelter.status
                if (availableBeds === 0) {
                  newStatus = 'full'
                } else if (shelter.status === 'full' && availableBeds > 0) {
                  newStatus = 'open'
                }

                return {
                  ...shelter,
                  currentOccupancy: newOccupancy,
                  availableBeds,
                  status: newStatus,
                  updatedAt: new Date().toISOString()
                }
              }
              return shelter
            })
            return {
              shelters: newShelters,
              selectedShelter:
                state.selectedShelter?.id === shelterId
                  ? (newShelters.find(s => s.id === shelterId) ?? null)
                  : state.selectedShelter,
              filteredShelters: filterShelters(newShelters, state.filters)
            }
          })
        },

        incrementOccupancy: (shelterId, count = 1) => {
          const shelter = get().shelters.find(s => s.id === shelterId)
          if (shelter) {
            get().updateOccupancy(shelterId, shelter.currentOccupancy + count)
          }
        },

        decrementOccupancy: (shelterId, count = 1) => {
          const shelter = get().shelters.find(s => s.id === shelterId)
          if (shelter) {
            get().updateOccupancy(shelterId, shelter.currentOccupancy - count)
          }
        },

        assignVolunteer: (shelterId, volunteerId) => {
          set(state => ({
            shelters: state.shelters.map(shelter =>
              shelter.id === shelterId
                ? {
                  ...shelter,
                  assignedVolunteers: [...shelter.assignedVolunteers, volunteerId],
                  updatedAt: new Date().toISOString()
                }
                : shelter
            )
          }))
        },

        unassignVolunteer: (shelterId, volunteerId) => {
          set(state => ({
            shelters: state.shelters.map(shelter =>
              shelter.id === shelterId
                ? {
                  ...shelter,
                  assignedVolunteers: shelter.assignedVolunteers.filter(id => id !== volunteerId),
                  updatedAt: new Date().toISOString()
                }
                : shelter
            )
          }))
        },

        setFilters: filters => {
          set(state => ({ filters: { ...state.filters, ...filters } }))
          get().applyFilters()
        },

        clearFilters: () => {
          set({ filters: {} })
          get().applyFilters()
        },

        applyFilters: () => {
          const { shelters, filters } = get()
          const filteredShelters = filterShelters(shelters, filters)
          set({ filteredShelters })
        },

        setLoading: loading => set({ loading }),
        setError: error => set({ error }),
        clearError: () => set({ error: null }),
        reset: () => set(initialState)
      }),
      {
        name: 'shelter-storage',
        partialize: state => ({
          filters: state.filters
        })
      }
    )
  )
)

export const useShelters = () =>
  useShelterStore(state => ({
    shelters: state.shelters,
    filteredShelters: state.filteredShelters,
    loading: state.loading,
    error: state.error
  }))

export const useShelterFilters = () =>
  useShelterStore(state => ({
    filters: state.filters,
    filteredShelters: state.filteredShelters
  }))

export const useShelterActions = () =>
  useShelterStore(state => ({
    setShelters: state.setShelters,
    addShelter: state.addShelter,
    updateShelter: state.updateShelter,
    removeShelter: state.removeShelter,
    setSelectedShelter: state.setSelectedShelter,
    updateOccupancy: state.updateOccupancy,
    incrementOccupancy: state.incrementOccupancy,
    decrementOccupancy: state.decrementOccupancy,
    assignVolunteer: state.assignVolunteer,
    unassignVolunteer: state.unassignVolunteer,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError
  }))
