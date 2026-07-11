'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EnhancedButton, EnhancedCard, EnhancedInput } from '@/components/ui'

/**
 * Password reset request form.
 *
 * Uses Supabase Auth's `resetPasswordForEmail`, which sends a recovery link
 * that redirects to `/reset-password` where the user sets a new password.
 * Previously no password-recovery flow existed, so locked-out users could not
 * regain access to their accounts.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: resetError } = await (supabase as SupabaseClient).auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      )
      if (resetError) {
        throw resetError
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.')
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
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
            <p className="text-muted-foreground mt-2">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  If an account exists for <strong>{email}</strong>, a password reset link is on its
                  way. Check your inbox (and spam folder).
                </p>
              </div>
              <Link
                href="/login"
                className="block text-center text-sm text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <EnhancedInput
                type="email"
                label="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                floatingLabel
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </EnhancedButton>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </EnhancedCard>
    </div>
  )
}
