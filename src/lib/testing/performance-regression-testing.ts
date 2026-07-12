/**
 * Performance Regression Testing for CI/CD Pipeline
 *
 * This module provides automated performance regression testing that integrates
 * with CI/CD pipelines to detect performance degradations before they reach production.
 * It includes baseline comparison, threshold enforcement, and automated reporting.
 *
 * Type definitions, baseline comparison logic, metric measurements, and report
 * generation have been extracted into sibling modules to keep this file focused
 * on orchestration. Everything is re-exported below so existing imports from
 * '@/lib/testing/performance-regression-testing' continue to work unchanged.
 */

import {
  PerformanceRegressionConfig,
  PerformanceRegressionResults,
  PerformanceBaseline,
  PerformanceTest,
  PerformanceTestSuite
} from './performance-regression-types'
import {
  createDefaultBaseline,
  compareBaselines,
  generateRecommendations,
  determineTestStatus,
  getCIDefaultConfig
} from './performance-regression-baseline'
import {
  measureResponseTime,
  measureDatabasePerformance,
  measureFrontendMetrics,
  measureAlertDispatch,
  measureEdgePerformance
} from './performance-regression-metrics'
import { generateReports } from './performance-regression-reporting'

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
      compareBaselines(results)

      // Generate recommendations
      generateRecommendations(results)

      // Generate reports
      await generateReports(results)

      // Determine final status
      determineTestStatus(results)

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
    this.baselineStorage.set('1.0.0', createDefaultBaseline())
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
      let testMetrics: unknown

      switch (test.type) {
        case 'api':
          testMetrics = await measureResponseTime(test.config)
          break
        case 'database':
          testMetrics = await measureDatabasePerformance(test.config)
          break
        case 'frontend':
          testMetrics = await measureFrontendMetrics(test.config)
          break
        case 'alert':
          testMetrics = await measureAlertDispatch(test.config)
          break
        case 'edge':
          testMetrics = await measureEdgePerformance(test.config)
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
          description: `Test execution failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          impact: 'Unable to measure performance for this component',
          recommendation: 'Fix test execution issues before proceeding'
        })
      } else {
        results.summary.skippedTests++
      }
    }
  }

  private storeTestMetrics(testId: string, testType: string, metrics: unknown): void {
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

  private async persistBaseline(version: string, baseline: PerformanceBaseline): Promise<void> {
    // In a real implementation, this would save to database or file system
    console.log(`[PerformanceRegression] Persisting baseline ${version} to storage`)
  }

  private generateTestId(): string {
    return `regression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCIDefaultConfig(): PerformanceRegressionConfig {
    const baseline = this.getBaseline() || this.baselineStorage.get('1.0.0')!
    return getCIDefaultConfig(baseline)
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

// Re-export everything from the extracted modules so existing imports from
// '@/lib/testing/performance-regression-testing' keep working unchanged.
export * from './performance-regression-types'
export * from './performance-regression-baseline'
export * from './performance-regression-metrics'
export * from './performance-regression-reporting'
