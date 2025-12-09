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

// Performance metric types
export interface PerformanceMetric {
  id: string
  timestamp: Date
  type: 'api' | 'database' | 'frontend' | 'alert' | 'system' | 'user_experience'
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'requests_per_second'
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

// Core Web Vitals interface
export interface CoreWebVitals {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
  inp: number // Interaction to Next Paint
}

// Alert dispatch metrics
export interface AlertDispatchMetrics {
  alertId: string
  userId: string
  eventType: string
  dispatchStartTime: number
  dispatchEndTime: number
  latency: number
  success: boolean
  errorType?: string
  deliveryMethod: 'push' | 'email' | 'sms' | 'websocket'
  retryCount: number
}

// Database query metrics
export interface DatabaseQueryMetrics {
  queryId: string
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
  tableName: string
  executionTime: number
  rowsAffected?: number
  indexUsed?: string
  cacheHit: boolean
  concurrentConnections: number
}

// System resource metrics
export interface SystemResourceMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIO: {
    bytesIn: number
    bytesOut: number
  }
  activeConnections: number
  queueDepth: number
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // API response times (ms)
  api: {
    emergency_alert: 100, // Critical for emergency response
    emergency_create: 150,
    emergency_query: 200,
    auth_operations: 500,
    general_api: 300
  },

  // Database queries (ms)
  database: {
    select: 50,
    insert: 100,
    update: 100,
    delete: 50,
    rpc: 200,
    spatial_query: 150 // Geo queries are more expensive
  },

  // Core Web Vitals
  web_vitals: {
    lcp: 2500, // Largest Contentful Paint
    fid: 100,  // First Input Delay
    cls: 0.1,  // Cumulative Layout Shift
    fcp: 1800, // First Contentful Paint
    ttfb: 600, // Time to First Byte
    inp: 200   // Interaction to Next Paint
  },

  // System resources (percentage)
  system: {
    cpu_usage: 80,
    memory_usage: 85,
    disk_usage: 90,
    active_connections: 1000
  },

  // Alert dispatch (ms)
  alert_dispatch: {
    push_notification: 100,
    email: 5000,
    sms: 3000,
    websocket: 50
  }
}

