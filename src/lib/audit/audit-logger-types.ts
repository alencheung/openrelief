/**
 * Audit Logging Types for OpenRelief
 *
 * Enums and interfaces extracted from audit-logger.
 */

// Audit event types
export enum AuditEventType {
  // Data access events
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  DATA_MODIFICATION = 'data_modification',

  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',

  // Privacy events
  PRIVACY_SETTINGS_CHANGE = 'privacy_settings_change',
  PRIVACY_BUDGET_CONSUMED = 'privacy_budget_consumed',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_REVOKED = 'consent_revoked',

  // Legal and compliance events
  LEGAL_REQUEST_RECEIVED = 'legal_request_received',
  LEGAL_REQUEST_PROCESSED = 'legal_request_processed',
  DATA_RETENTION_POLICY_APPLIED = 'data_retention_policy_applied',
  COMPLIANCE_CHECK = 'compliance_check',

  // Security events
  SECURITY_INCIDENT = 'security_incident',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // System events
  SYSTEM_ERROR = 'system_error',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_COMPLETED = 'backup_completed',

  // Emergency response events
  EMERGENCY_REPORT_CREATED = 'emergency_report_created',
  EMERGENCY_REPORT_CONFIRMED = 'emergency_report_confirmed',
  EMERGENCY_REPORT_DISPUTED = 'emergency_report_disputed',
  EMERGENCY_DATA_SHARED = 'emergency_data_shared'
}

// Audit event severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Compliance frameworks
export enum ComplianceFramework {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  HIPAA = 'hipaa',
  SOX = 'sox'
}

// Enhanced audit log entry interface
export interface AuditLogEntry {
  id: string
  timestamp: Date
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string

  // Event details
  action: string
  resource: string
  resourceId?: string

  // Data context
  dataType?: string
  dataTypes?: string[]
  dataSubjects?: number
  dataVolume?: number

  // Privacy and compliance
  privacyImpact: 'low' | 'medium' | 'high'
  legalBasis?: string
  complianceFrameworks?: ComplianceFramework[]
  retentionPeriod?: number

  // Security and integrity
  previousHash?: string
  currentHash: string
  signature?: string

  // Metadata
  metadata?: Record<string, unknown>
  tags?: string[]

  // Processing information
  processed: boolean
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

// Audit log query options
export interface AuditLogQuery {
  userId?: string
  eventType?: AuditEventType
  severity?: AuditSeverity
  startDate?: Date
  endDate?: Date
  resource?: string
  dataType?: string
  complianceFramework?: ComplianceFramework
  tags?: string[]
  limit?: number
  offset?: number
  orderBy?: 'timestamp' | 'severity' | 'eventType'
  orderDirection?: 'asc' | 'desc'
}

// Audit statistics
export interface AuditStatistics {
  totalEvents: number
  eventsByType: Record<AuditEventType, number>
  eventsBySeverity: Record<AuditSeverity, number>
  eventsByUser: Record<string, number>
  complianceEvents: Record<ComplianceFramework, number>
  privacyImpacts: Record<'low' | 'medium' | 'high', number>
  timeRange: {
    start: Date
    end: Date
  }
}

// Audit logger configuration
export interface AuditLoggerConfig {
  enableHashChaining: boolean
  enableDigitalSignatures: boolean
  retentionPeriod: number // days
  archivalThreshold: number // days
  compressionEnabled: boolean
  encryptionEnabled: boolean
  batchSize: number
  flushInterval: number // milliseconds
}
