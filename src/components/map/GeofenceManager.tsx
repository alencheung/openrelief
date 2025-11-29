'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Shield, AlertTriangle, Plus, Trash2, Edit, Save, X, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationStore, useEmergencyStore } from '@/store'
import { Geofence, LocationPoint } from '@/types'

interface GeofenceManagerProps {
  className?: string
  mapInstance?: any // MapLibre GL map instance
  onGeofenceCreate?: (geofence: Geofence) => void
  onGeofenceUpdate?: (geofenceId: string, updates: Partial<Geofence>) => void
  onGeofenceDelete?: (geofenceId: string) => void
  onGeofenceEnter?: (geofence: Geofence) => void
  onGeofenceExit?: (geofence: Geofence) => void
}

interface GeofenceFormData {
  name: string
  type: Geofence['type']
  center: { lat: number; lng: number }
  radius: number
  isActive: boolean
  description?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  expiresAt?: Date
}

const geofenceTypes = [
  { value: 'emergency', label: 'Emergency Zone', color: '#ff4444', icon: '🚨' },
  { value: 'safe_zone', label: 'Safe Zone', color: '#44ff44', icon: '🛡️' },
  { value: 'restricted', label: 'Restricted Area', color: '#ffaa00', icon: '🚫' },
  { value: 'custom', label: 'Custom Zone', color: '#888888', icon: '📍' },
]

const severityLevels = [
  { value: 'low', label: 'Low', color: '#44ff44' },
  { value: 'medium', label: 'Medium', color: '#ffaa00' },
  { value: 'high', label: 'High', color: '#ff8800' },
  { value: 'critical', label: 'Critical', color: '#ff0000' },
]

