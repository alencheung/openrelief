/**
 * Performance Dashboard Aggregation
 *
 * Helpers for collecting and aggregating dashboard metrics. Extracted from
 * performance-dashboard.ts. These functions are pure with respect to the
 * dashboard instance: they read from the current DashboardData and return
 * the next metric snapshot. The PerformanceDashboard class wires them
 * together in collectData().
 */

import { loadTestingFramework, LoadTestMetrics } from '../testing/load-testing-framework'
import { performanceRegressionTesting } from '../testing/performance-regression-testing'
import {
  APIMetrics,
  AlertMetrics,
  Alert,
  DatabaseMetrics,
  EdgeMetrics,
  GeographicMetrics,
  RegressionMetrics,
  SystemMetrics,
  TestingMetrics,
  TrendData,
  TrendMetrics
} from './dashboard-types'

/**
 * Collect simulated system metrics for the current cycle.
 */
export function collectSystemMetrics(current: SystemMetrics): SystemMetrics {
  const cpu = 20 + Math.random() * 60
  const memory = 30 + Math.random() * 50
  const disk = 10 + Math.random() * 30
  const network = 5 + Math.random() * 40

  let health: SystemMetrics['health'] = 'healthy'
  if (cpu > 80 || memory > 85 || disk > 90) {
    health = 'critical'
  } else if (cpu > 70 || memory > 75 || disk > 80) {
    health = 'degraded'
  }

  return {
    uptime: process.uptime() * 1000,
    health,
    resourceUtilization: { cpu, memory, disk, network },
    activeUsers: Math.floor(1000 + Math.random() * 49000),
    concurrentConnections: Math.floor(100 + Math.random() * 4900),
    emergencyMode: current.emergencyMode
  }
}

/**
 * Collect simulated API metrics for the current cycle.
 */
export function collectAPIMetrics(): APIMetrics {
  const requestsPerSecond = 100 + Math.random() * 900
  const averageResponseTime = 50 + Math.random() * 450
  const p95ResponseTime = averageResponseTime * (1.5 + Math.random() * 0.5)
  const p99ResponseTime = averageResponseTime * (2 + Math.random() * 1)
  const errorRate = Math.random() * 5

  return {
    requestsPerSecond,
    averageResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    errorRate,
    statusCodes: {
      200: Math.floor(requestsPerSecond * (100 - errorRate) / 100),
      400: Math.floor(requestsPerSecond * errorRate * 0.3 / 100),
      500: Math.floor(requestsPerSecond * errorRate * 0.7 / 100)
    },
    endpoints: {
      '/api/emergency': {
        requests: Math.floor(requestsPerSecond * 0.4),
        averageResponseTime: averageResponseTime * 0.8,
        p95ResponseTime: p95ResponseTime * 0.8,
        p99ResponseTime: p99ResponseTime * 0.8,
        errorRate: errorRate * 0.5,
        statusCodes: { 200: 80, 400: 10, 500: 10 }
      },
      '/api/alerts/dispatch': {
        requests: Math.floor(requestsPerSecond * 0.2),
        averageResponseTime: averageResponseTime * 0.3,
        p95ResponseTime: p95ResponseTime * 0.3,
        p99ResponseTime: p99ResponseTime * 0.3,
        errorRate: errorRate * 0.2,
        statusCodes: { 200: 95, 400: 3, 500: 2 }
      }
    }
  }
}

/**
 * Collect simulated database metrics for the current cycle.
 */
export function collectDatabaseMetrics(): DatabaseMetrics {
  const activeConnections = Math.floor(10 + Math.random() * 90)
  const idleConnections = Math.floor(5 + Math.random() * 45)
  const averageTime = 50 + Math.random() * 150
  const p95Time = averageTime * (1.5 + Math.random() * 0.5)
  const p99Time = averageTime * (2 + Math.random() * 1)
  const queriesPerSecond = 200 + Math.random() * 800

  return {
    connections: {
      active: activeConnections,
      idle: idleConnections,
      total: activeConnections + idleConnections
    },
    queryPerformance: {
      averageTime,
      p95Time,
      p99Time,
      queriesPerSecond
    },
    cacheHitRate: 80 + Math.random() * 15,
    indexUsage: {
      emergency_location_idx: 90 + Math.random() * 10,
      emergency_severity_idx: 85 + Math.random() * 10,
      user_location_idx: 88 + Math.random() * 8
    },
    slowQueries: averageTime > 200 ? [{
      query: 'SELECT * FROM emergencies WHERE location && $1',
      executionTime: averageTime,
      timestamp: new Date(),
      parameters: {},
      frequency: Math.floor(Math.random() * 10)
    }] : []
  }
}

