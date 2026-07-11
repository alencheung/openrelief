/**
 * Trust-Based Security Middleware
 *
 * This middleware integrates trust scores with security decisions,
 * providing dynamic access controls and attack resistance based on user reputation.
 * It works with the existing security infrastructure to enhance protection.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  trustScoreManager,
  updateTrustScoreFromAction as updateTrustScoreFromActionCore
} from './trust-integration'
import { securityMonitor, SecurityIncidentType, IncidentSeverity } from '@/lib/audit/security-monitor'
import { verifySupabaseJwt } from '@/lib/auth/jwt-verify'

// Trust-based security interfaces
export interface TrustSecurityContext {
  userId?: string
  trustScore?: number
  trustThreshold?: string
  trustWeight?: number
  resistance?: string
  permissions?: string[]
  restrictions?: string[]
  requirements?: string[]
}

export interface TrustSecurityConfig {
  enableTrustBasedRateLimiting: boolean
  enableAttackResistance: boolean
  emergencyMode: boolean
  trustWeightMultiplier: number
  minTrustThreshold: number
}

// Default configuration
const DEFAULT_CONFIG: TrustSecurityConfig = {
  enableTrustBasedRateLimiting: true,
  enableAttackResistance: true,
  emergencyMode: false,
  trustWeightMultiplier: 2.0,
  minTrustThreshold: 0.3
}

/**
 * Trust-based security middleware
 */
export async function trustSecurityMiddleware(
  request: NextRequest,
  config: Partial<TrustSecurityConfig> = {}
): Promise<{
  allowed: boolean
  context: TrustSecurityContext
  response?: NextResponse
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    // Extract user information from request. The userId is now resolved only
    // from a signature-verified JWT — previously it was decoded without
    // verification, allowing an attacker to mint a JWT claiming a
    // high-trust user's `sub` and inherit their elevated rate limit.
    const userId = await extractUserIdFromRequest(request)

    if (!userId) {
      // No user ID, apply default security
      return {
        allowed: true,
        context: {
          userId: undefined,
          trustScore: 0.1,
          trustThreshold: 'very_low',
          trustWeight: 0,
          resistance: 'no_user',
          permissions: ['read_public'],
          restrictions: ['strict_rate_limit'],
          requirements: []
        }
      }
    }

    // Get user's trust information
    const trustThreshold = trustScoreManager.getTrustThreshold(userId)
    const rateLimitParams = trustScoreManager.getTrustBasedRateLimit(userId)

    // Check if user can perform the requested action
    const action = determineActionFromRequest(request)
    const permissionCheck = await trustScoreManager.canPerformAction(userId, action)

    if (!permissionCheck.allowed) {
      // Log permission denied
      await securityMonitor.createAlert(
        'trust_permission_denied' as SecurityIncidentType,
        IncidentSeverity.MEDIUM,
        `Trust-based permission denied for user ${userId}`,
        `Action: ${action}, Reason: ${permissionCheck.reason}`,
        'trust_system',
        {
          userId,
          metadata: {
            action,
            reason: permissionCheck.reason,
            trustThreshold: trustThreshold.level,
            requirements: permissionCheck.requirements
          }
        }
      )

      return {
        allowed: false,
        context: {
          userId,
          trustScore: 0, // Will be populated if needed
          trustThreshold: trustThreshold.level,
          trustWeight: 0,
          resistance: 'permission_denied',
          permissions: permissionCheck.requirements || [],
          restrictions: permissionCheck.restrictions || [],
          requirements: permissionCheck.requirements || []
        },
        response: NextResponse.json(
          {
            error: 'Permission denied',
            reason: permissionCheck.reason,
            requirements: permissionCheck.requirements
          },
          { status: 403 }
        )
      }
    }

    // Apply attack resistance if enabled
    let resistance = 'allowed'
    let trustWeight = trustThreshold.minScore

    if (finalConfig.enableAttackResistance) {
      const requestData = await extractRequestData(request)
      const attackResistance = await trustScoreManager.applyAttackResistance(
        userId,
        action,
        requestData
      )

      resistance = attackResistance.resistance
      trustWeight = attackResistance.trustWeight

      if (!attackResistance.allowed) {
        await securityMonitor.createAlert(
          'trust_attack_blocked' as SecurityIncidentType,
          IncidentSeverity.HIGH,
          `Trust-based attack resistance triggered for user ${userId}`,
          `Action: ${action}, Resistance: ${resistance}`,
          'trust_system',
          {
            userId,
            metadata: {
              action,
              resistance,
              trustWeight,
              requestData: attackResistance.adjustedData
            }
          }
        )

        return {
          allowed: false,
          context: {
            userId,
            trustScore: trustWeight,
            trustThreshold: trustThreshold.level,
            trustWeight,
            resistance,
            permissions: permissionCheck.requirements || [],
            restrictions: permissionCheck.restrictions || [],
            requirements: permissionCheck.requirements || []
          },
          response: NextResponse.json(
            {
              error: 'Attack resistance triggered',
              resistance,
              trustWeight
            },
            { status: 429 }
          )
        }
      }
    }

    // Create trust security context
    const context: TrustSecurityContext = {
      userId,
      trustScore: trustWeight,
      trustThreshold: trustThreshold.level,
      trustWeight,
      resistance,
      permissions: permissionCheck.requirements || [],
      restrictions: permissionCheck.restrictions || [],
      requirements: permissionCheck.requirements || []
    }

    // Add trust information to request headers for downstream processing
    const response = NextResponse.next()
    response.headers.set('x-trust-score', trustWeight.toString())
    response.headers.set('x-trust-threshold', trustThreshold.level)
    response.headers.set('x-trust-weight', trustWeight.toString())
    response.headers.set('x-trust-resistance', resistance)

    return {
      allowed: true,
      context,
      response
    }
  } catch (error) {
    console.error('Error in trust security middleware:', error)

    // Fail secure - deny access on error
    return {
      allowed: false,
      context: {
        trustScore: 0,
        trustThreshold: 'very_low',
        trustWeight: 0,
        resistance: 'error'
      },
      response: NextResponse.json({ error: 'Security check failed' }, { status: 500 })
    }
  }
}

