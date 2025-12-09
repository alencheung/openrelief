// Comprehensive logging utility for real-time subscription debugging
import { classifyError } from './errorHandling'

export interface RealtimeLogEntry {
    timestamp: string
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
    component: string
    action: string
    message: string
    data?: any
    error?: any
    context?: {
        table?: string
        eventId?: string
        userId?: string
        subscriptionId?: string
        retryCount?: number
        networkStatus?: boolean
        connectionStatus?: string
    }
}

class RealtimeLogger {
  private logs: RealtimeLogEntry[] = []
  private maxLogs = 1000 // Keep last 1000 logs
  private subscribers: Array<(logs: RealtimeLogEntry[]) => void> = []

  // Core logging methods
  debug(component: string, action: string, message: string, data?: any, context?: RealtimeLogEntry['context']) {
    this.log('debug', component, action, message, data, undefined, context)
  }

  info(component: string, action: string, message: string, data?: any, context?: RealtimeLogEntry['context']) {
    this.log('info', component, action, message, data, undefined, context)
  }

  warn(component: string, action: string, message: string, data?: any, error?: any, context?: RealtimeLogEntry['context']) {
    this.log('warn', component, action, message, data, error, context)
  }

  error(component: string, action: string, message: string, data?: any, error?: any, context?: RealtimeLogEntry['context']) {
    this.log('error', component, action, message, data, error, context)
  }

  critical(component: string, action: string, message: string, data?: any, error?: any, context?: RealtimeLogEntry['context']) {
    this.log('critical', component, action, message, data, error, context)
  }

  // Internal log method
  private log(
    level: RealtimeLogEntry['level'],
    component: string,
    action: string,
    message: string,
    data?: any,
    error?: any,
    context?: RealtimeLogEntry['context']
  ) {
    // Create log entry
    const entry: RealtimeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      message,
      data,
      error
    }

    // Handle context with exactOptionalPropertyTypes compliance
    if (context) {
      const contextObj: RealtimeLogEntry['context'] = {}
      if (context.table !== undefined) {
        contextObj.table = context.table
      }
      if (context.eventId !== undefined) {
        contextObj.eventId = context.eventId
      }
      if (context.userId !== undefined) {
        contextObj.userId = context.userId
      }
      if (context.subscriptionId !== undefined) {
        contextObj.subscriptionId = context.subscriptionId
      }
      if (context.retryCount !== undefined) {
        contextObj.retryCount = context.retryCount
      }
      if (context.networkStatus !== undefined) {
        contextObj.networkStatus = context.networkStatus
      }
      if (context.connectionStatus !== undefined) {
        contextObj.connectionStatus = context.connectionStatus
      }

      if (Object.keys(contextObj).length > 0) {
        entry.context = contextObj
      }
    }

    // Add to logs
    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output with formatting
    const prefix = `[${level.toUpperCase()}][${component}][${action}]`

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '', error || '')
        break
      case 'info':
        console.info(prefix, message, data || '', error || '')
        break
      case 'warn':
        console.warn(prefix, message, data || '', error || '')
        break
      case 'error':
        console.error(prefix, message, data || '', error || '')
        break
      case 'critical':
        console.error('🚨', prefix, message, data || '', error || '')
        break
    }

    // Notify subscribers
    this.notifySubscribers()
  }

  // Subscription management
  subscribe(callback: (logs: RealtimeLogEntry[]) => void) {
    this.subscribers.push(callback)
    callback(this.getRecentLogs())

    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getRecentLogs())
      } catch (error) {
        console.error('[RealtimeLogger] Subscriber error:', error)
      }
    })
  }

  // Query methods
  getRecentLogs(count: number = 100): RealtimeLogEntry[] {
    return this.logs.slice(-count)
  }

  getLogsByLevel(level: RealtimeLogEntry['level']): RealtimeLogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  getLogsByComponent(component: string): RealtimeLogEntry[] {
    return this.logs.filter(log => log.component === component)
  }

  getErrorLogs(): RealtimeLogEntry[] {
    return this.logs.filter(log => log.level === 'error' || log.level === 'critical')
  }

  // Analysis methods
  getSubscriptionHealth(): {
        totalConnections: number
        successfulConnections: number
        failedConnections: number
        averageRetryCount: number
        errorRate: number
        recentErrors: RealtimeLogEntry[]
        } {
    const connectionLogs = this.logs.filter(log =>
      log.action === 'subscribe' || log.action === 'connect'
    )

    const successfulConnections = connectionLogs.filter(log =>
      log.level === 'info' && log.message.includes('Successfully')
    )

    const failedConnections = connectionLogs.filter(log =>
      log.level === 'error' || log.level === 'critical'
    )

    const retryLogs = this.logs.filter(log =>
      log.context?.retryCount && log.context.retryCount > 0
    )

    const averageRetryCount = retryLogs.length > 0
      ? retryLogs.reduce((sum, log) => sum + (log.context?.retryCount || 0), 0) / retryLogs.length
      : 0

    const recentErrors = this.getErrorLogs().slice(-10)

    return {
      totalConnections: connectionLogs.length,
      successfulConnections: successfulConnections.length,
      failedConnections: failedConnections.length,
      averageRetryCount,
      errorRate: connectionLogs.length > 0 ? (failedConnections.length / connectionLogs.length) * 100 : 0,
      recentErrors
    }
  }

  // Export methods
  exportLogs(): string {
    const logData = {
      exportTime: new Date().toISOString(),
      health: this.getSubscriptionHealth(),
      logs: this.logs
    }

    return JSON.stringify(logData, null, 2)
  }

  clearLogs() {
    this.logs = []
    console.info('[RealtimeLogger] Logs cleared')
  }
}

