'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import maplibregl, { Map, LngLat, LngLatBounds, GeoJSONFeature } from 'maplibre-gl'
import { MapPin, AlertTriangle, Navigation, Layers, ZoomIn, ZoomOut, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mapConfiguration } from '@/lib/map-config'
import {
  createEmergencyCluster,
  clusterEmergencyEvents,
  MapPerformanceManager,
  OfflineTileCache,
  EmergencyRouter,
  MapAccessibilityManager,
  generateEmergencyHeatmap,
  createGeofenceBuffer,
} from '@/lib/map-utils'
import { useEmergencyStore, useLocationStore } from '@/store'
import { EmergencyEvent, Geofence } from '@/types'

interface EmergencyMapProps {
  className?: string
  onEmergencyClick?: (emergency: EmergencyEvent) => void
  onLocationUpdate?: (location: { lat: number; lng: number }) => void
  onMapLoad?: (map: Map) => void
  initialCenter?: [number, number]
  initialZoom?: number
  showControls?: boolean
  showLegend?: boolean
  enableClustering?: boolean
  enableHeatmap?: boolean
  enableGeofences?: boolean
  enableOffline?: boolean
}

export default function EmergencyMap({
  className,
  onEmergencyClick,
  onLocationUpdate,
  onMapLoad,
  initialCenter = [0, 0],
  initialZoom = 10,
  showControls = true,
  showLegend = true,
  enableClustering = true,
  enableHeatmap = false,
  enableGeofences = true,
  enableOffline = true,
}: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const performanceManagerRef = useRef<MapPerformanceManager | null>(null)
  const offlineCacheRef = useRef<OfflineTileCache | null>(null)
  const emergencyRouterRef = useRef<EmergencyRouter | null>(null)
  const accessibilityManagerRef = useRef<MapAccessibilityManager | null>(null)
  const clusterRef = useRef(createEmergencyCluster())

  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyEvent | null>(null)
  const [mapStyle, setMapStyle] = useState(mapConfiguration.style)

  // Store subscriptions
  const {
    events,
    filteredEvents,
    mapState,
    setMapState,
    setSelectedEventOnMap
  } = useEmergencyStore()
  const {
    currentLocation,
    isTracking,
    geofences,
    proximityAlerts,
    startTracking,
    stopTracking
  } = useLocationStore()

  // Initialize MapLibre GL JS map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: initialZoom,
      pitch: mapConfiguration.default.pitch,
      bearing: mapConfiguration.default.bearing,
      minZoom: mapConfiguration.default.minZoom,
      maxZoom: mapConfiguration.default.maxZoom,
      attributionControl: false,
      trackResize: true,
    })

    // Add navigation control
    if (showControls) {
      map.addControl(new maplibregl.NavigationControl(), 'top-right')
    }

    // Add scale control
    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left')

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
      
      // Start location tracking if enabled
      if (isTracking) {
        initializeLocationTracking(map)
      }
    })

    // Handle map interactions
    map.on('click', handleMapClick)
    map.on('move', handleMapMove)
    map.on('zoom', handleMapZoom)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Initialize emergency layers
  const initializeEmergencyLayers = useCallback((map: Map) => {
    // Add sources
    map.addSource('emergency-events', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: enableClustering,
      clusterMaxZoom: mapConfiguration.performance.clusteringMaxZoom,
      clusterRadius: mapConfiguration.performance.clusteringRadius,
    })

    map.addSource('user-location', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    if (enableGeofences) {
      map.addSource('geofences', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
    }

    if (enableHeatmap) {
      map.addSource('emergency-heatmap', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
    }

    // Add layers from configuration
    mapConfiguration.layers.forEach(layer => {
      if (map.getLayer(layer.id)) return
      map.addLayer(layer as any)
    })
  }, [enableClustering, enableGeofences, enableHeatmap])

  // Handle map click
  const handleMapClick = useCallback((e: any) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ['emergency-events', 'emergency-clusters'],
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
        const emergency = events.find(e => e.id === emergencyId)
        if (emergency) {
          setSelectedEmergency(emergency)
          setSelectedEventOnMap(emergencyId)
          onEmergencyClick?.(emergency)
        }
      }
    }
  }, [events, onEmergencyClick, setSelectedEventOnMap])

  // Handle map movement
  const handleMapMove = useCallback(() => {
    if (!mapInstanceRef.current) return
    
    const center = mapInstanceRef.current.getCenter()
    const zoom = mapInstanceRef.current.getZoom()
    
    setMapState({
      center: { lat: center.lat, lng: center.lng },
      zoom,
    })
  }, [setMapState])

  // Handle map zoom
  const handleMapZoom = useCallback(() => {
    if (!mapInstanceRef.current) return
    
    const zoom = mapInstanceRef.current.getZoom()
    setMapState({ zoom })
    
    accessibilityManagerRef.current?.announceLocation(mapInstanceRef.current.getCenter())
  }, [setMapState])

  // Initialize location tracking
  const initializeLocationTracking = useCallback((map: Map) => {
    if (!currentLocation) return

    // Add user location marker
    const userLocationFeature = {
      type: 'Feature' as const,
      properties: {
        accuracy: currentLocation.accuracy || 50,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [currentLocation.lng, currentLocation.lat],
      },
    }

    map.getSource('user-location')?.setData({
      type: 'FeatureCollection',
      features: [userLocationFeature],
    })

    // Center map on user location if first time
    if (mapState.center.lat === 0 && mapState.center.lng === 0) {
      map.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 14,
      })
    }
  }, [currentLocation, mapState.center])

  // Update emergency events on map
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return

    const map = mapInstanceRef.current
    const bounds = map.getBounds()
    const zoom = map.getZoom()

    let features: GeoJSONFeature[]

    if (enableClustering) {
      features = clusterEmergencyEvents(filteredEvents, bounds, zoom, clusterRef.current)
    } else {
      features = filteredEvents.map(event => ({
        type: 'Feature' as const,
        properties: {
          id: event.id,
          type: event.type,
          severity: event.severity,
          status: event.status,
          trust_score: event.trust_score,
          title: event.title,
          description: event.description,
          created_at: event.created_at,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            parseFloat(event.location.split(' ')[1]),
            parseFloat(event.location.split(' ')[0]),
          ],
        },
      }))
    }

    const source = map.getSource('emergency-events') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      })
    }
  }, [filteredEvents, isMapLoaded, enableClustering])

  // Update user location
  useEffect(() => {
    if (!mapInstanceRef.current || !currentLocation) return

    const userLocationFeature = {
      type: 'Feature' as const,
      properties: {
        accuracy: currentLocation.accuracy || 50,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [currentLocation.lng, currentLocation.lat],
      },
    }

    const source = mapInstanceRef.current.getSource('user-location') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [userLocationFeature],
      })
    }

    onLocationUpdate?.({ lat: currentLocation.lat, lng: currentLocation.lng })
  }, [currentLocation, onLocationUpdate])

  // Update geofences
  useEffect(() => {
    if (!mapInstanceRef.current || !enableGeofences) return

    const geofenceFeatures = geofences.map(geofence => createGeofenceBuffer(geofence))

    const source = mapInstanceRef.current.getSource('geofences') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: geofenceFeatures,
      })
    }
  }, [geofences, enableGeofences])

  // Update heatmap
  useEffect(() => {
    if (!mapInstanceRef.current || !enableHeatmap) return

    const heatmapData = generateEmergencyHeatmap(filteredEvents)

    const source = mapInstanceRef.current.getSource('emergency-heatmap') as any
    if (source) {
      source.setData(heatmapData)
    }
  }, [filteredEvents, enableHeatmap])

  // Map control functions
  const zoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn()
  }, [])

  const zoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut()
  }, [])

  const centerOnUser = useCallback(() => {
    if (currentLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 15,
      })
    }
  }, [currentLocation])

  const toggleHeatmap = useCallback(() => {
    if (!mapInstanceRef.current) return

    const heatmapLayer = mapInstanceRef.current.getLayer('emergency-heatmap')
    if (heatmapLayer) {
      const visibility = mapInstanceRef.current.getLayoutProperty(
        'emergency-heatmap',
        'visibility'
      )
      mapInstanceRef.current.setLayoutProperty(
        'emergency-heatmap',
        'visibility',
        visibility === 'visible' ? 'none' : 'visible'
      )
    }
  }, [])

  const getEmergencyIcon = (type: string, severity: number) => {
    const iconColors: Record<string, string> = {
      fire: 'bg-red-500',
      medical: 'bg-pink-500',
      security: 'bg-yellow-500',
      natural: 'bg-blue-500',
      infrastructure: 'bg-orange-500',
    }

    return iconColors[type] || 'bg-gray-500'
  }

  const getSeveritySize = (severity: number) => {
    const sizes = ['w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-14 h-14']
    return sizes[Math.min(severity - 1, 4)] || sizes[0]
  }

  return (
    <div className={cn('map-container relative', className)}>
      {/* MapLibre GL JS container */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Loading indicator */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading emergency map...</p>
          </div>
        </div>
      )}

      {/* Map controls */}
      {showControls && isMapLoaded && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={zoomOut}
            className="bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={centerOnUser}
            className="bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Center on user location"
          >
            <Crosshair className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={toggleHeatmap}
            className="bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Toggle heatmap"
          >
            <Layers className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      )}

      {/* Emergency details popup */}
      {selectedEmergency && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-10 max-w-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {selectedEmergency.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {selectedEmergency.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <span className="text-xs text-gray-500">
                  Severity: {selectedEmergency.severity}/5
                </span>
                <span className="text-xs text-gray-500">
                  Status: {selectedEmergency.status}
                </span>
                <span className="text-xs text-gray-500">
                  Trust: {Math.round(selectedEmergency.trust_score * 100)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmergency(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
              aria-label="Close emergency details"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border p-3">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Emergency Types</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">Fire</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <span className="text-xs text-gray-600">Medical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-600">Security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600">Natural</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-600">Infrastructure</span>
            </div>
          </div>
        </div>
      )}

      {/* Proximity alerts */}
      {proximityAlerts.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-sm">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Proximity Alerts</h4>
          <div className="space-y-2">
            {proximityAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-xs text-gray-600">
                <span className={cn(
                  'inline-block w-2 h-2 rounded-full mr-1',
                  alert.severity === 'critical' ? 'bg-red-500' :
                  alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                )} />
                {alert.message}
              </div>
            ))}
            {proximityAlerts.length > 3 && (
              <div className="text-xs text-gray-500">
                +{proximityAlerts.length - 3} more alerts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}