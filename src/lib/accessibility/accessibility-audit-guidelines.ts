/**
 * Accessibility Audit - WCAG 2.1 Guidelines
 *
 * The WCAG guideline definitions (perceivable, operable, understandable,
 * robust) extracted from accessibility-audit.ts to keep the main module
 * under the 500 line lint budget.
 */

import type { WcagCriterionGroup } from './accessibility-audit-types'

const SEMANTIC_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'main',
  'nav',
  'section',
  'article',
  'aside',
  'header',
  'footer'
]

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

const INTERACTIVE_TAGS = ['button', 'a', 'input', 'select', 'textarea', 'details']

const ROLE_TAGS = ['button', 'link', 'input', 'select', 'textarea']

/**
 * WCAG 2.1 AA Guidelines for audit
 */
export const WCAG_GUIDELINES: {
  perceivable: WcagCriterionGroup
  operable: WcagCriterionGroup
  understandable: WcagCriterionGroup
  robust: WcagCriterionGroup
} = {
  perceivable: {
    '1.1.1': {
      title: 'Non-text Content',
      description: 'All non-text content has a text alternative',
      level: 'A',
      check: (element: Element) => {
        // Check for alt text on images, captions on videos, etc.
        if (element instanceof HTMLImageElement) {
          return Boolean(element.alt && element.alt.trim().length > 0)
        }
        if (element instanceof HTMLVideoElement) {
          return element.querySelector('track') !== null
        }
        return true
      }
    },
    '1.2.1': {
      title: 'Time-based Media',
      description: 'Alternatives for time-based media are provided',
      level: 'A',
      check: () => true // Implement as needed
    },
    '1.3.1': {
      title: 'Adaptable',
      description: 'Content can be presented in different ways',
      level: 'AA',
      check: (element: Element) => {
        // Check for semantic structure, proper headings, etc.
        return SEMANTIC_TAGS.some(tag => element.tagName.toLowerCase() === tag)
      }
    },
    '1.3.2': {
      title: 'Meaningful Sequence',
      description: 'The meaning of content does not depend on sensory characteristics',
      level: 'A',
      check: () => true // Check color-only instructions
    },
    '1.3.3': {
      title: 'Sensory Characteristics',
      description: 'Instructions do not rely solely on sensory characteristics',
      level: 'A',
      check: () => true // Check for non-color instructions
    },
    '1.3.4': {
      title: 'Orientation',
      description: 'Content does not restrict its view or operation',
      level: 'AA',
      check: () => true // Check for landscape/portrait restrictions
    },
    '1.3.5': {
      title: 'Identify Input Purpose',
      description: 'Input purpose can be programmatically determined',
      level: 'AA',
      check: (element: Element) => {
        if (element instanceof HTMLInputElement) {
          return element.autocomplete !== '' || element.type === 'hidden'
        }
        return true
      }
    },
    '1.4.1': {
      title: 'Use of Color',
      description: 'Color is not used as the only visual means of conveying information',
      level: 'A',
      check: () => true // Check for color-only indicators
    },
    '1.4.2': {
      title: 'Audio Control',
      description: 'Audio that plays automatically can be stopped',
      level: 'A',
      check: () => true // Check for auto-playing audio
    },
    '1.4.3': {
      title: 'Contrast (Minimum)',
      description: 'Text and images have contrast ratio of at least 4.5:1',
      level: 'AA',
      check: (element: Element) => {
        // Calculate contrast ratio
        const styles = window.getComputedStyle(element)
        const color = styles.color
        const backgroundColor = styles.backgroundColor

        if (color === 'rgba(0, 0, 0, 0)' || backgroundColor === 'rgba(0, 0, 0, 0)') {
          return true // Assume default colors are compliant
        }

        // Simplified contrast calculation - would need proper implementation
        return true // Placeholder
      }
    },
    '1.4.4': {
      title: 'Resize text',
      description: 'Text can be resized without assistive technology up to 200%',
      level: 'AA',
      check: () => true // Check for text resizing
    },
    '1.4.5': {
      title: 'Images of Text',
      description: 'Images of text are not used unless essential',
      level: 'AA',
      check: () => true // Check for text images
    },
    '1.4.6': {
      title: 'Contrast (Enhanced)',
      description: 'Contrast ratio of at least 7:1 for large text',
      level: 'AAA',
      check: () => true // Enhanced contrast check
    }
  },
  operable: {
    '2.1.1': {
      title: 'Keyboard',
      description: 'All functionality is available via keyboard',
      level: 'A',
      check: (element: Element) => {
        // Check for keyboard accessibility
        const tagName = element.tagName.toLowerCase()

        if (INTERACTIVE_TAGS.includes(tagName)) {
          return (
            (element as HTMLElement).tabIndex >= 0 || (element as HTMLElement).tabIndex === -1
          )
        }
        return true
      }
    },
    '2.1.2': {
      title: 'No Keyboard Trap',
      description: 'Keyboard focus is not trapped',
      level: 'A',
      check: () => true // Check for keyboard traps
    },
    '2.1.3': {
      title: 'Character Key Shortcuts',
      description: 'Keyboard shortcuts do not conflict with browser/assistive technology',
      level: 'A',
      check: () => true // Check for conflicting shortcuts
    },
    '2.1.4': {
      title: 'Character Key Shortcuts (Single)',
      description: 'Single key shortcuts can be turned off',
      level: 'A',
      check: () => true // Check for single key shortcuts
    },
    '2.2.1': {
      title: 'Timing Adjustable',
      description: 'Users can control time limits',
      level: 'A',
      check: () => true // Check for time limits
    },
    '2.2.2': {
      title: 'Pause, Stop, Hide',
      description: 'Moving, blinking, or scrolling content can be paused',
      level: 'A',
      check: () => true // Check for auto-moving content
    },
    '2.3.1': {
      title: 'Three Flashes or Below Threshold',
      description: 'Content does not flash more than 3 times per second',
      level: 'A',
      check: () => true // Check for flashing content
    },
    '2.3.2': {
      title: 'Three Flashes or Below Threshold',
      description: 'Content does not violate flash thresholds',
      level: 'AAA',
      check: () => true // Check flash thresholds
    },
    '2.4.1': {
      title: 'Bypass Blocks',
      description: 'Mechanism to bypass blocks of content is available',
      level: 'A',
      check: () => true // Check for skip links
    },
    '2.4.2': {
      title: 'Page Titled',
      description: 'Web pages have titles that describe topic',
      level: 'A',
      check: () => Boolean(document.title && document.title.trim().length > 0)
    },
    '2.4.3': {
      title: 'Focus Order',
      description: 'Focus order is logical and intuitive',
      level: 'A',
      check: () => true // Check focus order
    },
    '2.4.4': {
      title: 'Link Purpose',
      description: 'Purpose of each link can be determined from text alone',
      level: 'A',
      check: (element: Element) => {
        if (element instanceof HTMLAnchorElement) {
          return Boolean(element.textContent && element.textContent.trim().length > 0)
        }
        return true
      }
    },
    '2.4.5': {
      title: 'Multiple Ways',
      description: 'Multiple ways to locate pages are provided',
      level: 'AA',
      check: () => true // Check for navigation alternatives
    },
    '2.4.6': {
      title: 'Headings and Labels',
      description: 'Headings and labels describe topic or purpose',
      level: 'AA',
      check: (element: Element) => {
        const tagName = element.tagName.toLowerCase()

        if (HEADING_TAGS.includes(tagName)) {
          return Boolean(element.textContent && element.textContent.trim().length > 0)
        }
        return true
      }
    },
    '2.4.7': {
      title: 'Focus Visible',
      description: 'Keyboard focus indicator is visible',
      level: 'AA',
      check: () => true // Check for focus indicators
    }
  },
  understandable: {
    '3.1.1': {
      title: 'Language of Page',
      description: 'Language of page can be programmatically determined',
      level: 'A',
      check: () =>
        Boolean(document.documentElement.lang && document.documentElement.lang.length > 0)
    },
    '3.1.2': {
      title: 'Language of Parts',
      description: 'Language of parts can be programmatically determined',
      level: 'AA',
      check: () => true // Check for language changes
    },
    '3.2.1': {
      title: 'On Focus',
      description: 'Component focus does not cause context change',
      level: 'A',
      check: () => true // Check for focus changes
    },
    '3.2.2': {
      title: 'On Input',
      description: 'Changing settings does not cause context change',
      level: 'A',
      check: () => true // Check for input changes
    },
    '3.2.3': {
      title: 'Consistent Navigation',
      description: 'Navigation mechanisms are consistent',
      level: 'AA',
      check: () => true // Check navigation consistency
    },
    '3.2.4': {
      title: 'Consistent Identification',
      description: 'Components with same functionality are identified consistently',
      level: 'AA',
      check: () => true // Check component consistency
    },
    '3.3.1': {
      title: 'Error Identification',
      description: 'Errors are identified and described to user',
      level: 'A',
      check: (element: Element) => {
        // Check for error messages
        void element // parameter retained for API parity; would inspect aria attributes
        return true // Would need more sophisticated checking
      }
    },
    '3.3.2': {
      title: 'Labels or Instructions',
      description: 'Labels or instructions are provided when content requires input',
      level: 'A',
      check: (element: Element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        ) {
          return (
            Boolean(element.labels && element.labels.length > 0) ||
            Boolean(element.getAttribute('aria-label')) ||
            Boolean(element.getAttribute('aria-labelledby'))
          )
        }
        return true
      }
    },
    '3.3.3': {
      title: 'Error Suggestion',
      description: 'Suggestions for fixing errors are provided when appropriate',
      level: 'AA',
      check: () => true // Check for error suggestions
    },
    '3.3.4': {
      title: 'Error Prevention (Legal, Financial, Data)',
      description: 'Error prevention and confirmation is available',
      level: 'AA',
      check: () => true // Check for error prevention
    }
  },
  robust: {
    '4.1.1': {
      title: 'Parsing',
      description: 'Content is well-formed and uses valid markup',
      level: 'A',
      check: () => true // Check for valid HTML
    },
    '4.1.2': {
      title: 'Name, Role, Value',
      description: 'Name, role, value can be programmatically determined',
      level: 'A',
      check: (element: Element) => {
        // Check for proper ARIA attributes
        const hasRole =
          element.getAttribute('role') || ROLE_TAGS.includes(element.tagName.toLowerCase())
        const hasName =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          (element.textContent?.trim().length ?? 0) > 0
        return Boolean(hasRole && hasName)
      }
    },
    '4.1.3': {
      title: 'Status Messages',
      description: 'Status messages can be programmatically determined',
      level: 'AA',
      check: () => true // Check for status messages
    }
  }
}
