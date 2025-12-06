/**
 * API Endpoint Security System
 * 
 * This module provides comprehensive security for API endpoints including:
 * - Request validation and sanitization
 * - Authentication and authorization
 * - Rate limiting integration
 * - Sybil attack prevention
 * - Audit logging
 * - Response security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { authSecurityManager } from './auth-security'
import { inputValidator, validateApiInput, ValidationResult } from './input-validation'
import { sybilPreventionEngine } from './sybil-prevention'
import { securityMonitor } from '@/lib/audit/security-monitor'

// API Security configuration
interface APISecurityConfig {
  requireAuth?: boolean
  requireMFA?: boolean
  minTrustScore?: number
  allowedRoles?: string[]
  rateLimitTier?: 'emergency' | 'auth' | 'api' | 'upload'
  inputSchema?: Record<string, any[]>
  validateSybil?: boolean
  auditLevel?: 'low' | 'medium' | 'high' | 'critical'
  enableCORS?: boolean
  allowedOrigins?: string[]
  cacheControl?: string
  timeout?: number
}

// Security context for requests
interface SecurityContext {
  authenticated: boolean
  userId?: string
  sessionId?: string
  trustScore?: number
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  permissions: string[]
  deviceTrusted: boolean
  mfaVerified: boolean
  ipAddress: string
  userAgent: string
  geolocation?: {
    country: string
    city: string
    lat: number
    lng: number
  }
}

// API Security Result
interface APISecurityResult {
  allowed: boolean
  response?: NextResponse
  securityContext?: SecurityContext
  validationResult?: ValidationResult
  securityFlags?: string[]
}

/**
 * API Security Manager
 */
export class APISecurityManager {
  private static instance: APISecurityManager
  private securityConfigs: Map<string, APISecurityConfig> = new Map()
  
  private constructor() {}
  
  static getInstance(): APISecurityManager {
    if (!APISecurityManager.instance) {
      APISecurityManager.instance = new APISecurityManager()
    }
    return APISecurityManager.instance
  }
  
  /**
   * Register security configuration for an endpoint
   */
  registerEndpointSecurity(path: string, config: APISecurityConfig): void {
    this.securityConfigs.set(path, {
      requireAuth: true,
      auditLevel: 'medium',
      enableCORS: true,
      ...config
    })
  }
  
  /**
   * Secure API endpoint handler
   */
  async secureEndpoint(
    request: NextRequest,
    handler: (req: NextRequest, context: SecurityContext) => Promise<NextResponse>,
    config?: APISecurityConfig
  ): Promise<NextResponse> {
    const pathname = new URL(request.url).pathname
    const securityConfig = config || this.securityConfigs.get(pathname) || {}
    
    try {
      // Perform security checks
      const securityResult = await this.performSecurityChecks(request, securityConfig)
      
      if (!securityResult.allowed) {
        return securityResult.response!
      }
      
      // Execute the actual handler
      const response = await handler(request, securityResult.securityContext!)
      
      // Apply security to response
      return this.secureResponse(response, securityConfig, securityResult.securityContext!)
    } catch (error) {
      console.error('API Security Error:', error)
      return this.createErrorResponse('Internal security error', 500, 'security_error')
    }
  }
  
