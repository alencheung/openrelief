import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { Database } from '@/types/database'

// Types
export interface Notification {
  id: string
  type: 'emergency' | 'trust_update' | 'geofence' | 'system' | 'reminder' | 'acknowledgment'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  timestamp: Date
  read: boolean
  acknowledged: boolean
  data?: any
  actions?: NotificationAction[]
  expiresAt?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  channels: {
    inApp: boolean
    push: boolean
    email: boolean
    sms: boolean
  }
  metadata?: {
    eventId?: string
    userId?: string
    geofenceId?: string
    source?: string
    category?: string
  }
}

export interface NotificationAction {
  id: string
  label: string
  action: 'view' | 'confirm' | 'dispute' | 'navigate' | 'dismiss' | 'custom'
  url?: string
  data?: any
  style?: 'primary' | 'secondary' | 'danger'
}

export interface NotificationSettings {
  enabled: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
  }
  channels: {
    inApp: boolean
    push: boolean
    email: boolean
    sms: boolean
  }
  categories: {
    emergency: boolean
    trust_update: boolean
    geofence: boolean
    system: boolean
    reminder: boolean
    acknowledgment: boolean
  }
  severity: {
    info: boolean
    warning: boolean
    critical: boolean
    success: boolean
  }
  proximity: {
    enabled: boolean
    threshold: number // meters
    types: string[] // event types to monitor
  }
  batching: {
    enabled: boolean
    interval: number // minutes
    maxBatch: number
  }
}

export interface NotificationQueue {
  id: string
  notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'acknowledged'>
  scheduledFor: Date
  retryCount: number
  maxRetries: number
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  channels: string[]
  lastAttempt?: Date
  error?: string
}

export interface NotificationStats {
  total: number
  unread: number
  unacknowledged: number
  byType: Record<Notification['type'], number>
  bySeverity: Record<Notification['severity'], number>
  byChannel: {
    inApp: number
    push: number
    email: number
    sms: number
  }
  recent: Notification[]
}

// Notification Store State
interface NotificationState {
  // Notifications
  notifications: Notification[]
  queue: NotificationQueue[]

  // Settings
  settings: NotificationSettings

  // UI State
  isPanelOpen: boolean
  selectedNotification: Notification | null
  filter: {
    type?: Notification['type']
    severity?: Notification['severity']
    read?: boolean
    acknowledged?: boolean
    dateRange?: {
      start: Date
      end: Date
    }
  }

  // Push notification state
  pushSupported: boolean
  pushPermission: NotificationPermission
  pushSubscription: PushSubscription | null

  // Real-time
  isRealtimeEnabled: boolean
  lastSyncTime: Date | null

  // Performance
  loading: boolean
  error: string | null
  stats: NotificationStats
}

// Notification Store Actions
interface NotificationActions {
  // Notification management
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'acknowledged'>) => string
  updateNotification: (id: string, updates: Partial<Notification>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAsAcknowledged: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: (filter?: (notification: Notification) => boolean) => void

  // Queue management
  addToQueue: (notification: Omit<NotificationQueue, 'id' | 'scheduledFor' | 'retryCount' | 'status'>) => string
  removeFromQueue: (id: string) => void
  updateQueueItem: (id: string, updates: Partial<NotificationQueue>) => void
  processQueue: () => Promise<void>
  retryFailed: () => Promise<void>

  // Settings management
  updateSettings: (settings: Partial<NotificationSettings>) => void
  resetSettings: () => void

  // UI management
  setPanelOpen: (open: boolean) => void
  setSelectedNotification: (notification: Notification | null) => void
  setFilter: (filter: Partial<NotificationState['filter']>) => void
  clearFilter: () => void

  // Push notification management
  requestPushPermission: () => Promise<NotificationPermission>
  subscribeToPush: () => Promise<PushSubscription | null>
  unsubscribeFromPush: () => Promise<void>

  // Emergency-specific notifications
  createEmergencyNotification: (data: {
    eventId: string
    type: string
    severity: Notification['severity']
    title: string
    message: string
    location?: string
    actions?: NotificationAction[]
  }) => string

  createTrustNotification: (data: {
    userId: string
    scoreChange: number
    newScore: number
    reason?: string
  }) => string

  createGeofenceNotification: (data: {
    geofenceId: string
    action: 'enter' | 'exit'
    geofenceName: string
    severity?: Notification['severity']
  }) => string

  createProximityNotification: (data: {
    targetId: string
    targetType: 'event' | 'user'
    distance: number
    threshold: number
  }) => string

  // Utility functions
  getFilteredNotifications: () => Notification[]
  updateStats: () => void
  isInQuietHours: () => boolean
  shouldSendNotification: (notification: Notification) => boolean

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

type NotificationStore = NotificationState & NotificationActions

// Default settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: 'UTC'
  },
  channels: {
    inApp: true,
    push: true,
    email: false,
    sms: false
  },
  categories: {
    emergency: true,
    trust_update: true,
    geofence: true,
    system: true,
    reminder: true,
    acknowledgment: true
  },
  severity: {
    info: true,
    warning: true,
    critical: true,
    success: true
  },
  proximity: {
    enabled: true,
    threshold: 1000,
    types: []
  },
  batching: {
    enabled: false,
    interval: 15,
    maxBatch: 5
  }
}

// Utility functions
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const isInQuietHours = (quietHours: NotificationSettings['quietHours']): boolean => {
  if (!quietHours.enabled) {
    return false
  }

  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  const [startHour, startMin] = quietHours.start.split(':').map(Number)
  const [endHour, endMin] = quietHours.end.split(':').map(Number)

  if (startHour === undefined || startMin === undefined || endHour === undefined || endMin === undefined) {
    return false
  }

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  if (startTime <= endTime) {
    // Same day range (e.g., 22:00 to 07:00)
    return currentTime >= startTime && currentTime <= endTime
  } else {
    // Overnight range (e.g., 22:00 to 07:00 next day)
    return currentTime >= startTime || currentTime <= endTime
  }
}

const calculateStats = (notifications: Notification[]): NotificationStats => {
  const stats: NotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    unacknowledged: notifications.filter(n => !n.acknowledged).length,
    byType: {} as Record<Notification['type'], number>,
    bySeverity: {} as Record<Notification['severity'], number>,
    byChannel: {
      inApp: notifications.filter(n => n.channels.inApp).length,
      push: notifications.filter(n => n.channels.push).length,
      email: notifications.filter(n => n.channels.email).length,
      sms: notifications.filter(n => n.channels.sms).length
    },
    recent: notifications.slice(0, 10)
  }

  // Calculate by type
  notifications.forEach(n => {
    stats.byType[n.type] = (stats.byType[n.type] || 0) + 1
  })

  // Calculate by severity
  notifications.forEach(n => {
    stats.bySeverity[n.severity] = (stats.bySeverity[n.severity] || 0) + 1
  })

  return stats
}

// Create Store
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
          const { queue, settings } = get()
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

            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey
            })

            set({ pushSubscription: subscription })

            // Send subscription to server
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription)
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
              const notifTime = notification.timestamp.getTime()
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
          return isInQuietHours(get().settings.quietHours)
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
        })
      }
    )
  )
)

// Selectors for common use cases
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

// Utility exports
export { isInQuietHours }