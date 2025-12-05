# Enhanced PWA Components for OpenRelief

This directory contains comprehensive visual cues for offline/online status transitions throughout the OpenRelief application. These components provide clear feedback about connection status, offline capabilities, and synchronization progress to ensure users are always aware of the application's state.

## Components Overview

### Core Components

#### EnhancedNetworkStatusIndicator
A comprehensive network status indicator with animated transitions and detailed connection information.

**Features:**
- Visual network status with clear online/offline states
- Animated transitions between connection states
- Connection quality indicators (signal strength, speed)
- Network type indicators (WiFi, cellular, offline)
- Loading states during reconnection attempts
- Success indicators when connection is restored
- Warning indicators for intermittent connections
- Screen reader announcements for connection changes
- Reduced motion support for animations

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { EnhancedNetworkStatusIndicator } from '@/components/pwa'

<EnhancedNetworkStatusIndicator />
```

#### OfflineActionQueueVisualization
A comprehensive visualization of offline actions queued for synchronization.

**Features:**
- Visual indicator showing pending offline actions
- Progress indicators for sync operations
- Failed sync notifications with retry options
- Queue management interface for offline actions
- Batch operation status displays
- Filtering and sorting options
- Detailed action information
- Screen reader support

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { OfflineActionQueueVisualization } from '@/components/pwa'

<OfflineActionQueueVisualization />
```

#### SyncProgressNotification
A detailed notification system for synchronization progress.

**Features:**
- Multi-stage sync progress visualization
- Real-time progress updates
- Error handling and retry options
- Detailed sync statistics
- Auto-hide functionality
- Accessibility support

**Props:**
- `onDismiss?: () => void` - Callback when notification is dismissed
- `showDetails?: boolean` - Whether to show detailed progress
- `position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'` - Position on screen
- `autoHide?: boolean` - Whether to auto-hide after completion
- `autoHideDelay?: number` - Delay before auto-hiding (ms)

**Usage:**
```tsx
import { SyncProgressNotification } from '@/components/pwa'

<SyncProgressNotification 
  position="top-right"
  autoHide={true}
  autoHideDelay={5000}
/>
```

#### EnhancedOfflineFallback
An improved offline fallback page with clear action options.

**Features:**
- Tabbed interface for different information types
- Emergency actions available offline
- Offline capabilities overview
- System status information
- Storage usage visualization
- Connection quality indicators
- Accessibility support

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { EnhancedOfflineFallback } from '@/components/pwa'

<EnhancedOfflineFallback />
```

#### EnhancedPWAStatus
A comprehensive PWA status dashboard with detailed information.

**Features:**
- Tabbed interface for different status categories
- Network status with quality metrics
- Storage management with cache details
- Performance metrics and monitoring
- Synchronization status and settings
- Service worker information
- Real-time updates

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { EnhancedPWAStatus } from '@/components/pwa'

<EnhancedPWAStatus />
```

#### EnhancedPWAManager
An enhanced PWA manager with installation prompts and visual cues.

**Features:**
- PWA installation prompts with progress tracking
- Welcome messages for first-time PWA users
- Offline banner with contextual information
- Update available notifications
- PWA feature indicators
- Platform detection and optimization
- Accessibility announcements

**Props:**
- `children: React.ReactNode` - Child components to wrap
- `showNetworkStatus?: boolean` - Whether to show network status
- `showActionQueue?: boolean` - Whether to show action queue
- `showSyncNotifications?: boolean` - Whether to show sync notifications
- `position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'` - Position of indicators

**Usage:**
```tsx
import { EnhancedPWAManager } from '@/components/pwa'

<EnhancedPWAManager>
  <App />
</EnhancedPWAManager>
```

### Specialized Indicators

#### EmergencyOfflineIndicator
A specialized indicator for emergency reporting offline mode.

**Features:**
- Emergency mode activation indicators
- Critical feature availability status
- Battery level monitoring
- Priority-based feature organization
- Emergency-specific actions
- Screen reader announcements for emergency status

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { EmergencyOfflineIndicator } from '@/components/pwa'

