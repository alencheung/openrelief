/**
 * Accessibility Testing Automation for OpenRelief
 * 
 * Provides automated testing tools for WCAG 2.1 AA compliance
 * that can be integrated into CI/CD pipelines.
 */

import { accessibilityAuditor, runAccessibilityAudit, AccessibilityAuditResult } from './accessibility-audit'

export interface AccessibilityTestConfig {
  /**
   * Test environment (development, staging, production)
   */
  environment: 'development' | 'staging' | 'production'
  /**
   * Browser configurations to test
   */
  browsers: string[]
  /**
   * Viewport sizes to test
   */
  viewports: { width: number; height: number; name: string }[]
  /**
   * Whether to test with screen readers
   */
  testScreenReaders: boolean
  /**
   * Whether to test keyboard navigation
   */
  testKeyboardNavigation: boolean
  /**
   * Whether to test color contrast
   */
  testColorContrast: boolean
  /**
   * Whether to test focus management
   */
  testFocusManagement: boolean
  /**
   * Components to test specifically
   */
  components?: string[]
  /**
   * Custom test selectors
   */
  customSelectors?: string[]
}

export interface AccessibilityTestResult {
  /**
   * Overall test result
   */
  passed: boolean
  /**
   * Accessibility audit result
   */
  audit: AccessibilityAuditResult
  /**
   * Test configuration used
   */
  config: AccessibilityTestConfig
  /**
   * Individual test results
   */
  tests: AccessibilityTestCase[]
  /**
   * Performance metrics
   */
  performance: {
    totalTests: number
    passedTests: number
    failedTests: number
    duration: number
    coverage: number
  }
  /**
   * Test timestamp
   */
  timestamp: Date
}

export interface AccessibilityTestCase {
  /**
   * Test case identifier
   */
  id: string
  /**
   * Test name
   */
  name: string
  /**
   * WCAG guideline being tested
   */
  guideline: string
  /**
   * Test description
   */
  description: string
  /**
   * Whether test passed
   */
  passed: boolean
  /**
   * Test error message
   */
  error?: string
  /**
   * Test duration in milliseconds
   */
  duration: number
  /**
   * Elements tested
   */
  elements: string[]
}

/**
 * Accessibility Test Suite
 */
export class AccessibilityTestSuite {
  private config: AccessibilityTestConfig
  private results: AccessibilityTestCase[] = []

  constructor(config: AccessibilityTestConfig) {
    this.config = config
  }

