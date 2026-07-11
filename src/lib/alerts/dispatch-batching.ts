/**
 * FCM batch processing for the alert dispatch optimizer.
 *
 * Handles high-throughput push notification delivery: token batching, the FCM
 * HTTP v1 fan-out (with per-request retries and exponential backoff), invalid
 * token logging, and the higher-level "push to a set of users" path. Extracted
 * from `alert-dispatch-optimizer.ts`.
 */

import { performanceMonitor } from '../performance/performance-monitor'
import { FCMBatcher, buildFcmV1Message } from '../notifications/fcm-batcher'
import {
  AlertPriority,
  FCMBatchPayload,
  FCMBatchResult,
  FCMSingleNotification
} from './dispatch-types'
import {
  calculateBackoffDelay,
  chunkArray,
  getAPNSExpiration,
  getAPNSPriority,
  getFCMPriority,
  getTTL,
  sleep,
  FCM_BATCH_SIZE,
  FCM_MAX_RETRIES
} from './dispatch-helpers'

/**
 * Batch push-notification processor.
 *
 * `getSupabase` is lazy so module load does not require env vars.
 */
export class AlertBatchProcessor {
  constructor(private readonly getSupabase: () => any) {}

  /**
   * Send a single FCM batch request with retry logic.
   *
   * Migrated from the deprecated legacy endpoint to FCM HTTP v1. The v1 API
   * accepts one message per request, so we fan out per device token and
   * synthesize a legacy-shaped response body so the caller's results parsing
   * keeps working unchanged. OAuth2 access token + project id are read from
   * env; if either is missing we log a clear error rather than silently
   * falling back to the removed legacy endpoint.
   */
  async sendFCMBatchWithRetry(
    payload: FCMBatchPayload,
    retryCount = 0
  ): Promise<{ success: boolean; response?: Response; shouldRetry: boolean }> {
    try {
      const projectId = process.env.FCM_PROJECT_ID
      const accessToken = process.env.FCM_ACCESS_TOKEN
      if (!projectId || !accessToken) {
        console.error(
          'FCM HTTP v1 not configured: set FCM_PROJECT_ID and FCM_ACCESS_TOKEN ' +
            '(access token must be refreshed externally)'
        )
        return { success: false, shouldRetry: false }
      }

      const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
      const tokens = payload.tokens
      // payload.data.priority holds the AlertPriority enum value; fall back to
      // MEDIUM if absent so buildFcmV1Message gets a valid priority.
      const alertPriority = (payload.data.priority as AlertPriority) ?? AlertPriority.MEDIUM

      const perTokenResults = await Promise.all(
        tokens.map(async token => {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(
                buildFcmV1Message(token, payload.notification, payload.data, alertPriority)
              )
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

      const throttled = perTokenResults.some(r => r.status === 429)
      if (throttled) {
        if (retryCount < FCM_MAX_RETRIES) {
          return { success: false, shouldRetry: true }
        }
        return { success: false, shouldRetry: false }
      }

      const syntheticBody = {
        success: perTokenResults.filter(r => r.status === 200).length,
        failure: perTokenResults.filter(r => r.status !== 200).length,
        results: perTokenResults.map(r =>
          r.status === 200 ? { message_id: r.messageId } : { error: r.error }
        )
      }
      const response = new Response(JSON.stringify(syntheticBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
      return { success: true, response, shouldRetry: false }
    } catch {
      if (retryCount < FCM_MAX_RETRIES) {
        return { success: false, shouldRetry: true }
      }
      return { success: false, shouldRetry: false }
    }
  }

  /**
   * Batch push notifications - sends up to 1000 tokens per FCM request.
   * This reduces 500K individual API calls to ~500 batched calls.
   */
  async batchPushNotifications(notifications: FCMSingleNotification[]): Promise<FCMBatchResult> {
    const timerId = performanceMonitor.startTimer('batch_push_notification_send', {
      notification_count: notifications.length.toString()
    })

    const result: FCMBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      invalidTokens: []
    }

    if (notifications.length === 0) {
      return result
    }

    try {
      const tokensWithNotifications = notifications.filter(n => n.tokenId)
      const tokens = tokensWithNotifications.map(n => n.tokenId)

      if (tokens.length === 0) {
        return result
      }

      const firstNotification = tokensWithNotifications[0]
      if (!firstNotification) {
        return result
      }

      const batchPayload: Omit<FCMBatchPayload, 'tokens'> = {
        notification: {
          title: firstNotification.title,
          body: firstNotification.message,
          priority: getFCMPriority(firstNotification.priority),
          ttl: getTTL(firstNotification.priority)
        },
        data: {
          eventId: firstNotification.data.eventId as string,
          type: firstNotification.data.type as string,
          priority: firstNotification.priority,
          ...firstNotification.data
        },
        android: {
          priority: getFCMPriority(firstNotification.priority),
          ttl: getTTL(firstNotification.priority)
        },
        apns: {
          headers: {
            'apns-priority': getAPNSPriority(firstNotification.priority),
            'apns-expiration': getAPNSExpiration(firstNotification.priority)
          }
        }
      }

      const tokenBatches = chunkArray(tokens, FCM_BATCH_SIZE)

      const batchPromises = tokenBatches.map(async batchTokens => {
        let retryCount = 0

        while (retryCount <= FCM_MAX_RETRIES) {
          const payload: FCMBatchPayload = {
            tokens: batchTokens,
            ...batchPayload
          }

          const batchResult = await this.sendFCMBatchWithRetry(payload, retryCount)

          if (batchResult.shouldRetry) {
            retryCount++
            const delay = calculateBackoffDelay(retryCount)
            await sleep(delay)
            continue
          }

          if (!batchResult.success || !batchResult.response) {
            result.failureCount += batchTokens.length
            result.failedTokens.push(...batchTokens)
            return
          }

          try {
            const responseData = await batchResult.response.json()
            const fcmResults = responseData.results as
              | Array<{
                  message_id?: string
                  error?: string
                }>
              | undefined

            if (fcmResults) {
              fcmResults.forEach((fcmResult, index) => {
                const token = batchTokens[index]
                if (!token) {
                  return
                }

                if (fcmResult.message_id) {
                  result.successCount++
                } else if (fcmResult.error) {
                  result.failureCount++
                  result.failedTokens.push(token)

                  const isInvalidToken =
                    fcmResult.error === 'InvalidRegistration' ||
                    fcmResult.error === 'NotRegistered'
                  if (isInvalidToken) {
                    result.invalidTokens.push(token)
                  }
                }
              })
            } else {
              result.successCount += batchTokens.length
            }
          } catch {
            result.successCount += batchTokens.length
          }

          return
        }

        result.failureCount += batchTokens.length
        result.failedTokens.push(...batchTokens)
      })

      await Promise.all(batchPromises)

      if (result.invalidTokens.length > 0) {
        await this.logInvalidTokens(result.invalidTokens)
      }

      performanceMonitor.endTimer(timerId, 'alert', 'batch_push_notification_send')

      return result
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'batch_push_notification_send')
      result.failureCount = notifications.length
      result.failedTokens = notifications.map(n => n.tokenId)
      return result
    }
  }

  /**
   * Send batch push notifications to a set of users (tokenized).
   */
  async sendBatchPushNotifications(
    users: Array<{ userId: string; fcmToken?: string }>,
    alert: {
      title: string
      message: string
      eventId: string
      type: string
      priority: AlertPriority
      data: Record<string, unknown>
    }
  ): Promise<FCMBatchResult> {
    const timerId = performanceMonitor.startTimer('batch_push_to_users', {
      user_count: users.length.toString()
    })

    const result: FCMBatchResult = {
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
      invalidTokens: []
    }

    try {
      const usersWithTokens = users.filter(u => u.fcmToken)
      if (usersWithTokens.length === 0) {
        return result
      }

      const batcher = new FCMBatcher()

      const notification = {
        title: alert.title,
        body: alert.message,
        priority: getFCMPriority(alert.priority),
        ttl: getTTL(alert.priority)
      }

      const data = {
        eventId: alert.eventId,
        type: alert.type,
        priority: alert.priority,
        ...alert.data
      }

      for (const user of usersWithTokens) {
        if (user.fcmToken) {
          batcher.addToken(user.fcmToken, notification, data, alert.priority)
        }
      }

      const batchResults = await batcher.flush()

      for (const batchResult of batchResults) {
        result.successCount += batchResult.successCount
        result.failureCount += batchResult.failureCount
        result.failedTokens.push(...batchResult.failedTokens)
        result.invalidTokens.push(...batchResult.invalidTokens)
      }

      if (result.invalidTokens.length > 0) {
        await this.logInvalidTokens(result.invalidTokens)
      }

      performanceMonitor.endTimer(timerId, 'alert', 'batch_push_to_users')

      return result
    } catch (error) {
      performanceMonitor.endTimer(timerId, 'alert', 'batch_push_to_users')
      result.failureCount = users.length
      return result
    }
  }

  /**
   * Log invalid FCM tokens for later cleanup.
   */
  async logInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await this.getSupabase().from('invalid_fcm_tokens').insert(
        tokens.map(token => ({
          token,
          detected_at: new Date().toISOString(),
          cleanup_status: 'pending'
        }))
      )
    } catch {
      console.error('Failed to log invalid tokens for cleanup')
    }
  }
}
