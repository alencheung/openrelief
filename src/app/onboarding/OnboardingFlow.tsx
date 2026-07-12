'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Shield, User } from 'lucide-react'
import { useAuth, useAuthActions } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { EnhancedButton, EnhancedCard, EnhancedInput } from '@/components/ui'

type UserRole = 'citizen' | 'responder' | 'coordinator'

const ROLE_OPTIONS: { value: UserRole; title: string; description: string; icon: string }[] = [
  {
    value: 'citizen',
    title: 'Community Member',
    description: 'Report emergencies and help verify reports near you.',
    icon: '👤'
  },
  {
    value: 'responder',
    title: 'Responder',
    description: 'First responder / volunteer who acts on active emergencies.',
    icon: '🚑'
  },
  {
    value: 'coordinator',
    title: 'Coordinator',
    description: 'Coordinate response efforts and manage emergency operations.',
    icon: '📋'
  }
]

/**
 * Post-signup onboarding flow.
 *
 * Collects the profile fields that the rest of the app depends on (display
 * name, role, optional location) and persists them to the user_profiles row
 * that the on_auth_user_created trigger created on signup. Marks
 * onboarding_completed so the app can skip this step on later visits.
 */
export default function OnboardingFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const { updateUser } = useAuthActions()

  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole>('citizen')
  const [shareLocation, setShareLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Please enter your name.')
      return
    }

    if (!user?.id) {
      setError('No authenticated user found. Please sign in again.')
      return
    }

    setIsSubmitting(true)

    try {
      // Optionally capture the device location before persisting.
      let locationPoint: string | null = null
      if (shareLocation && 'geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 8000,
              maximumAge: 60000
            })
          })
          locationPoint = `POINT(${position.coords.longitude} ${position.coords.latitude})`
        } catch {
          // Location permission denied or unavailable — continue without it.
        }
      }

      const update: Record<string, unknown> = {
        display_name: displayName.trim(),
        role,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }
      if (locationPoint) {
        update.last_known_location = locationPoint
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(update as never)
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      // Mirror the display name into the client store for immediate UI use.
      updateUser({ email: user.email })

      router.push('/')
    } catch (err) {
      console.error('Onboarding failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <EnhancedCard className="w-full max-w-lg shadow-xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Welcome to OpenRelief</h1>
            <p className="text-muted-foreground mt-2">
              Tell us a bit about yourself so we can personalise your experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <EnhancedInput
              label="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How should others see you?"
              required
              autoComplete="name"
              floatingLabel
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                I am joining as
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors',
                      role === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    aria-pressed={role === option.value}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-foreground">{option.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50">
              <input
                type="checkbox"
                checked={shareLocation}
                onChange={e => setShareLocation(e.target.checked)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4" /> Share my location
                </span>
                <span className="block text-sm text-muted-foreground">
                  Helps surface emergencies near you. You can change this anytime in settings.
                </span>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <EnhancedButton
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              aria-label="Complete onboarding"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" /> Get started
                </>
              )}
            </EnhancedButton>
          </form>
        </div>
      </EnhancedCard>
    </div>
  )
}
