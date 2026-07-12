'use client'

import { useCallback, useEffect, type RefObject } from 'react'
import maplibregl, { Map, LngLatBounds } from 'maplibre-gl'
import { mapConfiguration } from '@/lib/map-config'
import {
  clusterEmergencyEvents,
  generateEmergencyHeatmap,
  createGeofenceBuffer,
  createEmergencyCluster,
  MapPerformanceManager,
  OfflineTileCache,
  EmergencyRouter,
  MapAccessibilityManager
} from '@/lib/map-utils'
import type { EmergencyEvent } from '@/store/emergencyStore'
import type { Geofence, LocationPoint } from '@/store/locationStore'
import { buildEmergencyFeatures } from './emergency-map-helpers'

export interface EmergencyMapLayersArgs {
  mapInstanceRef: RefObject<Map | null>
  clusterRef: RefObject<ReturnType<typeof createEmergencyCluster>>
  isMapLoaded: boolean
  enableClustering: boolean
  enableGeofences: boolean
  enableHeatmap: boolean
  events: EmergencyEvent[]
  filteredEvents: EmergencyEvent[]
  geofences: Geofence[]
}

// Empty GeoJSON feature collection helper used to seed map sources.
function emptyFeatureCollection() {
  return {
    type: 'FeatureCollection' as const,
    features: [] as unknown[]
  }
}

// Initializes the map's GeoJSON sources and render layers. Called once after
// the MapLibre `load` event fires.
export function useInitializeEmergencyLayers(
  map: Map,
  opts: Pick<
    EmergencyMapLayersArgs,
    'enableClustering' | 'enableGeofences' | 'enableHeatmap'
  >
) {
  map.addSource('emergency-events', {
    type: 'geojson',
    data: emptyFeatureCollection(),
    cluster: opts.enableClustering,
    clusterMaxZoom: mapConfiguration.performance.clusteringMaxZoom,
    clusterRadius: mapConfiguration.performance.clusteringRadius
  })

  map.addSource('user-location', {
    type: 'geojson',
    data: emptyFeatureCollection()
  })

  if (opts.enableGeofences) {
    map.addSource('geofences', {
      type: 'geojson',
      data: emptyFeatureCollection()
    })
  }

  if (opts.enableHeatmap) {
    map.addSource('emergency-heatmap', {
      type: 'geojson',
      data: emptyFeatureCollection()
    })
  }

  // Add layers from configuration
  mapConfiguration.layers.forEach(layer => {
    if (map.getLayer(layer.id)) {
      return
    }
    map.addLayer(layer as any)
  })
}

// Bundles the four data-sync effects (events, user location, geofences,
// heatmap) so the main component only needs a single hook call.
export function useEmergencyMapLayers(args: EmergencyMapLayersArgs) {
  const {
    mapInstanceRef,
    clusterRef,
    isMapLoaded,
    enableClustering,
    enableGeofences,
    enableHeatmap,
    events,
    filteredEvents,
    geofences
  } = args

  // ---------------------------------------------------------------------------
  // Initialize sources + layers once the map finishes loading.
  // ---------------------------------------------------------------------------
  const initializeEmergencyLayers = useCallback(
    (map: Map) => {
      useInitializeEmergencyLayers(map, {
        enableClustering,
        enableGeofences,
        enableHeatmap
      })
    },
    [enableClustering, enableGeofences, enableHeatmap]
  )

  // ---------------------------------------------------------------------------
  // Push the latest emergency events into the `emergency-events` source.
  // When GPU clustering is on we hand MapLibre raw points; otherwise we run a
  // CPU Supercluster pass to collapse the points manually. (Feeding pre-
  // clustered features into a clustered source would double-cluster the data
  // and stall the main thread rebuilding the index on every refresh.)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) {
      return
    }

    const map = mapInstanceRef.current
    const bounds = map.getBounds()
    const zoom = map.getZoom()

    let features: any[]
    const rawFeatures = buildEmergencyFeatures(events)

    if (enableClustering) {
      features = rawFeatures
    } else {
      features = clusterEmergencyEvents(filteredEvents, bounds, zoom, clusterRef.current)
    }

    const source = map.getSource('emergency-events') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      })
    }
  }, [filteredEvents, isMapLoaded, enableClustering, events, mapInstanceRef, clusterRef])

  // ---------------------------------------------------------------------------
  // Push geofence polygons.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !enableGeofences) {
      return
    }

    const geofenceFeatures = geofences.map(geofence => createGeofenceBuffer(geofence))

    const source = mapInstanceRef.current.getSource('geofences') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: geofenceFeatures
      })
    }
  }, [geofences, enableGeofences, mapInstanceRef])

  // ---------------------------------------------------------------------------
  // Push the heatmap source.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !enableHeatmap) {
      return
    }

    const heatmapData = generateEmergencyHeatmap(filteredEvents)

    const source = mapInstanceRef.current.getSource('emergency-heatmap') as any
    if (source) {
      source.setData(heatmapData)
    }
  }, [filteredEvents, enableHeatmap, mapInstanceRef])

  return { initializeEmergencyLayers }
}

