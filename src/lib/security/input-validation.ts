/**
 * Enhanced Input Validation and Sanitization System
 * 
 * This module provides comprehensive input validation, sanitization,
 * and security checks for all user inputs to prevent injection attacks,
 * XSS, and other security vulnerabilities.
 */

import DOMPurify from 'isomorphic-dompurify'
import { createHash, randomBytes } from 'crypto'
import { securityMonitor } from '@/lib/audit/security-monitor'

// Security validation types
export interface ValidationRule {
  name: string
  required?: boolean
  type: 'string' | 'number' | 'email' | 'url' | 'phone' | 'date' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  allowedValues?: any[]
  sanitize?: boolean
  stripHtml?: boolean
  allowEmpty?: boolean
  custom?: (value: any) => string | null
}

export interface ValidationResult {
  isValid: boolean
  sanitizedValue?: any
  errors: string[]
  warnings: string[]
  securityFlags: SecurityFlag[]
}

export interface SecurityFlag {
  type: 'xss' | 'sql_injection' | 'path_traversal' | 'command_injection' | 'csrf' | 'suspicious_pattern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detectedPattern: string
  position?: number
}

export interface SanitizationOptions {
  allowHtml?: boolean
  allowedTags?: string[]
  allowedAttributes?: string[]
  stripScripts?: boolean
  stripStyles?: boolean
  normalizeWhitespace?: boolean
  removeControlChars?: boolean
}

// Default sanitization options
const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
  allowedAttributes: ['href', 'title', 'target'],
  stripScripts: true,
  stripStyles: true,
  normalizeWhitespace: true,
  removeControlChars: true
}

