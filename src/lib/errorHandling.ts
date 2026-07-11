// Comprehensive error handling and retry logic for OpenRelief

// Types
export interface ErrorInfo {
  id: string
  type:
    | 'network'
    | 'validation'
    | 'permission'
    | 'database'
    | 'auth'
    | 'offline'
    | 'timeout'
    | 'rate_limit'
    | 'server_error'
    | 'unknown'
  message: string
  code?: string | number
  timestamp: number
  context?: {
    action?: string
    table?: string
    userId?: string
    eventId?: string
    endpoint?: string
    retryCount?: number
    [key: string]: any
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  suggestions: string[]
  retryable: boolean
  maxRetries?: number
  nextRetry?: number
  error?: Error
}

export interface RetryConfig {
  maxRetries: number
  // milliseconds
  baseDelay: number
  // milliseconds
  maxDelay: number
  backoffFactor: number
  jitter: boolean
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
  onSuccess?: (attempt: number) => void
  onFailure?: (error: any, attempts: number) => void
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: ErrorInfo | null | undefined
  errorCount: number
  lastErrorTime: number | null | undefined
  retryCount: number
  isRecovering: boolean
}

// Error classification
export const classifyError = (error: any, context?: any): ErrorInfo => {
  const timestamp = Date.now()
  const id = `error-${timestamp}-${Math.random().toString(36).substr(2, 9)}`

  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      id,
      type: 'network',
      message: 'Network connection failed',
      code: 'NETWORK_ERROR',
      timestamp,
      context,
      severity: 'high',
      recoverable: true,
      suggestions: ['Check your internet connection', 'Try again in a moment'],
      retryable: true,
      maxRetries: 3
    }
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
    return {
      id,
      type: 'timeout',
      message: 'Request timed out',
      code: 'TIMEOUT',
      timestamp,
      context,
      severity: 'medium',
      recoverable: true,
      suggestions: ['Check your connection speed', 'Try again'],
      retryable: true,
      maxRetries: 2
    }
  }

  // Permission errors
  if (error.message?.includes('permission') || error.code === 'PERMISSION_DENIED') {
    return {
      id,
      type: 'permission',
      message: 'Permission denied',
      code: 'PERMISSION_DENIED',
      timestamp,
      context,
      severity: 'high',
      recoverable: false,
      suggestions: ['Grant required permissions', 'Check browser settings'],
      retryable: false
    }
  }

  // Authentication errors
  if (error.code === '401' || error.message?.includes('unauthorized')) {
    return {
      id,
      type: 'auth',
      message: 'Authentication failed',
      code: 401,
      timestamp,
      context,
      severity: 'high',
      recoverable: true,
      suggestions: ['Sign in again', 'Check your credentials'],
      retryable: false
    }
  }

  // Validation errors
  if (error.code === '400' || error.name === 'ValidationError') {
    return {
      id,
      type: 'validation',
      message: 'Invalid data provided',
      code: 400,
      timestamp,
      context,
      severity: 'medium',
      recoverable: true,
      suggestions: ['Check your input', 'Ensure all required fields are filled'],
      retryable: false
    }
  }

  // Rate limiting
  if (error.code === '429' || error.message?.includes('rate limit')) {
    return {
      id,
      type: 'rate_limit',
      message: 'Too many requests',
      code: 429,
      timestamp,
      context,
      severity: 'medium',
      recoverable: true,
      suggestions: ['Wait before trying again', 'Reduce request frequency'],
      retryable: true,
      maxRetries: 5,
      // 1 minute
      nextRetry: timestamp + 60000
    }
  }

  // Server errors. Guard the type first: error.code can be a string
  // ('NETWORK_ERROR', 'PGRST116'), a number, or undefined. The previous
  // `error.code >= 500` threw when code was undefined and produced
  // nonsensical comparisons when code was a non-numeric string.
  const numericCode = typeof error.code === 'number' ? error.code : undefined
  if (numericCode !== undefined && numericCode >= 500 && numericCode < 600) {
    return {
      id,
      type: 'server_error',
      message: 'Server error occurred',
      code: numericCode,
      timestamp,
      context,
      severity: 'high',
      recoverable: true,
      suggestions: ['Try again later', 'Contact support if problem persists'],
      retryable: true,
      maxRetries: 3
    }
  }

  // Database errors
  if (error.message?.includes('database') || error.code?.toString().startsWith('PGRST')) {
    return {
      id,
      type: 'database',
      message: 'Database operation failed',
      code: error.code,
      timestamp,
      context,
      severity: 'high',
      recoverable: true,
      suggestions: ['Try again', 'Contact support if problem persists'],
      retryable: true,
      maxRetries: 2
    }
  }

  // Offline errors
  if (!navigator.onLine || error.message?.includes('offline')) {
    return {
      id,
      type: 'offline',
      message: 'You are offline',
      code: 'OFFLINE',
      timestamp,
      context,
      severity: 'medium',
      recoverable: true,
      suggestions: ['Check your internet connection', 'Data will be synced when online'],
      retryable: false
    }
  }

  // Unknown errors
  return {
    id,
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    code: error.code,
    timestamp,
    context,
    severity: 'medium',
    recoverable: true,
    suggestions: ['Try again', 'Refresh the page', 'Contact support'],
    retryable: true,
    maxRetries: 1
  }
}

