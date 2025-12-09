import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const enhancedCheckboxVariants = cva(
  'peer h-4 w-4 shrink-0 rounded-sm border transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-primary text-primary focus-visible:ring-primary',
        error: 'border-destructive text-destructive focus-visible:ring-destructive',
        success: 'border-success text-success focus-visible:ring-success',
        warning: 'border-warning text-warning focus-visible:ring-warning'
      },
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface EnhancedCheckboxProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof enhancedCheckboxVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  indeterminate?: boolean
  labelPosition?: 'start' | 'end'
  required?: boolean
  validateOnChange?: boolean
  validator?: (checked: boolean) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
}

const EnhancedCheckbox = React.forwardRef<HTMLInputElement, EnhancedCheckboxProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      errorText,
      successText,
      warningText,
      indeterminate = false,
      labelPosition = 'end',
      required = false,
      validateOnChange = false,
      validator,
      onValidationChange,
      checked,
      onChange,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })

    const checkboxRef = React.useRef<HTMLInputElement>(null)
    const generatedId = React.useId()
    const inputId = id || `checkbox-${generatedId}`

    // Determine final variant based on props and validation state
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

    // Handle validation
    const validateInput = (inputChecked: boolean) => {
      if (!validator || !validateOnChange) {
        return
      }

      const validationResult = validator(inputChecked)
      const isValid = validationResult === null
      const message = validationResult || null

      setValidationState({ isValid, message })
      onValidationChange?.(isValid, message || undefined)
    }

    // Handle checkbox change
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      validateInput(e.target.checked)
    }

    // Handle checkbox blur
    const handleCheckboxBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e)
      if (validateOnChange) {
        validateInput(e.target.checked)
      }
    }

    // Set indeterminate state
    React.useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    const currentVariant = getVariant()

    return (
      <div className="space-y-2">
        <div
          className={cn('flex items-start gap-2', labelPosition === 'start' && 'flex-row-reverse')}
        >
          {/* Checkbox */}
          <div className="relative flex items-center">
            <input
              type="checkbox"
              id={inputId}
              className={cn(
                enhancedCheckboxVariants({ variant: currentVariant, size }),
                'sr-only',
                className
              )}
              ref={node => {
                if (typeof ref === 'function') {
                  ref(node)
                } else if (ref) {
                  ref.current = node
                }
                checkboxRef.current = node
              }}
              checked={checked}
              onChange={handleCheckboxChange}
              onBlur={handleCheckboxBlur}
              {...props}
            />

            {/* Custom Checkbox */}
            <div
              className={cn(
                enhancedCheckboxVariants({ variant: currentVariant, size }),
                'flex items-center justify-center',
                checked && 'bg-primary text-primary-foreground border-primary',
                indeterminate && 'bg-primary text-primary-foreground border-primary',
                className
              )}
              onClick={() => checkboxRef.current?.click()}
            >
              {checked && (
                <Check
                  className={cn(size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3')}
                />
              )}
              {indeterminate && (
                <div
                  className={cn(
                    size === 'sm' ? 'h-1 w-2' : size === 'lg' ? 'h-1.5 w-3' : 'h-1 w-2.5',
                    'bg-current rounded-sm'
                  )}
                />
              )}
            </div>
          </div>

          {/* Label */}
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                currentVariant === 'error' && 'text-destructive',
                currentVariant === 'success' && 'text-success',
                currentVariant === 'warning' && 'text-warning',
                'cursor-pointer'
              )}
            >
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
        </div>

        {/* Helper Text */}
        {(helperText || errorText || successText || warningText || validationState.message) && (
          <div
            className={cn(
              'text-xs',
              errorText || (validationState.message && !validationState.isValid)
                ? 'text-destructive'
                : successText || validationState.isValid
                  ? 'text-success'
                  : warningText
                    ? 'text-warning'
                    : 'text-muted-foreground'
            )}
          >
            {errorText || successText || warningText || validationState.message || helperText}
          </div>
        )}
      </div>
    )
  }
)
EnhancedCheckbox.displayName = 'EnhancedCheckbox'

export { EnhancedCheckbox, enhancedCheckboxVariants }
