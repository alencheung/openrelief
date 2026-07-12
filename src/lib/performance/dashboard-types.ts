/**
 * Performance Dashboard Types
 *
 * Type definitions for the performance monitoring dashboard. Extracted from
 * performance-dashboard.ts so the main module can focus on runtime behavior
 * while aggregation, rendering, and alerting helpers live in their own
 * focused modules.
 */

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
  config: Record<string, unknown>
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
  config: Record<string, unknown>
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
  parameters: Record<string, unknown>
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
  metrics: Record<string, unknown>
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
  metrics: Record<string, unknown>
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
