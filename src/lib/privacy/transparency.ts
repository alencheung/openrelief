/**
 * Transparency Utilities for OpenRelief
 * 
 * This module provides utilities for generating transparency reports,
 * tracking data processing activities, and ensuring compliance with
 * transparency obligations under GDPR and other privacy regulations.
 */

import { 
  PrivacyAuditLog, 
  LegalRequest, 
  DataProcessingPurpose,
  GranularDataPermissions,
  PrivacyZone
} from '@/hooks/usePrivacy';

// Transparency report configuration
export interface TransparencyReportConfig {
  reportPeriod: {
    start: Date;
    end: Date;
  };
  includePersonalData: boolean;
  anonymizeSensitiveInfo: boolean;
  format: 'json' | 'csv' | 'pdf';
  language: string;
}

// Data processing activity
export interface DataProcessingActivity {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  dataType: string;
  purpose: string;
  legalBasis: string;
  dataController: string;
  dataProcessor?: string;
  thirdPartyCountry?: string;
  retentionPeriod: number;
  securityMeasures: string[];
  impactAssessment: boolean;
  automatedDecision: boolean;
  decisionLogic?: string;
  userRights: string[];
}

// Third-party data sharing
export interface ThirdPartySharing {
  id: string;
  timestamp: Date;
  dataType: string;
  recipient: string;
  purpose: string;
  legalBasis: string;
  consent: boolean;
  dataCategories: string[];
  retentionPeriod: number;
  securityMeasures: string[];
  internationalTransfer: boolean;
  safeguards: string[];
}

// Algorithmic decision explanation
export interface AlgorithmicDecision {
  id: string;
  timestamp: Date;
  userId?: string;
  algorithm: string;
  decision: string;
  factors: {
    name: string;
    weight: number;
    value: any;
  }[];
  confidence: number;
  explanation: string;
  impact: 'positive' | 'negative' | 'neutral';
  userCanAppeal: boolean;
  appealProcess: string;
}

