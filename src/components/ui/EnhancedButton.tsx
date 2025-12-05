import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useAriaAnnouncer } from '@/hooks/accessibility'

const enhancedButtonVariants = cva(
  'btn-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md',
        outline: 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md',
        info: 'bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-md',
        gradient: 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      loading: {
        true: 'cursor-not-allowed',
        false: '',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
      loading: false,
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  ripple?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    className,
    variant,
    size,
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    ripple = true,
    asChild = false,
    disabled,
    children,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-pressed': ariaPressed,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading
    
    // Accessibility hooks
    const { announcePolite } = useAriaAnnouncer()
    
    /**
     * Handle button click with accessibility announcement
     */
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      
      // Announce button action to screen readers
      if (ariaLabel) {
        announcePolite(`Activated ${ariaLabel}`)
      } else if (children && typeof children === 'string') {
        announcePolite(`Activated ${children}`)
      }
      
      // Call original onClick if provided
      props.onClick?.(e)
    }
    
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, fullWidth, loading }), className)}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-busy={loading}
        {...props}
      >
        {/* Ripple effect overlay */}
        {ripple && !isDisabled && (
          <span className="absolute inset-0 rounded-md overflow-hidden">
            <span className="absolute inset-0 bg-white opacity-0 hover:opacity-20 transition-opacity duration-normal" />
          </span>
        )}
        
        {/* Loading state */}
        {loading && (
          <span className="sr-only" aria-live="polite">
            Loading, please wait
          </span>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        )}
        
        {/* Left icon */}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button content */}
        <span className={cn(
          'truncate',
          loading && 'opacity-70'
        )}>
          {children}
        </span>
        
        {/* Right icon */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
        
        {/* Loading overlay */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = 'EnhancedButton'

export { EnhancedButton, enhancedButtonVariants }