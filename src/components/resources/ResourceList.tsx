import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Grid, List, Filter, Package, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EnhancedInput } from '@/components/ui/forms/EnhancedInput'
import { EnhancedSelect } from '@/components/ui/forms/EnhancedSelect'
import { ResourceCard } from './ResourceCard'
import { cn } from '@/lib/utils'
import type {
  Resource,
  ResourceFilter,
  ResourceType,
  ResourceStatus,
  ResourceUrgency,
  ResourceStatistics
} from '@/types/resource'

interface ResourceListProps {
  resources: Resource[]
  filters?: ResourceFilter
  onRequestResource?: (resource: Resource) => void
  className?: string
  loading?: boolean
}

const resourceTypes: ResourceType[] = [
  'water',
  'food',
  'medical',
  'shelter',
  'clothing',
  'tools',
  'communication',
  'power',
  'transportation'
]
const resourceStatuses: ResourceStatus[] = ['available', 'limited', 'depleted', 'incoming']
const resourceUrgencies: ResourceUrgency[] = ['low', 'medium', 'high', 'critical']

const ResourceList = React.forwardRef<HTMLDivElement, ResourceListProps>(
  ({ resources, filters: initialFilters, onRequestResource, className, loading = false }, ref) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '')
    const [selectedTypes, setSelectedTypes] = useState<ResourceType[]>(initialFilters?.type || [])
    const [selectedStatuses, setSelectedStatuses] = useState<ResourceStatus[]>(
      initialFilters?.status || []
    )
    const [selectedUrgencies, setSelectedUrgencies] = useState<ResourceUrgency[]>(
      initialFilters?.urgency || []
    )

    const filteredResources = useMemo(() => {
      let filtered = resources

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          r =>
            r.name.toLowerCase().includes(query) ||
            r.description.toLowerCase().includes(query) ||
            r.type.toLowerCase().includes(query)
        )
      }

      if (selectedTypes.length > 0) {
        filtered = filtered.filter(r => selectedTypes.includes(r.type))
      }

      if (selectedStatuses.length > 0) {
        filtered = filtered.filter(r => selectedStatuses.includes(r.status))
      }

      if (selectedUrgencies.length > 0) {
        filtered = filtered.filter(r => selectedUrgencies.includes(r.urgency))
      }

      if (initialFilters?.center && resources[0]?.distance !== undefined) {
        filtered = [...filtered].sort((a, b) => (a.distance || 0) - (b.distance || 0))
      }

      return filtered
    }, [resources, searchQuery, selectedTypes, selectedStatuses, selectedUrgencies, initialFilters])

    const stats: ResourceStatistics = useMemo(() => {
      const available = resources.filter(r => r.status === 'available').length
      const limited = resources.filter(r => r.status === 'limited').length
      const depleted = resources.filter(r => r.status === 'depleted').length
      const critical = resources.filter(r => r.urgency === 'critical').length

      const byType = resourceTypes.reduce(
        (acc, type) => {
          acc[type] = resources.filter(r => r.type === type).length
          return acc
        },
        {} as Record<ResourceType, number>
      )

      return {
        totalResources: resources.length,
        availableResources: available,
        limitedResources: limited,
        depletedResources: depleted,
        incomingResources: resources.filter(r => r.status === 'incoming').length,
        criticalNeeds: critical,
        highUrgencyNeeds: resources.filter(r => r.urgency === 'high').length,
        resourcesByType: byType
      }
    }, [resources])

    const toggleFilter = <T extends string>(value: T, list: T[], setList: (arr: T[]) => void) => {
      if (list.includes(value)) {
        setList(list.filter(item => item !== value))
      } else {
        setList([...list, value])
      }
    }

    const clearFilters = () => {
      setSearchQuery('')
      setSelectedTypes([])
      setSelectedStatuses([])
      setSelectedUrgencies([])
    }

    const hasActiveFilters =
      searchQuery ||
      selectedTypes.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedUrgencies.length > 0

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Resources
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-green-600 font-semibold">{stats.availableResources}</p>
                <p className="text-green-700 dark:text-green-400 text-xs">Available</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-yellow-600 font-semibold">{stats.limitedResources}</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-xs">Limited</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-red-600 font-semibold">{stats.depletedResources}</p>
                <p className="text-red-700 dark:text-red-400 text-xs">Depleted</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-orange-600 font-semibold">{stats.criticalNeeds}</p>
                <p className="text-orange-700 dark:text-orange-400 text-xs">Critical Needs</p>
              </div>
            </div>

            <div className="space-y-3">
              <EnhancedInput
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {resourceTypes.map(type => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {resourceStatuses.map(status => (
                      <Badge
                        key={status}
                        variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleFilter(status, selectedStatuses, setSelectedStatuses)}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  <div className="flex flex-wrap gap-2">
                    {resourceUrgencies.map(urgency => (
                      <Badge
                        key={urgency}
                        variant={selectedUrgencies.includes(urgency) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() =>
                          toggleFilter(urgency, selectedUrgencies, setSelectedUrgencies)
                        }
                      >
                        {urgency}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Loading resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No resources found</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredResources.map(resource => (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResourceCard
                    resource={resource}
                    onRequest={onRequestResource}
                    className={viewMode === 'list' ? 'max-w-none' : ''}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredResources.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredResources.length} of {resources.length} resources
          </div>
        )}
      </div>
    )
  }
)

ResourceList.displayName = 'ResourceList'

export { ResourceList }
