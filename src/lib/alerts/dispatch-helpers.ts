/**
 * Standalone helper functions for the alert dispatch optimizer.
 *
 * These are pure utilities (no instance state): URL validation, array chunking,
 * retry/backoff math, per-channel priority/TTL mapping, ID generation, channel
 * preference resolution, and the email template renderer. Extracted from
 * `alert-dispatch-optimizer.ts` to keep the main class focused on orchestration.
 */

import {
  AlertPriority,
  DeliveryChannel,
  type AlertUser,
  type DispatchMetrics,
  type QueueConfig
} from './dispatch-types'

// Allowed external service domains for outbound alert delivery
export const ALLOWED_EXTERNAL_DOMAINS = [
  'api.sendgrid.net',
  'api.twilio.com',
  'api.pushover.net',
  'fcm.googleapis.com',
  'api.telegram.org'
]

/**
 * PostGIS spatial query used to find users within range of an alert.
 * Ordered by distance, filtered by trust score and radius.
 */
export const GET_USERS_FOR_ALERT_SQL = `
          SELECT 
            up.user_id,
            up.fcm_token,
            up.email,
            up.phone,
            up.trust_score,
            up.notification_preferences,
            ST_Distance(
              up.last_known_location::geography,
              ST_MakePoint($1, $2)::geography
            ) as distance
          FROM user_profiles up
          WHERE ST_DWithin(
            up.last_known_location::geography,
            ST_MakePoint($1, $2)::geography,
            $3
          )
          AND up.trust_score >= COALESCE($4, 0.3)
          ORDER BY distance
          LIMIT $5
        `

/**
 * Map a raw user_profiles row into an AlertUser, resolving preferred channels.
 */
export function mapUserRowToAlertUser(user: {
  user_id: string
  fcm_token?: string | null
  email?: string | null
  phone?: string | null
  distance?: number
  trust_score?: number
  notification_preferences?: Record<string, unknown> | null
}): AlertUser {
  return {
    userId: user.user_id,
    fcmToken: user.fcm_token,
    email: user.email,
    phone: user.phone,
    distance: user.distance,
    trustScore: user.trust_score,
    preferredChannels: getPreferredChannels(user.notification_preferences || {})
  }
}

/**
 * Validate that an external service URL points at an allow-listed domain.
 */
export function validateExternalUrl(url: string | undefined): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is not configured' }
  }
  try {
    const parsed = new URL(url)
    if (!ALLOWED_EXTERNAL_DOMAINS.includes(parsed.hostname)) {
      return {
        valid: false,
        error: `Domain ${parsed.hostname} not in allowed list`
      }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Chunk an array into batches of the specified size.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Sleep utility for exponential backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Max retries per alert priority.
 */
export function getMaxRetries(priority: AlertPriority): number {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return 5
    case AlertPriority.HIGH:
      return 3
    case AlertPriority.MEDIUM:
      return 2
    case AlertPriority.LOW:
      return 1
    default:
      return 2
  }
}

/**
 * Exponential backoff retry delay with jitter (used by the alert queue).
 */
export function getRetryDelay(retryCount: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
  return delay + Math.random() * 1000 // Add jitter
}

/**
 * Estimated delivery time (ms) per alert priority.
 */
export function estimateDeliveryTime(priority: AlertPriority): number {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return 100 // <100ms target
    case AlertPriority.HIGH:
      return 500
    case AlertPriority.MEDIUM:
      return 2000
    case AlertPriority.LOW:
      return 5000
    default:
      return 2000
  }
}

/**
 * FCM message priority string per alert priority.
 */
export function getFCMPriority(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return 'high'
    case AlertPriority.HIGH:
      return 'high'
    case AlertPriority.MEDIUM:
      return 'normal'
    case AlertPriority.LOW:
      return 'normal'
    default:
      return 'normal'
  }
}

/**
 * APNS priority header per alert priority.
 */
export function getAPNSPriority(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return '10'
    case AlertPriority.HIGH:
      return '10'
    case AlertPriority.MEDIUM:
      return '5'
    case AlertPriority.LOW:
      return '5'
    default:
      return '5'
  }
}

/**
 * Email priority string per alert priority.
 */
export function getEmailPriority(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return '1'
    case AlertPriority.HIGH:
      return '2'
    case AlertPriority.MEDIUM:
      return '3'
    case AlertPriority.LOW:
      return '5'
    default:
      return '3'
  }
}

/**
 * SMS priority string per alert priority.
 */
export function getSMSPriority(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return 'urgent'
    case AlertPriority.HIGH:
      return 'high'
    case AlertPriority.MEDIUM:
      return 'normal'
    case AlertPriority.LOW:
      return 'low'
    default:
      return 'normal'
  }
}

