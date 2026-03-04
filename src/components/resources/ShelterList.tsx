import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Grid,
  List,
  Filter,
  Home,
  AlertTriangle,
  Map,
  Dog,
  Accessibility
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EnhancedInput } from '@/components/ui/forms/EnhancedInput'
import { ShelterCard } from './ShelterCard'
import { cn } from '@/lib/utils'
import type {
  Shelter,
  ShelterFilter,
  ShelterType,
  ShelterStatus,
  ShelterStatistics
} from '@/types/resource'

interface ShelterListProps {
  shelters: Shelter[]
  filters?: ShelterFilter
  onCheckIn?: (shelter: Shelter) => void
  className?: string
  loading?: boolean
}

const shelterTypes: ShelterType[] = ['emergency', 'temporary', 'transitional', 'long_term']
const shelterStatuses: ShelterStatus[] = ['open', 'full', 'closed', 'evacuating']

const ShelterList = React.forwardRef<HTMLDivElement, ShelterListProps>(
  ({ shelters, filters: initialFilters, onCheckIn, className, loading = false }, ref) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
    const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '')
    const [selectedTypes, setSelectedTypes] = useState<ShelterType[]>(initialFilters?.type || [])
    const [selectedStatuses, setSelectedStatuses] = useState<ShelterStatus[]>(
      initialFilters?.status || []
    )
    const [showOnlyOpen, setShowOnlyOpen] = useState(false)
    const [accessibilityFilter, setAccessibilityFilter] = useState(false)
    const [petsAllowedFilter, setPetsAllowedFilter] = useState(initialFilters?.petsAllowed || false)

    const filteredShelters = useMemo(() => {
      let filtered = shelters

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          s => s.name.toLowerCase().includes(query) || s.address.toLowerCase().includes(query)
        )
      }

      if (selectedTypes.length > 0) {
        filtered = filtered.filter(s => selectedTypes.includes(s.type))
      }

      if (selectedStatuses.length > 0) {
        filtered = filtered.filter(s => selectedStatuses.includes(s.status))
      }

      if (showOnlyOpen) {
        filtered = filtered.filter(s => s.status === 'open')
      }

      if (accessibilityFilter) {
        filtered = filtered.filter(s => s.accessibility.wheelchairAccessible)
      }

      if (petsAllowedFilter) {
        filtered = filtered.filter(s => s.petsAllowed)
      }

      if (initialFilters?.hasCapacity) {
        filtered = filtered.filter(s => s.availableBeds > 0)
      }

      if (initialFilters?.center && shelters[0]?.distance !== undefined) {
        filtered = [...filtered].sort((a, b) => (a.distance || 0) - (b.distance || 0))
      }

      return filtered
    }, [
      shelters,
      searchQuery,
      selectedTypes,
      selectedStatuses,
      showOnlyOpen,
      accessibilityFilter,
      petsAllowedFilter,
      initialFilters
    ])

    const stats: ShelterStatistics = useMemo(() => {
      const open = shelters.filter(s => s.status === 'open').length
      const full = shelters.filter(s => s.status === 'full').length
      const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0)
      const totalOccupancy = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0)

      const byType = shelterTypes.reduce(
        (acc, type) => {
          acc[type] = shelters.filter(s => s.type === type).length
          return acc
        },
        {} as Record<ShelterType, number>
      )

      return {
        totalShelters: shelters.length,
        openShelters: open,
        fullShelters: full,
        closedShelters: shelters.filter(s => s.status === 'closed').length,
        totalCapacity,
        totalOccupancy,
        overallAvailability: totalCapacity - totalOccupancy,
        sheltersByType: byType
      }
    }, [shelters])

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
      setShowOnlyOpen(false)
      setAccessibilityFilter(false)
      setPetsAllowedFilter(false)
    }

    const hasActiveFilters =
      searchQuery ||
      selectedTypes.length > 0 ||
      selectedStatuses.length > 0 ||
      showOnlyOpen ||
      accessibilityFilter ||
      petsAllowedFilter

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Shelters
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
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                >
                  <Map className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-green-600 font-semibold">{stats.openShelters}</p>
                <p className="text-green-700 dark:text-green-400 text-xs">Open</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-yellow-600 font-semibold">{stats.fullShelters}</p>
                <p className="text-yellow-700 dark:text-yellow-400 text-xs">Full</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-blue-600 font-semibold">{stats.totalCapacity}</p>
                <p className="text-blue-700 dark:text-blue-400 text-xs">Total Capacity</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-purple-600 font-semibold">{stats.overallAvailability}</p>
                <p className="text-purple-700 dark:text-purple-400 text-xs">Available Beds</p>
              </div>
            </div>

            <div className="space-y-3">
              <EnhancedInput
                type="text"
                placeholder="Search shelters by name or location..."
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

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={showOnlyOpen ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                  >
                    Open Only
                  </Badge>
                  <Badge
                    variant={accessibilityFilter ? 'default' : 'outline'}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setAccessibilityFilter(!accessibilityFilter)}
                  >
                    <Accessibility className="w-3 h-3" />
                    Accessible
                  </Badge>
                  <Badge
                    variant={petsAllowedFilter ? 'default' : 'outline'}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setPetsAllowedFilter(!petsAllowedFilter)}
                  >
                    <Dog className="w-3 h-3" />
                    Pets OK
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {shelterTypes.map(type => (
                      <Badge
                        key={type}
                        variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleFilter(type, selectedTypes, setSelectedTypes)}
                      >
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {shelterStatuses.map(status => (
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
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'map' ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Map view coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                {filteredShelters.length} shelters in view
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Home className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Loading shelters...</p>
          </div>
        ) : filteredShelters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No shelters found</p>
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
              {filteredShelters.map(shelter => (
                <motion.div
                  key={shelter.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ShelterCard
                    shelter={shelter}
                    onCheckIn={onCheckIn}
                    className={viewMode === 'list' ? 'max-w-none' : ''}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {viewMode !== 'map' && filteredShelters.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredShelters.length} of {shelters.length} shelters
          </div>
        )}
      </div>
    )
  }
)

ShelterList.displayName = 'ShelterList'

export { ShelterList }