/**
 * Aggregate current alert metrics from the active alerts and history.
 */
export function collectAlertMetrics(
  activeAlerts: Alert[],
  alertHistory: Alert[]
): AlertMetrics {
  const resolvedAlerts = alertHistory.filter(a => a.status === 'resolved').length
  const escalatedAlerts = alertHistory.filter(a => a.status === 'escalated').length

  const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 }
  const byType: { [type: string]: number } = {}

  activeAlerts.forEach(alert => {
    bySeverity[alert.severity]++
    byType[alert.type] = (byType[alert.type] || 0) + 1
  })

  return {
    active: activeAlerts.length,
    resolved: resolvedAlerts,
    escalated: escalatedAlerts,
    bySeverity,
    byType,
    recent: activeAlerts.slice(-10)
  }
}

/**
 * Collect simulated edge metrics for the current cycle.
 */
export function collectEdgeMetrics(): EdgeMetrics {
  const cacheHitRate = 85 + Math.random() * 10
  const timeToFirstByte = 50 + Math.random() * 150
  const compressionRatio = 0.6 + Math.random() * 0.2
  const requestsPerSecond = 200 + Math.random() * 800
  const bandwidthSaved = requestsPerSecond * (1 - compressionRatio) * 1024 // KB

  return {
    cacheHitRate,
    timeToFirstByte,
    geographicLatency: {
      'na-east': 30 + Math.random() * 50,
      'na-west': 60 + Math.random() * 80,
      'eu-west': 100 + Math.random() * 100,
      'eu-central': 80 + Math.random() * 80,
      'asia-east': 150 + Math.random() * 100,
      'asia-southeast': 120 + Math.random() * 80
    },
    compressionRatio,
    requestsPerSecond,
    bandwidthSaved
  }
}

/**
 * Collect testing metrics from the load testing framework.
 */
export function collectTestingMetrics(): TestingMetrics {
  const activeTestsList = loadTestingFramework.getActiveTests()
  const activeTests = activeTestsList.filter(t => t.status === 'running').length
  const completedTests = activeTestsList.filter(t => t.status === 'completed').length
  const failedTests = activeTestsList.filter(t => t.status === 'failed').length
  const averageDuration = completedTests > 0
    ? activeTestsList.reduce((sum: number, t: LoadTestMetrics) => sum + t.duration, 0) /
      completedTests
    : 0

  return {
    activeTests,
    completedTests,
    failedTests,
    averageDuration,
    lastTestDate:
      activeTestsList.length > 0 ? activeTestsList[0]?.timestamp : undefined,
    testResults: activeTestsList.slice(0, 5).map(test => ({
      id: test.testId,
      name: test.config.name,
      type: String(test.scenario),
      status: (test.status === 'completed' ? 'passed' : test.status === 'failed' ? 'failed' : 'running') as
        | 'passed'
        | 'failed'
        | 'running',
      duration: test.duration,
      timestamp: test.timestamp,
      metrics: test.performance
    }))
  }
}

/**
 * Collect regression metrics from the regression testing framework.
 */
export function collectRegressionMetrics(): RegressionMetrics {
  const testHistory = performanceRegressionTesting.getTestHistory(5)
  const lastTest = testHistory[0]

  if (!lastTest) {
    return {
      lastTest: new Date(),
      status: 'passed',
      violations: 0,
      criticalViolations: 0,
      trends: {},
      recommendations: []
    }
  }

  const criticalViolations = lastTest.violations.filter(v => v.severity === 'critical').length
  const trends: { [metric: string]: number } = {}

  // Calculate trends from test history
  if (testHistory.length >= 2) {
    const current = testHistory[0]
    const previous = testHistory[1]
    if (current && previous) {
      current.comparisons.forEach(comparison => {
        trends[comparison.metric] = comparison.changePercent
      })
    }
  }

  return {
    lastTest: lastTest.timestamp,
    status: lastTest.status as 'passed' | 'failed' | 'warning',
    violations: lastTest.violations.length,
    criticalViolations,
    trends,
    recommendations: lastTest.recommendations
  }
}

