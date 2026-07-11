/**
 * Load Testing Framework - Metrics Collection and Analysis
 *
 * Pure helpers that update, derive, and analyse LoadTestMetrics during a
 * running test. Extracted from load-testing-framework.ts. Re-exported via
 * the framework module so existing imports from
 * '@/lib/testing/load-testing-framework' keep working.
 *
 * These functions operate on a LoadTestMetrics object passed in by the
 * caller; they hold no state of their own.
 */

import { LoadTestMetrics, TestEndpoint, VirtualUser } from './load-testing-types'

/**
 * Categorise an HTTP status code (or a thrown error message) into a short
 * error type slug used to bucket request errors.
 */
export function categorizeError(status: number, message?: string): string {
  if (status >= 500) {
    return 'server_error'
  }
  if (status === 429) {
    return 'rate_limit'
  }
  if (status === 401 || status === 403) {
    return 'auth_error'
  }
  if (status >= 400) {
    return 'client_error'
  }
  if (message?.includes('timeout')) {
    return 'timeout'
  }
  return 'unknown_error'
}

/**
 * Update per-request metrics for a successful or failed response: request
 * counts, error buckets, response-time extremes, and regional aggregates.
 * Mutates the supplied metrics object in place.
 */
export function updateRequestMetrics(
  metrics: LoadTestMetrics,
  responseTime: number,
  response: any,
  endpoint: TestEndpoint,
  virtualUser: VirtualUser
): void {
  // Update request counts
  metrics.requests.total++

  if (response.status === endpoint.expectedStatus) {
    metrics.requests.successful++
  } else {
    metrics.requests.failed++

    // Add to error details
    const errorType = categorizeError(response.status, response.error)
    const existingError = metrics.requests.errors.find(e => e.type === errorType)

    if (existingError) {
      existingError.count++
      if (existingError.samples.length < 10) {
        existingError.samples.push(JSON.stringify(response))
      }
    } else {
      metrics.requests.errors.push({
        type: errorType,
        count: 1,
        samples: [JSON.stringify(response)]
      })
    }
  }

  // Update response time metrics
  metrics.performance.responseTime.min = Math.min(
    metrics.performance.responseTime.min,
    responseTime
  )
  metrics.performance.responseTime.max = Math.max(
    metrics.performance.responseTime.max,
    responseTime
  )

  // Update geographic metrics
  if (!metrics.geographic[virtualUser.region]) {
    metrics.geographic[virtualUser.region] = {
      users: 0,
      requests: 0,
      errors: 0,
      avgResponseTime: 0
    }
  }

  const regionMetrics = metrics.geographic[virtualUser.region]!
  regionMetrics.requests++
  regionMetrics.avgResponseTime
    = (regionMetrics.avgResponseTime * (regionMetrics.requests - 1) + responseTime)
    / regionMetrics.requests

  if (response.status !== endpoint.expectedStatus) {
    regionMetrics.errors++
  }
}

/**
 * Record a thrown error against request metrics. Mutates the supplied
 * metrics object in place.
 */
export function updateErrorMetrics(
  metrics: LoadTestMetrics,
  error: any,
  virtualUser: VirtualUser
): void {
  metrics.requests.failed++

  const errorType = categorizeError(0, error.message)
  const existingError = metrics.requests.errors.find(e => e.type === errorType)

  if (existingError) {
    existingError.count++
  } else {
    metrics.requests.errors.push({
      type: errorType,
      count: 1,
      samples: [error.message]
    })
  }
  // Reference virtualUser so the signature stays compatible with the
  // original private method; region-level attribution for thrown errors
  // could be added here in the future.
  void virtualUser
}

/**
 * Collect response times for percentile calculation. In a real
 * implementation this would aggregate from actual request data; for now it
 * simulates realistic values.
 */
export function collectResponseTimes(_testId: string): number[] {
  const responseTimes: number[] = []
  const baseTime = 50

  for (let i = 0; i < 100; i++) {
    responseTimes.push(baseTime + Math.random() * 200)
  }

  return responseTimes
}

/**
 * Recalculate derived performance metrics (response-time percentiles,
 * throughput, error rate, availability) from raw counters. Mutates the
 * supplied metrics object in place.
 */
