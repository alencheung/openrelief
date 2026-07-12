/**
 * Privacy Education - Practices & Settings Tab Components
 *
 * PracticesTab and SettingsTab extracted from privacy-education-tabs.tsx to
 * keep each module under 500 lines.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  Award,
  ExternalLink,
  Eye,
  Settings,
  Star,
  ThumbsUp
} from 'lucide-react'
import type {
  BestPractice,
  PrivacySetting
} from './privacy-education-types'
import {
  formatTimeAgo,
  getImportanceColor,
  getRiskColor
} from './privacy-education-helpers'

interface PracticesTabProps {
  bestPractices: BestPractice[]
}

export const PracticesTab: React.FC<PracticesTabProps> = ({ bestPractices }) => (
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
        {bestPractices.map(practice => (
          <div key={practice.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StatusIndicator status={getImportanceColor(practice.importance)} label="" />
                <div>
                  <h3 className="font-medium">{practice.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600 capitalize">{practice.importance}</span>
                    <StatusIndicator
                      status={getImportanceColor(practice.importance)}
                      label={practice.importance}
                    />
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
                    {practice.implementation.resources.map(resource => (
                      <span
                        key={resource}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
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
                {practice.benefits.map(benefit => (
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
                {practice.examples.map(example => (
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
                  {practice.relatedTopics.map(topic => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                    >
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
)

interface SettingsTabProps {
  privacySettings: PrivacySetting[]
}

const formatValue = (value: boolean | string | number): string =>
  typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : value.toString()

const formatRecommended = (value: boolean | string | number): string =>
  typeof value === 'boolean' ? (value ? 'Enable' : 'Disable') : value.toString()

export const SettingsTab: React.FC<SettingsTabProps> = ({ privacySettings }) => (
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
        {privacySettings.map(setting => (
          <div key={setting.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StatusIndicator status={getRiskColor(setting.impact)} label="" />
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
                <div className="font-medium">{formatValue(setting.currentValue)}</div>
              </div>
              <div>
                <span className="text-gray-600">Recommended:</span>
                <div className="font-medium text-green-600">
                  {formatRecommended(setting.recommendedValue)}
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
                <StatusIndicator status={getRiskColor(setting.impact)} label={setting.impact} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
)
