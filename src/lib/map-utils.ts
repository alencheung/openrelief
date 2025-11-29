/**
 * Map utilities and helper functions for OpenRelief emergency coordination platform
 * Includes clustering, geofencing, routing, and performance optimizations
 */

import maplibregl, { Map, LngLat, LngLatBounds, Feature, GeoJSONFeature } from 'maplibre-gl'
import Supercluster from 'supercluster'
import { distance, buffer, bbox, point, centerOfMass } from '@turf/turf'
import { EmergencyEvent, Geofence, LocationPoint } from '@/types'

// Clustering configuration
export interface ClusterOptions {
  radius: number
  maxZoom: number
  minPoints: number
  extent: number
  nodeSize: number
}

// Default clustering options for emergency events
export const defaultClusterOptions: ClusterOptions = {
  radius: 50,
  maxZoom: 14,
  minPoints: 2,
  extent: 512,
  nodeSize: 64,
}

// Create a supercluster instance for emergency events
export function createEmergencyCluster(options: ClusterOptions = defaultClusterOptions) {
  return new Supercluster({
    radius: options.radius,
    maxZoom: options.maxZoom,
    minPoints: options.minPoints,
    extent: options.extent,
    nodeSize: options.nodeSize,
  })
}

// Cluster emergency events
export function clusterEmergencyEvents(
  events: EmergencyEvent[],
  bounds: LngLatBounds,
  zoom: number,
  cluster: Supercluster
): Feature[] {
  // Convert events to GeoJSON features
  const features = events.map(event => ({
    type: 'Feature' as const,
    properties: {
      id: event.id,
      type: event.type,
      severity: event.severity,
      status: event.status,
      trust_score: event.trust_score,
      title: event.title,
      description: event.description,
      created_at: event.created_at,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [
        parseFloat(event.location.split(' ')[1]), // longitude
        parseFloat(event.location.split(' ')[0]), // latitude
      ],
    },
  }))

  // Load features into cluster
  cluster.load(features)

  // Get clusters within bounds
  const bboxArray = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  return cluster.getClusters(bboxArray, zoom)
}

// Calculate distance between two points in meters
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const from = point([point1.lng, point1.lat])
  const to = point([point2.lng, point2.lat])
  return distance(from, to, { units: 'meters' })
}

// Check if a point is within a geofence
export function isPointInGeofence(
  point: { lat: number; lng: number },
  geofence: Geofence
): boolean {
  const distance = calculateDistance(point, geofence.center)
  return distance <= geofence.radius
}

// Get all geofences that contain a point
export function getContainingGeofences(
  point: { lat: number; lng: number },
  geofences: Geofence[]
): Geofence[] {
  return geofences.filter(geofence => isPointInGeofence(point, geofence))
}

// Create a geofence buffer for visualization
export function createGeofenceBuffer(geofence: Geofence): GeoJSON.Feature {
  const center = point([geofence.center.lng, geofence.center.lat])
  const buffered = buffer(center, geofence.radius / 1000, { units: 'kilometers' })
  
  return {
    ...buffered,
    properties: {
      id: geofence.id,
      name: geofence.name,
      type: geofence.type,
      isActive: geofence.isActive,
      severity: geofence.metadata?.severity || 'medium',
    },
  }
}

// Map performance utilities
export class MapPerformanceManager {
  private map: Map
  private frameCount = 0
  private lastFrameTime = 0
  private fps = 0
  private isLowEndDevice = false

  constructor(map: Map) {
    this.map = map
    this.detectDevicePerformance()
    this.setupPerformanceMonitoring()
  }

  private detectDevicePerformance() {
    // Simple heuristic for low-end device detection
    const navigator = window.navigator as any
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const deviceMemory = navigator.deviceMemory || 4
    const connection = (navigator as any).connection
    
    this.isLowEndDevice = 
      hardwareConcurrency <= 2 || 
      deviceMemory <= 2 || 
      (connection && connection.effectiveType && 
       ['slow-2g', '2g', '3g'].includes(connection.effectiveType))
  }

