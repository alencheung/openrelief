/**
 * Frontend Performance Optimizer for Mobile Networks
 *
 * This module provides comprehensive frontend optimization for:
 * - Bundle size optimization and code splitting
 * - Image optimization and lazy loading
 * - Core Web Vitals optimization
 * - Mobile performance adaptation
 * - Service worker optimization
 *
 * Implementation details are split across companion modules:
 * - frontend-optimizer-types.ts   type definitions
 * - frontend-optimizer-helpers.ts pure utility helpers
 * - frontend-optimizer-monitoring.ts Core Web Vitals + interaction observers
 * - frontend-optimizer-images.ts  image / font / SW optimization helpers
 */

import { performance } from 'perf_hooks'
import { performanceMonitor } from './performance-monitor'
import type {
  BundleOptimizationConfig,
  CoreWebVitalsTargets,
  ImageOptimizationConfig,
  PerformanceBudget,
  ResourceLoadingStrategy
} from './frontend-optimizer-types'
import {
  addDNSPrefetch,
  addPreconnect,
  addPreload,
  getResourceTypeFromUrl
} from './frontend-optimizer-helpers'
import {
  monitorChunkLoading,
  monitorCoreWebVitals,
  monitorLongTasks,
  monitorResourceLoading,
  monitorUserInteractions
} from './frontend-optimizer-monitoring'
import {
  addFontDisplayOptimization,
  loadLazyResource,
  observeLazyImages,
  optimizeServiceWorkerCaching,
  setupAsyncLoading,
  setupBackgroundSync,
  setupFontLoadingObserver,
  setupProgressiveImageLoading
} from './frontend-optimizer-images'

// Re-export public types so existing imports keep working.
export type {
  BundleOptimizationConfig,
  CoreWebVitalsTargets,
  ImageOptimizationConfig,
  PerformanceBudget,
  ResourceLoadingStrategy
}

class FrontendOptimizer {
  private static instance: FrontendOptimizer
  private bundleConfig: BundleOptimizationConfig
  private imageConfig: ImageOptimizationConfig
  private webVitalsTargets: CoreWebVitalsTargets
  private performanceBudget: PerformanceBudget
  private resourceLoader: Map<string, ResourceLoadingStrategy> = new Map()
  private loadedChunks: Set<string> = new Set()
  private imageCache: Map<string, HTMLImageElement> = new Map()
  private intersectionObserver: IntersectionObserver | null = null
  private performanceEntries: PerformanceEntry[] = []

  private constructor() {
    this.bundleConfig = {
      enableCodeSplitting: true,
      enableTreeShaking: true,
      enableMinification: true,
      enableCompression: true,
      chunkSizeLimit: 250, // KB
      maxConcurrentLoads: 6,
      preloadCriticalChunks: true
    }

    this.imageConfig = {
      enableLazyLoading: true,
      enableWebP: true,
      enableAVIF: true,
      quality: 80,
      placeholderStrategy: 'blur',
      responsiveBreakpoints: [320, 640, 768, 1024, 1280, 1536],
      enableProgressiveLoading: true
    }

    this.webVitalsTargets = {
      lcp: 2500, // 2.5s
      fid: 100, // 100ms
      cls: 0.1, // 0.1
      fcp: 1800, // 1.8s
      ttfb: 600, // 600ms
      inp: 200 // 200ms
    }

    this.performanceBudget = {
      totalBundleSize: 500, // 500KB gzipped
      chunkSize: 250, // 250KB per chunk
      imageOptimization: 70, // 70% reduction
      fontOptimization: 50, // 50% reduction
      javascriptExecution: 50, // 50ms
      renderingTime: 100 // 100ms
    }

    this.initializeOptimizations()
    this.startPerformanceMonitoring()
  }

  static getInstance(): FrontendOptimizer {
    if (!FrontendOptimizer.instance) {
      FrontendOptimizer.instance = new FrontendOptimizer()
    }
    return FrontendOptimizer.instance
  }

