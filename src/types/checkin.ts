export type SafetyStatus = 'safe' | 'need_help' | 'not_in_area' | 'unknown'

export type HelpType = 'medical' | 'rescue' | 'supplies' | 'shelter' | 'other'

export interface Location {
  lat: number
  lng: number
  address?: string | undefined
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface StatusCheckIn {
  id: string
  userId: string
  userName?: string | undefined
  status: SafetyStatus
  location?: Location | undefined
  message?: string | undefined
  needsHelpType?: HelpType[] | undefined
  contactNumber?: string | undefined
  emergencyContacts?: EmergencyContact[] | undefined
  isPublic: boolean
  visibleToContacts: boolean
  eventId?: string | undefined
  createdAt: string
  expiresAt: string
  lastUpdated: string
}

export interface CheckInSummary {
  eventId?: string | undefined
  totalCheckIns: number
  safe: number
  needHelp: number
  notInArea: number
  unknown: number
  lastUpdated: string
}

export interface CheckInFilter {
  status?: SafetyStatus[] | undefined
  eventId?: string | undefined
  userId?: string | undefined
  radius?: number | undefined
  center?: Location | undefined
  timeRange?:
    | {
        start: Date
        end: Date
      }
    | undefined
  searchQuery?: string | undefined
  isPublic?: boolean | undefined
}

export interface CheckInCreateInput {
  userId: string
  userName?: string | undefined
  status: SafetyStatus
  location?: Location | undefined
  message?: string | undefined
  needsHelpType?: HelpType[] | undefined
  contactNumber?: string | undefined
  emergencyContacts?: EmergencyContact[] | undefined
  isPublic?: boolean | undefined
  visibleToContacts?: boolean | undefined
  eventId?: string | undefined
  expiresAfterHours?: number | undefined
  // Optional explicit expiry override (primarily for testing/expiry migration).
  // When omitted, expiresAt is computed as now + expiresAfterHours (default 72h).
  expiresAt?: string | undefined
}

export interface CheckInUpdateInput {
  status?: SafetyStatus | undefined
  location?: Location | undefined
  message?: string | undefined
  needsHelpType?: HelpType[] | undefined
  contactNumber?: string | undefined
  emergencyContacts?: EmergencyContact[] | undefined
  isPublic?: boolean | undefined
  visibleToContacts?: boolean | undefined
  expiresAfterHours?: number | undefined
}
