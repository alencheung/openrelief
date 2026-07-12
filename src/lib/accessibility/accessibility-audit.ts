/**
 * Accessibility Audit Tool for OpenRelief
 *
 * This tool provides comprehensive WCAG 2.1 AA compliance checking
 * for the OpenRelief emergency coordination system.
 *
 * Type definitions live in accessibility-audit-types.ts and the WCAG guideline
 * definitions live in accessibility-audit-guidelines.ts. Both are re-exported
 * below for backward compatibility.
 */

// Re-export extracted types and guidelines for backward compatibility
export * from './accessibility-audit-types'
export * from './accessibility-audit-guidelines'
import { WCAG_GUIDELINES } from './accessibility-audit-guidelines'
import type {
  AccessibilityAuditResult,
  AccessibilityIssue,
  AccessibilityRecommendation,
  ComplianceLevel
} from './accessibility-audit-types'

/**
 * Accessibility Audit Class
 */
export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = []
  private recommendations: AccessibilityRecommendation[] = []

  /**
   * Run comprehensive accessibility audit
   */
  async audit(): Promise<AccessibilityAuditResult> {
    this.issues = []
    this.recommendations = []

    // Run all WCAG checks
    await this.checkPerceivable()
    await this.checkOperable()
    await this.checkUnderstandable()
    await this.checkRobust()

    // Calculate score and level
    const score = this.calculateScore()
    const level = this.determineComplianceLevel(score)

    return {
      score,
      level,
      issues: [...this.issues],
      recommendations: [...this.recommendations],
      timestamp: new Date()
    }
  }

  /**
   * Check WCAG Perceivable guidelines
   */
  private async checkPerceivable(): Promise<void> {
    const elements = document.querySelectorAll('*')

    for (const element of Array.from(elements)) {
      // Check 1.1.1 Non-text Content
      if (!WCAG_GUIDELINES.perceivable['1.1.1']!.check(element)) {
        this.addIssue({
          id: '1.1.1-' + Math.random().toString(36).substr(2, 9),
          guideline: '1.1 Perceivable',
          criterion: '1.1.1 Non-text Content',
          level: 'A',
          severity: 'critical',
          description: 'Element lacks text alternative',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add alt text to images, captions to videos, or text alternatives to non-text content',
          autoDetectable: true
        })
      }

      // Check 1.3.1 Adaptable
      if (!WCAG_GUIDELINES.perceivable['1.3.1']!.check(element)) {
        this.addIssue({
          id: '1.3.1-' + Math.random().toString(36).substr(2, 9),
          guideline: '1.1 Perceivable',
          criterion: '1.3.1 Adaptable',
          level: 'AA',
          severity: 'serious',
          description: 'Content lacks semantic structure',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Use semantic HTML elements (h1-h6, main, nav, section, etc.)',
          autoDetectable: true
        })
      }

      // Check 1.3.5 Identify Input Purpose
      if (!WCAG_GUIDELINES.perceivable['1.3.5']!.check(element)) {
        this.addIssue({
          id: '1.3.5-' + Math.random().toString(36).substr(2, 9),
          guideline: '1.1 Perceivable',
          criterion: '1.3.5 Identify Input Purpose',
          level: 'AA',
          severity: 'moderate',
          description: 'Input field lacks autocomplete attribute',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add appropriate autocomplete attribute to input fields',
          autoDetectable: true
        })
      }

      // Check 1.4.3 Contrast (Minimum)
      if (!WCAG_GUIDELINES.perceivable['1.4.3']!.check(element)) {
        this.addIssue({
          id: '1.4.3-' + Math.random().toString(36).substr(2, 9),
          guideline: '1.1 Perceivable',
          criterion: '1.4.3 Contrast (Minimum)',
          level: 'AA',
          severity: 'serious',
          description: 'Text contrast ratio is below 4.5:1',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Increase text contrast to meet WCAG AA standards',
          autoDetectable: false
        })
      }
    }

    // Add recommendations for perceivable issues
    if (this.issues.filter(i => i.guideline === '1.1 Perceivable').length > 0) {
      this.recommendations.push({
        category: 'color-contrast',
        priority: 'high',
        description: 'Implement proper color contrast and text alternatives',
        steps: [
          'Audit all color combinations for 4.5:1 contrast ratio',
          'Add alt text to all meaningful images',
          'Ensure text is not the only way to convey information',
          'Implement high contrast mode for users with low vision'
        ],
        components: ['EmergencyMap', 'EmergencyAlerts', 'TrustBadges', 'StatusIndicators'],
        estimatedTime: '2-3 days'
      })
    }
  }

  /**
   * Check WCAG Operable guidelines
   */
  private async checkOperable(): Promise<void> {
    const elements = document.querySelectorAll('*')

    for (const element of Array.from(elements)) {
      // Check 2.1.1 Keyboard
      if (!WCAG_GUIDELINES.operable['2.1.1']!.check(element)) {
        this.addIssue({
          id: '2.1.1-' + Math.random().toString(36).substr(2, 9),
          guideline: '2.1 Operable',
          criterion: '2.1.1 Keyboard',
          level: 'A',
          severity: 'critical',
          description: 'Interactive element is not keyboard accessible',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add tabindex and keyboard event handlers to interactive elements',
          autoDetectable: true
        })
      }

      // Check 2.4.4 Link Purpose
      if (!WCAG_GUIDELINES.operable['2.4.4']!.check(element)) {
        this.addIssue({
          id: '2.4.4-' + Math.random().toString(36).substr(2, 9),
          guideline: '2.1 Operable',
          criterion: '2.4.4 Link Purpose',
          level: 'A',
          severity: 'moderate',
          description: 'Link purpose cannot be determined from text alone',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add descriptive text to links or use aria-label',
          autoDetectable: true
        })
      }

      // Check 2.4.6 Headings and Labels
      if (!WCAG_GUIDELINES.operable['2.4.6']!.check(element)) {
        this.addIssue({
          id: '2.4.6-' + Math.random().toString(36).substr(2, 9),
          guideline: '2.1 Operable',
          criterion: '2.4.6 Headings and Labels',
          level: 'AA',
          severity: 'moderate',
          description: 'Heading or label lacks descriptive text',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add descriptive text to headings and form labels',
          autoDetectable: true
        })
      }
    }

    // Add recommendations for operable issues
    if (this.issues.filter(i => i.guideline === '2.1 Operable').length > 0) {
      this.recommendations.push({
        category: 'keyboard',
        priority: 'high',
        description: 'Implement comprehensive keyboard navigation',
        steps: [
          'Ensure all interactive elements are keyboard accessible',
          'Implement proper focus management',
          'Add keyboard shortcuts for emergency functions',
          'Implement skip links for navigation',
          'Add focus indicators for keyboard users'
        ],
        components: ['EmergencyReportForm', 'EmergencyMap', 'Navigation', 'Modals'],
        estimatedTime: '3-4 days'
      })
    }
  }

  /**
   * Check WCAG Understandable guidelines
   */
  private async checkUnderstandable(): Promise<void> {
    // Check 3.1.1 Language of Page
    if (!WCAG_GUIDELINES.understandable['3.1.1']!.check(document.documentElement)) {
      this.addIssue({
        id: '3.1.1-' + Math.random().toString(36).substr(2, 9),
        guideline: '3.1 Understandable',
        criterion: '3.1.1 Language of Page',
        level: 'A',
        severity: 'serious',
        description: 'Page language is not specified',
        element: 'html',
        selector: 'html',
        fix: 'Add lang attribute to html element',
        autoDetectable: true
      })
    }

    // Check form elements for 3.3.2 Labels or Instructions
    const formElements = document.querySelectorAll('input, select, textarea')
    for (const element of Array.from(formElements)) {
      if (!WCAG_GUIDELINES.understandable['3.3.2']!.check(element)) {
        this.addIssue({
          id: '3.3.2-' + Math.random().toString(36).substr(2, 9),
          guideline: '3.1 Understandable',
          criterion: '3.3.2 Labels or Instructions',
          level: 'A',
          severity: 'serious',
          description: 'Form element lacks proper label',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add label element or aria-label/aria-labelledby attributes',
          autoDetectable: true
        })
      }
    }

    // Add recommendations for understandable issues
    if (this.issues.filter(i => i.guideline === '3.1 Understandable').length > 0) {
      this.recommendations.push({
        category: 'screen-reader',
        priority: 'high',
        description: 'Improve screen reader support and content understanding',
        steps: [
          'Add proper language attributes',
          'Ensure all form elements have labels',
          'Implement ARIA live regions for dynamic content',
          'Add form validation announcements',
          'Provide clear error messages and instructions'
        ],
        components: ['EmergencyReportForm', 'DynamicContent', 'Forms', 'ErrorHandling'],
        estimatedTime: '2-3 days'
      })
    }
  }

  /**
   * Check WCAG Robust guidelines
   */
  private async checkRobust(): Promise<void> {
    const elements = document.querySelectorAll('*')

    for (const element of Array.from(elements)) {
      // Check 4.1.2 Name, Role, Value
      if (!WCAG_GUIDELINES.robust['4.1.2']!.check(element)) {
        this.addIssue({
          id: '4.1.2-' + Math.random().toString(36).substr(2, 9),
          guideline: '4.1 Robust',
          criterion: '4.1.2 Name, Role, Value',
          level: 'A',
          severity: 'critical',
          description: 'Element lacks proper name, role, or value',
          element: element.tagName.toLowerCase(),
          selector: this.generateSelector(element),
          fix: 'Add appropriate ARIA attributes or use semantic HTML',
          autoDetectable: true
        })
      }
    }

    // Add recommendations for robust issues
    if (this.issues.filter(i => i.guideline === '4.1 Robust').length > 0) {
      this.recommendations.push({
        category: 'screen-reader',
        priority: 'high',
        description: 'Improve semantic structure and ARIA implementation',
        steps: [
          'Use semantic HTML elements instead of divs',
          'Add proper ARIA roles and attributes',
          'Implement ARIA live regions for dynamic content',
          'Ensure custom components have proper accessibility',
          'Add keyboard navigation to all interactive elements'
        ],
        components: ['CustomComponents', 'DynamicContent', 'InteractiveElements'],
        estimatedTime: '3-4 days'
      })
    }
  }

  /**
   * Add an issue to the audit results
   */
  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue)
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`
    }

    if (element.className) {
      return `.${element.className.split(' ').join('.')}`
    }

    return element.tagName.toLowerCase()
  }

  /**
   * Calculate accessibility score
   */
  private calculateScore(): number {
    if (this.issues.length === 0) {
      return 100
    }

    // Weight issues by severity
    const criticalWeight = 10
    const seriousWeight = 5
    const moderateWeight = 2
    const minorWeight = 1

    const totalWeight = this.issues.reduce((total, issue) => {
      switch (issue.severity) {
        case 'critical':
          return total + criticalWeight
        case 'serious':
          return total + seriousWeight
        case 'moderate':
          return total + moderateWeight
        case 'minor':
          return total + minorWeight
        default:
          return total
      }
    }, 0)

    // Calculate score (100 - weighted penalty)
    const maxPenalty = 100
    const score = Math.max(0, 100 - (totalWeight / maxPenalty) * 100)

    return Math.round(score)
  }

  /**
   * Determine compliance level
   */
  private determineComplianceLevel(score: number): ComplianceLevel {
    if (score >= 90) {
      return 'AAA'
    }
    if (score >= 80) {
      return 'AA'
    }
    if (score >= 60) {
      return 'A'
    }
    return 'Non-compliant'
  }

  /**
   * Generate accessibility report
   */
  generateReport(): string {
    const score = this.calculateScore()
    const level = this.determineComplianceLevel(score)

    return `