export function calculateDerivedMetrics(
  metrics: LoadTestMetrics,
  testId: string
): void {
  // Calculate response time percentiles
  const responseTimes = collectResponseTimes(testId)
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b)

    metrics.performance.responseTime.p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]!
    metrics.performance.responseTime.p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]!
    metrics.performance.responseTime.p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]!
    metrics.performance.responseTime.mean
      = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  }

  // Calculate throughput
  const elapsedSeconds = metrics.duration
  if (elapsedSeconds > 0) {
    metrics.performance.throughput.requestsPerSecond = metrics.requests.total / elapsedSeconds
    metrics.performance.errorRate = (metrics.requests.failed / metrics.requests.total) * 100
    metrics.performance.availability
      = (metrics.requests.successful / metrics.requests.total) * 100
  }
}

/**
 * Compare current metrics against the configured performance targets and
 * emit a console alert for any threshold breach.
 */
export function checkPerformanceThresholds(
  testId: string,
  metrics: LoadTestMetrics
): void {
  const targets = metrics.config.performanceTargets

  // Check response time thresholds
  if (metrics.performance.responseTime.p95 > targets.responseTime.p95) {
    createPerformanceAlert(testId, 'response_time', 'P95 response time exceeded target', {
      current: metrics.performance.responseTime.p95,
      target: targets.responseTime.p95
    })
  }

  // Check error rate thresholds
  if (metrics.performance.errorRate > targets.errorRate.critical) {
    createPerformanceAlert(testId, 'error_rate', 'Error rate exceeded critical threshold', {
      current: metrics.performance.errorRate,
      target: targets.errorRate.critical
    })
  }

  // Check availability thresholds
  if (metrics.performance.availability < targets.availability.minimum) {
    createPerformanceAlert(testId, 'availability', 'Availability below minimum threshold', {
      current: metrics.performance.availability,
      target: targets.availability.minimum
    })
  }
}

/**
 * Analyse collected metrics to identify performance bottlenecks (API,
 * network, database). Mutates the supplied metrics object's bottlenecks
 * field in place.
 */
export function detectBottlenecks(metrics: LoadTestMetrics): void {
  // Analyze metrics to identify bottlenecks
  const bottlenecks: LoadTestMetrics['bottlenecks'] = []

  // Check for high error rates
  if (metrics.performance.errorRate > 5) {
    bottlenecks.push({
      type: 'api',
      severity: 'critical',
      description: 'High error rate indicates API bottleneck',
      affectedRequests: Math.floor(
        (metrics.requests.total * metrics.performance.errorRate) / 100
      ),
      recommendation: 'Scale API servers and optimize database queries'
    })
  }

  // Check for slow response times
  if (metrics.performance.responseTime.p95 > 1000) {
    bottlenecks.push({
      type: 'network',
      severity: 'high',
      description: 'Slow response times indicate network bottleneck',
      affectedRequests: metrics.requests.total,
      recommendation: 'Optimize CDN configuration and enable compression'
    })
  }

  // Check for database-related issues
  const dbErrors = metrics.requests.errors.filter(e => e.type === 'server_error')
  if (dbErrors.length > metrics.requests.total * 0.02) {
    bottlenecks.push({
      type: 'database',
      severity: 'critical',
      description: 'High database error rate',
      affectedRequests: dbErrors.reduce((sum, e) => sum + e.count, 0),
      recommendation: 'Optimize database queries and add connection pooling'
    })
  }

  metrics.bottlenecks = bottlenecks
}

/**
 * Dispatch performance alerts through every configured channel.
 */
export function sendPerformanceAlerts(testId: string, metrics: LoadTestMetrics): void {
  if (!metrics.config.alerting.enabled) {
    return
  }

  // Send alerts based on configuration
  const channels = metrics.config.alerting.channels

  for (const channel of channels) {
    switch (channel) {
      case 'console':
        console.error(`[LoadTest Alert] ${testId}: Performance issues detected`)
        break
      case 'email':
        // Send email alert
        break
      case 'slack':
        // Send Slack webhook
        break
      case 'webhook':
        // Send webhook notification
        break
    }
  }
}

/**
 * Log a single performance alert. In a real implementation this would
 * store alerts and dispatch notifications.
 */
export function createPerformanceAlert(
  testId: string,
  type: string,
  message: string,
  data: any
): void {
  console.error(`[LoadTest Alert] ${testId} - ${type}: ${message}`, data)
}
