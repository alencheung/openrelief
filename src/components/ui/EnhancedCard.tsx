import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const enhancedCardVariants = cva(
  'rounded-xl border bg-card text-card-foreground transition-all duration-normal',
  {
    variants: {
      variant: {
        default: 'shadow-sm hover:shadow-md',
        elevated: 'shadow-md hover:shadow-lg',
        outlined: 'border-2 shadow-none hover:shadow-sm',
        ghost: 'border-transparent shadow-none hover:bg-muted/50',
        glass: 'glass-effect border-white/20 shadow-lg hover:shadow-xl',
        gradient: 'gradient-border shadow-md hover:shadow-lg',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer hover:-translate-y-1 active:translate-y-0',
        false: '',
      },
      animated: {
        true: 'animate-fade-in',
        false: '',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      interactive: false,
      animated: false,
    },
  }
)

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  asChild?: boolean
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, interactive, animated, asChild = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(enhancedCardVariants({ variant, size, interactive, animated }), className)}
        {...props}
      />
    )
  }
)
EnhancedCard.displayName = 'EnhancedCard'

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 pb-4', className)}
    {...props}
  />
))
EnhancedCardHeader.displayName = 'EnhancedCardHeader'

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
EnhancedCardTitle.displayName = 'EnhancedCardTitle'

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
))
EnhancedCardDescription.displayName = 'EnhancedCardDescription'

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
))
EnhancedCardContent.displayName = 'EnhancedCardContent'

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))
EnhancedCardFooter.displayName = 'EnhancedCardFooter'

// Specialized card components for emergency contexts
const EmergencyCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    emergencyType: 'fire' | 'medical' | 'security' | 'natural' | 'infrastructure'
    severity?: number
  }
>(({ className, emergencyType, severity, children, ...props }, ref) => {
  const severityColors = {
    1: 'border-l-4 border-l-blue-400',
    2: 'border-l-4 border-l-yellow-400',
    3: 'border-l-4 border-l-orange-400',
    4: 'border-l-4 border-l-red-400',
    5: 'border-l-4 border-l-red-600',
  }

  return (
    <div
      ref={ref}
      className={cn(
        enhancedCardVariants({ variant: 'elevated', size: 'md', interactive: true }),
        'emergency-' + emergencyType + '-bg',
        severity && severityColors[severity as keyof typeof severityColors],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
EmergencyCard.displayName = 'EmergencyCard'

const TrustCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    trustLevel: 'excellent' | 'good' | 'moderate' | 'low' | 'critical'
    score: number
    maxScore?: number
  }
>(({ className, trustLevel, score, maxScore = 100, children, ...props }, ref) => {
  const percentage = Math.round((score / maxScore) * 100)
  
  return (
    <div
      ref={ref}
      className={cn(
        enhancedCardVariants({ variant: 'outlined', size: 'md' }),
        'trust-' + trustLevel + '-bg border-l-4 border-l-' + trustLevel,
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-3 h-3 rounded-full',
            trustLevel === 'excellent' || trustLevel === 'good' ? 'bg-green-500' :
            trustLevel === 'moderate' ? 'bg-yellow-500' :
            trustLevel === 'low' ? 'bg-orange-500' : 'bg-red-500'
          )} />
          <span className="text-sm font-medium capitalize">{trustLevel} Trust</span>
        </div>
        <span className="text-lg font-bold trust-{trustLevel}-text">{percentage}%</span>
      </div>
      {children}
    </div>
  )
})
TrustCard.displayName = 'TrustCard'

export { 
  EnhancedCard, 
  EnhancedCardHeader, 
  EnhancedCardTitle, 
  EnhancedCardDescription, 
  EnhancedCardContent, 
  EnhancedCardFooter,
  EmergencyCard,
  TrustCard,
  enhancedCardVariants 
}