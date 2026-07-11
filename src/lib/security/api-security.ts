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
import {
  inputValidator,
  validateApiInput,
  ApiValidationResult,
  SecurityFlag
} from './input-validation'
import { sybilPreventionEngine } from './sybil-prevention'
import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient as createSSRClient } from '@/lib/supabase/server'

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
  role?: string
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
  validationResult?: ApiValidationResult
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
      return this.secureResponse(response, securityConfig, securityResult.securityContext!, request)
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
        response: this.createErrorResponse(
          'Multi-factor authentication required',
          401,
          'mfa_required'
        )
      }
    }

    // Check trust score requirement
    if (
      config.minTrustScore &&
      securityContext.trustScore &&
      securityContext.trustScore < config.minTrustScore
    ) {
      return {
        allowed: false,
        response: this.createErrorResponse('Insufficient trust score', 403, 'insufficient_trust')
      }
    }

    // Check role-based access. Matches when the user's role OR any of their
    // permissions is in config.allowedRoles. If allowedRoles is set and the
    // user has no qualifying role, deny (fail closed).
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      const hasRequiredRole =
        (securityContext.role
          ? config.allowedRoles.includes(securityContext.role)
          : false) ||
        (securityContext.permissions.length > 0 &&
          config.allowedRoles.some(r => securityContext.permissions.includes(r)))

      if (!hasRequiredRole) {
        return {
          allowed: false,
          response: this.createErrorResponse(
            'Insufficient permissions',
            403,
            'insufficient_permissions'
          )
        }
      }
    }

    // Validate input if schema provided
    let validationResult: ApiValidationResult | undefined
    if (config.inputSchema) {
      validationResult = await validateApiInput(config.inputSchema)(request)

      if (validationResult && !validationResult.isValid) {
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
      securityFlags:
        validationResult?.securityFlags.map((flag: SecurityFlag) => flag.type) || []
    }
  }

  /**
   * Authenticate request
   *
   * Validates the caller's Supabase session by reading the auth cookies set by
   * the browser client (or a Bearer access token) via the Supabase SSR client's
   * `getUser()`, which verifies the JWT signature server-side. This replaced a
   * Redis-backed session lookup that was never populated by the login flow and
   * therefore rejected every authenticated request.
   */
  private async authenticateRequest(request: NextRequest): Promise<{
    allowed: boolean
    response?: NextResponse
    securityContext?: SecurityContext
  }> {
    const ipAddress = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Prefer the SSR cookie-bound client (the normal browser path). The Bearer
    // token fallback covers non-browser callers (e.g. tests, edge workers).
    let user: { id: string } | null = null
    let usingSSRClient = true
    try {
      const ssr = await createSSRClient()
      const {
        data: { user: ssrUser }
      } = await ssr.auth.getUser()
      user = ssrUser
    } catch {
      // SSR client requires the Next.js cookies() context (Route Handlers).
      // In contexts where it can't be built (e.g. some test harnesses), fall
      // back to verifying a Bearer token directly against Supabase.
      usingSSRClient = false
    }

    if (!user && !usingSSRClient) {
      const bearer = request.headers.get('authorization')?.replace('Bearer ', '')
      if (bearer) {
        const {
          data: { user: bearerUser }
        } = await (supabaseAdmin as import('@supabase/supabase-js').SupabaseClient).auth.getUser(
          bearer
        )
        user = bearerUser
      }
    }

    if (!user) {
      return {
        allowed: false,
        response: this.createErrorResponse('Authentication required', 401, 'auth_required')
      }
    }

    const userId = user.id

    // Load the user's profile for trust score / role / permissions. A profile
    // may not exist yet for freshly signed-up users (before the onboarding
    // trigger is applied); in that case fall back to safe defaults rather than
    // rejecting.
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('trust_score, role, permissions')
      .eq('user_id', userId)
      .maybeSingle()

    const trustScore = userProfile?.trust_score ?? 0.1
    const role =
      (userProfile as { role?: string } | null)?.role ?? 'citizen'
    const profilePermissions =
      (userProfile as { permissions?: string[] } | null)?.permissions ?? []
    // Treat the user's role as an implicit permission so `allowedRoles`
    // checks (e.g. ['admin', 'moderator']) match by role.
    const permissions = Array.from(new Set([role, ...profilePermissions]))

    const securityContext: SecurityContext = {
      authenticated: true,
      userId,
      sessionId: `ssr-${userId}`,
      trustScore,
      role,
      permissions,
      deviceTrusted: true,
      mfaVerified: false,
      ipAddress,
      userAgent
    }

    return {
      allowed: true,
      securityContext
    }
  }

  /**
   * Check CORS
   */
  private checkCORS(
    request: NextRequest,
    config: APISecurityConfig
  ): {
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
  private async checkSybilAttack(
    userId: string,
    request: NextRequest
  ): Promise<{
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
          SecurityIncidentType.MALICIOUS_ACTIVITY,
          IncidentSeverity.CRITICAL,
          `Critical risk user ${userId} attempted API access`,
          `Risk score: ${userRisk.riskScore}, Flags: ${userRisk.flags.length}`,
          'api_security'
        )

        return {
          allowed: false,
          response: this.createErrorResponse(
            'Access denied due to security concerns',
            403,
            'high_risk_user'
          ),
          riskLevel: userRisk.riskLevel
        }
      }

      // Require additional verification for high-risk users
      if (userRisk.riskLevel === 'high') {
        return {
          allowed: false,
          response: this.createErrorResponse(
            'Additional verification required',
            401,
            'additional_verification'
          ),
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
   * Log input validation failures
   */
  private async logInputValidationFailure(
    request: NextRequest,
    validationResult: ApiValidationResult
  ): Promise<void> {
    await securityMonitor.createAlert(
      SecurityIncidentType.MALICIOUS_ACTIVITY,
      IncidentSeverity.MEDIUM,
      'Input validation failed',
      `Security flags: ${validationResult.securityFlags.map(f => f.type).join(', ')}`,
      'api_security',
      {
        metadata: {
          url: request.url,
          method: request.method,
          indicators: validationResult.securityFlags.map(f => f.type)
        }
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
    await securityMonitor.createAlert(
      SecurityIncidentType.API_ACCESS,
      (config.auditLevel as IncidentSeverity) || IncidentSeverity.MEDIUM,
      'API access logged',
      `${request.method} ${request.url}`,
      'api_security',
      {
        userId: securityContext.userId,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        metadata: {
          url: request.url,
          method: request.method,
          sessionId: securityContext.sessionId,
          authenticated: securityContext.authenticated,
          trustScore: securityContext.trustScore,
          riskLevel: securityContext.riskLevel,
          timestamp: new Date().toISOString()
        }
      }
    )
  }

  /**
   * Apply security to response
   */
  private secureResponse(
    response: NextResponse,
    config: APISecurityConfig,
    securityContext: SecurityContext,
    request?: NextRequest
  ): NextResponse {
    // Set security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Set CORS headers if enabled with explicit origin whitelist
    if (config.enableCORS && request) {
      const requestOrigin = request.headers.get('origin')
      const allowedOrigins = config.allowedOrigins || []
      const originAllowed =
        allowedOrigins.includes(requestOrigin || '') || allowedOrigins.includes('*')

      if (originAllowed && requestOrigin) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Requested-With'
        )
      }
    }

    // Set cache control
    if (config.cacheControl) {
      response.headers.set('Cache-Control', config.cacheControl)
    }

    // Add security context headers (for debugging)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set(
        'X-Security-Context',
        JSON.stringify({
          authenticated: securityContext.authenticated,
          trustScore: securityContext.trustScore,
          riskLevel: securityContext.riskLevel
        })
      )
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
      return (forwardedFor.split(',')[0] || '').trim()
    }
    if (realIP) {
      return realIP
    }
    if (cfConnectingIP) {
      return cfConnectingIP
    }

    return 'unknown'
  }
}

