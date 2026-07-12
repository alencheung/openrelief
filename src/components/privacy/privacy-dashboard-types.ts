/**
 * Privacy Dashboard - Type Definitions
 *
 * Type definitions extracted from PrivacyDashboard.tsx to keep the main
 * component module under the 500 line lint budget.
 */

export type PrivacyImpact = 'low' | 'medium' | 'high'
export type PrivacyZoneLevel = 'high' | 'medium' | 'low'
export type SharingFrequency = 'real-time' | 'daily' | 'weekly' | 'monthly'
export type LegalRequestType = 'data_access' | 'deletion' | 'correction' | 'portability'
export type LegalRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected'

// Types for privacy settings
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
}

export interface RealTimeUsageEntry {
  timestamp: Date
  dataType: string
  operation: string
  privacyImpact: PrivacyImpact
}

export interface DataUsage {
  totalQueries: number
  locationQueries: number
  profileViews: number
  dataExports: number
  lastActivity: Date
  privacyBudgetUsed: number
  privacyBudgetTotal: number
  realTimeUsage: RealTimeUsageEntry[]
}

export interface DataRetention {
  dataType: string
  retentionDays: number
  autoDelete: boolean
  lastAccessed: Date
  dataCount: number
  dataSize: string
}

export interface PrivacyZone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
  privacyLevel: PrivacyZoneLevel
  enabled: boolean
}

export interface ThirdPartySharing {
  partner: string
  dataType: string
  purpose: string
  frequency: SharingFrequency
  enabled: boolean
  lastShared?: Date
}

export interface LegalRequest {
  id: string
  type: LegalRequestType
  status: LegalRequestStatus
  createdAt: Date
  description: string
  canNotify: boolean
}

export interface PrivacyImpactScore {
  action: string
  score: number
  factors: string[]
  recommendations: string[]
  lastCalculated: Date
}

export type PrivacyDashboardTab =
  | 'overview'
  | 'settings'
  | 'usage'
  | 'retention'
  | 'zones'
  | 'sharing'
  | 'legal'

export type StatusColor = 'resolved' | 'pending' | 'critical' | 'active' | 'inactive'

export type PrivacyBudgetStatusKind = 'critical' | 'warning' | 'moderate' | 'good'

export interface PrivacyBudgetStatus {
  status: PrivacyBudgetStatusKind
  color: StatusColor
}

export interface PrivacyLevelInfo {
  level: 'Maximum' | 'High' | 'Medium' | 'Basic'
  color: StatusColor
}
