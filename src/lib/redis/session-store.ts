import { getRedisClient, checkRedisAvailability } from './client'
import type { Redis } from './client'
import type { AuthSession } from '@/lib/security/auth-security'

const SESSION_TTL = 24 * 60 * 60
const SESSION_PREFIX = 'openrelief:session:'
const SESSION_INDEX_PREFIX = 'openrelief:sessions:user:'

export class RedisSessionStore {
  private redis: Redis | null
  private fallbackStore: Map<string, AuthSession> = new Map()
  private isRedisAvailable: boolean = false

  constructor() {
    this.redis = getRedisClient()
    this.checkAvailability()
  }

  private async checkAvailability(): Promise<void> {
    this.isRedisAvailable = await checkRedisAvailability()
  }

  private serializeSession(session: AuthSession): Record<string, string> {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      deviceFingerprint: session.deviceFingerprint,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isActive: session.isActive.toString(),
      mfaVerified: session.mfaVerified.toString(),
      trustLevel: session.trustLevel,
      securityFlags: JSON.stringify(session.securityFlags)
    }
  }

  private deserializeSession(data: Record<string, string>): AuthSession {
    return {
      sessionId: data.sessionId ?? '',
      userId: data.userId ?? '',
      deviceFingerprint: data.deviceFingerprint ?? '',
      ipAddress: data.ipAddress ?? '',
      userAgent: data.userAgent ?? '',
      createdAt: new Date(data.createdAt ?? Date.now()),
      lastActivity: new Date(data.lastActivity ?? Date.now()),
      expiresAt: new Date(data.expiresAt ?? Date.now()),
      isActive: data.isActive === 'true',
      mfaVerified: data.mfaVerified === 'true',
      trustLevel: (data.trustLevel as 'low' | 'medium' | 'high') ?? 'low',
      securityFlags: JSON.parse(data.securityFlags || '[]')
    }
  }

  async setSession(token: string, session: AuthSession): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      this.fallbackStore.set(token, session)
      return
    }

    try {
      const key = `${SESSION_PREFIX}${token}`
      const userIndexKey = `${SESSION_INDEX_PREFIX}${session.userId}`
      const serialized = this.serializeSession(session)

      await this.redis.hset(key, serialized)
      await this.redis.expire(key, SESSION_TTL)
      await this.redis.sadd(userIndexKey, token)
      await this.redis.expire(userIndexKey, SESSION_TTL)
    } catch (error) {
      console.error('Redis setSession error, falling back to memory:', error)
      this.fallbackStore.set(token, session)
    }
  }

  async getSession(token: string): Promise<AuthSession | null> {
    if (!this.isRedisAvailable || !this.redis) {
      return this.fallbackStore.get(token) ?? null
    }

    try {
      const key = `${SESSION_PREFIX}${token}`
      const data = await this.redis.hgetall<Record<string, string>>(key)

      if (!data || Object.keys(data).length === 0) {
        return null
      }

      return this.deserializeSession(data)
    } catch (error) {
      console.error('Redis getSession error, falling back to memory:', error)
      return this.fallbackStore.get(token) ?? null
    }
  }

  async deleteSession(token: string): Promise<void> {
    this.fallbackStore.delete(token)

    if (!this.isRedisAvailable || !this.redis) {
      return
    }

    try {
      const session = await this.getSession(token)
      const key = `${SESSION_PREFIX}${token}`

      if (session) {
        const userIndexKey = `${SESSION_INDEX_PREFIX}${session.userId}`
        await this.redis.srem(userIndexKey, token)
      }

      await this.redis.del(key)
    } catch (error) {
      console.error('Redis deleteSession error:', error)
    }
  }

  async updateLastActivity(token: string): Promise<void> {
    const session = await this.getSession(token)
    if (!session) {
      return
    }

    session.lastActivity = new Date()
    await this.setSession(token, session)
  }

  async getSessionsByUserId(userId: string): Promise<AuthSession[]> {
    if (!this.isRedisAvailable || !this.redis) {
      const sessions: AuthSession[] = []
      const values = Array.from(this.fallbackStore.values())
      for (const session of values) {
        if (session.userId === userId) {
          sessions.push(session)
        }
      }
      return sessions
    }

    try {
      const userIndexKey = `${SESSION_INDEX_PREFIX}${userId}`
      const tokens = await this.redis.smembers<string[]>(userIndexKey)

      if (!tokens || tokens.length === 0) {
        return []
      }

      const sessions: AuthSession[] = []
      for (const token of tokens) {
        const session = await this.getSession(token)
        if (session && session.isActive) {
          sessions.push(session)
        }
      }

      return sessions
    } catch (error) {
      console.error('Redis getSessionsByUserId error:', error)
      return []
    }
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    const sessions = await this.getSessionsByUserId(userId)
    for (const session of sessions) {
      await this.deleteSession(session.sessionId)
    }
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    const sessions = await this.getSessionsByUserId(userId)
    return sessions.filter(s => s.isActive).length
  }

  async invalidateExpiredSessions(): Promise<number> {
    let invalidated = 0
    const now = new Date()

    if (!this.isRedisAvailable || !this.redis) {
      const entries = Array.from(this.fallbackStore.entries())
      for (const [token, session] of entries) {
        if (now > session.expiresAt) {
          this.fallbackStore.delete(token)
          invalidated++
        }
      }
      return invalidated
    }

    try {
      const keys = await this.redis.keys(`${SESSION_PREFIX}*`)

      for (const key of keys) {
        const data = await this.redis.hgetall<Record<string, string>>(key)
        if (data && data.expiresAt) {
          const expiresAt = new Date(data.expiresAt)
          if (now > expiresAt) {
            await this.deleteSession(data.sessionId)
            invalidated++
          }
        }
      }
    } catch (error) {
      console.error('Redis invalidateExpiredSessions error:', error)
    }

    return invalidated
  }
}

export const redisSessionStore = new RedisSessionStore()
