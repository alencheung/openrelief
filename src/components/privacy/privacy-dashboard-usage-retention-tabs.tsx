/**
 * Privacy Dashboard - Usage & Retention Tab Components
 *
 * UsageTab and RetentionTab extracted from privacy-dashboard-tabs.tsx to keep
 * each module under 500 lines.
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import {
  Calendar,
  CheckCircle,
  Database,
  Info
} from 'lucide-react'
import type {
  DataRetention,
  DataUsage,
  PrivacyImpactScore
} from './privacy-dashboard-types'
import {
  formatTimeAgo,
  getPrivacyBudgetStatus
} from './privacy-dashboard-helpers'
import { ToggleSwitch } from './privacy-dashboard-tabs'

interface UsageTabProps {
  dataUsage: DataUsage
  privacyImpactScore: PrivacyImpactScore
}

export const UsageTab: React.FC<UsageTabProps> = ({ dataUsage, privacyImpactScore }) => {
  const budgetStatus = getPrivacyBudgetStatus(dataUsage)
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Data Usage & Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Query Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Queries:</span>
                <span>{dataUsage.totalQueries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location Queries:</span>
                <span>{dataUsage.locationQueries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profile Views:</span>
                <span>{dataUsage.profileViews}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Exports:</span>
                <span>{dataUsage.dataExports}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Privacy Budget</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Used Today:</span>
                <span>{(dataUsage.privacyBudgetUsed * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    budgetStatus.color === 'critical' && 'bg-red-600'
                  } ${budgetStatus.color === 'pending' && 'bg-yellow-600'} ${
                    budgetStatus.color === 'active' && 'bg-blue-600'
                  } ${budgetStatus.color === 'resolved' && 'bg-green-600'}`}
                  style={{ width: `${dataUsage.privacyBudgetUsed * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <StatusIndicator status={budgetStatus.color} label={budgetStatus.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Activity:</span>
                <span>{formatTimeAgo(dataUsage.lastActivity)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Impact Score */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium mb-4">Privacy Impact Assessment</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Current Action Score:</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{privacyImpactScore.score}</span>
                <StatusIndicator
                  status={
                    (privacyImpactScore.score >= 80 && 'resolved') ||
                    (privacyImpactScore.score >= 60 && 'pending') ||
                    'critical'
                  }
                  label=""
                />
              </div>
            </div>

            <div className="mb-3">
              <h4 className="font-medium mb-2">Contributing Factors:</h4>
              <ul className="space-y-1">
                {privacyImpactScore.factors.map((factor, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {privacyImpactScore.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface RetentionTabProps {
  dataRetention: DataRetention[]
  onDataChange: (items: DataRetention[]) => void
}

export const RetentionTab: React.FC<RetentionTabProps> = ({ dataRetention, onDataChange }) => (
  <div className="space-y-6">
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Data Retention Timeline</h2>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">Automatic cleanup enabled</span>
        </div>
      </div>

      <div className="space-y-4">
        {dataRetention.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium">{item.dataType}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <ToggleSwitch
                  checked={item.autoDelete}
                  onChange={value => {
                    const updated = [...dataRetention]
                    updated[index] = { ...updated[index]!, autoDelete: value }
                    onDataChange(updated)
                  }}
                />
                <span className="text-sm text-gray-600">Auto-delete</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Retention Period:</span>
                <div className="font-medium">{item.retentionDays} days</div>
              </div>
              <div>
                <span className="text-gray-600">Records Count:</span>
                <div className="font-medium">{item.dataCount}</div>
              </div>
              <div>
                <span className="text-gray-600">Data Size:</span>
                <div className="font-medium">{item.dataSize}</div>
              </div>
              <div>
                <span className="text-gray-600">Last Accessed:</span>
                <div className="font-medium">{formatTimeAgo(item.lastAccessed)}</div>
              </div>
            </div>

            {/* Retention Timeline Visualization */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Retention Timeline:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (item.retentionDays / 365) * 100)}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{item.retentionDays} days</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* Data Retention Summary */}
    <Card className="p-6">
      <h3 className="font-medium mb-4">Retention Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {dataRetention.reduce((sum, item) => sum + item.dataCount, 0)}
          </div>
          <div className="text-gray-600">Total Records</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {dataRetention.filter(item => item.autoDelete).length}
          </div>
          <div className="text-gray-600">Auto-delete Enabled</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {dataRetention.reduce((sum, item) => sum + item.retentionDays, 0) / dataRetention.length}
          </div>
          <div className="text-gray-600">Avg. Retention (days)</div>
        </div>
      </div>
    </Card>
  </div>
)
