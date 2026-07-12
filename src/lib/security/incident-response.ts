/**
 * Security Incident Response System
 *
 * This module provides comprehensive incident response procedures including:
 * - Incident classification and prioritization
 * - Automated response workflows
 * - Escalation procedures
 * - Communication protocols
 * - Forensic data collection
 * - Recovery and remediation
 *
 * The bulk of the logic has been extracted into focused modules:
 *   - ./incident-types         types, enums, and configuration
 *   - ./incident-helpers       standalone pure helpers
 *   - ./incident-procedures    response procedure templates + execution
 *   - ./incident-communications communication templates + delivery
 *   - ./incident-analysis      priority, escalation, team, and reporting
 *   - ./incident-recovery      recovery plans, resources, and follow-up
 *
 * Everything is re-exported here so existing imports from
 * '@/lib/security/incident-response' keep working. The IncidentResponseManager
 * class below now acts as a thin orchestrator that wires the active-incident
 * state to the extracted pure helpers.
 */

// Re-export everything from the extracted modules so existing imports from
// '@/lib/security/incident-response' continue to work unchanged.
export * from './incident-types'
export * from './incident-helpers'
export * from './incident-procedures'
export * from './incident-communications'
export * from './incident-analysis'
export * from './incident-recovery'

import {
  securityMonitor,
  SecurityIncident,
  IncidentStatus
} from '@/lib/audit/security-monitor'
import {
  IncidentType,
  Priority
} from './incident-types'
import type {
  CommunicationSender,
  IncidentResponsePlan,
  MessageData,
  ProcedureExecutionResult,
  ResponseProcedure
} from './incident-types'
import {
  buildResponseTemplates,
  executeAutomatedProcedure,
  executeManualProcedure,
  getDefaultProcedures,
  logProcedureExecution
} from './incident-procedures'
import {
  buildCommunicationTemplates,
  createDefaultDeliverer,
  notifyProcedureReady,
  sendCommunication as sendCommunicationHelper
} from './incident-communications'
import {
  allocateResources,
  archiveResponsePlan,
  createRecoveryPlan,
  initializeTimeline,
  loadActiveResponsePlans,
  saveResponsePlan,
  scheduleFollowUpActions
} from './incident-recovery'
import {
  assembleResponseTeam,
  checkEscalationTriggers as checkEscalationTriggersHelper,
  createEscalationPlan,
  determinePriority,
  generateFinalReport
} from './incident-analysis'
import { createCommunicationPlan } from './incident-communications'

/**
 * Incident Response Manager
 *
 * Thin orchestrator that owns the active incident state and communication
 * delivery callback, delegating the actual work to the extracted helper
 * modules. Behaviour is unchanged from the original monolithic class.
 */
export class IncidentResponseManager {
  private activeIncidents: Map<string, IncidentResponsePlan> = new Map()
  private responseTemplates: Map<string, ResponseProcedure[]> = new Map()
  private communicationTemplates: Map<string, Record<string, string>> = new Map()
  private readonly deliver: CommunicationSender

  constructor() {
    this.responseTemplates = buildResponseTemplates()
    this.communicationTemplates = buildCommunicationTemplates()
    this.deliver = createDefaultDeliverer()
    this.loadActiveIncidents()
  }

  /**
   * Create incident response plan
   */
  async createResponsePlan(incident: SecurityIncident): Promise<IncidentResponsePlan> {
    try {
      // Determine priority based on severity and impact
      const priority = determinePriority(incident)
      const incidentType = incident.type as unknown as IncidentType

      // Assemble response team
      const responseTeam = assembleResponseTeam(incidentType)

      // Get response procedures
      const procedures
        = this.responseTemplates.get(incidentType) || getDefaultProcedures(incidentType)

      // Create communication plan
      const communications = createCommunicationPlan(priority)

      // Create escalation plan
      const escalation = createEscalationPlan(incidentType, priority)

      // Create recovery plan
      const recovery = createRecoveryPlan(incidentType, priority)

      // Initialize timeline
      const timeline = initializeTimeline(incident, priority)

      // Allocate resources
      const resources = allocateResources(incident, priority)

      const responsePlan: IncidentResponsePlan = {
        incidentId: incident.id,
        type: incidentType,
        severity: incident.severity,
        priority,
        responseTeam,
        procedures,
        communications,
        escalation,
        recovery,
        timeline,
        resources
      }

      // Store response plan
      this.activeIncidents.set(incident.id, responsePlan)

      // Save to database
      await saveResponsePlan(responsePlan)

      // Initialize response
      await this.initializeResponse(responsePlan)

      return responsePlan
    } catch (error) {
      console.error('Error creating response plan:', error)
      throw error
    }
  }

