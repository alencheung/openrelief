/**
 * Enhanced Audit Logging System with Tamper-Evidence
 * 
 * This module provides comprehensive audit logging capabilities including:
 * - Structured logging for different event types
 * - Log integrity protection (hashing, chaining)
 * - Log retention and archival policies
 * - Log analysis and reporting capabilities
 */

import { createHash, createHmac } from 'crypto';
import { supabase, supabaseAdmin } from '@/lib/supabase';

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
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Event details
  action: string;
  resource: string;
  resourceId?: string;
  
  // Data context
  dataType?: string;
  dataTypes?: string[];
  dataSubjects?: number;
  dataVolume?: number;
  
  // Privacy and compliance
  privacyImpact: 'low' | 'medium' | 'high';
  legalBasis?: string;
  complianceFrameworks?: ComplianceFramework[];
  retentionPeriod?: number;
  
  // Security and integrity
  previousHash?: string;
  currentHash: string;
  signature?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Processing information
  processed: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Audit log query options
export interface AuditLogQuery {
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  resource?: string;
  dataType?: string;
  complianceFramework?: ComplianceFramework;
  tags?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'severity' | 'eventType';
  orderDirection?: 'asc' | 'desc';
}

// Audit statistics
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByUser: Record<string, number>;
  complianceEvents: Record<ComplianceFramework, number>;
  privacyImpacts: Record<'low' | 'medium' | 'high', number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// Audit logger configuration
export interface AuditLoggerConfig {
  enableHashChaining: boolean;
  enableDigitalSignatures: boolean;
  retentionPeriod: number; // days
  archivalThreshold: number; // days
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
}

class AuditLogger {
  private config: AuditLoggerConfig;
  private logBuffer: AuditLogEntry[] = [];
  private previousHash: string | null = null;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = {
      enableHashChaining: true,
      enableDigitalSignatures: false,
      retentionPeriod: 2555, // 7 years for GDPR compliance
      archivalThreshold: 365, // 1 year
      compressionEnabled: true,
      encryptionEnabled: true,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    };

    // Initialize flush timer
    this.startFlushTimer();
    
