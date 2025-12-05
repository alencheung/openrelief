'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { 
  ZoomIn, 
  ZoomOut, 
  Crosshair, 
  Layers, 
  Navigation,
  Plus,
  Minus,
  Locate,
  Filter,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'

export interface MobileMapControlsProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onCenterLocation?: () => void
  onToggleLayers?: () => void
  onToggleFilter?: () => void
  onNavigate?: () => void
  onSettings?: () => void
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  variant?: 'compact' | 'full'
  showLabels?: boolean
  disabled?: boolean
}

export function MobileMapControls({
  onZoomIn,
  onZoomOut,
  onCenterLocation,
  onToggleLayers,
  onToggleFilter,
  onNavigate,
  onSettings,
  className,
  position = 'bottom-right',
  variant = 'compact',
  showLabels = false,
  disabled = false,
}: MobileMapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeControl, setActiveControl] = useState<string | null>(null)
  const { isMobile, isTouch } = useMobileDetection()

  // Auto-collapse controls after inactivity
  useEffect(() => {
    if (!isMobile) return

    const timer = setTimeout(() => {
      if (isExpanded && !activeControl) {
        setIsExpanded(false)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [isExpanded, activeControl, isMobile])

  // Handle control activation
  const handleControlActivate = (controlId: string) => {
    setActiveControl(controlId)
    setTimeout(() => setActiveControl(null), 1000) // Auto-deactivate after 1 second
  }

  // Touch gesture for expanding controls
  const gestureRef = useTouchGestures({
    onTap: () => {
      if (variant === 'compact') {
        setIsExpanded(!isExpanded)
      }
    },
    onLongPress: () => {
      setIsExpanded(true)
    },
  })

  if (!isMobile) return null

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  return (
    <div
      className={cn(
        'fixed z-30 mobile-map-controls safe-area-inset-bottom',
        positionClasses[position],
        className
      )}
    >
      {/* Compact Mode - Single floating button */}
      {variant === 'compact' && (
        <div
          ref={gestureRef.ref}
          className={cn(
            'mobile-map-control',
            'bg-background/90 backdrop-blur-sm border border-border',
            isExpanded && 'ring-2 ring-primary ring-offset-2'
          )}
          aria-label="Map controls"
          aria-expanded={isExpanded}
        >
          {isExpanded ? <X className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </div>
      )}

      {/* Expanded Controls */}
      <div
        className={cn(
          'flex flex-col gap-2 transition-all duration-normal',
          variant === 'compact' ? (
            isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          ) : 'opacity-100 scale-100'
        )}
      >
        {/* Primary Controls */}
        <div className="flex flex-col gap-2">
          {/* Zoom Controls */}
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="outline"
              className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
              onClick={() => {
                onZoomIn?.()
                handleControlActivate('zoom-in')
              }}
              disabled={disabled}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Button
              size="icon"
              variant="outline"
              className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
              onClick={() => {
                onZoomOut?.()
                handleControlActivate('zoom-out')
              }}
              disabled={disabled}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Location Control */}
          <Button
            size="icon"
            variant="outline"
            className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
            onClick={() => {
              onCenterLocation?.()
              handleControlActivate('center-location')
            }}
            disabled={disabled}
            aria-label="Center on your location"
          >
            <Crosshair className="w-4 h-4" />
          </Button>
        </div>

        {/* Secondary Controls */}
        {(onToggleLayers || onToggleFilter || onNavigate || onSettings) && (
          <div className="flex flex-col gap-2 mt-2">
            {/* Layers Toggle */}
            {onToggleLayers && (
              <Button
                size="icon"
                variant="outline"
                className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
                onClick={() => {
                  onToggleLayers()
                  handleControlActivate('layers')
                }}
                disabled={disabled}
                aria-label="Toggle map layers"
              >
                <Layers className="w-4 h-4" />
              </Button>
            )}

            {/* Filter Toggle */}
            {onToggleFilter && (
              <Button
                size="icon"
                variant="outline"
                className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
                onClick={() => {
                  onToggleFilter()
                  handleControlActivate('filter')
                }}
                disabled={disabled}
                aria-label="Filter emergencies"
              >
                <Filter className="w-4 h-4" />
              </Button>
            )}

            {/* Navigation */}
            {onNavigate && (
              <Button
                size="icon"
                variant="outline"
                className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
                onClick={() => {
                  onNavigate()
                  handleControlActivate('navigate')
                }}
                disabled={disabled}
                aria-label="Navigate to emergency"
              >
                <Navigation className="w-4 h-4" />
              </Button>
            )}

            {/* Settings */}
            {onSettings && (
              <Button
                size="icon"
                variant="outline"
                className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
                onClick={() => {
                  onSettings()
                  handleControlActivate('settings')
                }}
                disabled={disabled}
                aria-label="Map settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Control Labels (shown when enabled) */}
      {showLabels && activeControl && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-background/90 backdrop-blur-sm border border-border rounded-md text-xs font-medium whitespace-nowrap">
          {getControlLabel(activeControl)}
        </div>
      )}
    </div>
  )
}

// Helper function to get control labels
function getControlLabel(controlId: string): string {
  const labels: Record<string, string> = {
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'center-location': 'Center Location',
    'layers': 'Map Layers',
    'filter': 'Filter',
    'navigate': 'Navigate',
    'settings': 'Settings',
  }
  return labels[controlId] || ''
}

// Specialized control components for specific use cases
export function MobileZoomControls({
  onZoomIn,
  onZoomOut,
  disabled = false,
  className,
}: {
  onZoomIn?: () => void
  onZoomOut?: () => void
  disabled?: boolean
  className?: string
}) {
  const { isMobile } = useMobileDetection()

  if (!isMobile) return null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Button
        size="icon"
        variant="outline"
        className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
        onClick={onZoomIn}
        disabled={disabled}
        aria-label="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </Button>
      
      <Button
        size="icon"
        variant="outline"
        className="mobile-map-control bg-background/90 backdrop-blur-sm border border-border"
        onClick={onZoomOut}
        disabled={disabled}
        aria-label="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function MobileLocationControl({
  onCenterLocation,
  disabled = false,
  className,
}: {
  onCenterLocation?: () => void
  disabled?: boolean
  className?: string
}) {
  const { isMobile } = useMobileDetection()

  if (!isMobile) return null

  return (
    <Button
      size="icon"
      variant="outline"
      className={cn(
        'mobile-map-control bg-background/90 backdrop-blur-sm border border-border',
        className
      )}
      onClick={onCenterLocation}
      disabled={disabled}
      aria-label="Center on your location"
    >
      <Locate className="w-4 h-4" />
    </Button>
  )
}

export function MobileEmergencyControls({
  emergencies,
  selectedEmergency,
  onEmergencySelect,
  onNavigate,
  onFilter,
  disabled = false,
  className,
}: {
  emergencies: any[]
  selectedEmergency?: any
  onEmergencySelect?: (emergency: any) => void
  onNavigate?: (emergency: any) => void
  onFilter?: () => void
  disabled?: boolean
  className?: string
}) {
  const { isMobile } = useMobileDetection()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isMobile) return null

  return (
    <div className={cn('fixed bottom-20 left-4 z-30', className)}>
      {/* Emergency Summary Button */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'mobile-btn bg-background/90 backdrop-blur-sm border border-border',
          'flex items-center gap-2'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        aria-label="Emergency alerts"
        aria-expanded={isExpanded}
      >
        <EmergencyIndicator type="critical" pulse />
        <span className="text-sm font-medium">
          {emergencies.length} Emergency{emergencies.length !== 1 ? 'ies' : ''}
        </span>
      </Button>

      {/* Expanded Emergency List */}
      {isExpanded && (
        <div className="mobile-emergency-form open mt-2 max-h-60 overflow-y-auto">
          <div className="mobile-emergency-form-header">
            <h3 className="font-semibold">Nearby Emergencies</h3>
            <button
              className="touch-target"
              onClick={() => setIsExpanded(false)}
              aria-label="Close emergency list"
            >
              ×
            </button>
          </div>
          
          <div className="mobile-emergency-form-content">
            <div className="space-y-2">
              {emergencies.slice(0, 5).map((emergency) => (
                <button
                  key={emergency.id}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    'hover:bg-accent focus:bg-accent',
                    selectedEmergency?.id === emergency.id && 'bg-accent border-primary'
                  )}
                  onClick={() => {
                    onEmergencySelect?.(emergency)
                    setIsExpanded(false)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <EmergencyIndicator 
                      type={emergency.type} 
                      size="sm"
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {emergency.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {emergency.distance} away • {emergency.time}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {emergencies.length > 5 && (
              <button
                className="w-full mt-3 p-2 text-center text-sm text-primary font-medium"
                onClick={onFilter}
              >
                View all {emergencies.length} emergencies
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}