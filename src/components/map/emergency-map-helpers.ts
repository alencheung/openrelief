import { useEffect } from 'react'
import type { EmergencyEvent } from '@/store/emergencyStore'

// ---------------------------------------------------------------------------
// Keyboard shortcuts
//
// Extracted from EmergencyMap.tsx so the main component doesn't carry the
// ~90-line register/cleanup effect. The hook wires the map's zoom/pan/center
// actions to global keyboard shortcuts via the accessibility layer.
// ---------------------------------------------------------------------------

type RegisterShortcut = (opts: {
  key: string
  action: () => void
  description: string
  preventDefault?: boolean
}) => void
type UnregisterShortcut = (key: string) => void

export interface UseEmergencyMapKeyboardShortcutsArgs {
  registerShortcut: RegisterShortcut
  unregisterShortcut: UnregisterShortcut
  zoomIn: () => void
  zoomOut: () => void
  centerOnUser: () => void
  toggleHeatmap: () => void
  panMap: (direction: 'up' | 'down' | 'left' | 'right') => void
  announcePolite: (msg: string) => void
}

export function useEmergencyMapKeyboardShortcuts(args: UseEmergencyMapKeyboardShortcutsArgs) {
  const {
    registerShortcut,
    unregisterShortcut,
    zoomIn,
    zoomOut,
    centerOnUser,
    toggleHeatmap,
    panMap,
    announcePolite
  } = args

  useEffect(() => {
    // Map navigation shortcuts
    registerShortcut({
      key: '+',
      action: () => zoomIn(),
      description: 'Zoom in on map',
      preventDefault: true
    })

    registerShortcut({
      key: '=',
      action: () => zoomOut(),
      description: 'Zoom out on map',
      preventDefault: true
    })

    registerShortcut({
      key: 'c',
      action: () => centerOnUser(),
      description: 'Center map on user location',
      preventDefault: true
    })

    registerShortcut({
      key: 'h',
      action: () => toggleHeatmap(),
      description: 'Toggle heatmap',
      preventDefault: true
    })

    // Arrow key navigation
    registerShortcut({
      key: 'ArrowUp',
      action: () => panMap('up'),
      description: 'Pan map up',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowDown',
      action: () => panMap('down'),
      description: 'Pan map down',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowLeft',
      action: () => panMap('left'),
      description: 'Pan map left',
      preventDefault: true
    })

    registerShortcut({
      key: 'ArrowRight',
      action: () => panMap('right'),
      description: 'Pan map right',
      preventDefault: true
    })

    // Emergency shortcuts
    registerShortcut({
      key: 'e',
      action: () => {
        // Focus emergency report button
        const reportButton = document.querySelector('[data-emergency-report]') as HTMLElement
        reportButton?.focus()
        announcePolite('Focused on emergency report')
      },
      description: 'Focus emergency report',
      preventDefault: true
    })

    return () => {
      // Clean up shortcuts
      unregisterShortcut('+')
      unregisterShortcut('=')
      unregisterShortcut('c')
      unregisterShortcut('h')
      unregisterShortcut('ArrowUp')
      unregisterShortcut('ArrowDown')
      unregisterShortcut('ArrowLeft')
      unregisterShortcut('ArrowRight')
      unregisterShortcut('e')
    }
  }, [
    registerShortcut,
    unregisterShortcut,
    zoomIn,
    zoomOut,
    centerOnUser,
    toggleHeatmap,
    panMap,
    announcePolite
  ])
}

// ---------------------------------------------------------------------------
// Emergency display helpers (icon class, severity sizing, trust level, status)
// ---------------------------------------------------------------------------

const EMERGENCY_ICON_CLASSES: Record<string, string> = {
  fire: 'emergency-fire',
  medical: 'emergency-medical',
  security: 'emergency-security',
  natural: 'emergency-natural',
  infrastructure: 'emergency-infrastructure'
}

// Returns the CSS class identifier for a given emergency type. Falls back to
// the fire styling when the type is unrecognised.
export function getEmergencyIcon(type: string, _severity: number): string {
  return EMERGENCY_ICON_CLASSES[type] || 'emergency-fire'
}

const SEVERITY_SIZES = ['w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-14 h-14']

