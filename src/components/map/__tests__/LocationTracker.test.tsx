import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import LocationTracker from '../LocationTracker'
import { createTestUtils, createMockLocation, createMockEmergencyEvent } from '@/test-utils'

// Mock store hooks
vi.mock('@/store', () => ({
  useLocationStore: vi.fn(() => ({
    currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
    setCurrentLocation: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
    locationPermission: { granted: true },
    isTracking: false,
    geofences: [],
    proximityAlerts: [],
    addGeofence: vi.fn(),
    checkGeofences: vi.fn(),
    addProximityAlert: vi.fn(),
  })),
  useEmergencyStore: vi.fn(() => ({
    events: [],
    filteredEvents: [],
  })),
}))

// Mock privacy hook
vi.mock('@/hooks/usePrivacy', () => ({
  usePrivacy: vi.fn(() => ({
    protectLocationData: vi.fn((data, options) => ({
      data: options?.applyAnonymization ? { lat: 40.7, lng: -74.0 } : data,
      isAnonymized: options?.applyAnonymization || false,
      hasDifferentialPrivacy: options?.applyDifferentialPrivacy || false,
      privacyBudgetUsed: 0.1,
    })),
    privacyContext: {
      settings: {
        differentialPrivacy: false,
        anonymizeData: false,
        locationPrecision: 100,
        locationSharing: true,
      },
    },
    assessPrivacyImpact: vi.fn(),
  })),
}))

// Mock navigator geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  writable: true,
  value: mockGeolocation,
})

// Mock navigator permissions
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: vi.fn(() => Promise.resolve({ state: 'granted' })),
  },
})

