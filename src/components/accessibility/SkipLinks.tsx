'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface SkipLink {

  /**
   * Unique identifier for the link
   */
  id: string

  /**
   * Text to display for the link
   */
  label: string

  /**
   * CSS selector for the target element
   */
  target: string

  /**
   * Whether to show the link by default
   */
  visible?: boolean
}

export interface SkipLinksProps {

  /**
   * Array of skip links to display
   */
  links: SkipLink[]

  /**
   * CSS class name for the container
   */
  className?: string

  /**
   * Whether to show links on focus only (default behavior)
   */
  focusOnly?: boolean

  /**
   * Position of the skip links container
   */
  position?: 'top' | 'bottom' | 'left' | 'right'

  /**
   * Callback when a skip link is activated
   */
  onSkip?: (linkId: string, target: string) => void
}

/**
 * SkipLinks component for keyboard navigation accessibility
 *
 * Provides links that allow keyboard users to skip to main content areas,
 * bypassing repetitive navigation elements.
 */
export function SkipLinks({
  links,
  className,
  focusOnly = true,
  position = 'top',
  onSkip
}: SkipLinksProps) {
  const [isFocused, setIsFocused] = useState(false)

  /**
   * Handle skip link click
   */
  const handleSkip = (link: SkipLink) => {
    const targetElement = document.querySelector(link.target) as HTMLElement

    if (targetElement) {
      // Set focus to target element
      targetElement.focus()

      // Scroll element into view
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })

      // Announce to screen readers
      const announcement = `Skipped to ${link.label}`
      announceToScreenReader(announcement)

      // Call callback
      onSkip?.(link.id, link.target)
    } else {
      console.warn(`SkipLinks: Target element not found for selector "${link.target}"`)
    }
  }

  /**
   * Announce to screen readers using ARIA live region
   */
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement)
      }
    }, 1000)
  }

  /**
   * Handle focus state
   */
  useEffect(() => {
    const handleFocusIn = () => setIsFocused(true)
    const handleFocusOut = () => setIsFocused(false)

    // Add focus event listeners to the skip links container
    const container = document.getElementById('skip-links')
    if (container) {
      container.addEventListener('focusin', handleFocusIn)
      container.addEventListener('focusout', handleFocusOut)
    }

    return () => {
      if (container) {
        container.removeEventListener('focusin', handleFocusIn)
        container.removeEventListener('focusout', handleFocusOut)
      }
    }
  }, [])

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent, link: SkipLink) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSkip(link)
    }
  }

  /**
   * Get position styles
   */
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0'
      case 'bottom':
        return 'bottom-0 left-0 right-0'
      case 'left':
        return 'top-0 left-0 bottom-0'
      case 'right':
        return 'top-0 right-0 bottom-0'
      default:
        return 'top-0 left-0 right-0'
    }
  }

  /**
   * Get container orientation
   */
  const getOrientation = () => {
    return position === 'left' || position === 'right' ? 'flex-col' : 'flex-row'
  }

  const isVisible = !focusOnly || isFocused

  return (
    <div
      id="skip-links"
      className={cn(
        // Base styles
        'fixed z-50 bg-background border border-border shadow-lg',
        'transition-all duration-200 ease-in-out',

        // Position styles
        getPositionStyles(),

        // Orientation
        getOrientation(),

        // Visibility
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full',

        // Focus only behavior
        focusOnly && 'focus-within:opacity-100 focus-within:translate-y-0',

        // Custom class
        className
      )}
      role="navigation"
      aria-label="Skip navigation links"
    >
      {links.map((link) => (
        <button
          key={link.id}
          className={cn(
            // Base styles
            'px-4 py-2 text-sm font-medium text-foreground',
            'bg-background hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'border-r border-border last:border-r-0',

            // Responsive
            'whitespace-nowrap',

            // Accessibility
            'transition-colors duration-150'
          )}
          onClick={() => handleSkip(link)}
          onKeyDown={(e) => handleKeyDown(e, link)}
          aria-label={`Skip to ${link.label}`}
        >
          {link.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Default skip links for OpenRelief application
 */
export const defaultSkipLinks: SkipLink[] = [
  {
    id: 'skip-to-main',
    label: 'Skip to main content',
    target: '#main-content'
  },
  {
    id: 'skip-to-navigation',
    label: 'Skip to navigation',
    target: '#main-navigation'
  },
  {
    id: 'skip-to-emergency-report',
    label: 'Skip to emergency report',
    target: '#emergency-report'
  },
  {
    id: 'skip-to-map',
    label: 'Skip to map',
    target: '#emergency-map'
  },
  {
    id: 'skip-to-search',
    label: 'Skip to search',
    target: '#search-input'
  }
]

/**
 * Convenience component with default skip links
 */
export function DefaultSkipLinks(props: Omit<SkipLinksProps, 'links'>) {
  return <SkipLinks links={defaultSkipLinks} {...props} />
}

/**
 * Hook for managing skip links programmatically
 */
export function useSkipLinks() {
  /**
   * Add a skip link dynamically
   */
  const addSkipLink = (link: SkipLink) => {
    const container = document.getElementById('skip-links')
    if (container) {
      // This would typically be handled by state management
      // For now, we'll just log it
      console.log('SkipLinks: Adding link', link)
    }
  }

  /**
   * Remove a skip link dynamically
   */
  const removeSkipLink = (linkId: string) => {
    const container = document.getElementById('skip-links')
    if (container) {
      // This would typically be handled by state management
      // For now, we'll just log it
      console.log('SkipLinks: Removing link', linkId)
    }
  }

  /**
   * Focus the first skip link
   */
  const focusFirstSkipLink = () => {
    const container = document.getElementById('skip-links')
    if (container) {
      const firstLink = container.querySelector('button') as HTMLButtonElement
      firstLink?.focus()
    }
  }

  /**
   * Check if skip links are available
   */
  const hasSkipLinks = (): boolean => {
    return !!document.getElementById('skip-links')
  }

  return {
    addSkipLink,
    removeSkipLink,
    focusFirstSkipLink,
    hasSkipLinks
  }
}