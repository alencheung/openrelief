'use client'

/**
 * Accessibility testing utilities and helpers for OpenRelief
 */

export interface AccessibilityTest {
  name: string
  description: string
  category: 'wcag' | 'best-practice' | 'custom'
  level: 'A' | 'AA' | 'AAA'
  test: (element: HTMLElement) => AccessibilityTestResult
}

export interface AccessibilityTestResult {
  passed: boolean
  message?: string
  element?: HTMLElement
  suggestion?: string
}

export interface AccessibilityReport {
  url: string
  timestamp: Date
  tests: AccessibilityTestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    score: number
  }
  violations: AccessibilityViolation[]
}

export interface AccessibilityViolation {
  rule: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  element: HTMLElement
  message: string
  suggestion: string
  wcagLevel: 'A' | 'AA' | 'AAA'
}

/**
 * WCAG 2.1 AA accessibility test suite
 */
export const accessibilityTests: AccessibilityTest[] = [
  // Keyboard Navigation Tests
  {
    name: 'keyboard-navigation',
    description: 'All interactive elements must be keyboard accessible',
    category: 'wcag',
    level: 'A',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const interactiveElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      for (const el of interactiveElements) {
        if (el instanceof HTMLElement) {
          const tabIndex = el.tabIndex
          if (tabIndex < 0 || el.getAttribute('aria-hidden') === 'true') {
            continue // Skip hidden or non-focusable elements
          }
          
          // Check if element has keyboard event handlers or is natively keyboard accessible
          const hasKeyboardHandler = 
            el.onkeydown || el.onkeyup || el.onkeypress ||
            el.tagName === 'BUTTON' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'SELECT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'A'
          
          if (!hasKeyboardHandler) {
            return {
              passed: false,
              element: el,
              message: `Element ${el.tagName} is not keyboard accessible`,
              suggestion: 'Add keyboard event handlers or use natively keyboard-accessible elements'
            }
          }
        }
      }
      
      return { passed: true }
    }
  },

  // Focus Management Tests
  {
    name: 'focus-management',
    description: 'Focus must be visible and properly managed',
    category: 'wcag',
    level: 'AA',
    test: (element: HTMLElement): AccessibilityTestResult => {
      // Check for visible focus indicators
      const style = window.getComputedStyle(element)
      const hasFocusStyles = 
        style.outline !== 'none' && style.outline !== '' ||
        style.boxShadow !== 'none' && style.boxShadow !== '' ||
        element.getAttribute('data-focus-visible') !== null
      
      if (!hasFocusStyles) {
        return {
          passed: false,
          element,
          message: 'Element lacks visible focus indicator',
          suggestion: 'Add :focus styles with outline, box-shadow, or data-focus-visible attribute'
        }
      }
      
      return { passed: true }
    }
  },

  // ARIA Label Tests
  {
    name: 'aria-labels',
    description: 'Interactive elements must have accessible names',
    category: 'wcag',
    level: 'A',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const interactiveElements = element.querySelectorAll(
        'button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]'
      )
      
      for (const el of interactiveElements) {
        if (el instanceof HTMLElement) {
          const accessibleName = getAccessibleName(el)
          
          if (!accessibleName || accessibleName.trim() === '') {
            return {
              passed: false,
              element: el,
              message: `Element ${el.tagName} lacks accessible name`,
              suggestion: 'Add aria-label, aria-labelledby, or visible text content'
            }
          }
        }
      }
      
      return { passed: true }
    }
  },

  // Color Contrast Tests
  {
    name: 'color-contrast',
    description: 'Text must have sufficient color contrast',
    category: 'wcag',
    level: 'AA',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const textElements = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, label')
      
      for (const el of textElements) {
        if (el instanceof HTMLElement && el.textContent?.trim()) {
          const style = window.getComputedStyle(el)
          const color = style.color
          const backgroundColor = style.backgroundColor
          
          // Skip if colors are not explicitly set
          if (color === 'rgb(0, 0, 0)' && backgroundColor === 'rgba(0, 0, 0, 0)') {
            continue
          }
          
          const contrast = calculateContrastRatio(color, backgroundColor)
          
          if (contrast < 4.5) { // WCAG AA standard
            return {
              passed: false,
              element: el,
              message: `Insufficient color contrast: ${contrast.toFixed(2)}:1`,
              suggestion: 'Increase color contrast to at least 4.5:1 for normal text'
            }
          }
        }
      }
      
      return { passed: true }
    }
  },

  // Heading Structure Tests
  {
    name: 'heading-structure',
    description: 'Headings must be properly structured',
    category: 'best-practice',
    level: 'AA',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const levels: number[] = []
      
      for (const heading of headings) {
        const level = parseInt(heading.tagName.charAt(1))
        levels.push(level)
      }
      
      // Check for skipped heading levels
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
          return {
            passed: false,
            element: headings[i] as HTMLElement,
            message: `Skipped heading level from h${levels[i - 1]} to h${levels[i]}`,
            suggestion: 'Use heading levels sequentially without skipping levels'
          }
        }
      }
      
      // Check for multiple h1 elements
      const h1Count = levels.filter(level => level === 1).length
      if (h1Count > 1) {
        return {
          passed: false,
          message: `Found ${h1Count} h1 elements`,
          suggestion: 'Use only one h1 element per page'
        }
      }
      
      return { passed: true }
    }
  },

  // Alt Text Tests
  {
    name: 'image-alt-text',
    description: 'Images must have alternative text',
    category: 'wcag',
    level: 'A',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const images = element.querySelectorAll('img')
      
      for (const img of images) {
        const alt = img.getAttribute('alt')
        const role = img.getAttribute('role')
        
        // Skip decorative images with role="presentation" or alt=""
        if (role === 'presentation' || alt === '') {
          continue
        }
        
        if (!alt) {
          return {
            passed: false,
            element: img as HTMLElement,
            message: 'Image missing alt text',
            suggestion: 'Add descriptive alt text or role="presentation" for decorative images'
          }
        }
      }
      
      return { passed: true }
    }
  },

  // Form Label Tests
  {
    name: 'form-labels',
    description: 'Form inputs must have associated labels',
    category: 'wcag',
    level: 'A',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const inputs = element.querySelectorAll('input, select, textarea')
      
      for (const input of inputs) {
        if (input instanceof HTMLElement) {
          const type = input.getAttribute('type')
          
          // Skip hidden inputs and submit buttons
          if (type === 'hidden' || type === 'submit' || type === 'button') {
            continue
          }
          
          const hasLabel = 
            input.getAttribute('aria-label') ||
            input.getAttribute('aria-labelledby') ||
            input.labels?.length ||
            input.getAttribute('title')
          
          if (!hasLabel) {
            return {
              passed: false,
              element: input,
              message: `Form input missing associated label`,
              suggestion: 'Add label element, aria-label, or aria-labelledby'
            }
          }
        }
      }
      
      return { passed: true }
    }
  },

  // Link Purpose Tests
  {
    name: 'link-purpose',
    description: 'Links must have descriptive text',
    category: 'wcag',
    level: 'AA',
    test: (element: HTMLElement): AccessibilityTestResult => {
      const links = element.querySelectorAll('a[href]')
      
      for (const link of links) {
        if (link instanceof HTMLElement) {
          const text = link.textContent?.trim()
          const ariaLabel = link.getAttribute('aria-label')
          const accessibleName = ariaLabel || text || ''
          
          // Check for generic link text
          const genericTexts = ['click here', 'read more', 'learn more', 'here', 'link']
          if (genericTexts.includes(accessibleName.toLowerCase())) {
            return {
              passed: false,
              element: link,
              message: 'Link has non-descriptive text',
              suggestion: 'Use more descriptive link text that explains the destination'
            }
          }
        }
      }
      
      return { passed: true }
    }
  }
]

