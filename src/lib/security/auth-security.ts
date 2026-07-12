/**
 * Enhanced Authentication and Session Security System
 *
 * This module provides comprehensive authentication security including:
 * - Multi-factor authentication (MFA)
 * - Session management with security controls
 * - Password security and rotation
 * - Device fingerprinting and management
 * - Login attempt monitoring and protection
 * - Account lockout and recovery
 */

import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import { supabaseAdmin } from '@/lib/supabase'
import { redisSessionStore } from '@/lib/redis/session-store'

// Re-export types and helpers for backward compatibility
export * from './auth-security-types'
export * from './auth-security-helpers'
import type {
  AuthSession,
  SessionSecurityFlag,
  DeviceFingerprint
} from './auth-security-types'
import {
  AUTH_SECURITY_CONFIG,
  createSecurePassword as createSecurePasswordHash,
  verifyPasswordSecure as verifyPasswordHash,
  generateDeviceFingerprint as generateDeviceFp,
  generateSessionId,
  generateAttemptId,
  checkLoginAttempts as checkLoginAttemptsHelper,
  recordLoginAttempt as recordLoginAttemptHelper,
  createSecureSessionRecord,
  checkDeviceFingerprintRecord,
  invalidateSessionRecord,
  checkConcurrentSessions as checkConcurrentSessionsHelper
} from './auth-security-helpers'

/**
 * Authentication Security Manager
 */
