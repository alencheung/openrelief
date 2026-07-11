/**
 * Performance Integration Monitoring
 *
 * Metrics collection, aggregation, and component health helpers extracted from
 * performance-integration.ts. Each helper operates on a shared
 * IntegrationContext so the integration class can stay thin.
 */

import { IntegrationContext, ComponentStatus } from './integration-types'

/**
 * Refresh the uptime timestamp and collect metrics from every registered
 * component, then recompute aggregated metrics.
 */
export async function collectMetrics(ctx: IntegrationContext): Promise<void> {
  try {
    const now = Date.now()
    ctx.status.metrics.uptime = now

    for (const [name, component] of ctx.components.entries()) {
      try {
        if (typeof component.getMetrics === 'function') {
          const componentMetrics = component.getMetrics()
          updateComponentMetrics(ctx, name, componentMetrics)
        }
      } catch (error) {
        console.error(`[PerformanceIntegration] Failed to collect metrics from ${name}:`, error)
      }
    }

    updateAggregatedMetrics(ctx)
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to collect metrics:', error)
  }
}

/**
 * Update metrics for a single component's status entry.
 */
export function updateComponentMetrics(ctx: IntegrationContext, componentName: string, metrics: any): void {
  const componentStatus = ctx.status.components.find(c => c.name === componentName)
  if (componentStatus) {
    componentStatus.metrics = metrics
    componentStatus.lastUpdate = new Date()
  }
}

/**
 * Recompute aggregated metrics from the performance dashboard data.
 */
export function updateAggregatedMetrics(ctx: IntegrationContext): void {
  const dashboard = ctx.components.get('performanceDashboard')
  if (dashboard && typeof dashboard.getData === 'function') {
    const data = dashboard.getData()

    ctx.status.metrics.totalRequests = data.api.requestsPerSecond * ctx.status.metrics.uptime / 1000
    ctx.status.metrics.averageResponseTime = data.api.averageResponseTime
    ctx.status.metrics.errorRate = data.api.errorRate
  }
}

/**
 * Resolve a metric name to its current value from the dashboard data, or null
 * when the metric or dashboard is unavailable.
 */
export async function getMetricValue(ctx: IntegrationContext, metric: string): Promise<number | null> {
  try {
    const dashboard = ctx.components.get('performanceDashboard')
    if (dashboard && typeof dashboard.getData === 'function') {
      const data = dashboard.getData()

      switch (metric) {
        case 'response_time_p95':
          return data.api.p95ResponseTime
        case 'error_rate':
          return data.api.errorRate
        case 'concurrent_users':
          return data.system.activeUsers
        case 'database_query_time_p95':
          return data.database.queryPerformance.p95Time
        default:
          return null
      }
    }
    return null
  } catch (error) {
    console.error(`[PerformanceIntegration] Failed to get metric value for ${metric}:`, error)
    return null
  }
}

/**
 * Rebuild the component status list from all registered components, marking
 * any component whose health check throws as unhealthy.
 */
export async function updateComponentStatus(ctx: IntegrationContext): Promise<void> {
  try {
    const components: ComponentStatus[] = []

    for (const [name, component] of ctx.components.entries()) {
      let healthy = true
      let errors: string[] = []

      try {
        // Check component health
        if (typeof component.getMetrics === 'function') {
          const metrics = component.getMetrics()
          // Simple health check - in real implementation, this would be more sophisticated
          healthy = true
        }
      } catch (error) {
        healthy = false
        errors.push(error instanceof Error ? error.message : String(error))
      }

      components.push({
        name,
        enabled: true,
        healthy,
        lastUpdate: new Date(),
        metrics: {},
        errors
      })
    }

    ctx.status.components = components
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to update component status:', error)
  }
}

/**
 * Recompute optimization counts in status from the optimization history.
 */
export function updateStatus(ctx: IntegrationContext): void {
  ctx.status.optimizations.total = ctx.optimizationHistory.filter(o => o.status === 'active').length
  ctx.status.optimizations.byType = {}

  for (const optimization of ctx.optimizationHistory.filter(o => o.status === 'active')) {
    ctx.status.optimizations.byType[optimization.type]
      = (ctx.status.optimizations.byType[optimization.type] || 0) + 1
  }

  ctx.status.optimizations.details = ctx.optimizationHistory.filter(o => o.status === 'active')
}
