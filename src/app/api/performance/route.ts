/**
 * Performance Monitoring API Endpoint
 *
 * This API provides comprehensive access to performance monitoring data,
 * controls, and configuration for the OpenRelief performance optimization system.
 * It supports real-time monitoring, historical data, and emergency controls.
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import type { performanceIntegration as PerformanceIntegrationInstance } from '@/lib/performance/performance-integration'
import type { performanceDashboard as PerformanceDashboardInstance } from '@/lib/performance/performance-dashboard'
import type { loadTestingFramework as LoadTestingFrameworkInstance } from '@/lib/testing/load-testing-framework'
import type { performanceRegressionTesting as PerformanceRegressionTestingInstance } from '@/lib/testing/performance-regression-testing'

// Lazy accessors: these performance/testing modules reference browser-only
// globals (window/document) and Supabase env vars at module-load time, which
// throws during the Next.js build's page-data collection. Deferring the
// require() to first request keeps the build green.
let _performanceIntegration: typeof PerformanceIntegrationInstance | undefined
let _performanceDashboard: typeof PerformanceDashboardInstance | undefined
let _loadTestingFramework: typeof LoadTestingFrameworkInstance | undefined
let _performanceRegressionTesting: typeof PerformanceRegressionTestingInstance | undefined
function getPerformanceIntegration() {
  if (!_performanceIntegration) {
    _performanceIntegration = require('@/lib/performance/performance-integration').performanceIntegration
  }
  return _performanceIntegration
}
function getPerformanceDashboard() {
  if (!_performanceDashboard) {
    _performanceDashboard = require('@/lib/performance/performance-dashboard').performanceDashboard
  }
  return _performanceDashboard
}
function getLoadTestingFramework() {
  if (!_loadTestingFramework) {
    _loadTestingFramework = require('@/lib/testing/load-testing-framework').loadTestingFramework
  }
  return _loadTestingFramework
}
function getPerformanceRegressionTesting() {
  if (!_performanceRegressionTesting) {
    _performanceRegressionTesting = require('@/lib/testing/performance-regression-testing').performanceRegressionTesting
  }
  return _performanceRegressionTesting
}

// API response types
export interface PerformanceAPIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  requestId: string
}

// Performance metrics request
export interface PerformanceMetricsRequest {
  timeRange?: {
    start: string
    end: string
  }
  metrics?: string[]
  components?: string[]
  format?: 'json' | 'csv'
}

// Emergency mode request
export interface EmergencyModeRequest {
  action: 'activate' | 'deactivate' | 'status'
  reason?: string
  // minutes
  duration?: number
}

// Performance test request
export interface PerformanceTestRequest {
  scenario?: string
  // minutes
  concurrency?: number
  duration?: number
  emergency?: boolean
}

// Optimization request
export interface OptimizationRequest {
  strategy: string
  parameters?: Record<string, unknown>
  force?: boolean
}

// Alert management request
export interface AlertManagementRequest {
  action: 'list' | 'acknowledge' | 'resolve' | 'create'
  alertId?: string
  alertData?: {
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: string
    title: string
    description: string
    metrics?: Record<string, unknown>
  }
  acknowledgedBy?: string
  resolvedBy?: string
  resolution?: string
}

// Report generation request
export interface ReportRequest {
  type: 'performance' | 'testing' | 'compliance' | 'trend'
  format: 'json' | 'csv' | 'pdf' | 'html'
  dateRange?: {
    start: string
    end: string
  }
  recipients?: string[]
  sections?: string[]
}

// Configuration update request
export interface ConfigurationUpdateRequest {
  component: 'monitoring' | 'optimization' | 'testing' | 'alerting' | 'reporting'
  config: Record<string, unknown>
}

// Generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create API response
function createAPIResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): PerformanceAPIResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  } as PerformanceAPIResponse<T>
}

// Constant-time string comparison. Returns false when lengths differ without
// leaking which side mismatched. Both inputs are encoded as UTF-8 buffers.
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(bBuf, bBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

// Validate API key against PERFORMANCE_API_KEY. Fails closed: if the key is
// not configured the endpoint reports 503 (service misconfigured) rather than
// granting access. Comparison is constant-time to avoid timing oracle attacks.
type ApiKeyResult = { ok: true } | { ok: false; status: number; message: string }
function checkAPIKey(request: NextRequest): ApiKeyResult {
  const validKey = process.env.PERFORMANCE_API_KEY

  if (!validKey) {
    return {
      ok: false,
      status: 503,
      message: 'Performance API is not configured (PERFORMANCE_API_KEY missing)'
    }
  }

  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || !safeCompare(apiKey, validKey)) {
    return { ok: false, status: 401, message: 'Invalid API key' }
  }

  return { ok: true }
}

// Parse request body
async function parseRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    return null
  }
}

// GET handler - Retrieve performance data
export async function GET(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()

  try {
    // Validate API key
    const apiKeyResult = checkAPIKey(request)
    if (!apiKeyResult.ok) {
      return NextResponse.json(
        createAPIResponse(false, null, apiKeyResult.message, requestId),
        { status: apiKeyResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || 'status'
    const timeRangeStart = searchParams.get('start')
    const timeRangeEnd = searchParams.get('end')
    const metrics = searchParams.get('metrics')?.split(',')
    const components = searchParams.get('components')?.split(',')
    const format = (searchParams.get('format') as 'json' | 'csv') || 'json'

    let data: unknown

    switch (endpoint) {
      case 'status':
        data = getPerformanceIntegration().getStatus()
        break

      case 'metrics':
        data = await getPerformanceMetrics({
          timeRange:
            timeRangeStart && timeRangeEnd
              ? {
                  start: timeRangeStart,
                  end: timeRangeEnd
                }
              : undefined,
          metrics,
          components,
          format
        })
        break

      case 'alerts':
        data = {
          active: getPerformanceDashboard().getActiveAlerts(),
          history: getPerformanceDashboard().getAlertHistory(100)
        }
        break

      case 'tests':
        data = {
          active: getLoadTestingFramework().getActiveTests(),
          history: typeof (getLoadTestingFramework() as { getTestHistory?: (limit: number) => unknown[] }).getTestHistory === 'function'
            ? (getLoadTestingFramework() as { getTestHistory: (limit: number) => unknown[] }).getTestHistory(50)
            : [],
          regression: getPerformanceRegressionTesting().getTestHistory(20)
        }
        break

      case 'optimizations':
        data = {
          history: getPerformanceIntegration().getOptimizationHistory(50),
          active: getPerformanceIntegration().getStatus().optimizations
        }
        break

      case 'dashboard':
        data = getPerformanceDashboard().getData()
        break

      case 'widget':
        const widgetId = searchParams.get('widgetId')
        if (!widgetId) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Widget ID is required', requestId),
            { status: 400 }
          )
        }
        data = getPerformanceDashboard().getWidgetData(widgetId)
        break

      case 'emergency':
        // Would be populated from actual configuration
        // Would be populated from actual history
        data = {
          active: getPerformanceIntegration().getStatus().emergencyMode,
          triggers: [],
          history: []
        }
        break

      case 'health':
        data = await getSystemHealth()
        break

      default:
        return NextResponse.json(
          createAPIResponse(false, null, `Unknown endpoint: ${endpoint}`, requestId),
          { status: 400 }
        )
    }

    // Handle CSV export
    if (format === 'csv' && endpoint === 'metrics') {
      const csvData = convertToCSV(data)
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance-metrics-${Date.now()}.csv"`
        }
      })
    }

    return NextResponse.json(createAPIResponse(true, data, undefined, requestId))
  } catch (error) {
    console.error('[PerformanceAPI] GET error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, 'Internal server error', requestId),
      { status: 500 }
    )
  }
}

// POST handler - Execute performance actions
export async function POST(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()

  try {
    // Validate API key
    const apiKeyResult = checkAPIKey(request)
    if (!apiKeyResult.ok) {
      return NextResponse.json(
        createAPIResponse(false, null, apiKeyResult.message, requestId),
        { status: apiKeyResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'unknown'

    let data: unknown

    switch (action) {
      case 'emergency':
        const emergencyRequest = await parseRequestBody<EmergencyModeRequest>(request)
        if (!emergencyRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid emergency request body', requestId),
            { status: 400 }
          )
        }
        data = await handleEmergencyModeAction(emergencyRequest)
        break

      case 'test':
        const testRequest = await parseRequestBody<PerformanceTestRequest>(request)
        if (!testRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid test request body', requestId),
            { status: 400 }
          )
        }
        data = await handlePerformanceTestAction(testRequest)
        break

      case 'optimize':
        const optimizationRequest = await parseRequestBody<OptimizationRequest>(request)
        if (!optimizationRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid optimization request body', requestId),
            { status: 400 }
          )
        }
        data = await handleOptimizationAction(optimizationRequest)
        break

      case 'alerts':
        const alertRequest = await parseRequestBody<AlertManagementRequest>(request)
        if (!alertRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid alert request body', requestId),
            { status: 400 }
          )
        }
        data = await handleAlertManagementAction(alertRequest)
        break

      case 'report':
        const reportRequest = await parseRequestBody<ReportRequest>(request)
        if (!reportRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid report request body', requestId),
            { status: 400 }
          )
        }
        data = await handleReportGenerationAction(reportRequest)
        break

      case 'configure':
        const configRequest = await parseRequestBody<ConfigurationUpdateRequest>(request)
        if (!configRequest) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid configuration request body', requestId),
            { status: 400 }
          )
        }
        data = await handleConfigurationUpdateAction(configRequest)
        break

      default:
        return NextResponse.json(
          createAPIResponse(false, null, `Unknown action: ${action}`, requestId),
          { status: 400 }
        )
    }

    return NextResponse.json(createAPIResponse(true, data, undefined, requestId))
  } catch (error) {
    console.error('[PerformanceAPI] POST error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, 'Internal server error', requestId),
      { status: 500 }
    )
  }
}

// PUT handler - Update performance resources
export async function PUT(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()

  try {
    // Validate API key
    const apiKeyResult = checkAPIKey(request)
    if (!apiKeyResult.ok) {
      return NextResponse.json(
        createAPIResponse(false, null, apiKeyResult.message, requestId),
        { status: apiKeyResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') || 'unknown'

    let data: unknown

    switch (resource) {
      case 'baseline':
        const baselineData = await parseRequestBody<Record<string, unknown>>(request)
        if (!baselineData) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid baseline data', requestId),
            { status: 400 }
          )
        }
        data = await handleBaselineUpdate(baselineData)
        break

      case 'thresholds':
        const thresholdsData = await parseRequestBody<Record<string, unknown>>(request)
        if (!thresholdsData) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid thresholds data', requestId),
            { status: 400 }
          )
        }
        data = await handleThresholdsUpdate(thresholdsData)
        break

      default:
        return NextResponse.json(
          createAPIResponse(false, null, `Unknown resource: ${resource}`, requestId),
          { status: 400 }
        )
    }

    return NextResponse.json(createAPIResponse(true, data, undefined, requestId))
  } catch (error) {
    console.error('[PerformanceAPI] PUT error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, 'Internal server error', requestId),
      { status: 500 }
    )
  }
}

// DELETE handler - Remove performance resources
export async function DELETE(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()

  try {
    // Validate API key
    const apiKeyResult = checkAPIKey(request)
    if (!apiKeyResult.ok) {
      return NextResponse.json(
        createAPIResponse(false, null, apiKeyResult.message, requestId),
        { status: apiKeyResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') || 'unknown'
    const resourceId = searchParams.get('id')

    let data: unknown

    switch (resource) {
      case 'cache':
        data = await handleCacheClear(resourceId ?? undefined)
        break

      case 'alerts':
        if (!resourceId) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Alert ID is required', requestId),
            { status: 400 }
          )
        }
        data = await handleAlertDelete(resourceId)
        break

      case 'test':
        if (!resourceId) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Test ID is required', requestId),
            { status: 400 }
          )
        }
        data = await handleTestStop(resourceId)
        break

      default:
        return NextResponse.json(
          createAPIResponse(false, null, `Unknown resource: ${resource}`, requestId),
          { status: 400 }
        )
    }

    return NextResponse.json(createAPIResponse(true, data, undefined, requestId))
  } catch (error) {
    console.error('[PerformanceAPI] DELETE error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, 'Internal server error', requestId),
      { status: 500 }
    )
  }
}

// Helper functions for handling different actions

async function getPerformanceMetrics(request: PerformanceMetricsRequest): Promise<Record<string, unknown>> {
  const dashboardData = getPerformanceDashboard().getData()

  // Filter by time range if specified
  if (request.timeRange) {
    // In a real implementation, this would filter historical data
    // For now, just return current data with time range info
    return {
      timeRange: request.timeRange,
      metrics: dashboardData,
      filtered: true
    }
  }

  // Filter by specific metrics if specified
  if (request.metrics && request.metrics.length > 0) {
    const filteredData: Record<string, unknown> = {}

    request.metrics.forEach(metric => {
      if (dashboardData[metric as keyof typeof dashboardData]) {
        filteredData[metric] = dashboardData[metric as keyof typeof dashboardData]
      }
    })

    return {
      metrics: filteredData,
      filtered: true
    }
  }

  return {
    metrics: dashboardData,
    filtered: false
  }
}

async function handleEmergencyModeAction(request: EmergencyModeRequest): Promise<Record<string, unknown>> {
  switch (request.action) {
    case 'activate':
      await getPerformanceIntegration().activateEmergencyMode(request.reason)
      return {
        action: 'activated',
        reason: request.reason,
        timestamp: new Date().toISOString()
      }

    case 'deactivate':
      await getPerformanceIntegration().deactivateEmergencyMode(request.reason)
      return {
        action: 'deactivated',
        reason: request.reason,
        timestamp: new Date().toISOString()
      }

    case 'status':
      const status = getPerformanceIntegration().getStatus()
      return {
        emergencyMode: status.emergencyMode,
        timestamp: new Date().toISOString()
      }

    default:
      throw new Error(`Unknown emergency action: ${request.action}`)
  }
}

async function handlePerformanceTestAction(request: PerformanceTestRequest): Promise<Record<string, unknown>> {
  try {
    let testId: string

    // Run 50K concurrency test
    if (request.emergency || (request.concurrency && request.concurrency >= 50000)) {
      testId = await getLoadTestingFramework().execute50KConcurrencyTest()
    } else {
      // Run custom test
      testId = await getPerformanceIntegration().runPerformanceTest(request.scenario)
    }

    return {
      testId,
      scenario: request.scenario || '50K_concurrency',
      concurrency: request.concurrency || 50000,
      duration: request.duration,
      status: 'started',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to start performance test: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleOptimizationAction(request: OptimizationRequest): Promise<Record<string, unknown>> {
  try {
    await getPerformanceIntegration().applyOptimization(request.strategy)

    return {
      strategy: request.strategy,
      parameters: request.parameters,
      status: 'applied',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to apply optimization: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleAlertManagementAction(request: AlertManagementRequest): Promise<Record<string, unknown>> {
  switch (request.action) {
    case 'list':
      return {
        active: getPerformanceDashboard().getActiveAlerts(),
        history: getPerformanceDashboard().getAlertHistory(100)
      }

    case 'acknowledge':
      if (!request.alertId || !request.acknowledgedBy) {
        throw new Error('Alert ID and acknowledgedBy are required')
      }
      await getPerformanceDashboard().acknowledgeAlert(request.alertId, request.acknowledgedBy)
      return {
        alertId: request.alertId,
        action: 'acknowledged',
        acknowledgedBy: request.acknowledgedBy,
        timestamp: new Date().toISOString()
      }

    case 'resolve':
      if (!request.alertId || !request.resolvedBy || !request.resolution) {
        throw new Error('Alert ID, resolvedBy, and resolution are required')
      }
      await getPerformanceDashboard().resolveAlert(
        request.alertId,
        request.resolvedBy,
        request.resolution
      )
      return {
        alertId: request.alertId,
        action: 'resolved',
        resolvedBy: request.resolvedBy,
        resolution: request.resolution,
        timestamp: new Date().toISOString()
      }

    case 'create':
      if (!request.alertData) {
        throw new Error('Alert data is required')
      }
      const alertId = await getPerformanceDashboard().createAlert(request.alertData)
      return {
        alertId,
        action: 'created',
        alertData: request.alertData,
        timestamp: new Date().toISOString()
      }

    default:
      throw new Error(`Unknown alert action: ${request.action}`)
  }
}

async function handleReportGenerationAction(request: ReportRequest): Promise<Record<string, unknown>> {
  try {
    const report = await getPerformanceIntegration().generateReport(request.type)

    // Handle different formats
    if (request.format === 'pdf' || request.format === 'html') {
      // In a real implementation, this would generate actual PDF/HTML files
      return {
        reportId: generateRequestId(),
        type: request.type,
        format: request.format,
        status: 'generated',
        downloadUrl: `/api/performance/report/${generateRequestId()}`,
        timestamp: new Date().toISOString()
      }
    }

    return {
      report,
      type: request.type,
      format: request.format,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to generate report: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleConfigurationUpdateAction(request: ConfigurationUpdateRequest): Promise<Record<string, unknown>> {
  try {
    getPerformanceIntegration().updateConfig({
      [request.component]: request.config
    })

    return {
      component: request.component,
      config: request.config,
      status: 'updated',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to update configuration: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleBaselineUpdate(baselineData: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const version = baselineData.version || `v${Date.now()}`
    await getPerformanceRegressionTesting().updateBaseline(version, baselineData)

    return {
      version,
      status: 'updated',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to update baseline: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleThresholdsUpdate(thresholdsData: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    // Update thresholds in configuration
    getPerformanceIntegration().updateConfig({
      alerting: {
        thresholds: thresholdsData
      }
    })

    return {
      thresholds: thresholdsData,
      status: 'updated',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to update thresholds: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleCacheClear(cacheId?: string): Promise<Record<string, unknown>> {
  try {
    if (cacheId === 'all') {
      // Clear all caches
      const serviceWorker = (await import('@/lib/pwa/service-worker-optimizer'))
        .serviceWorkerOptimizer
      await serviceWorker.clearAllCaches()

      return {
        action: 'cleared_all',
        timestamp: new Date().toISOString()
      }
    } else {
      // Clear specific cache
      return {
        action: 'cleared_specific',
        cacheId,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    throw new Error(`Failed to clear cache: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleAlertDelete(alertId: string): Promise<Record<string, unknown>> {
  try {
    await getPerformanceDashboard().resolveAlert(alertId, 'system', 'Deleted via API')

    return {
      alertId,
      action: 'deleted',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to delete alert: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function handleTestStop(testId: string): Promise<Record<string, unknown>> {
  try {
    const results = await getLoadTestingFramework().stopLoadTest(testId)

    return {
      testId,
      action: 'stopped',
      results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to stop test: ${(error instanceof Error ? error.message : String(error))}`)
  }
}

async function getSystemHealth(): Promise<Record<string, unknown>> {
  const status = getPerformanceIntegration().getStatus()

  return {
    overall: status.components.every((c: { healthy: boolean }) => c.healthy) ? 'healthy' : 'degraded',
    components: status.components,
    uptime: status.metrics.uptime,
    emergencyMode: status.emergencyMode,
    lastUpdate: new Date().toISOString()
  }
}

function convertToCSV(data: unknown): string {
  // Simple CSV conversion - in a real implementation, this would be more sophisticated
  const metrics = (data as { metrics?: Record<string, unknown> } | null)?.metrics || {}
  const headers = Object.keys(metrics)
  const rows = [headers.join(',')]

  // Add data row
  const values = headers.map(header => {
    const value = metrics[header]
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    return value
  })
  rows.push(values.join(','))

  return rows.join('\n')
}

// Export for testing
export { generateRequestId, createAPIResponse, checkAPIKey, parseRequestBody }
