/**
 * Security Incident Response - Procedure Execution
 *
 * Standalone helpers for executing response procedures, building the default
 * procedure templates, and logging executions. Extracted from
 * incident-response.ts. Functions take plan/template state as parameters so
 * they can be unit tested in isolation.
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  IncidentType,
  ProcedureExecutionResult,
  ResponseProcedure
} from './incident-types'

/**
 * Build the default set of response procedures per incident type. These power
 * the response templates map on the incident response manager.
 */
export function buildResponseTemplates(): Map<string, ResponseProcedure[]> {
  const templates = new Map<string, ResponseProcedure[]>()

  // Data breach response procedures
  templates.set(IncidentType.DATA_BREACH, [
    {
      step: 1,
      action: 'Immediate containment',
      responsible: 'incident_commander',
      deadline: 15,
      dependencies: [],
      automated: true,
      script: 'isolate_affected_systems.sh',
      verification: 'Systems isolated and access logs preserved'
    },
    {
      step: 2,
      action: 'Assess data exposure',
      responsible: 'security_analyst',
      deadline: 60,
      dependencies: [1],
      automated: false,
      verification: 'Data exposure assessment completed'
    },
    {
      step: 3,
      action: 'Notify data protection officer',
      responsible: 'incident_commander',
      deadline: 30,
      dependencies: [2],
      automated: true,
      script: 'notify_dpo.py',
      verification: 'DPO notification sent and acknowledged'
    },
    {
      step: 4,
      action: 'Begin forensic analysis',
      responsible: 'security_analyst',
      deadline: 240,
      dependencies: [1, 2],
      automated: false,
      verification: 'Forensic evidence collected and preserved'
    },
    {
      step: 5,
      action: 'Prepare regulatory notifications',
      responsible: 'legal',
      deadline: 480,
      dependencies: [2, 3],
      automated: false,
      verification: 'Regulatory notification templates prepared'
    }
  ])

  // Unauthorized access response procedures
  templates.set(IncidentType.UNAUTHORIZED_ACCESS, [
    {
      step: 1,
      action: 'Disable compromised accounts',
      responsible: 'incident_commander',
      deadline: 10,
      dependencies: [],
      automated: true,
      script: 'disable_accounts.sh',
      verification: 'Compromised accounts disabled'
    },
    {
      step: 2,
      action: 'Analyze access patterns',
      responsible: 'security_analyst',
      deadline: 60,
      dependencies: [1],
      automated: false,
      verification: 'Access pattern analysis completed'
    },
    {
      step: 3,
      action: 'Review and update permissions',
      responsible: 'developers',
      deadline: 120,
      dependencies: [2],
      automated: false,
      verification: 'Permissions reviewed and updated'
    },
    {
      step: 4,
      action: 'Implement additional controls',
      responsible: 'security_analyst',
      deadline: 240,
      dependencies: [2, 3],
      automated: false,
      verification: 'Additional security controls implemented'
    }
  ])

  // Denial of service response procedures
  templates.set(IncidentType.DENIAL_OF_SERVICE, [
    {
      step: 1,
      action: 'Activate DDoS mitigation',
      responsible: 'incident_commander',
      deadline: 5,
      dependencies: [],
      automated: true,
      script: 'activate_ddos_mitigation.sh',
      verification: 'DDoS mitigation activated'
    },
    {
      step: 2,
      action: 'Analyze attack patterns',
      responsible: 'security_analyst',
      deadline: 30,
      dependencies: [1],
      automated: false,
      verification: 'Attack patterns analyzed'
    },
    {
      step: 3,
      action: 'Implement rate limiting',
      responsible: 'developers',
      deadline: 60,
      dependencies: [2],
      automated: true,
      script: 'implement_rate_limiting.py',
      verification: 'Rate limiting implemented'
    },
    {
      step: 4,
      action: 'Engage CDN provider',
      responsible: 'incident_commander',
      deadline: 15,
      dependencies: [1],
      automated: false,
      verification: 'CDN provider engaged'
    }
  ])

  return templates
}

/**
 * Return the fallback procedure list for an incident type that has no
 * dedicated template. These procedures form a sensible default response.
 */
export function getDefaultProcedures(_incidentType: IncidentType): ResponseProcedure[] {
  return [
    {
      step: 1,
      action: 'Assess incident impact',
      responsible: 'incident_commander',
      deadline: 60,
      dependencies: [],
      automated: false,
      verification: 'Impact assessment completed'
    },
    {
      step: 2,
      action: 'Implement containment',
      responsible: 'security_analyst',
      deadline: 120,
      dependencies: [1],
      automated: false,
      verification: 'Containment implemented'
    }
  ]
}

/**
 * Simulate execution of an automated procedure script. The real implementation
 * would shell out to the named script.
 */
export async function executeAutomatedProcedure(script: string): Promise<ProcedureExecutionResult> {
  // This would execute the actual script
  console.log(`Executing automated procedure: ${script}`)

  // Simulate execution
  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    status: 'completed',
    output: 'Procedure executed successfully',
    logs: 'Automated execution logs'
  }
}

/**
 * Simulate execution of a manual procedure by a human executor. The real
 * implementation would notify the responsible person and track completion.
 */
export async function executeManualProcedure(
  procedure: ResponseProcedure,
  executor: string
): Promise<ProcedureExecutionResult> {
  // This would notify the responsible person and track completion
  console.log(`Executing manual procedure: ${procedure.action} by ${executor}`)

  // Simulate manual execution
  await new Promise(resolve => setTimeout(resolve, 5000))

  return {
    status: 'completed',
    executor,
    notes: 'Manual procedure completed successfully'
  }
}

/**
 * Persist a record of a procedure execution to the database.
 */
export async function logProcedureExecution(
  incidentId: string,
  procedure: ResponseProcedure,
  executor: string,
  result: ProcedureExecutionResult
): Promise<void> {
  await supabaseAdmin.from('incident_procedure_logs').insert({
    incident_id: incidentId,
    procedure_step: procedure.step,
    action: procedure.action,
    executor,
    result,
    executed_at: new Date().toISOString()
  })
}