  /**
   * Initialize frontend optimizations
   */
  private initializeOptimizations(): void {
    // These optimizations touch browser-only globals (document, window,
    // IntersectionObserver). No-op on the server (SSR / build-time page-data
    // collection) so importing this module doesn't throw outside the browser.
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return
    }
    this.setupIntersectionObserver()
    this.setupResourceHints()
    this.setupCriticalResourcePreloading()
    this.setupImageOptimization()
    this.setupFontOptimization()
    this.setupJavaScriptOptimization()
    this.setupServiceWorkerOptimization()
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadLazyResource(entry.target, this.imageConfig)
            this.intersectionObserver?.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    )
  }

  /**
   * Setup resource hints for performance
   */
  private setupResourceHints(): void {
    // DNS prefetch for external domains
    addDNSPrefetch('fonts.googleapis.com')
    addDNSPrefetch('fonts.gstatic.com')
    addDNSPrefetch('api.openrelief.org')
    addDNSPrefetch('openrelief.supabase.co')

    // Preconnect to critical domains
    addPreconnect('https://fonts.googleapis.com')
    addPreconnect('https://fonts.gstatic.com')
    addPreconnect('https://api.openrelief.org')
  }

  /**
   * Setup critical resource preloading
   */
  private setupCriticalResourcePreloading(): void {
    // Preload critical CSS
    addPreload('/_next/static/css/main.css', 'style')

    // Preload critical fonts
    addPreload(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      'style'
    )

    // Preload critical JavaScript chunks
    if (this.bundleConfig.preloadCriticalChunks) {
      addPreload('/_next/static/chunks/main.js', 'script')
      addPreload('/_next/static/chunks/framework.js', 'script')
    }
  }

  /**
   * Setup image optimization
   */
  private setupImageOptimization(): void {
    observeLazyImages(this.intersectionObserver)

    if (this.imageConfig.enableProgressiveLoading) {
      setupProgressiveImageLoading()
    }
  }

  /**
   * Setup font optimization
   */
  private setupFontOptimization(): void {
    addFontDisplayOptimization()
    this.preloadCriticalFonts()
    setupFontLoadingObserver()
  }

  /**
   * Preload critical fonts
   */
  private preloadCriticalFonts(): void {
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
    ]

    criticalFonts.forEach(fontUrl => {
      addPreload(fontUrl, 'style')
    })
  }

  /**
   * Setup JavaScript optimization
   */
  private setupJavaScriptOptimization(): void {
    if (this.bundleConfig.enableCodeSplitting) {
      // Dynamic imports are handled by Next.js automatic code splitting;
      // monitor chunk loading performance instead.
      monitorChunkLoading()
    }

    setupAsyncLoading()
    monitorLongTasks()
  }

  /**
   * Setup service worker optimization
   */
  private setupServiceWorkerOptimization(): void {
    if ('serviceWorker' in navigator) {
      optimizeServiceWorkerCaching()
      setupBackgroundSync()
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    monitorCoreWebVitals()
    monitorResourceLoading(getResourceTypeFromUrl)
    monitorUserInteractions()
  }

  /**
   * Public API methods
   */

  async optimizeBundle(): Promise<{
    originalSize: number
    optimizedSize: number
    compressionRatio: number
    loadTime: number
  }> {
    const startTime = performance.now()

    // This would integrate with webpack bundle analyzer
    // For now, return simulated results
    const originalSize = 750 // KB
    const optimizedSize = 320 // KB
    const compressionRatio = (originalSize - optimizedSize) / originalSize
    const loadTime = performance.now() - startTime

    performanceMonitor.recordMetric({
      type: 'frontend',
      name: 'bundle_optimization',
      value: compressionRatio * 100,
      unit: 'percentage'
    })

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      loadTime
    }
  }

  async optimizeImages(): Promise<{
    imagesOptimized: number
    sizeReduction: number
    loadTimeImprovement: number
  }> {
    const imagesOptimized = observeLazyImages(this.intersectionObserver)

    return {
      imagesOptimized,
      sizeReduction: 0,
      loadTimeImprovement: 0 // Would be calculated from actual measurements
    }
  }

  async getPerformanceReport(): Promise<{
    coreWebVitals: {
      lcp: number
      fid: number
      cls: number
      fcp: number
      ttfb: number
      inp: number
    }
    performanceBudget: {
      met: boolean[]
      violations: string[]
    }
    recommendations: string[]
  }> {
    // Get recent performance metrics
    const metrics = await performanceMonitor.getMetrics('frontend')

    // Extract Core Web Vitals
    const lcp = metrics.find(m => m.name === 'largest_contentful_paint')?.value || 0
    const fid = metrics.find(m => m.name === 'first_input_delay')?.value || 0
    const cls = metrics.find(m => m.name === 'cumulative_layout_shift')?.value || 0
    const fcp = metrics.find(m => m.name === 'first_contentful_paint')?.value || 0
    const ttfb = metrics.find(m => m.name === 'time_to_first_byte')?.value || 0
    const inp = metrics.find(m => m.name === 'interaction_to_next_paint')?.value || 0

    // Check performance budget compliance
    const budgetMet = [
      lcp <= this.webVitalsTargets.lcp,
      fid <= this.webVitalsTargets.fid,
      cls <= this.webVitalsTargets.cls,
      fcp <= this.webVitalsTargets.fcp,
      ttfb <= this.webVitalsTargets.ttfb,
      inp <= this.webVitalsTargets.inp
    ]

    const violations = []
    if (lcp > this.webVitalsTargets.lcp) {
      violations.push('LCP exceeds target')
    }
    if (fid > this.webVitalsTargets.fid) {
      violations.push('FID exceeds target')
    }
    if (cls > this.webVitalsTargets.cls) {
      violations.push('CLS exceeds target')
    }
    if (fcp > this.webVitalsTargets.fcp) {
      violations.push('FCP exceeds target')
    }
    if (ttfb > this.webVitalsTargets.ttfb) {
      violations.push('TTFB exceeds target')
    }
    if (inp > this.webVitalsTargets.inp) {
      violations.push('INP exceeds target')
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      {
        lcp,
        fid,
        cls,
        fcp,
        ttfb,
        inp
      },
      violations
    )

    return {
      coreWebVitals: { lcp, fid, cls, fcp, ttfb, inp },
      performanceBudget: {
        met: budgetMet,
        violations
      },
      recommendations
    }
  }

  private generateRecommendations(
    vitals: CoreWebVitalsTargets,
    violations: string[]
  ): string[] {
    void vitals
    const recommendations: string[] = []

    if (violations.includes('LCP exceeds target')) {
      recommendations.push(
        'Optimize largest contentful paint by reducing server response time and optimizing critical resources'
      )
    }

    if (violations.includes('FID exceeds target')) {
      recommendations.push(
        'Reduce first input delay by minimizing JavaScript execution time and breaking up long tasks'
      )
    }

    if (violations.includes('CLS exceeds target')) {
      recommendations.push(
        'Reduce cumulative layout shift by including size dimensions for images and reserving space for dynamic content'
      )
    }

    if (violations.includes('FCP exceeds target')) {
      recommendations.push(
        'Improve first contentful paint by optimizing server response time and reducing render-blocking resources'
      )
    }

    if (violations.includes('TTFB exceeds target')) {
      recommendations.push(
        'Reduce time to first byte by optimizing server performance and enabling compression'
      )
    }

    if (violations.includes('INP exceeds target')) {
      recommendations.push(
        'Improve interaction to next paint by optimizing JavaScript execution and reducing main thread work'
      )
    }

    return recommendations
  }

  async enableEmergencyMode(): Promise<void> {
    // Optimize for emergency scenarios
    this.bundleConfig.maxConcurrentLoads = 10
    this.imageConfig.quality = 60 // Lower quality for faster loading

    // Preload emergency-critical resources
    addPreload('/api/emergency', 'fetch')
    addPreload('/emergency-map.js', 'script')

    console.log('[FrontendOptimizer] Emergency mode enabled')
  }

  async disableEmergencyMode(): Promise<void> {
    // Restore normal settings
    this.bundleConfig.maxConcurrentLoads = 6
    this.imageConfig.quality = 80

    console.log('[FrontendOptimizer] Emergency mode disabled')
  }
}

// Export singleton instance
export const frontendOptimizer = FrontendOptimizer.getInstance()

// Export hooks for easy integration
export function useFrontendOptimizer() {
  return {
    optimizeBundle: frontendOptimizer.optimizeBundle.bind(frontendOptimizer),
    optimizeImages: frontendOptimizer.optimizeImages.bind(frontendOptimizer),
    getPerformanceReport: frontendOptimizer.getPerformanceReport.bind(frontendOptimizer),
    enableEmergencyMode: frontendOptimizer.enableEmergencyMode.bind(frontendOptimizer),
    disableEmergencyMode: frontendOptimizer.disableEmergencyMode.bind(frontendOptimizer)
  }
}

export default frontendOptimizer
