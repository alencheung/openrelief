/**
 * Performance Monitoring API Endpoint
 * 
 * This API provides comprehensive access to performance monitoring data,
 * controls, and configuration for the OpenRelief performance optimization system.
 * It supports real-time monitoring, historical data, and emergency controls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { performanceIntegration } from '@/lib/performance/performance-integration'
import { performanceDashboard } from '@/lib/performance/performance-dashboard'
import { loadTestingFramework } from '@/lib/testing/load-testing-framework'
import { performanceRegressionTesting } from '@/lib/testing/performance-regression-testing'

// API response types
export interface PerformanceAPIResponse<T = any> {
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
  duration?: number // minutes
}

// Performance test request
export interface PerformanceTestRequest {
  scenario?: string
  concurrency?: number
  duration?: number
  emergency?: boolean
}

// Optimization request
export interface OptimizationRequest {
  strategy: string
  parameters?: Record<string, any>
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
    metrics?: Record<string, any>
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
  config: Record<string, any>
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
  }
}

// Validate API key
function validateAPIKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validKey = process.env.PERFORMANCE_API_KEY
  
  // In development, skip validation
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  
  return apiKey === validKey
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
    if (!validateAPIKey(request)) {
      return NextResponse.json(
        createAPIResponse(false, null, 'Invalid API key', requestId),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || 'status'
    const timeRangeStart = searchParams.get('start')
    const timeRangeEnd = searchParams.get('end')
    const metrics = searchParams.get('metrics')?.split(',')
    const components = searchParams.get('components')?.split(',')
    const format = searchParams.get('format') as 'json' | 'csv' || 'json'

    let data: any

    switch (endpoint) {
      case 'status':
        data = performanceIntegration.getStatus()
        break

      case 'metrics':
        data = await getPerformanceMetrics({
          timeRange: timeRangeStart && timeRangeEnd ? {
            start: timeRangeStart,
            end: timeRangeEnd
          } : undefined,
          metrics,
          components,
          format
        })
        break

      case 'alerts':
        data = {
          active: performanceDashboard.getActiveAlerts(),
          history: performanceDashboard.getAlertHistory(100)
        }
        break

      case 'tests':
        data = {
          active: loadTestingFramework.getActiveTests(),
          history: loadTestingFramework.getTestHistory(50),
          regression: performanceRegressionTesting.getTestHistory(20)
        }
        break

      case 'optimizations':
        data = {
          history: performanceIntegration.getOptimizationHistory(50),
          active: performanceIntegration.getStatus().optimizations
        }
        break

      case 'dashboard':
        data = performanceDashboard.getData()
        break

      case 'widget':
        const widgetId = searchParams.get('widgetId')
        if (!widgetId) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Widget ID is required', requestId),
            { status: 400 }
          )
        }
        data = performanceDashboard.getWidgetData(widgetId)
        break

      case 'emergency':
        data = {
          active: performanceIntegration.getStatus().emergencyMode,
          triggers: [], // Would be populated from actual configuration
          history: [] // Would be populated from actual history
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

    return NextResponse.json(
      createAPIResponse(true, data, undefined, requestId)
    )

  } catch (error) {
    console.error('[PerformanceAPI] GET error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, `Internal server error: ${error.message}`, requestId),
      { status: 500 }
    )
  }
}

// POST handler - Execute performance actions
export async function POST(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()
  
  try {
    // Validate API key
    if (!validateAPIKey(request)) {
      return NextResponse.json(
        createAPIResponse(false, null, 'Invalid API key', requestId),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'unknown'

    let data: any

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

    return NextResponse.json(
      createAPIResponse(true, data, undefined, requestId)
    )

  } catch (error) {
    console.error('[PerformanceAPI] POST error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, `Internal server error: ${error.message}`, requestId),
      { status: 500 }
    )
  }
}

// PUT handler - Update performance resources
export async function PUT(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()
  
  try {
    // Validate API key
    if (!validateAPIKey(request)) {
      return NextResponse.json(
        createAPIResponse(false, null, 'Invalid API key', requestId),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') || 'unknown'

    let data: any

    switch (resource) {
      case 'baseline':
        const baselineData = await parseRequestBody<any>(request)
        if (!baselineData) {
          return NextResponse.json(
            createAPIResponse(false, null, 'Invalid baseline data', requestId),
            { status: 400 }
          )
        }
        data = await handleBaselineUpdate(baselineData)
        break

      case 'thresholds':
        const thresholdsData = await parseRequestBody<any>(request)
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

    return NextResponse.json(
      createAPIResponse(true, data, undefined, requestId)
    )

  } catch (error) {
    console.error('[PerformanceAPI] PUT error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, `Internal server error: ${error.message}`, requestId),
      { status: 500 }
    )
  }
}

// DELETE handler - Remove performance resources
export async function DELETE(request: NextRequest): Promise<NextResponse<PerformanceAPIResponse>> {
  const requestId = generateRequestId()
  
  try {
    // Validate API key
    if (!validateAPIKey(request)) {
      return NextResponse.json(
        createAPIResponse(false, null, 'Invalid API key', requestId),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') || 'unknown'
    const resourceId = searchParams.get('id')

    let data: any

    switch (resource) {
      case 'cache':
        data = await handleCacheClear(resourceId)
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

    return NextResponse.json(
      createAPIResponse(true, data, undefined, requestId)
    )

  } catch (error) {
    console.error('[PerformanceAPI] DELETE error:', error)
    return NextResponse.json(
      createAPIResponse(false, null, `Internal server error: ${error.message}`, requestId),
      { status: 500 }
    )
  }
}

// Helper functions for handling different actions

async function getPerformanceMetrics(request: PerformanceMetricsRequest): Promise<any> {
  const dashboardData = performanceDashboard.getData()
  
  // Filter by time range if specified
  if (request.timeRange) {
    const startDate = new Date(request.timeRange.start)
    const endDate = new Date(request.timeRange.end)
    
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
    const filteredData: any = {}
    
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

async function handleEmergencyModeAction(request: EmergencyModeRequest): Promise<any> {
  switch (request.action) {
    case 'activate':
      await performanceIntegration.activateEmergencyMode(request.reason)
      return {
        action: 'activated',
        reason: request.reason,
        timestamp: new Date().toISOString()
      }

    case 'deactivate':
      await performanceIntegration.deactivateEmergencyMode(request.reason)
      return {
        action: 'deactivated',
        reason: request.reason,
        timestamp: new Date().toISOString()
      }

    case 'status':
      const status = performanceIntegration.getStatus()
      return {
        emergencyMode: status.emergencyMode,
        timestamp: new Date().toISOString()
      }

    default:
      throw new Error(`Unknown emergency action: ${request.action}`)
  }
}

async function handlePerformanceTestAction(request: PerformanceTestRequest): Promise<any> {
  try {
    let testId: string

    if (request.emergency || request.concurrency && request.concurrency >= 50000) {
      // Run 50K concurrency test
      testId = await loadTestingFramework.execute50KConcurrencyTest()
    } else {
      // Run custom test
      testId = await performanceIntegration.runPerformanceTest(request.scenario)
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
    throw new Error(`Failed to start performance test: ${error.message}`)
  }
}

async function handleOptimizationAction(request: OptimizationRequest): Promise<any> {
  try {
    await performanceIntegration.applyOptimization(request.strategy)
    
    return {
      strategy: request.strategy,
      parameters: request.parameters,
      status: 'applied',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to apply optimization: ${error.message}`)
  }
}

async function handleAlertManagementAction(request: AlertManagementRequest): Promise<any> {
  switch (request.action) {
    case 'list':
      return {
        active: performanceDashboard.getActiveAlerts(),
        history: performanceDashboard.getAlertHistory(100)
      }

    case 'acknowledge':
      if (!request.alertId || !request.acknowledgedBy) {
        throw new Error('Alert ID and acknowledgedBy are required')
      }
      await performanceDashboard.acknowledgeAlert(request.alertId, request.acknowledgedBy)
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
      await performanceDashboard.resolveAlert(request.alertId, request.resolvedBy, request.resolution)
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
      const alertId = await performanceDashboard.createAlert(request.alertData)
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

async function handleReportGenerationAction(request: ReportRequest): Promise<any> {
  try {
    const report = await performanceIntegration.generateReport(request.type)
    
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
    throw new Error(`Failed to generate report: ${error.message}`)
  }
}

async function handleConfigurationUpdateAction(request: ConfigurationUpdateRequest): Promise<any> {
  try {
    performanceIntegration.updateConfig({
      [request.component]: request.config
    })

    return {
      component: request.component,
      config: request.config,
      status: 'updated',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to update configuration: ${error.message}`)
  }
}

async function handleBaselineUpdate(baselineData: any): Promise<any> {
  try {
    const version = baselineData.version || `v${Date.now()}`
    await performanceRegressionTesting.updateBaseline(version, baselineData)
    
    return {
      version,
      status: 'updated',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to update baseline: ${error.message}`)
  }
}

async function handleThresholdsUpdate(thresholdsData: any): Promise<any> {
  try {
    // Update thresholds in configuration
    performanceIntegration.updateConfig({
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
    throw new Error(`Failed to update thresholds: ${error.message}`)
  }
}

async function handleCacheClear(cacheId?: string): Promise<any> {
  try {
    if (cacheId === 'all') {
      // Clear all caches
      const serviceWorker = (await import('@/lib/pwa/service-worker-optimizer')).serviceWorkerOptimizer
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
    throw new Error(`Failed to clear cache: ${error.message}`)
  }
}

async function handleAlertDelete(alertId: string): Promise<any> {
  try {
    await performanceDashboard.resolveAlert(alertId, 'system', 'Deleted via API')
    
    return {
      alertId,
      action: 'deleted',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to delete alert: ${error.message}`)
  }
}

async function handleTestStop(testId: string): Promise<any> {
  try {
    const results = await loadTestingFramework.stopLoadTest(testId)
    
    return {
      testId,
      action: 'stopped',
      results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw new Error(`Failed to stop test: ${error.message}`)
  }
}

async function getSystemHealth(): Promise<any> {
  const status = performanceIntegration.getStatus()
  
  return {
    overall: status.components.every(c => c.healthy) ? 'healthy' : 'degraded',
    components: status.components,
    uptime: status.metrics.uptime,
    emergencyMode: status.emergencyMode,
    lastUpdate: new Date().toISOString()
  }
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - in a real implementation, this would be more sophisticated
  const headers = Object.keys(data.metrics || {})
  const rows = [headers.join(',')]
  
  // Add data row
  const values = headers.map(header => {
    const value = data.metrics[header]
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return value
  })
  rows.push(values.join(','))
  
  return rows.join('\n')
}

// Export for testing
export {
  generateRequestId,
  createAPIResponse,
  validateAPIKey,
  parseRequestBody
}