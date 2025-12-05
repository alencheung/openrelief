'use client'

import { useState, useEffect } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
export type Orientation = 'portrait' | 'landscape'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface MobileDetectionState {
  breakpoint: Breakpoint
  orientation: Orientation
  deviceType: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  isSmallScreen: boolean
  isMediumScreen: boolean
  isLargeScreen: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
}

const breakpointValues: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1792,
}

const deviceBreakpoints: Record<DeviceType, { min: number; max: number }> = {
  mobile: { min: 0, max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024, max: Infinity },
}

export function useMobileDetection(): MobileDetectionState {
  const [state, setState] = useState<MobileDetectionState>(() => 
    getInitialState()
  )

  function getInitialState(): MobileDetectionState {
    if (typeof window === 'undefined') {
      return getDefaultState()
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = window.devicePixelRatio || 1

    return {
      ...calculateState(width, height, pixelRatio),
      screenWidth: width,
      screenHeight: height,
      pixelRatio,
    }
  }

  function getDefaultState(): MobileDetectionState {
    return {
      breakpoint: 'md',
      orientation: 'landscape',
      deviceType: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isSmallScreen: false,
      isMediumScreen: false,
      isLargeScreen: true,
      screenWidth: 1024,
      screenHeight: 768,
      pixelRatio: 1,
    }
  }

  function calculateState(width: number, height: number, pixelRatio: number): Omit<MobileDetectionState, 'screenWidth' | 'screenHeight' | 'pixelRatio'> {
    const breakpoint = getCurrentBreakpoint(width)
    const orientation = height > width ? 'portrait' : 'landscape'
    const deviceType = getCurrentDeviceType(width)
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    return {
      breakpoint,
      orientation,
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTouch,
      isSmallScreen: width < 768,
      isMediumScreen: width >= 768 && width < 1024,
      isLargeScreen: width >= 1024,
    }
  }

  function getCurrentBreakpoint(width: number): Breakpoint {
    const breakpoints = Object.entries(breakpointValues).reverse() as [Breakpoint, number][]
    return breakpoints.find(([_, value]) => width >= value)?.[0] || 'xs'
  }

  function getCurrentDeviceType(width: number): DeviceType {
    if (width <= deviceBreakpoints.mobile.max) return 'mobile'
    if (width <= deviceBreakpoints.tablet.max) return 'tablet'
    return 'desktop'
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    let resizeTimer: NodeJS.Timeout

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        const pixelRatio = window.devicePixelRatio || 1

        setState(prev => ({
          ...prev,
          ...calculateState(width, height, pixelRatio),
          screenWidth: width,
          screenHeight: height,
          pixelRatio,
        }))
      }, 100)
    }

    const handleOrientationChange = () => {
      // Small delay to get accurate dimensions after orientation change
      setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      clearTimeout(resizeTimer)
    }
  }, [])

  return state
}

// Utility function to get responsive value based on breakpoint
export function getResponsiveValue<T>(
  breakpoint: Breakpoint,
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  // Find the first value that matches or is smaller than current breakpoint
  const breakpointOrder: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp]!
    }
  }
  
  return defaultValue
}

// Utility function to check if viewport is in range
export function isViewportInRange(
  width: number,
  min: Breakpoint | number,
  max: Breakpoint | number
): boolean {
  const minWidth = typeof min === 'string' ? breakpointValues[min] : min
  const maxWidth = typeof max === 'string' ? breakpointValues[max] : max
  
  return width >= minWidth && width < maxWidth
}

// Hook for responsive values that change based on breakpoint
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  const { breakpoint } = useMobileDetection()
  return getResponsiveValue(breakpoint, values, defaultValue)
}

// Hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

// Common media query hooks
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)')
}

export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)')
}

export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return isTouch
}

export function useIsHighDensity(): boolean {
  return useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)')
}

export function useIsReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function useIsDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}