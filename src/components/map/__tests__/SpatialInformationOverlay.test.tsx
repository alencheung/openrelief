import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import SpatialInformationOverlay from '../SpatialInformationOverlay'
import { createTestUtils } from '@/test-utils'

// Mock UI components
vi.mock('@/components/ui', () => ({
  Icon: ({ name, size, variant, className }: any) => (
    <div data-testid="icon" data-name={name} data-size={size} data-variant={variant} className={className}>
      {name}
    </div>
  ),
  EnhancedCard: ({ children, className, ...props }: any) => (
    <div data-testid="enhanced-card" className={className} {...props}>
      {children}
    </div>
  ),
  EnhancedButton: ({ children, onClick, variant, size, leftIcon, className, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} {...props}>
      {leftIcon}
      {children}
    </button>
  ),
}))

describe('SpatialInformationOverlay', () => {
  const { renderWithProviders } = createTestUtils()
  
  const defaultSpatialInfo = {
    distance: 500,
    estimatedTime: 8,
    areaRadius: 1000,
    coordinates: [40.7128, -74.0060],
    bearing: 45,
    speed: 60,
    accuracy: 10,
  }

  const defaultProps = {
    spatialInfo: defaultSpatialInfo,
    onUnitChange: vi.fn(),
    onToggleOverlay: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders spatial information overlay', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    expect(screen.getByRole('region', { name: /spatial information overlay/i })).toBeInTheDocument()
    expect(screen.getByText(/spatial info/i)).toBeInTheDocument()
  })

  it('displays distance information', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    expect(screen.getByText(/distance/i)).toBeInTheDocument()
    expect(screen.getByText('500m')).toBeInTheDocument()
  })

  it('displays time estimate', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    expect(screen.getByText(/est\. time/i)).toBeInTheDocument()
    expect(screen.getByText('8min')).toBeInTheDocument()
  })

  it('displays area radius', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    expect(screen.getByText(/radius/i)).toBeInTheDocument()
    expect(screen.getByText('1000m')).toBeInTheDocument()
  })

  it('displays coordinates', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} showCoordinates={true} />)
    
    expect(screen.getByText(/coordinates/i)).toBeInTheDocument()
    expect(screen.getByText(/40°42'46"N, 74°00'21"W/i)).toBeInTheDocument()
  })

  it('displays bearing', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} showBearing={true} />)
    
    expect(screen.getByText(/bearing/i)).toBeInTheDocument()
    expect(screen.getByText('45° NE/i)).toBeInTheDocument()
  })

  it('displays speed', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} showSpeed={true} />)
    
    expect(screen.getByText(/speed/i)).toBeInTheDocument()
    expect(screen.getByText('60 km/h')).toBeInTheDocument()
  })

  it('displays accuracy', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument()
    expect(screen.getByText('±10m')).toBeInTheDocument()
  })

  it('hides information when show props are false', () => {
    renderWithProviders(
      <SpatialInformationOverlay 
        {...defaultProps} 
        showDistance={false}
        showTimeEstimate={false}
        showAreaRadius={false}
        showCoordinates={false}
        showBearing={false}
        showSpeed={false}
        showAccuracy={false}
      />
    )
    
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/est\. time/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/radius/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bearing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/speed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument()
  })

  it('formats distance in metric system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="metric" />)
    
    expect(screen.getByText('500m')).toBeInTheDocument()
  })

  it('formats distance in imperial system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="imperial" />)
    
    expect(screen.getByText('1640ft')).toBeInTheDocument()
  })

  it('formats distance over 1km in metric', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      distance: 1500,
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} unitSystem="metric" />)
    
    expect(screen.getByText('1.5km')).toBeInTheDocument()
  })

  it('formats distance over 1 mile in imperial', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      distance: 2000, // ~6561ft
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} unitSystem="imperial" />)
    
    expect(screen.getByText('1.2mi')).toBeInTheDocument()
  })

  it('formats time in minutes', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      estimatedTime: 30,
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} />)
    
    expect(screen.getByText('30min')).toBeInTheDocument()
  })

  it('formats time in hours and minutes', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      estimatedTime: 90, // 1.5 hours
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} />)
    
    expect(screen.getByText('1h 30min')).toBeInTheDocument()
  })

  it('formats area radius in metric system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="metric" />)
    
    expect(screen.getByText('1000m')).toBeInTheDocument()
  })

  it('formats area radius in imperial system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="imperial" />)
    
    expect(screen.getByText('3281ft')).toBeInTheDocument()
  })

  it('formats area radius over 1km in metric', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      areaRadius: 2500,
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} unitSystem="metric" />)
    
    expect(screen.getByText('2.5km')).toBeInTheDocument()
  })

  it('formats area radius over 1 mile in imperial', () => {
    const spatialInfo = {
      ...defaultSpatialInfo,
      areaRadius: 3000, // ~9842ft
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} unitSystem="imperial" />)
    
    expect(screen.getByText('1.9mi')).toBeInTheDocument()
  })

  it('formats coordinates with default precision', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} showCoordinates={true} />)
    
    expect(screen.getByText(/40°42'46"N, 74°00'21"W/i)).toBeInTheDocument()
  })

  it('formats coordinates with custom precision', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} showCoordinates={true} />)
    
    // Check that coordinates are formatted with 6 decimal places by default
    expect(screen.getByText(/40°42'46"N, 74°00'21"W/i)).toBeInTheDocument()
  })

  it('calculates bearing direction correctly', () => {
    const bearingTests = [
      { bearing: 0, expected: 'N' },
      { bearing: 45, expected: 'NE' },
      { bearing: 90, expected: 'E' },
      { bearing: 135, expected: 'SE' },
      { bearing: 180, expected: 'S' },
      { bearing: 225, expected: 'SW' },
      { bearing: 270, expected: 'W' },
      { bearing: 315, expected: 'NW' },
    ]
    
    bearingTests.forEach(({ bearing, expected }) => {
      const spatialInfo = { ...defaultSpatialInfo, bearing }
      
      const { unmount } = renderWithProviders(
        <SpatialInformationOverlay {...defaultProps} spatialInfo={spatialInfo} showBearing={true} />
      )
      
      expect(screen.getByText(`${bearing}° ${expected}`)).toBeInTheDocument()
      
      unmount()
    })
  })

  it('formats speed in metric system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="metric" />)
    
    expect(screen.getByText('60 km/h')).toBeInTheDocument()
  })

  it('formats speed in imperial system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="imperial" />)
    
    expect(screen.getByText('37 mph')).toBeInTheDocument()
  })

  it('formats accuracy in metric system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="metric" />)
    
    expect(screen.getByText('±10m')).toBeInTheDocument()
  })

  it('formats accuracy in imperial system', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} unitSystem="imperial" />)
    
    expect(screen.getByText('±33ft')).toBeInTheDocument()
  })

  it('shows correct icons', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    const icons = screen.getAllByTestId('icon')
    
    // Should have navigation icon for spatial info header
    const navigationIcon = icons.find(icon => icon.getAttribute('data-name') === 'navigation')
    expect(navigationIcon).toBeInTheDocument()
    
    // Should have route icon for distance
    const routeIcon = icons.find(icon => icon.getAttribute('data-name') === 'route')
    expect(routeIcon).toBeInTheDocument()
    
    // Should have clock icon for time
    const clockIcon = icons.find(icon => icon.getAttribute('data-name') === 'clock')
    expect(clockIcon).toBeInTheDocument()
    
    // Should have target icon for radius
    const targetIcon = icons.find(icon => icon.getAttribute('data-name') === 'target')
    expect(targetIcon).toBeInTheDocument()
    
    // Should have compass icon for coordinates
    const compassIcon = icons.find(icon => icon.getAttribute('data-name') === 'compass')
    expect(compassIcon).toBeInTheDocument()
    
    // Should have activity icon for speed
    const activityIcon = icons.find(icon => icon.getAttribute('data-name') === 'activity')
    expect(activityIcon).toBeInTheDocument()
  })

  it('applies animation when enabled', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} animated={true} />)
    
    const animatedElements = screen.getAllByText(/500m|8min|1000m|45°|60 km\/h|±10m/)
    animatedElements.forEach(element => {
      expect(element).toHaveClass('animate-pulse')
    })
  })

  it('does not apply animation when disabled', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} animated={false} />)
    
    const animatedElements = screen.getAllByText(/500m|8min|1000m|45°|60 km\/h|±10m/)
    animatedElements.forEach(element => {
      expect(element).not.toHaveClass('animate-pulse')
    })
  })

  it('applies position variants correctly', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} position="bottom-left" />)
    
    const overlay = screen.getByRole('region', { name: /spatial information overlay/i })
    expect(overlay).toHaveClass('bottom-4', 'left-4')
  })

  it('applies size variants correctly', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} size="lg" />)
    
    const overlay = screen.getByRole('region', { name: /spatial information overlay/i })
    expect(overlay).toHaveClass('max-w-md')
  })

  it('applies variant styles correctly', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} variant="minimal" />)
    
    const overlay = screen.getByRole('region', { name: /spatial information overlay/i })
    expect(overlay).toHaveClass('p-2')
  })

  it('toggles unit system', async () => {
    const user = userEvent.setup()
    const onUnitChange = vi.fn()
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} onUnitChange={onUnitChange} />)
    
    const unitToggle = screen.getByRole('button', { name: /switch to imperial units/i })
    await user.click(unitToggle)
    
    expect(onUnitChange).toHaveBeenCalledWith('imperial')
  })

  it('toggles overlay visibility', async () => {
    const user = userEvent.setup()
    const onToggleOverlay = vi.fn()
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} onToggleOverlay={onToggleOverlay} />)
    
    const visibilityToggle = screen.getByRole('button', { name: /hide spatial information/i })
    await user.click(visibilityToggle)
    
    expect(onToggleOverlay).toHaveBeenCalledWith(false)
  })

  it('shows show button when overlay is hidden', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    // Initially visible
    expect(screen.queryByRole('button', { name: /show spatial information/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide spatial information/i })).toBeInTheDocument()
  })

  it('handles escape key to hide overlay', async () => {
    const user = userEvent.setup()
    const onToggleOverlay = vi.fn()
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} onToggleOverlay={onToggleOverlay} />)
    
    await user.keyboard('{Escape}')
    
    expect(onToggleOverlay).toHaveBeenCalledWith(false)
  })

  it('shows interactive controls when enabled', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} interactive={true} />)
    
    // Expand details first to show interactive controls
    const expandButton = screen.getByRole('button', { name: /expand details/i })
    userEvent.click(expandButton)
    
    expect(screen.getByRole('button', { name: /refresh spatial information/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spatial information settings/i })).toBeInTheDocument()
  })

  it('hides interactive controls when disabled', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} interactive={false} />)
    
    // Expand details
    const expandButton = screen.getByRole('button', { name: /expand details/i })
    userEvent.click(expandButton)
    
    expect(screen.queryByRole('button', { name: /refresh spatial information/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spatial information settings/i })).not.toBeInTheDocument()
  })

  it('expands and collapses details', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    // Initially collapsed
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
    
    // Expand details
    const expandButton = screen.getByRole('button', { name: /expand details/i })
    await user.click(expandButton)
    
    // Should show expanded content
    expect(screen.getByText(/coordinates/i)).toBeInTheDocument()
    
    // Collapse details
    await user.click(expandButton)
    
    // Should hide expanded content
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
  })

  it('shows last updated time when interactive', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} interactive={true} />)
    
    // Expand details
    const expandButton = screen.getByRole('button', { name: /expand details/i })
    await user.click(expandButton)
    
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} className="custom-class" />)
    
    const overlay = screen.getByRole('region', { name: /spatial information overlay/i })
    expect(overlay).toHaveClass('custom-class')
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} data-testid="custom-overlay" />)
    
    expect(screen.getByTestId('custom-overlay')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    const overlay = screen.getByRole('region', { name: /spatial information overlay/i })
    expect(overlay).toHaveAttribute('aria-label', 'Spatial information overlay')
  })

  it('has correct ARIA attributes for expand button', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    const expandButton = screen.getByRole('button', { name: /expand details/i })
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    expect(expandButton).toHaveAttribute('aria-controls')
  })

  it('has correct ARIA attributes for unit toggle', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    const unitToggle = screen.getByRole('button', { name: /switch to imperial units/i })
    expect(unitToggle).toHaveAttribute('aria-label')
  })

  it('has correct ARIA attributes for visibility toggle', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} />)
    
    const visibilityToggle = screen.getByRole('button', { name: /hide spatial information/i })
    expect(visibilityToggle).toHaveAttribute('aria-label')
  })

  it('handles missing spatial info properties', () => {
    const emptySpatialInfo = {}
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={emptySpatialInfo} />)
    
    // Should not show any detailed information
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/est\. time/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/radius/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bearing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/speed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument()
  })

  it('handles null spatial info', () => {
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={null} />)
    
    // Should not show any detailed information
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/est\. time/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/radius/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bearing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/speed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument()
  })

  it('handles undefined spatial info properties', () => {
    const undefinedSpatialInfo = {
      distance: undefined,
      estimatedTime: undefined,
      areaRadius: undefined,
      coordinates: undefined,
      bearing: undefined,
      speed: undefined,
      accuracy: undefined,
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={undefinedSpatialInfo} />)
    
    // Should not show any detailed information
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/est\. time/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/radius/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/coordinates/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bearing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/speed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/accuracy/i)).not.toBeInTheDocument()
  })

  it('handles zero values', () => {
    const zeroSpatialInfo = {
      distance: 0,
      estimatedTime: 0,
      areaRadius: 0,
      bearing: 0,
      speed: 0,
      accuracy: 0,
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={zeroSpatialInfo} />)
    
    expect(screen.getByText('0m')).toBeInTheDocument()
    expect(screen.getByText('0min')).toBeInTheDocument()
    expect(screen.getByText('0m')).toBeInTheDocument() // radius
    expect(screen.getByText('0° N')).toBeInTheDocument() // bearing
    expect(screen.getByText('0 km/h')).toBeInTheDocument()
    expect(screen.getByText('±0m')).toBeInTheDocument()
  })

  it('handles very large values', () => {
    const largeSpatialInfo = {
      distance: 50000, // 50km
      estimatedTime: 300, // 5 hours
      areaRadius: 10000, // 10km
      bearing: 359,
      speed: 200, // 200 km/h
      accuracy: 1000, // 1km accuracy
    }
    
    renderWithProviders(<SpatialInformationOverlay {...defaultProps} spatialInfo={largeSpatialInfo} unitSystem="metric" />)
    
    expect(screen.getByText('50.0km')).toBeInTheDocument()
    expect(screen.getByText('5h 0min')).toBeInTheDocument()
    expect(screen.getByText('10.0km')).toBeInTheDocument()
    expect(screen.getByText('359° N')).toBeInTheDocument()
    expect(screen.getByText('200 km/h')).toBeInTheDocument()
    expect(screen.getByText('±1000m')).toBeInTheDocument()
  })
})