/**
 * Privacy Management Hook for OpenRelief
 *
 * This hook provides a centralized way to manage privacy settings,
 * data anonymization, and privacy budget tracking throughout the application.
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { initializePrivacyBudget } from '@/lib/privacy/differential-privacy'
import {
  applyTemporalDecay,
  DEFAULT_TEMPORAL_DECAY_CONFIGS,
  type KAnonymityConfig
} from '@/lib/privacy/anonymization'
import type { EncryptedData } from '@/lib/privacy/cryptography'

// Re-export types and helpers for backward compatibility
export * from './usePrivacy-types'
export * from './usePrivacy-helpers'
export * from './usePrivacy-protection'
import type {
  PrivacySettings,
  GranularDataPermissions,
  PrivacyZone,
  LegalRequest,
  PrivacyAuditLog,
  PrivacyAlert,
  PrivacyContext,
  LocationData,
  PrivacyProtectedData,
  UsePrivacyOptions
} from './usePrivacy-types'
import {
  calculatePrivacyLevel,
  calculateDistance,
  generateId,
  assessPrivacyImpactFor,
  generatePrivacyReportFor,
  generateTransparencyReportFor,
  createInitialPrivacyContext
} from './usePrivacy-helpers'
import {
  protectLocationDataFor,
  protectUserDataFor,
  encryptSensitiveDataFor,
  decryptSensitiveDataFor
} from './usePrivacy-protection'

export const usePrivacy = (options: UsePrivacyOptions = {}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [privacyContext, setPrivacyContext] = useState<PrivacyContext>(
    createInitialPrivacyContext()
  )
  const [privacyBudget, setPrivacyBudget] = useState(1.0)
  const [realTimeDataUsage, setRealTimeDataUsage] = useState<Record<string, number>>({})
  const [privacyAlerts, setPrivacyAlerts] = useState<PrivacyAlert[]>([])

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
  const protectLocationData = useCallback(
    (
      location: LocationData,
      options: {
        applyDifferentialPrivacy?: boolean
        applyAnonymization?: boolean
        precisionLevel?: number
        userId?: string
        enableLogging?: boolean
      } = {}
    ): PrivacyProtectedData<LocationData> => {
      return protectLocationDataFor(privacyContext.settings, toast, location, options)
    },
    [privacyContext.settings, toast]
  )

  // Protect user data with privacy measures
  const protectUserData = useCallback(
    <T extends Record<string, unknown>>(
      data: T[],
      options: {
        applyKAnonymity?: boolean
        applyDifferentialPrivacy?: boolean
        clusterUsers?: boolean
        kAnonymityConfig?: KAnonymityConfig
        userId?: string
        enableLogging?: boolean
      } = {}
    ): PrivacyProtectedData<T[]> => {
      return protectUserDataFor(privacyContext.settings, toast, data, options)
    },
    [privacyContext.settings, toast]
  )

  // Encrypt sensitive data
  const encryptSensitiveData = useCallback(
    async (data: Record<string, unknown>, userId: string): Promise<EncryptedData | null> => {
      return encryptSensitiveDataFor(
        privacyContext.settings.endToEndEncryption,
        toast,
        data,
        userId
      )
    },
    [privacyContext.settings.endToEndEncryption, toast]
  )

  // Decrypt sensitive data
  const decryptSensitiveData = useCallback(
    async (encryptedData: EncryptedData, userId: string): Promise<Record<string, unknown> | null> => {
      return decryptSensitiveDataFor(
        privacyContext.settings.endToEndEncryption,
        toast,
        encryptedData,
        userId
      )
    },
    [privacyContext.settings.endToEndEncryption, toast]
  )

  // Apply temporal decay to data
  const applyTemporalDecayToData = useCallback(
    (
      value: number,
      timestamp: Date,
      dataType: 'trustScore' | 'location' | 'emergencyData' = 'trustScore'
    ): number => {
      const config = DEFAULT_TEMPORAL_DECAY_CONFIGS[dataType]
      return applyTemporalDecay(value, timestamp, config)
    },
    []
  )

  // Create privacy impact assessment
  const assessPrivacyImpact = useCallback(
    (
      action: string,
      dataType: string,
      sensitivity: 'low' | 'medium' | 'high' = 'medium'
    ): {
      riskLevel: 'low' | 'medium' | 'high'
      recommendations: string[]
      privacyScore: number // 0-100
    } => {
      return assessPrivacyImpactFor(privacyContext.settings, action, dataType, sensitivity)
    },
    [privacyContext.settings]
  )

  // Generate privacy report
  const generatePrivacyReport = useCallback((): {
    summary: string
    dataUsage: Record<string, number>
    privacyMetrics: Record<string, unknown>
    recommendations: string[]
  } => {
    return generatePrivacyReportFor(privacyContext, privacyBudget)
  }, [privacyContext, privacyBudget])

  // Manage granular data permissions
  const updateGranularPermission = useCallback(
    (permissionId: string, updates: Partial<GranularDataPermissions>) => {
      setPrivacyContext(prev => ({
        ...prev,
        granularPermissions: prev.granularPermissions.map(permission =>
          permission.id === permissionId
            ? { ...permission, ...updates, lastModified: new Date() }
            : permission
        )
      }))
    },
    []
  )

  // Add new granular permission
  const addGranularPermission = useCallback(
    (permission: Omit<GranularDataPermissions, 'id' | 'lastModified'>) => {
      const newPermission: GranularDataPermissions = {
        ...permission,
        id: generateId('perm'),
        lastModified: new Date()
      }

      setPrivacyContext(prev => ({
        ...prev,
        granularPermissions: [...prev.granularPermissions, newPermission]
      }))
    },
    []
  )

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
  const addPrivacyZone = useCallback((zone: Omit<PrivacyZone, 'id' | 'createdAt'>) => {
    const newZone: PrivacyZone = {
      ...zone,
      id: generateId('zone'),
      createdAt: new Date()
    }

    setPrivacyContext(prev => ({
      ...prev,
      privacyZones: [...prev.privacyZones, newZone]
    }))
  }, [])

  const updatePrivacyZone = useCallback((zoneId: string, updates: Partial<PrivacyZone>) => {
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
  const checkPrivacyZone = useCallback(
    (latitude: number, longitude: number): PrivacyZone | null => {
      for (const zone of privacyContext.privacyZones) {
        const distance = calculateDistance(latitude, longitude, zone.latitude, zone.longitude)

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
    },
    [privacyContext.privacyZones]
  )

  // Generate transparency report
  const generateTransparencyReport = useCallback(() => {
    return generateTransparencyReportFor(
      privacyContext.auditLogs,
      privacyContext.legalRequests,
      privacyContext.granularPermissions.map(p => ({
        name: p.name,
        enabled: p.enabled,
        retentionDays: p.retentionDays
      })),
      privacyBudget
    )
  }, [privacyContext, privacyBudget])

  // Add privacy audit log entry
  const addAuditLog = useCallback((log: Omit<PrivacyAuditLog, 'id' | 'timestamp'>) => {
    const newLog: PrivacyAuditLog = {
      ...log,
      id: generateId('log'),
      timestamp: new Date()
    }

    setPrivacyContext(prev => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 1000) // Keep only last 1000 logs
    }))
  }, [])

  // Real-time data usage tracking
  const trackDataUsage = useCallback(
    (dataType: string, amount: number = 1) => {
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
    },
    [options.userId, privacyContext.settings.dataRetentionDays, addAuditLog]
  )

  // Privacy budget monitoring
  const monitorPrivacyBudget = useCallback(() => {
    if (privacyBudget < 0.2 && privacyContext.settings.privacyBudgetAlerts) {
      setPrivacyAlerts(prev => [
        ...prev,
        {
          id: generateId('alert'),
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

  // Create a legal request (data access, deletion, correction, etc.)
  const createLegalRequest = useCallback(
    (request: Omit<LegalRequest, "id" | "status" | "createdAt" | "updatedAt" | "canUserContact">): string => {
      const now = new Date()
      const id = generateId('legal')
      const newRequest: LegalRequest = {
        ...request,
        id,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        canUserContact: true
      }

      setPrivacyContext(prev => ({
        ...prev,
        legalRequests: [...prev.legalRequests, newRequest]
      }))

      return id
    },
    []
  )

  // Update an existing legal request
  const updateLegalRequest = useCallback(
    (requestId: string, updates: Partial<LegalRequest>) => {
      setPrivacyContext(prev => ({
        ...prev,
        legalRequests: prev.legalRequests.map(request =>
          request.id === requestId
            ? { ...request, ...updates, updatedAt: new Date() }
            : request
        )
      }))
    },
    []
  )

  // Monitor privacy budget
  useEffect(() => {
    if (privacyContext.settings.realTimeMonitoring) {
      const interval = setInterval(() => {
        monitorPrivacyBudget()
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
    return undefined
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
    clearAllPrivacyAlerts,
    createLegalRequest,
    updateLegalRequest
  }
}
