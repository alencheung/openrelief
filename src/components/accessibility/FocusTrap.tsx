'use client'

import { useEffect, useRef, forwardRef } from 'react'
import { useFocusManagement } from '@/hooks/accessibility'

export interface FocusTrapProps {
  /**
   * Whether the focus trap is active
   */
  active?: boolean
  /**
   * CSS class name for the container
   */
  className?: string
  /**
   * Whether to auto-focus the first element when trap activates
   */
  autoFocus?: boolean
  /**
   * Whether to restore focus to previous element when trap deactivates
   */
  restoreFocus?: boolean
  /**
   * CSS selector for elements that should be excluded from focus trapping
   */
  excludeSelector?: string
  /**
   * Callback when focus trap is activated
   */
  onActivate?: () => void
  /**
   * Callback when focus trap is deactivated
   */
  onDeactivate?: () => void
  /**
   * Callback when escape key is pressed
   */
  onEscape?: () => void
  /**
   * Whether to trap focus (default: true)
   */
  trapFocus?: boolean
  /**
   * Children to render inside the focus trap
   */
  children: React.ReactNode
}

/**
 * FocusTrap component for managing focus within a container
 * 
 * Traps keyboard focus within a specified container, ensuring that
 * users cannot accidentally navigate outside of modal dialogs,
 * dropdowns, or other focus-contained components.
 */
export const FocusTrap = forwardRef<HTMLDivElement, FocusTrapProps>(
  (
    {
      active = true,
      className,
      autoFocus = true,
      restoreFocus = true,
      excludeSelector,
      onActivate,
      onDeactivate,
      onEscape,
      trapFocus = true,
      children,
    },
    ref
  ) => {
    const {
      containerRef,
      getFocusableElements,
      getFirstFocusableElement,
      getLastFocusableElement,
      startFocusTrap,
      endFocusTrap,
      isTrapped,
    } = useFocusManagement({
      trapFocus: trapFocus && active,
      restoreFocus,
      autoFocus,
      excludeSelector,
      onTrapStart: onActivate,
      onTrapEnd: onDeactivate,
    })

    /**
     * Handle escape key press
     */
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape?.()
      }
    }

    /**
     * Set up focus trap when active state changes
     */
    useEffect(() => {
      if (active) {
        startFocusTrap()
      } else {
        endFocusTrap()
      }
    }, [active, startFocusTrap, endFocusTrap])

    /**
     * Merge refs
     */
    const setRefs = (element: HTMLDivElement | null) => {
      containerRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    }

    return (
      <div
        ref={setRefs}
        className={className}
        onKeyDown={handleKeyDown}
        role={trapFocus ? 'dialog' : undefined}
        aria-modal={trapFocus && active ? 'true' : undefined}
        tabIndex={-1}
      >
        {children}
      </div>
    )
  }
)

FocusTrap.displayName = 'FocusTrap'

/**
 * Hook for creating a focus trap programmatically
 */
export function useFocusTrapElement(
  element: HTMLElement | null,
  options: Omit<FocusTrapProps, 'children' | 'className'> = {}
) {
  const {
    active = true,
    autoFocus = true,
    restoreFocus = true,
    excludeSelector,
    onActivate,
    onDeactivate,
    onEscape,
    trapFocus = true,
  } = options

  const {
    getFocusableElements,
    getFirstFocusableElement,
    getLastFocusableElement,
    startFocusTrap,
    endFocusTrap,
    isTrapped,
  } = useFocusManagement({
    trapFocus: trapFocus && active,
    restoreFocus,
    autoFocus,
    excludeSelector,
    onTrapStart: onActivate,
    onTrapEnd: onDeactivate,
  })

  /**
   * Handle escape key press
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && element?.contains(event.target as Node)) {
      event.preventDefault()
      onEscape?.()
    }
  }

  /**
   * Set up focus trap on element
   */
  useEffect(() => {
    if (!element) return

    if (active) {
      startFocusTrap()
      
      // Add escape key listener
      element.addEventListener('keydown', handleKeyDown)
      
      // Set ARIA attributes
      if (trapFocus) {
        element.setAttribute('role', 'dialog')
        element.setAttribute('aria-modal', 'true')
        element.tabIndex = -1
      }
    } else {
      endFocusTrap()
      
      // Remove escape key listener
      element.removeEventListener('keydown', handleKeyDown)
      
      // Remove ARIA attributes
      if (trapFocus) {
        element.removeAttribute('role')
        element.removeAttribute('aria-modal')
        element.removeAttribute('tabIndex')
      }
    }

    return () => {
      // Clean up
      element.removeEventListener('keydown', handleKeyDown)
      endFocusTrap()
      
      if (trapFocus) {
        element.removeAttribute('role')
        element.removeAttribute('aria-modal')
        element.removeAttribute('tabIndex')
      }
    }
  }, [element, active, trapFocus, startFocusTrap, endFocusTrap, handleKeyDown])

  return {
    getFocusableElements,
    getFirstFocusableElement,
    getLastFocusableElement,
    isTrapped,
  }
}

