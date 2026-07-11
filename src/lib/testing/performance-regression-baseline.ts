/**
 * Performance Regression Testing - Baseline Management & Comparison
 *
 * Extracted from performance-regression-testing.ts. Provides:
 *  - Default baseline construction
 *  - CI default configuration
 *  - Baseline-vs-current metric comparisons
 *  - Recommendation generation and test status determination
 */

import {
  PerformanceBaseline,
  PerformanceRegressionConfig,
  PerformanceRegressionResults,
  ResponseTimeMetrics,
  DatabaseMetrics,
  FrontendMetrics,
  AlertDispatchMetrics,
  EdgePerformanceMetrics,
  PerformanceViolation
} from './performance-regression-types'

/**
 * Build the default baseline (v1.0.0) used to seed the baseline store.
 */
export function createDefaultBaseline(): PerformanceBaseline {
  return {
    version: '1.0.0',
    timestamp: new Date(),
    metrics: {
      apiResponseTimes: {
        '/api/emergency': { p50: 150, p95: 300, p99: 500, mean: 180, max: 800, min: 50 },
        '/api/alerts/dispatch': { p50: 50, p95: 100, p99: 200, mean: 70, max: 300, min: 20 },
        '/api/users/nearby': { p50: 200, p95: 400, p99: 600, mean: 250, max: 1000, min: 100 }
      },
      databaseQueries: {
        emergency_spatial_query: {
          queryTime: { p50: 100, p95: 200, p99: 300, mean: 120, max: 400, min: 50 },
          connectionPoolUtilization: 70,
          cacheHitRate: 85,
          indexUsage: { emergency_location_idx: 95, emergency_severity_idx: 88 }
        }
      },
      frontendMetrics: {
        coreWebVitals: {
          lcp: 2500, // 2.5s
          fid: 100,  // 100ms
          cls: 0.1,
          fcp: 1800, // 1.8s
          ttfb: 600  // 600ms
        },
        bundleSize: {
          total: 250000, // 250KB
          compressed: 75000, // 75KB
          chunks: {
            main: 150000,
            vendor: 80000,
            common: 20000
          }
        },
        resourceLoadTimes: {
          css: 300,
          js: 500,
          images: 800
        }
      },
      alertDispatchMetrics: {
        dispatchLatency: { p50: 50, p95: 100, p99: 200, mean: 70, max: 300, min: 20 },
        throughput: 1000, // alerts per second
        errorRate: 0.5, // percentage
        deliveryRate: { push: 98, email: 95, sms: 92 }
      },
      edgePerformanceMetrics: {
        cacheHitRate: 90,
        timeToFirstByte: { p50: 100, p95: 200, p99: 300, mean: 120, max: 400, min: 50 },
        geographicLatency: {
          'na-east': 50,
          'na-west': 100,
          'eu-west': 150,
          'eu-central': 120,
          'asia-east': 200,
          'asia-southeast': 180
        },
        compressionRatio: 0.7 // 70% compression
      }
    },
    environment: {
      cpu: 'Intel Xeon E5-2670',
      memory: '32GB DDR4',
      network: '1Gbps',
      database: 'PostgreSQL 14'
    }
  }
}

/**
 * Compare current metrics against the baseline, mutating `results` in place
 * with comparisons and violations.
 */
export function compareBaselines(results: PerformanceRegressionResults): void {
  const baseline = results.baseline
  const current = results.current
  const thresholds = results.config.thresholds

  // Compare API response times
  compareAPIResponseTimes(results, baseline.metrics.apiResponseTimes, current.metrics.apiResponseTimes, thresholds.apiResponseTimes)

  // Compare database queries
  compareDatabaseQueries(results, baseline.metrics.databaseQueries, current.metrics.databaseQueries, thresholds.databaseQueries)

  // Compare frontend metrics
  compareFrontendMetrics(results, baseline.metrics.frontendMetrics, current.metrics.frontendMetrics, thresholds.frontendMetrics)

  // Compare alert dispatch metrics
  compareAlertDispatchMetrics(results, baseline.metrics.alertDispatchMetrics, current.metrics.alertDispatchMetrics, thresholds.alertDispatchMetrics)

  // Compare edge performance metrics
  compareEdgePerformanceMetrics(results, baseline.metrics.edgePerformanceMetrics, current.metrics.edgePerformanceMetrics, thresholds.edgePerformanceMetrics)
}

