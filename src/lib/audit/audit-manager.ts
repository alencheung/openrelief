/**
 * Audit Trail Management System
 *
 * This module provides centralized audit log collection, log aggregation from multiple sources,
 * secure log storage with tamper-evidence, log search and analysis tools, and audit report generation.
 */

import { auditLogger, AuditLogEntry, AuditEventType, AuditSeverity } from './audit-logger'
import { supabaseAdmin } from '@/lib/supabase'

// Re-export extracted types and helpers for backward compatibility
export * from './audit-types'
export * from './audit-helpers'
import {
  generateReportConfigId,
  generateReportId,
  calculateRiskScore,
  categorizeByFramework,
  calculateComplianceScore,
  isScheduleDue,
  getDefaultRetentionPolicies,
  getDefaultAggregationRules,
  buildSearchQuery,
  buildSummaryQuery,
  aggregateSummaryData,
  applyRetentionForPolicy
} from './audit-helpers'
import type {
  RetentionPolicy,
  AggregationRule,
  AuditTrailQuery,
  AuditTrailSummary,
  AuditReportConfig,
  AuditReport
} from './audit-types'
import { LogSource, AggregationStrategy } from './audit-types'

class AuditTrailManager {
  private retentionPolicies: Map<string, RetentionPolicy> = new Map()
  private aggregationRules: Map<string, AggregationRule> = new Map()
  private reportConfigs: Map<string, AuditReportConfig> = new Map()
  private isAggregating = false

  constructor() {
    this.initializeDefaultPolicies()
    this.initializeDefaultAggregationRules()
    this.startAggregation()
  }

  /**
   * Collect audit logs from multiple sources
   */
  async collectLogs(
    source: LogSource,
    entries: Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>[]
  ): Promise<string[]> {
    try {
      const entryIds: string[] = []

      for (const entry of entries) {
        // Add source information
        const enhancedEntry = {
          ...entry,
          metadata: {
            ...entry.metadata,
            source,
            collectedAt: new Date().toISOString()
          }
        }

        // Apply aggregation rules
        const processedEntry = await this.applyAggregationRules(source, enhancedEntry)

        // Log the entry
        const entryId = await auditLogger.logEvent(processedEntry)
        entryIds.push(entryId)
      }

      // Log collection activity
      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.LOW,
        action: 'audit_logs_collected',
        resource: 'audit_manager',
        privacyImpact: 'low',
        metadata: {
          source,
          entryCount: entries.length,
          entryIds
        }
      })

