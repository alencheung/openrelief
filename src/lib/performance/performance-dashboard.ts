/**
 * Performance Dashboard and Alerting System
 *
 * This module provides a comprehensive performance monitoring dashboard with real-time
 * metrics, alerting, trend analysis, and actionable insights for emergency scenarios.
 * It integrates with all performance optimization components to provide unified visibility.
 */

import { performanceMonitor } from './performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { alertDispatchOptimizer } from '../alerts/alert-dispatch-optimizer'
import { edgeOptimizer } from '../edge/edge-optimizer'
import { loadTestingFramework } from '../testing/load-testing-framework'
import { performanceRegressionTesting } from '../testing/performance-regression-testing'

// Dashboard configuration
export interface DashboardConfig {
  refreshInterval: number // milliseconds
  retentionPeriod: number // days
  alerting: AlertingConfig
  widgets: WidgetConfig[]
  exportFormats: ('json' | 'csv' | 'pdf' | 'png')[]
  realTimeUpdates: boolean
  emergencyMode: EmergencyModeConfig
}

// Alerting configuration
export interface AlertingConfig {
  enabled: boolean
  channels: AlertChannel[]
  thresholds: PerformanceThresholds
  escalation: EscalationConfig
  cooldownPeriod: number // milliseconds
  batchAlerts: boolean
  batchInterval: number // milliseconds
}

// Alert channel
export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push' | 'console'
  config: any
  enabled: boolean
  severity: ('low' | 'medium' | 'high' | 'critical')[]
}

// Performance thresholds
export interface PerformanceThresholds {
  apiResponseTime: {
    warning: number // ms
    critical: number // ms
  }
  databaseQueryTime: {
    warning: number // ms
    critical: number // ms
  }
  alertDispatchLatency: {
    warning: number // ms
    critical: number // ms
  }
  errorRate: {
    warning: number // percentage
    critical: number // percentage
  }
  throughput: {
    warning: number // requests per second
    critical: number // requests per second
  }
  availability: {
    warning: number // percentage
    critical: number // percentage
  }
  resourceUtilization: {
    cpu: { warning: number; critical: number } // percentage
    memory: { warning: number; critical: number } // percentage
    disk: { warning: number; critical: number } // percentage
    network: { warning: number; critical: number } // percentage
  }
}

// Escalation configuration
export interface EscalationConfig {
  enabled: boolean
  levels: EscalationLevel[]
  autoEscalate: boolean
  escalateAfter: number // milliseconds
}

// Escalation level
export interface EscalationLevel {
  level: number
  severity: 'medium' | 'high' | 'critical'
  channels: AlertChannel['type'][]
  delay: number // milliseconds
  conditions: string[]
}

// Emergency mode configuration
export interface EmergencyModeConfig {
  enabled: boolean
  autoActivate: boolean
  increasedMonitoring: boolean
  priorityAlerts: boolean
  reducedThresholds: boolean
  dashboardLayout: 'compact' | 'detailed' | 'minimal'
}

// Widget configuration
export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number }
  refreshRate: number // seconds
  config: any
  filters?: string[]
}

// Widget types
export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  GAUGE = 'gauge',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  GEOGRAPHIC_MAP = 'geographic_map',
  ALERT_LIST = 'alert_list',
  SYSTEM_STATUS = 'system_status',
  PERFORMANCE_SUMMARY = 'performance_summary'
}

// Dashboard data
export interface DashboardData {
  timestamp: Date
  system: SystemMetrics
  api: APIMetrics
  database: DatabaseMetrics
  alerts: AlertMetrics
  edge: EdgeMetrics
  testing: TestingMetrics
  regression: RegressionMetrics
  geographic: GeographicMetrics
  trends: TrendMetrics
}

// System metrics
export interface SystemMetrics {
  uptime: number
  health: 'healthy' | 'degraded' | 'critical'
  resourceUtilization: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
  activeUsers: number
  concurrentConnections: number
  emergencyMode: boolean
}

// API metrics
export interface APIMetrics {
  requestsPerSecond: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  statusCodes: { [code: number]: number }
  endpoints: { [endpoint: string]: EndpointMetrics }
}

// Endpoint metrics
export interface EndpointMetrics {
  requests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  statusCodes: { [code: number]: number }
}

