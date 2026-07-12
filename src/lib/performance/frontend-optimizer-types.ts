/**
 * Type definitions for the Frontend Performance Optimizer.
 *
 * Extracted from frontend-optimizer.ts to keep each module focused and
 * under the 500 line lint budget.
 */

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
  placeholderStrategy: 'blur' | 'color' | 'gradient' | 'none'
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
