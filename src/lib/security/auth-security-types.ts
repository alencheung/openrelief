/**
 * Authentication Security Types for OpenRelief
 *
 * Type definitions extracted from auth-security.
 */

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
  type:
    | 'ip_change'
    | 'device_change'
    | 'suspicious_location'
    | 'concurrent_sessions'
    | 'expired_session'
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