// Retry logic with exponential backoff
export const createRetryFunction = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
) => {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  }

  const finalConfig = { ...defaultConfig, ...config }

  return async (...args: T): Promise<R> => {
    let lastError: any

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await fn(...args)

        if (attempt > 0 && finalConfig.onSuccess) {
          finalConfig.onSuccess(attempt)
        }

        return result
      } catch (error) {
        lastError = error

        const errorInfo = classifyError(error)

        // Check if we should retry
        const shouldRetry =
          attempt < finalConfig.maxRetries &&
          errorInfo.retryable &&
          (!finalConfig.retryCondition || finalConfig.retryCondition(error))

        if (!shouldRetry) {
          if (finalConfig.onFailure) {
            finalConfig.onFailure(error, attempt)
          }
          throw error
        }

        // Calculate delay
        let delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt)

        // Apply jitter if enabled
        if (finalConfig.jitter) {
          delay *= 0.5 + Math.random() * 0.5
        }

        // Respect max delay
        delay = Math.min(delay, finalConfig.maxDelay)

        // Respect specific retry time for rate limiting
        if (errorInfo.type === 'rate_limit' && errorInfo.nextRetry) {
          delay = Math.max(delay, errorInfo.nextRetry - Date.now())
        }

        console.warn(
          `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1} failed, retrying in ${Math.round(delay)}ms:`,
          (error as Error).message || 'Unknown error'
        )

        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt + 1, error)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (finalConfig.onFailure) {
      finalConfig.onFailure(lastError, finalConfig.maxRetries + 1)
    }

    throw lastError
  }
}