export class AuthSecurityManager {
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map()
  private passwordHistory: Map<string, string[]> = new Map()
  private securityCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startSecurityMonitoring()
  }

  /**
   * Authenticate user with enhanced security
   */
  async authenticateUser(
    email: string,
    password: string,
    deviceInfo: {
      fingerprint: string
      userAgent: string
      ipAddress: string
      geolocation?: { lat: number; lng: number; country: string; city: string }
    }
  ): Promise<{
    success: boolean
    sessionId?: string
    requiresMFA?: boolean
    mfaMethods?: string[]
    error?: string
    lockoutTime?: number
  }> {
    try {
      const attemptCheck = await this.checkLoginAttempts(email, deviceInfo.ipAddress)
      if (!attemptCheck.allowed) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          lockoutTime: attemptCheck.lockoutTime
        }
      }

      // Get user from database
      const { data: user, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !user) {
        await this.recordLoginAttempt({
          email,
          ...deviceInfo,
          success: false,
          failureReason: 'user_not_found'
        })

        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Verify password with timing attack protection
      const passwordValid = await this.verifyPasswordSecure(password, user.password_hash)

      if (!passwordValid) {
        await this.recordLoginAttempt({
          email,
          userId: user.user_id,
          ...deviceInfo,
          success: false,
          failureReason: 'invalid_password'
        })

        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Check if account is locked or suspended
      if (user.status === 'locked' || user.status === 'suspended') {
        await this.recordLoginAttempt({
          email,
          userId: user.user_id,
          ...deviceInfo,
          success: false,
          failureReason: 'account_locked'
        })

        return {
          success: false,
          error: 'Account is locked. Please contact support.'
        }
      }

      // Check device fingerprint
      const deviceTrust = await this.checkDeviceFingerprint(user.user_id, deviceInfo.fingerprint)

      // Create session
      const sessionId = await this.createSecureSession({
        userId: user.user_id,
        deviceFingerprint: deviceInfo.fingerprint,
        ...deviceInfo,
        trustLevel: deviceTrust.trustLevel
      })

      // Record successful login
      await this.recordLoginAttempt({
        email,
        userId: user.user_id,
        ...deviceInfo,
        success: true,
        mfaRequired: user.mfa_enabled
      })

      // Check if MFA is required
      if (user.mfa_enabled) {
        return {
          success: true,
          sessionId,
          requiresMFA: true,
          mfaMethods: user.mfa_methods || ['totp']
        }
      }

      return {
        success: true,
        sessionId
      }
    } catch (error) {
      console.error('Authentication error:', error)
      return {
        success: false,
        error: 'Authentication service unavailable'
      }
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFAToken(
    sessionId: string,
    token: string,
    method: 'totp' | 'sms' | 'email' | 'backup_code'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await redisSessionStore.getSession(sessionId)
      if (!session) {
        return { success: false, error: 'Invalid session' }
      }

      // Get user MFA settings
      const { data: user, error } = await supabaseAdmin
        .from('user_profiles')
        .select('mfa_secret, mfa_backup_codes, mfa_methods')
        .eq('user_id', session.userId)
        .single()

      if (error || !user) {
        return { success: false, error: 'User not found' }
      }

      let isValid = false

      switch (method) {
        case 'totp':
          isValid = await this.verifyTOTPToken(token, user.mfa_secret)
          break
        case 'backup_code':
          isValid = await this.verifyBackupCode(token, user.mfa_backup_codes)
          if (isValid) {
            // Remove used backup code
            const updatedCodes = user.mfa_backup_codes.filter((code: string) => code !== token)
            await supabaseAdmin
              .from('user_profiles')
              .update({ mfa_backup_codes: updatedCodes })
              .eq('user_id', session.userId)
          }
          break
        default:
          return { success: false, error: 'Unsupported MFA method' }
      }

      if (!isValid) {
        await securityMonitor.createAlert(
          SecurityIncidentType.UNAUTHORIZED_ACCESS,
          IncidentSeverity.MEDIUM,
          `MFA verification failed for user ${session.userId}`,
          `Method: ${method}, Session: ${sessionId}`,
          'auth_security'
        )

        return { success: false, error: 'Invalid verification code' }
      }

      session.mfaVerified = true
      session.lastActivity = new Date()
      await redisSessionStore.setSession(sessionId, session)

      return { success: true }
    } catch (error) {
      console.error('MFA verification error:', error)
      return { success: false, error: 'MFA verification failed' }
    }
  }

  async validateSession(
    sessionId: string,
    requestContext: {
      ipAddress: string
      userAgent: string
    }
  ): Promise<{
    valid: boolean
    session?: AuthSession
    securityFlags?: SessionSecurityFlag[]
    requiresReauth?: boolean
  }> {
    try {
      const session = await redisSessionStore.getSession(sessionId)
      if (!session) {
        return { valid: false }
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await this.invalidateSession(sessionId, 'expired')
        return { valid: false }
      }

      // Check idle timeout
      const idleTime = Date.now() - session.lastActivity.getTime()
      if (idleTime > AUTH_SECURITY_CONFIG.session.idleTimeout) {
        await this.invalidateSession(sessionId, 'idle_timeout')
        return { valid: false, requiresReauth: true }
      }

      // Security checks
      const securityFlags: SessionSecurityFlag[] = []

      // Check IP change
      if (session.ipAddress !== requestContext.ipAddress) {
        securityFlags.push({
          type: 'ip_change',
          severity: 'medium',
          detectedAt: new Date(),
          description: `IP address changed from ${session.ipAddress} to ${requestContext.ipAddress}`
        })
      }

      // Check device change
      if (session.deviceFingerprint !== this.generateDeviceFingerprint(requestContext.userAgent)) {
        securityFlags.push({
          type: 'device_change',
          severity: 'high',
          detectedAt: new Date(),
          description: 'Device fingerprint changed'
        })
      }

      session.lastActivity = new Date()
      session.securityFlags.push(...securityFlags)
      await redisSessionStore.setSession(sessionId, session)

      // Log security flags
      if (securityFlags.length > 0) {
        await securityMonitor.createAlert(
          SecurityIncidentType.SUSPICIOUS_LOGIN,
          IncidentSeverity.MEDIUM,
          `Security flags detected for session ${sessionId}`,
          `Flags: ${securityFlags.map(f => f.type).join(', ')}`,
          'auth_security'
        )
      }

      // Require re-authentication for high-severity flags
      const requiresReauth = securityFlags.some(flag => flag.severity === 'high')

      return {
        valid: true,
        session,
        securityFlags,
        requiresReauth
      }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  /**
   * Create secure password hash
   */
  async createSecurePassword(password: string, userId?: string): Promise<string> {
    return createSecurePasswordHash(password, userId)
  }

  /**
   * Verify password with timing attack protection
   */
  async verifyPasswordSecure(password: string, hash: string): Promise<boolean> {
    return verifyPasswordHash(password, hash)
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent: string): string {
    return generateDeviceFp(userAgent)
  }

  private async checkLoginAttempts(
    email: string,
    ipAddress: string
  ): Promise<{
    allowed: boolean
    lockoutTime?: number
    delay?: number
  }> {
    return checkLoginAttemptsHelper(email, ipAddress)
  }

  private async recordLoginAttempt(attempt: {
    email: string
    userId?: string
    fingerprint: string
    userAgent: string
    ipAddress: string
    geolocation?: { lat: number; lng: number; country: string; city: string }
    success: boolean
    failureReason?: string
    mfaRequired?: boolean
  }): Promise<void> {
    await recordLoginAttemptHelper(attempt)
  }

  /**
   * Create secure session
   */
  private async createSecureSession(sessionData: {
    userId: string
    deviceFingerprint: string
    userAgent: string
    ipAddress: string
    geolocation?: { lat: number; lng: number; country: string; city: string }
    trustLevel: 'low' | 'medium' | 'high'
  }): Promise<string> {
    return createSecureSessionRecord(sessionData)
  }

  /**
   * Check device fingerprint
   */
  private async checkDeviceFingerprint(
    userId: string,
    fingerprint: string
  ): Promise<{
    trustLevel: 'low' | 'medium' | 'high'
    isTrusted: boolean
  }> {
    return checkDeviceFingerprintRecord(userId, fingerprint)
  }

  /**
   * Verify TOTP token
   */
  private async verifyTOTPToken(token: string, secret: string): Promise<boolean> {
    // This would use a TOTP library like 'otplib'
    // Simplified implementation for demonstration
    try {
      const { authenticator } = await import('otplib')
      return authenticator.verify({ token, secret })
    } catch (error) {
      console.error('TOTP verification error:', error)
      return false
    }
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(token: string, backupCodes: string[]): Promise<boolean> {
    return backupCodes.includes(token)
  }

  private async invalidateSession(sessionId: string, reason: string): Promise<void> {
    await invalidateSessionRecord(sessionId, reason)
  }

  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    this.securityCheckInterval = setInterval(async () => {
      await this.performSecurityChecks()
    }, AUTH_SECURITY_CONFIG.session.securityCheckInterval)
  }

  private async performSecurityChecks(): Promise<void> {
    try {
      await redisSessionStore.invalidateExpiredSessions()
      await this.checkConcurrentSessions()
    } catch (error) {
      console.error('Security check error:', error)
    }
  }

  private async checkConcurrentSessions(): Promise<void> {
    await checkConcurrentSessionsHelper((sessionId, reason) =>
      this.invalidateSession(sessionId, reason)
    )
  }
}

export const authSecurityManager = new AuthSecurityManager()

export default authSecurityManager
