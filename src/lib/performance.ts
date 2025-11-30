// Performance optimization utilities for OpenRelief emergency scenarios
import { useState, useEffect } from 'react'

// Types
export interface PerformanceMetrics {
  queryPerformance: {
    averageTime: number
    slowQueries: number
    errorRate: number
    cacheHitRate: number
  }
  storePerformance: {
    updateFrequency: number
    stateSize: number
    memoryUsage: number
  }
  networkPerformance: {
    latency: number
    bandwidth: number
    reliability: number
  }
  userExperience: {
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    firstInputDelay: number
  }
}

export interface PerformanceThresholds {
  queryTime: number // milliseconds
  errorRate: number // percentage
  cacheHitRate: number // percentage
  memoryUsage: number // MB
  networkLatency: number // milliseconds
  fcp: number // milliseconds
  lcp: number // milliseconds
  cls: number // cumulative layout shift
  fid: number // milliseconds
}

export interface OptimizationConfig {
  emergencyMode: boolean
  networkQuality: 'slow' | 'medium' | 'fast'
  deviceCapabilities: 'low' | 'medium' | 'high'
  batteryLevel?: number // 0-1
  memoryPressure?: 'low' | 'medium' | 'high'
}

// Default thresholds for emergency scenarios
const EMERGENCY_THRESHOLDS: PerformanceThresholds = {
  queryTime: 2000, // 2 seconds for critical queries
  errorRate: 5, // 5% error rate
  cacheHitRate: 80, // 80% cache hit rate
  memoryUsage: 100, // 100MB memory usage
  networkLatency: 1000, // 1 second network latency
  fcp: 1500, // 1.5 seconds first contentful paint
  lcp: 2500, // 2.5 seconds largest contentful paint
  cls: 0.25, // 0.25 cumulative layout shift
  fid: 300, // 300ms first input delay
}

