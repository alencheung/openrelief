/**
 * Security Incident Monitoring System - Helpers
 *
 * Standalone helper functions for the security incident monitoring system.
 */

import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger'
import { supabaseAdmin } from '@/lib/supabase'
import {
  SecurityIncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentImpact,
  SecurityIncident,
  SecurityEvidence,
  SecurityAlert,
  SecurityMetrics
} from './security-monitor-types'

// Impact assessment result returned by analyzeIncidentImpact
export type ImpactAssessment = {
  impact: IncidentImpact
  dataBreach: boolean
  recordsAffected: number
  usersAffected: number
  systemsAffected: number
  financialImpact: number
  reputationalImpact: 'none' | 'low' | 'medium' | 'high'
  recommendations: string[]
}

/**
 * Generate a unique incident id
 */
export function generateIncidentId(): string {
  return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique alert id
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique evidence id
 */
export function generateEvidenceId(): string {
  return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique threat id
 */
export function generateThreatId(): string {
  return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Assess the initial impact of an incident based on its type and severity
 */
export function assessInitialImpact(
  type: SecurityIncidentType,
  severity: IncidentSeverity
): IncidentImpact {
  if (severity === IncidentSeverity.CRITICAL) {
    return IncidentImpact.SEVERE
  }
  if (severity === IncidentSeverity.HIGH) {
    return IncidentImpact.SIGNIFICANT
  }
  if (severity === IncidentSeverity.MEDIUM) {
    return IncidentImpact.MODERATE
  }
  return IncidentImpact.MINIMAL
}

/**
 * Map an incident severity to an audit severity
 */
export function mapSeverityToAuditSeverity(severity: IncidentSeverity): AuditSeverity {
  switch (severity) {
    case IncidentSeverity.LOW:
      return AuditSeverity.LOW
    case IncidentSeverity.MEDIUM:
      return AuditSeverity.MEDIUM
    case IncidentSeverity.HIGH:
      return AuditSeverity.HIGH
    case IncidentSeverity.CRITICAL:
      return AuditSeverity.CRITICAL
    default:
      return AuditSeverity.MEDIUM
  }
}

/**
 * Send a critical incident alert notification (currently logs + audit log)
 */
export async function sendCriticalIncidentAlert(incident: SecurityIncident): Promise<void> {
  // In a real implementation, this would send notifications to security team
  console.error('CRITICAL SECURITY INCIDENT:', incident)

  await auditLogger.logEvent({
    eventType: AuditEventType.SECURITY_INCIDENT,
    severity: AuditSeverity.CRITICAL,
    action: 'critical_incident_alert',
    resource: 'security_monitor',
    privacyImpact: 'high',
    timestamp: new Date(),
    metadata: {
      incidentId: incident.id,
      title: incident.title,
      severity: incident.severity
    }
  })
}

/**
 * Determine the team to auto-assign an incident to based on its type
 */
export function getAutoAssignTeam(type: SecurityIncidentType): string {
  switch (type) {
    case SecurityIncidentType.DATA_BREACH:
      return 'security-team-lead'
    case SecurityIncidentType.UNAUTHORIZED_ACCESS:
      return 'incident-response-team'
    case SecurityIncidentType.SYSTEM_COMPROMISE:
      return 'security-engineering'
    default:
      return 'security-analyst'
  }
}

/**
 * Determine if an alert should be escalated to an incident
 */
export function shouldEscalateToIncident(alert: SecurityAlert, recentAlerts: SecurityAlert[]): boolean {
  // Escalate if severity is high or critical
  if (alert.severity === IncidentSeverity.HIGH || alert.severity === IncidentSeverity.CRITICAL) {
    return true
  }

  // Check for multiple similar alerts in the last hour
  const similarRecent = recentAlerts.filter(
    a => a.type === alert.type && a.timestamp > new Date(Date.now() - 60 * 60 * 1000)
  )

  return similarRecent.length >= 3
}

/**
 * Analyze the impact of an incident and produce recommendations
 */
export function analyzeIncidentImpact(incident: SecurityIncident): ImpactAssessment {
  // This is a simplified impact assessment
  // In a real implementation, this would be much more sophisticated
  const usersAffected = incident.affectedUsers?.length || 0
  const systemsAffected = 1 // Simplified

  let impact = IncidentImpact.MINIMAL
  let dataBreach = false
  let recordsAffected = 0
  let financialImpact = 0
  let reputationalImpact: 'none' | 'low' | 'medium' | 'high' = 'none'
  const recommendations: string[] = []

  // Assess based on incident type and severity
  if (incident.type === SecurityIncidentType.DATA_BREACH) {
    dataBreach = true
    recordsAffected = 1000 // Estimated
    impact = IncidentImpact.SEVERE
    financialImpact = 100000 // Estimated
    reputationalImpact = 'high'
    recommendations.push('Notify affected users immediately')
    recommendations.push('Engage legal counsel')
    recommendations.push('Prepare regulatory notifications')
  } else if (incident.severity === IncidentSeverity.CRITICAL) {
    impact = IncidentImpact.SEVERE
    financialImpact = 50000
    reputationalImpact = 'medium'
    recommendations.push('Activate incident response team')
    recommendations.push('Isolate affected systems')
  } else if (incident.severity === IncidentSeverity.HIGH) {
    impact = IncidentImpact.SIGNIFICANT
    financialImpact = 10000
    reputationalImpact = 'low'
    recommendations.push('Investigate root cause')
    recommendations.push('Monitor for additional compromise')
  }

  return {
    impact,
    dataBreach,
    recordsAffected,
    usersAffected,
    systemsAffected,
    financialImpact,
    reputationalImpact,
    recommendations
  }
}

/**
 * Load active incidents from the database (not resolved or false positive)
 */
export async function loadActiveIncidents(): Promise<SecurityIncident[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('security_incidents')
      .select('*')
      .in('status', [
        IncidentStatus.DETECTED,
        IncidentStatus.INVESTIGATING,
        IncidentStatus.CONTAINED
      ])

    if (error) {
      throw error
    }

    return (data || []) as unknown as SecurityIncident[]
  } catch (error) {
    console.error('Error loading active incidents:', error)
    return []
  }
}

/**
 * Load active threat intelligence entries from the database
 */
export async function loadThreatIntelligenceList(): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('threat_intelligence')
      .select('*')
      .eq('active', true)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error loading threat intelligence:', error)
    return []
  }
}

