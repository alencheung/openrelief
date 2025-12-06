/**
 * Emergency Accessibility Component for OpenRelief
 * 
 * Provides emergency-specific accessibility features that are critical
 * for users with disabilities during emergency situations.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { cn } from '@/lib/utils'
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Zap, 
  ZapOff,
  Phone,
  Mic,
  MicOff,
  Accessibility,
  Settings
} from 'lucide-react'

export interface EmergencyAccessibilityProps {
  /**
   * Whether emergency mode is active
   */
  isEmergencyMode?: boolean
  /**
   * Emergency type
   */
  emergencyType?: 'fire' | 'medical' | 'security' | 'natural' | 'infrastructure'
  /**
   * CSS class name
   */
  className?: string
  /**
   * Whether to show simplified interface
   */
  simplifiedInterface?: boolean
  /**
   * Callback when settings change
   */
  onSettingsChange?: (settings: EmergencyAccessibilitySettings) => void
}

export interface EmergencyAccessibilitySettings {
  /**
   * Whether high contrast mode is enabled
   */
  highContrast: boolean
  /**
   * Whether large text mode is enabled
   */
  largeText: boolean
  /**
   * Whether reduced motion is enabled
   */
  reducedMotion: boolean
  /**
   * Whether audio announcements are enabled
   */
  audioAnnouncements: boolean
  /**
   * Whether vibration alerts are enabled
   */
  vibrationAlerts: boolean
  /**
   * Whether voice control is enabled
   */
  voiceControl: boolean
  /**
   * Whether simplified interface is enabled
   */
  simplifiedInterface: boolean
  /**
   * Announcement volume level (0-100)
   */
  announcementVolume: number
  /**
   * Speech rate (0.5-2.0)
   */
  speechRate: number
}

/**
 * Emergency Accessibility Component
 */
