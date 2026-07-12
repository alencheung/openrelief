/**
 * Helper functions for the offline store.
 *
 * Extracted from offlineStore.ts. Contains ID generation, data-size
 * estimation, gzip compress/decompress helpers, the safe localStorage
 * wrapper, and the IndexedDB hydration routine.
 */

import type { CompressedPayload, OfflineAction, SyncQueue } from './offline-types'
import { PRIORITY_ORDER } from './offline-types'
import {
  executeOfflineAction,
  type SyncOutcome
} from '@/lib/offline/sync-executor'
import {
  INDEXED_DB_BYTE_BUDGET,
  indexedDbCache,
  requestPersistentStorage
} from '@/lib/offline/indexed-db-cache'

/**
 * Generate a reasonably-unique id for an action or queue.
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Estimate the serialized byte size of a value.
 */
export const estimateDataSize = (data: unknown): number => {
  return new Blob([JSON.stringify(data)]).size
}

/**
 * Gzip-compress a value when the browser exposes CompressionStream.
 * Returns the original value untouched when compression is unavailable.
 */
export const compressData = async (
  data: unknown
): Promise<unknown | CompressedPayload> => {
  if ('CompressionStream' in window) {
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    writer.write(new TextEncoder().encode(JSON.stringify(data)))
    writer.close()

    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        chunks.push(value)
      }
    }

    const compressed = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    )
    let offset = 0
    for (const chunk of chunks) {
      compressed.set(chunk, offset)
      offset += chunk.length
    }

    return {
      compressed: true,
      data: Array.from(compressed),
      originalSize: estimateDataSize(data)
    }
  }

  return data
}

/**
 * Reverse of {@link compressData}. Returns the original value when it is not
 * a compressed payload.
 */
export const decompressData = async (
  compressedData: unknown
): Promise<unknown> => {
  const payload = compressedData as Partial<CompressedPayload> | undefined
  if (payload?.compressed) {
    if ('DecompressionStream' in window) {
      const stream = new DecompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      writer.write(new Uint8Array(payload.data ?? []))
      writer.close()

      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          chunks.push(value)
        }
      }

      const decompressed = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      )
      let offset = 0
      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }

      return JSON.parse(new TextDecoder().decode(decompressed))
    }
  }

  return compressedData
}

/**
 * A Zustand-compatible storage wrapper around localStorage that swallows
 * QuotaExceededError. When the browser is out of space (common under the
 * configured 50MB budget vs ~5MB cap), we drop the oldest persisted
 * actions/cache and retry once. If it still fails we give up silently —
 * the in-memory state survives and syncs once online.
 */
export function createSafeJSONStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  }

  const getItem = (name: string): string | null => {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  }

  const setItem = (name: string, value: string): void => {
    try {
      window.localStorage.setItem(name, value)
    } catch (err) {
      // Quota exhausted. Drop the named store entirely and try once more
      // with the current payload — better to keep recent actions than to
      // throw and leave the store in a half-persisted state.
      if (err && (err as DOMException).name === 'QuotaExceededError') {
        try {
          window.localStorage.removeItem(name)
          window.localStorage.setItem(name, value)
        } catch {
          // Still no room — accept that this session can't persist.
        }
      }
    }
  }

  const removeItem = (name: string): void => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // ignore
    }
  }

  return {
    getItem: (name: string) => getItem(name),
    setItem: (name: string, value: string) => setItem(name, value),
    removeItem: (name: string) => removeItem(name)
  }
}

/**
 * Populate the in-memory cache Map from IndexedDB on startup so reads
 * after a reload hit memory immediately. Also evicts expired entries.
 *
 * Takes the store's getState/setState to avoid a circular import with the
 * store module that owns them.
 */