  private setupPerformanceMonitoring() {
    const measureFPS = () => {
      const now = performance.now()
      const delta = now - this.lastFrameTime
      
      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta)
        this.frameCount = 0
        this.lastFrameTime = now
        
        // Adjust performance based on FPS
        this.adjustPerformanceSettings()
      }
      
      this.frameCount++
      requestAnimationFrame(measureFPS)
    }
    
    requestAnimationFrame(measureFPS)
  }

  private adjustPerformanceSettings() {
    if (this.fps < 30) {
      // Reduce complexity for better performance
      this.map.setPaintProperty('buildings', 'fill-opacity', 0.3)
      this.map.setPaintProperty('roads-minor', 'line-opacity', 0.5)
      
      // Reduce clustering radius for fewer calculations
      if (this.isLowEndDevice) {
        this.map.setMinZoom(10)
      }
    } else if (this.fps > 50) {
      // Restore full quality
      this.map.setPaintProperty('buildings', 'fill-opacity', 0.6)
      this.map.setPaintProperty('roads-minor', 'line-opacity', 0.7)
      this.map.setMinZoom(2)
    }
  }

  getFPS(): number {
    return this.fps
  }

  isLowEnd(): boolean {
    return this.isLowEndDevice
  }
}

// Offline tile caching
export class OfflineTileCache {
  private cacheName = 'openrelief-map-tiles'
  private maxCacheSize = 100 * 1024 * 1024 // 100MB
  private criticalAreas: LngLatBounds[] = []

  constructor(criticalAreas: LngLatBounds[] = []) {
    this.criticalAreas = criticalAreas
  }

  async cacheTilesForArea(bounds: LngLatBounds, zoomLevels: number[] = [10, 11, 12, 13, 14]) {
    const cache = await caches.open(this.cacheName)
    const tileSize = 512
    
    for (const zoom of zoomLevels) {
      const minTile = this.lngLatToTile(bounds.getSouth(), bounds.getWest(), zoom)
      const maxTile = this.lngLatToTile(bounds.getNorth(), bounds.getEast(), zoom)
      
      for (let x = minTile.x; x <= maxTile.x; x++) {
        for (let y = minTile.y; y <= maxTile.y; y++) {
          const tileUrl = `https://api.maptiler.com/tiles/v3/${zoom}/${x}/${y}.pbf?key=get_your_own_OpMapTiles_API_key`
          
          try {
            const response = await fetch(tileUrl)
            if (response.ok) {
              await cache.put(tileUrl, response)
            }
          } catch (error) {
            console.warn('Failed to cache tile:', tileUrl, error)
          }
        }
      }
    }
  }

  private lngLatToTile(lat: number, lng: number, zoom: number) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
    return { x, y }
  }

  async clearCache() {
    const cache = await caches.open(this.cacheName)
    const requests = await cache.keys()
    await Promise.all(requests.map(request => cache.delete(request)))
  }

  async getCacheSize(): Promise<number> {
    const cache = await caches.open(this.cacheName)
    const requests = await cache.keys()
    let totalSize = 0
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
    
    return totalSize
  }
}

// Emergency routing utilities
export class EmergencyRouter {
  private map: Map

  constructor(map: Map) {
    this.map = map
  }

  // Calculate optimal route for emergency services
  async calculateEmergencyRoute(
    start: LngLat,
    end: LngLat,
    preferences: {
      avoidTraffic?: boolean
      prioritizeHighways?: boolean
      emergencyVehicle?: boolean
    } = {}
  ): Promise<GeoJSON.Feature<GeoJSON.LineString> | null> {
    try {
      // This would integrate with a routing service like OSRM, Mapbox Directions, or similar
      // For now, return a straight line as placeholder
      const route = {
        type: 'Feature' as const,
        properties: {
          distance: calculateDistance(
            { lat: start.lat, lng: start.lng },
            { lat: end.lat, lng: end.lng }
          ),
          duration: 0, // Would be calculated by routing service
          emergency: preferences.emergencyVehicle || false,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
        },
      }

      return route
    } catch (error) {
      console.error('Failed to calculate emergency route:', error)
      return null
    }
  }

