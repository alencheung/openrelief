export type ResourceType =
  | 'water'
  | 'food'
  | 'medical'
  | 'shelter'
  | 'clothing'
  | 'tools'
  | 'communication'
  | 'power'
  | 'transportation'

export type ResourceStatus = 'available' | 'limited' | 'depleted' | 'incoming'

export type ResourceUrgency = 'low' | 'medium' | 'high' | 'critical'

export interface GeoLocation {
  lat: number
  lng: number
  address?: string
}

export interface ContactInfo {
  name: string
  phone?: string
  email?: string
  organization?: string
}

export interface Resource {
  id: string
  type: ResourceType
  name: string
  description: string
  quantity: number
  unit: string
  status: ResourceStatus
  urgency: ResourceUrgency
  location: GeoLocation
  contactInfo: ContactInfo
  expirationDate?: string
  supplier?: string
  assignedEmergencyId?: string
  createdAt: string
  updatedAt: string
  distance?: number
}

export type ShelterType = 'emergency' | 'temporary' | 'transitional' | 'long_term'

export type ShelterStatus = 'open' | 'full' | 'closed' | 'evacuating'

export interface ShelterAmenities {
  beds: boolean
  food: boolean
  water: boolean
  medical: boolean
  sanitation: boolean
  electricity: boolean
  heating: boolean
  cooling: boolean
  internet: boolean
  phoneCharging: boolean
}

export interface ShelterAccessibility {
  wheelchairAccessible: boolean
  visualImpairmentSupport: boolean
  hearingImpairmentSupport: boolean
  mobilityAssistance: boolean
  serviceAnimalsAllowed: boolean
}

export interface OperatingHours {
  open24Hours: boolean
  openTime?: string
  closeTime?: string
  daysOpen?: string[]
}

export interface Shelter {
  id: string
  name: string
  type: ShelterType
  status: ShelterStatus
  capacity: number
  currentOccupancy: number
  availableBeds: number
  location: GeoLocation
  address: string
  contactInfo: ContactInfo
  amenities: ShelterAmenities
  accessibility: ShelterAccessibility
  petsAllowed: boolean
  operatingHours: OperatingHours
  managerId?: string
  assignedVolunteers: string[]
  createdAt: string
  updatedAt: string
  distance?: number
}

export interface ResourceNeed {
  id: string
  resourceId?: string
  resourceType: ResourceType
  resourceName: string
  neededQuantity: number
  currentQuantity: number
  urgency: ResourceUrgency
  requestedBy: string
  requestedByOrganization?: string
  location: GeoLocation
  status: 'pending' | 'partial' | 'fulfilled' | 'cancelled'
  fulfilledBy?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ResourceFilter {
  type?: ResourceType[]
  status?: ResourceStatus[]
  urgency?: ResourceUrgency[]
  radius?: number
  center?: GeoLocation
  searchQuery?: string
  assignedEmergencyId?: string
}

export interface ShelterFilter {
  type?: ShelterType[]
  status?: ShelterStatus[]
  hasCapacity?: boolean
  accessibility?: Partial<ShelterAccessibility>
  amenities?: Partial<ShelterAmenities>
  petsAllowed?: boolean
  radius?: number
  center?: GeoLocation
  searchQuery?: string
}

export interface ResourceStatistics {
  totalResources: number
  availableResources: number
  limitedResources: number
  depletedResources: number
  incomingResources: number
  criticalNeeds: number
  highUrgencyNeeds: number
  resourcesByType: Record<ResourceType, number>
}

export interface ShelterStatistics {
  totalShelters: number
  openShelters: number
  fullShelters: number
  closedShelters: number
  totalCapacity: number
  totalOccupancy: number
  overallAvailability: number
  sheltersByType: Record<ShelterType, number>
}
