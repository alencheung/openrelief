/**
 * Performance Regression Testing - Type Definitions
 *
 * All interfaces and types used by the performance regression testing
 * infrastructure. Extracted from performance-regression-testing.ts to
 * keep that file focused on orchestration logic.
 */

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
  config: Record<string, unknown>
  expectedMetrics: Record<string, unknown>
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
    markdownReport?: string
    trendData?: unknown
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
