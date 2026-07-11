/**
 * Load Testing Framework for 50K+ Concurrent Users
 *
 * This module provides comprehensive load testing capabilities for:
 * - Emergency scenario simulation
 * - High-concurrency user testing
 * - Performance bottleneck identification
 * - Real-time metrics collection
 * - Automated scaling validation
 *
 * Type definitions, scenario definitions/builders, report generation,
 * metrics analysis, and virtual-user/worker helpers have been extracted
 * into sibling modules to keep this file focused on orchestration.
 * Everything is re-exported below so existing imports from
 * '@/lib/testing/load-testing-framework' continue to work unchanged.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { alertDispatchOptimizer } from '../alerts/alert-dispatch-optimizer'
import { edgeOptimizer } from '../edge/edge-optimizer'
import {
  LoadTestConfig,
  LoadTestMetrics,
  LoadTestScenario,
  VirtualUser,
  LoadTestExecutionResult,
  ActiveTestsSummary,
  EmergencyScenarioOptions,
  createInitialMetrics
} from './load-testing-types'
import {
  buildPredefinedScenarios,
  build50KConcurrencyConfig,
  getEmergencyScenarioConfig as buildEmergencyScenarioConfig,
  getPerformanceBenchmark
} from './load-testing-scenarios'
import { buildTestReport, generateTestReport } from './load-testing-reporting'
import {
  updateRequestMetrics as applyRequestMetrics,
  updateErrorMetrics as applyErrorMetrics,
  calculateDerivedMetrics,
  checkPerformanceThresholds,
  detectBottlenecks,
  sendPerformanceAlerts
} from './load-testing-metrics'
import {
  generateTestId,
  getTestIdFromUser,
  randomInRange,
  sleep,
  selectEndpoint,
  getWorkerTypeForEndpoint,
  getNetworkDelay,
  createVirtualUser as buildVirtualUser,
  executeRequestWithWorker,
  setupWorkerPools,
  getAvailableWorker,
  releaseWorker,
  WorkerPool
} from './load-testing-users'

class LoadTestingFramework {
  private static instance: LoadTestingFramework
  private activeTests: Map<string, LoadTestMetrics> = new Map()
  private virtualUsers: Map<string, VirtualUser> = new Map()
  private testWorkers: WorkerPool = new Map()
  private metricsCollectors: Map<string, NodeJS.Timeout> = new Map()
  private predefinedScenarios: Map<LoadTestScenario, LoadTestConfig> = new Map()

  private constructor() {
    // Defer worker-pool setup outside the browser (build-time page-data
    // collection lacks env vars and browser APIs).
    this.predefinedScenarios = buildPredefinedScenarios()
    if (typeof window !== 'undefined') {
      this.testWorkers = setupWorkerPools()
    }
  }

  static getInstance(): LoadTestingFramework {
    if (!LoadTestingFramework.instance) {
      LoadTestingFramework.instance = new LoadTestingFramework()
    }
    return LoadTestingFramework.instance
  }

  /**
   * Execute load test
   */
  async executeLoadTest(config: LoadTestConfig): Promise<LoadTestExecutionResult> {
    const testId = generateTestId()

    try {
      // Initialize test metrics
      const metrics: LoadTestMetrics = createInitialMetrics(testId, config)
      this.activeTests.set(testId, metrics)

      // Prepare test environment
      await this.prepareTestEnvironment(config)
      // Start virtual users
      await this.startVirtualUsers(testId, config)
      // Start metrics collection
      this.startMetricsCollection(testId)

      // Update status to running
      metrics.status = 'running'
      this.activeTests.set(testId, metrics)
      console.log(`[LoadTestingFramework] Load test ${testId} started: ${config.name}`)

      return {
        testId,
        status: 'running'
      }
    } catch (error) {
      const metrics = this.activeTests.get(testId)
      if (metrics) {
        metrics.status = 'failed'
        this.activeTests.set(testId, metrics)
      }

      console.error(`[LoadTestingFramework] Load test ${testId} failed:`, error)

      return {
        testId,
        status: 'failed'
      }
    }
  }

  /**
   * Stop load test
   */
  async stopLoadTest(testId: string): Promise<LoadTestMetrics> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) {
      throw new Error(`Test ${testId} not found`)
    }

    try {
      // Stop virtual users
      await this.stopVirtualUsers(testId)
      // Stop metrics collection
      this.stopMetricsCollection(testId)
      // Calculate final metrics
      await this.calculateFinalMetrics(testId)

      // Update status
      metrics.status = 'completed'
      this.activeTests.set(testId, metrics)
      console.log(`[LoadTestingFramework] Load test ${testId} completed`)

      return metrics
    } catch (error) {
      metrics.status = 'failed'
      this.activeTests.set(testId, metrics)

      throw error
    }
  }

  /**
   * Get test status
   */
  getTestStatus(testId: string): LoadTestMetrics | null {
    return this.activeTests.get(testId) || null
  }

  /**
   * Get all active tests
   */
  getActiveTests(): LoadTestMetrics[] {
    return Array.from(this.activeTests.values())
  }

  /**
   * Execute emergency scenario test
   */
  async executeEmergencyScenarioTest(
    scenario: LoadTestScenario,
    options: EmergencyScenarioOptions = {}
  ): Promise<LoadTestExecutionResult> {
    const config = buildEmergencyScenarioConfig(this.predefinedScenarios, scenario, options)
    return await this.executeLoadTest(config)
  }

  /**
   * Execute 50K concurrent user test
   */
  async execute50KConcurrencyTest(): Promise<LoadTestExecutionResult> {
    const config = build50KConcurrencyConfig()
    return await this.executeLoadTest(config)
  }

  /**
   * Private helper methods
   */

  private async prepareTestEnvironment(config: LoadTestConfig): Promise<void> {
    // Enable emergency mode in edge optimizer
    await edgeOptimizer.enableEmergencyMode()

    // Optimize database for high load
    await queryOptimizer.warmupCache()

    // Optimize alert dispatch for high volume
    await alertDispatchOptimizer.optimizeForEmergencyMode()

    // Clear any existing caches that might interfere
    await this.clearTestCaches()

    // Preload test data
    await this.preloadTestData(config)
  }

  private async startVirtualUsers(testId: string, config: LoadTestConfig): Promise<void> {
    const totalUsers = config.targetConcurrency
    const rampUpUsersPerSecond = totalUsers / config.rampUpTime

    // Create virtual users distributed across regions
    for (const region of config.geographicDistribution.regions) {
      const regionUserCount = Math.floor(totalUsers * (region.percentage / 100))

      for (let i = 0; i < regionUserCount; i++) {
        const virtualUser = buildVirtualUser(config, region)
        this.virtualUsers.set(virtualUser.id, virtualUser)

        // Start user with ramp-up delay
        const delay = (i / rampUpUsersPerSecond) * 1000
        setTimeout(() => {
          this.startVirtualUser(virtualUser)
        }, delay)
      }
    }
  }

  private async startVirtualUser(virtualUser: VirtualUser): Promise<void> {
    virtualUser.state = 'thinking'
    virtualUser.session.lastActivity = Date.now()

    // Start user behavior loop
    this.runUserBehaviorLoop(virtualUser)
  }

  private async runUserBehaviorLoop(virtualUser: VirtualUser): Promise<void> {
    const sessionDuration = virtualUser.session.duration * 1000
    const sessionEndTime = virtualUser.session.startTime + sessionDuration

    const behaviorLoop = async () => {
      if (Date.now() >= sessionEndTime) {
        virtualUser.state = 'idle'
        return
      }

      // Think time
      const thinkTime = randomInRange(virtualUser.behavior.thinkTime) * 1000
      virtualUser.state = 'thinking'

      await sleep(thinkTime)

      // Execute request
      await this.executeUserRequest(virtualUser)

      // Schedule next iteration
      setTimeout(behaviorLoop, randomInRange(virtualUser.behavior.thinkTime) * 1000)
    }

    setTimeout(behaviorLoop, 100) // Start after 100ms
  }

  private async executeUserRequest(virtualUser: VirtualUser): Promise<void> {
    virtualUser.state = 'requesting'
    virtualUser.session.requests++
    virtualUser.session.lastActivity = Date.now()

    const testId = getTestIdFromUser(virtualUser.id)
    const metrics = this.activeTests.get(testId)

    if (!metrics) {
      return
    }

    try {
      // Select endpoint based on weights
      const endpoint = selectEndpoint(metrics.config.endpoints)

      // Execute request with appropriate worker
      const workerType = getWorkerTypeForEndpoint(endpoint)
      const worker = getAvailableWorker(this.testWorkers, workerType)

      if (!worker) {
        throw new Error(`No available worker for type: ${workerType}`)
      }

      // Update concurrency
      metrics.concurrency.current++
      metrics.concurrency.peak = Math.max(metrics.concurrency.peak, metrics.concurrency.current)

      const startTime = performance.now()
      // Simulate network conditions
      const networkDelay = getNetworkDelay(virtualUser.networkType)
      await sleep(networkDelay)

      // Execute request
      const response = await executeRequestWithWorker(worker, endpoint, virtualUser)
      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Update metrics
      applyRequestMetrics(metrics, responseTime, response, endpoint, virtualUser)

      // Update concurrency
      metrics.concurrency.current--

      virtualUser.state = 'processing'

      // Release worker
      releaseWorker(workerType, worker)
    } catch (error) {
      // Update error metrics
      applyErrorMetrics(metrics, error, virtualUser)

      virtualUser.state = 'processing'
    }
  }

  private async stopVirtualUsers(testId: string): Promise<void> {
    const testUsers = Array.from(this.virtualUsers.values()).filter(user =>
      user.id.includes(testId)
    )

    // Stop all virtual users
    for (const user of testUsers) {
      user.state = 'idle'
      this.virtualUsers.delete(user.id)
    }
  }

  private startMetricsCollection(testId: string): void {
    const collector = setInterval(async () => {
      await this.collectMetrics(testId)
    }, 5000) // Collect every 5 seconds

    this.metricsCollectors.set(testId, collector)
  }

  private stopMetricsCollection(testId: string): void {
    const collector = this.metricsCollectors.get(testId)
    if (collector) {
      clearInterval(collector)
      this.metricsCollectors.delete(testId)
    }
  }

  private async collectMetrics(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) {
      return
    }

    const now = Date.now()
    metrics.duration = (now - metrics.timestamp.getTime()) / 1000

    // Calculate derived metrics
    calculateDerivedMetrics(metrics, testId)

    // Check performance thresholds
    checkPerformanceThresholds(testId, metrics)

    // Detect bottlenecks
    detectBottlenecks(metrics)

    // Send alerts if needed
    sendPerformanceAlerts(testId, metrics)
  }

  private async calculateFinalMetrics(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) {
      return
    }

    // Calculate final metrics
    await this.collectMetrics(testId)

    // Generate test report (delegates to the reporting module)
    const finalMetrics = this.activeTests.get(testId)
    if (finalMetrics) {
      generateTestReport(testId, finalMetrics)
    }
  }

  private async clearTestCaches(): Promise<void> {
    // Clear application caches that might interfere with testing
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
      }
    }
  }

  private async preloadTestData(config: LoadTestConfig): Promise<void> {
    // Preload test data to reduce setup time
    for (const endpoint of config.endpoints) {
      if (endpoint.method === 'POST' && endpoint.body) {
        // Preload test data
        console.log(`Preloading test data for ${endpoint.url}`)
      }
    }
  }

  /**
   * Public API methods
   */

  async getTestReport(testId: string): Promise<any> {
    const metrics = this.activeTests.get(testId)
    if (!metrics || metrics.status !== 'completed') {
      throw new Error(`Test ${testId} not completed`)
    }

    return buildTestReport(metrics)
  }

  async getActiveTestsSummary(): Promise<ActiveTestsSummary> {
    const tests = Array.from(this.activeTests.values())

    return {
      totalTests: tests.length,
      runningTests: tests.filter(t => t.status === 'running').length,
      completedTests: tests.filter(t => t.status === 'completed').length,
      failedTests: tests.filter(t => t.status === 'failed').length,
      totalUsers: tests.reduce((sum, t) => sum + t.concurrency.target, 0),
      peakConcurrency: Math.max(...tests.map(t => t.concurrency.peak))
    }
  }

  async getPerformanceBenchmark(): Promise<{
    emergencyAlertBurst: LoadTestConfig
    massiveGeographicQuery: LoadTestConfig
    concurrentEmergencyReports: LoadTestConfig
    mixedEmergencyOperations: LoadTestConfig
    peakLoadStress: LoadTestConfig
    sustainedLoad: LoadTestConfig
  }> {
    return getPerformanceBenchmark(this.predefinedScenarios)
  }

  async cleanupCompletedTests(): Promise<void> {
    const completedTests = Array.from(this.activeTests.entries()).filter(
      ([_, metrics]) => metrics.status === 'completed'
    )

    for (const [testId, _] of completedTests) {
      // Keep tests for 24 hours
      setTimeout(
        () => {
          this.activeTests.delete(testId)
        },
        24 * 60 * 60 * 1000
      )
    }
  }
}

