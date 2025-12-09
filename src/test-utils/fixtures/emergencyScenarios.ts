/**
 * Emergency scenario test fixtures for OpenRelief emergency coordination system
 *
 * This file provides realistic test data for various emergency scenarios,
 * including medical emergencies, natural disasters, fires, and other critical events.
 */

export interface EmergencyEvent {
  id: string
  type: 'medical' | 'fire' | 'natural_disaster' | 'accident' | 'security' | 'utility' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location: {
    latitude: number
    longitude: number
    address?: string
    description?: string
  }
  reportedBy: string
  reportedAt: string
  status: 'pending' | 'active' | 'resolved' | 'closed'
  trustScore: number
  responders: string[]
  resources: string[]
  updates: EmergencyUpdate[]
  estimatedResponseTime?: number
  requiredResources?: string[]
  affectedArea?: {
    radius: number
    unit: 'meters' | 'kilometers' | 'miles'
  }
  casualties?: {
    minor: number
    major: number
    critical: number
    fatal: number
  }
  weather?: {
    temperature: number
    humidity: number
    windSpeed: number
    conditions: string
  }
  accessibility?: {
    wheelchairAccessible: boolean
    languageSupport: string[]
    visualAids: boolean
    hearingAssistance: boolean
  }
  priority?: 'routine' | 'urgent' | 'emergency' | 'critical'
}

export interface EmergencyUpdate {
  id: string
  emergencyId: string
  userId: string
  timestamp: string
  type: 'status_change' | 'resource_update' | 'location_update' | 'casualty_update' | 'general'
  message: string
  data?: any
}

export interface User {
  id: string
  email: string
  name: string
  role: 'citizen' | 'responder' | 'coordinator' | 'admin'
  trustScore: number
  verified: boolean
  location?: {
    latitude: number
    longitude: number
  }
  skills: string[]
  availability: 'available' | 'busy' | 'offline'
  certifications: string[]
  experience: number
  lastActive: string
  contactInfo: {
    phone?: string
    email?: string
    emergencyContact?: string
  }
  equipment: string[]
  maxTravelDistance: number
  preferredCommunication: 'app' | 'sms' | 'call' | 'email'
}

export interface TrustScore {
  userId: string
  overall: number
  components: {
    reliability: number
    accuracy: number
    responseTime: number
    communityFeedback: number
    skillVerification: number
  }
  history: TrustScoreHistory[]
  lastUpdated: string
  factors: {
    successfulReports: number
    accurateReports: number
    responseTime: number
    communityEndorsements: number
    verifiedSkills: number
  }
}

export interface TrustScoreHistory {
  id: string
  timestamp: string
  change: number
  reason: 'successful_report' | 'accurate_report' | 'fast_response' | 'community_endorsement' | 'skill_verification' | 'penalty'
  details: string
  previousScore: number
  newScore: number
}