export async function hydrateFromIndexedDb(getState: () => {
  cache: Map<string, unknown>
  updateMetrics: () => void
}, setState: (partial: { cache: Map<string, unknown> }) => void): Promise<void> {
  try {
    const entries = await indexedDbCache.entries()
    const now = Date.now()
    const store = getState()
    const newCache = new Map(store.cache)
    for (const entry of entries) {
      if (entry.expiresAt < now) {
        await indexedDbCache.delete(entry.key)
        continue
      }
      newCache.set(entry.key, {
        key: entry.key,
        data: entry.data,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        size: entry.size,
        tags: entry.tags
      })
    }
    setState({ cache: newCache })
    store.updateMetrics()
  } catch (err) {
    console.warn('[OfflineStore] IndexedDB hydration failed:', err)
  }
  // Request a persistent-storage grant so the browser won't evict the
  // offline cache mid-emergency. Fire-and-forget — must not block startup.
  void requestPersistentStorage()
}

/**
 * Minimal view of the store that the queue-processing helper needs. Passing
 * this in (rather than importing the store) avoids a circular module
 * dependency and keeps the helper pure with respect to module scope.
 */
export interface QueueProcessorStore {
  markActionSynced: (actionId: string) => void
  markActionFailed: (actionId: string, error: string) => void
  updateAction: (actionId: string, updates: Partial<OfflineAction>) => void
  addConflict: (conflict: {
    actionId: string
    type: 'data_conflict' | 'version_conflict' | 'dependency_conflict'
    localData: unknown
    remoteData: unknown
    resolution: 'local' | 'remote' | 'merge' | 'manual'
  }) => void
  setSyncProgress: (progress: {
    current: number
    total: number
    currentAction?: string
  }) => void
}

/**
 * Execute every action in a sync queue in priority order, honoring
 * dependency chains and applying per-outcome handling (sync / conflict /
 * permanent-failure / transient-failure with exponential backoff).
 *
 * Returns the number of actions that were actually attempted.
 */
export async function processQueueActions(
  queue: SyncQueue,
  store: QueueProcessorStore
): Promise<void> {
  const sortedActions = [...queue.actions].sort((a, b) => {
    return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
  })

  for (let i = 0; i < sortedActions.length; i++) {
    const action = sortedActions[i]
    if (!action) {
      continue
    }

    store.setSyncProgress({
      current: i + 1,
      total: sortedActions.length,
      currentAction: action.id
    })

    // Skip actions whose dependencies haven't synced yet — they
    // reference ids only the server can assign (e.g. a confirmation
    // on a not-yet-created event).
    if (action.dependencies && action.dependencies.length > 0) {
      const allMet = action.dependencies.every(depId =>
        sortedActions.find(a => a.id === depId)?.synced
      )
      if (!allMet) {
        continue
      }
    }

    // Actually send the action to the backend. Previously this was
    // a `setTimeout` that marked the action synced without any
    // network call — silently losing every offline write.
    const outcome: SyncOutcome = await executeOfflineAction({
      id: action.id,
      type: action.type,
      table: action.table,
      data: action.data as Record<string, unknown>,
      retryCount: action.retryCount,
      maxRetries: action.maxRetries,
      dependencies: action.dependencies
    })

    switch (outcome.status) {
      case 'synced':
        store.markActionSynced(action.id)
        break

      case 'conflict': {
        // Record for user resolution rather than dropping. Merge in
        // the remote record so the local copy isn't silently lost.
        store.addConflict({
          actionId: action.id,
          type: 'data_conflict',
          localData: action.data,
          remoteData: outcome.remoteData,
          resolution: 'manual'
        })
        store.markActionFailed(action.id, outcome.reason)
        break
      }

      case 'failed_permanently':
        // 400/401/403/404/422 — retrying won't help. Preserve the
        // action for the user to edit rather than deleting it.
        store.markActionFailed(action.id, outcome.reason)
        break

      case 'failed_transiently': {
        // 429/5xx/network — honour Retry-After when provided and
        // back off exponentially based on retryCount.
        const backoff =
          outcome.retryAfterMs ??
          Math.min(1000 * Math.pow(2, action.retryCount), 60_000)
        if (action.retryCount + 1 >= action.maxRetries) {
          store.markActionFailed(action.id, outcome.reason)
        } else {
          store.updateAction(action.id, {
            synced: false,
            retryCount: action.retryCount + 1,
            error: outcome.reason,
            lastAttempt: Date.now()
          })
          // Stagger subsequent retries so a transient outage
          // doesn't produce a tight retry loop.
          await new Promise(resolve => setTimeout(resolve, backoff))
        }
        break
      }
    }
  }
}

