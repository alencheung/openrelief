/**
 * Performance Integration Reporting
 *
 * Report generation and scheduling helpers extracted from
 * performance-integration.ts. Each helper operates on a shared
 * IntegrationContext so the integration class can stay thin.
 */

import { IntegrationContext } from './integration-types'

/**
 * Whether a scheduled report should be generated right now. Returns true when
 * the current time is within one hour of the configured reporting time.
 */
export function shouldGenerateReport(ctx: IntegrationContext): boolean {
  if (!ctx.config.reporting.schedule.enabled) {
    return false
  }

  const now = new Date()
  const scheduleTime = ctx.config.reporting.schedule.time
  const [hoursStr, minutesStr] = scheduleTime.split(':')
  const hours = Number(hoursStr ?? 0)
  const minutes = Number(minutesStr ?? 0)

  const scheduledTime = new Date(now)
  scheduledTime.setHours(hours, minutes, 0, 0)

  const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime())
  return timeDiff < 3600000 // 1 hour
}

/**
 * Generate the scheduled performance report and send it to all recipients.
 */
export async function generateScheduledReport(
  ctx: IntegrationContext,
  generateReport: (type: 'performance' | 'testing' | 'compliance' | 'trend') => Promise<unknown>
): Promise<void> {
  try {
    const report = await generateReport('performance')

    for (const recipient of ctx.config.reporting.recipients) {
      await sendReport(report, recipient)
    }
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to generate scheduled report:', error)
  }
}

/**
 * Send a generated report to a recipient. Real delivery (email/etc.) is not
 * implemented here; this logs the recipient.
 */
export async function sendReport(report: unknown, recipient: string): Promise<void> {
  console.log(`[PerformanceIntegration] Report sent to ${recipient}`)
}

/**
 * Generate a report for the requested type, delegating to the specific
 * generator. Mirrors the original public generateReport behavior.
 */
export async function generateReport(
  type: 'performance' | 'testing' | 'compliance' | 'trend',
  ctx: IntegrationContext
): Promise<Record<string, unknown> | unknown[] | null> {
  try {
    switch (type) {
      case 'performance':
        return generatePerformanceReport(ctx)
      case 'testing':
        return generateTestingReport(ctx)
      case 'compliance':
        return generateComplianceReport()
      case 'trend':
        return generateTrendReport(ctx)
      default:
        throw new Error(`Unknown report type: ${type}`)
    }
  } catch (error) {
    console.error(`[PerformanceIntegration] Failed to generate ${type} report:`, error)
    throw error
  }
}

/**
 * Snapshot the current dashboard data as a performance report.
 */
export async function generatePerformanceReport(ctx: IntegrationContext): Promise<Record<string, unknown> | unknown[] | null> {
  const dashboard = ctx.components.get('performanceDashboard')
  if (dashboard && typeof dashboard.getData === 'function') {
    return dashboard.getData()
  }
  return null
}

/**
 * Summarize the latest load and regression test history as a testing report.
 */
export async function generateTestingReport(ctx: IntegrationContext): Promise<Record<string, unknown> | unknown[] | null> {
  const loadTesting = ctx.components.get('loadTestingFramework')
  const regressionTesting = ctx.components.get('performanceRegressionTesting')

  return {
    loadTesting: loadTesting ? loadTesting.getTestHistory() : [],
    regressionTesting: regressionTesting ? regressionTesting.getTestHistory() : []
  }
}

/**
 * Static compliance report against the configured SLA targets.
 */
export async function generateComplianceReport(): Promise<Record<string, unknown> | unknown[] | null> {
  return {
    sla: {
      availability: 99.9,
      responseTime: 500,
      errorRate: 1
    },
    compliance: {
      availability: 99.95,
      responseTime: 450,
      errorRate: 0.5
    }
  }
}

/**
 * Trend report sourced from the dashboard's trends data.
 */
export async function generateTrendReport(ctx: IntegrationContext): Promise<Record<string, unknown> | unknown[] | null> {
  const dashboard = ctx.components.get('performanceDashboard')
  if (dashboard && typeof dashboard.getData === 'function') {
    const data = dashboard.getData()
    return data.trends
  }
  return null
}