// Database metrics
export interface DatabaseMetrics {
  connections: {
    active: number
    idle: number
    total: number
  }
  queryPerformance: {
    averageTime: number
    p95Time: number
    p99Time: number
    queriesPerSecond: number
  }
  cacheHitRate: number
  indexUsage: { [index: string]: number }
  slowQueries: SlowQuery[]
}

// Slow query
export interface SlowQuery {
  query: string
  executionTime: number
  timestamp: Date
  parameters: any
  frequency: number
}

// Alert metrics
export interface AlertMetrics {
  active: number
  resolved: number
  escalated: number
  bySeverity: { [severity: string]: number }
  byType: { [type: string]: number }
  recent: Alert[]
}

// Alert
export interface Alert {
  id: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  title: string
  description: string
  source: string
  metrics: any
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated'
  acknowledgedBy?: string
  resolvedBy?: string
  resolution?: string
  escalatedAt?: Date
  resolvedAt?: Date
}

// Edge metrics
export interface EdgeMetrics {
  cacheHitRate: number
  timeToFirstByte: number
  geographicLatency: { [region: string]: number }
  compressionRatio: number
  requestsPerSecond: number
  bandwidthSaved: number
}

// Testing metrics
export interface TestingMetrics {
  activeTests: number
  completedTests: number
  failedTests: number
  averageDuration: number
  lastTestDate?: Date
  testResults: TestResult[]
}

// Test result
export interface TestResult {
  id: string
  name: string
  type: string
  status: 'passed' | 'failed' | 'running'
  duration: number
  timestamp: Date
  metrics: any
}

// Regression metrics
export interface RegressionMetrics {
  lastTest: Date
  status: 'passed' | 'failed' | 'warning'
  violations: number
  criticalViolations: number
  trends: { [metric: string]: number }
  recommendations: string[]
}

// Geographic metrics
export interface GeographicMetrics {
  totalUsers: number
  usersByRegion: { [region: string]: number }
  averageLatency: number
  latencyByRegion: { [region: string]: number }
  errorRateByRegion: { [region: string]: number }
  activeEmergencies: GeographicEmergency[]
}

// Geographic emergency
export interface GeographicEmergency {
  id: string
  location: { lat: number; lng: number }
  radius: number // meters
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedUsers: number
  timestamp: Date
}

// Trend metrics
export interface TrendMetrics {
  responseTime: TrendData[]
  throughput: TrendData[]
  errorRate: TrendData[]
  userActivity: TrendData[]
  resourceUtilization: TrendData[]
}

