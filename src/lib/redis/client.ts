import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null
let connectionChecked = false
let isAvailable = false

export interface RedisClientConfig {
  url?: string
  token?: string
}

export function createRedisClient(config?: RedisClientConfig): Redis | null {
  const restUrl = config?.url ?? process.env.UPSTASH_REDIS_REST_URL
  const restToken = config?.token ?? process.env.UPSTASH_REDIS_REST_TOKEN

  if (!restUrl || !restToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Upstash Redis credentials not configured')
    }
    return null
  }

  try {
    return new Redis({
      url: restUrl,
      token: restToken
    })
  } catch (error) {
    console.error('Failed to create Redis client:', error)
    return null
  }
}

export function getRedisClient(): Redis | null {
  if (redisClient !== null) {
    return redisClient
  }

  redisClient = createRedisClient()
  return redisClient
}

export async function checkRedisAvailability(): Promise<boolean> {
  if (connectionChecked) {
    return isAvailable
  }

  const client = getRedisClient()
  if (!client) {
    connectionChecked = true
    isAvailable = false
    return false
  }

  try {
    await client.ping()
    connectionChecked = true
    isAvailable = true
    return true
  } catch (error) {
    console.warn('Redis connection failed:', error)
    connectionChecked = true
    isAvailable = false
    return false
  }
}

export function resetRedisConnection(): void {
  redisClient = null
  connectionChecked = false
  isAvailable = false
}

export function isRedisAvailable(): boolean {
  return isAvailable
}

export type { Redis }