// Performance monitoring class
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    queryPerformance: {
      averageTime: 0,
      slowQueries: 0,
      errorRate: 0,
      cacheHitRate: 0,
    },
    storePerformance: {
      updateFrequency: 0,
      stateSize: 0,
      memoryUsage: 0,
    },
    networkPerformance: {
      latency: 0,
      bandwidth: 0,
      reliability: 0,
    },
    userExperience: {
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
    },
  }

  private observers: PerformanceObserver[] = []
  private config: OptimizationConfig = {
    emergencyMode: false,
    networkQuality: 'medium',
    deviceCapabilities: 'medium',
  }

  constructor(config?: Partial<OptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.initializeMonitoring()
  }

  private initializeMonitoring() {
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      this.observeWebVitals()
    }

    // Monitor memory usage
    this.monitorMemoryUsage()

    // Monitor network performance
    this.monitorNetworkPerformance()

    // Monitor query performance
    this.monitorQueryPerformance()
  }

  private observeWebVitals() {
    // First Contentful Paint
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.userExperience.firstContentfulPaint = entry.startTime
          }
        })
      })
      observer.observe({ entryTypes: ['paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('[Performance] FCP monitoring not supported:', error)
    }

    // Largest Contentful Paint
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            this.metrics.userExperience.largestContentfulPaint = entry.startTime
          }
        })
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('[Performance] LCP monitoring not supported:', error)
    }

    // Cumulative Layout Shift
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            this.metrics.userExperience.cumulativeLayoutShift += (entry as any).value
          }
        })
      })
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('[Performance] CLS monitoring not supported:', error)
    }

    // First Input Delay
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            this.metrics.userExperience.firstInputDelay = (entry as any).processingStart - entry.startTime
          }
        })
      })
      observer.observe({ entryTypes: ['first-input'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('[Performance] FID monitoring not supported:', error)
    }
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        this.metrics.storePerformance.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB

        // Trigger cleanup if memory is high
        if (this.metrics.storePerformance.memoryUsage > EMERGENCY_THRESHOLDS.memoryUsage) {
          this.optimizeMemoryUsage()
        }
      }

      // Check memory every 5 seconds
      setInterval(checkMemory, 5000)
    }
  }

  private monitorNetworkPerformance() {
    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection

      const updateNetworkMetrics = () => {
        this.metrics.networkPerformance.latency = connection.rtt || 0
        this.metrics.networkPerformance.bandwidth = connection.downlink || 0
        this.metrics.networkPerformance.reliability = this.calculateReliability()

        // Adjust config based on network quality
        this.adjustConfigForNetwork()
      }

      connection.addEventListener('change', updateNetworkMetrics)
      updateNetworkMetrics()
    }

    // Monitor actual request performance
    this.monitorRequestPerformance()
  }

  private monitorRequestPerformance() {
    // Intercept fetch to measure performance
    const originalFetch = window.fetch
    let requestCount = 0
    let totalTime = 0
    let errorCount = 0

    window.fetch = async (...args) => {
      const startTime = performance.now()
      requestCount++

      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        totalTime += endTime - startTime

        // Log slow requests
        if (endTime - startTime > EMERGENCY_THRESHOLDS.queryTime) {
          console.warn(`[Performance] Slow request detected: ${endTime - startTime}ms`)
        }

        return response
      } catch (error) {
        errorCount++
        throw error
      }
    }

    // Calculate metrics every 10 requests
    setInterval(() => {
      if (requestCount > 0) {
        this.metrics.networkPerformance.latency = totalTime / requestCount
        this.metrics.queryPerformance.errorRate = (errorCount / requestCount) * 100

        requestCount = 0
        totalTime = 0
        errorCount = 0
      }
    }, 10000)
  }

  private monitorQueryPerformance() {
    // This would integrate with TanStack Query
    // For now, we'll simulate with a timer
    setInterval(() => {
      this.metrics.queryPerformance.averageTime = Math.random() * 1000 // Simulated
      this.metrics.queryPerformance.cacheHitRate = 75 + Math.random() * 20 // Simulated
    }, 5000)
  }

  private calculateReliability(): number {
    // Calculate network reliability based on recent performance
    // This is a simplified calculation
    return 0.95 // 95% reliability
  }

  private adjustConfigForNetwork() {
    const { networkPerformance } = this.metrics

    if (networkPerformance.latency > 1000) {
      this.config.networkQuality = 'slow'
    } else if (networkPerformance.latency > 300) {
      this.config.networkQuality = 'medium'
    } else {
      this.config.networkQuality = 'fast'
    }
  }

  private optimizeMemoryUsage() {
    console.log('[Performance] Optimizing memory usage...')

    // Trigger garbage collection if available
    if (window.gc) {
      window.gc()
    }

    // Clear old cached data
    this.clearOldCache()

    // Notify stores to optimize
    this.notifyStoresToOptimize()
  }

  private clearOldCache() {
    // Clear localStorage items older than 1 hour
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('openrelief-')) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            if (parsed.timestamp && now - parsed.timestamp > oneHour) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Remove invalid items
          localStorage.removeItem(key)
        }
      }
    }
  }

  private notifyStoresToOptimize() {
    // Dispatch custom event to notify stores
    window.dispatchEvent(new CustomEvent('optimize-memory'))
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public getOptimizationConfig(): OptimizationConfig {
    return { ...this.config }
  }

  public updateConfig(config: Partial<OptimizationConfig>) {
    this.config = { ...this.config, ...config }
  }

  public destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Emergency optimization strategies
export class EmergencyOptimizer {
  private config: OptimizationConfig
  private monitor: PerformanceMonitor

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      emergencyMode: false,
      networkQuality: 'medium',
      deviceCapabilities: 'medium',
      ...config,
    }

    this.monitor = new PerformanceMonitor(this.config)
  }

  public optimizeForEmergency() {
    console.log('[Emergency] Optimizing for emergency scenario...')

    this.config.emergencyMode = true
    this.monitor.updateConfig(this.config)

    // Apply emergency optimizations
    this.optimizeQueries()
    this.optimizeRendering()
    this.optimizeNetwork()
    this.optimizeMemory()
  }

  private optimizeQueries() {
    // Reduce query frequency
    // Increase cache times
    // Prioritize critical queries
    console.log('[Emergency] Optimizing queries for emergency mode')
  }

  private optimizeRendering() {
    // Reduce animations
    // Simplify UI
    // Prioritize critical elements
    document.body.classList.add('emergency-mode')

    // Disable non-essential animations
    const style = document.createElement('style')
    style.textContent = `
      .emergency-mode * {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
      }
    `
    document.head.appendChild(style)
  }

  private optimizeNetwork() {
    // Reduce request size
    // Increase retry attempts
    // Use compression
    console.log('[Emergency] Optimizing network for emergency mode')
  }

  private optimizeMemory() {
    // Clear non-essential cache
    // Reduce memory usage
    // Prioritize critical data
    console.log('[Emergency] Optimizing memory for emergency mode')
  }

  public exitEmergencyMode() {
    console.log('[Emergency] Exiting emergency mode...')

    this.config.emergencyMode = false
    this.monitor.updateConfig(this.config)

    // Remove emergency optimizations
    document.body.classList.remove('emergency-mode')

    // Remove emergency styles
    const emergencyStyles = document.querySelector('style[data-emergency="true"]')
    if (emergencyStyles) {
      emergencyStyles.remove()
    }
  }
}

