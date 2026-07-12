/**
 * Audit Logging Helpers for OpenRelief
 *
 * Pure utility functions and convenience wrappers extracted from audit-logger.
 */

import { createHash } from 'crypto'
import {
  AuditEventType,
  AuditSeverity,
  ComplianceFramework
} from './audit-logger-types'
import type { AuditLogEntry } from './audit-logger-types'

// Calculate a tamper-evident hash for an audit log entry
export const calculateAuditHash = (
  entry: AuditLogEntry,
  previousHash?: string | null
): string => {
  const hashData = {
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    eventType: entry.eventType,
    severity: entry.severity,
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    privacyImpact: entry.privacyImpact,
    previousHash: previousHash || entry.previousHash
  }

  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort())
  return createHash('sha256').update(dataString).digest('hex')
}

// Generate a unique audit log id
export const generateAuditId = (): string =>
  `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Convert audit logs to CSV format
export const convertLogsToCSV = (logs: AuditLogEntry[]): string => {
  const headers = [
    'id',
    'timestamp',
    'event_type',
    'severity',
    'user_id',
    'action',
    'resource',
    'privacy_impact',
    'data_type',
    'legal_basis',
    'compliance_frameworks',
    'tags'
  ]

  const csvRows = [
    headers.join(','),
    ...logs.map(log =>
      [
        log.id,
        log.timestamp.toISOString(),
        log.eventType,
        log.severity,
        log.userId || '',
        log.action,
        log.resource,
        log.privacyImpact,
        log.dataType || '',
        log.legalBasis || '',
        log.complianceFrameworks?.join(';') || '',
        log.tags?.join(';') || ''
      ]
        .map(field => `"${field}"`)
        .join(',')
    )
  ]

  return csvRows.join('\n')
}
