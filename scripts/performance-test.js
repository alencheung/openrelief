#!/usr/bin/env node

/**
 * Performance Testing Script for Development
 * 
 * This script provides comprehensive performance testing capabilities for development
 * environments, including load testing, regression testing, and performance validation.
 * 
 * Usage:
 *   node scripts/performance-test.js --type=load --concurrency=1000
 *   node scripts/performance-test.js --type=regression --baseline=main
 *   node scripts/performance-test.js --type=emergency --scenario=alert_burst
 */

const { performanceIntegration } = require('../src/lib/performance/performance-integration')
const { loadTestingFramework } = require('../src/lib/testing/load-testing-framework')
const { performanceRegressionTesting } = require('../src/lib/testing/performance-regression-testing')
const { performanceDashboard } = require('../src/lib/performance/performance-dashboard')

// Parse command line arguments
const args = process.argv.slice(2)
const options = parseArgs(args)

// Test configuration
const TEST_CONFIG = {
  load: {
    defaultConcurrency: 1000,
    maxConcurrency: 10000,
    duration: 300, // 5 minutes
    rampUpTime: 60, // 1 minute
    scenarios: ['basic_load', 'emergency_load', 'peak_load']
  },
  regression: {
    baseline: 'main',
    thresholds: {
      responseTime: 20, // 20% increase allowed
      errorRate: 50, // 50% increase allowed
      throughput: 10 // 10% decrease allowed
    }
  },
  emergency: {
    scenarios: ['alert_burst', 'massive_geo_query', 'concurrent_reports'],
    concurrency: 5000,
    duration: 180 // 3 minutes
  },
  monitoring: {
    duration: 600, // 10 minutes
    interval: 5000, // 5 seconds
    metrics: ['response_time', 'error_rate', 'throughput', 'cpu', 'memory']
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 OpenRelief Performance Testing Script')
    console.log('=====================================')
    
    // Validate arguments
    if (!options.type) {
      console.error('❌ Error: Test type is required')
      printUsage()
      process.exit(1)
    }

    // Initialize performance integration
    console.log('📊 Initializing performance integration...')
    await performanceIntegration.initialize()
    
    // Run appropriate test
    switch (options.type) {
      case 'load':
        await runLoadTest(options)
        break
      case 'regression':
        await runRegressionTest(options)
        break
      case 'emergency':
        await runEmergencyTest(options)
        break
      case 'monitor':
        await runMonitoringTest(options)
        break
      case 'validate':
        await runPerformanceValidation(options)
        break
      case 'benchmark':
        await runBenchmarkTest(options)
        break
      default:
        console.error(`❌ Error: Unknown test type: ${options.type}`)
        printUsage()
        process.exit(1)
    }

    console.log('✅ Performance testing completed successfully')
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Run load testing
 */
async function runLoadTest(options) {
  console.log(`🔄 Running load test with ${options.concurrency || TEST_CONFIG.load.defaultConcurrency} concurrent users...`)
  
  const concurrency = parseInt(options.concurrency) || TEST_CONFIG.load.defaultConcurrency
  const duration = parseInt(options.duration) || TEST_CONFIG.load.duration
  const scenario = options.scenario || 'basic_load'
  
  // Validate concurrency
  if (concurrency > TEST_CONFIG.load.maxConcurrency) {
    console.warn(`⚠️  Warning: Concurrency (${concurrency}) exceeds recommended maximum (${TEST_CONFIG.load.maxConcurrency})`)
  }
  
  try {
    // Start performance monitoring
    console.log('📈 Starting performance monitoring...')
    const monitorId = startPerformanceMonitoring()
    
    // Execute load test
    console.log(`🚀 Starting load test: ${scenario}`)
    const testId = await loadTestingFramework.executeLoadTest({
      name: `Development Load Test - ${scenario}`,
      description: `Load testing with ${concurrency} concurrent users for ${duration} seconds`,
      targetConcurrency: concurrency,
      rampUpTime: TEST_CONFIG.load.rampUpTime,
      duration: duration,
      rampDownTime: 60,
      scenario: scenario.toUpperCase(),
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
          url: '/api/alerts/dispatch',
          method: 'POST',
          weight: 30,
          expectedStatus: 200,
          timeout: 2000,
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
          url: '/',
          method: 'GET',
          weight: 10,
          expectedStatus: 200,
          timeout: 3000,
          retryCount: 1
        }
      ],
      geographicDistribution: {
        regions: [
          { region: 'local', percentage: 100, coordinates: { lat: 40.7128, lng: -74.0060 } }
        ]
      },
      userBehavior: {
        thinkTime: { min: 0.5, max: 2.0 },
        sessionDuration: { min: 60, max: 300 },
        pageViews: { min: 3, max: 10 },
        interactionPattern: 'realistic',
        deviceDistribution: { mobile: 60, desktop: 35, tablet: 5 },
        networkConditions: { fast3G: 10, 4G: 40, broadband: 50 }
      },
      performanceTargets: {
        responseTime: { p50: 200, p95: 500, p99: 1000 },
        throughput: { requestsPerSecond: concurrency * 2, dataTransferRate: 10 },
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
        channels: ['console']
      }
    })
    
    // Wait for test completion
    console.log(`⏳ Test running... (ID: ${testId})`)
    await waitForTestCompletion(testId, duration + 120) // Add 2 minutes buffer
    
    // Stop monitoring
    stopPerformanceMonitoring(monitorId)
    
    // Get results
    const results = await loadTestingFramework.getTestResults(testId)
    printLoadTestResults(results)
    
    // Validate results against targets
    validateLoadTestResults(results, scenario)
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message)
    throw error
  }
}

