/**
 * Comprehensive Performance Monitoring System - Helpers
 *
 * Standalone helper functions for the performance monitoring system.
 */

import {
  PerformanceMetric,
  CoreWebVitals,
  AlertDispatchMetrics,
  DatabaseQueryMetrics,
  SystemResourceMetrics,
  PerformanceAlert,
  PerformanceAlertLevel,
  PERFORMANCE_THRESHOLDS
} from './monitor-types'

// Summary shape returned by performance summaries
export type PerformanceSummary = {
  api: { avgResponseTime: number; requestsPerSecond: number; errorRate: number }
  database: { avgQueryTime: number; cacheHitRate: number; slowQueries: number }
  frontend: { lcp: number; fid: number; cls: number; fcp: number }
  alerts: { critical: number; warning: number; total: number }
  system: { cpuUsage: number; memoryUsage: number; activeConnections: number }
}

// Minimal supabase-like client interface used by persistence helpers.
// Typed loosely because the monitored tables (performance_metrics, etc.)
// are not part of the generated Database types.
export type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns?: string) => SupabaseQueryBuilder
    insert: (row: Record<string, unknown>) => SupabaseQueryBuilder
    upsert: (row: Record<string, unknown>) => SupabaseQueryBuilder
    delete: () => SupabaseQueryBuilder
  }
}

export type SupabaseQueryBuilder = {
  eq: (column: string, value: unknown) => SupabaseQueryBuilder
  gte: (column: string, value: unknown) => SupabaseQueryBuilder
  lt: (column: string, value: unknown) => SupabaseQueryBuilder
  order: (column: string, opts?: { ascending?: boolean }) => SupabaseQueryBuilder
  limit: (count: number) => SupabaseQueryBuilder
  range: (from: number, to: number) => SupabaseQueryBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
  then: <T>(onfulfilled: (value: { data: unknown; error: unknown }) => T) => Promise<T>
}

/**
 * Generate a unique metric id
 */
