/**
 * Enhanced Privacy Dashboard Component for OpenRelief
 *
 * This component provides users with a comprehensive view of their privacy settings,
 * data usage, and retention policies with advanced features like real-time monitoring,
 * transparency reporting, and granular controls.
 *
 * Types live in privacy-dashboard-types.ts, helper / mock data builders live in
 * privacy-dashboard-helpers.ts, and tab view components live in privacy-dashboard-tabs.tsx.
 * They are re-exported below for backward compatibility.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useToast } from '@/hooks/use-toast'

// Re-export extracted types and helpers for backward compatibility
export * from './privacy-dashboard-types'
export * from './privacy-dashboard-helpers'
import {
  createPrivacyZone,
  getDefaultDataRetention,
  getDefaultDataUsage,
  getDefaultLegalRequests,
  getDefaultPrivacyImpactScore,
  getDefaultPrivacySettings,
  getDefaultPrivacyZones,
  getDefaultThirdPartySharing,
  getPrivacyLevel
} from './privacy-dashboard-helpers'
import { OverviewTab, RetentionTab, SettingsTab, UsageTab } from './privacy-dashboard-tabs'
import type {
  DataRetention,
  LegalRequest,
  PrivacyDashboardTab,
  PrivacySettings,
  PrivacyZone,
  ThirdPartySharing
} from './privacy-dashboard-types'

const PrivacyDashboard: React.FC = () => {
  const { toast } = useToast()
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    getDefaultPrivacySettings()
  )

  const [dataUsage, _setDataUsage] = useState(getDefaultDataUsage())

  const [dataRetention, setDataRetention] = useState<DataRetention[]>(getDefaultDataRetention())

  const [_privacyZones, setPrivacyZones] = useState<PrivacyZone[]>(getDefaultPrivacyZones())

  const [_thirdPartySharing, setThirdPartySharing] = useState<ThirdPartySharing[]>(
    getDefaultThirdPartySharing()
  )

  const [_legalRequests, _setLegalRequests] = useState<LegalRequest[]>(getDefaultLegalRequests())

  const [privacyImpactScore, _setPrivacyImpactScore] = useState(getDefaultPrivacyImpactScore())

  const [activeTab, setActiveTab] = useState<PrivacyDashboardTab>('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(true)

  // Load privacy settings from server
  useEffect(() => {
    const loadPrivacySettings = async () => {
      setIsLoading(true)
      try {
        // Fetch the user's saved privacy settings from the API. Previously
        // this was commented out, so the dashboard always showed defaults.
        const response = await fetch('/api/privacy/settings', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        })
        if (response.ok) {
          const json = (await response.json()) as {
            data?: { settings?: PrivacySettings }
          }
          if (json.data?.settings) {
            setPrivacySettings(json.data.settings)
          }
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error)
        toast({
          title: 'Error',
          description: 'Failed to load privacy settings',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPrivacySettings()
  }, [toast])

  // Handle privacy setting changes
  const handleSettingChange = (key: keyof PrivacySettings, value: boolean | number) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Save privacy settings
  const savePrivacySettings = async () => {
    setIsLoading(true)
    try {
      // Persist settings to the API. Previously this was a no-op that toasted
      // success while changing nothing on the server.
      const response = await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(privacySettings)
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || `HTTP ${response.status}`)
      }

      toast({
        title: 'Success',
        description: 'Privacy settings saved successfully'
      })
    } catch (error) {
      console.error('Failed to save privacy settings:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save privacy settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset privacy settings to defaults
  const resetPrivacySettings = () => {
    setPrivacySettings(getDefaultPrivacySettings())
  }

  // Add new privacy zone
  const _addPrivacyZone = () => {
    setPrivacyZones(prev => [...prev, createPrivacyZone()])
  }

  const _updatePrivacyZone = (id: string, updates: Partial<PrivacyZone>) => {
    setPrivacyZones(prev => prev.map(zone => (zone.id === id ? { ...zone, ...updates } : zone)))
  }

  const _deletePrivacyZone = (id: string) => {
    setPrivacyZones(prev => prev.filter(zone => zone.id !== id))
  }

  const _toggleThirdPartySharing = (partner: string) => {
    setThirdPartySharing(prev =>
      prev.map(item => (item.partner === partner ? { ...item, enabled: !item.enabled } : item))
    )
  }

  const privacyLevel = getPrivacyLevel(privacySettings)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Privacy Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Privacy Level:</span>
          <StatusIndicator status={privacyLevel.color} label={privacyLevel.level} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['overview', 'settings', 'usage', 'retention', 'zones', 'sharing', 'legal'] as const).map(
          tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'zones' && 'Privacy Zones'}
              {tab === 'sharing' && 'Data Sharing'}
              {tab === 'legal' && 'Legal Requests'}
            </button>
          )
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <OverviewTab
          privacySettings={privacySettings}
          privacyImpactScore={privacyImpactScore}
          dataUsage={dataUsage}
          realTimeMonitoring={realTimeMonitoring}
          onToggleRealTimeMonitoring={setRealTimeMonitoring}
          onNavigateTab={tab => setActiveTab(tab)}
          onGenerateReport={() =>
            toast({
              title: 'Privacy Report',
              description: 'Your detailed privacy report is being generated.'
            })
          }
        />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsTab
          privacySettings={privacySettings}
          isLoading={isLoading}
          onSettingChange={handleSettingChange}
          onReset={resetPrivacySettings}
          onSave={savePrivacySettings}
        />
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <UsageTab dataUsage={dataUsage} privacyImpactScore={privacyImpactScore} />
      )}

      {/* Retention Tab */}
      {activeTab === 'retention' && (
        <RetentionTab dataRetention={dataRetention} onDataChange={setDataRetention} />
      )}
    </div>
  )
}

export default PrivacyDashboard
