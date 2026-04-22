'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAuth, useAuthActions } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { Shield, Map, AlertTriangle, LogOut, Menu, X, User } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const { signOut } = useAuthActions()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: 'Map', href: '/', icon: Map },
    { label: 'Report Emergency', href: '/report', icon: AlertTriangle },
    { label: 'Privacy', href: '/privacy', icon: Shield }
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <Shield className="h-7 w-7 text-red-600" />
            <span className="font-bold text-lg text-gray-900">OpenRelief</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setMobileMenuOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium',
                    isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
            <div className="pt-2 border-t border-gray-100">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => {
                      router.push('/profile')
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    router.push('/login')
                    setMobileMenuOpen(false)
                  }}
                  className="w-full bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span className="text-sm font-semibold text-gray-700">OpenRelief</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/privacy" className="hover:text-gray-700">
              Privacy
            </a>
            <a href="/terms" className="hover:text-gray-700">
              Terms
            </a>
            <a
              href="https://github.com/openrelief/openrelief"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700"
            >
              GitHub
            </a>
          </nav>
          <p className="text-xs text-gray-400">Open-source emergency coordination. MIT License.</p>
        </div>
      </div>
    </footer>
  )
}
