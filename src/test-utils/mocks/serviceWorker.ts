/**
 * Enhanced Service Worker mocks for OpenRelief emergency coordination system
 *
 * This file provides comprehensive mocking for service workers, PWA functionality,
 * background sync, and offline capabilities critical for emergency response.
 */

import { jest } from '@jest/globals'

// Mock Service Worker Registration
export const createMockServiceWorkerRegistration = (overrides = {}) => {
  const mockRegistration = {
    installing: null,
    waiting: null,
    active: {
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      state: 'activated',
      scriptURL: '/sw.js'
    },
    scope: '/',
    navigationPreload: {
      enabled: true,
      getState: jest.fn().mockResolvedValue({ enabled: true }),
      disable: jest.fn(),
      enable: jest.fn(),
      setHeaderValue: jest.fn()
    },
    pushManager: createMockPushManager(),
    sync: createMockSyncManager(),
    periodicSync: createMockPeriodicSyncManager(),
    backgroundFetch: createMockBackgroundFetchManager(),
    update: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(true),

    // Event listeners
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),

    ...overrides
  }

  return mockRegistration
}

// Mock Push Manager
export const createMockPushManager = () => ({
  getSubscription: jest.fn().mockResolvedValue(null),
  subscribe: jest.fn().mockImplementation(async (options) => {
    return {
      endpoint: 'https://mock-push-endpoint.com',
      keys: {
        p256dh: 'mock-p256dh-key',
        auth: 'mock-auth-key'
      },
      options,
      unsubscribe: jest.fn().mockResolvedValue(true)
    }
  }),
  permissionState: jest.fn().mockResolvedValue('granted'),
  supportedOptions: jest.fn().mockResolvedValue({
    userVisibleOnly: true,
    applicationServerKey: true
  })
})

// Mock Sync Manager
export const createMockSyncManager = () => ({
  register: jest.fn().mockImplementation(async (tag) => {
    return {
      tag,
      sync: jest.fn().mockResolvedValue(undefined)
    }
  }),
  getTags: jest.fn().mockResolvedValue([])
})

// Mock Periodic Sync Manager
export const createMockPeriodicSyncManager = () => ({
  register: jest.fn().mockImplementation(async (tag, options) => {
    return {
      tag,
      minPeriod: options?.minInterval || 0,
      sync: jest.fn().mockResolvedValue(undefined)
    }
  }),
  getTags: jest.fn().mockResolvedValue([]),
  unregister: jest.fn().mockResolvedValue(true)
})

// Mock Background Fetch Manager
export const createMockBackgroundFetchManager = () => ({
  fetch: jest.fn().mockImplementation(async (id, requests, options) => {
    return {
      id,
      requests,
      options,
      match: jest.fn().mockResolvedValue(null),
      matchAll: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      abort: jest.fn().mockResolvedValue(undefined)
    }
  }),
  getIds: jest.fn().mockResolvedValue([]),
  get: jest.fn().mockResolvedValue(null)
})

// Mock Service Worker
export const createMockServiceWorker = (overrides = {}) => {
  const mockServiceWorker = {
    scriptURL: '/sw.js',
    state: 'activated',

    // Event listeners
    addEventListener: jest.fn().mockImplementation((event, callback) => {
      if (!mockServiceWorker._eventListeners) {
        mockServiceWorker._eventListeners = {}
      }
      if (!mockServiceWorker._eventListeners[event]) {
        mockServiceWorker._eventListeners[event] = []
      }
      mockServiceWorker._eventListeners[event].push(callback)
    }),

    removeEventListener: jest.fn().mockImplementation((event, callback) => {
      if (mockServiceWorker._eventListeners && mockServiceWorker._eventListeners[event]) {
        const index = mockServiceWorker._eventListeners[event].indexOf(callback)
        if (index > -1) {
          mockServiceWorker._eventListeners[event].splice(index, 1)
        }
      }
    }),

    dispatchEvent: jest.fn().mockImplementation((event) => {
      if (mockServiceWorker._eventListeners && mockServiceWorker._eventListeners[event.type]) {
        mockServiceWorker._eventListeners[event.type].forEach(callback => {
          callback(event)
        })
      }
    }),

    // Post message
    postMessage: jest.fn().mockImplementation((message, transfer) => {
      // Simulate message handling
      if (mockServiceWorker._eventListeners && mockServiceWorker._eventListeners.message) {
        mockServiceWorker._eventListeners.message.forEach(callback => {
          callback({ data: message, ports: [] })
        })
      }
    }),

    // Internal event listeners storage
    _eventListeners: {},

    ...overrides
  }

  return mockServiceWorker
}

