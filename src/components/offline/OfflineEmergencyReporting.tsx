'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  WifiOff, 
  Database, 
  Clock, 
  MapPin, 
  Camera, 
  Mic, 
  FileText, 
  Send, 
  Save, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Battery,
  Activity,
  HardDrive,
  Users,
  Navigation,
  Home,
  Phone,
  Ambulance,
  Flame,
  HeartPulse,
  Shield,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOfflineStore, useOfflineActions } from '@/store'
import { useEmergencyStore, useEmergencyActions } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'
import { Progress } from '@/components/ui/Progress'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'

interface OfflineEmergencyReportingProps {
  className?: string
  onReportSubmitted?: (report: any) => void
  initialLocation?: { lat: number; lng: number }
}

interface OfflineReport {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location: {
    latitude: number
    longitude: number
    accuracy: number
    address?: string
  }
  reporter: {
    id: string
    name: string
    trustScore: number
  }
  timestamp: number
  images: string[]
  videos: string[]
  audio?: string
  metadata: {
    deviceInfo?: string
    batteryLevel?: number
    networkStatus?: 'online' | 'offline' | 'poor'
    gpsAccuracy?: number
    estimatedDataSize?: number
  }
  status: 'draft' | 'queued' | 'syncing' | 'synced' | 'failed'
  syncAttempts: number
  lastSyncAttempt?: number
}

interface OfflineQueue {
  reports: OfflineReport[]
  totalSize: number
  maxSize: number
  compressionEnabled: boolean
  autoSyncEnabled: boolean
  lastSyncTime: number
}

