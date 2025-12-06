/**
 * Privacy Settings Page for OpenRelief
 * 
 * This page provides detailed privacy settings configuration
 * with granular controls and advanced options
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Shield, 
  Eye, 
  Lock, 
  Clock, 
  Globe, 
  Users,
  Database,
  Key,
  Bell,
  ChevronDown,
  ChevronUp,
  Info,
  Check
} from 'lucide-react'
import { usePrivacy } from '@/hooks/usePrivacy'
import { useToast } from '@/hooks/use-toast'
import { PrivacySettings } from '@/hooks/usePrivacy'

interface SettingSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  settings: {
    key: keyof PrivacySettings
    label: string
    description: string
    type: 'toggle' | 'select' | 'number'
    options?: string[]
    min?: number
    max?: number
    step?: number
  }[]
}

const PrivacySettingsPage: React.FC = () => {
  const { toast } = useToast()
  const { privacyContext, updateSettings } = usePrivacy()
  const [expandedSections, setExpandedSections] = useState<string[]>(['data-protection', 'data-sharing'])
  const [localSettings, setLocalSettings] = useState<PrivacySettings>(privacyContext.settings)
  const [hasChanges, setHasChanges] = useState(false)

  const settingSections: SettingSection[] = [
    {
      id: 'data-protection',
      title: 'Data Protection',
      description: 'Configure how your data is protected and anonymized',
      icon: Shield,
      settings: [
        {
          key: 'anonymizeData',
          label: 'Data Anonymization',
          description: 'Automatically anonymize your personal data to protect your identity',
          type: 'toggle'
        },
        {
          key: 'differentialPrivacy',
          label: 'Differential Privacy',
          description: 'Add mathematical noise to your data to prevent re-identification',
          type: 'toggle'
        },
        {
          key: 'kAnonymity',
          label: 'K-Anonymity Protection',
          description: 'Ensure your data cannot be distinguished from at least k-1 other users',
          type: 'toggle'
        },
        {
          key: 'endToEndEncryption',
          label: 'End-to-End Encryption',
          description: 'Encrypt your data so only you can access it',
          type: 'toggle'
        },
        {
          key: 'locationPrecision',
          label: 'Location Precision',
          description: 'How precisely your location is stored (1=least precise, 5=most precise)',
          type: 'number',
          min: 1,
          max: 5,
          step: 1
        }
      ]
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing',
      description: 'Control how your data is shared with others',
      icon: Users,
      settings: [
        {
          key: 'locationSharing',
          label: 'Location Sharing',
          description: 'Allow sharing your location for emergency response',
          type: 'toggle'
        },
        {
          key: 'emergencyDataSharing',
          label: 'Emergency Data Sharing',
          description: 'Share your data with emergency services during crises',
          type: 'toggle'
        },
        {
          key: 'researchParticipation',
          label: 'Research Participation',
          description: 'Contribute anonymized data for emergency response research',
          type: 'toggle'
        },
        {
          key: 'thirdPartyAnalytics',
          label: 'Third-Party Analytics',
          description: 'Share usage analytics with trusted partners for service improvement',
          type: 'toggle'
        }
      ]
    },
    {
      id: 'data-retention',
      title: 'Data Retention',
      description: 'Configure how long your data is stored',
      icon: Clock,
      settings: [
        {
          key: 'dataRetentionDays',
          label: 'Data Retention Period',
          description: 'Number of days to keep your data before automatic deletion',
          type: 'number',
          min: 7,
          max: 365,
          step: 7
        },
        {
          key: 'automatedDataCleanup',
          label: 'Automated Data Cleanup',
          description: 'Automatically remove old data according to retention policies',
          type: 'toggle'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Privacy Notifications',
      description: 'Configure alerts about your privacy and data usage',
      icon: Bell,
      settings: [
        {
          key: 'privacyBudgetAlerts',
          label: 'Privacy Budget Alerts',
          description: 'Get notified when your privacy budget is running low',
          type: 'toggle'
        },
        {
          key: 'legalNotifications',
          label: 'Legal Request Notifications',
          description: 'Receive updates about legal requests involving your data',
          type: 'toggle'
        },
        {
          key: 'realTimeMonitoring',
          label: 'Real-time Monitoring',
          description: 'Monitor data processing activities in real-time',
          type: 'toggle'
        }
      ]
    },
    {
      id: 'consent',
      title: 'Consent Management',
      description: 'Manage your consent preferences',
      icon: Check,
      settings: [
        {
          key: 'consentManagement',
          label: 'Granular Consent Control',
          description: 'Provide consent for specific data processing purposes',
          type: 'toggle'
        }
      ]
    }
  ]

  useEffect(() => {
    setLocalSettings(privacyContext.settings)
  }, [privacyContext.settings])

  useEffect(() => {
    const hasChanged = JSON.stringify(localSettings) !== JSON.stringify(privacyContext.settings)
    setHasChanges(hasChanged)
  }, [localSettings, privacyContext.settings])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const updateLocalSetting = (key: keyof PrivacySettings, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveSettings = () => {
    updateSettings(localSettings)
    toast({
      title: "Settings Saved",
      description: "Your privacy settings have been updated successfully."
    })
    setHasChanges(false)
  }

  const resetToDefaults = () => {
    const defaultSettings: PrivacySettings = {
      locationSharing: true,
      locationPrecision: 3,
      dataRetentionDays: 30,
      anonymizeData: true,
      differentialPrivacy: true,
      kAnonymity: true,
      endToEndEncryption: true,
      emergencyDataSharing: true,
      researchParticipation: false,
      thirdPartyAnalytics: false,
      automatedDataCleanup: true,
      privacyBudgetAlerts: true,
      legalNotifications: true,
      dataProcessingPurposes: ['service_delivery', 'safety_monitoring'],
      consentManagement: true,
      realTimeMonitoring: true
    }
    
    setLocalSettings(defaultSettings)
    toast({
      title: "Settings Reset",
      description: "Privacy settings have been reset to default values."
    })
  }

  const getPrivacyLevelColor = (level: string) => {
    switch (level) {
      case 'maximum': return 'text-green-600 bg-green-100'
      case 'high': return 'text-blue-600 bg-blue-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPrivacyLevelDescription = (level: string) => {
    switch (level) {
      case 'maximum': return 'All privacy features enabled for maximum protection'
      case 'high': return 'Most privacy features enabled for strong protection'
      case 'medium': return 'Some privacy features enabled for moderate protection'
      default: return 'Basic privacy protection enabled'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
                <p className="text-sm text-gray-600">Configure your privacy preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPrivacyLevelColor(privacyContext.privacyLevel)}`}>
                {privacyContext.privacyLevel.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Level Summary */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Info className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Current Privacy Level: <span className="font-bold">{privacyContext.privacyLevel.toUpperCase()}</span>
                </p>
                <p className="text-sm text-blue-700">
                  {getPrivacyLevelDescription(privacyContext.privacyLevel)}
                </p>
              </div>
            </div>
            {hasChanges && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-orange-600 font-medium">Unsaved changes</span>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {settingSections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <div 
                className="p-6 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <section.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedSections.includes(section.id) && (
                <div className="p-6 space-y-6">
                  {section.settings.map((setting) => (
                    <div key={setting.key} className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <label className="font-medium text-gray-900" htmlFor={setting.key}>
                            {setting.label}
                          </label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      </div>
                      
                      <div className="ml-6">
                        {setting.type === 'toggle' && (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id={setting.key}
                              className="sr-only peer"
                              checked={localSettings[setting.key] as boolean}
                              onChange={(e) => updateLocalSetting(setting.key, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        )}
                        
                        {setting.type === 'number' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              id={setting.key}
                              min={setting.min}
                              max={setting.max}
                              step={setting.step}
                              value={localSettings[setting.key] as number}
                              onChange={(e) => updateLocalSetting(setting.key, parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {setting.key === 'locationPrecision' && (
                              <span className="text-sm text-gray-500">
                                {localSettings.locationPrecision === 1 ? 'Lowest' :
                                 localSettings.locationPrecision === 2 ? 'Low' :
                                 localSettings.locationPrecision === 3 ? 'Medium' :
                                 localSettings.locationPrecision === 4 ? 'High' :
                                 'Highest'}
                              </span>
                            )}
                            {setting.key === 'dataRetentionDays' && (
                              <span className="text-sm text-gray-500">days</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </Button>
          
          <div className="space-x-4">
            <Button 
              variant="outline"
              onClick={() => setLocalSettings(privacyContext.settings)}
              disabled={!hasChanges}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveSettings}
              disabled={!hasChanges}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacySettingsPage