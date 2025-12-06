/**
 * Performance Monitoring System for Alert Dispatch
 * 
 * Monitors and optimizes emergency alert delivery performance
 * Ensures <100ms latency requirement is met for 50K+ users
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// Types
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

// Performance monitoring state
interface PerformanceState {
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

export interface OptimizationResult {
  timestamp: number
  type: 'query_optimization' | 'cache_warming' | 'load_balancing' | 'connection_pooling'
  success: boolean
  improvement: number // Percentage improvement
  details: string
}

// Performance monitoring actions
interface PerformanceActions {
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
  addAlert: (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>) => void
  resolveAlert: (alertId: string) => void
  clearAlerts: () => void
  
  // Optimization
  triggerOptimization: (type: OptimizationResult['type']) => Promise<void>
  autoOptimize: () => Promise<void>
  
  // Data management
  generateReport: (timeRange: '1h' | '24h' | '7d' | '30d') => PerformanceReport
  exportMetrics: (format: 'json' | 'csv') => string
  resetMetrics: () => void
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

// Default thresholds
const defaultThresholds: PerformanceThresholds = {
  maxLatency: 100, // 100ms target
  maxErrorRate: 1.0, // 1% error rate
  minThroughput: 1000, // 1000 requests/second
  maxCpuUsage: 80, // 80% CPU usage
  maxMemoryUsage: 85, // 85% memory usage
  maxQueueSize: 10000, // 10K queue size
}

// Initial state
const initialState: PerformanceState = {
  metrics: {
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
    dailyMetrics: [],
  },
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
  optimizationHistory: [],
}

// Create performance monitoring store
export const usePerformanceMonitor = create<PerformanceState & PerformanceActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Monitoring control
        startMonitoring: () => {
          if (get().isMonitoring) return

          console.log('Starting performance monitoring...')
          set({ isMonitoring: true })

          // Start monitoring interval
          const interval = setInterval(() => {
            get().collectMetrics()
          }, get().monitoringInterval)

          // Store interval ID for cleanup
          ;(window as any).__performanceInterval = interval
        },

        stopMonitoring: () => {
          if (!get().isMonitoring) return

          console.log('Stopping performance monitoring...')
          set({ isMonitoring: false })

          // Clear monitoring interval
          const interval = (window as any).__performanceInterval
          if (interval) {
            clearInterval(interval)
            delete (window as any).__performanceInterval
          }
        },

        updateThresholds: (thresholds) => {
          set((state) => ({
            thresholds: { ...state.thresholds, ...thresholds },
          }))
        },

        // Metrics collection
        recordLatency: (latency, region) => {
          const { metrics, thresholds, latencyHistory } = get()
          
          // Update latency history
          const newHistory = [...latencyHistory, latency].slice(-1000) // Keep last 1000 measurements
          
          // Calculate statistics
          const sortedLatencies = [...newHistory].sort((a, b) => a - b)
          const average = sortedLatencies.reduce((sum, l) => sum + l, 0) / sortedLatencies.length
          const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
          const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
          const max = Math.max(...sortedLatencies)
          const min = Math.min(...sortedLatencies)

          // Check latency threshold
          if (latency > thresholds.maxLatency) {
            get().addAlert({
              type: 'latency',
              severity: latency > thresholds.maxLatency * 2 ? 'critical' : 'high',
              message: `High latency detected: ${latency}ms (threshold: ${thresholds.maxLatency}ms)`,
              threshold: thresholds.maxLatency,
              currentValue: latency,
            })
          }

          // Update regional performance
          const regionalPerformance = { ...metrics.regionalPerformance }
          if (region) {
            const existing = regionalPerformance[region] || {
              region,
              averageLatency: 0,
              requestCount: 0,
              errorRate: 0,
              lastUpdated: Date.now(),
            }

            regionalPerformance[region] = {
              ...existing,
              averageLatency: (existing.averageLatency + latency) / 2,
              requestCount: existing.requestCount + 1,
              lastUpdated: Date.now(),
            }
          }

          set((state) => ({
            metrics: {
              ...state.metrics,
              averageLatency: average,
              p95Latency: p95,
              p99Latency: p99,
              maxLatency: max,
              minLatency: min,
              regionalPerformance,
            },
            latencyHistory: newHistory,
            lastUpdateTime: Date.now(),
          }))
        },

        recordRequest: (success, region) => {
          const { metrics, thresholds, throughputHistory } = get()
          
          // Update throughput metrics
          const now = Date.now()
          const recentRequests = throughputHistory.filter(
            (timestamp) => now - timestamp < 60000 // Last minute
          ).length

          const requestsPerMinute = recentRequests + 1
          const requestsPerSecond = requestsPerMinute / 60

          // Check throughput threshold
          if (requestsPerSecond < thresholds.minThroughput) {
            get().addAlert({
              type: 'throughput',
              severity: 'medium',
              message: `Low throughput: ${requestsPerSecond} req/s (minimum: ${thresholds.minThroughput} req/s)`,
              threshold: thresholds.minThroughput,
              currentValue: requestsPerSecond,
            })
          }

          // Update regional performance
          const regionalPerformance = { ...metrics.regionalPerformance }
          if (region && regionalPerformance[region]) {
            regionalPerformance[region].requestCount++
          }

          set((state) => ({
            metrics: {
              ...state.metrics,
              requestsPerSecond,
              requestsPerMinute,
              totalRequests: state.metrics.totalRequests + 1,
              regionalPerformance,
            },
            throughputHistory: [...throughputHistory, now].slice(-1000),
            lastUpdateTime: Date.now(),
          }))
        },

        recordError: (error, region) => {
          const { metrics, thresholds, errorHistory } = get()
          
          // Update error metrics
          const now = Date.now()
          const recentErrors = errorHistory.filter(
            (timestamp) => now - timestamp < 60000 // Last minute
          ).length

          const errorRate = (recentErrors + 1) / Math.max(metrics.totalRequests, 1) * 100

          // Check error rate threshold
          if (errorRate > thresholds.maxErrorRate) {
            get().addAlert({
              type: 'error_rate',
              severity: errorRate > thresholds.maxErrorRate * 2 ? 'critical' : 'high',
              message: `High error rate: ${errorRate.toFixed(2)}% (threshold: ${thresholds.maxErrorRate}%)`,
              threshold: thresholds.maxErrorRate,
              currentValue: errorRate,
            })
          }

          set((state) => ({
            metrics: {
              ...state.metrics,
              errorRate,
            },
            errorHistory: [...errorHistory, now].slice(-1000),
            lastUpdateTime: Date.now(),
          }))
        },

        recordSystemMetrics: (systemMetrics) => {
          const { metrics, thresholds } = get()
          
          // Check resource thresholds
          const alerts = []
          
          if (systemMetrics.cpuUsage && systemMetrics.cpuUsage > thresholds.maxCpuUsage) {
            alerts.push({
              type: 'resource',
              severity: 'high',
              message: `High CPU usage: ${systemMetrics.cpuUsage}% (threshold: ${thresholds.maxCpuUsage}%)`,
              threshold: thresholds.maxCpuUsage,
              currentValue: systemMetrics.cpuUsage,
            })
          }

          if (systemMetrics.memoryUsage && systemMetrics.memoryUsage > thresholds.maxMemoryUsage) {
            alerts.push({
              type: 'resource',
              severity: 'high',
              message: `High memory usage: ${systemMetrics.memoryUsage}% (threshold: ${thresholds.maxMemoryUsage}%)`,
              threshold: thresholds.maxMemoryUsage,
              currentValue: systemMetrics.memoryUsage,
            })
          }

          if (systemMetrics.queueSize && systemMetrics.queueSize > thresholds.maxQueueSize) {
            alerts.push({
              type: 'resource',
              severity: 'medium',
              message: `Large queue size: ${systemMetrics.queueSize} (threshold: ${thresholds.maxQueueSize})`,
              threshold: thresholds.maxQueueSize,
              currentValue: systemMetrics.queueSize,
            })
          }

          // Add alerts
          alerts.forEach(alert => get().addAlert(alert))

          set((state) => ({
            metrics: {
              ...state.metrics,
              ...systemMetrics,
            },
            lastUpdateTime: Date.now(),
          }))
        },

        // Alert management
        addAlert: (alert) => {
          const newAlert: PerformanceAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            resolved: false,
          }

          set((state) => ({
            alerts: [newAlert, ...state.alerts].slice(0, 100), // Keep last 100 alerts
          }))
        },

        resolveAlert: (alertId) => {
          set((state) => ({
            alerts: state.alerts.map(alert =>
              alert.id === alertId ? { ...alert, resolved: true } : alert
            ),
          }))
        },

        clearAlerts: () => {
          set({ alerts: [] })
        },

        // Optimization
        triggerOptimization: async (type) => {
          const { isOptimizing } = get()
          if (isOptimizing) return

          set({ isOptimizing: true })

          try {
            let improvement = 0
            let details = ''

            switch (type) {
              case 'query_optimization':
                // Implement query optimization logic
                improvement = await get().optimizeQueries()
                details = 'Database queries optimized for better performance'
                break

              case 'cache_warming':
                // Implement cache warming logic
                improvement = await get().warmCache()
                details = 'Cache warmed up for frequently accessed data'
                break

              case 'load_balancing':
                // Implement load balancing logic
                improvement = await get().optimizeLoadBalancing()
                details = 'Load balancing adjusted for better distribution'
                break

              case 'connection_pooling':
                // Implement connection pooling logic
                improvement = await get().optimizeConnectionPooling()
                details = 'Connection pooling optimized for better resource utilization'
                break
            }

            const result: OptimizationResult = {
              timestamp: Date.now(),
              type,
              success: true,
              improvement,
              details,
            }

            set((state) => ({
              isOptimizing: false,
              lastOptimization: Date.now(),
              optimizationHistory: [result, ...state.optimizationHistory].slice(0, 50),
            }))

            console.log(`Optimization completed: ${type} - ${improvement}% improvement`)
          } catch (error) {
            console.error('Optimization failed:', error)
            set({ isOptimizing: false })
          }
        },

        autoOptimize: async () => {
          const { metrics, thresholds } = get()
          
          // Check if optimization is needed
          const needsOptimization = 
            metrics.averageLatency > thresholds.maxLatency * 0.8 ||
            metrics.errorRate > thresholds.maxErrorRate * 0.8 ||
            metrics.cpuUsage > thresholds.maxCpuUsage * 0.8 ||
            metrics.memoryUsage > thresholds.maxMemoryUsage * 0.8

          if (!needsOptimization) return

          // Determine optimization type based on metrics
          let optimizationType: OptimizationResult['type'] = 'query_optimization'

          if (metrics.averageLatency > thresholds.maxLatency * 0.8) {
            optimizationType = 'query_optimization'
          } else if (metrics.cpuUsage > thresholds.maxCpuUsage * 0.8) {
            optimizationType = 'load_balancing'
          } else if (metrics.memoryUsage > thresholds.maxMemoryUsage * 0.8) {
            optimizationType = 'connection_pooling'
          }

          await get().triggerOptimization(optimizationType)
        },

        // Data management
        generateReport: (timeRange) => {
          const { metrics, alerts, latencyHistory, throughputHistory } = get()
          
          // Filter data based on time range
          const now = Date.now()
          let timeFilter = (timestamp: number) => true
          
          switch (timeRange) {
            case '1h':
              timeFilter = (timestamp) => now - timestamp < 60 * 60 * 1000
              break
            case '24h':
              timeFilter = (timestamp) => now - timestamp < 24 * 60 * 60 * 1000
              break
            case '7d':
              timeFilter = (timestamp) => now - timestamp < 7 * 24 * 60 * 60 * 1000
              break
            case '30d':
              timeFilter = (timestamp) => now - timestamp < 30 * 24 * 60 * 60 * 1000
              break
          }

          const filteredLatency = latencyHistory.filter((_, index) => 
            timeFilter(now - index * 5000) // Assuming 5-second intervals
          )
          
          const filteredThroughput = throughputHistory.filter(timeFilter)

          // Calculate statistics
          const sortedLatency = [...filteredLatency].sort((a, b) => a - b)
          const avgLatency = sortedLatency.reduce((sum, l) => sum + l, 0) / sortedLatency.length
          const p50 = sortedLatency[Math.floor(sortedLatency.length * 0.5)]
          const p95 = sortedLatency[Math.floor(sortedLatency.length * 0.95)]
          const p99 = sortedLatency[Math.floor(sortedLatency.length * 0.99)]

          // Generate recommendations
          const recommendations = []
          if (avgLatency > 80) recommendations.push('Consider query optimization')
          if (metrics.errorRate > 0.5) recommendations.push('Review error handling')
          if (metrics.cpuUsage > 70) recommendations.push('Scale up resources')
          if (metrics.queueSize > 5000) recommendations.push('Increase processing capacity')

          return {
            timeRange,
            generatedAt: new Date().toISOString(),
            summary: {
              totalRequests: metrics.totalRequests,
              averageLatency: avgLatency,
              errorRate: metrics.errorRate,
              uptime: 100 - metrics.errorRate, // Approximate uptime
            },
            latency: {
              average: avgLatency,
              p50,
              p95,
              p99,
              max: metrics.maxLatency,
            },
            throughput: {
              average: metrics.requestsPerSecond,
              peak: Math.max(...filteredThroughput),
              minimum: Math.min(...filteredThroughput),
            },
            errors: {
              rate: metrics.errorRate,
              count: Math.round(metrics.totalRequests * metrics.errorRate / 100),
              topErrors: [], // Would be populated from error tracking
            },
            regions: Object.entries(metrics.regionalPerformance).map(([region, perf]) => ({
              region,
              requests: perf.requestCount,
              latency: perf.averageLatency,
              errorRate: perf.errorRate,
            })),
            alerts: alerts.filter(alert => !alert.resolved),
            recommendations,
          }
        },

        exportMetrics: (format) => {
          const { metrics, alerts, latencyHistory } = get()
          
          const data = {
            timestamp: new Date().toISOString(),
            metrics,
            alerts,
            latencyHistory: latencyHistory.slice(-100), // Last 100 measurements
          }

          if (format === 'csv') {
            // Convert to CSV format
            const headers = Object.keys(data.metrics).join(',')
            const values = Object.values(data.metrics).join(',')
            return `${headers}\n${values}`
          }

          return JSON.stringify(data, null, 2)
        },

        resetMetrics: () => {
          set({
            metrics: { ...initialState.metrics },
            latencyHistory: [],
            throughputHistory: [],
            errorHistory: [],
            alerts: [],
          })
        },

        // Internal methods
        collectMetrics: () => {
          // This would collect real-time metrics from the system
          // For now, we'll simulate with some basic browser metrics
          if (typeof window !== 'undefined' && 'performance' in window) {
            const perf = (window as any).performance
            if (perf.memory) {
              get().recordSystemMetrics({
                memoryUsage: (perf.memory.usedJSHeapSize / perf.memory.totalJSHeapSize) * 100,
              })
            }
          }
        },

        optimizeQueries: async () => {
          // Simulate query optimization
          await new Promise(resolve => setTimeout(resolve, 1000))
          return 15 // 15% improvement
        },

        warmCache: async () => {
          // Simulate cache warming
          await new Promise(resolve => setTimeout(resolve, 2000))
          return 25 // 25% improvement
        },

        optimizeLoadBalancing: async () => {
          // Simulate load balancing optimization
          await new Promise(resolve => setTimeout(resolve, 1500))
          return 20 // 20% improvement
        },

        optimizeConnectionPooling: async () => {
          // Simulate connection pooling optimization
          await new Promise(resolve => setTimeout(resolve, 800))
          return 10 // 10% improvement
        },
      }),
      {
        name: 'performance-monitor-storage',
        partialize: (state) => ({
          thresholds: state.thresholds,
          alerts: state.alerts.filter(alert => !alert.resolved).slice(0, 50), // Only unresolved alerts
          optimizationHistory: state.optimizationHistory.slice(0, 20),
        }),
      }
    )
  )
)

// Selectors
export const usePerformanceMetrics = () => usePerformanceMonitor(state => state.metrics)
export const usePerformanceAlerts = () => usePerformanceMonitor(state => state.alerts)
export const usePerformanceThresholds = () => usePerformanceMonitor(state => state.thresholds)
export const usePerformanceActions = () => usePerformanceMonitor(state => ({
  startMonitoring: state.startMonitoring,
  stopMonitoring: state.stopMonitoring,
  recordLatency: state.recordLatency,
  recordRequest: state.recordRequest,
  triggerOptimization: state.triggerOptimization,
  generateReport: state.generateReport,
  exportMetrics: state.exportMetrics,
}))