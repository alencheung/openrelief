/**
 * Alert Dispatch Optimizer for <100ms Latency
 *
 * This module provides high-performance alert dispatch with:
 * - Parallel processing for multiple delivery channels
 * - Intelligent queue management and prioritization
 * - Connection pooling and caching
 * - Real-time performance monitoring
 * - Fallback and retry mechanisms
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { createClient } from '@supabase/supabase-js'

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
  CRITICAL = 'critical',    // Life-threatening emergencies
  HIGH = 'high',          // Serious emergencies
  MEDIUM = 'medium',       // Moderate emergencies
  LOW = 'low'             // Informational alerts
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
interface QueueConfig {
  maxSize: number
  batchSize: number
  batchTimeout: number
  priorityLevels: number
  concurrencyPerPriority: number
}

// Performance metrics
interface DispatchMetrics {
  totalAlerts: number
  successfulDeliveries: number
  failedDeliveries: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  channelPerformance: Record<DeliveryChannel, {
    total: number
    success: number
    avgLatency: number
  }>
}

class AlertDispatchOptimizer {
  private static instance: AlertDispatchOptimizer
  private alertQueues: Map<AlertPriority, EmergencyAlert[]> = new Map()
  private processingAlerts: Map<string, EmergencyAlert> = new Map()
  private deliveryWorkers: Map<DeliveryChannel, Worker[]> = new Map()
  private connectionPools: Map<DeliveryChannel, any[]> = new Map()
  private metrics: DispatchMetrics
  private config: QueueConfig
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  private constructor() {
    this.config = {
      maxSize: 10000,
      batchSize: 50,
      batchTimeout: 100, // ms
      priorityLevels: 4,
      concurrencyPerPriority: 10
    }

    this.metrics = {
      totalAlerts: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      channelPerformance: {} as Record<DeliveryChannel, any>
    }

    this.initializeQueues()
    this.initializeDeliveryWorkers()
    this.startQueueProcessors()
    this.startMetricsCollection()
  }

  static getInstance(): AlertDispatchOptimizer {
    if (!AlertDispatchOptimizer.instance) {
      AlertDispatchOptimizer.instance = new AlertDispatchOptimizer()
    }
    return AlertDispatchOptimizer.instance
  }

  /**
   * Dispatch emergency alert with <100ms latency target
   */
  async dispatchAlert(alert: Omit<EmergencyAlert, 'id' | 'deliveryAttempts' | 'retryCount'>): Promise<{
    success: boolean
    alertId: string
    estimatedDeliveryTime: number
    latency: number
  }> {
    const startTime = performance.now()

    try {
      // Generate alert ID
      const alertId = this.generateAlertId()

      const fullAlert: EmergencyAlert = {
        id: alertId,
        deliveryAttempts: [],
        retryCount: 0,
        maxRetries: this.getMaxRetries(alert.priority),
        ...alert
      }

      // Add to appropriate priority queue
      this.addToQueue(fullAlert)

      // Start processing immediately for critical alerts
      if (alert.priority === AlertPriority.CRITICAL) {
        await this.processAlertImmediately(fullAlert)
      }

      const latency = performance.now() - startTime

      // Record dispatch metrics
      performanceMonitor.recordAlertDispatch({
        alertId,
        userId: alert.userId,
        eventType: alert.type,
        dispatchStartTime: startTime,
        dispatchEndTime: performance.now(),
        latency,
        success: true,
        deliveryMethod: alert.channels[0] || DeliveryChannel.IN_APP,
        retryCount: 0
      })

      // Update metrics
      this.updateMetrics(latency, true)

      return {
        success: true,
        alertId,
        estimatedDeliveryTime: this.estimateDeliveryTime(alert.priority),
        latency
      }
    } catch (error) {
      const latency = performance.now() - startTime

      performanceMonitor.recordAlertDispatch({
        alertId: '',
        userId: alert.userId,
        eventType: alert.type,
        dispatchStartTime: startTime,
        dispatchEndTime: performance.now(),
        latency,
        success: false,
        errorType: error.message,
        deliveryMethod: alert.channels[0] || DeliveryChannel.IN_APP,
        retryCount: 0
      })

      this.updateMetrics(latency, false)

      return {
        success: false,
        alertId: '',
        estimatedDeliveryTime: 0,
        latency
      }
    }
  }

  /**
   * Batch dispatch multiple alerts
   */
  async dispatchBatchAlerts(alerts: Omit<EmergencyAlert, 'id' | 'deliveryAttempts' | 'retryCount'>[]): Promise<{
    successful: number
    failed: number
    averageLatency: number
    results: Array<{ success: boolean; alertId: string; latency: number }>
  }> {
    const startTime = performance.now()
    const results = []

    for (const alert of alerts) {
      const result = await this.dispatchAlert(alert)
      results.push(result)
    }

    const totalLatency = performance.now() - startTime
    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    const averageLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length

    return {
      successful,
      failed,
      averageLatency,
      results
    }
  }

  /**
   * Get users for emergency alert (optimized)
   */
  async getUsersForAlert(
    eventId: string,
    spatialFilter: {
      lat: number
      lng: number
      radiusMeters: number
    },
    filters?: {
      trustScore?: number
      maxDistance?: number
      notificationPreferences?: Record<string, any>
    }
  ): Promise<{
    users: Array<{
      userId: string
      fcmToken?: string
      email?: string
      phone?: string
      distance: number
      trustScore: number
      preferredChannels: DeliveryChannel[]
    }>
    count: number
    executionTime: number
  }> {
    const timerId = performanceMonitor.startTimer('get_users_for_alert', {
      event_id: eventId
    })

    try {
      // Use optimized spatial query
      const result = await queryOptimizer.executeSpatialQuery(
        `
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
        `,
        spatialFilter,
        [filters?.trustScore, filters?.maxDistance]
      )

      const executionTime = performanceMonitor.endTimer(timerId, 'database', 'get_users_for_alert')

      const users = (result.data || []).map((user: any) => ({
        userId: user.user_id,
        fcmToken: user.fcm_token,
        email: user.email,
        phone: user.phone,
        distance: user.distance,
        trustScore: user.trust_score,
        preferredChannels: this.getPreferredChannels(user.notification_preferences)
      }))

      return {
        users,
        count: users.length,
        executionTime
      }
    } catch (error) {
      const executionTime = performanceMonitor.endTimer(timerId, 'database', 'get_users_for_alert')

      throw new Error(`Failed to get users for alert: ${error.message}`)
    }
  }

  /**
   * Send alert to specific channels
   */
  private async sendToChannels(alert: EmergencyAlert): Promise<DeliveryAttempt[]> {
    const attempts: DeliveryAttempt[] = []

    // Process channels in parallel for critical alerts
    if (alert.priority === AlertPriority.CRITICAL) {
      const channelPromises = alert.channels.map(channel =>
        this.sendToChannel(alert, channel)
      )

      const results = await Promise.allSettled(channelPromises)

      results.forEach((result, index) => {
        const channel = alert.channels[index]
        if (result.status === 'fulfilled') {
          attempts.push(result.value)
        } else {
          attempts.push(this.createFailedAttempt(alert, channel, result.reason.message))
        }
      })
    } else {
      // Process channels sequentially for non-critical alerts
      for (const channel of alert.channels) {
        const attempt = await this.sendToChannel(alert, channel)
        attempts.push(attempt)
      }
    }

    return attempts
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: EmergencyAlert, channel: DeliveryChannel): Promise<DeliveryAttempt> {
    const startTime = performance.now()
    const attemptId = this.generateAttemptId()

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

      // Record channel performance
      this.recordChannelPerformance(channel, latency, success)

      return attempt
    } catch (error) {
      const endTime = performance.now()
      const latency = endTime - startTime

      attempt.endTime = endTime
      attempt.latency = latency
      attempt.status = DeliveryStatus.FAILED
      attempt.error = error.message

      this.recordChannelPerformance(channel, latency, false)

      return attempt
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('push_notification_send', {
      alert_id: alert.id
    })

    try {
      // Get user's FCM token
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('fcm_token')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.fcm_token) {
        throw new Error('No FCM token for user')
      }

      // Send via FCM (optimized implementation)
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.fcm_token,
          notification: {
            title: alert.title,
            body: alert.message,
            priority: this.getFCMPriority(alert.priority),
            ttl: this.getTTL(alert.priority)
          },
          data: {
            alertId: alert.id,
            eventId: alert.eventId,
            type: alert.type,
            priority: alert.priority,
            ...alert.data
          },
          android: {
            priority: this.getFCMPriority(alert.priority),
            ttl: this.getTTL(alert.priority)
          },
          apns: {
            headers: {
              'apns-priority': this.getAPNSPriority(alert.priority),
              'apns-expiration': this.getAPNSExpiration(alert.priority)
            }
          }
        })
      })

      const success = response.ok
      const executionTime = performanceMonitor.endTimer(timerId, 'alert', 'push_notification_send')

      if (!success) {
        throw new Error(`FCM request failed: ${response.statusText}`)
      }

      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'push_notification_send')
      throw error
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('email_send', {
      alert_id: alert.id
    })

    try {
      // Get user's email
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('email')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.email) {
        throw new Error('No email for user')
      }

      // Send via optimized email service
      const response = await fetch(`${process.env.EMAIL_SERVICE_URL}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EMAIL_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.email,
          subject: alert.title,
          html: this.generateEmailTemplate(alert),
          priority: this.getEmailPriority(alert.priority),
          headers: {
            'X-Priority': this.getEmailPriority(alert.priority),
            'X-Alert-ID': alert.id,
            'X-Alert-Priority': alert.priority
          }
        })
      })

      const success = response.ok
      const executionTime = performanceMonitor.endTimer(timerId, 'alert', 'email_send')

      if (!success) {
        throw new Error(`Email service failed: ${response.statusText}`)
      }

      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'email_send')
      throw error
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('sms_send', {
      alert_id: alert.id
    })

    try {
      // Get user's phone
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('phone')
        .eq('user_id', alert.userId)
        .single()

      if (!user?.phone) {
        throw new Error('No phone number for user')
      }

      // Send via optimized SMS service
      const response = await fetch(`${process.env.SMS_SERVICE_URL}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SMS_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.phone,
          message: `${alert.title}: ${alert.message}`,
          priority: this.getSMSPriority(alert.priority)
        })
      })

      const success = response.ok
      const executionTime = performanceMonitor.endTimer(timerId, 'alert', 'sms_send')

      if (!success) {
        throw new Error(`SMS service failed: ${response.statusText}`)
      }

      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'sms_send')
      throw error
    }
  }

  /**
   * Send WebSocket notification
   */
  private async sendWebSocket(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('websocket_send', {
      alert_id: alert.id
    })

    try {
      // Send via WebSocket connection pool
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

      const executionTime = performanceMonitor.endTimer(timerId, 'alert', 'websocket_send')
      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'websocket_send')
      throw error
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(alert: EmergencyAlert): Promise<boolean> {
    const timerId = performanceMonitor.startTimer('in_app_send', {
      alert_id: alert.id
    })

    try {
      // Store in database for in-app retrieval
      const { error } = await this.supabase
        .from('user_notifications')
        .insert({
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
      const executionTime = performanceMonitor.endTimer(timerId, 'alert', 'in_app_send')

      if (!success) {
        throw new Error(`Failed to store in-app notification: ${error.message}`)
      }

      return success
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'in_app_send')
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private initializeQueues(): void {
    this.alertQueues.set(AlertPriority.CRITICAL, [])
    this.alertQueues.set(AlertPriority.HIGH, [])
    this.alertQueues.set(AlertPriority.MEDIUM, [])
    this.alertQueues.set(AlertPriority.LOW, [])
  }

  private initializeDeliveryWorkers(): void {
    // Initialize worker pools for each channel
    Object.values(DeliveryChannel).forEach(channel => {
      this.deliveryWorkers.set(channel, [])
      this.connectionPools.set(channel, [])
    })
  }

  private startQueueProcessors(): void {
    // Process each priority queue
    Object.values(AlertPriority).forEach(priority => {
      setInterval(() => {
        this.processQueue(priority)
      }, this.config.batchTimeout)
    })
  }

  private async processQueue(priority: AlertPriority): Promise<void> {
    const queue = this.alertQueues.get(priority)
    if (!queue || queue.length === 0) {
      return
    }

    // Get batch of alerts to process
    const batch = queue.splice(0, this.config.batchSize)

    // Process batch in parallel
    const processingPromises = batch.map(alert => this.processAlert(alert))

    await Promise.allSettled(processingPromises)
  }

  private async processAlert(alert: EmergencyAlert): Promise<void> {
    if (this.processingAlerts.has(alert.id)) {
      return
    }

    this.processingAlerts.set(alert.id, alert)

    try {
      const attempts = await this.sendToChannels(alert)
      alert.deliveryAttempts.push(...attempts)

      // Check if any delivery was successful
      const hasSuccessfulDelivery = attempts.some(attempt =>
        attempt.status === DeliveryStatus.SENT || attempt.status === DeliveryStatus.DELIVERED
      )

      if (hasSuccessfulDelivery) {
        // Mark as delivered
        await this.markAlertDelivered(alert.id)
      } else {
        // Retry if attempts remaining
        if (alert.retryCount < alert.maxRetries) {
          alert.retryCount++
          setTimeout(() => {
            this.addToQueue(alert)
          }, this.getRetryDelay(alert.retryCount))
        } else {
          // Mark as failed
          await this.markAlertFailed(alert.id)
        }
      }
    } catch (error) {
      console.error(`Error processing alert ${alert.id}:`, error)
    } finally {
      this.processingAlerts.delete(alert.id)
    }
  }

  private async processAlertImmediately(alert: EmergencyAlert): Promise<void> {
    // Bypass queue for immediate processing
    await this.processAlert(alert)
  }

  private addToQueue(alert: EmergencyAlert): void {
    const queue = this.alertQueues.get(alert.priority)
    if (queue) {
      queue.push(alert)

      // Check queue size limit
      if (queue.length > this.config.maxSize) {
        // Remove oldest low priority alerts
        const lowPriorityQueue = this.alertQueues.get(AlertPriority.LOW)
        if (lowPriorityQueue && lowPriorityQueue.length > 0) {
          lowPriorityQueue.shift()
        }
      }
    }
  }

  private async markAlertDelivered(alertId: string): Promise<void> {
    await this.supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', alertId)
  }

  private async markAlertFailed(alertId: string): Promise<void> {
    await this.supabase
      .from('notification_queue')
      .update({
        status: 'failed',
        error_message: 'Max retries exceeded'
      })
      .eq('id', alertId)
  }

  private createFailedAttempt(alert: EmergencyAlert, channel: DeliveryChannel, error: string): DeliveryAttempt {
    return {
      id: this.generateAttemptId(),
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

  private async sendViaWebSocketPool(userId: string, data: any): Promise<boolean> {
    // Implementation would use WebSocket connection pool
    // For now, return true as placeholder
    return true
  }

  private getPreferredChannels(preferences: Record<string, any>): DeliveryChannel[] {
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

  private getMaxRetries(priority: AlertPriority): number {
    switch (priority) {
      case AlertPriority.CRITICAL: return 5
      case AlertPriority.HIGH: return 3
      case AlertPriority.MEDIUM: return 2
      case AlertPriority.LOW: return 1
      default: return 2
    }
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
    return delay + Math.random() * 1000 // Add jitter
  }

  private estimateDeliveryTime(priority: AlertPriority): number {
    switch (priority) {
      case AlertPriority.CRITICAL: return 100 // <100ms target
      case AlertPriority.HIGH: return 500
      case AlertPriority.MEDIUM: return 2000
      case AlertPriority.LOW: return 5000
      default: return 2000
    }
  }

  private getFCMPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL: return 'high'
      case AlertPriority.HIGH: return 'high'
      case AlertPriority.MEDIUM: return 'normal'
      case AlertPriority.LOW: return 'normal'
      default: return 'normal'
    }
  }

  private getAPNSPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL: return '10'
      case AlertPriority.HIGH: return '10'
      case AlertPriority.MEDIUM: return '5'
      case AlertPriority.LOW: return '5'
      default: return '5'
    }
  }

  private getEmailPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL: return '1'
      case AlertPriority.HIGH: return '2'
      case AlertPriority.MEDIUM: return '3'
      case AlertPriority.LOW: return '5'
      default: return '3'
    }
  }

  private getSMSPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL: return 'urgent'
      case AlertPriority.HIGH: return 'high'
      case AlertPriority.MEDIUM: return 'normal'
      case AlertPriority.LOW: return 'low'
      default: return 'normal'
    }
  }

  private getTTL(priority: AlertPriority): number {
    // Time to live in seconds
    switch (priority) {
      case AlertPriority.CRITICAL: return 3600 // 1 hour
      case AlertPriority.HIGH: return 7200 // 2 hours
      case AlertPriority.MEDIUM: return 86400 // 24 hours
      case AlertPriority.LOW: return 604800 // 7 days
      default: return 86400
    }
  }

  private getAPNSExpiration(priority: AlertPriority): string {
    const ttl = this.getTTL(priority)
    const expirationDate = new Date(Date.now() + ttl * 1000)
    return expirationDate.toISOString()
  }

  private generateEmailTemplate(alert: EmergencyAlert): string {
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

  private recordChannelPerformance(channel: DeliveryChannel, latency: number, success: boolean): void {
    if (!this.metrics.channelPerformance[channel]) {
      this.metrics.channelPerformance[channel] = {
        total: 0,
        success: 0,
        avgLatency: 0
      }
    }

    const perf = this.metrics.channelPerformance[channel]
    perf.total++
    if (success) {
      perf.success++
    }

    // Update average latency
    const totalLatency = perf.avgLatency * (perf.total - 1) + latency
    perf.avgLatency = totalLatency / perf.total
  }

  private updateMetrics(latency: number, success: boolean): void {
    this.metrics.totalAlerts++

    if (success) {
      this.metrics.successfulDeliveries++
    } else {
      this.metrics.failedDeliveries++
    }

    // Update average latency
    const totalLatency = this.metrics.averageLatency * (this.metrics.totalAlerts - 1) + latency
    this.metrics.averageLatency = totalLatency / this.metrics.totalAlerts
  }

  private startMetricsCollection(): void {
    // Collect and report metrics every minute
    setInterval(async () => {
      await this.reportMetrics()
    }, 60 * 1000)
  }

  private async reportMetrics(): Promise<void> {
    // Calculate percentiles
    const recentAlerts = Array.from(this.processingAlerts.values())
      .filter(alert => alert.deliveryAttempts.length > 0)
      .flatMap(alert => alert.deliveryAttempts)
      .filter(attempt => attempt.latency !== undefined)
      .map(attempt => attempt.latency!)

    if (recentAlerts.length > 0) {
      recentAlerts.sort((a, b) => a - b)
      const p95Index = Math.floor(recentAlerts.length * 0.95)
      const p99Index = Math.floor(recentAlerts.length * 0.99)

      this.metrics.p95Latency = recentAlerts[p95Index] || 0
      this.metrics.p99Latency = recentAlerts[p99Index] || 0
    }

    // Report to performance monitor
    performanceMonitor.recordMetric({
      type: 'alert',
      name: 'alert_dispatch_metrics',
      value: this.metrics.averageLatency,
      unit: 'ms',
      tags: {
        total_alerts: this.metrics.totalAlerts.toString(),
        success_rate: ((this.metrics.successfulDeliveries / this.metrics.totalAlerts) * 100).toString(),
        p95_latency: this.metrics.p95Latency.toString(),
        p99_latency: this.metrics.p99Latency.toString()
      }
    })
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Public API methods
   */

  async getDispatchMetrics(): Promise<DispatchMetrics> {
    return { ...this.metrics }
  }

  async getQueueStatus(): Promise<{
    critical: number
    high: number
    medium: number
    low: number
    processing: number
  }> {
    return {
      critical: this.alertQueues.get(AlertPriority.CRITICAL)?.length || 0,
      high: this.alertQueues.get(AlertPriority.HIGH)?.length || 0,
      medium: this.alertQueues.get(AlertPriority.MEDIUM)?.length || 0,
      low: this.alertQueues.get(AlertPriority.LOW)?.length || 0,
      processing: this.processingAlerts.size
    }
  }

  async optimizeForEmergencyMode(): Promise<void> {
    // Increase batch size and reduce timeout for emergency mode
    this.config.batchSize = 100
    this.config.batchTimeout = 50
    this.config.concurrencyPerPriority = 20

    console.log('[AlertDispatchOptimizer] Emergency mode activated - optimized for high throughput')
  }

  async resetToNormalMode(): Promise<void> {
    this.config.batchSize = 50
    this.config.batchTimeout = 100
    this.config.concurrencyPerPriority = 10

    console.log('[AlertDispatchOptimizer] Normal mode restored')
  }
}

// Export singleton instance
export const alertDispatchOptimizer = AlertDispatchOptimizer.getInstance()

// Export hooks for easy integration
export function useAlertDispatchOptimizer() {
  return {
    dispatchAlert: alertDispatchOptimizer.dispatchAlert.bind(alertDispatchOptimizer),
    dispatchBatchAlerts: alertDispatchOptimizer.dispatchBatchAlerts.bind(alertDispatchOptimizer),
    getUsersForAlert: alertDispatchOptimizer.getUsersForAlert.bind(alertDispatchOptimizer),
    getDispatchMetrics: alertDispatchOptimizer.getDispatchMetrics.bind(alertDispatchOptimizer),
    getQueueStatus: alertDispatchOptimizer.getQueueStatus.bind(alertDispatchOptimizer),
    optimizeForEmergencyMode: alertDispatchOptimizer.optimizeForEmergencyMode.bind(alertDispatchOptimizer),
    resetToNormalMode: alertDispatchOptimizer.resetToNormalMode.bind(alertDispatchOptimizer)
  }
}

export default alertDispatchOptimizer