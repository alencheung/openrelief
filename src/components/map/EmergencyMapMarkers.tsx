'use client'

import React, { useMemo } from 'react'
import { Layers, ZoomIn, ZoomOut, Crosshair, Navigation, Phone, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Map } from 'maplibre-gl'
import type { EmergencyEvent } from '@/store/emergencyStore'
import type { ProximityAlert } from './ProximityAlertsDisplay'
import type { EmergencyDetails } from './EmergencyDetailsPopup'
import { ProximityAlertsDisplay } from './ProximityAlertsDisplay'
import { EmergencyDetailsPopup } from './EmergencyDetailsPopup'
import { SpatialInformationOverlay } from './SpatialInformationOverlay'
import { ResponsiveMapContainer } from './ResponsiveMapContainer'
import { AccessibilityMapFeatures, AccessibilitySettings } from './AccessibilityMapFeatures'
import { MapLegend } from './MapLegend'
import { MobileMapControls } from '@/components/mobile/MobileMapControls'
import { parseEmergencyLocation, buildLegendEmergencyTypes } from './emergency-map-helpers'
import type { LegendEmergencyType, SpatialInfo } from './emergency-map-helpers'

// ---------------------------------------------------------------------------
// Desktop zoom/center/heatmap toolbar. Rendered only when showControls is on
// and the viewport is not mobile (mobile uses MobileMapControls instead).
// ---------------------------------------------------------------------------

export interface DesktopMapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onCenterOnUser: () => void
  onToggleHeatmap: () => void
  selectedMapControl: string | null
  setSelectedMapControl: (id: string | null) => void
}

