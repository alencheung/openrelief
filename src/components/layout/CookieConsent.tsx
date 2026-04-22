'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('cookie-consent-dismissed')
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('cookie-consent-dismissed', 'true')
    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg',
        'md:flex md:items-center md:justify-between md:px-6 md:py-3'
      )}
    >
      <p className="text-sm text-gray-600 mb-3 md:mb-0">
        We use essential cookies to keep the platform running and analytics to improve emergency
        response.{' '}
        <a href="/privacy" className="text-red-600 hover:underline">
          Learn more
        </a>
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