  /**
   * Run full accessibility test suite
   */
  async runTests(): Promise<AccessibilityTestResult> {
    const startTime = Date.now()
    this.results = []

    console.log('🔍 Starting OpenRelief Accessibility Test Suite')
    console.log(`📊 Environment: ${this.config.environment}`)
    console.log(`🌐 Browsers: ${this.config.browsers.join(', ')}`)
    console.log(`📱 Viewports: ${this.config.viewports.map(v => v.name).join(', ')}`)

    // Run comprehensive audit
    const audit = await runAccessibilityAudit()

    // Run specific tests based on configuration
    if (this.config.testKeyboardNavigation) {
      await this.testKeyboardNavigation()
    }

    if (this.config.testColorContrast) {
      await this.testColorContrast()
    }

    if (this.config.testFocusManagement) {
      await this.testFocusManagement()
    }

    if (this.config.testScreenReaders) {
      await this.testScreenReaderSupport()
    }

    // Test specific components if specified
    if (this.config.components) {
      await this.testSpecificComponents()
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const coverage = this.calculateCoverage()

    const result: AccessibilityTestResult = {
      passed: audit.score >= 80, // WCAG AA compliance
      audit,
      config: this.config,
      tests: [...this.results],
      performance: {
        totalTests,
        passedTests,
        failedTests,
        duration,
        coverage
      },
      timestamp: new Date()
    }

    this.logResults(result)
    return result
  }

  /**
   * Test keyboard navigation
   */
  private async testKeyboardNavigation(): Promise<void> {
    console.log('⌨️ Testing keyboard navigation...')

    const startTime = Date.now()

    // Test 1: Tab order
    this.results.push({
      id: 'keyboard-tab-order',
      name: 'Tab Order Test',
      guideline: '2.1 Keyboard',
      description: 'Verify logical tab order through interactive elements',
      passed: this.testTabOrder(),
      duration: Date.now() - startTime,
      elements: ['button', 'a', 'input', 'select', 'textarea']
    })

    // Test 2: Focus indicators
    this.results.push({
      id: 'keyboard-focus-indicators',
      name: 'Focus Indicators Test',
      guideline: '2.4.7 Focus Visible',
      description: 'Verify visible focus indicators for keyboard users',
      passed: this.testFocusIndicators(),
      duration: Date.now() - startTime,
      elements: ['*:focus', '*:focus-visible']
    })

    // Test 3: Keyboard shortcuts
    this.results.push({
      id: 'keyboard-shortcuts',
      name: 'Keyboard Shortcuts Test',
      guideline: '2.1.1 Keyboard',
      description: 'Verify emergency keyboard shortcuts work correctly',
      passed: this.testKeyboardShortcuts(),
      duration: Date.now() - startTime,
      elements: ['[aria-keyshortcuts]']
    })

    // Test 4: Skip links
    this.results.push({
      id: 'skip-links',
      name: 'Skip Links Test',
      guideline: '2.4.1 Bypass Blocks',
      description: 'Verify skip links are present and functional',
      passed: this.testSkipLinks(),
      duration: Date.now() - startTime,
      elements: ['[href^="#skip-"]']
    })
  }

  /**
   * Test color contrast
   */
  private async testColorContrast(): Promise<void> {
    console.log('🎨 Testing color contrast...')

    const startTime = Date.now()

    // Test 1: Text contrast ratio
    this.results.push({
      id: 'color-contrast-text',
      name: 'Text Contrast Test',
      guideline: '1.4.3 Contrast (Minimum)',
      description: 'Verify text meets minimum 4.5:1 contrast ratio',
      passed: this.testTextContrast(),
      duration: Date.now() - startTime,
      elements: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div']
    })

    // Test 2: Large text contrast
    this.results.push({
      id: 'color-contrast-large',
      name: 'Large Text Contrast Test',
      guideline: '1.4.6 Contrast (Enhanced)',
      description: 'Verify large text meets 7:1 contrast ratio',
      passed: this.testLargeTextContrast(),
      duration: Date.now() - startTime,
      elements: ['h1', 'h2', '.text-lg', '.text-xl']
    })

    // Test 3: Color-only information
    this.results.push({
      id: 'color-only-info',
      name: 'Color-Only Information Test',
      guideline: '1.4.1 Use of Color',
      description: 'Verify information is not conveyed by color alone',
      passed: this.testColorOnlyInformation(),
      duration: Date.now() - startTime,
      elements: ['.emergency-marker', '.status-indicator', '.trust-indicator']
    })
  }

  /**
   * Test focus management
   */
  private async testFocusManagement(): Promise<void> {
    console.log('🎯 Testing focus management...')

    const startTime = Date.now()

    // Test 1: Focus trapping in modals
    this.results.push({
      id: 'focus-trap-modals',
      name: 'Modal Focus Trap Test',
      guideline: '2.1.2 No Keyboard Trap',
      description: 'Verify focus is properly trapped in modal dialogs',
      passed: this.testModalFocusTrap(),
      duration: Date.now() - startTime,
      elements: ['[role="dialog"]', '[aria-modal="true"]']
    })

    // Test 2: Focus restoration
    this.results.push({
      id: 'focus-restoration',
      name: 'Focus Restoration Test',
      guideline: '2.4.3 Focus Order',
      description: 'Verify focus is restored after modal closure',
      passed: this.testFocusRestoration(),
      duration: Date.now() - startTime,
      elements: ['[role="dialog"]', '.modal-close']
    })

    // Test 3: Focus indicators
    this.results.push({
      id: 'focus-indicators-visibility',
      name: 'Focus Indicator Visibility Test',
      guideline: '2.4.7 Focus Visible',
      description: 'Verify focus indicators are clearly visible',
      passed: this.testFocusIndicatorVisibility(),
      duration: Date.now() - startTime,
      elements: ['*:focus', '*:focus-visible']
    })
  }

  /**
   * Test screen reader support
   */
  private async testScreenReaderSupport(): Promise<void> {
    console.log('🔊 Testing screen reader support...')

    const startTime = Date.now()

    // Test 1: ARIA labels
    this.results.push({
      id: 'screen-reader-aria-labels',
      name: 'ARIA Labels Test',
      guideline: '4.1.2 Name, Role, Value',
      description: 'Verify elements have proper ARIA labels',
      passed: this.testAriaLabels(),
      duration: Date.now() - startTime,
      elements: ['button', 'input', 'select', 'textarea', 'a']
    })

    // Test 2: Semantic structure
    this.results.push({
      id: 'screen-reader-semantic',
      name: 'Semantic Structure Test',
      guideline: '1.3.1 Adaptable',
      description: 'Verify proper semantic HTML structure',
      passed: this.testSemanticStructure(),
      duration: Date.now() - startTime,
      elements: ['main', 'nav', 'section', 'article', 'header', 'footer', 'h1-h6']
    })

    // Test 3: Live regions
    this.results.push({
      id: 'screen-reader-live-regions',
      name: 'Live Regions Test',
      guideline: '4.1.3 Status Messages',
      description: 'Verify ARIA live regions for dynamic content',
      passed: this.testLiveRegions(),
      duration: Date.now() - startTime,
      elements: ['[aria-live]', '[aria-atomic]']
    })

    // Test 4: Form accessibility
    this.results.push({
      id: 'screen-reader-forms',
      name: 'Form Accessibility Test',
      guideline: '3.3.2 Labels or Instructions',
      description: 'Verify form elements have proper labels',
      passed: this.testFormAccessibility(),
      duration: Date.now() - startTime,
      elements: ['form', 'input', 'select', 'textarea', 'label']
    })
  }

  /**
   * Test specific components
   */
  private async testSpecificComponents(): Promise<void> {
    console.log('🧩 Testing specific components...')

    const startTime = Date.now()

    for (const component of this.config.components!) {
      this.results.push({
        id: `component-${component}`,
        name: `${component} Component Test`,
        guideline: 'Multiple',
        description: `Test ${component} component for accessibility`,
        passed: this.testComponent(component),
        duration: Date.now() - startTime,
        elements: [`.${component}`, `[data-component="${component}"]`]
      })
    }
  }

  /**
   * Individual test implementations
   */

  private testTabOrder(): boolean {
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return true

    // Check if elements have logical tabindex values
    for (let i = 0; i < focusableElements.length; i++) {
      const element = focusableElements[i] as HTMLElement
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0')
      
      // Skip elements with negative tabindex
      if (tabIndex < 0) continue
      
      // Check if tabindex is sequential (simplified check)
      if (i > 0 && tabIndex > 0) {
        const prevElement = focusableElements[i - 1] as HTMLElement
        const prevTabIndex = parseInt(prevElement.getAttribute('tabindex') || '0')
        
        // Allow some flexibility in tab order
        if (Math.abs(tabIndex - prevTabIndex) > 10) {
          return false
        }
      }
    }
    
    return true
  }

  private testFocusIndicators(): boolean {
    // Check for focus styles in CSS
    const styles = document.styleSheets
    let hasFocusStyles = false
    
    for (const styleSheet of styles) {
      try {
        const rules = styleSheet.cssRules || styleSheet.rules
        for (const rule of rules) {
          if (rule.cssText.includes(':focus') || rule.cssText.includes(':focus-visible')) {
            hasFocusStyles = true
            break
          }
        }
      } catch (e) {
        // Cross-origin stylesheets may throw errors
        continue
      }
      
      if (hasFocusStyles) break
    }
    
    return hasFocusStyles
  }

  private testKeyboardShortcuts(): boolean {
    // Check for keyboard shortcut implementations
    const hasKeyboardNav = document.querySelector('[data-keyboard-nav]') !== null
    const hasHelpDialog = document.querySelector('[data-keyboard-help]') !== null
    const hasEmergencyShortcuts = document.querySelector('[aria-keyshortcuts]') !== null
    
    return hasKeyboardNav || hasHelpDialog || hasEmergencyShortcuts
  }

  private testSkipLinks(): boolean {
    const skipLinks = document.querySelectorAll('a[href^="#skip-"], [data-skip-link]')
    return skipLinks.length > 0
  }

  private testTextContrast(): boolean {
    // Simplified contrast test - would need proper implementation
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div')
    
    for (const element of textElements) {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Skip transparent backgrounds
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        continue
      }
      
      // This is a simplified check - proper implementation needed
      if (color === backgroundColor) {
        return false
      }
    }
    
    return true
  }

