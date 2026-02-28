import React from 'react'
import {
  cn,
  formatRelativeTime,
  formatDistance,
  parseGeoLocation,
  calculateDistance
} from '@/lib/utils'
import type { EmergencyEvent } from '@/store/emergencyStore'

export interface EmergencyListItemProps {
  event: EmergencyEvent
  onClick?: ((event: EmergencyEvent) => void) | undefined
  onConfirm?: ((eventId: string) => void) | undefined
  onDispute?: ((eventId: string) => void) | undefined
  isSelected?: boolean | undefined
  showDistance?: boolean | undefined
  userLocation?: { lat: number; lng: number } | null | undefined
  className?: string | undefined
}

const getStatusColor = (status: EmergencyEvent['status']) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    active: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
  }
  return colors[status]
}

const getSeverityBadge = (severity: number) => {
  if (severity >= 5) {
    return { bg: 'bg-red-600', label: 'Critical' }
  }
  if (severity >= 4) {
    return { bg: 'bg-orange-500', label: 'High' }
  }
  if (severity >= 3) {
    return { bg: 'bg-yellow-500', label: 'Medium' }
  }
  if (severity >= 2) {
    return { bg: 'bg-blue-500', label: 'Low' }
  }
  return { bg: 'bg-gray-400', label: 'Info' }
}

const EmergencyListItem = React.memo<EmergencyListItemProps>(
  ({
    event,
    onClick,
    onConfirm,
    onDispute,
    isSelected,
    showDistance = true,
    userLocation,
    className
  }) => {
    const handleClick = () => {
      onClick?.(event)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.(event)
      }
    }

    const handleConfirm = (e: React.MouseEvent) => {
      e.stopPropagation()
      onConfirm?.(event.id)
    }

    const handleDispute = (e: React.MouseEvent) => {
      e.stopPropagation()
      onDispute?.(event.id)
    }

    const severity = getSeverityBadge(event.severity)
    const parsedLocation = parseGeoLocation(event.location)

    let distanceText: string | null = null
    if (showDistance && userLocation && parsedLocation && event.distance !== undefined) {
      distanceText = formatDistance(event.distance)
    } else if (showDistance && userLocation && parsedLocation) {
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parsedLocation.lat,
        parsedLocation.lng
      )
      distanceText = formatDistance(dist)
    }

    return (
      <div
        role="option"
        tabIndex={0}
        aria-selected={isSelected}
        aria-label={`${event.title}, ${event.emergency_types?.name ?? 'Emergency'}, severity ${severity.label}, status ${event.status}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex flex-col gap-2 p-4 border-b border-border cursor-pointer',
          'transition-colors duration-150',
          'hover:bg-accent/50 focus:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
          isSelected && 'bg-accent',
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn('px-2 py-0.5 text-xs font-medium rounded', severity.bg, 'text-white')}
              >
                {severity.label}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded capitalize',
                  getStatusColor(event.status)
                )}
              >
                {event.status}
              </span>
              {distanceText && (
                <span className="text-xs text-muted-foreground">{distanceText}</span>
              )}
            </div>
            <h3 className="font-medium text-foreground truncate">{event.title}</h3>
          </div>
          {event.emergency_types && (
            <span className="text-sm text-muted-foreground shrink-0">
              {event.emergency_types.name}
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{formatRelativeTime(event.created_at)}</span>
            <span className="flex items-center gap-1">
              <span className="text-green-600">✓{event.confirmation_count}</span>
              <span className="text-red-600">✗{event.dispute_count}</span>
            </span>
          </div>

          {(onConfirm || onDispute) && (
            <div className="flex items-center gap-2">
              {onConfirm && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                >
                  Confirm
                </button>
              )}
              {onDispute && (
                <button
                  type="button"
                  onClick={handleDispute}
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                >
                  Dispute
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.event.id === nextProps.event.id
      && prevProps.event.updated_at === nextProps.event.updated_at
      && prevProps.isSelected === nextProps.isSelected
      && prevProps.showDistance === nextProps.showDistance
      && prevProps.userLocation?.lat === nextProps.userLocation?.lat
      && prevProps.userLocation?.lng === nextProps.userLocation?.lng
    )
  }
)

EmergencyListItem.displayName = 'EmergencyListItem'

export { EmergencyListItem }
