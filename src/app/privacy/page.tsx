/**
 * Enhanced Privacy Page for OpenRelief
 * 
 * This page hosts the comprehensive privacy center with advanced features
 * including transparency reporting, granular controls, and GDPR rights management
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Shield, 
  Download, 
  Trash2, 
  Settings, 
  Eye, 
  FileText,
  Lock,
  Bell,
  Activity,
  BookOpen,
  MapPin,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { 
  PrivacyDashboard, 
  DataExportTool, 
  TransparencyReport,
  DataControls,
  RightsManagement,
  PrivacyEducation
} from '@/components/privacy'
import { useToast } from '@/hooks/use-toast'
import { usePrivacy } from '@/hooks/usePrivacy'

type TabId = 
  | 'dashboard' 
  | 'export' 
  | 'settings'
  | 'transparency'
  | 'controls'
  | 'rights'
  | 'education'
  | 'notifications'
  | 'zones'

const PrivacyPage: React.FC = () => {
  const { toast } = useToast()
  const { privacyContext, privacyAlerts, clearPrivacyAlert } = usePrivacy()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Privacy Dashboard', 
      icon: Settings,
      description: 'Overview of your privacy settings and data usage'
    },
    { 
      id: 'transparency', 
      label: 'Transparency Report', 
      icon: FileText,
      description: 'Detailed report of data processing and sharing'
    },
    { 
      id: 'controls', 
      label: 'Data Controls', 
      icon: Lock,
      description: 'Granular control over your data and permissions'
    },
    { 
      id: 'rights', 
      label: 'Your Rights', 
      icon: UserCheck,
      description: 'Exercise your GDPR rights and legal requests'
    },
    { 
      id: 'export', 
      label: 'Data Export & Deletion', 
      icon: Download,
      description: 'Export or delete your personal data'
    },
    { 
      id: 'zones', 
      label: 'Privacy Zones', 
      icon: MapPin,
      description: 'Configure location-based privacy settings'
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell,
      description: 'Manage privacy alerts and notifications'
    },
    { 
      id: 'education', 
      label: 'Privacy Education', 
      icon: BookOpen,
      description: 'Learn about privacy best practices'
    }
  ]

  const quickActions = [
    {
      id: 'export',
      title: 'Export Your Data',
      description: 'Download all your personal data in a portable format',
      icon: Download,
      color: 'blue',
      action: () => setActiveTab('export')
    },
    {
      id: 'delete',
      title: 'Delete Your Data',
      description: 'Permanently remove your information from our systems',
      icon: Trash2,
      color: 'red',
      action: () => setActiveTab('rights')
    },
    {
      id: 'report',
      title: 'Privacy Report',
      description: 'View detailed privacy metrics and transparency report',
      icon: FileText,
      color: 'green',
      action: () => setActiveTab('transparency')
    },
    {
      id: 'controls',
      title: 'Data Controls',
      description: 'Manage granular permissions and data sharing settings',
      icon: Lock,
      color: 'purple',
      action: () => setActiveTab('controls')
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Privacy Center</h1>
                <p className="text-sm text-gray-600">Comprehensive control over your data and privacy</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Your data, your control</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  privacyContext.privacyLevel === 'maximum' ? 'bg-green-100 text-green-800' :
                  privacyContext.privacyLevel === 'high' ? 'bg-blue-100 text-blue-800' :
                  privacyContext.privacyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {privacyContext.privacyLevel.toUpperCase()} PRIVACY
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Alerts */}
      {privacyAlerts.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  You have {privacyAlerts.length} privacy alert{privacyAlerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveTab('notifications')}
              >
                View All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={tab.description}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => (
            <Card key={action.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={action.action}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${getColorClasses(action.color)}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                {action.id === 'export' ? 'Export Data' :
                 action.id === 'delete' ? 'Manage Deletion' :
                 action.id === 'report' ? 'View Report' :
                 'Manage Settings'}
              </Button>
            </Card>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && <PrivacyDashboard />}
          {activeTab === 'transparency' && <TransparencyReport />}
          {activeTab === 'controls' && <DataControls />}
          {activeTab === 'rights' && <RightsManagement />}
          {activeTab === 'export' && <DataExportTool />}
          {activeTab === 'zones' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Privacy Zones</h2>
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Zones Coming Soon</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Configure location-based privacy settings to automatically adjust your privacy 
                  preferences based on your physical location.
                </p>
              </div>
            </Card>
          )}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Privacy Notifications</h2>
              <div className="space-y-4">
                {privacyAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Privacy Alerts</h3>
                    <p className="text-gray-600">
                      You're all set! We'll notify you if any privacy-related events occur.
                    </p>
                  </div>
                ) : (
                  privacyAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                      <div className={`p-2 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => clearPrivacyAlert(alert.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
          {activeTab === 'education' && <PrivacyEducation />}
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage