export type VolunteerSkill =
  | 'medical'
  | 'search_rescue'
  | 'firefighting'
  | 'driving'
  | 'translation'
  | 'counseling'
  | 'construction'
  | 'electrical'
  | 'plumbing'
  | 'cooking'
  | 'logistics'
  | 'communications'
  | 'first_aid'
  | 'cpr'
  | 'heavy_equipment'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent'
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export interface VolunteerProfile {
  id: string
  userId?: string
  name: string
  contactNumber: string
  email?: string
  skills: VolunteerSkill[]
  certifications?: { name: string; expiryDate?: string }[]
  availability: { day: string; slots: string[] }[]
  currentLocation?: { lat: number; lng: number }
  assignedTaskId?: string
  status: 'available' | 'busy' | 'offline'
  rating?: number
  tasksCompleted: number
  registeredAt: string
  lastActive: string
  notes?: string
}

export interface VolunteerTask {
  id: string
  eventId?: string
  title: string
  description: string
  requiredSkills: VolunteerSkill[]
  minVolunteers: number
  maxVolunteers: number
  assignedVolunteers: string[]
  priority: TaskPriority
  status: TaskStatus
  location: { lat: number; lng: number; address?: string }
  estimatedDuration?: number
  scheduledStart?: string
  actualStart?: string
  completedAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  notes?: string
}

export interface VolunteerFilter {
  skills?: VolunteerSkill[]
  status?: ('available' | 'busy' | 'offline')[]
  radius?: number
  center?: { lat: number; lng: number }
  searchQuery?: string
  minRating?: number
  availability?: { day: string; slots: string[] }[]
}

export interface TaskFilter {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  requiredSkills?: VolunteerSkill[]
  radius?: number
  center?: { lat: number; lng: number }
  eventId?: string
  searchQuery?: string
}

export interface VolunteerMatch {
  volunteer: VolunteerProfile
  task: VolunteerTask
  matchScore: number
  skillMatches: VolunteerSkill[]
  distance?: number
}

export interface VolunteerStatistics {
  totalVolunteers: number
  availableVolunteers: number
  busyVolunteers: number
  offlineVolunteers: number
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  volunteersBySkill: Record<VolunteerSkill, number>
  tasksByPriority: Record<TaskPriority, number>
  averageVolunteerRating: number
}
