/**
 * Convenience selectors for the offline store.
 *
 * Extracted from offlineStore.ts. Each hook subscribes to a narrow slice of
 * the store so components re-render only when their slice changes. The store
 * re-exports these so existing imports continue to work.
 */

import { useOfflineStore } from './offlineStore'

export const useOfflineState = () =>
  useOfflineStore(state => ({
    actions: state.actions,
    pendingActions: state.getPendingActions(),
    failedActions: state.getFailedActions(),
    isSyncing: state.isSyncing,
    syncProgress: state.syncProgress
  }))

export const useOfflineCache = () =>
  useOfflineStore(state => ({
    cache: state.cache,
    cacheSize: state.metrics.cacheSize,
    cacheEntries: state.metrics.cacheEntries
  }))

export const useOfflineMetrics = () => useOfflineStore(state => state.metrics)

export const useOfflineSettings = () => useOfflineStore(state => state.settings)

export const useOfflineActions = () =>
  useOfflineStore(state => ({
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