/**
 * Check for suspicious login patterns (multiple failed logins from same IP)
 */
export async function detectSuspiciousLogins(): Promise<Array<{ ip: string; count: number }>> {
  try {
    const { data: failedLogins } = await supabaseAdmin
      .from('audit_log')
      .select('ip_address, user_id, timestamp')
      .eq('action', 'login_failure')
      .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())

    if (!failedLogins) {
      return []
    }

    const attemptsByIP = new Map<string, number>()
    for (const login of failedLogins) {
      const ip = (login as { ip_address?: string }).ip_address || 'unknown'
      attemptsByIP.set(ip, (attemptsByIP.get(ip) || 0) + 1)
    }

    return Array.from(attemptsByIP.entries())
      .map(([ip, count]) => ({ ip, count }))
      .filter(entry => entry.count >= 5)
  } catch (error) {
    console.error('Error checking suspicious logins:', error)
    return []
  }
}

/**
 * Check for anomalous data access patterns (unusually high access counts)
 */
export async function detectAnomalousAccess(): Promise<Array<{ userId: string; count: number }>> {
  try {
    const { data: dataAccess } = await supabaseAdmin
      .from('audit_log')
      .select('user_id, action, timestamp')
      .eq('action', 'data_access')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (!dataAccess) {
      return []
    }

    const accessByUser = new Map<string, number>()
    for (const access of dataAccess) {
      const userId = (access as { user_id?: string }).user_id || 'unknown'
      accessByUser.set(userId, (accessByUser.get(userId) || 0) + 1)
    }

    return Array.from(accessByUser.entries())
      .map(([userId, count]) => ({ userId, count }))
      .filter(entry => entry.count >= 100) // Unusually high access
  } catch (error) {
    console.error('Error checking anomalous access:', error)
    return []
  }
}

/**
 * Aggregate security incidents into security metrics
 */