export function EmergencyAccessibility({
  isEmergencyMode = false,
  emergencyType,
  className,
  simplifiedInterface = false,
  onSettingsChange,
}: EmergencyAccessibilityProps) {
  const { announcePolite, announceAssertive } = useAriaAnnouncer({
    defaultPriority: 'assertive',
  })
  
  const { isReduced, toggleReducedMotion } = useReducedMotion({
    respectSystemPreference: true,
    enableControls: true,
  })

  const [settings, setSettings] = useState<EmergencyAccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: isReduced,
    audioAnnouncements: true,
    vibrationAlerts: true,
    voiceControl: false,
    simplifiedInterface: simplifiedInterface,
    announcementVolume: 80,
    speechRate: 1.0,
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  /**
   * Update a specific setting
   */
  const updateSetting = useCallback(<K extends keyof EmergencyAccessibilitySettings>(
    key: K,
    value: EmergencyAccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
    
    // Apply setting to document
    applySettingToDocument(key, value)
    
    // Announce setting change
    announcePolite(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} set to ${value}`)
  }, [settings, announcePolite, onSettingsChange])

  /**
   * Apply setting to document
   */
  const applySettingToDocument = useCallback(<K extends keyof EmergencyAccessibilitySettings>(
    key: K,
    value: EmergencyAccessibilitySettings[K]
  ) => {
    const root = document.documentElement
    
    switch (key) {
      case 'highContrast':
        if (value) {
          root.classList.add('emergency-high-contrast')
        } else {
          root.classList.remove('emergency-high-contrast')
        }
        break
        
      case 'largeText':
        if (value) {
          root.classList.add('emergency-large-text')
        } else {
          root.classList.remove('emergency-large-text')
        }
        break
        
      case 'reducedMotion':
        if (value) {
          root.classList.add('emergency-reduced-motion')
          toggleReducedMotion(true)
        } else {
          root.classList.remove('emergency-reduced-motion')
          toggleReducedMotion(false)
        }
        break
        
      case 'simplifiedInterface':
        if (value) {
          root.classList.add('emergency-simplified')
        } else {
          root.classList.remove('emergency-simplified')
        }
        break
    }
  }, [toggleReducedMotion])

  /**
   * Announce emergency alert
   */
  const announceEmergency = useCallback((message: string, priority: 'critical' | 'warning' | 'info' = 'critical') => {
    if (!settings.audioAnnouncements) return
    
    const announcement = priority === 'critical' 
      ? `EMERGENCY: ${message}`
      : `${priority.toUpperCase()}: ${message}`
    
    announceAssertive(announcement)
    
    // Trigger vibration if enabled
    if (settings.vibrationAlerts && 'vibrate' in navigator) {
      navigator.vibrate(priority === 'critical' ? [200, 100, 200] : [100])
    }
  }, [settings.audioAnnouncements, announceAssertive])

  /**
   * Start voice recording
   */
  const startVoiceRecording = useCallback(() => {
    if (!settings.voiceControl) return
    
    setIsRecording(true)
    announcePolite('Voice recording started')
    
    // Start speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1
        const transcript = event.results[last][0].transcript
        
        if (event.results[last].isFinal) {
          // Process voice command
          processVoiceCommand(transcript.toLowerCase())
        }
      }
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        announcePolite('Voice recording failed')
      }
      
      recognition.onend = () => {
        setIsRecording(false)
      }
      
      recognition.start()
    }
  }, [settings.voiceControl, announcePolite])

  /**
   * Stop voice recording
   */
  const stopVoiceRecording = useCallback(() => {
    setIsRecording(false)
    announcePolite('Voice recording stopped')
  }, [announcePolite])

  /**
   * Process voice command
   */
  const processVoiceCommand = useCallback((command: string) => {
    // Emergency voice commands
    const emergencyCommands: Record<string, () => void> = {
      'emergency': () => announceEmergency('Emergency reported', 'critical'),
      'help': () => announceEmergency('Help is on the way', 'info'),
      'fire': () => announceEmergency('Fire emergency reported', 'critical'),
      'medical': () => announceEmergency('Medical emergency reported', 'critical'),
      'police': () => announceEmergency('Police called', 'critical'),
      'ambulance': () => announceEmergency('Ambulance called', 'critical'),
      'stop': () => stopVoiceRecording(),
      'cancel': () => stopVoiceRecording(),
    }
    
    const commandFunction = emergencyCommands[command]
    if (commandFunction) {
      commandFunction()
    } else {
      announcePolite(`Unknown command: ${command}`)
    }
  }, [announceEmergency, stopVoiceRecording, announcePolite])

  /**
   * Trigger emergency alert
   */
  const triggerEmergencyAlert = useCallback(() => {
    announceEmergency('Emergency activated', 'critical')
    
    // Flash screen for visual alert
    document.body.classList.add('emergency-flash')
    setTimeout(() => {
      document.body.classList.remove('emergency-flash')
    }, 1000)
  }, [announceEmergency])

  /**
   * Get emergency type color
   */
  const getEmergencyTypeColor = useCallback(() => {
    switch (emergencyType) {
      case 'fire':
        return 'bg-red-600 text-white'
      case 'medical':
        return 'bg-pink-600 text-white'
      case 'security':
        return 'bg-yellow-600 text-white'
      case 'natural':
        return 'bg-blue-600 text-white'
      case 'infrastructure':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }, [emergencyType])

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEmergencyMode) return
    
    // Emergency keyboard shortcuts
    const emergencyShortcuts: Record<string, () => void> = {
      'Ctrl+Shift+E': () => triggerEmergencyAlert(),
      'Ctrl+Shift+H': () => announceEmergency('Help requested', 'warning'),
      'Ctrl+Shift+F': () => announceEmergency('Fire emergency', 'critical'),
      'Ctrl+Shift+M': () => announceEmergency('Medical emergency', 'critical'),
      'Ctrl+Shift+P': () => announceEmergency('Police emergency', 'critical'),
      'Ctrl+Shift+A': () => announceEmergency('Ambulance requested', 'critical'),
      'Ctrl+Shift+V': () => isRecording ? stopVoiceRecording() : startVoiceRecording(),
      'Ctrl+Shift+S': () => updateSetting('simplifiedInterface', !settings.simplifiedInterface),
      'Ctrl+Shift+C': () => updateSetting('highContrast', !settings.highContrast),
      'Ctrl+Shift+L': () => updateSetting('largeText', !settings.largeText),
      'Ctrl+Shift+R': () => updateSetting('reducedMotion', !settings.reducedMotion),
      'Ctrl+Shift+A': () => updateSetting('audioAnnouncements', !settings.audioAnnouncements),
      'Ctrl+Shift+I': () => updateSetting('vibrationAlerts', !settings.vibrationAlerts),
    }
    
    const key = `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`
    const shortcutFunction = emergencyShortcuts[key]
    
    if (shortcutFunction) {
      event.preventDefault()
      event.stopPropagation()
      shortcutFunction()
    }
  }, [isEmergencyMode, triggerEmergencyAlert, announceEmergency, isRecording, stopVoiceRecording, startVoiceRecording, updateSetting, settings])

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    if (!isEmergencyMode) return
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEmergencyMode, handleKeyDown])

  /**
   * Announce emergency mode changes
   */
  useEffect(() => {
    if (isEmergencyMode) {
      announceAssertive('Emergency mode activated')
      announceEmergency('Emergency shortcuts available', 'info')
    } else {
      announcePolite('Emergency mode deactivated')
    }
  }, [isEmergencyMode, announceAssertive, announcePolite])

  if (!isEmergencyMode) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg max-w-sm',
        className
      )}
      role="region"
      aria-label="Emergency accessibility controls"
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b border-border',
        getEmergencyTypeColor()
      )}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Emergency Mode</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/10 rounded transition-colors"
          aria-label={isExpanded ? 'Collapse emergency controls' : 'Expand emergency controls'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Controls */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerEmergencyAlert}
                className="p-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                aria-label="Trigger emergency alert"
              >
                <AlertTriangle className="w-4 h-4" />
                Emergency
              </button>
              <button
                onClick={() => announceEmergency('Help requested', 'warning')}
                className="p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                aria-label="Request help"
              >
                <Phone className="w-4 h-4" />
                Help
              </button>
            </div>
          </div>

          {/* Voice Control */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Voice Control</h3>
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={cn(
                'w-full p-3 rounded flex items-center justify-center gap-2 transition-colors',
                isRecording 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
              aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Voice
                </>
              )}
            </button>
            {isRecording && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm">Listening for commands...</span>
                </div>
              </div>
            )}
          </div>

          {/* Accessibility Settings */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Accessibility Settings</h3>
            
            {/* High Contrast */}
            <button
              onClick={() => updateSetting('highContrast', !settings.highContrast)}
              className={cn(
                'w-full p-2 rounded flex items-center justify-between transition-colors',
                settings.highContrast 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              aria-pressed={settings.highContrast}
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                High Contrast
              </span>
              {settings.highContrast ? '✓' : ''}
            </button>

            {/* Large Text */}
            <button
              onClick={() => updateSetting('largeText', !settings.largeText)}
              className={cn(
                'w-full p-2 rounded flex items-center justify-between transition-colors',
                settings.largeText 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              aria-pressed={settings.largeText}
            >
              <span className="flex items-center gap-2">
                <Accessibility className="w-4 h-4" />
                Large Text
              </span>
              {settings.largeText ? '✓' : ''}
            </button>

            {/* Reduced Motion */}
            <button
              onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
              className={cn(
                'w-full p-2 rounded flex items-center justify-between transition-colors',
                settings.reducedMotion 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              aria-pressed={settings.reducedMotion}
            >
              <span className="flex items-center gap-2">
                {settings.reducedMotion ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                Reduced Motion
              </span>
              {settings.reducedMotion ? '✓' : ''}
            </button>

            {/* Audio Announcements */}
            <button
              onClick={() => updateSetting('audioAnnouncements', !settings.audioAnnouncements)}
              className={cn(
                'w-full p-2 rounded flex items-center justify-between transition-colors',
                settings.audioAnnouncements 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              aria-pressed={settings.audioAnnouncements}
            >
              <span className="flex items-center gap-2">
                {settings.audioAnnouncements ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Audio Announcements
              </span>
              {settings.audioAnnouncements ? '✓' : ''}
            </button>

            {/* Vibration Alerts */}
            <button
              onClick={() => updateSetting('vibrationAlerts', !settings.vibrationAlerts)}
              className={cn(
                'w-full p-2 rounded flex items-center justify-between transition-colors',
                settings.vibrationAlerts 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              aria-pressed={settings.vibrationAlerts}
            >
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Vibration Alerts
              </span>
              {settings.vibrationAlerts ? '✓' : ''}
            </button>
          </div>

          {/* Voice Commands Help */}
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="font-semibold text-sm mb-2">Voice Commands:</h4>
            <div className="text-xs space-y-1">
              <div>"emergency" - Trigger emergency alert</div>
              <div>"help" - Request help</div>
              <div>"fire" - Report fire emergency</div>
              <div>"medical" - Report medical emergency</div>
              <div>"police" - Call police</div>
              <div>"ambulance" - Call ambulance</div>
              <div>"stop" - Stop recording</div>
              <div>"cancel" - Cancel recording</div>
            </div>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="font-semibold text-sm mb-2">Emergency Shortcuts:</h4>
            <div className="text-xs space-y-1">
              <div>Ctrl+Shift+E - Trigger emergency</div>
              <div>Ctrl+Shift+H - Request help</div>
              <div>Ctrl+Shift+F - Fire emergency</div>
              <div>Ctrl+Shift+M - Medical emergency</div>
              <div>Ctrl+Shift+P - Police emergency</div>
              <div>Ctrl+Shift+A - Ambulance</div>
              <div>Ctrl+Shift+V - Voice control</div>
              <div>Ctrl+Shift+S - Simplified interface</div>
              <div>Ctrl+Shift+C - High contrast</div>
              <div>Ctrl+Shift+L - Large text</div>
              <div>Ctrl+Shift+R - Reduced motion</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {isEmergencyMode && 'Emergency mode is active. Voice commands and shortcuts are available.'}
      </div>
    </div>
  )
}

/**
 * Hook for emergency accessibility
 */
export function useEmergencyAccessibility(options: EmergencyAccessibilityProps = {}) {
  const [isEmergencyMode, setIsEmergencyMode] = useState(false)
  const [emergencyType, setEmergencyType] = useState<EmergencyAccessibilityProps['emergencyType']>()
  const [settings, setSettings] = useState<EmergencyAccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    audioAnnouncements: true,
    vibrationAlerts: true,
    voiceControl: false,
    simplifiedInterface: false,
    announcementVolume: 80,
    speechRate: 1.0,
  })

  /**
   * Activate emergency mode
   */
  const activateEmergencyMode = useCallback((type?: EmergencyAccessibilityProps['emergencyType']) => {
    setIsEmergencyMode(true)
    setEmergencyType(type)
  }, [])

  /**
   * Deactivate emergency mode
   */
  const deactivateEmergencyMode = useCallback(() => {
    setIsEmergencyMode(false)
    setEmergencyType(undefined)
  }, [])

  /**
   * Update emergency settings
   */
  const updateEmergencySettings = useCallback((newSettings: Partial<EmergencyAccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return {
    isEmergencyMode,
    emergencyType,
    settings,
    activateEmergencyMode,
    deactivateEmergencyMode,
    updateEmergencySettings,
  }
}

export default EmergencyAccessibility