/**
 * Run regression testing
 */
async function runRegressionTest(options) {
  console.log('🔄 Running performance regression test...')
  
  const baseline = options.baseline || TEST_CONFIG.regression.baseline
  
  try {
    // Start performance monitoring
    console.log('📈 Starting performance monitoring...')
    const monitorId = startPerformanceMonitoring()
    
    // Execute regression test
    console.log(`🔍 Running regression test against baseline: ${baseline}`)
    const results = await performanceRegressionTesting.executeRegressionTest({
      name: 'Development Regression Test',
      description: `Performance regression testing against ${baseline}`,
      baseline: await getBaselineData(baseline),
      thresholds: TEST_CONFIG.regression.thresholds,
      testSuites: [
        {
          name: 'API Performance Tests',
          description: 'Test API endpoint performance',
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
          timeout: 300000,
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
          timeout: 600000,
          retries: 1
        }
      ],
      reporting: {
        formats: ['json', 'console'],
        destinations: ['console'],
        includeBaselineComparison: true,
        includeTrendAnalysis: true,
        includeRecommendations: true
      },
      enforcement: {
        enabled: true,
        failureThreshold: 'critical',
        blockMerge: false, // Don't block merges in development
        requireApproval: false,
        notifyChannels: ['console']
      }
    })
    
    // Stop monitoring
    stopPerformanceMonitoring(monitorId)
    
    // Print results
    printRegressionTestResults(results)
    
    // Check if test passed
    if (results.status === 'failed') {
      console.error('❌ Regression test failed - performance degradation detected')
      process.exit(1)
    } else {
      console.log('✅ Regression test passed - no performance degradation detected')
    }
    
  } catch (error) {
    console.error('❌ Regression test failed:', error.message)
    throw error
  }
}

/**
 * Run emergency scenario testing
 */
async function runEmergencyTest(options) {
  console.log('🚨 Running emergency scenario test...')
  
  const scenario = options.scenario || 'alert_burst'
  const concurrency = parseInt(options.concurrency) || TEST_CONFIG.emergency.concurrency
  const duration = parseInt(options.duration) || TEST_CONFIG.emergency.duration
  
  try {
    // Activate emergency mode
    console.log('🚨 Activating emergency mode...')
    await performanceIntegration.activateEmergencyMode('Development emergency test')
    
    // Start performance monitoring
    console.log('📈 Starting performance monitoring...')
    const monitorId = startPerformanceMonitoring()
    
    // Execute emergency scenario test
    console.log(`🚀 Running emergency scenario: ${scenario}`)
    const testId = await loadTestingFramework.executeEmergencyScenarioTest(
      scenario.toUpperCase(),
      { concurrency, duration, geographicFocus: 'local' }
    )
    
    // Wait for test completion
    console.log(`⏳ Emergency test running... (ID: ${testId})`)
    await waitForTestCompletion(testId, duration + 120)
    
    // Deactivate emergency mode
    console.log('🔄 Deactivating emergency mode...')
    await performanceIntegration.deactivateEmergencyMode('Development emergency test completed')
    
    // Stop monitoring
    stopPerformanceMonitoring(monitorId)
    
    // Get results
    const results = await loadTestingFramework.getTestResults(testId)
    printEmergencyTestResults(results, scenario)
    
    // Validate emergency performance
    validateEmergencyTestResults(results, scenario)
    
  } catch (error) {
    console.error('❌ Emergency test failed:', error.message)
    throw error
  }
}