// Performance alert levels
export enum PerformanceAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// Performance alert interface
export interface PerformanceAlert {
  id: string
  level: PerformanceAlertLevel
  metric: string
  currentValue: number
  threshold: number
  timestamp: Date
  description: string
  impact: string
  recommendations: string[]
  resolved: boolean
  resolvedAt?: Date
}

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
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  private constructor() {
    this.startMonitoring()
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
    this.setupPerformanceAlerting()

    console.log('[PerformanceMonitor] Performance monitoring started')
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      ...metric
    }

    this.metrics.push(fullMetric)

    // Check for performance thresholds
    this.checkPerformanceThresholds(fullMetric)

    // Store in database for long-term analysis
    this.persistMetric(fullMetric)
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName: string, tags?: Record<string, string>): string {
    const timerId = this.generateTimerId()
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
    this.checkWebVitalsThresholds(vitals)
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
    this.checkAlertDispatchThresholds(metrics)
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
    this.checkDatabaseQueryThresholds(metrics)
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
    this.checkSystemResourceThresholds(metrics)
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
  async getPerformanceSummary(): Promise<{
    api: { avgResponseTime: number; requestsPerSecond: number; errorRate: number }
    database: { avgQueryTime: number; cacheHitRate: number; slowQueries: number }
    frontend: { lcp: number; fid: number; cls: number; fcp: number }
    alerts: { critical: number; warning: number; total: number }
    system: { cpuUsage: number; memoryUsage: number; activeConnections: number }
  }> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo)
    const activeAlerts = this.getActiveAlerts()

    // Calculate API metrics
    const apiMetrics = recentMetrics.filter(m => m.type === 'api')
    const apiResponseTimes = apiMetrics.filter(m => m.name.includes('response_time'))
    const avgApiResponseTime = apiResponseTimes.length > 0
      ? apiResponseTimes.reduce((sum, m) => sum + m.value, 0) / apiResponseTimes.length
      : 0

    // Calculate database metrics
    const dbMetrics = recentMetrics.filter(m => m.type === 'database')
    const dbQueryTimes = dbMetrics.filter(m => m.name === 'database_query_execution_time')
    const avgDbQueryTime = dbQueryTimes.length > 0
      ? dbQueryTimes.reduce((sum, m) => sum + m.value, 0) / dbQueryTimes.length
      : 0

    const cacheHits = dbMetrics.filter(m => m.tags?.cache_hit === 'true').length
    const cacheMisses = dbMetrics.filter(m => m.tags?.cache_hit === 'false').length
    const cacheHitRate = (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0

    // Calculate frontend metrics
    const frontendMetrics = recentMetrics.filter(m => m.type === 'frontend')
    const lcpMetrics = frontendMetrics.filter(m => m.name === 'largest_contentful_paint')
    const avgLcp = lcpMetrics.length > 0
      ? lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length
      : 0

    const fidMetrics = frontendMetrics.filter(m => m.name === 'first_input_delay')
    const avgFid = fidMetrics.length > 0
      ? fidMetrics.reduce((sum, m) => sum + m.value, 0) / fidMetrics.length
      : 0

    const clsMetrics = frontendMetrics.filter(m => m.name === 'cumulative_layout_shift')
    const avgCls = clsMetrics.length > 0
      ? clsMetrics.reduce((sum, m) => sum + m.value, 0) / clsMetrics.length
      : 0

    // Calculate system metrics
    const systemMetrics = recentMetrics.filter(m => m.type === 'system')
    const cpuMetrics = systemMetrics.filter(m => m.name === 'cpu_usage')
    const avgCpuUsage = cpuMetrics.length > 0
      ? cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length
      : 0

    const memoryMetrics = systemMetrics.filter(m => m.name === 'memory_usage')
    const avgMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length
      : 0

    return {
      api: {
        avgResponseTime: avgApiResponseTime,
        requestsPerSecond: apiMetrics.length / 3600, // per second over last hour
        errorRate: 0 // TODO: Calculate from error metrics
      },
      database: {
        avgQueryTime: avgDbQueryTime,
        cacheHitRate: cacheHitRate * 100, // percentage
        slowQueries: dbQueryTimes.filter(m => m.value > PERFORMANCE_THRESHOLDS.database.select).length
      },
      frontend: {
        lcp: avgLcp,
        fid: avgFid,
        cls: avgCls,
        fcp: avgFcp // TODO: Calculate FCP
      },
      alerts: {
        critical: activeAlerts.filter(a => a.level === PerformanceAlertLevel.CRITICAL).length,
        warning: activeAlerts.filter(a => a.level === PerformanceAlertLevel.WARNING).length,
        total: activeAlerts.length
      },
      system: {
        cpuUsage: avgCpuUsage,
        memoryUsage: avgMemoryUsage,
        activeConnections: 0 // TODO: Calculate from connection metrics
      }
    }
  }

  /**
   * Private helper methods
   */

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTimerId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeMetricsCollection(): Promise<void> {
    // Load existing metrics from database
    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('timestamp', { ascending: false })
        .limit(10000)

      if (error) {
        console.error('[PerformanceMonitor] Error loading metrics:', error)
        return
      }

      this.metrics = (data || []).map(row => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        type: row.type,
        name: row.name,
        value: row.value,
        unit: row.unit,
        tags: row.tags,
        metadata: row.metadata
      } as PerformanceMetric))
    } catch (error) {
      console.error('[PerformanceMonitor] Error initializing metrics collection:', error)
    }
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

  private setupPerformanceAlerting(): void {
    // This will be called when thresholds are exceeded
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = this.getThresholdsForMetric(metric)

    for (const threshold of thresholds) {
      if (metric.value > threshold.value) {
        this.createPerformanceAlert({
          level: threshold.level,
          metric: metric.name,
          currentValue: metric.value,
          threshold: threshold.value,
          description: `${metric.name} exceeded threshold: ${metric.value}${metric.unit} > ${threshold.value}${metric.unit}`,
          impact: this.getMetricImpact(metric),
          recommendations: this.getMetricRecommendations(metric)
        })
      }
    }
  }

  private getThresholdsForMetric(metric: PerformanceMetric): Array<{ level: PerformanceAlertLevel; value: number }> {
    const thresholds: Array<{ level: PerformanceAlertLevel; value: number }> = []

    switch (metric.type) {
      case 'api':
        if (metric.name.includes('emergency_alert')) {
          thresholds.push(
            { level: PerformanceAlertLevel.WARNING, value: PERFORMANCE_THRESHOLDS.api.emergency_alert * 0.8 },
            { level: PerformanceAlertLevel.CRITICAL, value: PERFORMANCE_THRESHOLDS.api.emergency_alert },
            { level: PerformanceAlertLevel.EMERGENCY, value: PERFORMANCE_THRESHOLDS.api.emergency_alert * 1.5 }
          )
        }
        break

      case 'database':
        if (metric.name === 'database_query_execution_time') {
          thresholds.push(
            { level: PerformanceAlertLevel.WARNING, value: PERFORMANCE_THRESHOLDS.database.select * 0.8 },
            { level: PerformanceAlertLevel.CRITICAL, value: PERFORMANCE_THRESHOLDS.database.select },
            { level: PerformanceAlertLevel.EMERGENCY, value: PERFORMANCE_THRESHOLDS.database.select * 2 }
          )
        }
        break

      case 'frontend':
        if (metric.name === 'largest_contentful_paint') {
          thresholds.push(
            { level: PerformanceAlertLevel.WARNING, value: PERFORMANCE_THRESHOLDS.web_vitals.lcp * 0.8 },
            { level: PerformanceAlertLevel.CRITICAL, value: PERFORMANCE_THRESHOLDS.web_vitals.lcp }
          )
        }
        break

      case 'system':
        if (metric.name === 'cpu_usage') {
          thresholds.push(
            { level: PerformanceAlertLevel.WARNING, value: PERFORMANCE_THRESHOLDS.system.cpu_usage * 0.8 },
            { level: PerformanceAlertLevel.CRITICAL, value: PERFORMANCE_THRESHOLDS.system.cpu_usage },
            { level: PerformanceAlertLevel.EMERGENCY, value: PERFORMANCE_THRESHOLDS.system.cpu_usage * 1.1 }
          )
        }
        break
    }

    return thresholds
  }

  private checkWebVitalsThresholds(vitals: CoreWebVitals): void {
    if (vitals.lcp > PERFORMANCE_THRESHOLDS.web_vitals.lcp) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'largest_contentful_paint',
        currentValue: vitals.lcp,
        threshold: PERFORMANCE_THRESHOLDS.web_vitals.lcp,
        description: `LCP exceeded threshold: ${vitals.lcp}ms > ${PERFORMANCE_THRESHOLDS.web_vitals.lcp}ms`,
        impact: 'Poor user experience, slow perceived load time',
        recommendations: ['Optimize image loading', 'Reduce server response time', 'Eliminate render-blocking resources']
      })
    }

    if (vitals.fid > PERFORMANCE_THRESHOLDS.web_vitals.fid) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'first_input_delay',
        currentValue: vitals.fid,
        threshold: PERFORMANCE_THRESHOLDS.web_vitals.fid,
        description: `FID exceeded threshold: ${vitals.fid}ms > ${PERFORMANCE_THRESHOLDS.web_vitals.fid}ms`,
        impact: 'Poor interactivity, sluggish user interface',
        recommendations: ['Reduce JavaScript execution time', 'Break up long tasks', 'Optimize third-party scripts']
      })
    }

    if (vitals.cls > PERFORMANCE_THRESHOLDS.web_vitals.cls) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'cumulative_layout_shift',
        currentValue: vitals.cls,
        threshold: PERFORMANCE_THRESHOLDS.web_vitals.cls,
        description: `CLS exceeded threshold: ${vitals.cls} > ${PERFORMANCE_THRESHOLDS.web_vitals.cls}`,
        impact: 'Visual instability, poor user experience',
        recommendations: ['Include size dimensions for images/videos', 'Reserve space for dynamic content', 'Avoid inserting content above existing content']
      })
    }
  }

  private checkAlertDispatchThresholds(metrics: AlertDispatchMetrics): void {
    const threshold = PERFORMANCE_THRESHOLDS.alert_dispatch[metrics.deliveryMethod]

    if (metrics.latency > threshold) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.CRITICAL,
        metric: 'alert_dispatch_latency',
        currentValue: metrics.latency,
        threshold,
        description: `Alert dispatch latency exceeded threshold: ${metrics.latency}ms > ${threshold}ms`,
        impact: 'Delayed emergency notifications, potentially life-threatening',
        recommendations: ['Optimize notification service', 'Implement queue-based processing', 'Add redundant delivery channels']
      })
    }
  }

  private checkDatabaseQueryThresholds(metrics: DatabaseQueryMetrics): void {
    const threshold = PERFORMANCE_THRESHOLDS.database[metrics.queryType]

    if (metrics.executionTime > threshold) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'database_query_execution_time',
        currentValue: metrics.executionTime,
        threshold,
        description: `Slow database query: ${metrics.executionTime}ms > ${threshold}ms`,
        impact: 'Slow API responses, degraded user experience',
        recommendations: ['Add appropriate indexes', 'Optimize query structure', 'Consider query caching']
      })
    }
  }

  private checkSystemResourceThresholds(metrics: SystemResourceMetrics): void {
    if (metrics.cpuUsage > PERFORMANCE_THRESHOLDS.system.cpu_usage) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'cpu_usage',
        currentValue: metrics.cpuUsage,
        threshold: PERFORMANCE_THRESHOLDS.system.cpu_usage,
        description: `High CPU usage: ${metrics.cpuUsage}% > ${PERFORMANCE_THRESHOLDS.system.cpu_usage}%`,
        impact: 'System performance degradation, potential service disruption',
        recommendations: ['Scale horizontally', 'Optimize CPU-intensive operations', 'Implement auto-scaling']
      })
    }

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.system.memory_usage) {
      this.createPerformanceAlert({
        level: PerformanceAlertLevel.WARNING,
        metric: 'memory_usage',
        currentValue: metrics.memoryUsage,
        threshold: PERFORMANCE_THRESHOLDS.system.memory_usage,
        description: `High memory usage: ${metrics.memoryUsage}% > ${PERFORMANCE_THRESHOLDS.system.memory_usage}%`,
        impact: 'Memory pressure, potential outages',
        recommendations: ['Optimize memory usage', 'Implement memory caching', 'Scale memory resources']
      })
    }
  }

  private createPerformanceAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alert
    }

    this.alerts.push(fullAlert)

    // Store in database
    this.persistAlert(fullAlert)

    // Send immediate notification for critical/emergency alerts
    if (alert.level === PerformanceAlertLevel.CRITICAL || alert.level === PerformanceAlertLevel.EMERGENCY) {
      this.sendPerformanceAlertNotification(fullAlert)
    }
  }

  private getMetricImpact(metric: PerformanceMetric): string {
    const impactMap: Record<string, string> = {
      emergency_alert_response_time: 'Critical impact on emergency response effectiveness',
      database_query_execution_time: 'Degraded API performance and user experience',
      largest_contentful_paint: 'Poor user experience, slow perceived load time',
      cpu_usage: 'System performance degradation, potential service disruption',
      alert_dispatch_latency: 'Delayed emergency notifications, potentially life-threatening'
    }

    return impactMap[metric.name] || 'Performance degradation'
  }

  private getMetricRecommendations(metric: PerformanceMetric): string[] {
    const recommendationMap: Record<string, string[]> = {
      emergency_alert_response_time: [
        'Optimize alert dispatch pipeline',
        'Implement connection pooling',
        'Add caching for frequently accessed data'
      ],
      database_query_execution_time: [
        'Add appropriate database indexes',
        'Optimize query structure',
        'Implement query result caching'
      ],
      largest_contentful_paint: [
        'Optimize image loading',
        'Reduce server response time',
        'Eliminate render-blocking resources'
      ],
      cpu_usage: [
        'Scale horizontally',
        'Optimize CPU-intensive operations',
        'Implement auto-scaling'
      ],
      alert_dispatch_latency: [
        'Optimize notification service',
        'Implement queue-based processing',
        'Add redundant delivery channels'
      ]
    }

    return recommendationMap[metric.name] || ['Investigate performance bottleneck', 'Monitor system resources']
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const usage = process.cpuUsage()
      const memUsage = process.memoryUsage()

      const systemMetrics: SystemResourceMetrics = {
        timestamp: new Date(),
        cpuUsage: (usage.user + usage.system) / 1000000, // Convert to seconds
        memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        diskUsage: 0, // TODO: Implement disk usage monitoring
        networkIO: {
          bytesIn: 0, // TODO: Implement network I/O monitoring
          bytesOut: 0
        },
        activeConnections: this.activeTimers.size,
        queueDepth: 0 // TODO: Implement queue depth monitoring
      }

      this.recordSystemResources(systemMetrics)
    } catch (error) {
      console.error('[PerformanceMonitor] Error collecting system metrics:', error)
    }
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

    try {
      // Clean up in-memory metrics
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime)
      this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime)

      // Clean up database
      await this.supabase
        .from('performance_metrics')
        .delete()
        .lt('timestamp', cutoffTime.toISOString())

      await this.supabase
        .from('performance_alerts')
        .delete()
        .lt('timestamp', cutoffTime.toISOString())
    } catch (error) {
      console.error('[PerformanceMonitor] Error cleaning up old metrics:', error)
    }
  }

  private async processPerformanceAlerts(): Promise<void> {
    const activeAlerts = this.getActiveAlerts()

    for (const alert of activeAlerts) {
      // Check if alert should be escalated
      if (this.shouldEscalateAlert(alert)) {
        await this.escalateAlert(alert)
      }

      // Check if alert should be auto-resolved
      if (this.shouldAutoResolveAlert(alert)) {
        await this.resolveAlert(alert.id)
      }
    }
  }

  private shouldEscalateAlert(alert: PerformanceAlert): boolean {
    const timeSinceCreation = Date.now() - alert.timestamp.getTime()

    // Escalate critical alerts after 5 minutes
    if (alert.level === PerformanceAlertLevel.CRITICAL && timeSinceCreation > 5 * 60 * 1000) {
      return true
    }

    // Escalate emergency alerts immediately
    if (alert.level === PerformanceAlertLevel.EMERGENCY) {
      return true
    }

    return false
  }

  private shouldAutoResolveAlert(alert: PerformanceAlert): boolean {
    // Auto-resolve if recent metrics show improvement
    const recentMetrics = this.metrics.filter(m =>
      m.name === alert.metric
      && m.timestamp > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    )

    if (recentMetrics.length === 0) {
      return false
    }

    const avgRecentValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length

    return avgRecentValue <= alert.threshold * 0.9 // 90% of threshold
  }

  private async escalateAlert(alert: PerformanceAlert): Promise<void> {
    // Update alert level to emergency
    alert.level = PerformanceAlertLevel.EMERGENCY

    await this.persistAlert(alert)
    await this.sendPerformanceAlertNotification(alert)
  }

  private async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) {
      return
    }

    alert.resolved = true
    alert.resolvedAt = new Date()

    await this.persistAlert(alert)
  }

  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await this.supabase
        .from('performance_metrics')
        .insert({
          id: metric.id,
          type: metric.type,
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
          metadata: metric.metadata,
          timestamp: metric.timestamp.toISOString()
        })
    } catch (error) {
      console.error('[PerformanceMonitor] Error persisting metric:', error)
    }
  }

  private async persistAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await this.supabase
        .from('performance_alerts')
        .upsert({
          id: alert.id,
          level: alert.level,
          metric: alert.metric,
          current_value: alert.currentValue,
          threshold: alert.threshold,
          description: alert.description,
          impact: alert.impact,
          recommendations: alert.recommendations,
          timestamp: alert.timestamp.toISOString(),
          resolved: alert.resolved,
          resolved_at: alert.resolvedAt?.toISOString()
        })
    } catch (error) {
      console.error('[PerformanceMonitor] Error persisting alert:', error)
    }
  }

  private async sendPerformanceAlertNotification(alert: PerformanceAlert): Promise<void> {
    // TODO: Implement notification system (email, Slack, etc.)
    console.error('[PerformanceMonitor] PERFORMANCE ALERT:', {
      level: alert.level,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      description: alert.description,
      impact: alert.impact,
      recommendations: alert.recommendations
    })
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