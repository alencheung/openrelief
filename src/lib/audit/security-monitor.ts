/**
 * Security Incident Monitoring System
 *
 * This module provides security event detection and classification, incident response workflow,
 * forensic data collection capabilities, and incident impact assessment tools.
 */

import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger'
import { supabaseAdmin } from '@/lib/supabase'

// Security incident types
export enum SecurityIncidentType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  MALICIOUS_ACTIVITY = 'malicious_activity',
  SYSTEM_COMPROMISE = 'system_compromise',
  DENIAL_OF_SERVICE = 'denial_of_service',
  PRIVACY_VIOLATION = 'privacy_violation',
  INSIDER_THREAT = 'insider_threat',
  PHISHING_ATTEMPT = 'phishing_attempt',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior'
}

// Security incident severity levels
export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Incident status
export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive'
}

// Incident impact levels
export enum IncidentImpact {
  NONE = 'none',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SIGNIFICANT = 'significant',
  SEVERE = 'severe'
}

// Security incident interface
export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  impact: IncidentImpact;

  // Basic information
  title: string;
  description: string;
  detectedAt: Date;
  reportedBy?: string;

  // Technical details
  sourceIpAddress?: string;
  targetSystem?: string;
  affectedUsers?: string[];
  affectedData?: string[];
  attackVector?: string;
  indicators?: string[];

  // Investigation details
  assignedTo?: string;
  investigatedBy?: string;
  investigationNotes?: string[];
  evidence?: SecurityEvidence[];

  // Resolution details
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  lessonsLearned?: string;

  // Impact assessment
  dataBreach?: boolean;
  recordsAffected?: number;
  financialImpact?: number;
  reputationalImpact?: 'none' | 'low' | 'medium' | 'high';

  // Notifications
  notificationsSent: boolean;
  stakeholdersNotified: boolean[];

  // Metadata
  tags?: string[];
  relatedIncidents?: string[];
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Security evidence interface
export interface SecurityEvidence {
  id: string;
  incidentId: string;
  type: 'log' | 'screenshot' | 'network_capture' | 'file' | 'memory_dump' | 'system_state';
  description: string;
  filePath?: string;
  url?: string;
  hash?: string;
  timestamp: Date;
  collectedBy: string;
  preserved: boolean;
}

// Security alert interface
export interface SecurityAlert {
  id: string;
  type: SecurityIncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  falsePositive: boolean;
  resolved: boolean;
  resolvedAt?: Date;
}

// Threat intelligence interface
export interface ThreatIntelligence {
  id: string;
  indicatorType: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  indicator: string;
  threatType: string;
  severity: IncidentSeverity;
  confidence: number; // 0-100
  source: string;
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  active: boolean;
}

