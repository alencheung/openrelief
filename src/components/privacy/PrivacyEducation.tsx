/**
 * Privacy Education and Guidance Component for OpenRelief
 * 
 * This component provides interactive privacy tutorials, data minimization recommendations,
 * privacy setting suggestions, risk assessment tools, and best practices guidance.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Play,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Zap,
  Brain,
  Heart,
  Users,
  Database,
  BarChart3,
  TrendingUp,
  Award,
  Target,
  Lightbulb,
  ChevronRight,
  Download,
  ExternalLink,
  Video,
  MessageSquare,
  CheckSquare,
  Clock,
  Calendar,
  HelpCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Filter,
  Search
} from 'lucide-react';

// Types for privacy education
interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  category: 'basics' | 'advanced' | 'emergency' | 'legal';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completed: boolean;
  progress: number; // 0-100
  topics: string[];
  interactiveElements: boolean;
  lastAccessed?: Date;
}

interface Recommendation {
  id: string;
  type: 'data_minimization' | 'privacy_setting' | 'security_enhancement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'difficult';
  priority: number; // 1-10
  implemented: boolean;
  savings: string; // Time, data, or cost savings
}

interface RiskAssessment {
  id: string;
  category: 'data_sharing' | 'location_privacy' | 'communication' | 'third_party' | 'legal_compliance';
  title: string;
  description: string;
  currentRisk: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    weight: number;
    description: string;
  }[];
  score: number; // 0-100
  recommendations: string[];
  lastAssessed: Date;
}

interface BestPractice {
  id: string;
  category: 'data_protection' | 'emergency_response' | 'digital_security' | 'user_rights';
  title: string;
  description: string;
  importance: 'essential' | 'recommended' | 'advanced';
  implementation: {
    steps: string[];
    timeRequired: string;
    difficulty: 'easy' | 'moderate' | 'difficult';
    resources: string[];
  };
  benefits: string[];
  examples: string[];
  relatedTopics: string[];
}

interface PrivacySetting {
  id: string;
  name: string;
  description: string;
  currentValue: boolean | string | number;
  recommendedValue: boolean | string | number;
  impact: 'low' | 'medium' | 'high';
  category: 'security' | 'privacy' | 'data_management';
  lastReviewed: Date;
}

const PrivacyEducation: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'tutorials' | 'recommendations' | 'assessment' | 'practices' | 'settings'>('tutorials');
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const [tutorials, setTutorials] = useState<Tutorial[]>([
    {
      id: 'tut-001',
      title: 'Privacy Basics: Understanding Your Rights',
      description: 'Learn about your fundamental privacy rights and how they apply to emergency response services',
      duration: 15,
      category: 'basics',
      difficulty: 'beginner',
      completed: true,
      progress: 100,
      topics: ['GDPR Rights', 'Data Protection', 'Emergency Response Privacy'],
      interactiveElements: true,
      lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'tut-002',
      title: 'Location Privacy Zones Setup',
      description: 'Step-by-step guide to setting up and managing privacy zones for different locations',
      duration: 20,
      category: 'advanced',
      difficulty: 'intermediate',
      completed: false,
      progress: 65,
      topics: ['Privacy Zones', 'Geofencing', 'Location Anonymization'],
      interactiveElements: true,
      lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'tut-003',
      title: 'Emergency Data Sharing Configuration',
      description: 'Configure how your data is shared during emergency situations and with trusted partners',
      duration: 12,
      category: 'emergency',
      difficulty: 'beginner',
      completed: true,
      progress: 100,
      topics: ['Emergency Sharing', 'Trusted Contacts', 'Data Prioritization'],
      interactiveElements: false,
      lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'tut-004',
      title: 'Legal Rights Exercise Guide',
      description: 'Complete guide to exercising your GDPR rights including access, correction, and erasure',
      duration: 25,
      category: 'legal',
      difficulty: 'advanced',
      completed: false,
      progress: 30,
      topics: ['Data Access', 'Rectification', 'Erasure', 'Portability'],
      interactiveElements: true,
      lastAccessed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: 'rec-001',
      type: 'data_minimization',
      title: 'Enable Location Precision Reduction',
      description: 'Reduce location precision from exact coordinates to neighborhood-level for better privacy',
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
      description: 'Enable mathematical noise addition to protect your data while maintaining utility',
      impact: 'medium',
      effort: 'moderate',
      priority: 9,
      implemented: true,
      savings: 'Provides ε-differential privacy guarantee'
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
  ]);

  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([
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
      lastAssessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
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
      lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [bestPractices, setBestPractices] = useState<BestPractice[]>([
    {
      id: 'prac-001',
      category: 'data_protection',
      title: 'Data Minimization Principle',
      description: 'Collect and process only the minimum amount of personal data necessary for emergency response',
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
      description: 'Establish clear protocols for prioritizing and sharing different types of emergency data',
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
        resources: ['Emergency response expertise', 'Protocol development', 'Trust management system']
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
      description: 'Implement multiple layers of authentication to protect account access and sensitive data',
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
  ]);

  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: 'set-001',
      name: 'Location Precision Control',
      description: 'Control the precision level of location data shared for emergency response',
      currentValue: 3,
      recommendedValue: 2,
      impact: 'medium',
      category: 'privacy',
      lastReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'set-002',
      name: 'Data Retention Period',
      description: 'Set how long different types of data are retained in the system',
      currentValue: 90,
      recommendedValue: 30,
      impact: 'medium',
      category: 'data_management',
      lastReviewed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'set-003',
      name: 'Differential Privacy Toggle',
      description: 'Enable or disable mathematical noise addition for privacy protection',
      currentValue: true,
      recommendedValue: true,
      impact: 'low',
      category: 'security',
      lastReviewed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Start tutorial
  const startTutorial = (id: string) => {
    setSelectedTutorial(id);
  };

  // Implement recommendation
  const implementRecommendation = async (id: string) => {
    setIsLoading(true);
    try {
      // In a real implementation, apply the recommendation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === id 
            ? { ...rec, implemented: true }
            : rec
        )
      );
      
      toast({
        title: "Recommendation Applied",
        description: "The privacy recommendation has been successfully implemented."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply recommendation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  // Get importance color
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'essential': return 'red';
      case 'recommended': return 'blue';
      case 'advanced': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Privacy Education & Guidance</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Learn & Improve</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['tutorials', 'recommendations', 'assessment', 'practices', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'tutorials' ? 'Interactive Tutorials' :
             tab === 'recommendations' ? 'Smart Recommendations' :
             tab === 'assessment' ? 'Risk Assessment' :
             tab === 'practices' ? 'Best Practices' :
             tab === 'settings' ? 'Privacy Settings' : tab}
          </button>
        ))}
      </div>

      {/* Tutorials Tab */}
      {activeTab === 'tutorials' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Interactive Privacy Tutorials</h2>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="basics">Basics</option>
                    <option value="advanced">Advanced</option>
                    <option value="emergency">Emergency</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Search tutorials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorials
                .filter(tutorial => 
                  (filterCategory === 'all' || tutorial.category === filterCategory) &&
                  (searchQuery === '' || 
                    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map((tutorial) => (
                  <div key={tutorial.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {tutorial.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Play className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{tutorial.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600 capitalize">
                              {tutorial.difficulty}
                            </span>
                            <span className="text-sm text-gray-600">• {tutorial.duration}min</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {tutorial.interactiveElements && (
                          <div className="flex items-center space-x-1">
                            <Zap className="h-4 w-4" />
                            <span>Interactive</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{tutorial.description}</p>
                    
                    <div className="mb-3">
                      <h4 className="font-medium mb-2">Topics Covered:</h4>
                      <div className="flex flex-wrap gap-2">
                        {tutorial.topics.map((topic) => (
                          <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Progress: {tutorial.progress}%
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${tutorial.progress}%` }}
                          ></div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => startTutorial(tutorial.id)}
                        >
                          {tutorial.completed ? 'Review' : 'Start'}
                        </Button>
                      </div>
                    </div>
                    
                    {tutorial.lastAccessed && (
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Last accessed: {tutorial.lastAccessed.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Smart Privacy Recommendations</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Brain className="h-4 w-4" />
                <span>AI-powered suggestions</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getRiskColor(rec.impact)} text="" />
                      <div>
                        <h3 className="font-medium">{rec.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600 capitalize">
                            {rec.type.replace('_', ' ')}
                          </span>
                          <StatusIndicator status={getRiskColor(rec.impact)} text={rec.impact} />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {rec.implemented ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Implemented</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{rec.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Effort Level:</span>
                      <div className="font-medium capitalize">{rec.effort}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Priority:</span>
                      <div className="font-medium">#{rec.priority}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Potential Savings:</span>
                      <div className="font-medium">{rec.savings}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => implementRecommendation(rec.id)}
                      disabled={rec.implemented || isLoading}
                    >
                      {rec.implemented ? 'View Details' : 'Implement'}
                    </Button>
                    {rec.savings && (
                      <span className="text-sm text-green-600 font-medium">
                        Save {rec.savings}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Privacy Risk Assessment</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Identify and mitigate risks</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {riskAssessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getRiskColor(assessment.currentRisk)} text="" />
                      <div>
                        <h3 className="font-medium">{assessment.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">Risk Score:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold">{assessment.score}</span>
                            <StatusIndicator status={getRiskColor(assessment.currentRisk)} text={assessment.currentRisk} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {assessment.lastAssessed && `Last assessed: ${formatTimeAgo(assessment.lastAssessed)}`}
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{assessment.description}</p>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Risk Factors:</h4>
                    <div className="space-y-2">
                      {assessment.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{factor.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  factor.risk === 'critical' ? 'bg-red-600' :
                                  factor.risk === 'high' ? 'bg-orange-600' :
                                  factor.risk === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                                }`}
                                style={{ width: `${factor.weight * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{factor.weight}</span>
                            <StatusIndicator status={getRiskColor(factor.risk)} text={factor.risk} />
                          </div>
                        </div>
                        <div className="flex-1 text-sm text-gray-600">{factor.description}</div>
                      </div>
                    ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <div className="space-y-1">
                      {assessment.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-1" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Best Practices Tab */}
      {activeTab === 'practices' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Privacy Best Practices</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Award className="h-4 w-4" />
                <span>Industry standards & guidelines</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {bestPractices.map((practice) => (
                <div key={practice.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getImportanceColor(practice.importance)} text="" />
                      <div>
                        <h3 className="font-medium">{practice.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600 capitalize">
                            {practice.importance}
                          </span>
                          <StatusIndicator status={getImportanceColor(practice.importance)} text={practice.importance} />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Category: {practice.category.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{practice.description}</p>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Implementation:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="mb-2">
                        <span className="text-gray-600">Time Required:</span>
                        <div className="font-medium">{practice.implementation.timeRequired}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-gray-600">Difficulty:</span>
                        <div className="font-medium capitalize">{practice.implementation.difficulty}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Resources:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {practice.implementation.resources.map((resource) => (
                            <span key={resource} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {resource}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Benefits:</h4>
                    <div className="space-y-1">
                      {practice.benefits.map((benefit) => (
                        <div key={benefit} className="flex items-start space-x-2">
                          <ThumbsUp className="h-4 w-4 text-green-600 mt-1" />
                          <span className="text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Examples:</h4>
                    <div className="space-y-1">
                      {practice.examples.map((example) => (
                        <div key={example} className="flex items-start space-x-2">
                          <Star className="h-4 w-4 text-blue-600 mt-1" />
                          <span className="text-sm">{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Related:</span>
                      <div className="flex flex-wrap gap-1">
                        {practice.relatedTopics.map((topic) => (
                          <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Privacy Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recommended Privacy Settings</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Settings className="h-4 w-4" />
                <span>Optimize your configuration</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {privacySettings.map((setting) => (
                <div key={setting.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getRiskColor(setting.impact)} text="" />
                      <div>
                        <h3 className="font-medium">{setting.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {setting.lastReviewed && `Last reviewed: ${formatTimeAgo(setting.lastReviewed)}`}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Current Value:</span>
                      <div className="font-medium">
                        {typeof setting.currentValue === 'boolean' 
                          ? (setting.currentValue ? 'Enabled' : 'Disabled')
                          : setting.currentValue.toString()
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Recommended:</span>
                      <div className="font-medium text-green-600">
                        {typeof setting.recommendedValue === 'boolean' 
                          ? (setting.recommendedValue ? 'Enable' : 'Disable')
                          : setting.recommendedValue.toString()
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Apply Recommendation
                    </Button>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Impact:</span>
                      <StatusIndicator status={getRiskColor(setting.impact)} text={setting.impact} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PrivacyEducation;