function compareAPIResponseTimes(
  results: PerformanceRegressionResults,
  baseline: { [endpoint: string]: ResponseTimeMetrics },
  current: { [endpoint: string]: ResponseTimeMetrics },
  thresholds: any
): void {
  for (const endpoint in current) {
    const baselineMetrics = baseline[endpoint]
    const currentMetrics = current[endpoint]

    if (!baselineMetrics || !currentMetrics) {
      continue
    }

    // Compare P95 response time
    const baselineP95 = baselineMetrics.p95
    const currentP95 = currentMetrics.p95
    const changePercent = ((currentP95 - baselineP95) / baselineP95) * 100

    const absoluteThreshold = thresholds.absolute[endpoint] || Infinity
    const relativeThreshold = thresholds.relative

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (currentP95 > absoluteThreshold) {
      status = 'fail'
      severity = 'critical'
    } else if (changePercent > relativeThreshold * 2) {
      status = 'fail'
      severity = 'high'
    } else if (changePercent > relativeThreshold) {
      status = 'warn'
      severity = 'medium'
    }

    if (status !== 'pass') {
      results.violations.push({
        category: 'api',
        metric: `${endpoint}_p95_response_time`,
        type: changePercent > relativeThreshold ? 'relative' : 'absolute',
        threshold: changePercent > relativeThreshold ? relativeThreshold : absoluteThreshold,
        actual: currentP95,
        severity,
        description: `API endpoint ${endpoint} P95 response time ${status === 'fail' ? 'exceeded' : 'approached'} threshold`,
        impact: 'Users may experience slow response times',
        recommendation: 'Optimize database queries, add caching, or scale API servers'
      })
    }

    results.comparisons.push({
      category: 'api',
      metric: `${endpoint}_p95_response_time`,
      baseline: baselineP95,
      current: currentP95,
      change: currentP95 - baselineP95,
      changePercent,
      threshold: Math.min(absoluteThreshold, baselineP95 * (1 + relativeThreshold / 100)),
      status,
      severity
    })
  }
}

function compareDatabaseQueries(
  results: PerformanceRegressionResults,
  baseline: { [query: string]: DatabaseMetrics },
  current: { [query: string]: DatabaseMetrics },
  thresholds: any
): void {
  for (const query in current) {
    const baselineMetrics = baseline[query]
    const currentMetrics = current[query]

    if (!baselineMetrics || !currentMetrics) {
      continue
    }

    // Compare query time
    const baselineP95 = baselineMetrics.queryTime.p95
    const currentP95 = currentMetrics.queryTime.p95
    const changePercent = ((currentP95 - baselineP95) / baselineP95) * 100

    const absoluteThreshold = thresholds.absolute[query] || Infinity
    const relativeThreshold = thresholds.relative

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (currentP95 > absoluteThreshold) {
      status = 'fail'
      severity = 'critical'
    } else if (changePercent > relativeThreshold * 2) {
      status = 'fail'
      severity = 'high'
    } else if (changePercent > relativeThreshold) {
      status = 'warn'
      severity = 'medium'
    }

    if (status !== 'pass') {
      results.violations.push({
        category: 'database',
        metric: `${query}_p95_query_time`,
        type: changePercent > relativeThreshold ? 'relative' : 'absolute',
        threshold: changePercent > relativeThreshold ? relativeThreshold : absoluteThreshold,
        actual: currentP95,
        severity,
        description: `Database query ${query} P95 execution time ${status === 'fail' ? 'exceeded' : 'approached'} threshold`,
        impact: 'Slow database queries affect overall system performance',
        recommendation: 'Optimize query execution plans, add indexes, or improve caching'
      })
    }

    results.comparisons.push({
      category: 'database',
      metric: `${query}_p95_query_time`,
      baseline: baselineP95,
      current: currentP95,
      change: currentP95 - baselineP95,
      changePercent,
      threshold: Math.min(absoluteThreshold, baselineP95 * (1 + relativeThreshold / 100)),
      status,
      severity
    })
  }
}