export function generateMetricId(): string {
  return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique timer id
 */
export function generateTimerId(): string {
  return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique alert id
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get impact description for a metric
 */
export function getMetricImpact(metric: PerformanceMetric): string {
  const impactMap: Record<string, string> = {
    emergency_alert_response_time: 'Critical impact on emergency response effectiveness',
    database_query_execution_time: 'Degraded API performance and user experience',
    largest_contentful_paint: 'Poor user experience, slow perceived load time',
    cpu_usage: 'System performance degradation, potential service disruption',
    alert_dispatch_latency: 'Delayed emergency notifications, potentially life-threatening'
  }

  return impactMap[metric.name] || 'Performance degradation'
}

/**
 * Get recommendations for a metric
 */
export function getMetricRecommendations(metric: PerformanceMetric): string[] {
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

/**
 * Get thresholds for a metric (returns array of level/value pairs to evaluate)
 */
export function getThresholdsForMetric(metric: PerformanceMetric): Array<{ level: PerformanceAlertLevel; value: number }> {
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

/**
 * Build alert objects for Core Web Vitals threshold violations
 */
export function getWebVitalsAlerts(vitals: CoreWebVitals): Array<Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>> {
  const alerts: Array<Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>> = []

  if (vitals.lcp > PERFORMANCE_THRESHOLDS.web_vitals.lcp) {
    alerts.push({
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
    alerts.push({
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
    alerts.push({
      level: PerformanceAlertLevel.WARNING,
      metric: 'cumulative_layout_shift',
      currentValue: vitals.cls,
      threshold: PERFORMANCE_THRESHOLDS.web_vitals.cls,
      description: `CLS exceeded threshold: ${vitals.cls} > ${PERFORMANCE_THRESHOLDS.web_vitals.cls}`,
      impact: 'Visual instability, poor user experience',
      recommendations: ['Include size dimensions for images/videos', 'Reserve space for dynamic content', 'Avoid inserting content above existing content']
    })
  }

  return alerts
}

/**
 * Build alert object for alert dispatch latency threshold violation (if any)
 */
export function getAlertDispatchAlert(metrics: AlertDispatchMetrics): Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'> | null {
  const threshold = PERFORMANCE_THRESHOLDS.alert_dispatch[metrics.deliveryMethod]

  if (metrics.latency > threshold) {
    return {
      level: PerformanceAlertLevel.CRITICAL,
      metric: 'alert_dispatch_latency',
      currentValue: metrics.latency,
      threshold,
      description: `Alert dispatch latency exceeded threshold: ${metrics.latency}ms > ${threshold}ms`,
      impact: 'Delayed emergency notifications, potentially life-threatening',
      recommendations: ['Optimize notification service', 'Implement queue-based processing', 'Add redundant delivery channels']
    }
  }

  return null
}

/**
 * Build alert object for database query threshold violation (if any)
 */
export function getDatabaseQueryAlert(metrics: DatabaseQueryMetrics): Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'> | null {
  const threshold = PERFORMANCE_THRESHOLDS.database[metrics.queryType]

  if (metrics.executionTime > threshold) {
    return {
      level: PerformanceAlertLevel.WARNING,
      metric: 'database_query_execution_time',
      currentValue: metrics.executionTime,
      threshold,
      description: `Slow database query: ${metrics.executionTime}ms > ${threshold}ms`,
      impact: 'Slow API responses, degraded user experience',
      recommendations: ['Add appropriate indexes', 'Optimize query structure', 'Consider query caching']
    }
  }

  return null
}

/**
 * Build alert objects for system resource threshold violations
 */
export function getSystemResourceAlerts(metrics: SystemResourceMetrics): Array<Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>> {
  const alerts: Array<Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>> = []

  if (metrics.cpuUsage > PERFORMANCE_THRESHOLDS.system.cpu_usage) {
    alerts.push({
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
    alerts.push({
      level: PerformanceAlertLevel.WARNING,
      metric: 'memory_usage',
      currentValue: metrics.memoryUsage,
      threshold: PERFORMANCE_THRESHOLDS.system.memory_usage,
      description: `High memory usage: ${metrics.memoryUsage}% > ${PERFORMANCE_THRESHOLDS.system.memory_usage}%`,
      impact: 'Memory pressure, potential outages',
      recommendations: ['Optimize memory usage', 'Implement memory caching', 'Scale memory resources']
    })
  }

  return alerts
}

/**
 * Determine if an alert should be escalated based on its level and age
 */
export function shouldEscalateAlert(alert: PerformanceAlert): boolean {
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

/**
 * Determine if an alert should be auto-resolved based on recent metrics
 */
export function shouldAutoResolveAlert(alert: PerformanceAlert, metrics: PerformanceMetric[]): boolean {
  // Auto-resolve if recent metrics show improvement
  const recentMetrics = metrics.filter(m =>
    m.name === alert.metric
    && m.timestamp > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
  )

  if (recentMetrics.length === 0) {
    return false
  }

  const avgRecentValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length

  return avgRecentValue <= alert.threshold * 0.9 // 90% of threshold
}

/**
 * Map a database metric row to a PerformanceMetric object
 */
export function mapMetricRow(row: Record<string, unknown>): PerformanceMetric {
  return {
    id: row.id as string,
    timestamp: new Date(row.timestamp as string),
    type: row.type as PerformanceMetric['type'],
    name: row.name as string,
    value: row.value as number,
    unit: row.unit as PerformanceMetric['unit'],
    tags: row.tags as Record<string, string> | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined
  } as PerformanceMetric
}

/**
 * Calculate a performance summary from recent metrics and active alerts
 */
export function calculatePerformanceSummary(
  metrics: PerformanceMetric[],
  activeAlerts: PerformanceAlert[]
): PerformanceSummary {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const recentMetrics = metrics.filter(m => m.timestamp >= oneHourAgo)

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

  const fcpMetrics = frontendMetrics.filter(m => m.name === 'first_contentful_paint')
  const avgFcp = fcpMetrics.length > 0
    ? fcpMetrics.reduce((sum, m) => sum + m.value, 0) / fcpMetrics.length
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
      fcp: avgFcp
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
 * Collect current system resource metrics from the Node.js process
 */
export function collectProcessSystemMetrics(activeConnections: number): SystemResourceMetrics {
  const usage = process.cpuUsage()
  const memUsage = process.memoryUsage()

  return {
    timestamp: new Date(),
    cpuUsage: (usage.user + usage.system) / 1000000, // Convert to seconds
    memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    diskUsage: 0, // TODO: Implement disk usage monitoring
    networkIO: {
      bytesIn: 0, // TODO: Implement network I/O monitoring
      bytesOut: 0
    },
    activeConnections,
    queueDepth: 0 // TODO: Implement queue depth monitoring
  }
}

/**
 * Persist a metric to the performance_metrics table
 */
export async function persistMetric(client: SupabaseLikeClient, metric: PerformanceMetric): Promise<void> {
  try {
    await client
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

/**
 * Persist an alert to the performance_alerts table
 */
export async function persistAlert(client: SupabaseLikeClient, alert: PerformanceAlert): Promise<void> {
  try {
    await client
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

/**
 * Load recent metrics from the performance_metrics table
 */
export async function loadRecentMetrics(client: SupabaseLikeClient, hours = 24): Promise<PerformanceMetric[]> {
  try {
    const { data, error } = await client
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(10000)

    if (error) {
      console.error('[PerformanceMonitor] Error loading metrics:', error)
      return []
    }

    return ((data as Record<string, unknown>[]) || []).map(mapMetricRow)
  } catch (error) {
    console.error('[PerformanceMonitor] Error loading metrics:', error)
    return []
  }
}

/**
 * Delete metrics and alerts older than the given cutoff time
 */
export async function cleanupOldMetrics(client: SupabaseLikeClient, cutoffTime: Date): Promise<void> {
  try {
    await client
      .from('performance_metrics')
      .delete()
      .lt('timestamp', cutoffTime.toISOString())

    await client
      .from('performance_alerts')
      .delete()
      .lt('timestamp', cutoffTime.toISOString())
  } catch (error) {
    console.error('[PerformanceMonitor] Error cleaning up old metrics:', error)
  }
}

/**
 * Send a performance alert notification (currently just logs).
 */
export function sendPerformanceAlertNotification(alert: PerformanceAlert): void {
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
