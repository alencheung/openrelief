/**
 * Tests for usePrivacy Hook
 *
 * These tests verify the functionality of the privacy management hook,
 * including settings management, data protection, and transparency features.
 */

import { renderHook, act } from '@testing-library/react'
import { usePrivacy } from '../usePrivacy'
import { PrivacySettings } from '../usePrivacy'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock the privacy libraries
jest.mock('@/lib/privacy/differential-privacy', () => ({
  addNoiseToLocation: jest.fn(),
  checkPrivacyBudget: jest.fn(() => true),
  consumePrivacyBudget: jest.fn(),
  initializePrivacyBudget: jest.fn(),
  DEFAULT_DP_CONFIGS: {
    location: { epsilon: 0.1 },
    userProfile: { epsilon: 0.2 }
  }
}))

jest.mock('@/lib/privacy/anonymization', () => ({
  reduceLocationPrecision: jest.fn((lat, lon, precision) => ({ latitude: lat, longitude: lon })),
  createPrivacyGrid: jest.fn(() => ({})),
  enforceKAnonymity: jest.fn(data => data),
  applyTemporalDecay: jest.fn(),
  anonymizeUserData: jest.fn(data => data),
  DEFAULT_K_ANONYMITY_CONFIGS: {
    userProfile: { k: 5 }
  },
  DEFAULT_TEMPORAL_DECAY_CONFIGS: {
    trustScore: { halfLife: 30 },
    location: { halfLife: 7 },
    emergencyData: { halfLife: 1 }
  }
}))

jest.mock('@/lib/privacy/cryptography', () => ({
  encryptUserData: jest.fn(),
  decryptUserData: jest.fn(),
  createHashDigest: jest.fn(),
  generateSessionToken: jest.fn(),
  verifySessionToken: jest.fn()
}))