  /**
   * Execute response procedure
   */
  async executeProcedure(
    incidentId: string,
    stepNumber: number,
    executor: string
  ): Promise<{
    success: boolean
    result?: ProcedureExecutionResult
    error?: string
  }> {
    try {
      const plan = this.activeIncidents.get(incidentId)
      if (!plan) {
        return {
          success: false,
          error: 'Incident response plan not found'
        }
      }

      const procedure = plan.procedures.find(p => p.step === stepNumber)
      if (!procedure) {
        return {
          success: false,
          error: 'Procedure step not found'
        }
      }

      // Check dependencies
      const dependenciesMet = procedure.dependencies.every(dep => {
        const depProcedure = plan.procedures.find(p => p.step === dep)
        return (
          depProcedure
          && plan.timeline.milestones.find(m => m.name === depProcedure.action)?.status === 'completed'
        )
      })

      if (!dependenciesMet) {
        return {
          success: false,
          error: 'Dependencies not met'
        }
      }

      // Execute procedure
      let result
      if (procedure.automated && procedure.script) {
        result = await executeAutomatedProcedure(procedure.script)
      } else {
        result = await executeManualProcedure(procedure, executor)
      }

      // Update timeline
      const milestone = plan.timeline.milestones.find(m => m.name === procedure.action)
      if (milestone) {
        milestone.status = 'completed'
        milestone.responsible = executor
      }

      // Log execution
      await logProcedureExecution(incidentId, procedure, executor, result)

      // Check for next steps
      await this.checkNextSteps(incidentId, stepNumber)

      return {
        success: true,
        result
      }
    } catch (error) {
      console.error('Error executing procedure:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check escalation triggers
   */
  async checkEscalationTriggers(incidentId: string): Promise<{
    escalationRequired: boolean
    level?: number
    reason?: string
  }> {
    const plan = this.activeIncidents.get(incidentId)
    if (!plan) {
      return { escalationRequired: false }
    }

    return checkEscalationTriggersHelper(incidentId, plan.escalation)
  }

  /**
   * Send communication
   */
  async sendCommunication(
    incidentId: string,
    type: 'internal' | 'external' | 'regulatory',
    template: string,
    recipients: string[],
    data: MessageData
  ): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    const plan = this.activeIncidents.get(incidentId)
    if (!plan) {
      return {
        success: false,
        error: 'Incident response plan not found'
      }
    }

    return sendCommunicationHelper(
      incidentId,
      type,
      template,
      recipients,
      data,
      plan,
      this.communicationTemplates,
      this.deliver
    )
  }

  /**
   * Complete incident response
   */
  async completeResponse(
    incidentId: string,
    lessons: string[]
  ): Promise<{
    success: boolean
    finalReport?: string
    error?: string
  }> {
    try {
      const plan = this.activeIncidents.get(incidentId)
      if (!plan) {
        return {
          success: false,
          error: 'Incident response plan not found'
        }
      }

      // Generate final report
      const finalReport = await generateFinalReport(plan, lessons)

      // Update incident status
      await securityMonitor.updateIncidentStatus(
        incidentId,
        IncidentStatus.RESOLVED,
        'incident_response_system',
        'Incident response completed'
      )

      // Archive response plan
      await archiveResponsePlan(plan, finalReport)

      // Remove from active incidents
      this.activeIncidents.delete(incidentId)

      // Schedule follow-up actions
      await scheduleFollowUpActions(plan, lessons)

      return {
        success: true,
        finalReport
      }
    } catch (error) {
      console.error('Error completing response:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Private orchestration helpers that depend on manager state.
   */

  private async initializeResponse(plan: IncidentResponsePlan): Promise<void> {
    // Send initial notifications
    await this.sendCommunication(
      plan.incidentId,
      'internal',
      'internal_detection',
      plan.responseTeam.securityAnalyst,
      {
        commander: plan.responseTeam.incidentCommander,
        channel: 'security-incident-response'
      }
    )

    // Update incident status
    await securityMonitor.updateIncidentStatus(
      plan.incidentId,
      IncidentStatus.INVESTIGATING,
      'incident_response_system',
      'Response plan initialized'
    )
  }

  private async checkNextSteps(incidentId: string, completedStep: number): Promise<void> {
    const plan = this.activeIncidents.get(incidentId)
    if (!plan) {
      return
    }

    // Find procedures that can now be executed
    const executableProcedures = plan.procedures.filter(
      p =>
        p.dependencies.includes(completedStep)
        && plan.timeline.milestones.find(m => m.name === p.action)?.status === 'pending'
    )

    for (const procedure of executableProcedures) {
      // Update milestone status
      const milestone = plan.timeline.milestones.find(m => m.name === procedure.action)
      if (milestone) {
        milestone.status = 'in_progress'
        milestone.responsible = procedure.responsible
      }

      // Notify responsible person
      await notifyProcedureReady(
        incidentId,
        procedure.action,
        procedure.deadline,
        procedure.dependencies,
        procedure.responsible,
        plan,
        this.communicationTemplates,
        this.deliver
      )
    }
  }

  private async loadActiveIncidents(): Promise<void> {
    try {
      const plans = await loadActiveResponsePlans()
      for (const plan of plans) {
        this.activeIncidents.set(plan.incidentId, plan)
      }
    } catch (error) {
      console.error('Error loading active incidents:', error)
    }
  }
}

// Global incident response manager instance
export const incidentResponseManager = new IncidentResponseManager()

export default incidentResponseManager
