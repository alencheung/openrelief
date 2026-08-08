/**
 * Granular Data Controls Component for OpenRelief
 *
 * This component provides fine-grained permission settings by data type,
 * location privacy zones, emergency response preferences, and trust score visibility.
 *
 * Rendering for each tab is split across companion files:
 * - data-controls-types.ts    shared type definitions
 * - data-controls-helpers.ts  initial mock state + pure helpers
 * - PermissionsTab.tsx        data-type permission cards
 * - ZonesTab.tsx              location privacy zone cards
 * - EmergencyTab.tsx          emergency response preferences
 * - TrustTab.tsx              trust score configuration
 * - ProcessingPurposes.tsx    legal-basis tracking card
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'
import type {
  DataProcessingPurpose,
  DataTypePermission,
  EmergencyDataPreference,
  LocationPrivacyZone,
  TrustScoreSettings
} from './data-controls-types'
import {
  createPrivacyZone,
  getEncryptionLevelColor,
  getPrivacyLevelColor,
  initialDataPermissions,
  initialDataProcessingPurposes,
  initialEmergencyPreferences,
  initialPrivacyZones,
  initialTrustScoreSettings
} from './data-controls-helpers'
import PermissionsTab from './PermissionsTab'
import ZonesTab from './ZonesTab'
import EmergencyTab from './EmergencyTab'
import TrustTab from './TrustTab'
import ProcessingPurposes from './ProcessingPurposes'

type TabKey = 'permissions' | 'zones' | 'emergency' | 'trust'

const TABS: TabKey[] = ['permissions', 'zones', 'emergency', 'trust']

const TAB_LABELS: Record<TabKey, string> = {
  permissions: 'Data Permissions',
  zones: 'Privacy Zones',
  emergency: 'Emergency Settings',
  trust: 'Trust Score Settings'
}

const DataControls: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('permissions')
  const [isLoading, setIsLoading] = useState(false)

  // Mock data for demonstration
  const [dataPermissions, setDataPermissions] = useState<DataTypePermission[]>(
    initialDataPermissions
  )

  const [privacyZones, setPrivacyZones] = useState<LocationPrivacyZone[]>(
    initialPrivacyZones
  )

  const [emergencyPreferences, setEmergencyPreferences] = useState<
    EmergencyDataPreference[]
  >(initialEmergencyPreferences)

  const [trustScoreSettings, setTrustScoreSettings] = useState<TrustScoreSettings>(
    initialTrustScoreSettings
  )

  const [dataProcessingPurposes] = useState<DataProcessingPurpose[]>(
    initialDataProcessingPurposes
  )

  // Handle permission toggle
  const togglePermission = (id: string) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id ? { ...permission, enabled: !permission.enabled } : permission
      )
    )
  }

  // Update sharing settings
  const updateSharingSettings = (
    id: string,
    sharingType: keyof DataTypePermission['sharingSettings']
  ) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id
          ? {
              ...permission,
              sharingSettings: {
                ...permission.sharingSettings,
                [sharingType]: !permission.sharingSettings[sharingType]
              }
            }
          : permission
      )
    )
  }

  // Update encryption level
  const updateEncryptionLevel = (
    id: string,
    level: DataTypePermission['encryptionLevel']
  ) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id ? { ...permission, encryptionLevel: level } : permission
      )
    )
  }

  // Update retention period
  const updateRetentionDays = (id: string, retentionDays: number) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id ? { ...permission, retentionDays } : permission
      )
    )
  }

  // Add new privacy zone
  const addPrivacyZone = () => {
    setPrivacyZones(prev => [...prev, createPrivacyZone()])
  }

  // Update privacy zone
  const updatePrivacyZone = (id: string, updates: Partial<LocationPrivacyZone>) => {
    setPrivacyZones(prev => prev.map(zone => (zone.id === id ? { ...zone, ...updates } : zone)))
  }

  // Delete privacy zone
  const deletePrivacyZone = (id: string) => {
    setPrivacyZones(prev => prev.filter(zone => zone.id !== id))
  }

  // Toggle emergency auto-share
  const toggleAutoShare = (id: string) => {
    setEmergencyPreferences(prev =>
      prev.map(pref => (pref.id === id ? { ...pref, autoShare: !pref.autoShare } : pref))
    )
  }

  // Save all settings to the real privacy settings API
  const saveAllSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/privacy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          settings: {
            dataProcessingPurposes: dataPermissions
              .filter((p: DataTypePermission) => p.enabled)
              .map((p: DataTypePermission) => p.id)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save settings (${response.status})`)
      }

      toast({
        title: 'Settings Saved',
        description: 'Your granular data controls have been saved successfully.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save data controls',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Granular Data Controls</h1>
        <Button onClick={saveAllSettings} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Data Permissions Tab */}
      {activeTab === 'permissions' && (
        <PermissionsTab
          permissions={dataPermissions}
          onToggle={togglePermission}
          onToggleSharing={updateSharingSettings}
          onUpdateEncryption={updateEncryptionLevel}
          onChangeRetention={updateRetentionDays}
          getEncryptionColor={getEncryptionLevelColor}
        />
      )}

      {/* Privacy Zones Tab */}
      {activeTab === 'zones' && (
        <ZonesTab
          zones={privacyZones}
          onAdd={addPrivacyZone}
          onUpdate={updatePrivacyZone}
          onDelete={deletePrivacyZone}
          getPrivacyColor={getPrivacyLevelColor}
        />
      )}

      {/* Emergency Settings Tab */}
      {activeTab === 'emergency' && (
        <EmergencyTab
          preferences={emergencyPreferences}
          onToggleAutoShare={toggleAutoShare}
        />
      )}

      {/* Trust Score Settings Tab */}
      {activeTab === 'trust' && (
        <TrustTab settings={trustScoreSettings} onUpdate={setTrustScoreSettings} />
      )}

      {/* Data Processing Purposes */}
      <ProcessingPurposes purposes={dataProcessingPurposes} />
    </div>
  )
}

export default DataControls
