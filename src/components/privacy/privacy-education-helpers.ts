/**
 * Privacy Education - Helper Functions
 *
 * Pure utility helpers (formatters, color mappers, mock data builders)
 * extracted from PrivacyEducation.tsx to keep the main component module
 * under the 500 line lint budget.
 */

import type {
  BestPractice,
  ImportanceLevel,
  ImpactLevel,
  PrivacySetting,
  Recommendation,
  RiskAssessment,
  RiskLevel,
  Tutorial
} from './privacy-education-types'

const DAY_MS = 24 * 60 * 60 * 1000

// Format a date / date string into a human friendly "time ago" label.
export const formatTimeAgo = (date: string | Date): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) {
    return 'just now'
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`
  }
  return `${Math.floor(seconds / 86400)}d ago`
}

// Map a risk level to a StatusIndicator status string.
export const getRiskColor = (
  risk: RiskLevel | string
): 'resolved' | 'pending' | 'critical' | 'inactive' => {
  switch (risk) {
    case 'low':
      return 'resolved'
    case 'medium':
      return 'pending'
    case 'high':
    case 'critical':
      return 'critical'
    default:
      return 'inactive'
  }
}

// Map an importance level to a StatusIndicator status string.
export const getImportanceColor = (
  importance: ImportanceLevel | string
): 'critical' | 'active' | 'resolved' | 'inactive' => {
  switch (importance) {
    case 'essential':
      return 'critical'
    case 'recommended':
      return 'active'
    case 'advanced':
      return 'resolved'
    default:
      return 'inactive'
  }
}

// Default mock tutorials used to seed the component state.
export const getDefaultTutorials = (): Tutorial[] => [
  {
    id: 'tut-001',
    title: 'Privacy Basics: Understanding Your Rights',
    description:
      'Learn about your fundamental privacy rights and how they apply to emergency response services',
    duration: 15,
    category: 'basics',
    difficulty: 'beginner',
    completed: true,
    progress: 100,
    topics: ['GDPR Rights', 'Data Protection', 'Emergency Response Privacy'],
    interactiveElements: true,
    lastAccessed: new Date(Date.now() - 2 * DAY_MS)
  },
  {
    id: 'tut-002',
    title: 'Location Privacy Zones Setup',
    description:
      'Step-by-step guide to setting up and managing privacy zones for different locations',
    duration: 20,
    category: 'advanced',
    difficulty: 'intermediate',
    completed: false,
    progress: 65,
    topics: ['Privacy Zones', 'Geofencing', 'Location Anonymization'],
    interactiveElements: true,
    lastAccessed: new Date(Date.now() - 5 * DAY_MS)
  },
  {
    id: 'tut-003',
    title: 'Emergency Data Sharing Configuration',
    description:
      'Configure how your data is shared during emergency situations and with trusted partners',
    duration: 12,
    category: 'emergency',
    difficulty: 'beginner',
    completed: true,
    progress: 100,
    topics: ['Emergency Sharing', 'Trusted Contacts', 'Data Prioritization'],
    interactiveElements: false,
    lastAccessed: new Date(Date.now() - 7 * DAY_MS)
  },
  {
    id: 'tut-004',
    title: 'Legal Rights Exercise Guide',
    description:
      'Complete guide to exercising your GDPR rights including access, correction, and erasure',
    duration: 25,
    category: 'legal',
    difficulty: 'advanced',
    completed: false,
    progress: 30,
    topics: ['Data Access', 'Rectification', 'Erasure', 'Portability'],
    interactiveElements: true,
    lastAccessed: new Date(Date.now() - 15 * DAY_MS)
  }
]

// Default mock recommendations used to seed the component state.
export const getDefaultRecommendations = (): Recommendation[] => [
  {
    id: 'rec-001',
    type: 'data_minimization',
    title: 'Enable Location Precision Reduction',
    description:
      'Reduce location precision from exact coordinates to neighborhood-level for better privacy',
    impact: 'low',
    effort: 'easy',
    priority: 8,
    implemented: false,
    savings: 'Reduces location data exposure by 75%'
  },
  {
    id: 'rec-002',
    type: 'privacy_setting',
    title: 'Activate Differential Privacy',
    description:
      'Enable mathematical noise addition to protect your data while maintaining utility',
    impact: 'medium',
    effort: 'moderate',
    priority: 9,
    implemented: true,
    savings: 'Provides \u03B5-differential privacy guarantee'
  },
  {
    id: 'rec-003',
    type: 'security_enhancement',
    title: 'Implement End-to-End Encryption',
    description: 'Add encryption for sensitive data to protect against unauthorized access',
    impact: 'low',
    effort: 'moderate',
    priority: 7,
    implemented: false,
    savings: 'Protects sensitive data from breaches'
  },
  {
    id: 'rec-004',
    type: 'data_minimization',
    title: 'Set Shorter Data Retention Periods',
    description: 'Reduce data retention periods to minimum necessary for emergency response',
    impact: 'medium',
    effort: 'easy',
    priority: 6,
    implemented: false,
    savings: 'Reduces data storage costs by 40%'
  }
]

// Default mock risk assessments used to seed the component state.
export const getDefaultRiskAssessments = (): RiskAssessment[] => [
  {
    id: 'risk-001',
    category: 'location_privacy',
    title: 'Location Data Sharing Risk',
    description: 'Assessment of privacy risks associated with current location sharing settings',
    currentRisk: 'medium',
    score: 65,
    factors: [
      {
        name: 'Location Precision',
        risk: 'medium',
        weight: 30,
        description: 'Current precision level may allow identification of specific locations'
      },
      {
        name: 'Sharing Scope',
        risk: 'high',
        weight: 40,
        description: 'Location data shared with multiple third parties'
      },
      {
        name: 'Retention Period',
        risk: 'low',
        weight: 20,
        description: 'Data retained for extended periods'
      },
      {
        name: 'Encryption Status',
        risk: 'medium',
        weight: 30,
        description: 'Some location data transmitted without encryption'
      }
    ],
    recommendations: [
      'Reduce location precision to neighborhood level',
      'Limit location sharing to emergency services only',
      'Enable end-to-end encryption for all location data',
      'Review and revoke unnecessary third-party access'
    ],
    lastAssessed: new Date(Date.now() - 3 * DAY_MS)
  },
  {
    id: 'risk-002',
    category: 'third_party',
    title: 'Third-Party Data Sharing Assessment',
    description: 'Evaluation of data sharing practices with external partners and services',
    currentRisk: 'high',
    score: 78,
    factors: [
      {
        name: 'Partner Vetting',
        risk: 'high',
        weight: 35,
        description: 'Some partners lack proper privacy certifications'
      },
      {
        name: 'Data Minimization',
        risk: 'medium',
        weight: 25,
        description: 'More data shared than necessary for service provision'
      },
      {
        name: 'Purpose Limitation',
        risk: 'high',
        weight: 30,
        description: 'Data used for purposes beyond original consent'
      },
      {
        name: 'User Control',
        risk: 'medium',
        weight: 10,
        description: 'Limited user control over shared data'
      }
    ],
    recommendations: [
      'Implement strict partner vetting process',
      'Apply data minimization principles',
      'Enforce purpose limitation clauses',
      'Provide user control over data sharing'
    ],
    lastAssessed: new Date(Date.now() - 1 * DAY_MS)
  }
]

// Default mock best practices used to seed the component state.
export const getDefaultBestPractices = (): BestPractice[] => [
  {
    id: 'prac-001',
    category: 'data_protection',
    title: 'Data Minimization Principle',
    description:
      'Collect and process only the minimum amount of personal data necessary for emergency response',
    importance: 'essential',
    implementation: {
      steps: [
        'Identify minimum data requirements for each emergency scenario',
        'Implement data collection limits',
        'Use anonymization techniques where possible',
        'Regular review and cleanup of unnecessary data'
      ],
      timeRequired: '2-4 weeks',
      difficulty: 'moderate',
      resources: ['Privacy expertise', 'Data mapping tools', 'Regular review process']
    },
    benefits: [
      'Reduces privacy risks',
      'Lowers data storage costs',
      'Improves system performance',
      'Enhances user trust'
    ],
    examples: [
      'Collect only vital signs during medical emergencies',
      'Use neighborhood-level location instead of precise coordinates',
      'Limit communication logs to emergency-relevant messages only'
    ],
    relatedTopics: ['GDPR Compliance', 'Data Protection', 'Emergency Response Optimization']
  },
  {
    id: 'prac-002',
    category: 'emergency_response',
    title: 'Emergency Data Prioritization',
    description:
      'Establish clear protocols for prioritizing and sharing different types of emergency data',
    importance: 'essential',
    implementation: {
      steps: [
        'Define data classification levels (critical, important, routine)',
        'Create sharing protocols for each classification',
        'Implement automated prioritization rules',
        'Establish trusted recipient verification'
      ],
      timeRequired: '1-2 weeks',
      difficulty: 'moderate',
      resources: [
        'Emergency response expertise',
        'Protocol development',
        'Trust management system'
      ]
    },
    benefits: [
      'Faster emergency response',
      'Reduced data exposure',
      'Improved coordination with responders',
      'Enhanced user safety'
    ],
    examples: [
      'Critical health data shared immediately with medical responders',
      'Location data shared only during active emergencies',
      'Trust score access granted to verified emergency services'
    ],
    relatedTopics: ['Emergency Response', 'Data Classification', 'Trust Management']
  },
  {
    id: 'prac-003',
    category: 'digital_security',
    title: 'Multi-Factor Authentication',
    description:
      'Implement multiple layers of authentication to protect account access and sensitive data',
    importance: 'recommended',
    implementation: {
      steps: [
        'Enable password-based authentication',
        'Add second factor (SMS or authenticator app)',
        'Implement biometric authentication where available',
        'Create backup authentication methods'
      ],
      timeRequired: '1-2 weeks',
      difficulty: 'moderate',
      resources: ['Authentication service', 'Mobile device management', 'User training materials']
    },
    benefits: [
      'Significantly improved account security',
      'Protection against unauthorized access',
      'Compliance with security standards',
      'Enhanced user confidence'
    ],
    examples: [
      'Password + SMS verification for account access',
      'Biometric authentication for sensitive operations',
      'Backup codes for account recovery'
    ],
    relatedTopics: ['Account Security', 'Authentication', 'Digital Protection']
  }
]

// Default mock privacy settings used to seed the component state.
export const getDefaultPrivacySettings = (): PrivacySetting[] => [
  {
    id: 'set-001',
    name: 'Location Precision Control',
    description: 'Control the precision level of location data shared for emergency response',
    currentValue: 3,
    recommendedValue: 2,
    impact: 'medium',
    category: 'privacy',
    lastReviewed: new Date(Date.now() - 5 * DAY_MS)
  },
  {
    id: 'set-002',
    name: 'Data Retention Period',
    description: 'Set how long different types of data are retained in the system',
    currentValue: 90,
    recommendedValue: 30,
    impact: 'medium',
    category: 'data_management',
    lastReviewed: new Date(Date.now() - 10 * DAY_MS)
  },
  {
    id: 'set-003',
    name: 'Differential Privacy Toggle',
    description: 'Enable or disable mathematical noise addition for privacy protection',
    currentValue: true,
    recommendedValue: true,
    impact: 'low',
    category: 'security',
    lastReviewed: new Date(Date.now() - 2 * DAY_MS)
  }
]

// Convenience helper kept for compatibility with prior call sites.
export const impactToStatus = (impact: ImpactLevel) => getRiskColor(impact)
export const riskToStatus = (risk: RiskLevel) => getRiskColor(risk)
