'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  Bell,
  BellRing,
  Navigation,
  AlertTriangle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Route,
  Eye,
  EyeOff
} from 'lucide-react'
import { StatusIndicator, TrustBadge, Icon, EnhancedCard, EnhancedButton } from '@/components/ui'

const proximityAlertsVariants = cva(
  'absolute bg-card rounded-xl shadow-xl border transition-all duration-normal z-10',
  {
    variants: {
      position: {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4'
      },
      size: {
        sm: 'max-w-xs',
        md: 'max-w-sm',
        lg: 'max-w-md',
        xl: 'max-w-lg'
      },
      variant: {
        default: 'p-4',
        compact: 'p-3',
        minimal: 'p-2'
      }
    },
    defaultVariants: {
      position: 'top-left',
      size: 'md',
      variant: 'default'
    }
  }
)

export interface ProximityAlert {
  id: string
  emergencyId: string
  emergencyType: string
  title: string
  message: string
  severity: 'low' | 'moderate' | 'high' | 'critical'
  distance: number
  estimatedTime?: number
  trustScore?: number
  timestamp: string
  isRead?: boolean
  actions?: Array<{
    id: string
    label: string
    action: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  }>
}

export interface ProximityAlertsDisplayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof proximityAlertsVariants> {
  alerts: ProximityAlert[]
  maxVisible?: number
  showDismissAll?: boolean
  showMarkAllRead?: boolean
  showFilterControls?: boolean
  autoDismiss?: boolean
  autoDismissDelay?: number
  onAlertClick?: (alert: ProximityAlert) => void
  onAlertDismiss?: (alertId: string) => void
  onDismissAll?: () => void
  onMarkAllRead?: () => void
  onFilterChange?: (filter: string) => void
}

interface AlertItemProps {
  alert: ProximityAlert
  isExpanded: boolean
  onToggleExpand: () => void
  onClick: () => void
  onDismiss: () => void
  onMarkRead: () => void
  showActions?: boolean
}