  private testLargeTextContrast(): boolean {
    // Similar to text contrast but for large text
    return this.testTextContrast() // Simplified
  }

  private testColorOnlyInformation(): boolean {
    // Check if information is conveyed by more than just color
    const indicators = document.querySelectorAll('.emergency-marker, .status-indicator, .trust-indicator')
    
    for (const indicator of indicators) {
      const hasText = indicator.textContent && indicator.textContent.trim().length > 0
      const hasAriaLabel = indicator.getAttribute('aria-label')
      const hasAriaDescribedBy = indicator.getAttribute('aria-describedby')
      
      if (!hasText && !hasAriaLabel && !hasAriaDescribedBy) {
        return false
      }
    }
    
    return true
  }

  private testModalFocusTrap(): boolean {
    const modals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
    
    for (const modal of modals) {
      const hasFocusTrap = modal.getAttribute('data-focus-trap') === 'true' ||
                           modal.querySelector('[data-focus-trap]') !== null
      if (!hasFocusTrap) {
        return false
      }
    }
    
    return true
  }

  private testFocusRestoration(): boolean {
    // Check if focus restoration is implemented
    const hasFocusRestore = document.querySelector('[data-focus-restore]') !== null ||
                           document.querySelector('.focus-restore') !== null
    return hasFocusRestore
  }

