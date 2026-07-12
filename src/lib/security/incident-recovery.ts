/**
 * Security Incident Response - Recovery, Resources, and Closure
 *
 * Standalone helpers for building recovery plans, allocating incident
 * resources, computing response timelines, persisting response plans and
 * archives, and scheduling follow-up actions after closure. Extracted from
 * incident-response.ts.
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  INCIDENT_RESPONSE_CONFIG,
  IncidentResources,
  IncidentType,
  Priority,
  RecoveryPlan,
  ResponseTimeline
} from './incident-types'
import type { IncidentResponsePlan } from './incident-types'
import type { SecurityIncident } from '@/lib/audit/security-monitor'

/**
 * Build the default recovery plan (containment, eradication, recovery,
 * lessons learned, and validation) for an incident.
 */
export function createRecoveryPlan(
  _incidentType: IncidentType,
  _priority: Priority
): RecoveryPlan {
  return {
    containment: [
      {
        action: 'Isolate affected systems',
        description: 'Disconnect affected systems from network',
        responsible: 'infrastructure_team',
        timeframe: 30,
        automated: true,
        script: 'isolate_systems.sh'
      },
      {
        action: 'Preserve evidence',
        description: 'Collect and preserve forensic evidence',
        responsible: 'security_analyst',
        timeframe: 60,
        automated: false
      }
    ],
    eradication: [
      {
        action: 'Remove malicious code',
        description: 'Remove all malicious code and backdoors',
        responsible: 'security_analyst',
        timeframe: 240,
        dependencies: ['evidence_preserved']
      },
      {
        action: 'Patch vulnerabilities',
        description: 'Apply security patches to vulnerabilities',
        responsible: 'developers',
        timeframe: 480,
        dependencies: ['malicious_code_removed']
      }
    ],
    recovery: [
      {
        action: 'Restore systems',
        description: 'Restore systems from clean backups',
        responsible: 'infrastructure_team',
        timeframe: 120,
        dependencies: ['vulnerabilities_patched'],
        validation: 'Systems operational and secure'
      },
      {
        action: 'Monitor for recurrence',
        description: 'Implement enhanced monitoring',
        responsible: 'security_analyst',
        timeframe: 240,
        dependencies: ['systems_restored'],
        validation: 'No suspicious activity detected for 24 hours'
      }
    ],
    lessons: [
      {
        action: 'Conduct post-mortem',
        description: 'Analyze incident and identify lessons learned',
        responsible: 'incident_commander',
        timeframe: 168, // 1 week
        deliverables: ['incident_report', 'recommendations', 'action_items']
      }
    ],
    validation: [
      {
        action: 'Security assessment',
        description: 'Conduct comprehensive security assessment',
        responsible: 'external_auditor',
        timeframe: 720, // 1 month
        criteria: ['no_vulnerabilities', 'compliance_verified', 'controls_effective']
      }
    ]
  }
}

/**
 * Compute the response timeline (detection -> closure) using the configured
 * timeframes for the incident's priority.
 */
export function initializeTimeline(
  incident: SecurityIncident,
  priority: Priority
): ResponseTimeline {
  const now = new Date()
  const timeframes = INCIDENT_RESPONSE_CONFIG.timeframes[priority]

  return {
    detected: incident.detectedAt,
    acknowledged: new Date(now.getTime() + timeframes.acknowledgement * 60 * 1000),
    contained: new Date(now.getTime() + timeframes.containment * 60 * 1000),
    eradicated: new Date(now.getTime() + timeframes.eradication * 60 * 1000),
    recovered: new Date(now.getTime() + timeframes.recovery * 60 * 1000),
    closed: new Date(now.getTime() + (timeframes.recovery + 240) * 60 * 1000), // +4 hours for documentation
    milestones: []
  }
}

/**
 * Allocate the default incident resources (personnel, systems, tools, budget)
 * for a new response plan.
 */
export function allocateResources(
  _incident: SecurityIncident,
  _priority: Priority
): IncidentResources {
  return {
    personnel: [
      {
        role: 'Incident Commander',
        name: 'Security Lead',
        contact: 'security-lead@openrelief.org',
        availability: '24/7',
        skills: ['incident_management', 'security_analysis', 'team_coordination']
      }
    ],
    systems: [
      {
        system: 'Security Monitoring Platform',
        purpose: 'Real-time threat detection',
        status: 'operational',
        backup: true,
        recovery: 'automatic_failover'
      }
    ],
    tools: [
      {
        name: 'Forensic Analysis Suite',
        purpose: 'Evidence collection and analysis',
        availability: 'on_demand',
        license: 'enterprise',
        training: 'certified_analysts'
      }
    ],
    external: [],
    budget: {
      emergency: 50000,
      investigation: 25000,
      recovery: 75000,
      communication: 10000,
      total: 160000
    }
  }
}

/**
 * Persist a newly created response plan to the database.
 */
export async function saveResponsePlan(plan: IncidentResponsePlan): Promise<void> {
  await supabaseAdmin.from('incident_response_plans').insert({
    incident_id: plan.incidentId,
    plan_data: plan,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
}

/**
 * Archive a completed response plan along with its final report.
 */
export async function archiveResponsePlan(
  plan: IncidentResponsePlan,
  finalReport: string
): Promise<void> {
  await supabaseAdmin.from('incident_response_archives').insert({
    incident_id: plan.incidentId,
    plan_data: plan,
    final_report: finalReport,
    archived_at: new Date().toISOString()
  })
}

/**
 * Schedule the standard follow-up actions after an incident is closed
 * (security policy update within 30 days, external assessment within 90 days).
 */
export async function scheduleFollowUpActions(
  plan: IncidentResponsePlan,
  _lessons: string[]
): Promise<void> {
  const followUpActions = [
    {
      action: 'Update security policies',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      responsible: 'security_lead'
    },
    {
      action: 'Conduct security assessment',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      responsible: 'external_auditor'
    }
  ]

  for (const action of followUpActions) {
    await supabaseAdmin.from('incident_follow_up_actions').insert({
      incident_id: plan.incidentId,
      action: action.action,
      due_date: action.dueDate.toISOString(),
      responsible: action.responsible,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  }
}

/**
 * Load any response plans flagged as active from the database. Useful for
 * hydrating the manager's active-incident map on startup.
 */
export async function loadActiveResponsePlans(): Promise<IncidentResponsePlan[]> {
  const { data, error } = await supabaseAdmin
    .from('incident_response_plans')
    .select('*')
    .is('status', 'active')

  if (error) {
    throw error
  }

  return (data || []).map((planData: Record<string, unknown>) => planData.plan_data as IncidentResponsePlan)
}
