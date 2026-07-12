/**
 * Real-time Compliance Monitoring System - Helpers
 *
 * Standalone helper functions for the compliance monitoring system.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { ComplianceFramework } from './audit-logger'
import {
  ComplianceRule,
  ComplianceRuleType,
  ComplianceViolation,
  ComplianceStatus,
  ViolationSeverity
} from './compliance-types'

/**
 * Generate a unique violation id
 */
export function generateViolationId(): string {
  return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Build a new compliance violation object
 */
export function createViolation(
  rule: ComplianceRule,
  description: string,
  options: {
    affectedUsers?: string[]
    affectedResources?: string[]
    severity?: ViolationSeverity
    metadata?: Record<string, unknown>
  } = {}
): ComplianceViolation {
  return {
    id: generateViolationId(),
    ruleId: rule.id,
    ruleName: rule.name,
    framework: rule.framework,
    severity: options.severity ?? rule.severity,
    description,
    affectedUsers: options.affectedUsers,
    affectedResources: options.affectedResources,
    detectedAt: new Date(),
    status: 'active',
    metadata: options.metadata
  }
}

/**
 * Check data retention compliance
 */
export async function checkDataRetention(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = []
  const dataTypes = rule.parameters.dataTypes as string[]
  const maxRetentionDays = rule.parameters.maxRetentionDays as number

  for (const dataType of dataTypes) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays)

    // Query expired records
    const { data: expiredRecords, error } = await supabaseAdmin
      .from(dataType)
      .select('id, created_at, user_id')
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      console.error(`Error checking data retention for ${dataType}:`, error)
      continue
    }

    if (expiredRecords && expiredRecords.length > 0) {
      violations.push(createViolation(rule,
        `${expiredRecords.length} records of type ${dataType} exceed retention period of ${maxRetentionDays} days`,
        {
          affectedResources: expiredRecords.map((r: { id: string }) => `${dataType}:${r.id}`),
          metadata: {
            dataType,
            expiredCount: expiredRecords.length,
            maxRetentionDays,
            cutoffDate: cutoffDate.toISOString()
          }
        }
      ))
    }
  }

  return violations
}

/**
 * Check privacy budget compliance
 */
export async function checkPrivacyBudget(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = []
  const warningThreshold = rule.parameters.warningThreshold as number
  const criticalThreshold = rule.parameters.criticalThreshold as number

  // Get users with high privacy budget usage
  const { data: users, error } = await supabaseAdmin
    .from('privacy_budget')
    .select('user_id, used_budget, total_budget')
    .gte('used_budget', warningThreshold)

  if (error) {
    console.error('Error checking privacy budget:', error)
    return violations
  }

  const budgetUsers = (users || []) as { user_id: string; used_budget: number; total_budget: number }[]
  for (const user of budgetUsers) {
    const usagePercentage = user.used_budget / user.total_budget
    let severity = ViolationSeverity.LOW

    if (usagePercentage >= criticalThreshold) {
      severity = ViolationSeverity.CRITICAL
    } else if (usagePercentage >= warningThreshold) {
      severity = ViolationSeverity.MEDIUM
    }

    violations.push(createViolation(rule,
      `User ${user.user_id} has used ${(usagePercentage * 100).toFixed(1)}% of privacy budget`,
      {
        affectedUsers: [user.user_id],
        severity,
        metadata: {
          userId: user.user_id,
          usedBudget: user.used_budget,
          totalBudget: user.total_budget,
          usagePercentage: usagePercentage * 100
        }
      }
    ))
  }

  return violations
}

/**
 * Check access control compliance
 */
export async function checkAccessControl(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = []
  const maxFailedAttempts = rule.parameters.maxFailedAttempts as number

  // Check for recent unauthorized access attempts
  const { data: failedAttempts, error } = await supabaseAdmin
    .from('audit_log')
    .select('user_id, ip_address, timestamp')
    .eq('action', 'login_failure')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error checking access control:', error)
    return violations
  }

  // Group by IP address
  const attemptsByIP = new Map<string, number>()
  for (const attempt of (failedAttempts || []) as { ip_address?: string }[]) {
    const ip = attempt.ip_address || 'unknown'
    attemptsByIP.set(ip, (attemptsByIP.get(ip) || 0) + 1)
  }

  // Check for IPs with excessive failed attempts
  for (const [ip, count] of Array.from(attemptsByIP.entries())) {
    if (count >= maxFailedAttempts) {
      violations.push(createViolation(rule,
        `IP address ${ip} has ${count} failed login attempts in the last 24 hours`,
        {
          severity: ViolationSeverity.HIGH,
          metadata: {
            ipAddress: ip,
            failedAttempts: count,
            timeWindow: '24 hours'
          }
        }
      ))
    }
  }

  return violations
}

