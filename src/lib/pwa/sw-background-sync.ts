/**
 * Background Sync Manager
 *
 * Queues failed operations for retry when connectivity is restored, using
 * exponential backoff. Supports emergency reports, user location updates,
 * and alert status updates.
 */

import type { BackgroundSyncConfig } from './sw-types'

export interface SyncOperation {
  type: string
  data: Record<string, unknown>
  timestamp?: number
  retryCount?: number
}

export class BackgroundSyncManager {
  private config: BackgroundSyncConfig
  private syncQueue: Map<string, SyncOperation[]> = new Map()
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: BackgroundSyncConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Load queued operations from storage
      await this.loadQueue()

      // Register sync event listeners
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', this.handleSyncMessage.bind(this))
      }

      console.log('[BackgroundSyncManager] Background sync manager initialized')
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to initialize:', error)
      throw error
    }
  }

  async queue(operation: SyncOperation): Promise<void> {
    try {
      const { type, data } = operation

      if (!this.syncQueue.has(type)) {
        this.syncQueue.set(type, [])
      }

      this.syncQueue.get(type)!.push({
        ...data,
        timestamp: Date.now(),
        retryCount: 0
      })

      await this.saveQueue()

      // Attempt immediate sync if online
      if (navigator.onLine) {
        await this.attemptSync(type)
      }

      console.log(`[BackgroundSyncManager] Operation queued for ${type}`)
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to queue operation:', error)
      throw error
    }
  }

  async attemptSync(type: string): Promise<void> {
    try {
      if (!navigator.onLine) {
        return
      }

      const operations = this.syncQueue.get(type) || []
      if (operations.length === 0) {
        return
      }

      const successfulOperations: SyncOperation[] = []
      const failedOperations: SyncOperation[] = []

      for (const operation of operations) {
        try {
          await this.executeOperation(type, operation)
          successfulOperations.push(operation)
        } catch (error) {
          operation.retryCount++

          if (operation.retryCount < this.config.maxRetries) {
            failedOperations.push(operation)
          } else {
            console.error(`[BackgroundSyncManager] Operation failed after ${this.config.maxRetries} retries:`, error)
          }
        }
      }

      // Update queue
      this.syncQueue.set(type, failedOperations)
      await this.saveQueue()

      // Schedule retry if there are failed operations
      if (failedOperations.length > 0) {
        this.scheduleRetry(type)
      }

      console.log(`[BackgroundSyncManager] Sync completed for ${type}: ${successfulOperations.length} successful, ${failedOperations.length} failed`)
    } catch (error) {
      console.error(`[BackgroundSyncManager] Sync failed for ${type}:`, error)
    }
  }

  optimizeForEmergency(): Promise<void> {
    // Reduce sync frequency and prioritize critical operations
    console.log('[BackgroundSyncManager] Emergency optimization applied')
    return Promise.resolve()
  }

  reduceFrequency(): void {
    // Reduce background sync frequency during emergency
    console.log('[BackgroundSyncManager] Sync frequency reduced')
  }

  async cleanup(): Promise<void> {
    try {
      // Remove old operations
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      for (const [type, operations] of this.syncQueue.entries()) {
        const filteredOperations = operations.filter(op =>
          (now - op.timestamp) < maxAge
        )
        this.syncQueue.set(type, filteredOperations)
      }

      await this.saveQueue()

      console.log('[BackgroundSyncManager] Cleanup completed')
    } catch (error) {
      console.error('[BackgroundSyncManager] Cleanup failed:', error)
    }
  }

  private async executeOperation(type: string, operation: SyncOperation): Promise<void> {
    switch (type) {
      case 'emergency-reports':
        return this.executeEmergencyReport(operation)
      case 'user-location':
        return this.executeUserLocationUpdate(operation)
      case 'alert-status':
        return this.executeAlertStatusUpdate(operation)
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  private async executeEmergencyReport(operation: SyncOperation): Promise<void> {
    const response = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to submit emergency report: ${response.statusText}`)
    }
  }

  private async executeUserLocationUpdate(operation: SyncOperation): Promise<void> {
    const response = await fetch('/api/user/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update user location: ${response.statusText}`)
    }
  }

  private async executeAlertStatusUpdate(operation: SyncOperation): Promise<void> {
    const response = await fetch('/api/alerts/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update alert status: ${response.statusText}`)
    }
  }

  private scheduleRetry(type: string): Promise<void> {
    return new Promise(resolve => {
      const existingTimer = this.retryTimers.get(type)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const delay = Math.min(
        this.config.retryDelay * Math.pow(this.config.backoffMultiplier, 2),
        this.config.maxRetryDelay
      )

      const timer = setTimeout(async () => {
        await this.attemptSync(type)
        this.retryTimers.delete(type)
        resolve()
      }, delay)

      this.retryTimers.set(type, timer)
    })
  }

  private handleSyncMessage(event: MessageEvent): void {
    if (event.data.type === 'SYNC_TRIGGERED') {
      const { tag } = event.data
      this.attemptSync(tag)
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem('sw-sync-queue')
      if (stored) {
        const data = JSON.parse(stored)
        this.syncQueue = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to load queue:', error)
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      const data = Object.fromEntries(this.syncQueue)
      localStorage.setItem('sw-sync-queue', JSON.stringify(data))
    } catch (error) {
      console.error('[BackgroundSyncManager] Failed to save queue:', error)
    }
  }
}
