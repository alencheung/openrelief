/**
 * Alert delivery strategy and per-channel routing.
 *
 * Owns the mechanics of sending an alert through each delivery channel
 * (push, email, SMS, websocket, in-app), including fan-out (parallel for
 * critical alerts, sequential otherwise) and building DeliveryAttempt records.
 *
 * Dependencies (Supabase client and channel-performance recording) are injected
 * so this module stays free of global singleton state. Extracted from
 * `alert-dispatch-optimizer.ts`.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { FCMBatcher } from '../notifications/fcm-batcher'
import {
  AlertPriority,
  DeliveryAttempt,
  DeliveryChannel,
  DeliveryStatus,
  EmergencyAlert
} from './dispatch-types'
import {
  generateAttemptId,
  generateEmailTemplate,
  getEmailPriority,
  getFCMPriority,
  getSMSPriority,
  getTTL,
  validateExternalUrl
} from './dispatch-helpers'

/**
 * Callback shape for recording per-channel performance metrics.
 */
export type RecordChannelPerformanceFn = (
  channel: DeliveryChannel,
  latency: number,
  success: boolean
) => void

/**
 * Delivery strategy: routes alerts to channels and reports attempts.
 *
 * `getSupabase` is lazy so module load does not require env vars.
 */
export class AlertDeliveryStrategy {
  constructor(
    private readonly getSupabase: () => any,
    private readonly recordPerformance: RecordChannelPerformanceFn
  ) {}

  /**
   * Send an alert to all of its channels.
   *
   * Critical alerts fan out in parallel; non-critical alerts send sequentially.
   */
  async sendToChannels(alert: EmergencyAlert): Promise<DeliveryAttempt[]> {
    const attempts: DeliveryAttempt[] = []

    if (alert.priority === AlertPriority.CRITICAL) {
      const channelPromises = alert.channels.map(channel => this.sendToChannel(alert, channel))

      const results = await Promise.allSettled(channelPromises)

      results.forEach((result, index) => {
        const channel = alert.channels[index]
        if (result.status === 'fulfilled') {
          attempts.push(result.value)
        } else {
          attempts.push(
            this.createFailedAttempt(alert, channel!, String(result.reason))
          )
        }
      })
    } else {
      for (const channel of alert.channels) {
        const attempt = await this.sendToChannel(alert, channel)
        attempts.push(attempt)
      }
    }

    return attempts
  }

  /**
   * Send an alert to a single channel, returning a DeliveryAttempt.
   */
  async sendToChannel(
    alert: EmergencyAlert,
    channel: DeliveryChannel
  ): Promise<DeliveryAttempt> {
    const startTime = performance.now()
    const attemptId = generateAttemptId()

    const attempt: DeliveryAttempt = {
      id: attemptId,
      alertId: alert.id,
      channel,
      status: DeliveryStatus.PROCESSING,
      startTime,
      retryCount: alert.retryCount
    }

    try {
      let success = false
      let error: string | undefined

      switch (channel) {
        case DeliveryChannel.PUSH_NOTIFICATION:
          success = await this.sendPushNotification(alert)
          break

        case DeliveryChannel.EMAIL:
          success = await this.sendEmail(alert)
          break

        case DeliveryChannel.SMS:
          success = await this.sendSMS(alert)
          break

        case DeliveryChannel.WEBSOCKET:
          success = await this.sendWebSocket(alert)
          break

        case DeliveryChannel.IN_APP:
          success = await this.sendInApp(alert)
          break

        default:
          throw new Error(`Unknown delivery channel: ${channel}`)
      }

      const endTime = performance.now()
      const latency = endTime - startTime

      attempt.endTime = endTime
      attempt.latency = latency
      attempt.status = success ? DeliveryStatus.SENT : DeliveryStatus.FAILED

      if (!success) {
        attempt.error = error || 'Delivery failed'
      }

      this.recordPerformance(channel, latency, success)

      return attempt
    } catch (error) {
      const endTime = performance.now()
      const latency = endTime - startTime

      attempt.endTime = endTime
      attempt.latency = latency
      attempt.status = DeliveryStatus.FAILED
      attempt.error = (error as Error).message

      this.recordPerformance(channel, latency, false)

      return attempt
    }
  }

