/**
 * Channel Sharding for Supabase Realtime
 *
 * This module implements sharding for presence and broadcast channels to prevent
 * channel exhaustion when scaling to 500K+ users.
 *
 * Sharding Strategy:
 * - Instead of 1 channel per user (500K channels), we use N shards (default 5000)
 * - Each shard handles ~100 users (500K / 5000)
 * - Users are assigned to shards using consistent hashing for even distribution
 * - Within each shard, users track/filter presence events by userId
 *
 * Benefits:
 * - Reduces channel count from 500K to 5K (100x reduction)
 * - Maintains presence tracking functionality
 * - Enables horizontal scaling of realtime infrastructure
 * - Consistent hashing ensures even distribution
 */

/**
 * Configuration for channel sharding
 */

const SHARD_CONFIG = {
  /** Default number of presence shards - supports ~100 users per shard for 500K users */
  DEFAULT_PRESENCE_SHARDS: 5000,

  /** Default number of emergency broadcast shards */
  DEFAULT_EMERGENCY_SHARDS: 1000,

  /** Environment variable override for presence shards */
  ENV_PRESENCE_SHARDS: 'REALTIME_PRESENCE_SHARDS',

  /** Environment variable override for emergency shards */
  ENV_EMERGENCY_SHARDS: 'REALTIME_EMERGENCY_SHARDS'
} as const

/**
 * FNV-1a hash function for consistent shard assignment
 * This algorithm provides good distribution and is fast
 *
 * @param str - String to hash
 * @returns 32-bit hash value
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261 // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash ^= str.charCodeAt(i)
    // eslint-disable-next-line no-bitwise
    hash = (hash * 16777619) >>> 0 // FNV prime, keep as 32-bit
  }
  return hash
}

/**
 * Get the configured number of presence shards
 * Can be overridden via environment variable for testing/tuning
 *
 * @returns Number of presence shards
 */
export function getPresenceShardCount(): number {
  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env[SHARD_CONFIG.ENV_PRESENCE_SHARDS]
    if (envValue) {
      const parsed = parseInt(envValue, 10)
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return SHARD_CONFIG.DEFAULT_PRESENCE_SHARDS
}

/**
 * Get the configured number of emergency broadcast shards
 * Can be overridden via environment variable for testing/tuning
 *
 * @returns Number of emergency shards
 */
export function getEmergencyShardCount(): number {
  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env[SHARD_CONFIG.ENV_EMERGENCY_SHARDS]
    if (envValue) {
      const parsed = parseInt(envValue, 10)
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return SHARD_CONFIG.DEFAULT_EMERGENCY_SHARDS
}

/**
 * Generic shard calculation using consistent hashing
 *
 * @param key - The key to shard (e.g., userId, eventId)
 * @param shardCount - Total number of shards
 * @returns Shard index (0 to shardCount-1)
 */
function calculateShard(key: string, shardCount: number): number {
  const hash = fnv1aHash(key)
  return hash % shardCount
}

/**
 * Get the presence channel name for a given user
 * Uses consistent hashing to assign user to a shard
 *
 * @param userId - The user's unique identifier
 * @returns Channel name like 'presence-shard-42'
 *
 * @example
 * getPresenceShard('user-abc123') // 'presence-shard-42'
 * getPresenceShard('user-xyz789') // 'presence-shard-1337'
 */
export function getPresenceShard(userId: string): string {
  const shardCount = getPresenceShardCount()
  const shardIndex = calculateShard(userId, shardCount)
  return `presence-shard-${shardIndex}`
}

/**
 * Get the emergency broadcast channel name for a given event
 * Uses consistent hashing to assign event to a shard
 *
 * @param eventId - The emergency event's unique identifier
 * @returns Channel name like 'emergency-shard-42'
 *
 * @example
 * getEmergencyBroadcastShard('event-abc123') // 'emergency-shard-42'
 */
export function getEmergencyBroadcastShard(eventId: string): string {
  const shardCount = getEmergencyShardCount()
  const shardIndex = calculateShard(eventId, shardCount)
  return `emergency-shard-${shardIndex}`
}

/**
 * Get shard info for debugging/monitoring
 * Useful for understanding distribution of users across shards
 *
 * @param userId - The user's unique identifier
 * @returns Object with shard details
 */
export function getPresenceShardInfo(userId: string): {
  channelName: string
  shardIndex: number
  totalShards: number
  estimatedUsersPerShard: number
} {
  const shardCount = getPresenceShardCount()
  const shardIndex = calculateShard(userId, shardCount)
  return {
    channelName: `presence-shard-${shardIndex}`,
    shardIndex,
    totalShards: shardCount,
    estimatedUsersPerShard: Math.ceil(500000 / shardCount) // Based on 500K users
  }
}

/**
 * Type for presence state within a shard
 * Each user in the shard tracks their own presence state
 */
export interface ShardedPresenceState {
  user_id: string
  location?: { lat: number; lng: number }
  online_at: string
  status: 'active' | 'idle' | 'away'
}

/**
 * Filter presence events to only include specific user
 * Use this when processing presence events from a shared shard
 *
 * @param presenceState - The presence state object from the shard
 * @param targetUserId - The user ID to filter for
 * @returns True if the presence event belongs to the target user
 */
export function isPresenceForUser(
  presenceState: ShardedPresenceState,
  targetUserId: string
): boolean {
  return presenceState.user_id === targetUserId
}

/**
 * Filter presence events to exclude specific user
 * Use this to see other users in the same shard
 *
 * @param presenceState - The presence state object from the shard
 * @param excludeUserId - The user ID to exclude
 * @returns True if the presence event is NOT from the excluded user
 */
export function isPresenceFromOtherUser(
  presenceState: ShardedPresenceState,
  excludeUserId: string
): boolean {
  return presenceState.user_id !== excludeUserId
}

/**
 * Extract all user IDs from a shard's presence state
 * Useful for seeing who else is online in your shard
 *
 * @param presenceState - The presence state from the shard (can be object or array)
 * @returns Array of user IDs present in the shard
 */
export function getUserIdsInShard(
  presenceState: Record<string, ShardedPresenceState> | ShardedPresenceState[]
): string[] {
  if (Array.isArray(presenceState)) {
    return presenceState.map(state => state.user_id)
  }
  return Object.values(presenceState).map(state => state.user_id)
}

/**
 * Get the legacy (unsharded) channel name for backward compatibility
 * Only use this for migration purposes or when sharding is disabled
 *
 * @param userId - The user's unique identifier
 * @returns Legacy channel name 'presence-{userId}'
 * @deprecated Use getPresenceShard instead
 */
export function getLegacyPresenceChannel(userId: string): string {
  return `presence-${userId}`
}

/**
 * Check if sharding is enabled
 * Can be disabled via environment variable for testing/rollback
 *
 * @returns True if sharding is enabled
 */
export function isShardingEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    const disabled = process.env.DISABLE_PRESENCE_SHARDING
    return disabled !== 'true' && disabled !== '1'
  }
  return true
}

/**
 * Get presence channel name with automatic sharding/legacy selection
 * This is the recommended entry point for getting presence channels
 *
 * @param userId - The user's unique identifier
 * @returns Channel name (sharded or legacy based on configuration)
 */
export function getPresenceChannel(userId: string): string {
  if (!isShardingEnabled()) {
    return getLegacyPresenceChannel(userId)
  }
  return getPresenceShard(userId)
}

/**
 * Re-export shard count getter for convenience
 */
export function getShardCount(): number {
  return getPresenceShardCount()
}