// Export singleton instance
export const loadTestingFramework = LoadTestingFramework.getInstance()

// Export hooks for easy integration
export function useLoadTestingFramework() {
  const f = loadTestingFramework
  return {
    executeLoadTest: f.executeLoadTest.bind(f),
    stopLoadTest: f.stopLoadTest.bind(f),
    getTestStatus: f.getTestStatus.bind(f),
    getActiveTests: f.getActiveTests.bind(f),
    executeEmergencyScenarioTest: f.executeEmergencyScenarioTest.bind(f),
    execute50KConcurrencyTest: f.execute50KConcurrencyTest.bind(f),
    getTestReport: f.getTestReport.bind(f),
    getActiveTestsSummary: f.getActiveTestsSummary.bind(f),
    getPerformanceBenchmark: f.getPerformanceBenchmark.bind(f),
    cleanupCompletedTests: f.cleanupCompletedTests.bind(f)
  }
}

export default loadTestingFramework

// Re-export everything from the extracted modules so existing imports from
// '@/lib/testing/load-testing-framework' continue to work unchanged.
export * from './load-testing-types'
export * from './load-testing-scenarios'
export * from './load-testing-metrics'
export * from './load-testing-users'
export {
  generateRecommendations,
  buildTestReport,
  generateTestReport
} from './load-testing-reporting'
export type { LoadTestReport } from './load-testing-reporting'