/**
 * Calculate color contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1)
  const rgb2 = parseColor(color2)
  
  const l1 = calculateLuminance(rgb1)
  const l2 = calculateLuminance(rgb2)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Parse color string to RGB object
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    } else {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
  }
  
  // Handle rgb colors
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    }
  }
  
  // Handle rgba colors
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
    }
  }
  
  // Default to black for unsupported formats
  return { r: 0, g: 0, b: 0 }
}

/**
 * Calculate relative luminance of RGB color
 */
function calculateLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r / 255
  const gsRGB = rgb.g / 255
  const bsRGB = rgb.b / 255
  
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Get accessible name of an element
 */
function getAccessibleName(element: HTMLElement): string {
  // Check for aria-label first
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) {
    return ariaLabel
  }
  
  // Check for aria-labelledby
  const ariaLabelledby = element.getAttribute('aria-labelledby')
  if (ariaLabelledby) {
    const ids = ariaLabelledby.split(' ')
    const labels = ids.map(id => {
      const labelElement = document.getElementById(id)
      return labelElement?.textContent || ''
    }).filter(Boolean)
    
    if (labels.length > 0) {
      return labels.join(' ')
    }
  }
  
  // Check for form labels
  if (element.labels && element.labels.length > 0) {
    return Array.from(element.labels).map(label => label.textContent || '').join(' ')
  }
  
  // Check for alt text on images
  if (element.tagName === 'IMG') {
    return element.getAttribute('alt') || ''
  }
  
  // Check for title attribute
  const title = element.getAttribute('title')
  if (title) {
    return title
  }
  
  // Use text content as fallback
  return element.textContent || ''
}

