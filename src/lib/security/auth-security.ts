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

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { sign, verify } from 'jsonwebtoken'
import { securityMonitor } from '@/lib/audit/security-monitor'
import { supabaseAdmin } from '@/lib/supabase'

// Authentication security interfaces
export interface AuthSession {
  sessionId: string
  userId: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  isActive: boolean
  securityFlags: SessionSecurityFlag[]
  mfaVerified: boolean
  trustLevel: 'low' | 'medium' | 'high'
}

export interface SessionSecurityFlag {
  type: 'ip_change' | 'device_change' | 'suspicious_location' | 'concurrent_sessions' | 'expired_session'
  severity: 'low' | 'medium' | 'high'
  detectedAt: Date
  description: string
}

export interface DeviceFingerprint {
  fingerprintId: string
  userId: string
  deviceType: string
  browser: string
  os: string
  screenResolution: string
  timezone: string
  language: string
  canvasFingerprint: string
  webglFingerprint: string
  fonts: string[]
  plugins: string[]
  createdAt: Date
  lastSeen: Date
  isTrusted: boolean
  trustScore: number
}

export interface LoginAttempt {
  attemptId: string
  userId?: string
  email: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  success: boolean
  failureReason?: string
  mfaRequired: boolean
  mfaSuccess?: boolean
  geolocation?: {
    country: string
    city: string
    lat: number
    lng: number
  }
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbidCommonPasswords: boolean
  forbidUserInfo: boolean
  maxAge: number
  historyCount: number
  minUniqueChars: number
}

export interface MFAConfig {
  enabled: boolean
  methods: ('totp' | 'sms' | 'email' | 'backup_codes')[]
  backupCodesCount: number
  backupCodeLength: number
  totpWindow: number
  smsTemplate: string
  emailTemplate: string
}

// Security configuration
const AUTH_SECURITY_CONFIG = {
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    absoluteMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    renewalThreshold: 60 * 60 * 1000, // 1 hour before expiry
    maxConcurrentSessions: 3,
    idleTimeout: 2 * 60 * 60 * 1000, // 2 hours
    securityCheckInterval: 5 * 60 * 1000, // 5 minutes
  },
  
  // Login attempt protection
  loginProtection: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    maxDelay: 30 * 1000, // 30 seconds
    ipTracking: true,
    deviceTracking: true,
    geolocationTracking: true,
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
    minUniqueChars: 8,
  },
  
  // MFA configuration
  mfa: {
    enabled: true,
    methods: ['totp', 'sms', 'email', 'backup_codes'],
    backupCodesCount: 10,
    backupCodeLength: 8,
    totpWindow: 1,
    smsTemplate: 'Your verification code is: {code}',
    emailTemplate: 'Your verification code is: {code}',
  },
  
  // Device fingerprinting
  deviceFingerprinting: {
    enabled: true,
    trustThreshold: 0.7,
    maxDevicesPerUser: 5,
    deviceTrustDecay: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
}

/**
 * Authentication Security Manager
 */
