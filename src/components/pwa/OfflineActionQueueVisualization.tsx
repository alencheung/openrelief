'use client'

import { useState, useEffect } from 'react'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WifiOffIcon,
  WifiIcon,
  DatabaseIcon,
  FileTextIcon,
  MapPinIcon,
  AlertCircleIcon,
  Loader2Icon
} from 'lucide-react'

interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'confirm' | 'dispute'
  table: string
  data: any
  timestamp: number
  synced: boolean
  retryCount: number
  maxRetries: number
  error?: string
  lastAttempt?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies?: string[]
}

interface ActionGroup {
  type: string
  actions: OfflineAction[]
  icon: React.ComponentType<{ className?: string }>
  color: string
  label: string
}

export function OfflineActionQueueVisualization() {
  const {
    pendingActions,
    failedActions,
    isSyncing,
    syncProgress,
    actions,
    startSync,
    stopSync,
    forceSync,
    retryAction,
    removeAction,
    clearSyncedActions
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [expanded, setExpanded] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed'>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'timestamp' | 'type'>('priority')

  // Group actions by type
  const groupActionsByType = (actions: OfflineAction[]): ActionGroup[] => {
    const groups: Record<string, ActionGroup> = {}

    actions.forEach(action => {
      const key = action.table
      if (!groups[key]) {
        let icon = FileTextIcon
        let color = 'text-gray-600'
        let label = action.table

        switch (action.table) {
          case 'emergency_reports':
            icon = AlertTriangleIcon
            color = 'text-red-600'
            label = 'Emergency Reports'
            break
          case 'locations':
            icon = MapPinIcon
            color = 'text-blue-600'
            label = 'Locations'
            break
          case 'users':
            icon = FileTextIcon
            color = 'text-green-600'
            label = 'User Data'
            break
          default:
            icon = DatabaseIcon
            color = 'text-gray-600'
            label = action.table.charAt(0).toUpperCase() + action.table.slice(1)
        }

        groups[key] = {
          type: key,
          actions: [],
          icon,
          color,
          label
        }
      }
      groups[key].actions.push(action)
    })

    return Object.values(groups)
  }

  // Sort actions
  const sortActions = (actions: OfflineAction[]) => {
    const sorted = [...actions]
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return sorted.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      case 'timestamp':
        return sorted.sort((a, b) => b.timestamp - a.timestamp)
      case 'type':
        return sorted.sort((a, b) => a.table.localeCompare(b.table))
      default:
        return sorted
    }
  }

  // Get filtered actions
  const getFilteredActions = () => {
    let filtered = actions.filter(action => !action.synced)
    
    if (filter === 'pending') {
      filtered = filtered.filter(action => action.retryCount === 0)
    } else if (filter === 'failed') {
      filtered = filtered.filter(action => action.retryCount > 0)
    }

    return sortActions(filtered)
  }

  // Get priority color
  const getPriorityColor = (priority: OfflineAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Handle sync operations
  const handleStartSync = async () => {
    announcePolite('Starting synchronization of offline actions')
    await startSync()
  }

  const handleRetryAction = async (actionId: string) => {
    announcePolite('Retrying failed action')
    retryAction(actionId)
  }

  const handleRemoveAction = async (actionId: string) => {
    announcePolite('Removing action from queue')
    removeAction(actionId)
    setSelectedAction(null)
  }

  const handleClearSynced = async () => {
    announcePolite('Clearing synced actions')
    clearSyncedActions()
  }

  // Calculate sync progress percentage
  const syncProgressPercentage = syncProgress.total > 0 
    ? (syncProgress.current / syncProgress.total) * 100 
    : 0

  const filteredActions = getFilteredActions()
  const actionGroups = groupActionsByType(filteredActions)
  const hasPending = pendingActions.length > 0
  const hasFailed = failedActions.length > 0

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Queue Status Button */}
      <Button
        onClick={() => setExpanded(!expanded)}
        className={`
          relative flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${hasPending || hasFailed 
            ? 'bg-orange-600 text-white hover:bg-orange-700' 
            : 'bg-white/90 border border-gray-200 text-gray-900 hover:bg-gray-50'
          }
        `}
        aria-label={`${filteredActions.length} offline actions pending. ${expanded ? 'Hide' : 'Show'} details`}
      >
        {/* Status Icon */}
        <div className="relative">
          {isSyncing ? (
            <Loader2Icon className="w-5 h-5 animate-spin" />
          ) : hasPending || hasFailed ? (
            <WifiOffIcon className="w-5 h-5" />
          ) : (
            <WifiIcon className="w-5 h-5" />
          )}
          
          {/* Notification Badge */}
          {(hasPending || hasFailed) && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {filteredActions.length}
            </span>
          )}
        </div>

        {/* Status Text */}
        <div className="text-left">
          <div className="font-medium">
            {isSyncing ? 'Syncing...' : hasFailed ? 'Sync Issues' : hasPending ? 'Offline Actions' : 'All Synced'}
          </div>
          <div className="text-xs opacity-75">
            {filteredActions.length} items pending
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {expanded ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronUpIcon className="w-4 h-4" />
        )}
      </Button>

      {/* Expanded Queue Details */}
      {expanded && (
        <Card className={`
          absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-hidden
          ${prefersReducedMotion ? '' : 'animate-slide-in-up'}
        `}>
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Offline Actions</h3>
              <div className="flex items-center gap-2">
                {isSyncing && (
                  <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />
                )}
                <StatusIndicator
                  status={isSyncing ? 'pending' : hasFailed ? 'critical' : hasPending ? 'pending' : 'active'}
                  size="sm"
                  label={isSyncing ? 'Syncing' : hasFailed ? 'Failed' : hasPending ? 'Pending' : 'Ready'}
                />
              </div>
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Sync Progress</span>
                  <span className="text-sm text-blue-700">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgressPercentage}%` }}
                  />
                </div>
                {syncProgress.currentAction && (
                  <p className="text-xs text-blue-600 mt-1">
                    Processing: {syncProgress.currentAction}
                  </p>
                )}
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
              {(['all', 'pending', 'failed'] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className="flex-1"
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  {filterType === 'pending' && ` (${pendingActions.length})`}
                  {filterType === 'failed' && ` (${failedActions.length})`}
                </Button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex gap-2 mb-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="priority">Sort by Priority</option>
                <option value="timestamp">Sort by Time</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>

            {/* Action Groups */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {actionGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <WifiIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No offline actions</p>
                </div>
              ) : (
                actionGroups.map((group) => (
                  <div key={group.type} className="space-y-2">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <group.icon className={`w-4 h-4 ${group.color}`} />
                      <span>{group.label}</span>
                      <span className="text-xs text-gray-500">
                        ({group.actions.length})
                      </span>
                    </div>

                    {/* Actions in Group */}
                    <div className="space-y-1 pl-6">
                      {group.actions.map((action) => (
                        <div
                          key={action.id}
                          className={`
                            flex items-center justify-between p-2 rounded-lg border
                            transition-all duration-200 cursor-pointer
                            ${selectedAction === action.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                            ${getPriorityColor(action.priority)}
                          `}
                          onClick={() => setSelectedAction(
                            selectedAction === action.id ? null : action.id
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <StatusIndicator
                              status={action.retryCount > 0 ? 'critical' : 'pending'}
                              size="sm"
                              animated={action.priority === 'critical'}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(action.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {action.retryCount > 0 && (
                              <span className="text-xs text-red-600 font-medium">
                                {action.retryCount}/{action.maxRetries}
                              </span>
                            )}
                            {action.error && (
                              <AlertCircleIcon className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Action Details */}
            {selectedAction && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Action Details</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAction(null)}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                
                {(() => {
                  const action = actions.find(a => a.id === selectedAction)
                  if (!action) return null

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{action.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Table:</span>
                        <span className="font-medium">{action.table}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className="font-medium">{action.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Retries:</span>
                        <span className="font-medium">{action.retryCount}/{action.maxRetries}</span>
                      </div>
                      {action.error && (
                        <div className="text-red-600 text-xs">
                          Error: {action.error}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        {action.retryCount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleRetryAction(action.id)}
                            className="flex-1"
                          >
                            <RefreshCwIcon className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAction(action.id)}
                          className="flex-1"
                        >
                          <TrashIcon className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {!isSyncing && hasPending && (
                <Button
                  onClick={handleStartSync}
                  className="flex-1"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Start Sync
                </Button>
              )}
              
              {isSyncing && (
                <Button
                  onClick={stopSync}
                  variant="outline"
                  className="flex-1"
                >
                  <PauseIcon className="w-4 h-4 mr-2" />
                  Stop Sync
                </Button>
              )}
              
              {hasFailed && (
                <Button
                  onClick={forceSync}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Force Sync
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isSyncing && `Synchronization in progress: ${syncProgress.current} of ${syncProgress.total} actions completed`}
          {hasPending && `You have ${pendingActions.length} pending actions`}
          {hasFailed && `You have ${failedActions.length} failed actions`}
        </div>
      </ScreenReaderOnly>
    </div>
  )
}