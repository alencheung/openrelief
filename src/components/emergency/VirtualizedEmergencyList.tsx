import React, { useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { EmergencyListItem } from './EmergencyListItem'
import type { EmergencyEvent } from '@/store/emergencyStore'

export interface VirtualizedEmergencyListProps {
  events: EmergencyEvent[]
  onEventClick?: (event: EmergencyEvent) => void
  onConfirm?: (eventId: string) => void
  onDispute?: (eventId: string) => void
  selectedEventId?: string
  showDistance?: boolean
  userLocation?: { lat: number; lng: number } | null
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
  emptyMessage?: string
  estimatedItemSize?: number
  overscan?: number
  scrollRef?: React.RefObject<HTMLDivElement>
}

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-2 p-4 border-b border-border animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-16 bg-muted rounded" />
      <div className="h-5 w-20 bg-muted rounded" />
    </div>
    <div className="h-5 w-3/4 bg-muted rounded" />
    <div className="h-4 w-full bg-muted rounded" />
    <div className="h-4 w-2/3 bg-muted rounded" />
    <div className="flex justify-between mt-2">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-muted rounded" />
        <div className="h-6 w-16 bg-muted rounded" />
      </div>
    </div>
  </div>
)

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="text-4xl mb-4">📭</div>
    <p className="text-muted-foreground text-lg font-medium">{message}</p>
  </div>
)

const LoadingMoreIndicator = () => (
  <div className="flex justify-center py-4">
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Loading more...</span>
    </div>
  </div>
)

const VirtualizedEmergencyList = React.forwardRef<HTMLDivElement, VirtualizedEmergencyListProps>(
  (
    {
      events,
      onEventClick,
      onConfirm,
      onDispute,
      selectedEventId,
      showDistance = true,
      userLocation,
      loading = false,
      hasMore = false,
      onLoadMore,
      className,
      emptyMessage = 'No emergency events found',
      estimatedItemSize = 80,
      overscan = 5,
      scrollRef: externalScrollRef
    },
    ref
  ) => {
    const internalScrollRef = useRef<HTMLDivElement>(null)
    const parentRef = externalScrollRef ?? internalScrollRef

    const rowVirtualizer = useVirtualizer({
      count: hasMore ? events.length + 1 : events.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => estimatedItemSize,
      overscan
    })

    const virtualItems = rowVirtualizer.getVirtualItems()

    const handleLoadMore = useCallback(() => {
      if (onLoadMore && hasMore && !loading) {
        onLoadMore()
      }
    }, [onLoadMore, hasMore, loading])

    useEffect(() => {
      const [lastItem] = [...virtualItems].reverse()

      if (!lastItem) {
        return
      }

      if (lastItem.index >= events.length - 1 && hasMore && !loading) {
        handleLoadMore()
      }
    }, [virtualItems, events.length, hasMore, loading, handleLoadMore])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const currentIndex = events.findIndex(event => event.id === selectedEventId)
          let newIndex: number

          if (e.key === 'ArrowDown') {
            newIndex = currentIndex < events.length - 1 ? currentIndex + 1 : 0
          } else {
            newIndex = currentIndex > 0 ? currentIndex - 1 : events.length - 1
          }

          const newEvent = events[newIndex]
          if (newEvent) {
            onEventClick?.(newEvent)
            rowVirtualizer.scrollToIndex(newIndex, { align: 'auto' })
          }
        }
      },
      [events, selectedEventId, onEventClick, rowVirtualizer]
    )

    if (loading && events.length === 0) {
      return (
        <div className={cn('flex flex-col', className)} ref={ref}>
          {Array.from({ length: 10 }).map((_, i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      )
    }

    if (!loading && events.length === 0) {
      return (
        <div className={className} ref={ref}>
          <EmptyState message={emptyMessage} />
        </div>
      )
    }

    return (
      <div
        ref={parentRef}
        className={cn('overflow-auto', className)}
        style={{ contain: 'strict' }}
        role="listbox"
        aria-label="Emergency events list"
        aria-busy={loading}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualItems.map(virtualItem => {
            const isLoaderRow = virtualItem.index > events.length - 1
            const event = events[virtualItem.index]

            if (isLoaderRow) {
              return hasMore ? (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  <LoadingMoreIndicator />
                </div>
              ) : null
            }

            if (!event) {
              return null
            }

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <EmergencyListItem
                  event={event}
                  onClick={onEventClick}
                  onConfirm={onConfirm}
                  onDispute={onDispute}
                  isSelected={event.id === selectedEventId}
                  showDistance={showDistance}
                  userLocation={userLocation}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

VirtualizedEmergencyList.displayName = 'VirtualizedEmergencyList'

export { VirtualizedEmergencyList }
