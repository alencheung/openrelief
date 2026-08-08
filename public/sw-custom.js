/**
 * Custom Service Worker for OpenRelief
 * Handles offline emergency reporting, map tile caching, background sync, and push notifications
 */

const SW_VERSION = '1.0.0'
const CACHE_NAMES = {
  static: 'openrelief-static-v1',
  dynamic: 'openrelief-dynamic-v1',
  emergency: 'openrelief-emergency-v1',
  mapTiles: 'openrelief-map-tiles-v1',
  api: 'openrelief-api-v1'
}

const MAP_TILE_PATTERNS = [
  /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
  /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
  /tiles\/.*\.(png|jpg|jpeg|webp)$/i
]

const API_ENDPOINTS = {
  emergency: '/api/emergency',
  alerts: '/api/alerts',
  health: '/api/health'
}

const MAX_CACHE_AGE = {
  mapTiles: 7 * 24 * 60 * 60 * 1000,
  emergency: 5 * 60 * 1000,
  api: 60 * 1000,
  static: 30 * 24 * 60 * 60 * 1000
}

const SYNC_TAGS = {
  emergency: 'emergency-offline-sync',
  location: 'location-sync',
  alerts: 'alerts-sync'
}

let emergencyMode = false
let emergencyModeStartTime = null
let pendingEmergencyReports = []

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v' + SW_VERSION)
  event.waitUntil(
    caches
      .open(CACHE_NAMES.static)
      .then(cache => {
        return cache
          .addAll([
            '/',
            '/offline',
            '/offline/emergency',
            '/manifest.json',
            '/icons/icon-192x192.png',
            '/icons/icon-512x512.png'
          ])
          .catch(err => {
            console.warn('[SW] Some assets failed to cache during install:', err)
          })
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v' + SW_VERSION)
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !Object.values(CACHE_NAMES).includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    if (isEmergencyReport(request)) {
      event.respondWith(handleEmergencyReport(request))
    }
    return
  }

  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(request))
    return
  }

  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request))
    return
  }

  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request))
    return
  }

  event.respondWith(handleDynamicRequest(request))
})

self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag)

  if (event.tag === SYNC_TAGS.emergency) {
    // F-010.6: the SW can't reach the in-page Zustand offlineStore directly,
    // so in addition to draining its own pendingEmergencyReports we ask every
    // controlled client to flush its store. Without this the Background Sync
    // tag was registered but never drained the client-side queue.
    event.waitUntil(
      syncEmergencyReports().then(() => notifyClients({ type: 'DRAIN_OFFLINE_STORE' }))
    )
  } else if (event.tag === SYNC_TAGS.location) {
    event.waitUntil(syncLocations())
  } else if (event.tag === SYNC_TAGS.alerts) {
    event.waitUntil(syncAlerts())
  }
})

self.addEventListener('push', event => {
  console.log('[SW] Push notification received')

  let notificationData = {
    title: 'OpenRelief Alert',
    body: 'New emergency update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'emergency-alert',
    requireInteraction: true,
    priority: 'high'
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...notificationData, ...data }

      if (data.priority === 'emergency' || data.severity >= 4) {
        emergencyMode = true
        emergencyModeStartTime = Date.now()
        notificationData.priority = 'high'
        notificationData.requireInteraction = true
      }
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      priority: notificationData.priority,
      data: notificationData.data || {},
      actions: notificationData.actions || [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  )
})

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action)
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data)

  if (event.data.type === 'EMERGENCY_MODE_ACTIVATED') {
    emergencyMode = true
    emergencyModeStartTime = Date.now()
    preloadEmergencyResources()
  } else if (event.data.type === 'EMERGENCY_MODE_DEACTIVATED') {
    emergencyMode = false
    emergencyModeStartTime = null
  } else if (event.data.type === 'GET_SW_STATUS') {
    event.ports[0]?.postMessage({
      version: SW_VERSION,
      emergencyMode,
      emergencyModeStartTime,
      pendingReports: pendingEmergencyReports.length
    })
  } else if (event.data.type === 'CACHE_EMERGENCY_DATA') {
    event.waitUntil(cacheEmergencyData(event.data.payload))
  } else if (event.data.type === 'FORCE_SYNC') {
    const tag = event.data.tag || SYNC_TAGS.emergency
    event.waitUntil(syncEmergencyReports())
  }
})