/**
 * Run accessibility tests on an element
 */
export function runAccessibilityTests(element: HTMLElement = document.body): AccessibilityReport {
  const results: AccessibilityTestResult[] = []
  const violations: AccessibilityViolation[] = []
  
  for (const test of accessibilityTests) {
    const result = test.test(element)
    results.push(result)
    
    if (!result.passed && result.element) {
      violations.push({
        rule: test.name,
        impact: getImpactLevel(test.name),
        element: result.element,
        message: result.message || 'Test failed',
        suggestion: result.suggestion || 'Fix the accessibility issue',
        wcagLevel: test.level,
      })
    }
  }
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  const score = total > 0 ? (passed / total) * 100 : 100
  
  return {
    url: window.location.href,
    timestamp: new Date(),
    tests: results,
    summary: {
      total,
      passed,
      failed,
      score,
    },
    violations,
  }
}

/**
 * Get impact level for a test violation
 */
function getImpactLevel(testName: string): 'minor' | 'moderate' | 'serious' | 'critical' {
  const criticalTests = ['keyboard-navigation', 'aria-labels', 'form-labels']
  const seriousTests = ['color-contrast', 'image-alt-text']
  const moderateTests = ['focus-management', 'link-purpose']
  
  if (criticalTests.includes(testName)) return 'critical'
  if (seriousTests.includes(testName)) return 'serious'
  if (moderateTests.includes(testName)) return 'moderate'
  return 'minor'
}

/**
 * Generate accessibility report in JSON format
 */
export function generateAccessibilityReport(element?: HTMLElement): string {
  const report = runAccessibilityTests(element)
  return JSON.stringify(report, null, 2)
}

/**
 * Print accessibility violations to console
 */
export function logAccessibilityViolations(element?: HTMLElement): void {
  const report = runAccessibilityTests(element)
  
  if (report.violations.length === 0) {
    console.log('✅ No accessibility violations found!')
    return
  }
  
  console.group(`🚨 Accessibility Violations (${report.violations.length} found)`)
  console.log(`Score: ${report.summary.score.toFixed(1)}%`)
  console.log(`Passed: ${report.summary.passed}/${report.summary.total}`)
  
  report.violations.forEach((violation, index) => {
    console.group(`${index + 1}. ${violation.rule} (${violation.impact})`)
    console.log('Element:', violation.element)
    console.log('Message:', violation.message)
    console.log('Suggestion:', violation.suggestion)
    console.log('WCAG Level:', violation.wcagLevel)
    console.groupEnd()
  })
  
  console.groupEnd()
}

/**
 * Check if element is accessible for keyboard navigation
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase()
  const tabIndex = element.tabIndex
  const ariaHidden = element.getAttribute('aria-hidden')
  
  // Check if element is hidden
  if (ariaHidden === 'true' || tabIndex < 0) {
    return false
  }
  
  // Check if element is natively keyboard accessible
  const nativelyAccessible = [
    'button', 'input', 'select', 'textarea', 'a', 'area',
    'summary', 'details', 'iframe', 'object', 'embed',
    'audio', 'video', 'menuitem'
  ].includes(tagName)
  
  if (nativelyAccessible) {
    return true
  }
  
  // Check if element has ARIA role that makes it accessible
  const accessibleRoles = [
    'button', 'link', 'checkbox', 'radio', 'combobox',
    'listbox', 'textbox', 'slider', 'spinbutton', 'switch',
    'tab', 'tabpanel', 'menuitem', 'option', 'treeitem'
  ]
  
  const role = element.getAttribute('role')
  if (role && accessibleRoles.includes(role.toLowerCase())) {
    return true
  }
  
  // Check if element has tabindex > 0
  if (tabIndex > 0) {
    return true
  }
  
  return false
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
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
    'video[controls]',
  ].join(', ')
  
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
}

/**
 * Check if element has sufficient color contrast
 */
export function hasSufficientContrast(element: HTMLElement, level: 'AA' | 'AAA' = 'AA'): boolean {
  const style = window.getComputedStyle(element)
  const color = style.color
  const backgroundColor = style.backgroundColor
  
  if (color === 'rgb(0, 0, 0)' && backgroundColor === 'rgba(0, 0, 0, 0)') {
    return true // Skip if colors are not explicitly set
  }
  
  const contrast = calculateContrastRatio(color, backgroundColor)
  const minimumContrast = level === 'AAA' ? 7 : 4.5
  
  return contrast >= minimumContrast
}