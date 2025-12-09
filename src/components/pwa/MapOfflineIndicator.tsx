'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  WifiOffIcon,
  WifiIcon,
  MapIcon,
  MapOffIcon,
  MapPinIcon,
  NavigationIcon,
  NavigationOffIcon,
  DownloadIcon,
  UploadIcon,
  DatabaseIcon,
  HardDriveIcon,
  LayersIcon,
  LayersOffIcon,
  EyeIcon,
  EyeOffIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RefreshCwIcon,
  SettingsIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  CompassIcon,
  CompassOffIcon,
  SatelliteIcon,
  SatelliteOffIcon,
  ActivityIcon,
  ClockIcon,
  FileTextIcon,
  ShieldIcon,
  ShieldOffIcon,
  ZapIcon,
  ZapOffIcon
} from 'lucide-react'

interface MapLayer {
  id: string
  name: string
  type: 'base' | 'overlay' | 'marker' | 'data'
  available: boolean
  cached: boolean
  cacheSize?: number
  lastUpdated?: Date
  url?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  required: boolean
  offlineCapable: boolean
}

interface MapCache {
  id: string
  name: string
  region: string
  zoom: number
  size: number
  tiles: number
  lastAccessed: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'downloading' | 'error'
}

interface MapOfflineStatus {
  isOfflineMode: boolean
  availableLayers: MapLayer[]
  cachedAreas: MapCache[]
  totalCacheSize: number
  maxCacheSize: number
  lastSyncTime: Date | null
  autoDownloadEnabled: boolean
  currentRegion: string
  zoomLevel: number
  centerCoords: [number, number]
  trackingEnabled: boolean
  locationAccuracy: number | null
}

interface MapOfflineIndicatorProps {
  onRegionChange?: (region: string) => void
  onZoomChange?: (zoom: number) => void
  onLayerToggle?: (layerId: string, enabled: boolean) => void
  onCacheClear?: (cacheId?: string) => void
  onDownloadMap?: (region: string, zoom: number) => void
  showOfflineIndicator?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  compact?: boolean
}

