import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  return formatDate(dateObj)
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function getTrustScoreColor(score: number): string {
  if (score >= 0.7) {
    return 'text-green-600 dark:text-green-400'
  } else if (score >= 0.4) {
    return 'text-yellow-600 dark:text-yellow-400'
  }
  return 'text-red-600 dark:text-red-400'
}

export function getEmergencyTypeColor(type: string): string {
  const colors: Record<string, string> = {
    fire: 'rgb(239, 68, 68)',
    medical: 'rgb(236, 72, 153)',
    security: 'rgb(251, 191, 36)',
    natural: 'rgb(59, 130, 246)',
    infrastructure: 'rgb(245, 158, 11)',
  }
  return colors[type] || 'rgb(107, 114, 128)'
}

export function getEmergencyTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    fire: '🔥',
    medical: '🏥',
    security: '🚨',
    natural: '🌊',
    infrastructure: '⚡',
  }
  return icons[type] || '⚠️'
}

export function getSeverityColor(severity: number): string {
  if (severity >= 4) {
    return 'bg-red-500'
  } else if (severity >= 3) {
    return 'bg-orange-500'
  } else if (severity >= 2) {
    return 'bg-yellow-500'
  }
  return 'bg-blue-500'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/
  return phoneRegex.test(phone)
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substr(0, maxLength).trim() + '...'
}

export function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    return new Promise((resolve, reject) => {
      document.execCommand('copy') ? resolve() : reject()
      textArea.remove()
    })
  }
}

export function downloadFile(data: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function parseGeoLocation(location: string): { lat: number; lng: number } | null {
  try {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      }
    }
  } catch (error) {
    console.error('Failed to parse geo location:', error)
  }
  return null
}

export function formatGeoLocation(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng)
  return distance <= radiusMeters
}

export function getBrowserInfo(): {
  name: string
  version: string
  isMobile: boolean
} {
  const userAgent = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = 'Unknown'
  
  if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox'
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('Chrome') > -1) {
    browserName = 'Chrome'
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('Safari') > -1) {
    browserName = 'Safari'
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown'
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  )

  return {
    name: browserName,
    version: browserVersion,
    isMobile,
  }
}

export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
  }
  return Promise.resolve(null)
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return Notification.requestPermission()
  }
  return 'denied'
}

export function vibrateDevice(pattern: number | number[]): boolean {
  if ('vibrate' in navigator) {
    return navigator.vibrate(pattern)
  }
  return false
}