/**
 * Higher-order component for adding focus trap to existing components
 */
export function withFocusTrap<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = React.forwardRef<any, P & FocusTrapProps>(
    ({ active, className, autoFocus, restoreFocus, excludeSelector, onActivate, onDeactivate, onEscape, trapFocus, ...props }, ref) => {
      return (
        <FocusTrap
          active={active}
          className={className}
          autoFocus={autoFocus}
          restoreFocus={restoreFocus}
          excludeSelector={excludeSelector}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onEscape={onEscape}
          trapFocus={trapFocus}
        >
          <Component ref={ref} {...(props as P)} />
        </FocusTrap>
      )
    }
  )

  WrappedComponent.displayName = `withFocusTrap(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Utility function to create a temporary focus trap
 */
export function createTemporaryFocusTrap(
  element: HTMLElement,
  options: Omit<FocusTrapProps, 'children' | 'className'> = {}
): () => void {
  const {
    autoFocus = true,
    restoreFocus = true,
    excludeSelector,
    onActivate,
    onDeactivate,
    onEscape,
    trapFocus = true,
  } = options

  const {
    getFocusableElements,
    getFirstFocusableElement,
    startFocusTrap,
    endFocusTrap,
  } = useFocusManagement({
    trapFocus,
    restoreFocus,
    autoFocus,
    excludeSelector,
    onTrapStart: onActivate,
    onTrapEnd: onDeactivate,
  })

  /**
   * Handle escape key press
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && element.contains(event.target as Node)) {
      event.preventDefault()
      onEscape?.()
      cleanup()
    }
  }

  // Activate focus trap
  startFocusTrap()
  
  // Add escape key listener
  element.addEventListener('keydown', handleKeyDown)
  
  // Set ARIA attributes
  if (trapFocus) {
    element.setAttribute('role', 'dialog')
    element.setAttribute('aria-modal', 'true')
    element.tabIndex = -1
  }

  /**
   * Cleanup function
   */
  const cleanup = () => {
    endFocusTrap()
    
    // Remove escape key listener
    element.removeEventListener('keydown', handleKeyDown)
    
    // Remove ARIA attributes
    if (trapFocus) {
      element.removeAttribute('role')
      element.removeAttribute('aria-modal')
      element.removeAttribute('tabIndex')
    }
  }

  return cleanup
}

/**
 * Hook for managing multiple focus traps (stacked modals, nested dropdowns, etc.)
 */
export function useFocusTrapStack() {
  const stackRef = useRef<Array<{
    element: HTMLElement
    cleanup: () => void
    id: string
  }>>([])

  /**
   * Add a focus trap to the stack
   */
  const pushFocusTrap = (
    element: HTMLElement,
    options: Omit<FocusTrapProps, 'children' | 'className'> = {}
  ): string => {
    const id = `focus-trap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const cleanup = createTemporaryFocusTrap(element, options)
    
    stackRef.current.push({
      element,
      cleanup,
      id,
    })

    return id
  }

  /**
   * Remove the top focus trap from the stack
   */
  const popFocusTrap = (): string | null => {
    const trap = stackRef.current.pop()
    
    if (trap) {
      trap.cleanup()
      return trap.id
    }
    
    return null
  }

  /**
   * Remove a specific focus trap from the stack
   */
  const removeFocusTrap = (id: string): boolean => {
    const index = stackRef.current.findIndex(trap => trap.id === id)
    
    if (index !== -1) {
      const trap = stackRef.current[index]
      trap.cleanup()
      stackRef.current.splice(index, 1)
      return true
    }
    
    return false
  }

  /**
   * Get the current focus trap stack
   */
  const getStack = () => [...stackRef.current]

  /**
   * Get the top focus trap
   */
  const getTopTrap = () => stackRef.current[stackRef.current.length - 1] || null

  /**
   * Clear all focus traps
   */
  const clearAll = () => {
    stackRef.current.forEach(trap => trap.cleanup())
    stackRef.current = []
  }

  return {
    pushFocusTrap,
    popFocusTrap,
    removeFocusTrap,
    getStack,
    getTopTrap,
    clearAll,
    size: stackRef.current.length,
  }
}