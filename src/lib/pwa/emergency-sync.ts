/**
 * Emergency Sync Module for Offline Emergency Reports
 * Handles background sync, conflict resolution, and retry logic with exponential backoff
 */

import { supabase } from '../supabase'

export interface OfflineEmergencyReport {
  id: string
  data: {
    title: string
    description: string
    type_id: number
    severity: number
    location: { lat: number; lng: number } | null
    reporter_id: string | null
    status?: string
    metadata?: Record<string, unknown>
  }
  timestamp: number
  retryCount: number
  lastAttempt?: number
  syncStatus: 'pending' | 'syncing' | 'failed' | 'conflict'
  serverId?: string
  conflictData?: ConflictData
}

export interface ConflictData {
  serverVersion: OfflineEmergencyReport['data']
  localVersion: OfflineEmergencyReport['data']
  resolutionStrategy: 'server_wins' | 'local_wins' | 'merge' | 'manual'
  resolvedFields?: string[]
}

export interface SyncResult {
  success: boolean
  reportId: string
  serverId?: string
  error?: string
  conflict?: ConflictData
}

export interface SyncConfig {
  maxRetries: number
  baseRetryDelay: number
  maxRetryDelay: number
  backoffMultiplier: number
  batchSize: number
  conflictResolutionStrategy: ConflictData['resolutionStrategy']
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 10,
  baseRetryDelay: 1000,
  maxRetryDelay: 300000,
  backoffMultiplier: 2,
  batchSize: 5,
  conflictResolutionStrategy: 'merge'
}

class EmergencySyncManager {
  private static instance: EmergencySyncManager
  private config: SyncConfig
  private pendingReports: Map<string, OfflineEmergencyReport> = new Map()
  private syncInProgress: boolean = false
  private db: IDBDatabase | null = null
  private listeners: Set<(event: SyncEvent) => void> = new Set()

