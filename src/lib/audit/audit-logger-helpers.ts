/**
 * Audit Logging Helpers for OpenRelief
 *
 * Pure utility functions and convenience wrappers extracted from audit-logger.
 *
 * NOTE on hashing: we use the Web Crypto API (globalThis.crypto.subtle)
 * rather than Node's `crypto.createHash`. The audit logger is invoked from
 * Next.js middleware, which runs on the Edge runtime in production
 * (Netlify/Vercel). The Edge runtime does NOT expose Node's `crypto`
 * module, so the previous `createHash('sha256')` call crashed every
 * audited request with:
 *   "The edge runtime does not support Node.js 'crypto' module"
 * Web Crypto is available in both Edge and Node.js >= 19 (and via
 * globalThis.crypto in Node 18+ with the --experimental-global-webcrypto
 * flag, which Next.js sets automatically for its runtimes).
 *
 * Because Web Crypto's digest() is async, calculateAuditHash is async.
 */

import {
  AuditEventType,
  AuditSeverity,
  ComplianceFramework
} from './audit-logger-types'
import type { AuditLogEntry } from './audit-logger-types'

// Convert a Uint8Array to a hex string (Web Crypto returns bytes, not hex)
function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined) continue
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}

// Calculate a tamper-evident hash for an audit log entry.
// Async because Web Crypto's digest() returns a Promise.
export const calculateAuditHash = async (
  entry: AuditLogEntry,
  previousHash?: string | null
): Promise<string> => {
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
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(dataString)
  const digestBuffer = await crypto.subtle.digest('SHA-256', dataBytes)
  return bytesToHex(new Uint8Array(digestBuffer))
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
