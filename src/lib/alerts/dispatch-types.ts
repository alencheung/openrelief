/**
 * Shared types, enums, and interfaces for the alert dispatch optimizer.
 *
 * Extracted from `alert-dispatch-optimizer.ts` to keep the main module focused
 * on orchestration. Re-exported from the optimizer for backward compatibility.
 */

// Alert delivery channels
export enum DeliveryChannel {
  PUSH_NOTIFICATION = 'push_notification',
  EMAIL = 'email',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
  IN_APP = 'in_app'
}

// Alert priority levels
export enum AlertPriority {
  CRITICAL = 'critical', // Life-threatening emergencies
  HIGH = 'high', // Serious emergencies
  MEDIUM = 'medium', // Moderate emergencies
  LOW = 'low' // Informational alerts
}

// Alert delivery status
export enum DeliveryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// FCM batch result types
export interface FCMBatchResult {
  successCount: number
  failureCount: number
  failedTokens: string[]
  invalidTokens: string[]
}

export interface FCMSingleNotification {
  tokenId: string
  userId: string
  title: string
  message: string
  data: Record<string, unknown>
  priority: AlertPriority
}

export interface FCMBatchPayload {
  tokens: string[]
  notification: {
    title: string
    body: string
    priority: string
    ttl: number
  }
  data: Record<string, unknown>
  android: {
    priority: string
    ttl: number
  }
  apns: {
    headers: {
      'apns-priority': string
      'apns-expiration': string
    }
  }
}

// Alert interface
export interface EmergencyAlert {
  id: string
  eventId: string
  userId: string
  type: string
  title: string
  message: string
  priority: AlertPriority
  channels: DeliveryChannel[]
  data: Record<string, any>
  createdAt: Date
  expiresAt?: Date
  retryCount: number
  maxRetries: number
  deliveryAttempts: DeliveryAttempt[]
}

// Delivery attempt interface
export interface DeliveryAttempt {
  id: string
  alertId: string
  channel: DeliveryChannel
  status: DeliveryStatus
  startTime: number
  endTime?: number
  latency?: number
  error?: string
  retryCount: number
}

// Queue configuration
export interface QueueConfig {
  maxSize: number
  batchSize: number
  batchTimeout: number
  priorityLevels: number
  concurrencyPerPriority: number
}

// Performance metrics
export interface DispatchMetrics {
  totalAlerts: number
  successfulDeliveries: number
  failedDeliveries: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  channelPerformance: Record<
    DeliveryChannel,
    {
      total: number
      success: number
      avgLatency: number
    }
  >
}

/**
 * Result of dispatching a single alert.
 */
export interface DispatchResult {
  success: boolean
  alertId: string
  estimatedDeliveryTime: number
  latency: number
}

/**
 * Result of a batch dispatch.
 */
export interface BatchDispatchResult {
  successful: number
  failed: number
  averageLatency: number
  results: Array<{ success: boolean; alertId: string; latency: number }>
}

/**
 * Input shape for dispatching an alert (omits internally-managed fields).
 */
export type AlertInput = Omit<EmergencyAlert, 'id' | 'deliveryAttempts' | 'retryCount'>

/**
 * Geographic bounding filter for spatial user queries.
 */
export interface SpatialFilter {
  lat: number
  lng: number
  radiusMeters: number
}

/**
 * Optional filters applied on top of the spatial query.
 */
export interface UserFilters {
  trustScore?: number
  maxDistance?: number
  notificationPreferences?: Record<string, any>
}

/**
 * A resolved user target for an alert.
 */
export interface AlertUser {
  userId: string
  fcmToken?: string
  email?: string
  phone?: string
  distance: number
  trustScore: number
  preferredChannels: DeliveryChannel[]
}

/**
 * Result of getUsersForAlert.
 */
export interface GetUsersForAlertResult {
  users: AlertUser[]
  count: number
  executionTime: number
}
