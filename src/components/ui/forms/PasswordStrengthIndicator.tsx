import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'

const passwordStrengthVariants = cva(
  'w-full h-2 rounded-full transition-all duration-normal',
  {
    variants: {
      strength: {
        weak: 'bg-destructive',
        fair: 'bg-warning',
        good: 'bg-yellow-500',
        strong: 'bg-success'
      }
    },
    defaultVariants: {
      strength: 'weak'
    }
  }
)

export interface PasswordRequirement {
  regex: RegExp
  text: string
  met: boolean
}

export interface PasswordStrengthIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof passwordStrengthVariants> {
  password: string
  showRequirements?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
  customRequirements?: PasswordRequirement[]
  strengthLevels?: {
    weak: number
    fair: number
    good: number
    strong: number
  }
  showScore?: boolean
  scoreFormatter?: (score: number, maxScore: number) => string
}

const PasswordStrengthIndicator = React.forwardRef<HTMLDivElement, PasswordStrengthIndicatorProps>(
  ({
    className,
    password,
    showRequirements = false,
    showPassword = false,
    onTogglePassword,
    customRequirements,
    strengthLevels = { weak: 25, fair: 50, good: 75, strong: 100 },
    showScore = false,
    scoreFormatter = (score, max) => `${score}/${max}`,
    ...props
  }, ref) => {
    // Default password requirements
    const defaultRequirements: PasswordRequirement[] = [
      { regex: /.{8,}/, text: 'At least 8 characters', met: false },
      { regex: /[A-Z]/, text: 'One uppercase letter', met: false },
      { regex: /[a-z]/, text: 'One lowercase letter', met: false },
      { regex: /[0-9]/, text: 'One number', met: false },
      { regex: /[^A-Za-z0-9]/, text: 'One special character', met: false }
    ]

    const requirements = customRequirements || defaultRequirements

    // Calculate password strength
    const calculateStrength = (pwd: string) => {
      if (!pwd) {
        return 0
      }

      let score = 0
      let metRequirements = 0

      // Check requirements
      const updatedRequirements = requirements.map(req => {
        const met = req.regex.test(pwd)
        if (met) {
          metRequirements++
        }
        return { ...req, met }
      })

      // Base score from requirements met
      score = (metRequirements / requirements.length) * 70

      // Bonus points for length
      if (pwd.length >= 12) {
        score += 15
      } else if (pwd.length >= 10) {
        score += 10
      } else if (pwd.length >= 8) {
        score += 5
      }

      // Bonus points for complexity
      const hasUpper = /[A-Z]/.test(pwd)
      const hasLower = /[a-z]/.test(pwd)
      const hasNumber = /[0-9]/.test(pwd)
      const hasSpecial = /[^A-Za-z0-9]/.test(pwd)

      if (hasUpper && hasLower && hasNumber && hasSpecial) {
        score += 10
      } else if ((hasUpper && hasLower) && (hasNumber || hasSpecial)) {
        score += 5
      }

      return Math.min(100, Math.round(score))
    }

    const [strength, setStrength] = React.useState(0)
    const [currentRequirements, setCurrentRequirements] = React.useState(requirements)

    // Update strength when password changes
    React.useEffect(() => {
      const newStrength = calculateStrength(password)
      setStrength(newStrength)

      // Update requirements
      const updatedRequirements = requirements.map(req => ({
        ...req,
        met: req.regex.test(password)
      }))
      setCurrentRequirements(updatedRequirements)
    }, [password])

    // Get strength level
    const getStrengthLevel = () => {
      if (strength < strengthLevels.weak) {
        return 'weak'
      }
      if (strength < strengthLevels.fair) {
        return 'fair'
      }
      if (strength < strengthLevels.good) {
        return 'good'
      }
      return 'strong'
    }

    // Get strength color
    const getStrengthColor = () => {
      const level = getStrengthLevel()
      switch (level) {
        case 'weak': return 'text-destructive'
        case 'fair': return 'text-warning'
        case 'good': return 'text-yellow-500'
        case 'strong': return 'text-success'
      }
    }

    // Get strength text
    const getStrengthText = () => {
      const level = getStrengthLevel()
      switch (level) {
        case 'weak': return 'Weak password'
        case 'fair': return 'Fair password'
        case 'good': return 'Good password'
        case 'strong': return 'Strong password'
      }
    }

    const strengthLevel = getStrengthLevel()
    const strengthColor = getStrengthColor()

    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {/* Strength Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Password Strength</span>
            {showScore && (
              <span className={cn('text-sm', strengthColor)}>
                {scoreFormatter(strength, 100)}
              </span>
            )}
          </div>

          <div className="relative">
            {/* Background */}
            <div className="w-full h-2 bg-muted rounded-full" />

            {/* Strength segments */}
            <div className="absolute inset-0 flex">
              <div
                className={cn(
                  'h-2 rounded-l-full transition-all duration-normal',
                  strength >= 25 ? passwordStrengthVariants({ strength: strengthLevel }) : 'bg-muted'
                )}
                style={{ width: '25%' }}
              />
              <div
                className={cn(
                  'h-2 transition-all duration-normal',
                  strength >= 50 ? passwordStrengthVariants({ strength: strengthLevel }) : 'bg-muted'
                )}
                style={{ width: '25%' }}
              />
              <div
                className={cn(
                  'h-2 transition-all duration-normal',
                  strength >= 75 ? passwordStrengthVariants({ strength: strengthLevel }) : 'bg-muted'
                )}
                style={{ width: '25%' }}
              />
              <div
                className={cn(
                  'h-2 rounded-r-full transition-all duration-normal',
                  strength >= 100 ? passwordStrengthVariants({ strength: strengthLevel }) : 'bg-muted'
                )}
                style={{ width: '25%' }}
              />
            </div>
          </div>

          <div className={cn('text-sm font-medium', strengthColor)}>
            {getStrengthText()}
          </div>
        </div>

        {/* Password Toggle */}
        {onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
        )}

        {/* Requirements List */}
        {showRequirements && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Password must contain:</div>
            <div className="space-y-1.5">
              {currentRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center',
                    req.met
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {req.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </div>
                  <span className={cn(
                    req.met ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Tips */}
        {strength < 50 && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm text-warning">
              <p className="font-medium mb-1">Security tip:</p>
              <p>Use a mix of letters, numbers, and symbols. Avoid common words or personal information.</p>
            </div>
          </div>
        )}
      </div>
    )
  }
)
PasswordStrengthIndicator.displayName = 'PasswordStrengthIndicator'

export { PasswordStrengthIndicator, passwordStrengthVariants }