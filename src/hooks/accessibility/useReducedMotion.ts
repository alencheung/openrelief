/**
 * Reduced Motion Hook for OpenRelief
 * 
 * Provides comprehensive reduced motion support for users with vestibular
 * disorders or those who prefer reduced motion for better accessibility.
 */

import { useEffect, useState, useCallback } from 'react'

export interface ReducedMotionOptions {
  /**
   * Whether to respect system preference
   */
  respectSystemPreference?: boolean
  /**
   * Whether to enable motion controls
   */
  enableControls?: boolean
  /**
   * Default reduced motion state
   */
  defaultReduced?: boolean
  /**
   * Callback when reduced motion changes
   */
  onReducedMotionChange?: (reduced: boolean) => void
  /**
   * Animation duration override
   */
  animationDuration?: number
  /**
   * Transition duration override
   */
  transitionDuration?: number
}

export interface ReducedMotionState {
  /**
   * Whether reduced motion is currently active
   */
  isReduced: boolean
  /**
   * Whether system prefers reduced motion
   */
  systemPrefersReduced: boolean
  /**
   * Whether user has manually set reduced motion
   */
  userReduced: boolean
  /**
   * Current animation duration
   */
  animationDuration: number
  /**
   * Current transition duration
   */
  transitionDuration: number
  /**
   * Available motion controls
   */
  controls: ReducedMotionControls
}

export interface ReducedMotionControls {
  /**
   * Toggle reduced motion
   */
  toggleReducedMotion: () => void
  /**
   * Set reduced motion state
   */
  setReducedMotion: (reduced: boolean) => void
  /**
   * Set animation duration
   */
  setAnimationDuration: (duration: number) => void
  /**
   * Set transition duration
   */
  setTransitionDuration: (duration: number) => void
  /**
   * Reset to system preference
   */
  resetToSystemPreference: () => void
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion(options: ReducedMotionOptions = {}): ReducedMotionState & ReducedMotionControls {
  const {
    respectSystemPreference = true,
    enableControls = true,
    defaultReduced = false,
    onReducedMotionChange,
    animationDuration = 0,
    transitionDuration = 0,
  } = options

  const [userReduced, setUserReduced] = useState(defaultReduced)
  const [systemPrefersReduced, setSystemPrefersReduced] = useState(false)
  const [currentAnimationDuration, setCurrentAnimationDuration] = useState(animationDuration)
  const [currentTransitionDuration, setCurrentTransitionDuration] = useState(transitionDuration)

  /**
   * Check system preference for reduced motion
   */
  const checkSystemPreference = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemPrefersReduced(mediaQuery.matches)
    
    return mediaQuery.matches
  }, [])

  /**
   * Calculate effective reduced motion state
   */
  const isReduced = respectSystemPreference 
    ? systemPrefersReduced || userReduced
    : userReduced

  /**
   * Toggle reduced motion
   */
  const toggleReducedMotion = useCallback(() => {
    const newUserReduced = !userReduced
    setUserReduced(newUserReduced)
    onReducedMotionChange?.(newUserReduced)
  }, [userReduced, onReducedMotionChange])

  /**
   * Set reduced motion state
   */
  const setReducedMotion = useCallback((reduced: boolean) => {
    setUserReduced(reduced)
    onReducedMotionChange?.(reduced)
  }, [onReducedMotionChange])

  /**
   * Set animation duration
   */
  const setAnimationDuration = useCallback((duration: number) => {
    setCurrentAnimationDuration(duration)
  }, [])

  /**
   * Set transition duration
   */
  const setTransitionDuration = useCallback((duration: number) => {
    setCurrentTransitionDuration(duration)
  }, [])

  /**
   * Reset to system preference
   */
  const resetToSystemPreference = useCallback(() => {
    setUserReduced(false)
    onReducedMotionChange?.(systemPrefersReduced)
  }, [systemPrefersReduced, onReducedMotionChange])

  /**
   * Apply reduced motion styles to document
   */
  const applyReducedMotionStyles = useCallback(() => {
    const root = document.documentElement
    
    if (isReduced) {
      root.classList.add('reduced-motion')
      
      // Apply reduced motion CSS variables
      root.style.setProperty('--animation-duration-multiplier', '0.01')
      root.style.setProperty('--transition-duration-multiplier', '0.01')
      
      if (currentAnimationDuration > 0) {
        root.style.setProperty('--animation-duration', `${currentAnimationDuration}ms`)
      }
      
      if (currentTransitionDuration > 0) {
        root.style.setProperty('--transition-duration', `${currentTransitionDuration}ms`)
      }
    } else {
      root.classList.remove('reduced-motion')
      
      // Reset CSS variables
      root.style.removeProperty('--animation-duration-multiplier')
      root.style.removeProperty('--transition-duration-multiplier')
      root.style.removeProperty('--animation-duration')
      root.style.removeProperty('--transition-duration')
    }
  }, [isReduced, currentAnimationDuration, currentTransitionDuration])

  /**
   * Listen for system preference changes
   */
  useEffect(() => {
    if (!respectSystemPreference) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersReduced(e.matches)
    }
    
    // Initial check
    setSystemPrefersReduced(mediaQuery.matches)
    
    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [respectSystemPreference])

  /**
   * Apply styles when state changes
   */
  useEffect(() => {
    applyReducedMotionStyles()
  }, [applyReducedMotionStyles])

  return {
    // State
    isReduced,
    systemPrefersReduced,
    userReduced,
    animationDuration: currentAnimationDuration,
    transitionDuration: currentTransitionDuration,
    controls: {
      toggleReducedMotion,
      setReducedMotion,
      setAnimationDuration,
      setTransitionDuration,
      resetToSystemPreference,
    }
  }
}

