/**
 * Service Worker default configuration
 *
 * Factory for the default `ServiceWorkerConfig` used by the optimizer
 * (cache names, runtime cache rules, background sync, push notifications,
 * offline fallback, performance tuning, and emergency-mode settings).
 */

import type { ServiceWorkerConfig } from './sw-types'

export function getDefaultServiceWorkerConfig(): ServiceWorkerConfig {
  return {
    version: '1.0.0',
    cacheName: 'openrelief-cache-v1',
    emergencyCacheName: 'openrelief-emergency-cache-v1',
    precacheAssets: [
      '/',
      '/offline',
      '/manifest.json',
      '/_next/static/css/app.css',
      '/_next/static/js/app.js'
    ],
    runtimeCaches: [
      {
        name: 'api-cache',
        strategy: 'staleWhileRevalidate',
        maxAge: 300, // 5 minutes
        maxEntries: 100,
        match: /^\/api\//,
        networkTimeoutSeconds: 3,
        cacheableResponse: {
          statuses: [0, 200],
          headers: { 'content-type': 'application/json' }
        }
      },
      {
        name: 'static-cache',
        strategy: 'cacheFirst',
        maxAge: 86400, // 24 hours
        maxEntries: 200,
        match: /\.(?:js|css|png|jpg|jpeg|svg|gif|webp)$/,
        cacheableResponse: {
          statuses: [0, 200],
          headers: {}
        }
      },
      {
        name: 'image-cache',
        strategy: 'cacheFirst',
        maxAge: 604800, // 7 days
        maxEntries: 100,
        match: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        cacheableResponse: {
          statuses: [0, 200],
          headers: {}
        }
      }
    ],
    backgroundSync: {
      enabled: true,
      minRetries: 3,
      maxRetries: 10,
      retryDelay: 1000, // 1 second
      backoffMultiplier: 2,
      maxRetryDelay: 60000, // 1 minute
      syncQueue: ['emergency-reports', 'user-location', 'alert-status']
    },
    pushNotifications: {
      enabled: true,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      emergencyPriority: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: 'UTC'
      },
      maxRetries: 5,
      retryDelay: 2000 // 2 seconds
    },
    offlineFallback: {
      enabled: true,
      html: '/offline',
      image: '/images/offline-placeholder.png',
      routes: {
        '/': '/offline',
        '/emergency': '/offline/emergency'
      },
      emergencyContent: {
        enabled: true,
        criticalAlerts: true,
        basicMap: true,
        emergencyContacts: true
      }
    },
    performance: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 3600000, // 1 hour
      compressionEnabled: true,
      compressionLevel: 6,
      deduplicationEnabled: true,
      preloadCriticalResources: true,
      lazyLoadNonCritical: true
    },
    emergencyMode: {
      enabled: true,
      autoActivate: true,
      activationTriggers: [
        {
          type: 'push',
          condition: { priority: 'emergency' },
          action: 'activate'
        },
        {
          type: 'network',
          condition: { offline: true },
          action: 'prepare'
        }
      ],
      cacheStrategy: 'aggressive',
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      criticalResources: [
        '/api/emergency',
        '/api/alerts/critical',
        '/offline/emergency',
        '/emergency-contacts.json'
      ],
      reducedFunctionality: true,
      batteryOptimization: true
    }
  }
}
