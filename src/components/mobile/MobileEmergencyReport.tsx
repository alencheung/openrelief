'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useMobileDetection } from '@/hooks/useMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useMobilePerformance } from '@/hooks/useMobilePerformance'
import {
  AlertTriangle,
  MapPin,
  Camera,
  Mic,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EnhancedCard } from '@/components/ui/EnhancedCard'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'
import { FormFeedback } from '@/components/ui/FormFeedback'

export interface EmergencyType {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

export interface MobileEmergencyReportProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EmergencyReportData) => void
  initialLocation?: { lat: number; lng: number }
  emergencyTypes: EmergencyType[]
  className?: string
}

export interface EmergencyReportData {
  type: string
  title: string
  description: string
  severity: number
  location: { lat: number; lng: number }
  images: File[]
  audio?: File
  metadata?: Record<string, any>
}

const emergencyTypes: EmergencyType[] = [
  {
    id: 'fire',
    name: 'Fire',
    icon: '🔥',
    color: '#ef4444',
    description: 'Building fire, wildfire, or other fire emergency'
  },
  {
    id: 'medical',
    name: 'Medical',
    icon: '🏥',
    color: '#ec4899',
    description: 'Medical emergency requiring immediate attention'
  },
  {
    id: 'security',
    name: 'Security',
    icon: '🚨',
    color: '#f59e0b',
    description: 'Security threat or criminal activity'
  },
  {
    id: 'natural',
    name: 'Natural',
    icon: '🌊',
    color: '#3b82f6',
    description: 'Natural disaster or weather emergency'
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    icon: '🏗️',
    color: '#f97316',
    description: 'Infrastructure failure or utility outage'
  }
]

const severityLevels = [
  { value: 1, label: 'Low', description: 'Minor issue' },
  { value: 2, label: 'Moderate', description: 'Some impact' },
  { value: 3, label: 'High', description: 'Significant impact' },
  { value: 4, label: 'Severe', description: 'Major impact' },
  { value: 5, label: 'Critical', description: 'Life-threatening' }
]

