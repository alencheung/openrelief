'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, Crosshair, Activity, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationStore, useEmergencyStore } from '@/store'
import { LocationPoint, Geofence } from '@/types'
import { usePrivacy } from '@/hooks/usePrivacy'

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
  maxTrailPoints = 100
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [trackingStats, setTrackingStats] = useState({
    accuracy: 0,
    speed: 0,
    heading: 0,
    altitude: 0,
    satelliteCount: 0
  })
  const [showPreciseLocation, setShowPreciseLocation] = useState(true)
  const [privacyInfo, setPrivacyInfo] = useState<{
    isAnonymized: boolean;
    hasDifferentialPrivacy: boolean;
    privacyBudgetUsed: number;
  }>({
    isAnonymized: false,
    hasDifferentialPrivacy: false,
    privacyBudgetUsed: 0
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
    addProximityAlert
  } = useLocationStore()

  const { events, filteredEvents } = useEmergencyStore()

  // Privacy hook for location protection
  const {
    protectLocationData,
    privacyContext,
    assessPrivacyImpact
  } = usePrivacy({
    userId: 'current-user', // Would come from auth context
    enableLogging: true
  })

  // Calculate tracking statistics
  const calculateStats = useCallback((location: LocationPoint) => {
    const stats = {
      accuracy: location.accuracy || 0,
      speed: location.speed || 0,
      heading: location.heading || 0,
      altitude: location.altitude || 0,
      satelliteCount: 0 // This would need GPS hardware access
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

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
      + Math.cos(φ1) * Math.cos(φ2)
      * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }, [])

  // Check proximity to emergency events
  const checkEmergencyProximity = useCallback((location: LocationPoint) => {
    const proximityThreshold = 1000 // 1km

    filteredEvents.forEach(event => {
      // Log to validate coordinate parsing order
      console.log('Debug: Raw event location:', event.location)
      const locationParts = (event.location || '0 0').split(' ')
      console.log('Debug: Location parts:', locationParts)

      // FIXED: Verify correct coordinate order - typically format is "lng lat" in many systems
      // but we're assuming "lat lng". Adding validation to detect issues.
      let lat = parseFloat(locationParts[0] || '0')
      let lng = parseFloat(locationParts[1] || '0')

      // Validate coordinate ranges to detect potential order issues
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        console.warn('Debug: Invalid coordinate ranges detected - possible order issue:', { lat, lng, rawLocation: event.location })
        // Try swapping as fallback
        const tempLat = lat
        lat = parseFloat(locationParts[1] || '0')
        lng = parseFloat(locationParts[0] || '0')
        console.log('Debug: Using swapped coordinates:', { lat, lng })
      } else {
        console.log('Debug: Using parsed coordinates:', { lat, lng })
      }

      const eventLocation = {
        lat,
        lng
      }

      const distance = calculateDistance(location, {
        lat: eventLocation.lat,
        lng: eventLocation.lng,
        timestamp: Date.now()
      })

      if (distance <= proximityThreshold) {
        addProximityAlert({
          type: 'event_proximity',
          targetId: event.id,
          targetType: 'event',
          distance,
          threshold: proximityThreshold,
          message: `Near emergency: ${event.title} (${Math.round(distance)}m away)`,
          severity: event.severity >= 4 ? 'critical'
            : event.severity >= 3 ? 'warning' : 'info'
        })

        onProximityAlert?.({
          event,
          distance,
          severity: event.severity
        })
      }
    })
  }, [filteredEvents, calculateDistance, addProximityAlert, onProximityAlert])

  // Handle location update with privacy protection
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const rawLocation: LocationPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      ...(position.coords.altitude ? { altitude: position.coords.altitude } : {}),
      ...(position.coords.altitudeAccuracy ? { altitudeAccuracy: position.coords.altitudeAccuracy } : {}),
      ...(position.coords.heading ? { heading: position.coords.heading } : {}),
      ...(position.coords.speed ? { speed: position.coords.speed } : {})
    }

    // Apply privacy protection to location data
    const protectedLocation = protectLocationData(rawLocation, {
      applyDifferentialPrivacy: privacyContext.settings.differentialPrivacy,
      applyAnonymization: privacyContext.settings.anonymizeData,
      precisionLevel: privacyContext.settings.locationPrecision
    })

    // Update privacy info for UI display
    setPrivacyInfo({
      isAnonymized: protectedLocation.isAnonymized,
      hasDifferentialPrivacy: protectedLocation.hasDifferentialPrivacy,
      privacyBudgetUsed: protectedLocation.privacyBudgetUsed
    })

    // Use protected location for further processing
    const location = showPreciseLocation ? rawLocation : protectedLocation.data

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
    maxTrailPoints
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
      console.log('Debug: Starting location tracking with high accuracy:', enableHighAccuracy)

      // FIXED: Enhanced iOS permission handling
      // First check if we're on iOS and need special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      console.log('Debug: Device detected as iOS:', isIOS)

      // Request permission first with iOS-specific handling
      let permission
      if (isIOS) {
        console.log('Debug: Using iOS-specific permission request')
        // iOS requires explicit user gesture for high accuracy
        try {
          // First try with low accuracy to get basic permission
          const basicPermission = await requestLocationPermission(false)
          console.log('Debug: iOS basic permission result:', basicPermission)

          if (basicPermission.granted) {
            // Then request high accuracy if needed
            permission = await requestLocationPermission(enableHighAccuracy)
            console.log('Debug: iOS high accuracy permission result:', permission)
          } else {
            permission = basicPermission
          }
        } catch (iosError) {
          console.error('Debug: iOS permission error:', iosError)
          // Fallback to standard permission request
          permission = await requestLocationPermission(enableHighAccuracy)
        }
      } else {
        permission = await requestLocationPermission(enableHighAccuracy)
      }

      console.log('Debug: Final permission result:', permission)

      if (!permission.granted) {
        setLocationError('Location permission not granted')
        return
      }

      // Start watching position
      if ('geolocation' in navigator) {
        console.log('Debug: Starting geolocation watch')
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleLocationUpdate,
          handleLocationError,
          {
            enableHighAccuracy,
            timeout: 15000,
            maximumAge: updateInterval
          }
        )

        setIsTracking(true)
        startTracking('emergency_response', {
          highAccuracy: enableHighAccuracy,
          updateInterval
        })
        console.log('Debug: Location tracking started successfully')
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
    startTracking
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
          maximumAge: 60000 // 1 minute
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
    if (accuracy < 10) {
      return 'text-green-500'
    }
    if (accuracy < 50) {
      return 'text-yellow-500'
    }
    return 'text-red-500'
  }

  const getAccuracyText = (accuracy: number) => {
    if (accuracy < 10) {
      return 'Excellent'
    }
    if (accuracy < 50) {
      return 'Good'
    }
    if (accuracy < 100) {
      return 'Fair'
    }
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
            {/* Privacy indicators */}
            {privacyInfo.isAnonymized && (
              <div className="flex items-center space-x-1">
                <EyeOff className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-purple-600">Anonymized</span>
              </div>
            )}
            {privacyInfo.hasDifferentialPrivacy && (
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600">DP</span>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Controls */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Location Precision:</span>
            <button
              onClick={() => setShowPreciseLocation(!showPreciseLocation)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
            >
              {showPreciseLocation ? (
                <>
                  <Eye className="h-3 w-3" />
                  <span>Precise</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  <span>Protected</span>
                </>
              )}
            </button>
          </div>
          {privacyInfo.privacyBudgetUsed > 0 && (
            <div className="text-xs text-gray-600">
              Privacy Budget Used: {(privacyInfo.privacyBudgetUsed * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Navigation className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Current Location
                  {!showPreciseLocation && (
                    <span className="ml-2 text-xs text-purple-600">(Privacy Protected)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  {!showPreciseLocation && (
                    <span className="ml-2 text-xs text-gray-400">
                      (±{Math.max(100, privacyContext.settings.locationPrecision * 100)}m accuracy)
                    </span>
                  )}
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
              disabled={!privacyContext.settings.locationSharing}
            >
              <Navigation className="h-4 w-4" />
              <span>
                {privacyContext.settings.locationSharing ? 'Start Tracking' : 'Location Sharing Disabled'}
              </span>
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
            disabled={!privacyContext.settings.locationSharing}
          >
            <Crosshair className="h-4 w-4" />
          </button>

          {/* Privacy Settings Link */}
          <button
            onClick={() => window.open('/privacy', '_blank')}
            className="flex items-center justify-center px-3 py-2 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
            title="Privacy Settings"
          >
            <Shield className="h-4 w-4 text-purple-500" />
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
                    alert.severity === 'critical' ? 'bg-red-500'
                      : alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
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
                    geofence.type === 'emergency' ? 'bg-red-500'
                      : geofence.type === 'safe_zone' ? 'bg-green-500'
                        : geofence.type === 'restricted' ? 'bg-orange-500' : 'bg-gray-500'
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