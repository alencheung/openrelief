/**
 * Performance Integration Configuration
 *
 * Default configuration and initial status factories for the performance
 * integration layer. Extracted from performance-integration.ts.
 */

import {
  PerformanceIntegrationConfig,
  PerformanceIntegrationStatus
} from './integration-types'

/**
 * Build the default integration configuration. This is a large nested literal
 * and previously lived inline in the PerformanceIntegration constructor.
 */
export function getDefaultConfig(): PerformanceIntegrationConfig {
  return {
    enabled: true,
    emergencyMode: {
      autoActivate: true,
      activationTriggers: [
        {
          type: 'performance',
          condition: {
            metric: 'response_time_p95',
            operator: '>',
            threshold: 1000,
            duration: 60000 // 1 minute
          },
          action: 'activate',
          delay: 0
        },
        {
          type: 'error_rate',
          condition: {
            metric: 'error_rate',
            operator: '>',
            threshold: 5,
            duration: 30000 // 30 seconds
          },
          action: 'activate',
          delay: 0
        },
        {
          type: 'load',
          condition: {
            metric: 'concurrent_users',
            operator: '>',
            threshold: 40000,
            duration: 10000 // 10 seconds
          },
          action: 'activate',
          delay: 5000 // 5 seconds
        }
      ],
      deactivationTriggers: [
        {
          type: 'performance',
          condition: {
            metric: 'response_time_p95',
            operator: '<',
            threshold: 300,
            duration: 300000 // 5 minutes
          },
          action: 'escalate',
          delay: 0
        }
      ],
      priorityLevels: [
        {
          level: 1,
          name: 'normal',
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
          optimizations: ['basic_caching', 'connection_pooling'],
          alerting: {
            enabled: true,
            channels: ['email'],
            escalation: false
          }
        },
        {
          level: 2,
          name: 'elevated',
          thresholds: {
            apiResponseTime: { warning: 300, critical: 500 },
            databaseQueryTime: { warning: 100, critical: 200 },
            alertDispatchLatency: { warning: 50, critical: 100 },
            errorRate: { warning: 0.5, critical: 2 },
            throughput: { warning: 200, critical: 100 },
            availability: { warning: 99.8, critical: 99.5 },
            resourceUtilization: {
              cpu: { warning: 60, critical: 80 },
              memory: { warning: 65, critical: 85 },
              disk: { warning: 70, critical: 90 },
              network: { warning: 60, critical: 80 }
            }
          },
          optimizations: ['aggressive_caching', 'query_optimization', 'edge_routing'],
          alerting: {
            enabled: true,
            channels: ['email', 'slack'],
            escalation: true
          }
        },
        {
          level: 3,
          name: 'emergency',
          thresholds: {
            apiResponseTime: { warning: 100, critical: 200 },
            databaseQueryTime: { warning: 50, critical: 100 },
            alertDispatchLatency: { warning: 25, critical: 50 },
            errorRate: { warning: 0.1, critical: 0.5 },
            throughput: { warning: 500, critical: 200 },
            availability: { warning: 99.9, critical: 99.8 },
            resourceUtilization: {
              cpu: { warning: 50, critical: 70 },
              memory: { warning: 55, critical: 75 },
              disk: { warning: 60, critical: 80 },
              network: { warning: 50, critical: 70 }
            }
          },
          optimizations: ['emergency_caching', 'load_shedding', 'critical_path_optimization'],
          alerting: {
            enabled: true,
            channels: ['email', 'slack', 'sms'],
            escalation: true
          }
        }
      ],
      resourceLimits: {
        maxCPU: 95,
        maxMemory: 95,
        maxConnections: 50000,
        maxAlertsPerMinute: 100,
        maxLoadTestConcurrency: 60000
      }
    },
    monitoring: {
      enabled: true,
      interval: 5000, // 5 seconds
      metrics: [
        'response_time', 'error_rate', 'throughput', 'availability',
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_usage',
        'cache_hit_rate', 'database_connections', 'alert_latency'
      ],
      retention: 30, // 30 days
      realTime: true,
      sampling: {
        enabled: true,
        rate: 10, // 10%
        adaptive: true,
        highLoadThreshold: 10000 // requests per second
      }
    },
    optimization: {
      enabled: true,
      autoOptimize: true,
      strategies: [
        {
          name: 'response_time_optimization',
          type: 'cache',
          enabled: true,
          priority: 1,
          conditions: [
            { metric: 'response_time_p95', operator: '>', threshold: 500 }
          ],
          actions: [
            { type: 'cache', target: 'api_responses', parameters: { ttl: 300 } },
            { type: 'compress', target: 'responses', parameters: { level: 6 } }
          ]
        },
        {
          name: 'database_optimization',
          type: 'database',
          enabled: true,
          priority: 2,
          conditions: [
            { metric: 'database_query_time_p95', operator: '>', threshold: 200 }
          ],
          actions: [
            { type: 'scale', target: 'connection_pool', parameters: { size: 50 } },
            { type: 'cache', target: 'query_results', parameters: { ttl: 600 } }
          ]
        },
        {
          name: 'edge_optimization',
          type: 'edge',
          enabled: true,
          priority: 3,
          conditions: [
            { metric: 'geographic_latency', operator: '>', threshold: 200 }
          ],
          actions: [
            { type: 'redirect', target: 'traffic', parameters: { strategy: 'geographic' } },
            { type: 'cache', target: 'edge_content', parameters: { ttl: 3600 } }
          ]
        }
      ],
      limits: {
        maxCacheSize: 1024 * 1024 * 1024, // 1GB
        maxCompressionLevel: 9,
        maxScaleInstances: 20,
        maxRedirects: 100
      }
    },
    testing: {
      enabled: true,
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '02:00',
        timezone: 'UTC',
        excludeWeekends: false
      },
      scenarios: [
        {
          name: 'daily_load_test',
          type: 'load',
          config: { concurrency: 10000, duration: 300 },
          enabled: true,
          priority: 1
        },
        {
          name: 'weekly_stress_test',
          type: 'stress',
          config: { concurrency: 50000, duration: 600 },
          enabled: true,
          priority: 2
        }
      ],
      loadTesting: {
        enabled: true,
        maxConcurrency: 60000,
        rampUpTime: 300,
        duration: 1800,
        scenarios: ['daily_load_test', 'weekly_stress_test']
      },
      regressionTesting: {
        enabled: true,
        baseline: '1.0.0',
        thresholds: {
          responseTime: 20,
          errorRate: 50,
          throughput: 10,
          availability: 0.1
        },
        autoBlockMerge: true
      }
    },
    alerting: {
      enabled: true,
      channels: [
        {
          type: 'email',
          enabled: true,
          config: { recipients: ['admin@openrelief.org'] },
          filters: []
        },
        {
          type: 'slack',
          enabled: true,
          config: { webhook: process.env.SLACK_WEBHOOK_URL },
          filters: [{ field: 'severity', operator: '>=', value: 'high' }]
        }
      ],
      rules: [
        {
          name: 'high_response_time',
          enabled: true,
          condition: {
            metric: 'response_time_p95',
            operator: '>',
            threshold: 1000,
            duration: 60000
          },
          severity: 'high',
          channels: ['email', 'slack'],
          cooldown: 300000,
          escalation: {
            enabled: true,
            levels: [
              {
                level: 1,
                delay: 300000,
                channels: ['slack'],
                conditions: ['response_time_p95 > 1500']
              }
            ],
            autoEscalate: true
          }
        }
      ],
      suppression: {
        enabled: true,
        rules: [],
        globalCooldown: 60000
      }
    },
    reporting: {
      enabled: true,
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '08:00',
        timezone: 'UTC'
      },
      formats: ['json', 'html'],
      recipients: ['admin@openrelief.org'],
      templates: [
        {
          name: 'daily_performance',
          type: 'performance',
          sections: [
            { name: 'summary', type: 'metric', config: {} },
            { name: 'trends', type: 'chart', config: {} },
            { name: 'alerts', type: 'table', config: {} }
          ],
          format: 'html'
        }
      ]
    }
  }
}

/**
 * Build an initial status object based on the provided config. Counters start
 * at zero and are populated as the integration runs.
 */
export function initializeStatus(config: PerformanceIntegrationConfig): PerformanceIntegrationStatus {
  return {
    enabled: config.enabled,
    emergencyMode: false,
    components: [],
    metrics: {
      uptime: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      optimizationsApplied: 0,
      alertsGenerated: 0,
      testsRun: 0
    },
    alerts: {
      active: 0,
      critical: 0,
      recent: []
    },
    optimizations: {
      total: 0,
      byType: {},
      details: []
    }
  }
}
