/**
 * Emergency response data sharing tab for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Renders emergency-scenario preference
 * cards with sharing level, duration, geofence, and trusted recipients.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Heart, Users, Zap } from 'lucide-react'
import type { EmergencyDataPreference } from './data-controls-types'

interface EmergencyTabProps {
  preferences: EmergencyDataPreference[]
  onToggleAutoShare: (id: string) => void
}

const SHARING_LEVELS = ['minimal', 'standard', 'comprehensive'] as const

const EmergencyTab: React.FC<EmergencyTabProps> = ({
  preferences,
  onToggleAutoShare
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Emergency Response Data Sharing</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Heart className="h-4 w-4" />
            <span>Life-saving settings</span>
          </div>
        </div>

        <div className="space-y-4">
          {preferences.map(preference => (
            <div key={preference.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium capitalize">
                      {preference.scenario.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Data sharing for {preference.scenario.replace('_', ' ')} scenarios
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preference.autoShare}
                      onChange={() => onToggleAutoShare(preference.id)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Data Types */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Data Types to Share</h4>
                <div className="flex flex-wrap gap-2">
                  {preference.dataTypes.map(dataType => (
                    <span
                      key={dataType}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {dataType.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sharing Level */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Sharing Level</h4>
                <div className="flex items-center space-x-4">
                  {SHARING_LEVELS.map(level => (
                    <button
                      key={level}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        preference.sharingLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Sharing Duration</h4>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={preference.durationHours}
                    className="w-20 border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-gray-600">hours</span>
                </div>
              </div>

              {/* Geofence Required */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Geofence Required</h4>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preference.geofenceRequired}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-600">Require geofence verification</span>
                </div>
              </div>

              {/* Trusted Recipients */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Trusted Recipients</h4>
                <div className="space-y-2">
                  {preference.trustedRecipients.map(recipient => (
                    <div key={recipient} className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{recipient.replace('_', ' ')}</span>
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
}

export default EmergencyTab
