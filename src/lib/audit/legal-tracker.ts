/**
 * Legal Request Tracking System
 * 
 * This module provides government request lifecycle monitoring, legal compliance verification,
 * user notification tracking, challenge and appeal process logging, and transparency report data collection.
 */

import { auditLogger, AuditEventType, AuditSeverity } from './audit-logger';
import { supabaseAdmin } from '@/lib/supabase';

// Legal request types
export enum LegalRequestType {
  DATA_ACCESS = 'data_access',
  DATA_DELETION = 'data_deletion',
  DATA_CORRECTION = 'data_correction',
  DATA_PORTABILITY = 'data_portability',
  OBJECTION_TO_PROCESSING = 'objection_to_processing',
  RESTRICT_PROCESSING = 'restrict_processing',
  LAW_ENFORCEMENT_REQUEST = 'law_enforcement_request',
  COURT_ORDER = 'court_order',
  SUBPOENA = 'subpoena',
  NATIONAL_SECURITY_REQUEST = 'national_security_request'
}

// Legal request status
export enum LegalRequestStatus {
  RECEIVED = 'received',
  VALIDATED = 'validated',
  PROCESSING = 'processing',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  APPEALED = 'appealed',
  EXPIRED = 'expired'
}

// Legal request priority
export enum LegalRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Request source types
export enum RequestSourceType {
  USER_DIRECT = 'user_direct',
  LAW_ENFORCEMENT = 'law_enforcement',
  COURT_SYSTEM = 'court_system',
  REGULATORY_AGENCY = 'regulatory_agency',
  GOVERNMENT_AGENCY = 'government_agency',
  THIRD_PARTY = 'third_party'
}

// Legal request interface
export interface LegalRequest {
  id: string;
  type: LegalRequestType;
  status: LegalRequestStatus;
  priority: LegalRequestPriority;
  
  // Request details
  title: string;
  description: string;
  requestor: RequestorInfo;
  sourceType: RequestSourceType;
  referenceNumber?: string;
  jurisdiction?: string;
  legalBasis?: string;
  
  // Data scope
  dataTypes: string[];
  dataSubjects: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  specificRecords?: string[];
  
  // Processing details
  assignedTo?: string;
  reviewedBy?: string;
  approvedBy?: string;
  processingSteps: ProcessingStep[];
  
  // Timeline
  receivedAt: Date;
  validatedAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  responseDeadline: Date;
  
  // User notifications
  userNotified: boolean;
  userNotificationAttempts: number;
  lastUserNotificationAt?: Date;
  
  // Compliance details
  complianceChecks: ComplianceCheck[];
  redactionsApplied: RedactionInfo[];
  dataShared: boolean;
  shareMethod?: string;
  shareRecipient?: string;
  
  // Appeal information
  appealDeadline?: Date;
  appealInfo?: AppealInfo;
  
  // Metadata
  tags?: string[];
  relatedRequests?: string[];
  attachments?: AttachmentInfo[];
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Requestor information
export interface RequestorInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  address?: string;
  verified: boolean;
  verificationMethod?: string;
}

// Processing step
export interface ProcessingStep {
  id: string;
  step: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  duration?: number; // minutes
}

// Compliance check
export interface ComplianceCheck {
  id: string;
  checkType: string;
  description: string;
  required: boolean;
  passed: boolean;
  checkedAt: Date;
  checkedBy: string;
  notes?: string;
  evidence?: string[];
}

// Redaction information
export interface RedactionInfo {
  id: string;
  recordId: string;
  field: string;
  reason: string;
  legalBasis: string;
  appliedAt: Date;
  appliedBy: string;
}

// Appeal information
export interface AppealInfo {
  id: string;
  reason: string;
  description: string;
  filedAt: Date;
  filedBy: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  decision?: string;
}

// Attachment information
export interface AttachmentInfo {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  description?: string;
}

// Transparency report data
export interface TransparencyReportData {
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  requestsByType: Record<LegalRequestType, number>;
  requestsBySource: Record<RequestSourceType, number>;
  requestsByStatus: Record<LegalRequestStatus, number>;
  complianceRate: number;
  averageResponseTime: number; // days
  dataSubjectsAffected: number;
  dataShared: boolean;
  warrantsReceived: number;
  warrantsExecuted: number;
  nationalSecurityRequests: number;
  userNotifications: {
    sent: number;
    delivered: number;
    failed: number;
  };
  appeals: {
    received: number;
    granted: number;
    denied: number;
  };
}