// ---------------------------------------------------------------------------
// Map instance lifecycle.
//
// useEmergencyMapInstance owns the one-shot MapLibre construction effect plus
// the click / move / zoom interaction handlers and the user-location source
// sync. Extracted from EmergencyMap.tsx to keep the main component focused on
// wiring and rendering.
// ---------------------------------------------------------------------------

type SetMapState = (state: Partial<{
  center: { lat: number; lng: number }
  zoom: number
}>) => void

export interface UseEmergencyMapInstanceArgs {
  mapRef: RefObject<HTMLDivElement | null>
  mapInstanceRef: RefObject<Map | null>
  performanceManagerRef: RefObject<MapPerformanceManager | null>
  offlineCacheRef: RefObject<OfflineTileCache | null>
  emergencyRouterRef: RefObject<EmergencyRouter | null>
  accessibilityManagerRef: RefObject<MapAccessibilityManager | null>
  mapStyle: any
  initialCenter: [number, number]
  initialZoom: number
  showControls: boolean
  enableOffline: boolean
  isTracking: boolean
  events: EmergencyEvent[]
  currentLocation: LocationPoint | null
  mapStateCenter: { lat: number; lng: number }
  onMapLoad?: (map: Map) => void
  onEmergencyClick?: (emergency: EmergencyEvent) => void
  onLocationUpdate?: (location: { lat: number; lng: number }) => void
  setMapState: SetMapState
  setSelectedEventOnMap: (eventId: string | undefined) => void
  setSelectedEmergency: (emergency: EmergencyEvent | null) => void
  setIsMapLoaded: (loaded: boolean) => void
  initializeEmergencyLayers: (map: Map) => void
}

