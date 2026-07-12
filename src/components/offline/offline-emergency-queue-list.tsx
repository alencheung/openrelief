/**
 * Offline Emergency Reporting - Queue List Component
 *
 * Presentational sub-component rendering the list of queued / synced offline
 * reports. Extracted from OfflineEmergencyReporting.tsx to keep the main
 * component module under the 500 line lint budget.
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, MapPin, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'
import { Badge } from '@/components/ui/Badge'
import type { OfflineReport, OfflineReportStatus } from './offline-emergency-types'
import { getStatusColor, normalizeEmergencyType } from './offline-emergency-helpers'

interface OfflineQueueListProps {
  reports: OfflineReport[]
}

// Map a report status to a lucide icon component.
const getStatusIcon = (
  status: OfflineReportStatus
): React.ComponentType<{ className?: string }> => {
  switch (status) {
    case 'synced':
      return CheckCircle
    case 'syncing':
      return RefreshCw
    case 'failed':
      return AlertTriangle
    default:
      return Clock
  }
}

export const OfflineQueueList: React.FC<OfflineQueueListProps> = ({ reports }) => {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No Offline Reports</p>
        <p className="text-sm">Emergency reports created while offline will appear here</p>
      </div>
    )
  }

  return (
    <>
      {reports.map((report, index) => {
        const StatusIcon = getStatusIcon(report.status)
        return (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <EmergencyIndicator
                    type={normalizeEmergencyType(report.type)}
                    label={report.type}
                    severity={undefined}
                    showSeverity
                  />

                  <div>
                    <h4 className="font-semibold">{report.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {report.location.address ||
                      `${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', getStatusColor(report.status))}>
                  <StatusIcon className="h-3 w-3" />
                </div>

                <div className="text-right">
                  <Badge variant="outline" className={getStatusColor(report.status)}>
                    {report.status.toUpperCase()}
                  </Badge>

                  {report.status === 'queued' && (
                    <div className="text-xs text-muted-foreground mt-1">Queued for sync</div>
                  )}

                  {report.status === 'syncing' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Syncing... ({report.syncAttempts} attempts)
                    </div>
                  )}

                  {report.status === 'failed' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Failed after {report.syncAttempts} attempts
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media Preview */}
            {(report.images?.length > 0 || report.videos?.length > 0 || report.audio) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex gap-2">
                  {report.images?.map((image, imgIndex) => (
                    <Image
                      key={imgIndex}
                      src={image}
                      alt={`Report image ${imgIndex + 1}`}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded border border-gray-200"
                    />
                  ))}

                  {report.videos?.map((video, videoIndex) => (
                    <video
                      key={videoIndex}
                      src={video}
                      className="w-16 h-12 object-cover rounded border border-gray-200"
                      controls
                    />
                  ))}

                  {report.audio && (
                    <div className="flex-1">
                      <audio src={report.audio} controls className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Reported:</span>
                  <div>{new Date(report.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <span className="font-medium">Data Size:</span>
                  <div>
                    {Math.round((report.metadata?.estimatedDataSize ?? 0) / 1024 / 1024)}MB
                  </div>
                </div>
                <div>
                  <span className="font-medium">Network:</span>
                  <div>{report.metadata?.networkStatus}</div>
                </div>
                <div>
                  <span className="font-medium">GPS Accuracy:</span>
                  <div>±{report.metadata?.gpsAccuracy}m</div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </>
  )
}
