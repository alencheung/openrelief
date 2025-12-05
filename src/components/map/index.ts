// Main map components
export { default as EmergencyMap } from './EmergencyMap'
export { default as ResponsiveMapContainer, useResponsive, responsiveUtils } from './ResponsiveMapContainer'

// Enhanced map UI components
export { default as MapLegend, mapLegendVariants } from './MapLegend'
export { default as ProximityAlertsDisplay, proximityAlertsVariants } from './ProximityAlertsDisplay'
export { default as EmergencyDetailsPopup, emergencyDetailsVariants } from './EmergencyDetailsPopup'
export { default as SpatialInformationOverlay, spatialOverlayVariants } from './SpatialInformationOverlay'

// Accessibility components
export { default as AccessibilityMapFeatures, accessibilityControlsVariants } from './AccessibilityMapFeatures'

// Type exports
export type { 
  ProximityAlert, 
  ProximityAlertsDisplayProps 
} from './ProximityAlertsDisplay'

export type { 
  EmergencyDetails, 
  EmergencyDetailsPopupProps 
} from './EmergencyDetailsPopup'

export type { 
  SpatialInfo, 
  SpatialInformationOverlayProps 
} from './SpatialInformationOverlay'

export type { 
  AccessibilitySettings, 
  AccessibilityMapFeaturesProps 
} from './AccessibilityMapFeatures'

export type { 
  Breakpoint, 
  Orientation, 
  ResponsiveMapContainerProps 
} from './ResponsiveMapContainer'