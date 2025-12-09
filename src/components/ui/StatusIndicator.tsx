import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  PauseCircle,
  XCircle,
  Loader2
} from 'lucide-react'

const statusIndicatorVariants = cva(
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-normal',
  {
    variants: {
      status: {
        active: 'status-active',
        inactive: 'status-inactive',
        pending: 'status-pending',
        resolved: 'status-resolved',
        critical: 'status-critical'
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
      },
      variant: {
        default: '',
        outline: 'border-2 bg-transparent',
        subtle: 'bg-opacity-10 text-current border border-current',
        pill: 'rounded-full'
      },
      animated: {
        true: '',
        false: ''
      }
    },
    defaultVariants: {
      status: 'active',
      size: 'md',
      variant: 'default',
      animated: false
    }
  }
)

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusIndicatorVariants> {
  label: string
  showIcon?: boolean
  pulse?: boolean
  loading?: boolean
}

const statusIcons = {
  active: CheckCircle,
  inactive: PauseCircle,
  pending: Clock,
  resolved: CheckCircle,
  critical: XCircle
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({
    className,
    status,
    size,
    variant,
    animated = false,
    label,
    showIcon = true,
    pulse = false,
    loading = false,
    ...props
  }, ref) => {
    const IconComponent = loading ? Loader2 : statusIcons[status as keyof typeof statusIcons]

    return (
      <div
        ref={ref}
        className={cn(
          statusIndicatorVariants({ status, size, variant, animated }),
          {
            'animate-pulse': pulse,
            'animate-spin': loading,
            'animate-emergency-pulse': status === 'critical' && animated
          },
          className
        )}
        {...props}
      >
        {showIcon && IconComponent && (
          <IconComponent className={cn(
            'w-4 h-4 flex-shrink-0',
            loading && 'animate-spin'
          )} />
        )}
        <span className="truncate">{label}</span>

        {/* Animated indicator dot for active status */}
        {status === 'active' && animated && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}

        {/* Pulsing indicator for critical status */}
        {status === 'critical' && pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </div>
    )
  }
)
StatusIndicator.displayName = 'StatusIndicator'

export { StatusIndicator, statusIndicatorVariants }