/**
 * Comprehensive Performance Monitoring System - Types
 *
 * Type definitions for the performance monitoring system.
 */

// Performance metric types
export interface PerformanceMetric {
  id: string
  timestamp: Date
  type: 'api' | 'database' | 'frontend' | 'alert' | 'system' | 'user_experience' | 'edge'
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'requests_per_second'
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}

// Core Web Vitals interface
export interface CoreWebVitals {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
  inp: number // Interaction to Next Paint
}

// Alert dispatch metrics
export interface AlertDispatchMetrics {
  alertId: string
  userId: string
  eventType: string
  dispatchStartTime: number
  dispatchEndTime: number
  latency: number
  success: boolean
  errorType?: string
  deliveryMethod: 'push' | 'email' | 'sms' | 'websocket'
  retryCount: number
}

// Database query metrics
export interface DatabaseQueryMetrics {
  queryId: string
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'rpc'
  tableName: string
  executionTime: number
  rowsAffected?: number
  indexUsed?: string
  cacheHit: boolean
  concurrentConnections: number
}

// System resource metrics
export interface SystemResourceMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIO: {
    bytesIn: number
    bytesOut: number
  }
  activeConnections: number
  queueDepth: number
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // API response times (ms)
  api: {
    emergency_alert: 100, // Critical for emergency response
    emergency_create: 150,
    emergency_query: 200,
    auth_operations: 500,
    general_api: 300
  },

  // Database queries (ms)
  database: {
    select: 50,
    insert: 100,
    update: 100,
    delete: 50,
    rpc: 200,
    spatial_query: 150 // Geo queries are more expensive
  },

  // Core Web Vitals
  web_vitals: {
    lcp: 2500, // Largest Contentful Paint
    fid: 100,  // First Input Delay
    cls: 0.1,  // Cumulative Layout Shift
    fcp: 1800, // First Contentful Paint
    ttfb: 600, // Time to First Byte
    inp: 200   // Interaction to Next Paint
  },

  // System resources (percentage)
  system: {
    cpu_usage: 80,
    memory_usage: 85,
    disk_usage: 90,
    active_connections: 1000
  },

  // Alert dispatch (ms)
  alert_dispatch: {
    push: 100,
    email: 5000,
    sms: 3000,
    websocket: 50
  }
}

// Performance alert levels
export enum PerformanceAlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

// Performance alert interface
export interface PerformanceAlert {
  id: string
  level: PerformanceAlertLevel
  metric: string
  currentValue: number
  threshold: number
  timestamp: Date
  description: string
  impact: string
  recommendations: string[]
  resolved: boolean
  resolvedAt?: Date
}
