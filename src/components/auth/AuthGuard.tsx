'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication status
    // This is a placeholder - will be implemented with actual auth logic
    const checkAuth = async () => {
      try {
        // Simulate auth check
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsAuthenticated(true) // Placeholder - always true for demo
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
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

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Authentication Required
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please sign in to access emergency coordination features
              </p>
            </div>

            <div className="space-y-6">
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Demo Mode Active
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        This is a demonstration of the OpenRelief platform.
                        In production, proper authentication would be required.
                      </p>
                      <p className="mt-2">
                        For demo purposes, you can continue with limited access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => setIsAuthenticated(true)}
                  variant="default"
                  className="w-full"
                >
                  Continue to Demo
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  Sign In with Supabase
                </Button>
              </div>
            </div>

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