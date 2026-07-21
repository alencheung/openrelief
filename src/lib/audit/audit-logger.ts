/**
 * Enhanced Audit Logging System with Tamper-Evidence
 *
 * This module provides comprehensive audit logging capabilities including:
 * - Structured logging for different event types
 * - Log integrity protection (hashing, chaining)
 * - Log retention and archival policies
 * - Log analysis and reporting capabilities
 */

import { supabase, supabaseAdmin } from '@/lib/supabase'

// Re-export types and helpers for backward compatibility
export * from './audit-logger-types'
export * from './audit-logger-helpers'
import {
  AuditEventType,
  AuditSeverity,
  ComplianceFramework
} from './audit-logger-types'
import type {
  AuditLogEntry,
  AuditLogQuery,
  AuditStatistics,
  AuditLoggerConfig
} from './audit-logger-types'
import {
  calculateAuditHash,
  generateAuditId,
  convertLogsToCSV
} from './audit-logger-helpers'

class AuditLogger {
  private config: AuditLoggerConfig
  private logBuffer: AuditLogEntry[] = []
  private previousHash: string | null = null
  private flushTimer: NodeJS.Timeout | null = null

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
    }

    // Initialize flush timer
    this.startFlushTimer()

    // Load previous hash for chaining
    this.loadPreviousHash()
  }

  /**
   * Log an audit event
   */
  async logEvent(
    event: Omit<
      AuditLogEntry,
      'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'
    >
  ): Promise<string> {
    try {
      const entry: AuditLogEntry = {
        ...event,
        id: this.generateId(),
        currentHash: '',
        processed: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Calculate hash for integrity (async — uses Web Crypto for Edge-runtime compat)
      entry.currentHash = await this.calculateHash(entry)

      // Add to buffer
      this.logBuffer.push(entry)

      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.batchSize) {
        await this.flush()
      }

      return entry.id
    } catch (error) {
      console.error('Failed to log audit event:', error)
      throw error
    }
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    try {
      let dbQuery = supabaseAdmin.from('enhanced_audit_log').select('*')

      // Apply filters
      if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId)
      }

      if (query.eventType) {
        dbQuery = dbQuery.eq('event_type', query.eventType)
      }

      if (query.severity) {
        dbQuery = dbQuery.eq('severity', query.severity)
      }

      if (query.startDate) {
        dbQuery = dbQuery.gte('timestamp', query.startDate.toISOString())
      }

      if (query.endDate) {
        dbQuery = dbQuery.lte('timestamp', query.endDate.toISOString())
      }

      if (query.resource) {
        dbQuery = dbQuery.eq('resource', query.resource)
      }

      if (query.dataType) {
        dbQuery = dbQuery.eq('data_type', query.dataType)
      }

      if (query.tags && query.tags.length > 0) {
        dbQuery = dbQuery.contains('tags', query.tags)
      }

      // Apply ordering
      const orderBy = query.orderBy || 'timestamp'
      const orderDirection = query.orderDirection || 'desc'
      dbQuery = dbQuery.order(orderBy, { ascending: orderDirection === 'asc' })

      // Apply pagination
      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit)
      }

      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 10) - 1)
      }

      const { data, error } = await dbQuery

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to query audit logs:', error)
      throw error
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
      }

      const logs = await this.queryLogs(query)

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
      }

      // Aggregate statistics
      logs.forEach(log => {
        // Count by event type
        statistics.eventsByType[log.eventType] = (statistics.eventsByType[log.eventType] || 0) + 1

        // Count by severity
        statistics.eventsBySeverity[log.severity] =
          (statistics.eventsBySeverity[log.severity] || 0) + 1

        // Count by user
        if (log.userId) {
          statistics.eventsByUser[log.userId] = (statistics.eventsByUser[log.userId] || 0) + 1
        }

        // Count compliance events
        if (log.complianceFrameworks) {
          log.complianceFrameworks.forEach(framework => {
            statistics.complianceEvents[framework] =
              (statistics.complianceEvents[framework] || 0) + 1
          })
        }

        // Count privacy impacts
        statistics.privacyImpacts[log.privacyImpact]++
      })

      return statistics
    } catch (error) {
      console.error('Failed to get audit statistics:', error)
      throw error
    }
  }

  /**
   * Verify log integrity
   */
  async verifyIntegrity(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    isValid: boolean
    violations: Array<{
      entryId: string
      expectedHash: string
      actualHash: string
      timestamp: Date
    }>
  }> {
    try {
      const query: AuditLogQuery = {
        startDate,
        endDate,
        orderBy: 'timestamp',
        orderDirection: 'asc'
      }

      const logs = await this.queryLogs(query)
      const violations: Array<{
        entryId: string
        expectedHash: string
        actualHash: string
        timestamp: Date
      }> = []

      let previousHash = null

      for (const log of logs) {
        // Verify current hash (async — Web Crypto)
        const calculatedHash = await this.calculateHash(log, previousHash)

        if (calculatedHash !== log.currentHash) {
          violations.push({
            entryId: log.id,
            expectedHash: calculatedHash,
            actualHash: log.currentHash,
            timestamp: log.timestamp
          })
        }

        previousHash = log.currentHash
      }

      return {
        isValid: violations.length === 0,
        violations
      }
    } catch (error) {
      console.error('Failed to verify log integrity:', error)
      throw error
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(query: AuditLogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const logs = await this.queryLogs(query)

      if (format === 'csv') {
        return this.convertToCSV(logs)
      }

      return JSON.stringify(logs, null, 2)
    } catch (error) {
      console.error('Failed to export audit logs:', error)
      throw error
    }
  }

  /**
   * Flush buffered logs to database
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return
    }

    try {
      const logsToFlush = [...this.logBuffer]
      this.logBuffer = []

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
      }))

      // Insert into database
      const { error } = await supabaseAdmin.from('enhanced_audit_log').insert(dbLogs as never)

      if (error) {
        throw error
      }

      // Update previous hash
      if (logsToFlush.length > 0) {
        this.previousHash = logsToFlush[logsToFlush.length - 1]!.currentHash
        await this.savePreviousHash()
      }

      console.log(`Flushed ${logsToFlush.length} audit log entries to database`)
    } catch (error) {
      console.error('Failed to flush audit logs:', error)
      // Re-add failed logs to buffer for retry
      this.logBuffer.unshift(...this.logBuffer)
    }
  }

  /**
   * Calculate hash for log entry (async — Web Crypto API for Edge-runtime compat)
   */
  private async calculateHash(
    entry: AuditLogEntry,
    previousHash?: string | null
  ): Promise<string> {
    return calculateAuditHash(entry, previousHash)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return generateAuditId()
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
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
        .single()

      if (!error && data) {
        this.previousHash = (data as unknown as { previous_hash: string }).previous_hash
      }
    } catch (error) {
      console.error('Failed to load previous hash:', error)
    }
  }

  /**
   * Save previous hash
   */
  private async savePreviousHash(): Promise<void> {
    try {
      await supabaseAdmin.from('audit_metadata').upsert({
        key: 'last_hash',
        previous_hash: this.previousHash,
        updated_at: new Date().toISOString()
      } as never)
    } catch (error) {
      console.error('Failed to save previous hash:', error)
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    return convertLogsToCSV(logs)
  }

  /**
   * Cleanup old logs
   */
  async cleanup(): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod)

      // Archive old logs
      const { error: archiveError } = await supabaseAdmin
        .from('enhanced_audit_log')
        .update({ archived: true } as never)
        .lt('timestamp', cutoffDate.toISOString())
        .eq('archived', false)

      if (archiveError) {
        throw archiveError
      }

      // Delete very old logs (older than archival threshold)
      const deleteCutoffDate = new Date()
      deleteCutoffDate.setDate(deleteCutoffDate.getDate() - this.config.archivalThreshold)

      const { error: deleteError } = await supabaseAdmin
        .from('enhanced_audit_log')
        .delete()
        .lt('timestamp', deleteCutoffDate.toISOString())
        .eq('archived', true)

      if (deleteError) {
        throw deleteError
      }

      console.log('Audit log cleanup completed')
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error)
      throw error
    }
  }

  /**
   * Destroy audit logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Flush remaining logs
    this.flush()
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger()

// Convenience functions moved to a separate module; re-exported for compatibility
export {
  logDataAccess,
  logPrivacySettingsChange,
  logSecurityIncident,
  logLegalRequest
} from './audit-logger-functions'

export default auditLogger
