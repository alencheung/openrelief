import { useCallback, useMemo } from 'react'
import { useVictimStore } from '@/store/victimStore'
import {
  Victim,
  VictimCheckIn,
  VictimFilter,
  VictimStatus,
  VictimPriority,
  Location,
  Injury
} from '@/types/victim'

// Shape accepted by POST /api/victims (DB column names). `reporter_id` is
// derived from the authenticated caller on the server, never sent here.
interface VictimCreatePayload {
  name: string
  age?: number | null
  status?: VictimStatus
  priority?: VictimPriority
  location?: { lat: number; lng: number; address?: string } | null
  phone?: string | null
  email?: string | null
  emergency_contact?: {
    name?: string
    phone?: string
    relationship?: string
  } | null
  notes?: string | null
  injuries?: Array<{
    type?: string
    severity?: 'minor' | 'moderate' | 'severe' | 'critical'
    description?: string
  }> | null
}

// Shape accepted by PUT /api/victims/[id]. Same fields, all optional.
type VictimUpdatePayload = Partial<VictimCreatePayload>

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

  // Async CRUD operations that persist through /api/victims. On network/auth
  // failure they queue an offline action and still update the local store so
  // the UI stays responsive; queued actions are replayed by syncOfflineActions.
  createVictim: (input: VictimCreateInput) => Promise<CreateResult>
  patchVictim: (victimId: string, updates: Partial<Victim>) => Promise<CreateResult>
  syncOfflineActions: () => Promise<void>

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

// Input for createVictim: the user-facing fields the caller knows about. The
// hook fills in API-shape mapping (e.g. Victim.contactInfo -> phone/email).
export interface VictimCreateInput {
  name: string
  age?: number
  status?: VictimStatus
  priority?: VictimPriority
  location?: Location
  phone?: string
  email?: string
  emergencyContact?: { name: string; phone: string; relationship?: string }
  notes?: string
  injuries?: Injury[]
}

export interface CreateResult {
  ok: boolean
  error?: string
  victim?: Victim
}