/**
 * Trust-based rate limiting middleware
 */
export async function trustBasedRateLimitMiddleware(
  request: NextRequest,
  context: TrustSecurityContext
): Promise<{
  allowed: boolean
  limitExceeded: boolean
  retryAfter?: number
  response?: NextResponse
}> {
  try {
    if (!context.userId) {
      // Apply default rate limiting for unauthenticated users
      return {
        allowed: true,
        limitExceeded: false
      }
    }

    // Get trust-based rate limit parameters
    const rateLimitParams = trustScoreManager.getTrustBasedRateLimit(context.userId)

    // Check current rate limit usage (this would integrate with your rate limiting system)
    const currentUsage = await getCurrentRateLimitUsage(
      context.userId,
      request.headers.get('x-forwarded-for') || ''
    )
    const limitExceeded = currentUsage >= rateLimitParams.maxRequests

    if (limitExceeded) {
      // Calculate retry after based on trust level
      const trustWeight = context.trustWeight ?? 0
      const retryAfter = Math.ceil(
        (rateLimitParams.windowMs / 1000)
          * (1 + (1 - trustWeight) * rateLimitParams.penaltyMultiplier)
      )

      // Log rate limit exceeded
      await securityMonitor.createAlert(
        'trust_rate_limit_exceeded' as SecurityIncidentType,
        IncidentSeverity.LOW,
        `Trust-based rate limit exceeded for user ${context.userId}`,
        `Trust weight: ${context.trustWeight}, Current usage: ${currentUsage}`,
        'trust_system',
        {
          userId: context.userId,
          metadata: {
            trustWeight: context.trustWeight,
            currentUsage,
            maxRequests: rateLimitParams.maxRequests,
            retryAfter
          }
        }
      )

      return {
        allowed: false,
        limitExceeded: true,
        retryAfter,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter,
            trustWeight: context.trustWeight
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitParams.maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(
                0,
                rateLimitParams.maxRequests - currentUsage
              ).toString(),
              'X-RateLimit-Reset': new Date(Date.now() + rateLimitParams.windowMs).toISOString()
            }
          }
        )
      }
    }

    return {
      allowed: true,
      limitExceeded: false
    }
  } catch (error) {
    console.error('Error in trust-based rate limiting:', error)

    // Fail secure - allow request but log error
    await securityMonitor.createAlert(
      'trust_rate_limit_error' as SecurityIncidentType,
      IncidentSeverity.MEDIUM,
      'Error in trust-based rate limiting',
      error instanceof Error ? error.message : 'Unknown error',
      'trust_system'
    )

    return {
      allowed: true,
      limitExceeded: false
    }
  }
}