function compareFrontendMetrics(
  results: PerformanceRegressionResults,
  baseline: FrontendMetrics,
  current: FrontendMetrics,
  thresholds: any
): void {
  // Compare Core Web Vitals
  const vitals = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'] as const

  for (const vital of vitals) {
    const baselineValue = baseline.coreWebVitals[vital]
    const currentValue = current.coreWebVitals[vital]
    const threshold = thresholds.coreWebVitals[vital]

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (currentValue > threshold * 1.5) {
      status = 'fail'
      severity = 'critical'
    } else if (currentValue > threshold * 1.2) {
      status = 'fail'
      severity = 'high'
    } else if (currentValue > threshold) {
      status = 'warn'
      severity = 'medium'
    }

    if (status !== 'pass') {
      results.violations.push({
        category: 'frontend',
        metric: `core_web_vital_${vital}`,
        type: 'absolute',
        threshold,
        actual: currentValue,
        severity,
        description: `Core Web Vital ${vital.toUpperCase()} ${status === 'fail' ? 'exceeded' : 'approached'} threshold`,
        impact: 'Poor user experience and lower search rankings',
        recommendation: 'Optimize resource loading, reduce JavaScript execution time, or improve server response'
      })
    }

    results.comparisons.push({
      category: 'frontend',
      metric: `core_web_vital_${vital}`,
      baseline: baselineValue,
      current: currentValue,
      change: currentValue - baselineValue,
      changePercent: ((currentValue - baselineValue) / baselineValue) * 100,
      threshold,
      status,
      severity
    })
  }

  // Compare bundle size
  const baselineSize = baseline.bundleSize.total
  const currentSize = current.bundleSize.total
  const sizeChangePercent = ((currentSize - baselineSize) / baselineSize) * 100
  const sizeThreshold = thresholds.bundleSize.total

  if (currentSize > sizeThreshold) {
    results.violations.push({
      category: 'frontend',
      metric: 'bundle_size_total',
      type: 'absolute',
      threshold: sizeThreshold,
      actual: currentSize,
      severity: 'high',
      description: 'Bundle size exceeded threshold',
      impact: 'Slower page load times, especially on mobile networks',
      recommendation: 'Implement code splitting, tree shaking, and remove unused dependencies'
    })
  }

  results.comparisons.push({
    category: 'frontend',
    metric: 'bundle_size_total',
    baseline: baselineSize,
    current: currentSize,
    change: currentSize - baselineSize,
    changePercent: sizeChangePercent,
    threshold: sizeThreshold,
    status: currentSize > sizeThreshold ? 'fail' : 'pass',
    severity: currentSize > sizeThreshold ? 'high' : 'low'
  })
}

function compareAlertDispatchMetrics(
  results: PerformanceRegressionResults,
  baseline: AlertDispatchMetrics,
  current: AlertDispatchMetrics,
  thresholds: any
): void {
  // Compare dispatch latency
  const latencyMetrics = ['p95', 'p99'] as const

  for (const metric of latencyMetrics) {
    const baselineValue = baseline.dispatchLatency[metric]
    const currentValue = current.dispatchLatency[metric]
    const threshold = thresholds.dispatchLatency[metric]

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (currentValue > threshold * 1.5) {
      status = 'fail'
      severity = 'critical'
    } else if (currentValue > threshold * 1.2) {
      status = 'fail'
      severity = 'high'
    } else if (currentValue > threshold) {
      status = 'warn'
      severity = 'medium'
    }

    if (status !== 'pass') {
      results.violations.push({
        category: 'alert',
        metric: `dispatch_latency_${metric}`,
        type: 'absolute',
        threshold,
        actual: currentValue,
        severity,
        description: `Alert dispatch ${metric.toUpperCase()} latency ${status === 'fail' ? 'exceeded' : 'approached'} threshold`,
        impact: 'Delayed emergency notifications can affect response times',
        recommendation: 'Optimize alert processing, improve connection pooling, or scale alert infrastructure'
      })
    }

    results.comparisons.push({
      category: 'alert',
      metric: `dispatch_latency_${metric}`,
      baseline: baselineValue,
      current: currentValue,
      change: currentValue - baselineValue,
      changePercent: ((currentValue - baselineValue) / baselineValue) * 100,
      threshold,
      status,
      severity
    })
  }

  // Compare throughput
  const baselineThroughput = baseline.throughput
  const currentThroughput = current.throughput
  const throughputChangePercent = ((baselineThroughput - currentThroughput) / baselineThroughput) * 100
  const throughputThreshold = thresholds.throughput.relativeDecrease

  if (throughputChangePercent > throughputThreshold) {
    results.violations.push({
      category: 'alert',
      metric: 'alert_throughput',
      type: 'relative',
      threshold: throughputThreshold,
      actual: throughputChangePercent,
      severity: throughputChangePercent > throughputThreshold * 2 ? 'critical' : 'high',
      description: 'Alert throughput decreased significantly',
      impact: 'Reduced capacity to handle emergency alerts during high-load scenarios',
      recommendation: 'Optimize alert processing pipeline and scale alert infrastructure'
    })
  }

  results.comparisons.push({
    category: 'alert',
    metric: 'alert_throughput',
    baseline: baselineThroughput,
    current: currentThroughput,
    change: currentThroughput - baselineThroughput,
    changePercent: -throughputChangePercent,
    threshold: baselineThroughput * (1 - throughputThreshold / 100),
    status: throughputChangePercent > throughputThreshold ? 'fail' : 'pass',
    severity: throughputChangePercent > throughputThreshold ? 'high' : 'low'
  })
}

