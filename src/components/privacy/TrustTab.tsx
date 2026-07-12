/**
 * Trust Score settings tab for the Data Controls component.
 *
 * Extracted from DataControls.tsx. Renders trust-score visibility,
 * calculation transparency, data sources, and appeal process controls.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import {
  BarChart3,
  Eye,
  FileText,
  Globe,
  Mail,
  Smartphone,
  TrendingUp
} from 'lucide-react'
import type {
  TrustScoreSettings
} from './data-controls-types'

interface TrustTabProps {
  settings: TrustScoreSettings
  onUpdate: (updater: (prev: TrustScoreSettings) => TrustScoreSettings) => void
}

const VISIBILITY_OPTIONS = [
  'public',
  'private',
  'friends_only',
  'emergency_only'
] as const

const TRANSPARENCY_OPTIONS = ['minimal', 'basic', 'detailed', 'full'] as const

const CONTACT_METHODS = ['email', 'phone', 'in_app', 'mail'] as const

const TrustTab: React.FC<TrustTabProps> = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Trust Score Configuration</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <TrendingUp className="h-4 w-4" />
            <span>Reputation management</span>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="mb-6">
          <h3 className="font-medium mb-4">Score Visibility</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VISIBILITY_OPTIONS.map(visibility => (
              <button
                key={visibility}
                className={`p-3 border rounded-lg text-center ${
                  settings.visibility === visibility
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => onUpdate(prev => ({ ...prev, visibility }))}
              >
                <Eye className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="font-medium capitalize">{visibility.replace('_', ' ')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Transparency */}
        <div className="mb-6">
          <h3 className="font-medium mb-4">Calculation Transparency</h3>
          <div className="space-y-4">
            {TRANSPARENCY_OPTIONS.map(transparency => (
              <div
                key={transparency}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">{transparency}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="transparency"
                      checked={settings.calculationTransparency === transparency}
                      onChange={() =>
                        onUpdate(prev => ({
                          ...prev,
                          calculationTransparency: transparency
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        settings.calculationTransparency === transparency
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    ></div>
                  </label>
                  <span className="text-sm text-gray-600">
                    {transparency === 'minimal' && 'Basic score only'}
                    {transparency === 'basic' && 'Score + factors'}
                    {transparency === 'detailed' && 'Score + factors + history'}
                    {transparency === 'full' && 'Complete transparency'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-6">
          <h3 className="font-medium mb-4">Data Sources</h3>
          <div className="space-y-3">
            {(
              Object.entries(settings.dataSources) as Array<
                [keyof TrustScoreSettings['dataSources'], boolean]
              >
            ).map(([source, enabled]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {source.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enabled}
                    onChange={() =>
                      onUpdate(prev => ({
                        ...prev,
                        dataSources: {
                          ...prev.dataSources,
                          [source]: !enabled
                        }
                      }))
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Appeal Process */}
        <div className="mb-6">
          <h3 className="font-medium mb-4">Appeal Process</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enable Appeals</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.appealProcess.enabled}
                  onChange={() =>
                    onUpdate(prev => ({
                      ...prev,
                      appealProcess: {
                        ...prev.appealProcess,
                        enabled: !prev.appealProcess.enabled
                      }
                    }))
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response Timeframe</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.appealProcess.timeframe}
                  onChange={e =>
                    onUpdate(prev => ({
                      ...prev,
                      appealProcess: {
                        ...prev.appealProcess,
                        timeframe: parseInt(e.target.value, 10)
                      }
                    }))
                  }
                  className="w-20 border rounded px-2 py-1 text-sm"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contact Method</span>
              <div className="flex items-center space-x-2">
                {CONTACT_METHODS.map(method => (
                  <button
                    key={method}
                    className={`px-3 py-1 rounded text-sm ${
                      settings.appealProcess.contactMethod === method
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() =>
                      onUpdate(prev => ({
                        ...prev,
                        appealProcess: {
                          ...prev.appealProcess,
                          contactMethod: method
                        }
                      }))
                    }
                  >
                    {method === 'email' && <Mail className="h-4 w-4 mr-2" />}
                    {method === 'phone' && <Smartphone className="h-4 w-4 mr-2" />}
                    {method === 'in_app' && <Globe className="h-4 w-4 mr-2" />}
                    {method === 'mail' && <FileText className="h-4 w-4 mr-2" />}
                    {method.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default TrustTab
