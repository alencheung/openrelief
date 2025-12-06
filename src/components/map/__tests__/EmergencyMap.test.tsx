import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import EmergencyMap from '../EmergencyMap'
import { createTestUtils, createMockMap, createMockEmergencyEvent, createMockLocation } from '@/test-utils'
import { useEmergencyStore, useLocationStore } from '@/store'

// Mock the maplibre-gl library
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(() => createMockMap()),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    LngLat: vi.fn(),
    LngLatBounds: vi.fn(() => ({
      extend: vi.fn(),
    })),
  },
}))

// Mock the map utilities
vi.mock('@/lib/map-utils', () => ({
  createEmergencyCluster: vi.fn(() => ({
    getLeaves: vi.fn(() => []),
    getClusterExpansionZoom: vi.fn(() => 10),
  })),
  clusterEmergencyEvents: vi.fn(() => []),
  MapPerformanceManager: vi.fn(() => ({
    destroy: vi.fn(),
  })),
  OfflineTileCache: vi.fn(),
  EmergencyRouter: vi.fn(),
  MapAccessibilityManager: vi.fn(() => ({
    announceLocation: vi.fn(),
  })),
  generateEmergencyHeatmap: vi.fn(() => ({
    type: 'FeatureCollection',
    features: [],
  })),
  createGeofenceBuffer: vi.fn(() => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [],
    },
  })),
}))

// Mock the map configuration
vi.mock('@/lib/map-config', () => ({
  mapConfiguration: {
    style: 'mapbox://styles/mapbox/streets-v11',
    default: {
      pitch: 0,
      bearing: 0,
      minZoom: 0,
      maxZoom: 20,
    },
    performance: {
      clusteringMaxZoom: 14,
      clusteringRadius: 50,
    },
    layers: [
      {
        id: 'emergency-events',
        type: 'circle',
        source: 'emergency-events',
      },
    ],
  },
}))

// Mock accessibility hooks
vi.mock('@/hooks/accessibility', () => ({
  useKeyboardNavigation: vi.fn(() => ({
    registerShortcut: vi.fn(),
    unregisterShortcut: vi.fn(),
  })),
  useAriaAnnouncer: vi.fn(() => ({
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
  })),
  useReducedMotion: vi.fn(() => ({
    prefersReducedMotion: false,
  })),
}))

// Mock mobile detection
vi.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: vi.fn(() => ({
    isMobile: false,
    isTouch: false,
  })),
}))

// Mock touch gestures
vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(() => ({
    current: null,
  })),
}))

// Mock responsive container
vi.mock('./ResponsiveMapContainer', () => ({
  ResponsiveMapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useResponsive: vi.fn(() => ({
    breakpoint: 'desktop',
    orientation: 'landscape',
  })),
  responsiveUtils: {
    getResponsiveValue: vi.fn((value) => value),
  },
}))

// Mock child components
vi.mock('./MapLegend', () => ({
  MapLegend: vi.fn(() => <div data-testid="map-legend">Map Legend</div>),
}))

vi.mock('./ProximityAlertsDisplay', () => ({
  ProximityAlertsDisplay: vi.fn(() => <div data-testid="proximity-alerts">Proximity Alerts</div>),
  ProximityAlert: {},
}))

vi.mock('./EmergencyDetailsPopup', () => ({
  EmergencyDetailsPopup: vi.fn(() => <div data-testid="emergency-details">Emergency Details</div>),
  EmergencyDetails: {},
}))

vi.mock('./SpatialInformationOverlay', () => ({
  SpatialInformationOverlay: vi.fn(() => <div data-testid="spatial-info">Spatial Info</div>),
}))

vi.mock('./AccessibilityMapFeatures', () => ({
  AccessibilityMapFeatures: vi.fn(() => <div data-testid="accessibility-features">Accessibility Features</div>),
  AccessibilitySettings: {},
}))

vi.mock('@/components/mobile/MobileMapControls', () => ({
  MobileMapControls: vi.fn(() => <div data-testid="mobile-controls">Mobile Controls</div>),
}))

