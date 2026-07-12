/**
 * Offline Emergency Reporting - Report Form Component
 *
 * Presentational sub-component rendering the emergency report creation form.
 * Extracted from OfflineEmergencyReporting.tsx to keep the main component
 * module under the 500 line lint budget.
 */

'use client'

import React, { RefObject } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Camera,
  MapPin,
  Mic,
  Save,
  X,
  Flame,
  HeartPulse,
  Shield,
  CloudRain,
  Zap,
  Video
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { SEVERITY_OPTIONS } from './offline-emergency-helpers'
import type { OfflineReport } from './offline-emergency-types'

interface EmergencyReportFormProps {
  currentReport: Partial<OfflineReport>
  onReportChange: React.Dispatch<React.SetStateAction<Partial<OfflineReport>>>
  images: string[]
  onImagesChange: React.Dispatch<React.SetStateAction<string[]>>
  videos: string[]
  onVideosChange: React.Dispatch<React.SetStateAction<string[]>>
  audioRecording: string | null
  isProcessing: boolean
  fileInputRef: RefObject<HTMLInputElement>
  videoInputRef: RefObject<HTMLInputElement>
  audioRef: RefObject<HTMLAudioElement>
  onImageCapture: (files: FileList | null) => void
  onVideoCapture: (files: FileList | null) => void
  onStartAudioRecording: () => void
  onSubmit: () => void
}

const TYPE_OPTIONS = [
  { type: 'fire', name: 'Fire', icon: Flame, color: 'red' },
  { type: 'medical', name: 'Medical', icon: HeartPulse, color: 'pink' },
  { type: 'security', name: 'Security', icon: Shield, color: 'blue' },
  { type: 'natural', name: 'Natural', icon: CloudRain, color: 'cyan' },
  { type: 'infrastructure', name: 'Infrastructure', icon: Zap, color: 'orange' }
]

export const EmergencyReportForm: React.FC<EmergencyReportFormProps> = ({
  currentReport,
  onReportChange,
  images,
  onImagesChange,
  videos,
  onVideosChange,
  audioRecording,
  isProcessing,
  fileInputRef,
  videoInputRef,
  audioRef,
  onImageCapture,
  onVideoCapture,
  onStartAudioRecording,
  onSubmit
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Create Emergency Report
      </CardTitle>
      <Badge variant="outline">Offline Mode</Badge>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {/* Emergency Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">Emergency Type</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TYPE_OPTIONS.map(({ type, name, icon: IconComponent, color }) => (
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
                onClick={() => onReportChange(prev => ({ ...prev, type }))}
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
            {SEVERITY_OPTIONS.map(({ level, name, color }) => (
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
                onClick={() => onReportChange(prev => ({ ...prev, severity: level }))}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full mx-auto mb-2',
                    currentReport.severity === level ? `bg-${color}-500` : 'bg-gray-400'
                  )}
                />
                <div className="text-sm font-medium">{name}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              value={currentReport.title || ''}
              onChange={e => onReportChange(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the emergency"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={currentReport.description || ''}
              onChange={e => onReportChange(prev => ({ ...prev, description: e.target.value }))}
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
                    ? currentReport.location.address ||
                      `${currentReport.location.latitude.toFixed(6)}, ${currentReport.location.longitude.toFixed(6)}`
                    : 'Location will be captured automatically'}
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
                  <Image
                    src={image}
                    alt={`Emergency photo ${index + 1}`}
                    width={100}
                    height={96}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                    onClick={() => onImagesChange(prev => prev.filter((_, i) => i !== index))}
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
              onChange={e => onImageCapture(e.target.files)}
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
                    onClick={() => onVideosChange(prev => prev.filter((_, i) => i !== index))}
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
              onChange={e => onVideoCapture(e.target.files)}
            />
          </div>

          {/* Audio */}
          <div>
            <label className="text-sm font-medium mb-2 block">Audio Recording</label>
            <div className="flex items-center gap-4">
              {audioRecording ? (
                <div className="flex-1">
                  <audio ref={audioRef} src={audioRecording} controls className="w-full" />
                  <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-red-800">Recording...</span>
                    </div>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200"
                  onClick={onStartAudioRecording}
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
            onClick={onSubmit}
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
)
