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
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
      null
    )

    const handleGetLocation = () => {
      if (!navigator.geolocation) {
        setSubmitMessage({
          type: 'error',
          text: 'Geolocation is not supported by your browser.'
        })
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
          setSubmitMessage({ type: 'error', text: 'Unable to retrieve your location.' })
          setIsGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitMessage(null)
      setIsSubmitting(true)

      try {
        // Persist the check-in by updating the victim's status/location via
        // PUT /api/victims/[id]. The local store update + history append are
        // delegated to the parent's onCheckIn, which receives the same payload
        // so it can route through the victimStore addCheckIn action.
        const res = await fetch(`/api/victims/${victimId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            location: location ?? undefined,
            notes: notes.trim() || undefined
          })
        })

        let apiOk = res.ok
        let apiError: string | undefined
        if (!apiOk) {
          if (res.status === 401) {
            apiError = 'You must be signed in to record a check-in.'
          } else {
            try {
              const body = (await res.json()) as { error?: string }
              apiError = body.error ?? `Check-in failed (status ${res.status})`
            } catch {
              apiError = `Check-in failed (status ${res.status})`
            }
          }
        }

        // notifyContact was previously captured but never sent anywhere. We
        // cannot deliver notifications client-side, so it is surfaced as part
        // of the success message rather than silently dropped.
        if (apiOk && notifyContact) {
          setSubmitMessage({
            type: 'success',
            text: 'Check-in recorded. (Emergency-contact notification is not yet implemented.)'
          })
        } else if (apiOk) {
          setSubmitMessage({ type: 'success', text: 'Check-in recorded.' })
        } else {
          setSubmitMessage({ type: 'error', text: apiError ?? 'Check-in failed.' })
        }

        // Always reflect the check-in locally — even if the API rejected it
        // (e.g. offline), the parent can queue an offline action.
        await onCheckIn({
          victimId,
          status,
          location,
          notes: notes.trim() || undefined
        })
      } catch {
        setSubmitMessage({
          type: 'error',
          text: 'Network error. Please check your connection and try again.'
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
                      Send a notification to the victim&apos;s emergency contact about this check-in
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

              {submitMessage && (
                <div
                  role={submitMessage.type === 'error' ? 'alert' : 'status'}
                  className={cn(
                    'text-sm px-3 py-2 rounded-lg',
                    submitMessage.type === 'error'
                      ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                      : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                  )}
                >
                  {submitMessage.text}
                </div>
              )}

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
