/**
 * Audit Trail Management System - Helpers
 *
 * Standalone helper functions for the audit trail management system.
 */

import { AuditEventType, AuditSeverity, ComplianceFramework } from './audit-logger'
import { LogSource, AggregationStrategy, RetentionPolicy, AggregationRule, AuditTrailQuery, AuditTrailSummary } from './audit-types'
import { supabaseAdmin } from '@/lib/supabase'

// Entry-like shape used by scoring/categorization helpers
export type ScoreableEntry = {
  severity?: AuditSeverity
  eventType?: AuditEventType
  complianceFrameworks?: ComplianceFramework[]
  metadata?: {
    source?: LogSource
    failedAttempts?: number
    unusualLocation?: boolean
    riskScore?: number
    [key: string]: unknown
  }
}

// Database row shape returned by enhanced_audit_log queries
export type AuditLogRow = {
  event_type: AuditEventType
  severity: AuditSeverity
  user_id?: string
  timestamp: string
  compliance_frameworks?: ComplianceFramework[]
  metadata?: { source?: LogSource; [key: string]: unknown }
}

/**
 * Generate a unique report config id
 */
export function generateReportConfigId(): string {
  return `report_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique report id
 */
export function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate risk score based on various factors
 */
export function calculateRiskScore(entry: ScoreableEntry): number {
  let score = 0

  // Base score from severity
  switch (entry.severity) {
    case AuditSeverity.CRITICAL:
      score += 80
      break
    case AuditSeverity.HIGH:
      score += 60
      break
    case AuditSeverity.MEDIUM:
      score += 40
      break
    case AuditSeverity.LOW:
      score += 20
      break
  }

  // Add points for suspicious patterns
  if (entry.metadata?.source === LogSource.SECURITY) {
    score += 10
  }
  if (entry.metadata?.failedAttempts && entry.metadata.failedAttempts > 3) {
    score += 15
  }
  if (entry.metadata?.unusualLocation) {
    score += 20
  }

  return Math.min(100, score)
}

/**
 * Categorize entry by compliance framework
 */
export function categorizeByFramework(entry: ScoreableEntry): ComplianceFramework[] {
  const frameworks: ComplianceFramework[] = []

  // Categorize based on event type and metadata
  if (entry.eventType === AuditEventType.DATA_ACCESS
      || entry.eventType === AuditEventType.DATA_DELETION) {
    frameworks.push(ComplianceFramework.GDPR)
  }

  if (entry.eventType === AuditEventType.LEGAL_REQUEST_RECEIVED) {
    frameworks.push(ComplianceFramework.GDPR, ComplianceFramework.CCPA)
  }

  if (entry.metadata?.source === LogSource.SECURITY) {
    frameworks.push(ComplianceFramework.HIPAA, ComplianceFramework.SOX)
  }

  return frameworks
}

/**
 * Calculate compliance score
 */
export function calculateComplianceScore(entry: ScoreableEntry): number {
  let score = 50 // Base score

  // Add points for compliance features
  if (entry.complianceFrameworks && entry.complianceFrameworks.length > 0) {
    score += entry.complianceFrameworks.length * 10
  }

  if (entry.metadata?.riskScore) {
    score -= entry.metadata.riskScore * 0.3 // Deduct for risk
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Determine whether a schedule (cron expression) is currently due.
 * Stub implementation: always returns true for demonstration.
 */
export function isScheduleDue(schedule: string): boolean {
  // In a real implementation, this would parse cron expressions
  return true
}

/**
 * Default retention policies for the audit trail manager
 */
export function getDefaultRetentionPolicies(): RetentionPolicy[] {
  return [
    {
      id: 'default_critical',
      name: 'Critical Events Retention',
      description: 'Retain critical security and compliance events for 7 years',
      severity: AuditSeverity.CRITICAL,
      retentionDays: 2555, // 7 years
      archivalDays: 1825, // 5 years
      compressionEnabled: true,
      encryptionEnabled: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default_high',
      name: 'High Severity Events Retention',
      description: 'Retain high severity events for 3 years',
      severity: AuditSeverity.HIGH,
      retentionDays: 1095, // 3 years
      archivalDays: 730, // 2 years
      compressionEnabled: true,
      encryptionEnabled: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default_medium',
      name: 'Medium Severity Events Retention',
      description: 'Retain medium severity events for 1 year',
      severity: AuditSeverity.MEDIUM,
      retentionDays: 365, // 1 year
      archivalDays: 180, // 6 months
      compressionEnabled: true,
      encryptionEnabled: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'default_low',
      name: 'Low Severity Events Retention',
      description: 'Retain low severity events for 90 days',
      severity: AuditSeverity.LOW,
      retentionDays: 90, // 90 days
      archivalDays: 0, // No archival
      compressionEnabled: true,
      encryptionEnabled: true,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
}

/**
 * Default aggregation rules for the audit trail manager
 */
export function getDefaultAggregationRules(): AggregationRule[] {
  return [
    {
      id: 'aggregate_security_events',
      name: 'Security Events Aggregation',
      description: 'Aggregate security-related events for analysis',
      source: LogSource.SECURITY,
      eventType: AuditEventType.SECURITY_INCIDENT,
      filters: {
        severity: ['high', 'critical']
      },
      transformations: ['enrich_with_threat_intel', 'calculate_risk_score'],
      destination: 'security_analysis',
      enabled: true,
      priority: 1,
      strategy: AggregationStrategy.REAL_TIME,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'aggregate_compliance_events',
      name: 'Compliance Events Aggregation',
      description: 'Aggregate compliance-related events for reporting',
      source: LogSource.COMPLIANCE,
      filters: {
        includeFrameworks: ['gdpr', 'ccpa']
      },
      transformations: ['categorize_by_framework', 'calculate_compliance_score'],
      destination: 'compliance_dashboard',
      enabled: true,
      priority: 2,
      strategy: AggregationStrategy.BATCH,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
}

/**
 * Build a supabase search query against enhanced_audit_log based on an AuditTrailQuery
 */
export function buildSearchQuery(query: AuditTrailQuery) {
  let dbQuery = supabaseAdmin
    .from('enhanced_audit_log')
    .select('*', { count: 'exact' })

  // Apply filters
  if (query.sources && query.sources.length > 0) {
    dbQuery = dbQuery.in('metadata->>source', query.sources)
  }

  if (query.eventTypes && query.eventTypes.length > 0) {
    dbQuery = dbQuery.in('event_type', query.eventTypes)
  }

  if (query.severities && query.severities.length > 0) {
    dbQuery = dbQuery.in('severity', query.severities)
  }

  if (query.userIds && query.userIds.length > 0) {
    dbQuery = dbQuery.in('user_id', query.userIds)
  }

  if (query.startDate) {
    dbQuery = dbQuery.gte('timestamp', query.startDate.toISOString())
  }

  if (query.endDate) {
    dbQuery = dbQuery.lte('timestamp', query.endDate.toISOString())
  }

  if (query.searchText) {
    dbQuery = dbQuery.or(`action.ilike.%${query.searchText}%,description.ilike.%${query.searchText}%,resource.ilike.%${query.searchText}%`)
  }

  if (query.tags && query.tags.length > 0) {
    dbQuery = dbQuery.contains('tags', query.tags)
  }

  if (query.complianceFrameworks && query.complianceFrameworks.length > 0) {
    dbQuery = dbQuery.contains('compliance_frameworks', query.complianceFrameworks)
  }

  if (!query.includeArchived) {
    dbQuery = dbQuery.eq('archived', false)
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
    dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 100) - 1)
  }

  return dbQuery
}

/**
 * Build a supabase summary query against enhanced_audit_log based on partial AuditTrailQuery
 */
export function buildSummaryQuery(query?: Partial<AuditTrailQuery>) {
  let summaryQuery = supabaseAdmin
    .from('enhanced_audit_log')
    .select('*')

  // Apply same filters as search
  if (query?.sources && query.sources.length > 0) {
    summaryQuery = summaryQuery.in('metadata->>source', query.sources)
  }

  if (query?.startDate) {
    summaryQuery = summaryQuery.gte('timestamp', query.startDate.toISOString())
  }

  if (query?.endDate) {
    summaryQuery = summaryQuery.lte('timestamp', query.endDate.toISOString())
  }

  if (!query?.includeArchived) {
    summaryQuery = summaryQuery.eq('archived', false)
  }

  return summaryQuery
}

/**
 * Aggregate raw audit log rows into summary statistics (counts, trends, top items)
 */
export function aggregateSummaryData(
  entries: AuditLogRow[] | null | undefined,
  query?: Partial<AuditTrailQuery>
): AuditTrailSummary {
  const summary: AuditTrailSummary = {
    totalEntries: entries?.length || 0,
    timeRange: {
      start: query?.startDate || new Date(0),
      end: query?.endDate || new Date()
    },
    entriesBySource: {} as Record<LogSource, number>,
    entriesByEventType: {} as Record<AuditEventType, number>,
    entriesBySeverity: {} as Record<AuditSeverity, number>,
    entriesByUser: {} as Record<string, number>,
    complianceFrameworkUsage: {} as Record<ComplianceFramework, number>,
    topUsers: [],
    topEventTypes: [],
    trends: {
      daily: [],
      hourly: []
    }
  }

  // Aggregate data
  const userActivity = new Map<string, { count: number; lastActivity: Date }>()
  const dailyCounts = new Map<string, number>()
  const hourlyCounts = new Map<number, number>()

  for (const entry of entries || []) {
    // Count by source
    const source = entry.metadata?.source as LogSource || LogSource.APPLICATION
    summary.entriesBySource[source] = (summary.entriesBySource[source] || 0) + 1

    // Count by event type
    summary.entriesByEventType[entry.event_type as AuditEventType] = (summary.entriesByEventType[entry.event_type as AuditEventType] || 0) + 1

    // Count by severity
    summary.entriesBySeverity[entry.severity as AuditSeverity] = (summary.entriesBySeverity[entry.severity as AuditSeverity] || 0) + 1

    // Count by user
    if (entry.user_id) {
      summary.entriesByUser[entry.user_id] = (summary.entriesByUser[entry.user_id] || 0) + 1

      // Track user activity
      const current = userActivity.get(entry.user_id) || { count: 0, lastActivity: new Date(entry.timestamp) }
      current.count++
      if (new Date(entry.timestamp) > current.lastActivity) {
        current.lastActivity = new Date(entry.timestamp)
      }
      userActivity.set(entry.user_id, current)
    }

    // Count compliance frameworks
    if (entry.compliance_frameworks) {
      for (const framework of entry.compliance_frameworks) {
        summary.complianceFrameworkUsage[framework as ComplianceFramework] = (summary.complianceFrameworkUsage[framework as ComplianceFramework] || 0) + 1
      }
    }

    // Count by date and hour
    const date = new Date(entry.timestamp).toISOString().split('T')[0]!
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)

    const hour = new Date(entry.timestamp).getHours()
    hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1)
  }

  // Generate top users
  summary.topUsers = Array.from(userActivity.entries())
    .map(([userId, activity]) => ({
      userId,
      count: activity.count,
      lastActivity: activity.lastActivity
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Generate top event types
  const totalEntries = entries?.length || 0
  summary.topEventTypes = Object.entries(summary.entriesByEventType)
    .map(([eventType, count]) => ({
      eventType: eventType as AuditEventType,
      count,
      percentage: totalEntries > 0 ? (count / totalEntries) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Generate trends
  summary.trends.daily = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // Last 30 days

  summary.trends.hourly = Array.from(hourlyCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour)

  return summary
}

/**
 * Apply a single retention policy: archive and delete old entries
 */
export async function applyRetentionForPolicy(policy: RetentionPolicy): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

  // Build query for this policy
  let query = supabaseAdmin
    .from('enhanced_audit_log')
    .select('id, timestamp')

  // Apply policy filters
  if (policy.eventType) {
    query = query.eq('event_type', policy.eventType)
  }

  if (policy.severity) {
    query = query.eq('severity', policy.severity)
  }

  if (policy.source) {
    query = query.contains('metadata', { source: policy.source })
  }

  query = query.lt('timestamp', cutoffDate.toISOString())

  const { data: oldEntries, error } = await query

  if (error) {
    throw error
  }

  if (oldEntries && oldEntries.length > 0) {
    // Archive or delete old entries
    if (policy.archivalDays) {
      const archivalDate = new Date()
      archivalDate.setDate(archivalDate.getDate() - policy.archivalDays)

      // Archive entries older than archival period
      const { error: archiveError } = await supabaseAdmin
        .from('enhanced_audit_log')
        .update({
          archived: true,
          archived_at: new Date().toISOString()
        } as never)
        .lt('timestamp', archivalDate.toISOString())
        .eq('archived', false)

      if (archiveError) {
        throw archiveError
      }

      console.log(`Archived ${oldEntries.length} audit entries for policy ${policy.name}`)
    }

    // Delete very old entries
    const deleteCutoffDate = new Date()
    deleteCutoffDate.setDate(deleteCutoffDate.getDate() - policy.retentionDays - (policy.archivalDays || 0))

    const { error: deleteError } = await supabaseAdmin
      .from('enhanced_audit_log')
      .delete()
      .lt('timestamp', deleteCutoffDate.toISOString())
      .eq('archived', true)

    if (deleteError) {
      throw deleteError
    }

    console.log(`Deleted ${oldEntries.length} audit entries for policy ${policy.name}`)
  }
}
