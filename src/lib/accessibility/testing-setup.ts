/**
 * Accessibility testing setup for OpenRelief
 * 
 * Provides automated testing utilities, validation rules,
 * and development tools for ensuring WCAG compliance.
 */

import { AccessibilityConfig, AccessibilityRule, AccessibilityViolation } from './config'
import { runAccessibilityTests, generateAccessibilityReport } from './testing'

/**
 * Accessibility testing runner
 */
export class AccessibilityTester {
  private config: AccessibilityConfig
  private customRules: AccessibilityRule[] = []

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = { ...require('./config').defaultAccessibilityConfig, ...config }
    this.customRules = this.config.customRules
  }

  /**
   * Run all accessibility tests on the current page
   */
  runTests(): AccessibilityViolation[] {
    if (!this.config.enableTesting) {
      return []
    }

    const violations: AccessibilityViolation[] = []
    
    // Run built-in tests
    for (const ruleName of this.config.testRules) {
      const rule = this.getRuleByName(ruleName)
      if (rule && rule.enabled) {
        const ruleViolations = this.runRule(rule)
        violations.push(...ruleViolations)
      }
    }

    // Run custom tests
    for (const rule of this.customRules) {
      if (rule.enabled) {
        const ruleViolations = this.runRule(rule)
        violations.push(...ruleViolations)
      }
    }

    return violations
  }

  /**
   * Run tests on a specific element
   */
  testElement(element: HTMLElement): AccessibilityViolation[] {
    if (!this.config.enableTesting) {
      return []
    }

    const violations: AccessibilityViolation[] = []
    
    // Test against all applicable rules
    const allRules = [
      ...this.config.testRules.map(name => this.getRuleByName(name)),
      ...this.customRules,
    ].filter(Boolean)

    for (const rule of allRules) {
      if (rule.enabled && element.matches(rule.selector)) {
        const violation = rule.test(element)
        if (violation) {
          violations.push(violation)
        }
      }
    }

    return violations
  }

  /**
   * Get rule by name
   */
  private getRuleByName(name: string): AccessibilityRule | null {
    const ruleMap: Record<string, AccessibilityRule> = {
      'keyboard-navigation': {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        description: 'All interactive elements must be keyboard accessible',
        wcagGuideline: '2.1.1',
        severity: 'error',
        selector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="menuitem"]',
        test: (element) => {
          const tabIndex = element.tabIndex
          const ariaHidden = element.getAttribute('aria-hidden')
          
          if (ariaHidden === 'true' || tabIndex < 0) {
            return null
          }
          
          const hasKeyboardHandler = 
            element.onkeydown || element.onkeyup || element.onkeypress ||
            element.tagName === 'BUTTON' ||
            element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            element.tagName === 'A'
          
          if (!hasKeyboardHandler) {
            return {
              rule: 'keyboard-navigation',
              element,
              message: `Element ${element.tagName} is not keyboard accessible`,
              suggestion: 'Add keyboard event handlers or use natively keyboard-accessible elements',
              severity: 'error',
              wcagGuideline: '2.1.1',
            }
          }
          
          return null
        },
        enabled: true,
      },
      
      'focus-management': {
        id: 'focus-management',
        name: 'Focus Management',
        description: 'Focus must be visible and properly managed',
        wcagGuideline: '2.4.3',
        severity: 'error',
        selector: 'button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])',
        test: (element) => {
          const style = window.getComputedStyle(element)
          const hasFocusStyles = 
            style.outline !== 'none' && style.outline !== '' ||
            style.boxShadow !== 'none' && style.boxShadow !== '' ||
            element.getAttribute('data-focus-visible') !== null
          
          if (!hasFocusStyles) {
            return {
              rule: 'focus-management',
              element,
              message: 'Element lacks visible focus indicator',
              suggestion: 'Add :focus styles with outline, box-shadow, or data-focus-visible attribute',
              severity: 'error',
              wcagGuideline: '2.4.3',
            }
          }
          
          return null
        },
        enabled: true,
      },
      
      'aria-labels': {
        id: 'aria-labels',
        name: 'ARIA Labels',
        description: 'Interactive elements must have accessible names',
        wcagGuideline: '2.4.6',
        severity: 'error',
        selector: 'button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]',
        test: (element) => {
          const ariaLabel = element.getAttribute('aria-label')
          const ariaLabelledby = element.getAttribute('aria-labelledby')
          const textContent = element.textContent?.trim()
          
          if (!ariaLabel && !ariaLabelledby && !textContent) {
            return {
              rule: 'aria-labels',
              element,
              message: `Element ${element.tagName} lacks accessible name`,
              suggestion: 'Add aria-label, aria-labelledby, or visible text content',
              severity: 'error',
              wcagGuideline: '2.4.6',
            }
          }
          
          return null
        },
        enabled: true,
      },
      
      'color-contrast': {
        id: 'color-contrast',
        name: 'Color Contrast',
        description: 'Text must have sufficient color contrast',
        wcagGuideline: '1.4.3',
        severity: 'error',
        selector: 'p, h1, h2, h3, h4, h5, h6, span, div, label, button',
        test: (element) => {
          const style = window.getComputedStyle(element)
          const color = style.color
          const backgroundColor = style.backgroundColor
          
          // Skip if colors are not explicitly set
          if (color === 'rgb(0, 0, 0)' && backgroundColor === 'rgba(0, 0, 0, 0)') {
            return null
          }
          
          const contrast = this.calculateContrastRatio(color, backgroundColor)
          
          if (contrast < 4.5) {
            return {
              rule: 'color-contrast',
              element,
              message: `Insufficient color contrast: ${contrast.toFixed(2)}:1`,
              suggestion: 'Increase color contrast to at least 4.5:1 for normal text',
              severity: 'error',
              wcagGuideline: '1.4.3',
            }
          }
          
          return null
        },
        enabled: true,
      },
      
      'skip-links': {
        id: 'skip-links',
        name: 'Skip Links',
        description: 'Skip links must be present and functional',
        wcagGuideline: '2.4.1',
        severity: 'error',
        selector: 'a[href^="#skip-"]',
        test: (element) => {
          const targetId = element.getAttribute('href')?.slice(1)
          const targetElement = targetId ? document.getElementById(targetId) : null
          
          if (!targetElement) {
            return {
              rule: 'skip-links',
              element,
              message: `Skip link target not found: ${targetId}`,
              suggestion: 'Ensure skip link targets exist on the page',
              severity: 'error',
              wcagGuideline: '2.4.1',
            }
          }
          
          return null
        },
        enabled: true,
      },
    }
    
    return ruleMap[name] || null
  }

  /**
   * Calculate color contrast ratio
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1)
    const rgb2 = this.parseColor(color2)
    
    const l1 = this.calculateLuminance(rgb1)
    const l2 = this.calculateLuminance(rgb2)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * Parse color string to RGB
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
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
    
    // Default to black
    return { r: 0, g: 0, b: 0 }
  }

  /**
   * Calculate relative luminance
   */
  private calculateLuminance(rgb: { r: number; g: number; b: number }): number {
    const rsRGB = rgb.r / 255
    const gsRGB = rgb.g / 255
    const bsRGB = rgb.b / 255
    
    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  /**
   * Run a specific rule
   */
  private runRule(rule: AccessibilityRule): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = []
    const elements = document.querySelectorAll(rule.selector) as NodeListOf<HTMLElement>
    
    for (const element of elements) {
      const violation = rule.test(element)
      if (violation) {
        violations.push(violation)
      }
    }
    
    return violations
  }

  /**
   * Add custom rule
   */
  addCustomRule(rule: AccessibilityRule): void {
    this.customRules.push(rule)
  }

  /**
   * Remove custom rule
   */
  removeCustomRule(ruleId: string): void {
    this.customRules = this.customRules.filter(rule => rule.id !== ruleId)
  }

  /**
   * Get test results summary
   */
  getTestSummary(violations: AccessibilityViolation[]) {
    const errors = violations.filter(v => v.severity === 'error')
    const warnings = violations.filter(v => v.severity === 'warning')
    const info = violations.filter(v => v.severity === 'info')
    
    const score = violations.length > 0 ? Math.max(0, 100 - (errors.length * 20)) : 100
    
    return {
      total: violations.length,
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
      score,
      wcagLevel: this.getWCAGLevel(score),
    }
  }

  /**
   * Determine WCAG compliance level
   */
  private getWCAGLevel(score: number): 'A' | 'AA' | 'AAA' | 'Not Compliant' {
    if (score >= 95) return 'AAA'
    if (score >= 80) return 'AA'
    if (score >= 60) return 'A'
    return 'Not Compliant'
  }
}