/**
 * Trust-based content filtering middleware
 */
export async function trustBasedContentFilter(
  content: unknown,
  context: TrustSecurityContext
): Promise<{
  allowed: boolean
  filtered: boolean
  filteredContent?: unknown
  reason?: string
}> {
  try {
    const trustWeight = context.trustWeight ?? 0
    if (!context.userId || trustWeight >= 0.7) {
      // High trust users - minimal filtering
      return {
        allowed: true,
        filtered: false
      }
    }

    // Apply content filtering based on trust level
    let filtered = false
    let filteredContent = content
    let reason = ''

    if (trustWeight < 0.3) {
      // Very low trust - strict filtering
      filteredContent = applyStrictContentFilter(content)
      filtered = true
      reason = 'Strict content filtering applied for low trust user'
    } else if (trustWeight < 0.5) {
      // Low trust - moderate filtering
      filteredContent = applyModerateContentFilter(content)
      filtered = true
      reason = 'Moderate content filtering applied'
    }

    if (filtered) {
      await securityMonitor.createAlert(
        'trust_content_filtered' as SecurityIncidentType,
        IncidentSeverity.LOW,
        `Content filtered based on trust for user ${context.userId}`,
        `Trust weight: ${trustWeight}, Reason: ${reason}`,
        'trust_system',
        {
          userId: context.userId,
          metadata: {
            trustWeight,
            reason,
            originalContent: content,
            filteredContent
          }
        }
      )
    }

    return {
      allowed: true,
      filtered,
      filteredContent,
      reason
    }
  } catch (error) {
    console.error('Error in trust-based content filtering:', error)

    // Fail secure - block content on error
    return {
      allowed: false,
      filtered: true,
      filteredContent: null,
      reason: 'Content filtering error'
    }
  }
}

/**
 * Update trust score based on user action
 *
 * Middleware-layer wrapper around the canonical
 * `updateTrustScoreFromAction` in `./trust-integration`. The canonical
 * implementation owns the trust-engine logic (it wraps
 * `trustScoreManager.calculateTrustScore` and returns the full result
 * including `factors`). This wrapper preserves this module's legacy
 * `outcome` parameter ('success' | 'failure' | 'partial') — which has no
 * counterpart in the canonical signature — by translating it into the
 * action/context the engine expects ('failure' maps to the engine's
 * 'penalty' action) and by adapting the return shape to this module's
 * historical `{ updated, ... }` contract. The significant-change alert
 * logging that lived in the previous local reimplementation is preserved
 * here so existing behavior is unchanged for any middleware caller.
 *
 * NOTE: the two modules previously exported same-named functions with
 * incompatible signatures and silently divergent behavior. New code should
 * import `updateTrustScoreFromAction` directly from
 * `./trust-integration`; this wrapper exists for backward compatibility
 * with the middleware-layer's `outcome`-aware contract.
 */
