'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, MapPin, Camera, Mic, Send, X, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmergencyStore, useLocationStore, useOfflineStore } from '@/store'
import { EmergencyEvent } from '@/types'
import { Database } from '@/types/database'
import { useFocusManagement, useAriaAnnouncer, useFormValidationAnnouncer } from '@/hooks/accessibility'
import {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardContent,
  FormFeedback,
  EnhancedButton
} from '@/components/ui'
import {
  EnhancedInput,
  EnhancedTextarea,
  EnhancedRadioGroup,
  EnhancedRangeSlider,
  EnhancedFileUpload,
  AudioRecorder,
  ImagePreview,
  EmergencyFormLayout,
  EmergencyFormSection,
  EmergencyFormActions,
  FormProgress,
  FormProgressSummary
} from '@/components/ui/forms'

interface EmergencyReportInterfaceProps {
  isOpen: boolean
  onClose: () => void
  onReportSubmitted: (report: Omit<EmergencyEvent, 'id' | 'created_at' | 'updated_at'>) => void
  initialLocation?: { lat: number; lng: number }
  mapInstance?: any // MapLibre GL map instance
}

interface EmergencyType {
  id: number
  name: string
  description: string
  icon: string
  color: string
  default_radius: number
}

const emergencyTypes: EmergencyType[] = [
  {
    id: 1,
    name: 'Fire',
    description: 'Fire emergency including building fires, wildfires, etc.',
    icon: '🔥',
    color: '#ff4444',
    default_radius: 500
  },
  {
    id: 2,
    name: 'Medical',
    description: 'Medical emergencies requiring immediate attention',
    icon: '🏥',
    color: '#ff1493',
    default_radius: 200
  },
  {
    id: 3,
    name: 'Security',
    description: 'Security threats, criminal activity, public safety',
    icon: '🚨',
    color: '#ffaa00',
    default_radius: 300
  },
  {
    id: 4,
    name: 'Natural',
    description: 'Natural disasters, weather events, earthquakes',
    icon: '🌊',
    color: '#4444ff',
    default_radius: 1000
  },
  {
    id: 5,
    name: 'Infrastructure',
    description: 'Infrastructure failures, utility outages, road closures',
    icon: '🏗️',
    color: '#ff8800',
    default_radius: 400
  }
]

const formSteps = [
  { id: 'type', title: 'Emergency Type', description: 'Select the type of emergency' },
  { id: 'details', title: 'Emergency Details', description: 'Provide details about the emergency' },
  { id: 'location', title: 'Location', description: 'Specify the affected area' },
  { id: 'evidence', title: 'Evidence', description: 'Add photos or audio recordings' },
  { id: 'review', title: 'Review', description: 'Review your report before submitting' }
]

