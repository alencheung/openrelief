import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAriaAnnouncer } from '@/hooks/accessibility'

const enhancedInputVariants = cva(
  'flex w-full rounded-md border bg-background text-sm ring-offset-background transition-all duration-normal file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning'
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-11 px-4 py-3 text-base'
      },
      inputType: {
        text: '',
        password: '',
        email: '',
        number: '',
        tel: '',
        url: '',
        search: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      inputType: 'text'
    }
  }
)

export interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof enhancedInputVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
  floatingLabel?: boolean
  required?: boolean
  validateOnChange?: boolean
  validator?: (value: string) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      className,
      variant,
      size,
      inputType,
      label,
      helperText,
      errorText,
      successText,
      warningText,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      floatingLabel = false,
      required = false,
      validateOnChange = false,
      validator,
      onValidationChange,
      type,
      value,
      onChange,
      onBlur,
      onFocus,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })

    const generatedId = React.useId()
    const inputId = id || `input-${generatedId}`
    const hasValue = value !== undefined && value !== ''
    const isFloating = floatingLabel && (isFocused || hasValue)

    // Accessibility hooks
    const { announcePolite } = useAriaAnnouncer()

    // Determine the final variant based on props and validation state
    const getVariant = () => {
      if (errorText || (validationState.message && !validationState.isValid)) {
        return 'error'
      }
      if (successText || validationState.isValid) {
        return 'success'
      }
      if (warningText) {
        return 'warning'
      }
      return variant
    }

    // Get the appropriate icon for the current state
    const getStateIcon = () => {
      if (errorText || (validationState.message && !validationState.isValid)) {
        return <AlertCircle className="h-4 w-4 text-destructive" />
      }
      if (successText || validationState.isValid) {
        return <CheckCircle className="h-4 w-4 text-success" />
      }
      return null
    }

    // Handle validation
    const validateInput = (inputValue: string) => {
      if (!validator || !validateOnChange) {
        return
      }

      const validationResult = validator(inputValue)
      const isValid = validationResult === null
      const message = validationResult || null

      setValidationState({ isValid, message })
      onValidationChange?.(isValid, message || undefined)
    }

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      validateInput(e.target.value)

      // Announce value change for screen readers if it's a password toggle
      if (type === 'password' && showPassword !== undefined) {
        announcePolite(showPassword ? 'Password shown' : 'Password hidden')
      }
    }

    // Handle input blur
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
      if (validateOnChange) {
        validateInput(e.target.value)
      }
    }

    // Handle input focus
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)

      // Announce field focus to screen readers
      if (label) {
        announcePolite(`Focused on ${label} field`)
      }
    }

    // Determine the input type
    const getInputType = () => {
      if (type === 'password' && showPasswordToggle) {
        return showPassword ? 'text' : 'password'
      }
      return type
    }

    const currentVariant = getVariant()
    const stateIcon = getStateIcon()

    return (
      <div className="relative w-full">
        {/* Floating Label */}
        {label && floatingLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'absolute left-3 transition-all duration-normal pointer-events-none z-10',
              'bg-background px-1',
              isFloating
                ? 'text-xs text-muted-foreground -top-2 left-2'
                : 'text-sm text-muted-foreground top-1/2 -translate-y-1/2',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning',
              leftIcon && (isFloating ? 'left-8' : 'left-10')
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {/* Standard Label */}
        {label && !floatingLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-2 text-foreground',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            type={getInputType()}
            id={inputId}
            className={cn(
              enhancedInputVariants({ variant: currentVariant, size, inputType }),
              leftIcon && 'pl-10',
              (rightIcon || stateIcon || showPasswordToggle) && 'pr-10',
              floatingLabel && 'pt-4',
              className
            )}
            ref={ref}
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            aria-invalid={
              errorText || (validationState.message && !validationState.isValid) ? 'true' : 'false'
            }
            aria-describedby={getDescribedBy()}
            aria-required={required}
            {...props}
          />

          {/* Right Side Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {stateIcon && <div className="text-current">{stateIcon}</div>}

            {rightIcon && !stateIcon && <div className="text-muted-foreground">{rightIcon}</div>}

            {/* Password Toggle */}
            {showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Helper Text */}
        {(helperText || errorText || successText || warningText || validationState.message) && (
          <div
            id={getDescribedBy()}
            className={cn(
              'mt-2 text-xs',
              errorText || (validationState.message && !validationState.isValid)
                ? 'text-destructive'
                : successText || validationState.isValid
                  ? 'text-success'
                  : warningText
                    ? 'text-warning'
                    : 'text-muted-foreground'
            )}
            role="alert"
            aria-live={
              errorText || (validationState.message && !validationState.isValid)
                ? 'assertive'
                : 'polite'
            }
          >
            {errorText || successText || warningText || validationState.message || helperText}
          </div>
        )}
      </div>
    )
  }
)
EnhancedInput.displayName = 'EnhancedInput'

export { EnhancedInput, enhancedInputVariants }