// Trend data
export interface TrendData {
  timestamp: Date
  value: number
  changePercent?: number
  prediction?: number
}

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
    this.config = this.getDefaultConfig()
    this.data = this.initializeData()
    this.initializeWidgets()
    this.startDataCollection()
    this.startAlertProcessing()
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
  getWidgetData(widgetId: string): any {
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
    const alertId = this.generateAlertId()
    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      status: 'active'
    }

    this.alerts.set(alertId, fullAlert)
    this.alertHistory.push(fullAlert)

    // Process alert immediately
    await this.processAlert(fullAlert)

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
    const data = dateRange ? this.getDataForDateRange(dateRange) : this.data

    switch (format) {
      case 'json':
        return this.exportAsJSON(data)
      case 'csv':
        return this.exportAsCSV(data)
      case 'pdf':
        return this.exportAsPDF(data)
      case 'png':
        return this.exportAsPNG(data)
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
      this.config = this.getDefaultConfig()

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

  private getDefaultConfig(): DashboardConfig {
    return {
      refreshInterval: 10000, // 10 seconds
      retentionPeriod: 30, // 30 days
      alerting: {
        enabled: true,
        channels: [
          {
            type: 'console',
            config: {},
            enabled: true,
            severity: ['low', 'medium', 'high', 'critical']
          },
          {
            type: 'email',
            config: {
              recipients: ['admin@openrelief.org'],
              template: 'performance-alert'
            },
            enabled: true,
            severity: ['high', 'critical']
          },
          {
            type: 'slack',
            config: {
              webhook: process.env.SLACK_WEBHOOK_URL,
              channel: '#performance-alerts'
            },
            enabled: true,
            severity: ['high', 'critical']
          }
        ],
        thresholds: {
          apiResponseTime: { warning: 500, critical: 1000 },
          databaseQueryTime: { warning: 200, critical: 500 },
          alertDispatchLatency: { warning: 100, critical: 200 },
          errorRate: { warning: 1, critical: 5 },
          throughput: { warning: 100, critical: 50 },
          availability: { warning: 99.5, critical: 99.0 },
          resourceUtilization: {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 75, critical: 90 },
            disk: { warning: 80, critical: 95 },
            network: { warning: 70, critical: 90 }
          }
        },
        escalation: {
          enabled: true,
          levels: [
            {
              level: 1,
              severity: 'medium',
              channels: ['email'],
              delay: 300000, // 5 minutes
              conditions: ['error_rate > 1%', 'response_time > 500ms']
            },
            {
              level: 2,
              severity: 'high',
              channels: ['slack', 'email'],
              delay: 600000, // 10 minutes
              conditions: ['error_rate > 5%', 'response_time > 1000ms']
            },
            {
              level: 3,
              severity: 'critical',
              channels: ['slack', 'email', 'sms'],
              delay: 900000, // 15 minutes
              conditions: ['availability < 99%', 'resource_utilization > 90%']
            }
          ],
          autoEscalate: true,
          escalateAfter: 600000 // 10 minutes
        },
        cooldownPeriod: 300000, // 5 minutes
        batchAlerts: true,
        batchInterval: 60000 // 1 minute
      },
      widgets: [
        {
          id: 'system-health',
          type: WidgetType.SYSTEM_STATUS,
          title: 'System Health',
          size: 'medium',
          position: { x: 0, y: 0 },
          refreshRate: 10,
          config: { showDetails: true }
        },
        {
          id: 'api-performance',
          type: WidgetType.LINE_CHART,
          title: 'API Response Time',
          size: 'large',
          position: { x: 1, y: 0 },
          refreshRate: 5,
          config: { metric: 'responseTime', timeRange: '1h' }
        },
        {
          id: 'alert-list',
          type: WidgetType.ALERT_LIST,
          title: 'Active Alerts',
          size: 'medium',
          position: { x: 0, y: 1 },
          refreshRate: 30,
          config: { maxItems: 10, showResolved: false }
        },
        {
          id: 'geographic-map',
          type: WidgetType.GEOGRAPHIC_MAP,
          title: 'Geographic Performance',
          size: 'large',
          position: { x: 1, y: 1 },
          refreshRate: 60,
          config: { showLatency: true, showErrors: true }
        }
      ],
      exportFormats: ['json', 'csv', 'pdf'],
      realTimeUpdates: true,
      emergencyMode: {
        enabled: true,
        autoActivate: true,
        increasedMonitoring: true,
        priorityAlerts: true,
        reducedThresholds: true,
        dashboardLayout: 'compact'
      }
    }
  }

  private initializeData(): DashboardData {
    return {
      timestamp: new Date(),
      system: {
        uptime: 0,
        health: 'healthy',
        resourceUtilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
        activeUsers: 0,
        concurrentConnections: 0,
        emergencyMode: false
      },
      api: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        statusCodes: {},
        endpoints: {}
      },
      database: {
        connections: { active: 0, idle: 0, total: 0 },
        queryPerformance: { averageTime: 0, p95Time: 0, p99Time: 0, queriesPerSecond: 0 },
        cacheHitRate: 0,
        indexUsage: {},
        slowQueries: []
      },
      alerts: {
        active: 0,
        resolved: 0,
        escalated: 0,
        bySeverity: {},
        byType: {},
        recent: []
      },
      edge: {
        cacheHitRate: 0,
        timeToFirstByte: 0,
        geographicLatency: {},
        compressionRatio: 0,
        requestsPerSecond: 0,
        bandwidthSaved: 0
      },
      testing: {
        activeTests: 0,
        completedTests: 0,
        failedTests: 0,
        averageDuration: 0,
        testResults: []
      },
      regression: {
        lastTest: new Date(),
        status: 'passed',
        violations: 0,
        criticalViolations: 0,
        trends: {},
        recommendations: []
      },
      geographic: {
        totalUsers: 0,
        usersByRegion: {},
        averageLatency: 0,
        latencyByRegion: {},
        errorRateByRegion: {},
        activeEmergencies: []
      },
      trends: {
        responseTime: [],
        throughput: [],
        errorRate: [],
        userActivity: [],
        resourceUtilization: []
      }
    }
  }

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
      this.data.system = await this.collectSystemMetrics()

      // Collect API metrics
      this.data.api = await this.collectAPIMetrics()

      // Collect database metrics
      this.data.database = await this.collectDatabaseMetrics()

      // Collect alert metrics
      this.data.alerts = await this.collectAlertMetrics()

      // Collect edge metrics
      this.data.edge = await this.collectEdgeMetrics()

      // Collect testing metrics
      this.data.testing = await this.collectTestingMetrics()

      // Collect regression metrics
      this.data.regression = await this.collectRegressionMetrics()

      // Collect geographic metrics
      this.data.geographic = await this.collectGeographicMetrics()

      // Update trend data
      this.updateTrendData()

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

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // Simulate system metrics collection
    const cpu = 20 + Math.random() * 60
    const memory = 30 + Math.random() * 50
    const disk = 10 + Math.random() * 30
    const network = 5 + Math.random() * 40

    let health: SystemMetrics['health'] = 'healthy'
    if (cpu > 80 || memory > 85 || disk > 90) {
      health = 'critical'
    } else if (cpu > 70 || memory > 75 || disk > 80) {
      health = 'degraded'
    }

    return {
      uptime: process.uptime() * 1000,
      health,
      resourceUtilization: { cpu, memory, disk, network },
      activeUsers: Math.floor(1000 + Math.random() * 49000),
      concurrentConnections: Math.floor(100 + Math.random() * 4900),
      emergencyMode: this.data.system.emergencyMode
    }
  }

  private async collectAPIMetrics(): Promise<APIMetrics> {
    // Simulate API metrics collection
    const requestsPerSecond = 100 + Math.random() * 900
    const averageResponseTime = 50 + Math.random() * 450
    const p95ResponseTime = averageResponseTime * (1.5 + Math.random() * 0.5)
    const p99ResponseTime = averageResponseTime * (2 + Math.random() * 1)
    const errorRate = Math.random() * 5

    return {
      requestsPerSecond,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      statusCodes: {
        200: Math.floor(requestsPerSecond * (100 - errorRate) / 100),
        400: Math.floor(requestsPerSecond * errorRate * 0.3 / 100),
        500: Math.floor(requestsPerSecond * errorRate * 0.7 / 100)
      },
      endpoints: {
        '/api/emergency': {
          requests: Math.floor(requestsPerSecond * 0.4),
          averageResponseTime: averageResponseTime * 0.8,
          p95ResponseTime: p95ResponseTime * 0.8,
          p99ResponseTime: p99ResponseTime * 0.8,
          errorRate: errorRate * 0.5,
          statusCodes: { 200: 80, 400: 10, 500: 10 }
        },
        '/api/alerts/dispatch': {
          requests: Math.floor(requestsPerSecond * 0.2),
          averageResponseTime: averageResponseTime * 0.3,
          p95ResponseTime: p95ResponseTime * 0.3,
          p99ResponseTime: p99ResponseTime * 0.3,
          errorRate: errorRate * 0.2,
          statusCodes: { 200: 95, 400: 3, 500: 2 }
        }
      }
    }
  }

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    // Simulate database metrics collection
    const activeConnections = Math.floor(10 + Math.random() * 90)
    const idleConnections = Math.floor(5 + Math.random() * 45)
    const averageTime = 50 + Math.random() * 150
    const p95Time = averageTime * (1.5 + Math.random() * 0.5)
    const p99Time = averageTime * (2 + Math.random() * 1)
    const queriesPerSecond = 200 + Math.random() * 800

    return {
      connections: {
        active: activeConnections,
        idle: idleConnections,
        total: activeConnections + idleConnections
      },
      queryPerformance: {
        averageTime,
        p95Time,
        p99Time,
        queriesPerSecond
      },
      cacheHitRate: 80 + Math.random() * 15,
      indexUsage: {
        emergency_location_idx: 90 + Math.random() * 10,
        emergency_severity_idx: 85 + Math.random() * 10,
        user_location_idx: 88 + Math.random() * 8
      },
      slowQueries: averageTime > 200 ? [{
        query: 'SELECT * FROM emergencies WHERE location && $1',
        executionTime: averageTime,
        timestamp: new Date(),
        parameters: {},
        frequency: Math.floor(Math.random() * 10)
      }] : []
    }
  }

  private async collectAlertMetrics(): Promise<AlertMetrics> {
    const activeAlerts = this.getActiveAlerts()
    const resolvedAlerts = this.alertHistory.filter(a => a.status === 'resolved').length
    const escalatedAlerts = this.alertHistory.filter(a => a.status === 'escalated').length

    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 }
    const byType: { [type: string]: number } = {}

    activeAlerts.forEach(alert => {
      bySeverity[alert.severity]++
      byType[alert.type] = (byType[alert.type] || 0) + 1
    })

    return {
      active: activeAlerts.length,
      resolved: resolvedAlerts,
      escalated: escalatedAlerts,
      bySeverity,
      byType,
      recent: activeAlerts.slice(-10)
    }
  }

  private async collectEdgeMetrics(): Promise<EdgeMetrics> {
    // Simulate edge metrics collection
    const cacheHitRate = 85 + Math.random() * 10
    const timeToFirstByte = 50 + Math.random() * 150
    const compressionRatio = 0.6 + Math.random() * 0.2
    const requestsPerSecond = 200 + Math.random() * 800
    const bandwidthSaved = requestsPerSecond * (1 - compressionRatio) * 1024 // KB

    return {
      cacheHitRate,
      timeToFirstByte,
      geographicLatency: {
        'na-east': 30 + Math.random() * 50,
        'na-west': 60 + Math.random() * 80,
        'eu-west': 100 + Math.random() * 100,
        'eu-central': 80 + Math.random() * 80,
        'asia-east': 150 + Math.random() * 100,
        'asia-southeast': 120 + Math.random() * 80
      },
      compressionRatio,
      requestsPerSecond,
      bandwidthSaved
    }
  }

  private async collectTestingMetrics(): Promise<TestingMetrics> {
    const activeTests = loadTestingFramework.getActiveTests().filter(t => t.status === 'running').length
    const allTests = loadTestingFramework.getTestHistory(10)
    const completedTests = allTests.filter(t => t.status === 'completed').length
    const failedTests = allTests.filter(t => t.status === 'failed').length
    const averageDuration = completedTests > 0
      ? allTests.reduce((sum, t) => sum + t.duration, 0) / completedTests
      : 0

    return {
      activeTests,
      completedTests,
      failedTests,
      averageDuration,
      lastTestDate: allTests.length > 0 ? allTests[0].timestamp : undefined,
      testResults: allTests.slice(0, 5).map(test => ({
        id: test.testId,
        name: test.config.name,
        type: test.scenario,
        status: test.status,
        duration: test.duration,
        timestamp: test.timestamp,
        metrics: test.performance
      }))
    }
  }

  private async collectRegressionMetrics(): Promise<RegressionMetrics> {
    const testHistory = performanceRegressionTesting.getTestHistory(5)
    const lastTest = testHistory[0]

    if (!lastTest) {
      return {
        lastTest: new Date(),
        status: 'passed',
        violations: 0,
        criticalViolations: 0,
        trends: {},
        recommendations: []
      }
    }

    const criticalViolations = lastTest.violations.filter(v => v.severity === 'critical').length
    const trends: { [metric: string]: number } = {}

    // Calculate trends from test history
    if (testHistory.length >= 2) {
      const current = testHistory[0]
      const previous = testHistory[1]

      current.comparisons.forEach(comparison => {
        trends[comparison.metric] = comparison.changePercent
      })
    }

    return {
      lastTest: lastTest.timestamp,
      status: lastTest.status as 'passed' | 'failed' | 'warning',
      violations: lastTest.violations.length,
      criticalViolations,
      trends,
      recommendations: lastTest.recommendations
    }
  }

  private async collectGeographicMetrics(): Promise<GeographicMetrics> {
    // Simulate geographic metrics collection
    const totalUsers = this.data.system.activeUsers
    const usersByRegion = {
      'na-east': Math.floor(totalUsers * 0.35),
      'na-west': Math.floor(totalUsers * 0.25),
      'eu-west': Math.floor(totalUsers * 0.20),
      'eu-central': Math.floor(totalUsers * 0.10),
      'asia-east': Math.floor(totalUsers * 0.07),
      'asia-southeast': Math.floor(totalUsers * 0.03)
    }

    const latencyByRegion = {
      'na-east': 30 + Math.random() * 50,
      'na-west': 60 + Math.random() * 80,
      'eu-west': 100 + Math.random() * 100,
      'eu-central': 80 + Math.random() * 80,
      'asia-east': 150 + Math.random() * 100,
      'asia-southeast': 120 + Math.random() * 80
    }

    const averageLatency = Object.values(latencyByRegion).reduce((sum, latency) => sum + latency, 0) / Object.keys(latencyByRegion).length

    const errorRateByRegion = {
      'na-east': Math.random() * 2,
      'na-west': Math.random() * 3,
      'eu-west': Math.random() * 2.5,
      'eu-central': Math.random() * 2,
      'asia-east': Math.random() * 4,
      'asia-southeast': Math.random() * 3.5
    }

    return {
      totalUsers,
      usersByRegion,
      averageLatency,
      latencyByRegion,
      errorRateByRegion,
      activeEmergencies: [] // Would be populated from actual emergency data
    }
  }

  private updateTrendData(): void {
    const timestamp = new Date()

    // Update response time trend
    this.data.trends.responseTime.push({
      timestamp,
      value: this.data.api.averageResponseTime,
      changePercent: this.calculateTrendChange(this.data.trends.responseTime, this.data.api.averageResponseTime)
    })

    // Update throughput trend
    this.data.trends.throughput.push({
      timestamp,
      value: this.data.api.requestsPerSecond,
      changePercent: this.calculateTrendChange(this.data.trends.throughput, this.data.api.requestsPerSecond)
    })

    // Update error rate trend
    this.data.trends.errorRate.push({
      timestamp,
      value: this.data.api.errorRate,
      changePercent: this.calculateTrendChange(this.data.trends.errorRate, this.data.api.errorRate)
    })

    // Update user activity trend
    this.data.trends.userActivity.push({
      timestamp,
      value: this.data.system.activeUsers,
      changePercent: this.calculateTrendChange(this.data.trends.userActivity, this.data.system.activeUsers)
    })

    // Update resource utilization trend
    const avgResourceUtilization = (this.data.system.resourceUtilization.cpu
                                  + this.data.system.resourceUtilization.memory
                                  + this.data.system.resourceUtilization.disk
                                  + this.data.system.resourceUtilization.network) / 4

    this.data.trends.resourceUtilization.push({
      timestamp,
      value: avgResourceUtilization,
      changePercent: this.calculateTrendChange(this.data.trends.resourceUtilization, avgResourceUtilization)
    })

    // Keep only last 100 data points for each trend
    Object.keys(this.data.trends).forEach(key => {
      const trend = this.data.trends[key as keyof TrendMetrics]
      if (trend.length > 100) {
        trend.shift()
      }
    })
  }

  private calculateTrendChange(trend: TrendData[], currentValue: number): number {
    if (trend.length < 2) {
      return 0
    }

    const previousValue = trend[trend.length - 1].value
    if (previousValue === 0) {
      return 0
    }

    return ((currentValue - previousValue) / previousValue) * 100
  }

  private async checkPerformanceThresholds(): Promise<void> {
    const thresholds = this.config.alerting.thresholds

    // Check API response time
    if (this.data.api.p95ResponseTime > thresholds.apiResponseTime.critical) {
      await this.createAlert({
        severity: 'critical',
        type: 'api_response_time',
        title: 'Critical API Response Time',
        description: `P95 API response time (${this.data.api.p95ResponseTime.toFixed(2)}ms) exceeds critical threshold (${thresholds.apiResponseTime.critical}ms)`,
        source: 'api_monitor',
        metrics: { p95ResponseTime: this.data.api.p95ResponseTime }
      })
    } else if (this.data.api.p95ResponseTime > thresholds.apiResponseTime.warning) {
      await this.createAlert({
        severity: 'medium',
        type: 'api_response_time',
        title: 'High API Response Time',
        description: `P95 API response time (${this.data.api.p95ResponseTime.toFixed(2)}ms) exceeds warning threshold (${thresholds.apiResponseTime.warning}ms)`,
        source: 'api_monitor',
        metrics: { p95ResponseTime: this.data.api.p95ResponseTime }
      })
    }

    // Check error rate
    if (this.data.api.errorRate > thresholds.errorRate.critical) {
      await this.createAlert({
        severity: 'critical',
        type: 'error_rate',
        title: 'Critical Error Rate',
        description: `Error rate (${this.data.api.errorRate.toFixed(2)}%) exceeds critical threshold (${thresholds.errorRate.critical}%)`,
        source: 'api_monitor',
        metrics: { errorRate: this.data.api.errorRate }
      })
    } else if (this.data.api.errorRate > thresholds.errorRate.warning) {
      await this.createAlert({
        severity: 'medium',
        type: 'error_rate',
        title: 'High Error Rate',
        description: `Error rate (${this.data.api.errorRate.toFixed(2)}%) exceeds warning threshold (${thresholds.errorRate.warning}%)`,
        source: 'api_monitor',
        metrics: { errorRate: this.data.api.errorRate }
      })
    }

    // Check resource utilization
    const { cpu, memory, disk, network } = this.data.system.resourceUtilization

    if (cpu > thresholds.resourceUtilization.cpu.critical) {
      await this.createAlert({
        severity: 'critical',
        type: 'resource_utilization',
        title: 'Critical CPU Utilization',
        description: `CPU utilization (${cpu.toFixed(1)}%) exceeds critical threshold (${thresholds.resourceUtilization.cpu.critical}%)`,
        source: 'system_monitor',
        metrics: { cpu, memory, disk, network }
      })
    }

    if (memory > thresholds.resourceUtilization.memory.critical) {
      await this.createAlert({
        severity: 'critical',
        type: 'resource_utilization',
        title: 'Critical Memory Utilization',
        description: `Memory utilization (${memory.toFixed(1)}%) exceeds critical threshold (${thresholds.resourceUtilization.memory.critical}%)`,
        source: 'system_monitor',
        metrics: { cpu, memory, disk, network }
      })
    }

    // Check database performance
    if (this.data.database.queryPerformance.p95Time > thresholds.databaseQueryTime.critical) {
      await this.createAlert({
        severity: 'critical',
        type: 'database_performance',
        title: 'Critical Database Query Time',
        description: `P95 database query time (${this.data.database.queryPerformance.p95Time.toFixed(2)}ms) exceeds critical threshold (${thresholds.databaseQueryTime.critical}ms)`,
        source: 'database_monitor',
        metrics: { p95QueryTime: this.data.database.queryPerformance.p95Time }
      })
    }

    // Check alert dispatch latency
    if (this.data.alerts.active > 10) {
      await this.createAlert({
        severity: 'high',
        type: 'alert_volume',
        title: 'High Alert Volume',
        description: `Active alerts (${this.data.alerts.active}) exceed normal threshold`,
        source: 'alert_monitor',
        metrics: { activeAlerts: this.data.alerts.active }
      })
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

  private async processAlert(alert: Alert): Promise<void> {
    try {
      // Send to configured channels
      for (const channel of this.config.alerting.channels) {
        if (!channel.enabled || !channel.severity.includes(alert.severity)) {
          continue
        }

        await this.sendAlertToChannel(alert, channel)
      }

      console.log(`[PerformanceDashboard] Alert ${alert.id} processed and sent to channels`)
    } catch (error) {
      console.error(`[PerformanceDashboard] Failed to process alert ${alert.id}:`, error)
    }
  }

  private async sendAlertToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.error(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`)
        console.error(`[ALERT] ${alert.description}`)
        break
      case 'email':
        await this.sendEmailAlert(alert, channel.config)
        break
      case 'slack':
        await this.sendSlackAlert(alert, channel.config)
        break
      case 'webhook':
        await this.sendWebhookAlert(alert, channel.config)
        break
      case 'sms':
        await this.sendSMSAlert(alert, channel.config)
        break
      case 'push':
        await this.sendPushAlert(alert, channel.config)
        break
    }
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Implementation for sending email alerts
    console.log(`[PerformanceDashboard] Email alert sent for ${alert.id}`)
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    // Implementation for sending Slack alerts
    console.log(`[PerformanceDashboard] Slack alert sent for ${alert.id}`)
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    // Implementation for sending webhook alerts
    console.log(`[PerformanceDashboard] Webhook alert sent for ${alert.id}`)
  }

  private async sendSMSAlert(alert: Alert, config: any): Promise<void> {
    // Implementation for sending SMS alerts
    console.log(`[PerformanceDashboard] SMS alert sent for ${alert.id}`)
  }

  private async sendPushAlert(alert: Alert, config: any): Promise<void> {
    // Implementation for sending push notifications
    console.log(`[PerformanceDashboard] Push alert sent for ${alert.id}`)
  }

  private async processAlertEscalations(): Promise<void> {
    if (!this.config.alerting.escalation.enabled) {
      return
    }

    const now = Date.now()
    const escalationDelay = this.config.alerting.escalation.escalateAfter

    for (const alert of this.alerts.values()) {
      if (alert.status !== 'active') {
        continue
      }

      const alertAge = now - alert.timestamp.getTime()

      if (alertAge > escalationDelay && !alert.escalatedAt) {
        await this.escalateAlert(alert)
      }
    }
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    alert.status = 'escalated'
    alert.escalatedAt = new Date()
    this.alerts.set(alert.id, alert)

    // Send to escalation channels
    const escalationLevel = this.config.alerting.escalation.levels.find(level =>
      level.severity === alert.severity
    )

    if (escalationLevel) {
      for (const channelType of escalationLevel.channels) {
        const channel = this.config.alerting.channels.find(c => c.type === channelType)
        if (channel) {
          await this.sendAlertToChannel(alert, channel)
        }
      }
    }

    console.log(`[PerformanceDashboard] Alert ${alert.id} escalated`)
  }

  private async cleanupOldAlerts(): Promise<void> {
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

    // Remove old resolved alerts from active map
    for (const [id, alert] of this.alerts.entries()) {
      const alertAge = now - alert.timestamp.getTime()

      if (alertAge > maxAge || (alert.status === 'resolved' && alertAge > 24 * 60 * 60 * 1000)) {
        this.alerts.delete(id)
      }
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

  private getDataForDateRange(dateRange: { start: Date; end: Date }): DashboardData {
    // Filter data history for date range
    const filteredHistory = this.dataHistory.filter(data =>
      data.timestamp >= dateRange.start && data.timestamp <= dateRange.end
    )

    // Return aggregated data for the range
    if (filteredHistory.length === 0) {
      return this.data
    }

    // Aggregate metrics (simplified)
    const aggregated = { ...this.data }

    // Calculate averages for the period
    aggregated.api.averageResponseTime = filteredHistory.reduce((sum, data) => sum + data.api.averageResponseTime, 0) / filteredHistory.length
    aggregated.api.requestsPerSecond = filteredHistory.reduce((sum, data) => sum + data.api.requestsPerSecond, 0) / filteredHistory.length
    aggregated.api.errorRate = filteredHistory.reduce((sum, data) => sum + data.api.errorRate, 0) / filteredHistory.length

    return aggregated
  }

  private async exportAsJSON(data: DashboardData): Promise<Blob> {
    const json = JSON.stringify(data, null, 2)
    return new Blob([json], { type: 'application/json' })
  }

  private async exportAsCSV(data: DashboardData): Promise<Blob> {
    // Simple CSV export for key metrics
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

  private async exportAsPDF(data: DashboardData): Promise<Blob> {
    // PDF export would require a library like jsPDF
    // For now, return a placeholder
    const pdf = 'PDF export not implemented'
    return new Blob([pdf], { type: 'application/pdf' })
  }

  private async exportAsPNG(data: DashboardData): Promise<Blob> {
    // PNG export would require canvas rendering
    // For now, return a placeholder
    const png = 'PNG export not implemented'
    return new Blob([png], { type: 'image/png' })
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Widget class
class Widget {
  private config: WidgetConfig

  constructor(config: WidgetConfig) {
    this.config = config
  }

  getData(data: DashboardData): any {
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

  private getSystemStatusData(data: DashboardData): any {
    return {
      health: data.system.health,
      uptime: data.system.uptime,
      activeUsers: data.system.activeUsers,
      emergencyMode: data.system.emergencyMode,
      resourceUtilization: data.system.resourceUtilization
    }
  }

  private getLineChartData(data: DashboardData): any {
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

  private getAlertListData(data: DashboardData): any {
    return {
      alerts: data.alerts.recent.slice(0, this.config.config.maxItems || 10),
      total: data.alerts.active,
      showResolved: this.config.config.showResolved || false
    }
  }

  private getGeographicMapData(data: DashboardData): any {
    return {
      usersByRegion: data.geographic.usersByRegion,
      latencyByRegion: data.geographic.latencyByRegion,
      errorRateByRegion: data.geographic.errorRateByRegion,
      showLatency: this.config.config.showLatency || false,
      showErrors: this.config.config.showErrors || false
    }
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