/**
 * Hook for reduced motion animations
 */
export function useReducedMotionAnimation<T extends Record<string, any>>(
  animationName: string,
  keyframes: T,
  options: {
    duration?: number
    easing?: string
    fill?: 'forwards' | 'backwards' | 'both' | 'none'
    iterations?: number | 'infinite'
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  } = {}
) {
  const { isReduced } = useReducedMotion()
  
  const {
    duration = 300,
    easing = 'ease-in-out',
    fill = 'forwards',
    iterations = 1,
    direction = 'normal',
  } = options

  /**
   * Get animation properties respecting reduced motion
   */
  const getAnimationProps = () => {
    if (isReduced) {
      return {
        animationName: 'none',
        duration: 0,
        easing: 'linear',
        fill: 'none',
        iterations: 0,
        direction: 'normal',
      }
    }
    
    return {
      animationName,
      duration,
      easing,
      fill,
      iterations,
      direction,
    }
  }

  return {
    animationProps: getAnimationProps(),
    keyframes: isReduced ? {} : keyframes,
    isReduced,
  }
}

/**
 * Hook for reduced motion transitions
 */
export function useReducedMotionTransition(options: {
  duration?: number
  easing?: string
  delay?: number
  property?: string | string[]
} = {}) {
  const { isReduced } = useReducedMotion()
  
  const {
    duration = 200,
    easing = 'ease-in-out',
    delay = 0,
    property = 'all',
  } = options

  /**
   * Get transition properties respecting reduced motion
   */
  const getTransitionProps = () => {
    if (isReduced) {
      return {
        duration: 0,
        easing: 'linear',
        delay: 0,
        property: 'none',
      }
    }
    
    return {
      duration,
      easing,
      delay,
      property,
    }
  }

  return {
    transitionProps: getTransitionProps(),
    transitionString: isReduced 
      ? 'none' 
      : `${property} ${duration}ms ${easing} ${delay}ms`,
    isReduced,
  }
}

/**
 * Hook for reduced motion CSS classes
 */
export function useReducedMotionClass() {
  const { isReduced } = useReducedMotion()
  
  /**
   * Get CSS classes respecting reduced motion
   */
  const getClasses = (baseClass: string, animatedClass?: string) => {
    if (isReduced) {
      return `${baseClass} reduced-motion`
    }
    
    return animatedClass ? `${baseClass} ${animatedClass}` : baseClass
  }

  return {
    getClasses,
    isReduced,
  }
}

/**
 * Hook for reduced motion animation frame
 */
