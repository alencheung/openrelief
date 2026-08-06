import { useCallback, useMemo } from 'react'
import { useCheckInStore } from '@/store/checkInStore'
import {
  StatusCheckIn,
  CheckInSummary,
  CheckInFilter,
  CheckInCreateInput,
  CheckInUpdateInput,
  SafetyStatus,
  Location
} from '@/types/checkin'

interface UseStatusCheckInReturn {
  checkIn: StatusCheckIn | null
  checkIns: StatusCheckIn[]
  // Derived view after applying filters/search/expiry. Consumers that want
  // the "current visible list" should read filteredCheckIns, not checkIns.
  filteredCheckIns: StatusCheckIn[]
  myCheckIns: StatusCheckIn[]
  selectedCheckIn: StatusCheckIn | null
  loading: boolean
  error: string | null

  createCheckIn: (input: CheckInCreateInput) => StatusCheckIn
  updateStatus: (checkInId: string, input: CheckInUpdateInput) => void
  removeCheckIn: (checkInId: string) => void
  selectCheckIn: (checkIn: StatusCheckIn | null) => void

  markAsSafe: (userId: string, eventId?: string) => StatusCheckIn
  markAsNeedHelp: (userId: string, helpTypes?: CheckInCreateInput['needsHelpType'], eventId?: string) => StatusCheckIn
  markAsNotInArea: (userId: string, eventId?: string) => StatusCheckIn

  setPublicVisibility: (checkInId: string, isPublic: boolean) => void
  updateMessage: (checkInId: string, message: string) => void
  updateLocation: (checkInId: string, location: Location) => void
  updateEmergencyContacts: (checkInId: string, contacts: CheckInUpdateInput['emergencyContacts']) => void

  setFilters: (filters: Partial<CheckInFilter>) => void
  clearFilters: () => void
  searchCheckIns: (query: string) => void

  getEventSummary: (eventId?: string) => CheckInSummary
  getNearbyCheckIns: (center: Location, radius: number) => StatusCheckIn[]
  getCheckInsByStatus: (status: SafetyStatus) => StatusCheckIn[]
  getMyCheckIns: (userId: string) => StatusCheckIn[]

  cleanExpiredCheckIns: () => void
  reset: () => void
}

export const useStatusCheckIn = (checkInId?: string): UseStatusCheckInReturn => {
  const {
    checkIns,
    filteredCheckIns,
    myCheckIns,
    selectedCheckIn,
    loading,
    error,
    checkIn: storeCheckIn,
    updateStatus: storeUpdateStatus,
    removeCheckIn: storeRemoveCheckIn,
    setSelectedCheckIn,
    setPublicVisibility: storeSetPublicVisibility,
    setFilters: storeSetFilters,
    clearFilters: storeClearFilters,
    setSearchQuery,
    getEventSummary,
    getNearbyCheckIns,
    getCheckInsByStatus,
    getMyCheckIns,
    cleanExpiredCheckIns,
    reset
  } = useCheckInStore()

  const checkIn = useMemo(() => {
    if (!checkInId) {
      return null
    }
    return checkIns.find(c => c.id === checkInId) ?? null
  }, [checkInId, checkIns])

  const createCheckIn = useCallback(
    (input: CheckInCreateInput): StatusCheckIn => {
      return storeCheckIn(input)
    },
    [storeCheckIn]
  )

  const updateStatus = useCallback(
    (id: string, input: CheckInUpdateInput) => {
      storeUpdateStatus(id, input)
    },
    [storeUpdateStatus]
  )

  const removeCheckIn = useCallback(
    (id: string) => {
      storeRemoveCheckIn(id)
    },
    [storeRemoveCheckIn]
  )

  const selectCheckIn = useCallback(
    (checkIn: StatusCheckIn | null) => {
      setSelectedCheckIn(checkIn)
    },
    [setSelectedCheckIn]
  )

  const markAsSafe = useCallback(
    (userId: string, eventId?: string): StatusCheckIn => {
      return storeCheckIn({
        userId,
        status: 'safe',
        eventId,
        isPublic: true,
        visibleToContacts: true
      })
    },
    [storeCheckIn]
  )

  const markAsNeedHelp = useCallback(
    (userId: string, helpTypes?: CheckInCreateInput['needsHelpType'], eventId?: string): StatusCheckIn => {
      return storeCheckIn({
        userId,
        status: 'need_help',
        needsHelpType: helpTypes,
        eventId,
        isPublic: true,
        visibleToContacts: true
      })
    },
    [storeCheckIn]
  )

  const markAsNotInArea = useCallback(
    (userId: string, eventId?: string): StatusCheckIn => {
      return storeCheckIn({
        userId,
        status: 'not_in_area',
        eventId,
        isPublic: false,
        visibleToContacts: true
      })
    },
    [storeCheckIn]
  )

  const setPublicVisibility = useCallback(
    (id: string, isPublic: boolean) => {
      storeSetPublicVisibility(id, isPublic)
    },
    [storeSetPublicVisibility]
  )

  const updateMessage = useCallback(
    (id: string, message: string) => {
      storeUpdateStatus(id, { message })
    },
    [storeUpdateStatus]
  )

  const updateLocation = useCallback(
    (id: string, location: Location) => {
      storeUpdateStatus(id, { location })
    },
    [storeUpdateStatus]
  )

  const updateEmergencyContacts = useCallback(
    (id: string, contacts: CheckInUpdateInput['emergencyContacts']) => {
      storeUpdateStatus(id, { emergencyContacts: contacts })
    },
    [storeUpdateStatus]
  )

  const setFilters = useCallback(
    (filters: Partial<CheckInFilter>) => {
      storeSetFilters(filters)
    },
    [storeSetFilters]
  )

  const clearFilters = useCallback(() => {
    storeClearFilters()
  }, [storeClearFilters])

  const searchCheckIns = useCallback(
    (query: string) => {
      setSearchQuery(query)
    },
    [setSearchQuery]
  )

  return {
    checkIn,
    checkIns,
    filteredCheckIns,
    myCheckIns,
    selectedCheckIn,
    loading,
    error,

    createCheckIn,
    updateStatus,
    removeCheckIn,
    selectCheckIn,

    markAsSafe,
    markAsNeedHelp,
    markAsNotInArea,

    setPublicVisibility,
    updateMessage,
    updateLocation,
    updateEmergencyContacts,

    setFilters,
    clearFilters,
    searchCheckIns,

    getEventSummary,
    getNearbyCheckIns,
    getCheckInsByStatus,
    getMyCheckIns,

    cleanExpiredCheckIns,
    reset
  }
}

export default useStatusCheckIn
