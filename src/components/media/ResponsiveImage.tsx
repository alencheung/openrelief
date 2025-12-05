'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useMobilePerformance } from '@/hooks/useMobilePerformance'
import { usePerformanceAwareLazyLoad } from '@/hooks/useMobilePerformance'

export interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty' | 'color'
  blurDataURL?: string
  sizes?: string
  onLoad?: () => void
  onError?: (error: Event) => void
  fallback?: React.ReactNode
  aspectRatio?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  lazy?: boolean
  fadeIn?: boolean
  enableZoom?: boolean
}

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  fallback,
  aspectRatio,
  objectFit = 'cover',
  lazy = true,
  fadeIn = true,
  enableZoom = false,
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  
  const { isMobile, isTablet, pixelRatio } = useMobileDetection()
  const { getOptimizedSettings } = useMobilePerformance()
  const performanceSettings = getOptimizedSettings()
  
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { loadDelay, rootMargin, shouldUseIntersection } = usePerformanceAwareLazyLoad()
  const [shouldLoad, setShouldLoad] = useState(priority || !lazy)

  // Calculate responsive dimensions
  const getResponsiveDimensions = () => {
    if (!width || !height) return { width: '100%', height: 'auto' }
    
    const scaleFactor = pixelRatio > 1 ? 1 / pixelRatio : 1
    const qualityMultiplier = performanceSettings.imageQuality || 1
    
    if (isMobile) {
      return {
        width: Math.round(width * scaleFactor * qualityMultiplier),
        height: Math.round(height * scaleFactor * qualityMultiplier),
      }
    }
    
    return {
      width: Math.round(width * qualityMultiplier),
      height: Math.round(height * qualityMultiplier),
    }
  }

  // Generate responsive srcset
  const generateSrcSet = () => {
    const dimensions = getResponsiveDimensions()
    const baseSrc = src
    
    // Generate different sizes for responsive images
    const sizes = [
      { w: 320, h: Math.round(320 * (height! / width!)) },
      { w: 640, h: Math.round(640 * (height! / width!)) },
      { w: 768, h: Math.round(768 * (height! / width!)) },
      { w: 1024, h: Math.round(1024 * (height! / width!)) },
      { w: 1280, h: Math.round(1280 * (height! / width!)) },
      { w: 1536, h: Math.round(1536 * (height! / width!)) },
    ]
    
    return sizes
      .map(size => {
        const qualityParam = quality ? `&q=${quality}` : ''
        return `${baseSrc}?w=${size.w}&h=${size.h}${qualityParam} ${size.w}w`
      })
      .join(', ')
  }

  // Generate blur placeholder
  const generateBlurPlaceholder = () => {
    if (placeholder !== 'blur' || !blurDataURL) {
      return null
    }
    
    return (
      <div
        className="absolute inset-0 blur-sm"
        style={{
          backgroundImage: `url(${blurDataURL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
    )
  }

  // Handle image load
  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setIsLoaded(true)
    setHasError(false)
    onLoad?.()
  }

  // Handle image error
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true)
    setIsLoaded(false)
    onError?.(event.nativeEvent)
  }

  // Handle zoom toggle
  const handleZoomToggle = () => {
    if (!enableZoom || !isMobile) return
    setIsZoomed(!isZoomed)
  }

  // Handle pinch-to-zoom
  const handlePinchZoom = (scale: number) => {
    if (!enableZoom || !containerRef.current) return
    
    const currentScale = isZoomed ? 2 : 1
    const newScale = Math.max(1, Math.min(3, currentScale * scale))
    setIsZoomed(newScale > 1.5)
    
    if (containerRef.current) {
      containerRef.current.style.transform = `scale(${newScale})`
      containerRef.current.style.transformOrigin = 'center'
    }
  }

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!shouldUseIntersection || priority) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [shouldUseIntersection, priority, rootMargin])

  const dimensions = getResponsiveDimensions()
  const srcSet = generateSrcSet()
  const calculatedSizes = sizes || (isMobile ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : undefined)

  if (hasError && fallback) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        enableZoom && isMobile && 'cursor-zoom-in',
        className
      )}
      style={{
        aspectRatio,
        width: dimensions.width,
        height: dimensions.height,
      }}
      onClick={handleZoomToggle}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder === 'blur' && generateBlurPlaceholder()}
      
      {!isLoaded && placeholder === 'color' && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        src={shouldLoad ? src : undefined}
        srcSet={shouldLoad ? srcSet : undefined}
        sizes={shouldLoad ? calculatedSizes : undefined}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        loading={priority ? 'eager' : 'lazy'}
        className={cn(
          'w-full h-full transition-transform duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down',
          fadeIn && !isLoaded && 'opacity-0',
          fadeIn && isLoaded && 'opacity-100',
          enableZoom && isMobile && 'transition-transform duration-300'
        )}
        style={{
          objectFit,
          transform: isZoomed ? 'scale(2)' : 'scale(1)',
          transformOrigin: 'center',
        }}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
      />
      
      {/* Zoom indicator */}
      {enableZoom && isMobile && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
          {isZoomed ? '200%' : '100%'}
        </div>
      )}
    </div>
  )
}

// Specialized components for different use cases
export function EmergencyImage(props: Omit<ResponsiveImageProps, 'placeholder' | 'enableZoom'>) {
  return (
    <ResponsiveImage
      {...props}
      placeholder="blur"
      enableZoom={true}
      className="rounded-lg border border-border"
    />
  )
}

export function ProfileImage(props: Omit<ResponsiveImageProps, 'objectFit' | 'aspectRatio'>) {
  return (
    <ResponsiveImage
      {...props}
      objectFit="cover"
      aspectRatio="1/1"
      className="rounded-full border-2 border-border"
    />
  )
}

export function MapThumbnail(props: Omit<ResponsiveImageProps, 'objectFit' | 'aspectRatio'>) {
  return (
    <ResponsiveImage
      {...props}
      objectFit="cover"
      aspectRatio="16/9"
      className="rounded-lg border border-border shadow-md"
      lazy={true}
      priority={false}
    />
  )
}

// Hook for responsive image optimization
export function useResponsiveImage() {
  const { isMobile, pixelRatio } = useMobileDetection()
  const { getOptimizedSettings } = useMobilePerformance()
  
  const getOptimizedSrc = useCallback((src: string, options?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
  }) => {
    const { width, height, quality, format } = options || {}
    const performanceSettings = getOptimizedSettings()
    
    // Apply performance-based quality reduction
    const optimizedQuality = quality || performanceSettings.imageQuality || 0.8
    
    // Apply device pixel ratio scaling
    const scaleFactor = pixelRatio > 1 ? 1 / pixelRatio : 1
    const scaledWidth = width ? Math.round(width * scaleFactor) : undefined
    const scaledHeight = height ? Math.round(height * scaleFactor) : undefined
    
    // Build URL with parameters
    const url = new URL(src, window.location.origin)
    if (scaledWidth) url.searchParams.set('w', scaledWidth.toString())
    if (scaledHeight) url.searchParams.set('h', scaledHeight.toString())
    url.searchParams.set('q', optimizedQuality.toString())
    if (format) url.searchParams.set('f', format)
    
    return url.toString()
  }, [isMobile, pixelRatio, getOptimizedSettings])
  
  const getResponsiveSrcSet = useCallback((src: string, baseWidth: number, baseHeight: number) => {
    const sizes = isMobile ? [320, 640, 768] : [768, 1024, 1280, 1536]
    
    return sizes
      .map(size => {
        const aspectRatio = baseHeight / baseWidth
        const width = size
        const height = Math.round(width * aspectRatio)
        return `${getOptimizedSrc(src, { width, height })} ${width}w`
      })
      .join(', ')
  }, [isMobile, getOptimizedSrc])
  
  return {
    getOptimizedSrc,
    getResponsiveSrcSet,
  }
}