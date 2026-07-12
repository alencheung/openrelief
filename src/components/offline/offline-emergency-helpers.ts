/**
 * Offline Emergency Reporting - Helper Functions
 *
 * Pure utility helpers (status mappers, size estimations, mock data builders)
 * extracted from OfflineEmergencyReporting.tsx to keep the main component
 * module under the 500 line lint budget.
 */

import type {
  EmergencyType,
  EmergencyTypeOption,
  OfflineQueue,
  OfflineReport,
  OfflineReportStatus,
  SeverityOption
} from './offline-emergency-types'

const BYTES_PER_MB = 1024 * 1024
const BYTES_PER_VIDEO = 5 * BYTES_PER_MB
const BYTES_PER_AUDIO = 2 * BYTES_PER_MB
const BYTES_PER_TEXT = 1024

// Default max offline queue size: 50MB
export const DEFAULT_MAX_QUEUE_SIZE = 50 * BYTES_PER_MB

// Default mock offline reports used to seed the component state.
export const getDefaultOfflineReports = (): OfflineReport[] => [
  {
    id: 'offline-1',
    type: 'medical',
    severity: 'critical',
    title: 'Medical Emergency - Downtown',
    description: 'Person collapsed at intersection, requires immediate medical attention',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      address: 'Market St & 5th St, San Francisco, CA'
    },
    reporter: {
      id: 'user-789',
      name: 'John Doe',
      trustScore: 0.92
    },
    // 5 minutes ago
    timestamp: Date.now() - 300000,
    images: ['image1.jpg'],
    videos: [],
    audio: 'audio1.mp3',
    metadata: {
      deviceInfo: 'iPhone 14 Pro',
      batteryLevel: 85,
      networkStatus: 'offline',
      gpsAccuracy: 5,
      // 2.5MB
      estimatedDataSize: 2.5 * BYTES_PER_MB
    },
    status: 'queued',
    syncAttempts: 3,
    // 1 minute ago
    lastSyncAttempt: Date.now() - 60000
  },
  {
    id: 'offline-2',
    type: 'fire',
    severity: 'high',
    title: 'Building Fire - Financial District',
    description: 'Smoke visible from multiple floors, fire alarms active',
    location: {
      latitude: 37.789,
      longitude: -122.401,
      accuracy: 15,
      address: '100 Pine St, San Francisco, CA'
    },
    reporter: {
      id: 'user-456',
      name: 'Jane Smith',
      trustScore: 0.78
    },
    // 15 minutes ago
    timestamp: Date.now() - 900000,
    images: ['image2.jpg', 'image3.jpg'],
    videos: ['video1.mp4'],
    metadata: {
      deviceInfo: 'Samsung Galaxy S23',
      batteryLevel: 45,
      networkStatus: 'poor',
      gpsAccuracy: 25,
      // 8.7MB
      estimatedDataSize: 8.7 * BYTES_PER_MB
    },
    status: 'syncing',
    syncAttempts: 1,
    // 30 seconds ago
    lastSyncAttempt: Date.now() - 30000
  }
]

// Initial offline queue state.
export const getDefaultQueue = (): OfflineQueue => ({
  reports: [],
  totalSize: 0,
  maxSize: DEFAULT_MAX_QUEUE_SIZE,
  compressionEnabled: true,
  autoSyncEnabled: true,
  lastSyncTime: 0
})

// Estimate the byte size of a single report based on its media.
export const estimateReportSize = (report: OfflineReport): number => {
  const imageSize = (report.images?.length || 0) * BYTES_PER_MB
  const videoSize = (report.videos?.length || 0) * BYTES_PER_VIDEO
  const audioSize = report.audio ? BYTES_PER_AUDIO : 0
  return imageSize + videoSize + audioSize + BYTES_PER_TEXT
}

// Sum the estimated sizes of all non-synced reports.
export const calculateTotalSize = (reports: OfflineReport[]): number =>
  reports.filter(report => report.status !== 'synced').reduce(estimateReportSize, 0)

// Generate a pseudo-random unique id for an offline report.
export const generateReportId = (): string =>
  `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Map a report status to a tailwind text color class.
export const getStatusColor = (status: OfflineReportStatus): string => {
  switch (status) {
    case 'synced':
      return 'text-green-600'
    case 'syncing':
      return 'text-blue-600'
    case 'queued':
      return 'text-yellow-600'
    case 'failed':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

// Coerce a free-form report type string into the typed EmergencyType union,
// defaulting to 'fire' for unknown values.
export const normalizeEmergencyType = (type: string): EmergencyType => {
  const known: EmergencyType[] = ['fire', 'medical', 'security', 'natural', 'infrastructure']
  return (known as string[]).includes(type) ? (type as EmergencyType) : 'fire'
}

// Emergency type option metadata used by the report form.
export const EMERGENCY_TYPE_OPTIONS: EmergencyTypeOption[] = [
  { type: 'fire', name: 'Fire', color: 'red' },
  { type: 'medical', name: 'Medical', color: 'pink' },
  { type: 'security', name: 'Security', color: 'blue' },
  { type: 'natural', name: 'Natural', color: 'cyan' },
  { type: 'infrastructure', name: 'Infrastructure', color: 'orange' }
]

// Severity option metadata used by the report form.
export const SEVERITY_OPTIONS: SeverityOption[] = [
  { level: 'low', name: 'Low', color: 'blue' },
  { level: 'medium', name: 'Medium', color: 'yellow' },
  { level: 'high', name: 'High', color: 'orange' },
  { level: 'critical', name: 'Critical', color: 'red' }
]
