import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  Resource,
  ResourceNeed,
  ResourceFilter,
  ResourceStatus,
  ResourceUrgency,
  ResourceType,
  GeoLocation,
  ContactInfo
} from '@/types/resource'

// Shape of a row from GET /api/resources (DB column names). All fields are
// nullable at the DB level, so the mapper coerces defensively.
interface ResourceRow {
  id: string
  name: string
  type?: string
  status?: string
  quantity?: number
  unit?: string
  urgency?: string
  location?: { lat: number; lng: number; address?: string } | null
  address?: string | null
  distance?: number | null
  expires_at?: string | null
  contact_info?: ContactInfo | null
  notes?: string | null
  managed_by?: string | null
  created_at?: string
  updated_at?: string
}

const VALID_RESOURCE_TYPES: ResourceType[] = [
  'water',
  'food',
  'medical',
  'shelter',
  'clothing',
  'tools',
  'communication',
  'power',
  'transportation'
]

// Map a DB row to the store's Resource type. Coerces unknown enum values to
// safe defaults rather than throwing, so a bad row can't poison the list.
const mapResourceRow = (row: ResourceRow): Resource => {
  const rawType = (row.type ?? '') as string
  const knownType = rawType as ResourceType
  const type: ResourceType =
    rawType && VALID_RESOURCE_TYPES.includes(knownType)
      ? knownType
      : rawType === 'transport'
        ? 'transportation'
        : 'water'
  const status = (row.status as ResourceStatus | undefined) ?? 'available'
  const urgency = (row.urgency as ResourceUrgency | undefined) ?? 'low'

  const location: GeoLocation = row.location ?? { lat: 0, lng: 0 }
  const contactInfo: ContactInfo = row.contact_info ?? { name: row.managed_by ?? 'Unknown' }

  return {
    id: row.id,
    type,
    name: row.name,
    description: row.notes ?? '',
    quantity: row.quantity ?? 0,
    unit: row.unit ?? 'units',
    status,
    urgency,
    location,
    contactInfo,
    expirationDate: row.expires_at ?? undefined,
    distance: row.distance ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString()
  }
}

interface ResourceState {
  resources: Resource[]
  filteredResources: Resource[]
  selectedResource: Resource | null
  resourceNeeds: ResourceNeed[]
  filters: ResourceFilter
  loading: boolean
  error: string | null
}

interface ResourceActions {
  loadResources: () => Promise<void>
  setResources: (resources: Resource[]) => void
  addResource: (resource: Resource) => void
  updateResource: (resourceId: string, updates: Partial<Resource>) => void
  removeResource: (resourceId: string) => void
  setSelectedResource: (resource: Resource | null) => void

  addResourceNeed: (need: ResourceNeed) => void
  updateResourceNeed: (needId: string, updates: Partial<ResourceNeed>) => void
  removeResourceNeed: (needId: string) => void
  fulfillResourceNeed: (needId: string, fulfilledBy: string) => void

