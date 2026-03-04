'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle,
  Heart,
  HelpCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import type { Victim, VictimStatus, VictimPriority } from '@/types/victim'

interface VictimStatusCardProps {
  victim: Victim
  onSelect?: (victim: Victim) => void
  onCheckIn?: (victim: Victim) => void
  className?: string
}

const statusConfig: Record<
  VictimStatus,
  { color: string; bgColor: string; icon: typeof CheckCircle; label: string }
> = {
  safe: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    icon: CheckCircle,
    label: 'Safe'
  },
  injured: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    icon: Heart,
    label: 'Injured'
  },
  trapped: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    icon: HelpCircle,
    label: 'Trapped'
  },
  missing: {
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    icon: AlertCircle,
    label: 'Missing'
  },
  deceased: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    icon: XCircle,
    label: 'Deceased'
  }
}

const priorityConfig: Record<VictimPriority, { color: string; label: string }> = {
  low: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Low' },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    label: 'Medium'
  },
  high: {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    label: 'High'
  },
  critical: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    label: 'Critical'
  }
}

export const VictimStatusCard = React.forwardRef<HTMLDivElement, VictimStatusCardProps>(
  ({ victim, onSelect, onCheckIn, className }, ref) => {
    const statusInfo = statusConfig[victim.status]
    const priorityInfo = priorityConfig[victim.priority]
    const StatusIcon = statusInfo.icon

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow', className)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn('p-2 rounded-full', statusInfo.bgColor)}>
                  <StatusIcon className={cn('w-5 h-5', statusInfo.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{victim.name}</h3>
                  <p className="text-sm text-muted-foreground">Age: {victim.age}</p>
                </div>
              </div>
              <Badge className={cn(priorityInfo.color, 'ml-2 shrink-0')}>
                {priorityInfo.label}
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
                {victim.injuries.length > 0 && (
                  <Badge variant="warning">
                    {victim.injuries.length} injur{victim.injuries.length > 1 ? 'ies' : 'y'}
                  </Badge>
                )}
              </div>

              {victim.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {victim.location.address ||
                      `${victim.location.lat.toFixed(4)}, ${victim.location.lng.toFixed(4)}`}
                  </span>
                </div>
              )}

              {victim.contactInfo?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{victim.contactInfo.phone}</span>
                </div>
              )}

              {victim.lastCheckIn && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Last check-in: {formatRelativeTime(victim.lastCheckIn)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheckIn?.(victim)}
                className="flex-1"
                aria-label={`Check in ${victim.name}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Check In
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => onSelect?.(victim)}
                className="flex-1"
                aria-label={`View details for ${victim.name}`}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }
)

VictimStatusCard.displayName = 'VictimStatusCard'