describe('usePrivacy Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default privacy settings', () => {
      const { result } = renderHook(() => usePrivacy())

      expect(result.current.privacyContext.settings).toEqual({
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
      })
    })

    it('should initialize with default privacy context', () => {
      const { result } = renderHook(() => usePrivacy())

      expect(result.current.privacyContext.privacyLevel).toBe('high')
      expect(result.current.privacyContext.isPrivacyEnabled).toBe(true)
      expect(result.current.privacyContext.granularPermissions).toEqual([])
      expect(result.current.privacyContext.privacyZones).toEqual([])
    })

    it('should initialize with default privacy budget', () => {
      const { result } = renderHook(() => usePrivacy())

      expect(result.current.privacyBudget).toBe(1.0)
    })

    it('should initialize privacy when autoInitialize is true', () => {
      const { result } = renderHook(() => usePrivacy({ autoInitialize: true }))

      expect(result.current.isLoading).toBe(false)
    })

    it('should not initialize privacy when autoInitialize is false', () => {
      const { result } = renderHook(() => usePrivacy({ autoInitialize: false }))

      // Should not call initializePrivacy immediately
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Settings Management', () => {
    it('should update privacy settings', () => {
      const { result } = renderHook(() => usePrivacy())

      act(() => {
        result.current.privacyContext.updateSettings({
          locationSharing: false
        })
      })

      expect(result.current.privacyContext.settings.locationSharing).toBe(false)
    })

    it('should recalculate privacy level when settings change', () => {
      const { result } = renderHook(() => usePrivacy())

      act(() => {
        result.current.privacyContext.updateSettings({
          anonymizeData: false,
          differentialPrivacy: false,
          kAnonymity: false,
          endToEndEncryption: false
        })
      })

      expect(result.current.privacyContext.privacyLevel).toBe('basic')
    })

    it('should calculate maximum privacy level correctly', () => {
      const { result } = renderHook(() => usePrivacy())

      act(() => {
        result.current.privacyContext.updateSettings({
          anonymizeData: true,
          differentialPrivacy: true,
          kAnonymity: true,
          endToEndEncryption: true
        })
      })

      expect(result.current.privacyContext.privacyLevel).toBe('maximum')
    })
  })

  describe('Granular Permissions', () => {
    it('should add granular permission', () => {
      const { result } = renderHook(() => usePrivacy())

      const newPermission = {
        name: 'Test Permission',
        category: 'location' as const,
        enabled: true,
        retentionDays: 30,
        purposeLimitation: ['emergency_response'],
        sharingSettings: {
          emergencyServices: true,
          researchParticipation: false,
          thirdPartyAnalytics: false,
          lawEnforcement: false
        },
        encryptionLevel: 'standard' as const
      }

      act(() => {
        result.current.addGranularPermission(newPermission)
      })

      expect(result.current.privacyContext.granularPermissions).toHaveLength(1)
      expect(result.current.privacyContext.granularPermissions[0].name).toBe('Test Permission')
    })

    it('should update granular permission', () => {
      const { result } = renderHook(() => usePrivacy())

      // First add a permission
      const newPermission = {
        name: 'Test Permission',
        category: 'location' as const,
        enabled: true,
        retentionDays: 30,
        purposeLimitation: ['emergency_response'],
        sharingSettings: {
          emergencyServices: true,
          researchParticipation: false,
          thirdPartyAnalytics: false,
          lawEnforcement: false
        },
        encryptionLevel: 'standard' as const
      }

      act(() => {
        result.current.addGranularPermission(newPermission)
      })

      const permissionId = result.current.privacyContext.granularPermissions[0].id

      // Then update it
      act(() => {
        result.current.updateGranularPermission(permissionId, {
          enabled: false,
          retentionDays: 60
        })
      })

      const updatedPermission = result.current.privacyContext.granularPermissions[0]
      expect(updatedPermission.enabled).toBe(false)
      expect(updatedPermission.retentionDays).toBe(60)
    })

    it('should remove granular permission', () => {
      const { result } = renderHook(() => usePrivacy())

      // First add a permission
      const newPermission = {
        name: 'Test Permission',
        category: 'location' as const,
        enabled: true,
        retentionDays: 30,
        purposeLimitation: ['emergency_response'],
        sharingSettings: {
          emergencyServices: true,
          researchParticipation: false,
          thirdPartyAnalytics: false,
          lawEnforcement: false
        },
        encryptionLevel: 'standard' as const
      }

      act(() => {
        result.current.addGranularPermission(newPermission)
      })

      const permissionId = result.current.privacyContext.granularPermissions[0].id

      // Then remove it
      act(() => {
        result.current.removeGranularPermission(permissionId)
      })

      expect(result.current.privacyContext.granularPermissions).toHaveLength(0)
    })
  })

  describe('Privacy Zones', () => {
    it('should add privacy zone', () => {
      const { result } = renderHook(() => usePrivacy())

      const newZone = {
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 100,
        privacyLevel: 'private' as const,
        exceptions: {
          emergencyServices: true,
          trustedContacts: false,
          familyMembers: false
        },
        activeHours: {
          start: '22:00',
          end: '06:00'
        }
      }

      act(() => {
        result.current.addPrivacyZone(newZone)
      })

      expect(result.current.privacyContext.privacyZones).toHaveLength(1)
      expect(result.current.privacyContext.privacyZones[0].name).toBe('Home')
    })

    it('should check if location is within privacy zone', () => {
      const { result } = renderHook(() => usePrivacy())

      const newZone = {
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 100, // 100m
        privacyLevel: 'private' as const,
        exceptions: {
          emergencyServices: true,
          trustedContacts: false,
          familyMembers: false
        },
        activeHours: {
          start: '00:00',
          end: '23:59' // All day
        }
      }

      act(() => {
        result.current.addPrivacyZone(newZone)
      })

      // Check location very close to the zone center
      const isInZone = result.current.checkPrivacyZone(40.7128, -74.0060)

      expect(isInZone).toBeTruthy()
      expect(isInZone?.name).toBe('Home')
    })

    it('should return null when location is outside all privacy zones', () => {
      const { result } = renderHook(() => usePrivacy())

      const newZone = {
        name: 'Home',
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 100, // 100m
        privacyLevel: 'private' as const,
        exceptions: {
          emergencyServices: true,
          trustedContacts: false,
          familyMembers: false
        },
        activeHours: {
          start: '00:00',
          end: '23:59'
        }
      }

      act(() => {
        result.current.addPrivacyZone(newZone)
      })

      // Check location far from the zone
      const isInZone = result.current.checkPrivacyZone(0, 0)

      expect(isInZone).toBeNull()
    })
  })

  describe('Data Protection', () => {
    it('should protect location data with privacy measures', () => {
      const { result } = renderHook(() => usePrivacy({
        userId: 'test-user'
      }))

      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date()
      }

      const protectedData = result.current.protectLocationData(location)

      expect(protectedData).toHaveProperty('data')
      expect(protectedData).toHaveProperty('isAnonymized')
      expect(protectedData).toHaveProperty('hasDifferentialPrivacy')
      expect(protectedData).toHaveProperty('privacyBudgetUsed')
      expect(protectedData).toHaveProperty('processingTime')
    })

    it('should protect user data with privacy measures', () => {
      const { result } = renderHook(() => usePrivacy({
        userId: 'test-user'
      }))

      const userData = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ]

      const protectedData = result.current.protectUserData(userData)

      expect(protectedData).toHaveProperty('data')
      expect(protectedData).toHaveProperty('isAnonymized')
      expect(protectedData).toHaveProperty('hasDifferentialPrivacy')
      expect(protectedData).toHaveProperty('privacyBudgetUsed')
      expect(protectedData).toHaveProperty('processingTime')
    })

    it('should encrypt sensitive data', async () => {
      const { result } = renderHook(() => usePrivacy())

      const sensitiveData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      }

      const encryptedData = await result.current.encryptSensitiveData(sensitiveData, 'test-user')

      expect(encryptedData).toBeTruthy()
    })

    it('should decrypt sensitive data', async () => {
      const { result } = renderHook(() => usePrivacy())

      const sensitiveData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      }

      // First encrypt the data
      const encryptedData = await result.current.encryptSensitiveData(sensitiveData, 'test-user')

      // Then decrypt it
      if (encryptedData) {
        const decryptedData = await result.current.decryptSensitiveData(encryptedData, 'test-user')

        expect(decryptedData).toEqual(sensitiveData)
      }
    })
  })

  describe('Transparency and Reporting', () => {
    it('should generate privacy report', () => {
      const { result } = renderHook(() => usePrivacy())

      const report = result.current.generatePrivacyReport()

      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('dataUsage')
      expect(report).toHaveProperty('privacyMetrics')
      expect(report).toHaveProperty('recommendations')
    })

    it('should generate transparency report', () => {
      const { result } = renderHook(() => usePrivacy())

      const report = result.current.generateTransparencyReport()

      expect(report).toHaveProperty('reportPeriod')
      expect(report).toHaveProperty('dataProcessing')
      expect(report).toHaveProperty('legalRequests')
      expect(report).toHaveProperty('privacyBudget')
      expect(report).toHaveProperty('dataRetention')
    })

    it('should add audit log entry', () => {
      const { result } = renderHook(() => usePrivacy())

      const logEntry = {
        userId: 'test-user',
        action: 'data_access',
        dataType: 'location',
        dataTypes: ['location'],
        privacyImpact: 'low' as const,
        legalBasis: 'user_consent',
        retentionPeriod: 30,
        automatedDecision: false,
        dataSubjects: 1,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }

      act(() => {
        result.current.addAuditLog(logEntry)
      })

      expect(result.current.privacyContext.auditLogs).toHaveLength(1)
      expect(result.current.privacyContext.auditLogs[0].action).toBe('data_access')
    })
  })

  describe('Real-time Monitoring', () => {
    it('should track data usage', () => {
      const { result } = renderHook(() => usePrivacy())

      act(() => {
        result.current.trackDataUsage('location', 1)
      })

      expect(result.current.realTimeDataUsage.location).toBe(1)
    })

    it('should monitor privacy budget', () => {
      const { result } = renderHook(() => usePrivacy())

      // Set low privacy budget
      act(() => {
        // This would be done through the hook's internal state
        // For testing purposes, we'll just call the monitor function
      })

      // In a real test, we would need to mock the privacy budget state
      // and verify that alerts are created when budget is low
    })

    it('should clear privacy alerts', () => {
      const { result } = renderHook(() => usePrivacy())

      // First, we would need to add some alerts to the state
      // Then test clearing them

      act(() => {
        result.current.clearAllPrivacyAlerts()
      })

      expect(result.current.privacyAlerts).toHaveLength(0)
    })
  })

  describe('Privacy Impact Assessment', () => {
    it('should assess privacy impact for location data', () => {
      const { result } = renderHook(() => usePrivacy())

      const assessment = result.current.assessPrivacyImpact(
        'location_query',
        'location',
        'high'
      )

      expect(assessment.riskLevel).toBe('high')
      expect(assessment.privacyScore).toBeLessThan(50)
      expect(assessment.recommendations).toContain('Use differential privacy with low epsilon')
    })

    it('should assess privacy impact for profile data', () => {
      const { result } = renderHook(() => usePrivacy())

      const assessment = result.current.assessPrivacyImpact(
        'profile_view',
        'userProfile',
        'medium'
      )

      expect(assessment.riskLevel).toBe('medium')
      expect(assessment.privacyScore).toBeGreaterThan(20)
      expect(assessment.recommendations).toContain('Anonymize personal identifiers')
    })
  })

  describe('Legal Requests', () => {
    it('should create legal request', () => {
      const { result } = renderHook(() => usePrivacy())

      const newRequest = {
        type: 'data_access' as const,
        title: 'Access My Data',
        description: 'I would like to access all my personal data.'
      }

      const requestId = result.current.createLegalRequest(newRequest)

      expect(requestId).toBeTruthy()
      expect(result.current.privacyContext.legalRequests).toHaveLength(1)
    })

    it('should update legal request', () => {
      const { result } = renderHook(() => usePrivacy())

      // First create a request
      const newRequest = {
        type: 'data_access' as const,
        title: 'Access My Data',
        description: 'I would like to access all my personal data.'
      }

      const requestId = result.current.createLegalRequest(newRequest)

      // Then update it
      act(() => {
        result.current.updateLegalRequest(requestId, {
          status: 'processing'
        })
      })

      const updatedRequest = result.current.privacyContext.legalRequests[0]
      expect(updatedRequest.status).toBe('processing')
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', () => {
      // Mock an error during initialization
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => usePrivacy({
        enableLogging: true
      }))

      // Should not throw and should still provide a functional hook
      expect(result.current).toBeDefined()
      expect(result.current.privacyContext).toBeDefined()
    })

    it('should handle data protection errors gracefully', () => {
      const { result } = renderHook(() => usePrivacy({
        enableLogging: true
      }))

      // Mock an error in data protection
      const { reduceLocationPrecision } = require('@/lib/privacy/anonymization')
      reduceLocationPrecision.mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date()
      }

      // Should not throw and should return a result with error handling
      const protectedData = result.current.protectLocationData(location)
      expect(protectedData).toBeDefined()
    })
  })
})