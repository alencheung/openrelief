/**
 * Performance Monitoring System - Type Definitions
 *
 * Type definitions extracted from performance-monitor.ts to keep the main
 * module under the 500 line lint budget.
 */

export interface PerformanceMetrics {
  // Latency metrics
  averageLatency: number
  p95Latency: number
  p99Latency: number
  maxLatency: number
  minLatency: number

  // Throughput metrics
  requestsPerSecond: number
  requestsPerMinute: number
  totalRequests: number

  // Error metrics
  errorRate: number
  timeoutRate: number
  retryRate: number

  // System metrics
  cpuUsage: number
  memoryUsage: number
  activeConnections: number
  queueSize: number

  // Geographic performance
  regionalPerformance: Record<string, RegionalMetrics>

  // Time-based metrics
  hourlyMetrics: HourlyMetric[]
  dailyMetrics: DailyMetric[]
}

export interface RegionalMetrics {
  region: string
  averageLatency: number
  requestCount: number
  errorRate: number
  lastUpdated: number
}

export interface HourlyMetric {
  hour: number
  date: string
  latency: number
  throughput: number
  errors: number
}

export interface DailyMetric {
  date: string
  avgLatency: number
  totalRequests: number
  errorRate: number
  peakThroughput: number
}

export interface PerformanceAlert {
  id: string
  type: 'latency' | 'error_rate' | 'throughput' | 'resource'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  threshold: number
  currentValue: number
  timestamp: number
  resolved: boolean
}

export interface PerformanceThresholds {
  maxLatency: number // Maximum acceptable latency (ms)
  maxErrorRate: number // Maximum error rate (percentage)
  minThroughput: number // Minimum throughput (requests/second)
  maxCpuUsage: number // Maximum CPU usage (percentage)
  maxMemoryUsage: number // Maximum memory usage (percentage)
  maxQueueSize: number // Maximum queue size
}

export interface OptimizationResult {
  timestamp: number
  type: 'query_optimization' | 'cache_warming' | 'load_balancing' | 'connection_pooling'
  success: boolean
  improvement: number // Percentage improvement
  details: string
}

export interface PerformanceReport {
  timeRange: string
  generatedAt: string
  summary: {
    totalRequests: number
    averageLatency: number
    errorRate: number
    uptime: number
  }
  latency: {
    average: number
    p50: number
    p95: number
    p99: number
    max: number
  }
  throughput: {
    average: number
    peak: number
    minimum: number
  }
  errors: {
    rate: number
    count: number
    topErrors: Array<{ error: string; count: number }>
  }
  regions: Array<{
    region: string
    requests: number
    latency: number
    errorRate: number
  }>
  alerts: PerformanceAlert[]
  recommendations: string[]
}

// Performance monitoring state
export interface PerformanceState {
  // Real-time metrics
  metrics: PerformanceMetrics
  thresholds: PerformanceThresholds
  alerts: PerformanceAlert[]

  // Historical data
  latencyHistory: number[]
  throughputHistory: number[]
  errorHistory: number[]

  // Monitoring status
  isMonitoring: boolean
  lastUpdateTime: number
  monitoringInterval: number

  // Optimization status
  isOptimizing: boolean
  lastOptimization: number
  optimizationHistory: OptimizationResult[]
}

// Performance monitoring actions
export interface PerformanceActions {
  // Monitoring control
  startMonitoring: () => void
  stopMonitoring: () => void
  updateThresholds: (thresholds: Partial<PerformanceThresholds>) => void

  // Metrics collection
  recordLatency: (latency: number, region?: string) => void
  recordRequest: (success: boolean, region?: string) => void
  recordError: (error: string, region?: string) => void
  recordSystemMetrics: (metrics: Partial<PerformanceMetrics>) => void

  // Alert management
  addAlert: (alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>) => void
  resolveAlert: (alertId: string) => void
  clearAlerts: () => void

  // Optimization
  triggerOptimization: (type: OptimizationResult['type']) => Promise<void>
  autoOptimize: () => Promise<void>

  // Data management
  generateReport: (timeRange: '1h' | '24h' | '7d' | '30d') => PerformanceReport
  exportMetrics: (format: 'json' | 'csv') => string
  resetMetrics: () => void

  // Internal methods
  collectMetrics: () => void
  optimizeQueries: () => Promise<number>
  warmCache: () => Promise<number>
  optimizeLoadBalancing: () => Promise<number>
  optimizeConnectionPooling: () => Promise<number>
}

export type PerformanceMonitorStore = PerformanceState & PerformanceActions

/**
 * Augmentation of the browser Window with the interval handle used by the
 * performance monitor. Replaces the previous `window as any` casts.
 */
declare global {
  interface Window {
    __performanceInterval?: ReturnType<typeof setInterval>
  }
}

/**
 * Minimal subset of the non-standard Chrome `performance.memory` API used to
 * collect JS heap usage. Replaces the previous `window as any` casts.
 */
export interface PerformanceMemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
}

export interface PerformanceWithMemory {
  memory?: PerformanceMemoryInfo
}
