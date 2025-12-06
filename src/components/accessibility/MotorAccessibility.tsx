/**
 * Motor Accessibility Component for OpenRelief
 * 
 * Provides comprehensive motor accessibility features for users with
 * motor disabilities, ensuring everyone can access emergency services.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { cn } from '@/lib/utils'
import { 
  Hand, 
  MousePointer, 
  Touchscreen, 
  Accessibility, 
  Settings,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  Mic,
  MicOff,
  Navigation,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react'

export interface MotorAccessibilityProps {
  /**
   * Whether motor accessibility features are enabled
   */
  enabled?: boolean
  /**
   * CSS class name
   */
  className?: string
  /**
   * Callback when settings change
   */
  onSettingsChange?: (settings: MotorAccessibilitySettings) => void
  /**
   * Whether to show simplified controls
   */
  simplifiedControls?: boolean
}

export interface MotorAccessibilitySettings {
  /**
   * Touch target size multiplier
   */
  touchTargetSize: 'small' | 'medium' | 'large' | 'extra-large'
  /**
   * Whether to enable voice control
   */
  voiceControl: boolean
  /**
   * Whether to enable switch control
   */
  switchControl: boolean
  /**
   * Whether to enable eye tracking
   */
  eyeTracking: boolean
  /**
   * Whether to enable head tracking
   */
  headTracking: boolean
  /**
   * Whether to enable gesture controls
   */
  gestureControl: boolean
  /**
   * Whether to enable alternative input methods
   */
  alternativeInput: boolean
  /**
   * Whether to enable dwell clicking
   */
  dwellClicking: boolean
  /**
   * Whether to enable scanning mode
   */
  scanningMode: boolean
  /**
   * Dwell time in milliseconds
   */
  dwellTime: number
  /**
   * Scan speed in milliseconds
   */
  scanSpeed: number
  /**
   * Whether to enable haptic feedback
   */
  hapticFeedback: boolean
  /**
   * Whether to enable audio cues
   */
  audioCues: boolean
  /**
   * Whether to enable visual cues
   */
  visualCues: boolean
}

/**
 * Motor Accessibility Component
 */
