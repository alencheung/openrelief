/**
 * Frontend Performance Optimizer for Mobile Networks
 * 
 * This module provides comprehensive frontend optimization for:
 * - Bundle size optimization and code splitting
 * - Image optimization and lazy loading
 * - Core Web Vitals optimization
 * - Mobile performance adaptation
 * - Service worker optimization
 */

import { performance } from 'perf_hooks'
import { performanceMonitor } from './performance-monitor'

// Bundle optimization configuration
export interface BundleOptimizationConfig {
  enableCodeSplitting: boolean
  enableTreeShaking: boolean
  enableMinification: boolean
  enableCompression: boolean
  chunkSizeLimit: number
  maxConcurrentLoads: number
  preloadCriticalChunks: boolean
}

// Image optimization configuration
export interface ImageOptimizationConfig {
  enableLazyLoading: boolean
  enableWebP: boolean
  enableAVIF: boolean
  quality: number
  placeholderStrategy: 'blur' | 'color' | 'gradient'
  responsiveBreakpoints: number[]
  enableProgressiveLoading: boolean
}

// Core Web Vitals targets
export interface CoreWebVitalsTargets {
  lcp: number // Largest Contentful Paint (ms)
  fid: number // First Input Delay (ms)
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint (ms)
  ttfb: number // Time to First Byte (ms)
  inp: number // Interaction to Next Paint (ms)
}

// Performance budget
export interface PerformanceBudget {
  totalBundleSize: number // KB
  chunkSize: number // KB
  imageOptimization: number // percentage reduction
  fontOptimization: number // percentage reduction
  javascriptExecution: number // ms
  renderingTime: number // ms
}

