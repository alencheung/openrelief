/**
 * Security Incident Monitoring System
 *
 * This module provides security event detection and classification, incident response workflow,
 * forensic data collection capabilities, and incident impact assessment tools.
 */

import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger'
import { supabaseAdmin } from '@/lib/supabase'

// Re-export extracted types and helpers for backward compatibility
export * from './security-monitor-types'
export * from './security-monitor-helpers'
import {
  generateIncidentId,
  generateAlertId,
  generateEvidenceId,
  generateThreatId,
  assessInitialImpact,
  mapSeverityToAuditSeverity,
  sendCriticalIncidentAlert,
  getAutoAssignTeam,
  shouldEscalateToIncident,
  analyzeIncidentImpact,
  loadActiveIncidents,
  loadThreatIntelligenceList,
  detectSuspiciousLogins,
  detectAnomalousAccess,
  aggregateSecurityMetrics,
  saveIncidentToDatabase,
  saveAlertToDatabase,
  saveEvidenceToDatabase
} from './security-monitor-helpers'
import type {
  SecurityIncident,
  SecurityEvidence,
  SecurityAlert,
  ThreatIntelligence,
  SecurityMetrics
} from './security-monitor-types'
import {
  SecurityIncidentType,
  IncidentSeverity,
  IncidentStatus
} from './security-monitor-types'

class SecurityMonitor {
  private activeIncidents: Map<string, SecurityIncident> = new Map()
  private securityAlerts: Map<string, SecurityAlert> = new Map()
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map()
  private monitoringActive = false

  constructor() {
    this.startMonitoring()
  }

  /**
   * Start security monitoring
   */
  startMonitoring(): void {
    if (this.monitoringActive) {
      return
    }

    this.monitoringActive = true
    this.loadActiveIncidents()
    this.loadThreatIntelligence()
    this.startRealTimeMonitoring()

    console.log('Security monitoring started')
  }

  /**
   * Stop security monitoring
   */
  stopMonitoring(): void {
    this.monitoringActive = false
    console.log('Security monitoring stopped')
  }

  /**
   * Detect and create security incident
   */
  async detectIncident(
    type: SecurityIncidentType,
    severity: IncidentSeverity,
    title: string,
    description: string,
    details?: Partial<SecurityIncident>
  ): Promise<string> {
    try {
      const incident: SecurityIncident = {
        id: generateIncidentId(),
        type,
        severity,
        status: IncidentStatus.DETECTED,
        impact: assessInitialImpact(type, severity),
        title,
        description,
        detectedAt: new Date(),
        notificationsSent: false,
        stakeholdersNotified: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...details
      }

      // Save incident
      await saveIncidentToDatabase(incident)
      this.activeIncidents.set(incident.id, incident)

      // Log the detection
      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.SECURITY_INCIDENT,
        severity: mapSeverityToAuditSeverity(severity),
        action: 'incident_detected',
        resource: 'security_monitor',
        privacyImpact: 'high',
        metadata: {
          incidentId: incident.id,
          type,
          severity,
          title,
          description
        }
      })

      // Send immediate notifications for critical incidents
      if (severity === IncidentSeverity.CRITICAL) {
        await sendCriticalIncidentAlert(incident)
      }

      // Auto-assign incident if possible
      await this.autoAssignIncident(incident)