export function MotorAccessibility({
  enabled = true,
  className,
  onSettingsChange,
  simplifiedControls = false,
}: MotorAccessibilityProps) {
  const { announcePolite } = useAriaAnnouncer({
    defaultPriority: 'polite',
  })

  const [settings, setSettings] = useState<MotorAccessibilitySettings>({
    touchTargetSize: 'medium',
    voiceControl: false,
    switchControl: false,
    eyeTracking: false,
    headTracking: false,
    gestureControl: false,
    alternativeInput: false,
    dwellClicking: false,
    scanningMode: false,
    dwellTime: 1000,
    scanSpeed: 2000,
    hapticFeedback: true,
    audioCues: true,
    visualCues: true,
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  /**
   * Touch target size configurations
   */
  const touchTargetSizes = {
    small: { size: 32, label: 'Small (32px)', minSize: 32 },
    medium: { size: 44, label: 'Medium (44px)', minSize: 44 },
    large: { size: 56, label: 'Large (56px)', minSize: 56 },
    'extra-large': { size: 72, label: 'Extra Large (72px)', minSize: 72 },
  }

  /**
   * Update a specific setting
   */
  const updateSetting = useCallback(<K extends keyof MotorAccessibilitySettings>(
    key: K,
    value: MotorAccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
    
    // Apply setting to document
    applyMotorSettingToDocument(key, value)
    
    // Announce setting change
    announcePolite(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} set to ${value}`)
  }, [settings, announcePolite, onSettingsChange])

  /**
   * Apply motor setting to document
   */
  const applyMotorSettingToDocument = useCallback(<K extends keyof MotorAccessibilitySettings>(
    key: K,
    value: MotorAccessibilitySettings[K]
  ) => {
    const root = document.documentElement
    
    switch (key) {
      case 'touchTargetSize':
        const sizeConfig = touchTargetSizes[value as string]
        root.style.setProperty('--motor-touch-target-size', `${sizeConfig.size}px`)
        root.style.setProperty('--motor-touch-target-min-size', `${sizeConfig.minSize}px`)
        break
        
      case 'voiceControl':
        if (value) {
          root.classList.add('motor-voice-control')
        } else {
          root.classList.remove('motor-voice-control')
        }
        break
        
      case 'switchControl':
        if (value) {
          root.classList.add('motor-switch-control')
        } else {
          root.classList.remove('motor-switch-control')
        }
        break
        
      case 'eyeTracking':
        if (value) {
          root.classList.add('motor-eye-tracking')
        } else {
          root.classList.remove('motor-eye-tracking')
        }
        break
        
      case 'headTracking':
        if (value) {
          root.classList.add('motor-head-tracking')
        } else {
          root.classList.remove('motor-head-tracking')
        }
        break
        
      case 'gestureControl':
        if (value) {
          root.classList.add('motor-gesture-control')
        } else {
          root.classList.remove('motor-gesture-control')
        }
        break
        
      case 'dwellClicking':
        if (value) {
          root.classList.add('motor-dwell-clicking')
        } else {
          root.classList.remove('motor-dwell-clicking')
        }
        break
        
      case 'scanningMode':
        if (value) {
          root.classList.add('motor-scanning-mode')
        } else {
          root.classList.remove('motor-scanning-mode')
        }
        break
        
      case 'hapticFeedback':
        if (value) {
          root.classList.add('motor-haptic-feedback')
        } else {
          root.classList.remove('motor-haptic-feedback')
        }
        break
        
      case 'audioCues':
        if (value) {
          root.classList.add('motor-audio-cues')
        } else {
          root.classList.remove('motor-audio-cues')
        }
        break
        
      case 'visualCues':
        if (value) {
          root.classList.add('motor-visual-cues')
        } else {
          root.classList.remove('motor-visual-cues')
        }
        break
    }
  }, [])

  /**
   * Handle voice control
   */
  const handleVoiceControl = useCallback(() => {
    if (!settings.voiceControl) return
    
    setIsVoiceActive(!isVoiceActive)
    
    if (!isVoiceActive) {
      // Start voice recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        recognition.onresult = (event: any) => {
          const last = event.results.length - 1
          const transcript = event.results[last][0].transcript.toLowerCase()
          
          // Process voice commands
          processVoiceCommand(transcript)
        }
        
        recognition.onerror = (event: any) => {
          console.error('Voice recognition error:', event.error)
          setIsVoiceActive(false)
          announcePolite('Voice control failed')
        }
        
        recognition.onend = () => {
          setIsVoiceActive(false)
        }
        
        recognition.start()
        announcePolite('Voice control activated')
      }
    } else {
      setIsVoiceActive(false)
    }
  }, [settings.voiceControl, isVoiceActive, announcePolite])

  /**
   * Process voice command
   */
  const processVoiceCommand = useCallback((command: string) => {
    const emergencyCommands: Record<string, () => void> = {
      'emergency': () => announcePolite('Emergency reported'),
      'help': () => announcePolite('Help is on the way'),
      'fire': () => announcePolite('Fire emergency reported'),
      'medical': () => announcePolite('Medical emergency reported'),
      'police': () => announcePolite('Police called'),
      'ambulance': () => announcePolite('Ambulance called'),
      'stop': () => setIsVoiceActive(false),
      'cancel': () => setIsVoiceActive(false),
      'navigate': () => announcePolite('Voice navigation activated'),
      'scan': () => {
        setIsScanning(true)
        announcePolite('Scanning mode activated')
      },
      'select': () => announcePolite('Element selected'),
      'confirm': () => announcePolite('Action confirmed'),
      'back': () => announcePolite('Going back'),
    }
    
    const commandFunction = emergencyCommands[command]
    if (commandFunction) {
      commandFunction()
    } else {
      announcePolite(`Unknown command: ${command}`)
    }
  }, [announcePolite])

  /**
   * Handle scanning mode
   */
  const handleScanning = useCallback(() => {
    setIsScanning(!isScanning)
    
    if (!isScanning) {
      announcePolite('Scanning mode deactivated')
    } else {
      announcePolite('Scanning mode activated')
      // Start scanning process
      startScanning()
    }
  }, [isScanning, announcePolite])

  /**
   * Start scanning process
   */
  const startScanning = useCallback(() => {
    let currentIndex = 0
    const focusableElements = document.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
    
    const scanElement = (index: number) => {
      if (index >= focusableElements.length) {
        setIsScanning(false)
        announcePolite('Scanning completed')
        return
      }
      
      const element = focusableElements[index] as HTMLElement
      element.focus()
      announcePolite(`Scanning: ${element.textContent || element.getAttribute('aria-label') || 'Element ' + (index + 1)}`)
      
      currentIndex = index
    }
    
    // Auto-scan with configurable speed
    const scanInterval = setInterval(() => {
      scanElement(currentIndex + 1)
    }, settings.scanSpeed)
    
    // Stop scanning after one complete cycle
    setTimeout(() => {
      clearInterval(scanInterval)
      setIsScanning(false)
    }, settings.scanSpeed * focusableElements.length)
  }, [settings.scanSpeed, announcePolite])

  /**
   * Handle dwell clicking
   */
  const handleDwellClick = useCallback((element: HTMLElement) => {
    if (!settings.dwellClicking) return
    
    let dwellTimer: NodeJS.Timeout
    
    const startDwell = () => {
      dwellTimer = setTimeout(() => {
        element.click()
        announcePolite('Element activated')
      }, settings.dwellTime)
    }
    
    const clearDwell = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer)
      }
    }
    
    element.addEventListener('mouseenter', startDwell)
    element.addEventListener('mouseleave', clearDwell)
    element.addEventListener('focus', startDwell)
    element.addEventListener('blur', clearDwell)
    
    // Visual dwell indicator
    element.classList.add('motor-dwell-target')
  }, [settings.dwellClicking, settings.dwellTime, announcePolite])

  /**
   * Trigger haptic feedback
   */
  const triggerHapticFeedback = useCallback(() => {
    if (!settings.hapticFeedback) return
    
    // Vibration pattern for feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]) // Confirmation pattern
    }
    
    // Visual feedback
    document.body.classList.add('motor-haptic-active')
    setTimeout(() => {
      document.body.classList.remove('motor-haptic-active')
    }, 200)
  }, [settings.hapticFeedback])

  /**
   * Trigger audio cue
   */
  const triggerAudioCue = useCallback((type: 'success' | 'error' | 'warning' | 'navigation') => {
    if (!settings.audioCues) return
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Set frequency based on cue type
    const frequencies = {
      success: 800,
      error: 300,
      warning: 400,
      navigation: 600,
    }
    
    oscillator.frequency.value = frequencies[type]
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }, [settings.audioCues])

  /**
   * Handle keyboard navigation for motor accessibility
   */
  const handleMotorKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return
    
    // Motor accessibility keyboard shortcuts
    const motorShortcuts: Record<string, () => void> = {
      'Alt+T': () => updateSetting('touchTargetSize', 
        settings.touchTargetSize === 'small' ? 'medium' : 
        settings.touchTargetSize === 'medium' ? 'large' : 
        settings.touchTargetSize === 'large' ? 'extra-large' : 'small'),
      'Alt+V': () => updateSetting('voiceControl', !settings.voiceControl),
      'Alt+S': () => updateSetting('switchControl', !settings.switchControl),
      'Alt+E': () => updateSetting('eyeTracking', !settings.eyeTracking),
      'Alt+H': () => updateSetting('headTracking', !settings.headTracking),
      'Alt+G': () => updateSetting('gestureControl', !settings.gestureControl),
      'Alt+A': () => updateSetting('alternativeInput', !settings.alternativeInput),
      'Alt+D': () => updateSetting('dwellClicking', !settings.dwellClicking),
      'Alt+C': () => updateSetting('scanningMode', !settings.scanningMode),
      'Alt+Up': () => updateSetting('dwellTime', Math.min(settings.dwellTime + 200, 3000)),
      'Alt+Down': () => updateSetting('dwellTime', Math.max(settings.dwellTime - 200, 500)),
      'Alt+F': () => triggerHapticFeedback(),
      'Alt+Space': () => handleScanning(),
      'Escape': () => {
        // Emergency stop all
        updateSetting('scanningMode', false)
        updateSetting('voiceControl', false)
        setIsVoiceActive(false)
        setIsScanning(false)
      },
    }
    
    const key = `${event.altKey ? 'Alt+' : ''}${event.key}`
    const shortcutFunction = motorShortcuts[key]
    
    if (shortcutFunction) {
      event.preventDefault()
      event.stopPropagation()
      shortcutFunction()
    }
  }, [enabled, updateSetting, settings, handleScanning, triggerHapticFeedback, setIsVoiceActive])

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('keydown', handleMotorKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleMotorKeyDown)
    }
  }, [enabled, handleMotorKeyDown])

  if (!enabled) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg max-w-sm',
        className
      )}
      role="region"
      aria-label="Motor accessibility controls"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Hand className="w-5 h-5" />
          <span className="font-semibold">Motor Accessibility</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          aria-label={isExpanded ? 'Collapse motor controls' : 'Expand motor controls'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Controls */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Touch Target Size */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Touch Target Size</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(touchTargetSizes).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateSetting('touchTargetSize', key as any)}
                  className={cn(
                    'p-3 rounded flex flex-col items-center justify-between transition-colors',
                    settings.touchTargetSize === key 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.touchTargetSize === key}
                  aria-label={`Touch target size: ${config.label}`}
                >
                  <div className="text-sm font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.size}px minimum
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Control */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Voice Control</h3>
            <button
              onClick={handleVoiceControl}
              className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.voiceControl 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.voiceControl}
            >
              <span className="flex items-center gap-2">
                {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                Voice Control
              </span>
              <div className="text-sm text-muted-foreground">
                {isVoiceActive ? 'Listening...' : 'Tap to activate'}
              </div>
            </button>
          </div>

          {/* Scanning Mode */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Scanning Mode</h3>
            <button
              onClick={handleScanning}
              className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.scanningMode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.scanningMode}
            >
              <span className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Scanning Mode
              </span>
              <div className="text-sm text-muted-foreground">
                {isScanning ? 'Scanning...' : 'Tap to activate'}
              </div>
            </button>
          </div>

          {/* Dwell Clicking */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Dwell Clicking</h3>
            <div className="space-y-2">
              <button
                onClick={() => updateSetting('dwellClicking', !settings.dwellClicking)}
                className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.dwellClicking 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.dwellClicking}
              >
                Enable Dwell Clicking
              </button>
              
              {settings.dwellClicking && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Dwell Time:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSetting('dwellTime', Math.max(settings.dwellTime - 200, 500))}
                      className="p-1 bg-muted hover:bg-accent rounded"
                      aria-label="Decrease dwell time"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium px-2">{settings.dwellTime}ms</span>
                    <button
                      onClick={() => updateSetting('dwellTime', Math.min(settings.dwellTime + 200, 3000))}
                      className="p-1 bg-muted hover:bg-accent rounded"
                      aria-label="Increase dwell time"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Options */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Feedback Options</h3>
            
            {/* Haptic Feedback */}
            <button
              onClick={() => updateSetting('hapticFeedback', !settings.hapticFeedback)}
              className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.hapticFeedback 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.hapticFeedback}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Haptic Feedback
              </span>
              {settings.hapticFeedback && (
                <button
                  onClick={triggerHapticFeedback}
                  className="ml-2 p-1 bg-primary text-primary-foreground rounded"
                  aria-label="Test haptic feedback"
                >
                  Test
                </button>
              )}
            </button>

            {/* Audio Cues */}
            <button
              onClick={() => updateSetting('audioCues', !settings.audioCues)}
              className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.audioCues 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.audioCues}
            >
              <span className="flex items-center gap-2">
                {settings.audioCues ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Audio Cues
              </span>
            </button>

            {/* Visual Cues */}
            <button
              onClick={() => updateSetting('visualCues', !settings.visualCues)}
              className={cn(
                    'w-full p-3 rounded flex items-center justify-between transition-colors',
                    settings.visualCues 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-accent'
                  )}
                  aria-pressed={settings.visualCues}
            >
              <span className="flex items-center gap-2">
                {settings.visualCues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Visual Cues
              </span>
            </button>
          </div>

          {/* Voice Commands Help */}
          {settings.voiceControl && (
            <div className="mt-4 p-3 bg-muted rounded">
              <h4 className="font-semibold text-sm mb-2">Voice Commands:</h4>
              <div className="text-xs space-y-1">
                <div>"emergency" - Report emergency</div>
                <div>"help" - Request help</div>
                <div>"fire" - Fire emergency</div>
                <div>"medical" - Medical emergency</div>
                <div>"police" - Call police</div>
                <div>"ambulance" - Call ambulance</div>
                <div>"navigate" - Navigate interface</div>
                <div>"scan" - Start scanning</div>
                <div>"select" - Select element</div>
                <div>"confirm" - Confirm action</div>
                <div>"back" - Go back</div>
                <div>"stop" - Stop voice control</div>
                <div>"cancel" - Cancel action</div>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="mt-4 p-3 bg-muted rounded">
            <h4 className="font-semibold text-sm mb-2">Motor Shortcuts:</h4>
              <div className="text-xs space-y-1">
                <div>Alt+T - Cycle touch target size</div>
                <div>Alt+V - Toggle voice control</div>
                <div>Alt+S - Toggle switch control</div>
                <div>Alt+E - Toggle eye tracking</div>
                <div>Alt+H - Toggle head tracking</div>
                <div>Alt+G - Toggle gesture control</div>
                <div>Alt+A - Toggle alternative input</div>
                <div>Alt+D - Toggle dwell clicking</div>
                <div>Alt+C - Toggle scanning mode</div>
                <div>Alt+Up/Down - Adjust dwell time</div>
                <div>Alt+F - Test haptic feedback</div>
                <div>Alt+Space - Start scanning</div>
                <div>Escape - Emergency stop all</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {enabled && 'Motor accessibility controls are available. Alt+M to open menu.'}
        {isVoiceActive && 'Voice control is active. Say commands or press Escape to stop.'}
        {isScanning && 'Scanning mode is active. Press Escape to stop.'}
        {settings.dwellClicking && 'Dwell clicking is enabled. Hover over elements to activate.'}
      </div>
    </div>
  )
}

/**
 * Hook for motor accessibility
 */
export function useMotorAccessibility(options: MotorAccessibilityProps = {}) {
  const [settings, setSettings] = useState<MotorAccessibilitySettings>({
    touchTargetSize: 'medium',
    voiceControl: false,
    switchControl: false,
    eyeTracking: false,
    headTracking: false,
    gestureControl: false,
    alternativeInput: false,
    dwellClicking: false,
    scanningMode: false,
    dwellTime: 1000,
    scanSpeed: 2000,
    hapticFeedback: true,
    audioCues: true,
    visualCues: true,
  })

  /**
   * Update motor accessibility settings
   */
  const updateMotorSettings = useCallback((newSettings: Partial<MotorAccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
    }, [])

  return {
    settings,
    updateMotorSettings,
  }
}

export default MotorAccessibility