// Main map components
export { default as EmergencyMap } from './EmergencyMap'
export {
  ResponsiveContext as ResponsiveMapContainer,
  useResponsive,
  responsiveUtils
} from './ResponsiveMapContainer'

// Enhanced map UI components
export { MapLegend, mapLegendVariants } from './MapLegend'
export { ProximityAlertsDisplay, proximityAlertsVariants } from './ProximityAlertsDisplay'
export { EmergencyDetailsPopup, emergencyDetailsVariants } from './EmergencyDetailsPopup'
export { SpatialInformationOverlay, spatialOverlayVariants } from './SpatialInformationOverlay'

// Accessibility components
export { AccessibilityMapFeatures, accessibilityControlsVariants } from './AccessibilityMapFeatures'

// Type exports
export type { ProximityAlert, ProximityAlertsDisplayProps } from './ProximityAlertsDisplay'

export type { EmergencyDetails, EmergencyDetailsPopupProps } from './EmergencyDetailsPopup'

export type { SpatialInfo, SpatialInformationOverlayProps } from './SpatialInformationOverlay'

export type {
  AccessibilitySettings,
  AccessibilityMapFeaturesProps
} from './AccessibilityMapFeatures'

export type { Breakpoint, Orientation, ResponsiveMapContainerProps } from './ResponsiveMapContainer'
