import { Ratelimit } from '@upstash/ratelimit'
import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { getRedisClient, checkRedisAvailability, type Redis } from './client'

export type RateLimitTier = 'emergency' | 'auth' | 'api' | 'upload'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  penaltyMultiplier?: number
  emergencyOverride?: boolean
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
    emergencyOverride: true
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    penaltyMultiplier: 3.0,
    emergencyOverride: false
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

    if (emergencyMode && config.emergencyOverride) {
      effectiveMaxRequests = Math.floor(effectiveMaxRequests * 0.3)
    }

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
  const ip = getClientIP(req)
  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const userId = req.headers.get('x-user-id') ?? 'anonymous'

  const keyData = `${tier}:${ip}:${userId}:${userAgent}`
  return createHash('sha256').update(keyData).digest('hex').substring(0, 16)
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
