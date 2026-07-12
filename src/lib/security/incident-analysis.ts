/**
 * Security Incident Response - Analysis, Triage, and Reporting
 *
 * Standalone helpers for analysing an incident, deciding its priority,
 * assembling the response team, building escalation plans, evaluating
 * escalation triggers, and generating final reports + recommendations.
 * Extracted from incident-response.ts.
 */

import {
  IncidentType,
  Priority
} from './incident-types'
import type {
  EscalationPlan,
  EscalationTrigger,
  IncidentResponsePlan,
  ResponseTeam
} from './incident-types'
import type { SecurityIncident } from '@/lib/audit/security-monitor'
import { IncidentSeverity } from '@/lib/audit/security-monitor'

/**
 * Determine the response priority for an incident based on its severity and
 * impact. Mirrors the original `IncidentResponseManager.determinePriority`
 * logic exactly.
 */
export function determinePriority(incident: SecurityIncident): Priority {
  const severityPriority = {
    [IncidentSeverity.CRITICAL]: Priority.CRITICAL,
    [IncidentSeverity.HIGH]: Priority.HIGH,
    [IncidentSeverity.MEDIUM]: Priority.MEDIUM,
    [IncidentSeverity.LOW]: Priority.LOW
  }

  let priority = severityPriority[incident.severity]

  // Adjust priority based on impact
  if (incident.impact === 'severe' && priority !== Priority.CRITICAL) {
    priority = Priority.HIGH
  }

  // Adjust based on affected users
  if (incident.affectedUsers && incident.affectedUsers.length > 1000) {
    if (priority !== Priority.CRITICAL) {
      priority = Priority.HIGH
    }
  }

  return priority
}

/**
 * Build the standard escalation plan for an incident. Currently the plan is
 * the same regardless of incident type/priority, mirroring the original
 * implementation, but the parameters are kept so the caller can specialise
 * the plan later without changing call sites.
 */
export function createEscalationPlan(
  _incidentType: IncidentType,
  _priority: Priority
): EscalationPlan {
  return {
    triggers: [
      {
        condition: 'containment_failed',
        threshold: 1,
        timeframe: 60,
        action: 'escalate_to_management'
      },
      {
        condition: 'breach_size_exceeded',
        threshold: 1000,
        timeframe: 60,
        action: 'escalate_to_executive'
      }
    ],
    levels: [
      {
        level: 1,
        name: 'Standard Response',
        criteria: ['initial_detection'],
        notifications: ['incident_commander', 'security_team'],
        approvals: [],
        authorities: []
      },
      {
        level: 2,
        name: 'Management Escalation',
        criteria: ['containment_failed', 'breach_size_exceeded'],
        notifications: ['cto', 'legal', 'comms'],
        approvals: ['cto'],
        authorities: []
      },
      {
        level: 3,
        name: 'Executive Escalation',
        criteria: ['regulatory_required', 'brand_impact'],
        notifications: ['ceo', 'board', 'legal', 'pr'],
        approvals: ['ceo', 'board'],
        authorities: ['regulators', 'law_enforcement']
      }
    ],
    approvals: ['incident_commander'],
    external: {
      conditions: ['executive_escalation'],
      contacts: ['forensics_firm', 'legal_counsel', 'pr_agency'],
      procedures: ['engage_external_experts', 'regulatory_notification']
    }
  }
}

/**
 * Assemble the cross-functional response team for the given incident type.
 * Falls back to the unauthorized-access roster when no dedicated team exists.
 */
export function assembleResponseTeam(incidentType: IncidentType): ResponseTeam {
  const teams = {
    [IncidentType.DATA_BREACH]: {
      incidentCommander: 'security-lead',
      securityAnalyst: ['security-analyst-1', 'security-analyst-2'],
      developers: ['backend-lead', 'database-admin'],
      communications: ['comms-lead'],
      legal: ['legal-counsel'],
      management: ['cto', 'ceo'],
      external: ['forensics-firm', 'legal-counsel']
    },
    [IncidentType.UNAUTHORIZED_ACCESS]: {
      incidentCommander: 'security-lead',
      securityAnalyst: ['security-analyst-1'],
      developers: ['backend-lead', 'auth-engineer'],
      communications: ['comms-lead'],
      legal: [],
      management: ['cto'],
      external: []
    },
    [IncidentType.DENIAL_OF_SERVICE]: {
      incidentCommander: 'infrastructure-lead',
      securityAnalyst: ['security-analyst-1', 'network-engineer'],
      developers: ['backend-lead', 'cdn-engineer'],
      communications: ['comms-lead'],
      legal: [],
      management: ['cto'],
      external: ['ddos-mitigation-provider']
    }
  }

  const teamsRecord = teams as Record<string, (typeof teams)[keyof typeof teams]>
  return (teamsRecord[incidentType] ?? teamsRecord[IncidentType.UNAUTHORIZED_ACCESS])!
}

/**
 * Evaluate whether an escalation trigger condition is currently met. The real
 * implementation would inspect live incident telemetry; for now this always
 * returns false, mirroring the original placeholder behaviour.
 */
export async function evaluateTrigger(
  _incidentId: string,
  _trigger: EscalationTrigger
): Promise<boolean> {
  // This would evaluate the actual trigger condition
  // Simplified implementation for demonstration
  return false
}

/**
 * Inspect an incident's escalation triggers and report whether escalation is
 * required. Returns the matching escalation level and reason when a trigger
 * fires.
 */
export async function checkEscalationTriggers(
  incidentId: string,
  escalation: EscalationPlan
): Promise<{
  escalationRequired: boolean
  level?: number
  reason?: string
}> {
  for (const trigger of escalation.triggers) {
    if (await evaluateTrigger(incidentId, trigger)) {
      const level = escalation.levels.find(l => l.criteria.includes(trigger.condition))

      return {
        escalationRequired: true,
        level: level?.level,
        reason: `Escalation trigger met: ${trigger.condition}`
      }
    }
  }

  return { escalationRequired: false }
}

/**
 * Generate a list of recommendations for the post-incident report.
 */
export function generateRecommendations(
  _plan: IncidentResponsePlan,
  _lessons: string[]
): string[] {
  return [
    'Review and update incident response procedures',
    'Implement additional security controls',
    'Conduct security awareness training',
    'Enhance monitoring and detection capabilities'
  ]
}

/**
 * Assemble the final incident report as a pretty-printed JSON document.
 */
export async function generateFinalReport(
  plan: IncidentResponsePlan,
  lessons: string[]
): Promise<string> {
  const report = {
    incidentId: plan.incidentId,
    type: plan.type,
    severity: plan.severity,
    priority: plan.priority,
    timeline: plan.timeline,
    responseTeam: plan.responseTeam,
    proceduresExecuted: plan.procedures,
    communications: plan.communications,
    lessonsLearned: lessons,
    recommendations: generateRecommendations(plan, lessons),
    createdAt: new Date().toISOString()
  }

  return JSON.stringify(report, null, 2)
}
