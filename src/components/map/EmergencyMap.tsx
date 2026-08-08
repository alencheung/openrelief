'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import './map-styles.css'
import { Map, type StyleSpecification } from 'maplibre-gl'
import { mapConfiguration } from '@/lib/map-config'
import { useKeyboardNavigation, useAriaAnnouncer, useReducedMotion } from '@/hooks/accessibility'
import {
  createEmergencyCluster,
  MapPerformanceManager,
  OfflineTileCache,
  EmergencyRouter,
  MapAccessibilityManager
} from '@/lib/map-utils'
import { useEmergencyStore } from '@/store/emergencyStore'
import { useLocationStore } from '@/store/locationStore'
import { EmergencyEvent } from '@/store/emergencyStore'
import { useResponsive } from './ResponsiveMapContainer'
import type { AccessibilitySettings } from './AccessibilityMapFeatures'
import { ProximityAlert } from './ProximityAlertsDisplay'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'

// Split-out modules
import type { EmergencyMapProps } from './emergency-map-types'
import {
  getEmergencyIcon as _getEmergencyIcon,
  getSeveritySize as _getSeveritySize,
  getTrustLevel as _getTrustLevel,
  getStatusFromEventStatus as _getStatusFromEventStatus,
  calculateSpatialInfo,
  useEmergencyMapKeyboardShortcuts
} from './emergency-map-helpers'
import { useEmergencyMapLayers, useEmergencyMapInstance } from './EmergencyMapLayers'
import { useEmergencyMapMarkers, EmergencyMapView } from './EmergencyMapMarkers'

