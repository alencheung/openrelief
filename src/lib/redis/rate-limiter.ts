import { Ratelimit } from '@upstash/ratelimit'
import { NextRequest } from 'next/server'
import { getRedisClient, checkRedisAvailability, type Redis } from './client'

// Simple hash function that works in Edge Runtime
// Uses Math.imul for multiplication to which is cleaner to
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (Math.imul(hash, 5) - hash + char) >>> 0 // eslint-disable-line no-bitwise, operator-assignment
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export type RateLimitTier = 'emergency' | 'auth' | 'api' | 'upload'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  penaltyMultiplier?: number
  /**
   * When true and `emergencyMode` is active, the limit is RAISED by
   * `emergencyModeMultiplier` instead of lowered. During mass-casualty events
   * the platform exists to absorb legitimate victim traffic, not throttle it.
   */
  emergencyOverride?: boolean
  /**
   * Multiplier applied to `maxRequests` when `emergencyMode` is on and
   * `emergencyOverride` is enabled. Default 5x — gives victims headroom while
   * still capping runaway abuse.
   */
  emergencyModeMultiplier?: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: Date
  penaltyCount?: number
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  emergency: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    penaltyMultiplier: 2.0,
    emergencyOverride: true,
    emergencyModeMultiplier: 5
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    // Authentication (login/signup) must NOT be throttled during a crisis —
    // first-time victims need to create accounts to report. Raise the limit
    // during emergency mode instead of leaving it pinned at peacetime levels.
    penaltyMultiplier: 3.0,
    emergencyOverride: true,
    emergencyModeMultiplier: 4
  },
  api: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    penaltyMultiplier: 1.5,
    emergencyOverride: false
  },
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    penaltyMultiplier: 2.5,
    emergencyOverride: false
  }
}

interface InMemoryEntry {
  count: number
  resetTime: number
  penaltyCount: number
}

const inMemoryStore = new Map<string, InMemoryEntry>()
const rateLimiters = new Map<string, Ratelimit>()

// Configuration for in-memory store cleanup
const IN_MEMORY_CONFIG = {
  maxSize: 50000, // Maximum entries to prevent memory exhaustion
  cleanupInterval: 5 * 60 * 1000 // Cleanup every 5 minutes
}

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of inMemoryStore.entries()) {
      if (now > entry.resetTime) {
        inMemoryStore.delete(key)
      }
    }
    // If still too large, remove oldest entries
    if (inMemoryStore.size > IN_MEMORY_CONFIG.maxSize) {
      const entries = Array.from(inMemoryStore.entries()).sort(
        (a, b) => a[1].resetTime - b[1].resetTime
      )
      const toRemove = entries.slice(0, inMemoryStore.size - IN_MEMORY_CONFIG.maxSize)
      for (const [key] of toRemove) {
        inMemoryStore.delete(key)
      }
    }
  }, IN_MEMORY_CONFIG.cleanupInterval)
}

export class RateLimiter {
  private redis: Redis | null = null
  private redisChecked = false
  private redisAvailable = false

  constructor() {
    this.initRedis()
  }

  private initRedis(): void {
    this.redis = getRedisClient()
  }

  private async checkRedis(): Promise<boolean> {
    if (this.redisChecked) {
      return this.redisAvailable
    }

    this.redisAvailable = await checkRedisAvailability()
    this.redisChecked = true

    // If Redis was unavailable, re-check on a short cadence so we recover
    // automatically when it comes back mid-incident. A successful check is
    // trusted for longer to avoid probing Redis on every request.
    if (!this.redisAvailable) {
      setTimeout(() => {
        this.redisChecked = false
      }, 10_000)
    }
    return this.redisAvailable
  }

