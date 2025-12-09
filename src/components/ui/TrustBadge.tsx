import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

const trustBadgeVariants = cva(
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-normal',
  {
    variants: {
      level: {
        excellent: 'trust-excellent',
        good: 'trust-good',
        moderate: 'trust-moderate',
        low: 'trust-low',
        critical: 'trust-critical'
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-xs',
        lg: 'px-4 py-2 text-sm'
      },
      variant: {
        default: '',
        outline: 'border-2 bg-transparent',
        subtle: 'bg-opacity-10 text-current border border-current',
        indicator: 'pl-8 relative'
      }
    },
    defaultVariants: {
      level: 'good',
      size: 'md',
      variant: 'default'
    }
  }
)

export interface TrustBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof trustBadgeVariants> {
  score: number
  maxScore?: number
  showPercentage?: boolean
  showIcon?: boolean
  showTrend?: boolean
  trend?: 'up' | 'down' | 'stable'
  label?: string
}

const getTrustLevel = (score: number, maxScore = 100): keyof typeof trustBadgeVariants.variants.level => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) {
    return 'excellent'
  }
  if (percentage >= 70) {
    return 'good'
  }
  if (percentage >= 50) {
    return 'moderate'
  }
  if (percentage >= 30) {
    return 'low'
  }
  return 'critical'
}

const getTrustIcon = (level: keyof typeof trustBadgeVariants.variants.level) => {
  switch (level) {
    case 'excellent':
    case 'good':
      return CheckCircle
    case 'moderate':
      return AlertCircle
    case 'low':
    case 'critical':
      return XCircle
    default:
      return Shield
  }
}

const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return TrendingUp
    case 'down':
      return TrendingDown
    case 'stable':
    default:
      return Minus
  }
}

const TrustBadge = React.forwardRef<HTMLDivElement, TrustBadgeProps>(
  ({
    className,
    score,
    maxScore = 100,
    size,
    variant,
    showPercentage = true,
    showIcon = true,
    showTrend = false,
    trend,
    label,
    ...props
  }, ref) => {
    const level = getTrustLevel(score, maxScore)
    const IconComponent = showIcon ? getTrustIcon(level) : null
    const TrendComponent = showTrend ? getTrendIcon(trend) : null
    const percentage = Math.round((score / maxScore) * 100)

    return (
      <div
        ref={ref}
        className={cn(trustBadgeVariants({ level, size, variant, className }))}
        title={label || `Trust score: ${score}/${maxScore} (${percentage}%)`}
        {...props}
      >
        {variant === 'indicator' && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              level === 'excellent' || level === 'good' ? 'bg-green-500'
                : level === 'moderate' ? 'bg-yellow-500'
                  : level === 'low' ? 'bg-orange-500' : 'bg-red-500'
            )} />
          </div>
        )}

        {IconComponent && (
          <IconComponent className="w-3 h-3 flex-shrink-0" />
        )}

        <span className="truncate">
          {label || (showPercentage ? `${percentage}%` : `${score}/${maxScore}`)}
        </span>

        {TrendComponent && (
          <TrendComponent className={cn(
            'w-3 h-3 flex-shrink-0',
            trend === 'up' ? 'text-green-600'
              : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          )} />
        )}
      </div>
    )
  }
)
TrustBadge.displayName = 'TrustBadge'

export { TrustBadge, trustBadgeVariants }