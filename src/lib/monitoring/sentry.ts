import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]
    })
  }
}

export function captureEmergencyError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'emergency')
    scope.setContext('emergencyContext', context)
    Sentry.captureException(error)
  })
}

export function captureTrustError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'trust')
    scope.setContext('trustContext', context)
    Sentry.captureException(error)
  })
}

export function captureConsensusError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'consensus')
    scope.setContext('consensusContext', context)
    Sentry.captureException(error)
  })
}

export function captureSyncError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'sync')
    scope.setContext('syncContext', context)
    Sentry.captureException(error)
  })
}

export function captureMapError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'map')
    scope.setContext('mapContext', context)
    Sentry.captureException(error)
  })
}

export function captureOfflineError(error: Error, context: Record<string, unknown>) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'offline')
    scope.setContext('offlineContext', context)
    Sentry.captureException(error)
  })
}

export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.role
  })
}

export function clearUserContext() {
  Sentry.setUser(null)
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info'
  })
}