// Privacy impact assessment
export interface PrivacyImpactAssessment {
  id: string;
  timestamp: Date;
  projectName: string;
  projectDescription: string;
  dataTypes: string[];
  processingPurposes: string[];
  legalBasis: string;
  necessityAndProportionality: {
    necessity: string;
    proportionality: string;
  };
  risksToRights: {
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  securityMeasures: string[];
  complianceMeasures: string[];
  recommendations: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

// System-wide transparency metrics
export interface SystemTransparencyMetrics {
  totalUsers: number;
  activeUsers: number;
  dataProcessingOperations: number;
  dataSubjects: number;
  thirdPartySharingEvents: number;
  legalRequestsReceived: number;
  legalRequestsProcessed: number;
  dataBreaches: number;
  averageResponseTime: number;
  complianceScore: number;
  lastUpdated: Date;
}

// Generate transparency report
export const generateTransparencyReport = (
  auditLogs: PrivacyAuditLog[],
  legalRequests: LegalRequest[],
  dataProcessingPurposes: DataProcessingPurpose[],
  granularPermissions: GranularDataPermissions[],
  privacyZones: PrivacyZone[],
  config: TransparencyReportConfig
) => {
  const { reportPeriod, includePersonalData, anonymizeSensitiveInfo } = config;
  
  // Filter logs by report period
  const filteredLogs = auditLogs.filter(
    log => log.timestamp >= reportPeriod.start && log.timestamp <= reportPeriod.end
  );

  // Generate data processing activities
  const dataProcessingActivities: DataProcessingActivity[] = filteredLogs.map(log => ({
    id: log.id,
    timestamp: log.timestamp,
    userId: anonymizeSensitiveInfo ? anonymizeUserId(log.userId) : log.userId,
    action: log.action,
    dataType: log.dataType,
    purpose: getDataProcessingPurpose(log.dataType, dataProcessingPurposes),
    legalBasis: log.legalBasis,
    dataController: 'OpenRelief',
    dataProcessor: getProcessorForAction(log.action),
    thirdPartyCountry: determineDataLocation(log.dataType),
    retentionPeriod: log.retentionPeriod,
    securityMeasures: getSecurityMeasuresForDataType(log.dataType),
    impactAssessment: log.privacyImpact === 'high',
    automatedDecision: log.automatedDecision,
    decisionLogic: log.automatedDecision ? getDecisionLogic(log.action) : undefined,
    userRights: getUserRightsForDataType(log.dataType)
  }));

  // Generate third-party sharing report
  const thirdPartySharing: ThirdPartySharing[] = extractThirdPartySharing(filteredLogs, anonymizeSensitiveInfo);

  // Generate algorithmic decision explanations
  const algorithmicDecisions: AlgorithmicDecision[] = extractAlgorithmicDecisions(filteredLogs, anonymizeSensitiveInfo);

  // Calculate system metrics
  const systemMetrics: SystemTransparencyMetrics = calculateSystemMetrics(
    filteredLogs,
    legalRequests,
    reportPeriod
  );

  // Generate privacy impact assessments
  const privacyImpactAssessments: PrivacyImpactAssessment[] = generatePrivacyImpactAssessments(
    dataProcessingActivities,
    reportPeriod
  );

  return {
    reportMetadata: {
      generatedAt: new Date(),
      reportPeriod,
      format: config.format,
      language: config.language,
      includePersonalData,
      anonymizeSensitiveInfo
    },
    summary: {
      totalDataProcessingOperations: dataProcessingActivities.length,
      uniqueDataSubjects: new Set(dataProcessingActivities.map(a => a.userId)).size,
      dataTypesProcessed: [...new Set(dataProcessingActivities.map(a => a.dataType))],
      thirdPartySharingEvents: thirdPartySharing.length,
      legalRequests: {
        received: legalRequests.length,
        processed: legalRequests.filter(r => r.status === 'completed').length,
        pending: legalRequests.filter(r => r.status === 'pending').length
      },
      systemMetrics
    },
    dataProcessingActivities,
    thirdPartySharing,
    algorithmicDecisions,
    privacyImpactAssessments,
    legalRequests,
    dataProcessingPurposes,
    granularPermissions,
    privacyZones,
    compliance: {
      gdprCompliance: assessGDPRCompliance(dataProcessingActivities, legalRequests),
      dataProtectionImpact: assessDataProtectionImpact(dataProcessingActivities),
      userRightsFulfillment: assessUserRightsFulfillment(legalRequests)
    }
  };
};

// Anonymize user ID for transparency reports
const anonymizeUserId = (userId?: string): string | undefined => {
  if (!userId) return undefined;
  
  // Generate a consistent hash for the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `user_${Math.abs(hash)}`;
};

// Get data processing purpose for a data type
const getDataProcessingPurpose = (
  dataType: string,
  purposes: DataProcessingPurpose[]
): string => {
  const purpose = purposes.find(p => p.dataTypes.includes(dataType));
  return purpose?.name || 'service_delivery';
};

// Get processor for a specific action
const getProcessorForAction = (action: string): string | undefined => {
  const processors: Record<string, string> = {
    'location_query': 'OpenRelief Location Services',
    'profile_view': 'OpenRelief User Management',
    'emergency_response': 'OpenRelief Emergency Services',
    'data_export': 'OpenRelief Data Export Service',
    'third_party_sharing': 'OpenRelief Data Sharing Gateway'
  };
  
  return processors[action];
};

// Determine data location for a data type
const determineDataLocation = (dataType: string): string | undefined => {
  const locations: Record<string, string> = {
    'location': 'EU',
    'profile': 'EU',
    'emergency': 'EU',
    'health': 'EU',
    'communication': 'EU'
  };
  
  return locations[dataType];
};

// Get security measures for a data type
const getSecurityMeasuresForDataType = (dataType: string): string[] => {
  const baseMeasures = [
    'Encryption at rest',
    'Encryption in transit',
    'Access control',
    'Audit logging'
  ];
  
  const specificMeasures: Record<string, string[]> = {
    'location': [
      'Differential privacy',
      'K-anonymity',
      'Location precision reduction'
    ],
    'profile': [
      'Data anonymization',
      'Pseudonymization',
      'Access logging'
    ],
    'health': [
      'Enhanced encryption',
      'Strict access controls',
      'Audit trails'
    ]
  };
  
  return [...baseMeasures, ...(specificMeasures[dataType] || [])];
};

// Get user rights for a data type
const getUserRightsForDataType = (dataType: string): string[] => {
  const baseRights = [
    'Right to access',
    'Right to rectification',
    'Right to erasure',
    'Right to restriction of processing'
  ];
  
  const specificRights: Record<string, string[]> = {
    'location': [
      'Right to object to processing',
      'Right to data portability'
    ],
    'profile': [
      'Right to object to processing',
      'Right to data portability'
    ],
    'health': [
      'Right to object to processing',
      'Right to data portability'
    ]
  };
  
  return [...baseRights, ...(specificRights[dataType] || [])];
};

// Get decision logic for automated decisions
const getDecisionLogic = (action: string): string => {
  const decisionLogic: Record<string, string> = {
    'location_query': 'Location is processed using differential privacy with ε=0.1 to balance utility and privacy',
    'profile_view': 'Profile data is anonymized using k-anonymity with k=5 to ensure individual privacy',
    'emergency_response': 'Emergency data is shared with verified responders based on proximity and availability',
    'trust_score_calculation': 'Trust score is calculated based on response time, reliability, and community feedback'
  };
  
  return decisionLogic[action] || 'Decision logic is not documented for this action';
};

// Extract third-party sharing events from audit logs
const extractThirdPartySharing = (
  logs: PrivacyAuditLog[],
  anonymizeSensitiveInfo: boolean
): ThirdPartySharing[] => {
  return logs
    .filter(log => log.action.includes('third_party_sharing'))
    .map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      dataType: log.dataType,
      recipient: log.metadata?.recipient || 'Unknown',
      purpose: log.metadata?.purpose || 'Service delivery',
      legalBasis: log.legalBasis,
      consent: log.legalBasis === 'consent',
      dataCategories: log.dataTypes,
      retentionPeriod: log.retentionPeriod,
      securityMeasures: getSecurityMeasuresForDataType(log.dataType),
      internationalTransfer: determineDataLocation(log.dataType) !== 'EU',
      safeguards: determineDataLocation(log.dataType) !== 'EU' 
        ? ['Standard Contractual Clauses', 'Technical safeguards']
        : []
    }));
};

