import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Minus, Maximize2 } from 'lucide-react'

const enhancedTextareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border bg-background text-sm ring-offset-background transition-all duration-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning'
      },
      size: {
        sm: 'px-3 py-2 text-xs min-h-[60px]',
        default: 'px-3 py-2 text-sm min-h-[80px]',
        lg: 'px-4 py-3 text-base min-h-[120px]'
      },
      resizable: {
        true: 'resize-vertical',
        false: 'resize-none'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      resizable: true
    }
  }
)

export interface EnhancedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof enhancedTextareaVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  showCharacterCount?: boolean
  maxLength?: number
  showExpandButton?: boolean
  floatingLabel?: boolean
  required?: boolean
  validateOnChange?: boolean
  validator?: (value: string) => string | null
  onValidationChange?: (isValid: boolean, message?: string) => void
  onExpand?: () => void
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({
    className,
    variant,
    size,
    resizable,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    showCharacterCount = false,
    maxLength,
    showExpandButton = false,
    floatingLabel = false,
    required = false,
    validateOnChange = false,
    validator,
    onValidationChange,
    onExpand,
    value,
    onChange,
    onBlur,
    id,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [isExpanded, setIsExpanded] = React.useState(false)
    const [validationState, setValidationState] = React.useState<{
      isValid: boolean | null
      message: string | null
    }>({ isValid: null, message: null })

    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const inputId = id || `textarea-${React.useId()}`
    const hasValue = value !== undefined && value !== ''
    const isFloating = floatingLabel && (isFocused || hasValue)
    const currentLength = value?.toString().length || 0

    // Determine the final variant based on props and validation state
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

    // Handle textarea change
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      validateInput(e.target.value)

      // Auto-resize if enabled
      if (resizable && textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }

    // Handle textarea blur
    const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      onBlur?.(e)
      if (validateOnChange) {
        validateInput(e.target.value)
      }
    }

    // Handle textarea focus
    const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    // Handle expand toggle
    const handleExpandToggle = () => {
      setIsExpanded(!isExpanded)
      onExpand?.()
    }

    // Calculate character count color
    const getCharacterCountColor = () => {
      if (!maxLength) {
        return 'text-muted-foreground'
      }
      const percentage = (currentLength / maxLength) * 100
      if (percentage >= 100) {
        return 'text-destructive'
      }
      if (percentage >= 90) {
        return 'text-warning'
      }
      return 'text-muted-foreground'
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
                : 'text-sm text-muted-foreground top-3',
              currentVariant === 'error' && 'text-destructive',
              currentVariant === 'success' && 'text-success',
              currentVariant === 'warning' && 'text-warning'
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

        {/* Textarea Container */}
        <div className="relative">
          {/* Textarea */}
          <textarea
            id={inputId}
            className={cn(
              enhancedTextareaVariants({ variant: currentVariant, size, resizable }),
              floatingLabel && 'pt-6',
              (showCharacterCount || showExpandButton) && 'pb-8',
              isExpanded && 'min-h-[300px]',
              className
            )}
            ref={(node) => {
              if (typeof ref === 'function') {
                ref(node)
              } else if (ref) {
                ref.current = node
              }
              textareaRef.current = node
            }}
            value={value}
            onChange={handleTextareaChange}
            onBlur={handleTextareaBlur}
            onFocus={handleTextareaFocus}
            maxLength={maxLength}
            {...props}
          />

          {/* Bottom Bar */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            {/* State Icon */}
            {stateIcon && (
              <div className="text-current">
                {stateIcon}
              </div>
            )}

            {/* Character Count */}
            {showCharacterCount && (
              <div className={cn(
                'text-xs',
                getCharacterCountColor()
              )}>
                {currentLength}
                {maxLength && ` / ${maxLength}`}
              </div>
            )}

            {/* Expand Button */}
            {showExpandButton && (
              <button
                type="button"
                onClick={handleExpandToggle}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minus className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Helper Text */}
        {(helperText || errorText || successText || warningText || validationState.message) && (
          <div className={cn(
            'mt-2 text-xs',
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
EnhancedTextarea.displayName = 'EnhancedTextarea'

export { EnhancedTextarea, enhancedTextareaVariants }