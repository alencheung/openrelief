/**
 * Privacy Dashboard - Helper Functions
 *
 * Pure utility helpers (formatters, status mappers, default state builders)
 * extracted from PrivacyDashboard.tsx to keep the main component module
 * under the 500 line lint budget.
 */

import type {
  DataRetention,
  DataUsage,
  LegalRequest,
  PrivacyBudgetStatus,
  PrivacyImpact,
  PrivacyImpactScore,
  PrivacyLevelInfo,
  PrivacySettings,
  PrivacyZone,
  PrivacyZoneLevel,
  StatusColor,
  ThirdPartySharing
} from './privacy-dashboard-types'

const MIN_MS = 60 * 1000
const HOUR_MS = 60 * MIN_MS
const DAY_MS = 24 * HOUR_MS

// Format a date into a human friendly "time ago" label.
export const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / MIN_MS)
  const diffHours = Math.floor(diffMs / HOUR_MS)
  const diffDays = Math.floor(diffMs / DAY_MS)

  if (diffMins < 60) {
    return `${diffMins} minutes ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`
  }
  return `${diffDays} days ago`
}

// Default privacy settings used as initial state and on reset.
export const getDefaultPrivacySettings = (): PrivacySettings => ({
  locationSharing: true,
  locationPrecision: 3,
  dataRetentionDays: 30,
  anonymizeData: true,
  differentialPrivacy: true,
  kAnonymity: true,
  endToEndEncryption: true,
  emergencyDataSharing: true,
  researchParticipation: false,
  thirdPartyAnalytics: false,
  automatedDataCleanup: true,
  privacyBudgetAlerts: true
})

// Default mock data usage used to seed the component state.
export const getDefaultDataUsage = (): DataUsage => ({
  totalQueries: 127,
  locationQueries: 45,
  profileViews: 23,
  dataExports: 3,
  lastActivity: new Date(),
  privacyBudgetUsed: 0.65,
  privacyBudgetTotal: 1.0,
  realTimeUsage: [
    {
      timestamp: new Date(Date.now() - 5 * MIN_MS),
      dataType: 'location',
      operation: 'query',
      privacyImpact: 'medium'
    },
    {
      timestamp: new Date(Date.now() - 15 * MIN_MS),
      dataType: 'profile',
      operation: 'view',
      privacyImpact: 'low'
    },
    {
      timestamp: new Date(Date.now() - 30 * MIN_MS),
      dataType: 'emergency',
      operation: 'report',
      privacyImpact: 'high'
    }
  ]
})

// Default mock data retention entries used to seed the component state.
export const getDefaultDataRetention = (): DataRetention[] => [
  {
    dataType: 'Location Data',
    retentionDays: 7,
    autoDelete: true,
    lastAccessed: new Date(Date.now() - 2 * HOUR_MS),
    dataCount: 89,
    dataSize: '1.2 MB'
  },
  {
    dataType: 'Trust Score',
    retentionDays: 90,
    autoDelete: false,
    lastAccessed: new Date(Date.now() - DAY_MS),
    dataCount: 45,
    dataSize: '0.3 MB'
  },
  {
    dataType: 'Emergency Reports',
    retentionDays: 365,
    autoDelete: false,
    lastAccessed: new Date(Date.now() - 7 * DAY_MS),
    dataCount: 12,
    dataSize: '0.8 MB'
  },
  {
    dataType: 'User Profile',
    retentionDays: 30,
    autoDelete: true,
    lastAccessed: new Date(Date.now() - 3 * DAY_MS),
    dataCount: 10,
    dataSize: '0.1 MB'
  }
]

// Default mock privacy zones used to seed the component state.
export const getDefaultPrivacyZones = (): PrivacyZone[] => [
  {
    id: 'home',
    name: 'Home',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    privacyLevel: 'high',
    enabled: true
  },
  {
    id: 'work',
    name: 'Work',
    latitude: 37.7849,
    longitude: -122.4094,
    radius: 200,
    privacyLevel: 'medium',
    enabled: true
  }
]

// Default mock third-party sharing entries used to seed the component state.
export const getDefaultThirdPartySharing = (): ThirdPartySharing[] => [
  {
    partner: 'Emergency Services',
    dataType: 'Location Data',
    purpose: 'Emergency response coordination',
    frequency: 'real-time',
    enabled: true,
    lastShared: new Date(Date.now() - 2 * HOUR_MS)
  },
  {
    partner: 'Research Institute',
    dataType: 'Anonymized Usage Data',
    purpose: 'Emergency response research',
    frequency: 'weekly',
    enabled: false
  }
]

// Default mock legal requests used to seed the component state.
export const getDefaultLegalRequests = (): LegalRequest[] => [
  {
    id: 'req-001',
    type: 'data_access',
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * DAY_MS),
    description: 'Request for all personal data',
    canNotify: true
  }
]

// Default mock privacy impact score used to seed the component state.
export const getDefaultPrivacyImpactScore = (): PrivacyImpactScore => ({
  action: 'location_query',
  score: 75,
  factors: ['Differential privacy enabled', 'K-anonymity active', 'Location precision reduced'],
  recommendations: ['Consider reducing location precision further for enhanced privacy'],
  lastCalculated: new Date()
})

// Map a privacy impact level to a StatusIndicator status string.
export const getPrivacyImpactStatus = (impact: PrivacyImpact): StatusColor => {
  switch (impact) {
    case 'low':
      return 'resolved'
    case 'medium':
      return 'pending'
    case 'high':
      return 'critical'
    default:
      return 'inactive'
  }
}

// Map a privacy zone level to a StatusIndicator status string.
export const getPrivacyZoneStatus = (level: PrivacyZoneLevel): StatusColor => {
  switch (level) {
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

// Compute privacy budget status from used / total values.
export const getPrivacyBudgetStatus = (usage: DataUsage): PrivacyBudgetStatus => {
  const percentage = (usage.privacyBudgetUsed / usage.privacyBudgetTotal) * 100
  if (percentage >= 90) {
    return { status: 'critical', color: 'critical' }
  }
  if (percentage >= 75) {
    return { status: 'warning', color: 'pending' }
  }
  if (percentage >= 50) {
    return { status: 'moderate', color: 'active' }
  }
  return { status: 'good', color: 'resolved' }
}

// Compute the overall privacy level based on which protections are enabled.
export const getPrivacyLevel = (settings: PrivacySettings): PrivacyLevelInfo => {
  const enabledFeatures = [
    settings.anonymizeData,
    settings.differentialPrivacy,
    settings.kAnonymity,
    settings.endToEndEncryption
  ].filter(Boolean).length

  if (enabledFeatures === 4) {
    return { level: 'Maximum', color: 'resolved' }
  }
  if (enabledFeatures >= 3) {
    return { level: 'High', color: 'active' }
  }
  if (enabledFeatures >= 2) {
    return { level: 'Medium', color: 'pending' }
  }
  return { level: 'Basic', color: 'critical' }
}

// Convenience helper to create a new default privacy zone.
export const createPrivacyZone = (
  overrides: Partial<PrivacyZone> = {}
): PrivacyZone => ({
  id: `zone-${Date.now()}`,
  name: 'New Zone',
  latitude: 37.7749,
  longitude: -122.4194,
  radius: 100,
  privacyLevel: 'medium',
  enabled: true,
  ...overrides
})
