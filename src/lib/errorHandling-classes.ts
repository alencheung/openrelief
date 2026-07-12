// Error boundary and circuit breaker classes for OpenRelief
//
// Extracted from errorHandling.ts to keep each module under 500 lines.
// Depends on the core error functions (classifyError, recoverFromError,
// reportError, createRetryFunction) which remain in errorHandling.ts.

import {
  classifyError,
  recoverFromError,
  reportError,
  createRetryFunction
} from './errorHandling'
import type {
  ErrorInfo,
  ErrorBoundaryState,
  RetryConfig
} from './errorHandling-types'

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
export const createSafeAsyncFunction = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: ErrorInfo) => void
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

export const withErrorHandling = <T extends unknown[], R>(
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
