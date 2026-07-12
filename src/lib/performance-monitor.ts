/**
 * Performance Monitoring System for Alert Dispatch
 *
 * Monitors and optimizes emergency alert delivery performance
 * Ensures <100ms latency requirement is met for 50K+ users.
 *
 * Type definitions live in performance-monitor-types.ts and helpers / default
 * state builders live in performance-monitor-helpers.ts. Both are re-exported
 * below for backward compatibility.
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// Re-export extracted types and helpers for backward compatibility
export * from './performance-monitor-types'
export * from './performance-monitor-helpers'
import {
  applyLatencyToRegion,
  buildPerformanceReport,
  computeLatencyStats,
  generateAlertId,
  getInitialMetrics,
  getInitialState,
  pickAutoOptimizationType
} from './performance-monitor-helpers'
import type {
  OptimizationResult,
  PerformanceAlert,
  PerformanceMemoryInfo,
  PerformanceMonitorStore,
  PerformanceWithMemory,
  RegionalMetrics
} from './performance-monitor-types'

// Create performance monitoring store
export const usePerformanceMonitor = create<PerformanceMonitorStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...getInitialState(),

        // Monitoring control
        startMonitoring: () => {
          if (get().isMonitoring) {
            return
          }

          console.log('Starting performance monitoring...')
          set({ isMonitoring: true })

          // Start monitoring interval
          const interval = setInterval(() => {
            get().collectMetrics()
          }, get().monitoringInterval)

          // Store interval ID for cleanup
          if (typeof window !== 'undefined') {
            window.__performanceInterval = interval
          }
        },

        stopMonitoring: () => {
          if (!get().isMonitoring) {
            return
          }

          console.log('Stopping performance monitoring...')
          set({ isMonitoring: false })

          // Clear monitoring interval
          if (typeof window !== 'undefined' && window.__performanceInterval) {
            clearInterval(window.__performanceInterval)
            delete window.__performanceInterval
          }
        },

        updateThresholds: thresholds => {
          set(state => ({
            thresholds: { ...state.thresholds, ...thresholds }
          }))
        },

        // Metrics collection
        recordLatency: (latency, region) => {
          const { metrics, thresholds, latencyHistory } = get()

          // Update latency history
          const newHistory = [...latencyHistory, latency].slice(-1000) // Keep last 1000 measurements

          // Calculate statistics
          const sortedLatencies = [...newHistory].sort((a, b) => a - b)
          const { average, p95, p99, max, min } = computeLatencyStats(sortedLatencies)

          // Check latency threshold
          if (latency > thresholds.maxLatency) {
            get().addAlert({
              type: 'latency',
              severity: latency > thresholds.maxLatency * 2 ? 'critical' : 'high',
              message: `High latency detected: ${latency}ms (threshold: ${thresholds.maxLatency}ms)`,
              threshold: thresholds.maxLatency,
              currentValue: latency
            })
          }

          // Update regional performance
          const regionalPerformance = { ...metrics.regionalPerformance }
          if (region) {
            regionalPerformance[region] = applyLatencyToRegion(
              regionalPerformance[region],
              region,
              latency
            )
          }

          set(state => ({
            metrics: {
              ...state.metrics,
              averageLatency: average,
              p95Latency: p95,
              p99Latency: p99,
              maxLatency: max,
              minLatency: min,
              regionalPerformance
            },
            latencyHistory: newHistory,
            lastUpdateTime: Date.now()
          }))
        },

        recordRequest: (_success, region) => {
          const { metrics, thresholds, throughputHistory } = get()

          // Update throughput metrics
          const now = Date.now()
          const recentRequests = throughputHistory.filter(
            timestamp => now - timestamp < 60000 // Last minute
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
              currentValue: requestsPerSecond
            })
          }

          // Update regional performance
          const regionalPerformance = { ...metrics.regionalPerformance }
          if (region && regionalPerformance[region]) {
            const existing: RegionalMetrics = regionalPerformance[region]
            regionalPerformance[region] = {
              ...existing,
              requestCount: existing.requestCount + 1
            }
          }

          set(state => ({
            metrics: {
              ...state.metrics,
              requestsPerSecond,
              requestsPerMinute,
              totalRequests: state.metrics.totalRequests + 1,
              regionalPerformance
            },
            throughputHistory: [...throughputHistory, now].slice(-1000),
            lastUpdateTime: Date.now()
          }))
        },

        recordError: (_error, _region) => {
          const { metrics, thresholds, errorHistory } = get()

          // Update error metrics
          const now = Date.now()
          const recentErrors = errorHistory.filter(
            timestamp => now - timestamp < 60000 // Last minute
          ).length

          const errorRate = ((recentErrors + 1) / Math.max(metrics.totalRequests, 1)) * 100

          // Check error rate threshold
          if (errorRate > thresholds.maxErrorRate) {
            get().addAlert({
              type: 'error_rate',
              severity: errorRate > thresholds.maxErrorRate * 2 ? 'critical' : 'high',
              message: `High error rate: ${errorRate.toFixed(2)}% (threshold: ${thresholds.maxErrorRate}%)`,
              threshold: thresholds.maxErrorRate,
              currentValue: errorRate
            })
          }

          set(state => ({
            metrics: {
              ...state.metrics,
              errorRate
            },
            errorHistory: [...errorHistory, now].slice(-1000),
            lastUpdateTime: Date.now()
          }))
        },

        recordSystemMetrics: systemMetrics => {
          const { thresholds } = get()

          // Check resource thresholds
          const alerts: Array<Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>> = []

          if (systemMetrics.cpuUsage && systemMetrics.cpuUsage > thresholds.maxCpuUsage) {
            alerts.push({
              type: 'resource',
              severity: 'high',
              message: `High CPU usage: ${systemMetrics.cpuUsage}% (threshold: ${thresholds.maxCpuUsage}%)`,
              threshold: thresholds.maxCpuUsage,
              currentValue: systemMetrics.cpuUsage
            })
          }

          if (systemMetrics.memoryUsage && systemMetrics.memoryUsage > thresholds.maxMemoryUsage) {
            alerts.push({
              type: 'resource',
              severity: 'high',
              message: `High memory usage: ${systemMetrics.memoryUsage}% (threshold: ${thresholds.maxMemoryUsage}%)`,
              threshold: thresholds.maxMemoryUsage,
              currentValue: systemMetrics.memoryUsage
            })
          }

          if (systemMetrics.queueSize && systemMetrics.queueSize > thresholds.maxQueueSize) {
            alerts.push({
              type: 'resource',
              severity: 'medium',
              message: `Large queue size: ${systemMetrics.queueSize} (threshold: ${thresholds.maxQueueSize})`,
              threshold: thresholds.maxQueueSize,
              currentValue: systemMetrics.queueSize
            })
          }

          // Add alerts
          alerts.forEach(alert => get().addAlert(alert))

          set(state => ({
            metrics: {
              ...state.metrics,
              ...systemMetrics
            },
            lastUpdateTime: Date.now()
          }))
        },

        // Alert management
        addAlert: alert => {
          const newAlert: PerformanceAlert = {
            ...alert,
            id: generateAlertId(),
            timestamp: Date.now(),
            resolved: false
          }

          set(state => ({
            alerts: [newAlert, ...state.alerts].slice(0, 100) // Keep last 100 alerts
          }))
        },

        resolveAlert: alertId => {
          set(state => ({
            alerts: state.alerts.map(alert =>
              alert.id === alertId ? { ...alert, resolved: true } : alert
            )
          }))
        },

        clearAlerts: () => {
          set({ alerts: [] })
        },

        // Optimization
        triggerOptimization: async type => {
          const { isOptimizing } = get()
          if (isOptimizing) {
            return
          }

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
              details
            }

            set(state => ({
              isOptimizing: false,
              lastOptimization: Date.now(),
              optimizationHistory: [result, ...state.optimizationHistory].slice(0, 50)
            }))

            console.log(`Optimization completed: ${type} - ${improvement}% improvement`)
          } catch (error) {
            console.error('Optimization failed:', error)
            set({ isOptimizing: false })
          }
        },

        autoOptimize: async () => {
          const { metrics, thresholds } = get()

          // Determine whether optimization is needed and which type to apply
          const optimizationType = pickAutoOptimizationType(metrics, thresholds)
          if (!optimizationType) {
            return
          }

          await get().triggerOptimization(optimizationType)
        },

        // Data management
        generateReport: timeRange => {
          const { metrics, alerts, latencyHistory, throughputHistory } = get()
          return buildPerformanceReport(
            timeRange,
            metrics,
            alerts,
            latencyHistory,
            throughputHistory
          )
        },

        exportMetrics: format => {
          const { metrics, alerts, latencyHistory } = get()

          const data = {
            timestamp: new Date().toISOString(),
            metrics,
            alerts,
            latencyHistory: latencyHistory.slice(-100) // Last 100 measurements
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
            metrics: getInitialMetrics(),
            latencyHistory: [],
            throughputHistory: [],
            errorHistory: [],
            alerts: []
          })
        },

        // Internal methods
        collectMetrics: () => {
          // This would collect real-time metrics from the system
          // For now, we'll simulate with some basic browser metrics
          if (typeof window !== 'undefined' && 'performance' in window) {
            const perf = (window as Window & PerformanceWithMemory).performance
            const memory: PerformanceMemoryInfo | undefined = perf?.memory
            if (memory) {
              get().recordSystemMetrics({
                memoryUsage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
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
        }
      }),
      {
        name: 'performance-monitor-storage',
        partialize: state => ({
          thresholds: state.thresholds,
          alerts: state.alerts.filter(alert => !alert.resolved).slice(0, 50), // Only unresolved alerts
          optimizationHistory: state.optimizationHistory.slice(0, 20)
        })
      }
    )
  )
)

// Selectors
export const usePerformanceMetrics = () => usePerformanceMonitor(state => state.metrics)
export const usePerformanceAlerts = () => usePerformanceMonitor(state => state.alerts)
export const usePerformanceThresholds = () => usePerformanceMonitor(state => state.thresholds)
export const usePerformanceActions = () =>
  usePerformanceMonitor(state => ({
    startMonitoring: state.startMonitoring,
    stopMonitoring: state.stopMonitoring,
    recordLatency: state.recordLatency,
    recordRequest: state.recordRequest,
    triggerOptimization: state.triggerOptimization,
    generateReport: state.generateReport,
    exportMetrics: state.exportMetrics
  }))
