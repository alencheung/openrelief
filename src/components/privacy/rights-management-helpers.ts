/**
 * GDPR Rights Management Helpers
 *
 * Types, mock data, and pure helper functions extracted from RightsManagement.
 */

export interface DataRequest {
  id: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected' | 'appealed'
  title: string
  description: string
  dataTypes: string[]
  createdAt: Date
  submittedAt?: Date
  completedAt?: Date
  estimatedCompletion?: Date
  responseDeadline?: Date
  attachments: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  referenceNumber?: string
  legalBasis: string
  deliveryMethod: 'download' | 'email' | 'api_access' | 'physical_copy'
}

export interface ConsentRecord {
  id: string
  purpose: string
  description: string
  dataTypes: string[]
  consentGiven: boolean
  consentDate: Date
  expiryDate?: Date
  canWithdraw: boolean
  withdrawnAt?: Date
  legalBasis: string
  processingLocation: 'local' | 'regional' | 'international'
  automatedDecision: boolean
}

export interface DataProcessingActivity {
  id: string
  timestamp: Date
  operation: string
  dataType: string
  purpose: string
  legalBasis: string
  retentionPeriod: number
  dataSubjects: number
  automatedDecision: boolean
  privacyImpact: 'low' | 'medium' | 'high'
  location?: string
}

export interface DataSubjectRequest {
  id: string
  type: 'confirmation' | 'objection' | 'restriction'
  category: 'marketing' | 'profiling' | 'automated_decision' | 'data_portability'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  title: string
  description: string
  createdAt: Date
  responseDue: Date
  respondedAt?: Date
  outcome?: string
  appealable: boolean
  appealDeadline?: Date
}

export type RightsTabId = 'requests' | 'consent' | 'activity' | 'subjects'

// Format a relative "time ago" string from a date
export const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins} minutes ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`
  }
  return `${diffDays} days ago`
}

// Map a status string to a StatusIndicator status value
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'resolved'
    case 'processing':
      return 'active'
    case 'submitted':
      return 'pending'
    case 'rejected':
    case 'appealed':
      return 'critical'
    case 'draft':
      return 'inactive'
    default:
      return 'inactive'
  }
}

// Map a priority string to a StatusIndicator status value
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'critical'
    case 'high':
      return 'critical'
    case 'medium':
      return 'pending'
    case 'low':
      return 'resolved'
    default:
      return 'inactive'
  }
}

// Initial mock data requests for demonstration
export const createInitialDataRequests = (): DataRequest[] => [
  {
    id: 'req-001',
    type: 'access',
    status: 'completed',
    title: 'Complete Data Export Request',
    description:
      'Request for all personal data including location history, emergency reports, trust score, and profile information',
    dataTypes: [
      'location_data',
      'health_data',
      'emergency_reports',
      'trust_score',
      'user_profile',
      'communication_logs'
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    estimatedCompletion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    responseDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    attachments: ['data_export_2024.pdf', 'privacy_audit_log.csv'],
    priority: 'medium',
    referenceNumber: 'GDPR-2024-001',
    legalBasis: 'GDPR Article 15 - Right of Access',
    deliveryMethod: 'download'
  },
  {
    id: 'req-002',
    type: 'erasure',
    status: 'processing',
    title: 'Account Deletion Request',
    description: 'Request for permanent deletion of all personal data and account closure',
    dataTypes: ['all_personal_data'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    estimatedCompletion: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    attachments: [],
    priority: 'high',
    referenceNumber: 'GDPR-2024-002',
    legalBasis: 'GDPR Article 17 - Right to Erasure',
    deliveryMethod: 'email'
  },
  {
    id: 'req-003',
    type: 'rectification',
    status: 'submitted',
    title: 'Health Data Correction Request',
    description: 'Request to correct inaccurate health information in emergency profile',
    dataTypes: ['health_data', 'emergency_profile'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    estimatedCompletion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    attachments: ['correction_evidence.pdf'],
    priority: 'medium',
    referenceNumber: 'GDPR-2024-003',
    legalBasis: 'GDPR Article 16 - Right to Rectification',
    deliveryMethod: 'api_access'
  }
]

// Initial mock consent records
export const createInitialConsentRecords = (): ConsentRecord[] => [
  {
    id: 'consent-001',
    purpose: 'Emergency Response Services',
    description:
      'Consent to share location and health data with emergency services during crisis situations',
    dataTypes: ['location_data', 'health_data', 'emergency_contacts'],
    consentGiven: true,
    consentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    canWithdraw: true,
    legalBasis: 'GDPR Article 6(1)(f) - Vital Interests',
    processingLocation: 'local',
    automatedDecision: false
  },
  {
    id: 'consent-002',
    purpose: 'Service Improvement Analytics',
    description: 'Consent to use anonymized usage data for service improvement and research',
    dataTypes: ['usage_analytics', 'interaction_patterns'],
    consentGiven: false,
    consentDate: new Date(),
    canWithdraw: true,
    legalBasis: 'GDPR Article 6(1)(a) - Consent',
    processingLocation: 'regional',
    automatedDecision: true
  },
  {
    id: 'consent-003',
    purpose: 'Emergency Contact Sharing',
    description: 'Consent to share emergency contact information with trusted response partners',
    dataTypes: ['emergency_contacts', 'trusted_network'],
    consentGiven: true,
    consentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    canWithdraw: true,
    legalBasis: 'GDPR Article 6(1)(c) - Contractual Necessity',
    processingLocation: 'international',
    automatedDecision: false
  }
]

// Initial mock processing activities
export const createInitialProcessingActivities = (): DataProcessingActivity[] => [
  {
    id: 'activity-001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    operation: 'Data Processing',
    dataType: 'Location Data',
    purpose: 'Emergency response optimization',
    legalBasis: 'GDPR Article 6(1)(f) - Legitimate Interest',
    retentionPeriod: 30,
    dataSubjects: 1247,
    automatedDecision: true,
    privacyImpact: 'medium',
    location: 'San Francisco, CA'
  },
  {
    id: 'activity-002',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    operation: 'Data Aggregation',
    dataType: 'User Profile',
    purpose: 'Service improvement analytics',
    legalBasis: 'GDPR Article 6(1)(b) - Contractual Necessity',
    retentionPeriod: 90,
    dataSubjects: 3421,
    automatedDecision: true,
    privacyImpact: 'low',
    location: 'Regional Data Center'
  },
  {
    id: 'activity-003',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    operation: 'Differential Privacy Application',
    dataType: 'Emergency Reports',
    purpose: 'Statistical analysis',
    legalBasis: 'GDPR Article 6(1)(e) - Public Interest',
    retentionPeriod: 365,
    dataSubjects: 892,
    automatedDecision: true,
    privacyImpact: 'high',
    location: 'International Research Institute'
  }
]

// Initial mock subject requests
export const createInitialSubjectRequests = (): DataSubjectRequest[] => [
  {
    id: 'subject-001',
    type: 'objection',
    category: 'profiling',
    status: 'completed',
    title: 'Objection to Automated Profiling',
    description:
      'Objection to automated trust score calculation based on inferred characteristics',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    responseDue: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    respondedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    outcome: 'Profiling methodology reviewed and user opted out',
    appealable: true,
    appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'subject-002',
    type: 'restriction',
    category: 'automated_decision',
    status: 'pending',
    title: 'Restriction of Automated Decision Making',
    description:
      'Request to restrict automated decisions affecting emergency response capabilities',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    responseDue: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    appealable: true,
    appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
]