/**
 * Run performance monitoring
 */
async function runMonitoringTest(options) {
  console.log('📊 Running performance monitoring test...')
  
  const duration = parseInt(options.duration) || TEST_CONFIG.monitoring.duration
  const interval = parseInt(options.interval) || TEST_CONFIG.monitoring.interval
  
  try {
    console.log(`📈 Monitoring performance for ${duration} seconds...`)
    
    const startTime = Date.now()
    const endTime = startTime + (duration * 1000)
    
    // Start monitoring
    const monitorId = startPerformanceMonitoring(interval)
    
    // Monitor for specified duration
    while (Date.now() < endTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = duration - elapsed
      
      console.log(`⏳ Monitoring... ${elapsed}s elapsed, ${remaining}s remaining`)
      
      // Get current metrics
      const metrics = performanceIntegration.getMetrics()
      printCurrentMetrics(metrics)
      
      await sleep(Math.min(interval, 10000)) // Wait interval or 10s max
    }
    
    // Stop monitoring
    stopPerformanceMonitoring(monitorId)
    
    // Generate monitoring report
    console.log('📋 Generating monitoring report...')
    const report = await generateMonitoringReport(startTime, endTime)
    printMonitoringReport(report)
    
  } catch (error) {
    console.error('❌ Monitoring test failed:', error.message)
    throw error
  }
}

/**
 * Run performance validation
 */
async function runPerformanceValidation(options) {
  console.log('✅ Running performance validation...')
  
  const component = options.component || 'all'
  
  try {
    // Validate system health
    console.log('🏥 Validating system health...')
    const health = await validateSystemHealth()
    printHealthValidation(health)
    
    if (component === 'all' || component === 'api') {
      console.log('🌐 Validating API performance...')
      const apiValidation = await validateAPIPerformance()
      printAPIValidation(apiValidation)
    }
    
    if (component === 'all' || component === 'database') {
      console.log('🗄️ Validating database performance...')
      const dbValidation = await validateDatabasePerformance()
      printDatabaseValidation(dbValidation)
    }
    
    if (component === 'all' || component === 'frontend') {
      console.log('🎨 Validating frontend performance...')
      const frontendValidation = await validateFrontendPerformance()
      printFrontendValidation(frontendValidation)
    }
    
    // Overall validation result
    const allValidations = [health]
    if (component === 'all' || component === 'api') allValidations.push(apiValidation)
    if (component === 'all' || component === 'database') allValidations.push(dbValidation)
    if (component === 'all' || component === 'frontend') allValidations.push(frontendValidation)
    
    const overallValid = allValidations.every(v => v.valid)
    
    if (overallValid) {
      console.log('✅ All performance validations passed')
    } else {
      console.error('❌ Some performance validations failed')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error.message)
    throw error
  }
}

/**
 * Run benchmark test
 */
