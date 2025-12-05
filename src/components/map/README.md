# Enhanced Map Components for OpenRelief

This directory contains enhanced map components that provide improved visual communication, accessibility, and responsiveness for the OpenRelief emergency coordination platform.

## Components Overview

### 1. EmergencyMap (Main Component)
The main map component that integrates all enhanced features.

**Features:**
- Responsive design with mobile optimizations
- Enhanced emergency details popup
- Proximity alerts display
- Spatial information overlay
- Accessibility features
- Collapsible legend with layer controls
- Trust score visualization
- Severity level indicators

**Props:**
```typescript
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
```

### 2. MapLegend
Enhanced map legend with collapsible sections and layer controls.

**Features:**
- Emergency type indicators with counts
- Severity level visualization
- Trust score indicators
- Layer visibility toggles
- Collapsible sections for mobile
- Accessibility features
- Keyboard navigation

**Props:**
```typescript
interface MapLegendProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'compact' | 'minimal'
  emergencyTypes?: Array<{
    type: string
    name: string
    count?: number
    color?: string
  }>
  severityLevels?: Array<{
    level: number
    label: string
    color: string
  }>
  trustLevels?: Array<{
    level: string
    label: string
    color: string
  }>
  showLayerControls?: boolean
  showSeverityIndicators?: boolean
  showTrustIndicators?: boolean
  collapsible?: boolean
  initiallyCollapsed?: boolean
  onToggleCollapse?: (collapsed: boolean) => void
}
```

### 3. ProximityAlertsDisplay
Enhanced proximity alerts with filtering and actions.

**Features:**
- Alert filtering (all, unread, critical)
- Expandable alert items with details
- Action buttons for each alert
- Auto-dismiss functionality
- Trust score visualization
- Animated transitions
- Mobile-optimized layout

**Props:**
```typescript
interface ProximityAlertsDisplayProps {
  alerts: ProximityAlert[]
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'compact' | 'minimal'
  maxVisible?: number
  showDismissAll?: boolean
  showMarkAllRead?: boolean
  showFilterControls?: boolean
  autoDismiss?: boolean
  autoDismissDelay?: number
  onAlertClick?: (alert: ProximityAlert) => void
  onAlertDismiss?: (alertId: string) => void
  onDismissAll?: () => void
  onMarkAllRead?: () => void
  onFilterChange?: (filter: string) => void
}
```

### 4. EmergencyDetailsPopup
Enhanced emergency details popup with tabbed interface.

**Features:**
- Tabbed interface (Details, Updates, Resources)
- Trust score visualization
- Action buttons (Navigate, Contact, Share)
- Contact information display
- Required assistance list
- Mobile-responsive layout
- Auto-close functionality

**Props:**
```typescript
interface EmergencyDetailsPopupProps {
  emergency: EmergencyDetails
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center'
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  variant?: 'default' | 'compact' | 'minimal'
  onClose: () => void
  onShare?: () => void
  onNavigate?: () => void
  onContact?: () => void
  showActions?: boolean
  showUpdates?: boolean
  showResources?: boolean
  showContactInfo?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}
```

### 5. SpatialInformationOverlay
Overlay showing spatial information like distance, time estimates, and coordinates.

**Features:**
- Distance indicators with unit conversion
- Time estimates for different transport modes
- Area radius visualization
- Coordinate display
- Bearing and speed information
- Accuracy indicators
- Unit system toggle (metric/imperial)
- Collapsible interface

**Props:**
```typescript
interface SpatialInformationOverlayProps {
  spatialInfo: SpatialInfo
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'compact' | 'minimal'
  showDistance?: boolean
  showTimeEstimate?: boolean
  showAreaRadius?: boolean
  showCoordinates?: boolean
  showBearing?: boolean
  showSpeed?: boolean
  showAccuracy?: boolean
  showControls?: boolean
  unitSystem?: 'metric' | 'imperial'
  onUnitChange?: (unit: 'metric' | 'imperial') => void
  onToggleOverlay?: (visible: boolean) => void
  interactive?: boolean
  animated?: boolean
}
```

### 6. ResponsiveMapContainer
Container component that provides responsive context and utilities.

**Features:**
- Breakpoint detection (mobile, tablet, desktop)
- Orientation detection (portrait, landscape)
- Responsive utilities
- CSS custom properties
- Resize observer integration

**Props:**
```typescript
interface ResponsiveMapContainerProps {
  className?: string
  children: React.ReactNode
  onBreakpointChange?: (breakpoint: 'mobile' | 'tablet' | 'desktop') => void
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void
  layout?: 'default' | 'fullscreen' | 'sidebar'
}
```

### 7. AccessibilityMapFeatures
Comprehensive accessibility features for the map.

**Features:**
- Screen reader support
- High contrast mode
- Reduced motion preferences
- Large text mode
- Keyboard navigation
- Audio announcements
- Visual focus indicators
- Keyboard shortcuts

**Props:**
```typescript
interface AccessibilityMapFeaturesProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'prominent'
  settings: AccessibilitySettings
  onSettingsChange: (settings: Partial<AccessibilitySettings>) => void
  mapInstance?: any
  showControls?: boolean
  compactMode?: boolean
}
```

