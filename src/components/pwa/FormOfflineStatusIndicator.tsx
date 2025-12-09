'use client'

import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offlineStore'
import { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
import { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { ScreenReaderOnly } from '@/components/accessibility/ScreenReaderOnly'
import {
  WifiOffIcon,
  WifiIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  SaveIcon,
  UploadIcon,
  DatabaseIcon,
  FileTextIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  AlertCircleIcon,
  InfoIcon,
  SettingsIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  ShieldIcon,
  ZapIcon,
  ActivityIcon
} from 'lucide-react'

interface FormField {
  id: string
  name: string
  value: any
  required: boolean
  valid: boolean
  dirty: boolean
  type: 'text' | 'email' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio'
  label: string
  error?: string
}

interface FormStatus {
  id: string
  name: string
  fields: FormField[]
  isValid: boolean
  isDirty: boolean
  isSubmitting: boolean
  isSubmitted: boolean
  submittedAt?: Date
  syncedAt?: Date
  offlineActionId?: string
  retryCount: number
  lastError?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface FormOfflineStatusProps {
  formId: string
  formName: string
  fields: FormField[]
  onSubmit?: (data: any) => Promise<void>
  onFieldChange?: (fieldId: string, value: any) => void
  onValidationChange?: (fieldId: string, isValid: boolean) => void
  showOfflineIndicator?: boolean
  position?: 'top' | 'bottom' | 'inline'
  autoSave?: boolean
  autoSaveDelay?: number
}

export function FormOfflineStatusIndicator({
  formId,
  formName,
  fields,
  onSubmit,
  onFieldChange,
  onValidationChange,
  showOfflineIndicator = true,
  position = 'top',
  autoSave = true,
  autoSaveDelay = 3000
}: FormOfflineStatusProps) {
  const { isOnline, isOffline } = useNetworkStatus()
  const { addAction, pendingActions, isSyncing } = useOfflineStore()
  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { prefersReducedMotion } = useReducedMotion()

  const [formStatus, setFormStatus] = useState<FormStatus>({
    id: formId,
    name: formName,
    fields,
    isValid: false,
    isDirty: false,
    isSubmitting: false,
    isSubmitted: false,
    retryCount: 0,
    priority: 'medium'
  })

  const [expanded, setExpanded] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !formStatus.isDirty || formStatus.isSubmitted) {
      return
    }

    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      handleAutoSave()
    }, autoSaveDelay)

    setAutoSaveTimer(timer)
  }, [formStatus.isDirty, formStatus.isSubmitted, autoSave, autoSaveDelay])

  // Update form validation
  useEffect(() => {
    const isValid = fields.every(field => !field.required || field.valid)
    const isDirty = fields.some(field => field.dirty)

    setFormStatus(prev => ({
      ...prev,
      isValid,
      isDirty,
      fields
    }))
  }, [fields])

  // Handle auto-save
  const handleAutoSave = async () => {
    if (!formStatus.isDirty || formStatus.isSubmitted) {
      return
    }

    setAutoSaveStatus('saving')
    announcePolite('Saving form data offline')

    try {
      // Create form data object
      const formData = fields.reduce((acc, field) => {
        acc[field.id] = field.value
        return acc
      }, {} as Record<string, any>)

      // Add to offline queue
      const actionId = addAction({
        type: 'update',
        table: 'form_drafts',
        data: {
          formId,
          formName,
          formData,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        endpoint: '/api/forms/draft',
        method: 'POST',
        priority: 'medium'
      })

      setFormStatus(prev => ({
        ...prev,
        offlineActionId: actionId
      }))

      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      announcePolite('Form data saved offline')

      // Reset status after delay
      setTimeout(() => {
        setAutoSaveStatus('idle')
      }, 2000)
    } catch (error) {
      setAutoSaveStatus('error')
      announceAssertive('Failed to save form data offline')
      console.error('Auto-save failed:', error)

      setTimeout(() => {
        setAutoSaveStatus('idle')
      }, 3000)
    }
  }

  // Handle form submission
  const handleSubmit = async (data: any) => {
    setFormStatus(prev => ({
      ...prev,
      isSubmitting: true
    }))

    try {
      if (isOnline && onSubmit) {
        // Submit online
        await onSubmit(data)
        setFormStatus(prev => ({
          ...prev,
          isSubmitted: true,
          submittedAt: new Date(),
          syncedAt: new Date()
        }))
        announcePolite('Form submitted successfully')
      } else {
        // Queue for offline submission
        const actionId = addAction({
          type: 'create',
          table: 'form_submissions',
          data: {
            formId,
            formName,
            formData: data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          endpoint: '/api/forms/submit',
          method: 'POST',
          priority: 'high'
        })

        setFormStatus(prev => ({
          ...prev,
          isSubmitted: true,
          submittedAt: new Date(),
          offlineActionId: actionId
        }))

        announcePolite('Form submitted and will sync when online')
      }
    } catch (error) {
      setFormStatus(prev => ({
        ...prev,
        isSubmitting: false,
        lastError: error instanceof Error ? error.message : 'Submission failed',
        retryCount: prev.retryCount + 1
      }))
      announceAssertive('Form submission failed')
    } finally {
      setFormStatus(prev => ({
        ...prev,
        isSubmitting: false
      }))
    }
  }

  // Handle retry
  const handleRetry = async () => {
    if (!formStatus.offlineActionId) {
      return
    }

    setFormStatus(prev => ({
      ...prev,
      isSubmitting: true
    }))

    try {
      // Retry submission
      const formData = fields.reduce((acc, field) => {
        acc[field.id] = field.value
        return acc
      }, {} as Record<string, any>)

      await handleSubmit(formData)
    } catch (error) {
      setFormStatus(prev => ({
        ...prev,
        isSubmitting: false,
        lastError: error instanceof Error ? error.message : 'Retry failed'
      }))
      announceAssertive('Form retry failed')
    }
  }

  // Get status color
  const getStatusColor = () => {
    if (formStatus.isSubmitting) {
      return 'text-blue-600 bg-blue-50 border-blue-200'
    }
    if (formStatus.lastError) {
      return 'text-red-600 bg-red-50 border-red-200'
    }
    if (formStatus.isSubmitted) {
      return 'text-green-600 bg-green-50 border-green-200'
    }
    if (formStatus.isDirty) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Get auto-save color
  const getAutoSaveColor = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return 'text-blue-600'
      case 'saved':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0'
      case 'bottom':
        return 'bottom-0 left-0 right-0'
      case 'inline':
        return 'relative'
      default:
        return 'top-0 left-0 right-0'
    }
  }

  const isFormDirty = formStatus.isDirty
  const isFormSubmitted = formStatus.isSubmitted
  const hasOfflineAction = !!formStatus.offlineActionId
  const isFormValid = formStatus.isValid

  if (!showOfflineIndicator) {
    return null
  }

  return (
    <>
      {/* Form Status Bar */}
      <div className={`
        ${position === 'inline' ? 'relative' : 'fixed z-40'}
        ${getPositionClasses()}
      `}>
        <div className={`
          flex items-center justify-between p-3 border-b
          ${position === 'inline' ? 'bg-gray-50' : 'bg-white'}
          ${getStatusColor()}
          ${prefersReducedMotion ? '' : 'transition-all duration-300'}
        `}>
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className="flex items-center gap-2">
              {formStatus.isSubmitting ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : formStatus.lastError ? (
                <AlertTriangleIcon className="w-4 h-4" />
              ) : formStatus.isSubmitted ? (
                <CheckCircle2Icon className="w-4 h-4" />
              ) : isFormDirty ? (
                <ClockIcon className="w-4 h-4" />
              ) : (
                <FileTextIcon className="w-4 h-4" />
              )}

              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {formStatus.isSubmitting ? 'Submitting...'
                    : formStatus.lastError ? 'Submission Failed'
                      : formStatus.isSubmitted ? 'Submitted'
                        : isFormDirty ? 'Unsaved Changes' : 'Ready'}
                </span>

                {/* Offline Status */}
                {isOffline && (
                  <span className="text-xs opacity-75">
                    {isFormSubmitted ? 'Will sync when online' : 'Working offline'}
                  </span>
                )}
              </div>
            </div>

            {/* Auto-save Status */}
            {autoSave && isFormDirty && !formStatus.isSubmitted && (
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <Loader2Icon className="w-3 h-3 animate-spin" />
                )}
                {autoSaveStatus === 'saved' && (
                  <CheckCircle2Icon className="w-3 h-3" />
                )}
                {autoSaveStatus === 'error' && (
                  <AlertTriangleIcon className="w-3 h-3" />
                )}

                <span className={`text-xs ${getAutoSaveColor()}`}>
                  {autoSaveStatus === 'saving' ? 'Auto-saving...'
                    : autoSaveStatus === 'saved' ? 'Auto-saved'
                      : autoSaveStatus === 'error' ? 'Auto-save failed' : ''}
                </span>

                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    at {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Network Status */}
            <StatusIndicator
              status={isOnline ? 'active' : 'inactive'}
              size="sm"
              label={isOnline ? 'Online' : 'Offline'}
            />

            {/* Expand/Collapse Button */}
            {(isFormDirty || formStatus.lastError || hasOfflineAction) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="w-6 h-6 p-0"
                aria-label={expanded ? 'Hide form details' : 'Show form details'}
              >
                {expanded ? (
                  <ChevronUpIcon className="w-3 h-3" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className={`
            p-4 border-b border-gray-200 bg-white
            ${position === 'inline' ? '' : 'shadow-lg'}
            ${prefersReducedMotion ? '' : 'animate-slide-in-down'}
          `}>
            <div className="space-y-4">
              {/* Form Information */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  {formName}
                </h4>
                <StatusIndicator
                  status={isFormValid ? 'active' : 'inactive'}
                  size="sm"
                  label={isFormValid ? 'Valid' : 'Invalid'}
                />
              </div>

              {/* Field Status */}
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Field Status
                </h5>
                <div className="space-y-1">
                  {fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{field.label}</span>
                      <div className="flex items-center gap-2">
                        {field.required && (
                          <span className="text-xs text-red-600">Required</span>
                        )}
                        {field.dirty && (
                          <span className="text-xs text-blue-600">Modified</span>
                        )}
                        {field.error && (
                          <span className="text-xs text-red-600">Error</span>
                        )}
                        <StatusIndicator
                          status={field.valid ? 'active' : 'inactive'}
                          size="sm"
                          label={field.valid ? 'Valid' : 'Invalid'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submission Status */}
              {formStatus.isSubmitted && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Submission Status
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Submitted:</span>
                      <p className="font-medium">
                        {formStatus.submittedAt ? formStatus.submittedAt.toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Synced:</span>
                      <p className="font-medium">
                        {formStatus.syncedAt ? formStatus.syncedAt.toLocaleString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Information */}
              {formStatus.lastError && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Error Information
                  </h5>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      {formStatus.lastError}
                    </p>
                    <div className="mt-2 text-xs text-red-600">
                      Retry attempts: {formStatus.retryCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Offline Actions */}
              {hasOfflineAction && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Offline Actions
                  </h5>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon className="w-4 h-4 text-yellow-600" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Queued for offline submission</p>
                        <p className="text-xs">
                          Will automatically sync when connection is restored
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {formStatus.lastError && (
                  <Button
                    onClick={handleRetry}
                    disabled={formStatus.isSubmitting}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCwIcon className="w-3 h-3 mr-2" />
                    Retry
                  </Button>
                )}

                {isFormDirty && !formStatus.isSubmitted && (
                  <Button
                    onClick={handleAutoSave}
                    disabled={autoSaveStatus === 'saving'}
                    size="sm"
                    variant="outline"
                  >
                    <SaveIcon className="w-3 h-3 mr-2" />
                    Save Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Reader Announcements */}
      <ScreenReaderOnly>
        <div aria-live="polite" aria-atomic="true">
          {isOffline && 'Form is working in offline mode'}
          {isFormDirty && 'Form has unsaved changes'}
          {autoSaveStatus === 'saving' && 'Auto-saving form data'}
          {autoSaveStatus === 'saved' && 'Form data auto-saved'}
          {autoSaveStatus === 'error' && 'Auto-save failed'}
          {formStatus.isSubmitting && 'Submitting form'}
          {formStatus.isSubmitted && 'Form submitted successfully'}
          {formStatus.lastError && `Form submission failed: ${formStatus.lastError}`}
          {hasOfflineAction && 'Form is queued for offline submission'}
        </div>
      </ScreenReaderOnly>
    </>
  )
}