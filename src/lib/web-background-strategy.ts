/**
 * Web Background Strategy for Emergency Notifications
 *
 * This module handles web-based background tasks including:
 * - Web Push notifications for critical emergencies
 * - Service Worker integration for background sync
 * - Browser Geolocation API
 * - Periodic background sync (where supported)
 */

export interface WebBackgroundConfig {
  pushEnabled: boolean
  backgroundSyncEnabled: boolean
  geolocationEnabled: boolean
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

type PushSubscriptionData = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

class WebBackgroundManager {
  private static instance: WebBackgroundManager
  private config: WebBackgroundConfig
  private emergencyQueue: EmergencyPushPayload[] = []
  private isProcessingQueue = false
  private pushSubscription: PushSubscription | null = null
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  private constructor() {
    this.config = {
      pushEnabled: false,
      backgroundSyncEnabled: false,
      geolocationEnabled: false,
      criticalAlertsEnabled: false
    }
  }

  static getInstance(): WebBackgroundManager {
    if (!WebBackgroundManager.instance) {
      WebBackgroundManager.instance = new WebBackgroundManager()
    }
    return WebBackgroundManager.instance
  }

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.warn('Web Background Strategy: Not running in browser environment')
      return false
    }

    try {
      console.log('Initializing Web Background Strategy...')

      await this.configureServiceWorker()
      await this.configurePushNotifications()
      await this.checkGeolocationPermission()
      this.setupEmergencyQueueProcessing()
      this.setupVisibilityHandling()

      console.log('Web Background Strategy initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize Web Background Strategy:', error)
      return false
    }
  }

  private async configureServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported')
      return
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered:', this.serviceWorkerRegistration.scope)
      this.config.backgroundSyncEnabled = 'sync' in this.serviceWorkerRegistration

      if ('periodicSync' in this.serviceWorkerRegistration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName
        })
        if (status.state === 'granted') {
          console.log('Periodic background sync enabled')
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  private async configurePushNotifications(): Promise<void> {
    if (!('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    const permission = await Notification.requestPermission()
    this.config.criticalAlertsEnabled = permission === 'granted'

    if (permission === 'granted' && this.serviceWorkerRegistration) {
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapidPublicKey) {
          this.pushSubscription = await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer
          })
          this.config.pushEnabled = true
          console.log('Push subscription created')
        }
      } catch (error) {
        console.error('Push subscription failed:', error)
      }
    }
  }

  private async checkGeolocationPermission(): Promise<void> {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported')
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      this.config.geolocationEnabled = permission.state === 'granted'

      permission.addEventListener('change', () => {
        this.config.geolocationEnabled = permission.state === 'granted'
      })
    } catch {
      console.warn('Geolocation permission check not supported')
    }
  }

  private setupEmergencyQueueProcessing(): void {
    setInterval(() => {
      if (this.emergencyQueue.length > 0 && !this.isProcessingQueue) {
        this.processEmergencyQueue()
      }
    }, 30000)
  }

  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') {
      return
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, processing queued emergencies')
        this.processEmergencyQueue()
      }
    })
  }

  async getPushSubscription(): Promise<PushSubscriptionData | null> {
    if (!this.pushSubscription) {
      return null
    }

    return {
      endpoint: this.pushSubscription.endpoint,
      keys: {
        p256dh: this.pushSubscription.toJSON().keys?.p256dh || '',
        auth: this.pushSubscription.toJSON().keys?.auth || ''
      }
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.pushSubscription) {
      return true
    }

    try {
      await this.pushSubscription.unsubscribe()
      this.pushSubscription = null
      this.config.pushEnabled = false
      return true
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      return false
    }
  }

  handleEmergencyNotification(payload: EmergencyPushPayload): void {
    console.log('Processing emergency notification:', payload.eventId)

    this.emergencyQueue.push(payload)

    if (payload.severity === 'critical') {
      this.showEmergencyNotification(payload)
      this.processEmergencyQueue()
    }
  }

  private showEmergencyNotification(payload: EmergencyPushPayload): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const options: NotificationOptions = {
      body: payload.message,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/badge-icon.png',
      tag: `emergency-${payload.eventId}`,
      requireInteraction: payload.severity === 'critical',
      data: {
        eventId: payload.eventId,
        type: payload.type,
        severity: payload.severity,
        url: `/emergency/${payload.eventId}`
      }
    }

    const notification = new Notification(payload.title, options)

    notification.onclick = () => {
      window.focus()
      if (notification.data?.url) {
        window.location.href = notification.data.url
      }
      notification.close()
    }
  }

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

  private async processEmergencyInBackground(emergency: EmergencyPushPayload): Promise<void> {
    try {
      if (emergency.location && this.config.geolocationEnabled) {
        await this.verifyEmergencyLocation(emergency)
      }

      await this.storeEmergencyLocally(emergency)
    } catch (error) {
      console.error('Failed to process emergency in background:', error)
    }
  }

  private async verifyEmergencyLocation(emergency: EmergencyPushPayload): Promise<void> {
    if (!emergency.location) {
      return
    }

    const currentLocation = await this.getCurrentLocation()
    if (!currentLocation) {
      return
    }

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      emergency.location.latitude,
      emergency.location.longitude
    )

    console.log(`Emergency ${emergency.eventId} is ${distance}m away`)
  }

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        error => {
          console.error('Failed to get location:', error)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    })
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3
    const phi1 = (lat1 * Math.PI) / 180
    const phi2 = (lat2 * Math.PI) / 180
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

    const a
      = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2)
      + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  private async storeEmergencyLocally(emergency: EmergencyPushPayload): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return
      }

      const storageKey = `emergency_${emergency.eventId}`
      localStorage.setItem(storageKey, JSON.stringify(emergency))

      const indexKey = 'emergency_index'
      const indexRaw = localStorage.getItem(indexKey)
      const index: string[] = indexRaw ? JSON.parse(indexRaw) : []

      if (!index.includes(emergency.eventId)) {
        index.push(emergency.eventId)
        if (index.length > 100) {
          const removed = index.shift()
          if (removed) {
            localStorage.removeItem(`emergency_${removed}`)
          }
        }
        localStorage.setItem(indexKey, JSON.stringify(index))
      }
    } catch (error) {
      console.error('Failed to store emergency locally:', error)
    }
  }

  getConfig(): WebBackgroundConfig {
    return { ...this.config }
  }

  getQueueStatus(): { queued: number; processing: boolean } {
    return {
      queued: this.emergencyQueue.length,
      processing: this.isProcessingQueue
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray as unknown as Uint8Array
  }
}

export const webBackgroundManager = WebBackgroundManager.getInstance()

export { WebBackgroundManager as default }