<EmergencyOfflineIndicator />
```

#### FormOfflineStatusIndicator
A comprehensive form submission status indicator for offline functionality.

**Features:**
- Form validation status tracking
- Auto-save functionality for offline forms
- Submission queue management
- Field-level status indicators
- Retry mechanisms for failed submissions
- Progress tracking for form operations

**Props:**
- `formId: string` - Unique identifier for the form
- `formName: string` - Display name for the form
- `fields: FormField[]` - Array of form fields with their status
- `onSubmit?: (data: any) => Promise<void>` - Form submission handler
- `onFieldChange?: (fieldId: string, value: any) => void` - Field change handler
- `onValidationChange?: (fieldId: string, isValid: boolean) => void` - Validation change handler
- `showOfflineIndicator?: boolean` - Whether to show offline indicator
- `position?: 'top' | 'bottom' | 'inline'` - Position of the indicator
- `autoSave?: boolean` - Whether to enable auto-save
- `autoSaveDelay?: number` - Delay before auto-saving (ms)

**Usage:**
```tsx
import { FormOfflineStatusIndicator } from '@/components/pwa'

<FormOfflineStatusIndicator
  formId="emergency-report"
  formName="Emergency Report"
  fields={formFields}
  onSubmit={handleSubmit}
  autoSave={true}
  autoSaveDelay={3000}
/>
```

#### RealtimeOfflineIndicator
A comprehensive indicator for real-time features offline status.

**Features:**
- Real-time feature availability status
- Connection quality monitoring
- Latency tracking
- Feature-specific controls
- Priority-based feature organization
- Connection type indicators
- User count tracking

**Props:**
- None (uses hooks for state management)

**Usage:**
```tsx
import { RealtimeOfflineIndicator } from '@/components/pwa'

<RealtimeOfflineIndicator />
```

#### MapOfflineIndicator
A specialized indicator for map offline functionality.

**Features:**
- Map layer availability status
- Cache management for offline maps
- Region download capabilities
- Tile usage tracking
- Zoom level indicators
- Location accuracy monitoring
- Evacuation route availability

**Props:**
- `onRegionChange?: (region: string) => void` - Region change handler
- `onZoomChange?: (zoom: number) => void` - Zoom change handler
- `onLayerToggle?: (layerId: string, enabled: boolean) => void` - Layer toggle handler
- `onCacheClear?: (cacheId?: string) => void` - Cache clear handler
- `onDownloadMap?: (region: string, zoom: number) => void` - Map download handler
- `showOfflineIndicator?: boolean` - Whether to show offline indicator
- `position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'` - Position of indicator
- `compact?: boolean` - Whether to show compact version

**Usage:**
```tsx
import { MapOfflineIndicator } from '@/components/pwa'

<MapOfflineIndicator
  onRegionChange={handleRegionChange}
  onZoomChange={handleZoomChange}
  position="top-right"
  compact={false}
/>
```

## Accessibility Features

All components include comprehensive accessibility support:

### Screen Reader Support
- ARIA live regions for status updates
- Semantic HTML structure
- Descriptive labels and announcements
- Keyboard navigation support

### Visual Accessibility
- High contrast mode support
- Reduced motion support for animations
- Focus indicators
- Color-blind friendly design

### Keyboard Navigation
- Tab order management
- Keyboard shortcuts for common actions
- Focus trap management for modals
- Escape key handling

## Styling and Theming

Components use Tailwind CSS with custom CSS variables for theming:

### Color Variables
- `--color-primary` - Primary color for active states
- `--color-destructive` - Color for error states
- `--color-success` - Color for success states
- `--color-warning` - Color for warning states

### Animation Variables
- `--duration-fast` - Fast animation duration (150ms)
- `--duration-normal` - Normal animation duration (300ms)
- `--duration-slow` - Slow animation duration (500ms)

### Responsive Design
All components are fully responsive and work across:
- Mobile devices (320px+)
- Tablet devices (768px+)
- Desktop devices (1024px+)
- High DPI displays

## Integration with Existing Systems

### Store Integration
Components integrate with the existing offline store:
- `useOfflineStore()` hook for state management
- Automatic state synchronization
- Action queue management
- Metrics tracking

### Network Status Integration
Components use the network status hook:
- `useNetworkStatus()` hook for connection information
- Real-time connection updates
- Connection quality monitoring
- Network type detection