// Error recovery strategies
export const recoverFromError = async (errorInfo: ErrorInfo): Promise<boolean> => {
  switch (errorInfo.type) {
    case 'network':
      // Try to reconnect. PROBE AT MOST ONCE per BACKEND_HEALTH_RECHECK_MS —
      // previously every client independently HEADed /api/health on every
      // network error, producing 100K health-check hits on top of the
      // original failure during a partial outage.
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const now = Date.now()
        if (backendHealthOpen && now - backendHealthCheckedAt < BACKEND_HEALTH_RECHECK_MS) {
          // Circuit is open and we probed recently; don't add to the load.
          return false
        }
        try {
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000)
          })
          setBackendHealthCircuit(!response.ok)
          return response.ok
        } catch {
          setBackendHealthCircuit(true)
          return false
        }
      }
      return false

    case 'offline':
      // Wait for connection
      return new Promise(resolve => {
        const handleOnline = () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline)
          }
          resolve(true)
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('online', handleOnline)
        }

        // Timeout after 30 seconds
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline)
          }
          resolve(false)
        }, 30000)
      })

    case 'timeout':
      // Retry with shorter timeout, but gate on the health circuit so we
      // don't compound the load when the backend is already struggling.
      if (
        backendHealthOpen &&
        Date.now() - backendHealthCheckedAt < BACKEND_HEALTH_RECHECK_MS
      ) {
        return false
      }
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(1000)
        })
        setBackendHealthCircuit(!response.ok)
        return response.ok
      } catch {
        setBackendHealthCircuit(true)
        return false
      }

    case 'permission':
      // Request permission
      if (errorInfo.context?.action === 'location') {
        try {
          const permission = await navigator.permissions.query({
            name: 'geolocation' as PermissionName
          })
          if (permission.state === 'prompt') {
            await navigator.geolocation.getCurrentPosition(
              () => {},
              () => {}
            )
            return true
          }
        } catch {
          return false
        }
      }
      return false

    case 'auth':
      // Try to refresh token
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST' })
        return response.ok
      } catch {
        return false
      }

    case 'rate_limit':
      // Wait for the specified time
      if (errorInfo.nextRetry) {
        const waitTime = errorInfo.nextRetry - Date.now()
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return true
        }
      }
      return false

    default:
      return false
  }
}

// Error reporting
//
// During a partial outage every client fires recoverFromError / reportError
// independently. Without sampling, the error-reporting endpoint becomes a
// secondary victim of the original failure (a self-inflicted feedback
// loop). We sample (default 10%), dedupe by error signature, and suppress
// while the backend health circuit is open.

const ERROR_REPORT_SAMPLE_RATE = 0.1 // report ~1 in 10 client-side errors
const ERROR_REPORT_DEDUP_TTL_MS = 60_000 // dedupe within a 60s window
const ERROR_REPORT_DEDUP_MAX = 500
const reportedSignatures = new Map<string, number>()

let backendHealthOpen = false
let backendHealthCheckedAt = 0
const BACKEND_HEALTH_RECHECK_MS = 15_000 // only probe /api/health every 15s

function shouldReportError(errorInfo: ErrorInfo): boolean {
  // Always report criticals and auth errors — these are operationally
  // important and rare enough not to flood.
  if (errorInfo.severity === 'critical' || errorInfo.type === 'auth') {
    return true
  }
  // If the backend health circuit is open, suppress non-critical reports
  // to avoid hammering a known-down endpoint.
  if (backendHealthOpen) {
    return false
  }
  // Random sampling for the long tail of low/medium errors.
  if (Math.random() > ERROR_REPORT_SAMPLE_RATE) {
    return false
  }
  return true
}

function dedupeKey(errorInfo: ErrorInfo): string {
  const ctx = errorInfo.context || {}
  return [
    errorInfo.type,
    errorInfo.code ?? '',
    ctx.action ?? '',
    ctx.endpoint ?? ctx.table ?? ''
  ].join('|')
}

export const reportError = async (errorInfo: ErrorInfo): Promise<void> => {
  if (!shouldReportError(errorInfo)) {
    return
  }

  // Dedupe identical error signatures within the TTL window. A single
  // backend hiccup previously produced thousands of POSTs per client via
  // the global error/unhandledrejection listeners.
  const key = dedupeKey(errorInfo)
  const now = Date.now()
  const lastSeen = reportedSignatures.get(key)
  if (lastSeen && now - lastSeen < ERROR_REPORT_DEDUP_TTL_MS) {
    return
  }
  // Bound the dedupe map.
  if (reportedSignatures.size > ERROR_REPORT_DEDUP_MAX) {
    const oldest = reportedSignatures.keys().next().value
    if (oldest) reportedSignatures.delete(oldest)
  }
  reportedSignatures.set(key, now)

  try {
    // Send to error tracking service
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...errorInfo,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: new Date().toISOString()
      })
    })
  } catch {
    // Fallback to console
    console.error('[Error Reporting] Failed to report error:', errorInfo)
  }
}