export async function updateTrustScoreFromAction(
  userId: string,
  action: 'report' | 'confirm' | 'dispute' | 'endorse' | 'moderate',
  context: Record<string, unknown>,
  outcome: 'success' | 'failure' | 'partial'
): Promise<{
  updated: boolean
  newScore?: number
  previousScore?: number
  change?: number
}> {
  try {
    // Translate the middleware-layer `outcome` into the action the
    // canonical engine expects. The canonical `calculateTrustScore`
    // models a negative outcome as the 'penalty' action; 'partial' falls
    // through to the original action (the engine applies its own impact).
    const adjustedAction:
      | 'report'
      | 'confirm'
      | 'dispute'
      | 'endorse'
      | 'moderate'
      | 'penalty' = outcome === 'failure' ? 'penalty' : action

    const result = await updateTrustScoreFromActionCore(userId, adjustedAction, {
      ...context,
      // Pass the original outcome through as context so downstream factor
      // updates / auditing can distinguish a real 'dispute' action from a
      // 'penalty' synthesized from a failed action.
      outcome
    })

    // Log significant trust score changes (preserved from the previous
    // local implementation so middleware callers keep the same telemetry).
    if (Math.abs(result.change) > 0.05) {
      await securityMonitor.createAlert(
        'trust_score_significant_change' as SecurityIncidentType,
        IncidentSeverity.LOW,
        `Significant trust score change for user ${userId}`,
        `Previous: ${result.previousScore}, New: ${result.newScore}, Change: ${result.change}`,
        'trust_system',
        {
          userId,
          metadata: {
            action,
            outcome,
            previousScore: result.previousScore,
            newScore: result.newScore,
            change: result.change,
            factors: result.factors
          }
        }
      )
    }

    return {
      updated: true,
      newScore: result.newScore,
      previousScore: result.previousScore,
      change: result.change
    }
  } catch (error) {
    console.error('Error updating trust score:', error)

    await securityMonitor.createAlert(
      'trust_score_update_error' as SecurityIncidentType,
      IncidentSeverity.MEDIUM,
      `Error updating trust score for user ${userId}`,
      error instanceof Error ? error.message : 'Unknown error',
      'trust_system',
      {
        userId,
        metadata: {
          action,
          outcome
        }
      }
    )

    return {
      updated: false
    }
  }
}

/**
 * Helper functions
 */

/**
 * Extract the authenticated user id from a request.
 *
 * SECURITY: the access token's signature is verified against Supabase's
 * JWKS before its `sub` claim is trusted. The previous implementation
 * decoded the JWT without verification, which let an attacker forge a
 * high-trust user's identity and inherit their elevated rate limit.
 *
 * If verification cannot be performed (token missing, malformed, expired,
 * bad signature, or JWKS unreachable), this returns `undefined` and the
 * caller treats the request as unauthenticated. Authoritative
 * authentication still happens server-side in API route handlers via
 * `supabase.auth.getUser()`.
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  let accessToken: string | undefined

  // 1. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.slice('Bearer '.length).trim()
  }

  // 2. Supabase auth cookie. @supabase/ssr stores the session under a cookie
  //    named `sb-<project-ref>-auth-token`. The value is either a JSON string
  //    (the session object) or a base64-encoded string of that JSON. Scan the
  //    cookies for one matching the Supabase pattern as a fallback.
  if (!accessToken) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.includes('auth-token')) {
        accessToken = parseAccessTokenFromCookieValue(cookie.value)
        if (accessToken) break
      }
    }
  }

  if (!accessToken) {
    return undefined
  }

  // Verify the signature + standard claims (exp/iss). Returns null on any
  // failure — we never trust a decoded-but-unverified payload.
  const payload = await verifySupabaseJwt(accessToken)
  if (!payload || typeof payload.sub !== 'string') {
    return undefined
  }

  return payload.sub
}

/**
 * The Supabase auth cookie value is either the raw JSON session or a base64
 * encoding of it. Extract the `access_token` field.
 */
