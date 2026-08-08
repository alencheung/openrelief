'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VirtualizedEmergencyList } from '@/components/emergency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, Filter } from 'lucide-react'
import { useEmergencyEvents, useConfirmEvent } from '@/hooks/useEmergencyEvents'
import { useAuth } from '@/store/authStore'
import { useCurrentLocation } from '@/store/locationStore'
import { cn } from '@/lib/utils'
import type { EmergencyEvent } from '@/store/emergencyStore'

// Status values valid per the DB enum emergency_events_status.
type StatusFilter = 'all' | 'pending' | 'active' | 'resolved' | 'expired'

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'expired', label: 'Expired' }
]

export default function EmergenciesListClient() {
  const router = useRouter()
  const { user } = useAuth()
  const currentLocation = useCurrentLocation()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Only pass status when not 'all' so the query stays uncached-broad.
  const filters = useMemo(
    () => (statusFilter === 'all' ? { limit: 200 } : { status: statusFilter, limit: 200 }),
    [statusFilter]
  )
  const { data, isLoading, isError, error, refetch, isFetching } = useEmergencyEvents(filters)
  const confirmEvent = useConfirmEvent()

  const events: EmergencyEvent[] = useMemo(() => data ?? [], [data])

  const userLocation = currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null

  const handleConfirm = (eventId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    confirmEvent.mutate({
      eventId,
      userId: user.id,
      confirmationType: 'confirm',
      location: userLocation ?? undefined
    })
  }

  const handleDispute = (eventId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    confirmEvent.mutate({
      eventId,
      userId: user.id,
      confirmationType: 'dispute',
      location: userLocation ?? undefined
    })
  }

  const handleEventClick = (event: EmergencyEvent) => {
    setSelectedEventId(event.id)
    router.push(`/emergencies/${event.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Emergencies
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse reported emergencies. Confirm reports you can verify, or dispute inaccurate ones.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
          aria-label="Refresh emergencies"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
            <Filter className="h-4 w-4" />
            Filter by status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  statusFilter === opt.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-red-600 font-medium">Failed to load emergencies.</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : 'Please try again.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <VirtualizedEmergencyList
            events={events}
            onEventClick={handleEventClick}
            onConfirm={handleConfirm}
            onDispute={handleDispute}
            selectedEventId={selectedEventId}
            userLocation={userLocation}
            loading={isLoading}
            scrollRef={scrollRef}
            emptyMessage={
              statusFilter === 'all'
                ? 'No emergency events have been reported yet.'
                : `No ${statusFilter} emergencies found.`
            }
            className="max-h-[70vh]"
          />
        </Card>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Tap an event for details and consensus status.
      </p>
    </div>
  )
}