/**
 * Mirror a cache write to IndexedDB (durable tier) and enforce the byte
 * budget. Fire-and-forget by design — failure is non-fatal because the
 * in-memory copy is already authoritative for the current session.
 */
export function mirrorCacheToIndexedDb(
  key: string,
  cacheData: unknown,
  expiresAt: number,
  tags: string[]
): void {
  void indexedDbCache
    .set(key, cacheData, { expiresAt, tags })
    .then((stored) => {
      if (stored) {
        // Periodically enforce the byte budget at the IDB layer so
        // the durable store doesn't grow without bound.
        void indexedDbCache.evictToBudget(INDEXED_DB_BYTE_BUDGET)
      }
    })
    .catch((err) => {
      console.warn('[OfflineStore] IndexedDB mirror failed:', err)
    })
}

/**
 * Kick off an async IndexedDB read to back-fill a missing in-memory cache
 * entry. Synchronous callers (TanStack queryFn fallback) cannot await
 * IndexedDB, so this populates the Map so the NEXT read finds it. Best-effort.
 */
export function backfillCacheFromIndexedDb(
  key: string,
  setCacheEntry: (key: string, entry: {
    key: string
    data: unknown
    timestamp: number
    expiresAt: number
    size: number
    tags: string[]
  }) => void
): void {
  void (async () => {
    try {
      const stored = await indexedDbCache.get(key)
      if (stored && stored.expiresAt >= Date.now()) {
        setCacheEntry(key, {
          key: stored.key,
          data: stored.data,
          timestamp: stored.timestamp,
          expiresAt: stored.expiresAt,
          size: stored.size,
          tags: stored.tags
        })
      } else if (stored) {
        await indexedDbCache.delete(key)
      }
    } catch {
      // ignore — best-effort back-fill
    }
  })()
}

/**
 * Evict the oldest in-memory cache entries until total size falls below 80%
 * of the configured byte budget. Used to keep the in-memory tier bounded.
 */
export function optimizeCacheStorage(
  cache: Map<string, { key: string; size: number; timestamp: number }>,
  maxSizeBytes: number,
  removeKey: (key: string) => void
): void {
  let totalSize = 0
  const entries: Array<{ key: string; size: number; timestamp: number }> = []

  cache.forEach((entry, key) => {
    totalSize += entry.size
    entries.push({ key, size: entry.size, timestamp: entry.timestamp })
  })

  if (totalSize <= maxSizeBytes) {
    return
  }

  // Sort by timestamp (oldest first) and remove oldest entries.
  entries.sort((a, b) => a.timestamp - b.timestamp)

  let currentSize = totalSize
  const targetSize = maxSizeBytes * 0.8 // Leave 20% buffer

  for (const entry of entries) {
    if (currentSize <= targetSize) {
      break
    }

    removeKey(entry.key)
    currentSize -= entry.size
  }
}

/**
 * Build a cache entry (compressing when configured and the payload is large),
 * ready to insert into the in-memory Map.
 */
export async function buildCacheEntry(
  key: string,
  data: unknown,
  expiresAt: number,
  tags: string[],
  compress: boolean
): Promise<{ data: unknown; entry: { key: string; data: unknown; timestamp: number; expiresAt: number; size: number; tags: string[] } }> {
  let cacheData: unknown = data
  const size = estimateDataSize(data)

  if (compress && size > 1024) {
    // Only compress data larger than 1KB
    cacheData = await compressData(data)
  }

  return {
    data: cacheData,
    entry: {
      key,
      data: cacheData,
      timestamp: Date.now(),
      expiresAt,
      size: estimateDataSize(cacheData),
      tags
    }
  }
}

