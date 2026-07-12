// Comprehensive error handling types for OpenRelief

/**
 * Minimal structural shape that classifyError and retry logic rely on.
 * Errors thrown in JS are `unknown` at catch sites; consumers narrow to
 * this shape before reading name / message / code.
 */
export interface ErrorLike {
  name?: string
  message?: string
  code?: string | number
}

export interface ErrorContext {
  action?: string
  table?: string
  userId?: string
  eventId?: string
  endpoint?: string
  retryCount?: number
  [key: string]: unknown
}

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
  context?: ErrorContext
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
  retryCondition?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => void
  onSuccess?: (attempt: number) => void
  onFailure?: (error: unknown, attempts: number) => void
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: ErrorInfo | null | undefined
  errorCount: number
  lastErrorTime: number | null | undefined
  retryCount: number
  isRecovering: boolean
}
