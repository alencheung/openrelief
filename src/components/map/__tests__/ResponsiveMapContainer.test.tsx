import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ResponsiveMapContainer, useResponsive, responsiveUtils } from '../ResponsiveMapContainer'
import { createTestUtils } from '@/test-utils'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

describe('ResponsiveMapContainer', () => {
  const { renderWithProviders } = createTestUtils()

  const defaultProps = {
    children: <div>Test Content</div>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders container with children', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} />)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByText('Test Content').parentElement).toHaveClass('responsive-map-container')
  })

  it('applies default breakpoint and orientation', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} />)

    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveAttribute('data-breakpoint', 'desktop')
    expect(container).toHaveAttribute('data-orientation', 'landscape')
  })

  it('applies custom className', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} className="custom-class" />)

    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('passes props to underlying div', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} data-testid="custom-container" />)

    expect(screen.getByTestId('custom-container')).toBeInTheDocument()
  })

  it('provides responsive context to children', () => {
    const TestChild = () => {
      const responsive = useResponsive()
      return (
        <div data-testid="test-child" data-breakpoint={responsive.breakpoint} data-orientation={responsive.orientation}>
          Test Child
        </div>
      )
    }

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps}>
        <TestChild />
      </ResponsiveMapContainer>
    )

    const child = screen.getByTestId('test-child')
    expect(child).toHaveAttribute('data-breakpoint', 'desktop')
    expect(child).toHaveAttribute('data-orientation', 'landscape')
  })

  it('detects mobile breakpoint', async () => {
    // Mock container width to simulate mobile
    const mockContainer = {
      clientWidth: 500,
      clientHeight: 800
    }

    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate mobile dimensions
        Object.defineProperty(element, 'clientWidth', { value: 500, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 800, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    const TestChild = () => {
      const responsive = useResponsive()
      return (
        <div data-testid="test-child" data-breakpoint={responsive.breakpoint}>
          Test Child
        </div>
      )
    }

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps}>
        <TestChild />
      </ResponsiveMapContainer>
    )

    await waitFor(() => {
      const child = screen.getByTestId('test-child')
      expect(child).toHaveAttribute('data-breakpoint', 'mobile')
    })
  })

  it('detects tablet breakpoint', async () => {
    // Mock container width to simulate tablet
    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate tablet dimensions
        Object.defineProperty(element, 'clientWidth', { value: 900, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 1200, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    const TestChild = () => {
      const responsive = useResponsive()
      return (
        <div data-testid="test-child" data-breakpoint={responsive.breakpoint}>
          Test Child
        </div>
      )
    }

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps}>
        <TestChild />
      </ResponsiveMapContainer>
    )

    await waitFor(() => {
      const child = screen.getByTestId('test-child')
      expect(child).toHaveAttribute('data-breakpoint', 'tablet')
    })
  })

  it('detects portrait orientation', async () => {
    // Mock container height > width to simulate portrait
    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate portrait dimensions
        Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 1200, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    const TestChild = () => {
      const responsive = useResponsive()
      return (
        <div data-testid="test-child" data-orientation={responsive.orientation}>
          Test Child
        </div>
      )
    }

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps}>
        <TestChild />
      </ResponsiveMapContainer>
    )

    await waitFor(() => {
      const child = screen.getByTestId('test-child')
      expect(child).toHaveAttribute('data-orientation', 'portrait')
    })
  })

  it('calls onBreakpointChange callback', async () => {
    const onBreakpointChange = vi.fn()

    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate mobile dimensions
        Object.defineProperty(element, 'clientWidth', { value: 500, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 800, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps} onBreakpointChange={onBreakpointChange} />
    )

    await waitFor(() => {
      expect(onBreakpointChange).toHaveBeenCalledWith('mobile')
    })
  })

  it('calls onOrientationChange callback', async () => {
    const onOrientationChange = vi.fn()

    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate portrait dimensions
        Object.defineProperty(element, 'clientWidth', { value: 800, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 1200, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps} onOrientationChange={onOrientationChange} />
    )

    await waitFor(() => {
      expect(onOrientationChange).toHaveBeenCalledWith('portrait')
    })
  })

  it('handles orientation change events', async () => {
    const onOrientationChange = vi.fn()

    renderWithProviders(
      <ResponsiveMapContainer {...defaultProps} onOrientationChange={onOrientationChange} />
    )

    // Simulate orientation change event
    fireEvent(window, new Event('orientationchange'))

    await waitFor(() => {
      // Should have been called (possibly with same value)
      expect(onOrientationChange).toHaveBeenCalled()
    })
  })

  it('applies responsive styles based on breakpoint', () => {
    vi.mocked(global.ResizeObserver).mockImplementation((callback) => ({
      observe: vi.fn((element) => {
        // Simulate mobile dimensions
        Object.defineProperty(element, 'clientWidth', { value: 500, configurable: true })
        Object.defineProperty(element, 'clientHeight', { value: 800, configurable: true })
        callback([{ target: element }])
      }),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))

    renderWithProviders(<ResponsiveMapContainer {...defaultProps} />)

    const container = screen.getByText('Test Content').parentElement

    await waitFor(() => {
      expect(container).toHaveStyle({
        '--map-legend-position': 'bottom-left',
        '--map-alerts-position': 'top-left',
        '--map-spatial-position': 'bottom-right',
        '--map-controls-size': 'sm',
        '--map-popup-width': '100vw',
        '--map-popup-position': 'bottom'
      })
    })
  })

  it('applies layout variant correctly', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} layout="fullscreen" />)

    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveClass('fixed', 'inset-0', 'z-50')
  })

  it('applies layout variant correctly', () => {
    renderWithProviders(<ResponsiveMapContainer {...defaultProps} layout="sidebar" />)

    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveClass('flex')
  })

  it('throws error when useResponsive is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const TestChild = () => {
      useResponsive()
      return <div>Test Child</div>
    }

    expect(() => {
      render(<TestChild />)
    }).toThrow('useResponsive must be used within a ResponsiveMapContainer')

    consoleSpy.mockRestore()
  })

  it('cleans up ResizeObserver on unmount', () => {
    const { unmount } = renderWithProviders(<ResponsiveMapContainer {...defaultProps} />)

    unmount()

    const mockObserver = vi.mocked(global.ResizeObserver).mock.results[0].value
    expect(mockObserver.disconnect).toHaveBeenCalled()
  })

  it('cleans up orientation change listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderWithProviders(<ResponsiveMapContainer {...defaultProps} />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})

describe('responsiveUtils', () => {
  it('correctly identifies mobile breakpoint', () => {
    expect(responsiveUtils.isMobile('mobile')).toBe(true)
    expect(responsiveUtils.isMobile('tablet')).toBe(false)
    expect(responsiveUtils.isMobile('desktop')).toBe(false)
  })

  it('correctly identifies tablet breakpoint', () => {
    expect(responsiveUtils.isTablet('mobile')).toBe(false)
    expect(responsiveUtils.isTablet('tablet')).toBe(true)
    expect(responsiveUtils.isTablet('desktop')).toBe(false)
  })

  it('correctly identifies desktop breakpoint', () => {
    expect(responsiveUtils.isDesktop('mobile')).toBe(false)
    expect(responsiveUtils.isDesktop('tablet')).toBe(false)
    expect(responsiveUtils.isDesktop('desktop')).toBe(true)
  })

  it('correctly identifies portrait orientation', () => {
    expect(responsiveUtils.isPortrait('portrait')).toBe(true)
    expect(responsiveUtils.isPortrait('landscape')).toBe(false)
  })

  it('correctly identifies landscape orientation', () => {
    expect(responsiveUtils.isLandscape('portrait')).toBe(false)
    expect(responsiveUtils.isLandscape('landscape')).toBe(true)
  })

  it('gets responsive value for mobile', () => {
    const values = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value'
    }

    expect(responsiveUtils.getResponsiveValue('mobile', values)).toBe('mobile-value')
  })

  it('gets responsive value for tablet', () => {
    const values = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value'
    }

    expect(responsiveUtils.getResponsiveValue('tablet', values)).toBe('tablet-value')
  })

  it('gets responsive value for desktop when tablet not specified', () => {
    const values = {
      mobile: 'mobile-value',
      desktop: 'desktop-value'
    }

    expect(responsiveUtils.getResponsiveValue('tablet', values)).toBe('desktop-value')
  })

  it('gets responsive value for desktop', () => {
    const values = {
      mobile: 'mobile-value',
      tablet: 'tablet-value',
      desktop: 'desktop-value'
    }

    expect(responsiveUtils.getResponsiveValue('desktop', values)).toBe('desktop-value')
  })

  it('gets map position for mobile', () => {
    expect(responsiveUtils.getMapPosition('mobile', 'top-right')).toBe('bottom-right')
    expect(responsiveUtils.getMapPosition('mobile', 'bottom-left')).toBe('bottom-left')
    expect(responsiveUtils.getMapPosition('mobile', 'bottom-right')).toBe('top-right')
  })

  it('gets map position for desktop', () => {
    expect(responsiveUtils.getMapPosition('desktop', 'top-right')).toBe('top-right')
    expect(responsiveUtils.getMapPosition('desktop', 'bottom-left')).toBe('bottom-left')
    expect(responsiveUtils.getMapPosition('desktop', 'bottom-right')).toBe('bottom-right')
  })

  it('gets map size for mobile', () => {
    expect(responsiveUtils.getMapSize('mobile', 'lg')).toBe('md')
    expect(responsiveUtils.getMapSize('mobile', 'xl')).toBe('md')
    expect(responsiveUtils.getMapSize('mobile', '2xl')).toBe('md')
  })

  it('gets map size for mobile', () => {
    expect(responsiveUtils.getMapSize('mobile', 'md')).toBe('sm')
    expect(responsiveUtils.getMapSize('mobile', 'sm')).toBe('sm')
    expect(responsiveUtils.getMapSize('mobile', 'xs')).toBe('xs')
  })

  it('gets map size for desktop', () => {
    expect(responsiveUtils.getMapSize('desktop', 'lg')).toBe('lg')
    expect(responsiveUtils.getMapSize('desktop', 'xl')).toBe('xl')
    expect(responsiveUtils.getMapSize('desktop', '2xl')).toBe('2xl')
  })

  it('gets map size for desktop', () => {
    expect(responsiveUtils.getMapSize('desktop', 'md')).toBe('md')
    expect(responsiveUtils.getMapSize('desktop', 'sm')).toBe('sm')
    expect(responsiveUtils.getMapSize('desktop', 'xs')).toBe('xs')
  })
})