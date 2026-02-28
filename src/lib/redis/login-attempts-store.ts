import { getRedisClient, checkRedisAvailability } from './client'
import type { Redis } from './client'
import type { LoginAttempt } from '@/lib/security/auth-security'

const LOGIN_ATTEMPTS_TTL = 60 * 60
const LOGIN_ATTEMPTS_PREFIX = 'openrelief:login_attempts:'

export class RedisLoginAttemptsStore {
  private redis: Redis | null
  private fallbackStore: Map<string, LoginAttempt[]> = new Map()
  private isRedisAvailable: boolean = false

  constructor() {
    this.redis = getRedisClient()
    this.checkAvailability()
  }

  private async checkAvailability(): Promise<void> {
    this.isRedisAvailable = await checkRedisAvailability()
  }

  private serializeAttempt(attempt: LoginAttempt): Record<string, string> {
    return {
      attemptId: attempt.attemptId,
      userId: attempt.userId ?? '',
      email: attempt.email,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      timestamp: attempt.timestamp.toISOString(),
      success: attempt.success.toString(),
      failureReason: attempt.failureReason ?? '',
      mfaRequired: attempt.mfaRequired.toString(),
      mfaSuccess: (attempt.mfaSuccess ?? false).toString(),
      geolocation: JSON.stringify(attempt.geolocation ?? null)
    }
  }

  private deserializeAttempt(data: Record<string, string>): LoginAttempt {
    const geolocation = JSON.parse(data.geolocation || 'null')
    const result: LoginAttempt = {
      attemptId: data.attemptId ?? '',
      email: data.email ?? '',
      ipAddress: data.ipAddress ?? '',
      userAgent: data.userAgent ?? '',
      timestamp: new Date(data.timestamp ?? Date.now()),
      success: data.success === 'true',
      mfaRequired: data.mfaRequired === 'true'
    }

    if (data.userId) {
      result.userId = data.userId
    }
    if (data.failureReason) {
      result.failureReason = data.failureReason
    }
    if (data.mfaSuccess === 'true') {
      result.mfaSuccess = true
    }
    if (geolocation) {
      result.geolocation = geolocation
    }

    return result
  }

  async recordAttempt(identifier: string, attempt: LoginAttempt): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      const attempts = this.fallbackStore.get(identifier) ?? []
      attempts.push(attempt)
      this.fallbackStore.set(identifier, attempts)
      return
    }

    try {
      const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`
      const serialized = this.serializeAttempt(attempt)
      const attemptId = attempt.attemptId

      await this.redis.hset(`${key}:${attemptId}`, serialized)
      await this.redis.expire(`${key}:${attemptId}`, LOGIN_ATTEMPTS_TTL)
      await this.redis.sadd(key, attemptId)
      await this.redis.expire(key, LOGIN_ATTEMPTS_TTL)
    } catch (error) {
      console.error('Redis recordAttempt error, falling back to memory:', error)
      const attempts = this.fallbackStore.get(identifier) ?? []
      attempts.push(attempt)
      this.fallbackStore.set(identifier, attempts)
    }
  }

  async getAttempts(identifier: string): Promise<LoginAttempt[]> {
    if (!this.isRedisAvailable || !this.redis) {
      return this.fallbackStore.get(identifier) ?? []
    }

    try {
      const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`
      const attemptIds = await this.redis.smembers<string[]>(key)

      if (!attemptIds || attemptIds.length === 0) {
        return []
      }

      const attempts: LoginAttempt[] = []
      for (const attemptId of attemptIds) {
        const data = await this.redis.hgetall<Record<string, string>>(`${key}:${attemptId}`)
        if (data && Object.keys(data).length > 0) {
          attempts.push(this.deserializeAttempt(data))
        }
      }

      return attempts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    } catch (error) {
      console.error('Redis getAttempts error, falling back to memory:', error)
      return this.fallbackStore.get(identifier) ?? []
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    this.fallbackStore.delete(identifier)

    if (!this.isRedisAvailable || !this.redis) {
      return
    }

    try {
      const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`
      const attemptIds = await this.redis.smembers<string[]>(key)

      for (const attemptId of attemptIds) {
        await this.redis.del(`${key}:${attemptId}`)
      }

      await this.redis.del(key)
    } catch (error) {
      console.error('Redis clearAttempts error:', error)
    }
  }

  async getFailedAttemptsCount(identifier: string, withinMs: number): Promise<number> {
    const attempts = await this.getAttempts(identifier)
    const cutoff = Date.now() - withinMs
    return attempts.filter(a => !a.success && a.timestamp.getTime() > cutoff).length
  }

  async cleanupOldAttempts(identifier: string, maxAge: number): Promise<number> {
    const attempts = await this.getAttempts(identifier)
    const cutoff = Date.now() - maxAge
    const recentAttempts = attempts.filter(a => a.timestamp.getTime() > cutoff)

    if (!this.isRedisAvailable || !this.redis) {
      this.fallbackStore.set(identifier, recentAttempts)
      return attempts.length - recentAttempts.length
    }

    try {
      const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`
      const attemptIds = await this.redis.smembers<string[]>(key)

      let removed = 0
      for (const attemptId of attemptIds) {
        const data = await this.redis.hgetall<Record<string, string>>(`${key}:${attemptId}`)
        if (data && data.timestamp) {
          const timestamp = new Date(data.timestamp).getTime()
          if (timestamp <= cutoff) {
            await this.redis.del(`${key}:${attemptId}`)
            await this.redis.srem(key, attemptId)
            removed++
          }
        }
      }

      return removed
    } catch (error) {
      console.error('Redis cleanupOldAttempts error:', error)
      return 0
    }
  }
}

export const redisLoginAttemptsStore = new RedisLoginAttemptsStore()