// Global logger instance
export const realtimeLogger = new RealtimeLogger()

// Convenience exports
export const logSubscriptionAttempt = (component: string, table: string, attempt: number, maxRetries: number) => {
  realtimeLogger.debug(component, 'subscribe', `Attempt ${attempt}/${maxRetries} for ${table}`, null, {
    table,
    retryCount: attempt
  })
}

export const logSubscriptionSuccess = (component: string, table: string, retryCount: number) => {
  realtimeLogger.info(component, 'subscribe', `Successfully subscribed to ${table}`, null, {
    table,
    retryCount
  })
}

export const logSubscriptionError = (component: string, table: string, error: any, attempt: number) => {
  const errorInfo = classifyError(error, {
    action: 'subscription',
    table,
    attempt
  })

  realtimeLogger.error(component, 'subscribe', `Failed to subscribe to ${table}`, null, error, {
    table,
    retryCount: attempt,
    networkStatus: navigator.onLine
  })
}

export const logConnectionState = (component: string, state: 'connecting' | 'connected' | 'disconnected' | 'error', table?: string) => {
  realtimeLogger.info(component, 'connection', `Connection state: ${state}`, null, {
    connectionStatus: state,
    ...(table ? { table } : {}),
    networkStatus: navigator.onLine
  })
}

export const logBroadcastAttempt = (component: string, channel: string, eventId?: string) => {
  realtimeLogger.debug(component, 'broadcast', `Attempting broadcast to ${channel}`, null, {
    ...(eventId ? { eventId } : {})
  })
}

export const logBroadcastSuccess = (component: string, channel: string, eventId?: string) => {
  realtimeLogger.info(component, 'broadcast', `Successfully broadcast to ${channel}`, null, {
    ...(eventId ? { eventId } : {})
  })
}

export const logBroadcastError = (component: string, channel: string, error: any, eventId?: string) => {
  const errorInfo = classifyError(error, {
    action: 'broadcast',
    channel,
    eventId
  })

  realtimeLogger.error(component, 'broadcast', `Failed to broadcast to ${channel}`, null, error, {
    ...(eventId ? { eventId } : {}),
    networkStatus: navigator.onLine
  })
}

export const logOfflineQueue = (component: string, action: string, table: string, priority: string) => {
  realtimeLogger.info(component, 'offline', `Queued ${action} for ${table} (priority: ${priority})`, null, {
    table,
    networkStatus: false
  })
}

// Performance monitoring
export const logPerformanceMetric = (component: string, action: string, metric: string, value: number, unit?: string) => {
  realtimeLogger.debug(component, 'performance', `${metric}: ${value}${unit || ''}`, { [metric]: value })
}

// Health check utility
export const checkRealtimeHealth = () => {
  const health = realtimeLogger.getSubscriptionHealth()

  if (health.errorRate > 20) {
    realtimeLogger.critical('HealthMonitor', 'check', `High error rate: ${health.errorRate.toFixed(1)}%`, health)
  } else if (health.errorRate > 10) {
    realtimeLogger.warn('HealthMonitor', 'check', `Elevated error rate: ${health.errorRate.toFixed(1)}%`, health)
  } else if (health.averageRetryCount > 3) {
    realtimeLogger.warn('HealthMonitor', 'check', `High average retry count: ${health.averageRetryCount.toFixed(1)}`, health)
  } else {
    realtimeLogger.info('HealthMonitor', 'check', 'Real-time subscriptions healthy', health)
  }

  return health
}

// Auto-export logs on critical errors
if (typeof window !== 'undefined') {
  setInterval(() => {
    const criticalErrors = realtimeLogger.getLogsByLevel('critical')
    if (criticalErrors.length > 0) {
      console.warn('[RealtimeLogger] Auto-exporting logs due to critical errors')

      // In a real app, you might send this to a monitoring service
      // For now, we'll just log it to console
      console.error('[RealtimeLogger] Critical errors detected:', criticalErrors)
    }
  }, 60000) // Check every minute
}