  /**
   * Send a push notification (single recipient, via FCMBatcher).
   */
  async sendPushNotification(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('push_notification_send', {
      alert_id: alert.id
    })

    try {
      const { data: user } = await this.getSupabase()
        .from('user_profiles')
        .select('fcm_token')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.fcm_token) {
        throw new Error('No FCM token for user')
      }

      const notification = {
        title: alert.title,
        body: alert.message,
        priority: getFCMPriority(alert.priority),
        ttl: getTTL(alert.priority)
      }

      const data = {
        alertId: alert.id,
        eventId: alert.eventId,
        type: alert.type,
        priority: alert.priority,
        ...alert.data
      }

      const batcher = new FCMBatcher()
      batcher.addToken(user.fcm_token, notification, data, alert.priority)
      const results = await batcher.flush()

      const result = results[0]
      const success = result ? result.successCount > 0 : false

      performanceMonitor.endTimer(timerId, 'alert', 'push_notification_send')

      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'push_notification_send')
      throw error
    }
  }

  /**
   * Send an email via the external email service.
   */
  async sendEmail(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('email_send', {
      alert_id: alert.id
    })

    try {
      const { data: user } = await this.getSupabase()
        .from('user_profiles')
        .select('email')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.email) {
        throw new Error('No email for user')
      }

      const serviceUrl = process.env.EMAIL_SERVICE_URL
      const validation = validateExternalUrl(serviceUrl)
      if (!validation.valid) {
        throw new Error(`Invalid email service URL: ${validation.error}`)
      }
      const response = await fetch(`${serviceUrl}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EMAIL_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.email,
          subject: alert.title,
          html: generateEmailTemplate(alert),
          priority: getEmailPriority(alert.priority),
          headers: {
            'X-Priority': getEmailPriority(alert.priority),
            'X-Alert-ID': alert.id,
            'X-Alert-Priority': alert.priority
          }
        })
      })

      const success = response.ok

      if (!success) {
        throw new Error(`Email service failed: ${response.statusText}`)
      }

      performanceMonitor.endTimer(timerId, 'alert', 'email_send')
      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'email_send')
      throw error
    }
  }

  /**
   * Send an SMS via the external SMS service.
   */
  async sendSMS(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('sms_send', {
      alert_id: alert.id
    })

    try {
      const { data: user } = await this.getSupabase()
        .from('user_profiles')
        .select('phone')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.phone) {
        throw new Error('No phone number for user')
      }

      const smsServiceUrl = process.env.SMS_SERVICE_URL
      const smsValidation = validateExternalUrl(smsServiceUrl)
      if (!smsValidation.valid) {
        throw new Error(`Invalid SMS service URL: ${smsValidation.error}`)
      }
      const response = await fetch(`${smsServiceUrl}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SMS_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.phone,
          message: `${alert.title}: ${alert.message}`,
          priority: getSMSPriority(alert.priority)
        })
      })

      const success = response.ok

      if (!success) {
        throw new Error(`SMS service failed: ${response.statusText}`)
      }

      performanceMonitor.endTimer(timerId, 'alert', 'sms_send')
      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'sms_send')
      throw error
    }
  }

  /**
   * Send a websocket notification via the connection pool.
   */
  async sendWebSocket(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('websocket_send', {
      alert_id: alert.id
    })

    try {
      const success = await this.sendViaWebSocketPool(alert.userId, {
        type: 'emergency_alert',
        alertId: alert.id,
        eventId: alert.eventId,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        data: alert.data,
        timestamp: new Date().toISOString()
      })

      performanceMonitor.endTimer(timerId, 'alert', 'websocket_send')
      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'websocket_send')
      throw error
    }
  }

  /**
   * Store an in-app notification for later retrieval.
   */
  async sendInApp(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('in_app_send', {
      alert_id: alert.id
    })

    try {
      const { error } = await this.getSupabase().from('user_notifications').insert({
        user_id: alert.userId,
        alert_id: alert.id,
        event_id: alert.eventId,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        data: alert.data,
        read: false,
        created_at: new Date().toISOString()
      })

      const success = !error

      if (!success) {
        throw new Error(`Failed to store in-app notification: ${(error as Error).message}`)
      }

      performanceMonitor.endTimer(timerId, 'alert', 'in_app_send')
      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'in_app_send')
      throw error
    }
  }

  /**
   * Build a failed delivery attempt for a channel.
   */
  createFailedAttempt(
    alert: EmergencyAlert,
    channel: DeliveryChannel,
    error: string
  ): DeliveryAttempt {
    return {
      id: generateAttemptId(),
      alertId: alert.id,
      channel,
      status: DeliveryStatus.FAILED,
      startTime: performance.now(),
      endTime: performance.now(),
      latency: 0,
      error,
      retryCount: alert.retryCount
    }
  }

  /**
   * Send via the WebSocket connection pool.
   * Placeholder implementation.
   */
  private async sendViaWebSocketPool(userId: string, data: Record<string, unknown>): Promise<boolean> {
    // Implementation would use WebSocket connection pool
    // For now, return true as placeholder
    return true
  }
}
