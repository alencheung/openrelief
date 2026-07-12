/**
 * Privacy Management Types for OpenRelief
 *
 * Type definitions extracted from usePrivacy for reuse across modules.
 */

// Privacy settings interface
export interface PrivacySettings {
  locationSharing: boolean
  locationPrecision: number
  dataRetentionDays: number
  anonymizeData: boolean
  differentialPrivacy: boolean
  kAnonymity: boolean
  endToEndEncryption: boolean
  emergencyDataSharing: boolean
  researchParticipation: boolean
  thirdPartyAnalytics: boolean
  automatedDataCleanup: boolean
  privacyBudgetAlerts: boolean
  legalNotifications: boolean
  dataProcessingPurposes: string[]
  consentManagement: boolean
  realTimeMonitoring: boolean
}

// Enhanced privacy settings for granular controls
export interface GranularDataPermissions {
  id: string
  name: string
  category: 'location' | 'profile' | 'emergency' | 'communication' | 'analytics'
  enabled: boolean
  retentionDays: number
  purposeLimitation: string[]
  sharingSettings: {
    emergencyServices: boolean
    researchParticipation: boolean
    thirdPartyAnalytics: boolean
    lawEnforcement: boolean
  }
  encryptionLevel: 'none' | 'basic' | 'standard' | 'enhanced' | 'maximum'
  lastModified: Date
}

// Privacy zone settings
export interface PrivacyZone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
  privacyLevel: 'public' | 'private' | 'restricted' | 'sanitized'
  exceptions: {
    emergencyServices: boolean
    trustedContacts: boolean
    familyMembers: boolean
  }
  activeHours: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
  createdAt: Date
}

// Emergency data sharing preferences
export interface EmergencyDataPreference {
  id: string
  scenario: 'medical_emergency' | 'natural_disaster' | 'security_incident' | 'missing_person'
  dataTypes: string[]
  sharingLevel: 'minimal' | 'standard' | 'comprehensive'
  autoShare: boolean
  durationHours: number
  trustedRecipients: string[]
  geofenceRequired: boolean
}

// Trust score settings
export interface TrustScoreSettings {
  visibility: 'public' | 'private' | 'friends_only' | 'emergency_only'
  calculationTransparency: 'minimal' | 'basic' | 'detailed' | 'full'
  dataSources: {
    emergencyResponses: boolean
    communityFeedback: boolean
    responseTime: boolean
    reliability: boolean
    skillVerification: boolean
  }
  appealProcess: {
    enabled: boolean
    timeframe: number // days
    contactMethod: 'email' | 'phone' | 'in_app' | 'mail'
  }
}

// Data processing purpose settings
export interface DataProcessingPurpose {
  id: string
  name: string
  description: string
  category:
    | 'service_delivery'
    | 'safety_monitoring'
    | 'research_analytics'
    | 'legal_compliance'
    | 'user_experience'
  required: boolean
  dataTypes: string[]
  retentionDays: number
  processingLocation: 'local' | 'regional' | 'national' | 'international'
  userConsent: 'explicit' | 'implicit' | 'opt_out'
  lastReviewed: Date
}

// Legal request tracking
export interface LegalRequest {
  id: string
  type: 'data_access' | 'deletion' | 'correction' | 'portability' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'appealed'
  title: string
  description: string
  createdAt: Date
  updatedAt: Date
  responseDeadline?: Date
  estimatedCompletion?: Date
  canUserContact: boolean
}

// Privacy notification settings
export interface PrivacyNotificationSettings {
  dataProcessingAlerts: boolean
  privacyBudgetWarnings: boolean
  legalRequestUpdates: boolean
  thirdPartySharingAlerts: boolean
  unusualAccessAlerts: boolean
  dataBreachNotifications: boolean
  systemStatusChanges: boolean
}

// Privacy audit log entry
export interface PrivacyAuditLog {
  id: string
  timestamp: Date
  userId: string
  action: string
  dataType: string
  dataTypes: string[]
  privacyImpact: 'low' | 'medium' | 'high'
  legalBasis: string
  retentionPeriod: number
  automatedDecision: boolean
  dataSubjects: number
  ipAddress: string
  userAgent: string
  metadata?: Record<string, unknown>
}

// Privacy budget / consent alert surfaced via usePrivacy().privacyAlerts.
export interface PrivacyAlert {
  id: string
  type: string
  title?: string
  message: string
  timestamp: Date
  severity: 'info' | 'warning' | 'critical'
}

// Privacy context interface
export interface PrivacyContext {
  settings: PrivacySettings
  updateSettings: (settings: Partial<PrivacySettings>) => void
  isPrivacyEnabled: boolean
  privacyLevel: 'basic' | 'medium' | 'high' | 'maximum'
  granularPermissions: GranularDataPermissions[]
  privacyZones: PrivacyZone[]
  emergencyPreferences: EmergencyDataPreference[]
  trustScoreSettings: TrustScoreSettings
  dataProcessingPurposes: DataProcessingPurpose[]
  legalRequests: LegalRequest[]
  notificationSettings: PrivacyNotificationSettings
  auditLogs: PrivacyAuditLog[]
}

// Location data interface
export interface LocationData {
  latitude: number
  longitude: number
  timestamp?: Date
  userId?: string
}

// Privacy-protected data interface
export interface PrivacyProtectedData<T> {
  data: T
  isAnonymized: boolean
  hasDifferentialPrivacy: boolean
  privacyBudgetUsed: number
  processingTime: number
}

// Hook options
export interface UsePrivacyOptions {
  userId?: string
  autoInitialize?: boolean
  enableLogging?: boolean
}