// Backward-compatible named type re-export. Callers that imported the props
// type via `import { EmergencyMapProps } from '@/components/map/EmergencyMap'`
// keep compiling, and `isolatedModules` is satisfied because we use
// `export type`.
export type { EmergencyMapProps }
export type { MapOverlayPosition } from './emergency-map-types'

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
  const { announcePolite, announceAssertive: _announceAssertive } = useAriaAnnouncer()
  const { isReduced: prefersReducedMotion } = useReducedMotion()

  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyEvent | null>(null)
  const [mapStyle, _setMapStyle] = useState(mapConfiguration.style)

  // Enhanced state management
  const [legendCollapsed, setLegendCollapsed] = useState(false)
  const [spatialInfoVisible, setSpatialInfoVisible] = useState(true)
  const [currentUnitSystem, setCurrentUnitSystem] = useState<'metric' | 'imperial'>(unitSystem)
  const [_visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
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
  const { events, filteredEvents, mapState, setMapState, setSelectedEventOnMap } =
    useEmergencyStore()
  const {
    currentLocation,
    isTracking,
    geofences,
    proximityAlerts,
    startTracking: _startTracking,
    stopTracking: _stopTracking
  } = useLocationStore()

  // Initialize sources + layers and push data updates for events, geofences
  // and the heatmap. Lives in EmergencyMapLayers.tsx.
  const { initializeEmergencyLayers } = useEmergencyMapLayers({
    mapInstanceRef,
    clusterRef,
    isMapLoaded,
    enableClustering,
    enableGeofences,
    enableHeatmap,
    events,
    filteredEvents,
    geofences
  })

  // MapLibre GL JS lifecycle (construction, click/move/zoom handlers and
  // user-location source sync). Lives in EmergencyMapLayers.tsx.
  useEmergencyMapInstance({
    mapRef,
    mapInstanceRef,
    performanceManagerRef,
    offlineCacheRef,
    emergencyRouterRef,
    accessibilityManagerRef,
    mapStyle: mapStyle as string | maplibregl.StyleSpecification,
    initialCenter,
    initialZoom,
    showControls,
    enableOffline,
    isTracking,
    events,
    currentLocation,
    mapStateCenter: mapState.center,
    onMapLoad,
    onEmergencyClick,
    onLocationUpdate,
    setMapState,
    setSelectedEventOnMap,
    setSelectedEmergency,
    setIsMapLoaded,
    initializeEmergencyLayers
  })

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
    } else {
      // F-005.3: previously a silent no-op when no location is available.
      // Surface the reason so the toolbar button doesn't appear broken.
      announcePolite(
        currentLocation
          ? 'Map is still loading, try again in a moment'
          : 'Your location is not available yet. Enable location tracking and try again.'
      )
    }
  }, [currentLocation, announcePolite, prefersReducedMotion])

  const toggleHeatmap = useCallback(() => {
    if (!mapInstanceRef.current) {
      return
    }

    const heatmapLayer = mapInstanceRef.current.getLayer('emergency-heatmap')
    if (heatmapLayer) {
      const visibility = mapInstanceRef.current.getLayoutProperty('emergency-heatmap', 'visibility')
      const newVisibility = visibility === 'visible' ? 'none' : 'visible'
      mapInstanceRef.current.setLayoutProperty('emergency-heatmap', 'visibility', newVisibility)
      announcePolite(`Heatmap ${newVisibility === 'visible' ? 'enabled' : 'disabled'}`)
    }
  }, [announcePolite])

  // Keyboard navigation for map
  const panMap = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!mapInstanceRef.current) {
        return
      }

      const map = mapInstanceRef.current
      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()
      // Adjust pan distance based on zoom level
      const panDistance = 100 / Math.pow(2, currentZoom)

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
    },
    [announcePolite, prefersReducedMotion]
  )

  // Enhanced event handlers
  const handleEmergencyClick = useCallback(
    (emergency: EmergencyEvent) => {
      setSelectedEmergency(emergency)
      setSelectedEventOnMap(emergency.id)
      announcePolite(`Selected emergency: ${emergency.title}`)
      onEmergencyClick?.(emergency)
    },
    [onEmergencyClick, setSelectedEventOnMap, announcePolite]
  )

  const handleAlertClick = useCallback(
    (alert: ProximityAlert) => {
      const emergency = events.find(ev => ev.id === alert.emergencyId)
      if (emergency) {
        handleEmergencyClick(emergency)
      }
    },
    [events, handleEmergencyClick]
  )

  const handleAlertDismiss = useCallback((_alertId: string) => {
    // Implementation would depend on how alerts are managed
  }, [])

  const handleDismissAllAlerts = useCallback(() => {
    // Implementation would depend on how alerts are managed
  }, [])

  const handleMarkAllAlertsRead = useCallback(() => {
    // Implementation would depend on how alerts are managed
  }, [])

  const handleShareEmergency = useCallback(() => {
    if (selectedEmergency && navigator.share) {
      navigator.share({
        title: selectedEmergency.title,
        text: selectedEmergency.description ?? undefined,
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
  }, [selectedEmergency])

  const handleUnitChange = useCallback((unit: 'metric' | 'imperial') => {
    setCurrentUnitSystem(unit)
  }, [])

  const handleLegendToggle = useCallback((collapsed: boolean) => {
    setLegendCollapsed(collapsed)
  }, [])

  const _handleLayerToggle = useCallback((layer: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }))
  }, [])

  const handleAccessibilitySettingsChange = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      setAccessibilitySettings(prev => ({ ...prev, ...newSettings }))
    },
    []
  )

  // Marker / popup payload builders. Lives in EmergencyMapMarkers.tsx.
  const { enhancedProximityAlerts, enhancedEmergencyDetails } = useEmergencyMapMarkers({
    proximityAlerts,
    events,
    selectedEmergency,
    handleAlertClick,
    handleAlertDismiss,
    handleNavigateToEmergency,
    handleContactEmergency,
    handleShareEmergency
  })

  // Calculate spatial information
  const spatialInfo = useMemo(() => {
    if (!currentLocation || !selectedEmergency) {
      return {}
    }
    return calculateSpatialInfo(
      currentLocation.lat,
      currentLocation.lng,
      selectedEmergency.location,
      currentLocation.accuracy
    )
  }, [currentLocation, selectedEmergency])

  const _console = console
  const { breakpoint: _breakpoint, orientation } = useResponsive()
  const { isMobile, isTouch } = useMobileDetection()
  const _isPortrait = orientation === 'portrait'

  // Mobile-specific state
  const [_mobileControlsExpanded, _setMobileControlsExpanded] = useState(false)

  // Touch gesture handling for map interactions
  const _mapGestureRef = useTouchGestures({
    onDoubleTap: _point => {
      if (isMobile && mapInstanceRef.current) {
        // Zoom in on double tap
        mapInstanceRef.current.zoomIn()
      }
    },
    onLongPress: _point => {
      if (isMobile && mapInstanceRef.current) {
        // Could trigger context menu or special action
        _console.log('Long press on map at:', _point)
      }
    }
  })

  // Adjust positions and sizes based on breakpoint (mobile overrides).
  const responsiveLegendPosition = isMobile ? 'bottom-left' : legendPosition
  const responsiveAlertsPosition = isMobile ? 'top-left' : alertsPosition
  const responsiveSpatialPosition = isMobile ? 'bottom-right' : spatialInfoPosition
  const responsiveLegendSize = isMobile ? 'sm' : 'md'
  const responsiveAlertsSize = isMobile ? 'sm' : 'md'
  const responsiveMaxVisibleAlerts = isMobile ? 2 : maxVisibleAlerts

  // Register keyboard shortcuts (zoom / pan / center / heatmap / report focus).
  // Implementation lives in emergency-map-helpers.ts.
  useEmergencyMapKeyboardShortcuts({
    registerShortcut,
    unregisterShortcut,
    zoomIn,
    zoomOut,
    centerOnUser,
    toggleHeatmap,
    panMap,
    announcePolite
  })

  // Render delegate (pure presentational shell) lives in EmergencyMapMarkers.tsx.
  return (
    <EmergencyMapView
      className={className}
      mapRef={mapRef}
      mapInstance={mapInstanceRef.current}
      isMapLoaded={isMapLoaded}
      isMobile={isMobile}
      isTouch={isTouch}
      mapKeyboardFocus={mapKeyboardFocus}
      setMapKeyboardFocus={setMapKeyboardFocus}
      showControls={showControls}
      selectedMapControl={selectedMapControl}
      setSelectedMapControl={setSelectedMapControl}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onCenterOnUser={centerOnUser}
      onToggleHeatmap={toggleHeatmap}
      selectedEmergency={selectedEmergency}
      onClearSelectedEmergency={() => setSelectedEmergency(null)}
      onNavigateToEmergency={handleNavigateToEmergency}
      onShareEmergency={handleShareEmergency}
      onContactEmergency={handleContactEmergency}
      enableEnhancedDetails={enableEnhancedDetails}
      enhancedEmergencyDetails={enhancedEmergencyDetails}
      showLegend={showLegend}
      legendPosition={responsiveLegendPosition}
      legendSize={responsiveLegendSize}
      legendCollapsed={legendCollapsed}
      onLegendToggle={handleLegendToggle}
      events={events}
      showProximityAlerts={showProximityAlerts}
      enhancedProximityAlerts={enhancedProximityAlerts}
      alertsPosition={responsiveAlertsPosition}
      alertsSize={responsiveAlertsSize}
      maxVisibleAlerts={responsiveMaxVisibleAlerts}
      autoDismissAlerts={autoDismissAlerts}
      onAlertClick={handleAlertClick}
      onAlertDismiss={handleAlertDismiss}
      onDismissAll={handleDismissAllAlerts}
      onMarkAllAlertsRead={handleMarkAllAlertsRead}
      showSpatialInfo={showSpatialInfo}
      spatialInfoVisible={spatialInfoVisible}
      setSpatialInfoVisible={setSpatialInfoVisible}
      spatialPosition={responsiveSpatialPosition}
      spatialInfo={spatialInfo}
      currentUnitSystem={currentUnitSystem}
      onUnitChange={handleUnitChange}
      accessibilitySettings={accessibilitySettings}
      onAccessibilitySettingsChange={handleAccessibilitySettingsChange}
      onBreakpointChange={bp => _console.log('Breakpoint changed:', bp)}
      onOrientationChange={ori => _console.log('Orientation changed:', ori)}
    />
  )
}