export function OfflineEmergencyReporting({ 
  className, 
  onReportSubmitted, 
  initialLocation 
}: OfflineEmergencyReportingProps) {
  const { pendingActions, addOfflineAction, clearSyncedActions } = useOfflineActions()
  const { userLocation, locationAccuracy } = useEmergencyStore()
  const { storageQuota, addAction } = useOfflineStore()
  
  const [currentReport, setCurrentReport] = useState<Partial<OfflineReport>>({
    type: 'fire',
    severity: 'high',
    title: '',
    description: '',
    location: initialLocation || null,
  })
  
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [audioRecording, setAudioRecording] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [queue, setQueue] = useState<OfflineQueue>({
    reports: [],
    totalSize: 0,
    maxSize: 50 * 1024 * 1024, // 50MB
    compressionEnabled: true,
    autoSyncEnabled: true,
    lastSyncTime: 0,
  })

  // Mock offline reports from storage
  const [offlineReports, setOfflineReports] = useState<OfflineReport[]>([
    {
      id: 'offline-1',
      type: 'medical',
      severity: 'critical',
      title: 'Medical Emergency - Downtown',
      description: 'Person collapsed at intersection, requires immediate medical attention',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        address: 'Market St & 5th St, San Francisco, CA',
      },
      reporter: {
        id: 'user-789',
        name: 'John Doe',
        trustScore: 0.92,
      },
      timestamp: Date.now() - 300000, // 5 minutes ago
      images: ['image1.jpg'],
      audio: 'audio1.mp3',
      metadata: {
        deviceInfo: 'iPhone 14 Pro',
        batteryLevel: 85,
        networkStatus: 'offline',
        gpsAccuracy: 5,
        estimatedDataSize: 2.5 * 1024 * 1024, // 2.5MB
      },
      status: 'queued',
      syncAttempts: 3,
      lastSyncAttempt: Date.now() - 60000, // 1 minute ago
    },
    {
      id: 'offline-2',
      type: 'fire',
      severity: 'high',
      title: 'Building Fire - Financial District',
      description: 'Smoke visible from multiple floors, fire alarms active',
      location: {
        latitude: 37.7890,
        longitude: -122.4010,
        accuracy: 15,
        address: '100 Pine St, San Francisco, CA',
      },
      reporter: {
        id: 'user-456',
        name: 'Jane Smith',
        trustScore: 0.78,
      },
      timestamp: Date.now() - 900000, // 15 minutes ago
      images: ['image2.jpg', 'image3.jpg'],
      videos: ['video1.mp4'],
      metadata: {
        deviceInfo: 'Samsung Galaxy S23',
        batteryLevel: 45,
        networkStatus: 'poor',
        gpsAccuracy: 25,
        estimatedDataSize: 8.7 * 1024 * 1024, // 8.7MB
      },
      status: 'syncing',
      syncAttempts: 1,
      lastSyncAttempt: Date.now() - 30000, // 30 seconds ago
    },
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Update queue stats
  useEffect(() => {
    const reports = offlineReports.filter(report => report.status !== 'synced')
    const totalSize = reports.reduce((sum, report) => {
      const imageSize = (report.images?.length || 0) * 1024 * 1024 // 1MB per image
      const videoSize = (report.videos?.length || 0) * 5 * 1024 * 1024 // 5MB per video
      const audioSize = report.audio ? 2 * 1024 * 1024 : 0 // 2MB for audio
      const reportSize = imageSize + videoSize + audioSize + 1024 // 1KB for text data
      return sum + reportSize
    }, 0)

    setQueue({
      reports,
      totalSize,
      maxSize: queue.maxSize,
      compressionEnabled: queue.compressionEnabled,
      autoSyncEnabled: queue.autoSyncEnabled,
      lastSyncTime: queue.lastSyncTime,
    })
  }, [offlineReports, queue.maxSize, queue.compressionEnabled, queue.autoSyncEnabled, queue.lastSyncTime])

  // Get current location
  const getCurrentLocation = () => {
    if (userLocation && locationAccuracy) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        accuracy: locationAccuracy,
      }
    }
    return initialLocation || {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
    }
  }

  // Handle image capture
  const handleImageCapture = (files: FileList) => {
    const imageArray = Array.from(files)
    const newImages = [...images, ...imageArray.map(file => URL.createObjectURL(file))]
    setImages(newImages.slice(0, 5)) // Limit to 5 images
  }

  // Handle video capture
  const handleVideoCapture = (files: FileList) => {
    const videoArray = Array.from(files)
    const newVideos = [...videos, ...videoArray.map(file => URL.createObjectURL(file))]
    setVideos(newVideos.slice(0, 2)) // Limit to 2 videos
  }

  // Handle audio recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const audioChunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioRecording(audioUrl)
        setIsRecording(false)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start audio recording:', error)
    }
  }

  const stopAudioRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsRecording(false)
    }
  }

  // Submit offline report
  const submitOfflineReport = () => {
    if (!currentReport.title || !currentReport.description) {
      alert('Please fill in the title and description')
      return
    }

    const report: OfflineReport = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...currentReport,
      location: getCurrentLocation(),
      reporter: {
        id: 'current-user',
        name: 'Current User',
        trustScore: 0.75, // Default for offline reports
      },
      timestamp: Date.now(),
      images,
      videos,
      audio: audioRecording,
      metadata: {
        deviceInfo: navigator.userAgent,
        batteryLevel: 'unknown', // Would need Battery API
        networkStatus: navigator.onLine ? 'online' : 'offline',
        gpsAccuracy: getCurrentLocation().accuracy,
        estimatedDataSize: (images.length * 1024 * 1024) + (videos.length * 5 * 1024 * 1024) + (audioRecording ? 2 * 1024 * 1024 : 0),
      },
      status: 'queued',
      syncAttempts: 0,
    }

    // Add to offline queue
    addOfflineAction({
      type: 'create',
      table: 'emergency_events',
      data: report,
      priority: 'critical',
      maxRetries: 5,
    })

    // Add to local reports
    setOfflineReports(prev => [report, ...prev])
    
    // Reset form
    setCurrentReport({
      type: 'fire',
      severity: 'high',
      title: '',
      description: '',
      location: null,
    })
    setImages([])
    setVideos([])
    setAudioRecording(null)
    
    // Callback
    if (onReportSubmitted) {
      onReportSubmitted(report)
    }

    setIsProcessing(false)
  }

  // Sync when online
  useEffect(() => {
    if (navigator.onLine && queue.autoSyncEnabled && offlineReports.length > 0) {
      const syncInterval = setInterval(() => {
        const reportsToSync = offlineReports.filter(report => report.status === 'queued')
        
        if (reportsToSync.length > 0) {
          console.log(`Syncing ${reportsToSync.length} offline reports...`)
          
          // Update status to syncing
          setOfflineReports(prev => prev.map(report => 
            reportsToSync.includes(report) ? { ...report, status: 'syncing' } : report
          ))

          // Simulate sync process
          setTimeout(() => {
            setOfflineReports(prev => prev.map(report => 
              report.status === 'syncing' ? { ...report, status: 'synced', lastSyncAttempt: Date.now() } : report
            ))
          }, 3000) // 3 seconds
        }
      }, 30000) // Check every 30 seconds

      return () => clearInterval(syncInterval)
    }

    return () => {}
  }, [navigator.onLine, queue.autoSyncEnabled, offlineReports])

  // Get status color
  const getStatusColor = (status: OfflineReport['status']) => {
    switch (status) {
      case 'synced': return 'text-green-600'
      case 'syncing': return 'text-blue-600'
      case 'queued': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  // Get status icon
  const getStatusIcon = (status: OfflineReport['status']) => {
    switch (status) {
      case 'synced': return CheckCircle
      case 'syncing': return RefreshCw
      case 'queued': return Clock
      case 'failed': return AlertTriangle
      default: return Clock
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              Offline Emergency Reporting
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={navigator.onLine ? 'active' : 'inactive'}
                size="sm"
                label={navigator.onLine ? 'Online' : 'Offline'}
              />
              <Badge variant={navigator.onLine ? 'default' : 'secondary'}>
                {navigator.onLine ? 'Ready to Sync' : 'Offline Mode'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Queue Status */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {queue.reports.length}
              </div>
              <p className="text-sm text-muted-foreground">Queued Reports</p>
            </div>

            {/* Storage Usage */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((queue.totalSize / 1024 / 1024))}MB
              </div>
              <p className="text-sm text-muted-foreground">
                of {Math.round(queue.maxSize / 1024 / 1024)}MB
              </p>
            </div>

            {/* Last Sync */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queue.lastSyncTime > 0 ? new Date(queue.lastSyncTime).toLocaleTimeString() : 'Never'}
              </div>
              <p className="text-sm text-muted-foreground">Last Sync</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Report Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Create Emergency Report
          </CardTitle>
          <Badge variant="outline">
            Offline Mode
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Emergency Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Emergency Type</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { type: 'fire', name: 'Fire', icon: Flame, color: 'red' },
                  { type: 'medical', name: 'Medical', icon: HeartPulse, color: 'pink' },
                  { type: 'security', name: 'Security', icon: Shield, color: 'blue' },
                  { type: 'natural', name: 'Natural', icon: CloudRain, color: 'cyan' },
                  { type: 'infrastructure', name: 'Infrastructure', icon: Zap, color: 'orange' },
                ].map(({ type, name, icon: IconComponent, color }) => (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all duration-200',
                      currentReport.type === type 
                        ? `${color}-100 border-${color}-500 bg-${color}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => setCurrentReport(prev => ({ ...prev, type }))}
                  >
                    <IconComponent className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{name}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity Level</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { level: 'low', name: 'Low', color: 'blue' },
                  { level: 'medium', name: 'Medium', color: 'yellow' },
                  { level: 'high', name: 'High', color: 'orange' },
                  { level: 'critical', name: 'Critical', color: 'red' },
                ].map(({ level, name, color }) => (
                  <motion.button
                    key={level}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all duration-200',
                      currentReport.severity === level 
                        ? `${color}-100 border-${color}-500 bg-${color}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => setCurrentReport(prev => ({ ...prev, severity }))}
                  >
                    <div className={cn(
                      'w-3 h-3 rounded-full mx-auto mb-2',
                      currentReport.severity === level ? `bg-${color}-500` : 'bg-gray-400'
                    )} />
                    <div className="text-sm font-medium">{name}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Title and Description */}
            <div className="space-y-4">
              <div>
                <Input
                  label="Title"
                  value={currentReport.title || ''}
                  onChange={(e) => setCurrentReport(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the emergency"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={currentReport.description || ''}
                  onChange={(e) => setCurrentReport(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the emergency situation"
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium">
                      {currentReport.location 
                        ? currentReport.location.address || `${currentReport.location.latitude.toFixed(6)}, ${currentReport.location.longitude.toFixed(6)}`
                        : 'Location will be captured automatically'
                      }
                    </div>
                    {currentReport.location && (
                      <div className="text-xs text-muted-foreground">
                        Accuracy: ±{currentReport.location.accuracy}m
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Media Capture */}
            <div className="space-y-4">
              {/* Images */}
              <div>
                <label className="text-sm font-medium mb-2 block">Photos (Max: 5)</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={image} 
                        alt={`Emergency photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {images.length < 5 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-6 w-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Add Photo</div>
                    </motion.button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageCapture(e.target.files)}
                />
              </div>

              {/* Videos */}
              <div>
                <label className="text-sm font-medium mb-2 block">Videos (Max: 2)</label>
                <div className="grid grid-cols-2 gap-3">
                  {videos.map((video, index) => (
                    <div key={index} className="relative">
                      <video 
                        src={video} 
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        controls
                      />
                      <button
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                        onClick={() => setVideos(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  
                  {videos.length < 2 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-all duration-200"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video className="h-6 w-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Add Video</div>
                    </motion.button>
                  )}
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleVideoCapture(e.target.files)}
                />
              </div>

              {/* Audio */}
              <div>
                <label className="text-sm font-medium mb-2 block">Audio Recording</label>
                <div className="flex items-center gap-4">
                  {audioRecording ? (
                    <div className="flex-1">
                      <audio 
                        ref={audioRef}
                        src={audioRecording} 
                        controls
                        className="w-full"
                      />
                      <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-red-800">Recording...</span>
                        </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200"
                      onClick={startAudioRecording}
                    >
                      <Mic className="h-6 w-6" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Start Recording</div>
                        <div className="text-xs text-muted-foreground">Max: 60 seconds</div>
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                onClick={submitOfflineReport}
                disabled={isProcessing || !currentReport.title || !currentReport.description}
                loading={isProcessing}
                className="w-full md:w-auto px-8"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                {isProcessing ? 'Submitting...' : 'Submit Offline Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {queue.reports.length} reports
            </Badge>
            <Badge variant="outline">
              {Math.round(queue.totalSize / 1024 / 1024)}MB
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offlineReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Offline Reports</p>
                <p className="text-sm">
                  Emergency reports created while offline will appear here
                </p>
              </div>
            ) : (
              offlineReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <EmergencyIndicator
                          type={report.type}
                          label={report.type}
                          severity={report.severity}
                          showSeverity
                        />
                        
                        <div>
                          <h4 className="font-semibold">{report.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{report.location.address || `${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)}`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        getStatusColor(report.status)
                      )}>
                        {getStatusIcon(report.status) && (
                          React.createElement(getStatusIcon(report.status), { className: 'h-3 w-3' })
                        )}
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                          {report.status.toUpperCase()}
                        </Badge>
                        
                        {report.status === 'queued' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Queued for sync
                          </div>
                        )}
                        
                        {report.status === 'syncing' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Syncing... ({report.syncAttempts} attempts)
                          </div>
                        )}
                        
                        {report.status === 'failed' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Failed after {report.syncAttempts} attempts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Media Preview */}
                  {(report.images?.length > 0 || report.videos?.length > 0 || report.audio) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex gap-2">
                        {report.images?.map((image, imgIndex) => (
                          <img
                            key={imgIndex}
                            src={image}
                            alt={`Report image ${imgIndex + 1}`}
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        ))}
                        
                        {report.videos?.map((video, videoIndex) => (
                          <video
                            key={videoIndex}
                            src={video}
                            className="w-16 h-12 object-cover rounded border border-gray-200"
                            controls
                          />
                        ))}
                        
                        {report.audio && (
                          <div className="flex-1">
                            <audio 
                              src={report.audio}
                              controls
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Reported:</span>
                        <div>{new Date(report.timestamp).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Data Size:</span>
                        <div>{Math.round(report.metadata?.estimatedDataSize / 1024 / 1024)}MB</div>
                      </div>
                      <div>
                        <span className="font-medium">Network:</span>
                        <div>{report.metadata?.networkStatus}</div>
                      </div>
                      <div>
                        <span className="font-medium">GPS Accuracy:</span>
                        <div>±{report.metadata?.gpsAccuracy}m</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {navigator.onLine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto Sync</span>
                <Switch
                  checked={queue.autoSyncEnabled}
                  onCheckedChange={(checked) => setQueue(prev => ({ ...prev, autoSyncEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compression</span>
                <Switch
                  checked={queue.compressionEnabled}
                  onCheckedChange={(checked) => setQueue(prev => ({ ...prev, compressionEnabled: checked }))}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Trigger manual sync
                  console.log('Manual sync triggered')
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    Offline reports will automatically sync when network is available
                  </div>
                  <div className="text-xs text-blue-600">
                    Reports are compressed and queued for efficient transmission
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}