export function useEmergencyMapInstance(args: UseEmergencyMapInstanceArgs) {
  const {
    mapRef,
    mapInstanceRef,
    performanceManagerRef,
    offlineCacheRef,
    emergencyRouterRef,
    accessibilityManagerRef,
    mapStyle,
    initialCenter,
    initialZoom,
    showControls,
    enableOffline,
    events,
    currentLocation,
    mapStateCenter,
    onMapLoad,
    onEmergencyClick,
    onLocationUpdate,
    setMapState,
    setSelectedEventOnMap,
    setSelectedEmergency,
    setIsMapLoaded,
    initializeEmergencyLayers
  } = args

  // Handle map click — expands clusters or selects an individual emergency.
  const handleMapClick = useCallback(
    (e: any) => {
      const features = e.target.queryRenderedFeatures(e.point, {
        layers: ['emergency-events', 'emergency-clusters']
      })

      if (features.length > 0) {
        const feature = features[0]
        if (feature.properties.cluster) {
          // Handle cluster click - zoom to cluster bounds
          const clusterId = feature.properties.cluster_id
          const source = e.target.getSource('emergency-events') as any
          const clusterLeaves = source.getClusterLeaves(clusterId, Infinity, 0)

          if (clusterLeaves.length > 0) {
            const bounds = new LngLatBounds()
            clusterLeaves.forEach((leaf: any) => {
              const coords = leaf.geometry.coordinates
              bounds.extend([coords[0], coords[1]])
            })
            e.target.fitBounds(bounds, { padding: 50 })
          }
        } else {
          // Handle individual emergency click
          const emergencyId = feature.properties.id
          const emergency = events.find(ev => ev.id === emergencyId)
          if (emergency) {
            setSelectedEmergency(emergency)
            setSelectedEventOnMap(emergencyId)
            onEmergencyClick?.(emergency)
          }
        }
      }
    },
    [events, onEmergencyClick, setSelectedEventOnMap, setSelectedEmergency]
  )

  // Handle map movement — sync the store's center/zoom.
  const handleMapMove = useCallback(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const center = mapInstanceRef.current.getCenter()
    const zoom = mapInstanceRef.current.getZoom()

    setMapState({
      center: { lat: center.lat, lng: center.lng },
      zoom
    })
  }, [setMapState, mapInstanceRef])

  // Handle map zoom — announce the new position to screen readers.
  const handleMapZoom = useCallback(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const zoom = mapInstanceRef.current.getZoom()
    setMapState({ zoom })

    accessibilityManagerRef.current?.announceLocation(mapInstanceRef.current.getCenter())
  }, [setMapState, mapInstanceRef, accessibilityManagerRef])

  // Initialize MapLibre GL JS map (runs once).
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle as any,
      center: initialCenter,
      zoom: initialZoom,
      pitch: mapConfiguration.default.pitch,
      bearing: mapConfiguration.default.bearing,
      minZoom: mapConfiguration.default.minZoom,
      maxZoom: mapConfiguration.default.maxZoom,
      attributionControl: false,
      trackResize: true
    })

    // Add navigation control
    if (showControls) {
      map.addControl(new maplibregl.NavigationControl(), 'top-right')
    }

    // Add scale control
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }),
      'bottom-left'
    )

    // Setup performance monitoring
    performanceManagerRef.current = new MapPerformanceManager(map)

    // Setup accessibility features
    accessibilityManagerRef.current = new MapAccessibilityManager(map)

    // Setup emergency routing
    emergencyRouterRef.current = new EmergencyRouter(map)

    // Setup offline caching
    if (enableOffline) {
      offlineCacheRef.current = new OfflineTileCache()
    }

    map.on('load', () => {
      setIsMapLoaded(true)
      onMapLoad?.(map)

      // Initialize emergency layers
      initializeEmergencyLayers(map)

      // Start location tracking if enabled — on the very first load (center
      // still at 0,0) fly to the user's location.
      if (isTracking && currentLocation && mapStateCenter.lat === 0 && mapStateCenter.lng === 0) {
        map.flyTo({
          center: [currentLocation.lng, currentLocation.lat],
          zoom: 14
        })
      }
    })

    // Handle map interactions
    map.on('click', handleMapClick)
    map.on('move', handleMapMove)
    map.on('zoom', handleMapZoom)

    mapInstanceRef.current = map

    return () => {
      performanceManagerRef.current?.destroy()
      map.remove()
      mapInstanceRef.current = null
      performanceManagerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update user location on the map + notify host of the new coordinates.
  // On first load (when the map is still centered at 0,0) and tracking is
  // enabled, fly to the user's location — mirrors the original
  // initializeLocationTracking behaviour.
  useEffect(() => {
    if (!mapInstanceRef.current || !currentLocation) {
      return
    }

    const userLocationFeature = {
      type: 'Feature' as const,
      properties: {
        accuracy: currentLocation.accuracy || 50
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [currentLocation.lng, currentLocation.lat]
      }
    }

    const source = mapInstanceRef.current.getSource('user-location') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [userLocationFeature]
      })
    }

    onLocationUpdate?.({ lat: currentLocation.lat, lng: currentLocation.lng })
  }, [currentLocation, onLocationUpdate, mapInstanceRef])
}
