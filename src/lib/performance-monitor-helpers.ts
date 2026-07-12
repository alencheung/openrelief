/**
 * Performance Monitoring System - Helper Functions
 *
 * Default configuration, initial state builders and pure helpers extracted
 * from performance-monitor.ts to keep the main module under the 500 line
 * lint budget.
 */

import type {
  OptimizationResult,
  PerformanceAlert,
  PerformanceMetrics,
  PerformanceReport,
  PerformanceState,
  PerformanceThresholds,
  RegionalMetrics
} from './performance-monitor-types'

// Default thresholds
export const defaultThresholds: PerformanceThresholds = {
  maxLatency: 100, // 100ms target
  maxErrorRate: 1.0, // 1% error rate
  minThroughput: 1000, // 1000 requests/second
  maxCpuUsage: 80, // 80% CPU usage
  maxMemoryUsage: 85, // 85% memory usage
  maxQueueSize: 10000 // 10K queue size
}

// Empty metrics object used for initial state and resets.
export const getInitialMetrics = (): PerformanceMetrics => ({
  averageLatency: 0,
  p95Latency: 0,
  p99Latency: 0,
  maxLatency: 0,
  minLatency: Infinity,
  requestsPerSecond: 0,
  requestsPerMinute: 0,
  totalRequests: 0,
  errorRate: 0,
  timeoutRate: 0,
  retryRate: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  activeConnections: 0,
  queueSize: 0,
  regionalPerformance: {},
  hourlyMetrics: [],
  dailyMetrics: []
})

// Initial monitoring state used when creating the store.
export const getInitialState = (): PerformanceState => ({
  metrics: getInitialMetrics(),
  thresholds: defaultThresholds,
  alerts: [],
  latencyHistory: [],
  throughputHistory: [],
  errorHistory: [],
  isMonitoring: false,
  lastUpdateTime: 0,
  monitoringInterval: 5000, // 5 seconds
  isOptimizing: false,
  lastOptimization: 0,
  optimizationHistory: []
})

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Build a timestamp filter predicate for the requested report time range.
 */
export const createTimeFilter = (
  timeRange: '1h' | '24h' | '7d' | '30d'
): ((timestamp: number) => boolean) => {
  const now = Date.now()
  switch (timeRange) {
    case '1h':
      return timestamp => now - timestamp < HOUR_MS
    case '24h':
      return timestamp => now - timestamp < DAY_MS
    case '7d':
      return timestamp => now - timestamp < 7 * DAY_MS
    case '30d':
      return timestamp => now - timestamp < 30 * DAY_MS
    default:
      return () => true
  }
}

/**
 * Generate a unique alert id.
 */
export const generateAlertId = (): string =>
  `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * Merge a latency sample into a regional performance record, returning a new
 * record without mutating the input.
 */
export const applyLatencyToRegion = (
  existing: RegionalMetrics | undefined,
  region: string,
  latency: number
): RegionalMetrics => {
  const base: RegionalMetrics = existing ?? {
    region,
    averageLatency: 0,
    requestCount: 0,
    errorRate: 0,
    lastUpdated: Date.now()
  }
  return {
    ...base,
    averageLatency: (base.averageLatency + latency) / 2,
    requestCount: base.requestCount + 1,
    lastUpdated: Date.now()
  }
}

/**
 * Compute latency percentile statistics from a sorted array of latencies.
 */
export const computeLatencyStats = (sortedLatencies: number[]) => {
  const length = sortedLatencies.length
  const average =
    length > 0 ? sortedLatencies.reduce((sum, l) => sum + l, 0) / length : 0
  const p50 = sortedLatencies[Math.floor(length * 0.5)] ?? 0
  const p95 = sortedLatencies[Math.floor(length * 0.95)] ?? 0
  const p99 = sortedLatencies[Math.floor(length * 0.99)] ?? 0
  const max = length > 0 ? sortedLatencies[length - 1] ?? 0 : 0
  const min = length > 0 ? sortedLatencies[0] ?? 0 : 0
  return { average, p50, p95, p99, max, min }
}

/**
 * Build the list of human readable recommendations based on current metrics.
 */
export const buildRecommendations = (metrics: PerformanceMetrics, avgLatency: number): string[] => {
  const recommendations: string[] = []
  if (avgLatency > 80) {
    recommendations.push('Consider query optimization')
  }
  if (metrics.errorRate > 0.5) {
    recommendations.push('Review error handling')
  }
  if (metrics.cpuUsage > 70) {
    recommendations.push('Scale up resources')
  }
  if (metrics.queueSize > 5000) {
    recommendations.push('Increase processing capacity')
  }
  return recommendations
}

/**
 * Build a full performance report for the requested time range. Pure helper
 * extracted from the store's `generateReport` action.
 */
export const buildPerformanceReport = (
  timeRange: '1h' | '24h' | '7d' | '30d',
  metrics: PerformanceMetrics,
  alerts: PerformanceAlert[],
  latencyHistory: number[],
  throughputHistory: number[]
): PerformanceReport => {
  const timeFilter = createTimeFilter(timeRange)
  const now = Date.now()

  const filteredLatency = latencyHistory.filter((_, index) =>
    timeFilter(now - index * 5000) // Assuming 5-second intervals
  )

  const filteredThroughput = throughputHistory.filter(timeFilter)

  // Calculate statistics
  const sortedLatency = [...filteredLatency].sort((a, b) => a - b)
  const { average: avgLatency, p50, p95, p99 } = computeLatencyStats(sortedLatency)
  const recommendations = buildRecommendations(metrics, avgLatency)

  return {
    timeRange,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequests: metrics.totalRequests,
      averageLatency: avgLatency,
      errorRate: metrics.errorRate,
      uptime: 100 - metrics.errorRate // Approximate uptime
    },
    latency: {
      average: avgLatency,
      p50,
      p95,
      p99,
      max: metrics.maxLatency
    },
    throughput: {
      average: metrics.requestsPerSecond,
      peak: Math.max(...filteredThroughput),
      minimum: Math.min(...filteredThroughput)
    },
    errors: {
      rate: metrics.errorRate,
      count: Math.round((metrics.totalRequests * metrics.errorRate) / 100),
      topErrors: [] // Would be populated from error tracking
    },
    regions: Object.entries(metrics.regionalPerformance).map(([region, perf]) => ({
      region,
      requests: perf.requestCount,
      latency: perf.averageLatency,
      errorRate: perf.errorRate
    })),
    alerts: alerts.filter(alert => !alert.resolved),
    recommendations
  }
}

/**
 * Determine whether auto-optimization should run and which optimization type
 * to apply based on the current metrics and thresholds. Returns `null` when
 * no optimization is needed.
 */
export const pickAutoOptimizationType = (
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds
): OptimizationResult['type'] | null => {
  const needsOptimization =
    metrics.averageLatency > thresholds.maxLatency * 0.8 ||
    metrics.errorRate > thresholds.maxErrorRate * 0.8 ||
    metrics.cpuUsage > thresholds.maxCpuUsage * 0.8 ||
    metrics.memoryUsage > thresholds.maxMemoryUsage * 0.8

  if (!needsOptimization) {
    return null
  }

  if (metrics.averageLatency > thresholds.maxLatency * 0.8) {
    return 'query_optimization'
  }
  if (metrics.cpuUsage > thresholds.maxCpuUsage * 0.8) {
    return 'load_balancing'
  }
  if (metrics.memoryUsage > thresholds.maxMemoryUsage * 0.8) {
    return 'connection_pooling'
  }
  return 'query_optimization'
}
