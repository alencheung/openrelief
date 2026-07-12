/**
 * Audit Logging Convenience Functions for OpenRelief
 *
 * Wrapper functions for common audit events. Extracted from audit-logger to
 * keep the main module under 500 lines. Imports the singleton from the main
 * module (one-directional dependency, no cycle).
 */

import { auditLogger } from './audit-logger'
import {
  AuditEventType,
  AuditSeverity,
  ComplianceFramework
} from './audit-logger-types'

// Log a data access event
export const logDataAccess = async (
  userId: string,
  resource: string,
  dataType: string,
  privacyImpact: 'low' | 'medium' | 'high' = 'medium',
  metadata?: Record<string, unknown>
) => {
  return auditLogger.logEvent({
    timestamp: new Date(),
    eventType: AuditEventType.DATA_ACCESS,
    severity: AuditSeverity.LOW,
    userId,
    action: 'access',
    resource,
    dataType,
    privacyImpact,
    legalBasis: 'user_consent',
    complianceFrameworks: [ComplianceFramework.GDPR] as ComplianceFramework[],
    metadata
  })
}

// Log a privacy settings change event
export const logPrivacySettingsChange = async (
  userId: string,
  changes: Record<string, unknown>,
  privacyImpact: 'low' | 'medium' | 'high' = 'medium'
) => {
  return auditLogger.logEvent({
    timestamp: new Date(),
    eventType: AuditEventType.PRIVACY_SETTINGS_CHANGE,
    severity: AuditSeverity.MEDIUM,
    userId,
    action: 'update',
    resource: 'privacy_settings',
    privacyImpact,
    legalBasis: 'user_consent',
    complianceFrameworks: [ComplianceFramework.GDPR] as ComplianceFramework[],
    metadata: { changes }
  })
}

// Log a security incident event
export const logSecurityIncident = async (
  incidentType: string,
  severity: AuditSeverity,
  description: string,
  affectedUsers?: string[],
  metadata?: Record<string, unknown>
) => {
  return auditLogger.logEvent({
    timestamp: new Date(),
    eventType: AuditEventType.SECURITY_INCIDENT,
    severity,
    action: 'incident_detected',
    resource: 'system',
    privacyImpact: 'high',
    dataSubjects: affectedUsers?.length || 0,
    legalBasis: 'legal_obligation',
    complianceFrameworks: [
      ComplianceFramework.GDPR,
      ComplianceFramework.CCPA
    ] as ComplianceFramework[],
    metadata: { incidentType, description, affectedUsers, ...metadata }
  })
}

// Log a legal request event
export const logLegalRequest = async (
  requestType: string,
  userId?: string,
  severity: AuditSeverity = AuditSeverity.HIGH,
  metadata?: Record<string, unknown>
) => {
  return auditLogger.logEvent({
    timestamp: new Date(),
    eventType: AuditEventType.LEGAL_REQUEST_RECEIVED,
    severity,
    userId,
    action: 'legal_request',
    resource: 'legal_system',
    privacyImpact: 'high',
    legalBasis: 'legal_obligation',
    complianceFrameworks: [ComplianceFramework.GDPR] as ComplianceFramework[],
    metadata: { requestType, ...metadata }
  })
}