/**
 * Decorator for securing API endpoints
 */
export function secureAPI(config?: APISecurityConfig) {
  const securityManager = APISecurityManager.getInstance()

  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
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
export const API_SECURITY_CONFIGS: Record<string, APISecurityConfig> = {
  // Public endpoints
  public: {
    requireAuth: false,
    enableCORS: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://openrelief.org',
      'https://staging.openrelief.org'
    ],
    auditLevel: 'low'
  },

  // Authentication endpoints
  auth: {
    requireAuth: false,
    enableCORS: true,
    rateLimitTier: 'auth',
    auditLevel: 'high',
    inputSchema: {
      email: [{ name: 'email', required: true, type: 'email', maxLength: 254 }],
      password: [
        { name: 'password', required: true, type: 'string', minLength: 12, maxLength: 128 }
      ]
    }
  },

  // Emergency endpoints
  emergency: {
    requireAuth: true,
    // MFA is not yet implemented in the app (no enrollment UI / verification
    // path). Requiring it here would block every emergency report with 401
    // mfa_required. Re-enable once MFA enrollment is shipped.
    requireMFA: false,
    minTrustScore: 0.3,
    rateLimitTier: 'emergency',
    validateSybil: true,
    auditLevel: 'high',
    inputSchema: {
      title: [
        {
          name: 'title',
          required: true,
          type: 'string',
          minLength: 5,
          maxLength: 200,
          sanitize: true
        }
      ],
      description: [
        {
          name: 'description',
          required: true,
          type: 'string',
          minLength: 10,
          maxLength: 2000,
          sanitize: true
        }
      ],
      severity: [{ name: 'severity', required: true, type: 'number', min: 1, max: 10 }],
      location: [{ name: 'location', required: true, type: 'object' }]
    }
  },

  // Admin endpoints
  admin: {
    requireAuth: true,
    requireMFA: true,
    minTrustScore: 0.8,
    allowedRoles: ['admin', 'moderator'],
    auditLevel: 'critical',
    validateSybil: true
  },

  // General user endpoints
  user: {
    requireAuth: true,
    auditLevel: 'medium',
    validateSybil: true
  }
}

export default APISecurityManager.getInstance()
