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
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof trustBadgeVariants> {
  score: number
  maxScore?: number
  showPercentage?: boolean
  showIcon?: boolean
  showTrend?: boolean
  trend?: 'up' | 'down' | 'stable'
  label?: string
}

type TrustLevel = 'excellent' | 'good' | 'moderate' | 'low' | 'critical'

const getTrustLevel = (score: number, maxScore = 100): TrustLevel => {
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

const getTrustIcon = (level: TrustLevel) => {
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
  (
    {
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
    },
    ref
  ) => {
    // Normalize the incoming score onto the 0..maxScore scale. Callers pass
    // scores in two conventions: a 0..100 absolute (the common case) or a 0..1
    // fraction (the compact TrustDashboard path passes the raw store score).
    // A strictly positive value <= 1 is treated as a fraction and scaled up —
    // this never collides with a real 0 score (which stays 0) and lets the
    // dashboard render the correct level instead of "1%/Critical".
    const normalizedScore = score > 0 && score <= 1 ? score * 100 : score

    // Cap score at maxScore for display purposes (scores above max are clamped)
    const displayScore = Math.min(normalizedScore, maxScore)
    const level = getTrustLevel(displayScore, maxScore)
    const IconComponent = showIcon ? getTrustIcon(level) : null
    const TrendComponent = showTrend ? getTrendIcon(trend) : null
    const percentage = Math.round((displayScore / maxScore) * 100)

    return (
      <div
        ref={ref}
        data-testid="trust-badge"
        tabIndex={0}
        role="img"
        aria-label={label || `Trust score: ${displayScore}/${maxScore} (${percentage}%)`}
        className={cn(trustBadgeVariants({ level, size, variant, className }))}
        title={label || `Trust score: ${displayScore}/${maxScore} (${percentage}%)`}
        {...props}
      >
        {variant === 'indicator' && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <div
              data-testid="trust-indicator"
              className={cn(
                'w-2 h-2 rounded-full',
                level === 'excellent' || level === 'good'
                  ? 'bg-green-500'
                  : level === 'moderate'
                    ? 'bg-yellow-500'
                    : level === 'low'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              )}
            />
          </div>
        )}

        {IconComponent && (
          <IconComponent data-testid="trust-icon" className="w-3 h-3 flex-shrink-0" />
        )}

        <span className="truncate">
          {label || (
            <>
              {showPercentage && <span>{percentage}%</span>}
              <span>
                {displayScore}/{maxScore}
              </span>
            </>
          )}
        </span>

        {TrendComponent && (
          <TrendComponent
            data-testid={`trend-${trend || 'stable'}`}
            className={cn(
              'w-3 h-3 flex-shrink-0',
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
            )}
          />
        )}
      </div>
    )
  }
)
TrustBadge.displayName = 'TrustBadge'

export { TrustBadge, trustBadgeVariants }