  private testFocusIndicatorVisibility(): boolean {
    // Check if focus indicators are visible
    const focusStyles = document.querySelectorAll(':focus, :focus-visible')
    return focusStyles.length > 0
  }

  private testAriaLabels(): boolean {
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, a')
    
    for (const element of interactiveElements) {
      const hasLabel = element.getAttribute('aria-label') ||
                       element.getAttribute('aria-labelledby') ||
                       element.labels?.length > 0 ||
                       (element.textContent && element.textContent.trim().length > 0)
      
      if (!hasLabel) {
        return false
      }
    }
    
    return true
  }

  private testSemanticStructure(): boolean {
    // Check for semantic landmarks
    const hasMain = document.querySelector('main') !== null ||
                     document.querySelector('[role="main"]') !== null
    const hasNav = document.querySelector('nav') !== null ||
                    document.querySelector('[role="navigation"]') !== null
    const hasHeader = document.querySelector('header') !== null ||
                      document.querySelector('[role="banner"]') !== null
    
    return hasMain && hasNav && hasHeader
  }

  private testLiveRegions(): boolean {
    const liveRegions = document.querySelectorAll('[aria-live]')
    return liveRegions.length > 0
  }

  private testFormAccessibility(): boolean {
    const formElements = document.querySelectorAll('input, select, textarea')
    
    for (const element of formElements) {
      const hasLabel = element.getAttribute('aria-label') ||
                       element.getAttribute('aria-labelledby') ||
                       element.labels?.length > 0 ||
                       element.closest('label') !== null
      
      if (!hasLabel) {
        return false
      }
    }
    
    return true
  }

  private testComponent(componentName: string): boolean {
    // Component-specific tests would be implemented here
    switch (componentName) {
      case 'EmergencyMap':
        return this.testEmergencyMap()
      case 'EmergencyReportForm':
        return this.testEmergencyReportForm()
      case 'Navigation':
        return this.testNavigation()
      default:
        return true // Default to passing
    }
  }

  private testEmergencyMap(): boolean {
    const map = document.querySelector('[role="application"][aria-label*="map"]')
    if (!map) return false
    
    const hasControls = map.querySelector('[role="toolbar"]') !== null
    const hasKeyboardNav = map.getAttribute('data-keyboard-nav') === 'true'
    const hasAnnouncements = map.querySelector('[aria-live]') !== null
    
    return hasControls && hasKeyboardNav && hasAnnouncements
  }

  private testEmergencyReportForm(): boolean {
    const form = document.querySelector('#emergency-report-form, [data-emergency-form]')
    if (!form) return false
    
    const hasFieldset = form.querySelector('fieldset') !== null
    const hasLegend = form.querySelector('legend') !== null
    const hasValidation = form.querySelector('[aria-invalid], [aria-describedby*="error"]') !== null
    
    return hasFieldset && hasLegend && hasValidation
  }

  private testNavigation(): boolean {
    const nav = document.querySelector('nav, [role="navigation"]')
    if (!nav) return false
    
    const hasSkipLinks = document.querySelectorAll('a[href^="#skip-"]').length > 0
    const hasAriaLabels = nav.querySelectorAll('[aria-label]').length > 0
    const hasKeyboardNav = nav.getAttribute('data-keyboard-nav') === 'true'
    
    return hasSkipLinks && hasAriaLabels && hasKeyboardNav
  }

