// Notification Store Helpers for OpenRelief
//
// Default settings and pure utility functions extracted from notificationStore.

import type {
  Notification,
  NotificationSettings,
  NotificationStats
} from './notificationStore-types'

// Default settings
export const defaultSettings: NotificationSettings = {
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

// Generate a unique notification id
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Check whether the current time falls within quiet hours
export const isInQuietHours = (quietHours: NotificationSettings['quietHours']): boolean => {
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
    return currentTime >= startTime && currentTime <= endTime
  } else {
    return currentTime >= startTime || currentTime <= endTime
  }
}

// Calculate aggregate stats from a list of notifications
export const calculateStats = (notifications: Notification[]): NotificationStats => {
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

  notifications.forEach(n => {
    stats.byType[n.type] = (stats.byType[n.type] || 0) + 1
  })

  notifications.forEach(n => {
    stats.bySeverity[n.severity] = (stats.bySeverity[n.severity] || 0) + 1
  })

  return stats
}