  /**
   * Perform comprehensive security checks
   */
  private async performSecurityChecks(
    request: NextRequest,
    config: APISecurityConfig
  ): Promise<APISecurityResult> {
    const pathname = new URL(request.url).pathname
    const ipAddress = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Initialize security context
    const securityContext: SecurityContext = {
      authenticated: false,
      permissions: [],
      deviceTrusted: false,
      mfaVerified: false,
      ipAddress,
      userAgent
    }
    
    // Check CORS if enabled
    if (config.enableCORS) {
      const corsCheck = this.checkCORS(request, config)
      if (!corsCheck.allowed) {
        return {
          allowed: false,
          response: corsCheck.response
        }
      }
    }
    
    // Extract and validate session
    if (config.requireAuth) {
      const authResult = await this.authenticateRequest(request)
      if (!authResult.allowed) {
        return {
          allowed: false,
          response: authResult.response
        }
      }
      
      Object.assign(securityContext, authResult.securityContext!)
    }
    
    // Check MFA requirement
    if (config.requireMFA && securityContext.authenticated && !securityContext.mfaVerified) {
      return {
        allowed: false,
        response: this.createErrorResponse('Multi-factor authentication required', 401, 'mfa_required')
      }
    }
    
    // Check trust score requirement
    if (config.minTrustScore && securityContext.trustScore && securityContext.trustScore < config.minTrustScore) {
      return {
        allowed: false,
        response: this.createErrorResponse('Insufficient trust score', 403, 'insufficient_trust')
      }
    }
    
    // Check role-based access
    if (config.allowedRoles && securityContext.permissions.length > 0) {
      const hasRequiredRole = config.allowedRoles.some(role => 
        securityContext.permissions.includes(role)
      )
      
      if (!hasRequiredRole) {
        return {
          allowed: false,
          response: this.createErrorResponse('Insufficient permissions', 403, 'insufficient_permissions')
      }
    }
    
    // Validate input if schema provided
    let validationResult: ValidationResult | undefined
    if (config.inputSchema) {
      validationResult = await validateApiInput(config.inputSchema)(request)
      
      if (!validationResult.isValid) {
        await this.logInputValidationFailure(request, validationResult)
        return {
          allowed: false,
          response: this.createErrorResponse('Invalid input', 400, 'invalid_input', {
            errors: validationResult.errors,
            securityFlags: validationResult.securityFlags.map(flag => flag.type)
          })
        }
      }
    }
    
    // Sybil attack prevention
    if (config.validateSybil && securityContext.userId) {
      const sybilCheck = await this.checkSybilAttack(securityContext.userId, request)
      if (!sybilCheck.allowed) {
        return {
          allowed: false,
          response: sybilCheck.response
        }
      }
      
      securityContext.riskLevel = sybilCheck.riskLevel
    }
    
    // Log the request
    await this.logSecureRequest(request, securityContext, config)
    
    return {
      allowed: true,
      securityContext,
      validationResult,
      securityFlags: validationResult?.securityFlags.map(flag => flag.type) || []
    }
  }
  
  /**
   * Authenticate request
   */
  private async authenticateRequest(request: NextRequest): Promise<{
    allowed: boolean
    response?: NextResponse
    securityContext?: SecurityContext
  }> {
    // Get session token from headers or cookies
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '') ||
                         request.cookies.get('session-token')?.value
    
    if (!sessionToken) {
      return {
        allowed: false,
        response: this.createErrorResponse('Authentication required', 401, 'auth_required')
      }
    }
    
    // Validate session
    const sessionValidation = await authSecurityManager.validateSession(sessionToken, {
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    })
    
    if (!sessionValidation.valid) {
      if (sessionValidation.requiresReauth) {
        return {
          allowed: false,
          response: this.createErrorResponse('Re-authentication required', 401, 'reauth_required')
        }
      }
      
      return {
        allowed: false,
        response: this.createErrorResponse('Invalid session', 401, 'invalid_session')
      }
    }
    
    const session = sessionValidation.session!
    
    // Get user permissions and trust score
    const { data: userProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('trust_score, role, permissions')
      .eq('user_id', session.userId)
      .single()
    
    if (error || !userProfile) {
      return {
        allowed: false,
        response: this.createErrorResponse('User profile not found', 404, 'user_not_found')
      }
    }
    
    const securityContext: SecurityContext = {
      authenticated: true,
      userId: session.userId,
      sessionId: session.sessionId,
      trustScore: userProfile.trust_score,
      permissions: userProfile.permissions || [],
      deviceTrusted: session.trustLevel === 'high',
      mfaVerified: session.mfaVerified,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    }
    
    // Check for security flags in session
    if (session.securityFlags.length > 0) {
      await this.handleSessionSecurityFlags(session, securityContext)
    }
    
    return {
      allowed: true,
      securityContext
    }
  }
  
  /**
   * Check CORS
   */
  private checkCORS(request: NextRequest, config: APISecurityConfig): {
    allowed: boolean
    response?: NextResponse
  } {
    const origin = request.headers.get('origin')
    const method = request.method
    
    // Check if origin is allowed
    if (origin && config.allowedOrigins) {
      if (!config.allowedOrigins.includes(origin)) {
        return {
          allowed: false,
          response: this.createErrorResponse('CORS policy violation', 403, 'cors_violation')
        }
      }
    }
    
    // Check if method is allowed
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    if (!allowedMethods.includes(method)) {
      return {
        allowed: false,
        response: this.createErrorResponse('Method not allowed', 405, 'method_not_allowed')
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Check for Sybil attack patterns
   */
  private async checkSybilAttack(userId: string, request: NextRequest): Promise<{
    allowed: boolean
    response?: NextResponse
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  }> {
    try {
      // Analyze user behavior
      const userRisk = sybilPreventionEngine.getUserRiskAssessment(userId)
      
      // Block high-risk users
      if (userRisk.riskLevel === 'critical') {
        await securityMonitor.createAlert(
          'malicious_activity' as any,
          'critical' as any,
          `Critical risk user ${userId} attempted API access`,
          `Risk score: ${userRisk.riskScore}, Flags: ${userRisk.flags.length}`,
          'api_security'
        )
        
        return {
          allowed: false,
          response: this.createErrorResponse('Access denied due to security concerns', 403, 'high_risk_user'),
          riskLevel: userRisk.riskLevel
        }
      }
      
      // Require additional verification for high-risk users
      if (userRisk.riskLevel === 'high') {
        return {
          allowed: false,
          response: this.createErrorResponse('Additional verification required', 401, 'additional_verification'),
          riskLevel: userRisk.riskLevel
        }
      }
      
      return {
        allowed: true,
        riskLevel: userRisk.riskLevel
      }
    } catch (error) {
      console.error('Sybil check error:', error)
      // Fail open for security errors
      return { allowed: true }
    }
  }
  
  /**
   * Handle session security flags
   */
  private async handleSessionSecurityFlags(session: any, securityContext: SecurityContext): Promise<void> {
    for (const flag of session.securityFlags) {
      switch (flag.type) {
        case 'ip_change':
          await securityMonitor.createAlert(
            'suspicious_login' as any,
            'medium' as any,
            `IP address changed for user ${securityContext.userId}`,
            `Previous: ${session.ipAddress}, Current: ${securityContext.ipAddress}`,
            'api_security'
          )
          break
          
        case 'device_change':
          await securityMonitor.createAlert(
            'suspicious_login' as any,
            'high' as any,
            `Device changed for user ${securityContext.userId}`,
            `Session: ${securityContext.sessionId}`,
            'api_security'
          )
          break
          
        case 'concurrent_sessions':
          await securityMonitor.createAlert(
            'suspicious_activity' as any,
            'medium' as any,
            `Concurrent sessions detected for user ${securityContext.userId}`,
            `Session: ${securityContext.sessionId}`,
            'api_security'
          )
          break
      }
    }
  }
  
  /**
   * Log input validation failures
   */
  private async logInputValidationFailure(
    request: NextRequest,
    validationResult: ValidationResult
  ): Promise<void> {
    await securityMonitor.createAlert(
      'malicious_activity' as any,
      'medium' as any,
      'Input validation failed',
      `Security flags: ${validationResult.securityFlags.map(f => f.type).join(', ')}`,
      'api_security',
      {
        url: request.url,
        method: request.method,
        errors: validationResult.errors,
        securityFlags: validationResult.securityFlags
      }
    )
  }
  
  /**
   * Log secure request
   */
  private async logSecureRequest(
    request: NextRequest,
    securityContext: SecurityContext,
    config: APISecurityConfig
  ): Promise<void> {
    const auditData = {
      url: request.url,
      method: request.method,
      userId: securityContext.userId,
      sessionId: securityContext.sessionId,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent,
      authenticated: securityContext.authenticated,
      trustScore: securityContext.trustScore,
      riskLevel: securityContext.riskLevel,
      timestamp: new Date().toISOString()
    }
    
    await securityMonitor.createAlert(
      'api_access' as any,
      config.auditLevel || 'medium' as any,
      'API access logged',
      `${request.method} ${request.url}`,
      'api_security',
      auditData
    )
  }
  
  /**
   * Apply security to response
   */
  private secureResponse(
    response: NextResponse,
    config: APISecurityConfig,
    securityContext: SecurityContext
  ): NextResponse {
    // Set security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Set cache control
    if (config.cacheControl) {
      response.headers.set('Cache-Control', config.cacheControl)
    }
    
    // Add security context headers (for debugging)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Security-Context', JSON.stringify({
        authenticated: securityContext.authenticated,
        trustScore: securityContext.trustScore,
        riskLevel: securityContext.riskLevel
      }))
    }
    
    return response
  }
  
