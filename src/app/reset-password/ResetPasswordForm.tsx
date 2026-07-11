'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EnhancedButton, EnhancedCard, EnhancedInput } from '@/components/ui'
import { PasswordStrengthIndicator } from '@/components/ui/forms'

/**
 * New-password form, reached via the recovery link from `/forgot-password`.
 *
 * When Supabase Auth delivers a recovery email, clicking the link exchanges a
 * recovery token for a session and redirects here with `type=recovery`. At
 * that point the user is authenticated and can call `updateUser({ password })`
 * to set a new password.
 */
export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 12) {
      setError('Password must be at least 12 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await (supabase as SupabaseClient).auth.updateUser({ password })
      if (updateError) {
        throw updateError
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <EnhancedCard className="w-full max-w-md shadow-xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
            <p className="text-muted-foreground mt-2">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <EnhancedInput
              type="password"
              label="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 12 characters"
              required
              autoComplete="new-password"
              floatingLabel
              showPasswordToggle
            />

            {password && (
              <PasswordStrengthIndicator
                password={password}
                showRequirements
                showPassword
                onTogglePassword={() => {}}
              />
            )}

            <EnhancedInput
              type="password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              floatingLabel
              showPasswordToggle
            />

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <EnhancedButton type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…
                </>
              ) : (
                'Update password'
              )}
            </EnhancedButton>
          </form>
        </div>
      </EnhancedCard>
    </div>
  )
}
