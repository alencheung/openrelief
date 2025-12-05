'use client'

import { useEffect, useState, useCallback } from 'react'

export interface ReducedMotionOptions {
  /**
   * Initial value for reduced motion preference
   */
  initialValue?: boolean
  /**
   * Whether to listen for system preference changes
   */
  listenForChanges?: boolean
  /**
   * Custom media query to check
   */
  mediaQuery?: string
  /**
   * Callback when reduced motion preference changes
   */
  onChange?: (prefersReducedMotion: boolean) => void
}

export interface ReducedMotionState {
  /**
   * Whether user prefers reduced motion
   */
  prefersReducedMotion: boolean
  /**
   * Whether the current environment supports reduced motion detection
   */
  isSupported: boolean
  /**
   * The current media query match state
   */
  mediaQueryMatch: MediaQueryList | null
}

/**
 * Hook for detecting and respecting user's reduced motion preferences
 */
export function useReducedMotion(options: ReducedMotionOptions = {}) {
  const {
    initialValue = false,
    listenForChanges = true,
    mediaQuery = '(prefers-reduced-motion: reduce)',
    onChange,
  } = options

  const [state, setState] = useState<ReducedMotionState>(() => ({
    prefersReducedMotion: initialValue,
    isSupported: typeof window !== 'undefined' && 'matchMedia' in window,
    mediaQueryMatch: null,
  }))

  /**
   * Update reduced motion state
   */
  const updateState = useCallback((prefersReducedMotion: boolean, mediaQueryMatch: MediaQueryList | null) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        prefersReducedMotion,
        mediaQueryMatch,
      }
      
      // Only call onChange if the value actually changed
      if (prevState.prefersReducedMotion !== prefersReducedMotion) {
        onChange?.(prefersReducedMotion)
      }
      
      return newState
    })
  }, [onChange])

  /**
   * Check reduced motion preference
   */
  const checkReducedMotion = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      updateState(false, null)
      return
    }

    try {
      const mediaQueryMatch = window.matchMedia(mediaQuery)
      updateState(mediaQueryMatch.matches, mediaQueryMatch)
      
      return mediaQueryMatch
    } catch (error) {
      console.warn('Failed to check reduced motion preference:', error)
      updateState(false, null)
      return null
    }
  }, [mediaQuery, updateState])

  /**
   * Handle media query change
   */
  const handleMediaQueryChange = useCallback((event: MediaQueryListEvent) => {
    updateState(event.matches, event.target)
  }, [updateState])

  /**
   * Initialize reduced motion detection
   */
  useEffect(() => {
    if (!listenForChanges) return

    const mediaQueryMatch = checkReducedMotion()
    
    if (!mediaQueryMatch) return

    // Add listener for changes
    if (mediaQueryMatch.addEventListener) {
      mediaQueryMatch.addEventListener('change', handleMediaQueryChange)
    } else {
      // Fallback for older browsers
      mediaQueryMatch.addListener(handleMediaQueryChange)
    }

    return () => {
      // Clean up listener
      if (mediaQueryMatch?.removeEventListener) {
        mediaQueryMatch.removeEventListener('change', handleMediaQueryChange)
      } else if (mediaQueryMatch?.removeListener) {
        mediaQueryMatch.removeListener(handleMediaQueryChange)
      }
    }
  }, [listenForChanges, checkReducedMotion, handleMediaQueryChange])

  // Initial check
  useEffect(() => {
    if (state.mediaQueryMatch === null) {
      checkReducedMotion()
    }
  }, [state.mediaQueryMatch, checkReducedMotion])

  return {
    prefersReducedMotion: state.prefersReducedMotion,
    isSupported: state.isSupported,
    mediaQueryMatch: state.mediaQueryMatch,
  }
}

/**
 * Hook for managing animations with reduced motion respect
 */
export function useReducedMotionAnimation<T extends Record<string, any>>(
  animations: T,
  reducedAnimations?: Partial<T>
) {
  const { prefersReducedMotion } = useReducedMotion()
  
  return prefersReducedMotion ? { ...animations, ...reducedAnimations } : animations
}

/**
 * Hook for managing transition durations with reduced motion
 */
export function useReducedMotionTransition(
  normalDuration: string | number,
  reducedDuration: string | number = '0s'
) {
  const { prefersReducedMotion } = useReducedMotion()
  
  return prefersReducedMotion ? reducedDuration : normalDuration
}

/**
 * Hook for managing CSS classes with reduced motion
 */
export function useReducedMotionClass(
  normalClass: string,
  reducedClass: string = ''
) {
  const { prefersReducedMotion } = useReducedMotion()
  
  return prefersReducedMotion ? reducedClass : normalClass
}

