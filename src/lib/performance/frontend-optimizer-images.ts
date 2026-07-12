/**
 * Image and lazy-loading optimization helpers for the Frontend Performance
 * Optimizer.
 *
 * Extracted from frontend-optimizer.ts. These functions manage lazy image
 * loading, progressive image enhancement, font loading, async script
 * loading, and service worker caching. Most accept the relevant config
 * values as arguments to avoid depending on the optimizer instance.
 */

import { performanceMonitor } from './performance-monitor'
import type { ImageOptimizationConfig } from './frontend-optimizer-types'
import {
  addImageQuality,
  createImagePlaceholder,
  loadLazyIframe,
  loadLazyScript,
  supportsAVIF,
  supportsWebP,
  addImageFormat,
  addResponsiveSizing
} from './frontend-optimizer-helpers'

/**
 * Optimize an image URL based on the active image config and browser
 * capabilities (WebP / AVIF / quality / responsive sizing).
 */
export function optimizeImageUrl(
  src: string,
  config: ImageOptimizationConfig
): string {
  let optimizedSrc = src

  if (config.enableWebP && supportsWebP()) {
    optimizedSrc = addImageFormat(optimizedSrc, 'webp')
  }

  if (config.enableAVIF && supportsAVIF()) {
    optimizedSrc = addImageFormat(optimizedSrc, 'avif')
  }

  optimizedSrc = addImageQuality(optimizedSrc, config.quality)
  optimizedSrc = addResponsiveSizing(optimizedSrc)

  return optimizedSrc
}

/**
 * Load a lazy image element with progressive enhancement.
 */
export function loadLazyImage(
  img: HTMLImageElement,
  config: ImageOptimizationConfig
): void {
  const src = img.dataset.src
  if (!src) {
    return
  }

  const optimizedSrc = optimizeImageUrl(src, config)

  if (!img.src && config.placeholderStrategy !== 'none') {
    createImagePlaceholder(img, optimizedSrc)
  }

  loadProgressiveImage(img, optimizedSrc, config.quality)
}

/**
 * Load an image progressively: low quality first, then high quality, then
 * remove its placeholder.
 */
export function loadProgressiveImage(
  img: HTMLImageElement,
  src: string,
  quality: number
): void {
  const lowQualitySrc = addImageQuality(src, 30)
  img.src = lowQualitySrc

  img.onload = () => {
    const highQualitySrc = addImageQuality(src, quality)
    img.src = highQualitySrc

    img.onload = () => {
      const placeholder = document.getElementById(img.dataset.placeholderId || '')
      if (placeholder) {
        placeholder.remove()
      }
    }
  }
}

/**
 * Inject the CSS that powers progressive image loading.
 */
export function setupProgressiveImageLoading(): void {
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
 * Observe all images that have a data-src attribute for lazy loading.
 */
export function observeLazyImages(
  observer: IntersectionObserver | null
): number {
  const images = document.querySelectorAll('img[data-src]')
  images.forEach(img => {
    if (observer) {
      observer.observe(img)
    }
  })
  return images.length
}

/**
 * Setup a font-loading observer that records the time until fonts are ready.
 */
export function setupFontLoadingObserver(): void {
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
 * Inject a font-display swap optimization for the Inter font.
 */
export function addFontDisplayOptimization(): void {
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
 * Add async/defer attributes to scripts marked with data-async.
 */
export function setupAsyncLoading(): void {
  const scripts = document.querySelectorAll('script[data-async]')
  scripts.forEach(scriptEl => {
    const script = scriptEl as HTMLScriptElement
    script.async = true
    script.defer = true
  })
}

/**
 * Listen for service worker cache update messages.
 */
export function optimizeServiceWorkerCaching(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data as { type?: string }
      if (data?.type === 'CACHE_UPDATED') {
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
 * Register a background sync tag for emergency data synchronization.
 */
export function setupBackgroundSync(): void {
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready.then(registration => {
      const syncReg = registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> }
      }
      syncReg.sync.register('emergency-data-sync')
    })
  }
}

/**
 * Dispatch a lazy resource to the appropriate loader based on element type.
 */
export function loadLazyResource(
  element: Element,
  config: ImageOptimizationConfig
): void {
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case 'img':
      loadLazyImage(element as HTMLImageElement, config)
      break
    case 'script':
      loadLazyScript(element as HTMLScriptElement)
      break
    case 'iframe':
      loadLazyIframe(element as HTMLIFrameElement)
      break
  }
}