// Security metrics interface
export interface SecurityMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalIncidents: number;
  incidentsByType: Record<SecurityIncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  averageResolutionTime: number; // hours
  unresolvedIncidents: number;
  criticalIncidents: number;
  dataBreaches: number;
  usersAffected: number;
  systemsAffected: number;
  threatsBlocked: number;
  falsePositiveRate: number;
}

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
        id: this.generateIncidentId(),
        type,
        severity,
        status: IncidentStatus.DETECTED,
        impact: this.assessInitialImpact(type, severity),
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
      await this.saveIncident(incident)
      this.activeIncidents.set(incident.id, incident)

      // Log the detection
      await auditLogger.logEvent({
        eventType: AuditEventType.SECURITY_INCIDENT,
        severity: this.mapSeverityToAuditSeverity(severity),
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
        await this.sendCriticalIncidentAlert(incident)
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
        id: this.generateAlertId(),
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
      await this.saveAlert(alert)
      this.securityAlerts.set(alert.id, alert)

      // Check if this should escalate to an incident
      if (await this.shouldEscalateToIncident(alert)) {
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
        } as any)
      }

      // Set resolution details if resolved
      if (status === IncidentStatus.RESOLVED) {
        incident.resolvedAt = new Date()
        incident.resolvedBy = userId
      }

      // Save updated incident
      await this.saveIncident(incident)

      // Log the status change
      await auditLogger.logEvent({
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
      const evidenceId = this.generateEvidenceId()
      const securityEvidence: SecurityEvidence = {
        id: evidenceId,
        incidentId,
        timestamp: new Date(),
        collectedBy,
        ...evidence
      }

      // Save evidence
      await this.saveEvidence(securityEvidence)

      // Update incident
      const incident = this.activeIncidents.get(incidentId)
      if (incident) {
        if (!incident.evidence) {
          incident.evidence = []
        }
        incident.evidence.push(securityEvidence)
        incident.updatedAt = new Date()
        await this.saveIncident(incident)
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
  async performImpactAssessment(incidentId: string): Promise<{
    impact: IncidentImpact;
    dataBreach: boolean;
    recordsAffected: number;
    usersAffected: number;
    systemsAffected: number;
    financialImpact: number;
    reputationalImpact: 'none' | 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    try {
      const incident = this.activeIncidents.get(incidentId)
      if (!incident) {
        throw new Error(`Incident ${incidentId} not found`)
      }

      // Analyze affected systems and data
      const assessment = await this.analyzeIncidentImpact(incident)

      // Update incident with assessment results
      incident.impact = assessment.impact
      incident.dataBreach = assessment.dataBreach
      incident.recordsAffected = assessment.recordsAffected
      incident.financialImpact = assessment.financialImpact
      incident.reputationalImpact = assessment.reputationalImpact
      incident.updatedAt = new Date()

      await this.saveIncident(incident)

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
        .gte('detected_at', (startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString())
        .lte('detected_at', (endDate || new Date()).toISOString())

      const { data: incidents, error } = await query
      if (error) {
        throw error
      }

      const metrics: SecurityMetrics = {
        timeRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: endDate || new Date()
        },
        totalIncidents: incidents?.length || 0,
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

      for (const incident of incidents || []) {
        // Count by type
        metrics.incidentsByType[incident.type] = (metrics.incidentsByType[incident.type] || 0) + 1

        // Count by severity
        metrics.incidentsBySeverity[incident.severity] = (metrics.incidentsBySeverity[incident.severity] || 0) + 1

        // Count critical incidents
        if (incident.severity === IncidentSeverity.CRITICAL) {
          metrics.criticalIncidents++
        }

        // Count unresolved
        if (incident.status !== IncidentStatus.RESOLVED && incident.status !== IncidentStatus.FALSE_POSITIVE) {
          metrics.unresolvedIncidents++
        }

        // Count data breaches
        if (incident.data_breach) {
          metrics.dataBreaches++
        }

        // Sum affected counts
        metrics.usersAffected += incident.affected_users?.length || 0
        metrics.systemsAffected += incident.affected_systems?.length || 0

        // Calculate resolution time
        if (incident.resolved_at) {
          const resolutionTime = (new Date(incident.resolved_at).getTime() - new Date(incident.detected_at).getTime()) / (1000 * 60 * 60)
          totalResolutionTime += resolutionTime
          resolvedCount++
        }
      }

      // Calculate average resolution time
      if (resolvedCount > 0) {
        metrics.averageResolutionTime = totalResolutionTime / resolvedCount
      }

      // Calculate false positive rate
      const { data: alerts } = await supabaseAdmin
        .from('security_alerts')
        .select('*')
        .gte('timestamp', metrics.timeRange.start.toISOString())
        .lte('timestamp', metrics.timeRange.end.toISOString())

      if (alerts && alerts.length > 0) {
        const falsePositives = alerts.filter(alert => alert.false_positive).length
        metrics.falsePositiveRate = (falsePositives / alerts.length) * 100
      }

      return metrics
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

      return data as ThreatIntelligence
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
      const id = this.generateThreatId()
      const threatIntelligence: ThreatIntelligence = {
        id,
        ...intelligence
      }

      await supabaseAdmin
        .from('threat_intelligence')
        .insert(threatIntelligence)

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

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateEvidenceId(): string {
    return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateThreatId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private assessInitialImpact(type: SecurityIncidentType, severity: IncidentSeverity): IncidentImpact {
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

  private mapSeverityToAuditSeverity(severity: IncidentSeverity): AuditSeverity {
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

  private async sendCriticalIncidentAlert(incident: SecurityIncident): Promise<void> {
    // In a real implementation, this would send notifications to security team
    console.error('CRITICAL SECURITY INCIDENT:', incident)

    await auditLogger.logEvent({
      eventType: AuditEventType.SECURITY_INCIDENT,
      severity: AuditSeverity.CRITICAL,
      action: 'critical_incident_alert',
      resource: 'security_monitor',
      privacyImpact: 'high',
      metadata: {
        incidentId: incident.id,
        title: incident.title,
        severity: incident.severity
      }
    })
  }

  private async autoAssignIncident(incident: SecurityIncident): Promise<void> {
    // Auto-assign based on incident type and severity
    let assignTo = ''

    switch (incident.type) {
      case SecurityIncidentType.DATA_BREACH:
        assignTo = 'security-team-lead'
        break
      case SecurityIncidentType.UNAUTHORIZED_ACCESS:
        assignTo = 'incident-response-team'
        break
      case SecurityIncidentType.SYSTEM_COMPROMISE:
        assignTo = 'security-engineering'
        break
      default:
        assignTo = 'security-analyst'
    }

    incident.assignedTo = assignTo
    await this.saveIncident(incident)
  }

  private async shouldEscalateToIncident(alert: SecurityAlert): Promise<boolean> {
    // Escalate if severity is high or critical
    if (alert.severity === IncidentSeverity.HIGH || alert.severity === IncidentSeverity.CRITICAL) {
      return true
    }

    // Check for multiple similar alerts
    const recentAlerts = Array.from(this.securityAlerts.values()).filter(a =>
      a.type === alert.type
      && a.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    )

    return recentAlerts.length >= 3
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
    await this.saveAlert(alert)
  }

  private async analyzeIncidentImpact(incident: SecurityIncident): Promise<{
    impact: IncidentImpact;
    dataBreach: boolean;
    recordsAffected: number;
    usersAffected: number;
    systemsAffected: number;
    financialImpact: number;
    reputationalImpact: 'none' | 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
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

  private async loadActiveIncidents(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('security_incidents')
        .select('*')
        .in('status', [IncidentStatus.DETECTED, IncidentStatus.INVESTIGATING, IncidentStatus.CONTAINED])

      if (error) {
        throw error
      }

      for (const incident of data || []) {
        this.activeIncidents.set(incident.id, incident as SecurityIncident)
      }
    } catch (error) {
      console.error('Error loading active incidents:', error)
    }
  }

  private async loadThreatIntelligence(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('threat_intelligence')
        .select('*')
        .eq('active', true)

      if (error) {
        throw error
      }

      for (const threat of data || []) {
        this.threatIntelligence.set(threat.id, threat as ThreatIntelligence)
      }
    } catch (error) {
      console.error('Error loading threat intelligence:', error)
    }
  }

  private startRealTimeMonitoring(): void {
    // Monitor for suspicious patterns
    setInterval(async () => {
      await this.checkSuspiciousPatterns()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private async checkSuspiciousPatterns(): Promise<void> {
    try {
      // Check for multiple failed logins from same IP
      const { data: failedLogins } = await supabaseAdmin
        .from('audit_log')
        .select('ip_address, user_id, timestamp')
        .eq('action', 'login_failure')
        .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())

      if (failedLogins) {
        const attemptsByIP = new Map<string, number>()
        for (const login of failedLogins) {
          const ip = login.ip_address || 'unknown'
          attemptsByIP.set(ip, (attemptsByIP.get(ip) || 0) + 1)
        }

        for (const [ip, count] of attemptsByIP.entries()) {
          if (count >= 5) {
            await this.createAlert(
              SecurityIncidentType.SUSPICIOUS_LOGIN,
              IncidentSeverity.MEDIUM,
              `Multiple failed login attempts from ${ip}`,
              `${count} failed login attempts detected in the last 15 minutes`,
              'security_monitor',
              { ipAddress: ip }
            )
          }
        }
      }

      // Check for anomalous data access patterns
      const { data: dataAccess } = await supabaseAdmin
        .from('audit_log')
        .select('user_id, action, timestamp')
        .eq('action', 'data_access')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      if (dataAccess) {
        const accessByUser = new Map<string, number>()
        for (const access of dataAccess) {
          const userId = access.user_id || 'unknown'
          accessByUser.set(userId, (accessByUser.get(userId) || 0) + 1)
        }

        for (const [userId, count] of accessByUser.entries()) {
          if (count >= 100) { // Unusually high access
            await this.createAlert(
              SecurityIncidentType.ANOMALOUS_BEHAVIOR,
              IncidentSeverity.MEDIUM,
              `Unusual data access pattern for user ${userId}`,
              `${count} data access events detected in the last hour`,
              'security_monitor',
              { userId }
            )
          }
        }
      }
    } catch (error) {
      console.error('Error checking suspicious patterns:', error)
    }
  }

  private async saveIncident(incident: SecurityIncident): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_incidents')
        .upsert({
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
        })
    } catch (error) {
      console.error('Error saving incident:', error)
    }
  }

  private async saveAlert(alert: SecurityAlert): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_alerts')
        .upsert({
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
        })
    } catch (error) {
      console.error('Error saving alert:', error)
    }
  }

  private async saveEvidence(evidence: SecurityEvidence): Promise<void> {
    try {
      await supabaseAdmin
        .from('security_evidence')
        .insert({
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
        })
    } catch (error) {
      console.error('Error saving evidence:', error)
    }
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor()

export default securityMonitor