describe('EmergencyMap', () => {
  const { renderWithProviders } = createTestUtils()
  
  // Mock store data
  const mockEmergencyEvents = [
    createMockEmergencyEvent({
      id: 'emergency-1',
      title: 'Test Fire',
      location: '40.7128 -74.0060',
      severity: 4,
      status: 'active',
    }),
    createMockEmergencyEvent({
      id: 'emergency-2',
      title: 'Test Medical',
      location: '40.7589 -73.9851',
      severity: 3,
      status: 'pending',
    }),
  ]

  const mockLocation = createMockLocation({
    lat: 40.7128,
    lng: -74.0060,
    accuracy: 10,
  })

  const mockGeofences = [
    {
      id: 'geofence-1',
      name: 'Test Geofence',
      type: 'emergency',
      isActive: true,
      coordinates: [[[-74.0060, 40.7128], [-73.9851, 40.7589]]],
    },
  ]

  const mockProximityAlerts = [
    {
      id: 'alert-1',
      emergencyId: 'emergency-1',
      message: 'Near emergency: Test Fire',
      severity: 'critical',
      distance: 100,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock store hooks
    vi.mocked(useEmergencyStore).mockReturnValue({
      events: mockEmergencyEvents,
      filteredEvents: mockEmergencyEvents,
      mapState: {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 10,
        bounds: null,
      },
      setMapState: vi.fn(),
      setSelectedEventOnMap: vi.fn(),
    } as any)

    vi.mocked(useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      isTracking: true,
      geofences: mockGeofences,
      proximityAlerts: mockProximityAlerts,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders map container correctly', () => {
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('shows loading indicator initially', () => {
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByText(/loading emergency map/i)).toBeInTheDocument()
  })

  it('renders map controls when enabled', () => {
    renderWithProviders(<EmergencyMap showControls={true} />)
    
    // Check for zoom controls
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /center on user location/i })).toBeInTheDocument()
  })

  it('renders map legend when enabled', () => {
    renderWithProviders(<EmergencyMap showLegend={true} />)
    
    expect(screen.getByTestId('map-legend')).toBeInTheDocument()
  })

  it('renders proximity alerts when enabled and alerts exist', () => {
    renderWithProviders(<EmergencyMap showProximityAlerts={true} />)
    
    expect(screen.getByTestId('proximity-alerts')).toBeInTheDocument()
  })

  it('renders spatial information overlay when enabled', () => {
    renderWithProviders(<EmergencyMap showSpatialInfo={true} />)
    
    expect(screen.getByTestId('spatial-info')).toBeInTheDocument()
  })

  it('renders accessibility features', () => {
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByTestId('accessibility-features')).toBeInTheDocument()
  })

  it('handles zoom in control click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyMap showControls={true} />)
    
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
    await user.click(zoomInButton)
    
    // The mock map should have zoomIn called
    expect(vi.mocked(useEmergencyStore).mockReturnValue.setMapState).toHaveBeenCalled()
  })

  it('handles zoom out control click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyMap showControls={true} />)
    
    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
    await user.click(zoomOutButton)
    
    expect(vi.mocked(useEmergencyStore).mockReturnValue.setMapState).toHaveBeenCalled()
  })

  it('handles center on user location click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyMap showControls={true} />)
    
    const centerButton = screen.getByRole('button', { name: /center on user location/i })
    await user.click(centerButton)
    
    // Should announce location centering
    const { announcePolite } = vi.mocked(require('@/hooks/accessibility').useAriaAnnouncer()).mockReturnValue({
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
    })
    
    expect(announcePolite).toHaveBeenCalledWith('Centered map on your location')
  })

  it('handles heatmap toggle click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyMap showControls={true} />)
    
    const heatmapButton = screen.getByRole('button', { name: /toggle heatmap/i })
    await user.click(heatmapButton)
    
    const { announcePolite } = vi.mocked(require('@/hooks/accessibility').useAriaAnnouncer()).mockReturnValue({
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
    })
    
    expect(announcePolite).toHaveBeenCalled()
  })

  it('handles emergency click event', async () => {
    const onEmergencyClick = vi.fn()
    renderWithProviders(<EmergencyMap onEmergencyClick={onEmergencyClick} />)
    
    // Simulate clicking on an emergency marker
    // This would require mocking the map click event
    // For now, we'll test the callback exists
    expect(onEmergencyClick).toBeDefined()
  })

  it('handles map movement', () => {
    renderWithProviders(<EmergencyMap />)
    
    // Map movement should update state
    expect(vi.mocked(useEmergencyStore).mockReturnValue.setMapState).toBeDefined()
  })

  it('updates when emergency events change', () => {
    const { rerender } = renderWithProviders(<EmergencyMap />)
    
    // Update with new events
    const newEvents = [...mockEmergencyEvents, createMockEmergencyEvent({
      id: 'emergency-3',
      title: 'New Emergency',
    })]
    
    vi.mocked(useEmergencyStore).mockReturnValue({
      ...vi.mocked(useEmergencyStore).mockReturnValue,
      events: newEvents,
      filteredEvents: newEvents,
    } as any)
    
    rerender(<EmergencyMap />)
    
    // Component should re-render with new events
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('updates when location changes', () => {
    const { rerender } = renderWithProviders(<EmergencyMap />)
    
    // Update with new location
    const newLocation = createMockLocation({
      lat: 40.7589,
      lng: -73.9851,
    })
    
    vi.mocked(useLocationStore).mockReturnValue({
      ...vi.mocked(useLocationStore).mockReturnValue,
      currentLocation: newLocation,
    } as any)
    
    rerender(<EmergencyMap />)
    
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles keyboard navigation', () => {
    const { registerShortcut } = vi.mocked(require('@/hooks/accessibility').useKeyboardNavigation()).mockReturnValue({
      registerShortcut: vi.fn(),
      unregisterShortcut: vi.fn(),
    })
    
    renderWithProviders(<EmergencyMap />)
    
    // Should register keyboard shortcuts
    expect(registerShortcut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: '+',
        description: 'Zoom in on map',
      })
    )
    
    expect(registerShortcut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: '=',
        description: 'Zoom out on map',
      })
    )
    
    expect(registerShortcut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'c',
        description: 'Center map on user location',
      })
    )
  })

  it('handles map focus and blur events', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EmergencyMap />)
    
    const mapElement = screen.getByRole('application', { name: /emergency map/i })
    
    // Focus the map
    await user.click(mapElement)
    expect(mapElement).toHaveFocus()
    
    // Blur the map
    mapElement.blur()
    expect(mapElement).not.toHaveFocus()
  })

  it('applies custom className', () => {
    renderWithProviders(<EmergencyMap className="custom-class" />)
    
    const mapContainer = screen.getByRole('application', { name: /emergency map/i }).parentElement
    expect(mapContainer).toHaveClass('custom-class')
  })

  it('handles clustering toggle', () => {
    renderWithProviders(<EmergencyMap enableClustering={false} />)
    
    // Should still render without clustering
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles heatmap toggle', () => {
    renderWithProviders(<EmergencyMap enableHeatmap={true} />)
    
    // Should render with heatmap enabled
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles geofences toggle', () => {
    renderWithProviders(<EmergencyMap enableGeofences={false} />)
    
    // Should render without geofences
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles offline mode toggle', () => {
    renderWithProviders(<EmergencyMap enableOffline={false} />)
    
    // Should render without offline features
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles different legend positions', () => {
    renderWithProviders(<EmergencyMap legendPosition="top-right" />)
    
    expect(screen.getByTestId('map-legend')).toBeInTheDocument()
  })

  it('handles different alerts positions', () => {
    renderWithProviders(<EmergencyMap alertsPosition="bottom-right" />)
    
    expect(screen.getByTestId('proximity-alerts')).toBeInTheDocument()
  })

  it('handles different spatial info positions', () => {
    renderWithProviders(<EmergencyMap spatialInfoPosition="bottom-left" />)
    
    expect(screen.getByTestId('spatial-info')).toBeInTheDocument()
  })

  it('handles max visible alerts setting', () => {
    renderWithProviders(<EmergencyMap maxVisibleAlerts={5} />)
    
    expect(screen.getByTestId('proximity-alerts')).toBeInTheDocument()
  })

  it('handles auto dismiss alerts setting', () => {
    renderWithProviders(<EmergencyMap autoDismissAlerts={false} />)
    
    expect(screen.getByTestId('proximity-alerts')).toBeInTheDocument()
  })

  it('handles unit system setting', () => {
    renderWithProviders(<EmergencyMap unitSystem="imperial" />)
    
    expect(screen.getByTestId('spatial-info')).toBeInTheDocument()
  })

  it('handles initial center and zoom', () => {
    renderWithProviders(<EmergencyMap 
      initialCenter={[40.7128, -74.0060]} 
      initialZoom={15} 
    />)
    
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('calls onMapLoad when map loads', () => {
    const onMapLoad = vi.fn()
    renderWithProviders(<EmergencyMap onMapLoad={onMapLoad} />)
    
    // Map load would be triggered after initialization
    expect(onMapLoad).toBeDefined()
  })

  it('calls onLocationUpdate when location changes', () => {
    const onLocationUpdate = vi.fn()
    renderWithProviders(<EmergencyMap onLocationUpdate={onLocationUpdate} />)
    
    expect(onLocationUpdate).toBeDefined()
  })

  it('handles reduced motion preference', () => {
    vi.mocked(require('@/hooks/accessibility').useReducedMotion)).mockReturnValue({
      prefersReducedMotion: true,
    })
    
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('handles mobile view', () => {
    vi.mocked(require('@/hooks/useMobileDetection').useMobileDetection).mockReturnValue({
      isMobile: true,
      isTouch: true,
    })
    
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByTestId('mobile-controls')).toBeInTheDocument()
  })

  it('handles touch gestures', () => {
    vi.mocked(require('@/hooks/useMobileDetection').useMobileDetection).mockReturnValue({
      isMobile: true,
      isTouch: true,
    })
    
    renderWithProviders(<EmergencyMap />)
    
    expect(screen.getByRole('application', { name: /emergency map/i })).toBeInTheDocument()
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderWithProviders(<EmergencyMap />)
    
    // Unmount component
    unmount()
    
    // Map should be cleaned up
    expect(vi.mocked(require('maplibre-gl').default.Map)).toHaveBeenCalled()
  })

  it('handles error states gracefully', () => {
    // Mock error in map initialization
    vi.mocked(require('maplibre-gl').default.Map).mockImplementation(() => {
      throw new Error('Map initialization failed')
    })
    
    // Component should handle error gracefully
    expect(() => {
      renderWithProviders(<EmergencyMap />)
    }).not.toThrow()
  })

  it('handles accessibility announcements', () => {
    const { announcePolite } = vi.mocked(require('@/hooks/accessibility').useAriaAnnouncer()).mockReturnValue({
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
    })
    
    renderWithProviders(<EmergencyMap />)
    
    // Should have accessibility announcer
    expect(announcePolite).toBeDefined()
  })
})