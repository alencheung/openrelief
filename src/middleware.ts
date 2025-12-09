/**
 * Security Middleware for OpenRelief
 *
 * This middleware provides comprehensive security protections including:
 * - Rate limiting with progressive penalties
 * - IP-based and user-based limiting
 * - Sybil attack detection
 * - Input validation and sanitization
 * - Security headers enforcement
 * - Request logging and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { securityMonitor } from '@/lib/audit/security-monitor'
import { trustSecurityMiddleware, trustBasedRateLimitMiddleware } from '@/lib/security/trust-middleware'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  onLimitReached?: (req: NextRequest, res: NextResponse) => void
  penaltyMultiplier?: number
  emergencyOverride?: boolean
}

// Rate limit tiers for different endpoint types
const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  // Emergency endpoints - more restrictive during crises
  emergency: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 30,
    penaltyMultiplier: 2.0,
    emergencyOverride: true
  },

  // Authentication endpoints - very restrictive
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    penaltyMultiplier: 3.0,
    emergencyOverride: false
  },

  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    penaltyMultiplier: 1.5,
    emergencyOverride: false
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    penaltyMultiplier: 2.5,
    emergencyOverride: false
  }
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, {
  count: number
  resetTime: number
  penaltyCount: number
  lastAccess: number
  blocked: boolean
  blockExpiry: number
}>()

// Suspicious IP tracking
const suspiciousIPs = new Map<string, {
  score: number
  lastActivity: number
  offenses: string[]
}>()

// Emergency mode detection
let emergencyMode = false
let emergencyModeExpiry = 0

/**
 * Generate rate limit key based on request
 */
