import { create } from 'zustand'
import { persist, subscribeWithSelector, type PersistStorage } from 'zustand/middleware'
import {
  indexedDbCache
} from '@/lib/offline/indexed-db-cache'
import type {
  ConflictResolution,
  OfflineAction,
  OfflineCache,
  OfflineMetrics,
  OfflineSettings,
  OfflineStore,
  SetCacheOptions,
  SyncQueue
} from './offline-types'
import { defaultSettings, initialOfflineState } from './offline-types'
import {
  backfillCacheFromIndexedDb,
  buildCacheEntry,
  compressData,
  computeMetrics,
  createSafeJSONStorage,
  decompressData,
  estimateDataSize,
  generateId,
  hydrateFromIndexedDb,
  mirrorCacheToIndexedDb,
  optimizeCacheStorage,
  partializeOfflineState,
  processQueueActions,
  registerBackgroundSyncTag,
  estimateSyncTimeMs
} from './offline-helpers'

// Re-export public types and utilities so existing imports keep working.
export type {
  ConflictResolution,
  OfflineAction,
  OfflineCache,
  OfflineMetrics,
  OfflineSettings,
  OfflineStore,
  SetCacheOptions,
  SyncQueue
} from './offline-types'
export { generateId, estimateDataSize, compressData, decompressData } from './offline-helpers'

export const useOfflineStore = create<OfflineStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialOfflineState,

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

            // Execute actions via the shared helper (per-outcome handling +
            // dependency chains + exponential backoff).
            await processQueueActions(targetQueue, {
              markActionSynced: (id) => get().markActionSynced(id),
              markActionFailed: (id, err) => get().markActionFailed(id, err),
              updateAction: (id, updates) => get().updateAction(id, updates),
              addConflict: (conflict) => get().addConflict(conflict),
              setSyncProgress: (progress) => set({ syncProgress: progress })
            })

            // Update queue status
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id
                  ? { ...q, status: 'completed', endTime: Date.now() }
                  : q
              ),
              lastSyncTime: Date.now()
            }))

            // Mirror the last-sync timestamp to localStorage so the offline
            // fallback page can display "Last sync: <time>" — previously this
            // key was read but never written, so it always showed "never".
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('openrelief-last-sync', new Date().toISOString())
              }
            } catch {
              // localStorage may be unavailable (private mode); ignore.
            }
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

        // Cache management — two-tier: in-memory Map (sync reads) + IndexedDB
        // (durable). Writes mirror to IDB async; misses back-fill from IDB.
        setCache: async (key, data, options = {}) => {
          const { settings } = get()
          const expiresAt = options.expiresAt || Date.now() + (settings.cacheMaxAge * 24 * 60 * 60 * 1000)
          const tags = options.tags || []

          const { data: cacheData, entry: cacheEntry } = await buildCacheEntry(
            key,
            data,
            expiresAt,
            tags,
            settings.compressData
          )

          set((state) => {
            const newCache = new Map(state.cache)
            newCache.set(key, cacheEntry)
            return { cache: newCache }
          })

          // Mirror to IndexedDB (durable tier). Fire-and-forget.
          mirrorCacheToIndexedDb(key, cacheData, expiresAt, tags)

          // Keep the in-memory tier bounded.
          get().optimizeStorage()
        },

        getCache: (key) => {
          const cache = get().cache.get(key)
          if (cache && cache.expiresAt >= Date.now()) {
            // Decompress if needed
            if (cache.data && typeof cache.data === 'object' && (cache.data as { compressed?: boolean }).compressed) {
              return decompressData(cache.data)
            }
            return cache.data
          }

          if (cache && cache.expiresAt < Date.now()) {
            get().removeCache(key)
          }

          // Sync callers can't await IDB; kick off an async back-fill so the
          // next read finds the entry, and return null for now.
          backfillCacheFromIndexedDb(key, (cacheKey, entry) => {
            set((state) => {
              const newCache = new Map(state.cache)
              newCache.set(cacheKey, entry)
              return { cache: newCache }
            })
          })

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
              newCache.forEach((entry, key) => {
                if (entry.tags.some((tag: string) => tags.includes(tag))) {
                  newCache.delete(key)
                }
              })
            } else {
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

        updateSettings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings }
          }))
        },

        resetSettings: () => {
          set({ settings: defaultSettings })
        },

        updateMetrics: () => {
          const { actions, cache, lastSyncTime, metrics } = get()
          set({ metrics: computeMetrics(actions, cache, lastSyncTime, metrics.averageSyncTime) })
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
          const maxSizeBytes = settings.cacheMaxSize * 1024 * 1024
          optimizeCacheStorage(cache, maxSizeBytes, (key) => get().removeCache(key))
        },

        registerBackgroundSync: async () => {
          const { supported, registered } = await registerBackgroundSyncTag(
            'emergency-offline-sync'
          )
          set({ bgSyncSupported: supported, bgSyncRegistered: registered })
        },

        unregisterBackgroundSync: async () => {
          if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
              await navigator.serviceWorker.ready
              // Note: There's no direct way to unregister a specific sync tag
              set({ bgSyncRegistered: false })
            } catch (error) {
              console.error('Failed to unregister background sync:', error)
            }
          }
        },

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
          return estimateSyncTimeMs(actions, get().isOnline)
        },

        setError: (error, actionId) => {
          if (!error) {
            return
          }
          set({
            error,
            lastError: {
              message: error,
              timestamp: Date.now(),
              ...(actionId ? { actionId } : {})
            }
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
        partialize: (state) => {
          return partializeOfflineState(state) as unknown as OfflineStore
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert the persisted array back into a Map.
            state.cache = new Map(
              state.cache as unknown as Iterable<readonly [string, OfflineCache]>
            )
          }
          // Hydrate the cache Map from IndexedDB (the durable tier) and
          // request a persistent-storage grant. Fire-and-forget.
          void hydrateFromIndexedDb(
            () => useOfflineStore.getState(),
            (partial) => useOfflineStore.setState(partial as Partial<OfflineStore>)
          )
        },
        // localStorage wrapper that swallows QuotaExceededError; persistence
        // is best-effort — the in-memory store remains the source of truth.
        storage: createSafeJSONStorage() as unknown as PersistStorage<OfflineStore>
      }
    )
  )
)

// Selectors (defined in offline-selectors.ts; re-exported for compatibility).
export {
  useOfflineActions,
  useOfflineCache,
  useOfflineMetrics,
  useOfflineSettings,
  useOfflineState
} from './offline-selectors'