      return entryIds
    } catch (error) {
      console.error('Error collecting audit logs:', error)
      throw error
    }
  }

  /**
   * Search audit trail
   */
  async searchTrail(query: AuditTrailQuery): Promise<{
    entries: AuditLogEntry[];
    total: number;
    summary: AuditTrailSummary;
  }> {
    try {
      const dbQuery = buildSearchQuery(query)
      const { data: entries, error, count } = await dbQuery

      if (error) {
        throw error
      }

      // Generate summary
      const summary = await this.generateSummary(query)

      return {
        entries: entries || [],
        total: count || 0,
        summary
      }
    } catch (error) {
      console.error('Error searching audit trail:', error)
      throw error
    }
  }

  /**
   * Generate audit trail summary
   */
  async generateSummary(query?: Partial<AuditTrailQuery>): Promise<AuditTrailSummary> {
    try {
      const summaryQuery = buildSummaryQuery(query)
      const { data: entries, error } = await summaryQuery

      if (error) {
        throw error
      }

      return aggregateSummaryData(entries, query)
    } catch (error) {
      console.error('Error generating summary:', error)
      throw error
    }
  }

  /**
   * Create audit report
   */
  async createReport(
    config: Omit<AuditReportConfig, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const reportConfig: AuditReportConfig = {
        id: generateReportConfigId(),
        ...config,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Save report configuration
      await this.saveReportConfig(reportConfig)
      this.reportConfigs.set(reportConfig.id, reportConfig)

      // Generate initial report if needed
      if (config.schedule) {
        // Schedule report generation
        await this.scheduleReport(reportConfig)
      } else {
        // Generate report immediately
        await this.generateReport(reportConfig.id, userId)
      }

      return reportConfig.id
    } catch (error) {
      console.error('Error creating audit report:', error)
      throw error
    }
  }

  /**
   * Generate audit report
   */
  async generateReport(configId: string, userId: string): Promise<string> {
    try {
      const config = this.reportConfigs.get(configId)
      if (!config) {
        throw new Error(`Report configuration ${configId} not found`)
      }

      // Get audit data
      const { entries } = await this.searchTrail(config.query)

      // Generate summary
      const summary = await this.generateSummary(config.query)

      // Create report record
      const report: AuditReport = {
        id: generateReportId(),
        configId,
        name: config.name,
        format: config.format,
        generatedAt: new Date(),
        generatedBy: userId,
        period: {
          start: config.query.startDate || new Date(0),
          end: config.query.endDate || new Date()
        },
        summary,
        data: entries,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }

      // Generate report file
      const filePath = await this.generateReportFile(report, config)
      report.filePath = filePath

      // Save report
      await this.saveReport(report)

      // Send notifications to recipients
      if (config.recipients && config.recipients.length > 0) {
        await this.sendReportNotifications(report, config.recipients)
      }

      // Log report generation
      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.LOW,
        userId,
        action: 'audit_report_generated',
        resource: 'audit_manager',
        privacyImpact: 'low',
        metadata: {
          reportId: report.id,
          configId,
          format: config.format,
          entryCount: entries.length,
          recipients: config.recipients
        }
      })

      return report.id
    } catch (error) {
      console.error('Error generating audit report:', error)
      throw error
    }
  }

  /**
   * Apply retention policies
   */
  async applyRetentionPolicies(): Promise<void> {
    try {
      for (const policy of Array.from(this.retentionPolicies.values())) {
        if (!policy.active) {
          continue
        }
        await applyRetentionForPolicy(policy)
      }
    } catch (error) {
      console.error('Error applying retention policies:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private initializeDefaultPolicies(): void {
    for (const policy of getDefaultRetentionPolicies()) {
      this.retentionPolicies.set(policy.id, policy)
    }
  }

  private initializeDefaultAggregationRules(): void {
    for (const rule of getDefaultAggregationRules()) {
      this.aggregationRules.set(rule.id, rule)
    }
  }

  private startAggregation(): void {
    if (this.isAggregating) {
      return
    }

    this.isAggregating = true

    // Start real-time aggregation
    setInterval(async () => {
      await this.processRealTimeAggregation()
    }, 60000) // Every minute

    // Start batch aggregation
    setInterval(async () => {
      await this.processBatchAggregation()
    }, 15 * 60 * 1000) // Every 15 minutes

    // Start scheduled aggregation
    setInterval(async () => {
      await this.processScheduledAggregation()
    }, 60 * 60 * 1000) // Every hour

    // Start retention policy application
    setInterval(async () => {
      await this.applyRetentionPolicies()
    }, 24 * 60 * 60 * 1000) // Daily

    console.log('Audit trail aggregation started')
  }

  private async applyAggregationRules(
    source: LogSource,
    entry: Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>
  ): Promise<Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>> {
    const applicableRules = Array.from(this.aggregationRules.values())
      .filter(rule =>
        rule.enabled
        && rule.source === source
        && (!rule.eventType || rule.eventType === entry.eventType)
      )
      .sort((a, b) => a.priority - b.priority)

    let processedEntry = { ...entry }

    for (const rule of applicableRules) {
      // Apply transformations
      for (const transformation of rule.transformations) {
        processedEntry = await this.applyTransformation(transformation, processedEntry)
      }
    }

    return processedEntry
  }

  private async applyTransformation(
    transformation: string,
    entry: Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>
  ): Promise<Omit<AuditLogEntry, 'id' | 'currentHash' | 'processed' | 'archived' | 'createdAt' | 'updatedAt'>> {
    switch (transformation) {
      case 'enrich_with_threat_intel':
        // In a real implementation, this would enrich with threat intelligence
        entry.metadata = {
          ...entry.metadata,
          threatLevel: 'medium',
          knownIndicators: false
        }
        break

      case 'calculate_risk_score':
        // Calculate risk score based on various factors
        const riskScore = calculateRiskScore(entry)
        entry.metadata = {
          ...entry.metadata,
          riskScore
        }
        break

      case 'categorize_by_framework':
        // Categorize by compliance framework
        const frameworks = categorizeByFramework(entry)
        entry.complianceFrameworks = frameworks
        break

      case 'calculate_compliance_score':
        // Calculate compliance score
        const complianceScore = calculateComplianceScore(entry)
        entry.metadata = {
          ...entry.metadata,
          complianceScore
        }
        break

      default:
        console.warn(`Unknown transformation: ${transformation}`)
    }

    return entry
  }

  private async processRealTimeAggregation(): Promise<void> {
    // Process real-time aggregation rules
    const realTimeRules = Array.from(this.aggregationRules.values())
      .filter(rule => rule.enabled && rule.strategy === AggregationStrategy.REAL_TIME)

    for (const rule of realTimeRules) {
      // In a real implementation, this would process real-time data streams
      console.log(`Processing real-time aggregation rule: ${rule.name}`)
    }
  }

  private async processBatchAggregation(): Promise<void> {
    // Process batch aggregation rules
    const batchRules = Array.from(this.aggregationRules.values())
      .filter(rule => rule.enabled && rule.strategy === AggregationStrategy.BATCH)

    for (const rule of batchRules) {
      // In a real implementation, this would process batch data
      console.log(`Processing batch aggregation rule: ${rule.name}`)
    }
  }

  private async processScheduledAggregation(): Promise<void> {
    // Process scheduled aggregation rules
    const scheduledRules = Array.from(this.aggregationRules.values())
      .filter(rule => rule.enabled && rule.strategy === AggregationStrategy.SCHEDULED)

    for (const rule of scheduledRules) {
      if (rule.schedule && isScheduleDue(rule.schedule)) {
        console.log(`Processing scheduled aggregation rule: ${rule.name}`)
        // In a real implementation, this would process scheduled data
      }
    }
  }

  private async generateReportFile(report: AuditReport, config: AuditReportConfig): Promise<string> {
    // In a real implementation, this would generate actual files
    const filePath = `/reports/audit/${report.id}.${config.format}`

    console.log(`Generating audit report file: ${filePath}`)

    return filePath
  }

  private async sendReportNotifications(report: AuditReport, recipients: string[]): Promise<void> {
    // In a real implementation, this would send actual notifications
    console.log(`Sending audit report ${report.id} to recipients:`, recipients)
  }

  private async scheduleReport(config: AuditReportConfig): Promise<void> {
    // In a real implementation, this would schedule the report using a job scheduler
    console.log(`Scheduling audit report: ${config.name} with schedule: ${config.schedule}`)
  }

  private async saveReportConfig(config: AuditReportConfig): Promise<void> {
    try {
      await supabaseAdmin
        .from('audit_report_configs')
        .upsert({
          id: config.id,
          name: config.name,
          description: config.description,
          query: config.query,
          format: config.format,
          template: config.template,
          schedule: config.schedule,
          recipients: config.recipients,
          include_charts: config.includeCharts,
          include_trends: config.includeTrends,
          include_summary: config.includeSummary,
          created_by: config.createdBy,
          active: config.active,
          created_at: config.createdAt.toISOString(),
          updated_at: config.updatedAt.toISOString()
        })
    } catch (error) {
      console.error('Error saving report config:', error)
    }
  }

  private async saveReport(report: AuditReport): Promise<void> {
    try {
      await supabaseAdmin
        .from('audit_reports')
        .insert({
          id: report.id,
          config_id: report.configId,
          name: report.name,
          format: report.format,
          generated_at: report.generatedAt.toISOString(),
          generated_by: report.generatedBy,
          period_start: report.period.start.toISOString(),
          period_end: report.period.end.toISOString(),
          summary: report.summary,
          file_path: report.filePath,
          file_size: report.fileSize,
          download_url: report.downloadUrl,
          expires_at: report.expiresAt?.toISOString()
        })
    } catch (error) {
      console.error('Error saving report:', error)
    }
  }
}

// Global audit trail manager instance
export const auditTrailManager = new AuditTrailManager()

export default auditTrailManager
