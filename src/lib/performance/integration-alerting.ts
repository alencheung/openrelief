/**
 * Performance Integration Alerting
 *
 * Alert evaluation, dispatch, and integration alert creation helpers extracted
 * from performance-integration.ts. Each helper operates on a shared
 * IntegrationContext so the integration class can stay thin.
 */

import {
  AlertChannelConfig,
  AlertCondition,
  AlertRule,
  IntegrationAlert,
  IntegrationContext,
  MetricValueProvider,
  IdGenerator
} from './integration-types'

/**
 * Evaluate every enabled alert rule and trigger alerts for those whose
 * conditions are met.
 */
export async function checkAlertConditions(
  ctx: IntegrationContext,
  getMetricValue: MetricValueProvider
): Promise<void> {
  try {
    for (const rule of ctx.config.alerting.rules) {
      if (!rule.enabled) {
        continue
      }

      const shouldAlert = await evaluateAlertCondition(rule.condition, getMetricValue)
      if (shouldAlert) {
        await triggerAlert(ctx, rule)
      }
    }
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to check alert conditions:', error)
  }
}

/**
 * Evaluate a single alert condition against the current metric value.
 */
export async function evaluateAlertCondition(
  condition: AlertCondition,
  getMetricValue: MetricValueProvider
): Promise<boolean> {
  const currentValue = await getMetricValue(condition.metric)
  if (currentValue === null) {
    return false
  }

  switch (condition.operator) {
    case '>':
      return currentValue > condition.threshold
    case '<':
      return currentValue < condition.threshold
    case '>=':
      return currentValue >= condition.threshold
    case '<=':
      return currentValue <= condition.threshold
    case '=':
      return currentValue === condition.threshold
    default:
      return false
  }
}

/**
 * Create an integration alert for a triggered rule and dispatch it to the
 * rule's configured channels.
 */
export async function triggerAlert(
  ctx: IntegrationContext,
  rule: AlertRule,
  generateId?: IdGenerator
): Promise<void> {
  try {
    await createIntegrationAlert(
      ctx,
      {
        severity: rule.severity,
        component: 'integration',
        message: `Alert rule triggered: ${rule.name}`,
        metrics: { rule: rule.name, timestamp: new Date() }
      },
      generateId
    )

    for (const channelType of rule.channels) {
      const channel = ctx.config.alerting.channels.find(c => c.type === channelType)
      if (channel && channel.enabled) {
        await sendAlertToChannel(rule, channel)
      }
    }

    ctx.status.metrics.alertsGenerated++
  } catch (error) {
    console.error(`[PerformanceIntegration] Failed to trigger alert for rule ${rule.name}:`, error)
  }
}

/**
 * Send a triggered alert rule to a specific channel. The real implementation
 * would route to email/slack/sms/etc.; this logs for now.
 */
export async function sendAlertToChannel(rule: AlertRule, channel: AlertChannelConfig): Promise<void> {
  console.log(`[PerformanceIntegration] Alert sent to ${channel.type}: ${rule.name}`)
}

/**
 * Append a new integration alert to the history, refresh status counters, and
 * forward it to the performance dashboard when available.
 */
export async function createIntegrationAlert(
  ctx: IntegrationContext,
  alert: Omit<IntegrationAlert, 'id' | 'timestamp'>,
  generateId?: IdGenerator
): Promise<void> {
  const integrationAlert: IntegrationAlert = {
    ...alert,
    id: generateId ? generateId() : `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  }

  ctx.alertHistory.push(integrationAlert)

  ctx.status.alerts.recent = ctx.alertHistory.slice(-10)
  ctx.status.alerts.active = ctx.alertHistory.filter(a =>
    a.timestamp.getTime() > (Date.now() - 24 * 60 * 60 * 1000)
  ).length
  ctx.status.alerts.critical = ctx.alertHistory.filter(a =>
    a.severity === 'critical'
    && a.timestamp.getTime() > (Date.now() - 24 * 60 * 60 * 1000)
  ).length

  const dashboard = ctx.components.get('performanceDashboard')
  if (dashboard && typeof dashboard.createAlert === 'function') {
    await dashboard.createAlert({
      severity: alert.severity,
      type: alert.component,
      title: alert.message,
      description: alert.message,
      source: 'integration',
      metrics: alert.metrics
    })
  }
}