// Extract algorithmic decisions from audit logs
const extractAlgorithmicDecisions = (
  logs: PrivacyAuditLog[],
  anonymizeSensitiveInfo: boolean
): AlgorithmicDecision[] => {
  return logs
    .filter(log => log.automatedDecision)
    .map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      userId: anonymizeSensitiveInfo ? anonymizeUserId(log.userId) : log.userId,
      algorithm: log.action,
      decision: log.metadata?.decision || 'Automated decision made',
      factors: log.metadata?.factors || [],
      confidence: log.metadata?.confidence || 0.5,
      explanation: getDecisionLogic(log.action),
      impact: log.metadata?.impact || 'neutral',
      userCanAppeal: true,
      appealProcess: 'Users can appeal automated decisions through the privacy dashboard'
    }));
};

// Calculate system-wide transparency metrics
const calculateSystemMetrics = (
  logs: PrivacyAuditLog[],
  legalRequests: LegalRequest[],
  reportPeriod: { start: Date; end: Date }
): SystemTransparencyMetrics => {
  const totalUsers = new Set(logs.map(log => log.userId)).size;
  const activeUsers = new Set(
    logs
      .filter(log => log.timestamp >= reportPeriod.start)
      .map(log => log.userId)
  ).size;
  
  const dataProcessingOperations = logs.length;
  const dataSubjects = totalUsers;
  const thirdPartySharingEvents = logs.filter(log => 
    log.action.includes('third_party_sharing')
  ).length;
  
  const legalRequestsReceived = legalRequests.length;
  const legalRequestsProcessed = legalRequests.filter(r => 
    r.status === 'completed'
  ).length;
  
  const dataBreaches = logs.filter(log => 
    log.action.includes('data_breach')
  ).length;
  
  // Calculate average response time for legal requests
  const completedRequests = legalRequests.filter(r => r.status === 'completed');
  const averageResponseTime = completedRequests.length > 0
    ? completedRequests.reduce((sum, r) => {
        const responseTime = r.updatedAt.getTime() - r.createdAt.getTime();
        return sum + responseTime;
      }, 0) / completedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;
  
  // Calculate compliance score (0-100)
  const complianceScore = Math.min(100, Math.max(0, 
    100 - (dataBreaches * 10) - (averageResponseTime * 2)
  ));
  
  return {
    totalUsers,
    activeUsers,
    dataProcessingOperations,
    dataSubjects,
    thirdPartySharingEvents,
    legalRequestsReceived,
    legalRequestsProcessed,
    dataBreaches,
    averageResponseTime,
    complianceScore,
    lastUpdated: new Date()
  };
};

