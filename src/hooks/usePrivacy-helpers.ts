/**
 * Privacy Management Helpers for OpenRelief
 *
 * Standalone utility functions extracted from usePrivacy.
 */

import type {
  PrivacySettings,
  PrivacyContext,
  PrivacyAuditLog,
  LegalRequest
} from './usePrivacy-types'

// Calculate privacy level based on enabled features
export const calculatePrivacyLevel = (
  settings: PrivacySettings
): 'basic' | 'medium' | 'high' | 'maximum' => {
  const enabledFeatures = [
    settings.anonymizeData,
    settings.differentialPrivacy,
    settings.kAnonymity,
    settings.endToEndEncryption
  ].filter(Boolean).length

  if (enabledFeatures === 4) {
    return 'maximum'
  }
  if (enabledFeatures === 3) {
    return 'high'
  }
  if (enabledFeatures === 2) {
    return 'medium'
  }
  return 'basic'
}

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

// Generate a unique id using a consistent prefix and suffix pattern
export const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Build the initial privacy context used by usePrivacy's state.
export const createInitialPrivacyContext = (): PrivacyContext => ({
  settings: {
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
    privacyBudgetAlerts: true,
    legalNotifications: true,
    dataProcessingPurposes: ['service_delivery', 'safety_monitoring'],
    consentManagement: true,
    realTimeMonitoring: true
  },
  updateSettings: () => {},
  isPrivacyEnabled: true,
  privacyLevel: 'high',
  granularPermissions: [],
  privacyZones: [],
  emergencyPreferences: [],
  trustScoreSettings: {
    visibility: 'private',
    calculationTransparency: 'basic',
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
  },
  dataProcessingPurposes: [],
  legalRequests: [],
  notificationSettings: {
    dataProcessingAlerts: true,
    privacyBudgetWarnings: true,
    legalRequestUpdates: true,
    thirdPartySharingAlerts: true,
    unusualAccessAlerts: true,
    dataBreachNotifications: true,
    systemStatusChanges: true
  },
  auditLogs: []
})

// Compute a privacy impact assessment for a given action/data type/sensitivity.
export const assessPrivacyImpactFor = (
  settings: PrivacySettings,
  _action: string,
  dataType: string,
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): {
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
  privacyScore: number // 0-100
} => {
  let riskLevel: 'low' | 'medium' | 'high' = 'medium'
  let privacyScore = 50
  const recommendations: string[] = []

  if (dataType === 'location' && sensitivity === 'high') {
    riskLevel = 'high'
    privacyScore = 20
    recommendations.push('Use differential privacy with low epsilon')
    recommendations.push('Reduce location precision')
    recommendations.push('Apply k-anonymity with k >= 5')
  } else if (dataType === 'userProfile' && sensitivity === 'medium') {
    riskLevel = 'medium'
    privacyScore = 40
    recommendations.push('Anonymize personal identifiers')
    recommendations.push('Apply data minimization principles')
  } else {
    riskLevel = 'low'
    privacyScore = 80
    recommendations.push('Standard privacy protections sufficient')
  }

  if (settings.differentialPrivacy) {
    privacyScore += 5
  }
  if (settings.kAnonymity) {
    privacyScore += 5
  }
  if (settings.anonymizeData) {
    privacyScore += 5
  }
  if (settings.endToEndEncryption) {
    privacyScore += 5
  }

  privacyScore = Math.min(100, privacyScore)

  return {
    riskLevel,
    recommendations,
    privacyScore
  }
}

// Build a privacy report summary and metrics from the current context.
export const generatePrivacyReportFor = (
  privacyContext: PrivacyContext,
  privacyBudget: number
): {
  summary: string
  dataUsage: Record<string, number>
  privacyMetrics: Record<string, unknown>
  recommendations: string[]
} => {
  const summary =
    `Privacy Level: ${privacyContext.privacyLevel.toUpperCase()}. ` +
    `Your data is protected using ${privacyContext.settings.differentialPrivacy ? 'differential privacy, ' : ''}` +
    `${privacyContext.settings.kAnonymity ? 'k-anonymity, ' : ''}` +
    `${privacyContext.settings.anonymizeData ? 'data anonymization, ' : ''}` +
    `${privacyContext.settings.endToEndEncryption ? 'and end-to-end encryption.' : '.'}`

  const dataUsage = {
    locationQueries: 0,
    profileViews: 0,
    dataExports: 0,
    privacyBudgetUsed: privacyBudget
  }

  const privacyMetrics = {
    privacyLevel: privacyContext.privacyLevel,
    enabledFeatures: [
      privacyContext.settings.differentialPrivacy && 'Differential Privacy',
      privacyContext.settings.kAnonymity && 'K-Anonymity',
      privacyContext.settings.anonymizeData && 'Data Anonymization',
      privacyContext.settings.endToEndEncryption && 'End-to-End Encryption'
    ].filter(Boolean),
    locationPrecision: privacyContext.settings.locationPrecision,
    dataRetentionDays: privacyContext.settings.dataRetentionDays
  }

  const recommendations = []
  if (privacyContext.privacyLevel === 'basic' || privacyContext.privacyLevel === 'medium') {
    recommendations.push('Enable more privacy features for enhanced protection')
  }
  if (privacyContext.settings.locationPrecision > 3) {
    recommendations.push('Consider reducing location precision for better privacy')
  }
  if (privacyContext.settings.dataRetentionDays > 90) {
    recommendations.push('Consider reducing data retention period')
  }

  return {
    summary,
    dataUsage,
    privacyMetrics,
    recommendations
  }
}

// Build a transparency report from audit logs, legal requests, and permissions.
export const generateTransparencyReportFor = (
  auditLogs: PrivacyAuditLog[],
  legalRequests: LegalRequest[],
  granularPermissionNames: { name: string; enabled: boolean; retentionDays: number }[],
  privacyBudget: number
) => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentLogs = auditLogs.filter(log => log.timestamp >= thirtyDaysAgo)

  const dataProcessingByType = recentLogs.reduce(
    (acc, log) => {
      const dt = log.dataType || 'unknown'
      if (!acc[dt]) {
        acc[dt] = 0
      }
      acc[dt]++
      return acc
    },
    {} as Record<string, number>
  )

  const privacyImpacts = recentLogs.reduce(
    (acc, log) => {
      const pi = log.privacyImpact || 'unknown'
      if (!acc[pi]) {
        acc[pi] = 0
      }
      acc[pi]++
      return acc
    },
    {} as Record<string, number>
  )

  const legalRequestsByStatus = legalRequests.reduce(
    (acc, request) => {
      const st = request.status || 'unknown'
      if (!acc[st]) {
        acc[st] = 0
      }
      acc[st]++
      return acc
    },
    {} as Record<string, number>
  )

  return {
    reportPeriod: {
      start: thirtyDaysAgo.toISOString(),
      end: now.toISOString()
    },
    dataProcessing: {
      totalOperations: recentLogs.length,
      byType: dataProcessingByType,
      privacyImpacts
    },
    legalRequests: {
      total: legalRequests.length,
      byStatus: legalRequestsByStatus
    },
    privacyBudget: {
      used: privacyBudget,
      remaining: 1.0 - privacyBudget
    },
    dataRetention: {
      enabledDataTypes: granularPermissionNames.filter(p => p.enabled).map(p => p.name),
      averageRetentionDays:
        granularPermissionNames.reduce((sum, p) => sum + p.retentionDays, 0) /
        Math.max(granularPermissionNames.length, 1)
    }
  }
}
