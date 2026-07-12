/**
 * Security Incident Monitoring System - Types
 *
 * Type definitions for the security incident monitoring system.
 */

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
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  // Additional alert types used throughout the application
  API_ACCESS = 'api_access',
  DATABASE_ERROR = 'database_error',
  SYSTEM_ERROR = 'system_error',
  SUCCESSFUL_LOGIN = 'successful_login',
  FAILED_LOGIN = 'failed_login',
  SESSION_INVALIDATED = 'session_invalidated',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
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
  id: string
  type: SecurityIncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  impact: IncidentImpact

  // Basic information
  title: string
  description: string
  detectedAt: Date
  reportedBy?: string

  // Technical details
  sourceIpAddress?: string
  targetSystem?: string
  affectedUsers?: string[]
  affectedData?: string[]
  attackVector?: string
  indicators?: string[]

  // Investigation details
  assignedTo?: string
  investigatedBy?: string
  investigationNotes?: Array<{
    timestamp: Date
    userId: string
    notes: string
    statusChange?: string
  }>
  evidence?: SecurityEvidence[]

  // Resolution details
  resolvedAt?: Date
  resolvedBy?: string
  resolution?: string
  lessonsLearned?: string

  // Impact assessment
  dataBreach?: boolean
  recordsAffected?: number
  financialImpact?: number
  reputationalImpact?: 'none' | 'low' | 'medium' | 'high'

  // Notifications
  notificationsSent: boolean
  stakeholdersNotified: boolean[]

  // Metadata
  tags?: string[]
  relatedIncidents?: string[]
  metadata?: Record<string, unknown>

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Security evidence interface
export interface SecurityEvidence {
  id: string
  incidentId: string
  type: 'log' | 'screenshot' | 'network_capture' | 'file' | 'memory_dump' | 'system_state'
  description: string
  filePath?: string
  url?: string
  hash?: string
  timestamp: Date
  collectedBy: string
  preserved: boolean
}

// Security alert interface
export interface SecurityAlert {
  id: string
  type: SecurityIncidentType
  severity: IncidentSeverity
  title: string
  description: string
  source: string
  timestamp: Date
  userId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  falsePositive: boolean
  resolved: boolean
  resolvedAt?: Date
}

// Threat intelligence interface
export interface ThreatIntelligence {
  id: string
  indicatorType: 'ip' | 'domain' | 'hash' | 'url' | 'email'
  indicator: string
  threatType: string
  severity: IncidentSeverity
  confidence: number // 0-100
  source: string
  description: string
  firstSeen: Date
  lastSeen: Date
  tags: string[]
  active: boolean
}

// Security metrics interface
export interface SecurityMetrics {
  timeRange: {
    start: Date
    end: Date
  }
  totalIncidents: number
  incidentsByType: Record<SecurityIncidentType, number>
  incidentsBySeverity: Record<IncidentSeverity, number>
  averageResolutionTime: number // hours
  unresolvedIncidents: number
  criticalIncidents: number
  dataBreaches: number
  usersAffected: number
  systemsAffected: number
  threatsBlocked: number
  falsePositiveRate: number
}
