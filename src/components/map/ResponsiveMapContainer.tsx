'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const responsiveContainerVariants = cva(
  'relative w-full h-full overflow-hidden',
  {
    variants: {
      breakpoint: {
        mobile: '',
        tablet: '',
        desktop: '',
      },
      layout: {
        default: '',
        fullscreen: 'fixed inset-0 z-50',
        sidebar: 'flex',
      }
    },
    defaultVariants: {
      breakpoint: 'desktop',
      layout: 'default',
    },
  }
)

export interface ResponsiveMapContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveContainerVariants> {
  children: React.ReactNode
  onBreakpointChange?: (breakpoint: 'mobile' | 'tablet' | 'desktop') => void
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

const ResponsiveMapContainer: React.FC<ResponsiveMapContainerProps> = ({
  className,
  children,
  onBreakpointChange,
  onOrientationChange,
  layout = 'default',
  ...props
}) => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const containerRef = useRef<HTMLDivElement>(null)

  // Breakpoint definitions
  const breakpoints = {
    mobile: 768,    // < 768px
    tablet: 1024,   // 768px - 1024px
    desktop: 1024,  // >= 1024px
  }

  // Determine current breakpoint
  const getCurrentBreakpoint = (width: number): Breakpoint => {
    if (width < breakpoints.mobile) return 'mobile'
    if (width < breakpoints.tablet) return 'tablet'
    return 'desktop'
  }

  // Determine current orientation
  const getCurrentOrientation = (width: number, height: number): Orientation => {
    return height > width ? 'portrait' : 'landscape'
  }

  // Handle resize events
  const handleResize = useCallback(() => {
    if (!containerRef.current) return

    const { clientWidth, clientHeight } = containerRef.current
    const newBreakpoint = getCurrentBreakpoint(clientWidth)
    const newOrientation = getCurrentOrientation(clientWidth, clientHeight)

    if (newBreakpoint !== breakpoint) {
      setBreakpoint(newBreakpoint)
      onBreakpointChange?.(newBreakpoint)
    }

    if (newOrientation !== orientation) {
      setOrientation(newOrientation)
      onOrientationChange?.(newOrientation)
    }
  }, [breakpoint, orientation, onBreakpointChange, onOrientationChange])

  // Set up resize observer
  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleResize)
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
      // Initial check
      handleResize()
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [handleResize])

  // Handle orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(handleResize, 100) // Small delay to get accurate dimensions
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    return () => window.removeEventListener('orientationchange', handleOrientationChange)
  }, [handleResize])

  // Responsive styles based on breakpoint
  const responsiveStyles = {
    '--map-legend-position': breakpoint === 'mobile' ? 'bottom-left' : 'bottom-left',
    '--map-alerts-position': breakpoint === 'mobile' ? 'top-left' : 'top-left',
    '--map-spatial-position': breakpoint === 'mobile' ? 'bottom-right' : 'top-right',
    '--map-controls-size': breakpoint === 'mobile' ? 'sm' : 'md',
    '--map-popup-width': breakpoint === 'mobile' ? '100vw' : 'md',
    '--map-popup-position': breakpoint === 'mobile' ? 'bottom' : 'bottom',
  } as React.CSSProperties

  return (
    <div
      ref={containerRef}
      className={cn(
        responsiveContainerVariants({ breakpoint, layout, className }),
        'responsive-map-container'
      )}
      style={responsiveStyles}
      data-breakpoint={breakpoint}
      data-orientation={orientation}
      {...props}
    >
      {/* Pass context to children */}
      <ResponsiveContext.Provider value={{ breakpoint, orientation }}>
        {children}
      </ResponsiveContext.Provider>
    </div>
  )
}

ResponsiveMapContainer.displayName = 'ResponsiveMapContainer'

// Context for providing responsive information to child components
export const ResponsiveContext = React.createContext<{
  breakpoint: Breakpoint
  orientation: Orientation
}>({
  breakpoint: 'desktop',
  orientation: 'landscape'
})

// Hook for consuming responsive context
export const useResponsive = () => {
  const context = React.useContext(ResponsiveContext)
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveMapContainer')
  }
  return context
}

// Responsive utility functions
export const responsiveUtils = {
  isMobile: (breakpoint: Breakpoint) => breakpoint === 'mobile',
  isTablet: (breakpoint: Breakpoint) => breakpoint === 'tablet',
  isDesktop: (breakpoint: Breakpoint) => breakpoint === 'desktop',
  isPortrait: (orientation: Orientation) => orientation === 'portrait',
  isLandscape: (orientation: Orientation) => orientation === 'landscape',
  
  // Get responsive value based on breakpoint
  getResponsiveValue: <T>(breakpoint: Breakpoint, values: {
    mobile?: T
    tablet?: T
    desktop: T
  }): T => {
    switch (breakpoint) {
      case 'mobile':
        return values.mobile !== undefined ? values.mobile : values.desktop
      case 'tablet':
        return values.tablet !== undefined ? values.tablet : values.desktop
      case 'desktop':
      default:
        return values.desktop
    }
  },
  
  // Get responsive position for map elements
  getMapPosition: (breakpoint: Breakpoint, defaultPosition: string) => {
    // Adjust positions for mobile to avoid overlap
    if (breakpoint === 'mobile') {
      switch (defaultPosition) {
        case 'top-right':
          return 'bottom-right'
        case 'bottom-left':
          return 'bottom-left'
        case 'bottom-right':
          return 'top-right'
        default:
          return defaultPosition
      }
    }
    return defaultPosition
  },
  
  // Get responsive size for map elements
  getMapSize: (breakpoint: Breakpoint, defaultSize: string) => {
    if (breakpoint === 'mobile') {
      switch (defaultSize) {
        case 'lg':
        case 'xl':
        case '2xl':
          return 'md'
        case 'md':
          return 'sm'
        default:
          return defaultSize
      }
    }
    return defaultSize
  }
}

export { ResponsiveMapContainer, responsiveContainerVariants }