// Emergency Scenarios
export const emergencyScenarios = {
  medicalEmergency: {
    id: 'emergency-medical-001',
    type: 'medical',
    severity: 'high',
    title: 'Cardiac Emergency - Downtown Mall',
    description: 'Adult male experiencing chest pain and difficulty breathing. Patient conscious but in distress.',
    location: {
      latitude: 40.7589,
      longitude: -73.9851,
      address: '123 Main St, New York, NY 10001',
      description: 'Main entrance of City Mall, near food court'
    },
    reportedBy: 'user-citizen-001',
    reportedAt: '2024-01-15T10:30:00Z',
    status: 'active',
    trustScore: 0.85,
    responders: ['user-paramedic-001', 'user-paramedic-002'],
    resources: ['ambulance', 'defibrillator', 'oxygen_tank'],
    updates: [
      {
        id: 'update-001',
        emergencyId: 'emergency-medical-001',
        userId: 'user-paramedic-001',
        timestamp: '2024-01-15T10:45:00Z',
        type: 'status_change',
        message: 'Paramedics on scene, assessing patient condition'
      },
      {
        id: 'update-002',
        emergencyId: 'emergency-medical-001',
        userId: 'user-paramedic-001',
        timestamp: '2024-01-15T11:00:00Z',
        type: 'resource_update',
        message: 'Patient stabilized, preparing for transport',
        data: { vitals: { heartRate: 85, bloodPressure: '120/80', oxygenSaturation: 95 } }
      }
    ],
    estimatedResponseTime: 8,
    requiredResources: ['ambulance', 'paramedic', 'medical_kit'],
    affectedArea: { radius: 50, unit: 'meters' },
    casualties: { minor: 0, major: 1, critical: 0, fatal: 0 },
    weather: {
      temperature: 15,
      humidity: 65,
      windSpeed: 10,
      conditions: 'clear'
    },
    accessibility: {
      wheelchairAccessible: true,
      languageSupport: ['en', 'es'],
      visualAids: true,
      hearingAssistance: true
    },
    priority: 'urgent'
  } as EmergencyEvent,

  buildingFire: {
    id: 'emergency-fire-001',
    type: 'fire',
    severity: 'critical',
    title: 'Apartment Building Fire - Residential District',
    description: '3-story apartment building with visible flames from second floor. Multiple residents may be trapped.',
    location: {
      latitude: 40.7489,
      longitude: -73.9680,
      address: '456 Oak Ave, Brooklyn, NY 11201',
      description: 'Corner of Oak Ave and Pine St, near subway entrance'
    },
    reportedBy: 'user-citizen-002',
    reportedAt: '2024-01-15T14:20:00Z',
    status: 'active',
    trustScore: 0.92,
    responders: ['user-firefighter-001', 'user-firefighter-002', 'user-firefighter-003'],
    resources: ['fire_truck', 'ladder_truck', 'rescue_team', 'ambulance'],
    updates: [
      {
        id: 'update-003',
        emergencyId: 'emergency-fire-001',
        userId: 'user-firefighter-001',
        timestamp: '2024-01-15T14:35:00Z',
        type: 'status_change',
        message: 'Fire department on scene, establishing command post'
      },
      {
        id: 'update-004',
        emergencyId: 'emergency-fire-001',
        userId: 'user-firefighter-001',
        timestamp: '2024-01-15T14:50:00Z',
        type: 'casualty_update',
        message: '2 residents rescued, 3 still unaccounted for',
        data: { rescued: 2, missing: 3, injuries: 1 }
      }
    ],
    estimatedResponseTime: 5,
    requiredResources: ['fire_truck', 'ladder_truck', 'firefighters', 'ambulance', 'rescue_equipment'],
    affectedArea: { radius: 200, unit: 'meters' },
    casualties: { minor: 1, major: 1, critical: 0, fatal: 0 },
    weather: {
      temperature: 12,
      humidity: 70,
      windSpeed: 15,
      conditions: 'partly_cloudy'
    },
    accessibility: {
      wheelchairAccessible: false,
      languageSupport: ['en'],
      visualAids: false,
      hearingAssistance: false
    },
    priority: 'critical'
  } as EmergencyEvent,

  naturalDisaster: {
    id: 'emergency-flood-001',
    type: 'natural_disaster',
    severity: 'critical',
    title: 'Flash Flooding - Riverside District',
    description: 'Heavy rainfall causing rapid flooding in low-lying areas. Multiple streets impassable.',
    location: {
      latitude: 40.7282,
      longitude: -74.0776,
      address: 'Riverside District, Hoboken, NJ',
      description: 'Area along Hudson River, near waterfront promenade'
    },
    reportedBy: 'user-citizen-003',
    reportedAt: '2024-01-15T06:00:00Z',
    status: 'active',
    trustScore: 0.78,
    responders: ['user-rescue-001', 'user-rescue-002', 'user-coordinator-001'],
    resources: ['rescue_boat', 'helicopter', 'emergency_shelter', 'sandbags'],
    updates: [
      {
        id: 'update-005',
        emergencyId: 'emergency-flood-001',
        userId: 'user-coordinator-001',
        timestamp: '2024-01-15T06:30:00Z',
        type: 'status_change',
        message: 'Emergency operations center activated, coordinating evacuation'
      },
      {
        id: 'update-006',
        emergencyId: 'emergency-flood-001',
        userId: 'user-rescue-001',
        timestamp: '2024-01-15T07:00:00Z',
        type: 'resource_update',
        message: 'Water levels rising, additional resources requested',
        data: { waterLevel: 2.5, evacuationZones: ['A', 'B', 'C'] }
      }
    ],
    estimatedResponseTime: 15,
    requiredResources: ['rescue_boats', 'helicopters', 'emergency_shelters', 'evacuation_teams'],
    affectedArea: { radius: 2000, unit: 'meters' },
    casualties: { minor: 5, major: 2, critical: 1, fatal: 0 },
    weather: {
      temperature: 8,
      humidity: 90,
      windSpeed: 25,
      conditions: 'heavy_rain'
    },
    accessibility: {
      wheelchairAccessible: false,
      languageSupport: ['en', 'es', 'zh'],
      visualAids: true,
      hearingAssistance: true
    },
    priority: 'critical'
  } as EmergencyEvent,

  trafficAccident: {
    id: 'emergency-accident-001',
    type: 'accident',
    severity: 'medium',
    title: 'Multi-Vehicle Traffic Accident - Highway Junction',
    description: '3-car collision on major highway intersection. Injuries reported, traffic blocked.',
    location: {
      latitude: 40.7580,
      longitude: -73.9855,
      address: 'Highway 95 & Route 1 Junction, New York, NY',
      description: 'Northbound lanes of Highway 95'
    },
    reportedBy: 'user-citizen-004',
    reportedAt: '2024-01-15T17:45:00Z',
    status: 'active',
    trustScore: 0.81,
    responders: ['user-police-001', 'user-paramedic-003'],
    resources: ['police_car', 'ambulance', 'tow_truck', 'traffic_control'],
    updates: [
      {
        id: 'update-007',
        emergencyId: 'emergency-accident-001',
        userId: 'user-police-001',
        timestamp: '2024-01-15T18:00:00Z',
        type: 'status_change',
        message: 'Police on scene, securing area and redirecting traffic'
      }
    ],
    estimatedResponseTime: 12,
    requiredResources: ['police', 'ambulance', 'tow_trucks', 'traffic_diversion'],
    affectedArea: { radius: 500, unit: 'meters' },
    casualties: { minor: 2, major: 1, critical: 0, fatal: 0 },
    weather: {
      temperature: 18,
      humidity: 55,
      windSpeed: 12,
      conditions: 'clear'
    },
    accessibility: {
      wheelchairAccessible: true,
      languageSupport: ['en', 'es'],
      visualAids: false,
      hearingAssistance: false
    },
    priority: 'urgent'
  } as EmergencyEvent,

  securityThreat: {
    id: 'emergency-security-001',
    type: 'security',
    severity: 'high',
    title: 'Security Threat - Public Event',
    description: 'Suspicious package reported at public gathering. Area being secured.',
    location: {
      latitude: 40.7614,
      longitude: -73.9776,
      address: 'Central Park, New York, NY',
      description: 'Near main stage area of public concert'
    },
    reportedBy: 'user-security-001',
    reportedAt: '2024-01-15T20:00:00Z',
    status: 'active',
    trustScore: 0.88,
    responders: ['user-police-002', 'user-security-002'],
    resources: ['bomb_squad', 'police', 'security_team', 'evacuation_team'],
    updates: [
      {
        id: 'update-008',
        emergencyId: 'emergency-security-001',
        userId: 'user-police-002',
        timestamp: '2024-01-15T20:15:00Z',
        type: 'status_change',
        message: 'Perimeter established, bomb squad en route'
      }
    ],
    estimatedResponseTime: 10,
    requiredResources: ['bomb_squad', 'police', 'security_teams', 'evacuation_support'],
    affectedArea: { radius: 300, unit: 'meters' },
    casualties: { minor: 0, major: 0, critical: 0, fatal: 0 },
    weather: {
      temperature: 20,
      humidity: 50,
      windSpeed: 8,
      conditions: 'clear'
    },
    accessibility: {
      wheelchairAccessible: true,
      languageSupport: ['en'],
      visualAids: true,
      hearingAssistance: true
    },
    priority: 'urgent'
  } as EmergencyEvent
}

