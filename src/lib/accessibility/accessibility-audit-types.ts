/**
 * Accessibility Audit - Type Definitions
 *
 * Type definitions extracted from accessibility-audit.ts to keep the main
 * module under the 500 line lint budget.
 */

export type WcagLevel = 'A' | 'AA' | 'AAA'
export type ComplianceLevel = 'A' | 'AA' | 'AAA' | 'Non-compliant'
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'
export type RecommendationCategory =
  | 'color-contrast'
  | 'keyboard'
  | 'screen-reader'
  | 'focus'
  | 'motion'
  | 'touch'
  | 'emergency'
export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface AccessibilityAuditResult {
  /**
   * Overall compliance score (0-100)
   */
  score: number

  /**
   * WCAG level achieved
   */
  level: ComplianceLevel

  /**
   * Issues found during audit
   */
  issues: AccessibilityIssue[]

  /**
   * Recommendations for improvement
   */
  recommendations: AccessibilityRecommendation[]

  /**
   * Audit timestamp
   */
  timestamp: Date
}

export interface AccessibilityIssue {
  /**
   * Unique identifier for the issue
   */
  id: string

  /**
   * WCAG guideline violated
   */
  guideline: string

  /**
   * WCAG success criterion
   */
  criterion: string

  /**
   * WCAG level (A, AA, AAA)
   */
  level: WcagLevel

  /**
   * Issue severity
   */
  severity: IssueSeverity

  /**
   * Issue description
   */
  description: string

  /**
   * Element or component where issue was found
   */
  element: string

  /**
   * CSS selector for the element
   */
  selector: string

  /**
   * How to fix the issue
   */
  fix: string

  /**
   * Whether issue is automatically detectable
   */
  autoDetectable: boolean
}

export interface AccessibilityRecommendation {
  /**
   * Recommendation category
   */
  category: RecommendationCategory

  /**
   * Priority level
   */
  priority: RecommendationPriority

  /**
   * Recommendation description
   */
  description: string

  /**
   * Implementation steps
   */
  steps: string[]

  /**
   * Components affected
   */
  components: string[]

  /**
   * Estimated implementation time
   */
  estimatedTime: string
}

/**
 * A single WCAG success criterion check.
 */
export interface WcagCriterion {
  title: string
  description: string
  level: WcagLevel
  check: (element: Element) => boolean
}

/**
 * A grouped set of WCAG success criteria (e.g. perceivable, operable).
 */
export type WcagCriterionGroup = Record<string, WcagCriterion>