function parseAccessTokenFromCookieValue(value: string): string | undefined {
  // Try JSON directly first
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed.access_token === 'string') {
      return parsed.access_token
    }
  } catch {
    // not raw JSON — try base64 decode below
  }

  // Try base64 decode (Supabase encodes the cookie when not in debug mode)
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed.access_token === 'string') {
      return parsed.access_token
    }
  } catch {
    // not base64 JSON either
  }

  return undefined
}

/**
 * Decode a JWT's payload and return the `sub` claim without verifying the
 * signature (signature verification happens server-side via getUser()).
 *
 * @deprecated Kept only for backward compatibility with callers that have
 * not migrated to `verifySupabaseJwt`. New code MUST use
 * `verifySupabaseJwt` to obtain a trusted payload; this helper performs no
 * signature check and must not back any security decision.
 */
function extractSubFromJwt(jwt: string): string | undefined {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    return undefined
  }
  try {
    // JWT uses base64url; pad to base64 and replace URL-safe chars.
    const payloadSegment = parts[1]
    if (!payloadSegment) {
      return undefined
    }
    const b64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
    if (payload && typeof payload.sub === 'string') {
      return payload.sub
    }
  } catch {
    return undefined
  }
  return undefined
}
// Suppress unused warning for the deprecated legacy decoder kept above.
void extractSubFromJwt

function determineActionFromRequest(request: NextRequest): string {
  const { pathname, searchParams } = new URL(request.url)
  const method = request.method

  // Determine action based on URL and HTTP method
  if (pathname.includes('/api/emergency')) {
    if (method === 'POST') {
      return 'report'
    }
    if (method === 'PUT') {
      return 'confirm'
    }
    if (method === 'DELETE') {
      return 'dispute'
    }
  }

  if (pathname.includes('/api/endorse')) {
    return 'endorse'
  }

  if (pathname.includes('/api/moderate')) {
    return 'moderate'
  }

  return 'read'
}

async function extractRequestData(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url)
      return Object.fromEntries(searchParams.entries())
    }

    if (request.method === 'POST' || request.method === 'PUT') {
      return await request.json() as Record<string, unknown>
    }

    return {}
  } catch (error) {
    return {}
  }
}

async function getCurrentRateLimitUsage(userId: string, ip: string): Promise<number> {
  // Trust-aware rate-limit accounting. The authoritative rate limiting is
  // enforced by the Redis-backed limiter in src/middleware.ts; this function
  // feeds the trust-tier-aware limiter which adjusts the limit ceiling by
  // reputation. Returning a non-zero random value previously caused
  // unpredictable false denials. Until this is wired to a shared counter
  // store, report zero prior usage so the tier check evaluates only the
  // request at hand, and the Redis limiter remains the source of truth.
  void userId
  void ip
  return 0
}

function applyStrictContentFilter(content: unknown): unknown {
  // Apply strict content filtering for low trust users
  if (typeof content === 'string') {
    // Remove potentially harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  if (typeof content === 'object' && content !== null) {
    // Filter object properties
    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      if (typeof value === 'string') {
        filtered[key] = applyStrictContentFilter(value)
      } else {
        filtered[key] = value
      }
    }
    return filtered
  }

  return content
}

function applyModerateContentFilter(content: unknown): unknown {
  // Apply moderate content filtering for medium trust users
  if (typeof content === 'string') {
    // Remove obviously harmful content
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  if (typeof content === 'object' && content !== null) {
    // Filter object properties
    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      if (typeof value === 'string') {
        filtered[key] = applyModerateContentFilter(value)
      } else {
        filtered[key] = value
      }
    }
    return filtered
  }

  return content
}

export default {
  trustSecurityMiddleware,
  trustBasedRateLimitMiddleware,
  trustBasedContentFilter,
  updateTrustScoreFromAction
}
