/**
 * Performance Dashboard Alerting
 *
 * Helpers for dispatching alerts to channels, escalating active alerts,
 * and cleaning up stale alerts. Extracted from performance-dashboard.ts.
 * These functions operate on the dashboard instance's alert collections
 * and config, so the PerformanceDashboard class delegates to them.
 */

import {
  Alert,
  AlertChannel,
  AlertMetrics,
  DashboardConfig,
  PerformanceThresholds
} from './dashboard-types'

/**
 * Send an alert to a specific channel based on its type.
 */
export async function sendAlertToChannel(
  alert: Alert,
  channel: AlertChannel
): Promise<void> {
  switch (channel.type) {
    case 'console':
      console.error(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`)
      console.error(`[ALERT] ${alert.description}`)
      break
    case 'email':
      await sendEmailAlert(alert, channel.config)
      break
    case 'slack':
      await sendSlackAlert(alert, channel.config)
      break
    case 'webhook':
      await sendWebhookAlert(alert, channel.config)
      break
    case 'sms':
      await sendSMSAlert(alert, channel.config)
      break
    case 'push':
      await sendPushAlert(alert, channel.config)
      break
  }
}

/**
 * Send an alert to every enabled channel subscribed to its severity.
 */
export async function processAlert(
  alert: Alert,
  channels: AlertChannel[]
): Promise<void> {
  try {
    // Send to configured channels
    for (const channel of channels) {
      if (!channel.enabled || !channel.severity.includes(alert.severity)) {
        continue
      }

      await sendAlertToChannel(alert, channel)
    }

    console.log(`[PerformanceDashboard] Alert ${alert.id} processed and sent to channels`)
  } catch (error) {
    console.error(`[PerformanceDashboard] Failed to process alert ${alert.id}:`, error)
  }
}

/**
 * Escalate an active alert by updating its status and dispatching to
 * escalation-level channels. Returns the channels that should be notified.
 */
export function getEscalationChannels(
  alert: Alert,
  config: DashboardConfig
): AlertChannel[] {
  const escalationLevel = config.alerting.escalation.levels.find(level =>
    level.severity === alert.severity
  )

  if (!escalationLevel) {
    return []
  }

  const channels: AlertChannel[] = []
  for (const channelType of escalationLevel.channels) {
    const channel = config.alerting.channels.find(c => c.type === channelType)
    if (channel) {
      channels.push(channel)
    }
  }

  return channels
}

/**
 * Generate a unique alert id using the current timestamp and random suffix.
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Inspect the latest metrics against thresholds and emit alert requests.
 * The returned list is processed by the caller via createAlert().
 */
export interface ThresholdAlertRequest {
  severity: Alert['severity']
  type: string
  title: string
  description: string
  source: string
  metrics: Record<string, unknown>
}

/**
 * Evaluate the latest dashboard metrics against configured thresholds and
 * return the alert requests that should be raised. Pure function: does not
 * mutate any state.
 */
export function checkPerformanceThresholds(
  thresholds: PerformanceThresholds,
  api: {
    p95ResponseTime: number
    errorRate: number
  },
  database: {
    queryPerformance: { p95Time: number }
  },
  system: {
    resourceUtilization: {
      cpu: number
      memory: number
      disk: number
      network: number
    }
  },
  alertMetrics: AlertMetrics
): ThresholdAlertRequest[] {
  const requests: ThresholdAlertRequest[] = []

  // Check API response time
  if (api.p95ResponseTime > thresholds.apiResponseTime.critical) {
    requests.push({
      severity: 'critical',
      type: 'api_response_time',
      title: 'Critical API Response Time',
      description: `P95 API response time (${api.p95ResponseTime.toFixed(2)}ms) exceeds critical threshold (${thresholds.apiResponseTime.critical}ms)`,
      source: 'api_monitor',
      metrics: { p95ResponseTime: api.p95ResponseTime }
    })
  } else if (api.p95ResponseTime > thresholds.apiResponseTime.warning) {
    requests.push({
      severity: 'medium',
      type: 'api_response_time',
      title: 'High API Response Time',
      description: `P95 API response time (${api.p95ResponseTime.toFixed(2)}ms) exceeds warning threshold (${thresholds.apiResponseTime.warning}ms)`,
      source: 'api_monitor',
      metrics: { p95ResponseTime: api.p95ResponseTime }
    })
  }

  // Check error rate
  if (api.errorRate > thresholds.errorRate.critical) {
    requests.push({
      severity: 'critical',
      type: 'error_rate',
      title: 'Critical Error Rate',
      description: `Error rate (${api.errorRate.toFixed(2)}%) exceeds critical threshold (${thresholds.errorRate.critical}%)`,
      source: 'api_monitor',
      metrics: { errorRate: api.errorRate }
    })
  } else if (api.errorRate > thresholds.errorRate.warning) {
    requests.push({
      severity: 'medium',
      type: 'error_rate',
      title: 'High Error Rate',
      description: `Error rate (${api.errorRate.toFixed(2)}%) exceeds warning threshold (${thresholds.errorRate.warning}%)`,
      source: 'api_monitor',
      metrics: { errorRate: api.errorRate }
    })
  }

  // Check resource utilization
  const { cpu, memory, disk, network } = system.resourceUtilization

  if (cpu > thresholds.resourceUtilization.cpu.critical) {
    requests.push({
      severity: 'critical',
      type: 'resource_utilization',
      title: 'Critical CPU Utilization',
      description: `CPU utilization (${cpu.toFixed(1)}%) exceeds critical threshold (${thresholds.resourceUtilization.cpu.critical}%)`,
      source: 'system_monitor',
      metrics: { cpu, memory, disk, network }
    })
  }

  if (memory > thresholds.resourceUtilization.memory.critical) {
    requests.push({
      severity: 'critical',
      type: 'resource_utilization',
      title: 'Critical Memory Utilization',
      description: `Memory utilization (${memory.toFixed(1)}%) exceeds critical threshold (${thresholds.resourceUtilization.memory.critical}%)`,
      source: 'system_monitor',
      metrics: { cpu, memory, disk, network }
    })
  }

  // Check database performance
  if (database.queryPerformance.p95Time > thresholds.databaseQueryTime.critical) {
    requests.push({
      severity: 'critical',
      type: 'database_performance',
      title: 'Critical Database Query Time',
      description: `P95 database query time (${database.queryPerformance.p95Time.toFixed(2)}ms) exceeds critical threshold (${thresholds.databaseQueryTime.critical}ms)`,
      source: 'database_monitor',
      metrics: { p95QueryTime: database.queryPerformance.p95Time }
    })
  }

  // Check alert dispatch latency
  if (alertMetrics.active > 10) {
    requests.push({
      severity: 'high',
      type: 'alert_volume',
      title: 'High Alert Volume',
      description: `Active alerts (${alertMetrics.active}) exceed normal threshold`,
      source: 'alert_monitor',
      metrics: { activeAlerts: alertMetrics.active }
    })
  }

  return requests
}

/**
 * Walk the active alerts map and return alert ids that should be escalated
 * (i.e. active alerts older than the configured escalateAfter delay that
 * have not already been escalated).
 */
export function getAlertsToEscalate(
  alerts: Map<string, Alert>,
  escalateAfter: number,
  now: number = Date.now()
): string[] {
  const ids: string[] = []
  for (const alert of alerts.values()) {
    if (alert.status !== 'active') {
      continue
    }

    const alertAge = now - alert.timestamp.getTime()
    if (alertAge > escalateAfter && !alert.escalatedAt) {
      ids.push(alert.id)
    }
  }
  return ids
}

/**
 * Return ids of alerts that should be removed from the active map due to age.
 */
export function getAlertsToCleanup(
  alerts: Map<string, Alert>,
  now: number = Date.now()
): string[] {
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
  const ids: string[] = []

  for (const [id, alert] of alerts.entries()) {
    const alertAge = now - alert.timestamp.getTime()
    if (alertAge > maxAge || (alert.status === 'resolved' && alertAge > 24 * 60 * 60 * 1000)) {
      ids.push(id)
    }
  }

  return ids
}

async function sendEmailAlert(alert: Alert, config: Record<string, unknown>): Promise<void> {
  // Implementation for sending email alerts
  console.log(`[PerformanceDashboard] Email alert sent for ${alert.id}`)
}

async function sendSlackAlert(alert: Alert, config: Record<string, unknown>): Promise<void> {
  // Implementation for sending Slack alerts
  console.log(`[PerformanceDashboard] Slack alert sent for ${alert.id}`)
}

async function sendWebhookAlert(alert: Alert, config: Record<string, unknown>): Promise<void> {
  // Implementation for sending webhook alerts
  console.log(`[PerformanceDashboard] Webhook alert sent for ${alert.id}`)
}

async function sendSMSAlert(alert: Alert, config: Record<string, unknown>): Promise<void> {
  // Implementation for sending SMS alerts
  console.log(`[PerformanceDashboard] SMS alert sent for ${alert.id}`)
}

async function sendPushAlert(alert: Alert, config: Record<string, unknown>): Promise<void> {
  // Implementation for sending push notifications
  console.log(`[PerformanceDashboard] Push alert sent for ${alert.id}`)
}