async function handleMapTileRequest(request) {
  const cache = await caches.open(CACHE_NAMES.mapTiles)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    refreshMapTile(request, cache)
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request, { cache: 'force-cache' })
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone()
      cache.put(request, responseToCache)
    }
    return networkResponse
  } catch (error) {
    console.warn('[SW] Map tile fetch failed:', error)
    return createOfflineResponse(408, 'Map tile not available offline')
  }
}

async function refreshMapTile(request, cache) {
  try {
    const networkResponse = await fetch(request, { cache: 'reload' })
    if (networkResponse.ok) {
      await cache.put(request, networkResponse)
    }
  } catch (error) {
    // Silent fail - refresh in background
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url)
  const cacheKey = createCacheKey(request)

  if (emergencyMode || !navigator.onLine) {
    const cache = await caches.open(CACHE_NAMES.api)
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      return cachedResponse
    }
  }

  if (navigator.onLine) {
    try {
      const networkResponse = await fetch(request, {
        cache: 'no-cache'
      })

      if (networkResponse.ok && shouldCacheApiResponse(url)) {
        const cache = await caches.open(CACHE_NAMES.api)
        cache.put(cacheKey, networkResponse.clone())
      }

      return networkResponse
    } catch (error) {
      console.warn('[SW] API request failed:', error)
    }
  }

  const cache = await caches.open(CACHE_NAMES.api)
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  return createOfflineResponse(503, 'Service unavailable offline')
}

async function handleEmergencyReport(request) {
  if (!navigator.onLine) {
    try {
      const body = await request.clone().json()
      const reportId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      pendingEmergencyReports.push({
        id: reportId,
        data: body,
        timestamp: Date.now(),
        retryCount: 0
      })

      await savePendingReports()

      await self.registration.sync.register(SYNC_TAGS.emergency)

      notifyClients({
        type: 'EMERGENCY_REPORT_QUEUED',
        reportId,
        message: 'Emergency report queued for sync'
      })

      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          reportId,
          message: 'Report saved offline and will sync when connected'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('[SW] Failed to queue emergency report:', error)
      return createOfflineResponse(500, 'Failed to save report offline')
    }
  }

  return fetch(request)
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAMES.static)

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[SW] Navigation request failed, checking cache')

    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const offlineResponse = await cache.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }

    return createOfflineResponse(503, 'Page not available offline')
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAMES.static)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.warn('[SW] Static asset fetch failed:', error)
    return createOfflineResponse(404, 'Asset not available')
  }
}

async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic)

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok && shouldCacheDynamicContent(request)) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return createOfflineResponse(503, 'Content not available offline')
  }
}

async function syncEmergencyReports() {
  console.log('[SW] Syncing emergency reports...')

  await loadPendingReports()

  if (pendingEmergencyReports.length === 0) {
    return
  }

  const successfulReports = []
  const failedReports = []

  for (const report of pendingEmergencyReports) {
    try {
      const response = await fetch(API_ENDPOINTS.emergency, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.data)
      })

      if (response.ok) {
        const result = await response.json()
        successfulReports.push({ id: report.id, serverId: result.id })
        notifyClients({
          type: 'EMERGENCY_REPORT_SYNCED',
          offlineId: report.id,
          serverId: result.id
        })
      } else {
        throw new Error(`Sync failed with status ${response.status}`)
      }
    } catch (error) {
      console.error('[SW] Failed to sync report:', report.id, error)
      report.retryCount++
      failedReports.push(report)
    }
  }

  pendingEmergencyReports = failedReports
  await savePendingReports()

  console.log(
    `[SW] Sync complete: ${successfulReports.length} synced, ${failedReports.length} failed`
  )

  if (failedReports.length > 0 && failedReports[0].retryCount < 10) {
    setTimeout(() => {
      self.registration.sync.register(SYNC_TAGS.emergency)
    }, getRetryDelay(failedReports[0].retryCount))
  }
}

