/**
 * Load Testing Framework - Scenario Definitions and Builders
 *
 * Predefined load test scenario configurations (emergency alert burst,
 * massive geographic query), the 50K concurrency stress test config, and
 * helpers for deriving scenario configs from runtime options. Extracted
 * from load-testing-framework.ts. Re-exported via the framework module so
 * existing imports from '@/lib/testing/load-testing-framework' keep working.
 */

import {
  LoadTestConfig,
  LoadTestScenario,
  EmergencyScenarioOptions
} from './load-testing-types'

/**
 * Build the two predefined scenario configs used by the framework's
 * benchmark API and emergency scenario runner. Returns a Map keyed by
 * LoadTestScenario so callers can look up a config directly.
 */
export function buildPredefinedScenarios(): Map<LoadTestScenario, LoadTestConfig> {
  const scenarios = new Map<LoadTestScenario, LoadTestConfig>()

  // Emergency alert burst scenario
  scenarios.set(LoadTestScenario.EMERGENCY_ALERT_BURST, {
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
        { region: 'na-east', percentage: 40, coordinates: { lat: 40.7128, lng: -74.006 } },
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
      networkConditions: { fast3G: 5, '4G': 35, broadband: 60 }
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
  scenarios.set(LoadTestScenario.MASSIVE_GEOGRAPHIC_QUERY, {
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
        { region: 'na-east', percentage: 25, coordinates: { lat: 40.7128, lng: -74.006 } },
        { region: 'na-west', percentage: 20, coordinates: { lat: 37.7749, lng: -122.4194 } },
        { region: 'eu-west', percentage: 20, coordinates: { lat: 51.5074, lng: -0.1278 } },
        { region: 'eu-central', percentage: 15, coordinates: { lat: 52.52, lng: 13.405 } },
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
      networkConditions: { fast3G: 15, '4G': 45, broadband: 40 }
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

  return scenarios
}

/**
 * Build the comprehensive 50,000 concurrent user stress test configuration.
 */
export function build50KConcurrencyConfig(): LoadTestConfig {
  return {
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
        { region: 'na-east', percentage: 30, coordinates: { lat: 40.7128, lng: -74.006 } },
        { region: 'na-west', percentage: 25, coordinates: { lat: 37.7749, lng: -122.4194 } },
        { region: 'eu-west', percentage: 20, coordinates: { lat: 51.5074, lng: -0.1278 } },
        { region: 'eu-central', percentage: 15, coordinates: { lat: 52.52, lng: 13.405 } },
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
        '4G': 40,
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
}

/**
 * Resolve a predefined scenario config and apply optional overrides for
 * concurrency, duration, or geographic focus. Throws if the scenario has
 * not been registered.
 */
export function getEmergencyScenarioConfig(
  scenarios: Map<LoadTestScenario, LoadTestConfig>,
  scenario: LoadTestScenario,
  options: EmergencyScenarioOptions = {}
): LoadTestConfig {
  const baseConfig = scenarios.get(scenario)
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
    const focusRegion = config.geographicDistribution.regions.find(
      r => r.region === options.geographicFocus
    )
    if (focusRegion) {
      config.geographicDistribution = {
        ...config.geographicDistribution,
        regions: [
          {
            ...focusRegion,
            percentage: 100
          }
        ]
      }
    }
  }

  return config
}

/**
 * Snapshot of every named benchmark scenario config. Reads the resolved
 * configs from the supplied map; matches the original framework behaviour
 * of asserting each entry is present (registered scenarios only populate a
 * subset today).
 */
export function getPerformanceBenchmark(
  scenarios: Map<LoadTestScenario, LoadTestConfig>
): {
  emergencyAlertBurst: LoadTestConfig
  massiveGeographicQuery: LoadTestConfig
  concurrentEmergencyReports: LoadTestConfig
  mixedEmergencyOperations: LoadTestConfig
  peakLoadStress: LoadTestConfig
  sustainedLoad: LoadTestConfig
} {
  return {
    emergencyAlertBurst: scenarios.get(LoadTestScenario.EMERGENCY_ALERT_BURST)!,
    massiveGeographicQuery: scenarios.get(LoadTestScenario.MASSIVE_GEOGRAPHIC_QUERY)!,
    concurrentEmergencyReports: scenarios.get(
      LoadTestScenario.CONCURRENT_EMERGENCY_REPORTS
    )!,
    mixedEmergencyOperations: scenarios.get(
      LoadTestScenario.MIXED_EMERGENCY_OPERATIONS
    )!,
    peakLoadStress: scenarios.get(LoadTestScenario.PEAK_LOAD_STRESS)!,
    sustainedLoad: scenarios.get(LoadTestScenario.SUSTAINED_LOAD)!
  }
}