function compareEdgePerformanceMetrics(
  results: PerformanceRegressionResults,
  baseline: EdgePerformanceMetrics,
  current: EdgePerformanceMetrics,
  thresholds: any
): void {
  // Compare cache hit rate
  const baselineCacheHitRate = baseline.cacheHitRate
  const currentCacheHitRate = current.cacheHitRate
  const cacheHitRateChangePercent = ((baselineCacheHitRate - currentCacheHitRate) / baselineCacheHitRate) * 100
  const cacheHitRateThreshold = thresholds.cacheHitRate.relativeDecrease

  if (cacheHitRateChangePercent > cacheHitRateThreshold) {
    results.violations.push({
      category: 'edge',
      metric: 'cache_hit_rate',
      type: 'relative',
      threshold: cacheHitRateThreshold,
      actual: cacheHitRateChangePercent,
      severity: cacheHitRateChangePercent > cacheHitRateThreshold * 2 ? 'critical' : 'high',
      description: 'Edge cache hit rate decreased significantly',
      impact: 'Increased origin server load and slower response times',
      recommendation: 'Optimize cache keys, increase cache TTL, or review cache invalidation strategy'
    })
  }

  results.comparisons.push({
    category: 'edge',
    metric: 'cache_hit_rate',
    baseline: baselineCacheHitRate,
    current: currentCacheHitRate,
    change: currentCacheHitRate - baselineCacheHitRate,
    changePercent: -cacheHitRateChangePercent,
    threshold: baselineCacheHitRate * (1 - cacheHitRateThreshold / 100),
    status: cacheHitRateChangePercent > cacheHitRateThreshold ? 'fail' : 'pass',
    severity: cacheHitRateChangePercent > cacheHitRateThreshold ? 'high' : 'low'
  })

  // Compare TTFB
  const baselineTTFB = baseline.timeToFirstByte.p95
  const currentTTFB = current.timeToFirstByte.p95
  const ttfbChangePercent = ((currentTTFB - baselineTTFB) / baselineTTFB) * 100
  const ttfbThreshold = thresholds.timeToFirstByte.relativeIncrease

  if (ttfbChangePercent > ttfbThreshold) {
    results.violations.push({
      category: 'edge',
      metric: 'time_to_first_byte_p95',
      type: 'relative',
      threshold: ttfbThreshold,
      actual: ttfbChangePercent,
      severity: ttfbChangePercent > ttfbThreshold * 2 ? 'critical' : 'high',
      description: 'Edge TTFB increased significantly',
      impact: 'Slower page load times for users globally',
      recommendation: 'Optimize edge routing, improve server response time, or enable compression'
    })
  }

  results.comparisons.push({
    category: 'edge',
    metric: 'time_to_first_byte_p95',
    baseline: baselineTTFB,
    current: currentTTFB,
    change: currentTTFB - baselineTTFB,
    changePercent: ttfbChangePercent,
    threshold: baselineTTFB * (1 + ttfbThreshold / 100),
    status: ttfbChangePercent > ttfbThreshold ? 'fail' : 'pass',
    severity: ttfbChangePercent > ttfbThreshold ? 'high' : 'low'
  })
}

/**
 * Generate recommendations based on recorded violations, mutating
 * `results.recommendations` in place.
 */
export function generateRecommendations(results: PerformanceRegressionResults): void {
  const recommendations = new Set<string>()

  // Generate recommendations based on violations
  results.violations.forEach((violation: PerformanceViolation) => {
    recommendations.add(violation.recommendation)
  })

  // Generate general recommendations based on patterns
  const criticalViolations = results.violations.filter(v => v.severity === 'critical')
  const highViolations = results.violations.filter(v => v.severity === 'high')

  if (criticalViolations.length > 0) {
    recommendations.add('Address critical performance issues before deploying to production')
  }

  if (highViolations.length > 3) {
    recommendations.add('Consider performance optimization sprint to address multiple high-severity issues')
  }

  // Category-specific recommendations
  const apiViolations = results.violations.filter(v => v.category === 'api')
  const dbViolations = results.violations.filter(v => v.category === 'database')
  const frontendViolations = results.violations.filter(v => v.category === 'frontend')

  if (apiViolations.length > 2) {
    recommendations.add('Implement API response caching and consider microservices architecture')
  }

  if (dbViolations.length > 2) {
    recommendations.add('Optimize database schema, add missing indexes, and implement query caching')
  }

  if (frontendViolations.length > 2) {
    recommendations.add('Implement comprehensive frontend optimization including code splitting and lazy loading')
  }

  results.recommendations = Array.from(recommendations)
}

