export type VictimStatus = 'safe' | 'injured' | 'trapped' | 'missing' | 'deceased' | 'unknown'

export type VictimPriority = 'low' | 'medium' | 'high' | 'critical'

export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical'

export interface Location {
  lat: number
  lng: number
  address?: string
}

export interface Injury {
  type: string
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  description?: string
  treated: boolean
}

export interface ContactInfo {
  phone?: string
  email?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface Victim {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other' | 'unknown'
  status: VictimStatus
  priority: VictimPriority
  location: Location
  injuries: Injury[]
  contactInfo?: ContactInfo
  emergencyContact?: EmergencyContact
  lastCheckIn?: Date
  reporterId: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface VictimCheckIn {
  id: string
  victimId: string
  status: VictimStatus
  location?: Location
  notes?: string
  timestamp: Date
  reporterId: string
}

export interface VictimFilter {
  status?: VictimStatus[]
  priority?: VictimPriority[]
  radius?: number
  center?: Location
  timeRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
}

export interface VictimStats {
  total: number
  safe: number
  injured: number
  trapped: number
  missing: number
  deceased: number
  byPriority: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface VictimProfile {
  id: string
  name?: string
  age?: number
  gender?: 'male' | 'female' | 'other' | 'unknown'
  status: VictimStatus
  injurySeverity?: InjurySeverity
  injuries?: string[]
  lastKnownLocation?: { lat: number; lng: number; address?: string }
  contactNumber?: string
  emergencyContact?: { name: string; phone: string; relationship: string }
  medicalConditions?: string[]
  medications?: string[]
  needsAssistance: boolean
  assistanceType?: ('medical' | 'rescue' | 'evacuation' | 'supplies' | 'shelter')[]
  reporterId?: string
  confirmedByIds?: string[]
  createdAt: string
  updatedAt: string
  notes?: string
}

export interface OfflineVictimAction {
  id: string
  type: 'create' | 'update' | 'update_status' | 'check_in'
  victimId?: string
  data: unknown
  timestamp: number
  synced: boolean
  retryCount: number
}
