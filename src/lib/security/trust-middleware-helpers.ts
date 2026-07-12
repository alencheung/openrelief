/**
 * Trust-Based Security Middleware Helpers
 *
 * Types, configuration, and internal utility functions extracted from
 * trust-middleware.
 */

import { NextRequest } from 'next/server'
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
export const DEFAULT_CONFIG: TrustSecurityConfig = {
  enableTrustBasedRateLimiting: true,
  enableAttackResistance: true,
  emergencyMode: false,
  trustWeightMultiplier: 2.0,
  minTrustThreshold: 0.3
}

/**
 * Extract the authenticated user id from a request. The userId is resolved
 * only from a verified JWT; authentication still happens server-side in API
 * route handlers via `supabase.auth.getUser()`.
 */
export async function extractUserIdFromRequest(
  request: NextRequest
): Promise<string | undefined> {
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
export function parseAccessTokenFromCookieValue(value: string): string | undefined {
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
export function extractSubFromJwt(jwt: string): string | undefined {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    return undefined
  }
  try {
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

export function determineActionFromRequest(request: NextRequest): string {
  const { pathname } = new URL(request.url)
  const method = request.method

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

export async function extractRequestData(
  request: NextRequest
): Promise<Record<string, unknown>> {
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

export async function getCurrentRateLimitUsage(
  userId: string,
  ip: string
): Promise<number> {
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

export function applyStrictContentFilter(content: unknown): unknown {
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

export function applyModerateContentFilter(content: unknown): unknown {
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