// Generate privacy impact assessments
const generatePrivacyImpactAssessments = (
  activities: DataProcessingActivity[],
  reportPeriod: { start: Date; end: Date }
): PrivacyImpactAssessment[] => {
  // Group activities by project/purpose
  const activitiesByPurpose = activities.reduce((acc, activity) => {
    if (!acc[activity.purpose]) {
      acc[activity.purpose] = [];
    }
    acc[activity.purpose].push(activity);
    return acc;
  }, {} as Record<string, DataProcessingActivity[]>);
  
  return Object.entries(activitiesByPurpose).map(([purpose, purposeActivities]) => ({
    id: `pia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    projectName: purpose,
    projectDescription: `Data processing activities for ${purpose}`,
    dataTypes: [...new Set(purposeActivities.map(a => a.dataType))],
    processingPurposes: [purpose],
    legalBasis: purposeActivities[0]?.legalBasis || 'user_consent',
    necessityAndProportionality: {
      necessity: `Processing is necessary for ${purpose}`,
      proportionality: 'Data collected is limited to what is necessary for the specified purpose'
    },
    risksToRights: [
      {
        risk: 'Unauthorized access to personal data',
        likelihood: 'low',
        impact: 'high',
        mitigation: 'Encryption, access controls, audit logging'
      },
      {
        risk: 'Data re-identification',
        likelihood: 'medium',
        impact: 'high',
        mitigation: 'Differential privacy, k-anonymity, data minimization'
      }
    ],
    securityMeasures: [
      'Encryption at rest and in transit',
      'Access control and authentication',
      'Audit logging and monitoring',
      'Regular security assessments'
    ],
    complianceMeasures: [
      'Privacy by design',
      'Data protection impact assessment',
      'Regular compliance audits',
      'User consent management'
    ],
    recommendations: [
      'Continue monitoring privacy budget usage',
      'Review data retention periods',
      'Enhance user transparency mechanisms'
    ],
    approvalStatus: 'approved',
    approvedBy: 'Data Protection Officer',
    approvedAt: new Date()
  }));
};

// Assess GDPR compliance
const assessGDPRCompliance = (
  activities: DataProcessingActivity[],
  legalRequests: LegalRequest[]
) => {
  const hasLegalBasis = activities.every(a => a.legalBasis);
  const hasPurposeLimitation = activities.every(a => a.purpose);
  const hasDataMinimization = activities.every(a => a.securityMeasures.includes('Data minimization'));
  const hasRetentionPeriod = activities.every(a => a.retentionPeriod > 0);
  const hasSecurityMeasures = activities.every(a => a.securityMeasures.length > 0);
  const hasUserRights = activities.every(a => a.userRights.length > 0);
  
  const legalRequestCompliance = legalRequests.every(r => 
    r.status === 'completed' || r.status === 'processing'
  );
  
  const score = [
    hasLegalBasis,
    hasPurposeLimitation,
    hasDataMinimization,
    hasRetentionPeriod,
    hasSecurityMeasures,
    hasUserRights,
    legalRequestCompliance
  ].filter(Boolean).length / 7 * 100;
  
  return {
    score,
    hasLegalBasis,
    hasPurposeLimitation,
    hasDataMinimization,
    hasRetentionPeriod,
    hasSecurityMeasures,
    hasUserRights,
    legalRequestCompliance
  };
};

// Assess data protection impact
const assessDataProtectionImpact = (activities: DataProcessingActivity[]) => {
  const highImpactActivities = activities.filter(a => a.impactAssessment);
  const automatedDecisions = activities.filter(a => a.automatedDecision);
  const internationalTransfers = activities.filter(a => a.thirdPartyCountry && a.thirdPartyCountry !== 'EU');
  
  return {
    highImpactActivities: highImpactActivities.length,
    automatedDecisions: automatedDecisions.length,
    internationalTransfers: internationalTransfers.length,
    overallRisk: highImpactActivities.length > 0 ? 'high' : 
                 automatedDecisions.length > activities.length / 2 ? 'medium' : 'low'
  };
};

// Assess user rights fulfillment
const assessUserRightsFulfillment = (legalRequests: LegalRequest[]) => {
  const totalRequests = legalRequests.length;
  const completedRequests = legalRequests.filter(r => r.status === 'completed').length;
  const pendingRequests = legalRequests.filter(r => r.status === 'pending').length;
  const overdueRequests = legalRequests.filter(r => 
    r.status === 'pending' && 
    r.responseDeadline && 
    new Date() > r.responseDeadline
  ).length;
  
  const averageProcessingTime = completedRequests.length > 0
    ? completedRequests.reduce((sum, r) => {
        const processingTime = r.updatedAt.getTime() - r.createdAt.getTime();
        return sum + processingTime;
      }, 0) / completedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;
  
  return {
    totalRequests,
    completedRequests,
    pendingRequests,
    overdueRequests,
    completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
    averageProcessingTime,
    withinLegalDeadline: overdueRequests === 0
  };
};

// Export transparency report to different formats
export const exportTransparencyReport = (
  report: any,
  format: 'json' | 'csv' | 'pdf'
): string | Blob => {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    
    case 'csv':
      return convertToCSV(report);
    
    case 'pdf':
      // In a real implementation, you would use a PDF library like jsPDF
      return new Blob(['PDF export not implemented in this demo'], { type: 'application/pdf' });
    
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

// Convert report to CSV format
const convertToCSV = (report: any): string => {
  const headers = [
    'Timestamp',
    'User ID',
    'Action',
    'Data Type',
    'Purpose',
    'Legal Basis',
    'Automated Decision'
  ];
  
  const rows = report.dataProcessingActivities.map((activity: DataProcessingActivity) => [
    activity.timestamp.toISOString(),
    activity.userId || '',
    activity.action,
    activity.dataType,
    activity.purpose,
    activity.legalBasis,
    activity.automatedDecision ? 'Yes' : 'No'
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};

// Generate user-specific transparency report
export const generateUserTransparencyReport = (
  userId: string,
  auditLogs: PrivacyAuditLog[],
  legalRequests: LegalRequest[],
  config: TransparencyReportConfig
) => {
  const userLogs = auditLogs.filter(log => log.userId === userId);
  const userRequests = legalRequests.filter(req => req.metadata?.userId === userId);
  
  return generateTransparencyReport(
    userLogs,
    userRequests,
    [], // Data processing purposes would be filtered for this user
    [], // Granular permissions would be filtered for this user
    [], // Privacy zones would be filtered for this user
    config
  );
};