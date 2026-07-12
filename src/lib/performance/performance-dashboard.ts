/**
 * Performance Dashboard and Alerting System
 *
 * This module provides a comprehensive performance monitoring dashboard with real-time
 * metrics, alerting, trend analysis, and actionable insights for emergency scenarios.
 * It integrates with all performance optimization components to provide unified visibility.
 *
 * Type definitions live in ./dashboard-types, default config in ./dashboard-config,
 * metric aggregation in ./dashboard-aggregation, alert dispatch/escalation in
 * ./dashboard-alerting, and rendering/export/widget shaping in ./dashboard-rendering.
 * Everything is re-exported here so existing imports from
 * @/lib/performance/performance-dashboard keep working.
 */

import {
  Alert,
  DashboardConfig,
  DashboardData
} from './dashboard-types'
import { getDefaultConfig, initializeData } from './dashboard-config'
import {
  collectAPIMetrics,
  collectAlertMetrics,
  collectDatabaseMetrics,
  collectEdgeMetrics,
  collectGeographicMetrics,
  collectRegressionMetrics,
  collectSystemMetrics,
  collectTestingMetrics,
  updateTrendData
} from './dashboard-aggregation'
import {
  checkPerformanceThresholds,
  generateAlertId,
  getAlertsToCleanup,
  getAlertsToEscalate,
  getEscalationChannels,
  processAlert,
  sendAlertToChannel,
  ThresholdAlertRequest
} from './dashboard-alerting'
import {
  exportAsCSV,
  exportAsJSON,
  exportAsPDF,
  exportAsPNG,
  getDataForDateRange,
  Widget
} from './dashboard-rendering'

// Re-export all types and helpers for backward compatibility.
export * from './dashboard-types'
export {
  getDefaultConfig,
  initializeData
} from './dashboard-config'
export {
  collectAPIMetrics,
  collectAlertMetrics,
  collectDatabaseMetrics,
  collectEdgeMetrics,
  collectGeographicMetrics,
  collectRegressionMetrics,
  collectSystemMetrics,
  collectTestingMetrics,
  updateTrendData,
  calculateTrendChange
} from './dashboard-aggregation'
export {
  checkPerformanceThresholds,
  generateAlertId,
  getAlertsToCleanup,
  getAlertsToEscalate,
  getEscalationChannels,
  processAlert,
  sendAlertToChannel
} from './dashboard-alerting'
export type { ThresholdAlertRequest } from './dashboard-alerting'
export {
  exportAsCSV,
  exportAsJSON,
  exportAsPDF,
  exportAsPNG,
  getDataForDateRange,
  Widget
} from './dashboard-rendering'

