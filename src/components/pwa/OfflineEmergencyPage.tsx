'use client'

import { useState, useEffect } from 'react'
import { useOfflineActions } from '@/hooks/useNetworkStatus'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  AlertTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  WifiOffIcon
} from 'lucide-react'

interface EmergencyReport {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location?: string
  contact?: string
  timestamp: number
  synced: boolean
}

const emergencyTypes = [
  { value: 'medical', label: 'Medical Emergency', icon: '🚑' },
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'police', label: 'Police Emergency', icon: '🚔' },
  { value: 'rescue', label: 'Rescue Operation', icon: '🚁' },
  { value: 'shelter', label: 'Shelter Needed', icon: '🏠' },
  { value: 'supplies', label: 'Emergency Supplies', icon: '📦' },
  { value: 'other', label: 'Other Emergency', icon: '⚠️' }
]

const severityLevels = [
  { value: 'low', label: 'Low', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'medium', label: 'Medium', color: 'bg-orange-100 text-orange-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-900' }
]

export function OfflineEmergencyPage() {
  const { queueOfflineAction, getQueuedActions } = useOfflineActions()
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium' as const,
    description: '',
    location: '',
    contact: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queuedReports, setQueuedReports] = useState<EmergencyReport[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.type || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const report: EmergencyReport = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: formData.type,
        severity: formData.severity,
        description: formData.description,
        location: formData.location,
        contact: formData.contact,
        timestamp: Date.now(),
        synced: false
      }

      // Queue for offline sync
      await queueOfflineAction({
        type: 'emergency_report',
        data: report,
        endpoint: '/api/emergencies',
        method: 'POST'
      })

      // Update local state
      setQueuedReports(prev => [report, ...prev])

      // Reset form
      setFormData({
        type: '',
        severity: 'medium',
        description: '',
        location: '',
        contact: ''
      })

      alert('Emergency report saved offline. It will be sent when you reconnect.')
    } catch (error) {
      console.error('Failed to save emergency report:', error)
      alert('Failed to save emergency report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadQueuedReports = async () => {
    try {
      const actions = await getQueuedActions()
      const reports = actions
        .filter((action: any) => action.table === 'emergency_events' && action.type === 'create')
        .map((action: any) => action.data as EmergencyReport)
      setQueuedReports(reports)
    } catch (error) {
      console.error('Failed to load queued reports:', error)
    }
  }

  useEffect(() => {
    loadQueuedReports()
  }, [])

  const getEmergencyTypeIcon = (type: string) => {
    const emergencyType = emergencyTypes.find(t => t.value === type)
    return emergencyType?.icon || '⚠️'
  }

  const getSeverityColor = (severity: string) => {
    const level = severityLevels.find(l => l.value === severity)
    return level?.color || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <WifiOffIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Emergency Mode (Offline)
          </h1>
          <p className="text-gray-600">
            Report emergencies even without internet connection. Reports will sync automatically when you're back online.
          </p>
        </div>

        {/* Emergency Report Form */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Report Emergency
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Emergency Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Type *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {emergencyTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`p-3 text-center rounded-lg border-2 transition-colors ${formData.type === type.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <div className="flex flex-wrap gap-2">
                {severityLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, severity: level.value as any }))}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${formData.severity === level.value
                      ? level.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Describe the emergency situation..."
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter location or address..."
              />
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Contact Information
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Phone number or email..."
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !formData.type || !formData.description}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Saving Offline...
                </>
              ) : (
                <>
                  <AlertTriangleIcon className="h-4 w-4 mr-2" />
                  Save Emergency Report (Offline)
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Queued Reports */}
        {queuedReports.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Queued Emergency Reports ({queuedReports.length})
            </h3>
            <div className="space-y-3">
              {queuedReports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getEmergencyTypeIcon(report.type)}</span>
                        <span className="font-medium text-gray-900">
                          {emergencyTypes.find(t => t.value === report.type)?.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                          {report.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                      {report.location && (
                        <p className="text-gray-500 text-xs mb-1">
                          <MapPinIcon className="inline h-3 w-3 mr-1" />
                          {report.location}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs">
                        <ClockIcon className="inline h-3 w-3 mr-1" />
                        {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Queued
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  These reports will be automatically sent when you regain internet connection.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Emergency Contacts */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Emergency Contacts (Cached)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <PhoneIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-medium">Emergency Services</div>
                <div className="text-sm text-gray-600">Call 911</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <PhoneIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Local Hospital</div>
                <div className="text-sm text-gray-600">Call 555-0123</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}