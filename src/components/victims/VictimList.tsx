'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Users, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { VictimStatusCard } from './VictimStatusCard'
import { cn } from '@/lib/utils'
import type { Victim, VictimFilter, VictimStatus, VictimPriority } from '@/types/victim'

interface VictimListProps {
  victims: Victim[]
  filters?: VictimFilter
  onSelectVictim?: (victim: Victim) => void
  onCheckInVictim?: (victim: Victim) => void
  isLoading?: boolean
  className?: string
}

const statusOptions: Array<{ value: VictimStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'safe', label: 'Safe' },
  { value: 'injured', label: 'Injured' },
  { value: 'trapped', label: 'Trapped' },
  { value: 'missing', label: 'Missing' },
  { value: 'deceased', label: 'Deceased' }
]

const priorityOptions: Array<{ value: VictimPriority | 'all'; label: string }> = [
  { value: 'all', label: 'All Priority' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

export const VictimList = React.forwardRef<HTMLDivElement, VictimListProps>(
  ({ victims, onSelectVictim, onCheckInVictim, isLoading = false, className }, ref) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<VictimStatus | 'all'>('all')
    const [priorityFilter, setPriorityFilter] = useState<VictimPriority | 'all'>('all')

    const filteredVictims = useMemo(() => {
      return victims.filter(victim => {
        const matchesSearch = searchQuery
          ? victim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            victim.notes?.toLowerCase().includes(searchQuery.toLowerCase())
          : true

        const matchesStatus = statusFilter === 'all' || victim.status === statusFilter

        const matchesPriority = priorityFilter === 'all' || victim.priority === priorityFilter

        return matchesSearch && matchesStatus && matchesPriority
      })
    }, [victims, searchQuery, statusFilter, priorityFilter])

    const stats = useMemo(() => {
      return {
        total: victims.length,
        safe: victims.filter(v => v.status === 'safe').length,
        injured: victims.filter(v => v.status === 'injured').length,
        trapped: victims.filter(v => v.status === 'trapped').length,
        missing: victims.filter(v => v.status === 'missing').length,
        critical: victims.filter(v => v.priority === 'critical').length
      }
    }, [victims])

    if (isLoading) {
      return (
        <div ref={ref} className={cn('flex items-center justify-center p-12', className)}>
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Victim Tracking
              </CardTitle>
              <StatusIndicator
                status="active"
                label={`${filteredVictims.length} victims`}
                size="sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.safe}</div>
                <p className="text-xs text-muted-foreground">Safe</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.injured}</div>
                <p className="text-xs text-muted-foreground">Injured</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.trapped}</div>
                <p className="text-xs text-muted-foreground">Trapped</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
                <p className="text-xs text-muted-foreground">Missing</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-800">{stats.critical}</div>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search victims..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Search victims"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as VictimStatus | 'all')}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Filter by status"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as VictimPriority | 'all')}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Filter by priority"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                <>
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {filteredVictims.length} of {victims.length} victims
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setPriorityFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredVictims.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Victims Found</h3>
            <p className="text-muted-foreground">
              {victims.length === 0
                ? 'No victims have been registered yet.'
                : 'No victims match your current filters.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredVictims.map((victim, index) => (
                <motion.div
                  key={victim.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <VictimStatusCard
                    victim={victim}
                    onSelect={onSelectVictim}
                    onCheckIn={onCheckInVictim}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }
)

VictimList.displayName = 'VictimList'