/**
 * Global accessibility tester instance
 */
export const accessibilityTester = new AccessibilityTester()

/**
 * Development tools for accessibility testing
 */
export class AccessibilityDevTools {
  private static instance: AccessibilityDevTools | null = null

  static getInstance(): AccessibilityDevTools {
    if (!this.instance) {
      this.instance = new AccessibilityDevTools()
    }
    return this.instance
  }

  constructor() {
    this.setupDevTools()
  }

  /**
   * Setup development tools
   */
  private setupDevTools(): void {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    this.createAccessibilityPanel()
    this.setupKeyboardShortcuts()
    this.setupContinuousTesting()
  }

  /**
   * Create accessibility panel for developers
   */
  private createAccessibilityPanel(): void {
    const panel = document.createElement('div')
    panel.id = 'accessibility-dev-panel'
    panel.innerHTML = `
      <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; border: 1px solid #ccc; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); font-family: monospace; font-size: 12px; min-width: 300px;">
        <h3>Accessibility Tools</h3>
        <div style="margin-bottom: 10px;">
          <button onclick="window.accessibilityTester.runTests()" style="margin-right: 5px;">Run Tests</button>
          <button onclick="window.accessibilityTester.generateReport()" style="margin-right: 5px;">Generate Report</button>
          <button onclick="window.accessibilityDevTools.toggleHighlighting()" style="margin-right: 5px;">Toggle Highlighting</button>
        </div>
        <div id="accessibility-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
      </div>
    `
    document.body.appendChild(panel)
  }

