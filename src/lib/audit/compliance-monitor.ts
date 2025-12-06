/**
 * Real-time Compliance Monitoring System
 * 
 * This module provides automated compliance rule checking, real-time violation detection,
 * privacy budget monitoring, and compliance reporting capabilities.
 */

import { auditLogger, AuditEventType, AuditSeverity, ComplianceFramework } from './audit-logger';
import { supabaseAdmin } from '@/lib/supabase';

// Compliance rule types
export enum ComplianceRuleType {
  DATA_RETENTION = 'data_retention',
  PRIVACY_BUDGET = 'privacy_budget',
  ACCESS_CONTROL = 'access_control',
  CONSENT_MANAGEMENT = 'consent_management',
  DATA_MINIMIZATION = 'data_minimization',
  ENCRYPTION_REQUIREMENT = 'encryption_requirement',
  AUDIT_LOGGING = 'audit_logging',
  LEGAL_REQUEST_TIMELINE = 'legal_request_timeline'
}

// Compliance violation severity
export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Compliance rule interface
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: ComplianceRuleType;
  framework: ComplianceFramework;
  enabled: boolean;
  severity: ViolationSeverity;
  checkInterval: number; // minutes
  parameters: Record<string, any>;
  lastChecked?: Date;
  violationThreshold?: number;
  gracePeriod?: number; // minutes
}

// Compliance violation interface
export interface ComplianceViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  framework: ComplianceFramework;
  severity: ViolationSeverity;
  description: string;
  affectedUsers?: string[];
  affectedResources?: string[];
  detectedAt: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  metadata?: Record<string, any>;
}

// Compliance status overview
export interface ComplianceStatus {
  overall: 'compliant' | 'warning' | 'non_compliant';
  score: number; // 0-100
  frameworks: Record<ComplianceFramework, {
    status: 'compliant' | 'warning' | 'non_compliant';
    score: number;
    violations: number;
  }>;
  activeViolations: number;
  criticalViolations: number;
  lastUpdated: Date;
}

// Privacy budget status
export interface PrivacyBudgetStatus {
  userId: string;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  resetDate: Date;
  dailyUsage: Record<string, number>; // date -> amount
  alerts: Array<{
    type: 'warning' | 'critical';
    threshold: number;
    message: string;
    timestamp: Date;
  }>;
}

// Data retention status
export interface DataRetentionStatus {
  dataType: string;
  totalRecords: number;
  expiredRecords: number;
  retentionPeriod: number; // days
  lastCleanup: Date;
  nextCleanup: Date;
  violations: Array<{
    recordId: string;
    expirationDate: Date;
    daysOverdue: number;
  }>;
}

class ComplianceMonitor {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Initialize default compliance rules
   */
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: ComplianceRule[] = [
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
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    // Load custom rules from database
    await this.loadCustomRules();
  }

  /**
   * Start compliance monitoring
   */
  startMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.monitoringInterval = setInterval(async () => {
      await this.runComplianceChecks();
    }, 5 * 60 * 1000); // Run every 5 minutes

