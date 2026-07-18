import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
export * from './notificationStore-types'
export * from './notificationStore-helpers'
import type {
  Notification,
  NotificationSettings,
  NotificationQueue,
  NotificationStore
} from './notificationStore-types'
import {
  defaultSettings,
  generateId,
  isInQuietHours as isInQuietHoursHelper,
  calculateStats
} from './notificationStore-helpers'

// Decode a VAPID public key (base64url) into a Uint8Array suitable for
// PushManager.subscribe({ applicationServerKey }). Passing the raw string
// throws "The provided applicationServerKey is not valid".
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof atob !== 'undefined' ? atob(base64) : ''
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        notifications: [],
        queue: [],
        settings: defaultSettings,
        isPanelOpen: false,
        selectedNotification: null,
        filter: {},
        pushSupported: false,
        pushPermission: 'default',
        pushSubscription: null,
        isRealtimeEnabled: true,
        lastSyncTime: null,
        loading: false,
        error: null,
        stats: {
          total: 0,
          unread: 0,
          unacknowledged: 0,
          byType: {} as Record<Notification['type'], number>,
          bySeverity: {} as Record<Notification['severity'], number>,
          byChannel: {
            inApp: 0,
            push: 0,
            email: 0,
            sms: 0
          },
          recent: []
        },

        // Notification management
        addNotification: (notification) => {
          const id = generateId()
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            read: false,
            acknowledged: false
          }

          set((state) => ({
            notifications: [newNotification, ...state.notifications]
          }))

          get().updateStats()
          return id
        },

        updateNotification: (id, updates) => {
          set((state) => ({
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, ...updates } : n
            )
          }))
          get().updateStats()
        },

        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id),
            selectedNotification: state.selectedNotification?.id === id ? null : state.selectedNotification
          }))
          get().updateStats()
        },

        markAsRead: (id) => {
          get().updateNotification(id, { read: true })
        },

        markAsAcknowledged: (id) => {
          get().updateNotification(id, { acknowledged: true, read: true })
        },

        markAllAsRead: () => {
          set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true }))
          }))
          get().updateStats()
        },

        clearNotifications: (filter) => {
          set((state) => ({
            notifications: filter
              ? state.notifications.filter(filter)
              : [],
            selectedNotification: null
          }))
          get().updateStats()
        },

        // Queue management
        addToQueue: (queueItem) => {
          const id = generateId()
          const newQueueItem: NotificationQueue = {
            ...queueItem,
            id,
            scheduledFor: new Date(),
            retryCount: 0,
            status: 'pending'
          }

          set((state) => ({
            queue: [...state.queue, newQueueItem]
          }))
          return id
        },

        removeFromQueue: (id) => {
          set((state) => ({
            queue: state.queue.filter(item => item.id !== id)
          }))
        },

        updateQueueItem: (id: string, updates: Partial<NotificationQueue>) => {
          set((state) => ({
            queue: state.queue.map(item =>
              item.id === id ? { ...item, ...updates } : item
            )
          }))
        },

        processQueue: async () => {
          const { queue, settings: _settings } = get()
          const pendingItems = queue.filter(item => item.status === 'pending')

          for (const item of pendingItems) {
            if (!get().shouldSendNotification(item.notification as Notification)) {
              continue
            }

            try {
              // Process notification based on channels
              if (item.channels.includes('inApp')) {
                get().addNotification(item.notification as Notification)
              }

              // Update queue item status
              get().updateQueueItem(item.id, { status: 'sent' })
            } catch (error) {
              console.error('Failed to process notification:', error)
              get().updateQueueItem(item.id, {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                lastAttempt: new Date()
              })
            }
          }
        },

        retryFailed: async () => {
          const { queue } = get()
          const failedItems = queue.filter(item =>
            item.status === 'failed' && item.retryCount < item.maxRetries
          )

          for (const item of failedItems) {
            get().updateQueueItem(item.id, {
              status: 'pending',
              retryCount: item.retryCount + 1
            })
          }

          get().processQueue()
        },


        // Settings management
        updateSettings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings }
          }))
        },

        resetSettings: () => {
          set({ settings: defaultSettings })
        },

        // UI management
        setPanelOpen: (open) => {
          set({ isPanelOpen: open })
        },

        setSelectedNotification: (notification) => {
          set({ selectedNotification: notification })
        },

        setFilter: (filter) => {
          set((state) => ({
            filter: { ...state.filter, ...filter }
          }))
        },

        clearFilter: () => {
          set({ filter: {} })
        },

        // Push notification management
        requestPushPermission: async () => {
          if (!('Notification' in window)) {
            set({ pushSupported: false })
            return 'denied'
          }

          set({ pushSupported: true })

          const permission = await Notification.requestPermission()
          set({ pushPermission: permission })

          if (permission === 'granted') {
            await get().subscribeToPush()
          }

          return permission
        },

        subscribeToPush: async () => {
          if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return null
          }

          try {
            const registration = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
              throw new Error('VAPID public key is not configured')
            }

            // PushManager.subscribe requires applicationServerKey as a
            // BufferSource (base64-decoded). Passing the raw VAPID string throws
            // "The provided applicationServerKey is not valid". Decode it first.
            const applicationServerKey = urlBase64ToUint8Array(vapidKey) as BufferSource

            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey
            })

            set({ pushSubscription: subscription })

            // Send subscription to server. /api/push/subscribe reads
            // body.subscription (an object with endpoint + keys), so wrap it.
            const subJson = subscription.toJSON()
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: {
                  endpoint: subscription.endpoint,
                  expirationTime: subJson.expirationTime ?? null,
                  keys: {
                    p256dh: subJson.keys?.p256dh,
                    auth: subJson.keys?.auth
                  }
                }
              })
            })

            return subscription
          } catch (error) {
            console.error('Failed to subscribe to push notifications:', error)
            return null
          }
        },

        unsubscribeFromPush: async () => {
          const { pushSubscription } = get()
          if (!pushSubscription) {
            return
          }

          try {
            await pushSubscription.unsubscribe()
            set({ pushSubscription: null })

            // Remove subscription from server
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: pushSubscription.endpoint })
            })
          } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error)
          }
        },

        // Emergency-specific notifications
        createEmergencyNotification: (data) => {
          return get().addNotification({
            type: 'emergency',
            title: data.title,
            message: data.message,
            severity: data.severity,
            priority: data.severity === 'critical' ? 'urgent' : 'high',
            channels: {
              inApp: true,
              push: true,
              email: false,
              sms: data.severity === 'critical'
            },
            actions: data.actions || [
              {
                id: 'view',
                label: 'View Details',
                action: 'view',
                url: `/emergency/${data.eventId}`,
                style: 'primary'
              },
              {
                id: 'confirm',
                label: 'Confirm',
                action: 'confirm',
                data: { eventId: data.eventId },
                style: 'secondary'
              }
            ],
            metadata: {
              eventId: data.eventId,
              category: 'emergency'
            }
          })
        },

        createTrustNotification: (data) => {
          const isPositive = data.scoreChange > 0
          return get().addNotification({
            type: 'trust_update',
            title: isPositive ? 'Trust Score Increased' : 'Trust Score Decreased',
            message: `Your trust score has ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(data.scoreChange).toFixed(2)} to ${data.newScore.toFixed(2)}${data.reason ? `. ${data.reason}` : ''}`,
            severity: isPositive ? 'success' : 'warning',
            priority: 'medium',
            channels: {
              inApp: true,
              push: false,
              email: false,
              sms: false
            },
            metadata: {
              userId: data.userId,
              category: 'trust'
            }
          })
        },

        createGeofenceNotification: (data) => {
          return get().addNotification({
            type: 'geofence',
            title: `Geofence ${data.action === 'enter' ? 'Entry' : 'Exit'}`,
            message: `You have ${data.action}ed the ${data.geofenceName} area`,
            severity: data.severity || 'info',
            priority: 'medium',
            channels: {
              inApp: true,
              push: true,
              email: false,
              sms: false
            },
            metadata: {
              geofenceId: data.geofenceId,
              category: 'geofence'
            }
          })
        },

        createProximityNotification: (data) => {
          return get().addNotification({
            type: 'geofence',
            title: 'Proximity Alert',
            message: `You are within ${Math.round(data.distance)}m of a ${data.targetType === 'event' ? 'emergency event' : 'tracked user'}`,
            severity: 'warning',
            priority: 'high',
            channels: {
              inApp: true,
              push: true,
              email: false,
              sms: false
            },
            metadata: {
              category: 'proximity'
            }
          })
        },

        // Utility functions
        getFilteredNotifications: () => {
          const { notifications, filter } = get()

          return notifications.filter(notification => {
            if (filter.type && notification.type !== filter.type) {
              return false
            }
            if (filter.severity && notification.severity !== filter.severity) {
              return false
            }
            if (filter.read !== undefined && notification.read !== filter.read) {
              return false
            }
            if (filter.acknowledged !== undefined && notification.acknowledged !== filter.acknowledged) {
              return false
            }
            if (filter.dateRange) {
              // Defensive: timestamp may be a string if rehydration hasn't run
              // (e.g. legacy persisted state). Coerce before calling getTime().
              const ts =
                notification.timestamp instanceof Date
                  ? notification.timestamp
                  : new Date(notification.timestamp as unknown as string)
              const notifTime = ts.getTime()
              if (Number.isNaN(notifTime)) {
                return false
              }
              if (notifTime < filter.dateRange.start.getTime() || notifTime > filter.dateRange.end.getTime()) {
                return false
              }
            }
            return true
          })
        },

        updateStats: () => {
          const { notifications } = get()
          set({ stats: calculateStats(notifications) })
        },

        isInQuietHours: () => {
          return isInQuietHoursHelper(get().settings.quietHours)
        },

        shouldSendNotification: (notification) => {
          const { settings } = get()

          if (!settings.enabled) {
            return false
          }
          if (get().isInQuietHours() && notification.priority !== 'urgent') {
            return false
          }
          if (!settings.categories[notification.type]) {
            return false
          }
          if (!settings.severity[notification.severity]) {
            return false
          }

          return true
        },

        // Error handling
        setError: (error) => {
          set({ error })
        },

        clearError: () => {
          set({ error: null })
        },

        reset: () => {
          set({
            notifications: [],
            queue: [],
            selectedNotification: null,
            filter: {},
            lastSyncTime: null,
            error: null
          })
        }
      }),
      {
        name: 'notification-storage',
        partialize: (state) => ({
          settings: state.settings,
          notifications: state.notifications.slice(0, 100) // Limit stored notifications
        }),
        // persisted notifications rehydrate with timestamp as an ISO string
        // (JSON has no Date type). Convert back to Date so callers that do
        // timestamp.getTime() (e.g. getFilteredNotifications date-range filter)
        // don't crash with TypeError after a reload.
        onRehydrateStorage: () => (state) => {
          if (!state?.notifications) return
          state.notifications = state.notifications.map(n => ({
            ...n,
            timestamp:
              n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp as unknown as string)
          }))
        }
      }
    )
  )
)
export const useNotifications = () => useNotificationStore(state => ({
  notifications: state.notifications,
  filteredNotifications: state.getFilteredNotifications(),
  stats: state.stats,
  loading: state.loading
}))

export const useNotificationSettings = () => useNotificationStore(state => state.settings)
export const useNotificationUI = () => useNotificationStore(state => ({
  isPanelOpen: state.isPanelOpen,
  selectedNotification: state.selectedNotification,
  filter: state.filter
}))
export const useNotificationActions = () => useNotificationStore(state => ({
  addNotification: state.addNotification,
  markAsRead: state.markAsRead,
  markAsAcknowledged: state.markAsAcknowledged,
  markAllAsRead: state.markAllAsRead,
  clearNotifications: state.clearNotifications,
  setPanelOpen: state.setPanelOpen,
  setSelectedNotification: state.setSelectedNotification,
  updateSettings: state.updateSettings,
  requestPushPermission: state.requestPushPermission,
  createEmergencyNotification: state.createEmergencyNotification,
  createTrustNotification: state.createTrustNotification,
  createGeofenceNotification: state.createGeofenceNotification
}))
export const useUnreadCount = () => useNotificationStore(state => state.stats.unread)