  /**
   * Setup keyboard shortcuts for accessibility testing
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+A: Run accessibility tests
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        this.runTestsAndDisplay()
      }
      
      // Ctrl+Shift+R: Generate accessibility report
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        this.generateAndDisplayReport()
      }
      
      // Ctrl+Shift+H: Toggle highlighting
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        this.toggleHighlighting()
      }
    })
  }

  /**
   * Setup continuous testing during development
   */
  private setupContinuousTesting(): void {
    // Test on DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        const violations = accessibilityTester.runTests()
        if (violations.length > 0) {
          console.warn('Accessibility violations detected:', violations)
        }
      }, 100)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })
  }

  /**
   * Run tests and display results
   */
  private runTestsAndDisplay(): void {
    const violations = accessibilityTester.runTests()
    const resultsDiv = document.getElementById('accessibility-results')
    
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <h4>Test Results (${violations.length} violations)</h4>
        ${violations.map(v => `
          <div style="margin-bottom: 5px; padding: 5px; border-left: 3px solid ${v.severity === 'error' ? 'red' : v.severity === 'warning' ? 'orange' : 'blue'}; background: #f5f5f5;">
            <strong>${v.rule}:</strong> ${v.message}<br>
            <small>Suggestion: ${v.suggestion}</small>
          </div>
        `).join('')}
      `
    }
  }

  /**
   * Generate and display report
   */
  private generateAndDisplayReport(): void {
    const report = generateAccessibilityReport()
    const resultsDiv = document.getElementById('accessibility-results')
    
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <h4>Accessibility Report</h4>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 11px;">${report}</pre>
        <button onclick="navigator.clipboard.writeText(\`${report}\`)" style="margin-top: 10px;">Copy to Clipboard</button>
      `
    }
  }

  /**
   * Toggle accessibility highlighting
   */
  private toggleHighlighting(): void {
    document.body.classList.toggle('accessibility-highlighting')
  }
}

/**
 * Initialize accessibility testing in development
 */
export function initializeAccessibilityTesting(): void {
  if (process.env.NODE_ENV === 'development') {
    AccessibilityDevTools.getInstance()
    
    // Run initial tests after page load
    setTimeout(() => {
      const violations = accessibilityTester.runTests()
      if (violations.length > 0) {
        console.group('🚨 Accessibility Violations Detected')
        violations.forEach((violation, index) => {
          console.group(`${index + 1}. ${violation.rule}`)
          console.log('Element:', violation.element)
          console.log('Message:', violation.message)
          console.log('Suggestion:', violation.suggestion)
          console.log('WCAG Guideline:', violation.wcagGuideline)
          console.groupEnd()
        })
        console.groupEnd()
      }
    }, 1000)
  }
}

/**
 * CSS for accessibility testing
 */
export const accessibilityTestingCSS = `
.accessibility-highlighting * {
  outline: 2px dashed red !important;
}

.accessibility-highlighting button:focus,
.accessibility-highlighting input:focus,
.accessibility-highlighting select:focus,
.accessibility-highlighting textarea:focus,
.accessibility-highlighting a:focus {
  outline: 3px solid blue !important;
  background: yellow !important;
}

#accessibility-dev-panel {
  font-family: system-ui, -apple-system, sans-serif;
}

#accessibility-dev-panel button {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

#accessibility-dev-panel button:hover {
  background: #0056b3;
}
`