class LegalRequestTracker {
  private activeRequests: Map<string, LegalRequest> = new Map();
  private processingWorkflows: Map<LegalRequestType, ProcessingStep[]> = new Map();
  private isMonitoring = false;

  constructor() {
    this.initializeWorkflows();
    this.startMonitoring();
  }

  /**
   * Initialize processing workflows for different request types
   */
  private initializeWorkflows(): void {
    // Data access request workflow
    this.processingWorkflows.set(LegalRequestType.DATA_ACCESS, [
      {
        id: 'validate_request',
        step: 'Validate Request',
        description: 'Verify requestor identity and request completeness',
        completed: false,
        required: true
      },
      {
        id: 'locate_data',
        step: 'Locate Data',
        description: 'Identify and collect requested data',
        completed: false,
        required: true
      },
      {
        id: 'review_data',
        step: 'Review Data',
        description: 'Review data for legal compliance and redactions',
        completed: false,
        required: true
      },
      {
        id: 'apply_redactions',
        step: 'Apply Redactions',
        description: 'Apply necessary redactions to protect third parties',
        completed: false,
        required: false
      },
      {
        id: 'prepare_response',
        step: 'Prepare Response',
        description: 'Prepare data package and documentation',
        completed: false,
        required: true
      },
      {
        id: 'notify_user',
        step: 'Notify User',
        description: 'Notify user of data access request completion',
        completed: false,
        required: true
      }
    ]);

    // Law enforcement request workflow
    this.processingWorkflows.set(LegalRequestType.LAW_ENFORCEMENT_REQUEST, [
      {
        id: 'validate_legal_basis',
        step: 'Validate Legal Basis',
        description: 'Verify legal authority and documentation',
        completed: false,
        required: true
      },
      {
        id: 'legal_review',
        step: 'Legal Review',
        description: 'Legal team review of request validity',
        completed: false,
        required: true
      },
      {
        id: 'executive_approval',
        step: 'Executive Approval',
        description: 'Senior management approval for disclosure',
        completed: false,
        required: true
      },
      {
        id: 'data_extraction',
        step: 'Data Extraction',
        description: 'Extract specified data with audit trail',
        completed: false,
        required: true
      },
      {
        id: 'secure_transfer',
        step: 'Secure Transfer',
        description: 'Transfer data to authorized recipient',
        completed: false,
        required: true
      },
      {
        id: 'warrant_canary_update',
        step: 'Update Warrant Canary',
        description: 'Update transparency report and warrant canary',
        completed: false,
        required: true
      }
    ]);
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.loadActiveRequests();
    this.startDeadlineMonitoring();

    console.log('Legal request tracking started');
  }