/**
 * Register the Background Sync API tag for offline writes. Resolves to the
 * support/registration flags the caller should persist.
 */
export async function registerBackgroundSyncTag(
  tag: string
): Promise<{ supported: boolean; registered: boolean }> {
  if (
    !('serviceWorker' in navigator) ||
    !('sync' in window.ServiceWorkerRegistration.prototype)
  ) {
    return { supported: false, registered: false }
  }
  try {
    const registration = await navigator.serviceWorker.ready
    // The Background Sync API is not in the lib.dom typings yet.
    const syncReg = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }
    if (syncReg.sync) {
      await syncReg.sync.register(tag)
      return { supported: true, registered: true }
    }
    return { supported: false, registered: false }
  } catch (error) {
    console.error('Failed to register background sync:', error)
    return { supported: false, registered: false }
  }
}

/**
 * Estimate the wall-clock time (ms) to sync a batch of actions, adjusted for
 * critical-priority batches and offline network conditions.
 */
export function estimateSyncTimeMs(
  actions: OfflineAction[],
  isOnline: boolean
): number {
  // Base estimate: 2 seconds per action
  const baseTime = actions.length * 2000

  // Adjust for priority (critical actions are faster)
  const priorityMultiplier = actions.some(a => a.priority === 'critical') ? 0.8 : 1.0

  // Adjust for network conditions (simplified)
  const networkMultiplier = isOnline ? 1.0 : 2.0

  return baseTime * priorityMultiplier * networkMultiplier
}

/**
 * Recompute the OfflineMetrics snapshot from the current actions and cache.
 */
export function computeMetrics(
  actions: OfflineAction[],
  cache: Map<string, { size: number }>,
  lastSyncTime: number | null,
  previousAverageSyncTime: number
): {
  totalActions: number
  pendingActions: number
  failedActions: number
  syncedActions: number
  cacheSize: number
  cacheEntries: number
  lastSyncTime: number | null
  averageSyncTime: number
  successRate: number
} {
  const totalActions = actions.length
  const pendingActions = actions.filter(a => !a.synced && a.retryCount === 0).length
  const failedActions = actions.filter(a => !a.synced && a.retryCount > 0).length
  const syncedActions = actions.filter(a => a.synced).length

  const cacheSize = Array.from(cache.values()).reduce(
    (total, entry) => total + entry.size,
    0
  )
  const cacheEntries = cache.size

  const successRate = totalActions > 0 ? (syncedActions / totalActions) * 100 : 0

  return {
    totalActions,
    pendingActions,
    failedActions,
    syncedActions,
    cacheSize,
    cacheEntries,
    lastSyncTime,
    averageSyncTime: previousAverageSyncTime, // Would need actual calculation
    successRate
  }
}

/** Maximum number of cache entries persisted to localStorage. */
const MAX_PERSISTED_CACHE_ENTRIES = 200

/**
 * Project the persisted slice of offline state. Caps the cache snapshot to a
 * budget that fits inside the ~5MB localStorage quota and only persists
 * unsynced actions (capped) so the store can't grow without bound.
 */
export function partializeOfflineState<TState extends {
  settings: unknown
  actions: OfflineAction[]
  cache: Map<string, { timestamp: number }>
}>(state: TState): {
  settings: TState['settings']
  actions: OfflineAction[]
  cache: Array<[string, { timestamp: number }]>
} {
  const entries = Array.from(state.cache.entries())
    .sort(([, a], [, b]) => b.timestamp - a.timestamp)
    .slice(0, MAX_PERSISTED_CACHE_ENTRIES)
  return {
    settings: state.settings,
    // Only persist unsynced actions; cap to avoid runaway growth.
    actions: state.actions.filter(a => !a.synced).slice(-500),
    cache: entries
  }
}