/**
 * FCM/APNS time-to-live in seconds per alert priority.
 */
export function getTTL(priority: AlertPriority): number {
  switch (priority) {
    case AlertPriority.CRITICAL:
      return 3600 // 1 hour
    case AlertPriority.HIGH:
      return 7200 // 2 hours
    case AlertPriority.MEDIUM:
      return 86400 // 24 hours
    case AlertPriority.LOW:
      return 604800 // 7 days
    default:
      return 86400
  }
}

/**
 * APNS expiration header (ISO string) derived from the priority TTL.
 */
export function getAPNSExpiration(priority: AlertPriority): string {
  const ttl = getTTL(priority)
  const expirationDate = new Date(Date.now() + ttl * 1000)
  return expirationDate.toISOString()
}

/**
 * Resolve a user's preferred delivery channels from their notification prefs.
 */
export function getPreferredChannels(preferences: Record<string, unknown>): DeliveryChannel[] {
  if (!preferences) {
    return [DeliveryChannel.IN_APP, DeliveryChannel.PUSH_NOTIFICATION]
  }

  const channels: DeliveryChannel[] = []

  if (preferences.push_notifications) {
    channels.push(DeliveryChannel.PUSH_NOTIFICATION)
  }
  if (preferences.email_notifications) {
    channels.push(DeliveryChannel.EMAIL)
  }
  if (preferences.sms_notifications) {
    channels.push(DeliveryChannel.SMS)
  }
  if (preferences.websocket_notifications) {
    channels.push(DeliveryChannel.WEBSOCKET)
  }

  if (channels.length === 0) {
    channels.push(DeliveryChannel.IN_APP)
  }

  return channels
}

/**
 * Render the email template for an emergency alert.
 */
export function generateEmailTemplate(alert: {
  title: string
  message: string
  priority: AlertPriority
}): string {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Emergency Alert</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #dc2626; margin-top: 0;">${alert.title}</h2>
          <p style="font-size: 16px; line-height: 1.5;">${alert.message}</p>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>Priority:</strong> ${alert.priority.toUpperCase()}
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated emergency alert from OpenRelief.</p>
        </div>
      </div>
    `
}

/**
 * Generate a unique alert ID.
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique delivery attempt ID.
 */
export function generateAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate exponential backoff delay (with jitter) for FCM retries.
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs = FCM_BASE_DELAY_MS,
  maxDelayMs = FCM_MAX_DELAY_MS
): number {
  const delay = Math.min(baseDelayMs * Math.pow(2, retryCount), maxDelayMs)
  return delay + Math.random() * 500
}

// FCM batch configuration constants
export const FCM_BATCH_SIZE = 1000
export const FCM_MAX_RETRIES = 3
export const FCM_BASE_DELAY_MS = 1000
export const FCM_MAX_DELAY_MS = 30000

/**
 * Default queue configuration for the dispatch optimizer.
 */
export function createDefaultQueueConfig(): QueueConfig {
  return {
    maxSize: 10000,
    batchSize: 50,
    batchTimeout: 100, // ms
    priorityLevels: 4,
    concurrencyPerPriority: 10
  }
}

/**
 * Emergency-mode queue configuration (higher throughput, tighter timeout).
 */
export function createEmergencyQueueConfig(): QueueConfig {
  return {
    maxSize: 10000,
    batchSize: 100,
    batchTimeout: 50,
    priorityLevels: 4,
    concurrencyPerPriority: 20
  }
}

/**
 * Initialise an empty DispatchMetrics object.
 */
export function createInitialMetrics(): DispatchMetrics {
  return {
    totalAlerts: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    channelPerformance: {} as DispatchMetrics['channelPerformance']
  }
}

/**
 * Roll up an incremental average latency.
 */
export function rollAverage(prevAverage: number, newSample: number, newCount: number): number {
  const total = prevAverage * (newCount - 1) + newSample
  return total / newCount
}

/**
 * Compute p95/p99 latencies from an array of per-attempt latencies.
 * Returns {p95, p99} or {p95: 0, p99: 0} for empty input.
 */
export function computeLatencyPercentiles(latencies: number[]): { p95: number; p99: number } {
  if (latencies.length === 0) {
    return { p95: 0, p99: 0 }
  }
  const sorted = [...latencies].sort((a, b) => a - b)
  const p95Index = Math.floor(sorted.length * 0.95)
  const p99Index = Math.floor(sorted.length * 0.99)
  return {
    p95: sorted[p95Index] || 0,
    p99: sorted[p99Index] || 0
  }
}
