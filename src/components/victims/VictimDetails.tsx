'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  User,
  AlertCircle,
  Edit,
  Trash2,
  Printer,
  Share2,
  CheckCircle,
  Heart,
  HelpCircle,
  FileText,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { Victim, VictimStatus, VictimCheckIn, Injury } from '@/types/victim'

interface VictimDetailsProps {
  victim: Victim
  checkIns?: VictimCheckIn[]
  onClose?: () => void
  onEdit?: (victim: Victim) => void
  onDelete?: (victimId: string) => void
  onStatusUpdate?: (victimId: string, status: VictimStatus) => void
  className?: string
}

const statusConfig: Record<VictimStatus, { color: string; bgColor: string; label: string }> = {
  safe: { color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950', label: 'Safe' },
  injured: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    label: 'Injured'
  },
  trapped: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    label: 'Trapped'
  },
  missing: { color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950', label: 'Missing' },
  deceased: { color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-950', label: 'Deceased' },
  unknown: { color: 'text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950', label: 'Unknown' }
}

const injurySeverityConfig: Record<Injury['severity'], { color: string; label: string }> = {
  minor: { color: 'bg-blue-100 text-blue-800', label: 'Minor' },
  moderate: { color: 'bg-yellow-100 text-yellow-800', label: 'Moderate' },
  severe: { color: 'bg-orange-100 text-orange-800', label: 'Severe' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Critical' }
}

export const VictimDetails = React.forwardRef<HTMLDivElement, VictimDetailsProps>(
  ({ victim, checkIns = [], onClose, onEdit, onDelete, onStatusUpdate, className }, ref) => {
    const [isEditing, setIsEditing] = useState(false)
    const statusInfo = statusConfig[victim.status]

    const handlePrint = () => {
      window.print()
    }

    const handleShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Victim: ${victim.name}`,
            text: `Status: ${victim.status}. Last check-in: ${victim.lastCheckIn ? formatRelativeTime(victim.lastCheckIn) : 'N/A'}`,
            url: window.location.href
          })
        } catch (error) {
          console.error('Error sharing:', error)
        }
      }
    }

    return (
      <div ref={ref} className={cn('fixed inset-0 z-50 overflow-y-auto', className)}>
        <div className="min-h-screen px-4 py-8 flex items-start justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-background rounded-lg shadow-xl"
          >
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  <h2 className="text-xl font-bold">{victim.name}</h2>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {onEdit && (
                    <Button size="sm" variant="outline" onClick={() => onEdit(victim)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button size="sm" variant="destructive" onClick={() => onDelete(victim.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {onClose && (
                    <Button size="sm" variant="ghost" onClick={onClose}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                      <span className="font-medium">{victim.age}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="font-medium capitalize">{victim.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant="outline">{victim.priority}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reporter ID:</span>
                      <span className="font-mono text-sm">{victim.reporterId}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {victim.contactInfo?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${victim.contactInfo.phone}`} className="hover:underline">
                          {victim.contactInfo.phone}
                        </a>
                      </div>
                    )}
                    {victim.contactInfo?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${victim.contactInfo.email}`} className="hover:underline">
                          {victim.contactInfo.email}
                        </a>
                      </div>
                    )}
                    {victim.emergencyContact && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Emergency Contact:</p>
                        <p className="text-sm">
                          {victim.emergencyContact.name} ({victim.emergencyContact.relationship})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {victim.emergencyContact.phone}
                        </p>
                      </div>
                    )}
                    {!victim.contactInfo?.phone &&
                      !victim.contactInfo?.email &&
                      !victim.emergencyContact && (
                        <p className="text-muted-foreground text-sm">
                          No contact information available
                        </p>
                      )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {victim.location ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          {victim.location.address ||
                            `${victim.location.lat.toFixed(6)}, ${victim.location.lng.toFixed(6)}`}
                        </p>
                        <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          Map placeholder
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No location information</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Injuries ({victim.injuries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {victim.injuries.length > 0 ? (
                      <div className="space-y-2">
                        {victim.injuries.map((injury, index) => (
                          <div key={index} className="p-2 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{injury.type}</span>
                              <Badge className={injurySeverityConfig[injury.severity].color}>
                                {injurySeverityConfig[injury.severity].label}
                              </Badge>
                            </div>
                            {injury.description && (
                              <p className="text-xs text-muted-foreground">{injury.description}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              {injury.treated ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-orange-600" />
                              )}
                              <span className="text-xs">
                                {injury.treated ? 'Treated' : 'Untreated'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No injuries reported</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {victim.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{victim.notes}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Check-In History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {checkIns.length > 0 ? (
                    <div className="space-y-3">
                      {checkIns.map((checkIn, index) => {
                        const checkInStatusInfo = statusConfig[checkIn.status]
                        return (
                          <motion.div
                            key={checkIn.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                          >
                            <div className={cn('p-2 rounded-full', checkInStatusInfo.bgColor)}>
                              <CheckCircle className={cn('w-4 h-4', checkInStatusInfo.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <Badge className={checkInStatusInfo.color}>
                                  {checkInStatusInfo.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(checkIn.timestamp)}
                                </span>
                              </div>
                              {checkIn.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {checkIn.location.address ||
                                    `${checkIn.location.lat.toFixed(4)}, ${checkIn.location.lng.toFixed(4)}`}
                                </p>
                              )}
                              {checkIn.notes && <p className="text-sm mt-1">{checkIn.notes}</p>}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No check-in history available</p>
                  )}
                </CardContent>
              </Card>

              {onStatusUpdate && victim.status !== 'deceased' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Update Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['safe', 'injured', 'trapped', 'missing'] as VictimStatus[]).map(status => {
                        const info = statusConfig[status]
                        return (
                          <Button
                            key={status}
                            variant={victim.status === status ? 'default' : 'outline'}
                            onClick={() => onStatusUpdate(victim.id, status)}
                            className="w-full"
                          >
                            {info.label}
                          </Button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDate(victim.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{formatDate(victim.updatedAt)}</span>
                    </div>
                    {victim.lastCheckIn && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Check-In:</span>
                        <span>{formatRelativeTime(victim.lastCheckIn)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }
)

VictimDetails.displayName = 'VictimDetails'
