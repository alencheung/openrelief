'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface AriaAnnouncement {
  /**
   * The message to announce
   */
  message: string
  /**
   * Priority of the announcement
   */
  priority?: 'polite' | 'assertive' | 'off'
  /**
   * How long to wait before announcing (in milliseconds)
   */
  delay?: number
  /**
   * Whether to clear previous announcements
   */
  clear?: boolean
  /**
   * Unique identifier for the announcement
   */
  id?: string
}

export interface AriaAnnouncerOptions {
  /**
   * Default politeness level for announcements
   */
  defaultPriority?: 'polite' | 'assertive' | 'off'
  /**
   * Whether to create a live region automatically
   */
  createLiveRegion?: boolean
  /**
   * CSS selector for existing live region
   */
  liveRegionSelector?: string
  /**
   * Maximum number of announcements to keep in history
   */
  maxHistory?: number
  /**
   * Callback when announcement is made
   */
  onAnnounce?: (announcement: AriaAnnouncement) => void
}

/**
 * Hook for managing screen reader announcements using ARIA live regions
 */
export function useAriaAnnouncer(options: AriaAnnouncerOptions = {}) {
  const {
    defaultPriority = 'polite',
    createLiveRegion = true,
    liveRegionSelector,
    maxHistory = 50,
    onAnnounce,
  } = options

  const liveRegionRef = useRef<HTMLElement | null>(null)
  const historyRef = useRef<AriaAnnouncement[]>([])
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * Get or create the live region element
   */
  const getLiveRegion = useCallback((): HTMLElement => {
    if (liveRegionRef.current) return liveRegionRef.current

    // Try to find existing live region
    if (liveRegionSelector) {
      const existing = document.querySelector(liveRegionSelector) as HTMLElement
      if (existing) {
        liveRegionRef.current = existing
        return existing
      }
    }

    // Create new live region if enabled
    if (createLiveRegion) {
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', defaultPriority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.setAttribute('aria-relevant', 'additions text')
      liveRegion.className = 'sr-only'
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      
      document.body.appendChild(liveRegion)
      liveRegionRef.current = liveRegion
      return liveRegion
    }

    // Fallback: create temporary element
    const temp = document.createElement('div')
    temp.setAttribute('aria-live', defaultPriority)
    temp.setAttribute('aria-atomic', 'true')
    temp.style.position = 'absolute'
    temp.style.left = '-10000px'
    temp.style.width = '1px'
    temp.style.height = '1px'
    temp.style.overflow = 'hidden'
    
    document.body.appendChild(temp)
    liveRegionRef.current = temp
    return temp
  }, [createLiveRegion, defaultPriority, liveRegionSelector])

  /**
   * Make an announcement to screen readers
   */
  const announce = useCallback((announcement: AriaAnnouncement) => {
    const {
      message,
      priority = defaultPriority,
      delay = 0,
      clear = false,
      id,
    } = announcement

    // Validate message
    if (!message || typeof message !== 'string') {
      console.warn('AriaAnnouncer: Invalid message provided', announcement)
      return
    }

    // Clear existing timeout for this ID
    if (id && timeoutRefs.current.has(id)) {
      clearTimeout(timeoutRefs.current.get(id)!)
      timeoutRefs.current.delete(id)
    }

    // Add to history
    const announcementWithTimestamp = {
      ...announcement,
      message,
      priority,
      delay,
      clear,
      id,
    }
    
    historyRef.current.push(announcementWithTimestamp)
    
    // Trim history if it exceeds max size
    if (historyRef.current.length > maxHistory) {
      historyRef.current = historyRef.current.slice(-maxHistory)
    }

    // Schedule announcement
    const timeoutId = setTimeout(() => {
      const liveRegion = getLiveRegion()
      
      // Update live region politeness if needed
      if (liveRegion.getAttribute('aria-live') !== priority) {
        liveRegion.setAttribute('aria-live', priority)
      }

      // Clear previous content if requested
      if (clear) {
        liveRegion.textContent = ''
      }

      // Add the announcement
      const announcementElement = document.createElement('div')
      announcementElement.textContent = message
      liveRegion.appendChild(announcementElement)

      // Remove the element after announcement is read
      setTimeout(() => {
        if (announcementElement.parentNode) {
          announcementElement.parentNode.removeChild(announcementElement)
        }
      }, 1000)

      // Call callback
      onAnnounce?.(announcementWithTimestamp)
    }, delay)

    // Store timeout ID
    if (id) {
      timeoutRefs.current.set(id, timeoutId)
    }
  }, [defaultPriority, getLiveRegion, maxHistory, onAnnounce])

  /**
   * Make a polite announcement (default)
   */
  const announcePolite = useCallback((message: string, options?: Partial<AriaAnnouncement>) => {
    announce({ message, priority: 'polite', ...options })
  }, [announce])

  /**
   * Make an assertive announcement (immediate)
   */
  const announceAssertive = useCallback((message: string, options?: Partial<AriaAnnouncement>) => {
    announce({ message, priority: 'assertive', ...options })
  }, [announce])

  /**
   * Clear all announcements
   */
  const clear = useCallback(() => {
    const liveRegion = getLiveRegion()
    liveRegion.textContent = ''
    
    // Clear all pending timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
    timeoutRefs.current.clear()
    
    // Clear history
    historyRef.current = []
  }, [getLiveRegion])

  /**
   * Clear a specific announcement by ID
   */
  const clearById = useCallback((id: string) => {
    // Clear timeout if it exists
    if (timeoutRefs.current.has(id)) {
      clearTimeout(timeoutRefs.current.get(id)!)
      timeoutRefs.current.delete(id)
    }

    // Remove from history
    historyRef.current = historyRef.current.filter(ann => ann.id !== id)
  }, [])

  /**
   * Get announcement history
   */
  const getHistory = useCallback((): AriaAnnouncement[] => {
    return [...historyRef.current]
  }, [])

  /**
   * Check if screen reader is active
   */
  const isScreenReaderActive = useCallback((): boolean => {
    // Check if user prefers reduced motion (often indicates screen reader usage)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    // Check for common screen reader indicators
    const hasScreenReaderIndicator = 
      window.speechSynthesis !== undefined ||
      document.querySelector('[aria-live]') !== null
    
    return prefersReducedMotion || hasScreenReaderIndicator
  }, [])

  /**
   * Clean up live region on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutRefs.current.clear()

      // Remove live region if we created it
      if (createLiveRegion && liveRegionRef.current && liveRegionRef.current.parentNode) {
        liveRegionRef.current.parentNode.removeChild(liveRegionRef.current)
      }
    }
  }, [createLiveRegion])

  return {
    announce,
    announcePolite,
    announceAssertive,
    clear,
    clearById,
    getHistory,
    isScreenReaderActive,
    liveRegion: liveRegionRef.current,
  }
}

/**
 * Hook for managing page title announcements
 */
export function usePageTitleAnnouncer() {
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '')

  const announcePageChange = useCallback((title: string, restoreAfter?: number) => {
    if (typeof document === 'undefined') return

    const originalTitle = originalTitleRef.current
    document.title = title

    if (restoreAfter) {
      setTimeout(() => {
        document.title = originalTitle
      }, restoreAfter)
    }
  }, [])

  const restoreTitle = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current
    }
  }, [])

  return {
    announcePageChange,
    restoreTitle,
    currentTitle: typeof document !== 'undefined' ? document.title : '',
  }
}

