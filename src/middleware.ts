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
import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import {
  trustSecurityMiddleware,
  trustBasedRateLimitMiddleware
} from '@/lib/security/trust-middleware'
import {
  getRateLimiter,
  generateRateLimitKey,
  getRateLimitTier,
  getClientIP,
  createRateLimitHeaders,
  RATE_LIMIT_TIERS,
  type RateLimitTier
} from '@/lib/redis/rate-limiter'

const rateLimiter = getRateLimiter()

// Redis-backed state with in-memory fallback.
//
// The middleware runs on every request and may be replicated across many
// serverless instances, so module-scoped Maps/booleans only see local traffic.
// We keep the in-memory structures as a fast L1 cache / offline fallback and
// mirror state into Redis when it is available. Every Redis call is wrapped in
// try/catch so Redis being down never breaks a request — it just degrades to
// the pre-existing single-instance behaviour.
let redisClient: import('@/lib/redis/client').Redis | null = null
let redisAvailabilityChecked = false
let redisIsAvailable = false

async function getRedis(): Promise<import('@/lib/redis/client').Redis | null> {
  if (redisClient === null) {
    const { getRedisClient } = await import('@/lib/redis/client')
    redisClient = getRedisClient()
  }
  return redisClient
}

async function isRedisReady(): Promise<boolean> {
  if (redisAvailabilityChecked) {
    return redisIsAvailable
  }
  try {
    const { checkRedisAvailability } = await import('@/lib/redis/client')
    redisIsAvailable = await checkRedisAvailability()
  } catch {
    redisIsAvailable = false
  }
  redisAvailabilityChecked = true
  // Re-probe periodically if Redis was down so we recover automatically.
  if (!redisIsAvailable) {
    setTimeout(() => {
      redisAvailabilityChecked = false
    }, 10_000).unref?.()
  }
  return redisIsAvailable
}

// Suspicious IP tracking.
// In-memory Map acts as an L1 cache and offline fallback; Redis is the source
// of truth across replicas when available. Stale entries are expired lazily on
// read (see isSuspiciousIP), so correctness no longer depends on the periodic
// interval below — the interval only enforces the size cap.
interface SuspiciousIPData {
  score: number
  lastActivity: number
  offenses: string[]
}

const suspiciousIPs = new Map<string, SuspiciousIPData>()

// Configuration for suspicious IP tracking
const SUSPICIOUS_IP_CONFIG = {
  maxSize: 10000, // Maximum number of IPs to track
  cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
  maxAge: 24 * 60 * 60 * 1000, // Remove entries older than 24 hours
  blockThreshold: 100, // Score threshold for blocking
  suspiciousThreshold: 50 // Score threshold for suspicious activity
}

const SUSPICIOUS_IP_REDIS_PREFIX = 'openrelief:suspicious_ip:'
const SUSPICIOUS_IP_REDIS_TTL = Math.floor(SUSPICIOUS_IP_CONFIG.maxAge / 1000)

// Periodic size-cap cleanup. Read-time expiry (in isSuspiciousIP) is the
// primary eviction mechanism, so this only guards against unbounded growth and
// is skipped entirely in serverless/edge contexts where timers do not run.
if (typeof setInterval !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of suspiciousIPs.entries()) {
      if (now - data.lastActivity > SUSPICIOUS_IP_CONFIG.maxAge) {
        suspiciousIPs.delete(ip)
      }
    }
    // If map is still too large, remove lowest-score entries
    if (suspiciousIPs.size > SUSPICIOUS_IP_CONFIG.maxSize) {
      const entries = Array.from(suspiciousIPs.entries()).sort((a, b) => a[1].score - b[1].score)
      const toRemove = entries.slice(0, suspiciousIPs.size - SUSPICIOUS_IP_CONFIG.maxSize)
      for (const [ip] of toRemove) {
        suspiciousIPs.delete(ip)
      }
    }
  }, SUSPICIOUS_IP_CONFIG.cleanupInterval).unref?.()
}

// Emergency mode detection
let emergencyMode = false
let emergencyModeExpiry = 0
const EMERGENCY_MODE_REDIS_KEY = 'openrelief:emergency_mode'

/**
 * Apply time-based score decay to a suspicious-IP record in place.
 */
function decaySuspiciousScore(data: SuspiciousIPData): void {
  const timeSinceLastActivity = Date.now() - data.lastActivity
  const decayAmount = Math.floor(timeSinceLastActivity / (60 * 60 * 1000)) // Decay per hour
  data.score = Math.max(0, data.score - decayAmount * 10)
}

/**
 * Check if request is from suspicious IP.
 *
 * Uses the in-memory L1 cache first (fast path). If the IP is not cached
 * locally and Redis is available, falls back to Redis so that suspicious IPs
 * flagged by another replica are still caught. This is best-effort: any Redis
 * failure degrades to the in-memory view.
 */
