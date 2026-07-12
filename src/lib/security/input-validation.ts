/**
 * Enhanced Input Validation and Sanitization System
 */

import DOMPurify from 'isomorphic-dompurify'
import { createHash, randomBytes } from 'crypto'
import { securityMonitor, SecurityIncidentType, IncidentSeverity } from '@/lib/audit/security-monitor'

// Re-export types for backward compatibility
export * from './input-validation-types'
import type {
  ValidationRule,
  ValidationResult,
  ApiValidationResult,
  SecurityFlag,
  SanitizationOptions
} from './input-validation-types'
import {
  DEFAULT_SANITIZATION_OPTIONS,
  SECURITY_PATTERNS
} from './input-validation-types'

/**
 * Enhanced Input Validator Class
 */
export class InputValidator {
  private options: SanitizationOptions

  constructor(options: Partial<SanitizationOptions> = {}) {
    this.options = { ...DEFAULT_SANITIZATION_OPTIONS, ...options }
  }

  /**
   * Validate and sanitize a single value
   */
  validateAndSanitize(value: unknown, rules: ValidationRule[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: []
    }

    // Check if value is required
    const requiredRule = rules.find(rule => rule.required)
    if (requiredRule && (value === null || value === undefined || value === '')) {
      result.isValid = false
      result.errors.push(`${requiredRule.name} is required`)
      return result
    }

    // Skip validation if value is empty and not required
    if (value === null || value === undefined || value === '') {
      result.sanitizedValue = value
      return result
    }

    // Apply validation rules
    for (const rule of rules) {
      const ruleResult = this.applyRule(value, rule)
      if (!ruleResult.isValid) {
        result.isValid = false
        result.errors.push(...ruleResult.errors)
      }
      result.warnings.push(...ruleResult.warnings)
      result.securityFlags.push(...ruleResult.securityFlags)

      // Update value with sanitized result
      if (ruleResult.sanitizedValue !== undefined) {
        value = ruleResult.sanitizedValue
      }
    }

    result.sanitizedValue = value
    return result
  }

  /**
   * Validate and sanitize multiple fields
   */
  validateAndSanitizeObject(data: Record<string, unknown>, schema: Record<string, ValidationRule[]>): {
    isValid: boolean
    sanitizedData: Record<string, unknown>
    errors: Record<string, string[]>
    warnings: Record<string, string[]>
    securityFlags: SecurityFlag[]
  } {
    const result = {
      isValid: true,
      sanitizedData: {} as Record<string, unknown>,
      errors: {} as Record<string, string[]>,
      warnings: {} as Record<string, string[]>,
      securityFlags: [] as SecurityFlag[]
    }

    for (const [fieldName, rules] of Object.entries(schema)) {
      const fieldValue = data[fieldName]
      const validationResult = this.validateAndSanitize(fieldValue, rules)

      result.sanitizedData[fieldName] = validationResult.sanitizedValue
      result.errors[fieldName] = validationResult.errors
      result.warnings[fieldName] = validationResult.warnings
      result.securityFlags.push(...validationResult.securityFlags)

      if (!validationResult.isValid) {
        result.isValid = false
      }
    }

    return result
  }

