'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { XMarkIcon, DownloadIcon, DevicePhoneMobileIcon } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running as standalone PWA
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone ||
                              document.referrer.includes('android-app://')
      
      setIsStandalone(isStandaloneMode)
      
      // Check if already installed (for iOS)
      const isInStandaloneMode = 
        ('standalone' in window.navigator && (window.navigator as any).standalone) ||
        window.matchMedia('(display-mode: standalone)').matches
      
      setIsInstalled(isInStandaloneMode)
      
      // Check if iOS device
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                         (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document)
      setIsIOS(isIOSDevice)
    }

    checkInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install banner after a delay
      setTimeout(() => {
        setShowInstallBanner(true)
      }, 3000)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully')
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      setIsInstalled(true)
      
      // Track installation
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_installed', {
          event_category: 'PWA',
          event_label: 'Install Success'
        })
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt')
      } else {
        console.log('[PWA] User dismissed the install prompt')
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null)
      setShowInstallBanner(false)
      
      // Track user choice
      if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_install_prompt', {
          event_category: 'PWA',
          event_label: outcome
        })
      }
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
    
    // Track dismissal
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install_dismissed', {
        event_category: 'PWA',
        event_label: 'Banner Dismissed'
      })
    }
  }

  const handleIOSInstallInstructions = () => {
    setShowInstallBanner(false)
    
    // Show iOS install instructions
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold mb-4">Install OpenRelief on iOS</h3>
        <div class="space-y-3 text-sm text-gray-600">
          <p>Follow these steps to install OpenRelief on your iOS device:</p>
          <ol class="list-decimal list-inside space-y-2">
            <li>Tap the Share button <span class="inline-block">⎋</span> at the bottom of the screen</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to confirm the installation</li>
          </ol>
          <p class="text-xs text-gray-500 mt-4">This will add OpenRelief to your home screen for easy access.</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
          Got it
        </button>
      </div>
    `
    document.body.appendChild(modal)
    
    // Track iOS instructions shown
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_ios_instructions', {
        event_category: 'PWA',
        event_label: 'iOS Instructions Shown'
      })
    }
  }

  // Don't show if already installed or in standalone mode
  if (isInstalled || isStandalone) {
    return null
  }

  // Don't show if dismissed in this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  // Don't show if no install prompt available and not iOS
  if (!deferredPrompt && !isIOS) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="p-4 shadow-lg border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900">
              Install OpenRelief
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Get instant access to emergency coordination features, even offline
            </p>
            
            <div className="mt-3 flex space-x-2">
              {deferredPrompt ? (
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="flex-1"
                >
                  <DownloadIcon className="h-3 w-3 mr-1" />
                  Install
                </Button>
              ) : isIOS ? (
                <Button
                  onClick={handleIOSInstallInstructions}
                  size="sm"
                  className="flex-1"
                >
                  <DownloadIcon className="h-3 w-3 mr-1" />
                  Install
                </Button>
              ) : null}
              
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="px-2"
              >
                <XMarkIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Hook for PWA installation status
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone ||
                              document.referrer.includes('android-app://')
      setIsInstalled(isStandaloneMode)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    checkInstallStatus()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      return outcome === 'accepted'
    } catch (error) {
      console.error('[PWA] Install error:', error)
      return false
    }
  }

  return {
    isInstalled,
    isInstallable,
    install
  }
}