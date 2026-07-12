/**
 * Security Incident Response - Types and Interfaces
 *
 * This module contains all type definitions, enums, and configuration
 * constants used by the incident response system.
 */

import type { IncidentSeverity } from '@/lib/audit/security-monitor'

// Incident response interfaces
export interface IncidentResponsePlan {
  incidentId: string
  type: IncidentType
  severity: IncidentSeverity
  priority: Priority
  responseTeam: ResponseTeam
  procedures: ResponseProcedure[]
  communications: CommunicationPlan
  escalation: EscalationPlan
  recovery: RecoveryPlan
  timeline: ResponseTimeline
  resources: IncidentResources
}

export interface ResponseTeam {
  incidentCommander: string
  securityAnalyst: string[]
  developers: string[]
  communications: string[]
  legal: string[]
  management: string[]
  external: string[]
}

export interface ResponseProcedure {
  step: number
  action: string
  responsible: string
  deadline: number // minutes from detection
  dependencies: number[]
  automated: boolean
  script?: string
  verification: string
}

export interface CommunicationPlan {
  internal: {
    channels: string[]
    templates: Record<string, string>
    frequency: string
  }
  external: {
    channels: string[]
    templates: Record<string, string>
    conditions: string[]
    approvals: string[]
  }
  regulatory: {
    timeframes: Record<string, number> // hours
    templates: Record<string, string>
    authorities: string[]
  }
}

export interface EscalationPlan {
  triggers: EscalationTrigger[]
  levels: EscalationLevel[]
  approvals: string[]
  external: {
    conditions: string[]
    contacts: string[]
    procedures: string[]
  }
}

export interface RecoveryPlan {
  containment: ContainmentProcedure[]
  eradication: EradicationProcedure[]
  recovery: RecoveryProcedure[]
  lessons: LessonsLearnedProcedure[]
  validation: ValidationProcedure[]
}

export interface ResponseTimeline {
  detected: Date
  acknowledged: Date
  contained: Date
  eradicated: Date
  recovered: Date
  closed: Date
  milestones: TimelineMilestone[]
}

export interface IncidentResources {
  personnel: PersonnelResource[]
  systems: SystemResource[]
  tools: ToolResource[]
  external: ExternalResource[]
  budget: BudgetResource
}

// Enums and types
export enum IncidentType {
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALICIOUS_ACTIVITY = 'malicious_activity',
  SYSTEM_COMPROMISE = 'system_compromise',
  DENIAL_OF_SERVICE = 'denial_of_service',
  PRIVACY_VIOLATION = 'privacy_violation',
  INSIDER_THREAT = 'insider_threat',
  PHISHING_ATTEMPT = 'phishing_attempt',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior'
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface EscalationTrigger {
  condition: string
  threshold: number
  timeframe: number // minutes
  action: string
}

export interface EscalationLevel {
  level: number
  name: string
  criteria: string[]
  notifications: string[]
  approvals: string[]
  authorities: string[]
}

export interface ContainmentProcedure {
  action: string
  description: string
  responsible: string
  timeframe: number
  automated: boolean
  script?: string
}

export interface EradicationProcedure {
  action: string
  description: string
  responsible: string
  timeframe: number
  dependencies: string[]
}

export interface RecoveryProcedure {
  action: string
  description: string
  responsible: string
  timeframe: number
  dependencies?: string[]
  validation: string
}

export interface LessonsLearnedProcedure {
  action: string
  description: string
  responsible: string
  timeframe: number
  deliverables: string[]
}

export interface ValidationProcedure {
  action: string
  description: string
  responsible: string
  criteria: string[]
  timeframe: number
}

export interface TimelineMilestone {
  name: string
  description: string
  deadline: Date
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  responsible: string
}

export interface PersonnelResource {
  role: string
  name: string
  contact: string
  availability: string
  skills: string[]
}

export interface SystemResource {
  system: string
  purpose: string
  status: string
  backup: boolean
  recovery: string
}

export interface ToolResource {
  name: string
  purpose: string
  availability: string
  license: string
  training: string
}

export interface ExternalResource {
  type: string
  name: string
  contact: string
  agreement: string
  cost: string
}

export interface BudgetResource {
  emergency: number
  investigation: number
  recovery: number
  communication: number
  total: number
}

/**
 * Result of executing an automated or manual response procedure.
 */
export interface ProcedureExecutionResult {
  status: string
  output?: string
  logs?: string
  executor?: string
  notes?: string
}

/**
 * Free-form values used to fill communication template placeholders.
 * Values are coerced to strings during substitution, so any JSON-serializable
 * shape is accepted (strings, numbers, enums, arrays of dependencies, etc.).
 */
export type MessageData = Record<string, unknown>

/**
 * Callback used to deliver a formatted communication. The incident response
 * manager supplies this so the communication module can stay free of manager
 * state while still invoking the real delivery path.
 */
export type CommunicationSender = (
  type: string,
  recipients: string[],
  message: string,
  plan: IncidentResponsePlan
) => Promise<string>

// Incident response configuration
export const INCIDENT_RESPONSE_CONFIG = {
  // Response timeframes (in minutes)
  timeframes: {
    critical: {
      detection: 5,
      acknowledgement: 15,
      containment: 60,
      eradication: 240,
      recovery: 480
    },
    high: {
      detection: 15,
      acknowledgement: 30,
      containment: 120,
      eradication: 480,
      recovery: 960
    },
    medium: {
      detection: 60,
      acknowledgement: 120,
      containment: 240,
      eradication: 960,
      recovery: 1920
    },
    low: {
      detection: 240,
      acknowledgement: 480,
      containment: 960,
      eradication: 1920,
      recovery: 3840
    }
  },

  // Communication channels
  communications: {
    internal: ['slack', 'email', 'teams', 'phone'],
    external: ['email', 'press_release', 'social_media', 'website'],
    regulatory: ['email', 'portal', 'phone', 'certified_mail']
  },

  // Escalation triggers
  escalation: {
    data_breach: {
      records_threshold: 1000,
      pii_threshold: 100,
      timeframe: 60 // minutes
    },
    system_compromise: {
      systems_threshold: 3,
      critical_systems: 1,
      timeframe: 30
    },
    denial_of_service: {
      availability_threshold: 50, // percentage
      timeframe: 15
    }
  }
}
