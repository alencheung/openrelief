'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Package, Home, Info, AlertCircle, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ResourceList,
  ShelterList,
  ResourceRequestForm,
  ShelterCheckInForm
} from '@/components/resources'
import { useResources, useResourceActions } from '@/store/resourceStore'
import { useShelters } from '@/store/shelterStore'
import type { Resource, Shelter } from '@/types/resource'
import { cn } from '@/lib/utils'

type Tab = 'resources' | 'shelters'

export default function ResourcesPage() {
  const [tab, setTab] = useState<Tab>('resources')
  const { resources, loading: resourcesLoading } = useResources()
  const { shelters, loading: sheltersLoading } = useShelters()
  const { loadResources } = useResourceActions()

  // Modal hosts for the request/check-in forms (F-011.3, F-011.7). The forms
  // were previously unmounted; they now POST to /api/resources directly.
  const [requestTarget, setRequestTarget] = useState<Resource | 'new' | null>(null)
  const [checkInTarget, setCheckInTarget] = useState<Shelter | null>(null)

  // Pull resources from the API on mount so the list reflects persisted data
  // rather than only client-side additions. Safe to fire once; the action
  // guards its own loading/error state.
  useEffect(() => {
    loadResources()
  }, [loadResources])

  // F-011 reachability: components and stores are wired to GET /api/resources.
  // When the backing table is absent the route returns an empty list, so these
  // lists show their genuine empty states (no fabricated data).
  const resourcesEmpty = resources.length === 0
  const sheltersEmpty = shelters.length === 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-red-600" />
          Resources &amp; Shelters
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Find available resources and shelters near you during an emergency.
        </p>
      </div>

      {(resourcesEmpty || sheltersEmpty) && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Backend not yet connected</p>
              <p className="mt-1">
                Resource and shelter listings require database tables that may not be applied yet.
                The filters and cards below are fully functional, and you can submit a request or
                check-in even when no listings are shown. See FEATURES.md F-011 for details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('resources')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'resources'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Package className="h-4 w-4" />
          Resources
        </button>
        <button
          onClick={() => setTab('shelters')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'shelters'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Home className="h-4 w-4" />
          Shelters
        </button>
      </div>

      {tab === 'resources' ? (
        <>
          <div className="flex justify-end mb-3">
            <Button onClick={() => setRequestTarget('new')} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Request a Resource
            </Button>
          </div>
          {resourcesEmpty ? (
            <EmptyState
              icon={Package}
              title="No resources listed yet"
              message="Once resource providers publish availability, supplies will appear here."
            />
          ) : (
            <ResourceList
              resources={resources}
              loading={resourcesLoading}
              onRequestResource={resource => setRequestTarget(resource)}
            />
          )}
        </>
      ) : sheltersEmpty ? (
        <EmptyState
          icon={Home}
          title="No shelters open yet"
          message="When shelters are activated during an emergency, they will be listed here."
        />
      ) : (
        <ShelterList
          shelters={shelters}
          loading={sheltersLoading}
          onCheckIn={shelter => setCheckInTarget(shelter)}
        />
      )}

      <AnimatePresence>
        {requestTarget && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
            onClick={() => setRequestTarget(null)}
          >
            <div
              className="min-h-screen flex items-start justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-2xl mt-8">
                <ResourceRequestForm
                  resourceId={requestTarget === 'new' ? undefined : requestTarget.id}
                  onCancel={() => setRequestTarget(null)}
                />
              </div>
            </div>
          </div>
        )}

        {checkInTarget && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
            onClick={() => setCheckInTarget(null)}
          >
            <div
              className="min-h-screen flex items-start justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-2xl mt-8">
                <ShelterCheckInForm
                  shelterId={checkInTarget.id}
                  shelterName={checkInTarget.name}
                  petsAllowed={checkInTarget.petsAllowed}
                  onCancel={() => setCheckInTarget(null)}
                  onCheckIn={() => setCheckInTarget(null)}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  message
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  message: string
}) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {message}
        </p>
      </CardContent>
    </Card>
  )
}
