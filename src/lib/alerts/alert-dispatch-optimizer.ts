/**
 * Alert Dispatch Optimizer for <100ms Latency
 *
 * This module provides high-performance alert dispatch with:
 * - Parallel processing for multiple delivery channels
 * - Intelligent queue management and prioritization
 * - Connection pooling and caching
 * - Real-time performance monitoring
 * - Fallback and retry mechanisms
 *
 * The implementation has been split across focused modules:
 * - `dispatch-types.ts` — shared enums, interfaces, and type aliases
 * - `dispatch-helpers.ts` — pure utilities (validation, backoff, priority/TTL maps, IDs)
 * - `dispatch-strategy.ts` — per-channel delivery and routing
 * - `dispatch-batching.ts` — FCM batch processing
 *
 * This file re-exports everything above and retains the singleton orchestrator
 * class so existing imports from `@/lib/alerts/alert-dispatch-optimizer` keep working.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { createClient } from '@supabase/supabase-js'

import {
  AlertPriority,
  DeliveryChannel,
  DeliveryStatus,
  EmergencyAlert,
  QueueConfig,
  DispatchMetrics,
  type AlertInput,
  type BatchDispatchResult,
  type DispatchResult,
  type FCMBatchResult,
  type FCMSingleNotification,
  type GetUsersForAlertResult,
  type SpatialFilter,
  type UserFilters
} from './dispatch-types'
import {
  GET_USERS_FOR_ALERT_SQL,
  computeLatencyPercentiles,
  createDefaultQueueConfig,
  createEmergencyQueueConfig,
  createInitialMetrics,
  estimateDeliveryTime,
  generateAlertId,
  getMaxRetries,
  getRetryDelay,
  mapUserRowToAlertUser,
  rollAverage
} from './dispatch-helpers'
import { AlertDeliveryStrategy } from './dispatch-strategy'
import { AlertBatchProcessor } from './dispatch-batching'

// Re-export the public type/interface/enum surface for backward compatibility.
// All existing imports from `@/lib/alerts/alert-dispatch-optimizer` keep working.
export * from './dispatch-types'

class AlertDispatchOptimizer {
  private static instance: AlertDispatchOptimizer
  private alertQueues: Map<AlertPriority, EmergencyAlert[]> = new Map()
  private processingAlerts: Map<string, EmergencyAlert> = new Map()
  private deliveryWorkers: Map<DeliveryChannel, Worker[]> = new Map()
  private connectionPools: Map<DeliveryChannel, any[]> = new Map()
  private metrics: DispatchMetrics
  private config: QueueConfig
  // Lazily created so module-load (e.g. during the Next.js build) doesn't throw
  // when env vars are absent.
  private _supabase: any = null
  private get supabase(): any {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) {
        throw new Error('Supabase env vars not configured')
      }
      this._supabase = createClient(url, key)
    }
    return this._supabase
  }

  private readonly delivery: AlertDeliveryStrategy
  private readonly batching: AlertBatchProcessor

  private constructor() {
    this.config = createDefaultQueueConfig()
    this.metrics = createInitialMetrics()

    this.delivery = new AlertDeliveryStrategy(
      () => this.supabase,
      (channel, latency, success) => this.recordChannelPerformance(channel, latency, success)
    )
    this.batching = new AlertBatchProcessor(() => this.supabase)

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
   * Dispatch emergency alert with <100ms latency target.
   */
  async dispatchAlert(alert: AlertInput): Promise<DispatchResult> {
    const startTime = performance.now()

    try {
      const alertId = generateAlertId()

      const fullAlert: EmergencyAlert = {
        ...alert,
        id: alertId,
        deliveryAttempts: [],
        retryCount: 0,
        maxRetries: getMaxRetries(alert.priority)
      }

      this.addToQueue(fullAlert)

      if (alert.priority === AlertPriority.CRITICAL) {
        await this.processAlertImmediately(fullAlert)
      }

      const latency = performance.now() - startTime

      performanceMonitor.recordAlertDispatch({
        alertId,
        userId: alert.userId,
        eventType: alert.type,
        dispatchStartTime: startTime,
        dispatchEndTime: performance.now(),
        latency,
        success: true,
        deliveryMethod: this.resolveDeliveryMethod(alert.channels[0]),
        retryCount: 0
      })

      this.updateMetrics(latency, true)

      return {
        success: true,
        alertId,
        estimatedDeliveryTime: estimateDeliveryTime(alert.priority),
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
        errorType: (error as Error).message,
        deliveryMethod: this.resolveDeliveryMethod(alert.channels[0]),
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
   * Batch dispatch multiple alerts.
   */
  async dispatchBatchAlerts(alerts: AlertInput[]): Promise<BatchDispatchResult> {
    const startTime = performance.now()
    const results: DispatchResult[] = []

    for (const alert of alerts) {
      const result = await this.dispatchAlert(alert)
      results.push(result)
    }

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
   * Get users for emergency alert (optimized spatial query).
   */
  async getUsersForAlert(
    eventId: string,
    spatialFilter: SpatialFilter,
    filters?: UserFilters
  ): Promise<GetUsersForAlertResult> {
    const timerId = performanceMonitor.startTimer('get_users_for_alert', {
      event_id: eventId
    })

    try {
      const result = await queryOptimizer.executeSpatialQuery(
        GET_USERS_FOR_ALERT_SQL,
        spatialFilter,
        [filters?.trustScore, filters?.maxDistance]
      )

      const executionTime = performanceMonitor.endTimer(timerId, 'database', 'get_users_for_alert')
      const users = (result.data || []).map(mapUserRowToAlertUser)

      return { users, count: users.length, executionTime }
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'database', 'get_users_for_alert')
      throw new Error(`Failed to get users for alert: ${(error as Error).message}`)
    }
  }

  // Delegated batch push notifications.
  async batchPushNotifications(
    notifications: FCMSingleNotification[]
  ): Promise<FCMBatchResult> {
    return this.batching.batchPushNotifications(notifications)
  }

  async sendBatchPushNotifications(
    users: Array<{ userId: string; fcmToken?: string }>,
    alert: {
      title: string
      message: string
      eventId: string
      type: string
      priority: AlertPriority
      data: Record<string, unknown>
    }
  ): Promise<FCMBatchResult> {
    return this.batching.sendBatchPushNotifications(users, alert)
  }

  /**
   * Queue processing and alert lifecycle.
   */
  private initializeQueues(): void {
    this.alertQueues.set(AlertPriority.CRITICAL, [])
    this.alertQueues.set(AlertPriority.HIGH, [])
    this.alertQueues.set(AlertPriority.MEDIUM, [])
    this.alertQueues.set(AlertPriority.LOW, [])
  }

  private initializeDeliveryWorkers(): void {
    Object.values(DeliveryChannel).forEach(channel => {
      this.deliveryWorkers.set(channel, [])
      this.connectionPools.set(channel, [])
    })
  }

  private startQueueProcessors(): void {
    Object.values(AlertPriority).forEach(priority => {
      setInterval(() => {
        void this.processQueue(priority)
      }, this.config.batchTimeout)
    })
  }

  private async processQueue(priority: AlertPriority): Promise<void> {
    const queue = this.alertQueues.get(priority)
    if (!queue || queue.length === 0) {
      return
    }

    const batch = queue.splice(0, this.config.batchSize)
    const processingPromises = batch.map(alert => this.processAlert(alert))

    await Promise.allSettled(processingPromises)
  }

  private async processAlert(alert: EmergencyAlert): Promise<void> {
    if (this.processingAlerts.has(alert.id)) {
      return
    }

    this.processingAlerts.set(alert.id, alert)

    try {
      const attempts = await this.delivery.sendToChannels(alert)
      alert.deliveryAttempts.push(...attempts)

      const hasSuccessfulDelivery = attempts.some(
        attempt =>
          attempt.status === DeliveryStatus.SENT || attempt.status === DeliveryStatus.DELIVERED
      )

      if (hasSuccessfulDelivery) {
        await this.markAlertDelivered(alert.id)
      } else if (alert.retryCount < alert.maxRetries) {
        alert.retryCount++
        setTimeout(() => {
          this.addToQueue(alert)
        }, getRetryDelay(alert.retryCount))
      } else {
        await this.markAlertFailed(alert.id)
      }
    } catch (error) {
      console.error(`Error processing alert ${alert.id}:`, error)
    } finally {
      this.processingAlerts.delete(alert.id)
    }
  }

  private async processAlertImmediately(alert: EmergencyAlert): Promise<void> {
    await this.processAlert(alert)
  }

  private addToQueue(alert: EmergencyAlert): void {
    const queue = this.alertQueues.get(alert.priority)
    if (queue) {
      queue.push(alert)

      if (queue.length > this.config.maxSize) {
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

  private resolveDeliveryMethod(
    channel: DeliveryChannel | undefined
  ): 'push' | 'email' | 'sms' | 'websocket' {
    return (channel === DeliveryChannel.PUSH_NOTIFICATION
      ? 'push'
      : channel === DeliveryChannel.EMAIL
        ? 'email'
        : channel === DeliveryChannel.SMS
          ? 'sms'
          : 'websocket') as 'push' | 'email' | 'sms' | 'websocket'
  }

  /**
   * Metrics recording.
   */
  private recordChannelPerformance(
    channel: DeliveryChannel,
    latency: number,
    success: boolean
  ): void {
    if (!this.metrics.channelPerformance[channel]) {
      this.metrics.channelPerformance[channel] = { total: 0, success: 0, avgLatency: 0 }
    }
    const perf = this.metrics.channelPerformance[channel]
    perf.total++
    if (success) {
      perf.success++
    }
    perf.avgLatency = rollAverage(perf.avgLatency, latency, perf.total)
  }

  private updateMetrics(latency: number, success: boolean): void {
    this.metrics.totalAlerts++
    if (success) {
      this.metrics.successfulDeliveries++
    } else {
      this.metrics.failedDeliveries++
    }
    this.metrics.averageLatency = rollAverage(
      this.metrics.averageLatency,
      latency,
      this.metrics.totalAlerts
    )
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      void this.reportMetrics()
    }, 60 * 1000)
  }

  private async reportMetrics(): Promise<void> {
    const recentLatencies = Array.from(this.processingAlerts.values())
      .filter(alert => alert.deliveryAttempts.length > 0)
      .flatMap(alert => alert.deliveryAttempts)
      .filter(attempt => attempt.latency !== undefined)
      .map(attempt => attempt.latency!)

    const { p95, p99 } = computeLatencyPercentiles(recentLatencies)
    this.metrics.p95Latency = p95
    this.metrics.p99Latency = p99

    performanceMonitor.recordMetric({
      type: 'alert',
      name: 'alert_dispatch_metrics',
      value: this.metrics.averageLatency,
      unit: 'ms',
      tags: {
        total_alerts: this.metrics.totalAlerts.toString(),
        success_rate: (
          (this.metrics.successfulDeliveries / this.metrics.totalAlerts) *
          100
        ).toString(),
        p95_latency: p95.toString(),
        p99_latency: p99.toString()
      }
    })
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
    this.config = createEmergencyQueueConfig()
    console.log('[AlertDispatchOptimizer] Emergency mode activated - optimized for high throughput')
  }

  async resetToNormalMode(): Promise<void> {
    this.config = createDefaultQueueConfig()
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
    optimizeForEmergencyMode:
      alertDispatchOptimizer.optimizeForEmergencyMode.bind(alertDispatchOptimizer),
    resetToNormalMode: alertDispatchOptimizer.resetToNormalMode.bind(alertDispatchOptimizer),
    sendBatchPushNotifications:
      alertDispatchOptimizer.sendBatchPushNotifications.bind(alertDispatchOptimizer)
  }
}

export default alertDispatchOptimizer
