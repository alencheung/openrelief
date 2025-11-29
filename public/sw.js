// OpenRelief Advanced Service Worker
// Offline-first emergency coordination platform with 24+ hour offline capability

const CACHE_VERSION = '2.0.0'
const CACHE_NAME = `openrelief-v${CACHE_VERSION}`
const STATIC_CACHE = `openrelief-static-v${CACHE_VERSION}`
const DYNAMIC_CACHE = `openrelief-dynamic-v${CACHE_VERSION}`
const EMERGENCY_CACHE = `openrelief-emergency-v${CACHE_VERSION}`
const OFFLINE_CACHE = `openrelief-offline-v${CACHE_VERSION}`

// Cache strategies and priorities
const CACHE_STRATEGIES = {
  EMERGENCY: 'network-first', // For critical emergency data
  STATIC: 'cache-first', // For app shell and static assets
  DYNAMIC: 'stale-while-revalidate', // For dynamic content
  OFFLINE: 'cache-only' // For offline fallbacks
}

// Critical files to cache for offline functionality (App Shell)
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/offline/emergency',
  '/offline/map',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/_next/static/media/',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/icons/shortcut-report.png',
  '/icons/shortcut-map.png',
  '/icons/shortcut-contacts.png'
]

// Emergency-critical API endpoints
const EMERGENCY_ENDPOINTS = [
  '/api/emergencies',
  '/api/user/location',
  '/api/notifications',
  '/api/trust-scores',
  '/api/contacts',
  '/api/resources'
]

// Offline data patterns
const OFFLINE_PATTERNS = [
  '/offline/',
  '/api/offline/',
  '/emergency/reports',
  '/emergency/map'
]

// Install event - cache static assets and initialize offline data
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('[SW] Caching static assets')
          return cache.addAll(STATIC_ASSETS)
        }),
      
      // Initialize emergency cache with offline data
      caches.open(EMERGENCY_CACHE)
        .then((cache) => {
          console.log('[SW] Initializing emergency cache')
          return cache.addAll([
            new Response(JSON.stringify({
              emergencies: [],
              lastUpdated: Date.now(),
              offline: true
            }), {
              headers: { 'Content-Type': 'application/json' }
            }),
            new Response(JSON.stringify({
              contacts: [
                { name: 'Emergency Services', phone: '911', type: 'emergency' },
                { name: 'Local Hospital', phone: '555-0123', type: 'medical' },
                { name: 'Fire Department', phone: '555-0124', type: 'fire' },
                { name: 'Police Department', phone: '555-0125', type: 'police' }
              ],
              offline: true
            }), {
              headers: { 'Content-Type': 'application/json' }
            })
          ])
        })
    ]).then(() => {
      console.log('[SW] Installation complete')
      return self.skipWaiting()
    }).catch((error) => {
      console.error('[SW] Installation failed:', error)
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION
            })
          })
        })
      })
  )
})

// Fetch event - implement comprehensive caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    if (request.method === 'POST' && isEmergencyEndpoint(url.pathname)) {
      // Handle offline POST requests for emergency data
      event.respondWith(handleOfflinePost(request))
    }
    return
  }

  // Handle different types of requests with appropriate strategies
  if (isEmergencyEndpoint(url.pathname)) {
    // Emergency endpoints: network-first with fallback
    event.respondWith(handleEmergencyRequest(request))
  } else if (isStaticAsset(url.pathname)) {
    // Static assets: cache-first
    event.respondWith(handleStaticRequest(request))
  } else if (isOfflinePattern(url.pathname)) {
    // Offline patterns: cache-only
    event.respondWith(handleOfflineRequest(request))
  } else {
    // Other requests: stale-while-revalidate
    event.respondWith(handleDynamicRequest(request))
  }
})

// Handle emergency requests with network-first strategy
async function handleEmergencyRequest(request) {
  try {
    // Try network first for emergency data
    const networkResponse = await fetch(request, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'X-SW-Cache-Strategy': 'network-first'
      }
    })
    
    if (networkResponse.ok) {
      // Cache successful response
      const cache = await caches.open(EMERGENCY_CACHE)
      cache.put(request, networkResponse.clone())
      
      // Update last sync timestamp
      await updateLastSync(request.url)
      
      return networkResponse
    }
  } catch (error) {
    console.log('[SW] Network failed for emergency request:', error)
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Return emergency fallback
  return new Response(JSON.stringify({
    error: 'Offline - Using cached emergency data',
    timestamp: Date.now(),
    offline: true,
    cached: false
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'X-SW-Offline': 'true'
    }
  })
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const cache = caches.open(STATIC_CACHE)
          cache.then((c) => c.put(request, networkResponse))
        }
      })
      .catch(() => {
        // Background update failed, but we have cached version
      })
    
    return cachedResponse
  }

  // Fetch from network if not in cache
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for static request:', error)
    return new Response('Offline - Resource not available', { 
      status: 503,
      headers: { 'X-SW-Offline': 'true' }
    })
  }
}

