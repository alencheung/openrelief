'use client'

import { useEffect, useState } from 'react'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { EnhancedNetworkStatusIndicator } from './EnhancedNetworkStatusIndicator'
import { EnhancedPWAStatus } from './EnhancedPWAStatus'
import { OfflineActionQueueVisualization } from './OfflineActionQueueVisualization'
import { SyncProgressNotification } from './SyncProgressNotification'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  DownloadIcon,
  WifiIcon,
  WifiOffIcon,
  SmartphoneIcon,
  MonitorIcon,
  TabletIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  InfoIcon,
  XIcon,
  SettingsIcon,
  RefreshCwIcon,
  ZapIcon,
  ShieldIcon,
  DatabaseIcon,
  CloudIcon,
  CloudOffIcon,
  BellIcon,
  BellOffIcon,
  BatteryIcon,
  SignalIcon,
  Loader2Icon,
  ExternalLinkIcon,
  ChevronRightIcon,
  StarIcon,
  HeartIcon,
  GiftIcon
} from 'lucide-react'

interface PWAManagerProps {
  children: React.ReactNode
  showNetworkStatus?: boolean
  showActionQueue?: boolean
  showSyncNotifications?: boolean
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
}

interface PWAInstallationStatus {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown'
  installPrompt: BeforeInstallPromptEvent | null
  dismissed: boolean
  lastPromptTime: Date | null
}

interface PWAFeatures {
  offlineSupport: boolean
  pushNotifications: boolean
  backgroundSync: boolean
  fileSystemAccess: boolean
  cameraAccess: boolean
  locationAccess: boolean
  geofencing: boolean
  deviceOrientation: boolean
  vibration: boolean
}

