/**
 * Privacy Education - Type Definitions
 *
 * Type definitions extracted from PrivacyEducation.tsx to keep the main
 * component module under the 500 line lint budget.
 */

export type TutorialCategory = 'basics' | 'advanced' | 'emergency' | 'legal'
export type TutorialDifficulty = 'beginner' | 'intermediate' | 'advanced'

// Types for privacy education
export interface Tutorial {
  id: string
  title: string
  description: string
  duration: number
  category: TutorialCategory
  difficulty: TutorialDifficulty
  completed: boolean
  progress: number
  topics: string[]
  interactiveElements: boolean
  lastAccessed?: Date
}

export type RecommendationType =
  | 'data_minimization'
  | 'privacy_setting'
  | 'security_enhancement'
export type ImpactLevel = 'low' | 'medium' | 'high'
export type EffortLevel = 'easy' | 'moderate' | 'difficult'

export interface Recommendation {
  id: string
  type: RecommendationType
  title: string
  description: string
  impact: ImpactLevel
  effort: EffortLevel
  priority: number
  implemented: boolean
  savings: string
}

export type RiskAssessmentCategory =
  | 'data_sharing'
  | 'location_privacy'
  | 'communication'
  | 'third_party'
  | 'legal_compliance'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskFactor {
  name: string
  risk: RiskLevel
  weight: number
  description: string
}

export interface RiskAssessment {
  id: string
  category: RiskAssessmentCategory
  title: string
  description: string
  currentRisk: RiskLevel
  factors: RiskFactor[]
  score: number
  recommendations: string[]
  lastAssessed: Date
}

export type BestPracticeCategory =
  | 'data_protection'
  | 'emergency_response'
  | 'digital_security'
  | 'user_rights'
export type ImportanceLevel = 'essential' | 'recommended' | 'advanced'

export interface BestPracticeImplementation {
  steps: string[]
  timeRequired: string
  difficulty: EffortLevel
  resources: string[]
}

export interface BestPractice {
  id: string
  category: BestPracticeCategory
  title: string
  description: string
  importance: ImportanceLevel
  implementation: BestPracticeImplementation
  benefits: string[]
  examples: string[]
  relatedTopics: string[]
}

export type PrivacySettingCategory = 'security' | 'privacy' | 'data_management'
export type PrivacySettingValue = boolean | string | number

export interface PrivacySetting {
  id: string
  name: string
  description: string
  currentValue: PrivacySettingValue
  recommendedValue: PrivacySettingValue
  impact: ImpactLevel
  category: PrivacySettingCategory
  lastReviewed: Date
}

export type PrivacyEducationTab =
  | 'tutorials'
  | 'recommendations'
  | 'assessment'
  | 'practices'
  | 'settings'