export default function GeofenceManager({
  className,
  mapInstance,
  onGeofenceCreate,
  onGeofenceUpdate,
  onGeofenceDelete,
  onGeofenceEnter,
  onGeofenceExit,
}: GeofenceManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: '',
    type: 'emergency',
    center: { lat: 0, lng: 0 },
    radius: 500,
    isActive: true,
    description: '',
    severity: 'medium',
  })
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const {
    geofences,
    activeGeofences,
    addGeofence,
    removeGeofence,
    updateGeofence,
    toggleGeofence,
    checkGeofences,
    geofenceHistory,
  } = useLocationStore()

  const { currentLocation } = useLocationStore()

  // Initialize form with current location
  useEffect(() => {
    if (currentLocation && !formData.center.lat && !formData.center.lng) {
      setFormData(prev => ({
        ...prev,
        center: { lat: currentLocation.lat, lng: currentLocation.lng },
      }))
    }
  }, [currentLocation, formData.center.lat, formData.center.lng])

  // Handle location selection on map
  const handleLocationSelect = () => {
    if (!mapInstance) return

    setIsSelectingLocation(true)
    mapInstance.getCanvas().style.cursor = 'crosshair'

    const handleMapClick = (e: any) => {
      const coords = e.lngLat
      setFormData(prev => ({
        ...prev,
        center: { lat: coords.lat, lng: coords.lng },
      }))
      mapInstance.getCanvas().style.cursor = ''
      mapInstance.off('click', handleMapClick)
      setIsSelectingLocation(false)
    }

    mapInstance.on('click', handleMapClick)
  }

  // Start creating new geofence
  const startCreating = () => {
    setFormData({
      name: '',
      type: 'emergency',
      center: currentLocation || { lat: 0, lng: 0 },
      radius: 500,
      isActive: true,
      description: '',
      severity: 'medium',
    })
    setEditingId(null)
    setShowForm(true)
    setIsCreating(true)
  }

  // Start editing existing geofence
  const startEditing = (geofence: Geofence) => {
    setFormData({
      name: geofence.name,
      type: geofence.type,
      center: geofence.center,
      radius: geofence.radius,
      isActive: geofence.isActive,
      description: geofence.metadata?.description,
      severity: geofence.metadata?.severity || 'medium',
      expiresAt: geofence.expiresAt,
    })
    setEditingId(geofence.id)
    setShowForm(true)
    setIsCreating(false)
  }

  // Save geofence
  const saveGeofence = () => {
    if (!formData.name.trim()) {
      alert('Please enter a geofence name')
      return
    }

    const geofenceData = {
      name: formData.name.trim(),
      type: formData.type,
      center: formData.center,
      radius: formData.radius,
      isActive: formData.isActive,
      metadata: {
        description: formData.description,
        severity: formData.severity,
        createdBy: 'current-user', // Would come from auth
      },
      expiresAt: formData.expiresAt,
    }

    if (isCreating) {
      const id = addGeofence(geofenceData)
      onGeofenceCreate?.({ ...geofenceData, id, createdAt: new Date() })
    } else if (editingId) {
      updateGeofence(editingId, geofenceData)
      onGeofenceUpdate?.(editingId, geofenceData)
    }

    resetForm()
  }

  // Delete geofence
  const deleteGeofence = (geofenceId: string) => {
    if (confirm('Are you sure you want to delete this geofence?')) {
      removeGeofence(geofenceId)
      onGeofenceDelete?.(geofenceId)
    }
  }

  // Reset form
  const resetForm = () => {
    setShowForm(false)
    setIsCreating(false)
    setEditingId(null)
    setIsSelectingLocation(false)
    setFormData({
      name: '',
      type: 'emergency',
      center: { lat: 0, lng: 0 },
      radius: 500,
      isActive: true,
      description: '',
      severity: 'medium',
    })
  }

  // Toggle geofence active state
  const handleToggleGeofence = (geofenceId: string) => {
    toggleGeofence(geofenceId)
    const geofence = geofences.find(g => g.id === geofenceId)
    if (geofence) {
      if (geofence.isActive) {
        onGeofenceEnter?.(geofence)
      } else {
        onGeofenceExit?.(geofence)
      }
    }
  }

  // Get geofence type info
  const getGeofenceTypeInfo = (type: Geofence['type']) => {
    return geofenceTypes.find(t => t.value === type) || geofenceTypes[0]
  }

  // Get severity info
  const getSeverityInfo = (severity: string) => {
    return severityLevels.find(s => s.value === severity) || severityLevels[1]
  }

  // Format radius
  const formatRadius = (radius: number) => {
    if (radius < 1000) {
      return `${radius}m`
    }
    return `${(radius / 1000).toFixed(1)}km`
  }

  return (
    <div className={cn('geofence-manager', className)}>
      {/* Geofence List */}
      <div className="bg-white rounded-lg shadow-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Geofence Zones</h3>
          <button
            onClick={startCreating}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Zone</span>
          </button>
        </div>

        <div className="divide-y max-h-96 overflow-y-auto">
          {geofences.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No geofences created</p>
              <p className="text-xs text-gray-500 mt-1">
                Create zones for emergency areas, safe zones, or restricted areas
              </p>
            </div>
          ) : (
            geofences.map((geofence) => {
              const typeInfo = getGeofenceTypeInfo(geofence.type)
              const isActive = activeGeofences.includes(geofence.id)

              return (
                <div key={geofence.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{typeInfo.icon}</span>
                        <h4 className="font-medium text-gray-900">{geofence.name}</h4>
                        {geofence.isActive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      
                      {geofence.metadata?.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {geofence.metadata.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className={cn('font-medium', typeInfo.color.replace('#', 'text-'))}>
                          {typeInfo.label}
                        </span>
                        <span>Radius: {formatRadius(geofence.radius)}</span>
                        {geofence.metadata?.severity && (
                          <span className={cn(
                            'font-medium',
                            getSeverityInfo(geofence.metadata.severity).color.replace('#', 'text-')
                          )}>
                            {geofence.metadata.severity}
                          </span>
                        )}
                        {geofence.expiresAt && (
                          <span>
                            Expires: {new Date(geofence.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        {geofence.center.lat.toFixed(4)}, {geofence.center.lng.toFixed(4)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => handleToggleGeofence(geofence.id)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isActive
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                        title={isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Radio className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEditing(geofence)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGeofence(geofence.id)}
                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Geofence Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {isCreating ? 'Create Geofence' : 'Edit Geofence'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter geofence name"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {geofenceTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as Geofence['type'] }))}
                      className={cn(
                        'p-2 rounded-lg border-2 transition-all text-left',
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Center Location
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={`${formData.center.lat.toFixed(6)}, ${formData.center.lng.toFixed(6)}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={handleLocationSelect}
                    className={cn(
                      'px-3 py-2 rounded-lg transition-colors text-sm',
                      isSelectingLocation
                        ? 'bg-yellow-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <MapPin className="h-4 w-4" />
                    {isSelectingLocation ? 'Selecting...' : 'Select on Map'}
                  </button>
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius: {formatRadius(formData.radius)}
                </label>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={formData.radius}
                  onChange={(e) => setFormData(prev => ({ ...prev, radius: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {severityLevels.map((severity) => (
                    <button
                      key={severity.value}
                      onClick={() => setFormData(prev => ({ ...prev, severity: severity.value as any }))}
                      className={cn(
                        'p-2 rounded-lg border-2 transition-all text-xs font-medium',
                        formData.severity === severity.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {severity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description of this geofence"
                />
              </div>

              {/* Active */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Activate immediately
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveGeofence}
                disabled={!formData.name.trim()}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
                  formData.name.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                <Save className="h-4 w-4" />
                <span>{isCreating ? 'Create' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geofence History */}
      {geofenceHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg border mt-4">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {geofenceHistory.slice(0, 10).map((entry, index) => {
              const geofence = geofences.find(g => g.id === entry.geofenceId)
              const typeInfo = geofence ? getGeofenceTypeInfo(geofence.type) : null

              return (
                <div key={index} className="p-3 text-sm">
                  <div className="flex items-center space-x-2">
                    {typeInfo && <span>{typeInfo.icon}</span>}
                    <span className="font-medium text-gray-900">
                      {geofence?.name || 'Unknown Geofence'}
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      entry.action === 'enter' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {entry.action === 'enter' ? 'Entered' : 'Exited'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}