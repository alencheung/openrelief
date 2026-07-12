/**
 * Helper functions for the Frontend Performance Optimizer.
 *
 * Extracted from frontend-optimizer.ts. These are pure (or near-pure)
 * utility functions that do not depend on the FrontendOptimizer instance
 * state, with config values passed in as arguments where needed.
 */

/**
 * Get the logical resource type for a DOM element based on its tag name.
 */
export function getResourceType(element: Element): string {
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case 'img':
      return 'image'
    case 'script':
      return 'script'
    case 'link':
      return 'stylesheet'
    case 'iframe':
      return 'iframe'
    default:
      return 'unknown'
  }
}

/**
 * Get the logical resource type from a URL based on its file extension.
 */
export function getResourceTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'js':
      return 'script'
    case 'css':
      return 'stylesheet'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'avif':
      return 'image'
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
      return 'font'
    default:
      return 'unknown'
  }
}

/**
 * Add a DNS prefetch hint for an external domain.
 */
export function addDNSPrefetch(domain: string): void {
  const link = document.createElement('link')
  link.rel = 'dns-prefetch'
  link.href = `//${domain}`
  document.head.appendChild(link)
}

/**
 * Add a preconnect hint for a critical origin.
 */
export function addPreconnect(url: string): void {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = url
  document.head.appendChild(link)
}

/**
 * Add a preload hint for a critical resource.
 */
export function addPreload(url: string, as: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = url
  link.as = as
  document.head.appendChild(link)
}

/**
 * Check whether the browser supports WebP output.
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * Check whether the browser supports AVIF output.
 */
export function supportsAVIF(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
}

/**
 * Append an image format query parameter to a URL.
 */
export function addImageFormat(url: string, format: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}format=${format}`
}

/**
 * Append an image quality query parameter to a URL.
 */
export function addImageQuality(url: string, quality: number): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}quality=${quality}`
}

/**
 * Append a device-pixel-ratio query parameter to a URL.
 */
export function addResponsiveSizing(url: string): string {
  const dpr = window.devicePixelRatio || 1
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}dpr=${dpr}`
}

/**
 * Load a lazy script element by swapping its data-src into a real src.
 */
export function loadLazyScript(script: HTMLScriptElement): void {
  const src = script.dataset.src
  if (!src) {
    return
  }

  const newScript = document.createElement('script')
  newScript.src = src
  newScript.async = true

  if (script.dataset.module) {
    newScript.type = 'module'
  }

  script.parentNode?.replaceChild(newScript, script)
}

/**
 * Load a lazy iframe element by promoting its data-src to src.
 */
export function loadLazyIframe(iframe: HTMLIFrameElement): void {
  const src = iframe.dataset.src
  if (!src) {
    return
  }

  iframe.src = src
}

/**
 * Create a placeholder element in front of an image while it loads.
 */
export function createImagePlaceholder(img: HTMLImageElement, src: string): void {
  void src
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