  private constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeDB()
  }

  static getInstance(config?: Partial<SyncConfig>): EmergencySyncManager {
    if (!EmergencySyncManager.instance) {
      EmergencySyncManager.instance = new EmergencySyncManager(config)
    }
    return EmergencySyncManager.instance
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EmergencySyncDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.loadPendingReports()
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('pending_reports')) {
          const store = db.createObjectStore('pending_reports', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('syncStatus', 'syncStatus', { unique: false })
          store.createIndex('retryCount', 'retryCount', { unique: false })
        }
      }
    })
  }

  private async loadPendingReports(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_reports'], 'readonly')
      const store = transaction.objectStore('pending_reports')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const reports = request.result as OfflineEmergencyReport[]
        this.pendingReports.clear()
        reports.forEach(report => {
          this.pendingReports.set(report.id, report)
        })
        this.notifyListeners({ type: 'reports_loaded', count: reports.length })
        resolve()
      }
    })
  }

  private async saveReport(report: OfflineEmergencyReport): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_reports'], 'readwrite')
      const store = transaction.objectStore('pending_reports')
      const request = store.put(report)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async deleteReport(reportId: string): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_reports'], 'readwrite')
      const store = transaction.objectStore('pending_reports')
      const request = store.delete(reportId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async queueReport(data: OfflineEmergencyReport['data']): Promise<OfflineEmergencyReport> {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const report: OfflineEmergencyReport = {
      id,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      syncStatus: 'pending'
    }

    this.pendingReports.set(id, report)
    await this.saveReport(report)

    this.notifyListeners({ type: 'report_queued', reportId: id })

    if (navigator.onLine) {
      this.sync()
    }

    return report
  }

  async sync(): Promise<SyncResult[]> {
    if (this.syncInProgress) {
      return []
    }

    this.syncInProgress = true
    this.notifyListeners({ type: 'sync_started' })

    const results: SyncResult[] = []
    const pendingArray = Array.from(this.pendingReports.values())
      .filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, this.config.batchSize)

    for (const report of pendingArray) {
      const result = await this.syncReport(report)
      results.push(result)
    }

    this.syncInProgress = false
    this.notifyListeners({ type: 'sync_completed', results })

    return results
  }

  private async syncReport(report: OfflineEmergencyReport): Promise<SyncResult> {
    try {
      report.syncStatus = 'syncing'
      await this.saveReport(report)

      const existingServerRecord = await this.checkForServerRecord(report)

      if (existingServerRecord && report.serverId) {
        const conflict = await this.detectConflict(report, existingServerRecord)

        if (conflict) {
          report.syncStatus = 'conflict'
          report.conflictData = conflict
          await this.saveReport(report)
          this.notifyListeners({ type: 'conflict_detected', reportId: report.id, conflict })

          return {
            success: false,
            reportId: report.id,
            conflict
          }
        }

        return await this.updateServerRecord(report)
      }

      return await this.createServerRecord(report)
    } catch (error) {
      return await this.handleSyncError(report, error)
    }
  }

  private async checkForServerRecord(
    report: OfflineEmergencyReport
  ): Promise<Record<string, unknown> | null> {
    if (!report.serverId) {
      return null
    }

    const { data, error } = await supabase
      .from('emergency_events')
      .select('*')
      .eq('id', report.serverId)
      .single()

    if (error || !data) {
      return null
    }
    return data
  }

  private async detectConflict(
    report: OfflineEmergencyReport,
    serverRecord: Record<string, unknown>
  ): Promise<ConflictData | null> {
    const serverUpdatedAt = new Date(serverRecord.updated_at as string).getTime()
    const localTimestamp = report.timestamp

    if (serverUpdatedAt <= localTimestamp) {
      return null
    }

    const conflictFields: string[] = []
    const serverVersion = serverRecord as unknown as OfflineEmergencyReport['data']
    const localVersion = report.data

    if (serverVersion.title !== localVersion.title) {
      conflictFields.push('title')
    }
    if (serverVersion.description !== localVersion.description) {
      conflictFields.push('description')
    }
    if (serverVersion.severity !== localVersion.severity) {
      conflictFields.push('severity')
    }
    if (serverVersion.status !== localVersion.status) {
      conflictFields.push('status')
    }

    if (conflictFields.length === 0) {
      return null
    }

    return {
      serverVersion,
      localVersion,
      resolutionStrategy: this.config.conflictResolutionStrategy,
      resolvedFields: conflictFields
    }
  }

  private async resolveConflict(
    report: OfflineEmergencyReport,
    strategy?: ConflictData['resolutionStrategy']
  ): Promise<OfflineEmergencyReport['data']> {
    const conflict = report.conflictData
    if (!conflict) {
      return report.data
    }

    const resolutionStrategy = strategy || this.config.conflictResolutionStrategy

    switch (resolutionStrategy) {
      case 'server_wins':
        return conflict.serverVersion

      case 'local_wins':
        return conflict.localVersion

      case 'merge':
        return {
          ...conflict.serverVersion,
          ...conflict.localVersion,
          metadata: {
            ...conflict.serverVersion.metadata,
            ...conflict.localVersion.metadata,
            _conflict_resolved: true,
            _resolution_strategy: 'merge',
            _resolved_at: new Date().toISOString()
          }
        }

      case 'manual':
      default:
        return report.data
    }
  }

  private async createServerRecord(report: OfflineEmergencyReport): Promise<SyncResult> {
    const { data, error } = await supabase
      .from('emergency_events')
      .insert({
        ...report.data,
        created_at: new Date(report.timestamp).toISOString(),
        updated_at: new Date().toISOString()
      } as never)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create server record: ${error.message}`)
    }

    const serverId = (data as unknown as { id: string }).id
    report.serverId = serverId
    report.syncStatus = 'pending'
    await this.deleteReport(report.id)
    this.pendingReports.delete(report.id)

    this.notifyListeners({ type: 'report_synced', reportId: report.id, serverId })

    return {
      success: true,
      reportId: report.id,
      serverId
    }
  }

  private async updateServerRecord(report: OfflineEmergencyReport): Promise<SyncResult> {
    if (!report.serverId) {
      return this.createServerRecord(report)
    }

    const resolvedData = report.conflictData ? await this.resolveConflict(report) : report.data

    const { data, error } = await supabase
      .from('emergency_events')
      .update({
        ...resolvedData,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', report.serverId)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to update server record: ${error.message}`)
    }

    const serverId = (data as unknown as { id: string }).id
    await this.deleteReport(report.id)
    this.pendingReports.delete(report.id)

    this.notifyListeners({ type: 'report_synced', reportId: report.id, serverId })

    return {
      success: true,
      reportId: report.id,
      serverId
    }
  }

  private async handleSyncError(
    report: OfflineEmergencyReport,
    error: unknown
  ): Promise<SyncResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    report.retryCount++
    report.lastAttempt = Date.now()

    if (report.retryCount >= this.config.maxRetries) {
      report.syncStatus = 'failed'
      await this.saveReport(report)

      this.notifyListeners({
        type: 'report_failed',
        reportId: report.id,
        error: errorMessage,
        retryCount: report.retryCount
      })

      return {
        success: false,
        reportId: report.id,
        error: `Max retries exceeded: ${errorMessage}`
      }
    }

    report.syncStatus = 'failed'
    await this.saveReport(report)

    const delay = this.calculateRetryDelay(report.retryCount)
    this.scheduleRetry(report.id, delay)

    return {
      success: false,
      reportId: report.id,
      error: errorMessage
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.baseRetryDelay * Math.pow(this.config.backoffMultiplier, retryCount)
    const jitter = Math.random() * 0.1 * delay
    return Math.min(delay + jitter, this.config.maxRetryDelay)
  }

  private scheduleRetry(reportId: string, delay: number): void {
    setTimeout(() => {
      const report = this.pendingReports.get(reportId)
      if (report && report.syncStatus === 'failed' && navigator.onLine) {
        this.syncReport(report)
      }
    }, delay)
  }

  async resolveConflictManually(
    reportId: string,
    resolution: Partial<OfflineEmergencyReport['data']>,
    strategy: ConflictData['resolutionStrategy'] = 'manual'
  ): Promise<SyncResult> {
    const report = this.pendingReports.get(reportId)
    if (!report || !report.conflictData) {
      return {
        success: false,
        reportId,
        error: 'Report not found or no conflict exists'
      }
    }

    report.data = {
      ...report.data,
      ...resolution,
      metadata: {
        ...report.data.metadata,
        _conflict_resolved: true,
        _resolution_strategy: strategy,
        _resolved_at: new Date().toISOString()
      }
    }

    delete report.conflictData
    report.syncStatus = 'pending'
    await this.saveReport(report)

    return this.syncReport(report)
  }

  getPendingReports(): OfflineEmergencyReport[] {
    return Array.from(this.pendingReports.values())
  }

  getConflictingReports(): OfflineEmergencyReport[] {
    return Array.from(this.pendingReports.values()).filter(r => r.syncStatus === 'conflict')
  }

  getReport(reportId: string): OfflineEmergencyReport | undefined {
    return this.pendingReports.get(reportId)
  }

  async removeReport(reportId: string): Promise<void> {
    await this.deleteReport(reportId)
    this.pendingReports.delete(reportId)
    this.notifyListeners({ type: 'report_removed', reportId })
  }

  subscribe(callback: (event: SyncEvent) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(event: SyncEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[EmergencySync] Listener error:', error)
      }
    })
  }
}

export interface SyncEvent {
  type:
    | 'reports_loaded'
    | 'report_queued'
    | 'sync_started'
    | 'sync_completed'
    | 'report_synced'
    | 'report_failed'
    | 'conflict_detected'
    | 'report_removed'
  reportId?: string
  serverId?: string
  count?: number
  results?: SyncResult[]
  error?: string
  retryCount?: number
  conflict?: ConflictData
}

export const emergencySync = EmergencySyncManager.getInstance()

export function useEmergencySync() {
  return {
    queueReport: emergencySync.queueReport.bind(emergencySync),
    sync: emergencySync.sync.bind(emergencySync),
    getPendingReports: emergencySync.getPendingReports.bind(emergencySync),
    getConflictingReports: emergencySync.getConflictingReports.bind(emergencySync),
    getReport: emergencySync.getReport.bind(emergencySync),
    removeReport: emergencySync.removeReport.bind(emergencySync),
    resolveConflictManually: emergencySync.resolveConflictManually.bind(emergencySync),
    subscribe: emergencySync.subscribe.bind(emergencySync)
  }
}

export default emergencySync