    // Load previous hash for chaining
    this.loadPreviousHash();
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const entry: AuditLogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        processed: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...event
      };

      // Calculate hash for integrity
      entry.currentHash = this.calculateHash(entry);

      // Add to buffer
      this.logBuffer.push(entry);

      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.batchSize) {
        await this.flush();
      }

      return entry.id;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      let dbQuery = supabaseAdmin
        .from('enhanced_audit_log')
        .select('*');

      // Apply filters
      if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId);
      }

      if (query.eventType) {
        dbQuery = dbQuery.eq('event_type', query.eventType);
      }

      if (query.severity) {
        dbQuery = dbQuery.eq('severity', query.severity);
      }

      if (query.startDate) {
        dbQuery = dbQuery.gte('timestamp', query.startDate.toISOString());
      }

      if (query.endDate) {
        dbQuery = dbQuery.lte('timestamp', query.endDate.toISOString());
      }

      if (query.resource) {
        dbQuery = dbQuery.eq('resource', query.resource);
      }

      if (query.dataType) {
        dbQuery = dbQuery.eq('data_type', query.dataType);
      }

      if (query.tags && query.tags.length > 0) {
        dbQuery = dbQuery.contains('tags', query.tags);
      }

      // Apply ordering
      const orderBy = query.orderBy || 'timestamp';
      const orderDirection = query.orderDirection || 'desc';
      dbQuery = dbQuery.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }

      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 10) - 1);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<AuditStatistics> {
    try {
      const query: AuditLogQuery = {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: endDate || new Date()
      };

      const logs = await this.queryLogs(query);

      const statistics: AuditStatistics = {
        totalEvents: logs.length,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        eventsByUser: {} as Record<string, number>,
        complianceEvents: {} as Record<ComplianceFramework, number>,
        privacyImpacts: { low: 0, medium: 0, high: 0 },
        timeRange: {
          start: query.startDate!,
          end: query.endDate!
        }
      };

      // Aggregate statistics
      logs.forEach(log => {
        // Count by event type
        statistics.eventsByType[log.eventType] = (statistics.eventsByType[log.eventType] || 0) + 1;

        // Count by severity
        statistics.eventsBySeverity[log.severity] = (statistics.eventsBySeverity[log.severity] || 0) + 1;

        // Count by user
        if (log.userId) {
          statistics.eventsByUser[log.userId] = (statistics.eventsByUser[log.userId] || 0) + 1;
        }

        // Count compliance events
        if (log.complianceFrameworks) {
          log.complianceFrameworks.forEach(framework => {
            statistics.complianceEvents[framework] = (statistics.complianceEvents[framework] || 0) + 1;
          });
        }

        // Count privacy impacts
        statistics.privacyImpacts[log.privacyImpact]++;
      });

      return statistics;
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Verify log integrity
   */
  async verifyIntegrity(startDate?: Date, endDate?: Date): Promise<{
    isValid: boolean;
    violations: Array<{
      entryId: string;
      expectedHash: string;
      actualHash: string;
      timestamp: Date;
    }>;
  }> {
    try {
      const query: AuditLogQuery = {
        startDate,
        endDate,
        orderBy: 'timestamp',
        orderDirection: 'asc'
      };

      const logs = await this.queryLogs(query);
      const violations: Array<{
        entryId: string;
        expectedHash: string;
        actualHash: string;
        timestamp: Date;
      }> = [];

      let previousHash = null;

      for (const log of logs) {
        // Verify current hash
        const calculatedHash = this.calculateHash(log, previousHash);
        
        if (calculatedHash !== log.currentHash) {
          violations.push({
            entryId: log.id,
            expectedHash: calculatedHash,
            actualHash: log.currentHash,
            timestamp: log.timestamp
          });
        }

        previousHash = log.currentHash;
      }

      return {
        isValid: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error('Failed to verify log integrity:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(query: AuditLogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const logs = await this.queryLogs(query);

      if (format === 'csv') {
        return this.convertToCSV(logs);
      }

      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Flush buffered logs to database
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // Prepare logs for database
      const dbLogs = logsToFlush.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        event_type: log.eventType,
        severity: log.severity,
        user_id: log.userId,
        session_id: log.sessionId,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        action: log.action,
        resource: log.resource,
        resource_id: log.resourceId,
        data_type: log.dataType,
        data_types: log.dataTypes,
        data_subjects: log.dataSubjects,
        data_volume: log.dataVolume,
        privacy_impact: log.privacyImpact,
        legal_basis: log.legalBasis,
        compliance_frameworks: log.complianceFrameworks,
        retention_period: log.retentionPeriod,
        previous_hash: log.previousHash,
        current_hash: log.currentHash,
        signature: log.signature,
        metadata: log.metadata,
        tags: log.tags,
        processed: log.processed,
        archived: log.archived,
        created_at: log.createdAt.toISOString(),
        updated_at: log.updatedAt.toISOString()
      }));

      // Insert into database
      const { error } = await supabaseAdmin
        .from('enhanced_audit_log')
        .insert(dbLogs);

      if (error) throw error;

      // Update previous hash
      if (logsToFlush.length > 0) {
        this.previousHash = logsToFlush[logsToFlush.length - 1].currentHash;
        await this.savePreviousHash();
      }

      console.log(`Flushed ${logsToFlush.length} audit log entries to database`);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add failed logs to buffer for retry
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  /**
   * Calculate hash for log entry
   */
  private calculateHash(entry: AuditLogEntry, previousHash?: string | null): string {
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
    };

    const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Load previous hash
   */
  private async loadPreviousHash(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_metadata')
        .select('previous_hash')
        .eq('key', 'last_hash')
        .single();

      if (!error && data) {
        this.previousHash = data.previous_hash;
      }
    } catch (error) {
      console.error('Failed to load previous hash:', error);
    }
  }

  /**
   * Save previous hash
   */
  private async savePreviousHash(): Promise<void> {
    try {
      await supabaseAdmin
        .from('audit_metadata')
        .upsert({
          key: 'last_hash',
          previous_hash: this.previousHash,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to save previous hash:', error);
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'id', 'timestamp', 'event_type', 'severity', 'user_id',
      'action', 'resource', 'privacy_impact', 'data_type',
      'legal_basis', 'compliance_frameworks', 'tags'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
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
      ].map(field => `"${field}"`).join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Cleanup old logs
   */
  async cleanup(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);

      // Archive old logs
      const { error: archiveError } = await supabaseAdmin
        .from('enhanced_audit_log')
        .update({ archived: true })
        .lt('timestamp', cutoffDate.toISOString())
        .eq('archived', false);

      if (archiveError) throw archiveError;

      // Delete very old logs (older than archival threshold)
      const deleteCutoffDate = new Date();
      deleteCutoffDate.setDate(deleteCutoffDate.getDate() - this.config.archivalThreshold);

      const { error: deleteError } = await supabaseAdmin
        .from('enhanced_audit_log')
        .delete()
        .lt('timestamp', deleteCutoffDate.toISOString())
        .eq('archived', true);

      if (deleteError) throw deleteError;

      console.log('Audit log cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  /**
   * Destroy audit logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining logs
    this.flush();
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

// Convenience functions for common audit events
export const logDataAccess = async (
  userId: string,
  resource: string,
  dataType: string,
  privacyImpact: 'low' | 'medium' | 'high' = 'medium',
  metadata?: Record<string, any>
) => {
  return auditLogger.logEvent({
    eventType: AuditEventType.DATA_ACCESS,
    severity: AuditSeverity.LOW,
    userId,
    action: 'access',
    resource,
    dataType,
    privacyImpact,
    legalBasis: 'user_consent',
    complianceFrameworks: [ComplianceFramework.GDPR],
    metadata
  });
};

export const logPrivacySettingsChange = async (
  userId: string,
  changes: Record<string, any>,
  privacyImpact: 'low' | 'medium' | 'high' = 'medium'
) => {
  return auditLogger.logEvent({
    eventType: AuditEventType.PRIVACY_SETTINGS_CHANGE,
    severity: AuditSeverity.MEDIUM,
    userId,
    action: 'update',
    resource: 'privacy_settings',
    privacyImpact,
    legalBasis: 'user_consent',
    complianceFrameworks: [ComplianceFramework.GDPR],
    metadata: { changes }
  });
};

export const logSecurityIncident = async (
  incidentType: string,
  severity: AuditSeverity,
  description: string,
  affectedUsers?: string[],
  metadata?: Record<string, any>
) => {
  return auditLogger.logEvent({
    eventType: AuditEventType.SECURITY_INCIDENT,
    severity,
    action: 'incident_detected',
    resource: 'system',
    privacyImpact: 'high',
    dataSubjects: affectedUsers?.length || 0,
    legalBasis: 'legal_obligation',
    complianceFrameworks: [ComplianceFramework.GDPR, ComplianceFramework.CCPA],
    metadata: { incidentType, description, affectedUsers, ...metadata }
  });
};

export const logLegalRequest = async (
  requestType: string,
  userId?: string,
  severity: AuditSeverity = AuditSeverity.HIGH,
  metadata?: Record<string, any>
) => {
  return auditLogger.logEvent({
    eventType: AuditEventType.LEGAL_REQUEST_RECEIVED,
    severity,
    userId,
    action: 'legal_request',
    resource: 'legal_system',
    privacyImpact: 'high',
    legalBasis: 'legal_obligation',
    complianceFrameworks: [ComplianceFramework.GDPR],
    metadata: { requestType, ...metadata }
  });
};

export default auditLogger;