  /**
   * Create standardized error response
   */
  private createErrorResponse(
    message: string,
    status: number,
    code: string,
    details?: any
  ): NextResponse {
    const errorResponse = {
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
    
    return NextResponse.json(errorResponse, { status })
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    
    return request.ip || 'unknown'
  }
}

/**
 * Decorator for securing API endpoints
 */
export function secureAPI(config?: APISecurityConfig) {
  const securityManager = APISecurityManager.getInstance()
  
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      return securityManager.secureEndpoint(request, method.bind(this, request, ...args), config)
    }
    
    return descriptor
  }
}

/**
 * Higher-order function for securing API routes
 */
export function withAPISecurity(config?: APISecurityConfig) {
  const securityManager = APISecurityManager.getInstance()
  
  return (handler: (req: NextRequest, context: SecurityContext) => Promise<NextResponse>) => {
    return (request: NextRequest) => {
      return securityManager.secureEndpoint(request, handler, config)
    }
  }
}

// Predefined security configurations
export const API_SECURITY_CONFIGS = {
  // Public endpoints
  public: {
    requireAuth: false,
    enableCORS: true,
    auditLevel: 'low' as const
  },
  
  // Authentication endpoints
  auth: {
    requireAuth: false,
    enableCORS: true,
    rateLimitTier: 'auth',
    auditLevel: 'high' as const,
    inputSchema: {
      email: [
        { name: 'email', required: true, type: 'email', maxLength: 254 }
      ],
      password: [
        { name: 'password', required: true, type: 'string', minLength: 12, maxLength: 128 }
      ]
    }
  },
  
  // Emergency endpoints
  emergency: {
    requireAuth: true,
    requireMFA: true,
    minTrustScore: 0.3,
    rateLimitTier: 'emergency',
    validateSybil: true,
    auditLevel: 'high' as const,
    inputSchema: {
      title: [
        { name: 'title', required: true, type: 'string', minLength: 5, maxLength: 200, sanitize: true }
      ],
      description: [
        { name: 'description', required: true, type: 'string', minLength: 10, maxLength: 2000, sanitize: true }
      ],
      severity: [
        { name: 'severity', required: true, type: 'number', min: 1, max: 10 }
      ],
      location: [
        { name: 'location', required: true, type: 'object' }
      ]
    }
  },
  
  // Admin endpoints
  admin: {
    requireAuth: true,
    requireMFA: true,
    minTrustScore: 0.8,
    allowedRoles: ['admin', 'moderator'],
    auditLevel: 'critical' as const,
    validateSybil: true
  },
  
  // General user endpoints
  user: {
    requireAuth: true,
    auditLevel: 'medium' as const,
    validateSybil: true
  }
}

export default APISecurityManager.getInstance()