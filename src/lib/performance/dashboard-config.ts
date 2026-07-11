/**
 * Performance Dashboard Default Config
 *
 * Default DashboardConfig and initial DashboardData factories. Extracted
 * from performance-dashboard.ts so the main module can focus on runtime
 * behavior.
 */

import { DashboardConfig, DashboardData, WidgetType } from './dashboard-types'

/**
 * Build the default dashboard configuration used at startup.
 */
export function getDefaultConfig(): DashboardConfig {
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

/**
 * Build the zeroed-out DashboardData snapshot used at startup.
 */
export function initializeData(): DashboardData {
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
