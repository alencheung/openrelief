/**
 * Type definitions for the granular Data Controls component.
 *
 * Extracted from DataControls.tsx so the component file stays focused on
 * rendering and stays under the 500 line lint budget.
 */

export interface DataTypePermission {
  id: string
  name: string
  description: string
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

export interface LocationPrivacyZone {
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
    start: string
    end: string
  }
  createdAt: Date
}

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
    timeframe: number
    contactMethod: 'email' | 'phone' | 'in_app' | 'mail'
  }
}

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

/** Status values supported by the shared StatusIndicator UI component. */
export type StatusIndicatorValue =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'critical'
  | 'resolved'