  // Find nearest emergency service (hospital, fire station, etc.)
  async findNearestEmergencyService(
    location: LngLat,
    serviceType: 'hospital' | 'fire_station' | 'police'
  ): Promise<GeoJSON.Feature | null> {
    try {
      // Query OpenMapTiles for nearest emergency service
      const features = this.map.querySourceFeatures('openmaptiles', {
        sourceLayer: 'poi',
        filter: ['==', 'class', serviceType],
      })

      if (features.length === 0) return null

      // Find nearest feature
      let nearestFeature: GeoJSONFeature | null = null
      let minDistance = Infinity

      for (const feature of features) {
        const coords = feature.geometry.coordinates as [number, number]
        const featureLocation = new LngLat(coords[0], coords[1])
        const dist = location.distanceTo(featureLocation)

        if (dist < minDistance) {
          minDistance = dist
          nearestFeature = feature
        }
      }

      return nearestFeature
    } catch (error) {
      console.error('Failed to find nearest emergency service:', error)
      return null
    }
  }
}

// Accessibility utilities
export class MapAccessibilityManager {
  private map: Map
  private announceElement: HTMLElement | null = null

  constructor(map: Map) {
    this.map = map
    this.setupAccessibility()
  }

  private setupAccessibility() {
    // Create screen reader announcements
    this.announceElement = document.createElement('div')
    this.announceElement.setAttribute('aria-live', 'polite')
    this.announceElement.setAttribute('aria-atomic', 'true')
    this.announceElement.className = 'sr-only'
    document.body.appendChild(this.announceElement)

    // Setup keyboard navigation
    this.setupKeyboardNavigation()
  }

  private setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      const step = 0.001 // ~100m
      const center = this.map.getCenter()

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          this.map.panTo([center.lng, center.lat + step])
          break
        case 'ArrowDown':
          e.preventDefault()
          this.map.panTo([center.lng, center.lat - step])
          break
        case 'ArrowLeft':
          e.preventDefault()
          this.map.panTo([center.lng - step, center.lat])
          break
        case 'ArrowRight':
          e.preventDefault()
          this.map.panTo([center.lng + step, center.lat])
          break
        case '+':
        case '=':
          e.preventDefault()
          this.map.zoomIn()
          break
        case '-':
        case '_':
          e.preventDefault()
          this.map.zoomOut()
          break
      }
    })
  }

  announce(message: string) {
    if (this.announceElement) {
      this.announceElement.textContent = message
    }
  }

  announceEmergency(emergency: EmergencyEvent) {
    const message = `Emergency: ${emergency.title}. Severity: ${emergency.severity} out of 5. Type: ${emergency.type}. Status: ${emergency.status}.`
    this.announce(message)
  }

  announceLocation(location: LngLat) {
    const message = `Map center moved to latitude ${location.lat.toFixed(4)}, longitude ${location.lng.toFixed(4)}. Zoom level: ${this.map.getZoom().toFixed(1)}.`
    this.announce(message)
  }

  enableHighContrast() {
    // Apply high contrast styles
    this.map.setStyle('mapbox://styles/mapbox/dark-v11') // Use dark style for high contrast
  }

  enableLargeText() {
    // Increase text sizes
    this.map.setLayoutProperty('poi-emergency', 'text-size', 14)
    this.map.setLayoutProperty('emergency-cluster-count', 'text-size', 16)
  }
}

// Heat map generation utilities
export function generateEmergencyHeatmap(
  events: EmergencyEvent[],
  radius: number = 25
): GeoJSON.FeatureCollection {
  const features = events.map(event => ({
    type: 'Feature' as const,
    properties: {
      intensity: event.severity * event.trust_score,
      weight: event.severity,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [
        parseFloat(event.location.split(' ')[1]),
        parseFloat(event.location.split(' ')[0]),
      ],
    },
  }))

  return {
    type: 'FeatureCollection',
    features,
  }
}

// Export utility classes
export {
  MapPerformanceManager,
  OfflineTileCache,
  EmergencyRouter,
  MapAccessibilityManager,
}