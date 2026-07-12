// Enhanced Input Validation Types for OpenRelief

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
  allowedValues?: unknown[]
  sanitize?: boolean
  stripHtml?: boolean
  allowEmpty?: boolean
  custom?: (value: unknown) => string | null
}

export interface ValidationResult {
  isValid: boolean
  sanitizedValue?: unknown
  errors: string[]
  warnings: string[]
  securityFlags: SecurityFlag[]
}

// Result shape returned by validateApiInput (field-keyed errors/warnings)
export interface ApiValidationResult {
  isValid: boolean
  sanitizedData: Record<string, unknown>
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
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
export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
  allowedAttributes: ['href', 'title', 'target'],
  stripScripts: true,
  stripStyles: true,
  normalizeWhitespace: true,
  removeControlChars: true
}

// Security patterns for detection
export const SECURITY_PATTERNS = {
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
    /data:(?!image\/)/gi
  ],

  // SQL injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|EXECUTE)\b)/gi,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\b\s+['"]?[^'"]*['"]?\s*=\s*['"]?[^'"]*['"]?)/gi,
    /(--|\/\*|\*\/|;|'|")/gi,
    /(\b(WAITFOR|DELAY|BENCHMARK|SLEEP)\b)/gi,
    /(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB)\b)/gi
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
    /windows\\system32/gi
  ],

  // Command injection patterns
  commandInjection: [
    /[;&|`$(){}[\]]/g,
    /\b(curl|wget|nc|netcat|telnet|ssh|ftp|tftp)\b/gi,
    /\b(rm|mv|cp|cat|ls|ps|kill|chmod|chown)\b/gi,
    /\b(python|perl|ruby|bash|sh|cmd|powershell)\b/gi,
    /\b(echo|printf|whoami|id|uname)\b/gi
  ],

  // CSRF patterns
  csrf: [
    /<form\b[^>]*method=["']post["'][^>]*>/gi,
    /<input\b[^>]*type=["']hidden["'][^>]*>/gi,
    /<iframe\b[^>]*src=["'](?!https?:\/\/)/gi
  ],

  // Suspicious patterns
  suspicious: [
    /\b(eval|exec|system|shell_exec|passthru|assert)\b/gi,
    /\b(base64_decode|base64_encode|str_rot13|convert_uudecode)\b/gi,
    /\b(file_get_contents|file_put_contents|fopen|fwrite)\b/gi,
    /\b(include|require|include_once|require_once)\b/gi,
    /\b(create_function|preg_replace|call_user_func)\b/gi
  ]
}

// Predefined validation schema types
export type ValidationSchema = Record<string, ValidationRule[]>
export interface ValidationSchemas {
  emergencyReport: ValidationSchema
  userRegistration: ValidationSchema
  apiQuery: ValidationSchema
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS: ValidationSchemas = {
  // Emergency report validation
  emergencyReport: {
    title: [
      { name: 'title', required: true, type: 'string', minLength: 5, maxLength: 200, sanitize: true, stripHtml: true },
      { name: 'title', type: 'string', pattern: /^[a-zA-Z0-9\s\-.,!?]+$/, custom: (value: unknown) => {
        const str = typeof value === 'string' ? value : ''
        if (str.length > 0 && !str.trim()) {
          return 'Title cannot be empty or whitespace only'
        }
        return null
      } }
    ],
    description: [
      { name: 'description', required: true, type: 'string', minLength: 10, maxLength: 2000, sanitize: true, stripHtml: true }
    ],
    severity: [
      { name: 'severity', required: true, type: 'number', min: 1, max: 10 }
    ],
    location: [
      { name: 'location', required: true, type: 'object', custom: (value: unknown) => {
        const loc = value as { latitude?: number; longitude?: number }
        if (!loc.latitude || !loc.longitude) {
          return 'Location must include latitude and longitude'
        }
        if (loc.latitude < -90 || loc.latitude > 90) {
          return 'Invalid latitude'
        }
        if (loc.longitude < -180 || loc.longitude > 180) {
          return 'Invalid longitude'
        }
        return null
      } }
    ],
    type_id: [
      { name: 'type_id', required: true, type: 'number', min: 1 }
    ],
    metadata: [
      { name: 'metadata', type: 'object' }
    ]
  },

  // User registration validation
  userRegistration: {
    email: [
      { name: 'email', required: true, type: 'email', maxLength: 254 }
    ],
    password: [
      { name: 'password', required: true, type: 'string', minLength: 12, maxLength: 128, custom: (value: unknown) => {
        const str = typeof value === 'string' ? value : ''
        if (!/(?=.*[a-z])/.test(str)) {
          return 'Password must contain at least one lowercase letter'
        }
        if (!/(?=.*[A-Z])/.test(str)) {
          return 'Password must contain at least one uppercase letter'
        }
        if (!/(?=.*\d)/.test(str)) {
          return 'Password must contain at least one number'
        }
        if (!/(?=.*[!@#$%^&*])/.test(str)) {
          return 'Password must contain at least one special character'
        }
        return null
      } }
    ],
    confirmPassword: [
      { name: 'confirmPassword', required: true, type: 'string', custom: (value: unknown) => {
        // NOTE: formData is never supplied by applyRule (it calls
        // rule.custom(value) with a single argument), so this historically
        // compares against `undefined`. Behavior preserved verbatim.
        const formData = undefined as { password?: string } | undefined
        if (value !== formData?.password) {
          return 'Passwords do not match'
        }
        return null
      } }
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