export default function EmergencyReportInterface({
  isOpen,
  onClose,
  onReportSubmitted,
  initialLocation,
  mapInstance
}: EmergencyReportInterfaceProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [location, setLocation] = useState(initialLocation || null)
  const [radius, setRadius] = useState(500)
  const [audioRecording, setAudioRecording] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mapPreview, setMapPreview] = useState(false)
  const [audioPermission, setAudioPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Accessibility hooks
  const { containerRef, getFocusableElements, focusFirstElement } = useFocusManagement({
    trapFocus: true,
    autoFocus: true,
    restoreFocus: true
  })
  const { announcePolite, announceAssertive } = useAriaAnnouncer()
  const { announceValidationErrors, announceFieldError, announceFieldSuccess } = useFormValidationAnnouncer()

  const { currentLocation } = useLocationStore()
  const { addOfflineAction } = useEmergencyStore()
  const { addAction } = useOfflineStore()

  // Initialize with user location if no initial location provided
  useEffect(() => {
    if (!initialLocation && currentLocation) {
      setLocation({
        lat: currentLocation.lat,
        lng: currentLocation.lng
      })
    }
  }, [initialLocation, currentLocation])

  // Update radius when emergency type changes
  useEffect(() => {
    if (selectedType) {
      setRadius(selectedType.default_radius)
    }
  }, [selectedType])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check audio permission on mount
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setAudioPermission(permission.state as 'granted' | 'denied' | 'prompt')

        permission.addEventListener('change', () => {
          setAudioPermission(permission.state as 'granted' | 'denied' | 'prompt')
        })
      } catch (error) {
        // Permissions API not supported, will check on actual access
        setAudioPermission(null)
      }
    }

    checkAudioPermission()
  }, [])

  // Validate current step
  const validateStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {}

    switch (stepIndex) {
      case 0: // Emergency Type
        if (!selectedType) {
          errors.type = 'Please select an emergency type'
          announceFieldError('Emergency type', 'Please select an emergency type')
        } else {
          announceFieldSuccess('Emergency type', 'Emergency type selected')
        }
        break
      case 1: // Emergency Details
        if (!title.trim()) {
          errors.title = 'Title is required'
          announceFieldError('Title', 'Title is required')
        } else if (title.length < 5) {
          errors.title = 'Title must be at least 5 characters'
          announceFieldError('Title', 'Title must be at least 5 characters')
        } else if (title.length > 100) {
          errors.title = 'Title must be less than 100 characters'
          announceFieldError('Title', 'Title must be less than 100 characters')
        } else {
          announceFieldSuccess('Title', 'Title is valid')
        }

        if (!description.trim()) {
          errors.description = 'Description is required'
          announceFieldError('Description', 'Description is required')
        } else if (description.length < 10) {
          errors.description = 'Description must be at least 10 characters'
          announceFieldError('Description', 'Description must be at least 10 characters')
        } else if (description.length > 500) {
          errors.description = 'Description must be less than 500 characters'
          announceFieldError('Description', 'Description must be less than 500 characters')
        } else {
          announceFieldSuccess('Description', 'Description is valid')
        }
        break
      case 2: // Location
        if (!location) {
          errors.location = 'Please select a location on the map'
          announceFieldError('Location', 'Please select a location on the map')
        } else {
          announceFieldSuccess('Location', 'Location selected')
        }
        break
    }

    setFormErrors(errors)
    const isValid = Object.keys(errors).length === 0
    announceValidationErrors(errors)
    return isValid
  }

  // Handle step navigation
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      const nextStep = Math.min(currentStep + 1, formSteps.length - 1)
      setCurrentStep(nextStep)
      announcePolite(`Moved to step ${nextStep + 1}: ${formSteps[nextStep].title}`)
    }
  }

  const handlePrevStep = () => {
    const prevStep = Math.max(currentStep - 1, 0)
    setCurrentStep(prevStep)
    announcePolite(`Moved to step ${prevStep + 1}: ${formSteps[prevStep].title}`)
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < currentStep || validateStep(currentStep)) {
      setCurrentStep(stepIndex)
      announcePolite(`Jumped to step ${stepIndex + 1}: ${formSteps[stepIndex].title}`)
    }
  }

  // Handle type selection
  const handleTypeSelect = (type: EmergencyType) => {
    setSelectedType(type)
    setFormErrors(prev => ({ ...prev, type: '' }))
    announcePolite(`Selected emergency type: ${type.name}`)
  }

  // Handle location selection
  const handleLocationSelect = () => {
    if (!mapInstance) {
      return
    }

    // Enable map interaction mode for location selection
    mapInstance.getCanvas().style.cursor = 'crosshair'
    announcePolite('Click on the map to select emergency location')

    const handleMapClick = (e: any) => {
      const coords = e.lngLat
      setLocation({
        lat: coords.lat,
        lng: coords.lng
      })
      mapInstance.getCanvas().style.cursor = ''
      mapInstance.off('click', handleMapClick)
      setMapPreview(false)
      setFormErrors(prev => ({ ...prev, location: '' }))
      announcePolite(`Location selected: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)
    }

    mapInstance.on('click', handleMapClick)
    setMapPreview(true)
  }

  // Handle file uploads
  const handleImageUpload = (files: File[], previews: any[]) => {
    setImages(prev => [...prev, ...previews].slice(0, 5)) // Limit to 5 images
  }

  const handleImageRemove = (imageId: string, image: any) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handleAudioRecording = (recording: any) => {
    setAudioRecording(recording)
  }

  const handleAudioRemove = () => {
    setAudioRecording(null)
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!selectedType) {
      errors.type = 'Please select an emergency type'
    }

    if (!title.trim()) {
      errors.title = 'Title is required'
    } else if (title.length < 5) {
      errors.title = 'Title must be at least 5 characters'
    } else if (title.length > 100) {
      errors.title = 'Title must be less than 100 characters'
    }

    if (!description.trim()) {
      errors.description = 'Description is required'
    } else if (description.length < 10) {
      errors.description = 'Description must be at least 10 characters'
    } else if (description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    if (!location) {
      errors.location = 'Please select a location on the map'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      announceAssertive('Please fix form errors before submitting')
      return
    }

    setIsSubmitting(true)
    announcePolite('Submitting emergency report...')

    const emergencyReport: Omit<EmergencyEvent, 'id' | 'created_at' | 'updated_at'> = {
      type_id: selectedType!.id,
      reporter_id: 'current-user', // This would come from auth
      title,
      description,
      location: `${location!.lat} ${location!.lng}`,
      radius_meters: radius,
      severity,
      status: 'pending',
      trust_weight: 1.0, // Default trust weight
      confirmation_count: 0,
      dispute_count: 0,
      metadata: {
        images: images.map(img => img.url),
        audio: audioRecording ? audioRecording.url : null,
        reported_at: new Date().toISOString(),
        device_info: navigator.userAgent
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      resolved_at: null,
      resolved_by: null
    }

    try {
      if (isOnline) {
        // Try to submit immediately
        onReportSubmitted(emergencyReport)
      } else {
        // Store offline with proper offline action
        addAction({
          type: 'create',
          table: 'emergency_events',
          data: emergencyReport,
          priority: 'critical',
          maxRetries: 5
        })

        // Also add to emergency store for UI
        addOfflineAction({
          type: 'create',
          data: emergencyReport
        })
      }

      // Reset form
      setSelectedType(null)
      setTitle('')
      setDescription('')
      setSeverity(3)
      setRadius(500)
      setImages([])
      setAudioRecording(null)
      setCurrentStep(0)
      onClose()
    } catch (error) {
      console.error('Failed to submit emergency report:', error)
      setFormErrors(prev => ({
        ...prev,
        submit: 'Failed to submit report. Please try again.'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-report-title"
      aria-describedby="emergency-report-description"
    >
      <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-card">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h2 id="emergency-report-title" className="text-xl font-semibold text-foreground">
              Report Emergency
            </h2>
          </div>
          <EnhancedButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close emergency report"
            title="Close emergency report (Escape)"
          >
            <X className="h-5 w-5" />
          </EnhancedButton>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-muted/30 border-b">
          <FormProgress
            steps={formSteps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            variant="steps"
            showDescriptions={false}
            aria-label="Emergency report form progress"
          />
        </div>

        {/* Connection Status */}
        <div className="px-6 py-2 bg-muted/20 border-b">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isOnline ? 'bg-success' : 'bg-destructive'
              )}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">
              {isOnline ? 'Online - Report will be submitted immediately' : 'Offline - Report will be saved locally'}
            </span>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div id="emergency-report-description" className="sr-only">
            Complete this form to report an emergency. The form has 5 steps: emergency type, details, location, evidence, and review.
          </div>
          <EmergencyFormLayout className="p-6">
            {/* Step 1: Emergency Type */}
            {currentStep === 0 && (
              <EmergencyFormSection
                title="Emergency Type"
                description="Select the type of emergency you are reporting"
                aria-label="Step 1 of 5: Emergency Type"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="radiogroup" aria-labelledby="emergency-type-heading">
                  <h3 id="emergency-type-heading" className="sr-only">
                    Select emergency type
                  </h3>
                  {emergencyTypes.map((type) => (
                    <EnhancedCard
                      key={type.id}
                      className={cn(
                        'cursor-pointer transition-all hover:scale-105',
                        selectedType?.id === type.id
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-primary/50'
                      )}
                      onClick={() => handleTypeSelect(type)}
                      interactive
                      role="radio"
                      aria-checked={selectedType?.id === type.id}
                      aria-label={`${type.name}: ${type.description}`}
                      tabIndex={currentStep === 0 ? 0 : -1}
                    >
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">{type.icon}</div>
                        <div className="font-medium text-foreground">{type.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                      </div>
                    </EnhancedCard>
                  ))}
                </div>
                {formErrors.type && (
                  <FormFeedback type="error" message={formErrors.type} />
                )}
              </EmergencyFormSection>
            )}

            {/* Step 2: Emergency Details */}
            {currentStep === 1 && (
              <EmergencyFormSection
                title="Emergency Details"
                description="Provide detailed information about the emergency"
                aria-label="Step 2 of 5: Emergency Details"
              >
                <div className="space-y-6">
                  <EnhancedInput
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of the emergency"
                    maxLength={100}
                    required
                    errorText={formErrors.title}
                    floatingLabel
                    validateOnChange
                    validator={(value) => {
                      if (!value.trim()) {
                        return 'Title is required'
                      }
                      if (value.length < 5) {
                        return 'Title must be at least 5 characters'
                      }
                      if (value.length > 100) {
                        return 'Title must be less than 100 characters'
                      }
                      return null
                    }}
                  />

                  <EnhancedTextarea
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the emergency situation"
                    maxLength={500}
                    showCharacterCount
                    required
                    errorText={formErrors.description}
                    floatingLabel
                    validateOnChange
                    validator={(value) => {
                      if (!value.trim()) {
                        return 'Description is required'
                      }
                      if (value.length < 10) {
                        return 'Description must be at least 10 characters'
                      }
                      if (value.length > 500) {
                        return 'Description must be less than 500 characters'
                      }
                      return null
                    }}
                  />

                  <EnhancedRadioGroup
                    label="Severity Level"
                    options={[
                      { value: '1', label: 'Low - Minor issue' },
                      { value: '2', label: 'Moderate - Some impact' },
                      { value: '3', label: 'High - Significant impact' },
                      { value: '4', label: 'Severe - Major impact' },
                      { value: '5', label: 'Critical - Life-threatening' }
                    ]}
                    value={severity.toString()}
                    onChange={(value) => setSeverity(parseInt(value))}
                    orientation="horizontal"
                    required
                  />
                </div>
              </EmergencyFormSection>
            )}

            {/* Step 3: Location */}
            {currentStep === 2 && (
              <EmergencyFormSection
                title="Location"
                description="Specify the exact location and affected area"
                aria-label="Step 3 of 5: Location"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      {location ? (
                        <div className="text-sm text-foreground">
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No location selected</div>
                      )}
                    </div>
                    <EnhancedButton
                      onClick={handleLocationSelect}
                      variant={mapPreview ? 'warning' : 'default'}
                    >
                      {mapPreview ? 'Click on Map' : 'Select on Map'}
                    </EnhancedButton>
                  </div>

                  {location && (
                    <EnhancedRangeSlider
                      label="Affected Area Radius"
                      value={radius}
                      onChange={setRadius}
                      min={50}
                      max={5000}
                      step={50}
                      showValue
                      valueFormatter={(value) => `${value}m`}
                      marks={[
                        { value: 200, label: '200m' },
                        { value: 500, label: '500m' },
                        { value: 1000, label: '1km' },
                        { value: 2000, label: '2km' }
                      ]}
                    />
                  )}

                  {mapPreview && mapInstance && (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Click on the map to set location</p>
                      </div>
                    </div>
                  )}

                  {formErrors.location && (
                    <FormFeedback type="error" message={formErrors.location} />
                  )}
                </div>
              </EmergencyFormSection>
            )}

            {/* Step 4: Evidence */}
            {currentStep === 3 && (
              <EmergencyFormSection
                title="Evidence & Media"
                description="Add photos or audio recordings to support your report"
                aria-label="Step 4 of 5: Evidence & Media"
              >
                <div className="space-y-6">
                  <EnhancedFileUpload
                    label="Photos"
                    accept="image/*"
                    multiple
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    showPreviews
                    onFilesChange={handleImageUpload}
                    onFileRemove={handleImageRemove}
                  />

                  <AudioRecorder
                    label="Audio Recording"
                    maxDuration={60} // 1 minute
                    showLevels
                    showDuration
                    showPlayback
                    onRecordingStop={handleAudioRecording}
                  />
                </div>
              </EmergencyFormSection>
            )}

            {/* Step 5: Review */}
            {currentStep === 4 && (
              <EmergencyFormSection
                title="Review Report"
                description="Please review your emergency report before submitting"
                aria-label="Step 5 of 5: Review Report"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground">Emergency Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Type:</span> {selectedType?.name}</div>
                        <div><span className="font-medium">Title:</span> {title}</div>
                        <div><span className="font-medium">Severity:</span> {severity}/5</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground">Location</h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Coordinates:</span> {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}</div>
                        <div><span className="font-medium">Radius:</span> {radius}m</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                      {description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Evidence</h3>
                    <div className="flex gap-4">
                      {images.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {images.length} photo{images.length > 1 ? 's' : ''} attached
                        </div>
                      )}
                      {audioRecording && (
                        <div className="text-sm text-muted-foreground">
                          Audio recording attached ({Math.round(audioRecording.duration)}s)
                        </div>
                      )}
                      {images.length === 0 && !audioRecording && (
                        <div className="text-sm text-muted-foreground">
                          No evidence attached
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </EmergencyFormSection>
            )}
          </EmergencyFormLayout>
        </div>

        {/* Form Actions */}
        <EmergencyFormActions>
          <div className="flex items-center gap-3">
            <EnhancedButton
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cancel emergency report"
            >
              Cancel
            </EnhancedButton>

            {currentStep > 0 && (
              <EnhancedButton
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                aria-label={`Go to previous step: ${formSteps[currentStep - 1].title}`}
              >
                Previous
              </EnhancedButton>
            )}

            {currentStep < formSteps.length - 1 ? (
              <EnhancedButton
                onClick={handleNextStep}
                disabled={isSubmitting}
                aria-label={`Go to next step: ${formSteps[currentStep + 1].title}`}
              >
                Next
              </EnhancedButton>
            ) : (
              <EnhancedButton
                variant="destructive"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                aria-label="Submit emergency report"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Emergency Report'}
              </EnhancedButton>
            )}
          </div>

          <FormProgressSummary
            currentStep={currentStep}
            totalSteps={formSteps.length}
            completedSteps={currentStep}
            variant="compact"
            aria-label={`Form progress: step ${currentStep + 1} of ${formSteps.length}`}
          />
        </EmergencyFormActions>
      </div>
    </div>
  )
}