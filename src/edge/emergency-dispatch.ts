/**
 * Cloudflare Edge Function for Emergency Alert Dispatch
 *
 * Provides low-latency emergency alert routing and geographic edge processing
 * Meets <100ms latency requirement for critical emergency communications
 */

import { Request, Response } from '@cloudflare/workers-types'

// Types
interface EmergencyEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  location: {
    latitude: number
    longitude: number
    radius: number
  }
  trustWeight: number
  timestamp: number
  requiresAction: boolean
  metadata?: Record<string, any>
}

interface UserLocation {
  userId: string
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  isActive: boolean
}

interface AlertTarget {
  userId: string
  deviceId: string
  pushToken: string
  location: UserLocation
  preferences: {
    emergencyTypes: string[]
    minSeverity: string
    quietHours: {
      enabled: boolean
      start: string
      end: string
      timezone: string
    }
    maxDistance: number
  }
  lastActive: number
}

interface DispatchResult {
  success: boolean
  targetsReached: number
  targetsSkipped: number
  errors: string[]
  executionTime: number
  region: string
}

// Geographic edge routing
const EDGE_REGIONS = {
  'us-east': ['New York', 'Boston', 'Washington DC'],
  'us-west': ['San Francisco', 'Los Angeles', 'Seattle'],
  'eu-west': ['London', 'Paris', 'Amsterdam'],
  'eu-central': ['Frankfurt', 'Zurich', 'Prague'],
  'asia-east': ['Tokyo', 'Seoul', 'Hong Kong'],
  'asia-southeast': ['Singapore', 'Bangkok', 'Jakarta'],
  australia: ['Sydney', 'Melbourne', 'Brisbane']
}

// Distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
    + Math.cos(φ1) * Math.cos(φ2)
    * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Get edge region from coordinates
function getEdgeRegion(latitude: number, longitude: number): string {
  // Simple geographic routing based on coordinates
  if (latitude > 30 && longitude > -125 && longitude < -65) {
    return 'us-east'
  } else if (latitude > 30 && longitude >= -125 && longitude < -100) {
    return 'us-west'
  } else if (latitude > 40 && longitude > -10 && longitude < 30) {
    return 'eu-west'
  } else if (latitude > 45 && longitude >= 10 && longitude < 25) {
    return 'eu-central'
  } else if (latitude > 20 && longitude > 100 && longitude < 150) {
    return 'asia-east'
  } else if (latitude > -10 && latitude < 20 && longitude > 90 && longitude < 140) {
    return 'asia-southeast'
  } else if (latitude < -10 && longitude > 110 && longitude < 160) {
    return 'australia'
  }

  return 'us-east' // Default
}

// Check if user is in quiet hours
function isInQuietHours(userPreferences: any, timestamp: number): boolean {
  if (!userPreferences.quietHours.enabled) {
    return false
  }

  const date = new Date(timestamp)
  const currentTime = date.getHours() * 60 + date.getMinutes()

  const [startHour, startMin] = userPreferences.quietHours.start.split(':').map(Number)
  const [endHour, endMin] = userPreferences.quietHours.end.split(':').map(Number)

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime
  } else {
    return currentTime >= startTime || currentTime <= endTime
  }
}