class PerformanceDashboard {
  private static instance: PerformanceDashboard
  private config: DashboardConfig
  private data: DashboardData
  private alerts: Map<string, Alert> = new Map()
  private widgets: Map<string, Widget> = new Map()
  private subscribers: Set<(data: DashboardData) => void> = new Set()
  private alertHistory: Alert[] = []
  private dataHistory: DashboardData[] = []
  private refreshTimer: NodeJS.Timeout | null = null
  private alertTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.config = getDefaultConfig()
    this.data = initializeData()
    // Defer server/browser-dependent startup outside the browser (build-time).
    if (typeof window !== 'undefined') {
      this.initializeWidgets()
      this.startDataCollection()
      this.startAlertProcessing()
    }
  }

  static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard()
    }
    return PerformanceDashboard.instance
  }

  /**
   * Get current dashboard data
   */
  getData(): DashboardData {
    return { ...this.data }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active')
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit)
  }

  /**
   * Get widget data
   */
  getWidgetData(widgetId: string): unknown {
    const widget = this.widgets.get(widgetId)
    if (!widget) {
      return null
    }

    return widget.getData(this.data)
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(callback: (data: DashboardData) => void): () => void {
    this.subscribers.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Create custom alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const alertId = generateAlertId()
    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      status: 'active'
    }

    this.alerts.set(alertId, fullAlert)
    this.alertHistory.push(fullAlert)

    // Process alert immediately
    await processAlert(fullAlert, this.config.alerting.channels)

    console.log(`[PerformanceDashboard] Alert created: ${alertId}`)
    return alertId
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status !== 'active') {
      throw new Error(`Alert ${alertId} not found or not active`)
    }

    alert.status = 'acknowledged'
    alert.acknowledgedBy = acknowledgedBy
    this.alerts.set(alertId, alert)

    console.log(`[PerformanceDashboard] Alert ${alertId} acknowledged by ${acknowledgedBy}`)
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`)
    }

    alert.status = 'resolved'
    alert.resolvedBy = resolvedBy
    alert.resolution = resolution
    alert.resolvedAt = new Date()
    this.alerts.set(alertId, alert)

    console.log(`[PerformanceDashboard] Alert ${alertId} resolved by ${resolvedBy}`)
  }

  /**
   * Export dashboard data
   */
  async exportData(format: 'json' | 'csv' | 'pdf' | 'png', dateRange?: { start: Date; end: Date }): Promise<Blob> {
    const data = dateRange ? getDataForDateRange(this.dataHistory, this.data, dateRange) : this.data

    switch (format) {
      case 'json':
        return exportAsJSON(data)
      case 'csv':
        return exportAsCSV(data)
      case 'pdf':
        return exportAsPDF(data)
      case 'png':
        return exportAsPNG(data)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(config: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart data collection if refresh interval changed
    if (config.refreshInterval) {
      this.restartDataCollection()
    }
  }

  /**
   * Activate emergency mode
   */
  async activateEmergencyMode(): Promise<void> {
    if (!this.config.emergencyMode.enabled) {
      return
    }

    try {
      // Update configuration for emergency mode
      this.config.emergencyMode.priorityAlerts = true
      this.config.refreshInterval = Math.min(this.config.refreshInterval, 5000) // Max 5 seconds

      // Create emergency alert
      await this.createAlert({
        severity: 'critical',
        type: 'emergency_mode',
        title: 'Emergency Mode Activated',
        description: 'Performance dashboard has entered emergency mode with increased monitoring frequency',
        source: 'dashboard',
        metrics: { emergencyMode: true }
      })

      // Notify all subscribers
      this.notifySubscribers()

      console.log('[PerformanceDashboard] Emergency mode activated')
    } catch (error) {
      console.error('[PerformanceDashboard] Failed to activate emergency mode:', error)
      throw error
    }
  }

  /**
   * Deactivate emergency mode
   */
  async deactivateEmergencyMode(): Promise<void> {
    try {
      // Restore normal configuration
      this.config = getDefaultConfig()

      // Create notification alert
      await this.createAlert({
        severity: 'low',
        type: 'emergency_mode',
        title: 'Emergency Mode Deactivated',
        description: 'Performance dashboard has returned to normal operation mode',
        source: 'dashboard',
        metrics: { emergencyMode: false }
      })

      // Notify all subscribers
      this.notifySubscribers()

      console.log('[PerformanceDashboard] Emergency mode deactivated')
    } catch (error) {
      console.error('[PerformanceDashboard] Failed to deactivate emergency mode:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private initializeWidgets(): void {
    for (const widgetConfig of this.config.widgets) {
      const widget = new Widget(widgetConfig)
      this.widgets.set(widgetConfig.id, widget)
    }
  }

  private startDataCollection(): void {
    this.refreshTimer = setInterval(async () => {
      await this.collectData()
      this.notifySubscribers()
    }, this.config.refreshInterval)

    // Initial data collection
    this.collectData()
  }

  private restartDataCollection(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    this.startDataCollection()
  }

  private async collectData(): Promise<void> {
    try {
      const timestamp = new Date()

      // Collect system metrics
      this.data.system = collectSystemMetrics(this.data.system)

      // Collect API metrics
      this.data.api = collectAPIMetrics()

      // Collect database metrics
      this.data.database = collectDatabaseMetrics()

      // Collect alert metrics
      this.data.alerts = collectAlertMetrics(this.getActiveAlerts(), this.alertHistory)

      // Collect edge metrics
      this.data.edge = collectEdgeMetrics()

      // Collect testing metrics
      this.data.testing = collectTestingMetrics()

      // Collect regression metrics
      this.data.regression = collectRegressionMetrics()

      // Collect geographic metrics
      this.data.geographic = collectGeographicMetrics(this.data.system.activeUsers)

      // Update trend data
      updateTrendData(this.data.trends, this.data.api, this.data.system)

      // Update timestamp
      this.data.timestamp = timestamp

      // Store in history
      this.dataHistory.push({ ...this.data })
      if (this.dataHistory.length > this.config.retentionPeriod * 24 * 60) { // Store per minute data
        this.dataHistory.shift()
      }

      // Check for performance issues
      await this.checkPerformanceThresholds()
    } catch (error) {
      console.error('[PerformanceDashboard] Failed to collect data:', error)
    }
  }

  private async checkPerformanceThresholds(): Promise<void> {
    const requests = checkPerformanceThresholds(
      this.config.alerting.thresholds,
      this.data.api,
      this.data.database,
      this.data.system,
      this.data.alerts
    )

    for (const request of requests) {
      await this.createAlert(request)
    }
  }

  private startAlertProcessing(): void {
    if (!this.config.alerting.enabled) {
      return
    }

    this.alertTimer = setInterval(async () => {
      await this.processAlertEscalations()
      await this.cleanupOldAlerts()
    }, this.config.alerting.batchInterval)
  }

  private async processAlertEscalations(): Promise<void> {
    if (!this.config.alerting.escalation.enabled) {
      return
    }

    const ids = getAlertsToEscalate(this.alerts, this.config.alerting.escalation.escalateAfter)
    for (const id of ids) {
      const alert = this.alerts.get(id)
      if (alert) {
        await this.escalateAlert(alert)
      }
    }
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    alert.status = 'escalated'
    alert.escalatedAt = new Date()
    this.alerts.set(alert.id, alert)

    // Send to escalation channels
    const channels = getEscalationChannels(alert, this.config)
    for (const channel of channels) {
      await sendAlertToChannel(alert, channel)
    }

    console.log(`[PerformanceDashboard] Alert ${alert.id} escalated`)
  }

  private async cleanupOldAlerts(): Promise<void> {
    // Remove old resolved alerts from active map
    const ids = getAlertsToCleanup(this.alerts)
    for (const id of ids) {
      this.alerts.delete(id)
    }

    // Limit alert history size
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000)
    }
  }

  private notifySubscribers(): void {
    if (!this.config.realTimeUpdates) {
      return
    }

    this.subscribers.forEach(callback => {
      try {
        callback(this.data)
      } catch (error) {
        console.error('[PerformanceDashboard] Error notifying subscriber:', error)
      }
    })
  }
}

// Export singleton instance
export const performanceDashboard = PerformanceDashboard.getInstance()

// Export hooks for easy integration
export function usePerformanceDashboard() {
  return {
    getData: performanceDashboard.getData.bind(performanceDashboard),
    getActiveAlerts: performanceDashboard.getActiveAlerts.bind(performanceDashboard),
    getAlertHistory: performanceDashboard.getAlertHistory.bind(performanceDashboard),
    getWidgetData: performanceDashboard.getWidgetData.bind(performanceDashboard),
    subscribe: performanceDashboard.subscribe.bind(performanceDashboard),
    createAlert: performanceDashboard.createAlert.bind(performanceDashboard),
    acknowledgeAlert: performanceDashboard.acknowledgeAlert.bind(performanceDashboard),
    resolveAlert: performanceDashboard.resolveAlert.bind(performanceDashboard),
    exportData: performanceDashboard.exportData.bind(performanceDashboard),
    updateConfig: performanceDashboard.updateConfig.bind(performanceDashboard),
    activateEmergencyMode: performanceDashboard.activateEmergencyMode.bind(performanceDashboard),
    deactivateEmergencyMode: performanceDashboard.deactivateEmergencyMode.bind(performanceDashboard)
  }
}

export default performanceDashboard