async function isSuspiciousIP(ip: string): Promise<boolean> {
  const cached = suspiciousIPs.get(ip)

  if (cached) {
    // Read-time expiry: drop entries older than maxAge instead of relying on
    // the background interval (which never fires on serverless/edge).
    if (Date.now() - cached.lastActivity > SUSPICIOUS_IP_CONFIG.maxAge) {
      suspiciousIPs.delete(ip)
    } else {
      if (cached.score > SUSPICIOUS_IP_CONFIG.blockThreshold) {
        return true
      }
      decaySuspiciousScore(cached)
      return cached.score > SUSPICIOUS_IP_CONFIG.suspiciousThreshold
    }
  }

  // L1 miss — consult Redis if it is available so cross-replica flags hold.
  if (await isRedisReady()) {
    const redis = await getRedis()
    if (redis) {
      try {
        const raw = await redis.get<string>(`${SUSPICIOUS_IP_REDIS_PREFIX}${ip}`)
        if (raw) {
          const data: SuspiciousIPData = JSON.parse(raw)
          // Populate the L1 cache for subsequent fast-path hits.
          suspiciousIPs.set(ip, data)
          if (data.score > SUSPICIOUS_IP_CONFIG.blockThreshold) {
            return true
          }
          decaySuspiciousScore(data)
          return data.score > SUSPICIOUS_IP_CONFIG.suspiciousThreshold
        }
      } catch {
        // Redis read failed — fall through to "not suspicious" (in-memory view).
      }
    }
  }

  return false
}

/**
 * Update suspicious IP score.
 *
 * Writes to the in-memory L1 cache synchronously, then best-effort mirrors the
 * record into Redis so other replicas observe the elevated score. Redis
 * failures are swallowed — the local cache remains authoritative for the
 * current instance.
 */
async function updateSuspiciousIP(ip: string, offense: string, severity: number = 10): Promise<void> {
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

  // Best-effort Redis replication. Never let this block or throw a request.
  if (await isRedisReady()) {
    const redis = await getRedis()
    if (redis) {
      try {
        await redis.set(`${SUSPICIOUS_IP_REDIS_PREFIX}${ip}`, JSON.stringify(suspicious), {
          ex: SUSPICIOUS_IP_REDIS_TTL
        })
      } catch {
        // Swallow — in-memory cache already holds the updated score.
      }
    }
  }

  // Log to security monitor if score is high
  if (suspicious.score > SUSPICIOUS_IP_CONFIG.suspiciousThreshold) {
    securityMonitor.createAlert(
      SecurityIncidentType.MALICIOUS_ACTIVITY,
      IncidentSeverity.MEDIUM,
      `Suspicious activity from IP: ${ip}`,
      `IP score: ${suspicious.score}, Offense: ${offense}`,
      'middleware'
    )
  }
}

/**
 * Check emergency mode status.
 *
 * The local flag/expiry is the fast path. If the local flag is clear or stale,
 * we also consult Redis so emergency mode activated on another replica (e.g.
 * one that observed the attack first) is honoured here. Redis is best-effort:
 * any failure falls back to the local value.
 */
async function checkEmergencyMode(): Promise<boolean> {
  // Fast path: locally active and not expired.
  if (emergencyMode && Date.now() < emergencyModeExpiry) {
    return true
  }

  // Reset local emergency mode if expired.
  if (emergencyMode && Date.now() >= emergencyModeExpiry) {
    emergencyMode = false
    emergencyModeExpiry = 0
  }

  // Cross-replica sync: another instance may have activated emergency mode.
  if (!emergencyMode && (await isRedisReady())) {
    const redis = await getRedis()
    if (redis) {
      try {
        const ttl = await redis.ttl(EMERGENCY_MODE_REDIS_KEY)
        if (ttl && ttl > 0) {
          // Another replica is in emergency mode; mirror it locally so the
          // fast path serves subsequent requests without a Redis round-trip.
          emergencyMode = true
          emergencyModeExpiry = Date.now() + ttl * 1000
          return true
        }
      } catch {
        // Redis read failed — keep using the local value.
      }
    }
  }

  return emergencyMode
}

/**
 * Decide whether a request warrants a security-audit record.
 *
 * Auditing every API request (the previous behaviour) cost a per-request
 * hash + buffer append at 100K req/s for negligible signal. We audit only:
 *  - state-changing requests (POST/PUT/PATCH/DELETE)
 *  - requests from a known-suspicious IP
 *  - requests where the trust system denied or rate-limited the caller
 *  - admin/auth endpoints (regardless of method)
 *
 * GETs to read-only public endpoints are not audited here; they are still
 * observable via standard access logs / Sentry breadcrumbs.
 */
async function shouldAuditRequest(
  req: NextRequest,
  trustContext: { resistance?: string } | undefined | null
): Promise<boolean> {
  const method = req.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    return true
  }

  const pathname = new URL(req.url).pathname
  if (
    pathname.includes('/api/auth') ||
    pathname.includes('/api/admin') ||
    pathname.includes('/api/trust') ||
    pathname.includes('/api/consensus')
  ) {
    return true
  }

  if (trustContext && trustContext.resistance && trustContext.resistance !== 'allowed' && trustContext.resistance !== 'no_user') {
    return true
  }

  const ip = getClientIP(req)
  if (ip !== 'unknown' && (await isSuspiciousIP(ip))) {
    return true
  }

  return false
}

