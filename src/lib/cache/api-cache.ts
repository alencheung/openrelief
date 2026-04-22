/**
 * API Response Caching Utilities
 *
 * Redis-based caching with stale-while-revalidate pattern support.
 * Falls back gracefully when Redis is unavailable.
 */

import { createHash } from 'crypto'

interface CacheConfig {
  ttl: number
  staleWhileRevalidate?: number
  private?: boolean
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag: string
}

type RedisClient = {
  get: (key: string) => Promise<string | null>
  setex: (key: string, ttl: number, value: string) => Promise<void>
  del: (key: string) => Promise<void>
  keys: (pattern: string) => Promise<string[]>
}

let redisClient: RedisClient | null = null
let redisInitPromise: Promise<RedisClient | null> | null = null

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient) {
    return redisClient
  }
  if (redisInitPromise) {
    return redisInitPromise
  }

  redisInitPromise = (async () => {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

    if (!redisUrl) {
      console.warn('Redis not configured. API caching disabled.')
      return null
    }

    try {
      if (redisUrl.includes('upstash')) {
        const upstashUrl = process.env.UPSTASH_REDIS_REST_URL!
        const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

        if (!upstashToken) {
          console.warn('Upstash Redis token not configured.')
          return null
        }

        redisClient = {
          async get(key: string): Promise<string | null> {
            const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
              headers: { Authorization: `Bearer ${upstashToken}` }
            })
            const data = await res.json()
            return data.result || null
          },
          async setex(key: string, ttl: number, value: string): Promise<void> {
            await fetch(`${upstashUrl}/setex/${encodeURIComponent(key)}/${ttl}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${upstashToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([value])
            })
          },
          async del(key: string): Promise<void> {
            await fetch(`${upstashUrl}/del/${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${upstashToken}` }
            })
          },
          async keys(pattern: string): Promise<string[]> {
            const res = await fetch(`${upstashUrl}/keys/${encodeURIComponent(pattern)}`, {
              headers: { Authorization: `Bearer ${upstashToken}` }
            })
            const data = await res.json()
            return data.result || []
          }
        }
      } else {
        try {
          const IORedis = await import(/* webpackIgnore: true */ 'ioredis').then(
            m => m.default || m
          )
          const redis = new IORedis(redisUrl)
          redisClient = {
            get: key => redis.get(key),
            setex: (key, ttl, value) => redis.setex(key, ttl, value),
            del: key => redis.del(key),
            keys: pattern => redis.keys(pattern)
          }
        } catch {
          console.warn('ioredis not installed, using Upstash-only caching')
          return null
        }
      }

      return redisClient
    } catch (error) {
      console.warn('Failed to initialize Redis client:', error)
      return null
    }
  })()

  return redisInitPromise
}

export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('&')

  const hash = createHash('sha256').update(sortedParams).digest('hex').substring(0, 16)
  return `api:${prefix}:${hash}`
}

export function generateETag(data: unknown): string {
  const content = JSON.stringify(data)
  return createHash('md5').update(content).digest('hex')
}

export function getCacheHeaders(config: CacheConfig, etag: string): Record<string, string> {
  const { ttl, staleWhileRevalidate = 0, private: isPrivate = false } = config
  const visibility = isPrivate ? 'private' : 'public'
  const swrDirective =
    staleWhileRevalidate > 0 ? `, stale-while-revalidate=${staleWhileRevalidate}` : ''

  return {
    'Cache-Control': `${visibility}, s-maxage=${ttl}${swrDirective}`,
    'CDN-Cache-Control': `${visibility}, max-age=${ttl}`,
    ETag: etag
  }
}

export async function cacheResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<{ data: T; cached: boolean; etag: string }> {
  const redis = await getRedisClient()

  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached)
        const now = Date.now()
        const age = (now - entry.timestamp) / 1000
        const staleWhileRevalidate = config.staleWhileRevalidate || 0

        if (age < config.ttl + staleWhileRevalidate) {
          if (age > config.ttl && staleWhileRevalidate > 0) {
            revalidateInBackground(key, fetcher, config).catch(() => {})
          }
          return { data: entry.data, cached: true, etag: entry.etag }
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error)
    }
  }

  const data = await fetcher()
  const etag = generateETag(data)

  if (redis) {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        etag
      }
      await redis.setex(key, config.ttl + (config.staleWhileRevalidate || 0), JSON.stringify(entry))
    } catch (error) {
      console.warn('Cache write error:', error)
    }
  }

  return { data, cached: false, etag }
}

async function revalidateInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) {
    return
  }

  try {
    const data = await fetcher()
    const etag = generateETag(data)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag
    }
    await redis.setex(key, config.ttl + (config.staleWhileRevalidate || 0), JSON.stringify(entry))
  } catch (error) {
    console.warn('Background revalidation error:', error)
  }
}

export async function invalidateCache(pattern: string): Promise<number> {
  const redis = await getRedisClient()
  if (!redis) {
    return 0
  }

  try {
    const keys = await redis.keys(`api:${pattern}:*`)
    if (keys.length === 0) {
      return 0
    }

    for (const key of keys) {
      await redis.del(key)
    }

    return keys.length
  } catch (error) {
    console.warn('Cache invalidation error:', error)
    return 0
  }
}

export async function invalidateEmergencyCache(): Promise<number> {
  return invalidateCache('emergency')
}

export async function invalidateTrustCache(userId?: string): Promise<number> {
  if (userId) {
    const redis = await getRedisClient()
    if (!redis) {
      return 0
    }

    try {
      const keys = await redis.keys(`api:trust:*${userId}*`)
      for (const key of keys) {
        await redis.del(key)
      }
      return keys.length
    } catch (error) {
      console.warn('Trust cache invalidation error:', error)
      return 0
    }
  }
  return invalidateCache('trust')
}

export function checkETagMatch(requestETag: string | null, currentETag: string): boolean {
  if (!requestETag) {
    return false
  }
  return requestETag === currentETag || requestETag === `W/"${currentETag}"`
}

export const CACHE_CONFIGS = {
  emergency: {
    ttl: 60,
    staleWhileRevalidate: 30,
    private: false
  },
  trust: {
    ttl: 300,
    staleWhileRevalidate: 60,
    private: true
  },
  trustProfile: {
    ttl: 120,
    staleWhileRevalidate: 30,
    private: true
  }
} as const
