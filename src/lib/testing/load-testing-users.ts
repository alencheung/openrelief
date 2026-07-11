/**
 * Load Testing Framework - Virtual User and Worker Helpers
 *
 * Pure helpers for creating virtual users, selecting devices / networks /
 * endpoints, dispatching requests to workers, and miscellaneous utilities
 * used while a load test runs. Extracted from load-testing-framework.ts.
 * Re-exported via the framework module so existing imports from
 * '@/lib/testing/load-testing-framework' keep working.
 *
 * These functions hold no state of their own; the framework passes in any
 * required configuration.
 */

import { LoadTestConfig, TestEndpoint, VirtualUser } from './load-testing-types'

/**
 * Generate a unique test id.
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a unique device id (also used as the basis for user/session ids).
 */
export function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract the test id that a virtual user belongs to from its user id.
 */
export function getTestIdFromUser(userId: string): string {
  return userId.split('-')[1] || 'unknown'
}

/**
 * Random float within an inclusive [min, max] range.
 */
export function randomInRange(range: { min: number; max: number }): number {
  return Math.random() * (range.max - range.min) + range.min
}

/**
 * Promise-based sleep helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Pick a device type using the configured mobile / desktop / tablet
 * distribution percentages.
 */
export function selectDeviceType(distribution: {
  mobile: number
  desktop: number
  tablet: number
}): 'mobile' | 'desktop' | 'tablet' {
  const random = Math.random() * 100
  if (random < distribution.mobile) {
    return 'mobile'
  }
  if (random < distribution.mobile + distribution.tablet) {
    return 'tablet'
  }
  return 'desktop'
}

/**
 * Pick a network type using the configured fast3G / 4G / broadband
 * distribution percentages.
 */
export function selectNetworkType(distribution: {
  fast3G: number
  '4G': number
  broadband: number
}): 'fast3G' | '4G' | 'broadband' {
  const random = Math.random() * 100
  if (random < distribution.fast3G) {
    return 'fast3G'
  }
  if (random < distribution.fast3G + distribution['4G']) {
    return '4G'
  }
  return 'broadband'
}

/**
 * Pick an endpoint using weighted random selection.
 */
export function selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0)
  let random = Math.random() * totalWeight

  for (const endpoint of endpoints) {
    random -= endpoint.weight
    if (random <= 0) {
      return endpoint
    }
  }

  return endpoints[0]!
}

/**
 * Map an endpoint to the worker pool that should handle it.
 */
export function getWorkerTypeForEndpoint(endpoint: TestEndpoint): string {
  if (endpoint.url.includes('/alerts/dispatch')) {
    return 'alert'
  }
  if (endpoint.url.includes('/users/nearby')) {
    return 'geographic'
  }
  if (endpoint.url.includes('/emergency')) {
    return 'emergency'
  }
  return 'general'
}

/**
 * Estimate a network round-trip delay (ms) for the given network type.
 */
export function getNetworkDelay(networkType: 'fast3G' | '4G' | 'broadband'): number {
  switch (networkType) {
    case 'fast3G':
      return randomInRange({ min: 200, max: 500 }) // 200-500ms
    case '4G':
      return randomInRange({ min: 50, max: 150 }) // 50-150ms
    case 'broadband':
      return randomInRange({ min: 10, max: 50 }) // 10-50ms
    default:
      return 100
  }
}

/**
 * Build a VirtualUser for the given test, config, and region. Device and
 * network type are sampled from the config's distributions.
 */
export function createVirtualUser(
  config: LoadTestConfig,
  region: { region: string; percentage: number; coordinates: { lat: number; lng: number } }
): VirtualUser {
  const deviceId = generateDeviceId()
  const deviceType = selectDeviceType(config.userBehavior.deviceDistribution)
  const networkType = selectNetworkType(config.userBehavior.networkConditions)

  return {
    id: `user-${deviceId}`,
    scenario: config.scenario,
    region: region.region,
    device: deviceType,
    networkType,
    behavior: config.userBehavior,
    session: {
      id: `session-${deviceId}`,
      startTime: Date.now(),
      duration: randomInRange(config.userBehavior.sessionDuration),
      requests: 0,
      lastActivity: Date.now()
    },
    state: 'idle'
  }
}

/**
 * Dispatch a single request to a worker and resolve with its response.
 * Rejects on worker error or on timeout if the worker does not respond
 * within the endpoint's configured timeout.
 */
export function executeRequestWithWorker(
  worker: Worker,
  endpoint: TestEndpoint,
  virtualUser: VirtualUser
): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestData = {
      endpoint,
      virtualUser,
      timestamp: Date.now()
    }

    worker.postMessage(requestData)

    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'))
    }, endpoint.timeout)

    worker.onmessage = event => {
      clearTimeout(timeout)
      if (event.data.error) {
        reject(event.data.error)
      } else {
        resolve(event.data.response)
      }
    }
  })
}

/**
 * Worker pool type keyed by worker category.
 */
export type WorkerPool = Map<string, Worker[]>

/**
 * Build the worker pools for the supported test types. The emergency pool
 * is larger (20) than the others (10). Returns a Map that the framework
 * keeps as instance state.
 */
export function setupWorkerPools(): WorkerPool {
  const pools: WorkerPool = new Map()
  const workerTypes = ['general', 'emergency', 'geographic', 'alert']

  workerTypes.forEach(type => {
    const workers: Worker[] = []
    const poolSize = type === 'emergency' ? 20 : 10

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(`/workers/load-test-${type}.js`)
      workers.push(worker)
    }

    pools.set(type, workers)
  })

  return pools
}

/**
 * Find an idle worker in the requested pool. Returns null if the pool does
 * not exist or has no available workers.
 */
export function getAvailableWorker(pools: WorkerPool, type: string): Worker | null {
  const workers = pools.get(type)
  if (!workers) {
    return null
  }

  // Find available worker
  return workers.find(w => !isWorkerBusy(w)) || null
}

/**
 * Whether the given worker is currently busy. In a real implementation this
 * would track per-worker state.
 */
export function isWorkerBusy(_worker: Worker): boolean {
  return false
}

/**
 * Return a worker to its pool. In a real implementation this would mark the
 * worker as available; for now it just logs the release.
 */
export function releaseWorker(type: string, _worker: Worker): void {
  console.log(`Worker released: ${type}`)
}