const generateId = (): string => {
  return `victim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Map a user-facing input to the POST /api/victims payload. Injuries are
// flattened to the API shape (dropping the local `treated` flag, which the
// backend schema does not store).
const toCreatePayload = (input: VictimCreateInput): VictimCreatePayload => ({
  name: input.name,
  age: input.age ?? null,
  status: input.status,
  priority: input.priority,
  location: input.location ?? null,
  phone: input.phone ?? null,
  email: input.email ?? null,
  emergency_contact: input.emergencyContact
    ? {
        name: input.emergencyContact.name,
        phone: input.emergencyContact.phone,
        relationship: input.emergencyContact.relationship
      }
    : null,
  notes: input.notes ?? null,
  injuries: input.injuries
    ? input.injuries.map(i => ({
        type: i.type,
        severity: i.severity,
        description: i.description
      }))
    : null
})

// Map a Victim-domain partial to the PUT /api/victims/[id] payload.
const toUpdatePayload = (updates: Partial<Victim>): VictimUpdatePayload => {
  const payload: VictimUpdatePayload = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.age !== undefined) payload.age = updates.age
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.priority !== undefined) payload.priority = updates.priority
  if (updates.location !== undefined) payload.location = updates.location
  if (updates.contactInfo !== undefined) {
    payload.phone = updates.contactInfo.phone ?? null
    payload.email = updates.contactInfo.email ?? null
  }
  if (updates.emergencyContact !== undefined) {
    payload.emergency_contact = updates.emergencyContact
      ? {
          name: updates.emergencyContact.name,
          phone: updates.emergencyContact.phone,
          relationship: updates.emergencyContact.relationship
        }
      : null
  }
  if (updates.notes !== undefined) payload.notes = updates.notes
  if (updates.injuries !== undefined) {
    payload.injuries = updates.injuries.map(i => ({
      type: i.type,
      severity: i.severity,
      description: i.description
    }))
  }
  return payload
}

export const useVictimTracking = (victimId?: string): UseVictimTrackingReturn => {
  const {
    victims,
    filteredVictims,
    selectedVictim,
    checkIns,
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
    offlineActions,
    addOfflineAction,
    markActionSynced,
    incrementRetryCount,
    removeOfflineAction,
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

  // Persist a new victim via POST /api/victims. On success the server-assigned
  // id wins; on network/auth failure the record is still added locally and an
  // offline action is queued so it can be replayed by syncOfflineActions.
  const createVictim = useCallback(
    async (input: VictimCreateInput): Promise<CreateResult> => {
      const localId = generateId()
      const now = new Date()
      const optimistic: Victim = {
        id: localId,
        name: input.name,
        age: input.age ?? 0,
        gender: 'unknown',
        status: input.status ?? 'unknown',
        priority: input.priority ?? 'medium',
        location: input.location ?? { lat: 0, lng: 0 },
        injuries: input.injuries ?? [],
        contactInfo:
          input.phone || input.email
            ? { phone: input.phone, email: input.email }
            : undefined,
        emergencyContact: input.emergencyContact
          ? {
              name: input.emergencyContact.name ?? '',
              relationship: input.emergencyContact.relationship ?? 'unknown',
              phone: input.emergencyContact.phone ?? ''
            }
          : undefined,
        reporterId: 'pending',
        notes: input.notes,
        createdAt: now,
        updatedAt: now
      }
      storeAddVictim(optimistic)

      try {
        const res = await fetch('/api/victims', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toCreatePayload(input))
        })
        if (res.status === 401) {
          addOfflineAction({ type: 'create', victimId: localId, data: input })
          return { ok: false, error: 'Authentication required', victim: optimistic }
        }
        if (!res.ok) {
          let detail = `Request failed (status ${res.status})`
          try {
            const body = (await res.json()) as { error?: string }
            if (body.error) detail = body.error
          } catch {
            // ignore parse errors
          }
          addOfflineAction({ type: 'create', victimId: localId, data: input })
          return { ok: false, error: detail, victim: optimistic }
        }

        const json = (await res.json()) as {
          data?: { id?: string } & Record<string, unknown>
        }
        const serverId = json.data?.id
        if (serverId && serverId !== localId) {
          // Swap the optimistic row for the persisted one so future updates
          // target the server id. Remove the temp then add the canonical row.
          storeRemoveVictim(localId)
          storeAddVictim({ ...optimistic, id: serverId })
        }
        return { ok: true, victim: serverId ? { ...optimistic, id: serverId } : optimistic }
      } catch (err) {
        addOfflineAction({ type: 'create', victimId: localId, data: input })
        const message = err instanceof Error ? err.message : 'Network error'
        return { ok: false, error: message, victim: optimistic }
      }
    },
    [storeAddVictim, storeRemoveVictim, addOfflineAction]
  )

  // Persist updates to an existing victim via PUT /api/victims/[id]. The local
  // store is updated immediately; failures queue an offline action.
  const patchVictim = useCallback(
    async (victimId: string, updates: Partial<Victim>): Promise<CreateResult> => {
      storeUpdateVictim(victimId, updates)
      try {
        const res = await fetch(`/api/victims/${victimId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toUpdatePayload(updates))
        })
        if (res.ok) {
          return { ok: true }
        }
        if (res.status === 401) {
          addOfflineAction({ type: 'update', victimId, data: updates })
          return { ok: false, error: 'Authentication required' }
        }
        // 403/404 — record is owned by another user or gone. Still queue so a
        // later sync attempt can surface the problem rather than dropping it.
        addOfflineAction({ type: 'update', victimId, data: updates })
        let detail = `Update failed (status ${res.status})`
        try {
          const body = (await res.json()) as { error?: string }
          if (body.error) detail = body.error
        } catch {
          // ignore parse errors
        }
        return { ok: false, error: detail }
      } catch (err) {
        addOfflineAction({ type: 'update', victimId, data: updates })
        const message = err instanceof Error ? err.message : 'Network error'
        return { ok: false, error: message }
      }
    },
    [storeUpdateVictim, addOfflineAction]
  )

  // Replay queued offline create/update actions against the API. Previously
  // these were accumulated by the store but never processed, so any offline
  // edit was silently lost. Each successful action is marked synced; failures
  // bump the retry count and remain queued for the next attempt.
  const syncOfflineActions = useCallback(async (): Promise<void> => {
    const pending = offlineActions.filter(action => !action.synced)
    for (const action of pending) {
      try {
        if (action.type === 'create') {
          const res = await fetch('/api/victims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toCreatePayload(action.data as VictimCreateInput))
          })
          if (res.ok) {
            markActionSynced(action.id)
          } else {
            incrementRetryCount(action.id)
          }
        } else if (action.type === 'update' && action.victimId) {
          const res = await fetch(`/api/victims/${action.victimId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toUpdatePayload(action.data as Partial<Victim>))
          })
          if (res.ok) {
            markActionSynced(action.id)
          } else {
            incrementRetryCount(action.id)
          }
        } else {
          // Unknown action type — drop it so the queue can't grow unbounded.
          removeOfflineAction(action.id)
        }
      } catch {
        incrementRetryCount(action.id)
      }
    }
  }, [offlineActions, markActionSynced, incrementRetryCount, removeOfflineAction])

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

    createVictim,
    patchVictim,
    syncOfflineActions,

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
