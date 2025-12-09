/**
 * Privacy Management Hook for OpenRelief
 *
 * This hook provides a centralized way to manage privacy settings,
 * data anonymization, and privacy budget tracking throughout the application.
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  addNoiseToLocation,
  checkPrivacyBudget,
  consumePrivacyBudget,
  initializePrivacyBudget,
  DEFAULT_DP_CONFIGS,
  type DPConfig
} from '@/lib/privacy/differential-privacy'
import {
  reduceLocationPrecision,
  createPrivacyGrid,
  enforceKAnonymity,
  applyTemporalDecay,
  anonymizeUserData,
  DEFAULT_K_ANONYMITY_CONFIGS,
  DEFAULT_TEMPORAL_DECAY_CONFIGS,
  type KAnonymityConfig,
  type TemporalDecayConfig
} from '@/lib/privacy/anonymization'
import {
  encryptUserData,
  decryptUserData,
  createHashDigest,
  generateSessionToken,
  verifySessionToken,
  type EncryptedData
} from '@/lib/privacy/cryptography'

// Privacy settings interface
export interface PrivacySettings {
  locationSharing: boolean;
  locationPrecision: number;
  dataRetentionDays: number;
  anonymizeData: boolean;
  differentialPrivacy: boolean;
  kAnonymity: boolean;
  endToEndEncryption: boolean;
  emergencyDataSharing: boolean;
  researchParticipation: boolean;
  thirdPartyAnalytics: boolean;
  automatedDataCleanup: boolean;
  privacyBudgetAlerts: boolean;
  legalNotifications: boolean;
  dataProcessingPurposes: string[];
  consentManagement: boolean;
  realTimeMonitoring: boolean;
}

// Enhanced privacy settings for granular controls
export interface GranularDataPermissions {
  id: string;
  name: string;
  category: 'location' | 'profile' | 'emergency' | 'communication' | 'analytics';
  enabled: boolean;
  retentionDays: number;
  purposeLimitation: string[];
  sharingSettings: {
    emergencyServices: boolean;
    researchParticipation: boolean;
    thirdPartyAnalytics: boolean;
    lawEnforcement: boolean;
  };
  encryptionLevel: 'none' | 'basic' | 'standard' | 'enhanced' | 'maximum';
  lastModified: Date;
}

// Privacy zone settings
export interface PrivacyZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  privacyLevel: 'public' | 'private' | 'restricted' | 'sanitized';
  exceptions: {
    emergencyServices: boolean;
    trustedContacts: boolean;
    familyMembers: boolean;
  };
  activeHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  createdAt: Date;
}

// Emergency data sharing preferences
export interface EmergencyDataPreference {
  id: string;
  scenario: 'medical_emergency' | 'natural_disaster' | 'security_incident' | 'missing_person';
  dataTypes: string[];
  sharingLevel: 'minimal' | 'standard' | 'comprehensive';
  autoShare: boolean;
  durationHours: number;
  trustedRecipients: string[];
  geofenceRequired: boolean;
}

// Trust score settings
export interface TrustScoreSettings {
  visibility: 'public' | 'private' | 'friends_only' | 'emergency_only';
  calculationTransparency: 'minimal' | 'basic' | 'detailed' | 'full';
  dataSources: {
    emergencyResponses: boolean;
    communityFeedback: boolean;
    responseTime: boolean;
    reliability: boolean;
    skillVerification: boolean;
  };
  appealProcess: {
    enabled: boolean;
    timeframe: number; // days
    contactMethod: 'email' | 'phone' | 'in_app' | 'mail';
  };
}

// Data processing purpose settings
export interface DataProcessingPurpose {
  id: string;
  name: string;
  description: string;
  category: 'service_delivery' | 'safety_monitoring' | 'research_analytics' | 'legal_compliance' | 'user_experience';
  required: boolean;
  dataTypes: string[];
  retentionDays: number;
  processingLocation: 'local' | 'regional' | 'national' | 'international';
  userConsent: 'explicit' | 'implicit' | 'opt_out';
  lastReviewed: Date;
}

// Legal request tracking
export interface LegalRequest {
  id: string;
  type: 'data_access' | 'deletion' | 'correction' | 'portability' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'appealed';
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  responseDeadline?: Date;
  estimatedCompletion?: Date;
  canUserContact: boolean;
}

// Privacy notification settings
export interface PrivacyNotificationSettings {
  dataProcessingAlerts: boolean;
  privacyBudgetWarnings: boolean;
  legalRequestUpdates: boolean;
  thirdPartySharingAlerts: boolean;
  unusualAccessAlerts: boolean;
  dataBreachNotifications: boolean;
  systemStatusChanges: boolean;
}

// Privacy audit log entry
export interface PrivacyAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  dataType: string;
  dataTypes: string[];
  privacyImpact: 'low' | 'medium' | 'high';
  legalBasis: string;
  retentionPeriod: number;
  automatedDecision: boolean;
  dataSubjects: number;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

// Privacy context interface
export interface PrivacyContext {
  settings: PrivacySettings;
  updateSettings: (settings: Partial<PrivacySettings>) => void;
  isPrivacyEnabled: boolean;
  privacyLevel: 'basic' | 'medium' | 'high' | 'maximum';
  granularPermissions: GranularDataPermissions[];
  privacyZones: PrivacyZone[];
  emergencyPreferences: EmergencyDataPreference[];
  trustScoreSettings: TrustScoreSettings;
  dataProcessingPurposes: DataProcessingPurpose[];
  legalRequests: LegalRequest[];
  notificationSettings: PrivacyNotificationSettings;
  auditLogs: PrivacyAuditLog[];
}

// Location data interface
export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp?: Date;
  userId?: string;
}

// Privacy-protected data interface
export interface PrivacyProtectedData<T> {
  data: T;
  isAnonymized: boolean;
  hasDifferentialPrivacy: boolean;
  privacyBudgetUsed: number;
  processingTime: number;
}

// Hook options
interface UsePrivacyOptions {
  userId?: string;
  autoInitialize?: boolean;
  enableLogging?: boolean;
}

export const usePrivacy = (options: UsePrivacyOptions = {}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [privacyContext, setPrivacyContext] = useState<PrivacyContext>({
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
  const [privacyBudget, setPrivacyBudget] = useState(1.0)
  const [realTimeDataUsage, setRealTimeDataUsage] = useState<Record<string, number>>({})
  const [privacyAlerts, setPrivacyAlerts] = useState<any[]>([])

  // Initialize privacy settings and budget
  useEffect(() => {
    if (options.autoInitialize !== false) {
      initializePrivacy()
    }
  }, [options.userId])

  const initializePrivacy = useCallback(async () => {
    setIsLoading(true)
    try {
      // Initialize privacy budget for user
      if (options.userId) {
        initializePrivacyBudget(options.userId)
      }

      // Load privacy settings from storage or API
      // In a real implementation, fetch from API
      // const response = await fetch('/api/privacy/settings');
      // const settings = await response.json();

      // Calculate privacy level based on settings
      const calculatePrivacyLevel = (settings: PrivacySettings): 'basic' | 'medium' | 'high' | 'maximum' => {
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

      const privacyLevel = calculatePrivacyLevel(privacyContext.settings)

      setPrivacyContext(prev => ({
        ...prev,
        privacyLevel,
        updateSettings: (newSettings: Partial<PrivacySettings>) => {
          setPrivacyContext(current => {
            const updatedSettings = { ...current.settings, ...newSettings }
            const updatedLevel = calculatePrivacyLevel(updatedSettings)

            return {
              ...current,
              settings: updatedSettings,
              privacyLevel: updatedLevel
            }
          })
        }
      }))
    } catch (error) {
      console.error('Failed to initialize privacy:', error)
      if (options.enableLogging !== false) {
        toast({
          title: 'Privacy Initialization Failed',
          description: 'Could not initialize privacy settings',
          variant: 'destructive'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [options.userId, toast, options.enableLogging, privacyContext.settings])

  // Protect location data with privacy measures
  const protectLocationData = useCallback((
    location: LocationData,
    options: {
      applyDifferentialPrivacy?: boolean;
      applyAnonymization?: boolean;
      precisionLevel?: number;
    } = {}
  ): PrivacyProtectedData<LocationData> => {
    const startTime = Date.now()
    let protectedLocation = { ...location }
    let isAnonymized = false
    let hasDifferentialPrivacy = false
    let privacyBudgetUsed = 0

    try {
      // Apply location precision reduction
      if (options.applyAnonymization !== false && privacyContext.settings.anonymizeData) {
        const precision = options.precisionLevel || privacyContext.settings.locationPrecision
        protectedLocation = reduceLocationPrecision(
          protectedLocation.latitude,
          protectedLocation.longitude,
          precision
        )
        isAnonymized = true
      }

      // Apply privacy grid
      if (options.applyAnonymization !== false && privacyContext.settings.kAnonymity) {
        const gridLocation = createPrivacyGrid(
          protectedLocation.latitude,
          protectedLocation.longitude,
          2 // 2km grid
        )
        protectedLocation = { ...protectedLocation, ...gridLocation }
        isAnonymized = true
      }

      // Apply differential privacy
      if (options.applyDifferentialPrivacy !== false && privacyContext.settings.differentialPrivacy) {
        const epsilonRequired = DEFAULT_DP_CONFIGS.location.epsilon

        if (options.userId && checkPrivacyBudget(options.userId, 'location', epsilonRequired)) {
          const noisyLocation = addNoiseToLocation(
            protectedLocation.latitude,
            protectedLocation.longitude,
            DEFAULT_DP_CONFIGS.location
          )
          protectedLocation = { ...protectedLocation, ...noisyLocation }
          hasDifferentialPrivacy = true
          privacyBudgetUsed = epsilonRequired

          consumePrivacyBudget(
            options.userId,
            'location',
            epsilonRequired,
            'location_query'
          )
        } else if (options.enableLogging !== false) {
          toast({
            title: 'Privacy Budget Exceeded',
            description: 'Location query processed without differential privacy',
            variant: 'destructive'
          })
        }
      }
    } catch (error) {
      console.error('Error protecting location data:', error)
      if (options.enableLogging !== false) {
        toast({
          title: 'Privacy Protection Failed',
          description: 'Could not apply privacy measures to location data',
          variant: 'destructive'
        })
      }
    }

    const processingTime = Date.now() - startTime

    return {
      data: protectedLocation,
      isAnonymized,
      hasDifferentialPrivacy,
      privacyBudgetUsed,
      processingTime
    }
  }, [privacyContext.settings, toast])

  // Protect user data with privacy measures
  const protectUserData = useCallback(<T extends Record<string, any>>(
    data: T[],
    options: {
      applyKAnonymity?: boolean;
      applyDifferentialPrivacy?: boolean;
      clusterUsers?: boolean;
      kAnonymityConfig?: KAnonymityConfig;
    } = {}
  ): PrivacyProtectedData<T[]> => {
    const startTime = Date.now()
    let protectedData = [...data]
    let isAnonymized = false
    let hasDifferentialPrivacy = false
    let privacyBudgetUsed = 0

    try {
      // Apply k-anonymity
      if (options.applyKAnonymity !== false && privacyContext.settings.kAnonymity) {
        const kConfig = options.kAnonymityConfig || DEFAULT_K_ANONYMITY_CONFIGS.userProfile
        protectedData = enforceKAnonymity(protectedData, kConfig)
        isAnonymized = true
      }

      // Apply differential privacy to sensitive fields
      if (options.applyDifferentialPrivacy !== false && privacyContext.settings.differentialPrivacy) {
        const epsilonRequired = DEFAULT_DP_CONFIGS.userProfile.epsilon

        if (options.userId && checkPrivacyBudget(options.userId, 'userProfile', epsilonRequired)) {
          // Apply noise to numeric fields
          protectedData = protectedData.map(record => {
            const protectedRecord = { ...record }

            // Add noise to numeric fields
            Object.keys(protectedRecord).forEach(key => {
              if (typeof protectedRecord[key] === 'number') {
                protectedRecord[key] = protectedRecord[key] + (Math.random() - 0.5) * 0.1 // Small noise
              }
            })

            return protectedRecord
          })

          hasDifferentialPrivacy = true
          privacyBudgetUsed = epsilonRequired

          consumePrivacyBudget(
            options.userId,
            'userProfile',
            epsilonRequired,
            'profile_query'
          )
        }
      }

      // Apply comprehensive anonymization
      if (privacyContext.settings.anonymizeData) {
        protectedData = anonymizeUserData(protectedData, {
          locationPrecision: privacyContext.settings.locationPrecision,
          applyKAnonymity: privacyContext.settings.kAnonymity,
          applyDifferentialPrivacy: privacyContext.settings.differentialPrivacy,
          clusterUsers: options.clusterUsers
        })
        isAnonymized = true
      }
    } catch (error) {
      console.error('Error protecting user data:', error)
      if (options.enableLogging !== false) {
        toast({
          title: 'Privacy Protection Failed',
          description: 'Could not apply privacy measures to user data',
          variant: 'destructive'
        })
      }
    }

    const processingTime = Date.now() - startTime

    return {
      data: protectedData,
      isAnonymized,
      hasDifferentialPrivacy,
      privacyBudgetUsed,
      processingTime
    }
  }, [privacyContext.settings, toast])

  // Encrypt sensitive data
  const encryptSensitiveData = useCallback(async (
    data: Record<string, any>,
    userId: string
  ): Promise<EncryptedData | null> => {
    if (!privacyContext.settings.endToEndEncryption) {
      return null
    }

    try {
      // In a real implementation, you would use a secure key management system
      // For this example, we'll use a mock master key
      const masterKey = Buffer.from('mock-master-key-for-demo-purposes-only', 'utf8')

      const encryptedData = await encryptUserData(userId, data, masterKey)
      return encryptedData
    } catch (error) {
      console.error('Error encrypting data:', error)
      toast({
        title: 'Encryption Failed',
        description: 'Could not encrypt sensitive data',
        variant: 'destructive'
      })
      return null
    }
  }, [privacyContext.settings.endToEndEncryption, toast])

  // Decrypt sensitive data
  const decryptSensitiveData = useCallback(async (
    encryptedData: EncryptedData,
    userId: string
  ): Promise<Record<string, any> | null> => {
    if (!privacyContext.settings.endToEndEncryption) {
      return null
    }

    try {
      // In a real implementation, you would use a secure key management system
      const masterKey = Buffer.from('mock-master-key-for-demo-purposes-only', 'utf8')

      const decryptedData = await decryptUserData(userId, encryptedData, masterKey)
      return decryptedData
    } catch (error) {
      console.error('Error decrypting data:', error)
      toast({
        title: 'Decryption Failed',
        description: 'Could not decrypt sensitive data',
        variant: 'destructive'
      })
      return null
    }
  }, [privacyContext.settings.endToEndEncryption, toast])

  // Apply temporal decay to data
  const applyTemporalDecayToData = useCallback((
    value: number,
    timestamp: Date,
    dataType: 'trustScore' | 'location' | 'emergencyData' = 'trustScore'
  ): number => {
    const config = DEFAULT_TEMPORAL_DECAY_CONFIGS[dataType]
    return applyTemporalDecay(value, timestamp, config)
  }, [])

  // Create privacy impact assessment
  const assessPrivacyImpact = useCallback((
    action: string,
    dataType: string,
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): {
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
    privacyScore: number; // 0-100
  } => {
    let riskLevel: 'low' | 'medium' | 'high' = 'medium'
    let privacyScore = 50
    const recommendations: string[] = []

    // Assess risk based on data type and sensitivity
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

    // Adjust score based on current privacy settings
    if (privacyContext.settings.differentialPrivacy) {
      privacyScore += 15
    }
    if (privacyContext.settings.kAnonymity) {
      privacyScore += 15
    }
    if (privacyContext.settings.anonymizeData) {
      privacyScore += 10
    }
    if (privacyContext.settings.endToEndEncryption) {
      privacyScore += 10
    }

    // Cap at 100
    privacyScore = Math.min(100, privacyScore)

    return {
      riskLevel,
      recommendations,
      privacyScore
    }
  }, [privacyContext.settings])

  // Generate privacy report
  const generatePrivacyReport = useCallback((): {
    summary: string;
    dataUsage: Record<string, number>;
    privacyMetrics: Record<string, any>;
    recommendations: string[];
  } => {
    const summary = `Privacy Level: ${privacyContext.privacyLevel.toUpperCase()}. `
      + `Your data is protected using ${privacyContext.settings.differentialPrivacy ? 'differential privacy, ' : ''}`
      + `${privacyContext.settings.kAnonymity ? 'k-anonymity, ' : ''}`
      + `${privacyContext.settings.anonymizeData ? 'data anonymization, ' : ''}`
      + `${privacyContext.settings.endToEndEncryption ? 'and end-to-end encryption.' : '.'}`

    const dataUsage = {
      locationQueries: 0, // Would be tracked in a real implementation
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
  }, [privacyContext, privacyBudget])

  // Manage granular data permissions
  const updateGranularPermission = useCallback((
    permissionId: string,
    updates: Partial<GranularDataPermissions>
  ) => {
    setPrivacyContext(prev => ({
      ...prev,
      granularPermissions: prev.granularPermissions.map(permission =>
        permission.id === permissionId
          ? { ...permission, ...updates, lastModified: new Date() }
          : permission
      )
    }))
  }, [])

  // Add new granular permission
  const addGranularPermission = useCallback((
    permission: Omit<GranularDataPermissions, 'id' | 'lastModified'>
  ) => {
    const newPermission: GranularDataPermissions = {
      ...permission,
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastModified: new Date()
    }

    setPrivacyContext(prev => ({
      ...prev,
      granularPermissions: [...prev.granularPermissions, newPermission]
    }))
  }, [])

  // Remove granular permission
  const removeGranularPermission = useCallback((permissionId: string) => {
    setPrivacyContext(prev => ({
      ...prev,
      granularPermissions: prev.granularPermissions.filter(
        permission => permission.id !== permissionId
      )
    }))
  }, [])

  // Manage privacy zones
  const addPrivacyZone = useCallback((
    zone: Omit<PrivacyZone, 'id' | 'createdAt'>
  ) => {
    const newZone: PrivacyZone = {
      ...zone,
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    }

    setPrivacyContext(prev => ({
      ...prev,
      privacyZones: [...prev.privacyZones, newZone]
    }))
  }, [])

  const updatePrivacyZone = useCallback((
    zoneId: string,
    updates: Partial<PrivacyZone>
  ) => {
    setPrivacyContext(prev => ({
      ...prev,
      privacyZones: prev.privacyZones.map(zone =>
        zone.id === zoneId ? { ...zone, ...updates } : zone
      )
    }))
  }, [])

  const removePrivacyZone = useCallback((zoneId: string) => {
    setPrivacyContext(prev => ({
      ...prev,
      privacyZones: prev.privacyZones.filter(zone => zone.id !== zoneId)
    }))
  }, [])

  // Check if location is within a privacy zone
  const checkPrivacyZone = useCallback((
    latitude: number,
    longitude: number
  ): PrivacyZone | null => {
    for (const zone of privacyContext.privacyZones) {
      const distance = calculateDistance(
        latitude, longitude,
        zone.latitude, zone.longitude
      )

      if (distance <= zone.radius) {
        // Check if current time is within active hours
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        if (currentTime >= zone.activeHours.start && currentTime <= zone.activeHours.end) {
          return zone
        }
      }
    }
    return null
  }, [privacyContext.privacyZones])

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371 // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a
      = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }, [])

  // Generate transparency report
  const generateTransparencyReport = useCallback(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentLogs = privacyContext.auditLogs.filter(
      log => log.timestamp >= thirtyDaysAgo
    )

    const dataProcessingByType = recentLogs.reduce((acc, log) => {
      if (!acc[log.dataType]) {
        acc[log.dataType] = 0
      }
      acc[log.dataType]++
      return acc
    }, {} as Record<string, number>)

    const privacyImpacts = recentLogs.reduce((acc, log) => {
      if (!acc[log.privacyImpact]) {
        acc[log.privacyImpact] = 0
      }
      acc[log.privacyImpact]++
      return acc
    }, {} as Record<string, number>)

    const legalRequestsByStatus = privacyContext.legalRequests.reduce((acc, request) => {
      if (!acc[request.status]) {
        acc[request.status] = 0
      }
      acc[request.status]++
      return acc
    }, {} as Record<string, number>)

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
        total: privacyContext.legalRequests.length,
        byStatus: legalRequestsByStatus
      },
      privacyBudget: {
        used: privacyBudget,
        remaining: 1.0 - privacyBudget
      },
      dataRetention: {
        enabledDataTypes: privacyContext.granularPermissions
          .filter(p => p.enabled)
          .map(p => p.name),
        averageRetentionDays: privacyContext.granularPermissions
          .reduce((sum, p) => sum + p.retentionDays, 0)
          / Math.max(privacyContext.granularPermissions.length, 1)
      }
    }
  }, [privacyContext, privacyBudget])

  // Add privacy audit log entry
  const addAuditLog = useCallback((
    log: Omit<PrivacyAuditLog, 'id' | 'timestamp'>
  ) => {
    const newLog: PrivacyAuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setPrivacyContext(prev => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 1000) // Keep only last 1000 logs
    }))
  }, [])

  // Real-time data usage tracking
  const trackDataUsage = useCallback((
    dataType: string,
    amount: number = 1
  ) => {
    setRealTimeDataUsage(prev => ({
      ...prev,
      [dataType]: (prev[dataType] || 0) + amount
    }))

    // Add to audit log
    addAuditLog({
      userId: options.userId || 'anonymous',
      action: 'data_access',
      dataType,
      dataTypes: [dataType],
      privacyImpact: 'low',
      legalBasis: 'user_consent',
      retentionPeriod: privacyContext.settings.dataRetentionDays,
      automatedDecision: false,
      dataSubjects: 1,
      ipAddress: 'client',
      userAgent: navigator.userAgent
    })
  }, [options.userId, privacyContext.settings.dataRetentionDays, addAuditLog])

  // Privacy budget monitoring
  const monitorPrivacyBudget = useCallback(() => {
    if (privacyBudget < 0.2 && privacyContext.settings.privacyBudgetAlerts) {
      setPrivacyAlerts(prev => [
        ...prev,
        {
          id: `alert_${Date.now()}`,
          type: 'privacy_budget_warning',
          message: 'Your privacy budget is running low. Consider adjusting your privacy settings.',
          timestamp: new Date(),
          severity: 'warning'
        }
      ])
    }
  }, [privacyBudget, privacyContext.settings.privacyBudgetAlerts])

  // Clear privacy alerts
  const clearPrivacyAlert = useCallback((alertId: string) => {
    setPrivacyAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  // Clear all privacy alerts
  const clearAllPrivacyAlerts = useCallback(() => {
    setPrivacyAlerts([])
  }, [])

  // Monitor privacy budget
  useEffect(() => {
    if (privacyContext.settings.realTimeMonitoring) {
      const interval = setInterval(() => {
        monitorPrivacyBudget()
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }, [privacyContext.settings.realTimeMonitoring, monitorPrivacyBudget])

  return {
    isLoading,
    privacyContext,
    privacyBudget,
    realTimeDataUsage,
    privacyAlerts,
    protectLocationData,
    protectUserData,
    encryptSensitiveData,
    decryptSensitiveData,
    applyTemporalDecayToData,
    assessPrivacyImpact,
    generatePrivacyReport,
    generateTransparencyReport,
    initializePrivacy,
    updateGranularPermission,
    addGranularPermission,
    removeGranularPermission,
    addPrivacyZone,
    updatePrivacyZone,
    removePrivacyZone,
    checkPrivacyZone,
    addAuditLog,
    trackDataUsage,
    monitorPrivacyBudget,
    clearPrivacyAlert,
    clearAllPrivacyAlerts
  }
}