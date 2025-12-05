'use client'

import { useState, useEffect } from 'react'
import { useReducedMotion, useAriaAnnouncer } from '@/hooks/accessibility'
import { cn } from '@/lib/utils'
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Monitor,
  Type,
  Palette,
  Zap
} from 'lucide-react'

export interface AccessibilitySettings {
  /**
   * Whether high contrast mode is enabled
   */
  highContrast?: boolean
  /**
   * Whether large text mode is enabled
   */
  largeText?: boolean
  /**
   * Whether reduced motion is preferred
   */
  reducedMotion?: boolean
  /**
   * Whether screen reader announcements are enabled
   */
  screenReader?: boolean
  /**
   * Whether keyboard navigation is enabled
   */
  keyboardNavigation?: boolean
  /**
   * Preferred text size
   */
  textSize?: 'small' | 'medium' | 'large' | 'extra-large'
  /**
   * Preferred color scheme
   */
  colorScheme?: 'light' | 'dark' | 'high-contrast'
  /**
   * Whether to show focus indicators
   */
  showFocusIndicators?: boolean
  /**
   * Whether to enable audio announcements
   */
  audioAnnouncements?: boolean
}

export interface AccessibilityPanelProps {
  /**
   * Current accessibility settings
   */
  settings: AccessibilitySettings
  /**
   * Callback when settings change
   */
  onSettingsChange: (settings: Partial<AccessibilitySettings>) => void
  /**
   * Whether panel is open
   */
  isOpen: boolean
  /**
   * Callback when panel is opened/closed
   */
  onOpenChange: (open: boolean) => void
  /**
   * CSS class name for panel
   */
  className?: string
  /**
   * Whether to show advanced options
   */
  showAdvanced?: boolean
}

/**
 * AccessibilityPanel component for managing user accessibility preferences
 * 
 * Provides a comprehensive panel where users can customize their
 * accessibility experience, including visual preferences,
 * motion settings, and interaction options.
 */
export function AccessibilityPanel({
  settings,
  onSettingsChange,
  isOpen,
  onOpenChange,
  className,
  showAdvanced = false,
}: AccessibilityPanelProps) {
  const { prefersReducedMotion } = useReducedMotion()
  const { announcePolite } = useAriaAnnouncer()

  const [localSettings, setLocalSettings] = useState(settings)

  // Sync local settings with props
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  /**
   * Update a specific setting
   */
  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    onSettingsChange({ [key]: value })
    
    // Announce change to screen readers
    announcePolite(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} set to ${value}`)
  }

  /**
   * Apply settings to document
   */
  const applySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement
    
    // Apply high contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    
    // Apply large text
    if (newSettings.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }
    
    // Apply reduced motion
    if (newSettings.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }
    
    // Apply text size
    root.classList.remove('text-small', 'text-medium', 'text-large', 'text-extra-large')
    if (newSettings.textSize) {
      root.classList.add(`text-${newSettings.textSize}`)
    }
    
    // Apply color scheme
    root.classList.remove('color-light', 'color-dark', 'color-high-contrast')
    if (newSettings.colorScheme) {
      root.classList.add(`color-${newSettings.colorScheme}`)
    }
    
    // Apply focus indicators
    if (newSettings.showFocusIndicators) {
      root.classList.add('show-focus-indicators')
    } else {
      root.classList.remove('show-focus-indicators')
    }
  }

  // Apply settings when they change
  useEffect(() => {
    applySettings(localSettings)
  }, [localSettings])

  /**
   * Reset settings to defaults
   */
  const resetToDefaults = () => {
    const defaults: AccessibilitySettings = {
      highContrast: false,
      largeText: false,
      reducedMotion: prefersReducedMotion,
      screenReader: false,
      keyboardNavigation: true,
      textSize: 'medium',
      colorScheme: 'light',
      showFocusIndicators: true,
      audioAnnouncements: false,
    }
    
    setLocalSettings(defaults)
    onSettingsChange(defaults)
    announcePolite('Accessibility settings reset to defaults')
  }

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-panel-title"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="accessibility-panel-title" className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Accessibility Settings
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Close accessibility settings"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Visual Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visual Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* High Contrast */}
                <div className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">High Contrast</div>
                    <div className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('highContrast', !localSettings.highContrast)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.highContrast 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.highContrast}
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                </div>

                {/* Large Text */}
                <div className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">Large Text</div>
                    <div className="text-sm text-muted-foreground">
                      Increase text size for better readability
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('largeText', !localSettings.largeText)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.largeText 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.largeText}
                  >
                    <Type className="w-4 h-4" />
                  </button>
                </div>

                {/* Text Size */}
                <div className="p-4 border border-border rounded-md">
                  <div className="font-medium mb-2">Text Size</div>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large', 'extra-large'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => updateSetting('textSize', size)}
                        className={cn(
                          'px-3 py-2 rounded-md transition-colors',
                          localSettings.textSize === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-accent'
                        )}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="p-4 border border-border rounded-md">
                  <div className="font-medium mb-2">Color Scheme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'high-contrast'] as const).map(scheme => (
                      <button
                        key={scheme}
                        onClick={() => updateSetting('colorScheme', scheme)}
                        className={cn(
                          'px-3 py-2 rounded-md transition-colors capitalize',
                          localSettings.colorScheme === scheme
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-accent'
                        )}
                      >
                        {scheme.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Motion Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Motion Settings
              </h3>
              
              <div className="p-4 border border-border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Reduced Motion</div>
                    <div className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('reducedMotion', !localSettings.reducedMotion)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.reducedMotion 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.reducedMotion}
                  >
                    {localSettings.reducedMotion ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Interaction Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Interaction Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Focus Indicators */}
                <div className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">Focus Indicators</div>
                    <div className="text-sm text-muted-foreground">
                      Show clear focus indicators
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('showFocusIndicators', !localSettings.showFocusIndicators)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.showFocusIndicators 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.showFocusIndicators}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                </div>

                {/* Keyboard Navigation */}
                <div className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">Keyboard Navigation</div>
                    <div className="text-sm text-muted-foreground">
                      Enable keyboard shortcuts
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('keyboardNavigation', !localSettings.keyboardNavigation)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.keyboardNavigation 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.keyboardNavigation}
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>

                {/* Audio Announcements */}
                <div className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">Audio Announcements</div>
                    <div className="text-sm text-muted-foreground">
                      Enable audio feedback
                    </div>
                  </div>
                  <button
                    onClick={() => updateSetting('audioAnnouncements', !localSettings.audioAnnouncements)}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      localSettings.audioAnnouncements 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-accent'
                    )}
                    aria-pressed={localSettings.audioAnnouncements}
                  >
                    {localSettings.audioAnnouncements ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Advanced Options</h3>
              <div className="p-4 border border-border rounded-md">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Screen Reader:</strong> {localSettings.screenReader ? 'Enabled' : 'Disabled'}
                  </div>
                  <div>
                    <strong>System Reduced Motion:</strong> {prefersReducedMotion ? 'Preferred' : 'Not Preferred'}
                  </div>
                  <div>
                    <strong>Current Settings:</strong>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(localSettings, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Settings are saved automatically and apply immediately
            </div>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for managing accessibility settings
 */
export function useAccessibilitySettings(initialSettings?: AccessibilitySettings) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => ({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    textSize: 'medium',
    colorScheme: 'light',
    showFocusIndicators: true,
    audioAnnouncements: false,
    ...initialSettings,
  }))

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  return {
    settings,
    updateSettings,
  }
}