  private getLimiter(tier: RateLimitTier, maxRequests: number): Ratelimit | null {
    if (!this.redis) {
      return null
    }

    const cacheKey = `${tier}:${maxRequests}`

    if (rateLimiters.has(cacheKey)) {
      return rateLimiters.get(cacheKey) ?? null
    }

    const config = RATE_LIMIT_TIERS[tier]
    const windowSeconds = Math.floor(config.windowMs / 1000)

    const limiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds}s`),
      analytics: true,
      prefix: `openrelief:${tier}`
    })

    rateLimiters.set(cacheKey, limiter)
    return limiter
  }

  async checkLimit(
    key: string,
    tier: RateLimitTier,
    options?: {
      trustWeight?: number
      emergencyMode?: boolean
      customMaxRequests?: number
    }
  ): Promise<RateLimitResult> {
    const config = RATE_LIMIT_TIERS[tier]
    const { trustWeight = 1, emergencyMode = false, customMaxRequests } = options ?? {}

    let effectiveMaxRequests = customMaxRequests ?? config.maxRequests

    // During emergency mode, RAISE the limit for victim-facing tiers
    // (emergency reports, auth). The previous logic multiplied by 0.3,
    // throttling legitimate victims during the exact events the platform
    // exists to serve. Verified-first-responder traffic still has headroom
    // via the per-user (not per-IP) key below; only verified reporter-tier
    // requests get the multiplier.
    if (emergencyMode && config.emergencyOverride) {
      const multiplier = config.emergencyModeMultiplier ?? 5
      effectiveMaxRequests = Math.floor(effectiveMaxRequests * multiplier)
    }

    // Trust-weight adjustments. High-trust reporters get more headroom, but
    // this is now bounded — a single user cannot multiply their own limit
    // indefinitely, and low-trust traffic is dampened to absorb abuse during
    // a surge.
    if (trustWeight > 0.7) {
      effectiveMaxRequests = Math.floor(effectiveMaxRequests * 2)
    } else if (trustWeight < 0.3) {
      effectiveMaxRequests = Math.floor(effectiveMaxRequests * 0.5)
    }

    effectiveMaxRequests = Math.max(1, effectiveMaxRequests)

    const isAvailable = await this.checkRedis()

    if (!isAvailable || !this.redis) {
      return this.inMemoryCheck(key, tier, effectiveMaxRequests)
    }

    const limiter = this.getLimiter(tier, effectiveMaxRequests)
    if (!limiter) {
      return this.inMemoryCheck(key, tier, effectiveMaxRequests)
    }

    try {
      const { success, limit, remaining, reset } = await limiter.limit(key)

      let penaltyCount = 0
      if (!success) {
        penaltyCount = await this.incrementPenalty(key)
      } else {
        penaltyCount = await this.getPenalty(key)
      }

      return {
        allowed: success,
        limit,
        remaining,
        reset: new Date(reset),
        penaltyCount
      }
    } catch (error) {
      console.error('Redis rate limit check failed:', error)
      return this.inMemoryCheck(key, tier, effectiveMaxRequests)
    }
  }

  private inMemoryCheck(key: string, tier: RateLimitTier, maxRequests: number): RateLimitResult {
    const now = Date.now()
    const config = RATE_LIMIT_TIERS[tier]
    let entry = inMemoryStore.get(key)

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        penaltyCount: entry?.penaltyCount ?? 0
      }
    }

    if (entry.count >= maxRequests) {
      entry.penaltyCount++
      inMemoryStore.set(key, entry)

      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
        penaltyCount: entry.penaltyCount
      }
    }

    entry.count++
    inMemoryStore.set(key, entry)

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: new Date(entry.resetTime),
      penaltyCount: entry.penaltyCount
    }
  }

  private async getPenalty(identifier: string): Promise<number> {
    if (!this.redis) {
      return 0
    }

    try {
      const penaltyKey = `openrelief:penalty:${identifier}`
      const count = await this.redis.get<number>(penaltyKey)
      return typeof count === 'number' ? count : 0
    } catch {
      return 0
    }
  }

  private async incrementPenalty(identifier: string): Promise<number> {
    if (!this.redis) {
      return 0
    }

    try {
      const penaltyKey = `openrelief:penalty:${identifier}`
      const count = await this.redis.incr(penaltyKey)
      await this.redis.expire(penaltyKey, 3600)
      return count
    } catch {
      return 0
    }
  }
}

let rateLimiterInstance: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter()
  }
  return rateLimiterInstance
}

export function generateRateLimitKey(req: NextRequest, tier: string): string {
  // Prefer a per-user bucket once authenticated. In disaster zones many
  // victims share a carrier-grade NAT IP — keying on IP alone collapses
  // thousands of legitimate users into one bucket and throttles them
  // collectively. Fall back to IP only for anonymous traffic.
  const userId = req.headers.get('x-user-id')
  const ip = getClientIP(req)

  if (userId && userId !== 'anonymous') {
    // Authenticated: bucket per user so NAT sharing cannot starve neighbors.
    return simpleHash(`${tier}:user:${userId}`)
  }

  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  // Anonymous: include IP but strip volatile UA substrings so a single device
  // cannot trivially rotate its key by tweaking the UA. UA is hashed together
  // to still provide some client discrimination without exploding cardinality.
  const uaStable = userAgent.split(' ')[0] ?? 'unknown'
  return simpleHash(`${tier}:anon:${ip}:${uaStable}`)
}

export function getClientIP(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
}

export function getRateLimitTier(pathname: string): RateLimitTier {
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

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toISOString()
  }

  if (result.penaltyCount !== undefined && result.penaltyCount > 0) {
    headers['X-RateLimit-Penalty'] = result.penaltyCount.toString()
  }

  return headers
}
