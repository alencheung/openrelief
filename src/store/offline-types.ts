/**
 * Type definitions for the offline store.
 *
 * Extracted from offlineStore.ts so the store file stays focused on state
 * management and remains under the 500 line lint budget.
 */

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'confirm' | 'dispute'
  table: string
  data: unknown
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
  data: unknown
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
  localData: unknown
  remoteData: unknown
  resolution: 'local' | 'remote' | 'merge' | 'manual'
  resolvedAt?: number
  mergedData?: unknown
}

/** Shape persisted by `setCache` options. */
export interface SetCacheOptions {
  expiresAt?: number
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
}

/** Priority ranking used when ordering a sync queue. */
export const PRIORITY_ORDER: Record<OfflineAction['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

/**
 * Shape produced by {@link compressData} when the browser supports
 * CompressionStream. Otherwise the raw value is returned unchanged.
 */
export interface CompressedPayload {
  compressed: true
  data: number[]
  originalSize: number
}

// Offline Store State
export interface OfflineState {
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
export interface OfflineActions {
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
  setCache: (key: string, data: unknown, options?: SetCacheOptions) => Promise<void>
  getCache: (key: string) => unknown
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
  resolveConflict: (actionId: string, resolution: ConflictResolution['resolution'], mergedData?: unknown) => void
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

export type OfflineStore = OfflineState & OfflineActions

// Default settings
export const defaultSettings: OfflineSettings = {
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

/** The initial state slice (data only — actions are defined in the store). */
export const initialOfflineState: Pick<
  OfflineState,
  | 'actions'
  | 'queue'
  | 'cache'
  | 'settings'
  | 'isOnline'
  | 'isSyncing'
  | 'syncProgress'
  | 'lastSyncTime'
  | 'conflicts'
  | 'metrics'
  | 'storageQuota'
  | 'bgSyncSupported'
  | 'bgSyncRegistered'
  | 'error'
  | 'lastError'
> = {
  actions: [],
  queue: [],
  cache: new Map(),
  settings: defaultSettings,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  syncProgress: { current: 0, total: 0 },
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
  storageQuota: { used: 0, quota: 0, percentage: 0 },
  bgSyncSupported: false,
  bgSyncRegistered: false,
  error: null,
  lastError: null
}