// Mock Navigator Service Worker
export const createMockNavigatorServiceWorker = () => {
  const mockNavigatorSW = {
    register: jest.fn().mockImplementation(async (scriptURL, options) => {
      const registration = createMockServiceWorkerRegistration({
        scope: options?.scope || '/',
        scriptURL
      })

      // Simulate successful registration
      setTimeout(() => {
        if (mockNavigatorSW._onregister) {
          mockNavigatorSW._onregister(registration)
        }
      }, 100)

      return registration
    }),

    getRegistration: jest.fn().mockImplementation(async (scope) => {
      return createMockServiceWorkerRegistration({ scope: scope || '/' })
    }),

    getRegistrations: jest.fn().mockResolvedValue([
      createMockServiceWorkerRegistration()
    ]),

    ready: Promise.resolve(createMockServiceWorkerRegistration()),

    // Internal event handlers
    _onregister: null,
    _onupdatefound: null,

    // Helper methods for testing
    _triggerUpdateFound: jest.fn().mockImplementation((registration) => {
      if (mockNavigatorSW._onupdatefound) {
        mockNavigatorSW._onupdatefound(registration)
      }
    }),

    _triggerRegister: jest.fn().mockImplementation((registration) => {
      if (mockNavigatorSW._onregister) {
        mockNavigatorSW._onregister(registration)
      }
    })
  }

  return mockNavigatorSW
}

// Mock Cache API
export const createMockCache = (name: string) => {
  const cacheData: Record<string, Response> = {}

  return {
    name,

    match: jest.fn().mockImplementation(async (request) => {
      const key = typeof request === 'string' ? request : request.url
      return cacheData[key] || undefined
    }),

    matchAll: jest.fn().mockImplementation(async (request) => {
      if (request) {
        const key = typeof request === 'string' ? request : request.url
        return cacheData[key] ? [cacheData[key]] : []
      }
      return Object.values(cacheData)
    }),

    add: jest.fn().mockImplementation(async (request, response) => {
      const key = typeof request === 'string' ? request : request.url
      cacheData[key] = response
    }),

    addAll: jest.fn().mockImplementation(async (requests) => {
      await Promise.all(
        requests.map(async (request) => {
          const response = await fetch(request)
          const key = typeof request === 'string' ? request : request.url
          cacheData[key] = response
        })
      )
    }),

    put: jest.fn().mockImplementation(async (request, response) => {
      const key = typeof request === 'string' ? request : request.url
      cacheData[key] = response
    }),

    delete: jest.fn().mockImplementation(async (request) => {
      const key = typeof request === 'string' ? request : request.url
      delete cacheData[key]
      return true
    }),

    keys: jest.fn().mockImplementation(async () => {
      return Object.keys(cacheData).map(key =>
        typeof Request !== 'undefined' ? new Request(key) : key
      )
    }),

    // Helper for testing
    _clear: jest.fn().mockImplementation(() => {
      Object.keys(cacheData).forEach(key => delete cacheData[key])
    })
  }
}

// Mock Cache Storage
export const createMockCacheStorage = () => {
  const caches: Record<string, any> = {}

  return {
    open: jest.fn().mockImplementation(async (cacheName) => {
      if (!caches[cacheName]) {
        caches[cacheName] = createMockCache(cacheName)
      }
      return caches[cacheName]
    }),

    has: jest.fn().mockImplementation(async (cacheName) => {
      return !!caches[cacheName]
    }),

    delete: jest.fn().mockImplementation(async (cacheName) => {
      if (caches[cacheName]) {
        delete caches[cacheName]
        return true
      }
      return false
    }),

    keys: jest.fn().mockImplementation(async () => {
      return Object.keys(caches)
    }),

    // Helper for testing
    _clear: jest.fn().mockImplementation(() => {
      Object.keys(caches).forEach(key => delete caches[key])
    })
  }
}

