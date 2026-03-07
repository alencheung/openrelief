import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  showLabel?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      showLabel = false,
      variant = 'default',
      size = 'md',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500'
    }

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    }

    const getVariant = () => {
      if (variant !== 'default') {
        return variantClasses[variant]
      }
      if (percentage >= 90) {
        return variantClasses.danger
      }
      if (percentage >= 70) {
        return variantClasses.warning
      }
      return variantClasses.default
    }

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div
          className={cn(
            'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-in-out rounded-full',
              getVariant()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 text-xs text-muted-foreground text-right">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