/**
 * Mark the backend health circuit as open (backend unreachable) or closed.
 * While open, recoverFromError skips its /api/health probe and reportError
 * suppresses non-critical reports — preventing the per-client retry storm
 * that previously turned a 30s blip into a sustained self-DDoS.
 */
export function setBackendHealthCircuit(open: boolean): void {
  backendHealthOpen = open
  backendHealthCheckedAt = Date.now()
}

// Error boundary class for React
export class EmergencyErrorBoundary {
  private state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorCount: 0,
    lastErrorTime: null,
    retryCount: 0,
    isRecovering: false
  }

  private listeners: Array<(state: ErrorBoundaryState) => void> = []

  constructor() {
    // Listen for unhandled errors
    window.addEventListener('error', this.handleGlobalError.bind(this))
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
  }

  private handleGlobalError = (event: ErrorEvent) => {
    const errorInfo = classifyError(event.error, {
      action: 'global_error',
      url: event.filename,
      line: event.lineno,
      column: event.colno
    })

    this.setError(errorInfo)
    reportError(errorInfo)
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const errorInfo = classifyError(event.reason, {
      action: 'unhandled_promise'
    })

    this.setError(errorInfo)
    reportError(errorInfo)
  }

  private setError = (error: ErrorInfo) => {
    this.state = {
      ...this.state,
      hasError: true,
      error,
      errorCount: this.state.errorCount + 1,
      lastErrorTime: Date.now()
    }

    this.notifyListeners()
  }

  public subscribe = (listener: (state: ErrorBoundaryState) => void) => {
    this.listeners.push(listener)
    listener(this.state)

    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners = () => {
    this.listeners.forEach(listener => listener(this.state))
  }

  public retry = async () => {
    if (!this.state.error || this.state.isRecovering) {
      return
    }

    const currentError = this.state.error // Store reference to avoid null issues

    this.state = {
      ...this.state,
      isRecovering: true,
      retryCount: this.state.retryCount + 1
    }
    this.notifyListeners()

    try {
      const recovered = await recoverFromError(currentError)
      if (recovered) {
        this.state = {
          hasError: false,
          error: null,
          errorCount: 0,
          lastErrorTime: null,
          retryCount: 0,
          isRecovering: false
        }
      } else {
        this.state = {
          ...this.state,
          isRecovering: false
        }
      }
    } catch {
      this.state = {
        ...this.state,
        isRecovering: false
      }
    }

    this.notifyListeners()
  }

  public reset = () => {
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: null,
      retryCount: 0,
      isRecovering: false
    }
    this.notifyListeners()
  }

  public getState = () => ({ ...this.state })
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private monitorPeriod: number = 300000 // 5 minutes
  ) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      this.state = 'open'
    }
  }

  public getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }

  public reset() {
    this.failureCount = 0
    this.lastFailureTime = 0
    this.state = 'closed'
  }
}

// Global error boundary instance
export const globalErrorBoundary = new EmergencyErrorBoundary()

// Utility functions
export const createSafeAsyncFunction = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: any) => void
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      const errorInfo = classifyError(error)

      if (errorHandler) {
        errorHandler(errorInfo)
      } else {
        console.error('[Safe Function] Error:', errorInfo)
        reportError(errorInfo)
      }

      return null
    }
  }
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    retry?: Partial<RetryConfig>
    circuitBreaker?: CircuitBreaker
    onError?: (error: ErrorInfo) => void
  } = {}
) => {
  const wrappedFn = createRetryFunction(fn, options.retry)

  return async (...args: T): Promise<R> => {
    try {
      if (options.circuitBreaker) {
        return await options.circuitBreaker.execute(() => wrappedFn(...args))
      } else {
        return await wrappedFn(...args)
      }
    } catch (error) {
      const errorInfo = classifyError(error)

      if (options.onError) {
        options.onError(errorInfo)
      } else {
        reportError(errorInfo)
      }

      throw error
    }
  }
}