// Filter targets for emergency
function filterTargets(
  targets: AlertTarget[],
  emergency: EmergencyEvent,
  region: string
): { eligible: AlertTarget[]; skipped: AlertTarget[] } {
  const eligible: AlertTarget[] = []
  const skipped: AlertTarget[] = []

  for (const target of targets) {
    let shouldSkip = false
    let skipReason = ''

    // Check if user is active
    const timeSinceActive = Date.now() - target.lastActive
    if (timeSinceActive > 7 * 24 * 60 * 60 * 1000) { // 7 days
      shouldSkip = true
      skipReason = 'inactive_user'
    }

    // Check emergency type preferences
    if (!target.preferences.emergencyTypes.includes(emergency.type)) {
      shouldSkip = true
      skipReason = 'type_preference'
    }

    // Check severity preferences
    const severityLevels = ['low', 'medium', 'high', 'critical']
    const userMinLevel = severityLevels.indexOf(target.preferences.minSeverity)
    const emergencyLevel = severityLevels.indexOf(emergency.severity)

    if (emergencyLevel < userMinLevel) {
      shouldSkip = true
      skipReason = 'severity_preference'
    }

    // Check quiet hours (unless critical)
    if (emergency.severity !== 'critical' && isInQuietHours(target.preferences, emergency.timestamp)) {
      shouldSkip = true
      skipReason = 'quiet_hours'
    }

    // Check distance
    const distance = calculateDistance(
      emergency.location.latitude,
      emergency.location.longitude,
      target.location.latitude,
      target.location.longitude
    )

    if (distance > target.preferences.maxDistance) {
      shouldSkip = true
      skipReason = 'distance'
    }

    // Check location accuracy
    if (target.location.accuracy > 1000) { // 1km accuracy threshold
      shouldSkip = true
      skipReason = 'poor_location'
    }

    if (shouldSkip) {
      skipped.push({ ...target, metadata: { skipReason } })
    } else {
      eligible.push(target)
    }
  }

  return { eligible, skipped }
}

// Send push notification
async function sendPushNotification(
  target: AlertTarget,
  emergency: EmergencyEvent,
  env: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      emergencyId: emergency.id,
      type: 'emergency',
      severity: emergency.severity,
      title: emergency.title,
      message: emergency.message,
      location: emergency.location,
      requiresAction: emergency.requiresAction,
      timestamp: emergency.timestamp,
      trustWeight: emergency.trustWeight,
      distance: calculateDistance(
        emergency.location.latitude,
        emergency.location.longitude,
        target.location.latitude,
        target.location.longitude
      )
    }

    // Use Cloudflare Workers to send push via appropriate service
    const pushService = env.PUSH_SERVICE_URL
    const response = await fetch(pushService, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.PUSH_SERVICE_KEY}`
      },
      body: JSON.stringify({
        tokens: [target.pushToken],
        payload,
        priority: emergency.severity === 'critical' ? 'high' : 'normal',
        ttl: emergency.severity === 'critical' ? 0 : 3600 // 0 for critical, 1 hour for others
      })
    })

    if (!response.ok) {
      throw new Error(`Push service error: ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Main edge function
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now()

    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
      }

      const emergency: EmergencyEvent = await request.json()

      // Validate emergency data
      if (!emergency.id || !emergency.location || !emergency.severity) {
        return new Response('Invalid emergency data', { status: 400 })
      }

      // Get edge region
      const region = getEdgeRegion(emergency.location.latitude, emergency.location.longitude)

      // Get targets in region (from KV store)
      const targetsKey = `targets:${region}`
      const targetsData = await env.TARGETS_KV.get(targetsKey)

      if (!targetsData) {
        return new Response('No targets found in region', { status: 404 })
      }

      const targets: AlertTarget[] = JSON.parse(targetsData)

      // Filter eligible targets
      const { eligible, skipped } = filterTargets(targets, emergency, region)

      // Batch process notifications
      const batchSize = 100 // Process in batches to avoid timeouts
      const batches = []

      for (let i = 0; i < eligible.length; i += batchSize) {
        batches.push(eligible.slice(i, i + batchSize))
      }

      let successCount = 0
      let errors: string[] = []

      // Process batches concurrently
      const batchPromises = batches.map(async (batch) => {
        const batchResults = await Promise.allSettled(
          batch.map(target => sendPushNotification(target, emergency, env))
        )

        return batchResults.map(result => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++
            } else {
              errors.push(result.value.error || 'Unknown error')
            }
          } else {
            errors.push(result.reason?.message || 'Batch error')
          }
        })
      })

      await Promise.all(batchPromises)

      // Log analytics
      const analytics = {
        emergencyId: emergency.id,
        region,
        totalTargets: targets.length,
        eligibleTargets: eligible.length,
        skippedTargets: skipped.length,
        successCount,
        errorCount: errors.length,
        executionTime: Date.now() - startTime,
        timestamp: Date.now()
      }

      // Store analytics in KV for monitoring
      await env.ANALYTICS_KV.put(
        `analytics:${emergency.id}:${Date.now()}`,
        JSON.stringify(analytics),
        { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
      )

      // Update metrics
      ctx.waitUntil(env.DISPATCH_METRICS.put(
        `metrics:${Date.now()}`,
        JSON.stringify(analytics)
      ))

      const result: DispatchResult = {
        success: successCount > 0,
        targetsReached: successCount,
        targetsSkipped: skipped.length,
        errors,
        executionTime: Date.now() - startTime,
        region
      }

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'X-Execution-Time': String(Date.now() - startTime),
          'X-Region': region
        }
      })
    } catch (error) {
      console.error('Emergency dispatch error:', error)

      const errorResult = {
        success: false,
        targetsReached: 0,
        targetsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        executionTime: Date.now() - startTime,
        region: 'unknown'
      }

      return new Response(JSON.stringify(errorResult), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Execution-Time': String(Date.now() - startTime)
        }
      })
    }
  },

  // Scheduled handler for cleanup and maintenance
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext): Promise<void> {
    try {
      // Clean up old analytics data
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago
      const analyticsList = await env.ANALYTICS_KV.list({ prefix: 'analytics:' })

      for (const key of analyticsList.keys) {
        const timestamp = parseInt(key.name.split(':')[1])
        if (timestamp < cutoffTime) {
          await env.ANALYTICS_KV.delete(key.name)
        }
      }

      // Update target locations periodically
      const regions = Object.keys(EDGE_REGIONS)
      for (const region of regions) {
        const targetsKey = `targets:${region}`
        const targetsData = await env.TARGETS_KV.get(targetsKey)

        if (targetsData) {
          const targets: AlertTarget[] = JSON.parse(targetsData)
          const now = Date.now()

          // Remove inactive targets (30 days)
          const activeTargets = targets.filter(target =>
            now - target.lastActive < 30 * 24 * 60 * 60 * 1000
          )

          await env.TARGETS_KV.put(targetsKey, JSON.stringify(activeTargets))
        }
      }

      console.log('Scheduled maintenance completed')
    } catch (error) {
      console.error('Scheduled maintenance error:', error)
    }
  }
}

