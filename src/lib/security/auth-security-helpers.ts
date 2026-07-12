/**
 * Authentication Security Helpers for OpenRelief
 *
 * Configuration constants and pure helper functions extracted from auth-security.
 */

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'

// Security configuration
export const AUTH_SECURITY_CONFIG = {
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    absoluteMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    renewalThreshold: 60 * 60 * 1000, // 1 hour before expiry
    maxConcurrentSessions: 3,
    idleTimeout: 2 * 60 * 60 * 1000, // 2 hours
    securityCheckInterval: 5 * 60 * 1000 // 5 minutes
  },

  // Login attempt protection
  loginProtection: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    maxDelay: 30 * 1000, // 30 seconds
    ipTracking: true,
    deviceTracking: true,
    geolocationTracking: true
  },

  // Password policy
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidUserInfo: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    historyCount: 12,
    minUniqueChars: 8
  },

  // MFA configuration
  mfa: {
    enabled: true,
    methods: ['totp', 'sms', 'email', 'backup_codes'],
    backupCodesCount: 10,
    backupCodeLength: 8,
    totpWindow: 1,
    smsTemplate: 'Your verification code is: {code}',
    emailTemplate: 'Your verification code is: {code}'
  },

  // Device fingerprinting
  deviceFingerprinting: {
    enabled: true,
    trustThreshold: 0.7,
    maxDevicesPerUser: 5,
    deviceTrustDecay: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}

// Create secure password hash using scrypt with salt and pepper
export const createSecurePassword = async (
  password: string,
  _userId?: string
): Promise<string> => {
  const salt = randomBytes(32)
  const pepper = process.env.AUTH_PEPPER || ''

  return new Promise((resolve, reject) => {
    scrypt(password + pepper, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err)
      }

      const hash = salt.toString('hex') + ':' + derivedKey.toString('hex')
      resolve(hash)
    })
  })
}

// Verify password with timing attack protection
export const verifyPasswordSecure = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const [salt, key] = hash.split(':')
  const pepper = process.env.AUTH_PEPPER || ''

  if (!salt || !key) {
    return false
  }

  return new Promise(resolve => {
    scrypt(password + pepper, Buffer.from(salt, 'hex'), 64, (err, derivedKey) => {
      if (err || !derivedKey) {
        resolve(false)
        return
      }

      // Use timing-safe comparison (buffers must be equal length)
      const keyBuffer = Buffer.from(key, 'hex')
      if (keyBuffer.length !== derivedKey.length) {
        resolve(false)
        return
      }
      const isValid = timingSafeEqual(keyBuffer, derivedKey)
      resolve(isValid)
    })
  })
}

// Generate a server-side device fingerprint from user agent
export const generateDeviceFingerprint = (userAgent: string): string => {
  const fingerprintData = {
    userAgent,
    acceptLanguage: 'en-US,en;q=0.9',
    platform: 'server',
    cookieEnabled: false,
    doNotTrack: 'unknown'
  }

  return createHash('sha256')
    .update(JSON.stringify(fingerprintData))
    .digest('hex')
    .substring(0, 32)
}

// Generate a random session id
export const generateSessionId = (): string => randomBytes(32).toString('hex')

// Generate a random attempt id
export const generateAttemptId = (): string => randomBytes(16).toString('hex')

import type { LoginAttempt, AuthSession } from './auth-security-types'
import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import { supabaseAdmin } from '@/lib/supabase'
import { redisSessionStore } from '@/lib/redis/session-store'
import { redisLoginAttemptsStore } from '@/lib/redis/login-attempts-store'

// Check whether a login attempt should be allowed based on recent failures
export const checkLoginAttempts = async (
  email: string,
  ipAddress: string
): Promise<{
  allowed: boolean
  lockoutTime?: number
  delay?: number
}> => {
  const now = Date.now()
  const userAttempts = await redisLoginAttemptsStore.getAttempts(email)
  const ipAttempts = await redisLoginAttemptsStore.getAttempts(`ip:${ipAddress}`)

  const recentUserAttempts = userAttempts.filter(
    attempt =>
      now - attempt.timestamp.getTime() < AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
  )
  const recentIpAttempts = ipAttempts.filter(
    attempt =>
      now - attempt.timestamp.getTime() < AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
  )

  const failedUserAttempts = recentUserAttempts.filter(attempt => !attempt.success)
  if (failedUserAttempts.length >= AUTH_SECURITY_CONFIG.loginProtection.maxAttempts) {
    const lastAttempt = failedUserAttempts[failedUserAttempts.length - 1]
    if (lastAttempt) {
      const lockoutTime =
        lastAttempt.timestamp.getTime() + AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration

      if (now < lockoutTime) {
        return {
          allowed: false,
          lockoutTime
        }
      }
    }
  }

  const failedIpAttempts = recentIpAttempts.filter(attempt => !attempt.success)
  if (failedIpAttempts.length >= AUTH_SECURITY_CONFIG.loginProtection.maxAttempts) {
    const lastAttempt = failedIpAttempts[failedIpAttempts.length - 1]
    if (lastAttempt) {
      const lockoutTime =
        lastAttempt.timestamp.getTime() + AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration

      if (now < lockoutTime) {
        return {
          allowed: false,
          lockoutTime
        }
      }
    }
  }

  let delay = 0
  if (AUTH_SECURITY_CONFIG.loginProtection.progressiveDelay) {
    const delayMultiplier = Math.min(failedUserAttempts.length, 5)
    delay = Math.min(delayMultiplier * 1000, AUTH_SECURITY_CONFIG.loginProtection.maxDelay)
  }

  return { allowed: true, delay }
}

