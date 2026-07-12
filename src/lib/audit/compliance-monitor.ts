/**
 * Real-time Compliance Monitoring System
 *
 * This module provides automated compliance rule checking, real-time violation detection,
 * privacy budget monitoring, and compliance reporting capabilities.
 */

import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger'
import { supabaseAdmin } from '@/lib/supabase'

// Re-export extracted types and helpers for backward compatibility
export * from './compliance-types'
export * from './compliance-helpers'
import {
  buildDefaultComplianceStatus,
  aggregateComplianceStatus,
  runRuleCheck,
  shouldCheckRule,
  mapRuleData,
  getDefaultComplianceRules,
  saveRuleToDatabase,
  saveViolationToDatabase,
  saveComplianceStatusToDatabase
} from './compliance-helpers'
import type {
  ComplianceRule,
  ComplianceViolation,
  ComplianceStatus
} from './compliance-types'
import { ViolationSeverity } from './compliance-types'

class ComplianceMonitor {
  private rules: Map<string, ComplianceRule> = new Map()
  private violations: Map<string, ComplianceViolation> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.initializeDefaultRules()
    this.startMonitoring()
  }

  /**
   * Initialize default compliance rules
   */
  private async initializeDefaultRules(): Promise<void> {
    for (const rule of getDefaultComplianceRules()) {
      this.rules.set(rule.id, rule)
    }

    // Load custom rules from database
    await this.loadCustomRules()
  }

  /**
   * Start compliance monitoring
   */
  startMonitoring(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.monitoringInterval = setInterval(async () => {
      await this.runComplianceChecks()
    }, 5 * 60 * 1000) // Run every 5 minutes

    console.log('Compliance monitoring started')
  }

  /**
   * Stop compliance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.isRunning = false
    console.log('Compliance monitoring stopped')
  }

  /**
   * Run all compliance checks
   */
  private async runComplianceChecks(): Promise<void> {
    try {
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled)

      for (const rule of enabledRules) {
        if (shouldCheckRule(rule)) {
          await this.checkRule(rule)
        }
      }

      // Update overall compliance status
      await this.updateComplianceStatus()
    } catch (error) {
      console.error('Error running compliance checks:', error)
      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.MEDIUM,
        action: 'compliance_check_error',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { error: (error as Error).message }
      })
    }
  }

  /**
   * Check a specific compliance rule
   */
  private async checkRule(rule: ComplianceRule): Promise<void> {
    try {
      const violations = await runRuleCheck(rule)

      // Process violations
      for (const violation of violations) {
        await this.processViolation(violation, rule)
      }

      // Update rule last checked time
      rule.lastChecked = new Date()
      await saveRuleToDatabase(rule)
    } catch (error) {
      console.error(`Error checking rule ${rule.id}:`, error)
    }
  }

  /**
   * Process a compliance violation
   */
  private async processViolation(violation: ComplianceViolation, rule: ComplianceRule): Promise<void> {
    // Check if this is a new violation or an existing one
    const existingViolation = this.violations.get(violation.id)

    if (!existingViolation) {
      // New violation - log it and notify
      this.violations.set(violation.id, violation)

      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: this.mapViolationSeverityToAuditSeverity(violation.severity),
        action: 'violation_detected',
        resource: 'compliance_monitor',
        privacyImpact: 'medium',
        metadata: {
          violationId: violation.id,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: violation.framework,
          severity: violation.severity,
          description: violation.description
        }
      })

      // Save to database
      await saveViolationToDatabase(violation)

      // Send notifications for critical violations
      if (violation.severity === ViolationSeverity.CRITICAL) {
        await this.sendCriticalViolationAlert(violation)
      }
    }
  }

  /**
   * Map violation severity to audit severity
   */
  private mapViolationSeverityToAuditSeverity(severity: ViolationSeverity): AuditSeverity {
    switch (severity) {
      case ViolationSeverity.LOW:
        return AuditSeverity.LOW
      case ViolationSeverity.MEDIUM:
        return AuditSeverity.MEDIUM
      case ViolationSeverity.HIGH:
        return AuditSeverity.HIGH
      case ViolationSeverity.CRITICAL:
        return AuditSeverity.CRITICAL
      default:
        return AuditSeverity.MEDIUM
    }
  }

  /**
   * Send alert for critical violations
   */
  private async sendCriticalViolationAlert(violation: ComplianceViolation): Promise<void> {
    // In a real implementation, this would send notifications to compliance team
    console.error('CRITICAL COMPLIANCE VIOLATION:', violation)

    // Log the alert
    await auditLogger.logEvent({
      timestamp: new Date(),
      eventType: AuditEventType.SECURITY_INCIDENT,
      severity: AuditSeverity.CRITICAL,
      action: 'critical_violation_alert',
      resource: 'compliance_monitor',
      privacyImpact: 'high',
      metadata: {
        violationId: violation.id,
        description: violation.description,
        affectedUsers: violation.affectedUsers,
        affectedResources: violation.affectedResources
      }
    })
  }

  /**
   * Update overall compliance status
   */
  private async updateComplianceStatus(): Promise<void> {
    const status = aggregateComplianceStatus(
      Array.from(this.violations.values()),
      buildDefaultComplianceStatus()
    )

    // Save status to database
    await saveComplianceStatusToDatabase(status)
  }

  /**
   * Get compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // Return default status if none found
        return buildDefaultComplianceStatus()
      }

      return data as ComplianceStatus
    } catch (error) {
      console.error('Error getting compliance status:', error)
      throw error
    }
  }

  /**
   * Get active violations
   */
  async getActiveViolations(): Promise<ComplianceViolation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_violations')
        .select('*')
        .eq('status', 'active')
        .order('detected_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error getting active violations:', error)
      throw error
    }
  }

  /**
   * Acknowledge a violation
   */
  async acknowledgeViolation(violationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_violations')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', violationId)

      if (error) {
        throw error
      }

      // Update local cache
      const violation = this.violations.get(violationId)
      if (violation) {
        violation.status = 'acknowledged'
        violation.acknowledgedBy = userId
        violation.acknowledgedAt = new Date()
      }

      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'violation_acknowledged',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { violationId }
      })
    } catch (error) {
      console.error('Error acknowledging violation:', error)
      throw error
    }
  }

  /**
   * Resolve a violation
   */
  async resolveViolation(violationId: string, userId: string, resolution: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_violations')
        .update({
          status: 'resolved',
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolution
        })
        .eq('id', violationId)

      if (error) {
        throw error
      }

      // Update local cache
      const violation = this.violations.get(violationId)
      if (violation) {
        violation.status = 'resolved'
        violation.resolvedBy = userId
        violation.resolvedAt = new Date()
        violation.resolution = resolution
      }

      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'violation_resolved',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { violationId, resolution }
      })
    } catch (error) {
      console.error('Error resolving violation:', error)
      throw error
    }
  }

  /**
   * Load custom rules from database
   */
  private async loadCustomRules(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_rules')
        .select('*')

      if (error) {
        throw error
      }

      for (const ruleData of data || []) {
        const rule = mapRuleData(ruleData)
        this.rules.set(rule.id, rule)
      }
    } catch (error) {
      console.error('Error loading custom rules:', error)
    }
  }
}

// Global compliance monitor instance
export const complianceMonitor = new ComplianceMonitor()

export default complianceMonitor