/**
 * Hook for managing status announcements
 */
export function useStatusAnnouncer() {
  const { announcePolite, announceAssertive } = useAriaAnnouncer({
    defaultPriority: 'polite',
  })

  const announceStatus = useCallback((
    status: string,
    options?: { type?: 'info' | 'success' | 'warning' | 'error'; priority?: 'polite' | 'assertive' }
  ) => {
    const { type = 'info', priority = 'polite' } = options || {}
    
    const prefix = type === 'error' ? 'Error: ' : 
                   type === 'warning' ? 'Warning: ' : 
                   type === 'success' ? 'Success: ' : ''
    
    const message = `${prefix}${status}`
    
    if (priority === 'assertive') {
      announceAssertive(message)
    } else {
      announcePolite(message)
    }
  }, [announcePolite, announceAssertive])

  const announceError = useCallback((error: string) => {
    announceStatus(error, { type: 'error', priority: 'assertive' })
  }, [announceStatus])

  const announceSuccess = useCallback((success: string) => {
    announceStatus(success, { type: 'success', priority: 'polite' })
  }, [announceStatus])

  const announceWarning = useCallback((warning: string) => {
    announceStatus(warning, { type: 'warning', priority: 'polite' })
  }, [announceStatus])

  const announceInfo = useCallback((info: string) => {
    announceStatus(info, { type: 'info', priority: 'polite' })
  }, [announceStatus])

  return {
    announceStatus,
    announceError,
    announceSuccess,
    announceWarning,
    announceInfo,
  }
}

/**
 * Hook for managing form validation announcements
 */
export function useFormValidationAnnouncer() {
  const { announcePolite, announceAssertive } = useAriaAnnouncer({
    defaultPriority: 'assertive',
  })

  const announceValidationErrors = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors).filter(Boolean)
    
    if (errorMessages.length === 0) {
      announcePolite('Form is valid')
      return
    }

    const message = `Form has ${errorMessages.length} error${errorMessages.length > 1 ? 's' : ''}: ${errorMessages.join(', ')}`
    announceAssertive(message)
  }, [announcePolite, announceAssertive])

  const announceFieldError = useCallback((fieldName: string, error: string) => {
    announceAssertive(`${fieldName}: ${error}`)
  }, [announceAssertive])

  const announceFieldSuccess = useCallback((fieldName: string) => {
    announcePolite(`${fieldName} is valid`)
  }, [announcePolite])

  return {
    announceValidationErrors,
    announceFieldError,
    announceFieldSuccess,
  }
}