/**
 * Activate emergency mode.
 *
 * Sets the local flag and, best-effort, writes a TTL'd key to Redis so every
 * replica observes emergency mode for the same window. Redis failures are
 * swallowed — the local activation still protects this instance.
 */
async function activateEmergencyMode(duration: number = 60 * 60 * 1000): Promise<void> {
  emergencyMode = true
  emergencyModeExpiry = Date.now() + duration

  if (await isRedisReady()) {
    const redis = await getRedis()
    if (redis) {
      try {
        await redis.set(EMERGENCY_MODE_REDIS_KEY, '1', {
          ex: Math.floor(duration / 1000)
        })
      } catch {
        // Swallow — local activation still holds for this instance.
      }
    }
  }

  securityMonitor.createAlert(
    SecurityIncidentType.SYSTEM_COMPROMISE,
    IncidentSeverity.HIGH,
    'Emergency mode activated',
    `Emergency mode activated for ${duration / 1000 / 60} minutes due to security threats`,
    'middleware'
  )
}

/**
 * Rate limiting middleware using Redis-backed rate limiter
 */
async function rateLimitMiddleware(
  req: NextRequest,
  tier: RateLimitTier,
  options?: {
    trustWeight?: number
    emergencyMode?: boolean
    customMaxRequests?: number
  }
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const key = generateRateLimitKey(req, tier)
  const result = await rateLimiter.checkLimit(key, tier, options)

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result)
    headers['Retry-After'] = Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000),
          penaltyCount: result.penaltyCount
        },
        {
          status: 429,
          headers
        }
      )
    }
  }

  return { allowed: true }
}

/**
 * Input validation middleware
 */
async function inputValidationMiddleware(req: NextRequest): Promise<{ valid: boolean; response?: NextResponse }> {
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
      await updateSuspiciousIP(ip, 'suspicious_url_pattern', 15)

      return {
        valid: false,
        response: NextResponse.json({ error: 'Invalid request detected' }, { status: 400 })
      }
    }
  }

  // Check user agent for suspicious patterns. The previous list flagged
  // /bot|crawler|scanner|curl|wget|python|perl|java/i — which also flagged
  // legitimate emergency-service API integrations and any non-browser
  // reporter. We now flag only UAs that are both non-browser AND exhibit
  // known-malicious signatures (mass-scanner toolkits), while letting
  // programmatic clients through. Per-IP severity stays low so this is a
  // signal, not a block.
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /acunetix/i,
    /nessus/i,
    /dirbuster/i,
    /wpscan/i,
    /hydra/i,
    /burpcollaborator/i
  ]

  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      const ip = getClientIP(req)
      await updateSuspiciousIP(ip, 'suspicious_user_agent', 5)
    }
  }

  // Validate content type for POST/PUT requests
  if (
    (method === 'POST' || method === 'PUT') &&
    !contentType.includes('application/json') &&
    !contentType.includes('multipart/form-data') &&
    !contentType.includes('application/x-www-form-urlencoded')
  ) {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
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
    "script-src 'self' 'strict-dynamic' 'unsafe-inline' https://cdn.vercel-insights.com https://browser.sentry-cdn.com",
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
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
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
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/sw.js'
  ) {
    return securityHeadersMiddleware(response)
  }

  const ip = getClientIP(req)

  // Check if IP is suspicious
  if (await isSuspiciousIP(ip)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Input validation
  const inputValidation = await inputValidationMiddleware(req)
  if (!inputValidation.valid) {
    return inputValidation.response
  }

  // Apply trust-based security for API routes
  let trustContext = null
  if (pathname.startsWith('/api/')) {
    const trustResult = await trustSecurityMiddleware(req, {
      enableTrustBasedRateLimiting: true,
      enableAttackResistance: true,
      emergencyMode: await checkEmergencyMode()
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

    // Apply rate limiting with trust-based adjustments
    const rateLimitResult = await rateLimitMiddleware(req, tier, {
      trustWeight: trustContext?.trustWeight ?? 1,
      emergencyMode: await checkEmergencyMode()
    })
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
    }
  }

  // Audit only security-relevant events, not every request. The previous
  // implementation called securityMonitor.createAlert('API request
  // processed', ...) on every single API request — at 100K req/s that is
  // a per-request CPU + memory + hash tax for near-zero security value,
  // and the in-memory audit buffer grew without bound. We now audit only
  // the events that actually warrant a security record: writes,
  // trust-tier elevation, denials, and suspicious-IP traffic.
  if (await shouldAuditRequest(req, trustContext)) {
    await securityMonitor.createAlert(
      SecurityIncidentType.ANOMALOUS_BEHAVIOR,
      IncidentSeverity.LOW,
      `${req.method} ${pathname}`,
      `from ${ip}${trustContext ? ` (Trust: ${trustContext.trustWeight}, Level: ${trustContext.trustThreshold})` : ''}`,
      'middleware',
      trustContext
        ? {
            metadata: {
              trustScore: trustContext.trustScore,
              trustThreshold: trustContext.trustThreshold,
              trustWeight: trustContext.trustWeight,
              resistance: trustContext.resistance
            }
          }
        : undefined
    )
  }

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