/**
 * Determine the final pass/fail status for a test based on its config
 * enforcement rules and recorded violations.
 */
export function determineTestStatus(results: PerformanceRegressionResults): void {
  const enforcement = results.config.enforcement
  const criticalViolations = results.violations.filter(v => v.severity === 'critical')

  if (!enforcement.enabled) {
    results.status = 'passed'
    return
  }

  switch (enforcement.failureThreshold) {
    case 'any':
      if (results.violations.length > 0) {
        results.status = 'failed'
      } else {
        results.status = 'passed'
      }
      break
    case 'critical':
      if (criticalViolations.length > 0) {
        results.status = 'failed'
      } else {
        results.status = 'passed'
      }
      break
    case 'all':
      if (results.summary.failedTests > 0) {
        results.status = 'failed'
      } else {
        results.status = 'passed'
      }
      break
  }

  // Update critical failures count
  results.summary.criticalFailures = criticalViolations.length
}

/**
 * Build the default CI/CD performance regression test configuration,
 * falling back to the provided baseline when available.
 */
export function getCIDefaultConfig(baseline: PerformanceBaseline): PerformanceRegressionConfig {
  return {
    name: 'CI/CD Performance Regression Test',
    description: 'Automated performance regression test for CI/CD pipeline',
    baseline,
    thresholds: {
      apiResponseTimes: {
        absolute: {
          '/api/emergency': 500,
          '/api/alerts/dispatch': 200,
          '/api/users/nearby': 800
        },
        relative: 20 // 20% increase allowed
      },
      databaseQueries: {
        absolute: {
          emergency_spatial_query: 400
        },
        relative: 25
      },
      frontendMetrics: {
        coreWebVitals: {
          lcp: 2500,
          fid: 100,
          cls: 0.1,
          fcp: 1800,
          ttfb: 600
        },
        bundleSize: {
          total: 300000, // 300KB
          chunkIncrease: 15 // 15% increase per chunk
        }
      },
      alertDispatchMetrics: {
        dispatchLatency: {
          p95: 150,
          p99: 300
        },
        throughput: {
          minimum: 800,
          relativeDecrease: 10
        }
      },
      edgePerformanceMetrics: {
        cacheHitRate: {
          minimum: 80,
          relativeDecrease: 10
        },
        timeToFirstByte: {
          p95: 300,
          relativeIncrease: 20
        }
      }
    },
    testSuites: [
      {
        name: 'API Performance Tests',
        description: 'Test API endpoint response times',
        tests: [
          {
            name: 'Emergency API Response Time',
            type: 'api',
            config: { endpoints: ['/api/emergency'] },
            expectedMetrics: { p95: 300 }
          },
          {
            name: 'Alert Dispatch API Response Time',
            type: 'api',
            config: { endpoints: ['/api/alerts/dispatch'] },
            expectedMetrics: { p95: 100 }
          }
        ],
        parallel: true,
        timeout: 300000, // 5 minutes
        retries: 2
      },
      {
        name: 'Database Performance Tests',
        description: 'Test database query performance',
        tests: [
          {
            name: 'Emergency Spatial Query Performance',
            type: 'database',
            config: { queries: ['emergency_spatial_query'] },
            expectedMetrics: { p95: 200 }
          }
        ],
        parallel: false,
        timeout: 300000,
        retries: 2
      },
      {
        name: 'Frontend Performance Tests',
        description: 'Test frontend loading performance',
        tests: [
          {
            name: 'Core Web Vitals',
            type: 'frontend',
            config: {},
            expectedMetrics: {
              lcp: 2500,
              fid: 100,
              cls: 0.1
            }
          }
        ],
        parallel: false,
        timeout: 600000, // 10 minutes
        retries: 1
      }
    ],
    reporting: {
      formats: ['junit', 'json', 'html'],
      destinations: ['console', 'artifact'],
      includeBaselineComparison: true,
      includeTrendAnalysis: true,
      includeRecommendations: true
    },
    enforcement: {
      enabled: true,
      failureThreshold: 'critical',
      blockMerge: true,
      requireApproval: false,
      notifyChannels: ['slack']
    }
  }
}
