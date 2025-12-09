/**
 * Performance Regression Testing for CI/CD Pipeline
 *
 * This module provides automated performance regression testing that integrates
 * with CI/CD pipelines to detect performance degradations before they reach production.
 * It includes baseline comparison, threshold enforcement, and automated reporting.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { loadTestingFramework } from './load-testing-framework'

// Performance regression test configuration
export interface PerformanceRegressionConfig {
  name: string
  description: string
  baseline: PerformanceBaseline
  thresholds: PerformanceThresholds
  testSuites: PerformanceTestSuite[]
  reporting: ReportingConfig
  enforcement: EnforcementConfig
}

// Performance baseline
export interface PerformanceBaseline {
  version: string
  timestamp: Date
  metrics: {
    apiResponseTimes: { [endpoint: string]: ResponseTimeMetrics }
    databaseQueries: { [query: string]: DatabaseMetrics }
    frontendMetrics: FrontendMetrics
    alertDispatchMetrics: AlertDispatchMetrics
    edgePerformanceMetrics: EdgePerformanceMetrics
  }
  environment: {
    cpu: string
    memory: string
    network: string
    database: string
  }
}

// Response time metrics
export interface ResponseTimeMetrics {
  p50: number
  p95: number
  p99: number
  mean: number
  max: number
  min: number
}

// Database metrics
export interface DatabaseMetrics {
  queryTime: ResponseTimeMetrics
  connectionPoolUtilization: number
  cacheHitRate: number
  indexUsage: { [index: string]: number }
}

// Frontend metrics
export interface FrontendMetrics {
  coreWebVitals: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    fcp: number // First Contentful Paint
    ttfb: number // Time to First Byte
  }
  bundleSize: {
    total: number
    compressed: number
    chunks: { [name: string]: number }
  }
  resourceLoadTimes: { [resource: string]: number }
}

// Alert dispatch metrics
export interface AlertDispatchMetrics {
  dispatchLatency: ResponseTimeMetrics
  throughput: number
  errorRate: number
  deliveryRate: { [channel: string]: number }
}

// Edge performance metrics
export interface EdgePerformanceMetrics {
  cacheHitRate: number
  timeToFirstByte: ResponseTimeMetrics
  geographicLatency: { [region: string]: number }
  compressionRatio: number
}

// Performance thresholds
export interface PerformanceThresholds {
  apiResponseTimes: {
    absolute: { [endpoint: string]: number } // Maximum acceptable response time
    relative: number // Maximum percentage increase from baseline
  }
  databaseQueries: {
    absolute: { [query: string]: number }
    relative: number
  }
  frontendMetrics: {
    coreWebVitals: {
      lcp: number
      fid: number
      cls: number
      fcp: number
      ttfb: number
    }
    bundleSize: {
      total: number
      chunkIncrease: number // Maximum percentage increase per chunk
    }
  }
  alertDispatchMetrics: {
    dispatchLatency: {
      p95: number
      p99: number
    }
    throughput: {
      minimum: number
      relativeDecrease: number
    }
  }
  edgePerformanceMetrics: {
    cacheHitRate: {
      minimum: number
      relativeDecrease: number
    }
    timeToFirstByte: {
      p95: number
      relativeIncrease: number
    }
  }
}

// Performance test suite
export interface PerformanceTestSuite {
  name: string
  description: string
  tests: PerformanceTest[]
  parallel: boolean
  timeout: number
  retries: number
}

// Performance test
export interface PerformanceTest {
  name: string
  type: 'api' | 'database' | 'frontend' | 'alert' | 'edge'
  config: any
  expectedMetrics: any
  skipOnFailure?: boolean
}

// Reporting configuration
export interface ReportingConfig {
  formats: ('junit' | 'json' | 'html' | 'markdown')[]
  destinations: ('console' | 'file' | 'artifact' | 'slack' | 'email')[]
  includeBaselineComparison: boolean
  includeTrendAnalysis: boolean
  includeRecommendations: boolean
}

// Enforcement configuration
export interface EnforcementConfig {
  enabled: boolean
  failureThreshold: 'any' | 'critical' | 'all'
  blockMerge: boolean
  requireApproval: boolean
  notifyChannels: ('slack' | 'email' | 'github')[]
}

// Performance regression test results
export interface PerformanceRegressionResults {
  testId: string
  timestamp: Date
  config: PerformanceRegressionConfig
  status: 'running' | 'passed' | 'failed' | 'skipped'
  duration: number
  baseline: PerformanceBaseline
  current: PerformanceBaseline
  comparisons: MetricComparison[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    criticalFailures: number
  }
  violations: PerformanceViolation[]
  recommendations: string[]
  artifacts: {
    junitReport?: string
    jsonReport?: string
    htmlReport?: string
    trendData?: any
  }
}

// Metric comparison
export interface MetricComparison {
  category: string
  metric: string
  baseline: number
  current: number
  change: number
  changePercent: number
  threshold: number
  status: 'pass' | 'warn' | 'fail'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Performance violation
export interface PerformanceViolation {
  category: string
  metric: string
  type: 'absolute' | 'relative'
  threshold: number
  actual: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  recommendation: string
}

class PerformanceRegressionTesting {
  private static instance: PerformanceRegressionTesting
  private activeTests: Map<string, PerformanceRegressionResults> = new Map()
  private baselineStorage: Map<string, PerformanceBaseline> = new Map()
  private testHistory: Map<string, PerformanceRegressionResults[]> = new Map()

  private constructor() {
    this.initializeDefaultBaselines()
  }

  static getInstance(): PerformanceRegressionTesting {
    if (!PerformanceRegressionTesting.instance) {
      PerformanceRegressionTesting.instance = new PerformanceRegressionTesting()
    }
    return PerformanceRegressionTesting.instance
  }

  /**
   * Execute performance regression test
   */
  async executeRegressionTest(config: PerformanceRegressionConfig): Promise<PerformanceRegressionResults> {
    const testId = this.generateTestId()
    const startTime = Date.now()

    try {
      // Initialize test results
      const results: PerformanceRegressionResults = {
        testId,
        timestamp: new Date(),
        config,
        status: 'running',
        duration: 0,
        baseline: config.baseline,
        current: {} as PerformanceBaseline,
        comparisons: [],
        summary: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          criticalFailures: 0
        },
        violations: [],
        recommendations: [],
        artifacts: {}
      }

      this.activeTests.set(testId, results)

      // Execute test suites
      for (const suite of config.testSuites) {
        await this.executeTestSuite(testId, suite)
      }

      // Compare with baseline
      await this.compareWithBaseline(testId)

      // Generate recommendations
      this.generateRecommendations(testId)

      // Generate reports
      await this.generateReports(testId)

      // Determine final status
      this.determineTestStatus(testId)

      // Calculate duration
      results.duration = Date.now() - startTime
      this.activeTests.set(testId, results)

      console.log(`[PerformanceRegression] Test ${testId} completed: ${results.status}`)

      return results
    } catch (error) {
      const results = this.activeTests.get(testId)
      if (results) {
        results.status = 'failed'
        results.duration = Date.now() - startTime
        this.activeTests.set(testId, results)
      }

      console.error(`[PerformanceRegression] Test ${testId} failed:`, error)

      throw error
    }
  }

  /**
   * Execute CI/CD performance regression test
   */
  async executeCIDPerformanceTest(): Promise<PerformanceRegressionResults> {
    const config = this.getCIDefaultConfig()
    return await this.executeRegressionTest(config)
  }

  /**
   * Update performance baseline
   */
  async updateBaseline(version: string, metrics: PerformanceBaseline): Promise<void> {
    const baseline = {
      ...metrics,
      version,
      timestamp: new Date()
    }

    this.baselineStorage.set(version, baseline)

    // Store baseline to persistent storage
    await this.persistBaseline(version, baseline)

    console.log(`[PerformanceRegression] Baseline updated for version ${version}`)
  }

  /**
   * Get performance baseline
   */
  getBaseline(version?: string): PerformanceBaseline | null {
    if (version) {
      return this.baselineStorage.get(version) || null
    }

    // Get latest baseline
    const versions = Array.from(this.baselineStorage.keys())
    if (versions.length === 0) {
      return null
    }

    const latestVersion = versions.sort().pop()
    return this.baselineStorage.get(latestVersion!) || null
  }

  /**
   * Get test results
   */
  getTestResults(testId: string): PerformanceRegressionResults | null {
    return this.activeTests.get(testId) || null
  }

  /**
   * Get test history
   */
  getTestHistory(limit: number = 10): PerformanceRegressionResults[] {
    const allTests = Array.from(this.activeTests.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return allTests.slice(0, limit)
  }

  /**
   * Private helper methods
   */

  private initializeDefaultBaselines(): void {
    // Initialize with default baseline values
    const defaultBaseline: PerformanceBaseline = {
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

    this.baselineStorage.set('1.0.0', defaultBaseline)
  }

  private async executeTestSuite(testId: string, suite: PerformanceTestSuite): Promise<void> {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    console.log(`[PerformanceRegression] Executing test suite: ${suite.name}`)

    if (suite.parallel) {
      // Execute tests in parallel
      const testPromises = suite.tests.map(test => this.executeTest(testId, test))
      await Promise.all(testPromises)
    } else {
      // Execute tests sequentially
      for (const test of suite.tests) {
        await this.executeTest(testId, test)
      }
    }
  }

  private async executeTest(testId: string, test: PerformanceTest): Promise<void> {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    results.summary.totalTests++

    try {
      let testMetrics: any

      switch (test.type) {
        case 'api':
          testMetrics = await this.executeAPITest(test)
          break
        case 'database':
          testMetrics = await this.executeDatabaseTest(test)
          break
        case 'frontend':
          testMetrics = await this.executeFrontendTest(test)
          break
        case 'alert':
          testMetrics = await this.executeAlertTest(test)
          break
        case 'edge':
          testMetrics = await this.executeEdgeTest(test)
          break
        default:
          throw new Error(`Unknown test type: ${test.type}`)
      }

      // Store test metrics
      this.storeTestMetrics(testId, test.type, testMetrics)

      results.summary.passedTests++
    } catch (error) {
      console.error(`[PerformanceRegression] Test ${test.name} failed:`, error)

      if (!test.skipOnFailure) {
        results.summary.failedTests++

        // Add violation for test failure
        results.violations.push({
          category: test.type,
          metric: test.name,
          type: 'absolute',
          threshold: 0,
          actual: 1,
          severity: 'critical',
          description: `Test execution failed: ${error.message}`,
          impact: 'Unable to measure performance for this component',
          recommendation: 'Fix test execution issues before proceeding'
        })
      } else {
        results.summary.skippedTests++
      }
    }
  }

  private async executeAPITest(test: PerformanceTest): Promise<any> {
    // Simulate API performance test
    const endpoints = test.config.endpoints || ['/api/emergency']
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
        min: responseTimes[0],
        max: responseTimes[responseTimes.length - 1],
        p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
        mean: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      }
    }

    return metrics
  }

  private async executeDatabaseTest(test: PerformanceTest): Promise<any> {
    // Simulate database performance test
    const queries = test.config.queries || ['emergency_spatial_query']
    const metrics: { [query: string]: DatabaseMetrics } = {}

    for (const query of queries) {
      // Simulate query execution
      const queryTimes = []

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now()

        // Execute database query (simulated)
        await this.simulateDatabaseQuery(query)

        const endTime = performance.now()
        queryTimes.push(endTime - startTime)
      }

      queryTimes.sort((a, b) => a - b)

      metrics[query] = {
        queryTime: {
          min: queryTimes[0],
          max: queryTimes[queryTimes.length - 1],
          p50: queryTimes[Math.floor(queryTimes.length * 0.5)],
          p95: queryTimes[Math.floor(queryTimes.length * 0.95)],
          p99: queryTimes[Math.floor(queryTimes.length * 0.99)],
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

  private async executeFrontendTest(test: PerformanceTest): Promise<any> {
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

  private async executeAlertTest(test: PerformanceTest): Promise<any> {
    // Simulate alert dispatch performance test
    const dispatchTimes = []

    for (let i = 0; i < 200; i++) {
      const startTime = performance.now()

      // Simulate alert dispatch
      await this.simulateAlertDispatch()

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

  private async executeEdgeTest(test: PerformanceTest): Promise<any> {
    // Simulate edge performance test
    const ttfbTimes = []

    for (let i = 0; i < 100; i++) {
      const startTime = performance.now()

      // Simulate edge request
      await this.simulateEdgeRequest()

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

  private storeTestMetrics(testId: string, testType: string, metrics: any): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    // Store metrics in current baseline
    switch (testType) {
      case 'api':
        results.current.metrics = {
          ...results.current.metrics,
          apiResponseTimes: metrics
        }
        break
      case 'database':
        results.current.metrics = {
          ...results.current.metrics,
          databaseQueries: metrics
        }
        break
      case 'frontend':
        results.current.metrics = {
          ...results.current.metrics,
          frontendMetrics: metrics
        }
        break
      case 'alert':
        results.current.metrics = {
          ...results.current.metrics,
          alertDispatchMetrics: metrics
        }
        break
      case 'edge':
        results.current.metrics = {
          ...results.current.metrics,
          edgePerformanceMetrics: metrics
        }
        break
    }

    this.activeTests.set(testId, results)
  }

  private async compareWithBaseline(testId: string): Promise<void> {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    const baseline = results.baseline
    const current = results.current
    const thresholds = results.config.thresholds

    // Compare API response times
    this.compareAPIResponseTimes(testId, baseline.metrics.apiResponseTimes, current.metrics.apiResponseTimes, thresholds.apiResponseTimes)

    // Compare database queries
    this.compareDatabaseQueries(testId, baseline.metrics.databaseQueries, current.metrics.databaseQueries, thresholds.databaseQueries)

    // Compare frontend metrics
    this.compareFrontendMetrics(testId, baseline.metrics.frontendMetrics, current.metrics.frontendMetrics, thresholds.frontendMetrics)

    // Compare alert dispatch metrics
    this.compareAlertDispatchMetrics(testId, baseline.metrics.alertDispatchMetrics, current.metrics.alertDispatchMetrics, thresholds.alertDispatchMetrics)

    // Compare edge performance metrics
    this.compareEdgePerformanceMetrics(testId, baseline.metrics.edgePerformanceMetrics, current.metrics.edgePerformanceMetrics, thresholds.edgePerformanceMetrics)
  }

  private compareAPIResponseTimes(
    testId: string,
    baseline: { [endpoint: string]: ResponseTimeMetrics },
    current: { [endpoint: string]: ResponseTimeMetrics },
    thresholds: any
  ): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    for (const endpoint in current) {
      const baselineMetrics = baseline[endpoint]
      const currentMetrics = current[endpoint]

      if (!baselineMetrics) {
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

  private compareDatabaseQueries(
    testId: string,
    baseline: { [query: string]: DatabaseMetrics },
    current: { [query: string]: DatabaseMetrics },
    thresholds: any
  ): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    for (const query in current) {
      const baselineMetrics = baseline[query]
      const currentMetrics = current[query]

      if (!baselineMetrics) {
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

  private compareFrontendMetrics(
    testId: string,
    baseline: FrontendMetrics,
    current: FrontendMetrics,
    thresholds: any
  ): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

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

  private compareAlertDispatchMetrics(
    testId: string,
    baseline: AlertDispatchMetrics,
    current: AlertDispatchMetrics,
    thresholds: any
  ): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

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

  private compareEdgePerformanceMetrics(
    testId: string,
    baseline: EdgePerformanceMetrics,
    current: EdgePerformanceMetrics,
    thresholds: any
  ): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

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

  private generateRecommendations(testId: string): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    const recommendations = new Set<string>()

    // Generate recommendations based on violations
    results.violations.forEach(violation => {
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

  private async generateReports(testId: string): Promise<void> {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    const config = results.config.reporting

    // Generate JSON report
    if (config.formats.includes('json')) {
      results.artifacts.jsonReport = JSON.stringify(results, null, 2)
    }

    // Generate JUnit report
    if (config.formats.includes('junit')) {
      results.artifacts.junitReport = this.generateJUnitReport(results)
    }

    // Generate HTML report
    if (config.formats.includes('html')) {
      results.artifacts.htmlReport = this.generateHTMLReport(results)
    }

    // Generate Markdown report
    if (config.formats.includes('markdown')) {
      results.artifacts.markdownReport = this.generateMarkdownReport(results)
    }

    // Send to destinations
    for (const destination of config.destinations) {
      await this.sendReportToDestination(testId, destination)
    }
  }

  private generateJUnitReport(results: PerformanceRegressionResults): string {
    const testsuite = {
      name: `Performance Regression Test - ${results.config.name}`,
      tests: results.summary.totalTests,
      failures: results.summary.failedTests,
      errors: results.summary.criticalFailures,
      time: results.duration / 1000,
      testcase: results.comparisons.map(comparison => ({
        classname: comparison.category,
        name: comparison.metric,
        time: 0,
        failure: comparison.status === 'fail' ? {
          message: `Performance threshold exceeded: ${comparison.actual} > ${comparison.threshold}`,
          _text: `Baseline: ${comparison.baseline}, Current: ${comparison.actual}, Change: ${comparison.changePercent.toFixed(2)}%`
        } : undefined
      }))
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${testsuite.name}" tests="${testsuite.tests}" failures="${testsuite.failures}" errors="${testsuite.errors}" time="${testsuite.time}">
${testsuite.testcase.map(test => `  <testcase classname="${test.classname}" name="${test.name}" time="${test.time}">
${test.failure ? `    <failure message="${test.failure.message}">${test.failure._text}</failure>` : ''}
  </testcase>`).join('\n')}
</testsuite>`
  }

  private generateHTMLReport(results: PerformanceRegressionResults): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
        .violations { margin: 20px 0; }
        .violation { background-color: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #f44336; }
        .violation.high { border-left-color: #ff9800; }
        .violation.critical { border-left-color: #f44336; }
        .recommendations { background-color: #e8f5e8; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .pass { color: green; }
        .warn { color: orange; }
        .fail { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Regression Test Report</h1>
        <p><strong>Test:</strong> ${results.config.name}</p>
        <p><strong>Date:</strong> ${results.timestamp.toISOString()}</p>
        <p><strong>Status:</strong> <span class="${results.status}">${results.status.toUpperCase()}</span></p>
        <p><strong>Duration:</strong> ${(results.duration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${results.summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="pass">${results.summary.passedTests}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="fail">${results.summary.failedTests}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3 class="fail">${results.summary.criticalFailures}</h3>
            <p>Critical</p>
        </div>
    </div>

    <h2>Performance Violations</h2>
    <div class="violations">
        ${results.violations.map(violation => `
            <div class="violation ${violation.severity}">
                <h4>${violation.category.toUpperCase()}: ${violation.metric}</h4>
                <p><strong>Severity:</strong> ${violation.severity.toUpperCase()}</p>
                <p><strong>Description:</strong> ${violation.description}</p>
                <p><strong>Impact:</strong> ${violation.impact}</p>
                <p><strong>Recommendation:</strong> ${violation.recommendation}</p>
            </div>
        `).join('')}
    </div>

    <h2>Performance Comparisons</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Current</th>
                <th>Change</th>
                <th>Threshold</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${results.comparisons.map(comparison => `
                <tr>
                    <td>${comparison.category}</td>
                    <td>${comparison.metric}</td>
                    <td>${comparison.baseline.toFixed(2)}</td>
                    <td>${comparison.actual.toFixed(2)}</td>
                    <td>${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(2)}%</td>
                    <td>${comparison.threshold.toFixed(2)}</td>
                    <td class="${comparison.status}">${comparison.status.toUpperCase()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`
  }

  private generateMarkdownReport(results: PerformanceRegressionResults): string {
    return `
# Performance Regression Test Report

## Test Information
- **Test Name:** ${results.config.name}
- **Date:** ${results.timestamp.toISOString()}
- **Status:** ${results.status.toUpperCase()}
- **Duration:** ${(results.duration / 1000).toFixed(2)}s

## Summary
| Metric | Count |
|--------|-------|
| Total Tests | ${results.summary.totalTests} |
| Passed | ${results.summary.passedTests} |
| Failed | ${results.summary.failedTests} |
| Critical Failures | ${results.summary.criticalFailures} |

## Performance Violations
${results.violations.map(violation => `
### ${violation.category.toUpperCase()}: ${violation.metric}
- **Severity:** ${violation.severity.toUpperCase()}
- **Description:** ${violation.description}
- **Impact:** ${violation.impact}
- **Recommendation:** ${violation.recommendation}
`).join('')}

## Performance Comparisons
| Category | Metric | Baseline | Current | Change | Threshold | Status |
|----------|--------|----------|---------|--------|-----------|--------|
${results.comparisons.map(comparison =>
    `| ${comparison.category} | ${comparison.metric} | ${comparison.baseline.toFixed(2)} | ${comparison.actual.toFixed(2)} | ${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(2)}% | ${comparison.threshold.toFixed(2)} | ${comparison.status.toUpperCase()} |`
  ).join('\n')}

## Recommendations
${results.recommendations.map(rec => `- ${rec}`).join('\n')}
`
  }

  private async sendReportToDestination(testId: string, destination: string): Promise<void> {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    switch (destination) {
      case 'console':
        console.log(`[PerformanceRegression] Report for ${testId}:`, results)
        break
      case 'file':
        // Save report to file
        break
      case 'artifact':
        // Save as CI/CD artifact
        break
      case 'slack':
        // Send to Slack webhook
        break
      case 'email':
        // Send email report
        break
    }
  }

  private determineTestStatus(testId: string): void {
    const results = this.activeTests.get(testId)
    if (!results) {
      return
    }

    const enforcement = results.config.enforcement
    const criticalViolations = results.violations.filter(v => v.severity === 'critical')
    const highViolations = results.violations.filter(v => v.severity === 'high')

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

  private async persistBaseline(version: string, baseline: PerformanceBaseline): Promise<void> {
    // In a real implementation, this would save to database or file system
    console.log(`[PerformanceRegression] Persisting baseline ${version} to storage`)
  }

  private generateTestId(): string {
    return `regression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCIDefaultConfig(): PerformanceRegressionConfig {
    const baseline = this.getBaseline() || this.baselineStorage.get('1.0.0')!

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

  // Simulation methods
  private async simulateDatabaseQuery(query: string): Promise<void> {
    // Simulate database query execution time
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150))
  }

  private async simulateAlertDispatch(): Promise<void> {
    // Simulate alert dispatch time
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 80))
  }

  private async simulateEdgeRequest(): Promise<void> {
    // Simulate edge request processing time
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 120))
  }
}

// Export singleton instance
export const performanceRegressionTesting = PerformanceRegressionTesting.getInstance()

// Export hooks for easy integration
export function usePerformanceRegressionTesting() {
  return {
    executeRegressionTest: performanceRegressionTesting.executeRegressionTest.bind(performanceRegressionTesting),
    executeCIDPerformanceTest: performanceRegressionTesting.executeCIDPerformanceTest.bind(performanceRegressionTesting),
    updateBaseline: performanceRegressionTesting.updateBaseline.bind(performanceRegressionTesting),
    getBaseline: performanceRegressionTesting.getBaseline.bind(performanceRegressionTesting),
    getTestResults: performanceRegressionTesting.getTestResults.bind(performanceRegressionTesting),
    getTestHistory: performanceRegressionTesting.getTestHistory.bind(performanceRegressionTesting)
  }
}

export default performanceRegressionTesting