/**
 * Check consent management compliance
 */
export async function checkConsentManagement(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = []
  const consentValidityDays = rule.parameters.consentValidityDays as number

  // Check for expired consents
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - consentValidityDays)

  const { data: expiredConsents, error } = await supabaseAdmin
    .from('user_consents')
    .select('user_id, consent_type, granted_at')
    .lt('granted_at', cutoffDate.toISOString())
    .eq('status', 'active')

  if (error) {
    console.error('Error checking consent management:', error)
    return violations
  }

  if (expiredConsents && expiredConsents.length > 0) {
    violations.push(createViolation(rule,
      `${expiredConsents.length} consents have expired but are still marked as active`,
      {
        severity: ViolationSeverity.HIGH,
        affectedUsers: Array.from(new Set(expiredConsents.map((c: { user_id: string }) => c.user_id as string))) as string[],
        metadata: {
          expiredConsents: expiredConsents.length,
          consentValidityDays,
          cutoffDate: cutoffDate.toISOString()
        }
      }
    ))
  }

  return violations
}

/**
 * Check legal request timeline compliance
 */
export async function checkLegalRequestTimeline(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = []
  const maxResponseDays = rule.parameters.maxResponseDays as number
  const warningDays = rule.parameters.warningDays as number

  // Get pending legal requests
  const { data: pendingRequests, error } = await supabaseAdmin
    .from('legal_requests')
    .select('id, user_id, type, created_at, status')
    .eq('status', 'pending')

  if (error) {
    console.error('Error checking legal request timeline:', error)
    return violations
  }

  const now = new Date()

  const requests = (pendingRequests || []) as {
    id: string
    user_id: string
    type: string
    created_at: string
  }[]
  for (const request of requests) {
    const daysSinceCreation = Math.floor(
      (now.getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceCreation >= maxResponseDays) {
      violations.push(createViolation(rule,
        `Legal request ${request.id} has exceeded ${maxResponseDays} days response deadline`,
        {
          severity: ViolationSeverity.CRITICAL,
          affectedUsers: [request.user_id],
          metadata: {
            requestId: request.id,
            requestType: request.type,
            daysSinceCreation,
            maxResponseDays
          }
        }
      ))
    } else if (daysSinceCreation >= warningDays) {
      violations.push(createViolation(rule,
        `Legal request ${request.id} is approaching response deadline (${daysSinceCreation}/${maxResponseDays} days)`,
        {
          severity: ViolationSeverity.MEDIUM,
          affectedUsers: [request.user_id],
          metadata: {
            requestId: request.id,
            requestType: request.type,
            daysSinceCreation,
            maxResponseDays,
            warningLevel: true
          }
        }
      ))
    }
  }

  return violations
}

/**
 * Build a default compliance status with all frameworks compliant
 */
export function buildDefaultComplianceStatus(): ComplianceStatus {
  return {
    overall: 'compliant',
    score: 100,
    frameworks: {
      [ComplianceFramework.GDPR]: { status: 'compliant', score: 100, violations: 0 },
      [ComplianceFramework.CCPA]: { status: 'compliant', score: 100, violations: 0 },
      [ComplianceFramework.HIPAA]: { status: 'compliant', score: 100, violations: 0 },
      [ComplianceFramework.SOX]: { status: 'compliant', score: 100, violations: 0 }
    },
    activeViolations: 0,
    criticalViolations: 0,
    lastUpdated: new Date()
  }
}

/**
 * Aggregate active violations into a compliance status (counts, scores, overall state)
 */
export function aggregateComplianceStatus(
  violations: Iterable<ComplianceViolation>,
  status: ComplianceStatus
): ComplianceStatus {
  // Count violations by framework and severity
  for (const violation of violations) {
    if (violation.status === 'active') {
      status.activeViolations++

      if (violation.severity === ViolationSeverity.CRITICAL) {
        status.criticalViolations++
      }

      const framework = status.frameworks[violation.framework]
      if (framework) {
        framework.violations++
      }
    }
  }

  // Calculate scores and determine status
  for (const frameworkStatus of Object.values(status.frameworks)) {
    const violationsCount = frameworkStatus.violations

    if (violationsCount === 0) {
      frameworkStatus.score = 100
      frameworkStatus.status = 'compliant'
    } else if (violationsCount <= 2) {
      frameworkStatus.score = 80
      frameworkStatus.status = 'warning'
    } else {
      frameworkStatus.score = 50
      frameworkStatus.status = 'non_compliant'
    }
  }

  // Calculate overall score
  const frameworkScores = Object.values(status.frameworks).map(f => f.score)
  status.score = Math.floor(frameworkScores.reduce((a, b) => a + b, 0) / frameworkScores.length)

  if (status.criticalViolations > 0) {
    status.overall = 'non_compliant'
  } else if (status.activeViolations > 0) {
    status.overall = 'warning'
  } else {
    status.overall = 'compliant'
  }

  return status
}

/**
 * Run a single compliance rule check based on its type, returning any violations found.
 */
export async function runRuleCheck(rule: ComplianceRule): Promise<ComplianceViolation[]> {
  switch (rule.type) {
    case ComplianceRuleType.DATA_RETENTION:
      return checkDataRetention(rule)
    case ComplianceRuleType.PRIVACY_BUDGET:
      return checkPrivacyBudget(rule)
    case ComplianceRuleType.ACCESS_CONTROL:
      return checkAccessControl(rule)
    case ComplianceRuleType.CONSENT_MANAGEMENT:
      return checkConsentManagement(rule)
    case ComplianceRuleType.LEGAL_REQUEST_TIMELINE:
      return checkLegalRequestTimeline(rule)
    default:
      console.warn(`Unknown compliance rule type: ${rule.type}`)
      return []
  }
}

/**
 * Determine if a rule should be checked based on its interval and lastChecked time
 */
export function shouldCheckRule(rule: ComplianceRule): boolean {
  if (!rule.lastChecked) {
    return true
  }

  const timeSinceLastCheck = Date.now() - rule.lastChecked.getTime()
  const checkIntervalMs = rule.checkInterval * 60 * 1000

  return timeSinceLastCheck >= checkIntervalMs
}

/**
 * Map a database rule row to a ComplianceRule object
 */
export function mapRuleData(ruleData: Record<string, unknown>): ComplianceRule {
  return {
    id: ruleData.id as string,
    name: ruleData.name as string,
    description: ruleData.description as string,
    type: ruleData.type as ComplianceRuleType,
    framework: ruleData.framework as ComplianceFramework,
    enabled: ruleData.enabled as boolean,
    severity: ruleData.severity as ViolationSeverity,
    checkInterval: ruleData.check_interval as number,
    parameters: ruleData.parameters as Record<string, unknown>,
    violationThreshold: ruleData.violation_threshold as number | undefined,
    gracePeriod: ruleData.grace_period as number | undefined,
    lastChecked: ruleData.last_checked ? new Date(ruleData.last_checked as string) : undefined
  }
}

/**
 * Default compliance rules shipped with the compliance monitor
 */
export function getDefaultComplianceRules(): ComplianceRule[] {
  return [
    // GDPR Data Retention Rule
    {
      id: 'gdpr_data_retention',
      name: 'GDPR Data Retention Policy',
      description: 'Ensure personal data is not retained longer than necessary',
      type: ComplianceRuleType.DATA_RETENTION,
      framework: ComplianceFramework.GDPR,
      enabled: true,
      severity: ViolationSeverity.HIGH,
      checkInterval: 60, // Check every hour
      parameters: {
        maxRetentionDays: 365,
        dataTypes: ['user_profile', 'location_data', 'emergency_reports']
      },
      violationThreshold: 1,
      gracePeriod: 24 // 24 hours grace period
    },

    // Privacy Budget Rule
    {
      id: 'privacy_budget_monitor',
      name: 'Privacy Budget Monitoring',
      description: 'Monitor user privacy budget consumption',
      type: ComplianceRuleType.PRIVACY_BUDGET,
      framework: ComplianceFramework.GDPR,
      enabled: true,
      severity: ViolationSeverity.MEDIUM,
      checkInterval: 30, // Check every 30 minutes
      parameters: {
        warningThreshold: 0.8, // 80%
        criticalThreshold: 0.95, // 95%
        resetPeriod: 30 // days
      },
      violationThreshold: 1,
      gracePeriod: 0
    },

    // Access Control Rule
    {
      id: 'access_control_verification',
      name: 'Access Control Verification',
      description: 'Verify proper access controls are in place',
      type: ComplianceRuleType.ACCESS_CONTROL,
      framework: ComplianceFramework.GDPR,
      enabled: true,
      severity: ViolationSeverity.CRITICAL,
      checkInterval: 120, // Check every 2 hours
      parameters: {
        requireAuthentication: true,
        auditAccess: true,
        checkUnauthorizedAttempts: true,
        maxFailedAttempts: 5
      },
      violationThreshold: 1,
      gracePeriod: 0
    },

    // Consent Management Rule
    {
      id: 'consent_management',
      name: 'Consent Management Compliance',
      description: 'Ensure proper consent is obtained and managed',
      type: ComplianceRuleType.CONSENT_MANAGEMENT,
      framework: ComplianceFramework.GDPR,
      enabled: true,
      severity: ViolationSeverity.HIGH,
      checkInterval: 60, // Check every hour
      parameters: {
        requireExplicitConsent: true,
        allowWithdrawal: true,
        maintainConsentRecords: true,
        consentValidityDays: 365
      },
      violationThreshold: 1,
      gracePeriod: 24
    },

    // Legal Request Timeline Rule
    {
      id: 'legal_request_timeline',
      name: 'Legal Request Response Timeline',
      description: 'Ensure legal requests are processed within required timeframes',
      type: ComplianceRuleType.LEGAL_REQUEST_TIMELINE,
      framework: ComplianceFramework.GDPR,
      enabled: true,
      severity: ViolationSeverity.HIGH,
      checkInterval: 60, // Check every hour
      parameters: {
        maxResponseDays: 30, // GDPR requirement
        warningDays: 20,
        includeWeekends: false
      },
      violationThreshold: 1,
      gracePeriod: 0
    }
  ]
}

/**
 * Save a compliance rule to the database (upsert)
 */
export async function saveRuleToDatabase(rule: ComplianceRule): Promise<void> {
  try {
    await supabaseAdmin
      .from('compliance_rules')
      .upsert({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        framework: rule.framework,
        enabled: rule.enabled,
        severity: rule.severity,
        check_interval: rule.checkInterval,
        parameters: rule.parameters,
        violation_threshold: rule.violationThreshold,
        grace_period: rule.gracePeriod,
        last_checked: rule.lastChecked?.toISOString(),
        updated_at: new Date().toISOString()
      } as never)
  } catch (error) {
    console.error('Error saving rule:', error)
  }
}

/**
 * Save a compliance violation to the database (upsert)
 */
export async function saveViolationToDatabase(violation: ComplianceViolation): Promise<void> {
  try {
    await supabaseAdmin
      .from('compliance_violations')
      .upsert({
        id: violation.id,
        rule_id: violation.ruleId,
        rule_name: violation.ruleName,
        framework: violation.framework,
        severity: violation.severity,
        description: violation.description,
        affected_users: violation.affectedUsers,
        affected_resources: violation.affectedResources,
        detected_at: violation.detectedAt.toISOString(),
        status: violation.status,
        acknowledged_by: violation.acknowledgedBy,
        acknowledged_at: violation.acknowledgedAt?.toISOString(),
        resolved_by: violation.resolvedBy,
        resolved_at: violation.resolvedAt?.toISOString(),
        resolution: violation.resolution,
        metadata: violation.metadata,
        created_at: new Date().toISOString()
      } as never)
  } catch (error) {
    console.error('Error saving violation:', error)
  }
}

/**
 * Save compliance status to the database (upsert)
 */
export async function saveComplianceStatusToDatabase(status: ComplianceStatus): Promise<void> {
  try {
    await supabaseAdmin
      .from('compliance_status')
      .upsert({
        id: 'current',
        overall: status.overall,
        score: status.score,
        frameworks: status.frameworks,
        active_violations: status.activeViolations,
        critical_violations: status.criticalViolations,
        last_updated: status.lastUpdated.toISOString(),
        created_at: new Date().toISOString()
      } as never)
  } catch (error) {
    console.error('Error saving compliance status:', error)
  }
}