describe('LocationTracker', () => {
  const { renderWithProviders } = createTestUtils()
  
  const defaultProps = {}

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset geolocation mock
    mockGeolocation.getCurrentPosition.mockClear()
    mockGeolocation.watchPosition.mockClear()
    mockGeolocation.clearWatch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders location tracker component', () => {
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/location tracking/i)).toBeInTheDocument()
    expect(screen.getByText(/start tracking/i)).toBeInTheDocument()
  })

  it('displays current location when available', () => {
    const mockLocation = createMockLocation({ lat: 40.7128, lng: -74.0060 })
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/40\.712800, -74\.006000/i)).toBeInTheDocument()
    expect(screen.getByText(/current location/i)).toBeInTheDocument()
  })

  it('shows tracking status when active', () => {
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: true,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/active/i)).toBeInTheDocument()
    expect(screen.getByText(/stop tracking/i)).toBeInTheDocument()
  })

  it('shows permission shield when granted', () => {
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    // Should show permission indicator
    const shieldIcon = document.querySelector('[data-testid="shield-icon"]') || screen.getByRole('button').querySelector('svg')
    expect(shieldIcon).toBeInTheDocument()
  })

  it('starts tracking when start button is clicked', async () => {
    const user = userEvent.setup()
    const startTracking = vi.fn()
    const requestLocationPermission = vi.fn(() => Promise.resolve({ granted: true }))
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking,
      stopTracking: vi.fn(),
      requestLocationPermission,
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    // Mock successful geolocation
    mockGeolocation.watchPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      })
      return 1 // Return watch ID
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const startButton = screen.getByRole('button', { name: /start tracking/i })
    await user.click(startButton)
    
    expect(requestLocationPermission).toHaveBeenCalled()
    expect(startTracking).toHaveBeenCalled()
  })

  it('stops tracking when stop button is clicked', async () => {
    const user = userEvent.setup()
    const stopTracking = vi.fn()
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking,
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: true,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const stopButton = screen.getByRole('button', { name: /stop tracking/i })
    await user.click(stopButton)
    
    expect(stopTracking).toHaveBeenCalled()
  })

  it('gets current position when crosshair button is clicked', async () => {
    const user = userEvent.setup()
    
    // Mock successful getCurrentPosition
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      })
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const crosshairButton = screen.getByRole('button', { name: /get current position/i })
    await user.click(crosshairButton)
    
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  it('displays accuracy information', () => {
    const mockLocation = createMockLocation({ lat: 40.7128, lng: -74.0060, accuracy: 15 })
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} showAccuracy={true} />)
    
    expect(screen.getByText(/accuracy:/i)).toBeInTheDocument()
    expect(screen.getByText(/good/i)).toBeInTheDocument()
    expect(screen.getByText(/\(±15m\)/i)).toBeInTheDocument()
  })

  it('displays speed when available', () => {
    const mockLocation = createMockLocation({ lat: 40.7128, lng: -74.0060, speed: 5 }) // 5 m/s
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/speed:/i)).toBeInTheDocument()
    expect(screen.getByText(/18 km\/h/i)).toBeInTheDocument() // 5 m/s * 3.6 = 18 km/h
  })

  it('displays heading when available', () => {
    const mockLocation = createMockLocation({ lat: 40.7128, lng: -74.0060, heading: 45 })
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/heading:/i)).toBeInTheDocument()
    expect(screen.getByText(/45°/i)).toBeInTheDocument()
  })

  it('shows location error when permission denied', async () => {
    const user = userEvent.setup()
    const requestLocationPermission = vi.fn(() => Promise.resolve({ granted: false }))
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: null,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission,
      locationPermission: { granted: false },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const startButton = screen.getByRole('button', { name: /start tracking/i })
    await user.click(startButton)
    
    expect(screen.getByText(/location permission not granted/i)).toBeInTheDocument()
  })

  it('shows proximity alerts when present', () => {
    const mockProximityAlerts = [
      {
        id: 'alert-1',
        message: 'Near emergency: Test Fire',
        severity: 'critical',
        distance: 100,
      },
      {
        id: 'alert-2',
        message: 'Near emergency: Test Medical',
        severity: 'warning',
        distance: 200,
      },
    ]
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: mockProximityAlerts,
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/proximity alerts/i)).toBeInTheDocument()
    expect(screen.getByText(/near emergency: test fire/i)).toBeInTheDocument()
    expect(screen.getByText(/near emergency: test medical/i)).toBeInTheDocument()
  })

  it('shows active geofences when present', () => {
    const mockGeofences = [
      {
        id: 'geofence-1',
        name: 'Emergency Zone',
        type: 'emergency',
        isActive: true,
      },
      {
        id: 'geofence-2',
        name: 'Safe Zone',
        type: 'safe_zone',
        isActive: true,
      },
    ]
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: mockGeofences,
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/active geofences/i)).toBeInTheDocument()
    expect(screen.getByText(/emergency zone/i)).toBeInTheDocument()
    expect(screen.getByText(/safe zone/i)).toBeInTheDocument()
  })

  it('toggles location precision', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const precisionButton = screen.getByRole('button', { name: /precise/i })
    await user.click(precisionButton)
    
    expect(screen.getByText(/protected/i)).toBeInTheDocument()
  })

  it('shows privacy indicators when anonymized', () => {
    vi.mocked(require('@/hooks/usePrivacy').usePrivacy).mockReturnValue({
      protectLocationData: vi.fn((data, options) => ({
        data: options?.applyAnonymization ? { lat: 40.7, lng: -74.0 } : data,
        isAnonymized: options?.applyAnonymization || false,
        hasDifferentialPrivacy: options?.applyDifferentialPrivacy || false,
        privacyBudgetUsed: 0.1,
      })),
      privacyContext: {
        settings: {
          differentialPrivacy: true,
          anonymizeData: true,
          locationPrecision: 100,
          locationSharing: true,
        },
      },
      assessPrivacyImpact: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/anonymized/i)).toBeInTheDocument()
    expect(screen.getByText(/dp/i)).toBeInTheDocument()
  })

  it('shows privacy budget usage', () => {
    vi.mocked(require('@/hooks/usePrivacy').usePrivacy).mockReturnValue({
      protectLocationData: vi.fn((data, options) => ({
        data: options?.applyAnonymization ? { lat: 40.7, lng: -74.0 } : data,
        isAnonymized: options?.applyAnonymization || false,
        hasDifferentialPrivacy: options?.applyDifferentialPrivacy || false,
        privacyBudgetUsed: 0.25,
      })),
      privacyContext: {
        settings: {
          differentialPrivacy: true,
          anonymizeData: false,
          locationPrecision: 100,
          locationSharing: true,
        },
      },
      assessPrivacyImpact: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/privacy budget used: 25\.0%/i)).toBeInTheDocument()
  })

  it('disables tracking when location sharing is disabled', () => {
    vi.mocked(require('@/hooks/usePrivacy').usePrivacy).mockReturnValue({
      protectLocationData: vi.fn((data, options) => ({
        data: options?.applyAnonymization ? { lat: 40.7, lng: -74.0 } : data,
        isAnonymized: options?.applyAnonymization || false,
        hasDifferentialPrivacy: options?.applyDifferentialPrivacy || false,
        privacyBudgetUsed: 0.1,
      })),
      privacyContext: {
        settings: {
          differentialPrivacy: false,
          anonymizeData: false,
          locationPrecision: 100,
          locationSharing: false,
        },
      },
      assessPrivacyImpact: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    expect(screen.getByText(/location sharing disabled/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /location sharing disabled/i })).toBeDisabled()
  })

  it('handles geolocation errors', async () => {
    const user = userEvent.setup()
    
    // Mock geolocation error
    mockGeolocation.watchPosition.mockImplementation((success, error) => {
      error({ code: 1, message: 'Permission denied' })
      return 1
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const startButton = screen.getByRole('button', { name: /start tracking/i })
    await user.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText(/location permission denied/i)).toBeInTheDocument()
    })
  })

  it('calls onLocationUpdate callback', () => {
    const onLocationUpdate = vi.fn()
    
    renderWithProviders(<LocationTracker {...defaultProps} onLocationUpdate={onLocationUpdate} />)
    
    // Simulate location update
    const mockLocation = createMockLocation({ lat: 40.7128, lng: -74.0060 })
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    // Trigger location update
    const { setCurrentLocation } = vi.mocked(require('@/store').useLocationStore()).mockReturnValue({
      currentLocation: mockLocation,
      setCurrentLocation: vi.fn((location) => {
        onLocationUpdate(location)
      }),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} onLocationUpdate={onLocationUpdate} />)
    
    expect(onLocationUpdate).toHaveBeenCalledWith(mockLocation)
  })

  it('applies custom className', () => {
    renderWithProviders(<LocationTracker {...defaultProps} className="custom-class" />)
    
    const container = screen.getByText(/location tracking/i).closest('.location-tracker')
    expect(container).toHaveClass('custom-class')
  })

  it('handles high accuracy setting', async () => {
    const user = userEvent.setup()
    const requestLocationPermission = vi.fn(() => Promise.resolve({ granted: true }))
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7128, lng: -74.0060 }),
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission,
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert: vi.fn(),
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} enableHighAccuracy={true} />)
    
    const startButton = screen.getByRole('button', { name: /start tracking/i })
    await user.click(startButton)
    
    expect(requestLocationPermission).toHaveBeenCalledWith(true)
  })

  it('handles custom update interval', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<LocationTracker {...defaultProps} updateInterval={10000} />)
    
    const startButton = screen.getByRole('button', { name: /start tracking/i })
    await user.click(startButton)
    
    expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        maximumAge: 10000,
      })
    )
  })

  it('checks emergency proximity', () => {
    const mockEvents = [
      createMockEmergencyEvent({
        id: 'emergency-1',
        title: 'Test Fire',
        location: '40.7128 -74.0060',
        severity: 4,
      }),
    ]
    
    vi.mocked(require('@/store').useEmergencyStore).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
    })
    
    const addProximityAlert = vi.fn()
    
    vi.mocked(require('@/store').useLocationStore).mockReturnValue({
      currentLocation: createMockLocation({ lat: 40.7129, lng: -74.0061 }), // Very close to emergency
      setCurrentLocation: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      requestLocationPermission: vi.fn(() => Promise.resolve({ granted: true })),
      locationPermission: { granted: true },
      isTracking: false,
      geofences: [],
      proximityAlerts: [],
      addGeofence: vi.fn(),
      checkGeofences: vi.fn(),
      addProximityAlert,
    })
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    // Should check proximity and add alert
    expect(addProximityAlert).toHaveBeenCalled()
  })

  it('opens privacy settings when privacy button is clicked', async () => {
    const user = userEvent.setup()
    const originalOpen = window.open
    window.open = vi.fn()
    
    renderWithProviders(<LocationTracker {...defaultProps} />)
    
    const privacyButton = screen.getByRole('button', { name: /privacy settings/i })
    await user.click(privacyButton)
    
    expect(window.open).toHaveBeenCalledWith('/privacy', '_blank')
    
    window.open = originalOpen
  })

  it('cleans up geolocation watch on unmount', () => {
    const { unmount } = renderWithProviders(<LocationTracker {...defaultProps} />)
    
    // Start tracking to set up watch
    mockGeolocation.watchPosition.mockReturnValue(123) // Watch ID
    
    unmount()
    
    expect(mockGeolocation.clearWatch).toHaveBeenCalled()
  })
})