## Usage Examples

### Basic EmergencyMap with all features enabled
```typescript
import EmergencyMap from '@/components/map/EmergencyMap'

<EmergencyMap
  showLegend={true}
  showProximityAlerts={true}
  showSpatialInfo={true}
  enableEnhancedDetails={true}
  legendPosition="bottom-left"
  alertsPosition="top-left"
  spatialInfoPosition="top-right"
  unitSystem="metric"
  onEmergencyClick={(emergency) => console.log('Emergency clicked:', emergency)}
  onLocationUpdate={(location) => console.log('Location updated:', location)}
/>
```

### Custom configuration for mobile
```typescript
<EmergencyMap
  showLegend={true}
  showProximityAlerts={true}
  maxVisibleAlerts={2}
  autoDismissAlerts={true}
  legendPosition="bottom-left"
  alertsPosition="top-left"
  spatialInfoPosition="bottom-right"
  unitSystem="metric"
  enableEnhancedDetails={true}
/>
```

### Using individual components
```typescript
import { 
  MapLegend, 
  ProximityAlertsDisplay, 
  EmergencyDetailsPopup,
  SpatialInformationOverlay,
  AccessibilityMapFeatures
} from '@/components/map'

// Map Legend
<MapLegend
  position="bottom-left"
  emergencyTypes={emergencyTypes}
  showLayerControls={true}
  collapsible={true}
/>

// Proximity Alerts
<ProximityAlertsDisplay
  alerts={alerts}
  position="top-left"
  maxVisible={3}
  showFilterControls={true}
/>

// Emergency Details
<EmergencyDetailsPopup
  emergency={selectedEmergency}
  position="bottom"
  size="lg"
  showActions={true}
  onClose={() => setSelectedEmergency(null)}
/>

// Spatial Information
<SpatialInformationOverlay
  spatialInfo={spatialInfo}
  position="top-right"
  showDistance={true}
  showTimeEstimate={true}
  unitSystem="metric"
/>

// Accessibility Features
<AccessibilityMapFeatures
  position="top-right"
  settings={accessibilitySettings}
  onSettingsChange={handleAccessibilityChange}
  compactMode={isMobile}
/>
```

## Responsive Behavior

### Mobile (< 768px)
- Legend becomes full-width bottom sheet
- Alerts show as compact cards
- Emergency details use full-width modal
- Spatial info shows minimal information
- Accessibility controls are compact

### Tablet (768px - 1024px)
- Medium-sized components
- Reduced feature set for performance
- Touch-optimized interactions

### Desktop (> 1024px)
- Full feature set enabled
- Hover states and animations
- Keyboard navigation optimized
- Multi-column layouts where appropriate

## Accessibility Features

### Keyboard Shortcuts
- `Ctrl+H` - Toggle high contrast mode
- `Ctrl+L` - Toggle large text mode
- `Ctrl+M` - Toggle reduced motion
- `Ctrl+A` - Open accessibility settings
- `Esc` - Close all popups
- `Tab/Shift+Tab` - Navigate through interactive elements
- `Enter/Space` - Activate buttons and links

### Screen Reader Support
- ARIA labels on all interactive elements
- Live regions for dynamic content
- Semantic HTML structure
- Descriptive announcements for map changes

### Visual Accessibility
- High contrast mode support
- Large text mode
- Focus indicators
- Reduced motion preferences
- Color blind friendly palette

## Styling

### CSS Variables
The components use CSS custom properties for theming:
- `--map-legend-position`
- `--map-alerts-position`
- `--map-spatial-position`
- `--map-controls-size`
- `--map-popup-width`
- `--map-popup-position`

### Custom CSS Classes
- `.map-container` - Main container
- `.emergency-fire`, `.emergency-medical`, etc. - Emergency type colors
- `.trust-excellent`, `.trust-good`, etc. - Trust level colors
- `.status-active`, `.status-critical`, etc. - Status colors

## Performance Considerations

### Optimizations
- Lazy loading of components
- Debounced resize handlers
- Efficient state management
- Optimized re-renders
- Memory leak prevention

### Mobile Performance
- Reduced animation complexity
- Simplified layouts
- Touch-optimized interactions
- Battery-conscious features

## Integration Notes

### Store Integration
The components integrate with:
- `useEmergencyStore` for emergency data
- `useLocationStore` for location and alerts
- Custom state for UI preferences

### Map Library Integration
- Works with MapLibre GL JS
- Supports custom layers and sources
- Handles map events and interactions
- Provides accessibility enhancements

### Theme Integration
- Uses design system tokens
- Supports light/dark modes
- Respects user preferences
- Customizable through CSS variables

## Testing

### Accessibility Testing
- Screen reader testing with NVDA, JAWS
- Keyboard-only navigation testing
- Color contrast validation
- Voice control testing

### Responsive Testing
- Device testing across viewports
- Orientation change testing
- Touch interaction testing
- Performance profiling

### Cross-browser Testing
- Modern browser support
- Progressive enhancement
- Fallback behaviors
- Error handling