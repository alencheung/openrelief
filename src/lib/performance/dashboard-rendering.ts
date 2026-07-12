/**
 * Performance Dashboard Rendering
 *
 * Helpers for exporting and shaping dashboard data for display. Extracted
 * from performance-dashboard.ts. Export functions convert DashboardData
 * into downloadable Blobs, and the Widget class renders slices of
 * DashboardData keyed off the WidgetType enum.
 */

import {
  DashboardData,
  TrendData,
  WidgetConfig,
  WidgetType
} from './dashboard-types'

/**
 * Serialize dashboard data as a JSON Blob.
 */
export async function exportAsJSON(data: DashboardData): Promise<Blob> {
  const json = JSON.stringify(data, null, 2)
  return new Blob([json], { type: 'application/json' })
}

/**
 * Render a simple CSV of key dashboard metrics.
 */
export async function exportAsCSV(data: DashboardData): Promise<Blob> {
  const csv = [
    'Metric,Value',
    `Active Users,${data.system.activeUsers}`,
    `API Response Time,${data.api.averageResponseTime}`,
    `Error Rate,${data.api.errorRate}`,
    `Cache Hit Rate,${data.edge.cacheHitRate}`,
    `Database Query Time,${data.database.queryPerformance.averageTime}`
  ].join('\n')

  return new Blob([csv], { type: 'text/csv' })
}

/**
 * PDF export placeholder. A real implementation would use a library like jsPDF.
 */
export async function exportAsPDF(data: DashboardData): Promise<Blob> {
  const pdf = 'PDF export not implemented'
  return new Blob([pdf], { type: 'application/pdf' })
}

/**
 * PNG export placeholder. A real implementation would require canvas rendering.
 */
export async function exportAsPNG(data: DashboardData): Promise<Blob> {
  const png = 'PNG export not implemented'
  return new Blob([png], { type: 'image/png' })
}

/**
 * Aggregate data history across a date range, returning a DashboardData
 * snapshot with averaged API metrics for the period.
 */
export function getDataForDateRange(
  dataHistory: DashboardData[],
  current: DashboardData,
  dateRange: { start: Date; end: Date }
): DashboardData {
  // Filter data history for date range
  const filteredHistory = dataHistory.filter(data =>
    data.timestamp >= dateRange.start && data.timestamp <= dateRange.end
  )

  // Return current snapshot if nothing matched
  if (filteredHistory.length === 0) {
    return current
  }

  // Aggregate metrics (simplified)
  const aggregated = { ...current }

  // Calculate averages for the period
  aggregated.api.averageResponseTime = filteredHistory.reduce((sum, data) => sum + data.api.averageResponseTime, 0) / filteredHistory.length
  aggregated.api.requestsPerSecond = filteredHistory.reduce((sum, data) => sum + data.api.requestsPerSecond, 0) / filteredHistory.length
  aggregated.api.errorRate = filteredHistory.reduce((sum, data) => sum + data.api.errorRate, 0) / filteredHistory.length

  return aggregated
}

// Widget class
export class Widget {
  private config: WidgetConfig

  constructor(config: WidgetConfig) {
    this.config = config
  }

  getData(data: DashboardData): unknown {
    switch (this.config.type) {
      case WidgetType.SYSTEM_STATUS:
        return this.getSystemStatusData(data)
      case WidgetType.LINE_CHART:
        return this.getLineChartData(data)
      case WidgetType.ALERT_LIST:
        return this.getAlertListData(data)
      case WidgetType.GEOGRAPHIC_MAP:
        return this.getGeographicMapData(data)
      default:
        return null
    }
  }

  private getSystemStatusData(data: DashboardData): Record<string, unknown> {
    return {
      health: data.system.health,
      uptime: data.system.uptime,
      activeUsers: data.system.activeUsers,
      emergencyMode: data.system.emergencyMode,
      resourceUtilization: data.system.resourceUtilization
    }
  }

  private getLineChartData(data: DashboardData): Record<string, unknown> {
    const metric = this.config.config.metric
    const timeRange = this.config.config.timeRange

    let trendData: TrendData[] = []

    switch (metric) {
      case 'responseTime':
        trendData = data.trends.responseTime
        break
      case 'throughput':
        trendData = data.trends.throughput
        break
      case 'errorRate':
        trendData = data.trends.errorRate
        break
      default:
        trendData = []
    }

    // Filter by time range
    const now = Date.now()
    let timeRangeMs: number

    switch (timeRange) {
      case '1h':
        timeRangeMs = 60 * 60 * 1000
        break
      case '24h':
        timeRangeMs = 24 * 60 * 60 * 1000
        break
      case '7d':
        timeRangeMs = 7 * 24 * 60 * 60 * 1000
        break
      default:
        timeRangeMs = 60 * 60 * 1000
    }

    const filteredData = trendData.filter(point =>
      (now - point.timestamp.getTime()) <= timeRangeMs
    )

    return {
      data: filteredData.map(point => ({
        timestamp: point.timestamp,
        value: point.value,
        changePercent: point.changePercent
      })),
      metric,
      timeRange
    }
  }

  private getAlertListData(data: DashboardData): Record<string, unknown> {
    return {
      alerts: data.alerts.recent.slice(0, this.config.config.maxItems || 10),
      total: data.alerts.active,
      showResolved: this.config.config.showResolved || false
    }
  }

  private getGeographicMapData(data: DashboardData): Record<string, unknown> {
    return {
      usersByRegion: data.geographic.usersByRegion,
      latencyByRegion: data.geographic.latencyByRegion,
      errorRateByRegion: data.geographic.errorRateByRegion,
      showLatency: this.config.config.showLatency || false,
      showErrors: this.config.config.showErrors || false
    }
  }
}