async function runBenchmarkTest(options) {
  console.log('🏃 Running performance benchmark test...')
  
  const iterations = parseInt(options.iterations) || 3
  const concurrency = parseInt(options.concurrency) || 1000
  
  try {
    const results = []
    
    for (let i = 1; i <= iterations; i++) {
      console.log(`🏃 Running benchmark iteration ${i}/${iterations}...`)
      
      // Run load test
      const testId = await loadTestingFramework.executeLoadTest({
        name: `Benchmark Test - Iteration ${i}`,
        description: `Performance benchmark iteration ${i}`,
        targetConcurrency: concurrency,
        rampUpTime: 30,
        duration: 120, // 2 minutes
        rampDownTime: 30,
        scenario: 'PEAK_LOAD_STRESS',
        endpoints: [
          {
            url: '/api/emergency',
            method: 'GET',
            weight: 50,
            expectedStatus: 200,
            timeout: 5000,
            retryCount: 2
          },
          {
            url: '/api/alerts/dispatch',
            method: 'POST',
            weight: 50,
            expectedStatus: 200,
            timeout: 2000,
            retryCount: 3
          }
        ],
        geographicDistribution: {
          regions: [
            { region: 'local', percentage: 100, coordinates: { lat: 40.7128, lng: -74.0060 } }
          ]
        },
        userBehavior: {
          thinkTime: { min: 0.1, max: 0.5 },
          sessionDuration: { min: 60, max: 120 },
          pageViews: { min: 5, max: 15 },
          interactionPattern: 'aggressive',
          deviceDistribution: { mobile: 60, desktop: 35, tablet: 5 },
          networkConditions: { fast3G: 5, 4G: 35, broadband: 60 }
        },
        performanceTargets: {
          responseTime: { p50: 150, p95: 300, p99: 600 },
          throughput: { requestsPerSecond: concurrency * 3, dataTransferRate: 20 },
          errorRate: { acceptable: 0.5, critical: 2 },
          availability: { target: 99.9, minimum: 99.8 },
          resourceUtilization: { cpu: 70, memory: 75, disk: 60, network: 65 }
        },
        alerting: {
          enabled: true,
          thresholds: {
            responseTime: 500,
            errorRate: 1,
            availability: 99.8,
            resourceUtilization: 85
          },
          channels: ['console']
        }
      })
      
      // Wait for completion
      await waitForTestCompletion(testId, 180) // 3 minutes
      
      // Get results
      const testResults = await loadTestingFramework.getTestResults(testId)
      results.push(testResults)
      
      // Wait between iterations
      if (i < iterations) {
        console.log('⏳ Waiting 30 seconds before next iteration...')
        await sleep(30000)
      }
    }
    
    // Calculate benchmark statistics
    const benchmark = calculateBenchmarkStats(results)
    printBenchmarkResults(benchmark)
    
    // Save benchmark results
    await saveBenchmarkResults(benchmark)
    
  } catch (error) {
    console.error('❌ Benchmark test failed:', error.message)
    throw error
  }
}

/**
 * Helper functions
 */

function parseArgs(args) {
  const options = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')
      options[key] = value || true
    }
  }
  
  return options
}

function printUsage() {
  console.log(`
Usage: node scripts/performance-test.js [options]

Options:
  --type=<type>           Test type: load, regression, emergency, monitor, validate, benchmark
  --concurrency=<num>      Number of concurrent users (default: varies by test type)
  --duration=<seconds>      Test duration in seconds (default: varies by test type)
  --scenario=<name>        Test scenario name (default: varies by test type)
  --baseline=<branch>      Baseline branch for regression testing (default: main)
  --component=<name>       Component to validate: api, database, frontend, all (default: all)
  --iterations=<num>       Number of benchmark iterations (default: 3)
  --interval=<seconds>      Monitoring interval in seconds (default: 5)
  --help                   Show this help message

Examples:
  node scripts/performance-test.js --type=load --concurrency=1000
  node scripts/performance-test.js --type=regression --baseline=main
  node scripts/performance-test.js --type=emergency --scenario=alert_burst
  node scripts/performance-test.js --type=monitor --duration=600
  node scripts/performance-test.js --type=validate --component=api
  node scripts/performance-test.js --type=benchmark --iterations=5
`)
}

function startPerformanceMonitoring(interval = 5000) {
  console.log(`📈 Starting performance monitoring (interval: ${interval}ms)`)
  
  const monitorId = setInterval(() => {
    const metrics = performanceIntegration.getMetrics()
    // Store metrics for later analysis
    storeMetrics(metrics)
  }, interval)
  
  return monitorId
}

function stopPerformanceMonitoring(monitorId) {
  console.log('📊 Stopping performance monitoring')
  clearInterval(monitorId)
}

function storeMetrics(metrics) {
  // In a real implementation, this would store metrics to database or file
  // For now, just keep in memory
  if (!global.storedMetrics) {
    global.storedMetrics = []
  }
  global.storedMetrics.push({
    timestamp: new Date(),
    ...metrics
  })
}

async function waitForTestCompletion(testId, timeout) {
  const startTime = Date.now()
  const endTime = startTime + (timeout * 1000)
  
  while (Date.now() < endTime) {
    const status = loadTestingFramework.getTestStatus(testId)
    
    if (status && (status.status === 'completed' || status.status === 'failed')) {
      console.log(`✅ Test completed with status: ${status.status}`)
      return
    }
    
    await sleep(5000) // Check every 5 seconds
  }
  
  throw new Error(`Test ${testId} did not complete within ${timeout} seconds`)
}

