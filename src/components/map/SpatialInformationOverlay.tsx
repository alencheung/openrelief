'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Route, 
  Ruler, 
  Compass,
  Eye,
  EyeOff,
  Settings,
  Info,
  Target,
  Zap,
  Activity
} from 'lucide-react'
import { Icon, EnhancedCard, EnhancedButton } from '@/components/ui'

const spatialOverlayVariants = cva(
  'absolute bg-card/90 backdrop-blur-sm rounded-xl shadow-xl border transition-all duration-normal z-10',
  {
    variants: {
      position: {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      },
      size: {
        sm: 'max-w-xs',
        md: 'max-w-sm',
        lg: 'max-w-md',
        xl: 'max-w-lg',
      },
      variant: {
        default: 'p-4',
        compact: 'p-3',
        minimal: 'p-2',
      }
    },
    defaultVariants: {
      position: 'top-right',
      size: 'sm',
      variant: 'compact',
    },
  }
)

export interface SpatialInfo {
  distance?: number
  estimatedTime?: number
  areaRadius?: number
  coordinates?: [number, number]
  bearing?: number
  speed?: number
  elevation?: number
  accuracy?: number
}

export interface SpatialInformationOverlayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spatialOverlayVariants> {
  spatialInfo: SpatialInfo
  userLocation?: [number, number]
  targetLocation?: [number, number]
  showDistance?: boolean
  showTimeEstimate?: boolean
  showAreaRadius?: boolean
  showCoordinates?: boolean
  showBearing?: boolean
  showSpeed?: boolean
  showAccuracy?: boolean
  showControls?: boolean
  unitSystem?: 'metric' | 'imperial'
  onUnitChange?: (unit: 'metric' | 'imperial') => void
  onToggleOverlay?: (visible: boolean) => void
  interactive?: boolean
  animated?: boolean
}

interface DistanceIndicatorProps {
  distance?: number
  unitSystem: 'metric' | 'imperial'
  animated?: boolean
}

const DistanceIndicator: React.FC<DistanceIndicatorProps> = ({
  distance,
  unitSystem,
  animated = false
}) => {
  if (!distance) return null

  const formatDistance = (dist: number) => {
    if (unitSystem === 'metric') {
      if (dist < 1000) {
        return `${Math.round(dist)}m`
      }
      return `${(dist / 1000).toFixed(1)}km`
    } else {
      // Imperial conversion
      const distInFeet = dist * 3.28084
      if (distInFeet < 5280) {
        return `${Math.round(distInFeet)}ft`
      }
      return `${(distInFeet / 5280).toFixed(1)}mi`
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="route" size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Distance</span>
        <span className={cn(
          'text-sm font-semibold text-foreground',
          animated && 'animate-pulse'
        )}>
          {formatDistance(distance)}
        </span>
      </div>
    </div>
  )
}

interface TimeEstimateProps {
  time?: number
  unitSystem: 'metric' | 'imperial'
  transportMode?: 'walking' | 'driving' | 'cycling'
  animated?: boolean
}

const TimeEstimate: React.FC<TimeEstimateProps> = ({
  time,
  unitSystem,
  transportMode = 'driving',
  animated = false
}) => {
  if (!time) return null

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}min`
  }

  const getTransportIcon = () => {
    switch (transportMode) {
      case 'walking': return 'navigation'
      case 'cycling': return 'activity'
      case 'driving': return 'zap'
      default: return 'clock'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name={getTransportIcon()} size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Est. Time</span>
        <span className={cn(
          'text-sm font-semibold text-foreground',
          animated && 'animate-pulse'
        )}>
          {formatTime(time)}
        </span>
      </div>
    </div>
  )
}

interface AreaRadiusProps {
  radius?: number
  unitSystem: 'metric' | 'imperial'
  animated?: boolean
}

const AreaRadius: React.FC<AreaRadiusProps> = ({
  radius,
  unitSystem,
  animated = false
}) => {
  if (!radius) return null

  const formatRadius = (r: number) => {
    if (unitSystem === 'metric') {
      if (r < 1000) {
        return `${Math.round(r)}m`
      }
      return `${(r / 1000).toFixed(1)}km`
    } else {
      // Imperial conversion
      const rInFeet = r * 3.28084
      if (rInFeet < 5280) {
        return `${Math.round(rInFeet)}ft`
      }
      return `${(rInFeet / 5280).toFixed(1)}mi`
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="target" size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Radius</span>
        <span className={cn(
          'text-sm font-semibold text-foreground',
          animated && 'animate-pulse'
        )}>
          {formatRadius(radius)}
        </span>
      </div>
    </div>
  )
}

interface CoordinatesDisplayProps {
  coordinates?: [number, number]
  precision?: number
}

const CoordinatesDisplay: React.FC<CoordinatesDisplayProps> = ({
  coordinates,
  precision = 6
}) => {
  if (!coordinates) return null

  const formatCoordinate = (coord: number, isLatitude: boolean) => {
    const absolute = Math.abs(coord)
    const degrees = Math.floor(absolute)
    const minutesNotTruncated = (absolute - degrees) * 60
    const minutes = Math.floor(minutesNotTruncated)
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(precision)
    const direction = isLatitude 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W')
    
    return `${degrees}°${minutes}'${seconds}"${direction}`
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="compass" size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Coordinates</span>
        <span className="text-xs font-mono text-foreground">
          {formatCoordinate(coordinates[0], true)}, {formatCoordinate(coordinates[1], false)}
        </span>
      </div>
    </div>
  )
}