// Security patterns for detection
const SECURITY_PATTERNS = {
  // XSS patterns
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /expression\s*\(/gi,
    /@import/gi,
    /vbscript:/gi,
    /data:(?!image\/)/gi,
  ],
  
  // SQL injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|EXECUTE)\b)/gi,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\b\s+['"]?[^'"]*['"]?\s*=\s*['"]?[^'"]*['"]?)/gi,
    /(--|\/\*|\*\/|;|'|")/gi,
    /(\b(WAITFOR|DELAY|BENCHMARK|SLEEP)\b)/gi,
    /(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB)\b)/gi,
  ],
  
  // Path traversal patterns
  pathTraversal: [
    /\.\./g,
    /%2e%2e/gi,
    /\.\.\\/,
    /\.\.\//,
    /%5c/gi,
    /\/etc\/passwd/gi,
    /\/proc\//gi,
    /windows\\system32/gi,
  ],
  
  // Command injection patterns
  commandInjection: [
    /[;&|`$(){}[\]]/g,
    /\b(curl|wget|nc|netcat|telnet|ssh|ftp|tftp)\b/gi,
    /\b(rm|mv|cp|cat|ls|ps|kill|chmod|chown)\b/gi,
    /\b(python|perl|ruby|bash|sh|cmd|powershell)\b/gi,
    /\b(echo|printf|whoami|id|uname)\b/gi,
  ],
  
  // CSRF patterns
  csrf: [
    /<form\b[^>]*method=["']post["'][^>]*>/gi,
    /<input\b[^>]*type=["']hidden["'][^>]*>/gi,
    /<iframe\b[^>]*src=["'](?!https?:\/\/)/gi,
  ],
  
  // Suspicious patterns
  suspicious: [
    /\b(eval|exec|system|shell_exec|passthru|assert)\b/gi,
    /\b(base64_decode|base64_encode|str_rot13|convert_uudecode)\b/gi,
    /\b(file_get_contents|file_put_contents|fopen|fwrite)\b/gi,
    /\b(include|require|include_once|require_once)\b/gi,
    /\b(create_function|preg_replace|call_user_func)\b/gi,
  ]
}

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
  validateAndSanitize(value: any, rules: ValidationRule[]): ValidationResult {
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
  validateAndSanitizeObject(data: Record<string, any>, schema: Record<string, ValidationRule[]>): {
    isValid: boolean
    sanitizedData: Record<string, any>
    errors: Record<string, string[]>
    warnings: Record<string, string[]>
    securityFlags: SecurityFlag[]
  } {
    const result = {
      isValid: true,
      sanitizedData: {} as Record<string, any>,
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
  private applyRule(value: any, rule: ValidationRule): ValidationResult {
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
      if (highSeverityFlags.length > 0) {
        securityMonitor.createAlert(
          'malicious_activity' as any,
          'high' as any,
          `Security threat detected in ${rule.name}`,
          `Pattern: ${highSeverityFlags[0].detectedPattern}`,
          'input_validation'
        )
      }
    }
    
    // Length validation
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      result.isValid = false
      result.errors.push(`${rule.name} must be at least ${rule.minLength} characters`)
    }
    
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      result.isValid = false
      result.errors.push(`${rule.name} must be no more than ${rule.maxLength} characters`)
    }
    
    // Range validation for numbers
    if (rule.type === 'number') {
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
    if (rule.pattern && !rule.pattern.test(value)) {
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
  private validateType(value: any, type: string): boolean {
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
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false
      })
    } else {
      // Strip all HTML
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false
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
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false
    })
  }
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS = {
  // Emergency report validation
  emergencyReport: {
    title: [
      { name: 'title', required: true, type: 'string', minLength: 5, maxLength: 200, sanitize: true, stripHtml: true },
      { name: 'title', type: 'string', pattern: /^[a-zA-Z0-9\s\-.,!?]+$/, custom: (value) => {
        if (value.length > 0 && !value.trim()) {
          return 'Title cannot be empty or whitespace only'
        }
        return null
      }}
    ],
    description: [
      { name: 'description', required: true, type: 'string', minLength: 10, maxLength: 2000, sanitize: true, stripHtml: true }
    ],
    severity: [
      { name: 'severity', required: true, type: 'number', min: 1, max: 10 }
    ],
    location: [
      { name: 'location', required: true, type: 'object', custom: (value) => {
        if (!value.latitude || !value.longitude) {
          return 'Location must include latitude and longitude'
        }
        if (value.latitude < -90 || value.latitude > 90) {
          return 'Invalid latitude'
        }
        if (value.longitude < -180 || value.longitude > 180) {
          return 'Invalid longitude'
        }
        return null
      }}
    ],
    reporterId: [
      { name: 'reporterId', required: true, type: 'string', minLength: 1, maxLength: 100 }
    ]
  },
  
  // User registration validation
  userRegistration: {
    email: [
      { name: 'email', required: true, type: 'email', maxLength: 254 }
    ],
    password: [
      { name: 'password', required: true, type: 'string', minLength: 12, maxLength: 128, custom: (value) => {
        if (!/(?=.*[a-z])/.test(value)) {
          return 'Password must contain at least one lowercase letter'
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          return 'Password must contain at least one uppercase letter'
        }
        if (!/(?=.*\d)/.test(value)) {
          return 'Password must contain at least one number'
        }
        if (!/(?=.*[!@#$%^&*])/.test(value)) {
          return 'Password must contain at least one special character'
        }
        return null
      }}
    ],
    confirmPassword: [
      { name: 'confirmPassword', required: true, type: 'string', custom: (value, formData) => {
        if (value !== formData?.password) {
          return 'Passwords do not match'
        }
        return null
      }}
    ],
    firstName: [
      { name: 'firstName', required: true, type: 'string', minLength: 2, maxLength: 50, sanitize: true, stripHtml: true }
    ],
    lastName: [
      { name: 'lastName', required: true, type: 'string', minLength: 2, maxLength: 50, sanitize: true, stripHtml: true }
    ]
  },
  
  // API query validation
  apiQuery: {
    limit: [
      { name: 'limit', type: 'number', min: 1, max: 100 }
    ],
    offset: [
      { name: 'offset', type: 'number', min: 0 }
    ],
    status: [
      { name: 'status', type: 'string', allowedValues: ['pending', 'active', 'resolved', 'closed'] }
    ],
    type: [
      { name: 'type', type: 'string', maxLength: 50, sanitize: true }
    ]
  }
}

// Global validator instance
export const inputValidator = new InputValidator()

/**
 * Middleware helper function for API validation
 */
export function validateApiInput(schema: Record<string, ValidationRule[]>) {
  return (req: Request) => {
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      return req.json().then(data => {
        const result = inputValidator.validateAndSanitizeObject(data, schema)
        return {
          isValid: result.isValid,
          sanitizedData: result.sanitizedData,
          errors: result.errors,
          securityFlags: result.securityFlags
        }
      })
    }
    
    return Promise.resolve({
      isValid: false,
      sanitizedData: {},
      errors: { general: ['Invalid content type'] },
      securityFlags: []
    })
  }
}

export default inputValidator