/**
 * Offline Emergency Reporting - Type Definitions
 *
 * Type definitions extracted from OfflineEmergencyReporting.tsx to keep the
 * main component module under the 500 line lint budget.
 */

export type EmergencyType = 'fire' | 'medical' | 'security' | 'natural' | 'infrastructure'
export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical'
export type NetworkStatus = 'online' | 'offline' | 'poor'
export type OfflineReportStatus = 'draft' | 'queued' | 'syncing' | 'synced' | 'failed'

export interface ReportLocation {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

export interface Reporter {
  id: string
  name: string
  trustScore: number
}

export interface ReportMetadata {
  deviceInfo?: string
  batteryLevel?: number
  networkStatus?: NetworkStatus
  gpsAccuracy?: number
  estimatedDataSize?: number
}

export interface OfflineReport {
  id: string
  type: string
  severity: EmergencySeverity
  title: string
  description: string
  location: ReportLocation
  reporter: Reporter
  timestamp: number
  images: string[]
  videos: string[]
  audio?: string
  metadata: ReportMetadata
  status: OfflineReportStatus
  syncAttempts: number
  lastSyncAttempt?: number
}

export interface OfflineQueue {
  reports: OfflineReport[]
  totalSize: number
  maxSize: number
  compressionEnabled: boolean
  autoSyncEnabled: boolean
  lastSyncTime: number
}

export interface OfflineEmergencyReportingProps {
  className?: string
  onReportSubmitted?: (report: OfflineReport) => void
  initialLocation?: { lat: number; lng: number }
}

// Emergency type option metadata used by the report form.
export interface EmergencyTypeOption {
  type: EmergencyType
  name: string
  color: string
}

// Severity option metadata used by the report form.
export interface SeverityOption {
  level: EmergencySeverity
  name: string
  color: string
}