function generateRateLimitKey(req: NextRequest, tier: string): string {
  const ip = getClientIP(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const userId = req.headers.get('x-user-id') || 'anonymous'

  // Create composite key for better tracking
  const keyData = `${tier}:${ip}:${userId}:${userAgent}`
  return createHash('sha256').update(keyData).digest('hex').substring(0, 16)
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string {
  // Check various headers for real IP
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback to request IP
  return req.ip || 'unknown'
}

/**
 * Determine rate limit tier based on request path
 */
function getRateLimitTier(pathname: string): string {
  if (pathname.includes('/emergency')) {
    return 'emergency'
  }
  if (pathname.includes('/auth') || pathname.includes('/signup')) {
    return 'auth'
  }
  if (pathname.includes('/upload') || pathname.includes('/file')) {
    return 'upload'
  }
  if (pathname.startsWith('/api/')) {
    return 'api'
  }
  return 'api'
}

/**
 * Check if request is from suspicious IP
 */
function isSuspiciousIP(ip: string): boolean {
  const suspicious = suspiciousIPs.get(ip)
  if (!suspicious) {
    return false
  }

  // Check if IP is temporarily blocked
  if (suspicious.score > 100) {
    return true
  }

  // Decay score over time
  const timeSinceLastActivity = Date.now() - suspicious.lastActivity
  const decayAmount = Math.floor(timeSinceLastActivity / (60 * 60 * 1000)) // Decay per hour
  suspicious.score = Math.max(0, suspicious.score - decayAmount * 10)

  return suspicious.score > 50
}

/**
 * Update suspicious IP score
 */
function updateSuspiciousIP(ip: string, offense: string, severity: number = 10): void {
  const suspicious = suspiciousIPs.get(ip) || {
    score: 0,
    lastActivity: Date.now(),
    offenses: []
  }

  suspicious.score += severity
  suspicious.lastActivity = Date.now()
  suspicious.offenses.push(`${offense}:${new Date().toISOString()}`)

  // Keep only recent offenses
  if (suspicious.offenses.length > 50) {
    suspicious.offenses = suspicious.offenses.slice(-50)
  }

  suspiciousIPs.set(ip, suspicious)

  // Log to security monitor if score is high
  if (suspicious.score > 50) {
    securityMonitor.createAlert(
      'malicious_activity' as any,
      'medium' as any,
      `Suspicious activity from IP: ${ip}`,
      `IP score: ${suspicious.score}, Offense: ${offense}`,
      'middleware'
    )
  }
}

/**
 * Check emergency mode status
 */
function checkEmergencyMode(): boolean {
  // Check if emergency mode is active
  if (emergencyMode && Date.now() < emergencyModeExpiry) {
    return true
  }

  // Reset emergency mode if expired
  if (emergencyMode && Date.now() >= emergencyModeExpiry) {
    emergencyMode = false
    emergencyModeExpiry = 0
  }

  return emergencyMode
}

/**
 * Activate emergency mode
 */
function activateEmergencyMode(duration: number = 60 * 60 * 1000): void {
  emergencyMode = true
  emergencyModeExpiry = Date.now() + duration

  securityMonitor.createAlert(
    'system_compromise' as any,
    'high' as any,
    'Emergency mode activated',
    `Emergency mode activated for ${duration / 1000 / 60} minutes due to security threats`,
    'middleware'
  )
}

/**
 * Rate limiting middleware
 */
async function rateLimitMiddleware(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const key = config.keyGenerator ? config.keyGenerator(req) : generateRateLimitKey(req, 'api')
  const now = Date.now()

  // Get or create rate limit entry
  let rateLimitEntry = rateLimitStore.get(key)
  if (!rateLimitEntry) {
    rateLimitEntry = {
      count: 0,
      resetTime: now + config.windowMs,
      penaltyCount: 0,
      lastAccess: now,
      blocked: false,
      blockExpiry: 0
    }
    rateLimitStore.set(key, rateLimitEntry)
  }

  // Check if IP is blocked
  if (rateLimitEntry.blocked && now < rateLimitEntry.blockExpiry) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitEntry.blockExpiry - now) / 1000),
          blocked: true
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitEntry.blockExpiry - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitEntry.resetTime).toISOString()
          }
        }
      )
    }
  }

  // Reset window if expired
  if (now > rateLimitEntry.resetTime) {
    rateLimitEntry.count = 0
    rateLimitEntry.penaltyCount = 0
    rateLimitEntry.resetTime = now + config.windowMs
  }

  // Check emergency mode
  const isEmergency = checkEmergencyMode()
  const effectiveMaxRequests = isEmergency && config.emergencyOverride
    ? Math.floor(config.maxRequests * 0.3) // Reduce limits during emergency
    : config.maxRequests

  // Apply penalty multiplier
  const penaltyMultiplier = config.penaltyMultiplier || 1.0
  const adjustedMaxRequests = Math.floor(
    effectiveMaxRequests / (1 + (rateLimitEntry.penaltyCount * penaltyMultiplier * 0.1))
  )

  // Check if limit exceeded
  if (rateLimitEntry.count >= adjustedMaxRequests) {
    rateLimitEntry.penaltyCount++

    // Block if too many penalties
    if (rateLimitEntry.penaltyCount > 5) {
      rateLimitEntry.blocked = true
      rateLimitEntry.blockExpiry = now + (60 * 60 * 1000) // 1 hour block

      const ip = getClientIP(req)
      updateSuspiciousIP(ip, 'rate_limit_exceeded', 20)
    }

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitEntry.resetTime - now) / 1000),
          penaltyCount: rateLimitEntry.penaltyCount
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitEntry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitEntry.resetTime).toISOString(),
            'X-RateLimit-Penalty': rateLimitEntry.penaltyCount.toString()
          }
        }
      )
    }
  }

  // Increment counter
  rateLimitEntry.count++
  rateLimitEntry.lastAccess = now

  return { allowed: true }
}

/**
 * Input validation middleware
 */
