'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import './map-styles.css'
import maplibregl, { Map, LngLat, LngLatBounds, GeoJSONFeature } from 'maplibre-gl'
import { MapPin, AlertTriangle, Navigation, Layers, ZoomIn, ZoomOut, Crosshair, Phone, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mapConfiguration } from '@/lib/map-config'
import { useKeyboardNavigation, useAriaAnnouncer, useReducedMotion } from '@/hooks/accessibility'
import {
  createEmergencyCluster,
  clusterEmergencyEvents,
  MapPerformanceManager,
  OfflineTileCache,
  EmergencyRouter,
  MapAccessibilityManager,
  generateEmergencyHeatmap,
  createGeofenceBuffer
} from '@/lib/map-utils'
import { useEmergencyStore } from '@/store/emergencyStore'
import { useLocationStore } from '@/store/locationStore'
import { EmergencyEvent } from '@/store/emergencyStore'
import { Geofence } from '@/store/locationStore'
import { EmergencyIndicator, TrustBadge, StatusIndicator, Icon } from '@/components/ui'
import { MapLegend } from './MapLegend'
import { ProximityAlertsDisplay, ProximityAlert } from './ProximityAlertsDisplay'
import { EmergencyDetailsPopup, EmergencyDetails } from './EmergencyDetailsPopup'
import { SpatialInformationOverlay } from './SpatialInformationOverlay'
import { ResponsiveMapContainer, useResponsive, responsiveUtils } from './ResponsiveMapContainer'
import { AccessibilityMapFeatures, AccessibilitySettings } from './AccessibilityMapFeatures'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { MobileMapControls } from '@/components/mobile/MobileMapControls'

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
  // Enhanced features
  showProximityAlerts?: boolean
  showSpatialInfo?: boolean
  enableEnhancedDetails?: boolean
  legendPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  alertsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  spatialInfoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  maxVisibleAlerts?: number
  autoDismissAlerts?: boolean
  unitSystem?: 'metric' | 'imperial'
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
  // Enhanced features
  showProximityAlerts = true,
  showSpatialInfo = true,
  enableEnhancedDetails = true,
  legendPosition = 'bottom-left',
  alertsPosition = 'top-left',
  spatialInfoPosition = 'top-right',
  maxVisibleAlerts = 3,
  autoDismissAlerts = true,
  unitSystem = 'metric'
}: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const performanceManagerRef = useRef<MapPerformanceManager | null>(null)
  const offlineCacheRef = useRef<OfflineTileCache | null>(null)
  const emergencyRouterRef = useRef<EmergencyRouter | null>(null)
  const accessibilityManagerRef = useRef<MapAccessibilityManager | null>(null)
  const clusterRef = useRef(createEmergencyCluster())

  // Accessibility hooks
  const { registerShortcut, unregisterShortcut } = useKeyboardNavigation({
    enabled: true,
    enableHelp: true
  })
  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyEvent | null>(null)
  const [mapStyle, setMapStyle] = useState(mapConfiguration.style)

  // Enhanced state management
  const [legendCollapsed, setLegendCollapsed] = useState(false)
  const [spatialInfoVisible, setSpatialInfoVisible] = useState(true)
  const [currentUnitSystem, setCurrentUnitSystem] = useState<'metric' | 'imperial'>(unitSystem)
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    emergencies: true,
    severity: true,
    trust: true,
    heatmap: false,
    geofences: true
  })

  // Accessibility state
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    screenReaderEnabled: false,
    highContrastMode: false,
    reducedMotion: false,
    largeTextMode: false,
    keyboardNavigation: true,
    audioAnnouncements: false,
    visualIndicators: true,
    focusVisible: true
  })

  // Map keyboard navigation state
  const [mapKeyboardFocus, setMapKeyboardFocus] = useState(false)
  const [selectedMapControl, setSelectedMapControl] = useState<string | null>(null)

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
    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left')

    // Setup performance monitoring
    console.log('[EmergencyMap] Creating MapPerformanceManager, map loaded:', !!map)
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
      console.log('[EmergencyMap] Map load event fired')
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
      console.log('[EmergencyMap] Cleaning up map and performance manager')
      performanceManagerRef.current?.destroy()
      map.remove()
      mapInstanceRef.current = null
      performanceManagerRef.current = null
    }
  }, [])

  // Initialize emergency layers
  const initializeEmergencyLayers = useCallback((map: Map) => {
    // Add sources
    map.addSource('emergency-events', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: enableClustering,
      clusterMaxZoom: mapConfiguration.performance.clusteringMaxZoom,
      clusterRadius: mapConfiguration.performance.clusteringRadius
    })

    map.addSource('user-location', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    })

    if (enableGeofences) {
      map.addSource('geofences', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }

    if (enableHeatmap) {
      map.addSource('emergency-heatmap', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }

    // Add layers from configuration
    mapConfiguration.layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        return
      }
      map.addLayer(layer as any)
    })
  }, [enableClustering, enableGeofences, enableHeatmap])

  // Handle map click
  const handleMapClick = useCallback((e: any) => {
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
    if (!mapInstanceRef.current) {
      return
    }

    const center = mapInstanceRef.current.getCenter()
    const zoom = mapInstanceRef.current.getZoom()

    setMapState({
      center: { lat: center.lat, lng: center.lng },
      zoom
    })
  }, [setMapState])

  // Handle map zoom
  const handleMapZoom = useCallback(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const zoom = mapInstanceRef.current.getZoom()
    setMapState({ zoom })

    accessibilityManagerRef.current?.announceLocation(mapInstanceRef.current.getCenter())
  }, [setMapState])

  // Initialize location tracking
  const initializeLocationTracking = useCallback((map: Map) => {
    if (!currentLocation) {
      return
    }

    // Add user location marker
    const userLocationFeature: any = {
      type: 'Feature' as const,
      properties: {
        accuracy: currentLocation.accuracy || 50
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [currentLocation.lng, currentLocation.lat]
      }
    };

    (map.getSource('user-location') as any)?.setData({
      type: 'FeatureCollection',
      features: [userLocationFeature]
    })

    // Center map on user location if first time
    if (mapState.center.lat === 0 && mapState.center.lng === 0) {
      map.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 14
      })
    }
  }, [currentLocation, mapState.center])

  // Update emergency events on map
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) {
      return
    }

    const map = mapInstanceRef.current
    const bounds = map.getBounds()
    const zoom = map.getZoom()

    let features: any[]

    if (enableClustering) {
      features = clusterEmergencyEvents(filteredEvents, bounds, zoom, clusterRef.current)
    } else {
      features = events.map(event => ({
        type: 'Feature',
        properties: {
          id: event.id,
          type: event.emergency_types?.slug || 'unknown',
          severity: event.severity,
          status: event.status,
          trust_score: event.trust_weight,
          title: event.title,
          description: event.description,
          created_at: event.created_at
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            parseFloat(event.location.split(' ')[1] || '0'),
            parseFloat(event.location.split(' ')[0] || '0')
          ]
        }
      }))
    }

    const source = map.getSource('emergency-events') as any
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      })
    }
  }, [filteredEvents, isMapLoaded, enableClustering])

  // Update user location
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
  }, [currentLocation, onLocationUpdate])

  // Update geofences
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
  }, [geofences, enableGeofences])

  // Update heatmap
  useEffect(() => {
    if (!mapInstanceRef.current || !enableHeatmap) {
      return
    }

    const heatmapData = generateEmergencyHeatmap(filteredEvents)

    const source = mapInstanceRef.current.getSource('emergency-heatmap') as any
    if (source) {
      source.setData(heatmapData)
    }
  }, [filteredEvents, enableHeatmap])

  // Map control functions
  const zoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn()
    announcePolite('Zoomed in')
  }, [announcePolite])

  const zoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut()
    announcePolite('Zoomed out')
  }, [announcePolite])

  const centerOnUser = useCallback(() => {
    if (currentLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 15,
        essential: true,
        animate: !prefersReducedMotion
      })
      announcePolite('Centered map on your location')
    }
  }, [currentLocation, announcePolite, prefersReducedMotion])

  const toggleHeatmap = useCallback(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const heatmapLayer = mapInstanceRef.current.getLayer('emergency-heatmap')
    if (heatmapLayer) {
      const visibility = mapInstanceRef.current.getLayoutProperty(
        'emergency-heatmap',
        'visibility'
      )
      const newVisibility = visibility === 'visible' ? 'none' : 'visible'
      mapInstanceRef.current.setLayoutProperty(
        'emergency-heatmap',
        'visibility',
        newVisibility
      )
      announcePolite(`Heatmap ${newVisibility === 'visible' ? 'enabled' : 'disabled'}`)
    }
  }, [announcePolite])

  // Keyboard navigation for map
  const panMap = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!mapInstanceRef.current) {
      return
    }

    const map = mapInstanceRef.current
    const currentCenter = map.getCenter()
    const currentZoom = map.getZoom()
    const panDistance = 100 / Math.pow(2, currentZoom) // Adjust pan distance based on zoom level

    let newCenter = { ...currentCenter }

    switch (direction) {
      case 'up':
        newCenter.lat += panDistance
        break
      case 'down':
        newCenter.lat -= panDistance
        break
      case 'left':
        newCenter.lng -= panDistance
        break
      case 'right':
        newCenter.lng += panDistance
        break
    }

    map.easeTo({
      center: [newCenter.lng, newCenter.lat],
      duration: prefersReducedMotion ? 0 : 300
    })

    announcePolite(`Panned map ${direction}`)
  }, [announcePolite, prefersReducedMotion])

  const getEmergencyIcon = (type: string, severity: number) => {
    const iconColors: Record<string, string> = {
      fire: 'emergency-fire',
      medical: 'emergency-medical',
      security: 'emergency-security',
      natural: 'emergency-natural',
      infrastructure: 'emergency-infrastructure'
    }

    return iconColors[type] || 'emergency-fire'
  }

  const getSeveritySize = (severity: number) => {
    const sizes = ['w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-14 h-14']
    return sizes[Math.min(severity - 1, 4)] || sizes[0]
  }

  const getTrustLevel = (trustWeight: number) => {
    if (trustWeight >= 0.9) {
      return 'excellent'
    }
    if (trustWeight >= 0.7) {
      return 'good'
    }
    if (trustWeight >= 0.5) {
      return 'moderate'
    }
    if (trustWeight >= 0.3) {
      return 'low'
    }
    return 'critical'
  }

  const getStatusFromEventStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'reported':
        return 'active'
      case 'resolved':
      case 'closed':
        return 'resolved'
      case 'pending':
      case 'investigating':
        return 'pending'
      case 'inactive':
      case 'archived':
        return 'inactive'
      default:
        return 'pending'
    }
  }

  // Enhanced event handlers
  const handleEmergencyClick = useCallback((emergency: EmergencyEvent) => {
    setSelectedEmergency(emergency)
    setSelectedEventOnMap(emergency.id)
    announcePolite(`Selected emergency: ${emergency.title}`)
    onEmergencyClick?.(emergency)
  }, [onEmergencyClick, setSelectedEventOnMap, announcePolite])

  const handleAlertClick = useCallback((alert: ProximityAlert) => {
    const emergency = events.find(e => e.id === alert.emergencyId)
    if (emergency) {
      handleEmergencyClick(emergency)
    }
  }, [events, handleEmergencyClick])

  const handleAlertDismiss = useCallback((alertId: string) => {
    // Implementation would depend on how alerts are managed
    console.log('Dismiss alert:', alertId)
  }, [])

  const handleDismissAllAlerts = useCallback(() => {
    // Implementation would depend on how alerts are managed
    console.log('Dismiss all alerts')
  }, [])

  const handleMarkAllAlertsRead = useCallback(() => {
    // Implementation would depend on how alerts are managed
    console.log('Mark all alerts as read')
  }, [])

  const handleShareEmergency = useCallback(() => {
    if (selectedEmergency && navigator.share) {
      navigator.share({
        title: selectedEmergency.title,
        text: selectedEmergency.description,
        url: window.location.href
      })
    }
  }, [selectedEmergency])

  const handleNavigateToEmergency = useCallback(() => {
    if (selectedEmergency && mapInstanceRef.current) {
      const coords = selectedEmergency.location.split(' ')
      const lng = parseFloat(coords[1] || '0')
      const lat = parseFloat(coords[0] || '0')

      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        essential: true,
        animate: !prefersReducedMotion
      })
      announcePolite(`Navigated to emergency: ${selectedEmergency.title}`)
    }
  }, [selectedEmergency, announcePolite, prefersReducedMotion])

  const handleContactEmergency = useCallback(() => {
    // Implementation would depend on contact system
    console.log('Contact emergency services for:', selectedEmergency?.id)
  }, [selectedEmergency])

  const handleUnitChange = useCallback((unit: 'metric' | 'imperial') => {
    setCurrentUnitSystem(unit)
  }, [])

  const handleLegendToggle = useCallback((collapsed: boolean) => {
    setLegendCollapsed(collapsed)
  }, [])

  const handleLayerToggle = useCallback((layer: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }))
  }, [])

  const handleAccessibilitySettingsChange = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setAccessibilitySettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Convert proximity alerts to enhanced format
  const enhancedProximityAlerts: ProximityAlert[] = useMemo(() => {
    return proximityAlerts.map(alert => {
      const emergency = events.find(e => e.id === alert.emergencyId)
      return {
        id: alert.id,
        emergencyId: alert.emergencyId,
        emergencyType: emergency?.emergency_types?.slug || 'unknown',
        title: emergency?.title || 'Unknown Emergency',
        message: alert.message,
        severity: alert.severity as 'low' | 'moderate' | 'high' | 'critical',
        distance: alert.distance || 0,
        estimatedTime: alert.estimatedTime,
        trustScore: emergency?.trust_weight,
        timestamp: alert.timestamp || new Date().toISOString(),
        isRead: false,
        actions: [
          {
            id: 'navigate',
            label: 'Navigate',
            action: () => handleAlertClick(alert),
            variant: 'outline'
          },
          {
            id: 'dismiss',
            label: 'Dismiss',
            action: () => handleAlertDismiss(alert.id),
            variant: 'ghost'
          }
        ]
      }
    })
  }, [proximityAlerts, events, handleAlertClick, handleAlertDismiss])

  // Convert selected emergency to enhanced details format
  const enhancedEmergencyDetails: EmergencyDetails | null = useMemo(() => {
    if (!selectedEmergency) {
      return null
    }

    return {
      id: selectedEmergency.id,
      title: selectedEmergency.title,
      description: selectedEmergency.description,
      emergencyType: selectedEmergency.emergency_types?.slug || 'unknown',
      severity: selectedEmergency.severity,
      status: selectedEmergency.status,
      trustScore: selectedEmergency.trust_weight,
      location: {
        address: selectedEmergency.location,
        coordinates: [
          parseFloat(selectedEmergency.location.split(' ')[0] || '0'),
          parseFloat(selectedEmergency.location.split(' ')[1] || '0')
        ]
      },
      timestamp: selectedEmergency.created_at,
      actions: [
        {
          id: 'navigate',
          label: 'Navigate',
          action: handleNavigateToEmergency,
          variant: 'outline',
          icon: <Navigation className="w-4 h-4" />
        },
        {
          id: 'contact',
          label: 'Contact',
          action: handleContactEmergency,
          variant: 'outline',
          icon: <Phone className="w-4 h-4" />
        },
        {
          id: 'share',
          label: 'Share',
          action: handleShareEmergency,
          variant: 'ghost',
          icon: <Share2 className="w-4 h-4" />
        }
      ]
    }
  }, [selectedEmergency, handleNavigateToEmergency, handleContactEmergency, handleShareEmergency])

  // Calculate spatial information
  const spatialInfo = useMemo(() => {
    if (!currentLocation || !selectedEmergency) {
      return {}
    }

    const emergencyCoords = selectedEmergency.location.split(' ')
    const emergencyLat = parseFloat(emergencyCoords[0] || '0')
    const emergencyLng = parseFloat(emergencyCoords[1] || '0')

    // Calculate distance (simplified)
    const distance = Math.sqrt(
      Math.pow(currentLocation.lat - emergencyLat, 2)
      + Math.pow(currentLocation.lng - emergencyLng, 2)
    ) * 111000 // Rough conversion to meters

    return {
      distance,
      estimatedTime: distance / 50, // Assuming 50 km/h average speed
      coordinates: [currentLocation.lat, currentLocation.lng],
      accuracy: currentLocation.accuracy
    }
  }, [currentLocation, selectedEmergency])

  const { breakpoint, orientation } = useResponsive()
  const { isMobile, isTouch } = useMobileDetection()
  const isPortrait = orientation === 'portrait'

  // Mobile-specific state
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false)

  // Touch gesture handling for map interactions
  const mapGestureRef = useTouchGestures({
    onDoubleTap: (point) => {
      if (isMobile && mapInstanceRef.current) {
        // Zoom in on double tap
        mapInstanceRef.current.zoomIn()
      }
    },
    onLongPress: (point) => {
      if (isMobile && mapInstanceRef.current) {
        // Could trigger context menu or special action
        console.log('Long press on map at:', point)
      }
    }
  })

  // Adjust positions and sizes based on breakpoint
  const responsiveLegendPosition = isMobile ? 'bottom-left' : legendPosition
  const responsiveAlertsPosition = isMobile ? 'top-left' : alertsPosition
  const responsiveSpatialPosition = isMobile ? 'bottom-right' : spatialInfoPosition
  const responsiveLegendSize = isMobile ? 'sm' : 'md'
  const responsiveAlertsSize = isMobile ? 'sm' : 'md'
  const responsiveDetailsSize = isMobile ? 'xl' : 'lg'
  const responsiveDetailsPosition = isMobile ? 'bottom' : 'bottom'
  const responsiveMaxVisibleAlerts = isMobile ? 2 : maxVisibleAlerts

  // Register keyboard shortcuts
  useEffect(() => {
    // Map navigation shortcuts
    registerShortcut({
      key: '+',
      action: () => zoomIn(),
      description: 'Zoom in on map',
      preventDefault: true
    })

    registerShortcut({
      key: '=',
      action: () => zoomOut(),
      description: 'Zoom out on map',
      preventDefault: true
    })

    registerShortcut({
      key: 'c',
      action: () => centerOnUser(),
      description: 'Center map on user location',
      preventDefault: true
    })

    registerShortcut({
      key: 'h',
      action: () => toggleHeatmap(),
      description: 'Toggle heatmap',
      preventDefault: true
    })

    // Arrow key navigation
    registerShortcut({
      key: 'ArrowUp',
      action: () => panMap('up'),
      description: 'Pan map up',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowDown',
      action: () => panMap('down'),
      description: 'Pan map down',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowLeft',
      action: () => panMap('left'),
      description: 'Pan map left',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowRight',
      action: () => panMap('right'),
      description: 'Pan map right',
      preventDefault: true
    })

    // Emergency shortcuts
    registerShortcut({
      key: 'e',
      action: () => {
        // Focus emergency report button
        const reportButton = document.querySelector('[data-emergency-report]') as HTMLElement
        reportButton?.focus()
        announcePolite('Focused on emergency report')
      },
      description: 'Focus emergency report',
      preventDefault: true
    })

    return () => {
      // Clean up shortcuts
      unregisterShortcut('+')
      unregisterShortcut('=')
      unregisterShortcut('c')
      unregisterShortcut('h')
      unregisterShortcut('ArrowUp')
      unregisterShortcut('ArrowDown')
      unregisterShortcut('ArrowLeft')
      unregisterShortcut('ArrowRight')
      unregisterShortcut('e')
    }
  }, [registerShortcut, unregisterShortcut, zoomIn, zoomOut, centerOnUser, toggleHeatmap, panMap])

  return (
    <ResponsiveMapContainer
      className={cn('map-container relative', className)}
      onBreakpointChange={(bp) => console.log('Breakpoint changed:', bp)}
      onOrientationChange={(ori) => console.log('Orientation changed:', ori)}
    >
      {/* MapLibre GL JS container */}
      <div
        ref={mapRef}
        className={cn(
          'absolute inset-0',
          isTouch && 'touch-pan-y touch-pan-x', // Enable touch gestures
          mapKeyboardFocus && 'ring-2 ring-ring ring-offset-2' // Show focus when keyboard navigation is active
        )}
        tabIndex={mapKeyboardFocus ? 0 : -1}
        role="application"
        aria-label="Emergency map"
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            setMapKeyboardFocus(true)
          }
        }}
        onBlur={() => {
          setMapKeyboardFocus(false)
        }}
      />

      {/* Loading indicator */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className={cn(
              'animate-spin rounded-full mx-auto mb-2',
              isMobile ? 'h-6 w-6 border-b-2' : 'h-8 w-8 border-b-2',
              'border-blue-500'
            )}></div>
            <p className={cn(
              'text-gray-600',
              isMobile ? 'text-xs' : 'text-sm'
            )}>
              Loading emergency map...
            </p>
          </div>
        </div>
      )}

      {/* Desktop Map Controls */}
      {showControls && isMapLoaded && !isMobile && (
        <div
          className="absolute top-4 right-4 flex flex-col gap-2"
          role="toolbar"
          aria-label="Map controls"
        >
          <button
            onClick={zoomIn}
            onFocus={() => setSelectedMapControl('zoom-in')}
            onBlur={() => setSelectedMapControl(null)}
            className={cn(
              'bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors',
              selectedMapControl === 'zoom-in' && 'ring-2 ring-blue-500'
            )}
            aria-label="Zoom in"
            aria-keyshortcuts="+"
            title="Zoom in (Press +)"
          >
            <ZoomIn className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={zoomOut}
            onFocus={() => setSelectedMapControl('zoom-out')}
            onBlur={() => setSelectedMapControl(null)}
            className={cn(
              'bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors',
              selectedMapControl === 'zoom-out' && 'ring-2 ring-blue-500'
            )}
            aria-label="Zoom out"
            aria-keyshortcuts="-"
            title="Zoom out (Press -)"
          >
            <ZoomOut className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={centerOnUser}
            onFocus={() => setSelectedMapControl('center')}
            onBlur={() => setSelectedMapControl(null)}
            className={cn(
              'bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors',
              selectedMapControl === 'center' && 'ring-2 ring-blue-500'
            )}
            aria-label="Center on user location"
            aria-keyshortcuts="C"
            title="Center on user location (Press C)"
          >
            <Crosshair className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={toggleHeatmap}
            onFocus={() => setSelectedMapControl('heatmap')}
            onBlur={() => setSelectedMapControl(null)}
            className={cn(
              'bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors',
              selectedMapControl === 'heatmap' && 'ring-2 ring-blue-500'
            )}
            aria-label="Toggle heatmap"
            aria-keyshortcuts="H"
            title="Toggle heatmap (Press H)"
          >
            <Layers className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      )}

      {/* Mobile Map Controls */}
      {showControls && isMapLoaded && isMobile && (
        <MobileMapControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onCenterLocation={centerOnUser}
          onToggleLayers={toggleHeatmap}
          onNavigate={() => selectedEmergency && handleNavigateToEmergency()}
          position="bottom-right"
          variant="compact"
        />
      )}

      {/* Enhanced Emergency Details Popup */}
      {enableEnhancedDetails && enhancedEmergencyDetails && (
        <EmergencyDetailsPopup
          emergency={enhancedEmergencyDetails}
          onClose={() => setSelectedEmergency(null)}
          onShare={handleShareEmergency}
          onNavigate={handleNavigateToEmergency}
          onContact={handleContactEmergency}
          position={responsiveDetailsPosition as any}
          size={responsiveDetailsSize as any}
          variant={isMobile ? 'compact' : 'default'}
          showActions={true}
          showUpdates={!isMobile}
          showResources={!isMobile}
          showContactInfo={!isMobile}
          autoClose={isMobile}
          autoCloseDelay={isMobile ? 15000 : 30000}
        />
      )}

      {/* Enhanced Map Legend */}
      {showLegend && (
        <MapLegend
          position={responsiveLegendPosition as any}
          size={responsiveLegendSize as any}
          variant={isMobile ? 'compact' : 'default'}
          emergencyTypes={[
            { type: 'fire', name: 'Fire Emergency', count: events.filter(e => e.emergency_types?.slug === 'fire').length },
            { type: 'medical', name: 'Medical Emergency', count: events.filter(e => e.emergency_types?.slug === 'medical').length },
            { type: 'security', name: 'Security Threat', count: events.filter(e => e.emergency_types?.slug === 'security').length },
            { type: 'natural', name: 'Natural Disaster', count: events.filter(e => e.emergency_types?.slug === 'natural').length },
            { type: 'infrastructure', name: 'Infrastructure Failure', count: events.filter(e => e.emergency_types?.slug === 'infrastructure').length }
          ]}
          showLayerControls={!isMobile}
          showSeverityIndicators={!isMobile}
          showTrustIndicators={!isMobile}
          collapsible={true}
          initiallyCollapsed={isMobile ? true : legendCollapsed}
          onToggleCollapse={handleLegendToggle}
          aria-label="Emergency map legend"
        />
      )}

      {/* Enhanced Proximity Alerts Display */}
      {showProximityAlerts && enhancedProximityAlerts.length > 0 && (
        <ProximityAlertsDisplay
          alerts={enhancedProximityAlerts}
          position={responsiveAlertsPosition as any}
          size={responsiveAlertsSize as any}
          variant={isMobile ? 'compact' : 'default'}
          maxVisible={responsiveMaxVisibleAlerts}
          showDismissAll={!isMobile}
          showMarkAllRead={!isMobile}
          showFilterControls={!isMobile}
          autoDismiss={autoDismissAlerts}
          onAlertClick={handleAlertClick}
          onAlertDismiss={handleAlertDismiss}
          onDismissAll={handleDismissAllAlerts}
          onMarkAllRead={handleMarkAllAlertsRead}
        />
      )}

      {/* Spatial Information Overlay */}
      {showSpatialInfo && spatialInfoVisible && (
        <SpatialInformationOverlay
          spatialInfo={spatialInfo}
          position={responsiveSpatialPosition as any}
          size={isMobile ? 'sm' : 'sm'}
          variant={isMobile ? 'minimal' : 'compact'}
          showDistance={true}
          showTimeEstimate={true}
          showAreaRadius={false}
          showCoordinates={false}
          showBearing={false}
          showSpeed={false}
          showAccuracy={!isMobile}
          showControls={true}
          unitSystem={currentUnitSystem}
          onUnitChange={handleUnitChange}
          onToggleOverlay={(visible) => setSpatialInfoVisible(visible)}
          interactive={true}
          animated={true}
        />
      )}

      {/* Accessibility Features */}
      <AccessibilityMapFeatures
        position="top-right"
        size="sm"
        variant="minimal"
        settings={accessibilitySettings}
        onSettingsChange={handleAccessibilitySettingsChange}
        mapInstance={mapInstanceRef.current}
        showControls={true}
        compactMode={isMobile}
      />
    </ResponsiveMapContainer>
  )
}