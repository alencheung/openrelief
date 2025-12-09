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
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  Loader2Icon,
  WifiIcon,
  WifiOffIcon,
  RefreshCwIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DatabaseIcon,
  FileTextIcon,
  MapPinIcon,
  AlertCircleIcon
} from 'lucide-react'

interface SyncStage {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  progress: number
  total: number
  error?: string
  icon: React.ComponentType<{ className?: string }>
}

interface SyncNotificationProps {
  onDismiss?: () => void
  showDetails?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoHide?: boolean
  autoHideDelay?: number
}

export function SyncProgressNotification({
  onDismiss,
  showDetails: initialShowDetails = false,
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 5000
}: SyncNotificationProps) {
  const {
    isSyncing,
    syncProgress,
    pendingActions,
    failedActions,
    lastSyncTime,
    metrics
  } = useOfflineStore()

  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [showDetails, setShowDetails] = useState(initialShowDetails)
  const [visible, setVisible] = useState(false)
  const [syncStages, setSyncStages] = useState<SyncStage[]>([])
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null)

  // Define sync stages
  const getSyncStages = (): SyncStage[] => [
    {
      id: 'validation',
      name: 'Validating Actions',
      status: 'pending',
      progress: 0,
      total: 1,
      icon: CheckCircle2Icon
    },
    {
      id: 'emergency-reports',
      name: 'Emergency Reports',
      status: 'pending',
      progress: 0,
      total: pendingActions.filter(a => a.table === 'emergency_reports').length,
      icon: AlertTriangleIcon
    },
    {
      id: 'locations',
      name: 'Location Data',
      status: 'pending',
      progress: 0,
      total: pendingActions.filter(a => a.table === 'locations').length,
      icon: MapPinIcon
    },
    {
      id: 'user-data',
      name: 'User Data',
      status: 'pending',
      progress: 0,
      total: pendingActions.filter(a => a.table === 'users').length,
      icon: FileTextIcon
    },
    {
      id: 'other-data',
      name: 'Other Data',
      status: 'pending',
      progress: 0,
      total: pendingActions.filter(a => !['emergency_reports', 'locations', 'users'].includes(a.table)).length,
      icon: DatabaseIcon
    },
    {
      id: 'completion',
      name: 'Finalizing Sync',
      status: 'pending',
      progress: 0,
      total: 1,
      icon: CheckCircle2Icon
    }
  ]

  // Initialize sync stages
  useEffect(() => {
    setSyncStages(getSyncStages())
  }, [pendingActions])

  // Update sync progress
  useEffect(() => {
    if (isSyncing) {
      setVisible(true)
      setShowDetails(true)

      // Clear any existing auto-hide timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
        setAutoHideTimer(null)
      }

      // Update stages based on current progress
      const stages = [...syncStages]
      const totalProgress = syncProgress.total
      const currentProgress = syncProgress.current
      const progressPercentage = totalProgress > 0 ? (currentProgress / totalProgress) * 100 : 0

      // Determine current stage based on progress
      let stageIndex = 0
      if (progressPercentage >= 90) {
        stageIndex = 5
      } // completion
      else if (progressPercentage >= 75) {
        stageIndex = 4
      } // other-data
      else if (progressPercentage >= 50) {
        stageIndex = 3
      } // user-data
      else if (progressPercentage >= 25) {
        stageIndex = 2
      } // locations
      else if (progressPercentage >= 10) {
        stageIndex = 1
      } // emergency-reports
      else {
        stageIndex = 0
      } // validation

      // Update stage statuses
      stages.forEach((stage, index) => {
        if (index < stageIndex) {
          stage.status = 'completed'
          stage.progress = stage.total
        } else if (index === stageIndex) {
          stage.status = 'in-progress'
          stage.progress = Math.min(stage.total, Math.floor((progressPercentage / 100) * stage.total))
        } else {
          stage.status = 'pending'
          stage.progress = 0
        }
      })

      setSyncStages(stages)
      setCurrentStage(stages[stageIndex].id)

      // Announce progress
      announcePolite(`Sync progress: ${Math.round(progressPercentage)}% - ${stages[stageIndex].name}`)
    } else {
      // Sync completed or failed
      if (syncProgress.current === syncProgress.total && syncProgress.total > 0) {
        // Success
        const stages = syncStages.map(stage => ({
          ...stage,
          status: 'completed' as const,
          progress: stage.total
        }))
        setSyncStages(stages)
        setCurrentStage('completion')

        announcePolite('Synchronization completed successfully')

        // Auto-hide after delay
        if (autoHide) {
          const timer = setTimeout(() => {
            setVisible(false)
            onDismiss?.()
          }, autoHideDelay)
          setAutoHideTimer(timer)
        }
      } else if (failedActions.length > 0) {
        // Some failures
        announceAssertive('Synchronization completed with some errors')
      }
    }
  }, [isSyncing, syncProgress, pendingActions, failedActions, announcePolite, announceAssertive, autoHide, autoHideDelay, onDismiss])

  // Handle dismiss
  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()

    if (autoHideTimer) {
      clearTimeout(autoHideTimer)
      setAutoHideTimer(null)
    }
  }

  // Handle retry
  const handleRetry = () => {
    announcePolite('Retrying synchronization')
    // This would trigger a retry in the store
  }

  // Calculate overall progress
  const overallProgress = syncProgress.total > 0
    ? (syncProgress.current / syncProgress.total) * 100
    : 0

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (!visible || (syncProgress.total === 0 && !isSyncing)) {
    return null
  }

  const hasErrors = failedActions.length > 0
  const isCompleted = !isSyncing && syncProgress.current === syncProgress.total && syncProgress.total > 0

  return (
    <>
      {/* Main Notification */}
      <div className={`fixed z-50 ${getPositionClasses()} ${prefersReducedMotion ? '' : 'animate-slide-in-right'}`}>
        <Card className={`
          w-96 shadow-lg border-2
          ${isCompleted
      ? 'border-green-200 bg-green-50'
      : hasErrors
        ? 'border-red-200 bg-red-50'
        : 'border-blue-200 bg-blue-50'
    }
        `}>
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  ${isCompleted
      ? 'bg-green-100 text-green-600'
      : hasErrors
        ? 'bg-red-100 text-red-600'
        : 'bg-blue-100 text-blue-600'
    }
                `}>
                  {isCompleted ? (
                    <CheckCircle2Icon className="w-5 h-5" />
                  ) : hasErrors ? (
                    <XCircleIcon className="w-5 h-5" />
                  ) : isSyncing ? (
                    <Loader2Icon className="w-5 h-5 animate-spin" />
                  ) : (
                    <AlertTriangleIcon className="w-5 h-5" />
                  )}
                </div>

                {/* Status Text */}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {isCompleted ? 'Sync Completed' : hasErrors ? 'Sync Issues' : 'Syncing Data'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isCompleted
                      ? `${syncProgress.total} actions synchronized`
                      : hasErrors
                        ? `${failedActions.length} actions failed`
                        : `${syncProgress.current} of ${syncProgress.total} actions`
                    }
                  </p>
                </div>
              </div>

              {/* Dismiss Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-8 h-8 p-0"
                aria-label="Dismiss notification"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            {!isCompleted && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(overallProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`
                      h-2 rounded-full transition-all duration-300
                      ${hasErrors ? 'bg-red-500' : 'bg-blue-500'}
                    `}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current Stage */}
            {isSyncing && currentStage && (
              <div className="mb-3 p-2 bg-white rounded-lg">
                <div className="flex items-center gap-2">
                  {(() => {
                    const stage = syncStages.find(s => s.id === currentStage)
                    const IconComponent = stage?.icon || Loader2Icon
                    return <IconComponent className="w-4 h-4 text-blue-600" />
                  })()}
                  <span className="text-sm font-medium text-gray-900">
                    {syncStages.find(s => s.id === currentStage)?.name}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {hasErrors && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Retry Failed
                </Button>
              )}

              {!isCompleted && !hasErrors && (
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {showDetails ? (
                    <>
                      <ChevronUpIcon className="w-4 h-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-4 h-4 mr-2" />
                      Show Details
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Detailed Progress */}
          {showDetails && (
            <div className={`
              border-t border-gray-200 p-4 bg-white
              ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
            `}>
              <h4 className="font-medium text-gray-900 mb-3">Sync Details</h4>

              <div className="space-y-2">
                {syncStages.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    {/* Stage Icon */}
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full
                      ${stage.status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : stage.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-600'
                      : stage.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400'
                  }
                    `}>
                      {stage.status === 'in-progress' ? (
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                      ) : (
                        <stage.icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Stage Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {stage.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {stage.progress > 0 ? `${stage.progress}/${stage.total}` : ''}
                        </span>
                      </div>

                      {/* Stage Progress Bar */}
                      {stage.total > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={`
                              h-1 rounded-full transition-all duration-300
                              ${stage.status === 'failed'
                          ? 'bg-red-500'
                          : stage.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }
                            `}
                            style={{
                              width: stage.total > 0 ? `${(stage.progress / stage.total) * 100}%` : '0%'
                            }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
                      {stage.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {stage.error}
                        </p>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <StatusIndicator
                      status={
                        stage.status === 'completed' ? 'active'
                          : stage.status === 'in-progress' ? 'pending'
                            : stage.status === 'failed' ? 'critical' : 'inactive'
                      }
                      size="sm"
                      animated={stage.status === 'in-progress'}
                    />
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Actions:</span>
                    <p className="font-medium text-gray-900">{syncProgress.total}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <p className="font-medium text-green-600">{syncProgress.current}</p>
                  </div>
                  {lastSyncTime && (
                    <div>
                      <span className="text-gray-600">Last Sync:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(lastSyncTime).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  {metrics.successRate > 0 && (
                    <div>
                      <span className="text-gray-600">Success Rate:</span>
                      <p className="font-medium text-gray-900">
                        {Math.round(metrics.successRate)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isSyncing && `Synchronization in progress: ${Math.round(overallProgress)}% complete`}
          {isCompleted && 'Synchronization completed successfully'}
          {hasErrors && `Synchronization completed with ${failedActions.length} errors`}
        </div>
      </ScreenReaderOnly>
    </>
  )
}