/**
 * Privacy Dashboard - Tab View Components
 *
 * Presentational sub-components for the main tabs of the Privacy Dashboard UI.
 * Extracted from PrivacyDashboard.tsx to keep the main component module
 * under the 500 line lint budget.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  Activity,
  AlertTriangle,
  Download,
  Shield,
  TrendingUp
} from 'lucide-react'
import type {
  DataUsage,
  PrivacyImpactScore,
  PrivacySettings
} from './privacy-dashboard-types'
import {
  formatTimeAgo,
  getPrivacyBudgetStatus,
  getPrivacyImpactStatus,
  getPrivacyLevel
} from './privacy-dashboard-helpers'

interface OverviewTabProps {
  privacySettings: PrivacySettings
  privacyImpactScore: PrivacyImpactScore
  dataUsage: DataUsage
  realTimeMonitoring: boolean
  onToggleRealTimeMonitoring: (value: boolean) => void
  onNavigateTab: (tab: 'retention' | 'settings') => void
  onGenerateReport: () => void
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  privacySettings,
  privacyImpactScore,
  dataUsage,
  realTimeMonitoring,
  onToggleRealTimeMonitoring,
  onNavigateTab,
  onGenerateReport
}) => {
  const privacyLevel = getPrivacyLevel(privacySettings)
  const budgetStatus = getPrivacyBudgetStatus(dataUsage)

  return (
    <div className="space-y-6">
      {/* Privacy Score Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Privacy Overview</h2>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={realTimeMonitoring}
                onChange={e => onToggleRealTimeMonitoring(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-600">Real-time</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{privacyLevel.level}</div>
            <div className="text-gray-600">Privacy Level</div>
            <div className="text-sm text-gray-500 mt-1">
              {privacyLevel.level === 'Maximum' && 'All protections enabled'}
              {privacyLevel.level === 'High' && 'Most protections enabled'}
              {privacyLevel.level === 'Medium' && 'Some protections enabled'}
              {privacyLevel.level === 'Basic' && 'Minimal protections enabled'}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold">{privacyImpactScore.score}</div>
            <div className="text-gray-600">Privacy Score</div>
            <div className="text-sm text-gray-500 mt-1">Out of 100</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold">
              {(dataUsage.privacyBudgetUsed * 100).toFixed(0)}%
            </div>
            <div className="text-gray-600">Budget Used</div>
            <StatusIndicator status={budgetStatus.color} label={budgetStatus.status} />
          </div>
        </div>
      </Card>

      {/* Real-time Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Real-time Activity</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="h-4 w-4" />
            <span>Live monitoring</span>
          </div>
        </div>

        <div className="space-y-3">
          {dataUsage.realTimeUsage.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <StatusIndicator
                  status={getPrivacyImpactStatus(activity.privacyImpact)}
                  label=""
                />
                <div>
                  <div className="font-medium capitalize">{activity.operation}</div>
                  <div className="text-sm text-gray-600">{activity.dataType} data</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{formatTimeAgo(activity.timestamp)}</div>
                <div className="text-xs capitalize text-gray-500">
                  {activity.privacyImpact} impact
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Export Your Data</h3>
              <p className="text-sm text-gray-600">Download all your personal data</p>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => onNavigateTab('retention')}
          >
            View Retention
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Privacy Report</h3>
              <p className="text-sm text-gray-600">View detailed privacy metrics</p>
            </div>
          </div>
          <Button className="mt-4 w-full" variant="outline" onClick={onGenerateReport}>
            Generate Report
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Privacy Alerts</h3>
              <p className="text-sm text-gray-600">Manage privacy notifications</p>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => onNavigateTab('settings')}
          >
            Manage Alerts
          </Button>
        </Card>
      </div>
    </div>
  )
}

interface SettingsTabProps {
  privacySettings: PrivacySettings
  isLoading: boolean
  onSettingChange: (key: keyof PrivacySettings, value: boolean | number) => void
  onReset: () => void
  onSave: () => void
}

export const ToggleSwitch: React.FC<{
  checked: boolean
  onChange: (value: boolean) => void
}> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
  </label>
)

const BooleanSettingRow: React.FC<{
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}> = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </div>
)

export const SettingsTab: React.FC<SettingsTabProps> = ({
  privacySettings,
  isLoading,
  onSettingChange,
  onReset,
  onSave
}) => (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>

      <div className="space-y-4">
        {/* Location Sharing */}
        <BooleanSettingRow
          title="Location Sharing"
          description="Share your location for emergency response"
          checked={privacySettings.locationSharing}
          onChange={value => onSettingChange('locationSharing', value)}
        />

        {/* Location Precision */}
        <div>
          <h3 className="font-medium mb-2">Location Precision</h3>
          <p className="text-sm text-gray-600 mb-3">Lower precision provides better privacy</p>
          <input
            type="range"
            min="1"
            max="5"
            value={privacySettings.locationPrecision}
            onChange={e => onSettingChange('locationPrecision', parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low (1)</span>
            <span>Medium (3)</span>
            <span>High (5)</span>
          </div>
        </div>

        {/* Data Anonymization */}
        <BooleanSettingRow
          title="Data Anonymization"
          description="Anonymize your data for analysis"
          checked={privacySettings.anonymizeData}
          onChange={value => onSettingChange('anonymizeData', value)}
        />

        {/* Differential Privacy */}
        <BooleanSettingRow
          title="Differential Privacy"
          description="Add mathematical noise to protect privacy"
          checked={privacySettings.differentialPrivacy}
          onChange={value => onSettingChange('differentialPrivacy', value)}
        />

        {/* K-Anonymity */}
        <BooleanSettingRow
          title="K-Anonymity"
          description="Ensure anonymity in groups"
          checked={privacySettings.kAnonymity}
          onChange={value => onSettingChange('kAnonymity', value)}
        />

        {/* End-to-End Encryption */}
        <BooleanSettingRow
          title="End-to-End Encryption"
          description="Encrypt sensitive data"
          checked={privacySettings.endToEndEncryption}
          onChange={value => onSettingChange('endToEndEncryption', value)}
        />

        {/* Emergency Data Sharing */}
        <BooleanSettingRow
          title="Emergency Data Sharing"
          description="Share data during emergencies"
          checked={privacySettings.emergencyDataSharing}
          onChange={value => onSettingChange('emergencyDataSharing', value)}
        />
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onReset}>
          Reset to Defaults
        </Button>
        <Button onClick={onSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </Card>
  </div>
)

// UsageTab and RetentionTab moved to a separate module for line-budget.
// Re-exported here for backward compatibility.
export { UsageTab, RetentionTab } from './privacy-dashboard-usage-retention-tabs'
