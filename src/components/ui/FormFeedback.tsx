import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react'

const formFeedbackVariants = cva(
  'form-feedback flex items-start gap-2 text-sm font-medium animate-fade-in',
  {
    variants: {
      type: {
        success: 'form-feedback-success',
        error: 'form-feedback-error',
        warning: 'form-feedback-warning',
        info: 'form-feedback-info'
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
      },
      variant: {
        default: '',
        outline: 'border-2 bg-transparent rounded-md p-2',
        solid: 'rounded-md p-2 text-white',
        subtle: 'bg-opacity-10 rounded-md p-2 border border-current'
      }
    },
    defaultVariants: {
      type: 'info',
      size: 'md',
      variant: 'default'
    }
  }
)

export interface FormFeedbackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFeedbackVariants> {
  message: string
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
  title?: string
}

const feedbackIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const getVariantStyles = (type: keyof typeof formFeedbackVariants.variants.type, variant: string) => {
  if (variant === 'solid') {
    switch (type) {
      case 'success':
        return 'bg-success text-success-foreground'
      case 'error':
        return 'bg-destructive text-destructive-foreground'
      case 'warning':
        return 'bg-warning text-warning-foreground'
      case 'info':
        return 'bg-info text-info-foreground'
      default:
        return ''
    }
  }

  if (variant === 'outline') {
    switch (type) {
      case 'success':
        return 'border-success text-success bg-success/5'
      case 'error':
        return 'border-destructive text-destructive bg-destructive/5'
      case 'warning':
        return 'border-warning text-warning bg-warning/5'
      case 'info':
        return 'border-info text-info bg-info/5'
      default:
        return ''
    }
  }

  if (variant === 'subtle') {
    switch (type) {
      case 'success':
        return 'bg-success/10 text-success border-success/20'
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'info':
        return 'bg-info/10 text-info border-info/20'
      default:
        return ''
    }
  }

  return ''
}

const FormFeedback = React.forwardRef<HTMLDivElement, FormFeedbackProps>(
  ({
    className,
    type,
    size,
    variant,
    message,
    showIcon = true,
    dismissible = false,
    onDismiss,
    title,
    ...props
  }, ref) => {
    const IconComponent = feedbackIcons[type as keyof typeof feedbackIcons]
    const variantStyles = getVariantStyles(type, variant || 'default')

    return (
      <div
        ref={ref}
        className={cn(
          formFeedbackVariants({ type, size, variant, className }),
          variantStyles
        )}
        role="alert"
        {...props}
      >
        {showIcon && IconComponent && (
          <IconComponent className="w-4 h-4 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <p className="text-current">{message}</p>
        </div>

        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 ml-2 rounded-full p-1 transition-colors hover:bg-black/10',
              variant === 'solid' ? 'hover:bg-white/20' : ''
            )}
            aria-label="Dismiss feedback"
          >
            <XCircle className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }
)
FormFeedback.displayName = 'FormFeedback'

export { FormFeedback, formFeedbackVariants }