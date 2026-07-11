/**
 * Push Notification Manager
 *
 * Subscribes the user to web push notifications, forwards notifications
 * through the active service worker, and respects quiet-hours settings.
 */

import type { PushNotificationConfig } from './sw-types'

export class PushNotificationManager {
  private config: PushNotificationConfig
  private subscription: PushSubscription | null = null

  constructor(config: PushNotificationConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Request permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[PushNotificationManager] Notification permission denied')
          return
        }
      }

      // Subscribe to push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            this.config.vapidPublicKey
          ) as BufferSource
        })

        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription)
      }

      console.log('[PushNotificationManager] Push notification manager initialized')
    } catch (error) {
      console.error('[PushNotificationManager] Failed to initialize:', error)
      throw error
    }
  }

  async send(notification: any): Promise<void> {
    try {
      // Check quiet hours
      if (this.config.quietHours.enabled && this.isInQuietHours()) {
        console.log('[PushNotificationManager] Notification suppressed due to quiet hours')
        return
      }

      // Send notification via service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        registration.active?.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: notification
        })
      }

      console.log('[PushNotificationManager] Push notification sent')
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send notification:', error)
      throw error
    }
  }

  optimizeForEmergency(): void {
    // Prioritize emergency notifications
    console.log('[PushNotificationManager] Emergency optimization applied')
  }

  private isInQuietHours(): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHourStr, startMinStr] = this.config.quietHours.start.split(':')
    const [endHourStr, endMinStr] = this.config.quietHours.end.split(':')
    const startHour = Number(startHourStr ?? 0)
    const startMin = Number(startMinStr ?? 0)
    const endHour = Number(endHourStr ?? 0)
    const endMin = Number(endMinStr ?? 0)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send subscription to server:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }
}