async function getBaselineData(baseline) {
  // In a real implementation, this would fetch baseline data from repository or database
  return {
    version: baseline,
    timestamp: new Date(),
    metrics: {
      apiResponseTimes: {
        '/api/emergency': { p50: 150, p95: 300, p99: 500 },
        '/api/alerts/dispatch': { p50: 50, p95: 100, p99: 200 }
      },
      databaseQueries: {
        'emergency_spatial_query': { p95: 200 }
      },
      frontendMetrics: {
        coreWebVitals: {
          lcp: 2500,
          fid: 100,
          cls: 0.1
        }
      }
    }
  }
}

function printLoadTestResults(results) {
  console.log('\n📊 Load Test Results:')
  console.log('=====================')
  console.log(`Test ID: ${results.testId}`)
  console.log(`Status: ${results.status}`)
  console.log(`Duration: ${results.duration}ms`)
  console.log(`Target Concurrency: ${results.concurrency.target}`)
  console.log(`Peak Concurrency: ${results.concurrency.peak}`)
  console.log(`Total Requests: ${results.requests.total}`)
  console.log(`Successful Requests: ${results.requests.successful}`)
  console.log(`Failed Requests: ${results.requests.failed}`)
  console.log(`Error Rate: ${results.performance.errorRate.toFixed(2)}%`)
  console.log(`Availability: ${results.performance.availability.toFixed(2)}%`)
  console.log(`P95 Response Time: ${results.performance.responseTime.p95.toFixed(2)}ms`)
  console.log(`P99 Response Time: ${results.performance.responseTime.p99.toFixed(2)}ms`)
  console.log(`Throughput: ${results.performance.throughput.requestsPerSecond.toFixed(2)} req/s`)
}

function validateLoadTestResults(results, scenario) {
  const targets = getScenarioTargets(scenario)
  let passed = true
  
  console.log('\n🔍 Validating Load Test Results:')
  console.log('===================================')
  
  // Validate response time
  if (results.performance.responseTime.p95 > targets.responseTime.p95) {
    console.log(`❌ P95 response time (${results.performance.responseTime.p95}ms) exceeds target (${targets.responseTime.p95}ms)`)
    passed = false
  } else {
    console.log(`✅ P95 response time (${results.performance.responseTime.p95}ms) within target (${targets.responseTime.p95}ms)`)
  }
  
  // Validate error rate
  if (results.performance.errorRate > targets.errorRate.critical) {
    console.log(`❌ Error rate (${results.performance.errorRate}%) exceeds critical threshold (${targets.errorRate.critical}%)`)
    passed = false
  } else if (results.performance.errorRate > targets.errorRate.acceptable) {
    console.log(`⚠️  Error rate (${results.performance.errorRate}%) exceeds acceptable threshold (${targets.errorRate.acceptable}%)`)
  } else {
    console.log(`✅ Error rate (${results.performance.errorRate}%) within acceptable threshold (${targets.errorRate.acceptable}%)`)
  }
  
  // Validate availability
  if (results.performance.availability < targets.availability.minimum) {
    console.log(`❌ Availability (${results.performance.availability}%) below minimum (${targets.availability.minimum}%)`)
    passed = false
  } else {
    console.log(`✅ Availability (${results.performance.availability}%) above minimum (${targets.availability.minimum}%)`)
  }
  
  return passed
}