  /**
   * Create new legal request
   */
  async createRequest(
    type: LegalRequestType,
    title: string,
    description: string,
    requestor: RequestorInfo,
    dataTypes: string[],
    dataSubjects: string[],
    options?: {
      priority?: LegalRequestPriority;
      sourceType?: RequestSourceType;
      referenceNumber?: string;
      jurisdiction?: string;
      legalBasis?: string;
      dateRange?: { start: Date; end: Date };
      specificRecords?: string[];
      tags?: string[];
      attachments?: AttachmentInfo[];
    }
  ): Promise<string> {
    try {
      const requestId = this.generateRequestId();
      
      // Calculate response deadline based on request type
      const responseDeadline = this.calculateResponseDeadline(type);

      const request: LegalRequest = {
        id: requestId,
        type,
        status: LegalRequestStatus.RECEIVED,
        priority: options?.priority || LegalRequestPriority.MEDIUM,
        title,
        description,
        requestor,
        sourceType: options?.sourceType || RequestSourceType.USER_DIRECT,
        referenceNumber: options?.referenceNumber,
        jurisdiction: options?.jurisdiction,
        legalBasis: options?.legalBasis,
        dataTypes,
        dataSubjects,
        dateRange: options?.dateRange,
        specificRecords: options?.specificRecords,
        processingSteps: this.initializeProcessingSteps(type),
        receivedAt: new Date(),
        responseDeadline,
        userNotified: false,
        userNotificationAttempts: 0,
        complianceChecks: [],
        redactionsApplied: [],
        dataShared: false,
        tags: options?.tags,
        attachments: options?.attachments,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save request
      await this.saveRequest(request);
      this.activeRequests.set(requestId, request);

      // Log request creation
      await auditLogger.logEvent({
        eventType: AuditEventType.LEGAL_REQUEST_RECEIVED,
        severity: this.mapTypeToSeverity(type),
        action: 'legal_request_created',
        resource: 'legal_tracker',
        privacyImpact: 'high',
        metadata: {
          requestId,
          type,
          title,
          requestorId: requestor.id,
          dataTypes,
          dataSubjectsCount: dataSubjects.length,
          responseDeadline: responseDeadline.toISOString()
        }
      });

      // Auto-assign request if possible
      await this.autoAssignRequest(request);

      // Start initial validation
      await this.startValidation(request);

      console.log(`Legal request created: ${requestId} - ${title}`);
      return requestId;
    } catch (error) {
      console.error('Error creating legal request:', error);
      throw error;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: LegalRequestStatus,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const previousStatus = request.status;
      request.status = status;
      request.updatedAt = new Date();

      // Update timestamps based on status
      if (status === LegalRequestStatus.VALIDATED && !request.validatedAt) {
        request.validatedAt = new Date();
      } else if (status === LegalRequestStatus.PROCESSING && !request.processingStartedAt) {
        request.processingStartedAt = new Date();
      } else if (
        (status === LegalRequestStatus.FULFILLED || status === LegalRequestStatus.PARTIALLY_FULFILLED) &&
        !request.completedAt
      ) {
        request.completedAt = new Date();
      }

      // Add processing step note if provided
      if (notes) {
        const currentStep = request.processingSteps.find(step => !step.completed);
        if (currentStep) {
          currentStep.notes = notes;
        }
      }

      // Save updated request
      await this.saveRequest(request);

      // Log status change
      await auditLogger.logEvent({
        eventType: AuditEventType.LEGAL_REQUEST_PROCESSED,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'request_status_updated',
        resource: 'legal_tracker',
        privacyImpact: 'medium',
        metadata: {
          requestId,
          previousStatus,
          newStatus: status,
          notes
        }
      });

      // Handle status-specific actions
      await this.handleStatusChange(request, previousStatus, status);

    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }

  /**
   * Complete processing step
   */
  async completeProcessingStep(
    requestId: string,
    stepId: string,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const step = request.processingSteps.find(s => s.id === stepId);
      if (!step) {
        throw new Error(`Processing step ${stepId} not found`);
      }

      step.completed = true;
      step.completedAt = new Date();
      step.completedBy = userId;
      if (notes) step.notes = notes;

      // Calculate step duration
      if (request.processingStartedAt) {
        step.duration = Math.floor(
          (new Date().getTime() - request.processingStartedAt.getTime()) / (1000 * 60)
        );
      }

      // Save updated request
      await this.saveRequest(request);

      // Log step completion
      await auditLogger.logEvent({
        eventType: AuditEventType.LEGAL_REQUEST_PROCESSED,
        severity: AuditSeverity.LOW,
        userId,
        action: 'processing_step_completed',
        resource: 'legal_tracker',
        privacyImpact: 'low',
        metadata: {
          requestId,
          stepId,
          stepName: step.step,
          duration: step.duration,
          notes
        }
      });

      // Check if all required steps are completed
      const requiredSteps = request.processingSteps.filter(s => s.required);
      const completedRequiredSteps = requiredSteps.filter(s => s.completed);
      
      if (completedRequiredSteps.length === requiredSteps.length) {
        await this.updateRequestStatus(
          requestId,
          LegalRequestStatus.PENDING_REVIEW,
          userId,
          'All required processing steps completed'
        );
      }

    } catch (error) {
      console.error('Error completing processing step:', error);
      throw error;
    }
  }

  /**
   * Add compliance check
   */
  async addComplianceCheck(
    requestId: string,
    checkType: string,
    description: string,
    required: boolean,
    userId: string,
    notes?: string
  ): Promise<string> {
    try {
      const checkId = this.generateCheckId();
      
      const complianceCheck: ComplianceCheck = {
        id: checkId,
        checkType,
        description,
        required,
        passed: false, // Will be updated when check is completed
        checkedAt: new Date(),
        checkedBy: userId,
        notes
      };

      const request = this.activeRequests.get(requestId);
      if (request) {
        request.complianceChecks.push(complianceCheck);
        request.updatedAt = new Date();
        await this.saveRequest(request);
      }

      return checkId;
    } catch (error) {
      console.error('Error adding compliance check:', error);
      throw error;
    }
  }

  /**
   * Complete compliance check
   */
  async completeComplianceCheck(
    requestId: string,
    checkId: string,
    passed: boolean,
    userId: string,
    notes?: string,
    evidence?: string[]
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const check = request.complianceChecks.find(c => c.id === checkId);
      if (!check) {
        throw new Error(`Compliance check ${checkId} not found`);
      }

      check.passed = passed;
      check.checkedAt = new Date();
      check.checkedBy = userId;
      if (notes) check.notes = notes;
      if (evidence) check.evidence = evidence;

      // Save updated request
      await this.saveRequest(request);

      // Log compliance check
      await auditLogger.logEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        severity: passed ? AuditSeverity.LOW : AuditSeverity.HIGH,
        userId,
        action: 'compliance_check_completed',
        resource: 'legal_tracker',
        privacyImpact: 'medium',
        metadata: {
          requestId,
          checkId,
          checkType,
          passed,
          notes
        }
      });