// User Test Data
export const testUsers = {
  citizenUser: {
    id: 'user-citizen-001',
    email: 'citizen@example.com',
    name: 'John Citizen',
    role: 'citizen',
    trustScore: 0.85,
    verified: true,
    location: { latitude: 40.7589, longitude: -73.9851 },
    skills: ['first_aid', 'cpr'],
    availability: 'available',
    certifications: ['CPR Certified', 'First Aid Training'],
    experience: 2,
    lastActive: '2024-01-15T10:30:00Z',
    contactInfo: {
      phone: '+1-555-0101',
      email: 'citizen@example.com',
      emergencyContact: '+1-555-0102'
    },
    equipment: ['first_aid_kit'],
    maxTravelDistance: 25,
    preferredCommunication: 'app'
  } as User,

  paramedicUser: {
    id: 'user-paramedic-001',
    email: 'paramedic@example.com',
    name: 'Sarah Medic',
    role: 'responder',
    trustScore: 0.92,
    verified: true,
    location: { latitude: 40.7580, longitude: -73.9850 },
    skills: ['emergency_medical', 'trauma_care', 'advanced_life_support'],
    availability: 'available',
    certifications: ['EMT-Paramedic', 'Advanced Cardiac Life Support', 'Trauma Care'],
    experience: 8,
    lastActive: '2024-01-15T10:25:00Z',
    contactInfo: {
      phone: '+1-555-0201',
      email: 'paramedic@example.com',
      emergencyContact: '+1-555-0202'
    },
    equipment: ['defibrillator', 'oxygen_tank', 'medical_kit', 'stretcher'],
    maxTravelDistance: 50,
    preferredCommunication: 'call'
  } as User,

  firefighterUser: {
    id: 'user-firefighter-001',
    email: 'firefighter@example.com',
    name: 'Mike Firefighter',
    role: 'responder',
    trustScore: 0.95,
    verified: true,
    location: { latitude: 40.7489, longitude: -73.9680 },
    skills: ['fire_suppression', 'rescue_operations', 'hazardous_materials'],
    availability: 'available',
    certifications: ['Firefighter I', 'Hazardous Materials Response', 'Confined Space Rescue'],
    experience: 12,
    lastActive: '2024-01-15T14:15:00Z',
    contactInfo: {
      phone: '+1-555-0301',
      email: 'firefighter@example.com',
      emergencyContact: '+1-555-0302'
    },
    equipment: ['fire_gear', 'rescue_tools', 'breathing_apparatus'],
    maxTravelDistance: 30,
    preferredCommunication: 'call'
  } as User,

  coordinatorUser: {
    id: 'user-coordinator-001',
    email: 'coordinator@example.com',
    name: 'Alex Coordinator',
    role: 'coordinator',
    trustScore: 0.89,
    verified: true,
    location: { latitude: 40.7282, longitude: -74.0776 },
    skills: ['emergency_management', 'incident_command', 'resource_allocation'],
    availability: 'available',
    certifications: ['Incident Command System', 'Emergency Management'],
    experience: 15,
    lastActive: '2024-01-15T05:45:00Z',
    contactInfo: {
      phone: '+1-555-0401',
      email: 'coordinator@example.com',
      emergencyContact: '+1-555-0402'
    },
    equipment: ['command_vehicle', 'communication_system'],
    maxTravelDistance: 100,
    preferredCommunication: 'app'
  } as User
}

