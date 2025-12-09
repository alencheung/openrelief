'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@/store/authStore'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { cn } from '@/lib/utils'
import {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
  FormFeedback
} from '@/components/ui'
import {
  EnhancedInput,
  PasswordStrengthIndicator,
  EnhancedCheckbox,
  FormLayout,
  FormActions
} from '@/components/ui/forms'

export default function SignupForm() {
  const router = useRouter()
  const { isMobile, isTablet } = useMobileDetection()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [emailNewsletter, setEmailNewsletter] = useState(false)
  const { signUp } = useAuthActions()

  // Validate email
  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return 'Email is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  }

  // Validate password
  const validatePassword = (value: string): string | null => {
    if (!value) {
      return 'Password is required'
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters'
    }
    return null
  }

  // Validate confirm password
  const validateConfirmPassword = (value: string): string | null => {
    if (!value) {
      return 'Please confirm your password'
    }
    if (value !== password) {
      return 'Passwords do not match'
    }
    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const newErrors: Record<string, string> = {}

    const emailError = validateEmail(email)
    if (emailError) {
      newErrors.email = emailError
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    const confirmPasswordError = validateConfirmPassword(confirmPassword)
    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      await signUp(email, password)

      // Redirect to dashboard or home page after successful signup
      router.push('/')
    } catch (err) {
      console.error('Signup failed:', err)
      setErrors({
        submit: err instanceof Error ? err.message : 'Signup failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5',
      isMobile ? 'p-4 safe-area-inset-all' : 'p-4'
    )}>
      <div className={cn(
        'w-full',
        isMobile ? 'max-w-sm' : 'max-w-md'
      )}>
        <EnhancedCard className={cn(
          'shadow-xl',
          isMobile && 'rounded-none border-0'
        )}>
          <EnhancedCardHeader className={cn(
            'text-center',
            isMobile ? 'pb-6 pt-6' : 'pb-8 pt-8'
          )}>
            <EnhancedCardTitle className={cn(
              isMobile ? 'text-xl' : 'text-2xl'
            )}>
              Create Account
            </EnhancedCardTitle>
            <EnhancedCardDescription className={cn(
              isMobile ? 'text-sm' : 'text-base'
            )}>
              Join OpenRelief to report and track emergencies in your area
            </EnhancedCardDescription>
          </EnhancedCardHeader>

          <EnhancedCardContent className={cn(
            isMobile ? 'px-4 pb-4' : ''
          )}>
            <form onSubmit={handleSubmit} className={cn(
              'space-y-6',
              isMobile && 'space-y-4'
            )}>
              {/* Email Field */}
              <EnhancedInput
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                floatingLabel
                errorText={errors.email}
                validateOnChange
                validator={validateEmail}
                size={isMobile ? 'default' : 'default'}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 4 4 0 00-8zm0 0a4 4 0 10-8 4 4 0 00-8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12v9" />
                  </svg>
                }
              />

              {/* Password Field */}
              <EnhancedInput
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                floatingLabel
                showPasswordToggle
                errorText={errors.password}
                validateOnChange
                validator={validatePassword}
                size={isMobile ? 'default' : 'default'}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                }
              />

              {/* Password Strength Indicator */}
              {password && (
                <PasswordStrengthIndicator
                  password={password}
                  showRequirements={!isMobile}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  compact={isMobile}
                />
              )}

              {/* Confirm Password Field */}
              <EnhancedInput
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
                floatingLabel
                showPasswordToggle
                errorText={errors.confirmPassword}
                validateOnChange
                validator={validateConfirmPassword}
                size={isMobile ? 'default' : 'default'}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                }
              />

              {/* Terms and Newsletter */}
              <div className="space-y-4">
                <EnhancedCheckbox
                  label="I agree to the Terms of Service and Privacy Policy"
                  checked={agreedToTerms}
                  onChange={(checked) => setAgreedToTerms(checked)}
                  required
                  errorText={errors.terms}
                />

                <EnhancedCheckbox
                  label="Send me emergency alerts and updates"
                  checked={emailNewsletter}
                  onChange={(checked) => setEmailNewsletter(checked)}
                  helperText="We'll only send you critical updates and emergency information"
                />
              </div>

              {/* Form Error */}
              {errors.submit && (
                <FormFeedback
                  type="error"
                  message={errors.submit}
                  className="text-center"
                />
              )}

              {/* Submit Button */}
              <FormActions>
                <EnhancedButton
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading}
                  fullWidth
                  size={isMobile ? 'lg' : 'lg'}
                  className={cn(
                    'touch-target',
                    isMobile && 'min-h-[52px]'
                  )}
                >
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </EnhancedButton>
              </FormActions>
            </form>
          </EnhancedCardContent>

          {/* Footer */}
          <div className={cn(
            'px-6 py-4 bg-muted/30 border-t text-center',
            isMobile && 'px-4 py-3'
          )}>
            <p className={cn(
              'text-muted-foreground',
              isMobile ? 'text-xs' : 'text-sm'
            )}>
              Already have an account?{' '}
              <a
                href="/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign In
              </a>
            </p>
          </div>
        </EnhancedCard>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Your information is secure and encrypted. We never share your data with third parties.
          </p>
        </div>
      </div>
    </div>
  )
}