### Accessibility Integration
Components use accessibility hooks:
- `useAriaAnnouncer()` for screen reader announcements
- `useReducedMotion()` for motion preferences
- `useScreenReaderFocus()` for focus management

## Performance Considerations

### Optimization
- Efficient re-rendering with memoization
- Minimal DOM manipulation
- Optimized animations with CSS transforms
- Lazy loading of detailed information

### Memory Management
- Proper cleanup of timers and intervals
- Event listener cleanup
- Component unmount handling
- Memory leak prevention

## Usage Patterns

### Basic Usage
```tsx
import { 
  EnhancedNetworkStatusIndicator,
  OfflineActionQueueVisualization,
  SyncProgressNotification 
} from '@/components/pwa'

function App() {
  return (
    <>
      <EnhancedNetworkStatusIndicator />
      <OfflineActionQueueVisualization />
      <SyncProgressNotification />
    </>
  )
}
```

### Advanced Usage with PWAManager
```tsx
import { EnhancedPWAManager } from '@/components/pwa'

function App() {
  return (
    <EnhancedPWAManager
      showNetworkStatus={true}
      showActionQueue={true}
      showSyncNotifications={true}
      position="bottom-left"
    >
      <YourAppContent />
    </EnhancedPWAManager>
  )
}
```

### Context-Specific Usage
```tsx
import { 
  EmergencyOfflineIndicator,
  FormOfflineStatusIndicator,
  MapOfflineIndicator 
} from '@/components/pwa'

function EmergencyPage() {
  return (
    <>
      <EmergencyOfflineIndicator />
      <FormOfflineStatusIndicator
        formId="emergency-report"
        formName="Emergency Report"
        fields={emergencyFields}
        onSubmit={handleEmergencySubmit}
      />
      <MapOfflineIndicator
        onRegionChange={handleRegionChange}
        position="top-right"
      />
    </>
  )
}
```

## Best Practices

### When to Use Each Component

1. **EnhancedNetworkStatusIndicator**: Always visible in the app for global network status
2. **OfflineActionQueueVisualization**: When users have pending offline actions
3. **SyncProgressNotification**: During active synchronization operations
4. **EnhancedOfflineFallback**: As a fallback page when offline
5. **EnhancedPWAStatus**: In settings or status pages
6. **EnhancedPWAManager**: As a wrapper for the entire app
7. **EmergencyOfflineIndicator**: In emergency-related contexts
8. **FormOfflineStatusIndicator**: With forms that can be submitted offline
9. **RealtimeOfflineIndicator**: For apps with real-time features
10. **MapOfflineIndicator**: For map-heavy applications

### Performance Tips
- Use the compact prop for space-constrained interfaces
- Enable auto-hide for notifications to prevent UI clutter
- Use position props to avoid conflicts with other UI elements
- Leverage reduced motion settings for better performance

### Accessibility Tips
- Always provide alternative text for visual indicators
- Use semantic HTML elements properly
- Test with screen readers regularly
- Ensure keyboard navigation works for all interactive elements

## Migration from Legacy Components

To migrate from the original PWA components:

1. Replace `NetworkStatusIndicator` with `EnhancedNetworkStatusIndicator`
2. Replace `OfflineFallback` with `EnhancedOfflineFallback`
3. Replace `PWAManager` with `EnhancedPWAManager`
4. Replace `PWAStatus` with `EnhancedPWAStatus`

The new components are backward compatible and provide enhanced functionality out of the box.

## Troubleshooting

### Common Issues

1. **Components not updating**: Ensure proper hook usage and state management
2. **Animations not working**: Check reduced motion preferences
3. **Screen reader not announcing**: Verify ARIA live regions are properly set
4. **Keyboard navigation issues**: Check tab order and focus management

### Debug Mode

Enable debug mode by setting `localStorage.setItem('pwa-debug', 'true')` to see:
- Console logging for state changes
- Visual debugging borders
- Performance metrics
- Accessibility tree information

## Contributing

When adding new features to these components:

1. Follow the established patterns for state management
2. Include proper TypeScript types
3. Add comprehensive accessibility support
4. Include screen reader announcements
5. Test with reduced motion and high contrast modes
6. Document new props and features

## License

These components are part of the OpenRelief project and follow the same licensing terms.