import { EnhancedInputProps, EnhancedTextareaProps, EnhancedSelectProps } from '@/components/ui/forms'

// Validation rule types
export interface ValidationRule {
  name: string
  validator: (value: any) => string | null
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

// Common validation functions
export const validators = {
  // Required field validation
  required: (message = 'This field is required'): ValidationRule => ({
    name: 'required',
    validator: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return message
      }
      return null
    },
    message
  }),

  // Email validation
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    name: 'email',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return message
      }
      return null
    },
    message
  }),

  // Min length validation
  minLength: (min: number, message?: string): ValidationRule => ({
    name: 'minLength',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      if (value.length < min) {
        return message || `Must be at least ${min} characters`
      }
      return null
    },
    message: message || `Must be at least ${min} characters`
  }),

  // Max length validation
  maxLength: (max: number, message?: string): ValidationRule => ({
    name: 'maxLength',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      if (value.length > max) {
        return message || `Must be no more than ${max} characters`
      }
      return null
    },
    message: message || `Must be no more than ${max} characters`
  }),

  // Min value validation
  min: (min: number, message?: string): ValidationRule => ({
    name: 'min',
    validator: (value: number) => {
      if (value === null || value === undefined) {
        return null
      }
      if (value < min) {
        return message || `Must be at least ${min}`
      }
      return null
    },
    message: message || `Must be at least ${min}`
  }),

  // Max value validation
  max: (max: number, message?: string): ValidationRule => ({
    name: 'max',
    validator: (value: number) => {
      if (value === null || value === undefined) {
        return null
      }
      if (value > max) {
        return message || `Must be no more than ${max}`
      }
      return null
    },
    message: message || `Must be no more than ${max}`
  }),

  // Pattern validation
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    name: 'pattern',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      if (!regex.test(value)) {
        return message
      }
      return null
    },
    message
  }),

  // Phone validation
  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    name: 'phone',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      const phoneRegex = /^\+?[\d\s-()]+$/
      if (!phoneRegex.test(value)) {
        return message
      }
      return null
    },
    message
  }),

  // URL validation
  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    name: 'url',
    validator: (value: string) => {
      if (!value) {
        return null
      }
      try {
        new URL(value)
        return null
      } catch {
        return message
      }
    },
    message
  }),

  // Number validation
  number: (message = 'Please enter a valid number'): ValidationRule => ({
    name: 'number',
    validator: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return null
      }
      if (isNaN(Number(value))) {
        return message
      }
      return null
    },
    message
  }),

  // Integer validation
  integer: (message = 'Please enter a whole number'): ValidationRule => ({
    name: 'integer',
    validator: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return null
      }
      if (!Number.isInteger(Number(value))) {
        return message
      }
      return null
    },
    message
  }),

  // Password strength validation
  passwordStrength: (requirements?: {
    minLength?: number
    requireUppercase?: boolean
    requireLowercase?: boolean
    requireNumbers?: boolean
    requireSpecial?: boolean
  }): ValidationRule => ({
    name: 'passwordStrength',
    validator: (value: string) => {
      if (!value) {
        return null
      }

      const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecial = true
      } = requirements || {}

      const errors: string[] = []

      if (value.length < minLength) {
        errors.push(`At least ${minLength} characters`)
      }

      if (requireUppercase && !/[A-Z]/.test(value)) {
        errors.push('One uppercase letter')
      }

      if (requireLowercase && !/[a-z]/.test(value)) {
        errors.push('One lowercase letter')
      }

      if (requireNumbers && !/[0-9]/.test(value)) {
        errors.push('One number')
      }

      if (requireSpecial && !/[^A-Za-z0-9]/.test(value)) {
        errors.push('One special character')
      }

      return errors.length > 0 ? errors.join(', ') : null
    },
    message: 'Password does not meet requirements'
  }),

  // File validation
  file: (requirements: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    maxCount?: number
  }): ValidationRule => ({
    name: 'file',
    validator: (files: File[] | FileList) => {
      if (!files || files.length === 0) {
        return null
      }

      const fileArray = Array.from(files)
      const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes,
        maxCount = 5
      } = requirements || {}

      // Check file count
      if (fileArray.length > maxCount) {
        return `Maximum ${maxCount} files allowed`
      }

      // Check each file
      for (const file of fileArray) {
        // Check file size
        if (file.size > maxSize) {
          return `File "${file.name}" exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
        }

        // Check file type
        if (allowedTypes && allowedTypes.length > 0) {
          const isAllowedType = allowedTypes.some(type => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase())
            }
            return file.type.match(type.replace('*', '.*'))
          })

          if (!isAllowedType) {
            return `File "${file.name}" is not an allowed type`
          }
        }
      }

      return null
    },
    message: 'File validation failed'
  })
}

// Validation utility functions
export const validateField = (value: any, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    const error = rule.validator(value)
    if (error) {
      return error
    }
  }
  return null
}

export const validateForm = (data: Record<string, any>, fieldRules: Record<string, ValidationRule[]>): ValidationResult => {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  let isValid = true

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const fieldValue = data[fieldName]

    for (const rule of rules) {
      const error = rule.validator(fieldValue)
      if (error) {
        errors[fieldName] = error
        isValid = false
        break // Stop on first error for this field
      }
    }
  }

  return {
    isValid,
    errors,
    warnings
  }
}

// Real-time validation hook
export const useValidation = (
  data: Record<string, any>,
  fieldRules: Record<string, ValidationRule[]>,
  validateOnChange = true
) => {
  const [validationResult, setValidationResult] = React.useState<ValidationResult>({
    isValid: false,
    errors: {},
    warnings: {}
  })

  const validate = React.useCallback(() => {
    const result = validateForm(data, fieldRules)
    setValidationResult(result)
    return result
  }, [data, fieldRules])

  // Validate on mount and when data changes
  React.useEffect(() => {
    if (validateOnChange) {
      validate()
    }
  }, [validate])

  return {
    ...validationResult,
    validate,
    clearErrors: () => setValidationResult(prev => ({ ...prev, errors: {} })),
    clearWarnings: () => setValidationResult(prev => ({ ...prev, warnings: {} })),
    setFieldError: (fieldName: string, error: string) =>
      setValidationResult(prev => ({
        ...prev,
        errors: { ...prev.errors, [fieldName]: error },
        isValid: false
      })),
    clearFieldError: (fieldName: string) =>
      setValidationResult(prev => {
        const newErrors = { ...prev.errors }
        delete newErrors[fieldName]
        return {
          ...prev,
          errors: newErrors,
          isValid: Object.keys(newErrors).length === 0
        }
      })
  }
}

// Form validation schemas for common use cases
export const validationSchemas = {
  // Emergency report validation
  emergencyReport: {
    title: [
      validators.required('Title is required'),
      validators.minLength(5, 'Title must be at least 5 characters'),
      validators.maxLength(100, 'Title must be less than 100 characters')
    ],
    description: [
      validators.required('Description is required'),
      validators.minLength(10, 'Description must be at least 10 characters'),
      validators.maxLength(500, 'Description must be less than 500 characters')
    ],
    severity: [
      validators.required('Severity is required'),
      validators.min(1, 'Severity must be at least 1'),
      validators.max(5, 'Severity must be no more than 5')
    ],
    location: [
      validators.required('Location is required')
    ]
  },

  // User registration validation
  registration: {
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email address')
    ],
    password: [
      validators.required('Password is required'),
      validators.minLength(8, 'Password must be at least 8 characters'),
      validators.passwordStrength({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecial: true
      })
    ],
    confirmPassword: [
      validators.required('Please confirm your password'),
      {
        name: 'passwordMatch',
        validator: (value, formData) => {
          if (!value || !formData?.password) {
            return null
          }
          if (value !== formData.password) {
            return 'Passwords do not match'
          }
          return null
        },
        message: 'Passwords do not match'
      }
    ],
    terms: [
      validators.required('You must agree to the terms and conditions')
    ]
  },

  // Profile update validation
  profile: {
    firstName: [
      validators.required('First name is required'),
      validators.minLength(2, 'First name must be at least 2 characters'),
      validators.maxLength(50, 'First name must be less than 50 characters')
    ],
    lastName: [
      validators.required('Last name is required'),
      validators.minLength(2, 'Last name must be at least 2 characters'),
      validators.maxLength(50, 'Last name must be less than 50 characters')
    ],
    phone: [
      validators.phone('Please enter a valid phone number')
    ],
    bio: [
      validators.maxLength(500, 'Bio must be less than 500 characters')
    ]
  }
}

// Accessibility helpers for validation
export const accessibilityHelpers = {
  // Generate ARIA attributes for validation
  getAriaProps: (fieldName: string, error?: string, warning?: string) => ({
    'aria-invalid': !!error,
    'aria-describedby': error || warning ? `${fieldName}-error ${fieldName}-warning` : undefined,
    'aria-required': 'true'
  }),

  // Generate error message ID
  getErrorId: (fieldName: string) => `${fieldName}-error`,

  // Generate warning message ID
  getWarningId: (fieldName: string) => `${fieldName}-warning`,

  // Announce validation changes to screen readers
  announceValidation: (message: string, type: 'error' | 'warning' | 'success') => {
    const announcement = `${type}: ${message}`

    // Create a live region for announcements
    let liveRegion = document.getElementById('validation-announcements')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'validation-announcements'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
    }

    liveRegion.textContent = announcement

    // Clear after a delay
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = ''
      }
    }, 1000)
  }
}