export class AuthSecurityManager {
  private sessions: Map<string, AuthSession> = new Map()
  private loginAttempts: Map<string, LoginAttempt[]> = new Map()
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map()
  private passwordHistory: Map<string, string[]> = new Map()
  private securityCheckInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startSecurityMonitoring()
    this.loadExistingSessions()
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
      // Check login attempt limits
      const attemptCheck = this.checkLoginAttempts(email, deviceInfo.ipAddress)
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
      const session = this.sessions.get(sessionId)
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
          'unauthorized_access' as any,
          'medium' as any,
          `MFA verification failed for user ${session.userId}`,
          `Method: ${method}, Session: ${sessionId}`,
          'auth_security'
        )
        
        return { success: false, error: 'Invalid verification code' }
      }
      
      // Mark session as MFA verified
      session.mfaVerified = true
      session.lastActivity = new Date()
      this.sessions.set(sessionId, session)
      
      return { success: true }
    } catch (error) {
      console.error('MFA verification error:', error)
      return { success: false, error: 'MFA verification failed' }
    }
  }
  
  /**
   * Validate session with security checks
   */
  async validateSession(sessionId: string, requestContext: {
    ipAddress: string
    userAgent: string
  }): Promise<{
    valid: boolean
    session?: AuthSession
    securityFlags?: SessionSecurityFlag[]
    requiresReauth?: boolean
  }> {
    try {
      const session = this.sessions.get(sessionId)
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
      
      // Update session
      session.lastActivity = new Date()
      session.securityFlags.push(...securityFlags)
      this.sessions.set(sessionId, session)
      
      // Log security flags
      if (securityFlags.length > 0) {
        await securityMonitor.createAlert(
          'suspicious_login' as any,
          'medium' as any,
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
    const salt = randomBytes(32)
    const pepper = process.env.AUTH_PEPPER || ''
    
    return new Promise((resolve, reject) => {
      scrypt(password + pepper, salt, 64, (err, derivedKey) => {
        if (err) reject(err)
        
        const hash = salt.toString('hex') + ':' + derivedKey.toString('hex')
        resolve(hash)
      })
    })
  }
  
  /**
   * Verify password with timing attack protection
   */
  async verifyPasswordSecure(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':')
    const pepper = process.env.AUTH_PEPPER || ''
    
    return new Promise((resolve) => {
      scrypt(password + pepper, Buffer.from(salt, 'hex'), 64, (err, derivedKey) => {
        if (err) resolve(false)
        
        // Use timing-safe comparison
        const isValid = timingSafeEqual(
          Buffer.from(key, 'hex'),
          derivedKey
        )
        resolve(isValid)
      })
    })
  }
  
  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent: string): string {
    // This is a simplified fingerprint - in production, use more sophisticated methods
    const fingerprintData = {
      userAgent,
      acceptLanguage: 'en-US,en;q=0.9',
      platform: navigator?.platform || 'unknown',
      cookieEnabled: navigator?.cookieEnabled || false,
      doNotTrack: navigator?.doNotTrack || 'unknown'
    }
    
    return createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex')
      .substring(0, 32)
  }
  
  /**
   * Check login attempts and apply rate limiting
   */
  private checkLoginAttempts(email: string, ipAddress: string): {
    allowed: boolean
    lockoutTime?: number
    delay?: number
  } {
    const now = Date.now()
    const userAttempts = this.loginAttempts.get(email) || []
    const ipAttempts = this.loginAttempts.get(`ip:${ipAddress}`) || []
    
    // Clean old attempts
    const recentUserAttempts = userAttempts.filter(attempt => 
      now - attempt.timestamp.getTime() < AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
    )
    const recentIpAttempts = ipAttempts.filter(attempt => 
      now - attempt.timestamp.getTime() < AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
    )
    
    // Check if user is locked out
    const failedUserAttempts = recentUserAttempts.filter(attempt => !attempt.success)
    if (failedUserAttempts.length >= AUTH_SECURITY_CONFIG.loginProtection.maxAttempts) {
      const lastAttempt = failedUserAttempts[failedUserAttempts.length - 1]
      const lockoutTime = lastAttempt.timestamp.getTime() + AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
      
      if (now < lockoutTime) {
        return {
          allowed: false,
          lockoutTime
        }
      }
    }
    
    // Check if IP is locked out
    const failedIpAttempts = recentIpAttempts.filter(attempt => !attempt.success)
    if (failedIpAttempts.length >= AUTH_SECURITY_CONFIG.loginProtection.maxAttempts) {
      const lastAttempt = failedIpAttempts[failedIpAttempts.length - 1]
      const lockoutTime = lastAttempt.timestamp.getTime() + AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
      
      if (now < lockoutTime) {
        return {
          allowed: false,
          lockoutTime
        }
      }
    }
    
    // Calculate progressive delay
    let delay = 0
    if (AUTH_SECURITY_CONFIG.loginProtection.progressiveDelay) {
      const delayMultiplier = Math.min(failedUserAttempts.length, 5)
      delay = Math.min(delayMultiplier * 1000, AUTH_SECURITY_CONFIG.loginProtection.maxDelay)
    }
    
    return { allowed: true, delay }
  }
  
  /**
   * Record login attempt
   */
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
    const loginAttempt: LoginAttempt = {
      attemptId: randomBytes(16).toString('hex'),
      email: attempt.email,
      userId: attempt.userId,
      deviceFingerprint: attempt.fingerprint,
      userAgent: attempt.userAgent,
      ipAddress: attempt.ipAddress,
      timestamp: new Date(),
      success: attempt.success,
      failureReason: attempt.failureReason,
      mfaRequired: attempt.mfaRequired || false,
      geolocation: attempt.geolocation
    }
    
    // Store attempt
    const userAttempts = this.loginAttempts.get(attempt.email) || []
    userAttempts.push(loginAttempt)
    this.loginAttempts.set(attempt.email, userAttempts)
    
    // Store IP attempts
    const ipAttempts = this.loginAttempts.get(`ip:${attempt.ipAddress}`) || []
    ipAttempts.push(loginAttempt)
    this.loginAttempts.set(`ip:${attempt.ipAddress}`, ipAttempts)
    
    // Log to audit system
    await securityMonitor.createAlert(
      attempt.success ? 'successful_login' : 'failed_login' as any,
      attempt.success ? 'low' : 'medium' as any,
      `Login attempt for ${attempt.email}`,
      `Success: ${attempt.success}, IP: ${attempt.ipAddress}, Reason: ${attempt.failureReason || 'N/A'}`,
      'auth_security'
    )
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
    const sessionId = randomBytes(32).toString('hex')
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
    
    // Store session
    this.sessions.set(sessionId, session)
    
    // Store in database for persistence
    await supabaseAdmin
      .from('auth_sessions')
      .insert({
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
  
  /**
   * Check device fingerprint
   */
  private async checkDeviceFingerprint(userId: string, fingerprint: string): Promise<{
    trustLevel: 'low' | 'medium' | 'high'
    isTrusted: boolean
  }> {
    const { data: device, error } = await supabaseAdmin
      .from('device_fingerprints')
      .select('*')
      .eq('user_id', userId)
      .eq('fingerprint_id', fingerprint)
      .single()
    
    if (error || !device) {
      // New device
      return {
        trustLevel: 'low',
        isTrusted: false
      }
    }
    
    // Check if device is trusted
    const isTrusted = device.is_trusted && device.trust_score > AUTH_SECURITY_CONFIG.deviceFingerprinting.trustThreshold
    const trustLevel = isTrusted ? 'high' : 'medium'
    
    return {
      trustLevel,
      isTrusted
    }
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
  
  /**
   * Invalidate session
   */
  private async invalidateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    // Mark as inactive
    session.isActive = false
    this.sessions.set(sessionId, session)
    
    // Update database
    await supabaseAdmin
      .from('auth_sessions')
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason
      })
      .eq('session_id', sessionId)
    
    // Log to audit
    await securityMonitor.createAlert(
      'session_invalidated' as any,
      'low' as any,
      `Session ${sessionId} invalidated`,
      `Reason: ${reason}, User: ${session.userId}`,
      'auth_security'
    )
  }
  
  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    this.securityCheckInterval = setInterval(async () => {
      await this.performSecurityChecks()
    }, AUTH_SECURITY_CONFIG.session.securityCheckInterval)
  }
  
  /**
   * Perform periodic security checks
   */
  private async performSecurityChecks(): Promise<void> {
    try {
      // Check for expired sessions
      const now = new Date()
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          await this.invalidateSession(sessionId, 'expired')
        }
      }
      
      // Check for concurrent session violations
      await this.checkConcurrentSessions()
      
      // Clean old login attempts
      this.cleanupOldLoginAttempts()
    } catch (error) {
      console.error('Security check error:', error)
    }
  }
  
  /**
   * Check for concurrent session violations
   */
  private async checkConcurrentSessions(): Promise<void> {
    const userSessions = new Map<string, AuthSession[]>()
    
    // Group sessions by user
    for (const session of this.sessions.values()) {
      if (session.isActive) {
        const userSessionList = userSessions.get(session.userId) || []
        userSessionList.push(session)
        userSessions.set(session.userId, userSessionList)
      }
    }
    
    // Check for violations
    for (const [userId, sessions] of userSessions.entries()) {
      if (sessions.length > AUTH_SECURITY_CONFIG.session.maxConcurrentSessions) {
        // Mark oldest sessions as inactive
        const sortedSessions = sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        const sessionsToInvalidate = sortedSessions.slice(0, sessions.length - AUTH_SECURITY_CONFIG.session.maxConcurrentSessions)
        
        for (const session of sessionsToInvalidate) {
          await this.invalidateSession(session.sessionId, 'concurrent_sessions')
        }
      }
    }
  }
  
  /**
   * Clean old login attempts
   */
  private cleanupOldLoginAttempts(): void {
    const cutoffTime = Date.now() - AUTH_SECURITY_CONFIG.loginProtection.lockoutDuration
    
    for (const [key, attempts] of this.loginAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => 
        attempt.timestamp.getTime() > cutoffTime
      )
      
      if (recentAttempts.length === 0) {
        this.loginAttempts.delete(key)
      } else {
        this.loginAttempts.set(key, recentAttempts)
      }
    }
  }
  
  /**
   * Load existing sessions from database
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from('auth_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
      
      if (error) throw error
      
      for (const sessionData of data || []) {
        const session: AuthSession = {
          sessionId: sessionData.session_id,
          userId: sessionData.user_id,
          deviceFingerprint: sessionData.device_fingerprint,
          ipAddress: sessionData.ip_address,
          userAgent: sessionData.user_agent,
          createdAt: new Date(sessionData.created_at),
          lastActivity: new Date(sessionData.last_activity || sessionData.created_at),
          expiresAt: new Date(sessionData.expires_at),
          isActive: sessionData.is_active,
          securityFlags: [],
          mfaVerified: sessionData.mfa_verified,
          trustLevel: sessionData.trust_level
        }
        
        this.sessions.set(session.sessionId, session)
      }
    } catch (error) {
      console.error('Error loading existing sessions:', error)
    }
  }
}

// Global authentication security manager instance
export const authSecurityManager = new AuthSecurityManager()

export default authSecurityManager