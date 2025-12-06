/**
 * React Hook for iOS Background Strategy
 * 
 * Provides easy integration with iOS background functionality
 * for emergency notifications and location services.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { iOSBackgroundManager, EmergencyPushPayload, iOSBackgroundConfig } from '@/lib/ios-background-strategy'

interface UseiOSBackgroundReturn {
  // Configuration
  config: iOSBackgroundConfig
  isInitialized: boolean
  isInitializing: boolean
  
  // Queue status
  queueStatus: {
    queued: number
    processing: boolean
  }
  
  // Actions
  initialize: () => Promise<boolean>
  updateConfig: (updates: Partial<iOSBackgroundConfig>) => void
  
  // Emergency handling
  sendTestEmergency: (payload: Partial<EmergencyPushPayload>) => void
  clearEmergencyQueue: () => void
  
  // Permissions
  requestPermissions: () => Promise<boolean>
  
  // Background tasks
  triggerLocationCheck: () => Promise<void>
  triggerQueueProcessing: () => Promise<void>
}

export function useiOSBackground(): UseiOSBackgroundReturn {
  const [config, setConfig] = useState<iOSBackgroundConfig>({
    silentPushEnabled: false,
    backgroundLocationEnabled: false,
    batteryOptimizationHandled: false,
    criticalAlertsEnabled: false,
  })
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [queueStatus, setQueueStatus] = useState({
    queued: 0,
    processing: false,
  })

  const initializationRef = useRef(false)
  const updateIntervalRef = useRef<NodeJS.Timeout>()

  // Initialize iOS background strategy
  const initialize = useCallback(async (): Promise<boolean> => {
    if (initializationRef.current || isInitialized) {
      return true
    }

    setIsInitializing(true)
    
    try {
      const success = await iOSBackgroundManager.initialize()
      setIsInitialized(success)
      
      if (success) {
        const managerConfig = iOSBackgroundManager.getConfig()
        setConfig(managerConfig)
        initializationRef.current = true
      }
      
      return success
    } catch (error) {
      console.error('Failed to initialize iOS background strategy:', error)
      return false
    } finally {
      setIsInitializing(false)
    }
  }, [isInitialized])

  // Update configuration
  const updateConfig = useCallback((updates: Partial<iOSBackgroundConfig>) => {
    iOSBackgroundManager.updateConfig(updates)
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Send test emergency
  const sendTestEmergency = useCallback((payload: Partial<EmergencyPushPayload>) => {
    const testPayload: EmergencyPushPayload = {
      eventId: `test_${Date.now()}`,
      type: 'emergency',
      severity: 'high',
      title: payload.title || 'Test Emergency',
      message: payload.message || 'This is a test emergency notification',
      requiresAction: payload.requiresAction ?? true,
      timestamp: Date.now(),
      trustWeight: 1.0,
      ...payload,
    }

    // Simulate receiving the notification
    iOSBackgroundManager.handleNotification({
      data: {
        emergencyId: testPayload.eventId,
        type: testPayload.type,
        severity: testPayload.severity,
        title: testPayload.title,
        message: testPayload.message,
        location: testPayload.location ? JSON.stringify(testPayload.location) : undefined,
        requiresAction: testPayload.requiresAction.toString(),
        timestamp: testPayload.timestamp.toString(),
        trustWeight: testPayload.trustWeight.toString(),
      },
      foreground: true,
      userInteraction: false,
    })
  }, [])

  // Clear emergency queue
  const clearEmergencyQueue = useCallback(() => {
    // This would need to be implemented in the iOSBackgroundManager
    console.log('Clearing emergency queue')
  }, [])

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // This would integrate with the iOSBackgroundManager
      // For now, we'll simulate permission request
      console.log('Requesting iOS background permissions...')
      
      // In a real implementation, this would:
      // 1. Request location permission
      // 2. Request notification permission
      // 3. Request background app refresh
      // 4. Request motion permission
      
      return true
    } catch (error) {
      console.error('Failed to request permissions:', error)
      return false
    }
  }, [])

  // Trigger location check
  const triggerLocationCheck = useCallback(async (): Promise<void> => {
    try {
      console.log('Triggering manual location check...')
      // This would call iOSBackgroundManager.performLocationVerification()
    } catch (error) {
      console.error('Failed to trigger location check:', error)
    }
  }, [])

  // Trigger queue processing
  const triggerQueueProcessing = useCallback(async (): Promise<void> => {
    try {
      console.log('Triggering manual queue processing...')
      // This would call iOSBackgroundManager.processEmergencyQueue()
    } catch (error) {
      console.error('Failed to trigger queue processing:', error)
    }
  }, [])

  // Update queue status periodically
  useEffect(() => {
    if (isInitialized) {
      const updateStatus = () => {
        const status = iOSBackgroundManager.getQueueStatus()
        setQueueStatus(status)
      }

      updateStatus()
      updateIntervalRef.current = setInterval(updateStatus, 5000) // Update every 5 seconds

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
        }
      }
    }
  }, [isInitialized])

  // Auto-initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      initialize()
    }
  }, [initialize])

  return {
    config,
    isInitialized,
    isInitializing,
    queueStatus,
    initialize,
    updateConfig,
    sendTestEmergency,
    clearEmergencyQueue,
    requestPermissions,
    triggerLocationCheck,
    triggerQueueProcessing,
  }
}

// Additional hook for emergency notification handling
export function useEmergencyNotifications() {
  const [notifications, setNotifications] = useState<EmergencyPushPayload[]>([])
  const [activeEmergency, setActiveEmergency] = useState<EmergencyPushPayload | null>(null)

  const handleEmergencyNotification = useCallback((payload: EmergencyPushPayload) => {
    setNotifications(prev => [payload, ...prev].slice(0, 50)) // Keep last 50
    
    // Set as active if critical
    if (payload.severity === 'critical') {
      setActiveEmergency(payload)
    }
  }, [])

  const dismissEmergency = useCallback((eventId: string) => {
    setActiveEmergency(null)
    setNotifications(prev => prev.filter(n => n.eventId !== eventId))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    setActiveEmergency(null)
  }, [])

  return {
    notifications,
    activeEmergency,
    handleEmergencyNotification,
    dismissEmergency,
    clearAllNotifications,
  }
}

// Hook for iOS-specific features
export function useiOSSpecificFeatures() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isCharging, setIsCharging] = useState<boolean | null>(null)
  const [backgroundAppRefreshEnabled, setBackgroundAppRefreshEnabled] = useState<boolean>(false)

  // Monitor battery status
  useEffect(() => {
    if ('getBattery' in navigator) {
      const monitorBattery = async () => {
        try {
          const battery = await (navigator as any).getBattery()
          
          setBatteryLevel(battery.level * 100)
          setIsCharging(battery.charging)

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100)
          })

          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging)
          })
        } catch (error) {
          console.warn('Battery API not available:', error)
        }
      }

      monitorBattery()
    }
  }, [])

  // Check background app refresh status
  useEffect(() => {
    // This would typically require native module integration
    // For now, we'll assume it's enabled
    setBackgroundAppRefreshEnabled(true)
  }, [])

  return {
    batteryLevel,
    isCharging,
    backgroundAppRefreshEnabled,
    isLowPowerMode: batteryLevel !== null && batteryLevel < 20,
    shouldThrottleBackgroundTasks: batteryLevel !== null && batteryLevel < 10 && !isCharging,
  }
}