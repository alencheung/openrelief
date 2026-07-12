/**
 * Security Incident Response - Communications
 *
 * Standalone helpers for formatting and sending incident communications,
 * building the default communication template set, and logging messages.
 * Extracted from incident-response.ts.
 */

import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type {
  CommunicationPlan,
  CommunicationSender,
  IncidentResponsePlan,
  MessageData
} from './incident-types'
import { INCIDENT_RESPONSE_CONFIG, Priority } from './incident-types'

/**
 * Build the default set of communication templates used when sending
 * internal, external, or regulatory notifications.
 */
export function buildCommunicationTemplates(): Map<string, Record<string, string>> {
  const templates = new Map<string, Record<string, string>>()

  templates.set('internal_detection', {
    subject: 'SECURITY INCIDENT: {incident_type} detected',
    body: 'A {severity} security incident has been detected:\n\nType: {incident_type}\nSeverity: {severity}\nDescription: {description}\nDetected: {timestamp}\nIncident Commander: {commander}\n\nImmediate action required. Join incident response channel: {channel}'
  })

  templates.set('external_breach', {
    subject: 'Security Incident Notification',
    body: 'We are writing to inform you of a security incident that may have affected your personal information. We are taking this matter very seriously and have implemented additional security measures. For more information, please visit: {website}/incident-{incident_id}'
  })

  templates.set('regulatory_notification', {
    subject: 'Security Incident Report - {incident_type}',
    body: 'Pursuant to {regulation}, we are reporting a security incident:\n\nIncident Type: {incident_type}\nDate Detected: {date}\nIndividuals Affected: {affected_count}\nData Types: {data_types}\nMeasures Taken: {measures}\nContact: {contact}'
  })

  return templates
}

/**
 * Substitute `{placeholder}` tokens in a template string with the matching
 * values from `data`. Values are coerced to strings.
 */
export function formatMessage(template: string, data: Record<string, unknown>): string {
  let message = template

  for (const [key, value] of Object.entries(data)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), String(value))
  }

  return message
}

/**
 * Persist a record of a sent communication to the database.
 */
export async function logCommunication(
  incidentId: string,
  type: string,
  template: string,
  recipients: string[],
  message: string
): Promise<void> {
  await supabaseAdmin.from('incident_communications').insert({
    incident_id: incidentId,
    communication_type: type,
    template,
    recipients,
    message,
    sent_at: new Date().toISOString()
  })
}

/**
 * Generate a delivery callback that produces a unique message id. The real
 * implementation would route the message through the configured channels;
 * for now it logs the send and returns the id.
 */
export function createDefaultDeliverer(): CommunicationSender {
  return async (
    type: string,
    recipients: string[],
    message: string,
    _plan: IncidentResponsePlan
  ): Promise<string> => {
    const messageId = randomBytes(16).toString('hex')

    // This would actually send the communication via the appropriate channels
    console.log(`Sending ${type} communication to ${recipients.join(', ')}`)
    console.log(`Message: ${message}`)

    return messageId
  }
}

/**
 * Resolve the template, format the message, deliver it, and log the
 * communication. Returns the message id (or an error) just like the original
 * `IncidentResponseManager.sendCommunication` method.
 */
export async function sendCommunication(
  incidentId: string,
  type: 'internal' | 'external' | 'regulatory',
  template: string,
  recipients: string[],
  data: MessageData,
  plan: IncidentResponsePlan,
  communicationTemplates: Map<string, Record<string, string>>,
  deliver: CommunicationSender
): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    // Get communication template
    const templateData = communicationTemplates.get(template)
    if (!templateData) {
      return {
        success: false,
        error: 'Communication template not found'
      }
    }

    // Format message
    const message = formatMessage(templateData.body || '', {
      ...data,
      incident_id: incidentId,
      incident_type: plan.type,
      severity: plan.severity,
      priority: plan.priority,
      timestamp: new Date().toISOString()
    })

    // Send communication
    const messageId = await deliver(type, recipients, message, plan)

    // Log communication
    await logCommunication(incidentId, type, template, recipients, message)

    return {
      success: true,
      messageId
    }
  } catch (error) {
    console.error('Error sending communication:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Notify the stakeholders assigned to a procedure's next steps. Used by the
 * procedure execution flow to alert responsible parties when their step is
 * unblocked.
 */
export async function notifyProcedureReady(
  incidentId: string,
  action: string,
  deadline: number,
  dependencies: number[],
  responsible: string,
  plan: IncidentResponsePlan,
  communicationTemplates: Map<string, Record<string, string>>,
  deliver: CommunicationSender
): Promise<void> {
  await sendCommunication(
    incidentId,
    'internal',
    'internal_update',
    [responsible],
    {
      action,
      deadline,
      dependencies
    },
    plan,
    communicationTemplates,
    deliver
  )
}

/**
 * Build the standard communication plan for a new incident response. Kept here
 * with the other communication helpers, although it is also used by the
 * response plan builder.
 */
export function createCommunicationPlan(priority: Priority): CommunicationPlan {
  return {
    internal: {
      channels: INCIDENT_RESPONSE_CONFIG.communications.internal,
      templates: {
        detection: 'internal_detection',
        update: 'internal_update',
        resolution: 'internal_resolution'
      },
      frequency: priority === Priority.CRITICAL ? '15min' : '1hour'
    },
    external: {
      channels: INCIDENT_RESPONSE_CONFIG.communications.external,
      templates: {
        breach: 'external_breach',
        outage: 'external_outage',
        resolution: 'external_resolution'
      },
      conditions: ['data_breach', 'system_compromise'],
      approvals: ['ceo', 'legal']
    },
    regulatory: {
      timeframes: {
        gdpr: 72, // hours
        hipaa: 60,
        ccpa: 30
      },
      templates: {
        notification: 'regulatory_notification'
      },
      authorities: ['dpa', 'hhs', 'ag']
    }
  }
}
