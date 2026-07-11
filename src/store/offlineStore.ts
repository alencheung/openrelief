import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { executeOfflineAction, type SyncOutcome } from '@/lib/offline/sync-executor'
import {
  indexedDbCache,
  requestPersistentStorage,
  INDEXED_DB_BYTE_BUDGET
} from '@/lib/offline/indexed-db-cache'

// Types
export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'confirm' | 'dispute'
  table: string
  data: any
  timestamp: number
  synced: boolean
  retryCount: number
  maxRetries: number
  error?: string
  lastAttempt?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies?: string[] // IDs of other actions this depends on
}

export interface OfflineCache {
  key: string
  data: any
  timestamp: number
  expiresAt: number
  size: number // bytes
  tags: string[]
}

export interface SyncQueue {
  id: string
  actions: OfflineAction[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  error?: string
  retryCount: number
}

export interface OfflineMetrics {
  totalActions: number
  pendingActions: number
  failedActions: number
  syncedActions: number
  cacheSize: number
  cacheEntries: number
  lastSyncTime: number | null
  averageSyncTime: number
  successRate: number
}

export interface OfflineSettings {
  enabled: boolean
  autoSync: boolean
  syncInterval: number // minutes
  maxRetries: number
  retryDelay: number // minutes
  cacheMaxSize: number // MB
  cacheMaxAge: number // days
  compressData: boolean
  prioritySync: boolean
  backgroundSync: boolean
}

export interface ConflictResolution {
  actionId: string
  type: 'data_conflict' | 'version_conflict' | 'dependency_conflict'
  localData: any
  remoteData: any
  resolution: 'local' | 'remote' | 'merge' | 'manual'
  resolvedAt?: number
}

// Offline Store State
interface OfflineState {
  // Actions and queue
  actions: OfflineAction[]
  queue: SyncQueue[]

  // Cache
  cache: Map<string, OfflineCache>

  // Settings
  settings: OfflineSettings

  // Sync state
  isOnline: boolean
  isSyncing: boolean
  syncProgress: {
    current: number
    total: number
    currentAction?: string
  }
  lastSyncTime: number | null

  // Conflicts
  conflicts: ConflictResolution[]

  // Metrics
  metrics: OfflineMetrics

  // Performance
  storageQuota: {
    used: number
    quota: number
    percentage: number
  }

  // Background sync
  bgSyncSupported: boolean
  bgSyncRegistered: boolean

  // Error handling
  error: string | null
  lastError: {
    message: string
    timestamp: number
    actionId?: string
  } | null
}

// Offline Store Actions
interface OfflineActions {
  // Action management
  addAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>) => string
  removeAction: (actionId: string) => void
  updateAction: (actionId: string, updates: Partial<OfflineAction>) => void
  markActionSynced: (actionId: string) => void
  markActionFailed: (actionId: string, error: string) => void
  retryAction: (actionId: string) => void
  clearSyncedActions: () => void

  // Queue management
  createSyncQueue: (actionIds: string[]) => string
  processQueue: (queueId?: string) => Promise<void>
  cancelQueue: (queueId: string) => void

  // Cache management
  setCache: (key: string, data: any, options?: {
    expiresAt?: number
    tags?: string[]
    priority?: 'low' | 'medium' | 'high'
  }) => Promise<void>
  getCache: (key: string) => any
  removeCache: (key: string) => void
  clearCache: (tags?: string[]) => void
  cleanExpiredCache: () => void

  // Sync management
  startSync: () => Promise<void>
  stopSync: () => void
  forceSync: () => Promise<void>
  scheduleSync: (delay?: number) => void

  // Conflict management
  addConflict: (conflict: Omit<ConflictResolution, 'resolvedAt'>) => void
  resolveConflict: (actionId: string, resolution: ConflictResolution['resolution'], mergedData?: any) => void
  clearResolvedConflicts: () => void

  // Settings management
  updateSettings: (settings: Partial<OfflineSettings>) => void
  resetSettings: () => void

  // Metrics and monitoring
  updateMetrics: () => void
  getStorageQuota: () => Promise<void>
  optimizeStorage: () => Promise<void>