      console.log(`Security incident detected: ${incident.id} - ${title}`)
      return incident.id
    } catch (error) {
      console.error('Error detecting security incident:', error)
      throw error
    }
  }

  /**
   * Create security alert
   */
  async createAlert(
    type: SecurityIncidentType,
    severity: IncidentSeverity,
    title: string,
    description: string,
    source: string,
    details?: Partial<SecurityAlert>
  ): Promise<string> {
    try {
      const alert: SecurityAlert = {
        id: generateAlertId(),
        type,
        severity,
        title,
        description,
        source,
        timestamp: new Date(),
        acknowledged: false,
        falsePositive: false,
        resolved: false,
        ...details
      }

      // Save alert
      await saveAlertToDatabase(alert)
      this.securityAlerts.set(alert.id, alert)

      // Check if this should escalate to an incident
      if (shouldEscalateToIncident(alert, Array.from(this.securityAlerts.values()))) {
        await this.escalateAlertToIncident(alert)
      }

      return alert.id
    } catch (error) {
      console.error('Error creating security alert:', error)
      throw error
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const incident = this.activeIncidents.get(incidentId)
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`)
      }

      const previousStatus = incident.status
      incident.status = status
      incident.updatedAt = new Date()

      if (notes) {
        if (!incident.investigationNotes) {
          incident.investigationNotes = []
        }
        incident.investigationNotes.push({
          timestamp: new Date(),
          userId,
          notes,
          statusChange: `${previousStatus} -> ${status}`
        })
      }

      // Set resolution details if resolved
      if (status === IncidentStatus.RESOLVED) {
        incident.resolvedAt = new Date()
        incident.resolvedBy = userId
      }

      // Save updated incident
      await saveIncidentToDatabase(incident)

      // Log the status change
      await auditLogger.logEvent({
        timestamp: new Date(),
        eventType: AuditEventType.SECURITY_INCIDENT,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'incident_status_updated',
        resource: 'security_monitor',
        privacyImpact: 'low',
        metadata: {
          incidentId,
          previousStatus,
          newStatus: status,
          notes
        }
      })
    } catch (error) {
      console.error('Error updating incident status:', error)
      throw error
    }
  }

  /**
   * Add evidence to incident
   */
  async addEvidence(
    incidentId: string,
    evidence: Omit<SecurityEvidence, 'id' | 'incidentId' | 'timestamp'>,
    collectedBy: string
  ): Promise<string> {
    try {
      const evidenceId = generateEvidenceId()
      const securityEvidence: SecurityEvidence = {
        id: evidenceId,
        incidentId,
        timestamp: new Date(),
        ...evidence
      }

      // Save evidence
      await saveEvidenceToDatabase(securityEvidence)

      // Update incident
      const incident = this.activeIncidents.get(incidentId)
      if (incident) {
        if (!incident.evidence) {
          incident.evidence = []
        }
        incident.evidence.push(securityEvidence)
        incident.updatedAt = new Date()
        await saveIncidentToDatabase(incident)
      }

      return evidenceId
    } catch (error) {
      console.error('Error adding evidence:', error)
      throw error
    }
  }

  /**
   * Perform impact assessment
   */
  async performImpactAssessment(incidentId: string) {
    try {
      const incident = this.activeIncidents.get(incidentId)
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`)
      }

      // Analyze affected systems and data
      const assessment = analyzeIncidentImpact(incident)

      // Update incident with assessment results
      incident.impact = assessment.impact
      incident.dataBreach = assessment.dataBreach
      incident.recordsAffected = assessment.recordsAffected
      incident.financialImpact = assessment.financialImpact
      incident.reputationalImpact = assessment.reputationalImpact
      incident.updatedAt = new Date()

      await saveIncidentToDatabase(incident)

      return assessment
    } catch (error) {
      console.error('Error performing impact assessment:', error)
      throw error
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(startDate?: Date, endDate?: Date): Promise<SecurityMetrics> {
    try {
      const query = supabaseAdmin
        .from('security_incidents')
        .select('*')
        .gte(
          'detected_at',
          (startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString()
        )
        .lte('detected_at', (endDate || new Date()).toISOString())

      const { data: incidents, error } = await query
      if (error) {
        throw error
      }

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate || new Date()

      // Query alerts for false positive rate
      const { data: alerts } = await supabaseAdmin
        .from('security_alerts')
        .select('*')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())

      return aggregateSecurityMetrics(
        (incidents || []) as unknown as Array<Record<string, unknown>>,
        (alerts || []) as unknown as Array<Record<string, unknown>>,
        start,
        end
      )
    } catch (error) {
      console.error('Error getting security metrics:', error)
      throw error
    }
  }

  /**
   * Check against threat intelligence
   */
  async checkThreatIntelligence(
    indicator: string,
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email'
  ): Promise<ThreatIntelligence | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('threat_intelligence')
        .select('*')
        .eq('indicator', indicator)
        .eq('indicator_type', type)
        .eq('active', true)
        .single()

      if (error || !data) {
        return null
      }

      return data as unknown as ThreatIntelligence
    } catch (error) {
      console.error('Error checking threat intelligence:', error)
      return null
    }
  }

  /**
   * Add threat intelligence
   */
  async addThreatIntelligence(intelligence: Omit<ThreatIntelligence, 'id'>): Promise<string> {
    try {
      const id = generateThreatId()
      const threatIntelligence: ThreatIntelligence = {
        id,
        ...intelligence
      }

      await supabaseAdmin.from('threat_intelligence').insert(threatIntelligence)

      this.threatIntelligence.set(id, threatIntelligence)

      return id
    } catch (error) {
      console.error('Error adding threat intelligence:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */

  private async autoAssignIncident(incident: SecurityIncident): Promise<void> {
    incident.assignedTo = getAutoAssignTeam(incident.type)
    await saveIncidentToDatabase(incident)
  }

  private async escalateAlertToIncident(alert: SecurityAlert): Promise<void> {
    await this.detectIncident(
      alert.type,
      alert.severity,
      `Escalated from alert: ${alert.title}`,
      alert.description,
      {
        sourceIpAddress: alert.ipAddress,
        reportedBy: alert.userId
      }
    )

    // Mark alert as escalated
    alert.resolved = true
    alert.resolvedAt = new Date()
    await saveAlertToDatabase(alert)
  }

  private async loadActiveIncidents(): Promise<void> {
    const incidents = await loadActiveIncidents()
    for (const incident of incidents) {
      this.activeIncidents.set(incident.id, incident)
    }
  }

  private async loadThreatIntelligence(): Promise<void> {
    const threats = await loadThreatIntelligenceList()
    for (const threat of threats) {
      const typed = threat as unknown as ThreatIntelligence
      this.threatIntelligence.set(typed.id, typed)
    }
  }

  private startRealTimeMonitoring(): void {
    // Monitor for suspicious patterns
    setInterval(
      async () => {
        await this.checkSuspiciousPatterns()
      },
      5 * 60 * 1000
    ) // Every 5 minutes
  }

  private async checkSuspiciousPatterns(): Promise<void> {
    try {
      // Check for multiple failed logins from same IP
      const suspiciousLogins = await detectSuspiciousLogins()
      for (const { ip, count } of suspiciousLogins) {
        await this.createAlert(
          SecurityIncidentType.SUSPICIOUS_LOGIN,
          IncidentSeverity.MEDIUM,
          `Multiple failed login attempts from ${ip}`,
          `${count} failed login attempts detected in the last 15 minutes`,
          'security_monitor',
          { ipAddress: ip }
        )
      }

      // Check for anomalous data access patterns
      const anomalousAccess = await detectAnomalousAccess()
      for (const { userId, count } of anomalousAccess) {
        await this.createAlert(
          SecurityIncidentType.ANOMALOUS_BEHAVIOR,
          IncidentSeverity.MEDIUM,
          `Unusual data access pattern for user ${userId}`,
          `${count} data access events detected in the last hour`,
          'security_monitor',
          { userId }
        )
      }
    } catch (error) {
      console.error('Error checking suspicious patterns:', error)
    }
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor()

export default securityMonitor
