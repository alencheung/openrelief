import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const enhancedRangeSliderVariants = cva(
  'relative w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        error: 'bg-destructive',
        success: 'bg-success',
        warning: 'bg-warning'
      },
      size: {
        sm: 'h-1.5',
        default: 'h-2',
        lg: 'h-2.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface RangeSliderMark {
  value: number
  label?: string
  position?: 'above' | 'below'
}

export interface EnhancedRangeSliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'>,
    VariantProps<typeof enhancedRangeSliderVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  min?: number
  max?: number
  step?: number
  value?: number
  defaultValue?: number
  showValue?: boolean
  showMinMax?: boolean
  showMarks?: boolean
  marks?: RangeSliderMark[]
  valueFormatter?: (value: number) => string
  floatingLabel?: boolean
  required?: boolean
  validateOnChange?: boolean
  validator?: (value: number) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
  onChange?: (value: number) => void
  renderValue?: (value: number) => React.ReactNode
  renderThumb?: (value: number) => React.ReactNode
}

const EnhancedRangeSlider = React.forwardRef<HTMLInputElement, EnhancedRangeSliderProps>(
  ({
    className,
    variant,
    size,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue = 0,
    showValue = true,
    showMinMax = false,
    showMarks = false,
    marks = [],
    valueFormatter = (val) => val.toString(),
    floatingLabel = false,
    required = false,
    validateOnChange = false,
    validator,
    onValidationChange,
    onChange,
    renderValue,
    renderThumb,
    disabled,
    ...props
  }, ref) => {
    const [currentValue, setCurrentValue] = React.useState(value || defaultValue)
    const [isDragging, setIsDragging] = React.useState(false)
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })

    const sliderRef = React.useRef<HTMLInputElement>(null)
    const inputId = `range-slider-${React.useId()}`
    const hasValue = value !== undefined

    // Update current value when prop changes
    React.useEffect(() => {
      if (value !== undefined) {
        setCurrentValue(value)
      }
    }, [value])

    // Determine final variant based on props and validation state
    const getVariant = () => {
      if (errorText || validationState.message && !validationState.isValid) {
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

    // Calculate percentage for visual feedback
    const getPercentage = () => {
      const range = max - min
      const adjustedValue = currentValue - min
      return (adjustedValue / range) * 100
    }

    // Handle validation
    const validateInput = (inputValue: number) => {
      if (!validator || !validateOnChange) {
        return
      }

      const validationResult = validator(inputValue)
      const isValid = validationResult === null
      const message = validationResult || null

      setValidationState({ isValid, message })
      onValidationChange?.(isValid, message || undefined)
    }

    // Handle slider change
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      setCurrentValue(newValue)
      onChange?.(newValue)
      validateInput(newValue)
    }

    // Handle mouse events for dragging state
    const handleMouseDown = () => {
      setIsDragging(true)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    // Add global mouse up listener
    React.useEffect(() => {
      const handleGlobalMouseUp = () => setIsDragging(false)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
    }, [])

    const currentVariant = getVariant()
    const percentage = getPercentage()

    return (
      <div className="space-y-4">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-foreground',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {/* Slider Container */}
        <div className="relative">
          {/* Min/Max Labels */}
          {showMinMax && (
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{valueFormatter(min)}</span>
              <span>{valueFormatter(max)}</span>
            </div>
          )}

          {/* Slider Track */}
          <div className="relative">
            {/* Background Track */}
            <div
              className={cn(
                'absolute inset-0 rounded-lg bg-muted',
                size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-2.5' : 'h-2'
              )}
            />

            {/* Progress Track */}
            <div
              className={cn(
                'absolute left-0 top-0 rounded-lg transition-all duration-normal',
                currentVariant === 'default' && 'bg-primary',
                currentVariant === 'error' && 'bg-destructive',
                currentVariant === 'success' && 'bg-success',
                currentVariant === 'warning' && 'bg-warning',
                size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-2.5' : 'h-2'
              )}
              style={{ width: `${percentage}%` }}
            />

            {/* Hidden Input */}
            <input
              ref={(node) => {
                if (typeof ref === 'function') {
                  ref(node)
                } else if (ref) {
                  ref.current = node
                }
                sliderRef.current = node
              }}
              type="range"
              id={inputId}
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={handleSliderChange}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              disabled={disabled}
              className={cn(
                'absolute inset-0 w-full opacity-0 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
              {...props}
            />

            {/* Custom Thumb */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md transition-all duration-normal',
                isDragging && 'scale-110',
                currentVariant === 'default' && 'bg-primary',
                currentVariant === 'error' && 'bg-destructive',
                currentVariant === 'success' && 'bg-success',
                currentVariant === 'warning' && 'bg-warning',
                size === 'sm' ? 'w-3 h-3 -translate-x-1.5' : size === 'lg' ? 'w-5 h-5 -translate-x-2.5' : 'w-4 h-4 -translate-x-2',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{ left: `calc(${percentage}% - ${size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px'})` }}
            >
              {renderThumb ? renderThumb(currentValue) : (
                <div className={cn(
                  'w-full h-full rounded-full',
                  isDragging && 'bg-white/20'
                )} />
              )}
            </div>
          </div>

          {/* Marks */}
          {showMarks && (
            <div className="relative mt-2">
              {marks.map((mark, index) => {
                const markPercentage = ((mark.value - min) / (max - min)) * 100
                return (
                  <div
                    key={index}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${markPercentage}%` }}
                  >
                    <div className="w-0.5 h-2 bg-muted-foreground" />
                    {mark.label && (
                      <span className={cn(
                        'text-xs text-muted-foreground whitespace-nowrap',
                        mark.position === 'above' ? 'mb-1 order-2' : 'mt-1'
                      )}>
                        {mark.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Value Display */}
          {showValue && (
            <div className="absolute -top-8 left-0 transform -translate-x-1/2 bg-background border rounded-md px-2 py-1 text-xs font-medium shadow-sm"
              style={{ left: `${percentage}%` }}>
              {renderValue ? renderValue(currentValue) : valueFormatter(currentValue)}
            </div>
          )}
        </div>

        {/* Helper Text */}
        {(helperText || errorText || successText || warningText || validationState.message) && (
          <div className={cn(
            'text-xs',
            errorText || (validationState.message && !validationState.isValid)
              ? 'text-destructive'
              : successText || validationState.isValid
                ? 'text-success'
                : warningText
                  ? 'text-warning'
                  : 'text-muted-foreground'
          )}>
            {errorText || successText || warningText || validationState.message || helperText}
          </div>
        )}
      </div>
    )
  }
)
EnhancedRangeSlider.displayName = 'EnhancedRangeSlider'

export { EnhancedRangeSlider, enhancedRangeSliderVariants }