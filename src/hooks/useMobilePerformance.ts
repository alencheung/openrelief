'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useMobileDetection } from './useMobileDetection'

export interface PerformanceMetrics {
  fps: number
  memoryUsage?: number
  renderTime: number
  isLowEndDevice: boolean
  isHighEndDevice: boolean
  batteryLevel?: number
  isCharging?: boolean
  connectionType?: string
  effectiveConnectionType?: string
}

export interface PerformanceOptions {
  enableFPSMonitoring?: boolean
  enableMemoryMonitoring?: boolean
  enableBatteryMonitoring?: boolean
  enableConnectionMonitoring?: boolean
  targetFPS?: number
  lowEndThreshold?: number
  highEndThreshold?: number
}

const defaultOptions: Required<PerformanceOptions> = {
  enableFPSMonitoring: true,
  enableMemoryMonitoring: true,
  enableBatteryMonitoring: true,
  enableConnectionMonitoring: true,
  targetFPS: 60,
  lowEndThreshold: 30,
  highEndThreshold: 55
}

export function useMobilePerformance(options: PerformanceOptions = {}) {
  const opts = { ...defaultOptions, ...options }
  const { deviceType, isMobile } = useMobileDetection()

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    isLowEndDevice: false,
    isHighEndDevice: true
  })

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const renderTimeRef = useRef(0)
  const animationFrameRef = useRef<number>()
  const monitoringIntervalRef = useRef<NodeJS.Timeout>()

  // Calculate FPS
  const calculateFPS = useCallback(() => {
    const now = performance.now()
    const delta = now - lastTimeRef.current
    const fps = Math.round(1000 / (delta / frameCountRef.current))

    frameCountRef.current = 0
    lastTimeRef.current = now

    return fps
  }, [])

  // Monitor memory usage
  const getMemoryUsage = useCallback(() => {
    if (!opts.enableMemoryMonitoring || !('memory' in performance)) {
      return undefined
    }

    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    }
  }, [opts.enableMemoryMonitoring])

  // Monitor battery status
  const getBatteryStatus = useCallback(async () => {
    if (!opts.enableBatteryMonitoring || !('getBattery' in navigator)) {
      return { level: undefined, charging: undefined }
    }

    try {
      const battery = await (navigator as any).getBattery()
      return {
        level: battery.level,
        charging: battery.charging
      }
    } catch (error) {
      console.warn('Battery API not available:', error)
      return { level: undefined, charging: undefined }
    }
  }, [opts.enableBatteryMonitoring])

  // Monitor network connection
  const getConnectionInfo = useCallback(() => {
    if (!opts.enableConnectionMonitoring || !('connection' in navigator)) {
      return { type: undefined, effectiveType: undefined }
    }

    const connection = (navigator as any).connection
    return {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }, [opts.enableConnectionMonitoring])

  // Performance monitoring loop
  const startMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      return
    }

    const monitor = () => {
      frameCountRef.current++
      const startRender = performance.now()

      animationFrameRef.current = requestAnimationFrame(() => {
        const endRender = performance.now()
        renderTimeRef.current = endRender - startRender
        monitor()
      })
    }

    monitor()

    // Update metrics periodically
    monitoringIntervalRef.current = setInterval(() => {
      const fps = calculateFPS()
      const memoryUsage = getMemoryUsage()

      getBatteryStatus().then(battery => {
        const connection = getConnectionInfo()

        const isLowEnd = fps < opts.lowEndThreshold
                         || (memoryUsage && memoryUsage.percentage > 80)
                         || (battery.level !== undefined && battery.level < 0.2)
                         || (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')

        const isHighEnd = fps >= opts.highEndThreshold
                          && (!memoryUsage || memoryUsage.percentage < 50)
                          && (battery.level === undefined || battery.level > 0.5)
                          && (!connection.effectiveType || ['4g', '3g'].includes(connection.effectiveType))

        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: memoryUsage?.percentage,
          renderTime: renderTimeRef.current,
          isLowEndDevice: isLowEnd,
          isHighEndDevice: isHighEnd,
          batteryLevel: battery.level,
          isCharging: battery.charging,
          connectionType: connection.type,
          effectiveConnectionType: connection.effectiveType
        }))
      })
    }, 1000)
  }, [calculateFPS, getMemoryUsage, getBatteryStatus, getConnectionInfo, opts])

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current)
      monitoringIntervalRef.current = undefined
    }
  }, [])

  // Start/stop monitoring based on component lifecycle
  useEffect(() => {
    startMonitoring()
    return stopMonitoring
  }, [startMonitoring, stopMonitoring])

  // Adjust performance based on device capabilities
  const getPerformanceLevel = useCallback(() => {
    if (metrics.isLowEndDevice) {
      return 'low'
    }
    if (metrics.isHighEndDevice) {
      return 'high'
    }
    return 'medium'
  }, [metrics])

  // Get optimized settings based on performance
  const getOptimizedSettings = useCallback(() => {
    const level = getPerformanceLevel()

    return {
      animationQuality: level === 'low' ? 'reduced' : level === 'medium' ? 'normal' : 'high',
      maxParticles: level === 'low' ? 10 : level === 'medium' ? 25 : 50,
      enableShadows: level !== 'low',
      enableBlur: level !== 'low',
      enableTransitions: level !== 'low',
      updateInterval: level === 'low' ? 200 : level === 'medium' ? 100 : 50,
      maxConcurrentRequests: level === 'low' ? 2 : level === 'medium' ? 4 : 6,
      imageQuality: level === 'low' ? 0.7 : level === 'medium' ? 0.8 : 0.9
    }
  }, [getPerformanceLevel])

  // Performance-aware requestAnimationFrame
  const requestAnimationFrameThrottled = useCallback((callback: FrameRequestCallback) => {
    if (metrics.isLowEndDevice) {
      // Throttle on low-end devices
      return setTimeout(() => callback(performance.now()), 1000 / 30) as unknown as number
    }
    return requestAnimationFrame(callback)
  }, [metrics.isLowEndDevice])

  // Performance-aware setTimeout
  const setTimeoutAdaptive = useCallback((callback: () => void, delay: number) => {
    const multiplier = metrics.isLowEndDevice ? 1.5 : metrics.isHighEndDevice ? 0.8 : 1
    return setTimeout(callback, delay * multiplier)
  }, [metrics.isLowEndDevice, metrics.isHighEndDevice])

  // Memory cleanup
  const cleanupMemory = useCallback(() => {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }

    // Clear any cached data that might be large
    if (metrics.memoryUsage && metrics.memoryUsage > 80) {
      // Dispatch custom event for components to clear their caches
      window.dispatchEvent(new CustomEvent('memory-cleanup'))
    }
  }, [metrics.memoryUsage])

  return {
    metrics,
    getPerformanceLevel,
    getOptimizedSettings,
    requestAnimationFrameThrottled,
    setTimeoutAdaptive,
    cleanupMemory,
    startMonitoring,
    stopMonitoring
  }
}

