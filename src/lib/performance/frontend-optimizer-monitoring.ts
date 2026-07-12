/**
 * Performance monitoring helpers for the Frontend Performance Optimizer.
 *
 * Extracted from frontend-optimizer.ts. These functions set up the Core Web
 * Vitals observers, resource loading tracking, and user interaction metrics.
 */

import { performanceMonitor } from './performance-monitor'

/**
 * Observe Largest Contentful Paint (LCP).
 */
export function observeLCP(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    if (!lastEntry) return

    performanceMonitor.recordMetric({
      type: 'frontend',
      name: 'largest_contentful_paint',
      value: lastEntry.startTime,
      unit: 'ms'
    })
  })

  observer.observe({ entryTypes: ['largest-contentful-paint'] })
}

/**
 * Observe First Input Delay (FID).
 */
export function observeFID(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.name === 'first-input') {
        const ext = entry as PerformanceEventTiming
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'first_input_delay',
          value: ext.processingStart - entry.startTime,
          unit: 'ms'
        })
      }
    })
  })

  observer.observe({ entryTypes: ['first-input'] })
}

/**
 * Observe Cumulative Layout Shift (CLS).
 */
export function observeCLS(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  let clsValue = 0

  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      const ext = entry as LayoutShiftEntry
      if (!ext.hadRecentInput) {
        clsValue += ext.value
      }
    })

    performanceMonitor.recordMetric({
      type: 'frontend',
      name: 'cumulative_layout_shift',
      value: clsValue,
      unit: 'percentage'
    })
  })

  observer.observe({ entryTypes: ['layout-shift'] })
}

/**
 * Observe First Contentful Paint (FCP).
 */
export function observeFCP(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries()
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')

    if (fcpEntry) {
      performanceMonitor.recordMetric({
        type: 'frontend',
        name: 'first_contentful_paint',
        value: fcpEntry.startTime,
        unit: 'ms'
      })
    }
  })

  observer.observe({ entryTypes: ['paint'] })
}

/**
 * Observe Time to First Byte (TTFB).
 */
export function observeTTFB(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries()
    const navigationEntry = entries.find(entry => entry.entryType === 'navigation')

    if (navigationEntry) {
      const nav = navigationEntry as PerformanceNavigationTiming
      const ttfb = nav.responseStart - nav.requestStart
      performanceMonitor.recordMetric({
        type: 'frontend',
        name: 'time_to_first_byte',
        value: ttfb,
        unit: 'ms'
      })
    }
  })

  observer.observe({ entryTypes: ['navigation'] })
}

/**
 * Observe Interaction to Next Paint (INP).
 */
export function observeINP(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'event') {
        const ext = entry as PerformanceEventTiming
        const inp = ext.processingStart - entry.startTime
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'interaction_to_next_paint',
          value: inp,
          unit: 'ms'
        })
      }
    })
  })

  observer.observe({ entryTypes: ['event'] })
}

/**
 * Monitor Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP).
 */
export function monitorCoreWebVitals(): void {
  observeLCP()
  observeFID()
  observeCLS()
  observeFCP()
  observeTTFB()
  observeINP()
}

/**
 * Monitor resource loading performance.
 */
export function monitorResourceLoading(
  typeFromUrl: (url: string) => string
): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming

        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'resource_load_time',
          value: resource.responseEnd - resource.requestStart,
          unit: 'ms',
          tags: {
            resource_type: typeFromUrl(resource.name),
            resource_size: resource.transferSize?.toString() || 'unknown',
            cached: resource.transferSize === 0 ? 'true' : 'false'
          }
        })
      }
    })
  })

  observer.observe({ entryTypes: ['resource'] })
}

/**
 * Monitor user interactions (clicks and debounced scroll events).
 */
export function monitorUserInteractions(): void {
  document.addEventListener('click', event => {
    const target = event.target as Element
    const interactionTime = performance.now()

    performanceMonitor.recordMetric({
      type: 'frontend',
      name: 'user_interaction',
      value: interactionTime,
      unit: 'ms',
      tags: {
        interaction_type: 'click',
        element_tag: target.tagName.toLowerCase(),
        element_id: target.id || 'none'
      }
    })
  })

  let scrollTimeout: NodeJS.Timeout
  document.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      performanceMonitor.recordMetric({
        type: 'frontend',
        name: 'user_interaction',
        value: performance.now(),
        unit: 'ms',
        tags: {
          interaction_type: 'scroll'
        }
      })
    }, 100)
  })
}

/**
 * Monitor chunk loading performance.
 */
export function monitorChunkLoading(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.name.includes('chunk')) {
        const resourceEntry = entry as PerformanceResourceTiming
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'chunk_load_time',
          value: entry.duration,
          unit: 'ms',
          tags: {
            chunk_name: entry.name,
            chunk_size: resourceEntry.transferSize?.toString() || 'unknown'
          }
        })
      }
    })
  })

  observer.observe({ entryTypes: ['resource'] })
}

/**
 * Monitor long JavaScript tasks (>50ms).
 */
export function monitorLongTasks(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.duration > 50) {
        // Long task threshold
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'long_task',
          value: entry.duration,
          unit: 'ms',
          tags: {
            task_type: 'javascript_execution',
            duration_category: entry.duration > 100 ? 'critical' : 'warning'
          }
        })
      }
    })
  })

  observer.observe({ entryTypes: ['longtask'] })
}

/**
 * Performance entry extension exposing processingStart for event/first-input
 * timings (used by FID and INP observers).
 */
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number
}

/**
 * Layout-shift performance entry extension used by the CLS observer.
 */
interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}
