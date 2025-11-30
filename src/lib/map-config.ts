/**
 * OpenMapTiles configuration and styling for OpenRelief emergency coordination platform
 * Optimized for emergency visualization, accessibility, and performance
 */

export interface MapConfig {
  style: string
  tileSize: number
  maxZoom: number
  minZoom: number
  bounds?: [number, number, number, number]
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

export interface EmergencyLayerConfig {
  id: string
  type: 'circle' | 'symbol' | 'fill' | 'line' | 'heatmap'
  source: string
  filter?: any[]
  paint?: any
  layout?: any
  minzoom?: number
  maxzoom?: number
}

// OpenMapTiles style URL for emergency operations
// FIXED: Use environment variable for API key with fallback for development
export const OPENMAPTILES_URL = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`
  : 'https://api.maptiler.com/maps/streets-v2/style.json?key=FallbackKeyForDevelopment'

// Emergency-optimized map style configuration
export const emergencyMapStyle = {
  version: 8 as 8,
  name: 'OpenRelief Emergency Style',
  sources: {
    'openmaptiles': {
      type: 'vector',
      // FIXED: Use environment variable for API key with fallback
      url: process.env.NEXT_PUBLIC_MAPTILER_API_KEY
        ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`
        : 'https://api.maptiler.com/tiles/v3/tiles.json?key=FallbackKeyForDevelopment',
      attribution: '© OpenMapTiles © OpenStreetMap contributors',
    },
    'emergency-events': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    },
    'user-location': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    },
    'geofences': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    },
    'emergency-heatmap': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    },
  },
  layers: [
    // Base layers - water and land
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8f9fa',
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#a0c8e0',
        'fill-opacity': 0.8,
      },
    },

    // Administrative boundaries
    {
      id: 'admin-boundaries',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['in', 'admin_level', 2, 4, 6, 8],
      paint: {
        'line-color': '#e0e0e0',
        'line-width': 0.5,
        'line-opacity': 0.7,
      },
    },

    // Roads (simplified for performance)
    {
      id: 'roads-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
        'line-opacity': 0.9,
      },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'tertiary', 'unclassified'],
      paint: {
        'line-color': '#f0f0f0',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 2],
        'line-opacity': 0.7,
      },
    },

    // Buildings (simplified)
    {
      id: 'buildings',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#e8e8e8',
        'fill-opacity': 0.6,
      },
      minzoom: 14,
    },

    // Points of interest (emergency relevant)
    {
      id: 'poi-emergency',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      filter: ['in', 'class', 'hospital', 'clinic', 'pharmacy', 'police', 'fire_station'],
      layout: {
        'icon-image': ['match', ['get', 'class'],
          'hospital', 'hospital',
          'clinic', 'clinic',
          'pharmacy', 'pharmacy',
          'police', 'police',
          'fire_station', 'fire-station',
          'place-of-worship'
        ],
        'icon-size': 1.2,
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 10,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
      },
      paint: {
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
        'text-color': '#333333',
      },
      minzoom: 12,
    },

    // Emergency event layers
    {
      id: 'geofences-fill',
      type: 'fill',
      source: 'geofences',
      paint: {
        'fill-color': ['match', ['get', 'type'],
          'emergency', '#ff4444',
          'safe_zone', '#44ff44',
          'restricted', '#ffaa00',
          '#ffaa00'
        ],
        'fill-opacity': 0.2,
      },
    },
    {
      id: 'geofences-border',
      type: 'line',
      source: 'geofences',
      paint: {
        'line-color': ['match', ['get', 'type'],
          'emergency', '#ff0000',
          'safe_zone', '#00aa00',
          'restricted', '#ff8800',
          '#ff8800'
        ],
        'line-width': 2,
        'line-opacity': 0.8,
      },
    },

    // Emergency events clustered
    {
      id: 'emergency-clusters',
      type: 'circle',
      source: 'emergency-events',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6', // 1-20
          20,
          '#f1f075', // 20-50
          50,
          '#f28cb1', // 50-100
          100,
          '#ff0000', // 100+
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          20,
          30,
          50,
          40,
          100,
          50,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    },
    {
      id: 'emergency-cluster-count',
      type: 'symbol',
      source: 'emergency-events',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    },

    // Individual emergency events
    {
      id: 'emergency-events',
      type: 'circle',
      source: 'emergency-events',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'type'],
          'fire', '#ff4444',
          'medical', '#ff1493',
          'security', '#ffaa00',
          'natural', '#4444ff',
          'infrastructure', '#ff8800',
          '#888888'
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'severity'],
          1, 8,
          2, 12,
          3, 16,
          4, 20,
          5, 24,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8,
      },
    },

    // User location
    {
      id: 'user-location',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-color': '#0066cc',
        'circle-radius': 8,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    },
    {
      id: 'user-location-accuracy',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-color': '#0066cc',
        'circle-radius': ['get', 'accuracy'],
        'circle-opacity': 0.2,
      },
    },
  ],
}

