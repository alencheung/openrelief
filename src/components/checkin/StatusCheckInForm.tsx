'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStatusCheckIn } from '@/hooks/useStatusCheckIn'
import { useAuth } from '@/store/authStore'
import { Shield, AlertTriangle, MapPinOff, MessageSquare } from 'lucide-react'
import type { SafetyStatus } from '@/types/checkin'

const STATUS_OPTIONS: Array<{ value: SafetyStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { value: 'safe', label: 'I am Safe', icon: Shield, color: 'text-green-600' },
  { value: 'need_help', label: 'Need Help', icon: AlertTriangle, color: 'text-red-600' },
  { value: 'not_in_area', label: 'Not in Area', icon: MapPinOff, color: 'text-gray-600' }
]

const StatusCheckInForm: React.FC<{ eventId?: string }> = ({ eventId }) => {
  const { createCheckIn } = useStatusCheckIn()
  const { user } = useAuth()
  const [status, setStatus] = useState<SafetyStatus>('safe')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      return
    }

    createCheckIn({
      userId: user.id,
      userName: user.email || 'Anonymous',
      status,
      message: message.trim() || undefined,
      isPublic,
      visibleToContacts: true,
      eventId
    })

    setSubmitted(true)
    setMessage('')
    setTimeout(() => setSubmitted(false), 3000)
  }

  if (!user) {
    return (
      <Card>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Sign in to submit a status check-in.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Check-In</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            Check-in submitted successfully.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                    status === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${option.color}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add details about your status..."
              className="w-full border rounded-lg p-2 text-sm min-h-[60px]"
              maxLength={500}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Share publicly with the community
          </label>

          <Button type="submit" className="w-full">
            Submit Check-In
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default StatusCheckInForm
