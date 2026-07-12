'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  WifiOff,
  Database,
  Upload,
  RefreshCw,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOfflineStore, useOfflineActions } from '@/store'
import { useEmergencyStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Switch } from '@/components/ui/Switch'

// Re-export extracted types and helpers for backward compatibility
export * from './offline-emergency-types'
export * from './offline-emergency-helpers'
import {
  calculateTotalSize,
  generateReportId,
  getDefaultOfflineReports,
  getDefaultQueue
} from './offline-emergency-helpers'
import { EmergencyReportForm } from './offline-emergency-form'
import { OfflineQueueList } from './offline-emergency-queue-list'
import type {
  OfflineEmergencyReportingProps,
  OfflineQueue,
  OfflineReport,
  ReportLocation
} from './offline-emergency-types'

export function OfflineEmergencyReporting({
  className,
  onReportSubmitted,
  initialLocation
}: OfflineEmergencyReportingProps) {
  const { addAction: addOfflineAction, removeAction: _clearSyncedActions } = useOfflineActions()
  const { userLocation, locationAccuracy } = useEmergencyStore()
  const { storageQuota: _storageQuota, addAction: _addAction } = useOfflineStore()

  const [currentReport, setCurrentReport] = useState<Partial<OfflineReport>>({
    type: 'fire',
    severity: 'high',
    title: '',
    description: '',
    location: initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng, accuracy: 0 }
      : undefined
  })

  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [audioRecording, setAudioRecording] = useState<string | null>(null)
  const [_isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [_expandedSection, _setExpandedSection] = useState<string | null>(null)
  const [queue, setQueue] = useState<OfflineQueue>(getDefaultQueue())

  // Mock offline reports from storage
  const [offlineReports, setOfflineReports] = useState<OfflineReport[]>(getDefaultOfflineReports())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Update queue stats
  useEffect(() => {
    const reports = offlineReports.filter(report => report.status !== 'synced')
    const totalSize = calculateTotalSize(reports)

    setQueue(prev => ({
      reports,
      totalSize,
      maxSize: prev.maxSize,
      compressionEnabled: prev.compressionEnabled,
      autoSyncEnabled: prev.autoSyncEnabled,
      lastSyncTime: prev.lastSyncTime
    }))
  }, [offlineReports])

  // Get current location
  const getCurrentLocation = (): ReportLocation => {
    if (userLocation && locationAccuracy) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        accuracy: locationAccuracy
      }
    }
    return initialLocation
      ? { latitude: initialLocation.lat, longitude: initialLocation.lng, accuracy: 10 }
      : {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        }
  }

  // Handle image capture
  const handleImageCapture = (files: FileList | null) => {
    if (!files) {
      return
    }
    const imageArray = Array.from(files)
    const newImages = [...images, ...imageArray.map(file => URL.createObjectURL(file))]
    // Limit to 5 images
    setImages(newImages.slice(0, 5))
  }

  // Handle video capture
  const handleVideoCapture = (files: FileList | null) => {
    if (!files) {
      return
    }
    const videoArray = Array.from(files)
    const newVideos = [...videos, ...videoArray.map(file => URL.createObjectURL(file))]
    // Limit to 2 videos
    setVideos(newVideos.slice(0, 2))
  }

  // Handle audio recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const audioChunks: Blob[] = []

      mediaRecorder.ondataavailable = event => {
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

  const _stopAudioRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsRecording(false)
    }
  }

  // Submit offline report
  const submitOfflineReport = () => {
    if (!currentReport.title || !currentReport.description) {
      // eslint-disable-next-line no-alert
      alert('Please fill in the title and description')
      return
    }

    const location = getCurrentLocation()
    const report: OfflineReport = {
      ...currentReport,
      id: generateReportId(),
      type: currentReport.type || 'fire',
      severity: currentReport.severity || 'high',
      title: currentReport.title || '',
      description: currentReport.description || '',
      location,
      reporter: {
        id: 'current-user',
        name: 'Current User',
        // Default for offline reports
        trustScore: 0.75
      },
      timestamp: Date.now(),
      images,
      videos,
      audio: audioRecording ?? undefined,
      metadata: {
        deviceInfo: navigator.userAgent,
        // Would need Battery API
        batteryLevel: undefined,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        gpsAccuracy: location.accuracy,
        estimatedDataSize:
          images.length * 1024 * 1024 +
          videos.length * 5 * 1024 * 1024 +
          (audioRecording ? 2 * 1024 * 1024 : 0)
      },
      status: 'queued',
      syncAttempts: 0
    }

    // Add to offline queue
    addOfflineAction({
      type: 'create',
      table: 'emergency_events',
      data: report,
      priority: 'critical',
      maxRetries: 5
    })

    // Add to local reports
    setOfflineReports(prev => [report, ...prev])

    // Reset form
    setCurrentReport({
      type: 'fire',
      severity: 'high',
      title: '',
      description: '',
      location: undefined
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
    const isOnline = navigator.onLine
    if (isOnline && queue.autoSyncEnabled && offlineReports.length > 0) {
      const syncInterval = setInterval(() => {
        const reportsToSync = offlineReports.filter(report => report.status === 'queued')

        if (reportsToSync.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`Syncing ${reportsToSync.length} offline reports...`)

          // Update status to syncing
          setOfflineReports(prev =>
            prev.map(report =>
              reportsToSync.includes(report) ? { ...report, status: 'syncing' } : report
            )
          )

          // Simulate sync process
          // 3 seconds
          setTimeout(() => {
            setOfflineReports(prev =>
              prev.map(report =>
                report.status === 'syncing'
                  ? { ...report, status: 'synced', lastSyncAttempt: Date.now() }
                  : report
              )
            )
          }, 3000)
        }
        // Check every 30 seconds
      }, 30000)

      return () => clearInterval(syncInterval)
    }

    return () => {}
  }, [queue.autoSyncEnabled, offlineReports])

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
              <div className="text-2xl font-bold text-blue-600">{queue.reports.length}</div>
              <p className="text-sm text-muted-foreground">Queued Reports</p>
            </div>

            {/* Storage Usage */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(queue.totalSize / 1024 / 1024)}MB
              </div>
              <p className="text-sm text-muted-foreground">
                of {Math.round(queue.maxSize / 1024 / 1024)}MB
              </p>
            </div>

            {/* Last Sync */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queue.lastSyncTime > 0
                  ? new Date(queue.lastSyncTime).toLocaleTimeString()
                  : 'Never'}
              </div>
              <p className="text-sm text-muted-foreground">Last Sync</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Report Form */}
      <EmergencyReportForm
        currentReport={currentReport}
        onReportChange={setCurrentReport}
        images={images}
        onImagesChange={setImages}
        videos={videos}
        onVideosChange={setVideos}
        audioRecording={audioRecording}
        isProcessing={isProcessing}
        fileInputRef={fileInputRef}
        videoInputRef={videoInputRef}
        audioRef={audioRef}
        onImageCapture={handleImageCapture}
        onVideoCapture={handleVideoCapture}
        onStartAudioRecording={startAudioRecording}
        onSubmit={submitOfflineReport}
      />

      {/* Offline Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{queue.reports.length} reports</Badge>
            <Badge variant="outline">{Math.round(queue.totalSize / 1024 / 1024)}MB</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OfflineQueueList reports={offlineReports} />
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
                  onCheckedChange={(checked: boolean) =>
                    setQueue(prev => ({ ...prev, autoSyncEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compression</span>
                <Switch
                  checked={queue.compressionEnabled}
                  onCheckedChange={(checked: boolean) =>
                    setQueue(prev => ({ ...prev, compressionEnabled: checked }))
                  }
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Trigger manual sync
                  // eslint-disable-next-line no-console
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