export function DesktopMapControls({
  onZoomIn,
  onZoomOut,
  onCenterOnUser,
  onToggleHeatmap,
  selectedMapControl,
  setSelectedMapControl
}: DesktopMapControlsProps) {
  const buttons = [
    {
      id: 'zoom-in',
      label: 'Zoom in',
      keyshortcuts: '+',
      title: 'Zoom in (Press +)',
      onClick: onZoomIn,
      Icon: ZoomIn
    },
    {
      id: 'zoom-out',
      label: 'Zoom out',
      keyshortcuts: '-',
      title: 'Zoom out (Press -)',
      onClick: onZoomOut,
      Icon: ZoomOut
    },
    {
      id: 'center',
      label: 'Center on user location',
      keyshortcuts: 'C',
      title: 'Center on user location (Press C)',
      onClick: onCenterOnUser,
      Icon: Crosshair
    },
    {
      id: 'heatmap',
      label: 'Toggle heatmap',
      keyshortcuts: 'H',
      title: 'Toggle heatmap (Press H)',
      onClick: onToggleHeatmap,
      Icon: Layers
    }
  ]

  return (
    <div
      className="absolute top-4 right-4 flex flex-col gap-2"
      role="toolbar"
      aria-label="Map controls"
    >
      {buttons.map(({ id, label, keyshortcuts, title, onClick, Icon }) => (
        <button
          key={id}
          onClick={onClick}
          onFocus={() => setSelectedMapControl(id)}
          onBlur={() => setSelectedMapControl(null)}
          className={cn(
            'bg-white shadow-md rounded-lg p-2 hover:bg-gray-100 transition-colors',
            selectedMapControl === id && 'ring-2 ring-blue-500'
          )}
          aria-label={label}
          aria-keyshortcuts={keyshortcuts}
          title={title}
        >
          <Icon className="h-4 w-4 text-gray-700" />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Marker / popup payload builders.
//
// These mirror the `useMemo` blocks that used to live inline in the main
// component. Pulling them out keeps EmergencyMap.tsx focused on wiring.
// ---------------------------------------------------------------------------

export interface UseEmergencyMapMarkersArgs {
  proximityAlerts: Array<{
    id: string
    targetId: string
    message: string
    severity: string
    distance?: number
    timestamp: string | Date
  }>
  events: EmergencyEvent[]
  selectedEmergency: EmergencyEvent | null
  handleAlertClick: (alert: ProximityAlert) => void
  handleAlertDismiss: (alertId: string) => void
  handleNavigateToEmergency: () => void
  handleContactEmergency: () => void
  handleShareEmergency: () => void
}

export function useEmergencyMapMarkers(args: UseEmergencyMapMarkersArgs) {
  const {
    proximityAlerts,
    events,
    selectedEmergency,
    handleAlertClick,
    handleAlertDismiss,
    handleNavigateToEmergency,
    handleContactEmergency,
    handleShareEmergency
  } = args

  // Convert store proximity alerts into the enriched shape the
  // ProximityAlertsDisplay component expects (with attached actions).
  const enhancedProximityAlerts: ProximityAlert[] = useMemo(() => {
    return proximityAlerts.map(alert => {
      const emergency = events.find(e => e.id === alert.targetId)
      const timestamp =
        typeof alert.timestamp === 'string' ? alert.timestamp : new Date().toISOString()
      return {
        id: alert.id,
        emergencyId: alert.targetId,
        emergencyType: emergency?.emergency_types?.slug || 'unknown',
        title: emergency?.title || 'Unknown Emergency',
        message: alert.message,
        severity: alert.severity as 'low' | 'moderate' | 'high' | 'critical',
        distance: alert.distance || 0,
        estimatedTime: undefined,
        trustScore: emergency?.trust_weight ?? undefined,
        timestamp,
        isRead: false,
        actions: [
          {
            id: 'navigate',
            label: 'Navigate',
            action: () =>
              handleAlertClick({
                id: alert.id,
                emergencyId: alert.targetId,
                emergencyType: 'unknown',
                title: 'Proximity Alert',
                message: alert.message,
                severity: 'moderate' as const,
                distance: alert.distance || 0,
                estimatedTime: undefined,
                trustScore: undefined,
                timestamp,
                isRead: false,
                actions: []
              }),
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

  // Convert the currently selected emergency into the enriched details payload
  // for the EmergencyDetailsPopup, including the navigate/contact/share action
  // buttons.
  const enhancedEmergencyDetails: EmergencyDetails | null = useMemo(() => {
    if (!selectedEmergency) {
      return null
    }

    const { lat, lng } = parseEmergencyLocation(selectedEmergency.location)

    return {
      id: selectedEmergency.id,
      title: selectedEmergency.title,
      description: selectedEmergency.description || '',
      emergencyType: selectedEmergency.emergency_types?.slug || 'unknown',
      severity: selectedEmergency.severity,
      status: selectedEmergency.status,
      trustScore: selectedEmergency.trust_weight,
      location: {
        address: selectedEmergency.location,
        coordinates: [lat, lng]
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

  return { enhancedProximityAlerts, enhancedEmergencyDetails }
}

// ---------------------------------------------------------------------------
// EmergencyMapView — pure presentational shell.
//
// Renders the MapLibre container plus every floating overlay (controls, legend,
// alerts, details popup, spatial info, accessibility panel). Extracted from
// EmergencyMap.tsx so the main component is just state + wiring.
// ---------------------------------------------------------------------------

export interface EmergencyMapViewProps {
  className?: string
  mapRef: React.RefObject<HTMLDivElement>
  mapInstance: Map | null
  isMapLoaded: boolean
  isMobile: boolean
  isTouch: boolean
  mapKeyboardFocus: boolean
  setMapKeyboardFocus: (focus: boolean) => void
  showControls: boolean
  selectedMapControl: string | null
  setSelectedMapControl: (id: string | null) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onCenterOnUser: () => void
  onToggleHeatmap: () => void
  selectedEmergency: EmergencyEvent | null
  onClearSelectedEmergency: () => void
  onNavigateToEmergency: () => void
  onShareEmergency: () => void
  onContactEmergency: () => void
  enableEnhancedDetails: boolean
  enhancedEmergencyDetails: EmergencyDetails | null
  showLegend: boolean
  legendPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  legendSize: 'sm' | 'md' | 'lg' | 'xl'
  legendCollapsed: boolean
  onLegendToggle: (collapsed: boolean) => void
  events: EmergencyEvent[]
  showProximityAlerts: boolean
  enhancedProximityAlerts: ProximityAlert[]
  alertsPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  alertsSize: 'sm' | 'md' | 'lg' | 'xl'
  maxVisibleAlerts: number
  autoDismissAlerts: boolean
  onAlertClick: (alert: ProximityAlert) => void
  onAlertDismiss: (alertId: string) => void
  onDismissAll: () => void
  onMarkAllAlertsRead: () => void
  showSpatialInfo: boolean
  spatialInfoVisible: boolean
  setSpatialInfoVisible: (visible: boolean) => void
  spatialPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  spatialInfo: SpatialInfo
  currentUnitSystem: 'metric' | 'imperial'
  onUnitChange: (unit: 'metric' | 'imperial') => void
  accessibilitySettings: AccessibilitySettings
  onAccessibilitySettingsChange: (settings: Partial<AccessibilitySettings>) => void
  onBreakpointChange: (bp: 'mobile' | 'tablet' | 'desktop') => void
  onOrientationChange: (ori: 'portrait' | 'landscape') => void
}

export function EmergencyMapView(props: EmergencyMapViewProps) {
  const {
    className,
    mapRef,
    mapInstance,
    isMapLoaded,
    isMobile,
    isTouch,
    mapKeyboardFocus,
    setMapKeyboardFocus,
    showControls,
    selectedMapControl,
    setSelectedMapControl,
    onZoomIn,
    onZoomOut,
    onCenterOnUser,
    onToggleHeatmap,
    selectedEmergency,
    onClearSelectedEmergency,
    onNavigateToEmergency,
    onShareEmergency,
    onContactEmergency,
    enableEnhancedDetails,
    enhancedEmergencyDetails,
    showLegend,
    legendPosition,
    legendSize,
    legendCollapsed,
    onLegendToggle,
    events,
    showProximityAlerts,
    enhancedProximityAlerts,
    alertsPosition,
    alertsSize,
    maxVisibleAlerts,
    autoDismissAlerts,
    onAlertClick,
    onAlertDismiss,
    onDismissAll,
    onMarkAllAlertsRead,
    showSpatialInfo,
    spatialInfoVisible,
    setSpatialInfoVisible,
    spatialPosition,
    spatialInfo,
    currentUnitSystem,
    onUnitChange,
    accessibilitySettings,
    onAccessibilitySettingsChange,
    onBreakpointChange,
    onOrientationChange
  } = props

  const legendEmergencyTypes: LegendEmergencyType[] = useMemo(
    () => buildLegendEmergencyTypes(events),
    [events]
  )

  return (
    <ResponsiveMapContainer
      className={cn('map-container relative', className)}
      onBreakpointChange={onBreakpointChange}
      onOrientationChange={onOrientationChange}
    >
      {/* MapLibre GL JS container */}
      <div
        ref={mapRef as React.LegacyRef<HTMLDivElement>}
        className={cn(
          'absolute inset-0',
          // Enable touch gestures
          isTouch && 'touch-pan-y touch-pan-x',
          // Show focus when keyboard navigation is active
          mapKeyboardFocus && 'ring-2 ring-ring ring-offset-2'
        )}
        tabIndex={mapKeyboardFocus ? 0 : -1}
        role="application"
        aria-label="Emergency map"
        onKeyDown={e => {
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
            <div
              className={cn(
                'animate-spin rounded-full mx-auto mb-2',
                isMobile ? 'h-6 w-6 border-b-2' : 'h-8 w-8 border-b-2',
                'border-blue-500'
              )}
            ></div>
            <p className={cn('text-gray-600', isMobile ? 'text-xs' : 'text-sm')}>
              Loading emergency map...
            </p>
          </div>
        </div>
      )}

      {/* Desktop Map Controls */}
      {showControls && isMapLoaded && !isMobile && (
        <DesktopMapControls
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onCenterOnUser={onCenterOnUser}
          onToggleHeatmap={onToggleHeatmap}
          selectedMapControl={selectedMapControl}
          setSelectedMapControl={setSelectedMapControl}
        />
      )}

      {/* Mobile Map Controls */}
      {showControls && isMapLoaded && isMobile && (
        <MobileMapControls
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onCenterLocation={onCenterOnUser}
          onToggleLayers={onToggleHeatmap}
          onNavigate={() => selectedEmergency && onNavigateToEmergency()}
          position="bottom-right"
          variant="compact"
        />
      )}

      {/* Enhanced Emergency Details Popup */}
      {enableEnhancedDetails && enhancedEmergencyDetails && (
        <EmergencyDetailsPopup
          emergency={enhancedEmergencyDetails}
          onClose={onClearSelectedEmergency}
          onShare={onShareEmergency}
          onNavigate={onNavigateToEmergency}
          onContact={onContactEmergency}
          position="bottom"
          size={isMobile ? 'xl' : 'lg'}
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
          position={legendPosition}
          size={legendSize}
          variant={isMobile ? 'compact' : 'default'}
          emergencyTypes={legendEmergencyTypes}
          showLayerControls={!isMobile}
          showSeverityIndicators={!isMobile}
          showTrustIndicators={!isMobile}
          collapsible={true}
          initiallyCollapsed={isMobile ? true : legendCollapsed}
          onToggleCollapse={onLegendToggle}
          aria-label="Emergency map legend"
        />
      )}

      {/* Enhanced Proximity Alerts Display */}
      {showProximityAlerts && enhancedProximityAlerts.length > 0 && (
        <ProximityAlertsDisplay
          alerts={enhancedProximityAlerts}
          position={alertsPosition}
          size={alertsSize}
          variant={isMobile ? 'compact' : 'default'}
          maxVisible={maxVisibleAlerts}
          showDismissAll={!isMobile}
          showMarkAllRead={!isMobile}
          showFilterControls={!isMobile}
          autoDismiss={autoDismissAlerts}
          onAlertClick={onAlertClick}
          onAlertDismiss={onAlertDismiss}
          onDismissAll={onDismissAll}
          onMarkAllRead={onMarkAllAlertsRead}
        />
      )}

      {/* Spatial Information Overlay */}
      {showSpatialInfo && spatialInfoVisible && (
        <SpatialInformationOverlay
          spatialInfo={spatialInfo}
          position={spatialPosition}
          size="sm"
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
          onUnitChange={onUnitChange}
          onToggleOverlay={visible => setSpatialInfoVisible(visible)}
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
        onSettingsChange={onAccessibilitySettingsChange}
        mapInstance={mapInstance as unknown as React.ComponentProps<typeof AccessibilityMapFeatures>['mapInstance']}
        showControls={true}
        compactMode={isMobile}
      />
    </ResponsiveMapContainer>
  )
}
