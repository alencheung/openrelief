import { performanceMonitor } from '../performance/performance-monitor'
import { AlertPriority } from '../alerts/alert-dispatch-optimizer'

const FCM_BATCH_SIZE = 1000
const FCM_MAX_RETRIES = 3
const FCM_BASE_DELAY_MS = 1000
const FCM_MAX_DELAY_MS = 30000

// FCM HTTP v1 API. The legacy endpoint
// (https://fcm.googleapis.com/fcm/send with `key=<serverKey>`) was deprecated
// and shut down by Google; we now target the v1 endpoint with a short-lived
// OAuth2 access token. Because this codebase has no google-auth-library dep,
// the token must be minted/refreshed by external infra and supplied via
// FCM_ACCESS_TOKEN. FCM_SERVER_KEY references have been removed.
function getFcmV1Config(): { projectId: string; accessToken: string; endpoint: string } {
  const projectId = process.env.FCM_PROJECT_ID
  const accessToken = process.env.FCM_ACCESS_TOKEN
  if (!projectId || !accessToken) {
    throw new Error(
      'FCM HTTP v1 not configured: set FCM_PROJECT_ID and FCM_ACCESS_TOKEN ' +
        '(access token must be refreshed externally)'
    )
  }
  return {
    projectId,
    accessToken,
    endpoint: `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  }
}

// Transform the legacy FCM payload shape (notification + data + android/apns)
// into the FCM HTTP v1 message envelope. Exported so callers (e.g.
// alert-dispatch-optimizer) can reuse the same shape without duplicating it.
export function buildFcmV1Message(
  token: string,
  notification: FCMNotification,
  data: Record<string, unknown>,
  priority: AlertPriority
): Record<string, unknown> {
  // v1 data values must be strings.
  const stringifiedData: Record<string, string> = {
    priority,
    ...Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    )
  }

  return {
    message: {
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: stringifiedData,
      android: {
        priority: notification.priority,
        ttl: `${notification.ttl}s`
      },
      apns: {
        headers: {
          'apns-priority': getAPNSPriorityForPriority(priority),
          'apns-expiration': getAPNSExpirationForTtl(notification.ttl)
        }
      }
    }
  }
}

function getAPNSPriorityForPriority(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL:
    case AlertPriority.HIGH:
      return '10'
    default:
      return '5'
  }
}

function getAPNSExpirationForTtl(ttlSeconds: number): string {
  const expirationDate = new Date(Date.now() + ttlSeconds * 1000)
  return expirationDate.toISOString()
}

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

  constructor(options?: { batchSize?: number; maxRetries?: number }) {
    this.batchSize = options?.batchSize ?? FCM_BATCH_SIZE
    this.maxRetries = options?.maxRetries ?? FCM_MAX_RETRIES
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
    // FCM HTTP v1 accepts a single message per request, so we fan out per
    // token and synthesize a legacy-shaped response body so processFCMResponse
    // keeps working unchanged.
    const { endpoint, accessToken } = getFcmV1Config()

    const results = await Promise.all(
      tokens.map(async token => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildFcmV1Message(token, notification, data, priority))
          })
          if (response.status === 429) {
            return { token, status: 429, error: 'THROTTLED' }
          }
          if (!response.ok) {
            let errorMsg = `HTTP_${response.status}`
            try {
              const errBody = await response.json()
              if (errBody?.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
                errorMsg = 'NotRegistered'
              } else if (errBody?.error?.status === 'INVALID_ARGUMENT') {
                errorMsg = 'InvalidRegistration'
              }
            } catch {
              // keep generic error
            }
            return { token, status: response.status, error: errorMsg }
          }
          const body = await response.json().catch(() => ({}))
          return { token, status: 200, messageId: body?.name ?? `${token}:${Date.now()}` }
        } catch (error) {
          return {
            token,
            status: 0,
            error: error instanceof Error ? error.message : 'fetch_error'
          }
        }
      })
    )

    const syntheticBody = {
      success: results.filter(r => r.status === 200).length,
      failure: results.filter(r => r.status !== 200).length,
      results: results.map(r =>
        r.status === 200 ? { message_id: r.messageId } : { error: r.error }
      )
    }

    const overallStatus = results.some(r => r.status === 429) ? 429 : 200
    return new Response(JSON.stringify(syntheticBody), {
      status: overallStatus,
      headers: { 'Content-Type': 'application/json' }
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
}

export const fcmBatcher = new FCMBatcher()

export default FCMBatcher