export function useReducedMotionAnimationFrame() {
  const { isReduced } = useReducedMotion()
  const animationFrameRef = useRef<number>()
  const callbackRef = useRef<() => void>()

  /**
   * Request animation frame respecting reduced motion
   */
  const requestAnimationFrame = useCallback((callback: () => void) => {
    if (isReduced) {
      // For reduced motion, use setTimeout with longer delay
      callbackRef.current = callback
      animationFrameRef.current = window.setTimeout(callback, 16) as any
    } else {
      // Use standard requestAnimationFrame
      callbackRef.current = callback
      animationFrameRef.current = window.requestAnimationFrame(callback)
    }
  }, [isReduced])

  /**
   * Cancel animation frame
   */
  const cancelAnimationFrame = useCallback(() => {
    if (animationFrameRef.current) {
      if (isReduced) {
        window.clearTimeout(animationFrameRef.current)
      } else {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = undefined
    }
  }, [isReduced])

  return {
    requestAnimationFrame,
    cancelAnimationFrame,
    isReduced,
  }
}

/**
 * Hook for reduced motion scroll behavior
 */
export function useReducedMotionScroll() {
  const { isReduced } = useReducedMotion()
  
  /**
   * Get scroll behavior respecting reduced motion
   */
  const getScrollBehavior = (): ScrollBehavior => {
    return isReduced ? 'auto' : 'smooth'
  }

  /**
   * Scroll to element respecting reduced motion
   */
  const scrollToElement = useCallback((element: HTMLElement, options?: ScrollIntoViewOptions) => {
    const scrollOptions: ScrollIntoViewOptions = {
      behavior: getScrollBehavior(),
      block: 'start',
      inline: 'nearest',
      ...options,
    }
    
    element.scrollIntoView(scrollOptions)
  }, [isReduced])

  /**
   * Scroll to position respecting reduced motion
   */
  const scrollToPosition = useCallback((x: number, y: number) => {
    if (isReduced) {
      window.scrollTo(x, y)
    } else {
      window.scrollTo({
        left: x,
        top: y,
        behavior: 'smooth',
      })
    }
  }, [isReduced])

  return {
    getScrollBehavior,
    scrollToElement,
    scrollToPosition,
    isReduced,
  }
}

/**
 * Hook for reduced motion carousel
 */
export function useReducedMotionCarousel(options: {
  autoPlay?: boolean
  interval?: number
  transitionDuration?: number
} = {}) {
  const { isReduced } = useReducedMotion()
  
  const {
    autoPlay = false,
    interval = 3000,
    transitionDuration = 500,
  } = options

  const [currentIndex, setCurrentIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  /**
   * Get effective auto play setting
   */
  const effectiveAutoPlay = autoPlay && !isReduced

  /**
   * Get effective transition duration
   */
  const effectiveTransitionDuration = isReduced ? 0 : transitionDuration

  /**
   * Go to next slide
   */
  const next = useCallback(() => {
    setCurrentIndex(prev => prev + 1)
  }, [])

  /**
   * Go to previous slide
   */
  const previous = useCallback(() => {
    setCurrentIndex(prev => prev - 1)
  }, [])

  /**
   * Go to specific slide
   */
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  /**
   * Setup auto play
   */
  useEffect(() => {
    if (effectiveAutoPlay) {
      intervalRef.current = setInterval(() => {
        next()
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [effectiveAutoPlay, interval, next])

  return {
    currentIndex,
    next,
    previous,
    goToSlide,
    isReduced,
    effectiveAutoPlay,
    effectiveTransitionDuration,
  }
}

/**
 * Hook for reduced motion video
 */
export function useReducedMotionVideo() {
  const { isReduced } = useReducedMotion()
  
  /**
   * Get video properties respecting reduced motion
   */
  const getVideoProps = () => {
    return {
      autoPlay: !isReduced,
      muted: isReduced, // Mute when auto-playing without user interaction
      playsInline: true,
      loop: false,
      controls: true,
    }
  }

  /**
   * Play video respecting reduced motion
   */
  const playVideo = useCallback((video: HTMLVideoElement) => {
    if (isReduced) {
      // For reduced motion, show poster instead of playing
      video.poster = video.poster || ''
      return
    }
    
    video.play().catch(error => {
      console.warn('Video playback failed:', error)
    })
  }, [isReduced])

  return {
    getVideoProps,
    playVideo,
    isReduced,
  }
}

/**
 * Hook for reduced motion CSS properties
 */
export function useReducedMotionCSSProperties() {
  const { isReduced } = useReducedMotion()
  
  /**
   * Get CSS properties respecting reduced motion
   */
  const getCSSProperties = () => {
    if (isReduced) {
      return {
        animation: 'none',
        transition: 'none',
        transform: 'none',
        opacity: 1,
      }
    }
    
    return {
      animation: '',
      transition: '',
      transform: '',
      opacity: '',
    }
  }

  return {
    getCSSProperties,
    isReduced,
  }
}

/**
 * Utility function to check if reduced motion is preferred
 */
export function checkReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Utility function to add reduced motion listener
 */
export function addReducedMotionListener(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches)
  }
  
  // Initial check
  callback(mediaQuery.matches)
  
  // Listen for changes
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
  } else {
    mediaQuery.addListener(handleChange)
  }
  
  // Return cleanup function
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.removeListener(handleChange)
    }
  }
}