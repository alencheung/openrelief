// Notification Store Types for OpenRelief

export interface Notification {
  id: string
  type: 'emergency' | 'trust_update' | 'geofence' | 'system' | 'reminder' | 'acknowledgment'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  timestamp: Date
  read: boolean
  acknowledged: boolean
  data?: unknown
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
  data?: unknown
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
export interface NotificationState {
  notifications: Notification[]
  queue: NotificationQueue[]
  settings: NotificationSettings
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
  pushSupported: boolean
  pushPermission: NotificationPermission
  pushSubscription: PushSubscription | null
  isRealtimeEnabled: boolean
  lastSyncTime: Date | null
  loading: boolean
  error: string | null
  stats: NotificationStats
}

// Notification Store Actions
export interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'acknowledged'>) => string
  updateNotification: (id: string, updates: Partial<Notification>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAsAcknowledged: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: (filter?: (notification: Notification) => boolean) => void
  addToQueue: (notification: Omit<NotificationQueue, 'id' | 'scheduledFor' | 'retryCount' | 'status'>) => string
  removeFromQueue: (id: string) => void
  updateQueueItem: (id: string, updates: Partial<NotificationQueue>) => void
  processQueue: () => Promise<void>
  retryFailed: () => Promise<void>
  updateSettings: (settings: Partial<NotificationSettings>) => void
  resetSettings: () => void
  setPanelOpen: (open: boolean) => void
  setSelectedNotification: (notification: Notification | null) => void
  setFilter: (filter: Partial<NotificationState['filter']>) => void
  clearFilter: () => void
  requestPushPermission: () => Promise<NotificationPermission>
  subscribeToPush: () => Promise<PushSubscription | null>
  unsubscribeFromPush: () => Promise<void>
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
  getFilteredNotifications: () => Notification[]
  updateStats: () => void
  isInQuietHours: () => boolean
  shouldSendNotification: (notification: Notification) => boolean
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

export type NotificationStore = NotificationState & NotificationActions