async function syncLocations() {
  // Placeholder for location sync
  console.log('[SW] Syncing locations...')
}

async function syncAlerts() {
  console.log('[SW] Syncing alerts...')

  try {
    const response = await fetch(API_ENDPOINTS.alerts, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.ok) {
      const alerts = await response.json()
      const cache = await caches.open(CACHE_NAMES.emergency)
      await cache.put(
        new Request(API_ENDPOINTS.alerts),
        new Response(JSON.stringify(alerts), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }
  } catch (error) {
    console.error('[SW] Failed to sync alerts:', error)
  }
}

async function preloadEmergencyResources() {
  console.log('[SW] Preloading emergency resources...')
  const cache = await caches.open(CACHE_NAMES.emergency)

  const emergencyUrls = [
    '/offline/emergency',
    '/api/emergency',
    '/api/alerts',
    '/emergency-contacts.json'
  ]

  for (const url of emergencyUrls) {
    try {
      const response = await fetch(url, { cache: 'no-cache' })
      if (response.ok) {
        await cache.put(url, response)
      }
    } catch (error) {
      console.warn('[SW] Failed to preload:', url)
    }
  }
}

async function cacheEmergencyData(data) {
  const cache = await caches.open(CACHE_NAMES.emergency)

  if (data.events) {
    await cache.put(
      new Request('/emergency-events-offline'),
      new Response(JSON.stringify(data.events), {
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }

  if (data.contacts) {
    await cache.put(
      new Request('/emergency-contacts'),
      new Response(JSON.stringify(data.contacts), {
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }
}

async function cleanupExpiredCache() {
  const now = Date.now()

  for (const [cacheName, maxAge] of Object.entries(MAX_CACHE_AGE)) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const dateHeader = response.headers.get('date')
        const cachedTime = dateHeader ? new Date(dateHeader).getTime() : now

        if (now - cachedTime > maxAge) {
          await cache.delete(request)
        }
      }
    }
  }
}

async function savePendingReports() {
  try {
    const cache = await caches.open(CACHE_NAMES.emergency)
    await cache.put(
      new Request('/pending-emergency-reports'),
      new Response(JSON.stringify(pendingEmergencyReports), {
        headers: { 'Content-Type': 'application/json' }
      })
    )
  } catch (error) {
    console.error('[SW] Failed to save pending reports:', error)
  }
}

async function loadPendingReports() {
  try {
    const cache = await caches.open(CACHE_NAMES.emergency)
    const response = await cache.match('/pending-emergency-reports')
    if (response) {
      pendingEmergencyReports = await response.json()
    }
  } catch (error) {
    console.error('[SW] Failed to load pending reports:', error)
    pendingEmergencyReports = []
  }
}

function notifyClients(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message)
    })
  })
}

function isMapTileRequest(url) {
  return MAP_TILE_PATTERNS.some(pattern => pattern.test(url.href))
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.ico']
  return staticExtensions.some(ext => url.pathname.endsWith(ext))
}

function isEmergencyReport(request) {
  return request.url.includes('/api/emergency') && request.method === 'POST'
}

function shouldCacheApiResponse(url) {
  const cacheableEndpoints = ['/api/emergency', '/api/alerts', '/api/types']
  return cacheableEndpoints.some(endpoint => url.pathname.startsWith(endpoint))
}

function shouldCacheDynamicContent(request) {
  const url = new URL(request.url)
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
  return imageExtensions.some(ext => url.pathname.endsWith(ext))
}

function createCacheKey(request) {
  return request
}

function getRetryDelay(retryCount) {
  const baseDelay = 1000
  const multiplier = 2
  const maxDelay = 60000
  return Math.min(baseDelay * Math.pow(multiplier, retryCount), maxDelay)
}

function createOfflineResponse(status, message) {
  return new Response(JSON.stringify({ error: message, offline: true }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

setInterval(cleanupExpiredCache, 60 * 60 * 1000)

console.log('[SW] Custom service worker loaded v' + SW_VERSION)
