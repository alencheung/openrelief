'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Keyboard,
  Navigation,
  Info,
  Settings
} from 'lucide-react'
import { Icon, EnhancedCard, EnhancedButton } from '@/components/ui'

const accessibilityControlsVariants = cva(
  'absolute bg-card/95 backdrop-blur-sm rounded-xl shadow-xl border transition-all duration-normal z-30',
  {
    variants: {
      position: {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      variant: {
        default: 'border-border',
        minimal: 'border-transparent shadow-lg',
        prominent: 'border-primary shadow-xl',
      }
    },
    defaultVariants: {
      position: 'top-right',
      size: 'sm',
      variant: 'default',
    },
  }
)

export interface AccessibilitySettings {
  screenReaderEnabled: boolean
  highContrastMode: boolean
  reducedMotion: boolean
  largeTextMode: boolean
  keyboardNavigation: boolean
  audioAnnouncements: boolean
  visualIndicators: boolean
  focusVisible: boolean
}

export interface AccessibilityMapFeaturesProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof accessibilityControlsVariants> {
  settings: AccessibilitySettings
  onSettingsChange: (settings: Partial<AccessibilitySettings>) => void
  mapInstance?: any // MapLibre GL JS map instance
  showControls?: boolean
  compactMode?: boolean
}

interface AnnouncementMessage {
  id: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
}

const AccessibilityMapFeatures: React.FC<AccessibilityMapFeaturesProps> = ({
  className,
  position,
  size,
  variant,
  settings,
  onSettingsChange,
  mapInstance,
  showControls = true,
  compactMode = false,
  ...props
}) => {
  const [announcements, setAnnouncements] = useState<AnnouncementMessage[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const announcementTimeoutRef = useRef<NodeJS.Timeout>()
  const announcementIdRef = useRef(0)

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    if (!settings.screenReaderEnabled && !settings.audioAnnouncements) return

    const id = `announcement-${++announcementIdRef.current}`
    const newAnnouncement: AnnouncementMessage = {
      id,
      message,
      priority,
      timestamp: Date.now()
    }

    setAnnouncements(prev => [...prev.slice(-4), newAnnouncement])

    // Clear old announcements
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current)
    }

    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 5000)

    // Audio announcement if enabled
    if (settings.audioAnnouncements && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = priority === 'critical' ? 1.2 : 1.0
      utterance.pitch = priority === 'critical' ? 1.1 : 1.0
      utterance.volume = priority === 'critical' ? 1.0 : 0.8
      speechSynthesis.speak(utterance)
    }
  }, [settings.screenReaderEnabled, settings.audioAnnouncements])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!settings.keyboardNavigation) return

    let handled = false

    switch (event.key) {
      case 'Escape':
        // Close any open popups or modals
        document.dispatchEvent(new CustomEvent('closeAllPopups'))
        announce('Closed all popups')
        handled = true
        break
      
      case 'Tab':
        // Enhance tab navigation with announcement
        if (event.shiftKey) {
          announce('Navigating backwards')
        } else {
          announce('Navigating forwards')
        }
        break
      
      case 'Enter':
      case ' ':
        // Announce button activation
        if (event.target instanceof HTMLElement) {
          const label = event.target.getAttribute('aria-label') || event.target.textContent
          announce(`Activated ${label}`)
        }
        break
      
      case 'h':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onSettingsChange({ highContrastMode: !settings.highContrastMode })
          announce(`High contrast mode ${settings.highContrastMode ? 'disabled' : 'enabled'}`)
          handled = true
        }
        break
      
      case 'l':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onSettingsChange({ largeTextMode: !settings.largeTextMode })
          announce(`Large text mode ${settings.largeTextMode ? 'disabled' : 'enabled'}`)
          handled = true
        }
        break
      
      case 'm':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onSettingsChange({ reducedMotion: !settings.reducedMotion })
          announce(`Reduced motion ${settings.reducedMotion ? 'disabled' : 'enabled'}`)
          handled = true
        }
        break
      
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          setIsSettingsOpen(!isSettingsOpen)
          announce(`Accessibility settings ${isSettingsOpen ? 'closed' : 'opened'}`)
          handled = true
        }
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [settings, onSettingsChange, isSettingsOpen, announce])

  // Set up keyboard navigation
  useEffect(() => {
    if (settings.keyboardNavigation) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [settings.keyboardNavigation, handleKeyDown])

  // Apply accessibility classes to document
  useEffect(() => {
    const root = document.documentElement
    
    if (settings.highContrastMode) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    if (settings.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    if (settings.largeTextMode) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }

    if (settings.focusVisible) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }
  }, [settings])

  // Map-specific accessibility features
  useEffect(() => {
    if (!mapInstance) return

    // Enhanced keyboard navigation for map
    if (settings.keyboardNavigation) {
      const mapCanvas = mapInstance.getCanvas()
      if (mapCanvas) {
        mapCanvas.setAttribute('role', 'application')
        mapCanvas.setAttribute('aria-label', 'Interactive emergency map')
        mapCanvas.setAttribute('tabindex', '0')
      }
    }

    // High contrast map style
    if (settings.highContrastMode && mapInstance.setStyle) {
      // Apply high contrast style
      const highContrastStyle = {
        ...mapConfiguration.style,
        layers: mapConfiguration.style.layers.map(layer => ({
          ...layer,
          paint: {
            ...layer.paint,
            // Increase contrast for emergency layers
            ...(layer.id.startsWith('emergency-') && {
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 3,
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
            })
          }
        }))
      }
      mapInstance.setStyle(highContrastStyle)
    }

    // Announce map changes
    const handleMapMove = () => {
      const center = mapInstance.getCenter()
      const zoom = mapInstance.getZoom()
      announce(`Map moved to latitude ${center.lat.toFixed(2)}, longitude ${center.lng.toFixed(2)}, zoom level ${Math.round(zoom)}`)
    }

    const handleZoom = () => {
      const zoom = mapInstance.getZoom()
      announce(`Zoom level ${Math.round(zoom)}`)
    }

    if (settings.audioAnnouncements) {
      mapInstance.on('moveend', handleMapMove)
      mapInstance.on('zoomend', handleZoom)
    }

    return () => {
      if (settings.audioAnnouncements) {
        mapInstance.off('moveend', handleMapMove)
        mapInstance.off('zoomend', handleZoom)
      }
    }
  }, [mapInstance, settings, announce])

  const toggleSetting = (key: keyof AccessibilitySettings) => {
    onSettingsChange({ [key]: !settings[key] })
  }

  if (!showControls) return null

  return (
    <>
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements.map(announcement => (
          <div key={announcement.id} className={announcement.priority}>
            {announcement.message}
          </div>
        ))}
      </div>

      {/* Accessibility Controls */}
      <div
        className={cn(accessibilityControlsVariants({ position, size, variant, className }))}
        role="region"
        aria-label="Accessibility controls"
        {...props}
      >
        {/* Compact Mode - Just Toggle Button */}
        {compactMode ? (
          <EnhancedButton
            size="icon-sm"
            variant="outline"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            aria-label="Accessibility settings"
            aria-expanded={isSettingsOpen}
          >
            <Keyboard className="w-4 h-4" />
          </EnhancedButton>
        ) : (
          /* Full Controls */
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Accessibility</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label={isSettingsOpen ? 'Hide accessibility settings' : 'Show accessibility settings'}
                aria-expanded={isSettingsOpen}
              >
                <Icon
                  name={isSettingsOpen ? 'chevronUp' : 'chevronDown'}
                  size="sm"
                  variant="muted"
                />
              </button>
            </div>

            {isSettingsOpen && (
              <div className="space-y-2">
                {/* Screen Reader */}
                <button
                  onClick={() => toggleSetting('screenReaderEnabled')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.screenReaderEnabled ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.screenReaderEnabled}
                >
                  {settings.screenReaderEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span className="text-sm">Screen Reader</span>
                </button>

                {/* High Contrast */}
                <button
                  onClick={() => toggleSetting('highContrastMode')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.highContrastMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.highContrastMode}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">High Contrast</span>
                </button>

                {/* Reduced Motion */}
                <button
                  onClick={() => toggleSetting('reducedMotion')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.reducedMotion ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.reducedMotion}
                >
                  <Navigation className="w-4 h-4" />
                  <span className="text-sm">Reduced Motion</span>
                </button>

                {/* Large Text */}
                <button
                  onClick={() => toggleSetting('largeTextMode')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.largeTextMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.largeTextMode}
                >
                  <span className="text-sm font-bold">Aa</span>
                  <span className="text-sm">Large Text</span>
                </button>

                {/* Keyboard Navigation */}
                <button
                  onClick={() => toggleSetting('keyboardNavigation')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.keyboardNavigation ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.keyboardNavigation}
                >
                  <Keyboard className="w-4 h-4" />
                  <span className="text-sm">Keyboard Navigation</span>
                </button>

                {/* Audio Announcements */}
                <button
                  onClick={() => toggleSetting('audioAnnouncements')}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md transition-colors',
                    settings.audioAnnouncements ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  aria-pressed={settings.audioAnnouncements}
                >
                  {settings.audioAnnouncements ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span className="text-sm">Audio Announcements</span>
                </button>

                {/* Help Text */}
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  <p className="mb-1">Keyboard shortcuts:</p>
                  <ul className="space-y-1">
                    <li><kbd>Ctrl+H</kbd> - Toggle high contrast</li>
                    <li><kbd>Ctrl+L</kbd> - Toggle large text</li>
                    <li><kbd>Ctrl+M</kbd> - Toggle reduced motion</li>
                    <li><kbd>Ctrl+A</kbd> - Open this menu</li>
                    <li><kbd>Esc</kbd> - Close popups</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

AccessibilityMapFeatures.displayName = 'AccessibilityMapFeatures'

export { AccessibilityMapFeatures, accessibilityControlsVariants }