  /**
   * Apply a single validation rule
   */
  private applyRule(value: unknown, rule: ValidationRule): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: []
    }

    // Type validation
    if (!this.validateType(value, rule.type)) {
      result.isValid = false
      result.errors.push(`${rule.name} must be of type ${rule.type}`)
      return result
    }

    // Security checks
    if (typeof value === 'string') {
      const securityFlags = this.checkSecurityPatterns(value)
      result.securityFlags.push(...securityFlags)

      // Log high-severity security flags
      const highSeverityFlags = securityFlags.filter(flag =>
        flag.severity === 'high' || flag.severity === 'critical'
      )
      if (highSeverityFlags.length > 0 && highSeverityFlags[0]) {
        securityMonitor.createAlert(
          SecurityIncidentType.MALICIOUS_ACTIVITY,
          IncidentSeverity.HIGH,
          `Security threat detected in ${rule.name}`,
          `Pattern: ${highSeverityFlags[0].detectedPattern}`,
          'input_validation'
        )
      }
    }

    // Typed view of the value for length/range/pattern checks. The runtime
    // behavior of the original (which accepted `any`) is preserved: these
    // checks only produce meaningful results for strings/numbers, but they
    // are still evaluated for other types using JavaScript's coercion rules.
    const stringValue = typeof value === 'string' ? value : undefined
    const lengthValue = (typeof value === 'string' || Array.isArray(value))
      ? (value as { length: number }).length
      : undefined

    // Length validation
    if (rule.minLength !== undefined && lengthValue !== undefined && lengthValue < rule.minLength) {
      result.isValid = false
      result.errors.push(`${rule.name} must be at least ${rule.minLength} characters`)
    }

    if (rule.maxLength !== undefined && lengthValue !== undefined && lengthValue > rule.maxLength) {
      result.isValid = false
      result.errors.push(`${rule.name} must be no more than ${rule.maxLength} characters`)
    }

    // Range validation for numbers
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        result.isValid = false
        result.errors.push(`${rule.name} must be at least ${rule.min}`)
      }

      if (rule.max !== undefined && value > rule.max) {
        result.isValid = false
        result.errors.push(`${rule.name} must be no more than ${rule.max}`)
      }
    }

    // Pattern validation
    if (rule.pattern && stringValue !== undefined && !rule.pattern.test(stringValue)) {
      result.isValid = false
      result.errors.push(`${rule.name} format is invalid`)
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      result.isValid = false
      result.errors.push(`${rule.name} must be one of: ${rule.allowedValues.join(', ')}`)
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        result.isValid = false
        result.errors.push(customError)
      }
    }

    // Sanitization
    if (rule.sanitize && typeof value === 'string') {
      result.sanitizedValue = this.sanitizeValue(value)
    }

    // HTML stripping
    if (rule.stripHtml && typeof value === 'string') {
      result.sanitizedValue = this.stripHtml(value)
    }

    return result
  }

  /**
   * Validate data type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      case 'url':
        return typeof value === 'string' && this.isValidUrl(value)
      case 'phone':
        return typeof value === 'string' && /^\+?[\d\s-()]+$/.test(value)
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value))
      case 'boolean':
        return typeof value === 'boolean'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      default:
        return true
    }
  }

  /**
   * Check for security patterns in input
   */
  private checkSecurityPatterns(value: string): SecurityFlag[] {
    const flags: SecurityFlag[] = []

    for (const [type, patterns] of Object.entries(SECURITY_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = value.match(pattern)
        if (matches) {
          for (const match of matches) {
            const position = value.indexOf(match)
            flags.push({
              type: type as SecurityFlag['type'],
              severity: this.getSeverity(type, match),
              description: this.getDescription(type, match),
              detectedPattern: match,
              position
            })
          }
        }
      }
    }

    return flags
  }

  /**
   * Get severity level for security pattern
   */
  private getSeverity(type: string, pattern: string): SecurityFlag['severity'] {
    switch (type) {
      case 'xss':
        return pattern.includes('<script') ? 'critical' : 'high'
      case 'sqlInjection':
        return pattern.includes('DROP') || pattern.includes('DELETE') ? 'critical' : 'high'
      case 'commandInjection':
        return pattern.includes('rm') || pattern.includes('del') ? 'critical' : 'high'
      case 'pathTraversal':
        return pattern.includes('..') ? 'high' : 'medium'
      case 'csrf':
        return 'medium'
      case 'suspicious':
        return 'medium'
      default:
        return 'low'
    }
  }

  /**
   * Get description for security pattern
   */
  private getDescription(type: string, pattern: string): string {
    switch (type) {
      case 'xss':
        return 'Potential Cross-Site Scripting (XSS) attack detected'
      case 'sqlInjection':
        return 'Potential SQL injection attack detected'
      case 'commandInjection':
        return 'Potential command injection attack detected'
      case 'pathTraversal':
        return 'Potential path traversal attack detected'
      case 'csrf':
        return 'Potential Cross-Site Request Forgery (CSRF) attack detected'
      case 'suspicious':
        return 'Suspicious pattern detected'
      default:
        return 'Security pattern detected'
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  /**
   * Sanitize input value
   */
  private sanitizeValue(value: string): string {
    let sanitized = value

    // Remove control characters
    if (this.options.removeControlChars) {
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    }

    // Normalize whitespace
    if (this.options.normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim()
    }

    // HTML sanitization
    if (this.options.allowHtml) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: this.options.allowedTags || [],
        ALLOWED_ATTR: this.options.allowedAttributes || [],
        KEEP_CONTENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false
      })
    } else {
      // Strip all HTML
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false
      })
    }

    return sanitized
  }

  /**
   * Strip HTML from value
   */
  private stripHtml(value: string): string {
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    })
  }
}

// Global validator instance
export const inputValidator = new InputValidator()

/**
 * Middleware helper function for API validation
 */
export function validateApiInput(schema: Record<string, ValidationRule[]>) {
  return (req: Request): Promise<ApiValidationResult> => {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      return req.json().then(data => {
        const result = inputValidator.validateAndSanitizeObject(data, schema)
        return {
          isValid: result.isValid,
          sanitizedData: result.sanitizedData,
          errors: result.errors,
          warnings: result.warnings,
          securityFlags: result.securityFlags
        }
      })
    }

    return Promise.resolve({
      isValid: false,
      sanitizedData: {},
      errors: { general: ['Invalid content type'] },
      warnings: {},
      securityFlags: []
    })
  }
}

export default inputValidator