// Hook for adaptive rendering based on performance
export function useAdaptiveRendering<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  options?: {
    maxItems?: number
    threshold?: number
    placeholder?: React.ReactNode
  }
) {
  const { getPerformanceLevel } = useMobilePerformance()
  const performanceLevel = getPerformanceLevel()

  const maxItems = options?.maxItems || 100
  const threshold = options?.threshold || 50

  const [visibleItems, setVisibleItems] = useState<T[]>([])
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const itemCount = performanceLevel === 'low'
      ? Math.min(threshold, items.length)
      : Math.min(maxItems, items.length)

    setVisibleItems(items.slice(0, itemCount))
    setShowMore(items.length > itemCount)
  }, [items, performanceLevel, maxItems, threshold])

  const handleShowMore = useCallback(() => {
    const currentLength = visibleItems.length
    const nextBatch = performanceLevel === 'low'
      ? Math.min(threshold, items.length - currentLength)
      : Math.min(maxItems - currentLength, items.length - currentLength)

    setVisibleItems(prev => [...prev, ...items.slice(currentLength, currentLength + nextBatch)])
    setShowMore(items.length > currentLength + nextBatch)
  }, [visibleItems.length, items, performanceLevel, threshold, maxItems])

  return {
    visibleItems,
    showMore,
    handleShowMore,
    renderItem: (item: T, index: number) => renderItem(item, index),
    placeholder: options?.placeholder
  }
}

// Hook for lazy loading based on performance
export function usePerformanceAwareLazyLoad() {
  const { getPerformanceLevel } = useMobilePerformance()
  const performanceLevel = getPerformanceLevel()

  const getLoadDelay = useCallback(() => {
    switch (performanceLevel) {
      case 'low': return 500
      case 'medium': return 200
      case 'high': return 0
      default: return 200
    }
  }, [performanceLevel])

  const getRootMargin = useCallback(() => {
    switch (performanceLevel) {
      case 'low': return '200px'
      case 'medium': return '100px'
      case 'high': return '50px'
      default: return '100px'
    }
  }, [performanceLevel])

  return {
    loadDelay: getLoadDelay(),
    rootMargin: getRootMargin(),
    shouldUseIntersection: performanceLevel !== 'low'
  }
}