// Record a login attempt to the store and audit system
export const recordLoginAttempt = async (attempt: {
  email: string
  userId?: string
  fingerprint: string
  userAgent: string
  ipAddress: string
  geolocation?: { lat: number; lng: number; country: string; city: string }
  success: boolean
  failureReason?: string
  mfaRequired?: boolean
}): Promise<void> => {
  const loginAttempt: LoginAttempt = {
    attemptId: generateAttemptId(),
    email: attempt.email,
    userId: attempt.userId,
    userAgent: attempt.userAgent,
    ipAddress: attempt.ipAddress,
    timestamp: new Date(),
    success: attempt.success,
    failureReason: attempt.failureReason,
    mfaRequired: attempt.mfaRequired || false,
    geolocation: attempt.geolocation
  }

  await redisLoginAttemptsStore.recordAttempt(attempt.email, loginAttempt)
  await redisLoginAttemptsStore.recordAttempt(`ip:${attempt.ipAddress}`, loginAttempt)

  await securityMonitor.createAlert(
    attempt.success ? SecurityIncidentType.SUCCESSFUL_LOGIN : SecurityIncidentType.FAILED_LOGIN,
    attempt.success ? IncidentSeverity.LOW : IncidentSeverity.MEDIUM,
    `Login attempt for ${attempt.email}`,
    `Success: ${attempt.success}, IP: ${attempt.ipAddress}, Reason: ${attempt.failureReason || 'N/A'}`,
    'auth_security'
  )
}

// Create and persist a secure session
export const createSecureSessionRecord = async (sessionData: {
  userId: string
  deviceFingerprint: string
  userAgent: string
  ipAddress: string
  geolocation?: { lat: number; lng: number; country: string; city: string }
  trustLevel: 'low' | 'medium' | 'high'
}): Promise<string> => {
  const sessionId = generateSessionId()
  const now = new Date()

  const session: AuthSession = {
    sessionId,
    userId: sessionData.userId,
    deviceFingerprint: sessionData.deviceFingerprint,
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent,
    createdAt: now,
    lastActivity: now,
    expiresAt: new Date(now.getTime() + AUTH_SECURITY_CONFIG.session.maxAge),
    isActive: true,
    securityFlags: [],
    mfaVerified: false,
    trustLevel: sessionData.trustLevel
  }

  await redisSessionStore.setSession(sessionId, session)

  await supabaseAdmin.from('auth_sessions').insert({
    session_id: sessionId,
    user_id: sessionData.userId,
    device_fingerprint: sessionData.deviceFingerprint,
    ip_address: sessionData.ipAddress,
    user_agent: sessionData.userAgent,
    created_at: now.toISOString(),
    expires_at: session.expiresAt.toISOString(),
    is_active: true,
    mfa_verified: false,
    trust_level: sessionData.trustLevel
  })

  return sessionId
}

// Check device fingerprint trust level
export const checkDeviceFingerprintRecord = async (
  userId: string,
  fingerprint: string
): Promise<{
  trustLevel: 'low' | 'medium' | 'high'
  isTrusted: boolean
}> => {
  const { data: device, error } = await supabaseAdmin
    .from('device_fingerprints')
    .select('*')
    .eq('user_id', userId)
    .eq('fingerprint_id', fingerprint)
    .single()

  if (error || !device) {
    return {
      trustLevel: 'low',
      isTrusted: false
    }
  }

  const isTrusted =
    device.is_trusted &&
    device.trust_score > AUTH_SECURITY_CONFIG.deviceFingerprinting.trustThreshold
  const trustLevel = isTrusted ? 'high' : 'medium'

  return {
    trustLevel,
    isTrusted
  }
}

// Invalidate a session by id
export const invalidateSessionRecord = async (
  sessionId: string,
  reason: string
): Promise<void> => {
  const session = await redisSessionStore.getSession(sessionId)
  if (!session) {
    return
  }

  session.isActive = false
  await redisSessionStore.setSession(sessionId, session)

  await supabaseAdmin
    .from('auth_sessions')
    .update({
      is_active: false,
      invalidated_at: new Date().toISOString(),
      invalidation_reason: reason
    })
    .eq('session_id', sessionId)

  await securityMonitor.createAlert(
    SecurityIncidentType.SESSION_INVALIDATED,
    IncidentSeverity.LOW,
    `Session ${sessionId} invalidated`,
    `Reason: ${reason}, User: ${session.userId}`,
    'auth_security'
  )
}

// Check for and invalidate concurrent sessions exceeding the limit
export const checkConcurrentSessions = async (
  invalidateFn: (sessionId: string, reason: string) => Promise<void>
): Promise<void> => {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('auth_sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    if (error || !sessions) {
      return
    }

    const userSessions = new Map<string, typeof sessions>()
    for (const session of sessions) {
      const userSessionList = userSessions.get(session.user_id) || []
      userSessionList.push(session)
      userSessions.set(session.user_id, userSessionList)
    }

    for (const [, userSessionList] of userSessions.entries()) {
      if (userSessionList.length > AUTH_SECURITY_CONFIG.session.maxConcurrentSessions) {
        const sortedSessions = userSessionList.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        const sessionsToInvalidate = sortedSessions.slice(
          0,
          userSessionList.length - AUTH_SECURITY_CONFIG.session.maxConcurrentSessions
        )

        for (const session of sessionsToInvalidate) {
          await invalidateFn(session.session_id, 'concurrent_sessions')
        }
      }
    }
  } catch (error) {
    console.error('Error checking concurrent sessions:', error)
  }
}