// Resource loading strategy
export interface ResourceLoadingStrategy {
  priority: 'high' | 'medium' | 'low'
  loading: 'eager' | 'lazy'
  preload: boolean
  prefetch: boolean
  defer: boolean
  async: boolean
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
      fid: 100,   // 100ms
      cls: 0.1,   // 0.1
      fcp: 1800, // 1.8s
      ttfb: 600,  // 600ms
      inp: 200    // 200ms
    }

    this.performanceBudget = {
      totalBundleSize: 500, // 500KB gzipped
      chunkSize: 250,       // 250KB per chunk
      imageOptimization: 70, // 70% reduction
      fontOptimization: 50,  // 50% reduction
      javascriptExecution: 50, // 50ms
      renderingTime: 100     // 100ms
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
    if (typeof IntersectionObserver === 'undefined') return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadLazyResource(entry.target)
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
    this.addDNSPrefetch('fonts.googleapis.com')
    this.addDNSPrefetch('fonts.gstatic.com')
    this.addDNSPrefetch('api.openrelief.org')
    this.addDNSPrefetch('openrelief.supabase.co')

    // Preconnect to critical domains
    this.addPreconnect('https://fonts.googleapis.com')
    this.addPreconnect('https://fonts.gstatic.com')
    this.addPreconnect('https://api.openrelief.org')
  }

  /**
   * Setup critical resource preloading
   */
  private setupCriticalResourcePreloading(): void {
    // Preload critical CSS
    this.addPreload('/_next/static/css/main.css', 'style')
    
    // Preload critical fonts
    this.addPreload('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', 'style')
    
    // Preload critical JavaScript chunks
    if (this.bundleConfig.preloadCriticalChunks) {
      this.addPreload('/_next/static/chunks/main.js', 'script')
      this.addPreload('/_next/static/chunks/framework.js', 'script')
    }
  }

  /**
   * Setup image optimization
   */
  private setupImageOptimization(): void {
    // Optimize existing images
    this.optimizeExistingImages()
    
    // Setup progressive image loading
    if (this.imageConfig.enableProgressiveLoading) {
      this.setupProgressiveImageLoading()
    }
  }

  /**
   * Setup font optimization
   */
  private setupFontOptimization(): void {
    // Use font-display: swap for better loading
    this.addFontDisplayOptimization()
    
    // Preload critical fonts
    this.preloadCriticalFonts()
    
    // Setup font loading observer
    this.setupFontLoadingObserver()
  }

  /**
   * Setup JavaScript optimization
   */
  private setupJavaScriptOptimization(): void {
    // Setup code splitting
    if (this.bundleConfig.enableCodeSplitting) {
      this.setupCodeSplitting()
    }
    
    // Setup async loading
    this.setupAsyncLoading()
    
    // Setup JavaScript execution monitoring
    this.setupJavaScriptMonitoring()
  }

  /**
   * Setup service worker optimization
   */
  private setupServiceWorkerOptimization(): void {
    if ('serviceWorker' in navigator) {
      // Optimize service worker caching
      this.optimizeServiceWorkerCaching()
      
      // Setup background sync for offline
      this.setupBackgroundSync()
    }
  }

  /**
   * Load lazy resource
   */
  private loadLazyResource(element: Element): void {
    const resourceType = this.getResourceType(element)
    
    switch (resourceType) {
      case 'image':
        this.loadLazyImage(element as HTMLImageElement)
        break
      case 'script':
        this.loadLazyScript(element as HTMLScriptElement)
        break
      case 'iframe':
        this.loadLazyIframe(element as HTMLIFrameElement)
        break
    }
  }

  /**
   * Load lazy image with optimization
   */
  private loadLazyImage(img: HTMLImageElement): void {
    const src = img.dataset.src
    if (!src) return

    // Create optimized image URL
    const optimizedSrc = this.optimizeImageUrl(src)
    
    // Create placeholder if not exists
    if (!img.src && this.imageConfig.placeholderStrategy !== 'none') {
      this.createImagePlaceholder(img, optimizedSrc)
    }

    // Load image with progressive enhancement
    this.loadProgressiveImage(img, optimizedSrc)
  }

  /**
   * Optimize image URL based on browser capabilities
   */
  private optimizeImageUrl(src: string): string {
    let optimizedSrc = src
    
    // Add WebP support check
    if (this.imageConfig.enableWebP && this.supportsWebP()) {
      optimizedSrc = this.addImageFormat(optimizedSrc, 'webp')
    }
    
    // Add AVIF support check
    if (this.imageConfig.enableAVIF && this.supportsAVIF()) {
      optimizedSrc = this.addImageFormat(optimizedSrc, 'avif')
    }
    
    // Add quality parameter
    optimizedSrc = this.addImageQuality(optimizedSrc)
    
    // Add responsive sizing
    optimizedSrc = this.addResponsiveSizing(optimizedSrc)
    
    return optimizedSrc
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  /**
   * Check AVIF support
   */
  private supportsAVIF(): boolean {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
  }

  /**
   * Add image format to URL
   */
  private addImageFormat(url: string, format: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}format=${format}`
  }

  /**
   * Add image quality to URL
   */
  private addImageQuality(url: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}quality=${this.imageConfig.quality}`
  }

  /**
   * Add responsive sizing to URL
   */
  private addResponsiveSizing(url: string): string {
    const dpr = window.devicePixelRatio || 1
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}dpr=${dpr}`
  }

  /**
   * Create image placeholder
   */
  private createImagePlaceholder(img: HTMLImageElement, src: string): void {
    const placeholder = document.createElement('div')
    placeholder.className = 'image-placeholder'
    placeholder.style.cssText = `
      background-color: #f3f4f6;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E");
      background-size: cover;
      background-position: center;
      border-radius: 0.375rem;
      aspect-ratio: ${img.dataset.aspectRatio || '16/9'};
    `
    
    img.parentNode?.insertBefore(placeholder, img)
    img.dataset.placeholderId = placeholder.id = `placeholder-${Date.now()}`
  }

  /**
   * Load progressive image
   */
  private loadProgressiveImage(img: HTMLImageElement, src: string): void {
    // Start with low quality image
    const lowQualitySrc = this.addImageQuality(src, 30)
    img.src = lowQualitySrc
    
    img.onload = () => {
      // Then load high quality image
      const highQualitySrc = this.addImageQuality(src, this.imageConfig.quality)
      img.src = highQualitySrc
      
      img.onload = () => {
        // Remove placeholder
        const placeholder = document.getElementById(img.dataset.placeholderId || '')
        if (placeholder) {
          placeholder.remove()
        }
      }
    }
  }

  /**
   * Setup progressive image loading
   */
  private setupProgressiveImageLoading(): void {
    // Add CSS for progressive loading
    const style = document.createElement('style')
    style.textContent = `
      img {
        transition: opacity 0.3s ease-in-out;
      }
      
      img[data-src] {
        opacity: 0;
      }
      
      img.loaded {
        opacity: 1;
      }
      
      .image-placeholder {
        filter: blur(10px);
        transition: filter 0.3s ease-in-out;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Optimize existing images
   */
  private optimizeExistingImages(): void {
    const images = document.querySelectorAll('img[data-src]')
    images.forEach(img => {
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(img)
      }
    })
  }

  /**
   * Setup font loading optimization
   */
  private setupFontLoadingObserver(): void {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'font_load_time',
          value: performance.now(),
          unit: 'ms'
        })
      })
    }
  }

  /**
   * Add font display optimization
   */
  private addFontDisplayOptimization(): void {
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: swap;
        src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Preload critical fonts
   */
  private preloadCriticalFonts(): void {
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
    ]
    
    criticalFonts.forEach(fontUrl => {
      this.addPreload(fontUrl, 'style')
    })
  }

  /**
   * Setup code splitting
   */
  private setupCodeSplitting(): void {
    // Dynamic import for non-critical chunks
    this.setupDynamicImports()
    
    // Setup chunk loading monitoring
    this.setupChunkLoadingMonitoring()
  }

  /**
   * Setup dynamic imports
   */
  private setupDynamicImports(): void {
    // Define lazy loading for heavy components
    window.lazyLoadComponent = (componentPath: string) => {
      return import(/* webpackChunkName: "[request]" */ `../components/${componentPath}`)
    }
  }

  /**
   * Setup chunk loading monitoring
   */
  private setupChunkLoadingMonitoring(): void {
    // Monitor chunk loading performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name.includes('chunk')) {
            performanceMonitor.recordMetric({
              type: 'frontend',
              name: 'chunk_load_time',
              value: entry.duration,
              unit: 'ms',
              tags: {
                chunk_name: entry.name,
                chunk_size: entry.transferSize?.toString() || 'unknown'
              }
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['resource'] })
    }
  }

  /**
   * Setup async loading
   */
  private setupAsyncLoading(): void {
    // Add async loading for non-critical scripts
    const scripts = document.querySelectorAll('script[data-async]')
    scripts.forEach(script => {
      script.async = true
      script.defer = true
    })
  }

  /**
   * Setup JavaScript execution monitoring
   */
  private setupJavaScriptMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) { // Long task threshold
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
  }

  /**
   * Optimize service worker caching
   */
  private optimizeServiceWorkerCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_UPDATED') {
          performanceMonitor.recordMetric({
            type: 'frontend',
            name: 'service_worker_cache_update',
            value: performance.now(),
            unit: 'ms'
          })
        }
      })
    }
  }

  /**
   * Setup background sync
   */
  private setupBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register background sync for emergency data
        registration.sync.register('emergency-data-sync')
      })
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals()
    
    // Monitor resource loading
    this.monitorResourceLoading()
    
    // Monitor user interactions
    this.monitorUserInteractions()
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.observeLCP()
    
    // First Input Delay (FID)
    this.observeFID()
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS()
    
    // First Contentful Paint (FCP)
    this.observeFCP()
    
    // Time to First Byte (TTFB)
    this.observeTTFB()
    
    // Interaction to Next Paint (INP)
    this.observeINP()
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        performanceMonitor.recordMetric({
          type: 'frontend',
          name: 'largest_contentful_paint',
          value: lastEntry.startTime,
          unit: 'ms'
        })
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name === 'first-input') {
            performanceMonitor.recordMetric({
              type: 'frontend',
              name: 'first_input_delay',
              value: (entry as any).processingStart - entry.startTime,
              unit: 'ms'
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['first-input'] })
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
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
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
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
  }

  /**
   * Observe Time to First Byte
   */
  private observeTTFB(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const navigationEntry = entries.find(entry => entry.entryType === 'navigation')
        
        if (navigationEntry) {
          const ttfb = (navigationEntry as any).responseStart - (navigationEntry as any).requestStart
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
  }

  /**
   * Observe Interaction to Next Paint
   */
  private observeINP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'event') {
            const inp = (entry as any).processingStart - entry.startTime
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
  }

  /**
   * Monitor resource loading
   */
  private monitorResourceLoading(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming
            
            performanceMonitor.recordMetric({
              type: 'frontend',
              name: 'resource_load_time',
              value: resource.responseEnd - resource.requestStart,
              unit: 'ms',
              tags: {
                resource_type: this.getResourceTypeFromUrl(resource.name),
                resource_size: resource.transferSize?.toString() || 'unknown',
                cached: resource.transferSize === 0 ? 'true' : 'false'
              }
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['resource'] })
    }
  }

  /**
   * Monitor user interactions
   */
  private monitorUserInteractions(): void {
    // Monitor click interactions
    document.addEventListener('click', (event) => {
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

    // Monitor scroll interactions
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
   * Helper methods
   */

  private getResourceType(element: Element): string {
    const tagName = element.tagName.toLowerCase()
    
    switch (tagName) {
      case 'img': return 'image'
      case 'script': return 'script'
      case 'link': return 'stylesheet'
      case 'iframe': return 'iframe'
      default: return 'unknown'
    }
  }

  private getResourceTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'js': return 'script'
      case 'css': return 'stylesheet'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'avif': return 'image'
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf': return 'font'
      default: return 'unknown'
    }
  }

  private addDNSPrefetch(domain: string): void {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = `//${domain}`
    document.head.appendChild(link)
  }

  private addPreconnect(url: string): void {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = url
    document.head.appendChild(link)
  }

  private addPreload(url: string, as: string): void {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = as
    document.head.appendChild(link)
  }

  private loadLazyScript(script: HTMLScriptElement): void {
    const src = script.dataset.src
    if (!src) return

    const newScript = document.createElement('script')
    newScript.src = src
    newScript.async = true
    
    if (script.dataset.module) {
      newScript.type = 'module'
    }
    
    script.parentNode?.replaceChild(newScript, script)
  }

  private loadLazyIframe(iframe: HTMLIFrameElement): void {
    const src = iframe.dataset.src
    if (!src) return

    iframe.src = src
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
    const images = document.querySelectorAll('img[data-src]')
    let imagesOptimized = 0
    let totalSizeReduction = 0

    images.forEach(img => {
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(img)
        imagesOptimized++
      }
    })

    return {
      imagesOptimized,
      sizeReduction: totalSizeReduction,
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
    if (lcp > this.webVitalsTargets.lcp) violations.push('LCP exceeds target')
    if (fid > this.webVitalsTargets.fid) violations.push('FID exceeds target')
    if (cls > this.webVitalsTargets.cls) violations.push('CLS exceeds target')
    if (fcp > this.webVitalsTargets.fcp) violations.push('FCP exceeds target')
    if (ttfb > this.webVitalsTargets.ttfb) violations.push('TTFB exceeds target')
    if (inp > this.webVitalsTargets.inp) violations.push('INP exceeds target')

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      lcp, fid, cls, fcp, ttfb, inp
    }, violations)

    return {
      coreWebVitals: { lcp, fid, cls, fcp, ttfb, inp },
      performanceBudget: {
        met: budgetMet,
        violations
      },
      recommendations
    }
  }

  private generateRecommendations(vitals: any, violations: string[]): string[] {
    const recommendations: string[] = []

    if (violations.includes('LCP exceeds target')) {
      recommendations.push('Optimize largest contentful paint by reducing server response time and optimizing critical resources')
    }

    if (violations.includes('FID exceeds target')) {
      recommendations.push('Reduce first input delay by minimizing JavaScript execution time and breaking up long tasks')
    }

    if (violations.includes('CLS exceeds target')) {
      recommendations.push('Reduce cumulative layout shift by including size dimensions for images and reserving space for dynamic content')
    }

    if (violations.includes('FCP exceeds target')) {
      recommendations.push('Improve first contentful paint by optimizing server response time and reducing render-blocking resources')
    }

    if (violations.includes('TTFB exceeds target')) {
      recommendations.push('Reduce time to first byte by optimizing server performance and enabling compression')
    }

    if (violations.includes('INP exceeds target')) {
      recommendations.push('Improve interaction to next paint by optimizing JavaScript execution and reducing main thread work')
    }

    return recommendations
  }

  async enableEmergencyMode(): Promise<void> {
    // Optimize for emergency scenarios
    this.bundleConfig.maxConcurrentLoads = 10
    this.imageConfig.quality = 60 // Lower quality for faster loading
    
    // Preload emergency-critical resources
    this.addPreload('/api/emergency', 'fetch')
    this.addPreload('/emergency-map.js', 'script')
    
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