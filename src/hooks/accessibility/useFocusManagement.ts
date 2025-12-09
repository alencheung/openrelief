'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface FocusManagementOptions {

  /**
   * Whether to trap focus within the container
   */
  trapFocus?: boolean

  /**
   * Whether to restore focus to the previous element when unmounted
   */
  restoreFocus?: boolean

  /**
   * Whether to focus the first focusable element when mounted
   */
  autoFocus?: boolean

  /**
   * Whether to focus the container itself instead of the first element
   */
  focusContainer?: boolean

  /**
   * CSS selector for elements that should be excluded from focus trapping
   */
  excludeSelector?: string

  /**
   * Callback when focus is trapped
   */
  onTrapStart?: () => void

  /**
   * Callback when focus is released
   */
  onTrapEnd?: () => void
}

export interface FocusElement {
  element: HTMLElement
  index: number
}

/**
 * Hook for managing focus trapping and restoration in modal dialogs,
 * dropdowns, and other focus-contained components.
 */
export function useFocusManagement(options: FocusManagementOptions = {}) {
  const {
    trapFocus = true,
    restoreFocus = true,
    autoFocus = true,
    focusContainer = false,
    excludeSelector,
    onTrapStart,
    onTrapEnd
  } = options

  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isTrappedRef = useRef(false)

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) {
      return []
    }

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      'area[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'details',
      'summary',
      'iframe',
      'object',
      'embed',
      'audio[controls]',
      'video[controls]'
    ].join(', ')

    const elements = Array.from(
      containerRef.current.querySelectorAll(selector)
    ) as HTMLElement[]

    // Filter out elements that are hidden or excluded
    return elements.filter(element => {
      if (excludeSelector && element.matches(excludeSelector)) {
        return false
      }

      // Check if element is visible
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false
      }

      // Check if element has a valid bounding box
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        return false
      }

      return true
    })
  }, [excludeSelector])

  /**
   * Get the first focusable element
   */
  const getFirstFocusableElement = useCallback((): HTMLElement | null => {
    const elements = getFocusableElements()
    return elements.length > 0 ? elements[0] : null
  }, [getFocusableElements])

  /**
   * Get the last focusable element
   */
  const getLastFocusableElement = useCallback((): HTMLElement | null => {
    const elements = getFocusableElements()
    return elements.length > 0 ? elements[elements.length - 1] : null
  }, [getFocusableElements])

  /**
   * Focus the first focusable element or the container
   */
  const focusFirstElement = useCallback(() => {
    if (focusContainer && containerRef.current) {
      containerRef.current.focus()
      return
    }

    const firstElement = getFirstFocusableElement()
    if (firstElement) {
      firstElement.focus()
    }
  }, [focusContainer, getFirstFocusableElement])

  /**
   * Start trapping focus within the container
   */
  const startFocusTrap = useCallback(() => {
    if (!trapFocus || isTrappedRef.current) {
      return
    }

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    // Focus the first element if auto-focus is enabled
    if (autoFocus) {
      setTimeout(() => focusFirstElement(), 0)
    }

    isTrappedRef.current = true
    onTrapStart?.()
  }, [trapFocus, autoFocus, focusFirstElement, onTrapStart])

  /**
   * Stop trapping focus and restore the previous focus
   */
  const endFocusTrap = useCallback(() => {
    if (!isTrappedRef.current) {
      return
    }

    isTrappedRef.current = false

    if (restoreFocus && previousFocusRef.current) {
      setTimeout(() => {
        previousFocusRef.current?.focus()
      }, 0)
    }

    onTrapEnd?.()
  }, [restoreFocus, onTrapEnd])

  /**
   * Handle keyboard navigation within the trapped area
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isTrappedRef.current || !trapFocus) {
      return
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab: Move to previous element
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: Move to next element
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    } else if (event.key === 'Escape') {
      // Escape: Release focus trap
      endFocusTrap()
    }
  }, [trapFocus, getFocusableElements, endFocusTrap])

  /**
   * Set up focus trap when container is mounted
   */
  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const container = containerRef.current

    // Add keyboard event listener
    container.addEventListener('keydown', handleKeyDown)

    // Start focus trap
    startFocusTrap()

    return () => {
      // Clean up event listener
      container.removeEventListener('keydown', handleKeyDown)

      // End focus trap
      endFocusTrap()
    }
  }, [handleKeyDown, startFocusTrap, endFocusTrap])

  /**
   * Update focus trap when options change
   */
  useEffect(() => {
    if (isTrappedRef.current && !trapFocus) {
      endFocusTrap()
    } else if (!isTrappedRef.current && trapFocus) {
      startFocusTrap()
    }
  }, [trapFocus, startFocusTrap, endFocusTrap])

  return {
    containerRef,
    getFocusableElements,
    getFirstFocusableElement,
    getLastFocusableElement,
    focusFirstElement,
    startFocusTrap,
    endFocusTrap,
    isTrapped: isTrappedRef.current
  }
}

/**
 * Hook for managing focus restoration between page navigation
 */
export function useFocusRestore() {
  const focusRef = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    focusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (focusRef.current) {
      setTimeout(() => {
        focusRef.current?.focus()
      }, 0)
    }
  }, [])

  return { saveFocus, restoreFocus }
}

/**
 * Hook for managing focus order in complex components
 */
export function useFocusOrder(elements: HTMLElement[]) {
  const currentIndexRef = useRef(-1)

  const next = useCallback(() => {
    if (elements.length === 0) {
      return
    }

    currentIndexRef.current = (currentIndexRef.current + 1) % elements.length
    elements[currentIndexRef.current]?.focus()
  }, [elements])

  const previous = useCallback(() => {
    if (elements.length === 0) {
      return
    }

    currentIndexRef.current = currentIndexRef.current <= 0
      ? elements.length - 1
      : currentIndexRef.current - 1
    elements[currentIndexRef.current]?.focus()
  }, [elements])

  const setIndex = useCallback((index: number) => {
    if (index >= 0 && index < elements.length) {
      currentIndexRef.current = index
      elements[index]?.focus()
    }
  }, [elements])

  return { next, previous, setIndex, currentIndex: currentIndexRef.current }
}