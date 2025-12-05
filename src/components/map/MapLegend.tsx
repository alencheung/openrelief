'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Eye, 
  EyeOff,
  Info,
  Accessibility
} from 'lucide-react'
import { EmergencyIndicator, TrustBadge, StatusIndicator, Icon, EnhancedCard } from '@/components/ui'

const mapLegendVariants = cva(
  'absolute bg-card rounded-xl shadow-xl border transition-all duration-normal z-10',
  {
    variants: {
      position: {
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
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
      position: 'bottom-left',
      size: 'md',
      variant: 'default',
    },
  }
)

export interface MapLegendProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mapLegendVariants> {
  emergencyTypes?: Array<{
    type: string
    name: string
    count?: number
    color?: string
  }>
  severityLevels?: Array<{
    level: number
    label: string
    color: string
  }>
  trustLevels?: Array<{
    level: string
    label: string
    color: string
  }>
  showLayerControls?: boolean
  showSeverityIndicators?: boolean
  showTrustIndicators?: boolean
  collapsible?: boolean
  initiallyCollapsed?: boolean
  onToggleCollapse?: (collapsed: boolean) => void
}

interface LegendSectionProps {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  initiallyCollapsed?: boolean
  icon?: React.ReactNode
}

const LegendSection: React.FC<LegendSectionProps> = ({
  title,
  children,
  collapsible = false,
  initiallyCollapsed = false,
  icon
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed)

  return (
    <div className="mb-4 last:mb-0">
      <div
        className={cn(
          'flex items-center justify-between mb-2 cursor-pointer select-none',
          !collapsible && 'cursor-default'
        )}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsCollapsed(!isCollapsed)
          }
        }}
        aria-expanded={collapsible ? isCollapsed : undefined}
        aria-controls={collapsible ? `legend-section-${title.replace(/\s+/g, '-')}` : undefined}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h5 className="font-semibold text-sm text-foreground">{title}</h5>
        </div>
        {collapsible && (
          <Icon
            name={isCollapsed ? 'chevronDown' : 'chevronUp'}
            size="sm"
            variant="muted"
            className="transition-transform duration-normal"
          />
        )}
      </div>
      {!isCollapsed && (
        <div
          id={collapsible ? `legend-section-${title.replace(/\s+/g, '-')}` : undefined}
          className="space-y-2"
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface LayerToggleProps {
  label: string
  isVisible: boolean
  onToggle: () => void
  color?: string
  count?: number
}

const LayerToggle: React.FC<LayerToggleProps> = ({
  label,
  isVisible,
  onToggle,
  color,
  count
}) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <span className="text-sm text-foreground">{label}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {count}
          </span>
        )}
      </div>
      {color && (
        <div
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

const MapLegend: React.FC<MapLegendProps> = ({
  className,
  position,
  size,
  variant,
  emergencyTypes = [
    { type: 'fire', name: 'Fire Emergency' },
    { type: 'medical', name: 'Medical Emergency' },
    { type: 'security', name: 'Security Threat' },
    { type: 'natural', name: 'Natural Disaster' },
    { type: 'infrastructure', name: 'Infrastructure Failure' },
  ],
  severityLevels = [
    { level: 1, label: 'Low', color: '#3b82f6' },
    { level: 2, label: 'Moderate', color: '#eab308' },
    { level: 3, label: 'High', color: '#f97316' },
    { level: 4, label: 'Severe', color: '#ef4444' },
    { level: 5, label: 'Critical', color: '#991b1b' },
  ],
  trustLevels = [
    { level: 'excellent', label: 'Excellent Trust', color: '#22c55e' },
    { level: 'good', label: 'Good Trust', color: '#84cc16' },
    { level: 'moderate', label: 'Moderate Trust', color: '#eab308' },
    { level: 'low', label: 'Low Trust', color: '#f97316' },
    { level: 'critical', label: 'Critical Trust', color: '#ef4444' },
  ],
  showLayerControls = true,
  showSeverityIndicators = true,
  showTrustIndicators = true,
  collapsible = true,
  initiallyCollapsed = false,
  onToggleCollapse,
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed)
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    emergencies: true,
    severity: true,
    trust: true,
    heatmap: false,
    geofences: true,
  })

  const legendRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCollapsed === false) {
        setIsCollapsed(true)
        onToggleCollapse?.(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCollapsed, onToggleCollapse])

  const toggleLayer = (layer: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }))
  }

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)
    onToggleCollapse?.(newCollapsedState)
  }

  return (
    <div
      ref={legendRef}
      className={cn(mapLegendVariants({ position, size, variant, className }))}
      role="region"
      aria-label="Map legend"
      {...props}
    >
      {/* Legend Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold text-foreground">Map Legend</h4>
        </div>
        {collapsible && (
          <button
            onClick={handleToggleCollapse}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? 'Expand legend' : 'Collapse legend'}
            aria-expanded={!isCollapsed}
          >
            <Icon
              name={isCollapsed ? 'chevronDown' : 'chevronUp'}
              size="sm"
              variant="muted"
              className="transition-transform duration-normal"
            />
          </button>
        )}
      </div>

      {/* Legend Content */}
      {!isCollapsed && (
        <div className="space-y-1">
          {/* Emergency Types Section */}
          <LegendSection
            title="Emergency Types"
            icon={<Icon name="alertTriangle" size="xs" />}
            collapsible
            initiallyCollapsed={false}
          >
            <div className="space-y-2">
              {emergencyTypes.map((type) => (
                <div key={type.type} className="flex items-center gap-2">
                  <EmergencyIndicator
                    type={type.type as any}
                    size="sm"
                    variant="subtle"
                    label=""
                  />
                  <span className="text-xs text-foreground flex-1">{type.name}</span>
                  {type.count !== undefined && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {type.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </LegendSection>

          {/* Severity Levels Section */}
          {showSeverityIndicators && (
            <LegendSection
              title="Severity Levels"
              icon={<Icon name="alertCircle" size="xs" />}
              collapsible
              initiallyCollapsed={true}
            >
              <div className="space-y-2">
                {severityLevels.map((severity) => (
                  <div key={severity.level} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: severity.color }}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-foreground flex-1">
                      Level {severity.level}: {severity.label}
                    </span>
                  </div>
                ))}
              </div>
            </LegendSection>
          )}

          {/* Trust Levels Section */}
          {showTrustIndicators && (
            <LegendSection
              title="Trust Levels"
              icon={<Icon name="shield" size="xs" />}
              collapsible
              initiallyCollapsed={true}
            >
              <div className="space-y-2">
                {trustLevels.map((trust) => (
                  <div key={trust.level} className="flex items-center gap-2">
                    <TrustBadge
                      level={trust.level as any}
                      score={trust.level === 'excellent' ? 95 :
                             trust.level === 'good' ? 80 :
                             trust.level === 'moderate' ? 60 :
                             trust.level === 'low' ? 40 : 20}
                      size="sm"
                      showPercentage={false}
                      label=""
                    />
                    <span className="text-xs text-foreground">{trust.label}</span>
                  </div>
                ))}
              </div>
            </LegendSection>
          )}

          {/* Layer Controls Section */}
          {showLayerControls && (
            <LegendSection
              title="Map Layers"
              icon={<Icon name="layers" size="xs" />}
              collapsible
              initiallyCollapsed={false}
            >
              <div className="space-y-1">
                <LayerToggle
                  label="Emergency Events"
                  isVisible={visibleLayers.emergencies}
                  onToggle={() => toggleLayer('emergencies')}
                />
                <LayerToggle
                  label="Severity Indicators"
                  isVisible={visibleLayers.severity}
                  onToggle={() => toggleLayer('severity')}
                />
                <LayerToggle
                  label="Trust Indicators"
                  isVisible={visibleLayers.trust}
                  onToggle={() => toggleLayer('trust')}
                />
                <LayerToggle
                  label="Emergency Heatmap"
                  isVisible={visibleLayers.heatmap}
                  onToggle={() => toggleLayer('heatmap')}
                />
                <LayerToggle
                  label="Geofences"
                  isVisible={visibleLayers.geofences}
                  onToggle={() => toggleLayer('geofences')}
                />
              </div>
            </LegendSection>
          )}

          {/* Accessibility Info */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Accessibility className="w-3 h-3" />
              <span>Press ESC to collapse legend</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

MapLegend.displayName = 'MapLegend'

export { MapLegend, mapLegendVariants }