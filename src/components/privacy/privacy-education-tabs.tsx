/**
 * Privacy Education - Tab View Components
 *
 * Presentational sub-components for each tab of the Privacy Education UI.
 * Extracted from PrivacyEducation.tsx to keep the main component module
 * under the 500 line lint budget.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Filter,
  Lightbulb,
  Play,
  Search,
  Settings,
  Shield,
  Star,
  Zap
} from 'lucide-react'
import type {
  Recommendation,
  RiskAssessment,
  Tutorial
} from './privacy-education-types'
import { formatTimeAgo, getImportanceColor, getRiskColor } from './privacy-education-helpers'

interface TutorialsTabProps {
  tutorials: Tutorial[]
  filterCategory: string
  searchQuery: string
  onFilterCategoryChange: (value: string) => void
  onSearchQueryChange: (value: string) => void
  onStartTutorial: (id: string) => void
}

export const TutorialsTab: React.FC<TutorialsTabProps> = ({
  tutorials,
  filterCategory,
  searchQuery,
  onFilterCategoryChange,
  onSearchQueryChange,
  onStartTutorial
}) => (
  <div className="space-y-6">
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Interactive Privacy Tutorials</h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterCategory}
              onChange={e => onFilterCategoryChange(e.target.value)}
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
              onChange={e => onSearchQueryChange(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials
          .filter(
            tutorial =>
              (filterCategory === 'all' || tutorial.category === filterCategory) &&
              (searchQuery === '' ||
                tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map(tutorial => (
            <div
              key={tutorial.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
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
                  {tutorial.topics.map(topic => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Progress: {tutorial.progress}%</div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${tutorial.progress}%` }}
                    ></div>
                  </div>
                  <Button size="sm" onClick={() => onStartTutorial(tutorial.id)}>
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
)

interface RecommendationsTabProps {
  recommendations: Recommendation[]
  isLoading: boolean
  onImplement: (id: string) => void
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  recommendations,
  isLoading,
  onImplement
}) => (
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
        {recommendations.map(rec => (
          <div key={rec.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StatusIndicator status={getRiskColor(rec.impact)} label="" />
                <div>
                  <h3 className="font-medium">{rec.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600 capitalize">
                      {rec.type.replace('_', ' ')}
                    </span>
                    <StatusIndicator status={getRiskColor(rec.impact)} label={rec.impact} />
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
                onClick={() => onImplement(rec.id)}
                disabled={rec.implemented || isLoading}
              >
                {rec.implemented ? 'View Details' : 'Implement'}
              </Button>
              {rec.savings && (
                <span className="text-sm text-green-600 font-medium">Save {rec.savings}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
)

interface AssessmentTabProps {
  riskAssessments: RiskAssessment[]
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ riskAssessments }) => (
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
        {riskAssessments.map(assessment => (
          <div key={assessment.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StatusIndicator status={getRiskColor(assessment.currentRisk)} label="" />
                <div>
                  <h3 className="font-medium">{assessment.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600">Risk Score:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">{assessment.score}</span>
                      <StatusIndicator
                        status={getRiskColor(assessment.currentRisk)}
                        label={assessment.currentRisk}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {assessment.lastAssessed &&
                  `Last assessed: ${formatTimeAgo(assessment.lastAssessed)}`}
              </div>
            </div>

            <p className="text-gray-800 mb-3">{assessment.description}</p>

            <div className="mb-3">
              <h4 className="font-medium mb-2">Risk Factors:</h4>
              <div className="space-y-2">
                {assessment.factors.map((factor, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{factor.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              factor.risk === 'critical'
                                ? 'bg-red-600'
                                : factor.risk === 'high'
                                  ? 'bg-orange-600'
                                  : factor.risk === 'medium'
                                    ? 'bg-yellow-600'
                                    : 'bg-green-600'
                            }`}
                            style={{ width: `${factor.weight * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{factor.weight}</span>
                        <StatusIndicator status={getRiskColor(factor.risk)} label={factor.risk} />
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
)

// PracticesTab and SettingsTab moved to a separate module for line-budget.
// Re-exported here for backward compatibility.
export { PracticesTab, SettingsTab } from './privacy-education-practices-settings-tabs'