    console.log('Compliance monitoring started');
  }

  /**
   * Stop compliance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isRunning = false;
    console.log('Compliance monitoring stopped');
  }

  /**
   * Run all compliance checks
   */
  private async runComplianceChecks(): Promise<void> {
    try {
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        const shouldCheck = await this.shouldCheckRule(rule);
        if (shouldCheck) {
          await this.checkRule(rule);
        }
      }

      // Update overall compliance status
      await this.updateComplianceStatus();
    } catch (error) {
      console.error('Error running compliance checks:', error);
      await auditLogger.logEvent({
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.MEDIUM,
        action: 'compliance_check_error',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { error: error.message }
      });
    }
  }

  /**
   * Check if a rule should be run based on its interval
   */
  private async shouldCheckRule(rule: ComplianceRule): Promise<boolean> {
    if (!rule.lastChecked) return true;

    const timeSinceLastCheck = Date.now() - rule.lastChecked.getTime();
    const checkIntervalMs = rule.checkInterval * 60 * 1000;

    return timeSinceLastCheck >= checkIntervalMs;
  }

  /**
   * Check a specific compliance rule
   */
  private async checkRule(rule: ComplianceRule): Promise<void> {
    try {
      let violations: ComplianceViolation[] = [];

      switch (rule.type) {
        case ComplianceRuleType.DATA_RETENTION:
          violations = await this.checkDataRetention(rule);
          break;
        case ComplianceRuleType.PRIVACY_BUDGET:
          violations = await this.checkPrivacyBudget(rule);
          break;
        case ComplianceRuleType.ACCESS_CONTROL:
          violations = await this.checkAccessControl(rule);
          break;
        case ComplianceRuleType.CONSENT_MANAGEMENT:
          violations = await this.checkConsentManagement(rule);
          break;
        case ComplianceRuleType.LEGAL_REQUEST_TIMELINE:
          violations = await this.checkLegalRequestTimeline(rule);
          break;
        default:
          console.warn(`Unknown compliance rule type: ${rule.type}`);
          return;
      }

      // Process violations
      for (const violation of violations) {
        await this.processViolation(violation, rule);
      }

      // Update rule last checked time
      rule.lastChecked = new Date();
      await this.saveRule(rule);

    } catch (error) {
      console.error(`Error checking rule ${rule.id}:`, error);
    }
  }

  /**
   * Check data retention compliance
   */
  private async checkDataRetention(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const { maxRetentionDays, dataTypes } = rule.parameters;

    for (const dataType of dataTypes) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);

      // Query expired records
      const { data: expiredRecords, error } = await supabaseAdmin
        .from(dataType)
        .select('id, created_at, user_id')
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error(`Error checking data retention for ${dataType}:`, error);
        continue;
      }

      if (expiredRecords && expiredRecords.length > 0) {
        violations.push({
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: rule.framework,
          severity: rule.severity,
          description: `${expiredRecords.length} records of type ${dataType} exceed retention period of ${maxRetentionDays} days`,
          affectedResources: expiredRecords.map(r => `${dataType}:${r.id}`),
          detectedAt: new Date(),
          status: 'active',
          metadata: {
            dataType,
            expiredCount: expiredRecords.length,
            maxRetentionDays,
            cutoffDate: cutoffDate.toISOString()
          }
        });
      }
    }

    return violations;
  }

  /**
   * Check privacy budget compliance
   */
  private async checkPrivacyBudget(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const { warningThreshold, criticalThreshold } = rule.parameters;

    // Get users with high privacy budget usage
    const { data: users, error } = await supabaseAdmin
      .from('privacy_budget')
      .select('user_id, used_budget, total_budget')
      .gte('used_budget', warningThreshold);

    if (error) {
      console.error('Error checking privacy budget:', error);
      return violations;
    }

    for (const user of users || []) {
      const usagePercentage = user.used_budget / user.total_budget;
      let severity = ViolationSeverity.LOW;

      if (usagePercentage >= criticalThreshold) {
        severity = ViolationSeverity.CRITICAL;
      } else if (usagePercentage >= warningThreshold) {
        severity = ViolationSeverity.MEDIUM;
      }

      violations.push({
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        framework: rule.framework,
        severity,
        description: `User ${user.user_id} has used ${(usagePercentage * 100).toFixed(1)}% of privacy budget`,
        affectedUsers: [user.user_id],
        detectedAt: new Date(),
        status: 'active',
        metadata: {
          userId: user.user_id,
          usedBudget: user.used_budget,
          totalBudget: user.total_budget,
          usagePercentage: usagePercentage * 100
        }
      });
    }

    return violations;
  }

  /**
   * Check access control compliance
   */
  private async checkAccessControl(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const { maxFailedAttempts } = rule.parameters;

    // Check for recent unauthorized access attempts
    const { data: failedAttempts, error } = await supabaseAdmin
      .from('audit_log')
      .select('user_id, ip_address, timestamp')
      .eq('action', 'login_failure')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error checking access control:', error);
      return violations;
    }

    // Group by IP address
    const attemptsByIP = new Map<string, number>();
    for (const attempt of failedAttempts || []) {
      const ip = attempt.ip_address || 'unknown';
      attemptsByIP.set(ip, (attemptsByIP.get(ip) || 0) + 1);
    }

    // Check for IPs with excessive failed attempts
    for (const [ip, count] of attemptsByIP.entries()) {
      if (count >= maxFailedAttempts) {
        violations.push({
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: rule.framework,
          severity: ViolationSeverity.HIGH,
          description: `IP address ${ip} has ${count} failed login attempts in the last 24 hours`,
          detectedAt: new Date(),
          status: 'active',
          metadata: {
            ipAddress: ip,
            failedAttempts: count,
            timeWindow: '24 hours'
          }
        });
      }
    }

    return violations;
  }

  /**
   * Check consent management compliance
   */
  private async checkConsentManagement(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const { consentValidityDays } = rule.parameters;

    // Check for expired consents
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - consentValidityDays);

    const { data: expiredConsents, error } = await supabaseAdmin
      .from('user_consents')
      .select('user_id, consent_type, granted_at')
      .lt('granted_at', cutoffDate.toISOString())
      .eq('status', 'active');

    if (error) {
      console.error('Error checking consent management:', error);
      return violations;
    }

    if (expiredConsents && expiredConsents.length > 0) {
      violations.push({
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        framework: rule.framework,
        severity: ViolationSeverity.HIGH,
        description: `${expiredConsents.length} consents have expired but are still marked as active`,
        affectedUsers: [...new Set(expiredConsents.map(c => c.user_id))],
        detectedAt: new Date(),
        status: 'active',
        metadata: {
          expiredConsents: expiredConsents.length,
          consentValidityDays,
          cutoffDate: cutoffDate.toISOString()
        }
      });
    }

    return violations;
  }

  /**
   * Check legal request timeline compliance
   */
  private async checkLegalRequestTimeline(rule: ComplianceRule): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const { maxResponseDays, warningDays } = rule.parameters;

    // Get pending legal requests
    const { data: pendingRequests, error } = await supabaseAdmin
      .from('legal_requests')
      .select('id, user_id, type, created_at, status')
      .eq('status', 'pending');

    if (error) {
      console.error('Error checking legal request timeline:', error);
      return violations;
    }

    const now = new Date();

    for (const request of pendingRequests || []) {
      const daysSinceCreation = Math.floor(
        (now.getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCreation >= maxResponseDays) {
        violations.push({
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: rule.framework,
          severity: ViolationSeverity.CRITICAL,
          description: `Legal request ${request.id} has exceeded ${maxResponseDays} days response deadline`,
          affectedUsers: [request.user_id],
          detectedAt: new Date(),
          status: 'active',
          metadata: {
            requestId: request.id,
            requestType: request.type,
            daysSinceCreation,
            maxResponseDays
          }
        });
      } else if (daysSinceCreation >= warningDays) {
        violations.push({
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: rule.framework,
          severity: ViolationSeverity.MEDIUM,
          description: `Legal request ${request.id} is approaching response deadline (${daysSinceCreation}/${maxResponseDays} days)`,
          affectedUsers: [request.user_id],
          detectedAt: new Date(),
          status: 'active',
          metadata: {
            requestId: request.id,
            requestType: request.type,
            daysSinceCreation,
            maxResponseDays,
            warningLevel: true
          }
        });
      }
    }

    return violations;
  }

  /**
   * Process a compliance violation
   */
  private async processViolation(violation: ComplianceViolation, rule: ComplianceRule): Promise<void> {
    // Check if this is a new violation or an existing one
    const existingViolation = this.violations.get(violation.id);

    if (!existingViolation) {
      // New violation - log it and notify
      this.violations.set(violation.id, violation);

      await auditLogger.logEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: this.mapViolationSeverityToAuditSeverity(violation.severity),
        action: 'violation_detected',
        resource: 'compliance_monitor',
        privacyImpact: 'medium',
        metadata: {
          violationId: violation.id,
          ruleId: rule.id,
          ruleName: rule.name,
          framework: violation.framework,
          severity: violation.severity,
          description: violation.description
        }
      });

      // Save to database
      await this.saveViolation(violation);

      // Send notifications for critical violations
      if (violation.severity === ViolationSeverity.CRITICAL) {
        await this.sendCriticalViolationAlert(violation);
      }
    }
  }

  /**
   * Map violation severity to audit severity
   */
  private mapViolationSeverityToAuditSeverity(severity: ViolationSeverity): AuditSeverity {
    switch (severity) {
      case ViolationSeverity.LOW:
        return AuditSeverity.LOW;
      case ViolationSeverity.MEDIUM:
        return AuditSeverity.MEDIUM;
      case ViolationSeverity.HIGH:
        return AuditSeverity.HIGH;
      case ViolationSeverity.CRITICAL:
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.MEDIUM;
    }
  }

  /**
   * Send alert for critical violations
   */
  private async sendCriticalViolationAlert(violation: ComplianceViolation): Promise<void> {
    // In a real implementation, this would send notifications to compliance team
    console.error('CRITICAL COMPLIANCE VIOLATION:', violation);
    
    // Log the alert
    await auditLogger.logEvent({
      eventType: AuditEventType.SECURITY_INCIDENT,
      severity: AuditSeverity.CRITICAL,
      action: 'critical_violation_alert',
      resource: 'compliance_monitor',
      privacyImpact: 'high',
      metadata: {
        violationId: violation.id,
        description: violation.description,
        affectedUsers: violation.affectedUsers,
        affectedResources: violation.affectedResources
      }
    });
  }

  /**
   * Update overall compliance status
   */
  private async updateComplianceStatus(): Promise<void> {
    const status: ComplianceStatus = {
      overall: 'compliant',
      score: 100,
      frameworks: {
        [ComplianceFramework.GDPR]: {
          status: 'compliant',
          score: 100,
          violations: 0
        },
        [ComplianceFramework.CCPA]: {
          status: 'compliant',
          score: 100,
          violations: 0
        },
        [ComplianceFramework.HIPAA]: {
          status: 'compliant',
          score: 100,
          violations: 0
        },
        [ComplianceFramework.SOX]: {
          status: 'compliant',
          score: 100,
          violations: 0
        }
      },
      activeViolations: 0,
      criticalViolations: 0,
      lastUpdated: new Date()
    };

    // Count violations by framework and severity
    for (const violation of this.violations.values()) {
      if (violation.status === 'active') {
        status.activeViolations++;
        
        if (violation.severity === ViolationSeverity.CRITICAL) {
          status.criticalViolations++;
        }

        const framework = status.frameworks[violation.framework];
        if (framework) {
          framework.violations++;
        }
      }
    }

    // Calculate scores and determine status
    for (const [framework, frameworkStatus] of Object.entries(status.frameworks)) {
      const violations = frameworkStatus.violations;
      
      if (violations === 0) {
        frameworkStatus.score = 100;
        frameworkStatus.status = 'compliant';
      } else if (violations <= 2) {
        frameworkStatus.score = 80;
        frameworkStatus.status = 'warning';
      } else {
        frameworkStatus.score = 50;
        frameworkStatus.status = 'non_compliant';
      }
    }

    // Calculate overall score
    const frameworkScores = Object.values(status.frameworks).map(f => f.score);
    status.score = Math.floor(frameworkScores.reduce((a, b) => a + b, 0) / frameworkScores.length);

    if (status.criticalViolations > 0) {
      status.overall = 'non_compliant';
    } else if (status.activeViolations > 0) {
      status.overall = 'warning';
    } else {
      status.overall = 'compliant';
    }

    // Save status to database
    await this.saveComplianceStatus(status);
  }

  /**
   * Get compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Return default status if none found
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
        };
      }

      return data as ComplianceStatus;
    } catch (error) {
      console.error('Error getting compliance status:', error);
      throw error;
    }
  }

  /**
   * Get active violations
   */
  async getActiveViolations(): Promise<ComplianceViolation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_violations')
        .select('*')
        .eq('status', 'active')
        .order('detected_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting active violations:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a violation
   */
  async acknowledgeViolation(violationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_violations')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', violationId);

      if (error) throw error;

      // Update local cache
      const violation = this.violations.get(violationId);
      if (violation) {
        violation.status = 'acknowledged';
        violation.acknowledgedBy = userId;
        violation.acknowledgedAt = new Date();
      }

      await auditLogger.logEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'violation_acknowledged',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { violationId }
      });
    } catch (error) {
      console.error('Error acknowledging violation:', error);
      throw error;
    }
  }

  /**
   * Resolve a violation
   */
  async resolveViolation(violationId: string, userId: string, resolution: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('compliance_violations')
        .update({
          status: 'resolved',
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolution
        })
        .eq('id', violationId);

      if (error) throw error;

      // Update local cache
      const violation = this.violations.get(violationId);
      if (violation) {
        violation.status = 'resolved';
        violation.resolvedBy = userId;
        violation.resolvedAt = new Date();
        violation.resolution = resolution;
      }

      await auditLogger.logEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'violation_resolved',
        resource: 'compliance_monitor',
        privacyImpact: 'low',
        metadata: { violationId, resolution }
      });
    } catch (error) {
      console.error('Error resolving violation:', error);
      throw error;
    }
  }

  /**
   * Save rule to database
   */
  private async saveRule(rule: ComplianceRule): Promise<void> {
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
        });
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  }

  /**
   * Save violation to database
   */
  private async saveViolation(violation: ComplianceViolation): Promise<void> {
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
        });
    } catch (error) {
      console.error('Error saving violation:', error);
    }
  }

  /**
   * Save compliance status to database
   */
  private async saveComplianceStatus(status: ComplianceStatus): Promise<void> {
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
        });
    } catch (error) {
      console.error('Error saving compliance status:', error);
    }
  }

  /**
   * Load custom rules from database
   */
  private async loadCustomRules(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('compliance_rules')
        .select('*');

      if (error) throw error;

      for (const ruleData of data || []) {
        const rule: ComplianceRule = {
          id: ruleData.id,
          name: ruleData.name,
          description: ruleData.description,
          type: ruleData.type,
          framework: ruleData.framework,
          enabled: ruleData.enabled,
          severity: ruleData.severity,
          checkInterval: ruleData.check_interval,
          parameters: ruleData.parameters,
          violationThreshold: ruleData.violation_threshold,
          gracePeriod: ruleData.grace_period,
          lastChecked: ruleData.last_checked ? new Date(ruleData.last_checked) : undefined
        };

        this.rules.set(rule.id, rule);
      }
    } catch (error) {
      console.error('Error loading custom rules:', error);
    }
  }
}

// Global compliance monitor instance
export const complianceMonitor = new ComplianceMonitor();

export default complianceMonitor;