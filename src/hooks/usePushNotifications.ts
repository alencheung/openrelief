'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PushNotification {
  id: string
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  tag?: string
  data?: any
  actions?: any[]
  timestamp: number
  read: boolean
}

interface NotificationSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [notifications, setNotifications] = useState<PushNotification[]>([])

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      setIsSupported(supported)

      if (supported) {
        setPermission(Notification.permission)
        loadNotifications()
      }
    }

    checkSupport()

    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.addEventListener('change', () => {
            setPermission(permissionStatus.state as NotificationPermission)
          })
        })
    }

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [])

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
      const notification: PushNotification = {
        id: generateId(),
        ...event.data.notification,
        timestamp: Date.now(),
        read: false
      }

      setNotifications(prev => [notification, ...prev])

      // Store in localStorage for persistence
      storeNotifications([notification, ...notifications])
    }
  }, [notifications])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported')
    }

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush()
      }

      return permission
    } catch (error) {
      console.error('[Push] Failed to request permission:', error)
      throw error
    }
  }, [isSupported])

  const subscribeToPush = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported')
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as any
      })

      setSubscription(pushSubscription)

      // Send subscription to server
      await sendSubscriptionToServer(pushSubscription)

      return pushSubscription
    } catch (error) {
      console.error('[Push] Failed to subscribe:', error)
      throw error
    }
  }, [isSupported])

  const unsubscribeFromPush = useCallback(async () => {
    if (!subscription) return

    try {
      await subscription.unsubscribe()
      setSubscription(null)

      // Remove subscription from server
      await removeSubscriptionFromServer(subscription)
    } catch (error) {
      console.error('[Push] Failed to unsubscribe:', error)
    }
  }, [subscription])

  const sendTestNotification = useCallback(async (title: string, body: string, options?: any) => {
    if (!isSupported || permission !== 'granted') {
      throw new Error('Push notifications are not permitted')
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Send message to service worker to show notification
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: 'test',
          data: options,
          actions: [
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        }
      })
    } catch (error) {
      console.error('[Push] Failed to send test notification:', error)
      throw error
    }
  }, [isSupported, permission])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )

    // Update localStorage
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    )
    storeNotifications(updated)
  }, [notifications])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    localStorage.removeItem('openrelief-notifications')
  }, [])

  const loadNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem('openrelief-notifications')
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
      }
    } catch (error) {
      console.error('[Push] Failed to load notifications:', error)
    }
  }, [])

  const storeNotifications = useCallback((notifications: PushNotification[]) => {
    try {
      localStorage.setItem('openrelief-notifications', JSON.stringify(notifications))
    } catch (error) {
      console.error('[Push] Failed to store notifications:', error)
    }
  }, [])

  // Emergency-specific notification functions
  const sendEmergencyAlert = useCallback(async (emergencyData: {
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    location?: string
    description: string
  }) => {
    if (!isSupported || permission !== 'granted') {
      throw new Error('Push notifications are not permitted')
    }

    try {
      const registration = await navigator.serviceWorker.ready

      const notification = {
        title: `🚨 ${emergencyData.severity.toUpperCase()} Emergency Alert`,
        body: emergencyData.description,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `emergency-${emergencyData.type}`,
        data: {
          type: 'emergency',
          emergency: emergencyData,
          priority: emergencyData.severity === 'critical' ? 'high' : 'normal'
        },
        actions: [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icons/action-view.png'
          },
          {
            action: 'respond',
            title: 'I Can Help',
            icon: '/icons/action-help.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/action-dismiss.png'
          }
        ],
        requireInteraction: emergencyData.severity === 'critical',
        vibrate: emergencyData.severity === 'critical'
          ? [500, 200, 500, 200, 500, 200, 500]
          : [200, 100, 200]
      }

      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        notification
      })
    } catch (error) {
      console.error('[Push] Failed to send emergency alert:', error)
      throw error
    }
  }, [isSupported, permission])

  return {
    isSupported,
    permission,
    subscription,
    notifications,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    sendEmergencyAlert,
    markAsRead,
    clearNotifications,
    unreadCount: notifications.filter(n => !n.read).length
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// API functions for subscription management
async function sendSubscriptionToServer(subscription: PushSubscription) {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh,
          auth: subscription.toJSON().keys?.auth
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send subscription to server')
    }
  } catch (error) {
    console.error('[Push] Failed to send subscription to server:', error)
  }
}

async function removeSubscriptionFromServer(subscription: PushSubscription) {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server')
    }
  } catch (error) {
    console.error('[Push] Failed to remove subscription from server:', error)
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}