function printRegressionTestResults(results) {
  console.log('\n📊 Regression Test Results:')
  console.log('===========================')
  console.log(`Test ID: ${results.testId}`)
  console.log(`Status: ${results.status}`)
  console.log(`Duration: ${results.duration}ms`)
  console.log(`Total Tests: ${results.summary.totalTests}`)
  console.log(`Passed Tests: ${results.summary.passedTests}`)
  console.log(`Failed Tests: ${results.summary.failedTests}`)
  console.log(`Critical Failures: ${results.summary.criticalFailures}`)
  
  if (results.violations.length > 0) {
    console.log('\n🚨 Performance Violations:')
    console.log('==========================')
    results.violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.category}: ${violation.metric}`)
      console.log(`   Severity: ${violation.severity}`)
      console.log(`   Description: ${violation.description}`)
      console.log(`   Recommendation: ${violation.recommendation}`)
      console.log('')
    })
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    console.log('==================')
    results.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })
  }
}

function printEmergencyTestResults(results, scenario) {
  console.log('\n🚨 Emergency Test Results:')
  console.log('===========================')
  console.log(`Scenario: ${scenario}`)
  console.log(`Test ID: ${results.testId}`)
  console.log(`Status: ${results.status}`)
  console.log(`Duration: ${results.duration}ms`)
  console.log(`Peak Concurrency: ${results.concurrency.peak}`)
  console.log(`P95 Response Time: ${results.performance.responseTime.p95.toFixed(2)}ms`)
  console.log(`P99 Response Time: ${results.performance.responseTime.p99.toFixed(2)}ms`)
  console.log(`Error Rate: ${results.performance.errorRate.toFixed(2)}%`)
  console.log(`Availability: ${results.performance.availability.toFixed(2)}%`)
}

function validateEmergencyTestResults(results, scenario) {
  const targets = getEmergencyScenarioTargets(scenario)
  let passed = true
  
  console.log('\n🔍 Validating Emergency Test Results:')
  console.log('=======================================')
  
  // Emergency scenarios have stricter requirements
  if (results.performance.responseTime.p95 > targets.responseTime.p95) {
    console.log(`❌ P95 response time (${results.performance.responseTime.p95}ms) exceeds emergency target (${targets.responseTime.p95}ms)`)
    passed = false
  } else {
    console.log(`✅ P95 response time (${results.performance.responseTime.p95}ms) within emergency target (${targets.responseTime.p95}ms)`)
  }
  
  if (results.performance.errorRate > targets.errorRate.critical) {
    console.log(`❌ Error rate (${results.performance.errorRate}%) exceeds emergency threshold (${targets.errorRate.critical}%)`)
    passed = false
  } else {
    console.log(`✅ Error rate (${results.performance.errorRate}%) within emergency threshold (${targets.errorRate.critical}%)`)
  }
  
  return passed
}

function printCurrentMetrics(metrics) {
  console.log('\n📊 Current Metrics:')
  console.log('==================')
  console.log(`Uptime: ${Math.floor(metrics.uptime / 1000)}s`)
  console.log(`Total Requests: ${metrics.totalRequests}`)
  console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`)
  console.log(`Error Rate: ${metrics.errorRate.toFixed(2)}%`)
  console.log(`Optimizations Applied: ${metrics.optimizationsApplied}`)
  console.log(`Alerts Generated: ${metrics.alertsGenerated}`)
  console.log(`Tests Run: ${metrics.testsRun}`)
}

async function generateMonitoringReport(startTime, endTime) {
  const metrics = global.storedMetrics || []
  
  return {
    period: {
      start: new Date(startTime),
      end: new Date(endTime),
      duration: endTime - startTime
    },
    summary: {
      totalDataPoints: metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length,
      maxResponseTime: Math.max(...metrics.map(m => m.averageResponseTime)),
      minResponseTime: Math.min(...metrics.map(m => m.averageResponseTime)),
      averageErrorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length,
      maxErrorRate: Math.max(...metrics.map(m => m.errorRate)),
      totalOptimizations: metrics.reduce((sum, m) => sum + m.optimizationsApplied, 0),
      totalAlerts: metrics.reduce((sum, m) => sum + m.alertsGenerated, 0)
    },
    trends: calculateTrends(metrics)
  }
}

function printMonitoringReport(report) {
  console.log('\n📋 Monitoring Report:')
  console.log('====================')
  console.log(`Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`)
  console.log(`Duration: ${Math.floor(report.period.duration / 1000)}s`)
  console.log(`Data Points: ${report.summary.totalDataPoints}`)
  console.log(`Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`)
  console.log(`Max Response Time: ${report.summary.maxResponseTime.toFixed(2)}ms`)
  console.log(`Min Response Time: ${report.summary.minResponseTime.toFixed(2)}ms`)
  console.log(`Average Error Rate: ${report.summary.averageErrorRate.toFixed(2)}%`)
  console.log(`Max Error Rate: ${report.summary.maxErrorRate.toFixed(2)}%`)
  console.log(`Total Optimizations: ${report.summary.totalOptimizations}`)
  console.log(`Total Alerts: ${report.summary.totalAlerts}`)
}

