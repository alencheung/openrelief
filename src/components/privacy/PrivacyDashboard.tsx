/**
 * Enhanced Privacy Dashboard Component for OpenRelief
 *
 * This component provides users with a comprehensive view of their privacy settings,
 * data usage, and retention policies with advanced features like real-time monitoring,
 * transparency reporting, and granular controls.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { useToast } from '@/hooks/use-toast'
import {
  Shield,
  Activity,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Settings,
  Info,
  Bell,
  Lock,
  Unlock,
  Globe,
  MapPin,
  Database,
  FileText,
  Calendar
} from 'lucide-react'

// Types for privacy settings
interface PrivacySettings {
  locationSharing: boolean;
  locationPrecision: number; // 1-5, higher is more precise
  dataRetentionDays: number;
  anonymizeData: boolean;
  differentialPrivacy: boolean;
  kAnonymity: boolean;
  endToEndEncryption: boolean;
  emergencyDataSharing: boolean;
  researchParticipation: boolean;
  thirdPartyAnalytics: boolean;
  automatedDataCleanup: boolean;
  privacyBudgetAlerts: boolean;
}

interface DataUsage {
  totalQueries: number;
  locationQueries: number;
  profileViews: number;
  dataExports: number;
  lastActivity: Date;
  privacyBudgetUsed: number;
  privacyBudgetTotal: number;
  realTimeUsage: {
    timestamp: Date;
    dataType: string;
    operation: string;
    privacyImpact: 'low' | 'medium' | 'high';
  }[];
}

interface DataRetention {
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  lastAccessed: Date;
  dataCount: number;
  dataSize: string;
}

interface PrivacyZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  privacyLevel: 'high' | 'medium' | 'low';
  enabled: boolean;
}

interface ThirdPartySharing {
  partner: string;
  dataType: string;
  purpose: string;
  frequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastShared?: Date;
}

interface LegalRequest {
  id: string;
  type: 'data_access' | 'deletion' | 'correction' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: Date;
  description: string;
  canNotify: boolean; // Whether user can be notified about this request
}

interface PrivacyImpactScore {
  action: string;
  score: number; // 0-100
  factors: string[];
  recommendations: string[];
  lastCalculated: Date;
}

const PrivacyDashboard: React.FC = () => {
  const { toast } = useToast()
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
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
    privacyBudgetAlerts: true
  })

  const [dataUsage, setDataUsage] = useState<DataUsage>({
    totalQueries: 127,
    locationQueries: 45,
    profileViews: 23,
    dataExports: 3,
    lastActivity: new Date(),
    privacyBudgetUsed: 0.65,
    privacyBudgetTotal: 1.0,
    realTimeUsage: [
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        dataType: 'location',
        operation: 'query',
        privacyImpact: 'medium'
      },
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        dataType: 'profile',
        operation: 'view',
        privacyImpact: 'low'
      },
      {
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        dataType: 'emergency',
        operation: 'report',
        privacyImpact: 'high'
      }
    ]
  })

  const [dataRetention, setDataRetention] = useState<DataRetention[]>([
    {
      dataType: 'Location Data',
      retentionDays: 7,
      autoDelete: true,
      lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      dataCount: 89,
      dataSize: '1.2 MB'
    },
    {
      dataType: 'Trust Score',
      retentionDays: 90,
      autoDelete: false,
      lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000),
      dataCount: 45,
      dataSize: '0.3 MB'
    },
    {
      dataType: 'Emergency Reports',
      retentionDays: 365,
      autoDelete: false,
      lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dataCount: 12,
      dataSize: '0.8 MB'
    },
    {
      dataType: 'User Profile',
      retentionDays: 30,
      autoDelete: true,
      lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      dataCount: 10,
      dataSize: '0.1 MB'
    }
  ])

  const [privacyZones, setPrivacyZones] = useState<PrivacyZone[]>([
    {
      id: 'home',
      name: 'Home',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      privacyLevel: 'high',
      enabled: true
    },
    {
      id: 'work',
      name: 'Work',
      latitude: 37.7849,
      longitude: -122.4094,
      radius: 200,
      privacyLevel: 'medium',
      enabled: true
    }
  ])

  const [thirdPartySharing, setThirdPartySharing] = useState<ThirdPartySharing[]>([
    {
      partner: 'Emergency Services',
      dataType: 'Location Data',
      purpose: 'Emergency response coordination',
      frequency: 'real-time',
      enabled: true,
      lastShared: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      partner: 'Research Institute',
      dataType: 'Anonymized Usage Data',
      purpose: 'Emergency response research',
      frequency: 'weekly',
      enabled: false
    }
  ])

  const [legalRequests, setLegalRequests] = useState<LegalRequest[]>([
    {
      id: 'req-001',
      type: 'data_access',
      status: 'completed',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      description: 'Request for all personal data',
      canNotify: true
    }
  ])

  const [privacyImpactScore, setPrivacyImpactScore] = useState<PrivacyImpactScore>({
    action: 'location_query',
    score: 75,
    factors: ['Differential privacy enabled', 'K-anonymity active', 'Location precision reduced'],
    recommendations: ['Consider reducing location precision further for enhanced privacy'],
    lastCalculated: new Date()
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'usage' | 'retention' | 'zones' | 'sharing' | 'legal'>('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(true)

  // Load privacy settings from server
  useEffect(() => {
    const loadPrivacySettings = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, fetch from API
        // const response = await fetch('/api/privacy/settings');
        // const settings = await response.json();
        // setPrivacySettings(settings);
      } catch (error) {
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
  const handleSettingChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Save privacy settings
  const savePrivacySettings = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, save to API
      // await fetch('/api/privacy/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(privacySettings)
      // });

      toast({
        title: 'Success',
        description: 'Privacy settings saved successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save privacy settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset privacy settings to defaults
  const resetPrivacySettings = () => {
    setPrivacySettings({
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
      privacyBudgetAlerts: true
    })
  }

  // Get privacy impact color
  const getPrivacyImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low': return 'green'
      case 'medium': return 'yellow'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  // Get privacy zone color
  const getPrivacyZoneColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'red'
      case 'medium': return 'yellow'
      case 'low': return 'green'
      default: return 'gray'
    }
  }

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins} minutes ago`
    }
    if (diffHours < 24) {
      return `${diffHours} hours ago`
    }
    return `${diffDays} days ago`
  }

  // Add new privacy zone
  const addPrivacyZone = () => {
    const newZone: PrivacyZone = {
      id: `zone-${Date.now()}`,
      name: 'New Zone',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      privacyLevel: 'medium',
      enabled: true
    }
    setPrivacyZones(prev => [...prev, newZone])
  }

  // Update privacy zone
  const updatePrivacyZone = (id: string, updates: Partial<PrivacyZone>) => {
    setPrivacyZones(prev =>
      prev.map(zone =>
        zone.id === id ? { ...zone, ...updates } : zone
      )
    )
  }

  // Delete privacy zone
  const deletePrivacyZone = (id: string) => {
    setPrivacyZones(prev => prev.filter(zone => zone.id !== id))
  }

  // Toggle third party sharing
  const toggleThirdPartySharing = (partner: string) => {
    setThirdPartySharing(prev =>
      prev.map(item =>
        item.partner === partner ? { ...item, enabled: !item.enabled } : item
      )
    )
  }

  // Get real-time privacy budget status
  const getPrivacyBudgetStatus = () => {
    const percentage = (dataUsage.privacyBudgetUsed / dataUsage.privacyBudgetTotal) * 100
    if (percentage >= 90) {
      return { status: 'critical', color: 'red' }
    }
    if (percentage >= 75) {
      return { status: 'warning', color: 'yellow' }
    }
    if (percentage >= 50) {
      return { status: 'moderate', color: 'blue' }
    }
    return { status: 'good', color: 'green' }
  }

  // Get privacy level indicator
  const getPrivacyLevel = () => {
    const enabledFeatures = [
      privacySettings.anonymizeData,
      privacySettings.differentialPrivacy,
      privacySettings.kAnonymity,
      privacySettings.endToEndEncryption
    ].filter(Boolean).length

    if (enabledFeatures === 4) {
      return { level: 'Maximum', color: 'green' }
    }
    if (enabledFeatures >= 3) {
      return { level: 'High', color: 'blue' }
    }
    if (enabledFeatures >= 2) {
      return { level: 'Medium', color: 'yellow' }
    }
    return { level: 'Basic', color: 'red' }
  }

  const privacyLevel = getPrivacyLevel()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Privacy Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Privacy Level:</span>
          <StatusIndicator status={privacyLevel.color} text={privacyLevel.level} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['overview', 'settings', 'usage', 'retention', 'zones', 'sharing', 'legal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'zones' ? 'Privacy Zones'
              : tab === 'sharing' ? 'Data Sharing'
                : tab === 'legal' ? 'Legal Requests' : tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Privacy Score Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Privacy Overview</h2>
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-gray-600" />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={realTimeMonitoring}
                    onChange={(e) => setRealTimeMonitoring(e.target.checked)}
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
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-2xl font-bold">{privacyImpactScore.score}</div>
                <div className="text-gray-600">Privacy Score</div>
                <div className="text-sm text-gray-500 mt-1">Out of 100</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold">{(dataUsage.privacyBudgetUsed * 100).toFixed(0)}%</div>
                <div className="text-gray-600">Budget Used</div>
                <StatusIndicator status={getPrivacyBudgetStatus().color} text={getPrivacyBudgetStatus().status} />
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
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator status={getPrivacyImpactColor(activity.privacyImpact)} text="" />
                    <div>
                      <div className="font-medium capitalize">{activity.operation}</div>
                      <div className="text-sm text-gray-600">{activity.dataType} data</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{formatTimeAgo(activity.timestamp)}</div>
                    <div className="text-xs capitalize text-gray-500">{activity.privacyImpact} impact</div>
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
                onClick={() => setActiveTab('retention')}
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
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => toast({
                  title: 'Privacy Report',
                  description: 'Your detailed privacy report is being generated.'
                })}
              >
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
                onClick={() => setActiveTab('settings')}
              >
                Manage Alerts
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>

            <div className="space-y-4">
              {/* Location Sharing */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Location Sharing</h3>
                  <p className="text-sm text-gray-600">Share your location for emergency response</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.locationSharing}
                    onChange={(e) => handleSettingChange('locationSharing', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Location Precision */}
              <div>
                <h3 className="font-medium mb-2">Location Precision</h3>
                <p className="text-sm text-gray-600 mb-3">Lower precision provides better privacy</p>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={privacySettings.locationPrecision}
                  onChange={(e) => handleSettingChange('locationPrecision', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (1)</span>
                  <span>Medium (3)</span>
                  <span>High (5)</span>
                </div>
              </div>

              {/* Data Anonymization */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Data Anonymization</h3>
                  <p className="text-sm text-gray-600">Anonymize your data for analysis</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.anonymizeData}
                    onChange={(e) => handleSettingChange('anonymizeData', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Differential Privacy */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Differential Privacy</h3>
                  <p className="text-sm text-gray-600">Add mathematical noise to protect privacy</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.differentialPrivacy}
                    onChange={(e) => handleSettingChange('differentialPrivacy', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* K-Anonymity */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">K-Anonymity</h3>
                  <p className="text-sm text-gray-600">Ensure anonymity in groups</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.kAnonymity}
                    onChange={(e) => handleSettingChange('kAnonymity', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* End-to-End Encryption */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">End-to-End Encryption</h3>
                  <p className="text-sm text-gray-600">Encrypt sensitive data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.endToEndEncryption}
                    onChange={(e) => handleSettingChange('endToEndEncryption', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Emergency Data Sharing */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Emergency Data Sharing</h3>
                  <p className="text-sm text-gray-600">Share data during emergencies</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privacySettings.emergencyDataSharing}
                    onChange={(e) => handleSettingChange('emergencyDataSharing', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={resetPrivacySettings}>
                Reset to Defaults
              </Button>
              <Button onClick={savePrivacySettings} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
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
                        getPrivacyBudgetStatus().color === 'red' ? 'bg-red-600'
                          : getPrivacyBudgetStatus().color === 'yellow' ? 'bg-yellow-600'
                            : getPrivacyBudgetStatus().color === 'blue' ? 'bg-blue-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${dataUsage.privacyBudgetUsed * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <StatusIndicator status={getPrivacyBudgetStatus().color} text={getPrivacyBudgetStatus().status} />
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
                        privacyImpactScore.score >= 80 ? 'green'
                          : privacyImpactScore.score >= 60 ? 'yellow' : 'red'
                      }
                      text=""
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
      )}

      {/* Retention Tab */}
      {activeTab === 'retention' && (
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
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={item.autoDelete}
                          onChange={(e) => {
                            const updated = [...dataRetention]
                            updated[index].autoDelete = e.target.checked
                            setDataRetention(updated)
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
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
      )}
    </div>
  )
}

export default PrivacyDashboard
{/* Privacy Zones Tab */}
{activeTab === 'zones' && (
  <div className="space-y-6">
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Privacy Zones</h2>
        <Button onClick={addPrivacyZone} size="sm">
                Add Zone
        </Button>
      </div>

      <div className="space-y-4">
        {privacyZones.map((zone) => (
          <div key={zone.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium">{zone.name}</h3>
                <p className="text-sm text-gray-600">
                  {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radius}m radius
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusIndicator status={getPrivacyZoneColor(zone.privacyLevel)} text={zone.privacyLevel} />
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={zone.enabled}
                  onChange={(e) => updatePrivacyZone(zone.id, { enabled: e.target.checked })}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deletePrivacyZone(zone.id)}
              >
                      Delete
              </Button>
            </div>
          </div>
        ))}

        {privacyZones.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No privacy zones configured</p>
            <p className="text-sm">Add zones to enhance privacy in specific areas</p>
          </div>
        )}
      </div>
    </Card>
  </div>
)}

{/* Data Sharing Tab */}
{activeTab === 'sharing' && (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Third-Party Data Sharing</h2>

      <div className="space-y-4">
        {thirdPartySharing.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium">{item.partner}</h3>
              <p className="text-sm text-gray-600">{item.purpose}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-600">Data: {item.dataType}</span>
                <span className="text-sm text-gray-600">Frequency: {item.frequency}</span>
                {item.lastShared && (
                  <span className="text-sm text-gray-600">Last: {formatTimeAgo(item.lastShared)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={item.enabled}
                  onChange={() => toggleThirdPartySharing(item.partner)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-600">
                {item.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
)}

{/* Legal Requests Tab */}
{activeTab === 'legal' && (
  <div className="space-y-6">
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Legal Requests & Rights</h2>

      <div className="space-y-4">
        {legalRequests.map((request) => (
          <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium capitalize">{request.type.replace('_', ' ')}</h3>
                <StatusIndicator
                  status={
                    request.status === 'completed' ? 'green'
                      : request.status === 'processing' ? 'blue'
                        : request.status === 'pending' ? 'yellow' : 'red'
                  }
                  text={request.status}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{request.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-600">
                        Created: {formatTimeAgo(request.createdAt)}
                </span>
                {request.canNotify && (
                  <span className="text-sm text-gray-600">
                    <Bell className="h-3 w-3 inline mr-1" />
                          Notifications enabled
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                      View Details
              </Button>
            </div>
          </div>
        ))}

        {legalRequests.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No legal requests found</p>
            <p className="text-sm">Your data rights requests will appear here</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t">
        <h3 className="font-medium mb-4">Exercise Your Rights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-start">
            <Download className="h-4 w-4 mr-2" />
                  Request Data Export
          </Button>
          <Button variant="outline" className="justify-start">
            <Eye className="h-4 w-4 mr-2" />
                  Access My Data
          </Button>
          <Button variant="outline" className="justify-start">
            <Settings className="h-4 w-4 mr-2" />
                  Correct My Data
          </Button>
          <Button variant="outline" className="justify-start">
            <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Deletion
          </Button>
        </div>
      </div>
    </Card>
  </div>
)}