// Maps a 1-based severity value to a tailwind size class, clamping to the
// largest available size.
export function getSeveritySize(severity: number): string {
  const index = Math.min(severity - 1, SEVERITY_SIZES.length - 1)
  return SEVERITY_SIZES[index] || SEVERITY_SIZES[0]
}

// Buckets a 0..1 trust weight into a human-readable level label.
export function getTrustLevel(trustWeight: number): string {
  if (trustWeight >= 0.9) {
    return 'excellent'
  }
  if (trustWeight >= 0.7) {
    return 'good'
  }
  if (trustWeight >= 0.5) {
    return 'moderate'
  }
  if (trustWeight >= 0.3) {
    return 'low'
  }
  return 'critical'
}

// Normalises the raw emergency status string into one of the display buckets
// consumed by the legend / popup components.
export function getStatusFromEventStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'reported':
      return 'active'
    case 'resolved':
    case 'closed':
      return 'resolved'
    case 'pending':
    case 'investigating':
      return 'pending'
    case 'inactive':
    case 'archived':
      return 'inactive'
    default:
      return 'pending'
  }
}

// ---------------------------------------------------------------------------
// Coordinate / location helpers
// ---------------------------------------------------------------------------

export interface ParsedLocation {
  lat: number
  lng: number
}

// Emergency events store their location as a `"lat lng"` PostGIS-style string.
// This splits it back out into numeric coordinates, defaulting to 0,0 when the
// value is missing or unparseable.
export function parseEmergencyLocation(location: string): ParsedLocation {
  const parts = location.split(' ')
  return {
    lat: parseFloat(parts[0] || '0'),
    lng: parseFloat(parts[1] || '0')
  }
}

// Rough great-circle approximation good enough for proximity display. Returns
// metres — multiply degrees by ~111km per degree at the equator.
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return (
    Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111000
  )
}

// ---------------------------------------------------------------------------
// GeoJSON feature builders
// ---------------------------------------------------------------------------

// Converts the store's emergency records into the raw GeoJSON point features
// consumed by MapLibre's `emergency-events` source. Kept pure so the layer
// controller can hand the same array to either the GPU clustering path or the
// CPU Supercluster fallback without rebuilding it twice.
export function buildEmergencyFeatures(events: EmergencyEvent[]): any[] {
  return events.map(event => ({
    type: 'Feature',
    properties: {
      id: event.id,
      type: event.emergency_types?.slug || 'unknown',
      severity: event.severity,
      status: event.status,
      trust_score: event.trust_weight,
      title: event.title,
      description: event.description,
      created_at: event.created_at
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [
        parseFloat(event.location.split(' ')[1] || '0'),
        parseFloat(event.location.split(' ')[0] || '0')
      ]
    }
  }))
}

export interface SpatialInfo {
  distance?: number
  estimatedTime?: number
  coordinates?: [number, number]
  accuracy?: number
}

// Computes the distance + ETA spatial overlay payload for the currently
// selected emergency relative to the user's location.
export function calculateSpatialInfo(
  userLat: number,
  userLng: number,
  emergencyLocation: string,
  userAccuracy?: number
): SpatialInfo {
  const { lat: emergencyLat, lng: emergencyLng } = parseEmergencyLocation(emergencyLocation)
  const distance = calculateDistance(userLat, userLng, emergencyLat, emergencyLng)
  return {
    distance,
    // Assuming 50 km/h average speed
    estimatedTime: distance / 50,
    coordinates: [userLat, userLng],
    accuracy: userAccuracy
  }
}

// ---------------------------------------------------------------------------
// Map legend
// ---------------------------------------------------------------------------

export interface LegendEmergencyType {
  type: string
  name: string
  count: number
}

const LEGEND_EMERGENCY_TYPES: Array<{ type: string; name: string }> = [
  { type: 'fire', name: 'Fire Emergency' },
  { type: 'medical', name: 'Medical Emergency' },
  { type: 'security', name: 'Security Threat' },
  { type: 'natural', name: 'Natural Disaster' },
  { type: 'infrastructure', name: 'Infrastructure Failure' }
]

// Builds the per-type tally consumed by the MapLegend component.
export function buildLegendEmergencyTypes(events: EmergencyEvent[]): LegendEmergencyType[] {
  return LEGEND_EMERGENCY_TYPES.map(({ type, name }) => ({
    type,
    name,
    count: events.filter(ev => ev.emergency_types?.slug === type).length
  }))
}
