/**
 * Load Testing Framework - Type Definitions
 *
 * All interfaces, types, and enums used by the load testing infrastructure.
 * Extracted from load-testing-framework.ts to keep that file focused on
 * orchestration logic. Existing imports from
 * '@/lib/testing/load-testing-framework' continue to work because the
 * framework module re-exports everything defined here.
 */

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
    '4G': number // percentage
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

// Shape returned by executeLoadTest and related scenario runners.
export interface LoadTestExecutionResult {
  testId: string
  status: string
  results?: LoadTestMetrics
}

// Shape returned by getActiveTestsSummary.
export interface ActiveTestsSummary {
  totalTests: number
  runningTests: number
  completedTests: number
  failedTests: number
  totalUsers: number
  peakConcurrency: number
}

// Options accepted by executeEmergencyScenarioTest.
export interface EmergencyScenarioOptions {
  concurrency?: number
  duration?: number
  geographicFocus?: string
}

/**
 * Build a freshly-zeroed LoadTestMetrics object for a new test run. Kept
 * here (next to the metrics type) so the framework orchestrator can stay
 * focused on flow rather than object literal bookkeeping.
 */
export function createInitialMetrics(testId: string, config: LoadTestConfig): LoadTestMetrics {
  return {
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
}