  // Background sync
  registerBackgroundSync: () => Promise<void>
  unregisterBackgroundSync: () => Promise<void>

  // Utility functions
  getPendingActions: (priority?: OfflineAction['priority']) => OfflineAction[]
  getFailedActions: () => OfflineAction[]
  getActionById: (actionId: string) => OfflineAction | undefined
  getActionsByTable: (table: string) => OfflineAction[]
  estimateSyncTime: (actions: OfflineAction[]) => number

  // Error handling
  setError: (error: string | null, actionId?: string) => void
  clearError: () => void
  reset: () => void
}

type OfflineStore = OfflineState & OfflineActions

// Default settings
const defaultSettings: OfflineSettings = {
  enabled: true,
  autoSync: true,
  syncInterval: 5, // 5 minutes
  maxRetries: 3,
  retryDelay: 2, // 2 minutes
  cacheMaxSize: 50, // 50MB
  cacheMaxAge: 7, // 7 days
  compressData: true,
  prioritySync: true,
  backgroundSync: true
}

// Utility functions
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const estimateDataSize = (data: any): number => {
  return new Blob([JSON.stringify(data)]).size
}

const compressData = async (data: any): Promise<any> => {
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

    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
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

const decompressData = async (compressedData: any): Promise<any> => {
  if (compressedData.compressed) {
    if ('DecompressionStream' in window) {
      const stream = new DecompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      writer.write(new Uint8Array(compressedData.data))
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

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
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

// Create Store
export const useOfflineStore = create<OfflineStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        actions: [],
        queue: [],
        cache: new Map(),
        settings: defaultSettings,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isSyncing: false,
        syncProgress: {
          current: 0,
          total: 0
        },
        lastSyncTime: null,
        conflicts: [],
        metrics: {
          totalActions: 0,
          pendingActions: 0,
          failedActions: 0,
          syncedActions: 0,
          cacheSize: 0,
          cacheEntries: 0,
          lastSyncTime: null,
          averageSyncTime: 0,
          successRate: 0
        },
        storageQuota: {
          used: 0,
          quota: 0,
          percentage: 0
        },
        bgSyncSupported: false,
        bgSyncRegistered: false,
        error: null,
        lastError: null,

        // Action management
        addAction: (action) => {
          const newAction: OfflineAction = {
            ...action,
            id: generateId(),
            timestamp: Date.now(),
            synced: false,
            retryCount: 0
          }

          set((state) => ({
            actions: [...state.actions, newAction]
          }))

          // Schedule sync if online and auto-sync is enabled
          if (get().isOnline && get().settings.autoSync) {
            get().scheduleSync()
          }

          return newAction.id
        },

        removeAction: (actionId) => {
          set((state) => ({
            actions: state.actions.filter(a => a.id !== actionId)
          }))
        },

        updateAction: (actionId, updates) => {
          set((state) => ({
            actions: state.actions.map(a =>
              a.id === actionId ? { ...a, ...updates } : a
            )
          }))
        },

        markActionSynced: (actionId) => {
          get().updateAction(actionId, { synced: true })
          get().updateMetrics()
        },

        markActionFailed: (actionId, error) => {
          get().updateAction(actionId, {
            synced: false,
            retryCount: get().getActionById(actionId)?.retryCount ? get().getActionById(actionId)!.retryCount + 1 : 1,
            error,
            lastAttempt: Date.now()
          })
          get().updateMetrics()
        },

        retryAction: (actionId) => {
          const updates: Partial<OfflineAction> = {
            synced: false,
            retryCount: 0
          }
          get().updateAction(actionId, updates)
        },

        clearSyncedActions: () => {
          set((state) => ({
            actions: state.actions.filter(a => !a.synced)
          }))
        },

        // Queue management
        createSyncQueue: (actionIds) => {
          const queueId = generateId()
          const newQueue: SyncQueue = {
            id: queueId,
            actions: actionIds.map(id => get().getActionById(id)!).filter(Boolean),
            status: 'pending',
            retryCount: 0
          }

          set((state) => ({
            queue: [...state.queue, newQueue]
          }))

          return queueId
        },

        processQueue: async (queueId) => {
          const { queue, isOnline, isSyncing } = get()

          if (!isOnline || isSyncing) {
            return
          }

          const targetQueue = queueId
            ? queue.find(q => q.id === queueId)
            : queue.find(q => q.status === 'pending')

          if (!targetQueue) {
            return
          }

          set({ isSyncing: true, syncProgress: { current: 0, total: targetQueue.actions.length } })

          try {
            // Update queue status
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id ? { ...q, status: 'processing', startTime: Date.now() } : q
              )
            }))

            // Process actions in order of priority
            const sortedActions = [...targetQueue.actions].sort((a, b) => {
              const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
              return priorityOrder[b.priority] - priorityOrder[a.priority]
            })

            for (let i = 0; i < sortedActions.length; i++) {
              const action = sortedActions[i]
              if (!action) {
                continue
              }

              set((_state) => ({
                syncProgress: {
                  current: i + 1,
                  total: sortedActions.length,
                  currentAction: action.id
                }
              }))

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
                data: action.data,
                retryCount: action.retryCount,
                maxRetries: action.maxRetries,
                dependencies: action.dependencies
              })

              switch (outcome.status) {
                case 'synced':
                  get().markActionSynced(action.id)
                  break

                case 'conflict': {
                  // Record for user resolution rather than dropping. Merge in
                  // the remote record so the local copy isn't silently lost.
                  get().addConflict({
                    actionId: action.id,
                    type: 'data_conflict',
                    localData: action.data,
                    remoteData: outcome.remoteData,
                    resolution: 'manual'
                  })
                  get().markActionFailed(action.id, outcome.reason)
                  break
                }

                case 'failed_permanently':
                  // 400/401/403/404/422 — retrying won't help. Preserve the
                  // action for the user to edit rather than deleting it.
                  get().markActionFailed(action.id, outcome.reason)
                  break

                case 'failed_transiently': {
                  // 429/5xx/network — honour Retry-After when provided and
                  // back off exponentially based on retryCount.
                  const backoff =
                    outcome.retryAfterMs ??
                    Math.min(1000 * Math.pow(2, action.retryCount), 60_000)
                  if (action.retryCount + 1 >= action.maxRetries) {
                    get().markActionFailed(action.id, outcome.reason)
                  } else {
                    get().updateAction(action.id, {
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

            // Update queue status
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id
                  ? { ...q, status: 'completed', endTime: Date.now() }
                  : q
              ),
              lastSyncTime: Date.now()
            }))
          } catch (error) {
            console.error('Sync queue failed:', error)

            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id
                  ? { ...q, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
                  : q
              )
            }))
          } finally {
            set({ isSyncing: false, syncProgress: { current: 0, total: 0 } })
            get().updateMetrics()
          }
        },

        cancelQueue: (queueId) => {
          set((state) => ({
            queue: state.queue.map(q =>
              q.id === queueId ? { ...q, status: 'failed', error: 'Cancelled' } : q
            )
          }))
        },

        // Cache management
        //
        // Two-tier cache: in-memory Map (synchronous reads for the TanStack
        // query fallback path) backed by IndexedDB (durable across reloads,
        // survives the ~5MB localStorage quota that previously truncated the
        // entire offline cache via QuotaExceededError). Writes propagate to
        // IndexedDB asynchronously so the UI never blocks on disk; on a miss
        // the read falls through to IndexedDB and back-fills the Map.
        setCache: async (key, data, options = {}) => {
          const { settings } = get()
          const expiresAt = options.expiresAt || Date.now() + (settings.cacheMaxAge * 24 * 60 * 60 * 1000)
          const tags = options.tags || []

          let cacheData = data
          let size = estimateDataSize(data)

          if (settings.compressData && size > 1024) { // Only compress data larger than 1KB
            cacheData = await compressData(data)
          }

          const cacheEntry: OfflineCache = {
            key,
            data: cacheData,
            timestamp: Date.now(),
            expiresAt,
            size: estimateDataSize(cacheData),
            tags
          }

          set((state) => {
            const newCache = new Map(state.cache)
            newCache.set(key, cacheEntry)
            return { cache: newCache }
          })

          // Mirror to IndexedDB for durability across reloads and to escape
          // the localStorage 5MB ceiling. Fire-and-forget — failure is
          // non-fatal because the in-memory copy is already authoritative
          // for the current session.
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

          // Clean up the in-memory tier if it is too large.
          get().optimizeStorage()
        },

        getCache: (key) => {
          const cache = get().cache.get(key)
          if (cache && cache.expiresAt >= Date.now()) {
            // Decompress if needed
            if (cache.data && typeof cache.data === 'object' && cache.data.compressed) {
              return decompressData(cache.data)
            }
            return cache.data
          }

          if (cache && cache.expiresAt < Date.now()) {
            get().removeCache(key)
          }

          // Synchronous callers (TanStack queryFn fallback) cannot await
          // IndexedDB. If the entry isn't in memory, kick off an async
          // back-fill so the NEXT read finds it, and return null for now.
          // This is a deliberate trade-off: durability via IDB without
          // converting every caller to async.
          void (async () => {
            try {
              const stored = await indexedDbCache.get(key)
              if (stored && stored.expiresAt >= Date.now()) {
                set((state) => {
                  const newCache = new Map(state.cache)
                  newCache.set(key, {
                    key: stored.key,
                    data: stored.data,
                    timestamp: stored.timestamp,
                    expiresAt: stored.expiresAt,
                    size: stored.size,
                    tags: stored.tags
                  })
                  return { cache: newCache }
                })
              } else if (stored) {
                await indexedDbCache.delete(key)
              }
            } catch {
              // ignore — best-effort back-fill
            }
          })()

          return null
        },

        removeCache: (key) => {
          set((state) => {
            const newCache = new Map(state.cache)
            newCache.delete(key)
            return { cache: newCache }
          })
          // Also drop from the durable tier.
          void indexedDbCache.delete(key).catch(() => {})
        },

        clearCache: (tags) => {
          set((state) => {
            const newCache = new Map(state.cache)

            if (tags && tags.length > 0) {
              // Clear only entries with specified tags
              newCache.forEach((entry, key) => {
                if (entry.tags.some((tag: string) => tags.includes(tag))) {
                  newCache.delete(key)
                }
              })
            } else {
              // Clear all cache
              newCache.clear()
            }

            return { cache: newCache }
          })
          void indexedDbCache.clear(tags).catch(() => {})
        },

        cleanExpiredCache: () => {
          const now = Date.now()
          set((state) => {
            const newCache = new Map(state.cache)
            newCache.forEach((entry, key) => {
              if (entry.expiresAt < now) {
                newCache.delete(key)
              }
            })
            return { cache: newCache }
          })
        },

        // Sync management
        startSync: async () => {
          if (!get().isOnline) {
            return
          }

          const pendingActions = get().getPendingActions()
          if (pendingActions.length === 0) {
            return
          }

          const queueId = get().createSyncQueue(pendingActions.map(a => a.id))
          await get().processQueue(queueId)
        },

        stopSync: () => {
          set({ isSyncing: false })
        },

        forceSync: async () => {
          await get().startSync()
        },

        scheduleSync: (delay = 0) => {
          setTimeout(() => {
            if (get().isOnline && !get().isSyncing) {
              get().startSync()
            }
          }, delay)
        },

        // Conflict management
        addConflict: (conflict) => {
          set((state) => ({
            conflicts: [...state.conflicts, conflict]
          }))
        },

        resolveConflict: (actionId, resolution, mergedData) => {
          set((state) => ({
            conflicts: state.conflicts.map(c =>
              c.actionId === actionId
                ? { ...c, resolution, resolvedAt: Date.now(), mergedData }
                : c
            )
          }))
        },

        clearResolvedConflicts: () => {
          set((state) => ({
            conflicts: state.conflicts.filter(c => !c.resolvedAt)
          }))
        },

        // Settings management
        updateSettings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings }
          }))
        },

        resetSettings: () => {
          set({ settings: defaultSettings })
        },

        // Metrics and monitoring
        updateMetrics: () => {
          const { actions, cache, lastSyncTime } = get()

          const totalActions = actions.length
          const pendingActions = actions.filter(a => !a.synced && a.retryCount === 0).length
          const failedActions = actions.filter(a => !a.synced && a.retryCount > 0).length
          const syncedActions = actions.filter(a => a.synced).length

          const cacheSize = Array.from(cache.values()).reduce((total, entry) => total + entry.size, 0)
          const cacheEntries = cache.size

          const successRate = totalActions > 0 ? (syncedActions / totalActions) * 100 : 0

          set({
            metrics: {
              totalActions,
              pendingActions,
              failedActions,
              syncedActions,
              cacheSize,
              cacheEntries,
              lastSyncTime,
              averageSyncTime: get().metrics.averageSyncTime, // Would need actual calculation
              successRate
            }
          })
        },

        getStorageQuota: async () => {
          // Use the IndexedDB cache's guarded estimate helper, which is
          // SSR-safe and accounts for the IDB tier rather than just the
          // localStorage quota that was previously reported.
          const { usage, quota } = await indexedDbCache.usageEstimate()
          set({
            storageQuota: {
              used: usage,
              quota,
              percentage: quota > 0 ? (usage / quota) * 100 : 0
            }
          })
        },

        optimizeStorage: async () => {
          const { settings, cache } = get()
          let totalSize = 0
          const entries: Array<{ key: string; size: number; timestamp: number }> = []

          // Calculate total size and collect entries
          cache.forEach((entry, key) => {
            totalSize += entry.size
            entries.push({ key, size: entry.size, timestamp: entry.timestamp })
          })

          // If under limit, no need to optimize
          const maxSizeBytes = settings.cacheMaxSize * 1024 * 1024
          if (totalSize <= maxSizeBytes) {
            return
          }

          // Sort by timestamp (oldest first) and remove oldest entries
          entries.sort((a, b) => a.timestamp - b.timestamp)

          let currentSize = totalSize
          const targetSize = maxSizeBytes * 0.8 // Leave 20% buffer

          for (const entry of entries) {
            if (currentSize <= targetSize) {
              break
            }

            get().removeCache(entry.key)
            currentSize -= entry.size
          }
        },

        // Background sync
        registerBackgroundSync: async () => {
          if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
              const registration = await navigator.serviceWorker.ready
              // Type assertion for background sync API
              const syncReg = registration as any
              if (syncReg.sync) {
                await syncReg.sync.register('emergency-offline-sync')
                set({ bgSyncSupported: true, bgSyncRegistered: true })
              } else {
                set({ bgSyncSupported: false, bgSyncRegistered: false })
              }
            } catch (error) {
              console.error('Failed to register background sync:', error)
              set({ bgSyncSupported: false, bgSyncRegistered: false })
            }
          } else {
            set({ bgSyncSupported: false, bgSyncRegistered: false })
          }
        },

        unregisterBackgroundSync: async () => {
          if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
              const _registration = await navigator.serviceWorker.ready
              // Note: There's no direct way to unregister a specific sync tag
              set({ bgSyncRegistered: false })
            } catch (error) {
              console.error('Failed to unregister background sync:', error)
            }
          }
        },

        // Utility functions
        getPendingActions: (priority) => {
          const { actions } = get()
          return actions.filter(a =>
            !a.synced
            && a.retryCount < a.maxRetries
            && (!priority || a.priority === priority)
          )
        },

        getFailedActions: () => {
          const { actions } = get()
          return actions.filter(a =>
            !a.synced
            && a.retryCount >= a.maxRetries
          )
        },

        getActionById: (actionId) => {
          return get().actions.find(a => a.id === actionId)
        },

        getActionsByTable: (table) => {
          return get().actions.filter(a => a.table === table)
        },

        estimateSyncTime: (actions) => {
          // Base estimate: 2 seconds per action
          const baseTime = actions.length * 2000

          // Adjust for priority (critical actions are faster)
          const priorityMultiplier = actions.some(a => a.priority === 'critical') ? 0.8 : 1.0

          // Adjust for network conditions (simplified)
          const networkMultiplier = get().isOnline ? 1.0 : 2.0

          return baseTime * priorityMultiplier * networkMultiplier
        },

        // Error handling
        setError: (error, actionId) => {
          if (!error) {
            return
          }
          const lastError: {
            message: string
            timestamp: number
            actionId?: string
          } = {
            message: error,
            timestamp: Date.now()
          }

          if (actionId) {
            lastError.actionId = actionId
          }

          set({
            error,
            lastError
          })
        },

        clearError: () => {
          set({ error: null, lastError: null })
        },

        reset: () => {
          set({
            actions: [],
            queue: [],
            cache: new Map(),
            conflicts: [],
            isSyncing: false,
            syncProgress: { current: 0, total: 0 },
            lastSyncTime: null,
            error: null,
            lastError: null
          })
        }
      }),
      {
        name: 'offline-storage',
        // Cap the cache snapshot to a budget that fits inside the ~5MB
        // localStorage quota. The configured cacheMaxSize (50MB) targets
        // IndexedDB-grade storage; serializing that much into localStorage
        // throws QuotaExceededError and corrupts the entire persisted state.
        // We keep the highest-priority (most recently touched) entries and
        // drop the rest rather than failing the whole write.
        partialize: (state) => {
          const MAX_CACHE_ENTRIES = 200
          const entries = Array.from(state.cache.entries())
            .sort(([, a], [, b]) => b.timestamp - a.timestamp)
            .slice(0, MAX_CACHE_ENTRIES)
          return {
            settings: state.settings,
            // Only persist unsynced actions; cap to avoid runaway growth.
            actions: state.actions
              .filter(a => !a.synced)
              .slice(-500),
            cache: entries
          } as unknown as OfflineStore
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert array back to Map
            state.cache = new Map(state.cache as any)
          }
          // After the localStorage tier rehydrates, hydrate the cache Map
          // from IndexedDB (the durable tier) and request a persistent
          // storage grant so the browser won't evict the offline cache
          // mid-emergency. Fire-and-forget — these must not block startup.
          void hydrateFromIndexedDb()
          void requestPersistentStorage()
        },
        // Wrap localStorage so a quota error degrades gracefully instead of
        // throwing and aborting the persist. The in-memory store remains the
        // source of truth; persistence is best-effort for offline resilience.
        storage: createSafeJSONStorage() as any
      }
    )
  )
)

