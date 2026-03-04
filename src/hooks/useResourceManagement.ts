import { useMemo, useCallback } from 'react'
import {
  useResourceStore,
  useResources,
  useResourceFilters,
  useResourceNeeds,
  useResourceActions
} from '@/store/resourceStore'
import {
  useShelterStore,
  useShelters,
  useShelterFilters,
  useShelterActions
} from '@/store/shelterStore'
import type {
  Resource,
  Shelter,
  ResourceType,
  ResourceStatistics,
  ShelterStatistics,
  GeoLocation
} from '@/types/resource'

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

export const useResourceManagement = () => {
  const resourceData = useResources()
  const resourceFilters = useResourceFilters()
  const resourceNeeds = useResourceNeeds()
  const resourceActions = useResourceActions()

  const shelterData = useShelters()
  const shelterFilters = useShelterFilters()
  const shelterActions = useShelterActions()

  const selectedResource = useResourceStore(state => state.selectedResource)
  const selectedShelter = useShelterStore(state => state.selectedShelter)

  const resourceStatistics = useMemo<ResourceStatistics>(() => {
    const resources = resourceData.resources
    const needs = resourceNeeds.resourceNeeds

    const stats: ResourceStatistics = {
      totalResources: resources.length,
      availableResources: resources.filter(r => r.status === 'available').length,
      limitedResources: resources.filter(r => r.status === 'limited').length,
      depletedResources: resources.filter(r => r.status === 'depleted').length,
      incomingResources: resources.filter(r => r.status === 'incoming').length,
      criticalNeeds: needs.filter(n => n.urgency === 'critical').length,
      highUrgencyNeeds: needs.filter(n => n.urgency === 'high').length,
      resourcesByType: {
        water: 0,
        food: 0,
        medical: 0,
        shelter: 0,
        clothing: 0,
        tools: 0,
        communication: 0,
        power: 0,
        transportation: 0
      }
    }

    resources.forEach(resource => {
      stats.resourcesByType[resource.type]++
    })

    return stats
  }, [resourceData.resources, resourceNeeds.resourceNeeds])

  const shelterStatistics = useMemo<ShelterStatistics>(() => {
    const shelters = shelterData.shelters

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0)
    const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0)

    const stats: ShelterStatistics = {
      totalShelters: shelters.length,
      openShelters: shelters.filter(s => s.status === 'open').length,
      fullShelters: shelters.filter(s => s.status === 'full').length,
      closedShelters: shelters.filter(s => s.status === 'closed').length,
      totalCapacity,
      totalOccupancy,
      overallAvailability: totalCapacity - totalOccupancy,
      sheltersByType: {
        emergency: 0,
        temporary: 0,
        transitional: 0,
        long_term: 0
      }
    }

    shelters.forEach(shelter => {
      stats.sheltersByType[shelter.type]++
    })

    return stats
  }, [shelterData.shelters])

  const getResourcesWithinRadius = useCallback(
    (center: GeoLocation, radius: number): Resource[] => {
      return resourceData.resources.filter(resource => {
        const distance = calculateDistance(
          center.lat,
          center.lng,
          resource.location.lat,
          resource.location.lng
        )
        return distance <= radius
      })
    },
    [resourceData.resources]
  )

  const getSheltersWithinRadius = useCallback(
    (center: GeoLocation, radius: number): Shelter[] => {
      return shelterData.shelters.filter(shelter => {
        const distance = calculateDistance(
          center.lat,
          center.lng,
          shelter.location.lat,
          shelter.location.lng
        )
        return distance <= radius
      })
    },
    [shelterData.shelters]
  )

  const getResourcesByType = useCallback(
    (type: ResourceType): Resource[] => {
      return resourceData.resources.filter(r => r.type === type)
    },
    [resourceData.resources]
  )

  const getAvailableResources = useCallback((): Resource[] => {
    return resourceData.resources.filter(r => r.status === 'available' || r.status === 'limited')
  }, [resourceData.resources])

  const getOpenShelters = useCallback((): Shelter[] => {
    return shelterData.shelters.filter(s => s.status === 'open')
  }, [shelterData.shelters])

  const getSheltersWithCapacity = useCallback((): Shelter[] => {
    return shelterData.shelters.filter(s => s.availableBeds > 0)
  }, [shelterData.shelters])

  const calculateResourceAvailability = useCallback(
    (type: ResourceType): number => {
      const resources = resourceData.resources.filter(r => r.type === type)
      const available = resources.filter(r => r.status === 'available' || r.status === 'limited')
      return resources.length > 0 ? (available.length / resources.length) * 100 : 0
    },
    [resourceData.resources]
  )

  const getResourceFulfillmentRate = useCallback((): number => {
    const needs = resourceNeeds.resourceNeeds
    if (needs.length === 0) {
      return 100
    }

    const fulfilled = needs.filter(
      n => n.status === 'fulfilled' || n.currentQuantity >= n.neededQuantity
    )
    return (fulfilled.length / needs.length) * 100
  }, [resourceNeeds.resourceNeeds])

  return {
    resources: resourceData.resources,
    filteredResources: resourceData.filteredResources,
    selectedResource,
    resourceNeeds: resourceNeeds.resourceNeeds,
    resourceFilters: resourceFilters.filters,
    resourceStatistics,

    shelters: shelterData.shelters,
    filteredShelters: shelterData.filteredShelters,
    selectedShelter,
    shelterFilters: shelterFilters.filters,
    shelterStatistics,

    loading: resourceData.loading || shelterData.loading,
    error: resourceData.error || shelterData.error,

    setResources: resourceActions.setResources,
    addResource: resourceActions.addResource,
    updateResource: resourceActions.updateResource,
    removeResource: resourceActions.removeResource,
    setSelectedResource: resourceActions.setSelectedResource,
    setResourceFilters: resourceActions.setFilters,
    clearResourceFilters: resourceActions.clearFilters,

    addResourceNeed: resourceNeeds.addResourceNeed,
    updateResourceNeed: resourceNeeds.updateResourceNeed,
    removeResourceNeed: resourceNeeds.removeResourceNeed,
    fulfillResourceNeed: resourceNeeds.fulfillResourceNeed,

    setShelters: shelterActions.setShelters,
    addShelter: shelterActions.addShelter,
    updateShelter: shelterActions.updateShelter,
    removeShelter: shelterActions.removeShelter,
    setSelectedShelter: shelterActions.setSelectedShelter,
    setShelterFilters: shelterActions.setFilters,
    clearShelterFilters: shelterActions.clearFilters,
    updateShelterOccupancy: shelterActions.updateOccupancy,
    incrementShelterOccupancy: shelterActions.incrementOccupancy,
    decrementShelterOccupancy: shelterActions.decrementOccupancy,
    assignVolunteer: shelterActions.assignVolunteer,
    unassignVolunteer: shelterActions.unassignVolunteer,

    getResourcesWithinRadius,
    getSheltersWithinRadius,
    getResourcesByType,
    getAvailableResources,
    getOpenShelters,
    getSheltersWithCapacity,
    calculateResourceAvailability,
    getResourceFulfillmentRate,

    setLoading: (loading: boolean) => {
      resourceActions.setLoading(loading)
      shelterActions.setLoading(loading)
    },
    setError: (error: string | null) => {
      resourceActions.setError(error)
      shelterActions.setError(error)
    },
    clearError: () => {
      resourceActions.clearError()
      shelterActions.clearError()
    },
    reset: () => {
      useResourceStore.getState().reset()
      useShelterStore.getState().reset()
    }
  }
}