const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  isExpanded,
  onToggleExpand,
  onClick,
  onDismiss,
  onMarkRead,
  showActions = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const getSeverityStatus = (severity: string) => {
    switch (severity) {
      case 'critical': return 'critical'
      case 'high': return 'critical'
      case 'moderate': return 'pending'
      case 'low': return 'active'
      default: return 'pending'
    }
  }

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`
    }
    return `${(distance / 1000).toFixed(1)}km`
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}min`
  }

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case 'fire': return 'flame'
      case 'medical': return 'heartPulse'
      case 'security': return 'shield'
      case 'natural': return 'cloudRain'
      case 'infrastructure': return 'wrench'
      default: return 'alertTriangle'
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAnimating(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }

  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border transition-all duration-normal cursor-pointer hover:bg-muted/50',
        !alert.isRead && 'bg-muted/30 border-l-4 border-l-warning',
        isAnimating && 'animate-slide-out-right opacity-0'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`Proximity alert: ${alert.title}`}
    >
      {/* Alert Header */}
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="flex-shrink-0 mt-1">
          <StatusIndicator
            status={getSeverityStatus(alert.severity)}
            size="sm"
            variant="subtle"
            pulse={alert.severity === 'critical'}
            showIcon={false}
            label=""
          />
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Icon
                name={getEmergencyIcon(alert.emergencyType)}
                size="sm"
                variant={alert.severity === 'critical' ? 'error' : 'default'}
              />
              <h5 className="font-semibold text-sm text-foreground truncate">
                {alert.title}
              </h5>
              {!alert.isRead && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" aria-hidden="true" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {alert.message}
          </p>

          {/* Alert Metadata */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                <span>{formatDistance(alert.distance)}</span>
              </div>
              {alert.estimatedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(alert.estimatedTime)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand()
              }}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={isExpanded}
            >
              <Icon
                name={isExpanded ? 'chevronUp' : 'chevronDown'}
                size="xs"
                variant="muted"
              />
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {/* Trust Score */}
              {alert.trustScore && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trust Score:</span>
                  <TrustBadge
                    level={alert.trustScore >= 0.8 ? 'excellent'
                      : alert.trustScore >= 0.6 ? 'good'
                        : alert.trustScore >= 0.4 ? 'moderate'
                          : alert.trustScore >= 0.2 ? 'low' : 'critical'}
                    score={Math.round(alert.trustScore * 100)}
                    size="sm"
                    showPercentage
                  />
                </div>
              )}

              {/* Action Buttons */}
              {showActions && alert.actions && alert.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {alert.actions.map((action) => (
                    <EnhancedButton
                      key={action.id}
                      size="sm"
                      variant={action.variant || 'outline'}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.action()
                      }}
                      className="text-xs"
                    >
                      {action.label}
                    </EnhancedButton>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ProximityAlertsDisplay: React.FC<ProximityAlertsDisplayProps> = ({
  className,
  position,
  size,
  variant,
  alerts = [],
  maxVisible = 3,
  showDismissAll = true,
  showMarkAllRead = true,
  showFilterControls = true,
  autoDismiss = false,
  autoDismissDelay = 30000,
  onAlertClick,
  onAlertDismiss,
  onDismissAll,
  onMarkAllRead,
  onFilterChange,
  ...props
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState<ProximityAlert[]>(alerts)
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('all')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)

  // Update visible alerts when props change
  useEffect(() => {
    setVisibleAlerts(alerts)
  }, [alerts])

  // Auto-dismiss functionality
  useEffect(() => {
    if (!autoDismiss) {
      return
    }

    const interval = setInterval(() => {
      const now = Date.now()
      setVisibleAlerts(prev => prev.filter(alert => {
        const alertTime = new Date(alert.timestamp).getTime()
        return now - alertTime < autoDismissDelay
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [autoDismiss, autoDismissDelay])

  // Filter alerts
  const filteredAlerts = React.useMemo(() => {
    if (filter === 'all') {
      return visibleAlerts
    }
    if (filter === 'unread') {
      return visibleAlerts.filter(alert => !alert.isRead)
    }
    if (filter === 'critical') {
      return visibleAlerts.filter(alert => alert.severity === 'critical')
    }
    return visibleAlerts
  }, [visibleAlerts, filter])

  const handleAlertClick = (alert: ProximityAlert) => {
    onAlertClick?.(alert)
  }

  const handleAlertDismiss = (alertId: string) => {
    setVisibleAlerts(prev => prev.filter(alert => alert.id !== alertId))
    onAlertDismiss?.(alertId)
  }

  const handleDismissAll = () => {
    setVisibleAlerts([])
    onDismissAll?.()
  }

  const handleMarkAllRead = () => {
    setVisibleAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })))
    onMarkAllRead?.()
  }

  const toggleAlertExpanded = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  const unreadCount = visibleAlerts.filter(alert => !alert.isRead).length
  const criticalCount = visibleAlerts.filter(alert => alert.severity === 'critical').length

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div
      ref={alertsRef}
      className={cn(proximityAlertsVariants({ position, size, variant, className }))}
      role="region"
      aria-label="Proximity alerts"
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <BellRing className="w-4 h-4 text-destructive animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-muted-foreground" />
          )}
          <h4 className="font-semibold text-sm text-foreground">Proximity Alerts</h4>
          <StatusIndicator
            status={criticalCount > 0 ? 'critical' : 'active'}
            size="sm"
            variant="subtle"
            pulse={criticalCount > 0}
            label={`${filteredAlerts.length} Active`}
          />
          {unreadCount > 0 && (
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {unreadCount} new
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label={isCollapsed ? 'Expand alerts' : 'Collapse alerts'}
          aria-expanded={!isCollapsed}
        >
          <Icon
            name={isCollapsed ? 'chevronDown' : 'chevronUp'}
            size="sm"
            variant="muted"
          />
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="space-y-2">
          {/* Filter Controls */}
          {showFilterControls && (
            <div className="flex flex-wrap gap-2 mb-3">
              <EnhancedButton
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => {
                  setFilter('all')
                  onFilterChange?.('all')
                }}
                className="text-xs"
              >
                All ({visibleAlerts.length})
              </EnhancedButton>
              <EnhancedButton
                size="sm"
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => {
                  setFilter('unread')
                  onFilterChange?.('unread')
                }}
                className="text-xs"
              >
                Unread ({unreadCount})
              </EnhancedButton>
              <EnhancedButton
                size="sm"
                variant={filter === 'critical' ? 'destructive' : 'outline'}
                onClick={() => {
                  setFilter('critical')
                  onFilterChange?.('critical')
                }}
                className="text-xs"
              >
                Critical ({criticalCount})
              </EnhancedButton>
            </div>
          )}

          {/* Alert List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAlerts.slice(0, maxVisible).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                isExpanded={expandedAlerts.has(alert.id)}
                onToggleExpand={() => toggleAlertExpanded(alert.id)}
                onClick={() => handleAlertClick(alert)}
                onDismiss={() => handleAlertDismiss(alert.id)}
                onMarkRead={() => {
                  setVisibleAlerts(prev =>
                    prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a)
                  )
                }}
              />
            ))}
            {filteredAlerts.length > maxVisible && (
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">
                  +{filteredAlerts.length - maxVisible} more alerts
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {(showDismissAll || showMarkAllRead) && (
            <div className="flex justify-between pt-3 border-t border-border mt-3">
              <div className="flex gap-2">
                {showMarkAllRead && unreadCount > 0 && (
                  <EnhancedButton
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllRead}
                    className="text-xs"
                  >
                    Mark All Read
                  </EnhancedButton>
                )}
              </div>
              <div className="flex gap-2">
                {showDismissAll && (
                  <EnhancedButton
                    size="sm"
                    variant="destructive"
                    onClick={handleDismissAll}
                    className="text-xs"
                  >
                    Dismiss All
                  </EnhancedButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

ProximityAlertsDisplay.displayName = 'ProximityAlertsDisplay'

export { ProximityAlertsDisplay, proximityAlertsVariants }