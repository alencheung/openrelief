/**
 * Audit Trail Management System - Types
 *
 * Type definitions for the audit trail management system.
 */

import { AuditEventType, AuditSeverity, ComplianceFramework } from './audit-logger'
import type { AuditLogEntry } from './audit-logger'

// Log source types
export enum LogSource {
  APPLICATION = 'application',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SYSTEM = 'system',
  SECURITY = 'security',
  PRIVACY = 'privacy',
  LEGAL = 'legal',
  COMPLIANCE = 'compliance',
  API = 'api',
  USER_INTERFACE = 'user_interface'
}

// Log aggregation strategy
export enum AggregationStrategy {
  REAL_TIME = 'real_time',
  BATCH = 'batch',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event_driven'
}

// Log retention policy
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  source?: LogSource;
  retentionDays: number;
  archivalDays?: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Log aggregation rule
export interface AggregationRule {
  id: string;
  name: string;
  description: string;
  source: LogSource;
  eventType?: AuditEventType;
  filters: Record<string, unknown>;
  transformations: string[];
  destination: string;
  enabled: boolean;
  priority: number;
  strategy: AggregationStrategy;
  schedule?: string; // Cron expression for scheduled aggregation
  createdAt: Date;
  updatedAt: Date;
}

// Audit trail query
export interface AuditTrailQuery {
  sources?: LogSource[];
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  tags?: string[];
  complianceFrameworks?: ComplianceFramework[];
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'severity' | 'eventType' | 'source';
  orderDirection?: 'asc' | 'desc';
  includeArchived?: boolean;
}

// Audit trail summary
export interface AuditTrailSummary {
  totalEntries: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  entriesBySource: Record<LogSource, number>;
  entriesByEventType: Record<AuditEventType, number>;
  entriesBySeverity: Record<AuditSeverity, number>;
  entriesByUser: Record<string, number>;
  complianceFrameworkUsage: Record<ComplianceFramework, number>;
  topUsers: Array<{
    userId: string;
    count: number;
    lastActivity: Date;
  }>;
  topEventTypes: Array<{
    eventType: AuditEventType;
    count: number;
    percentage: number;
  }>;
  trends: {
    daily: Array<{
      date: string;
      count: number;
    }>;
    hourly: Array<{
      hour: number;
      count: number;
    }>;
  };
}

// Audit report configuration
export interface AuditReportConfig {
  id: string;
  name: string;
  description: string;
  query: AuditTrailQuery;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  template?: string;
  schedule?: string; // Cron expression
  recipients: string[];
  includeCharts: boolean;
  includeTrends: boolean;
  includeSummary: boolean;
  createdBy: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Generated audit report
export interface AuditReport {
  id: string;
  configId: string;
  name: string;
  format: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: AuditTrailSummary;
  data: AuditLogEntry[];
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
}

// Re-export types used by this module for convenience
export type { AuditEventType, AuditSeverity, ComplianceFramework } from './audit-logger'
