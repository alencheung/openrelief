/**
 * iOS Background Strategy for Emergency Notifications
 * 
 * This module handles iOS-specific background tasks including:
 * - Silent push notifications for critical emergencies
 * - Background location verification
 * - iOS-specific permission handling
 * - Battery optimization compliance
 */

import { Platform, AppState } from 'react-native'
import PushNotification from 'react-native-push-notification'
import BackgroundJob from 'react-native-background-job'
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'

// Types
export interface iOSBackgroundConfig {
  silentPushEnabled: boolean
  backgroundLocationEnabled: boolean
  batteryOptimizationHandled: boolean
  criticalAlertsEnabled: boolean
}

export interface EmergencyPushPayload {
  eventId: string
  type: 'emergency' | 'critical' | 'update'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  location?: {
    latitude: number
    longitude: number
    radius: number
  }
  requiresAction: boolean
  timestamp: number
  trustWeight: number
}

export interface BackgroundTaskResult {
  success: boolean
  error?: string
  data?: any
  executionTime: number
}

class iOSBackgroundManager {
  private static instance: iOSBackgroundManager
  private config: iOSBackgroundConfig
  private backgroundTasks: Map<string, any> = new Map()
  private emergencyQueue: EmergencyPushPayload[] = []
  private isProcessingQueue = false

  private constructor() {
    this.config = {
      silentPushEnabled: false,
      backgroundLocationEnabled: false,
      batteryOptimizationHandled: false,
      criticalAlertsEnabled: false,
    }
  }

  static getInstance(): iOSBackgroundManager {
    if (!iOSBackgroundManager.instance) {
      iOSBackgroundManager.instance = new iOSBackgroundManager()
    }
    return iOSBackgroundManager.instance
  }

