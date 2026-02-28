import { performanceMonitor } from '../performance/performance-monitor'
import { AlertPriority } from '../alerts/alert-dispatch-optimizer'

const FCM_BATCH_SIZE = 1000
const FCM_MAX_RETRIES = 3
const FCM_BASE_DELAY_MS = 1000
const FCM_MAX_DELAY_MS = 30000
const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send'

export interface FCMNotification {
  title: string
  body: string
  priority: string
  ttl: number
}

export interface FCMBatchResult {
  successCount: number
  failureCount: number
  failedTokens: string[]
  invalidTokens: string[]
}

interface QueuedNotification {
  token: string
  notification: FCMNotification
  data: Record<string, unknown>
  priority: AlertPriority
}

interface FCMResponse {
  success?: number
  failure?: number
  results?: Array<{
    message_id?: string
    error?: string
  }>
}

interface BatchGroup {
  notifications: QueuedNotification[]
  notification: FCMNotification
  data: Record<string, unknown>
  priority: AlertPriority
}

export class FCMBatcher {
  private queue: QueuedNotification[] = []
  private batchSize: number
  private maxRetries: number
  private serverKey: string | undefined

  constructor(options?: { batchSize?: number; maxRetries?: number; serverKey?: string }) {
    this.batchSize = options?.batchSize ?? FCM_BATCH_SIZE
    this.maxRetries = options?.maxRetries ?? FCM_MAX_RETRIES
    this.serverKey = options?.serverKey ?? process.env.FCM_SERVER_KEY
  }

  addToken(
    token: string,
    notification: FCMNotification,
    data: Record<string, unknown> = {},
    priority: AlertPriority = AlertPriority.MEDIUM
  ): void {
    if (!token) {
      return
    }

    this.queue.push({
      token,
      notification,
      data,
      priority
    })
  }

  getBatchCount(): number {
    return Math.ceil(this.queue.length / this.batchSize)
  }

  getQueueLength(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
  }

  async flush(): Promise<FCMBatchResult[]> {
    if (this.queue.length === 0) {
      return []
    }

    const timerId = performanceMonitor.startTimer('fcm_batcher_flush', {
      queue_length: this.queue.length.toString()
    })

    const groups = this.groupByNotification()
    const results: FCMBatchResult[] = []

    const batchPromises = groups.map(async group => {
      const result = await this.processBatchGroup(group)
      results.push(result)
      return result
    })

    await Promise.allSettled(batchPromises)

    this.queue = []

    performanceMonitor.endTimer(timerId, 'alert', 'fcm_batcher_flush')

    return results
  }

  private groupByNotification(): BatchGroup[] {
    const groups = new Map<string, BatchGroup>()

    for (const item of this.queue) {
      const key = this.createNotificationKey(item.notification, item.data, item.priority)

      if (!groups.has(key)) {
        groups.set(key, {
          notifications: [],
          notification: item.notification,
          data: item.data,
          priority: item.priority
        })
      }

      groups.get(key)!.notifications.push(item)
    }

    return Array.from(groups.values())
  }

  private createNotificationKey(
    notification: FCMNotification,
    data: Record<string, unknown>,
    priority: AlertPriority
  ): string {
    const dataKey = Object.entries(data)
      .filter(([k]) => k !== 'timestamp')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|')

    return `${notification.title}|${notification.body}|${priority}|${dataKey}`
  }

  private async processBatchGroup(group: BatchGroup): Promise<FCMBatchResult> {
    const result: FCMBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      invalidTokens: []
    }

    const tokens = group.notifications.map(n => n.token)
    const tokenBatches = this.chunkArray(tokens, this.batchSize)

    const batchPromises = tokenBatches.map(async batchTokens => {
      const batchResult = await this.sendBatchWithRetry(
        batchTokens,
        group.notification,
        group.data,
        group.priority
      )

      result.successCount += batchResult.successCount
      result.failureCount += batchResult.failureCount
      result.failedTokens.push(...batchResult.failedTokens)
      result.invalidTokens.push(...batchResult.invalidTokens)
    })

    await Promise.allSettled(batchPromises)

    return result
  }

  private async sendBatchWithRetry(
    tokens: string[],
    notification: FCMNotification,
    data: Record<string, unknown>,
    priority: AlertPriority
  ): Promise<FCMBatchResult> {
    const result: FCMBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      invalidTokens: []
    }

    let retryCount = 0

    while (retryCount <= this.maxRetries) {
      const response = await this.sendFCMRequest(tokens, notification, data, priority)

      if (response.status === 429) {
        retryCount++
        if (retryCount <= this.maxRetries) {
          const delay = this.calculateBackoffDelay(retryCount)
          await this.sleep(delay)
          continue
        }
        result.failureCount += tokens.length
        result.failedTokens.push(...tokens)
        return result
      }

      if (!response.ok) {
        retryCount++
        if (retryCount <= this.maxRetries) {
          const delay = this.calculateBackoffDelay(retryCount)
          await this.sleep(delay)
          continue
        }
        result.failureCount += tokens.length
        result.failedTokens.push(...tokens)
        return result
      }

      try {
        const responseData: FCMResponse = await response.json()
        this.processFCMResponse(responseData, tokens, result)
      } catch {
        result.successCount += tokens.length
      }

      return result
    }

    result.failureCount += tokens.length
    result.failedTokens.push(...tokens)
    return result
  }

  private async sendFCMRequest(
    tokens: string[],
    notification: FCMNotification,
    data: Record<string, unknown>,
    priority: AlertPriority
  ): Promise<Response> {
    if (!this.serverKey) {
      throw new Error('FCM_SERVER_KEY is not configured')
    }

    const payload = {
      registration_ids: tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        ttl: notification.ttl
      },
      data: {
        priority,
        ...data
      },
      android: {
        priority: notification.priority,
        ttl: notification.ttl
      },
      apns: {
        headers: {
          'apns-priority': this.getAPNSPriority(priority),
          'apns-expiration': this.getAPNSExpiration(notification.ttl)
        }
      }
    }

    return fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `key=${this.serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  }

  private processFCMResponse(
    responseData: FCMResponse,
    tokens: string[],
    result: FCMBatchResult
  ): void {
    if (!responseData.results) {
      if (responseData.success !== undefined) {
        result.successCount = responseData.success
      }
      if (responseData.failure !== undefined) {
        result.failureCount = responseData.failure
      }
      if (responseData.failure && responseData.failure > 0) {
        const unknownFailures = tokens.slice(
          result.successCount,
          result.successCount + responseData.failure
        )
        result.failedTokens.push(...unknownFailures)
      }
      return
    }

    responseData.results.forEach((fcmResult, index) => {
      const token = tokens[index]
      if (!token) {
        return
      }

      if (fcmResult.message_id) {
        result.successCount++
      } else if (fcmResult.error) {
        result.failureCount++
        result.failedTokens.push(token)

        if (fcmResult.error === 'InvalidRegistration' || fcmResult.error === 'NotRegistered') {
          result.invalidTokens.push(token)
        }
      }
    })
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(FCM_BASE_DELAY_MS * Math.pow(2, retryCount), FCM_MAX_DELAY_MS)
    return delay + Math.random() * 500
  }

  private getAPNSPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL:
      case AlertPriority.HIGH:
        return '10'
      default:
        return '5'
    }
  }

  private getAPNSExpiration(ttlSeconds: number): string {
    const expirationDate = new Date(Date.now() + ttlSeconds * 1000)
    return expirationDate.toISOString()
  }
}

export const fcmBatcher = new FCMBatcher()

export default FCMBatcher