export function MapOfflineIndicator({
  onRegionChange,
  onZoomChange,
  onLayerToggle,
  onCacheClear,
  onDownloadMap,
  showOfflineIndicator = true,
  position = 'top-right',
  compact = false
}: MapOfflineIndicatorProps) {
  const {
    isOnline,
    isOffline,
    connectionType,
    effectiveType,
    downlink
  } = useNetworkStatus()

  const {
    pendingActions,
    metrics,
    storageQuota
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [expanded, setExpanded] = useState(false)
  const [mapStatus, setMapStatus] = useState<MapOfflineStatus>({
    isOfflineMode: false,
    availableLayers: [],
    cachedAreas: [],
    totalCacheSize: 0,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    lastSyncTime: null,
    autoDownloadEnabled: true,
    currentRegion: 'default',
    zoomLevel: 10,
    centerCoords: [0, 0],
    trackingEnabled: false,
    locationAccuracy: null
  })

  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [downloadingRegion, setDownloadingRegion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Initialize map layers
  useEffect(() => {
    const layers: MapLayer[] = [
      {
        id: 'base-map',
        name: 'Base Map',
        type: 'base',
        available: true,
        cached: true,
        cacheSize: 15 * 1024 * 1024, // 15MB
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        priority: 'critical',
        required: true,
        offlineCapable: true
      },
      {
        id: 'satellite',
        name: 'Satellite Imagery',
        type: 'base',
        available: true,
        cached: false,
        cacheSize: 0,
        priority: 'medium',
        required: false,
        offlineCapable: true
      },
      {
        id: 'terrain',
        name: 'Terrain Map',
        type: 'base',
        available: true,
        cached: true,
        cacheSize: 8 * 1024 * 1024, // 8MB
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        priority: 'medium',
        required: false,
        offlineCapable: true
      },
      {
        id: 'emergency-markers',
        name: 'Emergency Markers',
        type: 'marker',
        available: true,
        cached: true,
        cacheSize: 2 * 1024 * 1024, // 2MB
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        priority: 'critical',
        required: true,
        offlineCapable: true
      },
      {
        id: 'shelters',
        name: 'Emergency Shelters',
        type: 'data',
        available: true,
        cached: true,
        cacheSize: 3 * 1024 * 1024, // 3MB
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        priority: 'high',
        required: false,
        offlineCapable: true
      },
      {
        id: 'evacuation-routes',
        name: 'Evacuation Routes',
        type: 'data',
        available: true,
        cached: true,
        cacheSize: 1 * 1024 * 1024, // 1MB
        lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        priority: 'high',
        required: false,
        offlineCapable: true
      },
      {
        id: 'traffic',
        name: 'Live Traffic',
        type: 'overlay',
        available: true,
        cached: false,
        priority: 'low',
        required: false,
        offlineCapable: false
      },
      {
        id: 'weather',
        name: 'Weather Overlay',
        type: 'overlay',
        available: true,
        cached: false,
        priority: 'medium',
        required: false,
        offlineCapable: false
      }
    ]

    const cachedAreas: MapCache[] = [
      {
        id: 'current-location',
        name: 'Current Location',
        region: '40.7128,-74.0060',
        zoom: 15,
        size: 5 * 1024 * 1024, // 5MB
        tiles: 256,
        lastAccessed: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'active'
      },
      {
        id: 'emergency-zone-1',
        name: 'Emergency Zone Alpha',
        region: '40.7589,-73.9851',
        zoom: 12,
        size: 3 * 1024 * 1024, // 3MB
        tiles: 144,
        lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        status: 'active'
      }
    ]

    const totalCacheSize = layers.reduce((sum, layer) => sum + (layer.cacheSize || 0), 0)
                           + cachedAreas.reduce((sum, area) => sum + area.size, 0)

    setMapStatus({
      isOfflineMode: isOffline,
      availableLayers: layers,
      cachedAreas,
      totalCacheSize,
      maxCacheSize: 50 * 1024 * 1024,
      lastSyncTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      autoDownloadEnabled: true,
      currentRegion: 'default',
      zoomLevel: 10,
      centerCoords: [40.7128, -74.0060],
      trackingEnabled: false,
      locationAccuracy: null
    })
  }, [isOffline])

  // Handle layer toggle
  const handleLayerToggle = (layerId: string) => {
    const layer = mapStatus.availableLayers.find(l => l.id === layerId)
    if (!layer) {
      return
    }

    const newEnabled = !layer.cached
    setSelectedLayer(selectedLayer === layerId ? null : layerId)

    if (onLayerToggle) {
      onLayerToggle(layerId, newEnabled)
    }

    announcePolite(
      `${layer.name} ${newEnabled ? 'enabled' : 'disabled'} for offline use`
    )
  }

  // Handle cache clear
  const handleCacheClear = (cacheId?: string) => {
    if (onCacheClear) {
      onCacheClear(cacheId)
    }

    announcePolite(
      cacheId ? `Cache cleared for ${cacheId}` : 'All map cache cleared'
    )
  }

  // Handle map download
  const handleDownloadMap = async (region: string, zoom: number) => {
    setDownloadingRegion(region)
    setDownloadProgress(0)

    announcePolite(`Downloading map data for region ${region}`)

    // Simulate download progress
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 500)

    // Simulate download completion
    setTimeout(() => {
      setDownloadingRegion(null)
      setDownloadProgress(0)
      announcePolite(`Map data download completed for region ${region}`)
    }, 6000)
  }

  // Get priority color
  const getPriorityColor = (priority: MapLayer['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get cache status color
  const getCacheStatusColor = (status: MapCache['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'expired':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'downloading':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  const offlineLayers = mapStatus.availableLayers.filter(l => l.offlineCapable && l.cached)
  const criticalLayers = mapStatus.availableLayers.filter(l => l.priority === 'critical' && l.offlineCapable)
  const expiredCaches = mapStatus.cachedAreas.filter(c => c.status === 'expired')
  const cacheUsagePercentage = (mapStatus.totalCacheSize / mapStatus.maxCacheSize) * 100

  if (!showOfflineIndicator) {
    return null
  }

  return (
    <>
      {/* Main Map Offline Indicator */}
      <div className={`fixed ${getPositionClasses()} z-50 ${compact ? 'max-w-xs' : 'max-w-sm'}`}>
        <div className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${mapStatus.isOfflineMode
      ? 'bg-red-600/90 border border-red-700 text-white'
      : 'bg-green-600/90 border border-green-700 text-white'
    }
          ${prefersReducedMotion ? '' : 'hover:shadow-xl'}
        `}>
          {/* Status Icon and Text */}
          <div className="flex items-center gap-2">
            <div className={`
              relative flex items-center justify-center w-8 h-8 rounded-full
              transition-all duration-300
              ${mapStatus.isOfflineMode ? 'bg-white/20' : 'bg-white/20'}
            `}>
              {mapStatus.isOfflineMode ? (
                <MapOffIcon className="w-4 h-4" />
              ) : (
                <MapIcon className="w-4 h-4" />
              )}

              {/* Pulse animation for active offline mode */}
              {mapStatus.isOfflineMode && !prefersReducedMotion && (
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {mapStatus.isOfflineMode ? 'Offline Maps' : 'Online Maps'}
              </span>
              <span className="text-xs opacity-75">
                {offlineLayers.length} layers cached
              </span>
            </div>
          </div>

          {/* Cache Usage */}
          <div className="flex items-center gap-1">
            <DatabaseIcon className="w-4 h-4" />
            <div className="w-16 bg-white/20 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, cacheUsagePercentage)}%`,
                  backgroundColor: cacheUsagePercentage > 80 ? '#ef4444'
                    : cacheUsagePercentage > 60 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
            <span className="text-xs">
              {Math.round(cacheUsagePercentage)}%
            </span>
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 p-0 text-white hover:bg-white/10"
            aria-label={expanded ? 'Hide map details' : 'Show map details'}
          >
            {expanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded Map Details Panel */}
        {expanded && !compact && (
          <div className={`
            absolute top-full right-0 mt-2 p-4 w-96 max-h-96 overflow-y-auto
            bg-white rounded-xl shadow-2xl border border-gray-200
            ${prefersReducedMotion ? '' : 'animate-slide-in-up'}
          `}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Map Offline Status
                </h3>
                <StatusIndicator
                  status={mapStatus.isOfflineMode ? 'inactive' : 'active'}
                  size="sm"
                  label={mapStatus.isOfflineMode ? 'Offline' : 'Online'}
                />
              </div>

              {/* Map Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Connection</h4>
                  <div className="flex items-center gap-2">
                    {mapStatus.isOfflineMode ? (
                      <WifiOffIcon className="w-4 h-4 text-red-600" />
                    ) : (
                      <WifiIcon className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm">
                      {mapStatus.isOfflineMode ? 'Offline Mode' : 'Online Mode'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Cache Usage</h4>
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Used Space</span>
                      <span className="font-medium">
                        {Math.round(mapStatus.totalCacheSize / 1024 / 1024)}MB / {Math.round(mapStatus.maxCacheSize / 1024 / 1024)}MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`
                          h-2 rounded-full transition-all duration-300
                          ${cacheUsagePercentage > 80
            ? 'bg-red-500'
            : cacheUsagePercentage > 60
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }
                        `}
                        style={{ width: `${Math.min(100, cacheUsagePercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Layers */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Critical Layers</h4>
                <div className="space-y-2">
                  {criticalLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        transition-all duration-200 cursor-pointer
                        ${selectedLayer === layer.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                        ${getPriorityColor(layer.priority)}
                      `}
                      onClick={() => handleLayerToggle(layer.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">{layer.name}</p>
                          <p className="text-xs text-gray-600">
                            {layer.cacheSize ? `${Math.round(layer.cacheSize / 1024 / 1024)}MB cached` : 'Not cached'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={layer.cached ? 'active' : 'inactive'}
                          size="sm"
                          label={layer.cached ? 'Cached' : 'Not Cached'}
                        />
                        {layer.offlineCapable && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Available offline" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cached Areas */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Cached Areas</h4>
                <div className="space-y-2">
                  {mapStatus.cachedAreas.map((area) => (
                    <div
                      key={area.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        transition-all duration-200
                        ${getCacheStatusColor(area.status)}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">{area.name}</p>
                          <p className="text-xs text-gray-600">
                            Zoom {area.zoom} • {area.tiles} tiles
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={area.status === 'active' ? 'active'
                            : area.status === 'downloading' ? 'pending'
                              : area.status === 'expired' ? 'critical' : 'inactive'}
                          size="sm"
                          animated={area.status === 'downloading'}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCacheClear(area.id)}
                        >
                          <XIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Layers */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Available Layers</h4>
                <div className="space-y-2">
                  {mapStatus.availableLayers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        transition-all duration-200 cursor-pointer
                        ${selectedLayer === layer.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                        ${getPriorityColor(layer.priority)}
                      `}
                      onClick={() => handleLayerToggle(layer.id)}
                    >
                      <div className="flex items-center gap-2">
                        <LayersIcon className="w-4 h-4" />
                        <div>
                          <p className="text-sm font-medium">{layer.name}</p>
                          <p className="text-xs text-gray-600">
                            {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} Layer
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={layer.cached ? 'active' : 'inactive'}
                          size="sm"
                          label={layer.cached ? 'Cached' : 'Not Cached'}
                        />
                        {layer.offlineCapable && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Available offline" />
                        )}
                        {layer.required && (
                          <div className="w-2 h-2 bg-red-500 rounded-full" title="Required" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <Button
                  onClick={() => handleDownloadMap(mapStatus.currentRegion, mapStatus.zoomLevel)}
                  disabled={downloadingRegion !== null || !isOnline}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <DownloadIcon className="w-3 h-3 mr-2" />
                  {downloadingRegion ? 'Downloading...' : 'Download Current Area'}
                </Button>

                <Button
                  onClick={() => handleCacheClear()}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCwIcon className="w-3 h-3 mr-2" />
                  Clear Cache
                </Button>
              </div>

              {/* Download Progress */}
              {downloadingRegion && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-900">Downloading map data...</span>
                    <span className="text-sm text-blue-700">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {mapStatus.isOfflineMode && 'Map is operating in offline mode'}
          {offlineLayers.length > 0 && `${offlineLayers.length} map layers are available offline`}
          {expiredCaches.length > 0 && `${expiredCaches.length} map cache areas have expired`}
          {downloadingRegion && `Downloading map data for region ${downloadingRegion}`}
          {cacheUsagePercentage > 80 && 'Map cache usage is critically high'}
        </div>
      </ScreenReaderOnly>
    </>
  )
}