// Default map configuration
export const defaultMapConfig: MapConfig = {
  style: OPENMAPTILES_URL,
  tileSize: 512,
  maxZoom: 20,
  minZoom: 2,
  center: [0, 0],
  zoom: 10,
  pitch: 0,
  bearing: 0,
}

// Emergency-specific layer configurations
export const emergencyLayers: EmergencyLayerConfig[] = [
  {
    id: 'emergency-heatmap',
    type: 'heatmap',
    source: 'emergency-heatmap',
    paint: {
      'heatmap-weight': ['get', 'intensity'],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgb(103,169,207)',
        0.4, 'rgb(209,229,240)',
        0.6, 'rgb(253,219,199)',
        0.8, 'rgb(239,138,98)',
        1, 'rgb(178,24,43)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
    },
  },
]

// Map performance optimization settings
export const performanceConfig = {
  // Enable collision detection for better performance
  enableCollisionDetection: true,

  // Reduce complexity on low-end devices
  simplifyGeometry: true,

  // Optimize for mobile
  optimizeForMobile: true,

  // Tile caching settings
  cacheSize: 100, // Number of tiles to cache
  maxCacheSize: 500,

  // Rendering optimizations
  fadeDuration: 300,
  crossSourceCollisions: true,

  // Emergency-specific optimizations
  emergencyLayerUpdateThrottle: 100, // ms
  clusteringMaxZoom: 14,
  clusteringRadius: 50,
}

// Accessibility settings
export const accessibilityConfig = {
  // High contrast mode for emergency situations
  highContrast: {
    background: '#000000',
    text: '#ffffff',
    emergency: '#ff0000',
    safe: '#00ff00',
  },

  // Large text mode
  largeText: {
    fontSize: 16,
    iconSize: 1.5,
  },

  // Screen reader support
  screenReader: {
    enabled: true,
    announceEmergencies: true,
    announceLocationChanges: true,
  },

  // Keyboard navigation
  keyboardNavigation: {
    enabled: true,
    stepSize: 0.001, // degrees
  },
}

// Offline configuration
export const offlineConfig = {
  // Cache essential map tiles for emergency scenarios
  cacheEssentialTiles: true,

  // Cache radius around user location (in degrees)
  cacheRadius: 0.1, // ~11km

  // Cache zoom levels
  cacheZoomLevels: [10, 11, 12, 13, 14, 15],

  // Maximum cache size (in MB)
  maxCacheSize: 100,

  // Preload critical areas
  preloadCriticalAreas: [
    // Add known high-risk areas or emergency response centers
  ],
}

// Export configuration object
export const mapConfiguration = {
  default: defaultMapConfig,
  style: emergencyMapStyle,
  layers: emergencyLayers,
  performance: performanceConfig,
  accessibility: accessibilityConfig,
  offline: offlineConfig,
}