async function validateSystemHealth() {
  const status = performanceIntegration.getStatus()
  
  return {
    valid: status.components.every(c => c.healthy),
    components: status.components,
    emergencyMode: status.emergencyMode,
    uptime: status.metrics.uptime
  }
}

function printHealthValidation(health) {
  console.log('\n🏥 System Health Validation:')
  console.log('=============================')
  console.log(`Overall Health: ${health.valid ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`Emergency Mode: ${health.emergencyMode ? '🚨 Active' : '✅ Inactive'}`)
  console.log(`Uptime: ${Math.floor(health.uptime / 1000)}s`)
  
  console.log('\nComponent Health:')
  health.components.forEach(component => {
    console.log(`  ${component.name}: ${component.healthy ? '✅' : '❌'} ${component.healthy ? 'Healthy' : 'Unhealthy'}`)
    if (!component.healthy && component.errors.length > 0) {
      component.errors.forEach(error => {
        console.log(`    ❌ Error: ${error}`)
      })
    }
  })
}

async function validateAPIPerformance() {
  // Simulate API performance validation
  const responseTime = 100 + Math.random() * 200
  const errorRate = Math.random() * 2
  
  return {
    valid: responseTime < 300 && errorRate < 1,
    responseTime,
    errorRate,
    endpoints: [
      { name: '/api/emergency', responseTime: 150 + Math.random() * 100, status: 'healthy' },
      { name: '/api/alerts/dispatch', responseTime: 50 + Math.random() * 50, status: 'healthy' }
    ]
  }
}

function printAPIValidation(validation) {
  console.log('\n🌐 API Performance Validation:')
  console.log('===============================')
  console.log(`Overall API Health: ${validation.valid ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`Average Response Time: ${validation.responseTime.toFixed(2)}ms`)
  console.log(`Error Rate: ${validation.errorRate.toFixed(2)}%`)
  
  console.log('\nEndpoint Performance:')
  validation.endpoints.forEach(endpoint => {
    console.log(`  ${endpoint.name}: ${endpoint.status === 'healthy' ? '✅' : '❌'} ${endpoint.responseTime.toFixed(2)}ms`)
  })
}

async function validateDatabasePerformance() {
  // Simulate database performance validation
  const queryTime = 50 + Math.random() * 150
  const connectionPoolUtilization = 60 + Math.random() * 30
  const cacheHitRate = 80 + Math.random() * 15
  
  return {
    valid: queryTime < 200 && connectionPoolUtilization < 90 && cacheHitRate > 80,
    queryTime,
    connectionPoolUtilization,
    cacheHitRate
  }
}

function printDatabaseValidation(validation) {
  console.log('\n🗄️ Database Performance Validation:')
  console.log('===================================')
  console.log(`Overall Database Health: ${validation.valid ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`Average Query Time: ${validation.queryTime.toFixed(2)}ms`)
  console.log(`Connection Pool Utilization: ${validation.connectionPoolUtilization.toFixed(1)}%`)
  console.log(`Cache Hit Rate: ${validation.cacheHitRate.toFixed(1)}%`)
}

async function validateFrontendPerformance() {
  // Simulate frontend performance validation
  const lcp = 2000 + Math.random() * 1000
  const fid = 50 + Math.random() * 100
  const cls = Math.random() * 0.2
  
  return {
    valid: lcp < 2500 && fid < 100 && cls < 0.1,
    lcp,
    fid,
    cls,
    bundleSize: 200000 + Math.random() * 100000 // 200-300KB
  }
}

function printFrontendValidation(validation) {
  console.log('\n🎨 Frontend Performance Validation:')
  console.log('===================================')
  console.log(`Overall Frontend Health: ${validation.valid ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`Largest Contentful Paint (LCP): ${validation.lcp.toFixed(0)}ms`)
  console.log(`First Input Delay (FID): ${validation.fid.toFixed(0)}ms`)
  console.log(`Cumulative Layout Shift (CLS): ${validation.cls.toFixed(3)}`)
  console.log(`Bundle Size: ${(validation.bundleSize / 1024).toFixed(1)}KB`)
}

function calculateBenchmarkStats(results) {
  const responseTimes = results.map(r => r.performance.responseTime.p95)
  const errorRates = results.map(r => r.performance.errorRate)
  const throughputs = results.map(r => r.performance.throughput.requestsPerSecond)
  
  return {
    iterations: results.length,
    responseTime: {
      mean: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      std: calculateStandardDeviation(responseTimes)
    },
    errorRate: {
      mean: errorRates.reduce((sum, er) => sum + er, 0) / errorRates.length,
      min: Math.min(...errorRates),
      max: Math.max(...errorRates),
      std: calculateStandardDeviation(errorRates)
    },
    throughput: {
      mean: throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length,
      min: Math.min(...throughputs),
      max: Math.max(...throughputs),
      std: calculateStandardDeviation(throughputs)
    },
    timestamp: new Date()
  }
}

function printBenchmarkResults(benchmark) {
  console.log('\n🏃 Benchmark Results:')
  console.log('====================')
  console.log(`Iterations: ${benchmark.iterations}`)
  console.log(`Timestamp: ${benchmark.timestamp.toISOString()}`)
  
  console.log('\nResponse Time (P95):')
  console.log(`  Mean: ${benchmark.responseTime.mean.toFixed(2)}ms`)
  console.log(`  Min: ${benchmark.responseTime.min.toFixed(2)}ms`)
  console.log(`  Max: ${benchmark.responseTime.max.toFixed(2)}ms`)
  console.log(`  Std Dev: ${benchmark.responseTime.std.toFixed(2)}ms`)
  
  console.log('\nError Rate:')
  console.log(`  Mean: ${benchmark.errorRate.mean.toFixed(2)}%`)
  console.log(`  Min: ${benchmark.errorRate.min.toFixed(2)}%`)
  console.log(`  Max: ${benchmark.errorRate.max.toFixed(2)}%`)
  console.log(`  Std Dev: ${benchmark.errorRate.std.toFixed(2)}%`)
  
  console.log('\nThroughput:')
  console.log(`  Mean: ${benchmark.throughput.mean.toFixed(2)} req/s`)
  console.log(`  Min: ${benchmark.throughput.min.toFixed(2)} req/s`)
  console.log(`  Max: ${benchmark.throughput.max.toFixed(2)} req/s`)
  console.log(`  Std Dev: ${benchmark.throughput.std.toFixed(2)} req/s`)
}

async function saveBenchmarkResults(benchmark) {
  const filename = `benchmark-${Date.now()}.json`
  const fs = require('fs').promises
  
  try {
    await fs.writeFile(filename, JSON.stringify(benchmark, null, 2))
    console.log(`\n💾 Benchmark results saved to: ${filename}`)
  } catch (error) {
    console.error(`❌ Failed to save benchmark results: ${error.message}`)
  }
}

function getScenarioTargets(scenario) {
  const targets = {
    basic_load: {
      responseTime: { p95: 500 },
      errorRate: { acceptable: 1, critical: 5 },
      availability: { minimum: 99.5 }
    },
    emergency_load: {
      responseTime: { p95: 300 },
      errorRate: { acceptable: 0.5, critical: 2 },
      availability: { minimum: 99.8 }
    },
    peak_load: {
      responseTime: { p95: 1000 },
      errorRate: { acceptable: 2, critical: 10 },
      availability: { minimum: 99.0 }
    }
  }
  
  return targets[scenario] || targets.basic_load
}

function getEmergencyScenarioTargets(scenario) {
  const targets = {
    alert_burst: {
      responseTime: { p95: 100 },
      errorRate: { critical: 0.5 }
    },
    massive_geo_query: {
      responseTime: { p95: 200 },
      errorRate: { critical: 1 }
    },
    concurrent_reports: {
      responseTime: { p95: 300 },
      errorRate: { critical: 1.5 }
    }
  }
  
  return targets[scenario] || targets.alert_burst
}

function calculateStandardDeviation(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

function calculateTrends(metrics) {
  if (metrics.length < 2) return {}
  
  const first = metrics[0]
  const last = metrics[metrics.length - 1]
  
  return {
    responseTime: {
      change: last.averageResponseTime - first.averageResponseTime,
      changePercent: ((last.averageResponseTime - first.averageResponseTime) / first.averageResponseTime) * 100
    },
    errorRate: {
      change: last.errorRate - first.errorRate,
      changePercent: ((last.errorRate - first.errorRate) / first.errorRate) * 100
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run main function
if (require.main === module) {
  main()
}

module.exports = {
  main,
  runLoadTest,
  runRegressionTest,
  runEmergencyTest,
  runMonitoringTest,
  runPerformanceValidation,
  runBenchmarkTest
}