  /**
   * Initialize iOS background strategy
   */
  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') {
        console.warn('iOS Background Strategy: Not running on iOS')
        return false
      }

      console.log('Initializing iOS Background Strategy...')

      // Configure push notifications
      await this.configurePushNotifications()

      // Request necessary permissions
      await this.requestPermissions()

      // Configure background tasks
      await this.configureBackgroundTasks()

      // Setup emergency queue processing
      this.setupEmergencyQueueProcessing()

      // Handle app state changes
      this.setupAppStateHandling()

      this.config.silentPushEnabled = true
      console.log('iOS Background Strategy initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize iOS Background Strategy:', error)
      return false
    }
  }

  /**
   * Configure push notifications for iOS
   */
  private async configurePushNotifications(): Promise<void> {
    PushNotification.configure({
      // iOS specific settings
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
      
      // Critical alerts for emergencies
      criticalAlert: true,
      
      // Silent notifications
      silent: true,
      
      // Notification handler
      onNotification: (notification) => {
        this.handleNotification(notification)
      },
      
      // Permission handler
      onRegister: (token) => {
        console.log('Push notification token registered:', token)
        this.handleTokenRegistration(token)
      },
      
      // Action handlers
      onAction: (notification) => {
        console.log('Notification action received:', notification)
        this.handleNotificationAction(notification)
      },
      
      // iOS specific permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: true,
      },
    })

    // Configure iOS specific settings
    PushNotification.requestPermissions().then((permissions) => {
      console.log('Push notification permissions:', permissions)
      this.config.criticalAlertsEnabled = permissions.alert || false
    })
  }

  /**
   * Request iOS-specific permissions
   */
  private async requestPermissions(): Promise<void> {
    try {
      // Location permission for background location verification
      const locationPermission = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)
      if (locationPermission === RESULTS.GRANTED) {
        // Request always permission for background access
        const alwaysPermission = await request(PERMISSIONS.IOS.LOCATION_ALWAYS)
        this.config.backgroundLocationEnabled = alwaysPermission === RESULTS.GRANTED
      }

      // Motion permission for activity detection
      const motionPermission = await request(PERMISSIONS.IOS.MOTION)
      console.log('Motion permission:', motionPermission)

      // Background app refresh
      await this.requestBackgroundAppRefresh()

    } catch (error) {
      console.error('Failed to request iOS permissions:', error)
    }
  }

  /**
   * Request background app refresh permission
   */
  private async requestBackgroundAppRefresh(): Promise<void> {
    // This would typically require native module integration
    // For now, we'll log the requirement
    console.log('Background app refresh permission required for optimal performance')
  }

  /**
   * Configure background tasks
   */
  private async configureBackgroundTasks(): Promise<void> {
    // Emergency location verification task
    BackgroundJob.register({
      jobKey: 'emergencyLocationCheck',
      period: 300000, // 5 minutes
      exact: true,
      allowExecutionInForeground: false,
      requiredNetworkType: BackgroundJob.NETWORK_TYPE_ANY,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresBatteryNotLow: true,
    }, async () => {
      await this.performLocationVerification()
    })

    // Emergency queue processing task
    BackgroundJob.register({
      jobKey: 'emergencyQueueProcessor',
      period: 60000, // 1 minute
      exact: true,
      allowExecutionInForeground: false,
      requiredNetworkType: BackgroundJob.NETWORK_TYPE_ANY,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresBatteryNotLow: false,
    }, async () => {
      await this.processEmergencyQueue()
    })

    // Start background jobs
    BackgroundJob.start({
      jobKey: 'emergencyLocationCheck',
    })

    BackgroundJob.start({
      jobKey: 'emergencyQueueProcessor',
    })
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: any): void {
    const { data, foreground, userInteraction } = notification

    if (data?.emergencyId) {
      const emergencyPayload: EmergencyPushPayload = {
        eventId: data.emergencyId,
        type: data.type || 'emergency',
        severity: data.severity || 'high',
        title: data.title || 'Emergency Alert',
        message: data.message || 'Emergency reported nearby',
        location: data.location ? JSON.parse(data.location) : undefined,
        requiresAction: data.requiresAction === 'true',
        timestamp: parseInt(data.timestamp) || Date.now(),
        trustWeight: parseFloat(data.trustWeight) || 1.0,
      }

      if (foreground && !userInteraction) {
        // Silent notification in foreground
        this.handleSilentEmergency(emergencyPayload)
      } else if (userInteraction) {
        // User tapped notification
        this.handleEmergencyInteraction(emergencyPayload)
      } else {
        // App in background, show notification
        this.showEmergencyNotification(emergencyPayload)
      }
    }
  }

  /**
   * Handle silent emergency notifications
   */
  private handleSilentEmergency(payload: EmergencyPushPayload): void {
    console.log('Processing silent emergency notification:', payload.eventId)

    // Add to queue for processing
    this.emergencyQueue.push(payload)

    // Trigger immediate processing if critical
    if (payload.severity === 'critical') {
      this.processEmergencyQueue()
    }
  }

  /**
   * Handle user interaction with emergency notification
   */
  private handleEmergencyInteraction(payload: EmergencyPushPayload): void {
    console.log('User interacted with emergency notification:', payload.eventId)
    
    // Navigate to emergency details
    // This would integrate with your navigation system
    this.navigateToEmergency(payload.eventId)
  }

  /**
   * Show emergency notification
   */
  private showEmergencyNotification(payload: EmergencyPushPayload): void {
    const notificationConfig = {
      messageId: payload.eventId,
      title: payload.title,
      message: payload.message,
      playSound: true,
      soundName: payload.severity === 'critical' ? 'critical_alert.wav' : 'default',
      category: payload.requiresAction ? 'EMERGENCY_ACTION' : 'EMERGENCY_VIEW',
      userInfo: {
        emergencyId: payload.eventId,
        type: payload.type,
        severity: payload.severity,
        location: payload.location,
        requiresAction: payload.requiresAction,
        timestamp: payload.timestamp,
      },
    }

    // Use critical alert for critical emergencies
    if (payload.severity === 'critical') {
      notificationConfig.criticalAlert = true
      notificationConfig.volume = 1.0
      notificationConfig.vibrationPattern = [0, 500, 200, 500]
    }

    PushNotification.localNotification(notificationConfig)
  }

  /**
   * Setup emergency queue processing
   */
  private setupEmergencyQueueProcessing(): void {
    setInterval(() => {
      if (this.emergencyQueue.length > 0 && !this.isProcessingQueue) {
        this.processEmergencyQueue()
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Process emergency queue
   */
  private async processEmergencyQueue(): Promise<BackgroundTaskResult> {
    if (this.isProcessingQueue || this.emergencyQueue.length === 0) {
      return { success: true, executionTime: 0 }
    }

    const startTime = Date.now()
    this.isProcessingQueue = true

    try {
      const emergencies = [...this.emergencyQueue]
      this.emergencyQueue = []

      for (const emergency of emergencies) {
        await this.processEmergencyInBackground(emergency)
      }

      const executionTime = Date.now() - startTime
      console.log(`Processed ${emergencies.length} emergencies in ${executionTime}ms`)

      return { success: true, executionTime }
    } catch (error) {
      console.error('Failed to process emergency queue:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime 
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Process individual emergency in background
   */
  private async processEmergencyInBackground(emergency: EmergencyPushPayload): Promise<void> {
    try {
      // Verify location if provided
      if (emergency.location) {
        await this.verifyEmergencyLocation(emergency)
      }

      // Store emergency locally for offline access
      await this.storeEmergencyLocally(emergency)

      // Trigger local alert if critical
      if (emergency.severity === 'critical') {
        this.triggerCriticalAlert(emergency)
      }

    } catch (error) {
      console.error('Failed to process emergency in background:', error)
    }
  }

  /**
   * Perform background location verification
   */
  private async performLocationVerification(): Promise<BackgroundTaskResult> {
    const startTime = Date.now()

    try {
      // Get current location
      const location = await this.getCurrentLocation()
      
      if (location && this.config.backgroundLocationEnabled) {
        // Check proximity to active emergencies
        await this.checkEmergencyProximity(location)
      }

      return { success: true, executionTime: Date.now() - startTime }
    } catch (error) {
      console.error('Background location verification failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Location error',
        executionTime: Date.now() - startTime 
      }
    }
  }

  /**
   * Verify emergency location
   */
  private async verifyEmergencyLocation(emergency: EmergencyPushPayload): Promise<void> {
    if (!emergency.location) return

    const currentLocation = await this.getCurrentLocation()
    if (!currentLocation) return

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      emergency.location.latitude,
      emergency.location.longitude
    )

    // Log proximity for analytics
    console.log(`Emergency ${emergency.eventId} is ${distance}m away`)
  }

  /**
   * Get current location
   */
  private async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Failed to get location:', error)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      )
    })
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  /**
   * Check emergency proximity
   */
  private async checkEmergencyProximity(location: { latitude: number; longitude: number }): Promise<void> {
    // This would integrate with your emergency store
    // For now, we'll log the location check
    console.log('Checking emergency proximity from location:', location)
  }

  /**
   * Store emergency locally
   */
  private async storeEmergencyLocally(emergency: EmergencyPushPayload): Promise<void> {
    // Store in local storage for offline access
    try {
      const storageKey = `emergency_${emergency.eventId}`
      localStorage.setItem(storageKey, JSON.stringify(emergency))
    } catch (error) {
      console.error('Failed to store emergency locally:', error)
    }
  }

  /**
   * Trigger critical alert
   */
  private triggerCriticalAlert(emergency: EmergencyPushPayload): void {
    // Use maximum intensity alert for critical emergencies
    PushNotification.localNotification({
      messageId: `critical_${emergency.eventId}`,
      title: '🚨 CRITICAL EMERGENCY',
      message: emergency.message,
      playSound: true,
      soundName: 'critical_alert.wav',
      criticalAlert: true,
      volume: 1.0,
      vibrationPattern: [0, 1000, 500, 1000],
      actions: ['VIEW', 'CONFIRM'],
      userInfo: {
        emergencyId: emergency.eventId,
        critical: true,
      },
    })
  }

  /**
   * Navigate to emergency details
   */
  private navigateToEmergency(emergencyId: string): void {
    // This would integrate with your navigation system
    console.log('Navigating to emergency:', emergencyId)
  }

  /**
   * Handle token registration
   */
  private handleTokenRegistration(token: string): void {
    // Send token to server for push notifications
    console.log('Registering push token with server:', token)
  }

  /**
   * Handle notification action
   */
  private handleNotificationAction(notification: any): void {
    const { action, userInfo } = notification
    
    if (userInfo?.emergencyId) {
      switch (action) {
        case 'VIEW':
          this.navigateToEmergency(userInfo.emergencyId)
          break
        case 'CONFIRM':
          this.confirmEmergency(userInfo.emergencyId)
          break
        default:
          console.log('Unknown notification action:', action)
      }
    }
  }

  /**
   * Confirm emergency
   */
  private confirmEmergency(emergencyId: string): void {
    // This would integrate with your emergency system
    console.log('Confirming emergency:', emergencyId)
  }

  /**
   * Setup app state handling
   */
  private setupAppStateHandling(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        console.log('App moved to background, ensuring background tasks are running')
        this.ensureBackgroundTasks()
      } else if (nextAppState === 'active') {
        console.log('App became active, processing queued emergencies')
        this.processEmergencyQueue()
      }
    })
  }

  /**
   * Ensure background tasks are running
   */
  private ensureBackgroundTasks(): void {
    // Restart background jobs if needed
    BackgroundJob.start({ jobKey: 'emergencyLocationCheck' })
    BackgroundJob.start({ jobKey: 'emergencyQueueProcessor' })
  }

  /**
   * Get current configuration
   */
  getConfig(): iOSBackgroundConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<iOSBackgroundConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Get emergency queue status
   */
  getQueueStatus(): { queued: number; processing: boolean } {
    return {
      queued: this.emergencyQueue.length,
      processing: this.isProcessingQueue,
    }
  }
}

// Export singleton instance
export const iOSBackgroundManager = iOSBackgroundManager.getInstance()

// Export types and utilities
export { iOSBackgroundManager as default }
export type { EmergencyPushPayload, iOSBackgroundConfig, BackgroundTaskResult }