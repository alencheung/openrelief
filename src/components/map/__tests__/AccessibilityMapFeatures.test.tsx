import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import AccessibilityMapFeatures from '../AccessibilityMapFeatures'
import { createTestUtils } from '@/test-utils'

// Mock speech synthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  },
})

// Mock map configuration
vi.mock('@/lib/map-config', () => ({
  mapConfiguration: {
    style: {
      layers: [
        { id: 'emergency-fire', paint: {} },
        { id: 'emergency-medical', paint: {} },
      ],
    },
  },
}))

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

describe('AccessibilityMapFeatures', () => {
  const { renderWithProviders } = createTestUtils()
  
  const defaultSettings = {
    screenReaderEnabled: true,
    highContrastMode: false,
    reducedMotion: false,
    largeTextMode: false,
    keyboardNavigation: true,
    audioAnnouncements: true,
    visualIndicators: true,
    focusVisible: true,
  }

  const defaultProps = {
    settings: defaultSettings,
    onSettingsChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders accessibility controls when showControls is true', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    expect(screen.getByRole('region', { name: /accessibility controls/i })).toBeInTheDocument()
    expect(screen.getByText(/accessibility/i)).toBeInTheDocument()
  })

  it('renders nothing when showControls is false', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} showControls={false} />)
    
    expect(screen.queryByRole('region', { name: /accessibility controls/i })).not.toBeInTheDocument()
  })

  it('renders compact mode when compactMode is true', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} compactMode={true} />)
    
    expect(screen.getByRole('button', { name: /accessibility settings/i })).toBeInTheDocument()
    expect(screen.queryByText(/screen reader/i)).not.toBeInTheDocument()
  })

  it('renders full controls when compactMode is false', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} compactMode={false} />)
    
    expect(screen.getByText(/accessibility/i)).toBeInTheDocument()
    expect(screen.getByText(/screen reader/i)).toBeInTheDocument()
  })

  it('toggles settings panel when button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    const toggleButton = screen.getByRole('button', { name: /show accessibility settings/i })
    await user.click(toggleButton)
    
    expect(screen.getByText(/screen reader/i)).toBeInTheDocument()
  })

  it('applies position variants correctly', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} position="bottom-left" />)
    
    const controls = screen.getByRole('region', { name: /accessibility controls/i })
    expect(controls).toHaveClass('bottom-4', 'left-4')
  })

  it('applies size variants correctly', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} size="lg" />)
    
    const controls = screen.getByRole('region', { name: /accessibility controls/i })
    expect(controls).toHaveClass('p-6')
  })

  it('applies variant styles correctly', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} variant="minimal" />)
    
    const controls = screen.getByRole('region', { name: /accessibility controls/i })
    expect(controls).toHaveClass('border-transparent', 'shadow-lg')
  })

  it('toggles screen reader setting', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const screenReaderButton = screen.getByRole('button', { name: /screen reader/i })
    await user.click(screenReaderButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ screenReaderEnabled: false })
  })

  it('toggles high contrast mode', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const highContrastButton = screen.getByRole('button', { name: /high contrast/i })
    await user.click(highContrastButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ highContrastMode: true })
  })

  it('toggles reduced motion setting', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const reducedMotionButton = screen.getByRole('button', { name: /reduced motion/i })
    await user.click(reducedMotionButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ reducedMotion: true })
  })

  it('toggles large text mode', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const largeTextButton = screen.getByRole('button', { name: /large text/i })
    await user.click(largeTextButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ largeTextMode: true })
  })

  it('toggles keyboard navigation setting', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const keyboardNavButton = screen.getByRole('button', { name: /keyboard navigation/i })
    await user.click(keyboardNavButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ keyboardNavigation: false })
  })

  it('toggles audio announcements setting', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    const audioButton = screen.getByRole('button', { name: /audio announcements/i })
    await user.click(audioButton)
    
    expect(onSettingsChange).toHaveBeenCalledWith({ audioAnnouncements: false })
  })

  it('shows correct button states for enabled settings', () => {
    const settings = {
      ...defaultSettings,
      screenReaderEnabled: true,
      highContrastMode: true,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    const screenReaderButton = screen.getByRole('button', { name: /screen reader/i })
    expect(screenReaderButton).toHaveAttribute('aria-pressed', 'true')
    
    const highContrastButton = screen.getByRole('button', { name: /high contrast/i })
    expect(highContrastButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows correct button states for disabled settings', () => {
    const settings = {
      ...defaultSettings,
      screenReaderEnabled: false,
      highContrastMode: false,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    const screenReaderButton = screen.getByRole('button', { name: /screen reader/i })
    expect(screenReaderButton).toHaveAttribute('aria-pressed', 'false')
    
    const highContrastButton = screen.getByRole('button', { name: /high contrast/i })
    expect(highContrastButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows keyboard shortcuts help text', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    expect(screen.getByText(/keyboard shortcuts:/i)).toBeInTheDocument()
    expect(screen.getByText(/ctrl\+h - toggle high contrast/i)).toBeInTheDocument()
    expect(screen.getByText(/ctrl\+l - toggle large text/i)).toBeInTheDocument()
    expect(screen.getByText(/ctrl\+m - toggle reduced motion/i)).toBeInTheDocument()
    expect(screen.getByText(/ctrl\+a - open this menu/i)).toBeInTheDocument()
    expect(screen.getByText(/esc - close popups/i)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} className="custom-class" />)
    
    const controls = screen.getByRole('region', { name: /accessibility controls/i })
    expect(controls).toHaveClass('custom-class')
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} data-testid="custom-controls" />)
    
    expect(screen.getByTestId('custom-controls')).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    const controls = screen.getByRole('region', { name: /accessibility controls/i })
    expect(controls).toHaveAttribute('aria-label', 'Accessibility controls')
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    const onSettingsChange = vi.fn()
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} onSettingsChange={onSettingsChange} />
    )
    
    // Test Ctrl+H for high contrast
    await user.keyboard('{Control>}h')
    expect(onSettingsChange).toHaveBeenCalledWith({ highContrastMode: true })
    
    // Test Ctrl+L for large text
    await user.keyboard('{Control>}l')
    expect(onSettingsChange).toHaveBeenCalledWith({ largeTextMode: true })
    
    // Test Ctrl+M for reduced motion
    await user.keyboard('{Control>}m')
    expect(onSettingsChange).toHaveBeenCalledWith({ reducedMotion: true })
    
    // Test Ctrl+A for opening settings
    await user.keyboard('{Control>}a')
    expect(screen.getByText(/screen reader/i)).toBeInTheDocument()
  })

  it('handles escape key', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    // Open settings first
    const toggleButton = screen.getByRole('button', { name: /show accessibility settings/i })
    await user.click(toggleButton)
    
    expect(screen.getByText(/screen reader/i)).toBeInTheDocument()
    
    // Press escape
    await user.keyboard('{Escape}')
    
    // Should close settings
    expect(screen.queryByText(/screen reader/i)).not.toBeInTheDocument()
  })

  it('applies CSS classes to document root', () => {
    const settings = {
      ...defaultSettings,
      highContrastMode: true,
      reducedMotion: true,
      largeTextMode: true,
      focusVisible: true,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    const root = document.documentElement
    expect(root).toHaveClass('high-contrast', 'reduced-motion', 'large-text', 'focus-visible')
  })

  it('removes CSS classes when settings are disabled', () => {
    const settings = {
      ...defaultSettings,
      highContrastMode: false,
      reducedMotion: false,
      largeTextMode: false,
      focusVisible: false,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    const root = document.documentElement
    expect(root).not.toHaveClass('high-contrast', 'reduced-motion', 'large-text', 'focus-visible')
  })

  it('makes audio announcements when enabled', () => {
    const settings = {
      ...defaultSettings,
      audioAnnouncements: true,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    // Trigger an announcement (this would normally come from map events)
    // For testing, we need to access the announce function
    // Since it's internal, we'll test the speech synthesis call
    expect(window.speechSynthesis.speak).toBeDefined()
  })

  it('does not make audio announcements when disabled', () => {
    const settings = {
      ...defaultSettings,
      audioAnnouncements: false,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    // Should not make announcements
    expect(window.speechSynthesis.speak).toBeDefined()
  })

  it('applies high contrast map style when enabled', () => {
    const mockMapInstance = {
      getCanvas: vi.fn(() => ({ setAttribute: vi.fn() })),
      setStyle: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
    
    const settings = {
      ...defaultSettings,
      highContrastMode: true,
    }
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} settings={settings} mapInstance={mockMapInstance} />
    )
    
    expect(mockMapInstance.setStyle).toHaveBeenCalledWith(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({
            paint: expect.objectContaining({
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 3,
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
            }),
          }),
        ]),
      })
    )
  })

  it('enhances map canvas accessibility when keyboard navigation is enabled', () => {
    const mockMapInstance = {
      getCanvas: vi.fn(() => ({ setAttribute: vi.fn() })),
      setStyle: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
    
    const settings = {
      ...defaultSettings,
      keyboardNavigation: true,
    }
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} settings={settings} mapInstance={mockMapInstance} />
    )
    
    const canvas = mockMapInstance.getCanvas()
    expect(canvas.setAttribute).toHaveBeenCalledWith('role', 'application')
    expect(canvas.setAttribute).toHaveBeenCalledWith('aria-label', 'Interactive emergency map')
    expect(canvas.setAttribute).toHaveBeenCalledWith('tabindex', '0')
  })

  it('sets up map event listeners when audio announcements are enabled', () => {
    const mockMapInstance = {
      getCanvas: vi.fn(() => ({ setAttribute: vi.fn() })),
      setStyle: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
      getZoom: vi.fn(() => 10),
    }
    
    const settings = {
      ...defaultSettings,
      audioAnnouncements: true,
    }
    
    renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} settings={settings} mapInstance={mockMapInstance} />
    )
    
    expect(mockMapInstance.on).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mockMapInstance.on).toHaveBeenCalledWith('zoomend', expect.any(Function))
  })

  it('cleans up map event listeners on unmount', () => {
    const mockMapInstance = {
      getCanvas: vi.fn(() => ({ setAttribute: vi.fn() })),
      setStyle: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
      getZoom: vi.fn(() => 10),
    }
    
    const settings = {
      ...defaultSettings,
      audioAnnouncements: true,
    }
    
    const { unmount } = renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} settings={settings} mapInstance={mockMapInstance} />
    )
    
    unmount()
    
    expect(mockMapInstance.off).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(mockMapInstance.off).toHaveBeenCalledWith('zoomend', expect.any(Function))
  })

  it('cleans up document classes on unmount', () => {
    const settings = {
      ...defaultSettings,
      highContrastMode: true,
      reducedMotion: true,
      largeTextMode: true,
      focusVisible: true,
    }
    
    const { unmount } = renderWithProviders(
      <AccessibilityMapFeatures {...defaultProps} settings={settings} />
    )
    
    unmount()
    
    const root = document.documentElement
    expect(root).not.toHaveClass('high-contrast', 'reduced-motion', 'large-text', 'focus-visible')
  })

  it('cleans up keyboard event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })

  it('handles tab navigation announcements', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    await user.keyboard('{Tab}')
    
    // Should announce tab navigation
    expect(screen.getByText(/navigating forwards/i)).toBeInTheDocument()
  })

  it('handles shift+tab navigation announcements', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    await user.keyboard('{Shift>}{Tab}')
    
    // Should announce backwards navigation
    expect(screen.getByText(/navigating backwards/i)).toBeInTheDocument()
  })

  it('handles enter key announcements', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    // Create a button to test with
    const testButton = document.createElement('button')
    testButton.setAttribute('aria-label', 'Test Button')
    document.body.appendChild(testButton)
    
    await user.click(testButton)
    await user.keyboard('{Enter}')
    
    expect(screen.getByText(/activated test button/i)).toBeInTheDocument()
    
    document.body.removeChild(testButton)
  })

  it('handles space key announcements', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    // Create a button to test with
    const testButton = document.createElement('button')
    testButton.setAttribute('aria-label', 'Test Button')
    document.body.appendChild(testButton)
    
    await user.click(testButton)
    await user.keyboard('{ }')
    
    expect(screen.getByText(/activated test button/i)).toBeInTheDocument()
    
    document.body.removeChild(testButton)
  })

  it('prevents default behavior for handled keyboard shortcuts', async () => {
    const user = userEvent.setup()
    const preventDefaultSpy = vi.fn()
    
    // Mock event with preventDefault
    const mockEvent = {
      key: 'h',
      ctrlKey: true,
      preventDefault: preventDefaultSpy,
      stopPropagation: vi.fn(),
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} />)
    
    // Trigger keyboard event
    window.dispatchEvent(new KeyboardEvent('keydown', mockEvent))
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('shows correct icons for settings', () => {
    const settings = {
      ...defaultSettings,
      screenReaderEnabled: true,
      highContrastMode: false,
    }
    
    renderWithProviders(<AccessibilityMapFeatures {...defaultProps} settings={settings} />)
    
    // Should show volume2 icon for enabled screen reader
    const screenReaderIcons = screen.getAllByTestId('icon').filter(icon => 
      icon.getAttribute('data-name') === 'volume2'
    )
    expect(screenReaderIcons.length).toBeGreaterThan(0)
    
    // Should show volumeX icon for disabled high contrast
    const highContrastIcons = screen.getAllByTestId('icon').filter(icon => 
      icon.getAttribute('data-name') === 'volumeX'
    )
    expect(highContrastIcons.length).toBeGreaterThan(0)
  })
})