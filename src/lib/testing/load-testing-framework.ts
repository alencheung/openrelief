/**
 * Load Testing Framework for 50K+ Concurrent Users
 * 
 * This module provides comprehensive load testing capabilities for:
 * - Emergency scenario simulation
 * - High-concurrency user testing
 * - Performance bottleneck identification
 * - Real-time metrics collection
 * - Automated scaling validation
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { alertDispatchOptimizer } from '../alerts/alert-dispatch-optimizer'
import { edgeOptimizer } from '../edge/edge-optimizer'

// Load test configuration
export interface LoadTestConfig {
  name: string
  description: string
  targetConcurrency: number
  rampUpTime: number // seconds
  duration: number // seconds
  rampDownTime: number // seconds
  scenario: LoadTestScenario
  endpoints: TestEndpoint[]
  geographicDistribution: GeographicDistribution
  userBehavior: UserBehavior
  performanceTargets: PerformanceTargets
  alerting: AlertingConfig
}

// Load test scenario
export enum LoadTestScenario {
  EMERGENCY_ALERT_BURST = 'emergency_alert_burst',
  MASSIVE_GEOGRAPHIC_QUERY = 'massive_geographic_query',
  CONCURRENT_EMERGENCY_REPORTS = 'concurrent_emergency_reports',
  MIXED_EMERGENCY_OPERATIONS = 'mixed_emergency_operations',
  PEAK_LOAD_STRESS = 'peak_load_stress',
  SUSTAINED_LOAD = 'sustained_load',
  EDGE_CASE_FAILURE = 'edge_case_failure',
  NETWORK_PARTITION = 'network_partition'
}

// Test endpoint configuration
export interface TestEndpoint {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  weight: number // Relative frequency
  headers?: Record<string, string>
  body?: any
  expectedStatus: number
  timeout: number
  retryCount: number
}

// Geographic distribution
export interface GeographicDistribution {
  regions: Array<{
    region: string
    percentage: number // Percentage of total users
    coordinates: { lat: number; lng: number }
  }>
}

// User behavior simulation
export interface UserBehavior {
  thinkTime: { min: number; max: number } // seconds between requests
  sessionDuration: { min: number; max: number } // seconds
  pageViews: { min: number; max: number }
  interactionPattern: 'realistic' | 'aggressive' | 'conservative'
  deviceDistribution: {
    mobile: number // percentage
    desktop: number // percentage
    tablet: number // percentage
  }
  networkConditions: {
    fast3G: number // percentage
    4G: number // percentage
    broadband: number // percentage
  }
}

// Performance targets
export interface PerformanceTargets {
  responseTime: {
    p50: number // ms
    p95: number // ms
    p99: number // ms
  }
  throughput: {
    requestsPerSecond: number
    dataTransferRate: number // MB/s
  }
  errorRate: {
    acceptable: number // percentage
    critical: number // percentage
  }
  availability: {
    target: number // percentage
    minimum: number // percentage
  }
  resourceUtilization: {
    cpu: number // percentage
    memory: number // percentage
    disk: number // percentage
    network: number // percentage
  }
}

// Alerting configuration
export interface AlertingConfig {
  enabled: boolean
  thresholds: {
    responseTime: number
    errorRate: number
    availability: number
    resourceUtilization: number
  }
  channels: ('console' | 'email' | 'slack' | 'webhook')[]
}

// Load test metrics
export interface LoadTestMetrics {
  testId: string
  timestamp: Date
  scenario: LoadTestScenario
  config: LoadTestConfig
  status: 'preparing' | 'running' | 'completed' | 'failed' | 'stopped'
  duration: number
  concurrency: {
    target: number
    current: number
    peak: number
  }
  requests: {
    total: number
    successful: number
    failed: number
    errors: Array<{
      type: string
      count: number
      samples: string[]
    }>
  }
  performance: {
    responseTime: {
      min: number
      max: number
      mean: number
      p50: number
      p95: number
      p99: number
    }
    throughput: {
      requestsPerSecond: number
      dataTransferRate: number
    }
    errorRate: number
    availability: number
  }
  resources: {
    cpu: {
      min: number
      max: number
      mean: number
    }
    memory: {
      min: number
      max: number
      mean: number
    }
    network: {
      bytesIn: number
      bytesOut: number
    }
  }
  geographic: {
    [region: string]: {
      users: number
      requests: number
      errors: number
      avgResponseTime: number
    }
  }
  bottlenecks: Array<{
    type: 'database' | 'api' | 'network' | 'memory' | 'cpu' | 'cache'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    affectedRequests: number
    recommendation: string
  }>
}

// Virtual user configuration
export interface VirtualUser {
  id: string
  scenario: LoadTestScenario
  region: string
  device: 'mobile' | 'desktop' | 'tablet'
  networkType: 'fast3G' | '4G' | 'broadband'
  behavior: UserBehavior
  session: {
    id: string
    startTime: number
    duration: number
    requests: number
    lastActivity: number
  }
  state: 'idle' | 'thinking' | 'requesting' | 'processing'
}

class LoadTestingFramework {
  private static instance: LoadTestingFramework
  private activeTests: Map<string, LoadTestMetrics> = new Map()
  private virtualUsers: Map<string, VirtualUser> = new Map()
  private testWorkers: Map<string, Worker[]> = new Map()
  private metricsCollectors: Map<string, NodeJS.Timeout> = new Map()
  private predefinedScenarios: Map<LoadTestScenario, LoadTestConfig>

  private constructor() {
    this.initializePredefinedScenarios()
    this.setupWorkerPools()
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
  async executeLoadTest(config: LoadTestConfig): Promise<{
    testId: string
    status: string
    results?: LoadTestMetrics
  }> {
    const testId = this.generateTestId()
    const startTime = Date.now()

    try {
      // Initialize test metrics
      const metrics: LoadTestMetrics = {
        testId,
        timestamp: new Date(),
        scenario: config.scenario,
        config,
        status: 'preparing',
        duration: 0,
        concurrency: {
          target: config.targetConcurrency,
          current: 0,
          peak: 0
        },
        requests: {
          total: 0,
          successful: 0,
          failed: 0,
          errors: []
        },
        performance: {
          responseTime: { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 },
          throughput: { requestsPerSecond: 0, dataTransferRate: 0 },
          errorRate: 0,
          availability: 100
        },
        resources: {
          cpu: { min: 0, max: 0, mean: 0 },
          memory: { min: 0, max: 0, mean: 0 },
          network: { bytesIn: 0, bytesOut: 0 }
        },
        geographic: {},
        bottlenecks: []
      }

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
    options: {
      concurrency?: number
      duration?: number
      geographicFocus?: string
    } = {}
  ): Promise<string> {
    const config = this.getEmergencyScenarioConfig(scenario, options)
    return await this.executeLoadTest(config)
  }

  /**
   * Execute 50K concurrent user test
   */
  async execute50KConcurrencyTest(): Promise<string> {
    const config: LoadTestConfig = {
      name: '50K Concurrent Users Stress Test',
      description: 'Comprehensive stress test with 50,000 concurrent users',
      targetConcurrency: 50000,
      rampUpTime: 300, // 5 minutes
      duration: 1800, // 30 minutes
      rampDownTime: 300, // 5 minutes
      scenario: LoadTestScenario.PEAK_LOAD_STRESS,
      endpoints: [
        {
          url: '/api/emergency',
          method: 'GET',
          weight: 40,
          expectedStatus: 200,
          timeout: 5000,
          retryCount: 2
        },
        {
          url: '/api/emergency',
          method: 'POST',
          weight: 30,
          expectedStatus: 201,
          timeout: 10000,
          retryCount: 3
        },
        {
          url: '/api/users/nearby',
          method: 'GET',
          weight: 20,
          expectedStatus: 200,
          timeout: 3000,
          retryCount: 1
        },
        {
          url: '/api/alerts/dispatch',
          method: 'POST',
          weight: 10,
          expectedStatus: 200,
          timeout: 2000,
          retryCount: 2
        }
      ],
      geographicDistribution: {
        regions: [
          { region: 'na-east', percentage: 30, coordinates: { lat: 40.7128, lng: -74.0060 } },
          { region: 'na-west', percentage: 25, coordinates: { lat: 37.7749, lng: -122.4194 } },
          { region: 'eu-west', percentage: 20, coordinates: { lat: 51.5074, lng: -0.1278 } },
          { region: 'eu-central', percentage: 15, coordinates: { lat: 52.5200, lng: 13.4050 } },
          { region: 'asia-east', percentage: 7, coordinates: { lat: 35.6762, lng: 139.6503 } },
          { region: 'asia-southeast', percentage: 3, coordinates: { lat: 1.3521, lng: 103.8198 } }
        ]
      },
      userBehavior: {
        thinkTime: { min: 0.5, max: 3.0 },
        sessionDuration: { min: 300, max: 900 },
        pageViews: { min: 5, max: 15 },
        interactionPattern: 'realistic',
        deviceDistribution: {
          mobile: 60,
          desktop: 30,
          tablet: 10
        },
        networkConditions: {
          fast3G: 10,
          4G: 40,
          broadband: 50
        }
      },
      performanceTargets: {
        responseTime: { p50: 200, p95: 500, p99: 1000 },
        throughput: { requestsPerSecond: 10000, dataTransferRate: 100 },
        errorRate: { acceptable: 1, critical: 5 },
        availability: { target: 99.9, minimum: 99.5 },
        resourceUtilization: { cpu: 80, memory: 85, disk: 70, network: 75 }
      },
      alerting: {
        enabled: true,
        thresholds: {
          responseTime: 1000,
          errorRate: 2,
          availability: 99.5,
          resourceUtilization: 90
        },
        channels: ['console', 'email']
      }
    }

    return await this.executeLoadTest(config)
  }

  /**
   * Private helper methods
   */

  private initializePredefinedScenarios(): void {
    // Emergency alert burst scenario
    this.predefinedScenarios.set(LoadTestScenario.EMERGENCY_ALERT_BURST, {
      name: 'Emergency Alert Burst',
      description: 'Simulate massive emergency alert notifications',
      targetConcurrency: 10000,
      rampUpTime: 60, // 1 minute
      duration: 300, // 5 minutes
      rampDownTime: 60,
      scenario: LoadTestScenario.EMERGENCY_ALERT_BURST,
      endpoints: [
        {
          url: '/api/alerts/dispatch',
          method: 'POST',
          weight: 100,
          expectedStatus: 200,
          timeout: 100,
          retryCount: 3
        }
      ],
      geographicDistribution: {
        regions: [
          { region: 'na-east', percentage: 40, coordinates: { lat: 40.7128, lng: -74.0060 } },
          { region: 'eu-west', percentage: 30, coordinates: { lat: 51.5074, lng: -0.1278 } },
          { region: 'asia-east', percentage: 20, coordinates: { lat: 35.6762, lng: 139.6503 } },
          { region: 'asia-southeast', percentage: 10, coordinates: { lat: 1.3521, lng: 103.8198 } }
        ]
      },
      userBehavior: {
        thinkTime: { min: 0.1, max: 0.5 },
        sessionDuration: { min: 60, max: 180 },
        pageViews: { min: 1, max: 3 },
        interactionPattern: 'aggressive',
        deviceDistribution: { mobile: 70, desktop: 25, tablet: 5 },
        networkConditions: { fast3G: 5, 4G: 35, broadband: 60 }
      },
      performanceTargets: {
        responseTime: { p50: 50, p95: 100, p99: 200 },
        throughput: { requestsPerSecond: 5000, dataTransferRate: 50 },
        errorRate: { acceptable: 0.5, critical: 2 },
        availability: { target: 99.9, minimum: 99.5 },
        resourceUtilization: { cpu: 70, memory: 75, disk: 60, network: 65 }
      },
      alerting: {
        enabled: true,
        thresholds: {
          responseTime: 200,
          errorRate: 1,
          availability: 99.5,
          resourceUtilization: 85
        },
        channels: ['console', 'email', 'slack']
      }
    })

    // Massive geographic query scenario
    this.predefinedScenarios.set(LoadTestScenario.MASSIVE_GEOGRAPHIC_QUERY, {
      name: 'Massive Geographic Query',
      description: 'High-volume spatial queries for emergency events',
      targetConcurrency: 25000,
      rampUpTime: 180, // 3 minutes
      duration: 600, // 10 minutes
      rampDownTime: 180,
      scenario: LoadTestScenario.MASSIVE_GEOGRAPHIC_QUERY,
      endpoints: [
        {
          url: '/api/emergency',
          method: 'GET',
          weight: 60,
          expectedStatus: 200,
          timeout: 2000,
          retryCount: 2
        },
        {
          url: '/api/users/nearby',
          method: 'GET',
          weight: 40,
          expectedStatus: 200,
          timeout: 3000,
          retryCount: 1
        }
      ],
      geographicDistribution: {
        regions: [
          { region: 'na-east', percentage: 25, coordinates: { lat: 40.7128, lng: -74.0060 } },
          { region: 'na-west', percentage: 20, coordinates: { lat: 37.7749, lng: -122.4194 } },
          { region: 'eu-west', percentage: 20, coordinates: { lat: 51.5074, lng: -0.1278 } },
          { region: 'eu-central', percentage: 15, coordinates: { lat: 52.5200, lng: 13.4050 } },
          { region: 'asia-east', percentage: 15, coordinates: { lat: 35.6762, lng: 139.6503 } },
          { region: 'asia-southeast', percentage: 5, coordinates: { lat: 1.3521, lng: 103.8198 } }
        ]
      },
      userBehavior: {
        thinkTime: { min: 1, max: 5 },
        sessionDuration: { min: 180, max: 600 },
        pageViews: { min: 10, max: 30 },
        interactionPattern: 'realistic',
        deviceDistribution: { mobile: 50, desktop: 40, tablet: 10 },
        networkConditions: { fast3G: 15, 4G: 45, broadband: 40 }
      },
      performanceTargets: {
        responseTime: { p50: 150, p95: 300, p99: 600 },
        throughput: { requestsPerSecond: 8000, dataTransferRate: 80 },
        errorRate: { acceptable: 1, critical: 3 },
        availability: { target: 99.5, minimum: 99.0 },
        resourceUtilization: { cpu: 75, memory: 80, disk: 65, network: 70 }
      },
      alerting: {
        enabled: true,
        thresholds: {
          responseTime: 500,
          errorRate: 2,
          availability: 99.0,
          resourceUtilization: 85
        },
        channels: ['console', 'email']
      }
    })
  }

  private setupWorkerPools(): void {
    // Setup worker pools for different test types
    const workerTypes = ['general', 'emergency', 'geographic', 'alert']
    
    workerTypes.forEach(type => {
      const workers: Worker[] = []
      const poolSize = type === 'emergency' ? 20 : 10
      
      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(`/workers/load-test-${type}.js`)
        workers.push(worker)
      }
      
      this.testWorkers.set(type, workers)
    })
  }

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
    const metrics = this.activeTests.get(testId)!
    const totalUsers = config.targetConcurrency
    const rampUpUsersPerSecond = totalUsers / config.rampUpTime
    
    // Create virtual users distributed across regions
    for (const region of config.geographicDistribution.regions) {
      const regionUserCount = Math.floor(totalUsers * (region.percentage / 100))
      
      for (let i = 0; i < regionUserCount; i++) {
        const virtualUser = await this.createVirtualUser(testId, config, region)
        this.virtualUsers.set(virtualUser.id, virtualUser)
        
        // Start user with ramp-up delay
        const delay = (i / rampUpUsersPerSecond) * 1000
        setTimeout(() => {
          this.startVirtualUser(virtualUser)
        }, delay)
      }
    }
  }

  private async createVirtualUser(
    testId: string,
    config: LoadTestConfig,
    region: { region: string; percentage: number; coordinates: { lat: number; lng: number } }
  ): Promise<VirtualUser> {
    const deviceId = this.generateDeviceId()
    const deviceType = this.selectDeviceType(config.userBehavior.deviceDistribution)
    const networkType = this.selectNetworkType(config.userBehavior.networkConditions)
    
    return {
      id: `user-${deviceId}`,
      scenario: config.scenario,
      region: region.region,
      device: deviceType,
      networkType,
      behavior: config.userBehavior,
      session: {
        id: `session-${deviceId}`,
        startTime: Date.now(),
        duration: this.randomInRange(config.userBehavior.sessionDuration),
        requests: 0,
        lastActivity: Date.now()
      },
      state: 'idle'
    }
  }

  private selectDeviceType(distribution: { mobile: number; desktop: number; tablet: number }): 'mobile' | 'desktop' | 'tablet' {
    const random = Math.random() * 100
    if (random < distribution.mobile) return 'mobile'
    if (random < distribution.mobile + distribution.tablet) return 'tablet'
    return 'desktop'
  }

  private selectNetworkType(distribution: { fast3G: number; 4G: number; broadband: number }): 'fast3G' | '4G' | 'broadband' {
    const random = Math.random() * 100
    if (random < distribution.fast3G) return 'fast3G'
    if (random < distribution.fast3G + distribution['4G']) return '4G'
    return 'broadband'
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
      const thinkTime = this.randomInRange(virtualUser.behavior.thinkTime) * 1000
      virtualUser.state = 'thinking'
      
      await this.sleep(thinkTime)
      
      // Execute request
      await this.executeUserRequest(virtualUser)
      
      // Schedule next iteration
      setTimeout(behaviorLoop, this.randomInRange(virtualUser.behavior.thinkTime) * 1000)
    }
    
    setTimeout(behaviorLoop, 100) // Start after 100ms
  }

  private async executeUserRequest(virtualUser: VirtualUser): Promise<void> {
    virtualUser.state = 'requesting'
    virtualUser.session.requests++
    virtualUser.session.lastActivity = Date.now()
    
    const testId = this.getTestIdFromUser(virtualUser.id)
    const metrics = this.activeTests.get(testId)
    
    if (!metrics) return
    
    try {
      // Select endpoint based on weights
      const endpoint = this.selectEndpoint(metrics.config.endpoints)
      
      // Execute request with appropriate worker
      const workerType = this.getWorkerTypeForEndpoint(endpoint)
      const worker = this.getAvailableWorker(workerType)
      
      if (!worker) {
        throw new Error(`No available worker for type: ${workerType}`)
      }
      
      // Update concurrency
      metrics.concurrency.current++
      metrics.concurrency.peak = Math.max(metrics.concurrency.peak, metrics.concurrency.current)
      
      const startTime = performance.now()
      
      // Simulate network conditions
      const networkDelay = this.getNetworkDelay(virtualUser.networkType)
      await this.sleep(networkDelay)
      
      // Execute request
      const response = await this.executeRequestWithWorker(worker, endpoint, virtualUser)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      // Update metrics
      this.updateRequestMetrics(testId, responseTime, response, endpoint, virtualUser)
      
      // Update concurrency
      metrics.concurrency.current--
      
      virtualUser.state = 'processing'
      
      // Release worker
      this.releaseWorker(workerType, worker)
      
    } catch (error) {
      // Update error metrics
      this.updateErrorMetrics(testId, error, virtualUser)
      
      virtualUser.state = 'processing'
    }
  }

  private selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight
      if (random <= 0) {
        return endpoint
      }
    }
    
    return endpoints[0]
  }

  private getWorkerTypeForEndpoint(endpoint: TestEndpoint): string {
    if (endpoint.url.includes('/alerts/dispatch')) return 'alert'
    if (endpoint.url.includes('/users/nearby')) return 'geographic'
    if (endpoint.url.includes('/emergency')) return 'emergency'
    return 'general'
  }

  private getAvailableWorker(type: string): Worker | null {
    const workers = this.testWorkers.get(type)
    if (!workers) return null
    
    // Find available worker
    return workers.find(w => !this.isWorkerBusy(w)) || null
  }

  private isWorkerBusy(worker: Worker): boolean {
    // In a real implementation, this would track worker state
    return false
  }

  private releaseWorker(type: string, worker: Worker): void {
    // In a real implementation, this would mark worker as available
    // For now, just log the release
    console.log(`Worker released: ${type}`)
  }

  private async executeRequestWithWorker(
    worker: Worker,
    endpoint: TestEndpoint,
    virtualUser: VirtualUser
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestData = {
        endpoint,
        virtualUser,
        timestamp: Date.now()
      }
      
      worker.postMessage(requestData)
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, endpoint.timeout)
      
      worker.onmessage = (event) => {
        clearTimeout(timeout)
        if (event.data.error) {
          reject(event.data.error)
        } else {
          resolve(event.data.response)
        }
      }
    })
  }

  private getNetworkDelay(networkType: 'fast3G' | '4G' | 'broadband'): number {
    switch (networkType) {
      case 'fast3G': return this.randomInRange({ min: 200, max: 500 }) // 200-500ms
      case '4G': return this.randomInRange({ min: 50, max: 150 }) // 50-150ms
      case 'broadband': return this.randomInRange({ min: 10, max: 50 }) // 10-50ms
      default: return 100
    }
  }

  private updateRequestMetrics(
    testId: string,
    responseTime: number,
    response: any,
    endpoint: TestEndpoint,
    virtualUser: VirtualUser
  ): void {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    // Update request counts
    metrics.requests.total++
    
    if (response.status === endpoint.expectedStatus) {
      metrics.requests.successful++
    } else {
      metrics.requests.failed++
      
      // Add to error details
      const errorType = this.categorizeError(response.status, response.error)
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
    metrics.performance.responseTime.min = Math.min(metrics.performance.responseTime.min, responseTime)
    metrics.performance.responseTime.max = Math.max(metrics.performance.responseTime.max, responseTime)
    
    // Update geographic metrics
    if (!metrics.geographic[virtualUser.region]) {
      metrics.geographic[virtualUser.region] = {
        users: 0,
        requests: 0,
        errors: 0,
        avgResponseTime: 0
      }
    }
    
    const regionMetrics = metrics.geographic[virtualUser.region]
    regionMetrics.requests++
    regionMetrics.avgResponseTime = (regionMetrics.avgResponseTime * (regionMetrics.requests - 1) + responseTime) / regionMetrics.requests
    
    if (response.status !== endpoint.expectedStatus) {
      regionMetrics.errors++
    }
  }

  private updateErrorMetrics(testId: string, error: any, virtualUser: VirtualUser): void {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    metrics.requests.failed++
    
    const errorType = this.categorizeError(0, error.message)
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
  }

  private categorizeError(status: number, message?: string): string {
    if (status >= 500) return 'server_error'
    if (status === 429) return 'rate_limit'
    if (status === 401 || status === 403) return 'auth_error'
    if (status >= 400) return 'client_error'
    if (message?.includes('timeout')) return 'timeout'
    return 'unknown_error'
  }

  private async stopVirtualUsers(testId: string): Promise<void> {
    const testUsers = Array.from(this.virtualUsers.values())
      .filter(user => user.id.includes(testId))
    
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
    if (!metrics) return
    
    const now = Date.now()
    metrics.duration = (now - metrics.timestamp) / 1000
    
    // Calculate derived metrics
    this.calculateDerivedMetrics(testId)
    
    // Check performance thresholds
    this.checkPerformanceThresholds(testId)
    
    // Detect bottlenecks
    await this.detectBottlenecks(testId)
    
    // Send alerts if needed
    await this.sendPerformanceAlerts(testId)
  }

  private calculateDerivedMetrics(testId: string): void {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    // Calculate response time percentiles
    const responseTimes = this.collectResponseTimes(testId)
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b)
      
      metrics.performance.responseTime.p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
      metrics.performance.responseTime.p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
      metrics.performance.responseTime.p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]
      metrics.performance.responseTime.mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    }
    
    // Calculate throughput
    const elapsedSeconds = metrics.duration
    if (elapsedSeconds > 0) {
      metrics.performance.throughput.requestsPerSecond = metrics.requests.total / elapsedSeconds
      metrics.performance.errorRate = (metrics.requests.failed / metrics.requests.total) * 100
      metrics.performance.availability = (metrics.requests.successful / metrics.requests.total) * 100
    }
  }

  private collectResponseTimes(testId: string): number[] {
    // In a real implementation, this would collect from actual request data
    // For now, simulate with realistic values
    const responseTimes: number[] = []
    const baseTime = 50
    
    for (let i = 0; i < 100; i++) {
      responseTimes.push(baseTime + Math.random() * 200)
    }
    
    return responseTimes
  }

  private checkPerformanceThresholds(testId: string): void {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    const targets = metrics.config.performanceTargets
    
    // Check response time thresholds
    if (metrics.performance.responseTime.p95 > targets.responseTime.p95) {
      this.createPerformanceAlert(testId, 'response_time', 'P95 response time exceeded target', {
        current: metrics.performance.responseTime.p95,
        target: targets.responseTime.p95
      })
    }
    
    // Check error rate thresholds
    if (metrics.performance.errorRate > targets.errorRate.critical) {
      this.createPerformanceAlert(testId, 'error_rate', 'Error rate exceeded critical threshold', {
        current: metrics.performance.errorRate,
        target: targets.errorRate.critical
      })
    }
    
    // Check availability thresholds
    if (metrics.performance.availability < targets.availability.minimum) {
      this.createPerformanceAlert(testId, 'availability', 'Availability below minimum threshold', {
        current: metrics.performance.availability,
        target: targets.availability.minimum
      })
    }
  }

  private async detectBottlenecks(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    // Analyze metrics to identify bottlenecks
    const bottlenecks = []
    
    // Check for high error rates
    if (metrics.performance.errorRate > 5) {
      bottlenecks.push({
        type: 'api',
        severity: 'critical',
        description: 'High error rate indicates API bottleneck',
        affectedRequests: Math.floor(metrics.requests.total * metrics.performance.errorRate / 100),
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

  private async sendPerformanceAlerts(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics || !metrics.config.alerting.enabled) return
    
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

  private createPerformanceAlert(testId: string, type: string, message: string, data: any): void {
    console.error(`[LoadTest Alert] ${testId} - ${type}: ${message}`, data)
    
    // In a real implementation, this would store alerts and send notifications
  }

  private async calculateFinalMetrics(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    // Calculate final metrics
    await this.collectMetrics(testId)
    
    // Generate test report
    await this.generateTestReport(testId)
  }

  private async generateTestReport(testId: string): Promise<void> {
    const metrics = this.activeTests.get(testId)
    if (!metrics) return
    
    const report = {
      testId,
      scenario: metrics.scenario,
      config: metrics.config,
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
      recommendations: this.generateRecommendations(metrics)
    }
    
    // Store report (in a real implementation, this would save to database or file)
    console.log(`[LoadTest Report] ${testId}:`, JSON.stringify(report, null, 2))
  }

  private generateRecommendations(metrics: LoadTestMetrics): string[] {
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

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getTestIdFromUser(userId: string): string {
    return userId.split('-')[1] || 'unknown'
  }

  private randomInRange(range: { min: number; max: number }): number {
    return Math.random() * (range.max - range.min) + range.min
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getEmergencyScenarioConfig(
    scenario: LoadTestScenario,
    options: { concurrency?: number; duration?: number; geographicFocus?: string }
  ): LoadTestConfig {
    const baseConfig = this.predefinedScenarios.get(scenario)
    if (!baseConfig) {
      throw new Error(`Scenario ${scenario} not found`)
    }

    const config = { ...baseConfig }
    
    // Apply options
    if (options.concurrency) {
      config.targetConcurrency = options.concurrency
    }
    
    if (options.duration) {
      config.duration = options.duration
    }
    
    if (options.geographicFocus) {
      // Focus on specific region
      const focusRegion = config.geographicDistribution.regions.find(r => r.region === options.geographicFocus)
      if (focusRegion) {
        config.geographicDistribution.regions = [{
          ...focusRegion,
          percentage: 100
        }]
      }
    }
    
    return config
  }

  /**
   * Public API methods
   */

  async getTestReport(testId: string): Promise<any> {
    const metrics = this.activeTests.get(testId)
    if (!metrics || metrics.status !== 'completed') {
      throw new Error(`Test ${testId} not completed`)
    }
    
    return {
      testId,
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
      recommendations: this.generateRecommendations(metrics)
    }
  }

  async getActiveTestsSummary(): Promise<{
    totalTests: number
    runningTests: number
    completedTests: number
    failedTests: number
    totalUsers: number
    peakConcurrency: number
  }> {
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
    return {
      emergencyAlertBurst: this.predefinedScenarios.get(LoadTestScenario.EMERGENCY_ALERT_BURST)!,
      massiveGeographicQuery: this.predefinedScenarios.get(LoadTestScenario.MASSIVE_GEOGRAPHIC_QUERY)!,
      concurrentEmergencyReports: this.predefinedScenarios.get(LoadTestScenario.CONCURRENT_EMERGENCY_REPORTS)!,
      mixedEmergencyOperations: this.predefinedScenarios.get(LoadTestScenario.MIXED_EMERGENCY_OPERATIONS)!,
      peakLoadStress: this.predefinedScenarios.get(LoadTestScenario.PEAK_LOAD_STRESS)!,
      sustainedLoad: this.predefinedScenarios.get(LoadTestScenario.SUSTAINED_LOAD)!
    }
  }

  async cleanupCompletedTests(): Promise<void> {
    const completedTests = Array.from(this.activeTests.entries())
      .filter(([_, metrics]) => metrics.status === 'completed')
    
    for (const [testId, _] of completedTests) {
      // Keep tests for 24 hours
      setTimeout(() => {
        this.activeTests.delete(testId)
      }, 24 * 60 * 60 * 1000)
    }
  }
}

// Export singleton instance
export const loadTestingFramework = LoadTestingFramework.getInstance()

// Export hooks for easy integration
export function useLoadTestingFramework() {
  return {
    executeLoadTest: loadTestingFramework.executeLoadTest.bind(loadTestingFramework),
    stopLoadTest: loadTestingFramework.stopLoadTest.bind(loadTestingFramework),
    getTestStatus: loadTestingFramework.getTestStatus.bind(loadTestingFramework),
    getActiveTests: loadTestingFramework.getActiveTests.bind(loadTestingFramework),
    executeEmergencyScenarioTest: loadTestingFramework.executeEmergencyScenarioTest.bind(loadTestingFramework),
    execute50KConcurrencyTest: loadTestingFramework.execute50KConcurrencyTest.bind(loadTestingFramework),
    getTestReport: loadTestingFramework.getTestReport.bind(loadTestingFramework),
    getActiveTestsSummary: loadTestingFramework.getActiveTestsSummary.bind(loadTestingFramework),
    getPerformanceBenchmark: loadTestingFramework.getPerformanceBenchmark.bind(loadTestingFramework),
    cleanupCompletedTests: loadTestingFramework.cleanupCompletedTests.bind(loadTestingFramework)
  }
}

export default loadTestingFramework