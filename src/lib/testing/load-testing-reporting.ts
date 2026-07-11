/**
 * Load Testing Framework - Report Generation
 *
 * Helpers that turn collected LoadTestMetrics into human-readable test
 * reports and actionable recommendations. Extracted from
 * load-testing-framework.ts. Re-exported via the framework module so
 * existing imports from '@/lib/testing/load-testing-framework' keep working.
 */

import { LoadTestMetrics } from './load-testing-types'

/**
 * Build an ordered list of recommendations based on observed metrics and
 * detected bottlenecks. Recommendations are derived from performance
 * target misses first, then from each bottleneck's own recommendation.
 */
export function generateRecommendations(metrics: LoadTestMetrics): string[] {
  const recommendations: string[] = []

  // Performance-based recommendations
  if (metrics.performance.responseTime.p95 > metrics.config.performanceTargets.responseTime.p95) {
    recommendations.push('Optimize API response times through caching and query optimization')
  }

  if (metrics.performance.errorRate > metrics.config.performanceTargets.errorRate.acceptable) {
    recommendations.push('Investigate and fix high error rates in API endpoints')
  }

  if (metrics.performance.availability < metrics.config.performanceTargets.availability.target) {
    recommendations.push('Improve system availability through redundancy and failover mechanisms')
  }

  // Bottleneck-based recommendations
  metrics.bottlenecks.forEach(bottleneck => {
    recommendations.push(bottleneck.recommendation)
  })

  return recommendations
}

// Shape of a generated test report. Kept as a local type so callers can
// type-check against the report without importing the full metrics tree.
export interface LoadTestReport {
  testId: string
  scenario: LoadTestMetrics['scenario']
  summary: {
    duration: number
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    errorRate: number
    availability: number
    peakConcurrency: number
  }
  performance: LoadTestMetrics['performance']
  bottlenecks: LoadTestMetrics['bottlenecks']
  geographic: LoadTestMetrics['geographic']
  recommendations: string[]
}

/**
 * Build a structured report object (without side effects) from metrics.
 * Used both by the internal generateTestReport logger and the public
 * getTestReport API.
 */
export function buildTestReport(metrics: LoadTestMetrics): LoadTestReport {
  return {
    testId: metrics.testId,
    scenario: metrics.scenario,
    summary: {
      duration: metrics.duration,
      totalRequests: metrics.requests.total,
      successfulRequests: metrics.requests.successful,
      failedRequests: metrics.requests.failed,
      errorRate: metrics.performance.errorRate,
      availability: metrics.performance.availability,
      peakConcurrency: metrics.concurrency.peak
    },
    performance: metrics.performance,
    bottlenecks: metrics.bottlenecks,
    geographic: metrics.geographic,
    recommendations: generateRecommendations(metrics)
  }
}

/**
 * Build a report for the given metrics and emit it to the console. In a
 * real implementation this would persist the report to a database or file.
 */
export function generateTestReport(testId: string, metrics: LoadTestMetrics): void {
  const report = buildTestReport(metrics)
  // Store report (in a real implementation, this would save to database or file)
  console.log(`[LoadTest Report] ${testId}:`, JSON.stringify(report, null, 2))
}
