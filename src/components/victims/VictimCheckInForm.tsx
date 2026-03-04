'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, FileText, Camera, Bell, CheckCircle, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { VictimStatus, VictimCheckIn, Location } from '@/types/victim'

interface VictimCheckInFormProps {
  victimId: string
  onCheckIn: (checkIn: Omit<VictimCheckIn, 'id' | 'timestamp' | 'reporterId'>) => void
  onCancel?: () => void
  className?: string
}

const statusOptions: Array<{ value: VictimStatus; label: string; color: string }> = [
  {
    value: 'safe',
    label: 'Safe',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  {
    value: 'injured',
    label: 'Injured',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  },
  {
    value: 'trapped',
    label: 'Trapped',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  },
  {
    value: 'missing',
    label: 'Missing',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }
]

export const VictimCheckInForm = React.forwardRef<HTMLDivElement, VictimCheckInFormProps>(
  ({ victimId, onCheckIn, onCancel, className }, ref) => {
    const [status, setStatus] = useState<VictimStatus>('safe')
    const [location, setLocation] = useState<Location | undefined>()
    const [notes, setNotes] = useState('')
    const [notifyContact, setNotifyContact] = useState(true)
    const [isGettingLocation, setIsGettingLocation] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleGetLocation = () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser')
        return
      }

      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setIsGettingLocation(false)
        },
        error => {
          console.error('Error getting location:', error)
          alert('Unable to retrieve your location')
          setIsGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)

      try {
        await onCheckIn({
          victimId,
          status,
          location,
          notes: notes.trim() || undefined
        })
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div ref={ref} className={cn('w-full max-w-lg mx-auto', className)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Victim Check-In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-3 block">Current Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map(option => (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all text-sm font-medium',
                        status === option.value
                          ? 'border-primary ring-2 ring-primary ring-opacity-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Badge className={cn(option.color, 'w-full justify-center')}>
                        {option.label}
                      </Badge>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Current Location (Optional)
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="flex-1"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Get GPS Location
                      </>
                    )}
                  </Button>
                </div>
                {location && (
                  <div className="mt-2 p-2 bg-muted rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add any additional information..."
                    className="w-full min-h-[100px] pl-10 pr-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    rows={4}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="notifyContact"
                    checked={notifyContact}
                    onChange={e => setNotifyContact(e.target.checked)}
                    className="mt-1 w-4 h-4"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="notifyContact"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Notify Emergency Contact
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a notification to the victim's emergency contact about this check-in
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-dashed rounded-lg text-muted-foreground">
                <Camera className="w-5 h-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Photo Upload</p>
                  <p className="text-xs">Coming soon - capture or upload photos</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Check-In
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }
)

VictimCheckInForm.displayName = 'VictimCheckInForm'