      // Check if all required compliance checks are passed
      const requiredChecks = request.complianceChecks.filter(c => c.required);
      const passedRequiredChecks = requiredChecks.filter(c => c.passed);
      
      if (passedRequiredChecks.length === requiredChecks.length) {
        // All required checks passed, can proceed
        await this.updateRequestStatus(
          requestId,
          LegalRequestStatus.APPROVED,
          userId,
          'All required compliance checks passed'
        );
      } else if (!passed && requiredChecks.some(c => !c.passed)) {
        // Required check failed
        await this.updateRequestStatus(
          requestId,
          LegalRequestStatus.REJECTED,
          userId,
          `Required compliance check failed: ${checkType}`
        );
      }

    } catch (error) {
      console.error('Error completing compliance check:', error);
      throw error;
    }
  }

  /**
   * Notify user of request
   */
  async notifyUser(
    requestId: string,
    notificationType: 'request_received' | 'status_update' | 'completion',
    message: string,
    userId: string
  ): Promise<void> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      // In a real implementation, this would send actual notifications
      // For now, we'll just log the notification attempt
      
      request.userNotificationAttempts++;
      request.lastUserNotificationAt = new Date();
      request.updatedAt = new Date();

      // Mark as notified if this is a completion notification
      if (notificationType === 'completion') {
        request.userNotified = true;
      }

      await this.saveRequest(request);

      // Log notification
      await auditLogger.logEvent({
        eventType: AuditEventType.LEGAL_REQUEST_PROCESSED,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'user_notified',
        resource: 'legal_tracker',
        privacyImpact: 'medium',
        metadata: {
          requestId,
          notificationType,
          message,
          attempts: request.userNotificationAttempts
        }
      });

      console.log(`User notification sent for request ${requestId}: ${message}`);
    } catch (error) {
      console.error('Error notifying user:', error);
      throw error;
    }
  }

  /**
   * File appeal
   */
  async fileAppeal(
    requestId: string,
    reason: string,
    description: string,
    userId: string
  ): Promise<string> {
    try {
      const request = this.activeRequests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      // Check if appeal deadline has passed
      if (request.appealDeadline && new Date() > request.appealDeadline) {
        throw new Error('Appeal deadline has passed');
      }

      const appealId = this.generateAppealId();
      
      const appealInfo: AppealInfo = {
        id: appealId,
        reason,
        description,
        filedAt: new Date(),
        filedBy: userId,
        status: 'pending'
      };

      request.appealInfo = appealInfo;
      request.status = LegalRequestStatus.APPEALED;
      request.updatedAt = new Date();

      await this.saveRequest(request);

      // Log appeal
      await auditLogger.logEvent({
        eventType: AuditEventType.LEGAL_REQUEST_PROCESSED,
        severity: AuditSeverity.MEDIUM,
        userId,
        action: 'appeal_filed',
        resource: 'legal_tracker',
        privacyImpact: 'medium',
        metadata: {
          requestId,
          appealId,
          reason,
          description
        }
      });

      // Auto-assign appeal review
      await this.autoAssignAppeal(request, appealInfo);

      return appealId;
    } catch (error) {
      console.error('Error filing appeal:', error);
      throw error;
    }
  }

  /**
   * Get transparency report data
   */
  async getTransparencyReportData(
    startDate: Date,
    endDate: Date
  ): Promise<TransparencyReportData> {
    try {
      // Get all requests in the period
      const { data: requests, error } = await supabaseAdmin
        .from('legal_requests')
        .select('*')
        .gte('received_at', startDate.toISOString())
        .lte('received_at', endDate.toISOString());

      if (error) throw error;

      const reportData: TransparencyReportData = {
        period: { start: startDate, end: endDate },
        totalRequests: requests?.length || 0,
        requestsByType: {} as Record<LegalRequestType, number>,
        requestsBySource: {} as Record<RequestSourceType, number>,
        requestsByStatus: {} as Record<LegalRequestStatus, number>,
        complianceRate: 0,
        averageResponseTime: 0,
        dataSubjectsAffected: 0,
        dataShared: false,
        warrantsReceived: 0,
        warrantsExecuted: 0,
        nationalSecurityRequests: 0,
        userNotifications: {
          sent: 0,
          delivered: 0,
          failed: 0
        },
        appeals: {
          received: 0,
          granted: 0,
          denied: 0
        }
      };

      let totalResponseTime = 0;
      let responseCount = 0;

      // Aggregate data
      for (const request of requests || []) {
        // Count by type
        reportData.requestsByType[request.type] = (reportData.requestsByType[request.type] || 0) + 1;

        // Count by source
        reportData.requestsBySource[request.source_type] = (reportData.requestsBySource[request.source_type] || 0) + 1;

        // Count by status
        reportData.requestsByStatus[request.status] = (reportData.requestsByStatus[request.status] || 0) + 1;

        // Count data subjects
        reportData.dataSubjectsAffected += request.data_subjects?.length || 0;

        // Count user notifications
        if (request.user_notified) {
          reportData.userNotifications.sent++;
        }
        reportData.userNotifications.sent += request.user_notification_attempts || 0;

        // Count special request types
        if (request.type === LegalRequestType.LAW_ENFORCEMENT_REQUEST) {
          reportData.warrantsReceived++;
          if (request.data_shared) {
            reportData.warrantsExecuted++;
          }
        }

        if (request.type === LegalRequestType.NATIONAL_SECURITY_REQUEST) {
          reportData.nationalSecurityRequests++;
        }

        // Count appeals
        if (request.appeal_info) {
          reportData.appeals.received++;
          if (request.appeal_info.status === 'approved') {
            reportData.appeals.granted++;
          } else if (request.appeal_info.status === 'rejected') {
            reportData.appeals.denied++;
          }
        }

        // Calculate response times
        if (request.completed_at && request.received_at) {
          const responseTime = (new Date(request.completed_at).getTime() - new Date(request.received_at).getTime()) / (1000 * 60 * 60 * 24);
          totalResponseTime += responseTime;
          responseCount++;
        }

        // Check if any data was shared
        if (request.data_shared) {
          reportData.dataShared = true;
        }
      }

      // Calculate averages and rates
      if (responseCount > 0) {
        reportData.averageResponseTime = totalResponseTime / responseCount;
      }

      const approvedRequests = (reportData.requestsByStatus[LegalRequestStatus.APPROVED] || 0) +
                           (reportData.requestsByStatus[LegalRequestStatus.FULFILLED] || 0) +
                           (reportData.requestsByStatus[LegalRequestStatus.PARTIALLY_FULFILLED] || 0);
      
      const totalProcessedRequests = approvedRequests + (reportData.requestsByStatus[LegalRequestStatus.REJECTED] || 0);
      
      if (totalProcessedRequests > 0) {
        reportData.complianceRate = (approvedRequests / totalProcessedRequests) * 100;
      }

      return reportData;
    } catch (error) {
      console.error('Error getting transparency report data:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAppealId(): string {
    return `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateResponseDeadline(type: LegalRequestType): Date {
    const deadline = new Date();
    
    switch (type) {
      case LegalRequestType.DATA_ACCESS:
        deadline.setDate(deadline.getDate() + 30); // GDPR: 30 days
        break;
      case LegalRequestType.DATA_DELETION:
        deadline.setDate(deadline.getDate() + 30); // GDPR: 30 days
        break;
      case LegalRequestType.DATA_CORRECTION:
        deadline.setDate(deadline.getDate() + 30); // GDPR: 30 days
        break;
      case LegalRequestType.DATA_PORTABILITY:
        deadline.setDate(deadline.getDate() + 30); // GDPR: 30 days
        break;
      case LegalRequestType.LAW_ENFORCEMENT_REQUEST:
        deadline.setDate(deadline.getDate() + 14); // Typically shorter for law enforcement
        break;
      case LegalRequestType.COURT_ORDER:
        deadline.setDate(deadline.getDate() + 7); // Court orders are time-sensitive
        break;
      default:
        deadline.setDate(deadline.getDate() + 30); // Default 30 days
    }

    return deadline;
  }

  private mapTypeToSeverity(type: LegalRequestType): AuditSeverity {
    switch (type) {
      case LegalRequestType.LAW_ENFORCEMENT_REQUEST:
      case LegalRequestType.NATIONAL_SECURITY_REQUEST:
      case LegalRequestType.COURT_ORDER:
        return AuditSeverity.CRITICAL;
      case LegalRequestType.DATA_DELETION:
      case LegalRequestType.DATA_ACCESS:
        return AuditSeverity.HIGH;
      case LegalRequestType.DATA_CORRECTION:
      case LegalRequestType.DATA_PORTABILITY:
        return AuditSeverity.MEDIUM;
      default:
        return AuditSeverity.LOW;
    }
  }

  private initializeProcessingSteps(type: LegalRequestType): ProcessingStep[] {
    const workflow = this.processingWorkflows.get(type);
    return workflow ? workflow.map(step => ({ ...step })) : [];
  }

  private async autoAssignRequest(request: LegalRequest): Promise<void> {
    // Auto-assign based on request type and priority
    let assignTo = '';
    
    switch (request.type) {
      case LegalRequestType.LAW_ENFORCEMENT_REQUEST:
      case LegalRequestType.NATIONAL_SECURITY_REQUEST:
        assignTo = 'legal-team-lead';
        break;
      case LegalRequestType.DATA_ACCESS:
      case LegalRequestType.DATA_DELETION:
        assignTo = 'privacy-officer';
        break;
      default:
        assignTo = 'legal-analyst';
    }

    if (request.priority === LegalRequestPriority.URGENT) {
      assignTo = 'legal-team-lead'; // Urgent requests go to lead
    }

    request.assignedTo = assignTo;
    await this.saveRequest(request);
  }

  private async autoAssignAppeal(request: LegalRequest, appeal: AppealInfo): Promise<void> {
    // Appeals should be reviewed by senior legal staff
    request.reviewedBy = 'legal-counsel';
    appeal.status = 'under_review';
    await this.saveRequest(request);
  }

  private async startValidation(request: LegalRequest): Promise<void> {
    // Start initial validation process
    await this.updateRequestStatus(
      request.id,
      LegalRequestStatus.VALIDATED,
      'system',
      'Initial validation completed'
    );
  }

  private async handleStatusChange(
    request: LegalRequest,
    previousStatus: LegalRequestStatus,
    newStatus: LegalRequestStatus
  ): Promise<void> {
    // Handle status-specific logic
    
    if (newStatus === LegalRequestStatus.APPROVED) {
      // Set appeal deadline (typically 30 days)
      const appealDeadline = new Date();
      appealDeadline.setDate(appealDeadline.getDate() + 30);
      request.appealDeadline = appealDeadline;
    }

    if (newStatus === LegalRequestStatus.FULFILLED || newStatus === LegalRequestStatus.PARTIALLY_FULFILLED) {
      // Notify user of completion
      await this.notifyUser(
        request.id,
        'completion',
        `Your legal request has been ${newStatus === LegalRequestStatus.FULFILLED ? 'fully' : 'partially'} fulfilled`,
        'system'
      );
    }
  }

  private async loadActiveRequests(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('legal_requests')
        .select('*')
        .in('status', [
          LegalRequestStatus.RECEIVED,
          LegalRequestStatus.VALIDATED,
          LegalRequestStatus.PROCESSING,
          LegalRequestStatus.ADDITIONAL_INFO_REQUIRED,
          LegalRequestStatus.PENDING_REVIEW
        ]);

      if (error) throw error;

      for (const request of data || []) {
        this.activeRequests.set(request.id, request as LegalRequest);
      }
    } catch (error) {
      console.error('Error loading active requests:', error);
    }
  }

  private startDeadlineMonitoring(): void {
    // Check for approaching deadlines every hour
    setInterval(async () => {
      await this.checkDeadlines();
    }, 60 * 60 * 1000);
  }

  private async checkDeadlines(): Promise<void> {
    try {
      const now = new Date();
      const warningThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days

      for (const request of this.activeRequests.values()) {
        // Check response deadline
        const timeToDeadline = request.responseDeadline.getTime() - now.getTime();
        
        if (timeToDeadline <= 0 && request.status !== LegalRequestStatus.FULFILLED) {
          // Deadline passed
          await this.updateRequestStatus(
            request.id,
            LegalRequestStatus.EXPIRED,
            'system',
            'Response deadline exceeded'
          );
        } else if (timeToDeadline <= warningThreshold && timeToDeadline > 0) {
          // Approaching deadline - send warning
          await auditLogger.logEvent({
            eventType: AuditEventType.LEGAL_REQUEST_PROCESSED,
            severity: AuditSeverity.MEDIUM,
            action: 'deadline_warning',
            resource: 'legal_tracker',
            privacyImpact: 'low',
            metadata: {
              requestId: request.id,
              deadline: request.responseDeadline.toISOString(),
              hoursRemaining: Math.floor(timeToDeadline / (1000 * 60 * 60))
            }
          });
        }

        // Check appeal deadline
        if (request.appealDeadline) {
          const timeToAppealDeadline = request.appealDeadline.getTime() - now.getTime();
          
          if (timeToAppealDeadline <= 0 && request.appealInfo?.status === 'pending') {
            request.appealInfo.status = 'rejected';
            request.appealInfo.reviewedAt = new Date();
            request.appealInfo.decision = 'Appeal deadline passed';
            await this.saveRequest(request);
          }
        }
      }
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  private async saveRequest(request: LegalRequest): Promise<void> {
    try {
      await supabaseAdmin
        .from('legal_requests')
        .upsert({
          id: request.id,
          type: request.type,
          status: request.status,
          priority: request.priority,
          title: request.title,
          description: request.description,
          requestor: request.requestor,
          source_type: request.sourceType,
          reference_number: request.referenceNumber,
          jurisdiction: request.jurisdiction,
          legal_basis: request.legalBasis,
          data_types: request.dataTypes,
          data_subjects: request.dataSubjects,
          date_range: request.dateRange,
          specific_records: request.specificRecords,
          assigned_to: request.assignedTo,
          reviewed_by: request.reviewedBy,
          approved_by: request.approvedBy,
          processing_steps: request.processingSteps,
          received_at: request.receivedAt.toISOString(),
          validated_at: request.validatedAt?.toISOString(),
          processing_started_at: request.processingStartedAt?.toISOString(),
          completed_at: request.completedAt?.toISOString(),
          response_deadline: request.responseDeadline.toISOString(),
          user_notified: request.userNotified,
          user_notification_attempts: request.userNotificationAttempts,
          last_user_notification_at: request.lastUserNotificationAt?.toISOString(),
          compliance_checks: request.complianceChecks,
          redactions_applied: request.redactionsApplied,
          data_shared: request.dataShared,
          share_method: request.shareMethod,
          share_recipient: request.shareRecipient,
          appeal_deadline: request.appealDeadline?.toISOString(),
          appeal_info: request.appealInfo,
          tags: request.tags,
          related_requests: request.relatedRequests,
          attachments: request.attachments,
          metadata: request.metadata,
          created_at: request.createdAt.toISOString(),
          updated_at: request.updatedAt.toISOString()
        });
    } catch (error) {
      console.error('Error saving request:', error);
    }
  }
}

// Global legal request tracker instance
export const legalRequestTracker = new LegalRequestTracker();

export default legalRequestTracker;