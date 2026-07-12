import type { Map } from 'maplibre-gl'
import type { EmergencyEvent } from '@/store/emergencyStore'

// Shared overlay position union used across the map's floating panels.
export type MapOverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface EmergencyMapProps {
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
  legendPosition?: MapOverlayPosition
  alertsPosition?: MapOverlayPosition
  spatialInfoPosition?: MapOverlayPosition
  maxVisibleAlerts?: number
  autoDismissAlerts?: boolean
  unitSystem?: 'metric' | 'imperial'
}

// Destructured-prop shape handed to layer/marker controller hooks so they
// don't need to know about every top-level callback.
export interface EmergencyMapFeatureFlags {
  enableClustering: boolean
  enableHeatmap: boolean
  enableGeofences: boolean
  enableOffline: boolean
  initialCenter: [number, number]
  initialZoom: number
  showControls: boolean
  isTracking: boolean
  onMapLoad?: (map: Map) => void
}
