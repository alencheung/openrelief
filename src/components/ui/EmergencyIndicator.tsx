import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { 
  Flame, 
  HeartPulse, 
  Shield, 
  CloudRain, 
  Wrench,
  AlertTriangle
} from 'lucide-react'

const emergencyIndicatorVariants = cva(
  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-normal interactive',
  {
    variants: {
      type: {
        fire: 'emergency-fire text-white shadow-md',
        medical: 'emergency-medical text-white shadow-md',
        security: 'emergency-security text-white shadow-md',
        natural: 'emergency-natural text-white shadow-md',
        infrastructure: 'emergency-infrastructure text-white shadow-md',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
      },
      variant: {
        default: '',
        outline: 'border-2 bg-transparent',
        subtle: 'bg-opacity-10 text-current border border-current',
      }
    },
    defaultVariants: {
      type: 'fire',
      size: 'md',
      variant: 'default',
    },
  }
)

export interface EmergencyIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emergencyIndicatorVariants> {
  label: string
  severity?: number
  showSeverity?: boolean
  icon?: boolean
}

const emergencyIcons = {
  fire: Flame,
  medical: HeartPulse,
  security: Shield,
  natural: CloudRain,
  infrastructure: Wrench,
}

const getSeverityColor = (severity: number) => {
  if (severity >= 4) return 'text-red-600'
  if (severity >= 3) return 'text-orange-600'
  if (severity >= 2) return 'text-yellow-600'
  return 'text-blue-600'
}

const EmergencyIndicator = React.forwardRef<HTMLDivElement, EmergencyIndicatorProps>(
  ({ className, type, size, variant, label, severity, showSeverity = false, icon = true, ...props }, ref) => {
    const IconComponent = emergencyIcons[type as keyof typeof emergencyIcons] || AlertTriangle
    
    return (
      <div
        ref={ref}
        className={cn(emergencyIndicatorVariants({ type, size, variant, className }))}
        {...props}
      >
        {icon && (
          <IconComponent className="w-4 h-4" />
        )}
        <span className="truncate">{label}</span>
        {showSeverity && severity && (
          <span className={cn(
            'ml-auto text-xs font-bold',
            variant === 'subtle' ? getSeverityColor(severity) : 'text-white'
          )}>
            {severity}
          </span>
        )}
      </div>
    )
  }
)
EmergencyIndicator.displayName = 'EmergencyIndicator'

export { EmergencyIndicator, emergencyIndicatorVariants }