export const useResourceList = () => useResourceManagement()

export const useShelterList = () => {
  const {
    shelters,
    filteredShelters,
    selectedShelter,
    shelterFilters,
    shelterStatistics,
    loading,
    error,
    ...actions
  } = useResourceManagement()

  return {
    shelters,
    filteredShelters,
    selectedShelter,
    filters: shelterFilters,
    statistics: shelterStatistics,
    loading,
    error,
    setShelters: actions.setShelters,
    addShelter: actions.addShelter,
    updateShelter: actions.updateShelter,
    removeShelter: actions.removeShelter,
    setSelectedShelter: actions.setSelectedShelter,
    setFilters: actions.setShelterFilters,
    clearFilters: actions.clearShelterFilters,
    updateOccupancy: actions.updateShelterOccupancy,
    incrementOccupancy: actions.incrementShelterOccupancy,
    decrementOccupancy: actions.decrementShelterOccupancy,
    assignVolunteer: actions.assignVolunteer,
    unassignVolunteer: actions.unassignVolunteer,
    getOpenShelters: actions.getOpenShelters,
    getSheltersWithCapacity: actions.getSheltersWithCapacity,
    getSheltersWithinRadius: actions.getSheltersWithinRadius,
    setLoading: actions.setLoading,
    setError: actions.setError,
    clearError: actions.clearError,
    reset: actions.reset
  }
}

export const useResourceNeedsList = () => {
  const {
    resourceNeeds,
    addResourceNeed,
    updateResourceNeed,
    removeResourceNeed,
    fulfillResourceNeed
  } = useResourceManagement()

  return {
    needs: resourceNeeds,
    addNeed: addResourceNeed,
    updateNeed: updateResourceNeed,
    removeNeed: removeResourceNeed,
    fulfillNeed: fulfillResourceNeed
  }
}
