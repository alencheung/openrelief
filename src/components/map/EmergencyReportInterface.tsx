'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, MapPin, Camera, Mic, Send, X, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmergencyStore, useLocationStore } from '@/store'
import { EmergencyEvent } from '@/types'
import { Database } from '@/types/database'

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
    default_radius: 500,
  },
  {
    id: 2,
    name: 'Medical',
    description: 'Medical emergencies requiring immediate attention',
    icon: '🏥',
    color: '#ff1493',
    default_radius: 200,
  },
  {
    id: 3,
    name: 'Security',
    description: 'Security threats, criminal activity, public safety',
    icon: '🚨',
    color: '#ffaa00',
    default_radius: 300,
  },
  {
    id: 4,
    name: 'Natural',
    description: 'Natural disasters, weather events, earthquakes',
    icon: '🌊',
    color: '#4444ff',
    default_radius: 1000,
  },
  {
    id: 5,
    name: 'Infrastructure',
    description: 'Infrastructure failures, utility outages, road closures',
    icon: '🏗️',
    color: '#ff8800',
    default_radius: 400,
  },
]

export default function EmergencyReportInterface({
  isOpen,
  onClose,
  onReportSubmitted,
  initialLocation,
  mapInstance,
}: EmergencyReportInterfaceProps) {
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [location, setLocation] = useState(initialLocation || null)
  const [radius, setRadius] = useState(500)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mapPreview, setMapPreview] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const { userLocation } = useLocationStore()
  const { addOfflineAction } = useEmergencyStore()

  // Initialize with user location if no initial location provided
  useEffect(() => {
    if (!initialLocation && userLocation) {
      setLocation({
        lat: userLocation.lat,
        lng: userLocation.lng,
      })
    }
  }, [initialLocation, userLocation])

  // Update radius when emergency type changes
  useEffect(() => {
    if (selectedType) {
      setRadius(selectedType.default_radius)
    }
  }, [selectedType])

  const handleTypeSelect = (type: EmergencyType) => {
    setSelectedType(type)
    setRadius(type.default_radius)
  }

  const handleLocationSelect = () => {
    if (!mapInstance) return

    // Enable map interaction mode for location selection
    mapInstance.getCanvas().style.cursor = 'crosshair'

    const handleMapClick = (e: any) => {
      const coords = e.lngLat
      setLocation({
        lat: coords.lat,
        lng: coords.lng,
      })
      mapInstance.getCanvas().style.cursor = ''
      mapInstance.off('click', handleMapClick)
      setMapPreview(false)
    }

    mapInstance.on('click', handleMapClick)
    setMapPreview(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(prev => [...prev, ...files].slice(0, 5)) // Limit to 5 images
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

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
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      audioRecorderRef.current = recorder
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start audio recording:', error)
    }
  }

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const removeAudio = () => {
    setAudioBlob(null)
    audioChunksRef.current = []
  }

  const handleSubmit = async () => {
    if (!selectedType || !title || !description || !location) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const emergencyReport: Omit<EmergencyEvent, 'id' | 'created_at' | 'updated_at'> = {
      type_id: selectedType.id,
      reporter_id: 'current-user', // This would come from auth
      title,
      description,
      location: `${location.lat} ${location.lng}`,
      radius_meters: radius,
      severity,
      status: 'pending',
      trust_weight: 1.0, // Default trust weight
      confirmation_count: 0,
      dispute_count: 0,
      metadata: {
        images: images.map(img => URL.createObjectURL(img)),
        audio: audioBlob ? URL.createObjectURL(audioBlob) : null,
        reported_at: new Date().toISOString(),
        device_info: navigator.userAgent,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      resolved_at: null,
      resolved_by: null,
    }

    try {
      // Try to submit immediately
      onReportSubmitted(emergencyReport)
      
      // Also add to offline actions for sync
      addOfflineAction({
        type: 'create',
        data: emergencyReport,
      })
      
      // Reset form
      setSelectedType(null)
      setTitle('')
      setDescription('')
      setSeverity(3)
      setRadius(500)
      setImages([])
      setAudioBlob(null)
      onClose()
    } catch (error) {
      console.error('Failed to submit emergency report:', error)
      
      // Still add to offline actions even if submission fails
      addOfflineAction({
        type: 'create',
        data: emergencyReport,
      })
      
      alert('Report saved offline. Will sync when connection is available.')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const adjustRadius = (delta: number) => {
    setRadius(prev => Math.max(50, Math.min(5000, prev + delta)))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Report Emergency</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close emergency report"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Emergency Type Selection */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {emergencyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  selectedType?.id === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-medium text-gray-900">{type.name}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Details */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Details</h3>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the emergency"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Detailed description of the emergency situation"
                maxLength={500}
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity Level <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSeverity(level)}
                    className={cn(
                      'w-10 h-10 rounded-lg border-2 transition-all font-medium',
                      severity === level
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                1=Low, 3=Medium, 5=Critical
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
          
          <div className="space-y-4">
            {/* Current Location Display */}
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                {location ? (
                  <div className="text-sm text-gray-900">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No location selected</div>
                )}
              </div>
              <button
                onClick={handleLocationSelect}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                {mapPreview ? 'Click on Map' : 'Select on Map'}
              </button>
            </div>

            {/* Radius */}
            {location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Affected Area Radius: {radius}m
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => adjustRadius(-50)}
                    className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min="50"
                    max="5000"
                    step="50"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    onClick={() => adjustRadius(50)}
                    className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Map Preview */}
            {mapPreview && mapInstance && (
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Click on the map to set location</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Media Attachments */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence & Media</h3>
          
          <div className="space-y-4">
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (max 5)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span>Add Photos</span>
              </button>
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Emergency evidence ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Recording
              </label>
              <div className="flex items-center space-x-3">
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startAudioRecording}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                    <span>Start Recording</span>
                  </button>
                )}
                
                {isRecording && (
                  <button
                    onClick={stopAudioRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span>Stop Recording</span>
                  </button>
                )}
                
                {audioBlob && (
                  <div className="flex items-center space-x-2">
                    <audio src={URL.createObjectURL(audioBlob)} controls className="h-8" />
                    <button
                      onClick={removeAudio}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedType || !title || !description || !location}
              className={cn(
                'flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors',
                isSubmitting || !selectedType || !title || !description || !location
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600'
              )}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Emergency Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}