// Handle dynamic requests with stale-while-revalidate strategy
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cachedResponse = await cache.match(request)

  // Always try to fetch from network
  const networkPromise = fetch(request, { cache: 'no-cache' })
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch((error) => {
      console.log('[SW] Network failed for dynamic request:', error)
      return null
    })

  // Return cached version immediately, update in background
  if (cachedResponse) {
    networkPromise.then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        // Notify clients about the update
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_UPDATED',
              url: request.url,
              timestamp: Date.now()
            })
          })
        })
      }
    })
    
    return cachedResponse
  }

  // If no cache, wait for network
  const networkResponse = await networkPromise
  if (networkResponse) {
    return networkResponse
  }

  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match('/offline')
  }

  return new Response('Offline - Resource not available', { 
    status: 503,
    headers: { 'X-SW-Offline': 'true' }
  })
}

// Handle offline-only requests
async function handleOfflineRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Return appropriate offline fallback
  if (request.url.includes('/emergency')) {
    return caches.match('/offline/emergency')
  }
  
  return caches.match('/offline')
}

// Handle offline POST requests
async function handleOfflinePost(request) {
  try {
    const clonedRequest = request.clone()
    const body = await clonedRequest.json()
    
    // Store in offline cache for later sync
    const cache = await caches.open(OFFLINE_CACHE)
    const offlineKey = `/offline${request.url}`
    
    const existingData = await cache.match(offlineKey)
    const offlineData = existingData ? await existingData.json() : []
    
    offlineData.push({
      ...body,
      id: generateOfflineId(),
      timestamp: Date.now(),
      url: request.url,
      method: request.method
    })
    
    await cache.put(offlineKey, new Response(JSON.stringify(offlineData)))
    
    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register('emergency-offline-sync')
    }
    
    return new Response(JSON.stringify({
      success: true,
      offline: true,
      message: 'Data saved offline, will sync when online',
      id: body.id || generateOfflineId()
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[SW] Failed to handle offline POST:', error)
    return new Response(JSON.stringify({
      error: 'Failed to save offline data',
      offline: true
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'emergency-offline-sync') {
    event.waitUntil(syncOfflineData())
  } else if (event.tag === 'emergency-report') {
    event.waitUntil(syncEmergencyReports())
  } else if (event.tag === 'location-update') {
    event.waitUntil(syncLocationUpdates())
  } else if (event.tag === 'trust-score-sync') {
    event.waitUntil(syncTrustScores())
  }
})

// Sync all offline data
async function syncOfflineData() {
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const keys = await cache.keys()
    
    for (const request of keys) {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/offline/')) {
        const response = await cache.match(request)
        const data = await response.json()
        
        for (const item of data) {
          try {
            await fetch(item.url, {
              method: item.method || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            })
            
            console.log('[SW] Synced offline data:', item.id)
          } catch (error) {
            console.error('[SW] Failed to sync offline data:', error)
          }
        }
        
        // Clear synced data
        await cache.delete(request)
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync offline data:', error)
  }
}

// Sync emergency reports when back online
async function syncEmergencyReports() {
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const offlineReports = await cache.match('/offline/api/emergencies')
    
    if (offlineReports) {
      const reports = await offlineReports.json()
      
      for (const report of reports) {
        try {
          await fetch('/api/emergencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
          })
          
          console.log('[SW] Synced emergency report:', report.id)
        } catch (error) {
          console.error('[SW] Failed to sync emergency report:', error)
        }
      }
      
      // Clear synced reports
      await cache.delete('/offline/api/emergencies')
    }
  } catch (error) {
    console.error('[SW] Failed to sync emergency reports:', error)
  }
}

// Sync location updates when back online
async function syncLocationUpdates() {
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const offlineLocations = await cache.match('/offline/api/user/location')
    
    if (offlineLocations) {
      const locations = await offlineLocations.json()
      
      for (const location of locations) {
        try {
          await fetch('/api/user/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(location)
          })
          
          console.log('[SW] Synced location update:', location.id)
        } catch (error) {
          console.error('[SW] Failed to sync location update:', error)
        }
      }
      
      // Clear synced locations
      await cache.delete('/offline/api/user/location')
    }
  } catch (error) {
    console.error('[SW] Failed to sync location updates:', error)
  }
}

// Sync trust scores periodically
async function syncTrustScores() {
  try {
    const response = await fetch('/api/trust-scores/sync', {
      cache: 'no-cache'
    })
    
    if (response.ok) {
      const data = await response.json()
      const cache = await caches.open(EMERGENCY_CACHE)
      await cache.put('/api/trust-scores', new Response(JSON.stringify(data)))
      
      console.log('[SW] Trust scores synced successfully')
    }
  } catch (error) {
    console.error('[SW] Failed to sync trust scores:', error)
  }
}