interface BearingDisplayProps {
  bearing?: number
  animated?: boolean
}

const BearingDisplay: React.FC<BearingDisplayProps> = ({
  bearing,
  animated = false
}) => {
  if (!bearing) return null

  const getBearingDirection = (b: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(b / 45) % 8
    return directions[index]
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="compass" size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Bearing</span>
        <span className={cn(
          'text-sm font-semibold text-foreground',
          animated && 'animate-pulse'
        )}>
          {Math.round(bearing)}° {getBearingDirection(bearing)}
        </span>
      </div>
    </div>
  )
}

interface SpeedDisplayProps {
  speed?: number
  unitSystem: 'metric' | 'imperial'
  animated?: boolean
}

const SpeedDisplay: React.FC<SpeedDisplayProps> = ({
  speed,
  unitSystem,
  animated = false
}) => {
  if (!speed) return null

  const formatSpeed = (s: number) => {
    if (unitSystem === 'metric') {
      return `${Math.round(s)} km/h`
    } else {
      // Imperial conversion
      const speedInMph = s * 0.621371
      return `${Math.round(speedInMph)} mph`
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="activity" size="sm" variant="primary" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Speed</span>
        <span className={cn(
          'text-sm font-semibold text-foreground',
          animated && 'animate-pulse'
        )}>
          {formatSpeed(speed)}
        </span>
      </div>
    </div>
  )
}

interface AccuracyDisplayProps {
  accuracy?: number
  unitSystem: 'metric' | 'imperial'
}

const AccuracyDisplay: React.FC<AccuracyDisplayProps> = ({
  accuracy,
  unitSystem
}) => {
  if (!accuracy) return null

  const formatAccuracy = (a: number) => {
    if (unitSystem === 'metric') {
      return `±${Math.round(a)}m`
    } else {
      // Imperial conversion
      const accuracyInFeet = a * 3.28084
      return `±${Math.round(accuracyInFeet)}ft`
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Icon name="target" size="sm" variant="muted" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Accuracy</span>
        <span className="text-sm font-semibold text-foreground">
          {formatAccuracy(accuracy)}
        </span>
      </div>
    </div>
  )
}

const SpatialInformationOverlay: React.FC<SpatialInformationOverlayProps> = ({
  className,
  position,
  size,
  variant,
  spatialInfo,
  userLocation,
  targetLocation,
  showDistance = true,
  showTimeEstimate = true,
  showAreaRadius = true,
  showCoordinates = false,
  showBearing = false,
  showSpeed = false,
  showAccuracy = true,
  showControls = true,
  unitSystem = 'metric',
  onUnitChange,
  onToggleOverlay,
  interactive = true,
  animated = true,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [currentUnitSystem, setCurrentUnitSystem] = useState(unitSystem)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false)
        onToggleOverlay?.(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onToggleOverlay])

  const handleUnitToggle = () => {
    const newUnitSystem = currentUnitSystem === 'metric' ? 'imperial' : 'metric'
    setCurrentUnitSystem(newUnitSystem)
    onUnitChange?.(newUnitSystem)
  }

  const handleToggleVisibility = () => {
    const newVisibility = !isVisible
    setIsVisible(newVisibility)
    onToggleOverlay?.(newVisibility)
  }

  if (!isVisible) {
    return (
      <div className={cn('absolute', position)}>
        <EnhancedButton
          size="icon-sm"
          variant="outline"
          onClick={handleToggleVisibility}
          className="shadow-lg"
          aria-label="Show spatial information"
        >
          <Eye className="w-4 h-4" />
        </EnhancedButton>
      </div>
    )
  }

  return (
    <div
      ref={overlayRef}
      className={cn(spatialOverlayVariants({ position, size, variant, className }))}
      role="region"
      aria-label="Spatial information overlay"
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="navigation" size="sm" variant="primary" />
          <h4 className="font-semibold text-sm text-foreground">Spatial Info</h4>
        </div>
        <div className="flex items-center gap-1">
          {showControls && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                aria-expanded={expanded}
              >
                <Icon
                  name={expanded ? 'chevronUp' : 'chevronDown'}
                  size="xs"
                  variant="muted"
                />
              </button>
              <button
                onClick={handleUnitToggle}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label={`Switch to ${currentUnitSystem === 'metric' ? 'imperial' : 'metric'} units`}
              >
                <span className="text-xs font-mono text-muted-foreground">
                  {currentUnitSystem === 'metric' ? 'm' : 'ft'}
                </span>
              </button>
              <button
                onClick={handleToggleVisibility}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label="Hide spatial information"
              >
                <EyeOff className="w-3 h-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        'space-y-3',
        !expanded && 'max-h-32 overflow-hidden'
      )}>
        {showDistance && (
          <DistanceIndicator
            distance={spatialInfo.distance}
            unitSystem={currentUnitSystem}
            animated={animated}
          />
        )}

        {showTimeEstimate && (
          <TimeEstimate
            time={spatialInfo.estimatedTime}
            unitSystem={currentUnitSystem}
            animated={animated}
          />
        )}

        {showAreaRadius && (
          <AreaRadius
            radius={spatialInfo.areaRadius}
            unitSystem={currentUnitSystem}
            animated={animated}
          />
        )}

        {expanded && (
          <>
            {showCoordinates && (
              <CoordinatesDisplay
                coordinates={spatialInfo.coordinates}
              />
            )}

            {showBearing && (
              <BearingDisplay
                bearing={spatialInfo.bearing}
                animated={animated}
              />
            )}

            {showSpeed && (
              <SpeedDisplay
                speed={spatialInfo.speed}
                unitSystem={currentUnitSystem}
                animated={animated}
              />
            )}

            {showAccuracy && (
              <AccuracyDisplay
                accuracy={spatialInfo.accuracy}
                unitSystem={currentUnitSystem}
              />
            )}
          </>
        )}
      </div>

      {/* Interactive Controls */}
      {interactive && expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <div className="flex gap-1">
              <EnhancedButton
                size="icon-sm"
                variant="ghost"
                aria-label="Refresh spatial information"
              >
                <Icon name="refresh" size="xs" />
              </EnhancedButton>
              <EnhancedButton
                size="icon-sm"
                variant="ghost"
                aria-label="Spatial information settings"
              >
                <Icon name="settings" size="xs" />
              </EnhancedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

SpatialInformationOverlay.displayName = 'SpatialInformationOverlay'

export { 
  SpatialInformationOverlay, 
  spatialOverlayVariants,
  DistanceIndicator,
  TimeEstimate,
  AreaRadius,
  CoordinatesDisplay,
  BearingDisplay,
  SpeedDisplay,
  AccuracyDisplay
}