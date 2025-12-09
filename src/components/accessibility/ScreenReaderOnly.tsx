'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ScreenReaderOnlyProps {

  /**
   * Content to be read by screen readers only
   */
  children: React.ReactNode

  /**
   * CSS class name for the container
   */
  className?: string

  /**
   * Whether to make content focusable
   */
  focusable?: boolean

  /**
   * ARIA live region setting
   */
  live?: 'off' | 'polite' | 'assertive'

  /**
   * Whether content should be atomic (read as a whole)
   */
  atomic?: boolean

  /**
   * Whether to announce when content is relevant
   */
  relevant?: 'additions' | 'removals' | 'text' | 'all'

  /**
   * Whether to be busy (prevents interruptions)
   */
  busy?: boolean

  /**
   * Custom tag name
   */
  as?: keyof JSX.IntrinsicElements

  /**
   * Additional ARIA attributes
   */
  aria?: Record<string, string | boolean>
}

/**
 * ScreenReaderOnly component for content that should only be read by screen readers
 *
 * Provides a way to include content that is visually hidden but
 * accessible to screen reader users. Common use cases include:
 * - Status messages
 * - Contextual information
 * - Form field descriptions
 * - Skip links
 * - Error messages
 */
export const ScreenReaderOnly = forwardRef<HTMLElement, ScreenReaderOnlyProps>(
  (
    {
      children,
      className,
      focusable = false,
      live,
      atomic = false,
      relevant,
      busy = false,
      as: Component = 'span',
      aria = {},
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          // Base screen reader only styles
          'sr-only',

          // Make focusable if requested
          focusable && 'sr-only-focusable',

          // Custom class
          className
        )}
        // ARIA live region
        aria-live={live}
        aria-atomic={atomic || undefined}
        aria-relevant={relevant}
        aria-busy={busy || undefined}
        // Custom ARIA attributes
        {...aria}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

ScreenReaderOnly.displayName = 'ScreenReaderOnly'

/**
 * Component for status announcements to screen readers
 */
export interface ScreenReaderStatusProps {

  /**
   * Status message to announce
   */
  message: string

  /**
   * Priority of announcement
   */
  priority?: 'polite' | 'assertive'

  /**
   * Whether to clear previous announcements
   */
  clear?: boolean

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderStatus({
  message,
  priority = 'polite',
  clear = false,
  className
}: ScreenReaderStatusProps) {
  return (
    <ScreenReaderOnly
      live={priority}
      atomic={true}
      className={className}
    >
      {clear ? '\u00A0' : message}
    </ScreenReaderOnly>
  )
}

/**
 * Component for providing context to screen readers
 */
export interface ScreenReaderContextProps {

  /**
   * Contextual information
   */
  children: React.ReactNode

  /**
   * Type of context
   */
  context?: 'heading' | 'list' | 'navigation' | 'main' | 'complementary' | 'contentinfo'

  /**
   * Label for the context
   */
  label?: string

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderContext({
  children,
  context,
  label,
  className
}: ScreenReaderContextProps) {
  const getAriaRole = () => {
    switch (context) {
      case 'heading':
        return undefined // Use actual heading elements
      case 'list':
        return 'list'
      case 'navigation':
        return 'navigation'
      case 'main':
        return 'main'
      case 'complementary':
        return 'complementary'
      case 'contentinfo':
        return 'contentinfo'
      default:
        return 'region'
    }
  }

  return (
    <ScreenReaderOnly
      as="div"
      role={getAriaRole()}
      aria-label={label}
      className={className}
    >
      {children}
    </ScreenReaderOnly>
  )
}

/**
 * Component for hidden form field descriptions
 */
export interface ScreenReaderFieldDescriptionProps {

  /**
   * Description text
   */
  children: React.ReactNode

  /**
   * ID of the form field this describes
   */
  htmlFor: string

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderFieldDescription({
  children,
  htmlFor,
  className
}: ScreenReaderFieldDescriptionProps) {
  return (
    <ScreenReaderOnly
      as="div"
      id={`${htmlFor}-description`}
      className={className}
    >
      {children}
    </ScreenReaderOnly>
  )
}

/**
 * Component for hidden form field error messages
 */
export interface ScreenReaderFieldErrorProps {

  /**
   * Error message
   */
  children: React.ReactNode

  /**
   * ID of the form field this error is for
   */
  htmlFor: string

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderFieldError({
  children,
  htmlFor,
  className
}: ScreenReaderFieldErrorProps) {
  return (
    <ScreenReaderOnly
      as="div"
      id={`${htmlFor}-error`}
      role="alert"
      aria-live="assertive"
      className={className}
    >
      Error: {children}
    </ScreenReaderOnly>
  )
}

/**
 * Component for hidden form field success messages
 */
export interface ScreenReaderFieldSuccessProps {

  /**
   * Success message
   */
  children: React.ReactNode

  /**
   * ID of the form field this success message is for
   */
  htmlFor: string

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderFieldSuccess({
  children,
  htmlFor,
  className
}: ScreenReaderFieldSuccessProps) {
  return (
    <ScreenReaderOnly
      as="div"
      id={`${htmlFor}-success`}
      role="status"
      aria-live="polite"
      className={className}
    >
      Success: {children}
    </ScreenReaderOnly>
  )
}

/**
 * Component for providing table captions to screen readers
 */
export interface ScreenReaderTableCaptionProps {

  /**
   * Caption text
   */
  children: React.ReactNode

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderTableCaption({
  children,
  className
}: ScreenReaderTableCaptionProps) {
  return (
    <ScreenReaderOnly
      as="caption"
      className={className}
    >
      {children}
    </ScreenReaderOnly>
  )
}

/**
 * Component for providing figure descriptions to screen readers
 */
export interface ScreenReaderFigureDescriptionProps {

  /**
   * Description text
   */
  children: React.ReactNode

  /**
   * CSS class name
   */
  className?: string
}

export function ScreenReaderFigureDescription({
  children,
  className
}: ScreenReaderFigureDescriptionProps) {
  return (
    <ScreenReaderOnly
      as="figcaption"
      className={className}
    >
      {children}
    </ScreenReaderOnly>
  )
}

/**
 * Hook for creating screen reader announcements programmatically
 */
export function useScreenReaderAnnouncer() {
  const announce = (message: string, options: {
    priority?: 'polite' | 'assertive'
    clear?: boolean
  } = {}) => {
    const { priority = 'polite', clear = false } = options

    // Create temporary element for announcement
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = clear ? '\u00A0' : message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement)
      }
    }, 1000)
  }

  const announcePolite = (message: string) => {
    announce(message, { priority: 'polite' })
  }

  const announceAssertive = (message: string) => {
    announce(message, { priority: 'assertive' })
  }

  const clear = () => {
    announce('', { clear: true })
  }

  return {
    announce,
    announcePolite,
    announceAssertive,
    clear
  }
}

/**
 * Hook for managing screen reader focus
 */
export function useScreenReaderFocus() {
  const focusElement = (element: HTMLElement, announcement?: string) => {
    element.focus()

    if (announcement) {
      // Announce the focus change
      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.textContent = announcement

      document.body.appendChild(announcer)

      setTimeout(() => {
        if (announcer.parentNode) {
          announcer.parentNode.removeChild(announcer)
        }
      }, 1000)
    }
  }

  const announceFocus = (selector: string, announcement: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      focusElement(element, announcement)
    }
  }

  return {
    focusElement,
    announceFocus
  }
}

// CSS for screen reader only content
export const screenReaderOnlyStyles = `
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.sr-only-focusable:focus,
.sr-only-focusable:focus-within {
  position: static !important;
  width: auto !important;
  height: auto !important;
  padding: inherit !important;
  margin: inherit !important;
  overflow: visible !important;
  clip: auto !important;
  white-space: inherit !important;
}
`