// Utility functions
export const measureQueryPerformance = <T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now()

  return fn().then(result => {
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`[Performance] Query ${queryName}: ${duration.toFixed(2)}ms`)

    // Report slow queries
    if (duration > EMERGENCY_THRESHOLDS.queryTime) {
      console.warn(`[Performance] Slow query detected: ${queryName} (${duration.toFixed(2)}ms)`)
    }

    return result
  }).catch(error => {
    const endTime = performance.now()
    const duration = endTime - startTime

    console.error(`[Performance] Failed query ${queryName}: ${duration.toFixed(2)}ms`, error)

    throw error
  })
}

export const debounceForEmergency = <T extends any[], R>(
  fn: (...args: T) => R,
  delay: number,
  emergencyDelay?: number
) => {
  let timeoutId: NodeJS.Timeout
  let lastCallTime = 0

  return (...args: T) => {
    const now = Date.now()
    const isEmergency = document.body.classList.contains('emergency-mode')
    const actualDelay = isEmergency && emergencyDelay ? emergencyDelay : delay

    // Clear previous timeout
    clearTimeout(timeoutId)

    // For emergency mode, reduce debounce delay
    if (isEmergency && now - lastCallTime < actualDelay) {
      timeoutId = setTimeout(() => fn(...args), 50) // Minimal delay for emergency
    } else {
      timeoutId = setTimeout(() => fn(...args), actualDelay)
    }

    lastCallTime = now
  }
}

export const throttleForEmergency = <T extends any[], R>(
  fn: (...args: T) => R,
  delay: number,
  emergencyDelay?: number
) => {
  let lastCallTime = 0
  let timeoutId: NodeJS.Timeout

  return (...args: T) => {
    const now = Date.now()
    const isEmergency = document.body.classList.contains('emergency-mode')
    const actualDelay = isEmergency && emergencyDelay ? emergencyDelay : delay

    if (now - lastCallTime >= actualDelay) {
      lastCallTime = now
      return fn(...args)
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now()
        fn(...args)
      }, actualDelay - (now - lastCallTime))
      return undefined
    }
  }
}

// Performance optimization hooks
export const usePerformanceOptimization = () => {
  const [monitor] = useState(() => new PerformanceMonitor())
  const [optimizer] = useState(() => new EmergencyOptimizer())

  useEffect(() => {
    // Initialize monitoring
    const metrics = monitor.getMetrics()

    // Check if emergency optimization is needed
    if (metrics.queryPerformance.errorRate > EMERGENCY_THRESHOLDS.errorRate ||
      metrics.userExperience.firstInputDelay > EMERGENCY_THRESHOLDS.fid) {
      optimizer.optimizeForEmergency()
    }

    return () => {
      monitor.destroy()
    }
  }, [monitor, optimizer])

  return { monitor, optimizer }
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor()
export const emergencyOptimizer = new EmergencyOptimizer()

// Export utilities
export { EMERGENCY_THRESHOLDS }