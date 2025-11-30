'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, Crosshair, Activity, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationStore, useEmergencyStore } from '@/store'
import { LocationPoint, Geofence } from '@/types'

interface LocationTrackerProps {
  className?: string
  onLocationUpdate?: (location: LocationPoint) => void
  onGeofenceEnter?: (geofence: Geofence) => void
  onGeofenceExit?: (geofence: Geofence) => void
  onProximityAlert?: (alert: any) => void
  enableHighAccuracy?: boolean
  updateInterval?: number
  showAccuracy?: boolean
  showTrail?: boolean
  maxTrailPoints?: number
}

export default function LocationTracker({
  className,
  onLocationUpdate,
  onGeofenceEnter,
  onGeofenceExit,
  onProximityAlert,
  enableHighAccuracy = true,
  updateInterval = 5000,
  showAccuracy = true,
  showTrail = false,
  maxTrailPoints = 100,
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [trackingStats, setTrackingStats] = useState({
    accuracy: 0,
    speed: 0,
    heading: 0,
    altitude: 0,
    satelliteCount: 0,
  })

  const watchIdRef = useRef<number | null>(null)
  const lastLocationRef = useRef<LocationPoint | null>(null)
  const trailPointsRef = useRef<LocationPoint[]>([])

  const {
    currentLocation,
    setCurrentLocation,
    startTracking,
    stopTracking,
    requestLocationPermission,
    locationPermission,
    isTracking: isLocationTracking,
    geofences,
    proximityAlerts,
    addGeofence,
    checkGeofences,
    addProximityAlert,
  } = useLocationStore()

  const { events, filteredEvents } = useEmergencyStore()

  // Calculate tracking statistics
  const calculateStats = useCallback((location: LocationPoint) => {
    const stats = {
      accuracy: location.accuracy || 0,
      speed: location.speed || 0,
      heading: location.heading || 0,
      altitude: location.altitude || 0,
      satelliteCount: 0, // This would need GPS hardware access
    }

    // Calculate speed if not provided
    if (!location.speed && lastLocationRef.current && location.timestamp > lastLocationRef.current.timestamp) {
      const timeDiff = (location.timestamp - lastLocationRef.current.timestamp) / 1000 // seconds
      const distance = calculateDistance(lastLocationRef.current, location) // meters
      stats.speed = distance / timeDiff // m/s
    }

    setTrackingStats(stats)
    return stats
  }, [])

  // Calculate distance between two points
  const calculateDistance = useCallback((point1: LocationPoint, point2: LocationPoint): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180
    const φ2 = (point2.lat * Math.PI) / 180
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }, [])

  // Check proximity to emergency events
  const checkEmergencyProximity = useCallback((location: LocationPoint) => {
    const proximityThreshold = 1000 // 1km

    filteredEvents.forEach(event => {
      const eventLocation = {
        lat: parseFloat((event.location || '0 0').split(' ')[0] || '0'),
        lng: parseFloat((event.location || '0 0').split(' ')[1] || '0'),
      }

      const distance = calculateDistance(location, {
        lat: eventLocation.lat,
        lng: eventLocation.lng,
        timestamp: Date.now(),
      })

      if (distance <= proximityThreshold) {
        addProximityAlert({
          type: 'event_proximity',
          targetId: event.id,
          targetType: 'event',
          distance,
          threshold: proximityThreshold,
          message: `Near emergency: ${event.title} (${Math.round(distance)}m away)`,
          severity: event.severity >= 4 ? 'critical' :
            event.severity >= 3 ? 'warning' : 'info',
        })

        onProximityAlert?.({
          event,
          distance,
          severity: event.severity,
        })
      }
    })
  }, [filteredEvents, calculateDistance, addProximityAlert, onProximityAlert])

  // Handle location update
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const location: LocationPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      ...(position.coords.altitude ? { altitude: position.coords.altitude } : {}),
      ...(position.coords.altitudeAccuracy ? { altitudeAccuracy: position.coords.altitudeAccuracy } : {}),
      ...(position.coords.heading ? { heading: position.coords.heading } : {}),
      ...(position.coords.speed ? { speed: position.coords.speed } : {}),
    }

    // Update trail if enabled
    if (showTrail) {
      trailPointsRef.current.push(location)
      if (trailPointsRef.current.length > maxTrailPoints) {
        trailPointsRef.current.shift()
      }
    }

    // Calculate statistics
    calculateStats(location)

    // Update store
    setCurrentLocation(location)

    // Check geofences
    checkGeofences(location)

    // Check emergency proximity
    checkEmergencyProximity(location)

    // Callback
    onLocationUpdate?.(location)

    // Update last location
    lastLocationRef.current = location

    // Clear any previous errors
    setLocationError(null)
  }, [
    setCurrentLocation,
    checkGeofences,
    checkEmergencyProximity,
    calculateStats,
    onLocationUpdate,
    showTrail,
    maxTrailPoints,
  ])

  // Handle location error
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error'

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.'
        break
      default:
        errorMessage = `Location error: ${error.message}`
    }

    setLocationError(errorMessage)
    console.error('Location tracking error:', error)
  }, [])

  // Start tracking
  const startLocationTracking = useCallback(async () => {
    try {
      // Request permission first
      const permission = await requestLocationPermission(enableHighAccuracy)
      if (!permission.granted) {
        setLocationError('Location permission not granted')
        return
      }

      // Start watching position
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationUpdate,
          handleLocationError,
          {
            enableHighAccuracy,
            timeout: 15000,
            maximumAge: updateInterval,
          }
        )

        setIsTracking(true)
        startTracking('emergency_response', {
          highAccuracy: enableHighAccuracy,
          updateInterval,
        })
      }
    } catch (error) {
      setLocationError(`Failed to start tracking: ${error}`)
      console.error('Failed to start location tracking:', error)
    }
  }, [
    enableHighAccuracy,
    updateInterval,
    handleLocationUpdate,
    handleLocationError,
    requestLocationPermission,
    startTracking,
  ])

  // Stop tracking
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setIsTracking(false)
    stopTracking()
    trailPointsRef.current = []
  }, [stopTracking])

  // Get current position once
  const getCurrentPosition = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        handleLocationUpdate,
        handleLocationError,
        {
          enableHighAccuracy,
          timeout: 10000,
          maximumAge: 60000, // 1 minute
        }
      )
    }
  }, [enableHighAccuracy, handleLocationUpdate, handleLocationError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Auto-start tracking if already enabled in store
  useEffect(() => {
    if (isLocationTracking && !isTracking) {
      startLocationTracking()
    } else if (!isLocationTracking && isTracking) {
      stopLocationTracking()
    }
  }, [isLocationTracking, isTracking, startLocationTracking, stopLocationTracking])

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 10) return 'text-green-500'
    if (accuracy < 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getAccuracyText = (accuracy: number) => {
    if (accuracy < 10) return 'Excellent'
    if (accuracy < 50) return 'Good'
    if (accuracy < 100) return 'Fair'
    return 'Poor'
  }

  return (
    <div className={cn('location-tracker', className)}>
      {/* Location Status */}
      <div className="bg-white rounded-lg shadow-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Location Tracking</h3>
          <div className="flex items-center space-x-2">
            {isTracking && (
              <div className="flex items-center space-x-1">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm text-green-600">Active</span>
              </div>
            )}
            {locationPermission.granted && (
              <Shield className="h-4 w-4 text-blue-500" />
            )}
          </div>
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Navigation className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Current Location
                </div>
                <div className="text-xs text-gray-500">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>

            {/* Accuracy */}
            {showAccuracy && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accuracy:</span>
                <div className="flex items-center space-x-2">
                  <span className={cn('text-sm font-medium', getAccuracyColor(trackingStats.accuracy))}>
                    {getAccuracyText(trackingStats.accuracy)}
                  </span>
                  <span className="text-xs text-gray-500">
                    (±{Math.round(trackingStats.accuracy)}m)
                  </span>
                </div>
              </div>
            )}

            {/* Speed */}
            {trackingStats.speed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Speed:</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(trackingStats.speed * 3.6)} km/h
                </span>
              </div>
            )}

            {/* Heading */}
            {trackingStats.heading !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Heading:</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(trackingStats.heading)}°
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {locationError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{locationError}</span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center space-x-2 mt-4">
          {!isTracking ? (
            <button
              onClick={startLocationTracking}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              <span>Start Tracking</span>
            </button>
          ) : (
            <button
              onClick={stopLocationTracking}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>Stop Tracking</span>
            </button>
          )}

          <button
            onClick={getCurrentPosition}
            className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Get current position"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* Proximity Alerts */}
        {proximityAlerts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-gray-900 mb-2">Proximity Alerts</div>
            <div className="space-y-1">
              {proximityAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center space-x-2 text-xs">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    alert.severity === 'critical' ? 'bg-red-500' :
                      alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  )} />
                  <span className="text-gray-600">{alert.message}</span>
                </div>
              ))}
              {proximityAlerts.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{proximityAlerts.length - 3} more alerts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Geofences */}
        {geofences.filter(g => g.isActive).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-gray-900 mb-2">Active Geofences</div>
            <div className="space-y-1">
              {geofences.filter(g => g.isActive).slice(0, 3).map((geofence) => (
                <div key={geofence.id} className="flex items-center space-x-2 text-xs">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    geofence.type === 'emergency' ? 'bg-red-500' :
                      geofence.type === 'safe_zone' ? 'bg-green-500' :
                        geofence.type === 'restricted' ? 'bg-orange-500' : 'bg-gray-500'
                  )} />
                  <span className="text-gray-600">{geofence.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}