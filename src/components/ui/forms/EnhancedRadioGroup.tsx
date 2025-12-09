import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const enhancedRadioVariants = cva(
  'aspect-square h-4 w-4 rounded-full border transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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

export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
  icon?: React.ReactNode
}

export interface EnhancedRadioGroupProps
  extends
    Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange'>,
    VariantProps<typeof enhancedRadioVariants> {
  options: RadioOption[]
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  name?: string
  value?: string
  defaultValue?: string
  required?: boolean
  orientation?: 'horizontal' | 'vertical'
  validateOnChange?: boolean
  validator?: (value: string) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
  onChange?: (value: string) => void
  renderOption?: (option: RadioOption, isChecked: boolean) => React.ReactNode
}

const EnhancedRadioGroup = React.forwardRef<HTMLFieldSetElement, EnhancedRadioGroupProps>(
  (
    {
      className,
      variant,
      size,
      options,
      label,
      helperText,
      errorText,
      successText,
      warningText,
      name,
      value,
      defaultValue,
      required = false,
      orientation = 'vertical',
      validateOnChange = false,
      validator,
      onValidationChange,
      onChange,
      renderOption,
      disabled,
      ...props
    },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || '')
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })

    const generatedId = React.useId()
    const radioGroupName = name || `radio-group-${generatedId}`

    // Update selected value when prop changes
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

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

    // Handle radio change
    const handleRadioChange = (optionValue: string) => {
      setSelectedValue(optionValue)
      onChange?.(optionValue)
      validateInput(optionValue)
    }

    // Handle blur (for validation)
    const handleBlur = () => {
      if (validateOnChange) {
        validateInput(selectedValue)
      }
    }

    const currentVariant = getVariant()
    const isHorizontal = orientation === 'horizontal'

    return (
      <fieldset
        ref={ref}
        className={cn('space-y-4', className)}
        disabled={disabled}
        onBlur={handleBlur}
        {...props}
      >
        {/* Legend */}
        {label && (
          <legend
            className={cn(
              'text-sm font-medium leading-none',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </legend>
        )}

        {/* Radio Options */}
        <div className={cn('space-y-3', isHorizontal && 'sm:flex sm:gap-6 sm:space-y-0')}>
          {options.map(option => {
            const isChecked = selectedValue === option.value
            const radioId = `${radioGroupName}-${option.value}`

            return (
              <div key={option.value} className="flex items-start space-x-2">
                {/* Radio Input */}
                <input
                  type="radio"
                  id={radioId}
                  name={radioGroupName}
                  value={option.value}
                  checked={isChecked}
                  onChange={() => handleRadioChange(option.value)}
                  disabled={option.disabled || disabled}
                  className={cn(
                    enhancedRadioVariants({ variant: currentVariant, size }),
                    'sr-only'
                  )}
                />

                {/* Custom Radio */}
                <div
                  className={cn(
                    enhancedRadioVariants({ variant: currentVariant, size }),
                    'relative flex items-center justify-center cursor-pointer',
                    isChecked && 'border-current',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !option.disabled && !disabled && handleRadioChange(option.value)}
                >
                  {isChecked && (
                    <div
                      className={cn(
                        'rounded-full bg-current',
                        size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2'
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                {renderOption ? (
                  <label
                    htmlFor={radioId}
                    className={cn(
                      'text-sm font-medium leading-none cursor-pointer',
                      option.disabled && 'cursor-not-allowed opacity-50',
                      isHorizontal && 'ml-2'
                    )}
                  >
                    {renderOption(option, isChecked)}
                  </label>
                ) : (
                  <div className="flex-1">
                    <label
                      htmlFor={radioId}
                      className={cn(
                        'text-sm font-medium leading-none cursor-pointer block',
                        option.disabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </label>

                    {option.description && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {option.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
      </fieldset>
    )
  }
)
EnhancedRadioGroup.displayName = 'EnhancedRadioGroup'

export { EnhancedRadioGroup, enhancedRadioVariants }