// Push notifications for emergency alerts
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event)
  
  const options = {
    body: 'New emergency alert in your area',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now(),
      priority: 'high'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/action-view.png'
      },
      {
        action: 'respond',
        title: 'I Can Help',
        icon: '/icons/action-help.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'emergency-alert'
  }

  if (event.data) {
    try {
      const data = event.data.json()
      options.body = data.message || options.body
      options.data = { ...options.data, ...data }
      
      if (data.priority === 'critical') {
        options.vibrate = [500, 200, 500, 200, 500, 200, 500]
        options.requireInteraction = true
      }
      
      if (data.actions) {
        options.actions = [...options.actions, ...data.actions]
      }
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification('OpenRelief Emergency Alert', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  } else if (event.action === 'respond') {
    event.waitUntil(
      clients.openWindow('/respond?emergency=' + (event.notification.data.emergencyId || ''))
    )
  } else if (event.action === 'dismiss') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/')
        }
      })
    )
  }
})

// Periodic background sync for emergency data
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag)
  
  if (event.tag === 'emergency-sync') {
    event.waitUntil(
      Promise.all([
        syncEmergencyData(),
        syncTrustScores(),
        cleanupOldCache()
      ])
    )
  } else if (event.tag === 'trust-score-sync') {
    event.waitUntil(syncTrustScores())
  }
})

// Sync emergency data periodically
async function syncEmergencyData() {
  try {
    const response = await fetch('/api/emergencies/sync', {
      cache: 'no-cache',
      headers: { 'X-SW-Periodic-Sync': 'true' }
    })
    
    if (response.ok) {
      const data = await response.json()
      const cache = await caches.open(EMERGENCY_CACHE)
      await cache.put('/api/emergencies', new Response(JSON.stringify(data)))
      
      console.log('[SW] Emergency data synced successfully')
      
      // Notify clients about the update
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'EMERGENCY_DATA_UPDATED',
            data: data,
            timestamp: Date.now()
          })
        })
      })
    }
  } catch (error) {
    console.error('[SW] Failed to sync emergency data:', error)
  }
}

// Clean up old cache entries
async function cleanupOldCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE)
    const requests = await cache.keys()
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const dateHeader = response.headers.get('date')
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime()
          if (now - responseDate > maxAge) {
            await cache.delete(request)
            console.log('[SW] Cleaned up old cache entry:', request.url)
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Failed to cleanup old cache:', error)
  }
}

// Message handling from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data && event.data.type === 'CACHE_VERSION') {
    console.log('[SW] Cache version:', event.data.version)
  } else if (event.data && event.data.type === 'FORCE_SYNC') {
    syncEmergencyData()
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches()
  } else if (event.data && event.data.type === 'GET_CACHE_INFO') {
    getCacheInfo().then((info) => {
      event.ports[0].postMessage(info)
    })
  }
})

// Helper functions
function isEmergencyEndpoint(pathname) {
  return EMERGENCY_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))
}

function isStaticAsset(pathname) {
  return pathname.includes('/_next/static/') ||
         pathname.includes('/icons/') ||
         pathname.includes('/images/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.webp') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2')
}

function isOfflinePattern(pathname) {
  return OFFLINE_PATTERNS.some(pattern => pathname.startsWith(pattern))
}

function generateOfflineId() {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function updateLastSync(url) {
  try {
    const cache = await caches.open(EMERGENCY_CACHE)
    const syncData = {
      url: url,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    await cache.put('/last-sync', new Response(JSON.stringify(syncData)))
  } catch (error) {
    console.error('[SW] Failed to update last sync:', error)
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('[SW] All caches cleared')
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error)
  }
}

async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys()
    const info = {}
    
    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      info[name] = {
        count: keys.length,
        size: await estimateCacheSize(cache),
        entries: keys.map(k => k.url).slice(0, 10) // First 10 entries
      }
    }
    
    return info
  } catch (error) {
    console.error('[SW] Failed to get cache info:', error)
    return {}
  }
}

async function estimateCacheSize(cache) {
  try {
    const keys = await cache.keys()
    let totalSize = 0
    
    for (const request of keys.slice(0, 10)) { // Sample first 10 entries
      const response = await cache.match(request)
      if (response) {
        const clonedResponse = response.clone()
        const buffer = await clonedResponse.arrayBuffer()
        totalSize += buffer.byteLength
      }
    }
    
    // Estimate total size based on sample
    return Math.round((totalSize / Math.min(keys.length, 10)) * keys.length)
  } catch (error) {
    return 0
  }
}

// Network status monitoring
self.addEventListener('online', () => {
  console.log('[SW] Network is online')
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'NETWORK_STATUS',
        online: true,
        timestamp: Date.now()
      })
    })
  })
})

self.addEventListener('offline', () => {
  console.log('[SW] Network is offline')
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'NETWORK_STATUS',
        online: false,
        timestamp: Date.now()
      })
    })
  })
})

console.log(`[SW] OpenRelief Service Worker v${CACHE_VERSION} loaded`)