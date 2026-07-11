/**
 * Tests for Performance API Endpoint.
 *
 * This route is NOT wrapped in `withAPISecurity`. It is protected by a shared
 * key (`x-api-key` header vs `process.env.PERFORMANCE_API_KEY`), with
 * constant-time comparison and fail-closed behavior: missing config -> 503,
 * wrong/missing key -> 401.
 *
 * The route lazy-loads several performance modules via `require()`. We mock
 * those modules at the test level so the lazy accessors resolve to mocked
 * singletons.
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/performance/performance-integration', () => ({
  performanceIntegration: {
    getStatus: () => ({
      emergencyMode: false,
      components: [{ healthy: true }],
      metrics: { uptime: 100 },
      optimizations: []
    }),
    getOptimizationHistory: () => [],
    runPerformanceTest: jest.fn().mockResolvedValue('test-id'),
    applyOptimization: jest.fn().mockResolvedValue(undefined),
    activateEmergencyMode: jest.fn().mockResolvedValue(undefined),
    deactivateEmergencyMode: jest.fn().mockResolvedValue(undefined),
    generateReport: jest.fn().mockResolvedValue({}),
    updateConfig: jest.fn()
  }
}))

jest.mock('@/lib/performance/performance-dashboard', () => ({
  performanceDashboard: {
    getData: () => ({ metrics: { ttfb: 50 } }),
    getActiveAlerts: () => [],
    getAlertHistory: () => [],
    acknowledgeAlert: jest.fn().mockResolvedValue(undefined),
    resolveAlert: jest.fn().mockResolvedValue(undefined),
    createAlert: jest.fn().mockResolvedValue('alert-1'),
    getWidgetData: () => ({})
  }
}))

jest.mock('@/lib/testing/load-testing-framework', () => ({
  loadTestingFramework: {
    getActiveTests: () => [],
    getTestHistory: () => [],
    execute50KConcurrencyTest: jest.fn().mockResolvedValue('load-test-1'),
    stopLoadTest: jest.fn().mockResolvedValue({})
  }
}))

jest.mock('@/lib/testing/performance-regression-testing', () => ({
  performanceRegressionTesting: {
    getTestHistory: () => [],
    updateBaseline: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.spyOn(console, 'error').mockImplementation(() => {})

const VALID_API_KEY = 'test-performance-api-key'

function authedRequest(
  url = 'http://localhost/api/performance',
  method = 'GET'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'x-api-key': VALID_API_KEY }
  })
}

describe('/api/performance Endpoint', () => {
  let GET: any
  const originalKey = process.env.PERFORMANCE_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.PERFORMANCE_API_KEY = VALID_API_KEY
    const route = require('../route')
    GET = route.GET
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.PERFORMANCE_API_KEY
    } else {
      process.env.PERFORMANCE_API_KEY = originalKey
    }
  })

  it('returns 503 when PERFORMANCE_API_KEY is not configured', async () => {
    delete process.env.PERFORMANCE_API_KEY
    const req = new NextRequest('http://localhost/api/performance')
    const res = await GET(req)
    expect(res.status).toBe(503)
  })

  it('returns 401 when x-api-key header is missing', async () => {
    const req = new NextRequest('http://localhost/api/performance')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when x-api-key header is wrong', async () => {
    const req = new NextRequest('http://localhost/api/performance', {
      headers: { 'x-api-key': 'wrong-key' }
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns status metrics with a valid key', async () => {
    const req = authedRequest('http://localhost/api/performance?endpoint=status')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.emergencyMode).toBe(false)
    expect(json.requestId).toMatch(/^req_/)
  })

  it('returns metrics with a valid key', async () => {
    const req = authedRequest('http://localhost/api/performance?endpoint=metrics')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.metrics).toBeDefined()
  })

  it('returns 400 for an unknown endpoint', async () => {
    const req = authedRequest('http://localhost/api/performance?endpoint=does-not-exist')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toMatch(/Unknown endpoint/)
  })
})