export function EnhancedPWAManager({ 
  children, 
  showNetworkStatus = true,
  showActionQueue = true,
  showSyncNotifications = true,
  position = 'bottom-left'
}: PWAManagerProps) {
  const { isOnline, isOffline, lastOnlineTime, lastOfflineTime } = useNetworkStatus()
  const { pendingActions, failedActions, isSyncing } = useOfflineStore()
  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [pwaStatus, setPwaStatus] = useState<PWAInstallationStatus>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    platform: 'unknown',
    browser: 'unknown',
    installPrompt: null,
    dismissed: false,
    lastPromptTime: null
  })

  const [pwaFeatures, setPwaFeatures] = useState<PWAFeatures>({
    offlineSupport: false,
    pushNotifications: false,
    backgroundSync: false,
    fileSystemAccess: false,
    cameraAccess: false,
    locationAccess: false,
    geofencing: false,
    deviceOrientation: false,
    vibration: false
  })

  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [isInstalling, setIsInstalling] = useState(false)

  // Detect PWA installation status
  useEffect(() => {
    const detectPWAStatus = () => {
      // Check if running as standalone PWA
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')

      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase()
      let platform: PWAInstallationStatus['platform'] = 'unknown'
      let browser: PWAInstallationStatus['browser'] = 'unknown'

      if (/iphone|ipad|ipod/.test(userAgent)) {
        platform = 'ios'
        if (/safari/.test(userAgent)) browser = 'safari'
      } else if (/android/.test(userAgent)) {
        platform = 'android'
        if (/chrome/.test(userAgent)) browser = 'chrome'
        else if (/firefox/.test(userAgent)) browser = 'firefox'
      } else {
        platform = 'desktop'
        if (/chrome/.test(userAgent)) browser = 'chrome'
        else if (/firefox/.test(userAgent)) browser = 'firefox'
        else if (/edge/.test(userAgent)) browser = 'edge'
        else if (/safari/.test(userAgent)) browser = 'safari'
      }

      // Check if installable
      const isInstallable = 'serviceWorker' in navigator && 'PushManager' in window

      setPwaStatus({
        isInstallable,
        isInstalled: isStandalone,
        isStandalone,
        platform,
        browser,
        installPrompt: null,
        dismissed: false,
        lastPromptTime: null
      })

      // Show welcome message for first-time PWA users
      if (isStandalone && !localStorage.getItem('pwa-welcome-shown')) {
        setShowWelcomeMessage(true)
        localStorage.setItem('pwa-welcome-shown', 'true')
      }
    }

    detectPWAStatus()
  }, [])

  // Detect PWA features
  useEffect(() => {
    const detectFeatures = () => {
      setPwaFeatures({
        offlineSupport: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        fileSystemAccess: 'showDirectoryPicker' in window,
        cameraAccess: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        locationAccess: 'geolocation' in navigator,
        geofencing: 'geofencing' in navigator,
        deviceOrientation: 'DeviceOrientationEvent' in window,
        vibration: 'vibrate' in navigator
      })
    }

    detectFeatures()
  }, [])

  // Initialize service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration)
          setServiceWorkerReady(true)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                  announcePolite('A new version of OpenRelief is available')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    }
  }, [announcePolite])

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setPwaStatus(prev => ({
        ...prev,
        installPrompt: e as BeforeInstallPromptEvent
      }))
      
      // Show install prompt after a delay
      setTimeout(() => {
        if (!pwaStatus.dismissed) {
          setShowInstallPrompt(true)
        }
      }, 5000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [pwaStatus.dismissed])

  // Handle offline banner
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isOffline) {
      timer = setTimeout(() => {
        setShowOfflineBanner(true)
      }, 3000) // Show after 3 seconds offline
    } else {
      setShowOfflineBanner(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isOffline])

  // Handle installation
  const handleInstall = async () => {
    if (!pwaStatus.installPrompt) return

    setIsInstalling(true)
    setInstallProgress(0)

    try {
      // Simulate installation progress
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await pwaStatus.installPrompt.prompt()
      const { outcome } = await pwaStatus.installPrompt.userChoice
      
      clearInterval(progressInterval)
      setInstallProgress(100)

      if (outcome === 'accepted') {
        announcePolite('OpenRelief installed successfully!')
        setPwaStatus(prev => ({ ...prev, isInstalled: true }))
        setShowInstallPrompt(false)
        
        // Hide success message after delay
        setTimeout(() => {
          setIsInstalling(false)
          setInstallProgress(0)
        }, 2000)
      } else {
        setIsInstalling(false)
        setInstallProgress(0)
      }
    } catch (error) {
      console.error('Installation failed:', error)
      announceAssertive('Installation failed. Please try again.')
      setIsInstalling(false)
      setInstallProgress(0)
    }
  }

  // Handle dismiss install prompt
  const handleDismissInstall = () => {
    setShowInstallPrompt(false)
    setPwaStatus(prev => ({ ...prev, dismissed: true }))
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Handle update
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      })
    }
  }

  // Get platform icon
  const getPlatformIcon = () => {
    switch (pwaStatus.platform) {
      case 'ios':
        return SmartphoneIcon
      case 'android':
        return SmartphoneIcon
      case 'desktop':
        return MonitorIcon
      default:
        return MonitorIcon
    }
  }

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      default:
        return 'bottom-4 left-4'
    }
  }

  const PlatformIcon = getPlatformIcon()

  return (
    <>
      {children}

      {/* Install Prompt */}
      {showInstallPrompt && pwaStatus.isInstallable && !pwaStatus.isInstalled && (
        <div className={`
          fixed top-4 left-4 right-4 z-50 max-w-md mx-auto
          ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
        `}>
          <Card className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm">
                <DownloadIcon className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Install OpenRelief</h3>
                <p className="text-white/90 text-sm mb-3">
                  Get instant access to emergency features, work offline, and receive critical alerts.
                </p>
                
                {/* Installation Progress */}
                {isInstalling && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/80">Installing...</span>
                      <span className="text-xs text-white/80">{installProgress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${installProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Features */}
                {!isInstalling && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <WifiOffIcon className="w-3 h-3" />
                      <span>Offline Access</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <BellIcon className="w-3 h-3" />
                      <span>Push Alerts</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <ZapIcon className="w-3 h-3" />
                      <span>Fast Loading</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <ShieldIcon className="w-3 h-3" />
                      <span>Secure</span>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  {!isInstalling ? (
                    <>
                      <Button
                        onClick={handleInstall}
                        className="flex-1 bg-white text-blue-600 hover:bg-gray-100"
                        size="sm"
                      >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Install Now
                      </Button>
                      <Button
                        onClick={handleDismissInstall}
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Installing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Welcome Message for PWA Users */}
      {showWelcomeMessage && pwaStatus.isStandalone && (
        <div className={`
          fixed top-4 left-4 right-4 z-50 max-w-md mx-auto
          ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
        `}>
          <Card className="p-4 bg-green-50 border-green-200 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <CheckCircle2Icon className="w-5 h-5 text-green-600" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">Welcome to OpenRelief!</h3>
                <p className="text-green-700 text-sm mb-3">
                  You're using the installed app with full offline capabilities and instant access to emergency features.
                </p>
                
                <Button
                  onClick={() => setShowWelcomeMessage(false)}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  size="sm"
                >
                  Get Started
                </Button>
              </div>
              
              <Button
                onClick={() => setShowWelcomeMessage(false)}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Offline Banner */}
      {showOfflineBanner && isOffline && (
        <div className={`
          fixed top-0 left-0 right-0 z-40 bg-red-600 text-white
          ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
        `}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WifiOffIcon className="w-5 h-5" />
                <div>
                  <span className="font-medium">You're offline</span>
                  <span className="text-red-200 text-sm ml-2">
                    Emergency features remain available
                  </span>
                </div>
                {lastOnlineTime && (
                  <span className="text-red-200 text-sm">
                    Last online: {lastOnlineTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <Button
                onClick={() => setShowOfflineBanner(false)}
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className={`
          fixed top-16 left-0 right-0 z-40 bg-blue-600 text-white
          ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
        `}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GiftIcon className="w-5 h-5" />
                <div>
                  <span className="font-medium">A new version is available!</span>
                  <span className="text-blue-200 text-sm ml-2">
                    Update to get the latest features and improvements
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUpdate}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                  size="sm"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Update Now
                </Button>
                <Button
                  onClick={() => setUpdateAvailable(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Status Indicator */}
      <div className={`
        fixed ${getPositionClasses()} z-30
        ${prefersReducedMotion ? '' : 'animate-fade-in'}
      `}>
        <div className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200">
          {/* PWA Status */}
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={serviceWorkerReady ? 'active' : 'pending'}
              size="sm"
              animated={!serviceWorkerReady}
            />
            <div className="text-xs text-gray-600">
              {pwaStatus.isStandalone ? 'PWA' : 'Web'}
            </div>
          </div>

          {/* Platform Indicator */}
          <div className="flex items-center gap-1">
            <PlatformIcon className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-600">
              {pwaStatus.platform}
            </span>
          </div>

          {/* Features Status */}
          <div className="flex items-center gap-1">
            {pwaFeatures.offlineSupport && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Offline Support" />
            )}
            {pwaFeatures.pushNotifications && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" title="Push Notifications" />
            )}
            {pwaFeatures.backgroundSync && (
              <div className="w-2 h-2 bg-purple-500 rounded-full" title="Background Sync" />
            )}
          </div>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={() => window.location.href = '/pwa-status'}
          >
            <SettingsIcon className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Enhanced Components */}
      {showNetworkStatus && <EnhancedNetworkStatusIndicator />}
      {showActionQueue && <OfflineActionQueueVisualization />}
      {showSyncNotifications && <SyncProgressNotification />}

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {pwaStatus.isInstallable && !pwaStatus.isInstalled && 'OpenRelief can be installed for better experience'}
          {pwaStatus.isStandalone && 'You are using the installed OpenRelief application'}
          {isOffline && 'You are currently offline'}
          {isOnline && 'You are now online'}
          {updateAvailable && 'A new version of OpenRelief is available'}
          {isSyncing && 'Synchronization is in progress'}
          {pendingActions.length > 0 && `You have ${pendingActions.length} pending actions`}
          {failedActions.length > 0 && `You have ${failedActions.length} failed actions`}
        </div>
      </ScreenReaderOnly>
    </>
  )
}