export function aggregateSecurityMetrics(
  incidents: Array<Record<string, unknown>>,
  alerts: Array<Record<string, unknown>>,
  startDate: Date,
  endDate: Date
): SecurityMetrics {
  const metrics: SecurityMetrics = {
    timeRange: {
      start: startDate,
      end: endDate
    },
    totalIncidents: incidents.length,
    incidentsByType: {} as Record<SecurityIncidentType, number>,
    incidentsBySeverity: {} as Record<IncidentSeverity, number>,
    averageResolutionTime: 0,
    unresolvedIncidents: 0,
    criticalIncidents: 0,
    dataBreaches: 0,
    usersAffected: 0,
    systemsAffected: 0,
    threatsBlocked: 0,
    falsePositiveRate: 0
  }

  // Aggregate metrics
  let totalResolutionTime = 0
  let resolvedCount = 0

  for (const incident of incidents) {
    // Count by type
    const type = incident.type as SecurityIncidentType
    metrics.incidentsByType[type] = (metrics.incidentsByType[type] || 0) + 1

    // Count by severity
    const severity = incident.severity as IncidentSeverity
    metrics.incidentsBySeverity[severity] = (metrics.incidentsBySeverity[severity] || 0) + 1

    // Count critical incidents
    if (severity === IncidentSeverity.CRITICAL) {
      metrics.criticalIncidents++
    }

    // Count unresolved
    const status = incident.status as IncidentStatus
    if (status !== IncidentStatus.RESOLVED && status !== IncidentStatus.FALSE_POSITIVE) {
      metrics.unresolvedIncidents++
    }

    // Count data breaches
    if (incident.data_breach) {
      metrics.dataBreaches++
    }

    // Sum affected counts
    const affectedUsers = (incident.affected_users as string[]) || []
    const affectedSystems = (incident.affected_systems as string[]) || []
    metrics.usersAffected += affectedUsers.length
    metrics.systemsAffected += affectedSystems.length

    // Calculate resolution time
    if (incident.resolved_at) {
      const detectedAt = new Date(incident.detected_at as string)
      const resolvedAt = new Date(incident.resolved_at as string)
      const resolutionTime = (resolvedAt.getTime() - detectedAt.getTime()) / (1000 * 60 * 60)
      totalResolutionTime += resolutionTime
      resolvedCount++
    }
  }

  // Calculate average resolution time
  if (resolvedCount > 0) {
    metrics.averageResolutionTime = totalResolutionTime / resolvedCount
  }

  // Calculate false positive rate
  if (alerts.length > 0) {
    const falsePositives = alerts.filter(alert => alert.false_positive).length
    metrics.falsePositiveRate = (falsePositives / alerts.length) * 100
  }

  return metrics
}

/**
 * Save a security incident to the database (upsert)
 */
export async function saveIncidentToDatabase(incident: SecurityIncident): Promise<void> {
  try {
    await supabaseAdmin.from('security_incidents').upsert({
      id: incident.id,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      impact: incident.impact,
      title: incident.title,
      description: incident.description,
      detected_at: incident.detectedAt.toISOString(),
      reported_by: incident.reportedBy,
      source_ip_address: incident.sourceIpAddress,
      target_system: incident.targetSystem,
      affected_users: incident.affectedUsers,
      affected_data: incident.affectedData,
      attack_vector: incident.attackVector,
      indicators: incident.indicators,
      assigned_to: incident.assignedTo,
      investigated_by: incident.investigatedBy,
      investigation_notes: incident.investigationNotes,
      resolved_at: incident.resolvedAt?.toISOString(),
      resolved_by: incident.resolvedBy,
      resolution: incident.resolution,
      lessons_learned: incident.lessonsLearned,
      data_breach: incident.dataBreach,
      records_affected: incident.recordsAffected,
      financial_impact: incident.financialImpact,
      reputational_impact: incident.reputationalImpact,
      notifications_sent: incident.notificationsSent,
      stakeholders_notified: incident.stakeholdersNotified,
      tags: incident.tags,
      related_incidents: incident.relatedIncidents,
      metadata: incident.metadata,
      created_at: incident.createdAt.toISOString(),
      updated_at: incident.updatedAt.toISOString()
    } as never)
  } catch (error) {
    console.error('Error saving incident:', error)
  }
}

/**
 * Save a security alert to the database (upsert)
 */
export async function saveAlertToDatabase(alert: SecurityAlert): Promise<void> {
  try {
    await supabaseAdmin.from('security_alerts').upsert({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      source: alert.source,
      timestamp: alert.timestamp.toISOString(),
      user_id: alert.userId,
      ip_address: alert.ipAddress,
      user_agent: alert.userAgent,
      metadata: alert.metadata,
      acknowledged: alert.acknowledged,
      acknowledged_by: alert.acknowledgedBy,
      acknowledged_at: alert.acknowledgedAt?.toISOString(),
      false_positive: alert.falsePositive,
      resolved: alert.resolved,
      resolved_at: alert.resolvedAt?.toISOString()
    } as never)
  } catch (error) {
    console.error('Error saving alert:', error)
  }
}

/**
 * Save security evidence to the database (insert)
 */
export async function saveEvidenceToDatabase(evidence: SecurityEvidence): Promise<void> {
  try {
    await supabaseAdmin.from('security_evidence').insert({
      id: evidence.id,
      incident_id: evidence.incidentId,
      type: evidence.type,
      description: evidence.description,
      file_path: evidence.filePath,
      url: evidence.url,
      hash: evidence.hash,
      timestamp: evidence.timestamp.toISOString(),
      collected_by: evidence.collectedBy,
      preserved: evidence.preserved
    } as never)
  } catch (error) {
    console.error('Error saving evidence:', error)
  }
}
