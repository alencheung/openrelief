/**
 * Comprehensive Performance Monitoring System
 *
 * This module provides real-time performance monitoring for:
 * - API response times and throughput
 * - Database query performance
 * - Frontend Core Web Vitals
 * - Alert dispatch latency
 * - System resource utilization
 * - User experience metrics
 */

import { performance } from 'perf_hooks'
import { createClient } from '@supabase/supabase-js'

// Re-export extracted types and helpers for backward compatibility
export * from './monitor-types'
export * from './monitor-helpers'
import {
  generateMetricId,
  generateTimerId,
  generateAlertId,
  getMetricImpact,
  getMetricRecommendations,
  getThresholdsForMetric,
  getWebVitalsAlerts,
  getAlertDispatchAlert,
  getDatabaseQueryAlert,
  getSystemResourceAlerts,
  shouldEscalateAlert,
  shouldAutoResolveAlert,
  calculatePerformanceSummary,
  collectProcessSystemMetrics,
  persistMetric,
  persistAlert,
  loadRecentMetrics,
  cleanupOldMetrics,
  sendPerformanceAlertNotification,
  type SupabaseLikeClient
} from './monitor-helpers'
import type {
  PerformanceMetric,
  CoreWebVitals,
  AlertDispatchMetrics,
  DatabaseQueryMetrics,
  SystemResourceMetrics,
  PerformanceAlert
} from './monitor-types'
import { PerformanceAlertLevel } from './monitor-types'

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private alerts: PerformanceAlert[] = []
  private activeTimers: Map<string, number> = new Map()
  private webVitalsBuffer: CoreWebVitals[] = []
  private alertDispatchMetrics: AlertDispatchMetrics[] = []
  private databaseQueryMetrics: DatabaseQueryMetrics[] = []
  private systemResourceMetrics: SystemResourceMetrics[] = []
  private monitoringActive = false
  // Lazily created so that module-load (e.g. during the Next.js build's page
  // data collection, where env vars are absent) doesn't throw. The client is
  // only needed for server-side monitoring at request time. Typed loosely
  // because it queries tables (performance_metrics) not in the generated
  // Database types, which would otherwise resolve to `never`.
  private _supabase: SupabaseLikeClient | null = null
  private get supabase(): SupabaseLikeClient {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) {
        throw new Error('Supabase env vars not configured')
      }
      this._supabase = createClient(url, key) as unknown as SupabaseLikeClient
    }
    return this._supabase
  }

  private constructor() {
    // Defer monitoring startup outside the browser (build-time page-data
    // collection lacks both env vars and browser APIs like window/document).
    if (typeof window !== 'undefined') {
      this.startMonitoring()
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringActive) {
      return
    }

    this.monitoringActive = true
    this.initializeMetricsCollection()
    this.startRealTimeMonitoring()

    console.log('[PerformanceMonitor] Performance monitoring started')
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: generateMetricId(),
      timestamp: new Date(),
      ...metric
    }

    this.metrics.push(fullMetric)

    // Check for performance thresholds
    this.checkPerformanceThresholds(fullMetric)

    // Store in database for long-term analysis
    persistMetric(this.supabase, fullMetric)
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName: string, tags?: Record<string, string>): string {
    const timerId = generateTimerId()
    this.activeTimers.set(timerId, performance.now())

    return timerId
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(
    timerId: string,
    metricType: PerformanceMetric['type'],
    operationName: string,
    tags?: Record<string, string>
  ): number {
    const startTime = this.activeTimers.get(timerId)
    if (!startTime) {
      console.warn(`[PerformanceMonitor] Timer ${timerId} not found`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    this.recordMetric({
      type: metricType,
      name: operationName,
      value: duration,
      unit: 'ms',
      tags
    })

    this.activeTimers.delete(timerId)
    return duration
  }

  /**
   * Record Core Web Vitals
   */
  recordWebVitals(vitals: CoreWebVitals): void {
    this.webVitalsBuffer.push(vitals)

    // Record individual metrics
    this.recordMetric({
      type: 'frontend',
      name: 'largest_contentful_paint',
      value: vitals.lcp,
      unit: 'ms',
      tags: { vital_type: 'lcp' }
    })

    this.recordMetric({
      type: 'frontend',
      name: 'first_input_delay',
      value: vitals.fid,
      unit: 'ms',
      tags: { vital_type: 'fid' }
    })

    this.recordMetric({
      type: 'frontend',
      name: 'cumulative_layout_shift',
      value: vitals.cls,
      unit: 'percentage',
      tags: { vital_type: 'cls' }
    })

    this.recordMetric({
      type: 'frontend',
      name: 'first_contentful_paint',
      value: vitals.fcp,
      unit: 'ms',
      tags: { vital_type: 'fcp' }
    })

    this.recordMetric({
      type: 'frontend',
      name: 'time_to_first_byte',
      value: vitals.ttfb,
      unit: 'ms',
      tags: { vital_type: 'ttfb' }
    })

    if (vitals.inp) {
      this.recordMetric({
        type: 'frontend',
        name: 'interaction_to_next_paint',
        value: vitals.inp,
        unit: 'ms',
        tags: { vital_type: 'inp' }
      })
    }

    // Check Web Vitals thresholds
    for (const alert of getWebVitalsAlerts(vitals)) {
      this.createPerformanceAlert(alert)
    }
  }

  /**
   * Record alert dispatch metrics
   */
  recordAlertDispatch(metrics: AlertDispatchMetrics): void {
    this.alertDispatchMetrics.push(metrics)

    this.recordMetric({
      type: 'alert',
      name: 'alert_dispatch_latency',
      value: metrics.latency,
      unit: 'ms',
      tags: {
        delivery_method: metrics.deliveryMethod,
        event_type: metrics.eventType,
        success: metrics.success.toString()
      }
    })

    // Check alert dispatch thresholds
    const alert = getAlertDispatchAlert(metrics)
    if (alert) {
      this.createPerformanceAlert(alert)
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(metrics: DatabaseQueryMetrics): void {
    this.databaseQueryMetrics.push(metrics)

    this.recordMetric({
      type: 'database',
      name: 'database_query_execution_time',
      value: metrics.executionTime,
      unit: 'ms',
      tags: {
        query_type: metrics.queryType,
        table_name: metrics.tableName,
        cache_hit: metrics.cacheHit.toString(),
        index_used: metrics.indexUsed || 'none'
      }
    })

    // Check database query thresholds
    const alert = getDatabaseQueryAlert(metrics)
    if (alert) {
      this.createPerformanceAlert(alert)
    }
  }

  /**
   * Record system resource metrics
   */
  recordSystemResources(metrics: SystemResourceMetrics): void {
    this.systemResourceMetrics.push(metrics)

    this.recordMetric({
      type: 'system',
      name: 'cpu_usage',
      value: metrics.cpuUsage,
      unit: 'percentage'
    })

    this.recordMetric({
      type: 'system',
      name: 'memory_usage',
      value: metrics.memoryUsage,
      unit: 'percentage'
    })

    this.recordMetric({
      type: 'system',
      name: 'active_connections',
      value: metrics.activeConnections,
      unit: 'count'
    })

    // Check system resource thresholds
    for (const alert of getSystemResourceAlerts(metrics)) {
      this.createPerformanceAlert(alert)
    }
  }

  /**
   * Get performance metrics for a time range
   */
  async getMetrics(
    type?: PerformanceMetric['type'],
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetric[]> {
    let filteredMetrics = this.metrics

    if (type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === type)
    }

    if (startDate) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startDate)
    }

    if (endDate) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endDate)
    }

    return filteredMetrics
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary() {
    return calculatePerformanceSummary(this.metrics, this.getActiveAlerts())
  }

  /**
   * Private helper methods
   */

  private async initializeMetricsCollection(): Promise<void> {
    this.metrics = await loadRecentMetrics(this.supabase, 24)
  }

  private startRealTimeMonitoring(): void {
    // Collect system metrics every 30 seconds
    setInterval(async () => {
      await this.collectSystemMetrics()
    }, 30 * 1000)

    // Clean up old metrics every hour
    setInterval(async () => {
      await this.cleanupOldMetrics()
    }, 60 * 60 * 1000)

    // Process alerts every minute
    setInterval(async () => {
      await this.processPerformanceAlerts()
    }, 60 * 1000)
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = getThresholdsForMetric(metric)

    for (const threshold of thresholds) {
      if (metric.value > threshold.value) {
        this.createPerformanceAlert({
          level: threshold.level,
          metric: metric.name,
          currentValue: metric.value,
          threshold: threshold.value,
          description: `${metric.name} exceeded threshold: ${metric.value}${metric.unit} > ${threshold.value}${metric.unit}`,
          impact: getMetricImpact(metric),
          recommendations: getMetricRecommendations(metric)
        })
      }
    }
  }

  private createPerformanceAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: PerformanceAlert = {
      id: generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alert
    }

    this.alerts.push(fullAlert)

    // Store in database
    persistAlert(this.supabase, fullAlert)

    // Send immediate notification for critical/emergency alerts
    if (alert.level === PerformanceAlertLevel.CRITICAL || alert.level === PerformanceAlertLevel.EMERGENCY) {
      sendPerformanceAlertNotification(fullAlert)
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const systemMetrics = collectProcessSystemMetrics(this.activeTimers.size)
      this.recordSystemResources(systemMetrics)
    } catch (error) {
      console.error('[PerformanceMonitor] Error collecting system metrics:', error)
    }
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

    // Clean up in-memory metrics
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime)
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime)

    // Clean up database
    await cleanupOldMetrics(this.supabase, cutoffTime)
  }

  private async processPerformanceAlerts(): Promise<void> {
    const activeAlerts = this.getActiveAlerts()

    for (const alert of activeAlerts) {
      // Check if alert should be escalated
      if (shouldEscalateAlert(alert)) {
        await this.escalateAlert(alert)
      }

      // Check if alert should be auto-resolved
      if (shouldAutoResolveAlert(alert, this.metrics)) {
        await this.resolveAlert(alert.id)
      }
    }
  }

  private async escalateAlert(alert: PerformanceAlert): Promise<void> {
    // Update alert level to emergency
    alert.level = PerformanceAlertLevel.EMERGENCY

    await persistAlert(this.supabase, alert)
    sendPerformanceAlertNotification(alert)
  }

  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) {
      return
    }

    alert.resolved = true
    alert.resolvedAt = new Date()

    await persistAlert(this.supabase, alert)
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Export performance monitoring hooks
export function usePerformanceMonitor() {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    recordWebVitals: performanceMonitor.recordWebVitals.bind(performanceMonitor),
    recordAlertDispatch: performanceMonitor.recordAlertDispatch.bind(performanceMonitor),
    recordDatabaseQuery: performanceMonitor.recordDatabaseQuery.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getActiveAlerts: performanceMonitor.getActiveAlerts.bind(performanceMonitor),
    getPerformanceSummary: performanceMonitor.getPerformanceSummary.bind(performanceMonitor)
  }
}

export default performanceMonitor
