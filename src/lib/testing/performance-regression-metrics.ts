/**
 * Performance Regression Testing - Metric Measurement
 *
 * Extracted from performance-regression-testing.ts. Provides standalone
 * functions that perform the actual performance measurements previously
 * implemented as private methods on the PerformanceRegressionTesting
 * class (executeAPITest, executeDatabaseTest, etc.). The functions are
 * kept behavior-identical to the originals.
 */

import { ResponseTimeMetrics, DatabaseMetrics } from './performance-regression-types'

/**
 * Measure response time for one or more API endpoints.
 * Mirrors the original executeAPITest private method.
 */
export async function measureResponseTime(config: Record<string, unknown>): Promise<{ [endpoint: string]: ResponseTimeMetrics }> {
  // Simulate API performance test
  const endpoints = (config.endpoints as string[]) || ['/api/emergency']
  const metrics: { [endpoint: string]: ResponseTimeMetrics } = {}

  for (const endpoint of endpoints) {
    const responseTimes = []

    // Execute multiple requests to get statistical data
    for (let i = 0; i < 50; i++) {
      const startTime = performance.now()

      // Make actual API call
      const response = await fetch(endpoint)

      const endTime = performance.now()
      responseTimes.push(endTime - startTime)
    }

    // Calculate metrics
    responseTimes.sort((a, b) => a - b)

    metrics[endpoint] = {
      min: responseTimes[0] ?? 0,
      max: responseTimes[responseTimes.length - 1] ?? 0,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)] ?? 0,
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)] ?? 0,
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)] ?? 0,
      mean: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    }
  }

  return metrics
}

/**
 * Measure database query performance for one or more queries.
 * Mirrors the original executeDatabaseTest private method.
 */
export async function measureDatabasePerformance(config: Record<string, unknown>): Promise<{ [query: string]: DatabaseMetrics }> {
  // Simulate database performance test
  const queries = (config.queries as string[]) || ['emergency_spatial_query']
  const metrics: { [query: string]: DatabaseMetrics } = {}

  for (const query of queries) {
    // Simulate query execution
    const queryTimes = []

    for (let i = 0; i < 100; i++) {
      const startTime = performance.now()

      // Execute database query (simulated)
      await simulateDatabaseQuery(query)

      const endTime = performance.now()
      queryTimes.push(endTime - startTime)
    }

    queryTimes.sort((a, b) => a - b)

    metrics[query] = {
      queryTime: {
        min: queryTimes[0] ?? 0,
        max: queryTimes[queryTimes.length - 1] ?? 0,
        p50: queryTimes[Math.floor(queryTimes.length * 0.5)] ?? 0,
        p95: queryTimes[Math.floor(queryTimes.length * 0.95)] ?? 0,
        p99: queryTimes[Math.floor(queryTimes.length * 0.99)] ?? 0,
        mean: queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
      },
      connectionPoolUtilization: 60 + Math.random() * 30, // 60-90%
      cacheHitRate: 80 + Math.random() * 15, // 80-95%
      indexUsage: {
        emergency_location_idx: 90 + Math.random() * 10,
        emergency_severity_idx: 85 + Math.random() * 10
      }
    }
  }

  return metrics
}

/**
 * Measure frontend performance metrics (Core Web Vitals, bundle size).
 * Mirrors the original executeFrontendTest private method.
 */
export async function measureFrontendMetrics(_config: Record<string, unknown>): Promise<FrontendMetrics> {
  // Simulate frontend performance test using Lighthouse
  return new Promise((resolve) => {
    // In a real implementation, this would use Lighthouse API
    setTimeout(() => {
      resolve({
        coreWebVitals: {
          lcp: 2000 + Math.random() * 1000, // 2-3s
          fid: 50 + Math.random() * 100,    // 50-150ms
          cls: Math.random() * 0.2,         // 0-0.2
          fcp: 1500 + Math.random() * 500,  // 1.5-2s
          ttfb: 400 + Math.random() * 400   // 400-800ms
        },
        bundleSize: {
          total: 240000 + Math.random() * 20000, // 240-260KB
          compressed: 70000 + Math.random() * 10000, // 70-80KB
          chunks: {
            main: 140000 + Math.random() * 20000,
            vendor: 75000 + Math.random() * 10000,
            common: 18000 + Math.random() * 4000
          }
        },
        resourceLoadTimes: {
          css: 250 + Math.random() * 100,
          js: 400 + Math.random() * 200,
          images: 600 + Math.random() * 400
        }
      })
    }, 2000)
  })
}