export function MobileEmergencyReport({
  isOpen,
  onClose,
  onSubmit,
  initialLocation,
  emergencyTypes = emergencyTypes,
  className
}: MobileEmergencyReportProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [location, setLocation] = useState(initialLocation || null)
  const [images, setImages] = useState<File[]>([])
  const [audioRecording, setAudioRecording] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isOnline, setIsOnline] = useState(true)

  const { isMobile, isTouch } = useMobileDetection()
  const { getOptimizedSettings } = useMobilePerformance()
  const performanceSettings = getOptimizedSettings()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const steps = [
    { id: 'type', title: 'Type', icon: <AlertTriangle className="w-5 h-5" /> },
    { id: 'details', title: 'Details', icon: <FileText className="w-5 h-5" /> },
    { id: 'location', title: 'Location', icon: <MapPin className="w-5 h-5" /> },
    { id: 'media', title: 'Media', icon: <Camera className="w-5 h-5" /> },
    { id: 'review', title: 'Review', icon: <Check className="w-5 h-5" /> }
  ]

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

  // Get current location if not provided
  useEffect(() => {
    if (!initialLocation && !location && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    }
  }, [initialLocation, location])

  // Handle swipe gestures for navigation
  const swipeRef = useTouchGestures({
    onSwipe: (direction) => {
      if (direction === 'right' && currentStep > 0) {
        setCurrentStep(currentStep - 1)
      } else if (direction === 'left' && currentStep < steps.length - 1) {
        if (validateCurrentStep()) {
          setCurrentStep(currentStep + 1)
        }
      }
    }
  })

  // Validate current step
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    switch (steps[currentStep].id) {
      case 'type':
        if (!selectedType) {
          newErrors.type = 'Please select an emergency type'
        }
        break
      case 'details':
        if (!title.trim()) {
          newErrors.title = 'Title is required'
        } else if (title.length < 5) {
          newErrors.title = 'Title must be at least 5 characters'
        }
        if (!description.trim()) {
          newErrors.description = 'Description is required'
        } else if (description.length < 10) {
          newErrors.description = 'Description must be at least 10 characters'
        }
        break
      case 'location':
        if (!location) {
          newErrors.location = 'Location is required'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle image capture
  const handleImageCapture = () => {
    fileInputRef.current?.click()
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validImages = files.filter(file =>
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    )

    if (validImages.length !== files.length) {
      setErrors(prev => ({
        ...prev,
        images: 'Some images were too large. Maximum size is 5MB per image.'
      }))
    }

    setImages(prev => [...prev, ...validImages].slice(0, 5)) // Max 5 images
  }

  // Handle audio recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        setAudioRecording(audioFile)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      audioRecorderRef.current = recorder
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting audio recording:', error)
      setErrors(prev => ({
        ...prev,
        audio: 'Failed to access microphone. Please check permissions.'
      }))
    }
  }

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return
    }

    setIsSubmitting(true)

    const reportData: EmergencyReportData = {
      type: selectedType!.id,
      title,
      description,
      severity,
      location: location!,
      images,
      audio: audioRecording || undefined,
      metadata: {
        submittedAt: new Date().toISOString(),
        isOnline,
        deviceInfo: navigator.userAgent
      }
    }

    try {
      await onSubmit(reportData)
      handleClose()
    } catch (error) {
      console.error('Error submitting report:', error)
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to submit report. Please try again.'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close
  const handleClose = () => {
    setCurrentStep(0)
    setSelectedType(null)
    setTitle('')
    setDescription('')
    setSeverity(3)
    setLocation(initialLocation || null)
    setImages([])
    setAudioRecording(null)
    setErrors({})
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card safe-area-inset-top">
        <button
          className="touch-target p-2"
          onClick={handleClose}
          aria-label="Close emergency report"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <EmergencyIndicator type="critical" size="sm" />
          <h1 className="text-lg font-semibold">Report Emergency</h1>
        </div>

        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center p-4 bg-muted/30">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step.icon}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1 transition-colors',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        ref={swipeRef.ref}
        className="flex-1 overflow-y-auto safe-area-inset-bottom"
      >
        {/* Step 1: Emergency Type */}
        {currentStep === 0 && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold text-center">What type of emergency?</h2>

            <div className="grid grid-cols-2 gap-3">
              {emergencyTypes.map((type) => (
                <button
                  key={type.id}
                  className={cn(
                    'mobile-card-compact p-4 text-left transition-all',
                    'hover:scale-105 active:scale-95',
                    selectedType?.id === type.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => {
                    setSelectedType(type)
                    setErrors(prev => ({ ...prev, type: '' }))
                  }}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{type.icon}</div>
                    <div className="font-medium">{type.name}</div>
                  </div>
                </button>
              ))}
            </div>

            {errors.type && (
              <FormFeedback type="error" message={errors.type} />
            )}
          </div>
        )}

        {/* Step 2: Emergency Details */}
        {currentStep === 1 && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Emergency Details</h2>

            <div className="space-y-4">
              <div>
                <label className="mobile-label">Title</label>
                <input
                  type="text"
                  className="mobile-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of emergency"
                  maxLength={100}
                />
                {errors.title && (
                  <FormFeedback type="error" message={errors.title} />
                )}
              </div>

              <div>
                <label className="mobile-label">Description</label>
                <textarea
                  className="mobile-input min-h-[100px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of what's happening"
                  maxLength={500}
                />
                {errors.description && (
                  <FormFeedback type="error" message={errors.description} />
                )}
              </div>

              <div>
                <label className="mobile-label">Severity</label>
                <div className="space-y-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-colors',
                        'hover:bg-accent focus:bg-accent',
                        severity === level.value
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border'
                      )}
                      onClick={() => setSeverity(level.value)}
                    >
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {currentStep === 2 && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Location</h2>

            <div className="mobile-card">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  {location ? (
                    <div className="text-sm">
                      <div className="font-medium">Current Location</div>
                      <div className="text-muted-foreground">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Getting location...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errors.location && (
              <FormFeedback type="error" message={errors.location} />
            )}
          </div>
        )}

        {/* Step 4: Media */}
        {currentStep === 3 && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Add Evidence</h2>

            {/* Photos */}
            <div>
              <label className="mobile-label">Photos</label>
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Emergency photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <button
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    onClick={handleImageCapture}
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">Add Photo</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Audio Recording */}
            <div>
              <label className="mobile-label">Audio Recording</label>
              <div className="flex items-center gap-3">
                {audioRecording ? (
                  <div className="flex-1 mobile-card p-3">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium">Recording saved</span>
                      <button
                        className="ml-auto text-destructive"
                        onClick={() => setAudioRecording(null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={cn(
                      'flex-1 mobile-btn mobile-btn-outline',
                      'flex items-center justify-center gap-2',
                      isRecording && 'bg-destructive text-destructive-foreground'
                    )}
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                  >
                    <Mic className="w-4 h-4" />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                )}
              </div>
            </div>

            {errors.images && (
              <FormFeedback type="error" message={errors.images} />
            )}
            {errors.audio && (
              <FormFeedback type="error" message={errors.audio} />
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Review Report</h2>

            <div className="space-y-4">
              <div className="mobile-card">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{selectedType?.icon}</div>
                  <div>
                    <div className="font-medium">{selectedType?.name}</div>
                    <div className="text-sm text-muted-foreground">Emergency Type</div>
                  </div>
                </div>
              </div>

              <div className="mobile-card">
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-sm text-muted-foreground">Title</div>
                </div>
              </div>

              <div className="mobile-card">
                <div>
                  <div className="font-medium">Severity: {severity}/5</div>
                  <div className="text-sm text-muted-foreground">
                    {severityLevels.find(l => l.value === severity)?.description}
                  </div>
                </div>
              </div>

              <div className="mobile-card">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <div className="text-sm">
                    {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
                  </div>
                </div>
              </div>

              {(images.length > 0 || audioRecording) && (
                <div className="mobile-card">
                  <div className="text-sm font-medium">Evidence</div>
                  <div className="flex gap-2 mt-2">
                    {images.length > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <ImageIcon className="w-4 h-4" />
                        {images.length} photo{images.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {audioRecording && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mic className="w-4 h-4" />
                        Audio recording
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isOnline
                  ? 'Your report will be submitted immediately.'
                  : 'Your report will be saved locally and submitted when you\'re back online.'
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t bg-card safe-area-inset-bottom">
        <button
          className="mobile-btn mobile-btn-outline"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              className="touch-target p-2"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              className="touch-target p-2"
              onClick={() => {
                if (validateCurrentStep()) {
                  setCurrentStep(currentStep + 1)
                }
              }}
              disabled={isSubmitting}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              className="mobile-btn mobile-btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Report
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}