/**
 * Hook for managing animation frame callbacks with reduced motion
 */
export function useReducedMotionAnimationFrame() {
  const { prefersReducedMotion } = useReducedMotion()
  
  const requestAnimationCallback = useCallback((callback: FrameRequestCallback) => {
    if (prefersReducedMotion) {
      // Skip animation and execute immediately
      callback(0)
      return -1 // Return invalid ID to indicate no animation was requested
    } else {
      return requestAnimationFrame(callback)
    }
  }, [prefersReducedMotion])
  
  const cancelAnimationCallback = useCallback((id: number) => {
    if (id !== -1) {
      cancelAnimationFrame(id)
    }
  }, [])
  
  return {
    requestAnimationFrame: requestAnimationCallback,
    cancelAnimationFrame: cancelAnimationCallback,
  }
}

/**
 * Hook for managing scroll behavior with reduced motion
 */
export function useReducedMotionScroll() {
  const { prefersReducedMotion } = useReducedMotion()
  
  const scrollToElement = useCallback((
    element: HTMLElement,
    options: ScrollIntoViewOptions = {}
  ) => {
    const scrollOptions: ScrollIntoViewOptions = {
      ...options,
      behavior: prefersReducedMotion ? 'auto' : (options.behavior || 'smooth'),
    }
    
    element.scrollIntoView(scrollOptions)
  }, [prefersReducedMotion])
  
  const scrollTo = useCallback((
    x: number,
    y: number,
    options: ScrollToOptions = {}
  ) => {
    const scrollOptions: ScrollToOptions = {
      ...options,
      left: x,
      top: y,
      behavior: prefersReducedMotion ? 'auto' : (options.behavior || 'smooth'),
    }
    
    window.scrollTo(scrollOptions)
  }, [prefersReducedMotion])
  
  return {
    scrollToElement,
    scrollTo,
    prefersReducedMotion,
  }
}

/**
 * Hook for managing carousel/slider animations with reduced motion
 */
export function useReducedMotionCarousel(options: {
  autoPlay?: boolean
  interval?: number
  transitionDuration?: string
}) {
  const { autoPlay = false, interval = 3000, transitionDuration = '0.5s' } = options
  const { prefersReducedMotion } = useReducedMotion()
  
  const shouldAutoPlay = autoPlay && !prefersReducedMotion
  const effectiveInterval = prefersReducedMotion ? 0 : interval
  const effectiveTransitionDuration = prefersReducedMotion ? '0s' : transitionDuration
  
  return {
    shouldAutoPlay,
    effectiveInterval,
    effectiveTransitionDuration,
    prefersReducedMotion,
  }
}

/**
 * Hook for managing video playback with reduced motion
 */
export function useReducedMotionVideo() {
  const { prefersReducedMotion } = useReducedMotion()
  
  const getVideoAttributes = useCallback((attributes: {
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
    playsInline?: boolean
  }) => {
    return {
      ...attributes,
      autoplay: attributes.autoplay && !prefersReducedMotion,
      loop: attributes.loop && !prefersReducedMotion,
    }
  }, [prefersReducedMotion])
  
  return {
    prefersReducedMotion,
    getVideoAttributes,
  }
}

/**
 * Hook for managing CSS custom properties with reduced motion
 */
export function useReducedMotionCSSProperties() {
  const { prefersReducedMotion } = useReducedMotion()
  
  const getCSSProperties = useCallback((properties: Record<string, string>) => {
    if (prefersReducedMotion) {
      // Remove or reduce animation-related properties
      const reducedProperties = { ...properties }
      
      // Remove animation properties
      delete reducedProperties.animation
      delete reducedProperties.animationName
      delete reducedProperties.animationDuration
      delete reducedProperties.animationTimingFunction
      delete reducedProperties.animationDelay
      delete reducedProperties.animationIterationCount
      delete reducedProperties.animationDirection
      delete reducedProperties.animationFillMode
      delete reducedProperties.animationPlayState
      
      // Remove transition properties
      delete reducedProperties.transition
      delete reducedProperties.transitionProperty
      delete reducedProperties.transitionDuration
      delete reducedProperties.transitionTimingFunction
      delete reducedProperties.transitionDelay
      
      // Remove transform properties that might cause motion
      delete reducedProperties.transform
      delete reducedProperties.transformOrigin
      
      return reducedProperties
    }
    
    return properties
  }, [prefersReducedMotion])
  
  return {
    prefersReducedMotion,
    getCSSProperties,
  }
}