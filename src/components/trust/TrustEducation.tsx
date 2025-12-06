'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Shield, 
  TrendingUp, 
  Users, 
  Clock, 
  MapPin, 
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Target,
  Zap,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTrustThresholds } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface TrustEducationProps {
  compact?: boolean
  className?: string
}

interface EducationSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  content: React.ReactNode
  level: 'beginner' | 'intermediate' | 'advanced'
}

export function TrustEducation({ compact = false, className }: TrustEducationProps) {
  const thresholds = useTrustThresholds()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())

  const sections: EducationSection[] = [
    {
      id: 'basics',
      title: 'Trust System Basics',
      icon: BookOpen,
      description: 'Understanding how trust scores work',
      level: 'beginner',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">What is Trust Score?</h4>
            <p className="text-sm text-muted-foreground">
              Your trust score represents your reliability and accuracy in reporting and confirming emergencies. 
              It ranges from 0% to 100% and is calculated based on multiple factors.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Why It Matters</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Higher trust scores give your reports more weight</li>
              <li>• Required to confirm or dispute other users' reports</li>
              <li>• Helps maintain system reliability</li>
              <li>• Builds community confidence</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                <h5 className="font-medium">High Trust (70%+)</h5>
                <p className="text-xs text-muted-foreground">
                  Full access to all features, reports carry maximum weight
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
                <h5 className="font-medium">Low Trust (<30%)</h5>
                <p className="text-xs text-muted-foreground">
                  Limited reporting capabilities, reports require verification
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'factors',
      title: 'Trust Factors',
      icon: Target,
      description: 'What influences your trust score',
      level: 'intermediate',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Reporting Accuracy</h5>
                  <p className="text-xs text-muted-foreground">
                    How often your reports are confirmed vs disputed
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Confirmation Accuracy</h5>
                  <p className="text-xs text-muted-foreground">
                    Accuracy when confirming others' reports
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Dispute Accuracy</h5>
                  <p className="text-xs text-muted-foreground">
                    Validity of your disputes against reports
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Response Time</h5>
                  <p className="text-xs text-muted-foreground">
                    How quickly you respond to emergencies
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Location Accuracy</h5>
                  <p className="text-xs text-muted-foreground">
                    Precision of your location reports
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <h5 className="font-medium text-sm">Community Endorsement</h5>
                  <p className="text-xs text-muted-foreground">
                    Recognition from other trusted users
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-800">Penalty System</h5>
                  <p className="text-sm text-amber-700">
                    False reports, spam, or malicious behavior will result in penalty points 
                    that significantly reduce your trust score and may lead to account restrictions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'thresholds',
      title: 'Trust Thresholds',
      icon: Shield,
      description: 'Required scores for different actions',
      level: 'intermediate',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">Report Emergency</h5>
                  <Badge variant="outline">{(thresholds.reporting * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum trust score required to submit new emergency reports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">Confirm Events</h5>
                  <Badge variant="outline">{(thresholds.confirming * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Required to confirm or validate other users' reports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">Dispute Events</h5>
                  <Badge variant="outline">{(thresholds.disputing * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Required to challenge or dispute emergency reports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">High Trust Status</h5>
                  <Badge variant="default">{(thresholds.highTrust * 100).toFixed(0)}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Unlocks premium features and maximum influence
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Progressive Access</h5>
            <p className="text-sm text-blue-800">
              As your trust score increases, you gain access to more features and your reports 
              carry more weight in the consensus system. Start with basic reporting and work your 
              way up to high-trust privileges.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'improvement',
      title: 'Improving Your Score',
      icon: TrendingUp,
      description: 'How to build and maintain trust',
      level: 'advanced',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <Zap className="h-6 w-6 text-green-600 mb-2" />
                <h5 className="font-medium mb-2">Quick Wins</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Report accurate emergencies promptly</li>
                  <li>• Confirm verified reports quickly</li>
                  <li>• Provide detailed, factual information</li>
                  <li>• Use precise location data</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Eye className="h-6 w-6 text-blue-600 mb-2" />
                <h5 className="font-medium mb-2">Long-term Strategy</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maintain consistent activity</li>
                  <li>• Build expertise in specific areas</li>
                  <li>• Engage with community confirmations</li>
                  <li>• Avoid disputes unless necessary</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <AlertTriangle className="h-5 w-5 text-red-600 mb-2" />
              <h5 className="font-medium text-red-800">Score Impact</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-sm font-medium text-green-700">Positive Actions</p>
                  <p className="text-xs text-green-600">+1% to +5% per action</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700">Failed Reports</p>
                  <p className="text-xs text-orange-600">-5% to -15% per action</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">Malicious Behavior</p>
                  <p className="text-xs text-red-600">-20% to -50% per action</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ]

  const getLevelColor = (level: EducationSection['level']) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  const handleSectionComplete = (sectionId: string) => {
    setCompletedSections(prev => new Set(prev).add(sectionId))
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-sm">Learn About Trust</h3>
              <p className="text-xs text-muted-foreground">
                Understand how trust scores work and how to improve yours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Trust System Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-muted-foreground">
              Learn how the trust system works and how to build your reputation
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline">
                {completedSections.size} of {sections.length} completed
              </Badge>
              {completedSections.size === sections.length && (
                <Badge className="bg-green-100 text-green-800">
                  <Award className="h-3 w-3 mr-1" />
                  Mastered
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((section) => {
              const isExpanded = expandedSection === section.id
              const isCompleted = completedSections.has(section.id)
              const Icon = section.icon

              return (
                <Card 
                  key={section.id}
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    isExpanded ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                  )}
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Icon className="h-5 w-5 text-blue-600" />
                          {isCompleted && (
                            <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{section.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getLevelColor(section.level)}>
                          {section.level}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 pt-4 border-t"
                        >
                          {section.content}
                          
                          {!isCompleted && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSectionComplete(section.id)
                                }}
                                className="w-full"
                              >
                                Mark as Complete
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}