# OpenRelief Accessibility Audit Report

**Generated:** ${new Date().toISOString()}
**Score:** ${score}/100
**WCAG Level:** ${level}
**Issues Found:** ${this.issues.length}

## Critical Issues
${
  this.issues
    .filter(i => i.severity === 'critical')
    .map(issue => `- **${issue.criterion}**: ${issue.description} (${issue.selector})`)
    .join('\n') || 'None'
}

## Serious Issues
${
  this.issues
    .filter(i => i.severity === 'serious')
    .map(issue => `- **${issue.criterion}**: ${issue.description} (${issue.selector})`)
    .join('\n') || 'None'
}

## Recommendations

${this.recommendations
  .map(
    rec => `
### ${rec.category} (Priority: ${rec.priority})
${rec.description}

**Implementation Steps:**
${rec.steps.map(step => `- ${step}`).join('\n')}

**Affected Components:** ${rec.components.join(', ')}
**Estimated Time:** ${rec.estimatedTime}
`
  )
  .join('\n')}
    `
  }
}

/**
 * Create and export auditor instance
 */
export const accessibilityAuditor = new AccessibilityAuditor()

/**
 * Convenience function to run audit and get results
 */
export async function runAccessibilityAudit(): Promise<AccessibilityAuditResult> {
  return await accessibilityAuditor.audit()
}

/**
 * Emergency-specific accessibility checks for OpenRelief
 */
export function checkEmergencyAccessibility(): AccessibilityRecommendation[] {
  const recommendations: AccessibilityRecommendation[] = []

  // Check emergency-specific features
  recommendations.push({
    category: 'emergency',
    priority: 'high',
    description: 'Implement emergency-specific accessibility features',
    steps: [
      'Add audio announcements for critical emergency alerts',
      'Implement high-contrast emergency indicators',
      'Ensure emergency reporting is fully keyboard accessible',
      'Add voice control for emergency reporting',
      'Implement vibration alerts for mobile devices',
      'Provide text-based emergency information for screen readers',
      'Add emergency-specific keyboard shortcuts'
    ],
    components: ['EmergencyAlerts', 'EmergencyReporting', 'MobileEmergencyFeatures'],
    estimatedTime: '3-5 days'
  })

  return recommendations
}