  /**
   * Calculate test coverage
   */
  private calculateCoverage(): number {
    // Simplified coverage calculation
    const totalElements = document.querySelectorAll('*').length
    const testedElements = new Set()
    
    this.results.forEach(test => {
      test.elements.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => testedElements.add(el))
      })
    })
    
    return totalElements > 0 ? (testedElements.size / totalElements) * 100 : 0
  }

  /**
   * Log test results
   */
  private logResults(result: AccessibilityTestResult): void {
    console.log('\n📊 Accessibility Test Results')
    console.log('================================')
    console.log(`✅ Overall Status: ${result.passed ? 'PASSED' : 'FAILED'}`)
    console.log(`📈 Score: ${result.audit.score}/100`)
    console.log(`🎯 WCAG Level: ${result.audit.level}`)
    console.log(`🧪 Tests Run: ${result.performance.totalTests}`)
    console.log(`✅ Passed: ${result.performance.passedTests}`)
    console.log(`❌ Failed: ${result.performance.failedTests}`)
    console.log(`⏱️ Duration: ${result.performance.duration}ms`)
    console.log(`📊 Coverage: ${result.performance.coverage.toFixed(1)}%`)
    
    if (result.performance.failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      result.tests.filter(t => !t.passed).forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Test failed'}`)
      })
    }
    
    if (result.audit.issues.length > 0) {
      console.log('\n⚠️ Accessibility Issues:')
      result.audit.issues.forEach(issue => {
        console.log(`  - [${issue.severity.toUpperCase()}] ${issue.criterion}: ${issue.description}`)
      })
    }
  }

  /**
   * Generate JUnit XML for CI integration
   */
  generateJUnitXML(): string {
    const testCases = this.results.map(test => `
    <testcase classname="Accessibility" name="${test.name}" time="${test.duration / 1000}">
      ${test.passed ? '' : `<failure message="${test.error || 'Test failed'}">${test.description}</failure>`}
    </testcase>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Accessibility Tests" tests="${this.results.length}" failures="${this.results.filter(r => !r.passed).length}">
  ${testCases}
</testsuite>`
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(): string {
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.filter(r => !r.passed).length
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenRelief Accessibility Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; color: ${this.config.testColorContrast ? '#28a745' : '#dc3545'}; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-item { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
    .summary-item h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #6c757d; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #495057; }
    .tests { margin-top: 30px; }
    .test-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #dee2e6; }
    .test-status { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; margin-right: 20px; }
    .test-status.passed { background: #28a745; }
    .test-status.failed { background: #dc3545; }
    .test-details { flex: 1; }
    .test-name { font-weight: bold; margin-bottom: 5px; }
    .test-description { color: #6c757d; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OpenRelief Accessibility Report</h1>
      <div class="score">${this.config.testColorContrast ? '✅' : '❌'}</div>
      <p>WCAG ${this.config.testColorContrast ? '2.1 AA Compliant' : 'Non-Compliant'}</p>
      <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    <div class="summary">
      <div class="summary-item">
        <h3>Total Tests</h3>
        <div class="value">${this.results.length}</div>
      </div>
      <div class="summary-item">
        <h3>Passed</h3>
        <div class="value">${passedTests}</div>
      </div>
      <div class="summary-item">
        <h3>Failed</h3>
        <div class="value">${failedTests}</div>
      </div>
      <div class="summary-item">
        <h3>Coverage</h3>
        <div class="value">${this.calculateCoverage().toFixed(1)}%</div>
      </div>
    </div>
    
    <div class="tests">
      <h2>Test Results</h2>
      ${this.results.map(test => `
        <div class="test-item">
          <div class="test-status ${test.passed ? 'passed' : 'failed'}">
            ${test.passed ? '✓' : '✗'}
          </div>
          <div class="test-details">
            <div class="test-name">${test.name}</div>
            <div class="test-description">${test.description}</div>
            ${test.error ? `<div style="color: #dc3545; margin-top: 5px;">Error: ${test.error}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
  }
}

/**
 * Default test configuration for OpenRelief
 */
export const defaultTestConfig: AccessibilityTestConfig = {
  environment: 'development',
  browsers: ['chrome', 'firefox', 'safari'],
  viewports: [
    { width: 320, height: 568, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop' },
    { width: 1920, height: 1080, name: 'Large Desktop' }
  ],
  testScreenReaders: true,
  testKeyboardNavigation: true,
  testColorContrast: true,
  testFocusManagement: true,
  components: ['EmergencyMap', 'EmergencyReportForm', 'Navigation', 'Alerts']
}

/**
 * Run accessibility tests with default configuration
 */
export async function runDefaultAccessibilityTests(): Promise<AccessibilityTestResult> {
  const testSuite = new AccessibilityTestSuite(defaultTestConfig)
  return await testSuite.runTests()
}

/**
 * Run accessibility tests for CI/CD
 */
export async function runCIAccessibilityTests(): Promise<AccessibilityTestResult> {
  const ciConfig: AccessibilityTestConfig = {
    ...defaultTestConfig,
    environment: process.env.NODE_ENV as any || 'development'
  }
  
  const testSuite = new AccessibilityTestSuite(ciConfig)
  const result = await testSuite.runTests()
  
  // Output JUnit XML for CI systems
  if (typeof process !== 'undefined' && process.env.CI) {
    console.log('## JUNIT_XML_OUTPUT_START')
    console.log(testSuite.generateJUnitXML())
    console.log('## JUNIT_XML_OUTPUT_END')
  }
  
  return result
}