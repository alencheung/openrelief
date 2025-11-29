import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { Database } from '@/types/database'

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
  backgroundSync: true,
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
      if (value) chunks.push(value)
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
      originalSize: estimateDataSize(data),
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
        if (value) chunks.push(value)
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
          total: 0,
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
          successRate: 0,
        },
        storageQuota: {
          used: 0,
          quota: 0,
          percentage: 0,
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
            retryCount: 0,
          }

          set((state) => ({
            actions: [...state.actions, newAction],
          }))

          // Schedule sync if online and auto-sync is enabled
          if (get().isOnline && get().settings.autoSync) {
            get().scheduleSync()
          }

          return newAction.id
        },

        removeAction: (actionId) => {
          set((state) => ({
            actions: state.actions.filter(a => a.id !== actionId),
          }))
        },

        updateAction: (actionId, updates) => {
          set((state) => ({
            actions: state.actions.map(a =>
              a.id === actionId ? { ...a, ...updates } : a
            ),
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
            lastAttempt: Date.now(),
          })
          get().updateMetrics()
        },

        retryAction: (actionId) => {
          get().updateAction(actionId, {
            synced: false,
            retryCount: 0,
            error: undefined,
            lastAttempt: undefined,
          })
        },

        clearSyncedActions: () => {
          set((state) => ({
            actions: state.actions.filter(a => !a.synced),
          }))
        },

        // Queue management
        createSyncQueue: (actionIds) => {
          const queueId = generateId()
          const newQueue: SyncQueue = {
            id: queueId,
            actions: actionIds.map(id => get().getActionById(id)!).filter(Boolean),
            status: 'pending',
            retryCount: 0,
          }

          set((state) => ({
            queue: [...state.queue, newQueue],
          }))

          return queueId
        },

        processQueue: async (queueId) => {
          const { queue, isOnline, isSyncing } = get()
          
          if (!isOnline || isSyncing) return

          const targetQueue = queueId 
            ? queue.find(q => q.id === queueId)
            : queue.find(q => q.status === 'pending')

          if (!targetQueue) return

          set({ isSyncing: true, syncProgress: { current: 0, total: targetQueue.actions.length } })

          try {
            // Update queue status
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id ? { ...q, status: 'processing', startTime: Date.now() } : q
              ),
            }))

            // Process actions in order of priority
            const sortedActions = [...targetQueue.actions].sort((a, b) => {
              const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
              return priorityOrder[b.priority] - priorityOrder[a.priority]
            })

            for (let i = 0; i < sortedActions.length; i++) {
              const action = sortedActions[i]
              
              set((state) => ({
                syncProgress: { 
                  current: i + 1, 
                  total: sortedActions.length,
                  currentAction: action.id,
                },
              }))

              // Simulate API call - replace with actual implementation
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // Mark as synced
              get().markActionSynced(action.id)
            }

            // Update queue status
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id 
                  ? { ...q, status: 'completed', endTime: Date.now() }
                  : q
              ),
              lastSyncTime: Date.now(),
            }))

          } catch (error) {
            console.error('Sync queue failed:', error)
            
            set((state) => ({
              queue: state.queue.map(q =>
                q.id === targetQueue.id 
                  ? { ...q, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
                  : q
              ),
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
            ),
          }))
        },

        // Cache management
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
            tags,
          }

          set((state) => {
            const newCache = new Map(state.cache)
            newCache.set(key, cacheEntry)
            return { cache: newCache }
          })

          // Clean up if cache is too large
          get().optimizeStorage()
        },

        getCache: (key) => {
          const cache = get().cache.get(key)
          if (!cache || cache.expiresAt < Date.now()) {
            get().removeCache(key)
            return null
          }

          // Decompress if needed
          if (cache.data && typeof cache.data === 'object' && cache.data.compressed) {
            return decompressData(cache.data)
          }

          return cache.data
        },

        removeCache: (key) => {
          set((state) => {
            const newCache = new Map(state.cache)
            newCache.delete(key)
            return { cache: newCache }
          })
        },

        clearCache: (tags) => {
          set((state) => {
            const newCache = new Map(state.cache)
            
            if (tags && tags.length > 0) {
              // Clear only entries with specified tags
              for (const [key, entry] of newCache) {
                if (entry.tags.some(tag => tags.includes(tag))) {
                  newCache.delete(key)
                }
              }
            } else {
              // Clear all cache
              newCache.clear()
            }
            
            return { cache: newCache }
          })
        },

        cleanExpiredCache: () => {
          const now = Date.now()
          set((state) => {
            const newCache = new Map(state.cache)
            for (const [key, entry] of newCache) {
              if (entry.expiresAt < now) {
                newCache.delete(key)
              }
            }
            return { cache: newCache }
          })
        },

        // Sync management
        startSync: async () => {
          if (!get().isOnline) return
          
          const pendingActions = get().getPendingActions()
          if (pendingActions.length === 0) return

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
            conflicts: [...state.conflicts, conflict],
          }))
        },

        resolveConflict: (actionId, resolution, mergedData) => {
          set((state) => ({
            conflicts: state.conflicts.map(c =>
              c.actionId === actionId 
                ? { ...c, resolution, resolvedAt: Date.now(), mergedData }
                : c
            ),
          }))
        },

        clearResolvedConflicts: () => {
          set((state) => ({
            conflicts: state.conflicts.filter(c => !c.resolvedAt),
          }))
        },

        // Settings management
        updateSettings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
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
              successRate,
            },
          })
        },

        getStorageQuota: async () => {
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate()
            set({
              storageQuota: {
                used: Number(estimate.usage) || 0,
                quota: Number(estimate.quota) || 0,
                percentage: ((Number(estimate.usage) || 0) / (Number(estimate.quota) || 1)) * 100,
              },
            })
          }
        },

        optimizeStorage: async () => {
          const { settings, cache } = get()
          let totalSize = 0
          const entries: Array<{ key: string; size: number; timestamp: number }> = []

          // Calculate total size and collect entries
          for (const [key, entry] of cache) {
            totalSize += entry.size
            entries.push({ key, size: entry.size, timestamp: entry.timestamp })
          }

          // If under limit, no need to optimize
          const maxSizeBytes = settings.cacheMaxSize * 1024 * 1024
          if (totalSize <= maxSizeBytes) return

          // Sort by timestamp (oldest first) and remove oldest entries
          entries.sort((a, b) => a.timestamp - b.timestamp)
          
          let currentSize = totalSize
          const targetSize = maxSizeBytes * 0.8 // Leave 20% buffer

          for (const entry of entries) {
            if (currentSize <= targetSize) break
            
            get().removeCache(entry.key)
            currentSize -= entry.size
          }
        },

        // Background sync
        registerBackgroundSync: async () => {
          if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
              const registration = await navigator.serviceWorker.ready
              await registration.sync.register('emergency-offline-sync')
              set({ bgSyncSupported: true, bgSyncRegistered: true })
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
              const registration = await navigator.serviceWorker.ready
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
            !a.synced && 
            a.retryCount < a.maxRetries &&
            (!priority || a.priority === priority)
          )
        },

        getFailedActions: () => {
          const { actions } = get()
          return actions.filter(a => 
            !a.synced && 
            a.retryCount >= a.maxRetries
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
          set({
            error,
            lastError: {
              message: error,
              timestamp: Date.now(),
              actionId,
            },
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
            lastError: null,
          })
        },
      }),
      {
        name: 'offline-storage',
        partialize: (state) => ({
          settings: state.settings,
          actions: state.actions.filter(a => !a.synced), // Only persist unsynced actions
          cache: Array.from(state.cache.entries()), // Convert Map to array for serialization
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert array back to Map
            state.cache = new Map(state.cache as any)
          }
        },
      }
    )
  )
)

// Selectors for common use cases
export const useOfflineActions = () => useOfflineStore(state => ({
  actions: state.actions,
  pendingActions: state.getPendingActions(),
  failedActions: state.getFailedActions(),
  isSyncing: state.isSyncing,
  syncProgress: state.syncProgress,
}))

export const useOfflineCache = () => useOfflineStore(state => ({
  cache: state.cache,
  cacheSize: state.metrics.cacheSize,
  cacheEntries: state.metrics.cacheEntries,
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
  updateSettings: state.updateSettings,
}))

// Utility exports
export { generateId, estimateDataSize, compressData, decompressData }