// Trust Score Test Data
export const trustScoreData = {
  highTrust: {
    userId: 'user-paramedic-001',
    overall: 0.92,
    components: {
      reliability: 0.95,
      accuracy: 0.90,
      responseTime: 0.88,
      communityFeedback: 0.92,
      skillVerification: 0.95
    },
    history: [
      {
        id: 'trust-001',
        timestamp: '2024-01-15T10:30:00Z',
        change: 0.02,
        reason: 'successful_report',
        details: 'Accurate medical emergency report, quick response',
        previousScore: 0.90,
        newScore: 0.92
      }
    ],
    lastUpdated: '2024-01-15T10:30:00Z',
    factors: {
      successfulReports: 45,
      accurateReports: 42,
      responseTime: 8.5,
      communityEndorsements: 28,
      verifiedSkills: 5
    }
  } as TrustScore,

  mediumTrust: {
    userId: 'user-citizen-001',
    overall: 0.78,
    components: {
      reliability: 0.80,
      accuracy: 0.75,
      responseTime: 0.82,
      communityFeedback: 0.76,
      skillVerification: 0.77
    },
    history: [
      {
        id: 'trust-002',
        timestamp: '2024-01-15T09:00:00Z',
        change: -0.01,
        reason: 'penalty',
        details: 'False alarm report',
        previousScore: 0.79,
        newScore: 0.78
      }
    ],
    lastUpdated: '2024-01-15T09:00:00Z',
    factors: {
      successfulReports: 12,
      accurateReports: 10,
      responseTime: 15.2,
      communityEndorsements: 8,
      verifiedSkills: 2
    }
  } as TrustScore
}

// Helper functions for creating test data
export const createEmergencyEvent = (overrides: Partial<EmergencyEvent> = {}): EmergencyEvent => {
  return {
    id: `emergency-${Date.now()}`,
    type: 'medical',
    severity: 'medium',
    title: 'Test Emergency',
    description: 'Test emergency description',
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    reportedBy: 'test-user',
    reportedAt: new Date().toISOString(),
    status: 'pending',
    trustScore: 0.8,
    responders: [],
    resources: [],
    updates: [],
    ...overrides
  }
}

export const createUser = (overrides: Partial<User> = {}): User => {
  return {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    role: 'citizen',
    trustScore: 0.8,
    verified: true,
    skills: [],
    availability: 'available',
    certifications: [],
    experience: 0,
    lastActive: new Date().toISOString(),
    contactInfo: {},
    equipment: [],
    maxTravelDistance: 25,
    preferredCommunication: 'app',
    ...overrides
  }
}

export const createTrustScore = (overrides: Partial<TrustScore> = {}): TrustScore => {
  return {
    userId: `user-${Date.now()}`,
    overall: 0.8,
    components: {
      reliability: 0.8,
      accuracy: 0.8,
      responseTime: 0.8,
      communityFeedback: 0.8,
      skillVerification: 0.8
    },
    history: [],
    lastUpdated: new Date().toISOString(),
    factors: {
      successfulReports: 0,
      accurateReports: 0,
      responseTime: 0,
      communityEndorsements: 0,
      verifiedSkills: 0
    },
    ...overrides
  }
}

export default {
  emergencyScenarios,
  testUsers,
  trustScoreData,
  createEmergencyEvent,
  createUser,
  createTrustScore
}