/**
 * Collect simulated geographic metrics derived from the current active user count.
 */
export function collectGeographicMetrics(totalUsers: number): GeographicMetrics {
  const usersByRegion = {
    'na-east': Math.floor(totalUsers * 0.35),
    'na-west': Math.floor(totalUsers * 0.25),
    'eu-west': Math.floor(totalUsers * 0.20),
    'eu-central': Math.floor(totalUsers * 0.10),
    'asia-east': Math.floor(totalUsers * 0.07),
    'asia-southeast': Math.floor(totalUsers * 0.03)
  }

  const latencyByRegion = {
    'na-east': 30 + Math.random() * 50,
    'na-west': 60 + Math.random() * 80,
    'eu-west': 100 + Math.random() * 100,
    'eu-central': 80 + Math.random() * 80,
    'asia-east': 150 + Math.random() * 100,
    'asia-southeast': 120 + Math.random() * 80
  }

  const averageLatency = Object.values(latencyByRegion).reduce((sum, latency) => sum + latency, 0) / Object.keys(latencyByRegion).length

  const errorRateByRegion = {
    'na-east': Math.random() * 2,
    'na-west': Math.random() * 3,
    'eu-west': Math.random() * 2.5,
    'eu-central': Math.random() * 2,
    'asia-east': Math.random() * 4,
    'asia-southeast': Math.random() * 3.5
  }

  return {
    totalUsers,
    usersByRegion,
    averageLatency,
    latencyByRegion,
    errorRateByRegion,
    activeEmergencies: [] // Would be populated from actual emergency data
  }
}

/**
 * Push a new data point onto a trend array, returning the computed change percent.
 */
export function calculateTrendChange(trend: TrendData[], currentValue: number): number {
  if (trend.length < 2) {
    return 0
  }

  const previous = trend[trend.length - 1]
  if (!previous || previous.value === 0) {
    return 0
  }

  const change = ((currentValue - previous.value) / previous.value) * 100
  return Math.round(change * 100) / 100
}

/**
 * Append a new sample to each trend series based on the latest dashboard metrics
 * and trim each series to the last 100 data points.
 */
export function updateTrendData(
  trends: TrendMetrics,
  api: APIMetrics,
  system: SystemMetrics
): void {
  const timestamp = new Date()

  // Update response time trend
  trends.responseTime.push({
    timestamp,
    value: api.averageResponseTime,
    changePercent: calculateTrendChange(trends.responseTime, api.averageResponseTime)
  })

  // Update throughput trend
  trends.throughput.push({
    timestamp,
    value: api.requestsPerSecond,
    changePercent: calculateTrendChange(trends.throughput, api.requestsPerSecond)
  })

  // Update error rate trend
  trends.errorRate.push({
    timestamp,
    value: api.errorRate,
    changePercent: calculateTrendChange(trends.errorRate, api.errorRate)
  })

  // Update user activity trend
  trends.userActivity.push({
    timestamp,
    value: system.activeUsers,
    changePercent: calculateTrendChange(trends.userActivity, system.activeUsers)
  })

  // Update resource utilization trend
  const avgResourceUtilization = (system.resourceUtilization.cpu
                                + system.resourceUtilization.memory
                                + system.resourceUtilization.disk
                                + system.resourceUtilization.network) / 4

  trends.resourceUtilization.push({
    timestamp,
    value: avgResourceUtilization,
    changePercent: calculateTrendChange(trends.resourceUtilization, avgResourceUtilization)
  })

  // Keep only last 100 data points for each trend
  Object.keys(trends).forEach(key => {
    const trend = trends[key as keyof TrendMetrics]
    if (trend.length > 100) {
      trend.shift()
    }
  })
}