// Mock Push Subscription
export const createMockPushSubscription = (overrides = {}) => {
  return {
    endpoint: 'https://mock-push-endpoint.com/push/subscription',
    expirationTime: null,
    options: {
      userVisibleOnly: true,
      applicationServerKey: 'mock-application-server-key'
    },
    keys: {
      p256dh: 'mock-p256dh-key',
      auth: 'mock-auth-key'
    },
    unsubscribe: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue({
      endpoint: 'https://mock-push-endpoint.com/push/subscription',
      keys: {
        p256dh: 'mock-p256dh-key',
        auth: 'mock-auth-key'
      }
    }),
    ...overrides
  }
}

// Mock Notification
export const createMockNotification = (title: string, options = {}) => {
  const notification = {
    title,
    body: options.body || '',
    icon: options.icon || '/icon-192x192.png',
    badge: options.badge || '/badge-72x72.png',
    tag: options.tag || 'default',
    data: options.data || {},
    requireInteraction: options.requireInteraction || false,
    silent: options.silent || false,
    timestamp: Date.now(),

    close: jest.fn(),
    onclick: null,
    onshow: null,
    onerror: null,
    onclose: null,

    ...options
  }

  return notification
}

// Mock Notification Permission
export const mockNotificationPermission = {
  request: jest.fn().mockResolvedValue('granted'),
  current: 'granted',

  // Helper for testing
  _setPermission: jest.fn().mockImplementation((permission: NotificationPermission) => {
    mockNotificationPermission.current = permission
  })
}

// Helper functions for testing
export const simulateServiceWorkerMessage = (serviceWorker: any, message: any) => {
  if (serviceWorker._eventListeners && serviceWorker._eventListeners.message) {
    serviceWorker._eventListeners.message.forEach(callback => {
      callback({ data: message, ports: [] })
    })
  }
}

export const simulatePushEvent = (serviceWorker: any, data: any) => {
  const pushEvent = {
    data: {
      json: jest.fn().mockReturnValue(data),
      text: jest.fn().mockReturnValue(JSON.stringify(data)),
      blob: jest.fn().mockReturnValue(new Blob([JSON.stringify(data)])),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    },
    waitUntil: jest.fn()
  }

  if (serviceWorker._eventListeners && serviceWorker._eventListeners.push) {
    serviceWorker._eventListeners.push.forEach(callback => {
      callback(pushEvent)
    })
  }
}

export const simulateSyncEvent = (serviceWorker: any, tag: string) => {
  const syncEvent = {
    tag,
    lastChance: false,
    waitUntil: jest.fn()
  }

  if (serviceWorker._eventListeners && serviceWorker._eventListeners.sync) {
    serviceWorker._eventListeners.sync.forEach(callback => {
      callback(syncEvent)
    })
  }
}

export const simulateNotificationClick = (notification: any) => {
  if (notification.onclick) {
    notification.onclick({ notification })
  }
}

// Setup global mocks
export const setupServiceWorkerMocks = () => {
  // Mock navigator.serviceWorker
  Object.defineProperty(global.navigator, 'serviceWorker', {
    value: createMockNavigatorServiceWorker(),
    writable: true
  })

  // Mock caches
  Object.defineProperty(global, 'caches', {
    value: createMockCacheStorage(),
    writable: true
  })

  // Mock Notification
  Object.defineProperty(global, 'Notification', {
    value: {
      requestPermission: mockNotificationPermission.request,
      permission: mockNotificationPermission.current,
      maxActions: 3,
      isSupported: true,
      create: jest.fn().mockImplementation(createMockNotification)
    },
    writable: true
  })

  // Mock PushManager
  Object.defineProperty(global, 'PushManager', {
    value: {
      supportedOptions: jest.fn().mockResolvedValue({
        userVisibleOnly: true,
        applicationServerKey: true
      }),
      permissionState: jest.fn().mockResolvedValue('granted')
    },
    writable: true
  })
}

export default {
  createMockServiceWorkerRegistration,
  createMockPushManager,
  createMockSyncManager,
  createMockServiceWorker,
  createMockCache,
  createMockCacheStorage,
  createMockPushSubscription,
  createMockNotification,
  mockNotificationPermission,
  simulateServiceWorkerMessage,
  simulatePushEvent,
  simulateSyncEvent,
  simulateNotificationClick,
  setupServiceWorkerMocks
}