// Health check endpoint
export async function healthCheck(request: Request, env: any): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    region: request.cf?.colo || 'unknown',
    version: '1.0.0',
    latency: '<100ms'
  }

  return new Response(JSON.stringify(health), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// Metrics endpoint
export async function getMetrics(request: Request, env: any): Promise<Response> {
  try {
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('range') || '1h' // Default to 1 hour

    const cutoffTime = Date.now() - (timeRange === '1h' ? 60 * 60 * 1000
      : timeRange === '24h' ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000) // 7 days

    const metricsList = await env.DISPATCH_METRICS.list({ prefix: 'metrics:' })
    const relevantMetrics = []

    for (const key of metricsList.keys) {
      const timestamp = parseInt(key.name.split(':')[1])
      if (timestamp >= cutoffTime) {
        const metricData = await env.DISPATCH_METRICS.get(key.name)
        if (metricData) {
          relevantMetrics.push(JSON.parse(metricData))
        }
      }
    }

    // Calculate aggregates
    const totalDispatches = relevantMetrics.length
    const avgExecutionTime = relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalDispatches
    const totalTargetsReached = relevantMetrics.reduce((sum, m) => sum + m.targetsReached, 0)
    const avgSuccessRate = totalTargetsReached / relevantMetrics.reduce((sum, m) => sum + (m.targetsReached + m.targetsSkipped), 0)

    const metrics = {
      timeRange,
      totalDispatches,
      avgExecutionTime: Math.round(avgExecutionTime),
      totalTargetsReached,
      avgSuccessRate: Math.round(avgSuccessRate * 100),
      regionBreakdown: relevantMetrics.reduce((acc, m) => {
        acc[m.region] = (acc[m.region] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return new Response(JSON.stringify(metrics), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response('Failed to fetch metrics', { status: 500 })
  }
}