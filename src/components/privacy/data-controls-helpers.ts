/**
 * Helper functions and initial mock data for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Centralizes the large initial-state
 * objects and the small pure helpers (status colors) so the component file
 * stays focused on rendering.
 */

import type {
  DataProcessingPurpose,
  DataTypePermission,
  EmergencyDataPreference,
  LocationPrivacyZone,
  StatusIndicatorValue,
  TrustScoreSettings
} from './data-controls-types'

const DAY_MS = 24 * 60 * 60 * 1000

export const initialDataPermissions: DataTypePermission[] = [
  {
    id: 'location_data',
    name: 'Location Data',
    description: 'GPS coordinates and location history for emergency response',
    category: 'location',
    enabled: true,
    retentionDays: 30,
    purposeLimitation: ['Emergency response only', 'No commercial use'],
    sharingSettings: {
      emergencyServices: true,
      researchParticipation: false,
      thirdPartyAnalytics: false,
      lawEnforcement: true
    },
    encryptionLevel: 'enhanced',
    lastModified: new Date(Date.now() - 2 * DAY_MS)
  },
  {
    id: 'health_data',
    name: 'Health Information',
    description: 'Medical conditions and emergency health details',
    category: 'profile',
    enabled: true,
    retentionDays: 365,
    purposeLimitation: ['Emergency medical use only', 'HIPAA compliant'],
    sharingSettings: {
      emergencyServices: true,
      researchParticipation: false,
      thirdPartyAnalytics: false,
      lawEnforcement: false
    },
    encryptionLevel: 'maximum',
    lastModified: new Date(Date.now() - 5 * DAY_MS)
  },
  {
    id: 'communication_logs',
    name: 'Communication Logs',
    description: 'Emergency communications and contact history',
    category: 'communication',
    enabled: true,
    retentionDays: 90,
    purposeLimitation: ['Emergency coordination only'],
    sharingSettings: {
      emergencyServices: true,
      researchParticipation: false,
      thirdPartyAnalytics: false,
      lawEnforcement: true
    },
    encryptionLevel: 'standard',
    lastModified: new Date(Date.now() - 1 * DAY_MS)
  },
  {
    id: 'usage_analytics',
    name: 'Usage Analytics',
    description: 'Platform usage patterns and service interactions',
    category: 'analytics',
    enabled: false,
    retentionDays: 180,
    purposeLimitation: ['Service improvement only'],
    sharingSettings: {
      emergencyServices: false,
      researchParticipation: true,
      thirdPartyAnalytics: false,
      lawEnforcement: false
    },
    encryptionLevel: 'basic',
    lastModified: new Date(Date.now() - 3 * DAY_MS)
  }
]

export const initialPrivacyZones: LocationPrivacyZone[] = [
  {
    id: 'home_zone',
    name: 'Home',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    privacyLevel: 'private',
    exceptions: {
      emergencyServices: true,
      trustedContacts: true,
      familyMembers: true
    },
    activeHours: {
      start: '18:00',
      end: '08:00'
    },
    createdAt: new Date(Date.now() - 10 * DAY_MS)
  },
  {
    id: 'work_zone',
    name: 'Work',
    latitude: 37.7849,
    longitude: -122.4094,
    radius: 200,
    privacyLevel: 'restricted',
    exceptions: {
      emergencyServices: true,
      trustedContacts: false,
      familyMembers: false
    },
    activeHours: {
      start: '09:00',
      end: '17:00'
    },
    createdAt: new Date(Date.now() - 15 * DAY_MS)
  },
  {
    id: 'school_zone',
    name: 'School',
    latitude: 37.8044,
    longitude: -122.2711,
    radius: 150,
    privacyLevel: 'sanitized',
    exceptions: {
      emergencyServices: true,
      trustedContacts: false,
      familyMembers: false
    },
    activeHours: {
      start: '08:00',
      end: '15:00'
    },
    createdAt: new Date(Date.now() - 20 * DAY_MS)
  }
]

export const initialEmergencyPreferences: EmergencyDataPreference[] = [
  {
    id: 'medical_emergency',
    scenario: 'medical_emergency',
    dataTypes: ['health_data', 'location_data', 'emergency_contacts'],
    sharingLevel: 'comprehensive',
    autoShare: true,
    durationHours: 72,
    trustedRecipients: ['hospital_emergency', 'primary_care_physician'],
    geofenceRequired: false
  },
  {
    id: 'natural_disaster',
    scenario: 'natural_disaster',
    dataTypes: ['location_data', 'communication_logs'],
    sharingLevel: 'standard',
    autoShare: true,
    durationHours: 168,
    trustedRecipients: ['disaster_response_agency', 'family_contacts'],
    geofenceRequired: true
  }
]

export const initialTrustScoreSettings: TrustScoreSettings = {
  visibility: 'private',
  calculationTransparency: 'detailed',
  dataSources: {
    emergencyResponses: true,
    communityFeedback: true,
    responseTime: true,
    reliability: true,
    skillVerification: true
  },
  appealProcess: {
    enabled: true,
    timeframe: 30,
    contactMethod: 'in_app'
  }
}

export const initialDataProcessingPurposes: DataProcessingPurpose[] = [
  {
    id: 'emergency_response',
    name: 'Emergency Response Coordination',
    description: 'Process location and health data for emergency response',
    category: 'service_delivery',
    required: true,
    dataTypes: ['location_data', 'health_data'],
    retentionDays: 30,
    processingLocation: 'regional',
    userConsent: 'explicit',
    lastReviewed: new Date(Date.now() - 5 * DAY_MS)
  },
  {
    id: 'service_improvement',
    name: 'Service Improvement Analytics',
    description: 'Analyze usage patterns to improve emergency response services',
    category: 'research_analytics',
    required: false,
    dataTypes: ['usage_analytics'],
    retentionDays: 180,
    processingLocation: 'national',
    userConsent: 'opt_out',
    lastReviewed: new Date(Date.now() - 15 * DAY_MS)
  }
]

/**
 * Map a privacy level to a StatusIndicator status value.
 */
export function getPrivacyLevelColor(
  level: LocationPrivacyZone['privacyLevel']
): StatusIndicatorValue {
  switch (level) {
    case 'public':
      return 'resolved'
    case 'private':
      return 'pending'
    case 'restricted':
      return 'pending'
    case 'sanitized':
      return 'critical'
    default:
      return 'inactive'
  }
}

/**
 * Map an encryption level to a StatusIndicator status value.
 */
export function getEncryptionLevelColor(
  level: DataTypePermission['encryptionLevel']
): StatusIndicatorValue {
  switch (level) {
    case 'none':
      return 'critical'
    case 'basic':
      return 'pending'
    case 'standard':
      return 'pending'
    case 'enhanced':
      return 'active'
    case 'maximum':
      return 'resolved'
    default:
      return 'inactive'
  }
}

/**
 * Create a new blank privacy zone for the "Add Zone" action.
 */
export function createPrivacyZone(): LocationPrivacyZone {
  return {
    id: `zone_${Date.now()}`,
    name: 'New Privacy Zone',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    privacyLevel: 'private',
    exceptions: {
      emergencyServices: true,
      trustedContacts: true,
      familyMembers: true
    },
    activeHours: {
      start: '09:00',
      end: '17:00'
    },
    createdAt: new Date()
  }
}
