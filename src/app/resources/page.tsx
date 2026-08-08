'use client'

import { useState, useEffect } from 'react'
import { Package, Home, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { ResourceList, ShelterList } from '@/components/resources'
import { useResources, useResourceActions } from '@/store/resourceStore'
import { useShelters } from '@/store/shelterStore'
import { cn } from '@/lib/utils'

type Tab = 'resources' | 'shelters'

export default function ResourcesPage() {
  const [tab, setTab] = useState<Tab>('resources')
  const { resources, filteredResources, loading: resourcesLoading } = useResources()
  const { shelters, filteredShelters, loading: sheltersLoading } = useShelters()
  const { loadResources } = useResourceActions()

  // Pull resources from the API on mount so the list reflects persisted data
  // rather than only client-side additions. Safe to fire once; the action
  // guards its own loading/error state.
  useEffect(() => {
    loadResources()
  }, [loadResources])

  // NOTE: F-011 reachability wiring. The components and stores exist, and a
  // SQL migration (supabase/migrations/20260717000001_resources_shelters_victims.sql)
  // defines the backing tables, but the stores have no data loader and there
  // are no /api/{resources,shelters} routes yet. Until those are added (and
  // the migration applied + types regenerated), these lists will show their
  // empty states with real (zero-fabricated) data.
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
                Resource and shelter listings require database tables and API routes that are
                still being wired up. The filters and cards below are fully functional, but no
                listings have been published yet. See FEATURES.md F-011 for the remaining work.
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
        resourcesEmpty ? (
          <EmptyState
            icon={Package}
            title="No resources listed yet"
            message="Once resource providers publish availability, supplies will appear here."
          />
        ) : (
          <ResourceList
            resources={filteredResources.length > 0 ? filteredResources : resources}
            loading={resourcesLoading}
          />
        )
      ) : sheltersEmpty ? (
        <EmptyState
          icon={Home}
          title="No shelters open yet"
          message="When shelters are activated during an emergency, they will be listed here."
        />
      ) : (
        <ShelterList
          shelters={filteredShelters.length > 0 ? filteredShelters : shelters}
          loading={sheltersLoading}
        />
      )}
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
