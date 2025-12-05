import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

const formProgressVariants = cva(
  'w-full',
  {
    variants: {
      variant: {
        default: '',
        steps: '',
        dots: '',
        bar: '',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface FormStep {
  id: string
  title: string
  description?: string
  status?: 'pending' | 'active' | 'completed' | 'error'
  icon?: React.ReactNode
  disabled?: boolean
}

export interface FormProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formProgressVariants> {
  steps: FormStep[]
  currentStep: number
  onStepClick?: (stepIndex: number, step: FormStep) => void
  showStepNumbers?: boolean
  showDescriptions?: boolean
  clickable?: boolean
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'steps' | 'dots' | 'bar'
  animateTransitions?: boolean
}

const FormProgress = React.forwardRef<HTMLDivElement, FormProgressProps>(
  ({ 
    className, 
    steps,
    currentStep,
    onStepClick,
    showStepNumbers = true,
    showDescriptions = false,
    clickable = true,
    orientation = 'horizontal',
    variant: progressVariant = 'default',
    animateTransitions = true,
    size,
    ...props 
  }, ref) => {
    const isVertical = orientation === 'vertical'
    
    // Get step status
    const getStepStatus = (index: number): 'pending' | 'active' | 'completed' | 'error' => {
      if (steps[index].status) return steps[index].status
      if (index < currentStep) return 'completed'
      if (index === currentStep) return 'active'
      return 'pending'
    }
    
    // Handle step click
    const handleStepClick = (index: number, step: FormStep) => {
      if (clickable && !step.disabled && onStepClick) {
        onStepClick(index, step)
      }
    }
    
    // Get step icon
    const getStepIcon = (status: string, step: FormStep, index: number) => {
      if (step.icon) return step.icon
      
      switch (status) {
        case 'completed':
          return <Check className="h-4 w-4" />
        case 'error':
          return <AlertCircle className="h-4 w-4" />
        case 'active':
          return showStepNumbers ? index + 1 : <Loader2 className="h-4 w-4 animate-spin" />
        default:
          return showStepNumbers ? index + 1 : null
      }
    }
    
    // Get step color
    const getStepColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'bg-success text-success-foreground border-success'
        case 'error':
          return 'bg-destructive text-destructive-foreground border-destructive'
        case 'active':
          return 'bg-primary text-primary-foreground border-primary'
        default:
          return 'bg-muted text-muted-foreground border-muted'
      }
    }
    
    // Get connector color
    const getConnectorColor = (index: number) => {
      const currentStatus = getStepStatus(index)
      const nextStatus = getStepStatus(index + 1)
      
      if (currentStatus === 'completed' && nextStatus !== 'error') {
        return 'bg-success'
      }
      return 'bg-muted'
    }
    
    // Render default progress (horizontal bar)
    if (progressVariant === 'bar') {
      return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          <div className="relative">
            <div className="w-full h-2 bg-muted rounded-full">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-normal',
                  animateTransitions && 'transition-all duration-normal',
                  currentStep > 0 ? 'bg-primary' : 'bg-muted'
                )}
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>
            <div className="absolute inset-0 flex justify-between">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center text-xs font-medium transition-all duration-normal',
                    animateTransitions && 'transition-all duration-normal',
                    getStepColor(getStepStatus(index))
                  )}
                >
                  {getStepIcon(getStepStatus(index), step, index)}
                </div>
              ))}
            </div>
          </div>
          
          {showDescriptions && (
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="text-xs text-center max-w-[80px]">
                  <div className={cn(
                    'font-medium',
                    getStepStatus(index) === 'active' && 'text-primary',
                    getStepStatus(index) === 'completed' && 'text-success',
                    getStepStatus(index) === 'error' && 'text-destructive'
                  )}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    // Render dots progress
    if (progressVariant === 'dots') {
      return (
        <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => handleStepClick(index, step)}
                  disabled={!clickable || step.disabled}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all duration-normal',
                    animateTransitions && 'transition-all duration-normal',
                    clickable && !step.disabled && 'hover:scale-110 cursor-pointer',
                    status === 'completed' && 'bg-success',
                    status === 'error' && 'bg-destructive',
                    status === 'active' && 'bg-primary ring-2 ring-primary/30',
                    status === 'pending' && 'bg-muted',
                    step.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                />
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      'h-0.5 flex-1 transition-all duration-normal',
                      animateTransitions && 'transition-all duration-normal',
                      getConnectorColor(index)
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      )
    }
    
    // Render steps progress (default and steps variant)
    return (
      <div 
        ref={ref} 
        className={cn(
          formProgressVariants({ variant: progressVariant, size }),
          isVertical ? 'space-y-4' : 'flex items-center gap-4',
          className
        )} 
        {...props}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const isActive = status === 'active'
          const isCompleted = status === 'completed'
          const hasError = status === 'error'
          
          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex items-center gap-3',
                  isVertical ? 'flex-row' : 'flex-col',
                  clickable && !step.disabled && 'cursor-pointer',
                  step.disabled && 'opacity-50'
                )}
                onClick={() => handleStepClick(index, step)}
              >
                {/* Step Icon */}
                <div className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium transition-all duration-normal',
                  animateTransitions && 'transition-all duration-normal',
                  isActive && 'ring-2 ring-primary/20',
                  getStepColor(status)
                )}>
                  {getStepIcon(status, step, index)}
                </div>
                
                {/* Step Content */}
                <div className={cn(
                  'text-left',
                  isVertical ? 'flex-1' : 'text-center'
                )}>
                  <div className={cn(
                    'font-medium',
                    isActive && 'text-primary',
                    isCompleted && 'text-success',
                    hasError && 'text-destructive'
                  )}>
                    {step.title}
                  </div>
                  {showDescriptions && step.description && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connector */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    isVertical ? 'ml-5 h-6 w-0.5' : 'flex-1 h-0.5',
                    'transition-all duration-normal',
                    animateTransitions && 'transition-all duration-normal',
                    getConnectorColor(index)
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }
)
FormProgress.displayName = 'FormProgress'

// Progress summary component
export interface FormProgressSummaryProps {
  currentStep: number
  totalSteps: number
  completedSteps: number
  estimatedTime?: number
  timeRemaining?: number
  showPercentage?: boolean
  showTimeEstimate?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export const FormProgressSummary = React.forwardRef<HTMLDivElement, FormProgressSummaryProps>(
  ({ 
    className,
    currentStep,
    totalSteps,
    completedSteps,
    estimatedTime,
    timeRemaining,
    showPercentage = true,
    showTimeEstimate = true,
    variant = 'default'
  }, ref) => {
    const percentage = Math.round((completedSteps / totalSteps) * 100)
    
    if (variant === 'compact') {
      return (
        <div ref={ref} className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
          <span>Step {currentStep + 1} of {totalSteps}</span>
          {showPercentage && <span>({percentage}%)</span>}
        </div>
      )
    }
    
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {percentage}% Complete
            </span>
          )}
        </div>
        
        <div className="w-full h-2 bg-muted rounded-full">
          <div 
            className="h-2 bg-primary rounded-full transition-all duration-normal"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {showTimeEstimate && (estimatedTime || timeRemaining) && (
          <div className="text-xs text-muted-foreground">
            {estimatedTime && (
              <span>Estimated time: {estimatedTime} min</span>
            )}
            {estimatedTime && timeRemaining && ' • '}
            {timeRemaining && (
              <span>Time remaining: {timeRemaining} min</span>
            )}
          </div>
        )}
      </div>
    )
  }
)
FormProgressSummary.displayName = 'FormProgressSummary'

export { FormProgress, formProgressVariants }