  setFilters: (filters: Partial<ResourceFilter>) => void
  clearFilters: () => void
  applyFilters: () => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type ResourceStore = ResourceState & ResourceActions

const initialState: ResourceState = {
  resources: [],
  filteredResources: [],
  selectedResource: null,
  resourceNeeds: [],
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

const filterResources = (resources: Resource[], filters: ResourceFilter): Resource[] => {
  return resources.filter(resource => {
    if (filters.type && !filters.type.includes(resource.type)) {
      return false
    }

    if (filters.status && !filters.status.includes(resource.status)) {
      return false
    }

    if (filters.urgency && !filters.urgency.includes(resource.urgency)) {
      return false
    }

    if (
      filters.assignedEmergencyId
      && resource.assignedEmergencyId !== filters.assignedEmergencyId
    ) {
      return false
    }

    if (filters.radius && filters.center) {
      const distance = calculateDistance(
        filters.center.lat,
        filters.center.lng,
        resource.location.lat,
        resource.location.lng
      )
      if (distance > filters.radius) {
        return false
      }
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const matchesName = resource.name.toLowerCase().includes(query)
      const matchesDescription = resource.description.toLowerCase().includes(query)
      const matchesSupplier = resource.supplier?.toLowerCase().includes(query)

      if (!matchesName && !matchesDescription && !matchesSupplier) {
        return false
      }
    }

    return true
  })
}

export const useResourceStore = create<ResourceStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Fetch resources from GET /api/resources and populate the store.
        // Failures are non-fatal: the store keeps whatever it had and surfaces
        // the error so the UI can show a retry affordance.
        loadResources: async () => {
          set({ loading: true, error: null })
          try {
            const res = await fetch('/api/resources')
            if (!res.ok) {
              throw new Error(`Request failed with status ${res.status}`)
            }
            const payload = (await res.json()) as { data?: ResourceRow[] } | ResourceRow[]
            const rows = Array.isArray(payload) ? payload : (payload.data ?? [])
            const resources = rows.map(mapResourceRow)
            set({ resources, loading: false })
            get().applyFilters()
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load resources'
            set({ loading: false, error: message })
          }
        },

        setResources: resources => {
          set({ resources })
          get().applyFilters()
        },

        addResource: resource => {
          set(state => {
            const newResources = [resource, ...state.resources]
            return {
              resources: newResources,
              filteredResources: filterResources(newResources, state.filters)
            }
          })
        },

        updateResource: (resourceId, updates) => {
          set(state => {
            const newResources = state.resources.map(resource =>
              resource.id === resourceId
                ? { ...resource, ...updates, updatedAt: new Date().toISOString() }
                : resource
            )
            return {
              resources: newResources,
              selectedResource:
                state.selectedResource?.id === resourceId
                  ? { ...state.selectedResource, ...updates, updatedAt: new Date().toISOString() }
                  : state.selectedResource,
              filteredResources: filterResources(newResources, state.filters)
            }
          })
        },

        removeResource: resourceId => {
          set(state => {
            const newResources = state.resources.filter(resource => resource.id !== resourceId)
            return {
              resources: newResources,
              selectedResource:
                state.selectedResource?.id === resourceId ? null : state.selectedResource,
              filteredResources: filterResources(newResources, state.filters)
            }
          })
        },

        setSelectedResource: resource => set({ selectedResource: resource }),

        addResourceNeed: need => {
          set(state => ({
            resourceNeeds: [need, ...state.resourceNeeds]
          }))
        },

        updateResourceNeed: (needId, updates) => {
          set(state => ({
            resourceNeeds: state.resourceNeeds.map(need =>
              need.id === needId
                ? { ...need, ...updates, updatedAt: new Date().toISOString() }
                : need
            )
          }))
        },

        removeResourceNeed: needId => {
          set(state => ({
            resourceNeeds: state.resourceNeeds.filter(need => need.id !== needId)
          }))
        },

        fulfillResourceNeed: (needId, fulfilledBy) => {
          set(state => ({
            resourceNeeds: state.resourceNeeds.map(need => {
              if (need.id !== needId) return need
              // Avoid double-counting the same supplier.
              const existing = need.fulfilledBy || []
              if (existing.includes(fulfilledBy)) return need
              const newFulfilledBy = [...existing, fulfilledBy]

              // The previous implementation appended to fulfilledBy but never
              // incremented currentQuantity, so isFullyFulfilled was always
              // evaluated against the original count and every need was stuck
              // at 'partial'. Each fulfillment contributes an equal share of
              // the remaining need (need / supplierCount), capped at the target.
              const supplierCount = newFulfilledBy.length
              const share = supplierCount > 0 ? need.neededQuantity / supplierCount : 0
              const newCurrentQuantity = Math.min(
                need.neededQuantity,
                Math.max(need.currentQuantity, share * supplierCount)
              )
              const isFullyFulfilled = newCurrentQuantity >= need.neededQuantity

              return {
                ...need,
                fulfilledBy: newFulfilledBy,
                currentQuantity: newCurrentQuantity,
                status: isFullyFulfilled ? 'fulfilled' : 'partial',
                updatedAt: new Date().toISOString()
              } as ResourceNeed
            })
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
          const { resources, filters } = get()
          const filteredResources = filterResources(resources, filters)
          set({ filteredResources })
        },

        setLoading: loading => set({ loading }),
        setError: error => set({ error }),
        clearError: () => set({ error: null }),
        reset: () => set(initialState)
      }),
      {
        name: 'resource-storage',
        partialize: state => ({
          filters: state.filters
        })
      }
    )
  )
)

export const useResources = () =>
  useResourceStore(state => ({
    resources: state.resources,
    filteredResources: state.filteredResources,
    loading: state.loading,
    error: state.error
  }))

export const useResourceFilters = () =>
  useResourceStore(state => ({
    filters: state.filters,
    filteredResources: state.filteredResources
  }))

export const useResourceNeeds = () =>
  useResourceStore(state => ({
    resourceNeeds: state.resourceNeeds,
    addResourceNeed: state.addResourceNeed,
    updateResourceNeed: state.updateResourceNeed,
    removeResourceNeed: state.removeResourceNeed,
    fulfillResourceNeed: state.fulfillResourceNeed
  }))

export const useResourceActions = () =>
  useResourceStore(state => ({
    loadResources: state.loadResources,
    setResources: state.setResources,
    addResource: state.addResource,
    updateResource: state.updateResource,
    removeResource: state.removeResource,
    setSelectedResource: state.setSelectedResource,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError
  }))
