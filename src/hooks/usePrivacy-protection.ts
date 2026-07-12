/**
 * Privacy Data Protection Helpers for OpenRelief
 *
 * Standalone functions that apply privacy measures (anonymization,
 * differential privacy, k-anonymity, encryption) to location and user data.
 */

import type {
  PrivacySettings,
  LocationData,
  PrivacyProtectedData
} from './usePrivacy-types'
import {
  addNoiseToLocation,
  checkPrivacyBudget,
  consumePrivacyBudget,
  DEFAULT_DP_CONFIGS
} from '@/lib/privacy/differential-privacy'
import {
  reduceLocationPrecision,
  createPrivacyGrid,
  enforceKAnonymity,
  anonymizeUserData,
  DEFAULT_K_ANONYMITY_CONFIGS,
  type KAnonymityConfig
} from '@/lib/privacy/anonymization'
import {
  encryptUserData,
  decryptUserData,
  type EncryptedData
} from '@/lib/privacy/cryptography'

type ToastFn = (toast: {
  title: string
  description: string
  variant: 'default' | 'destructive'
}) => void

// Protect location data with privacy measures (standalone implementation).
export const protectLocationDataFor = (
  settings: PrivacySettings,
  toast: ToastFn,
  location: LocationData,
  options: {
    applyDifferentialPrivacy?: boolean
    applyAnonymization?: boolean
    precisionLevel?: number
    userId?: string
    enableLogging?: boolean
  } = {}
): PrivacyProtectedData<LocationData> => {
  const startTime = Date.now()
  let protectedLocation = { ...location }
  let isAnonymized = false
  let hasDifferentialPrivacy = false
  let privacyBudgetUsed = 0

  try {
    // Apply location precision reduction
    if (options.applyAnonymization !== false && settings.anonymizeData) {
      const precision = options.precisionLevel || settings.locationPrecision
      protectedLocation = reduceLocationPrecision(
        protectedLocation.latitude,
        protectedLocation.longitude,
        precision
      )
      isAnonymized = true
    }

    // Apply privacy grid
    if (options.applyAnonymization !== false && settings.kAnonymity) {
      const gridLocation = createPrivacyGrid(
        protectedLocation.latitude,
        protectedLocation.longitude,
        2 // 2km grid
      )
      protectedLocation = { ...protectedLocation, ...gridLocation }
      isAnonymized = true
    }

    // Apply differential privacy
    if (
      options.applyDifferentialPrivacy !== false &&
      settings.differentialPrivacy
    ) {
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

        consumePrivacyBudget(options.userId, 'location', epsilonRequired, 'location_query')
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
}

// Protect user data with privacy measures (standalone implementation).
export const protectUserDataFor = <T extends Record<string, unknown>>(
  settings: PrivacySettings,
  toast: ToastFn,
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
  const startTime = Date.now()
  let protectedData = [...data]
  let isAnonymized = false
  let hasDifferentialPrivacy = false
  let privacyBudgetUsed = 0

  try {
    // Apply k-anonymity
    if (options.applyKAnonymity !== false && settings.kAnonymity) {
      const kConfig = options.kAnonymityConfig || DEFAULT_K_ANONYMITY_CONFIGS.userProfile
      protectedData = enforceKAnonymity(protectedData, kConfig)
      isAnonymized = true
    }

    // Apply differential privacy to sensitive fields
    if (
      options.applyDifferentialPrivacy !== false &&
      settings.differentialPrivacy
    ) {
      const epsilonRequired = DEFAULT_DP_CONFIGS.userProfile.epsilon

      if (
        options.userId &&
        checkPrivacyBudget(options.userId, 'userProfile', epsilonRequired)
      ) {
        // Apply noise to numeric fields
        protectedData = protectedData.map(record => {
          const protectedRecord: Record<string, unknown> = { ...record }

          // Add noise to numeric fields
          Object.keys(protectedRecord).forEach(key => {
            const value = protectedRecord[key]
            if (typeof value === 'number') {
              protectedRecord[key] = value + (Math.random() - 0.5) * 0.1 // Small noise
            }
          })

          return protectedRecord
        }) as unknown as T[]

        hasDifferentialPrivacy = true
        privacyBudgetUsed = epsilonRequired

        consumePrivacyBudget(options.userId, 'userProfile', epsilonRequired, 'profile_query')
      }
    }

    // Apply comprehensive anonymization
    if (settings.anonymizeData) {
      protectedData = anonymizeUserData(protectedData, {
        locationPrecision: settings.locationPrecision,
        applyKAnonymity: settings.kAnonymity,
        applyDifferentialPrivacy: settings.differentialPrivacy,
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
}

// Encrypt sensitive data (standalone implementation).
export const encryptSensitiveDataFor = async (
  endToEndEncryption: boolean,
  toast: ToastFn,
  data: Record<string, unknown>,
  userId: string
): Promise<EncryptedData | null> => {
  if (!endToEndEncryption) {
    return null
  }

  try {
    const masterKey = Buffer.from('mock-master-key-for-demo-purposes-only', 'utf8')
    return await encryptUserData(userId, data, masterKey)
  } catch (error) {
    console.error('Error encrypting data:', error)
    toast({
      title: 'Encryption Failed',
      description: 'Could not encrypt sensitive data',
      variant: 'destructive'
    })
    return null
  }
}

// Decrypt sensitive data (standalone implementation).
export const decryptSensitiveDataFor = async (
  endToEndEncryption: boolean,
  toast: ToastFn,
  encryptedData: EncryptedData,
  userId: string
): Promise<Record<string, unknown> | null> => {
  if (!endToEndEncryption) {
    return null
  }

  try {
    const masterKey = Buffer.from('mock-master-key-for-demo-purposes-only', 'utf8')
    return await decryptUserData(userId, encryptedData, masterKey)
  } catch (error) {
    console.error('Error decrypting data:', error)
    toast({
      title: 'Decryption Failed',
      description: 'Could not decrypt sensitive data',
      variant: 'destructive'
    })
    return null
  }
}
