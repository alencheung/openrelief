/**
 * Real-time Compliance Monitoring System - Types
 *
 * Type definitions for the compliance monitoring system.
 */

import { ComplianceFramework } from './audit-logger'

// Compliance rule types
export enum ComplianceRuleType {
  DATA_RETENTION = 'data_retention',
  PRIVACY_BUDGET = 'privacy_budget',
  ACCESS_CONTROL = 'access_control',
  CONSENT_MANAGEMENT = 'consent_management',
  DATA_MINIMIZATION = 'data_minimization',
  ENCRYPTION_REQUIREMENT = 'encryption_requirement',
  AUDIT_LOGGING = 'audit_logging',
  LEGAL_REQUEST_TIMELINE = 'legal_request_timeline'
}

// Compliance violation severity
export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Compliance rule interface
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: ComplianceRuleType;
  framework: ComplianceFramework;
  enabled: boolean;
  severity: ViolationSeverity;
  checkInterval: number; // minutes
  parameters: Record<string, unknown>;
  lastChecked?: Date;
  violationThreshold?: number;
  gracePeriod?: number; // minutes
}

// Compliance violation interface
export interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  framework: ComplianceFramework;
  severity: ViolationSeverity;
  description: string;
  affectedUsers?: string[];
  affectedResources?: string[];
  detectedAt: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

// Compliance status overview
export interface ComplianceStatus {
  overall: 'compliant' | 'warning' | 'non_compliant';
  score: number; // 0-100
  frameworks: Record<ComplianceFramework, {
    status: 'compliant' | 'warning' | 'non_compliant';
    score: number;
    violations: number;
  }>;
  activeViolations: number;
  criticalViolations: number;
  lastUpdated: Date;
}

// Privacy budget status
export interface PrivacyBudgetStatus {
  userId: string;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  resetDate: Date;
  dailyUsage: Record<string, number>; // date -> amount
  alerts: Array<{
    type: 'warning' | 'critical';
    threshold: number;
    message: string;
    timestamp: Date;
  }>;
}

// Data retention status
export interface DataRetentionStatus {
  dataType: string;
  totalRecords: number;
  expiredRecords: number;
  retentionPeriod: number; // days
  lastCleanup: Date;
  nextCleanup: Date;
  violations: Array<{
    recordId: string;
    expirationDate: Date;
    daysOverdue: number;
  }>;
}

// Re-export framework type for convenience
export type { ComplianceFramework } from './audit-logger'