function inputValidationMiddleware(req: NextRequest): { valid: boolean; response?: NextResponse } {
  const url = req.url
  const method = req.method
  const userAgent = req.headers.get('user-agent') || ''
  const contentType = req.headers.get('content-type') || ''

  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /on\w+\s*=/gi, // Event handlers
    /expression\s*\(/gi, // CSS expression
    /@import/gi, // CSS import
    /\.\./g, // Path traversal
    /file:\/\//gi, // File protocol
    /data:\/\//gi // Data protocol
  ]

  // Check URL for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      const ip = getClientIP(req)
      updateSuspiciousIP(ip, 'suspicious_url_pattern', 15)

      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Invalid request detected' },
          { status: 400 }
        )
      }
    }
  }

  // Check user agent for suspicious patterns
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /curl/i,
    /wget/i,
    /python/i,
    /perl/i,
    /java/i
  ]

  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      const ip = getClientIP(req)
      updateSuspiciousIP(ip, 'suspicious_user_agent', 5)
    }
  }

  // Validate content type for POST/PUT requests
  if ((method === 'POST' || method === 'PUT')
      && !contentType.includes('application/json')
      && !contentType.includes('multipart/form-data')
      && !contentType.includes('application/x-www-form-urlencoded')) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }
  }

  return { valid: true }
}

/**
 * Security headers middleware
 */
function securityHeadersMiddleware(response: NextResponse): NextResponse {
  // Set security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com https://browser.sentry-cdn.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openrelief.org https://openrelief.supabase.co https://dispatch.openrelief.org wss://openrelief.supabase.co",
    "media-src 'self' blob:",
    "object-src 'none'",
    "child-src 'self'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests'
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

/**
 * Main middleware function
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const response = NextResponse.next()

  // Skip middleware for static assets and internal routes
  if (
    pathname.startsWith('/_next')
    || pathname.startsWith('/static')
    || pathname.startsWith('/favicon')
    || pathname.includes('.')
    || pathname === '/sw.js'
  ) {
    return securityHeadersMiddleware(response)
  }

  const ip = getClientIP(req)

  // Check if IP is suspicious
  if (isSuspiciousIP(ip)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    )
  }

  // Input validation
  const inputValidation = inputValidationMiddleware(req)
  if (!inputValidation.valid) {
    return inputValidation.response
  }

  // Apply trust-based security for API routes
  let trustContext = null
  if (pathname.startsWith('/api/')) {
    const trustResult = await trustSecurityMiddleware(req, {
      enableTrustBasedRateLimiting: true,
      enableAttackResistance: true,
      emergencyMode: checkEmergencyMode()
    })

    if (!trustResult.allowed) {
      return trustResult.response
    }

    trustContext = trustResult.context

    // Apply trust-based rate limiting
    const trustRateLimitResult = await trustBasedRateLimitMiddleware(req, trustContext)
    if (!trustRateLimitResult.allowed) {
      return trustRateLimitResult.response
    }

    // Apply traditional rate limiting as fallback
    const tier = getRateLimitTier(pathname)
    const config = RATE_LIMIT_TIERS[tier]

    // Adjust rate limit based on trust score
    const adjustedConfig = {
      ...config,
      maxRequests: trustContext.trustWeight > 0.7
        ? config.maxRequests * 2
        : trustContext.trustWeight < 0.3
          ? Math.floor(config.maxRequests * 0.5)
          : config.maxRequests
    }

    const rateLimitResult = await rateLimitMiddleware(req, adjustedConfig)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }
  }

  // Log request for monitoring with trust context
  await securityMonitor.createAlert(
    'anomalous_behavior' as any,
    'low' as any,
    'API request processed',
    `${req.method} ${pathname} from ${ip}${trustContext ? ` (Trust: ${trustContext.trustWeight}, Level: ${trustContext.trustThreshold})` : ''}`,
    'middleware',
    trustContext ? {
      trustScore: trustContext.trustScore,
      trustThreshold: trustContext.trustThreshold,
      trustWeight: trustContext.trustWeight,
      resistance: trustContext.resistance
    } : undefined
  )

  // Apply security headers with trust information
  const finalResponse = securityHeadersMiddleware(response)

  // Add trust information to headers for downstream processing
  if (trustContext) {
    finalResponse.headers.set('X-Trust-Score', trustContext.trustScore?.toString() || '0')
    finalResponse.headers.set('X-Trust-Threshold', trustContext.trustThreshold || 'unknown')
    finalResponse.headers.set('X-Trust-Weight', trustContext.trustWeight?.toString() || '0')
    finalResponse.headers.set('X-Trust-Resistance', trustContext.resistance || 'unknown')
  }

  return finalResponse
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)'
  ]
}