/**
 * Populate the in-memory cache Map from IndexedDB on startup so reads
 * after a reload hit memory immediately. Also evicts expired entries.
 */
async function hydrateFromIndexedDb(): Promise<void> {
  try {
    const entries = await indexedDbCache.entries()
    const now = Date.now()
    const store = useOfflineStore.getState()
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
    useOfflineStore.setState({ cache: newCache })
    store.updateMetrics()
  } catch (err) {
    console.warn('[OfflineStore] IndexedDB hydration failed:', err)
  }
}

/**
 * A Zustand-compatible storage wrapper around localStorage that swallows
 * QuotaExceededError. When the browser is out of space (common under the
 * configured 50MB budget vs ~5MB cap), we drop the oldest persisted
 * actions/cache and retry once. If it still fails we give up silently —
 * the in-memory state survives and syncs once online.
 */
function createSafeJSONStorage() {
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

// Selectors for common use cases
export const useOfflineState = () => useOfflineStore(state => ({
  actions: state.actions,
  pendingActions: state.getPendingActions(),
  failedActions: state.getFailedActions(),
  isSyncing: state.isSyncing,
  syncProgress: state.syncProgress
}))

export const useOfflineCache = () => useOfflineStore(state => ({
  cache: state.cache,
  cacheSize: state.metrics.cacheSize,
  cacheEntries: state.metrics.cacheEntries
}))

export const useOfflineMetrics = () => useOfflineStore(state => state.metrics)

export const useOfflineSettings = () => useOfflineStore(state => state.settings)

export const useOfflineActions = () => useOfflineStore(state => ({
  addAction: state.addAction,
  removeAction: state.removeAction,
  markActionSynced: state.markActionSynced,
  retryAction: state.retryAction,
  startSync: state.startSync,
  forceSync: state.forceSync,
  setCache: state.setCache,
  getCache: state.getCache,
  updateSettings: state.updateSettings
}))

// Utility exports
export { generateId, estimateDataSize, compressData, decompressData }