/**
 * Measure alert dispatch performance metrics.
 * Mirrors the original executeAlertTest private method.
 */
export async function measureAlertDispatch(_config: Record<string, unknown>): Promise<AlertDispatchMetrics> {
  // Simulate alert dispatch performance test
  const dispatchTimes = []

  for (let i = 0; i < 200; i++) {
    const startTime = performance.now()

    // Simulate alert dispatch
    await simulateAlertDispatch()

    const endTime = performance.now()
    dispatchTimes.push(endTime - startTime)
  }

  dispatchTimes.sort((a, b) => a - b)

  return {
    dispatchLatency: {
      min: dispatchTimes[0],
      max: dispatchTimes[dispatchTimes.length - 1],
      p50: dispatchTimes[Math.floor(dispatchTimes.length * 0.5)],
      p95: dispatchTimes[Math.floor(dispatchTimes.length * 0.95)],
      p99: dispatchTimes[Math.floor(dispatchTimes.length * 0.99)],
      mean: dispatchTimes.reduce((sum, time) => sum + time, 0) / dispatchTimes.length
    },
    throughput: 900 + Math.random() * 200, // 900-1100 alerts/sec
    errorRate: Math.random() * 2, // 0-2%
    deliveryRate: {
      push: 95 + Math.random() * 5,
      email: 92 + Math.random() * 6,
      sms: 88 + Math.random() * 8
    }
  }
}

/**
 * Measure edge performance metrics (cache hit rate, TTFB, geo latency).
 * Mirrors the original executeEdgeTest private method.
 */
export async function measureEdgePerformance(_config: Record<string, unknown>): Promise<EdgePerformanceMetrics> {
  // Simulate edge performance test
  const ttfbTimes = []

  for (let i = 0; i < 100; i++) {
    const startTime = performance.now()

    // Simulate edge request
    await simulateEdgeRequest()

    const endTime = performance.now()
    ttfbTimes.push(endTime - startTime)
  }

  ttfbTimes.sort((a, b) => a - b)

  return {
    cacheHitRate: 85 + Math.random() * 10, // 85-95%
    timeToFirstByte: {
      min: ttfbTimes[0],
      max: ttfbTimes[ttfbTimes.length - 1],
      p50: ttfbTimes[Math.floor(ttfbTimes.length * 0.5)],
      p95: ttfbTimes[Math.floor(ttfbTimes.length * 0.95)],
      p99: ttfbTimes[Math.floor(ttfbTimes.length * 0.99)],
      mean: ttfbTimes.reduce((sum, time) => sum + time, 0) / ttfbTimes.length
    },
    geographicLatency: {
      'na-east': 40 + Math.random() * 20,
      'na-west': 80 + Math.random() * 40,
      'eu-west': 120 + Math.random() * 60,
      'eu-central': 100 + Math.random() * 40,
      'asia-east': 180 + Math.random() * 40,
      'asia-southeast': 160 + Math.random() * 40
    },
    compressionRatio: 0.65 + Math.random() * 0.1 // 65-75%
  }
}

// Simulation helpers used by the measurement functions above.

/** Simulate database query execution time. */
export async function simulateDatabaseQuery(_query: string): Promise<void> {
  // Simulate database query execution time
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150))
}

/** Simulate alert dispatch time. */
export async function simulateAlertDispatch(): Promise<void> {
  // Simulate alert dispatch time
  await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 80))
}

/** Simulate edge request processing time. */
export async function simulateEdgeRequest(): Promise<void> {
  // Simulate edge request processing time
  await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 120))
}
