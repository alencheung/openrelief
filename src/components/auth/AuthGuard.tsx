'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()

        if (session?.user) {
          useAuthStore.setState({
            user: {
              id: session.user.id,
              email: session.user.email ?? '',
              trust_score: 0.5,
              notification_preferences: {
                email: true,
                push: true,
                sms: false,
                quiet_hours: { start: '22:00', end: '07:00' }
              },
              privacy_settings: {
                location_sharing: true,
                profile_visibility: 'public' as const,
                data_retention: 30
              }
            },
            isAuthenticated: true,
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? 0
            }
          })
        }
      } catch {
      } finally {
        setIsLoading(false)
      }
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        useAuthStore.setState({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            trust_score: 0.5,
            notification_preferences: {
              email: true,
              push: true,
              sms: false,
              quiet_hours: { start: '22:00', end: '07:00' }
            },
            privacy_settings: {
              location_sharing: true,
              profile_visibility: 'public' as const,
              data_retention: 30
            }
          },
          isAuthenticated: true,
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ?? 0
          }
        })
      } else {
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          session: null
        })
      }
      setIsLoading(false)
    })

    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">Authentication Required</h2>
              <p className="mt-2 text-sm text-gray-600">
                Please sign in to access emergency coordination features
              </p>
            </div>

            <Button onClick={() => router.push('/login')} variant="default" className="w-full">
              Sign In
            </Button>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
