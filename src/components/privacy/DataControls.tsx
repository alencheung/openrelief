/**
 * Granular Data Controls Component for OpenRelief
 * 
 * This component provides fine-grained permission settings by data type,
 * location privacy zones, emergency response preferences, and trust score visibility.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  MapPin,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  User,
  Database,
  Clock,
  CheckCircle,
  X,
  Plus,
  Edit,
  Trash2,
  Bell,
  Activity,
  TrendingUp,
  BarChart3,
  Globe,
  Smartphone,
  Mail,
  Calendar,
  FileText,
  Users,
  Heart,
  Zap
} from 'lucide-react';

// Types for granular data controls
interface DataTypePermission {
  id: string;
  name: string;
  description: string;
  category: 'location' | 'profile' | 'emergency' | 'communication' | 'analytics';
  enabled: boolean;
  retentionDays: number;
  purposeLimitation: string[];
  sharingSettings: {
    emergencyServices: boolean;
    researchParticipation: boolean;
    thirdPartyAnalytics: boolean;
    lawEnforcement: boolean;
  };
  encryptionLevel: 'none' | 'basic' | 'standard' | 'enhanced' | 'maximum';
  lastModified: Date;
}

interface LocationPrivacyZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  privacyLevel: 'public' | 'private' | 'restricted' | 'sanitized';
  exceptions: {
    emergencyServices: boolean;
    trustedContacts: boolean;
    familyMembers: boolean;
  };
  activeHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  createdAt: Date;
}

interface EmergencyDataPreference {
  id: string;
  scenario: 'medical_emergency' | 'natural_disaster' | 'security_incident' | 'missing_person';
  dataTypes: string[];
  sharingLevel: 'minimal' | 'standard' | 'comprehensive';
  autoShare: boolean;
  durationHours: number;
  trustedRecipients: string[];
  geofenceRequired: boolean;
}

interface TrustScoreSettings {
  visibility: 'public' | 'private' | 'friends_only' | 'emergency_only';
  calculationTransparency: 'minimal' | 'basic' | 'detailed' | 'full';
  dataSources: {
    emergencyResponses: boolean;
    communityFeedback: boolean;
    responseTime: boolean;
    reliability: boolean;
    skillVerification: boolean;
  };
  appealProcess: {
    enabled: boolean;
    timeframe: number; // days
    contactMethod: 'email' | 'phone' | 'in_app' | 'mail';
  };
}

interface DataProcessingPurpose {
  id: string;
  name: string;
  description: string;
  category: 'service_delivery' | 'safety_monitoring' | 'research_analytics' | 'legal_compliance' | 'user_experience';
  required: boolean;
  dataTypes: string[];
  retentionDays: number;
  processingLocation: 'local' | 'regional' | 'national' | 'international';
  userConsent: 'explicit' | 'implicit' | 'opt_out';
  lastReviewed: Date;
}

const DataControls: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'permissions' | 'zones' | 'emergency' | 'trust'>('permissions');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const [dataPermissions, setDataPermissions] = useState<DataTypePermission[]>([
    {
      id: 'location_data',
      name: 'Location Data',
      description: 'GPS coordinates and location history for emergency response',
      category: 'location',
      enabled: true,
      retentionDays: 30,
      purposeLimitation: ['Emergency response only', 'No commercial use'],
      sharingSettings: {
        emergencyServices: true,
        researchParticipation: false,
        thirdPartyAnalytics: false,
        lawEnforcement: true
      },
      encryptionLevel: 'enhanced',
      lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'health_data',
      name: 'Health Information',
      description: 'Medical conditions and emergency health details',
      category: 'profile',
      enabled: true,
      retentionDays: 365,
      purposeLimitation: ['Emergency medical use only', 'HIPAA compliant'],
      sharingSettings: {
        emergencyServices: true,
        researchParticipation: false,
        thirdPartyAnalytics: false,
        lawEnforcement: false
      },
      encryptionLevel: 'maximum',
      lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'communication_logs',
      name: 'Communication Logs',
      description: 'Emergency communications and contact history',
      category: 'communication',
      enabled: true,
      retentionDays: 90,
      purposeLimitation: ['Emergency coordination only'],
      sharingSettings: {
        emergencyServices: true,
        researchParticipation: false,
        thirdPartyAnalytics: false,
        lawEnforcement: true
      },
      encryptionLevel: 'standard',
      lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usage_analytics',
      name: 'Usage Analytics',
      description: 'Platform usage patterns and service interactions',
      category: 'analytics',
      enabled: false,
      retentionDays: 180,
      purposeLimitation: ['Service improvement only'],
      sharingSettings: {
        emergencyServices: false,
        researchParticipation: true,
        thirdPartyAnalytics: false,
        lawEnforcement: false
      },
      encryptionLevel: 'basic',
      lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [privacyZones, setPrivacyZones] = useState<LocationPrivacyZone[]>([
    {
      id: 'home_zone',
      name: 'Home',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      privacyLevel: 'private',
      exceptions: {
        emergencyServices: true,
        trustedContacts: true,
        familyMembers: true
      },
      activeHours: {
        start: '18:00',
        end: '08:00'
      },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'work_zone',
      name: 'Work',
      latitude: 37.7849,
      longitude: -122.4094,
      radius: 200,
      privacyLevel: 'restricted',
      exceptions: {
        emergencyServices: true,
        trustedContacts: false,
        familyMembers: false
      },
      activeHours: {
        start: '09:00',
        end: '17:00'
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'school_zone',
      name: 'School',
      latitude: 37.8044,
      longitude: -122.2711,
      radius: 150,
      privacyLevel: 'sanitized',
      exceptions: {
        emergencyServices: true,
        trustedContacts: false,
        familyMembers: false
      },
      activeHours: {
        start: '08:00',
        end: '15:00'
      },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [emergencyPreferences, setEmergencyPreferences] = useState<EmergencyDataPreference[]>([
    {
      id: 'medical_emergency',
      scenario: 'medical_emergency',
      dataTypes: ['health_data', 'location_data', 'emergency_contacts'],
      sharingLevel: 'comprehensive',
      autoShare: true,
      durationHours: 72,
      trustedRecipients: ['hospital_emergency', 'primary_care_physician'],
      geofenceRequired: false
    },
    {
      id: 'natural_disaster',
      scenario: 'natural_disaster',
      dataTypes: ['location_data', 'communication_logs'],
      sharingLevel: 'standard',
      autoShare: true,
      durationHours: 168,
      trustedRecipients: ['disaster_response_agency', 'family_contacts'],
      geofenceRequired: true
    }
  ]);

  const [trustScoreSettings, setTrustScoreSettings] = useState<TrustScoreSettings>({
    visibility: 'private',
    calculationTransparency: 'detailed',
    dataSources: {
      emergencyResponses: true,
      communityFeedback: true,
      responseTime: true,
      reliability: true,
      skillVerification: true
    },
    appealProcess: {
      enabled: true,
      timeframe: 30,
      contactMethod: 'in_app'
    }
  });

  const [dataProcessingPurposes, setDataProcessingPurposes] = useState<DataProcessingPurpose[]>([
    {
      id: 'emergency_response',
      name: 'Emergency Response Coordination',
      description: 'Process location and health data for emergency response',
      category: 'service_delivery',
      required: true,
      dataTypes: ['location_data', 'health_data'],
      retentionDays: 30,
      processingLocation: 'regional',
      userConsent: 'explicit',
      lastReviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'service_improvement',
      name: 'Service Improvement Analytics',
      description: 'Analyze usage patterns to improve emergency response services',
      category: 'research_analytics',
      required: false,
      dataTypes: ['usage_analytics'],
      retentionDays: 180,
      processingLocation: 'national',
      userConsent: 'opt_out',
      lastReviewed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Handle permission toggle
  const togglePermission = (id: string) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id 
          ? { ...permission, enabled: !permission.enabled }
          : permission
      )
    );
  };

  // Update sharing settings
  const updateSharingSettings = (id: string, sharingType: keyof DataTypePermission['sharingSettings']) => {
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
    );
  };

  // Update encryption level
  const updateEncryptionLevel = (id: string, level: DataTypePermission['encryptionLevel']) => {
    setDataPermissions(prev =>
      prev.map(permission =>
        permission.id === id 
          ? { ...permission, encryptionLevel: level }
          : permission
      )
    );
  };

  // Add new privacy zone
  const addPrivacyZone = () => {
    const newZone: LocationPrivacyZone = {
      id: `zone_${Date.now()}`,
      name: 'New Privacy Zone',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      privacyLevel: 'private',
      exceptions: {
        emergencyServices: true,
        trustedContacts: true,
        familyMembers: true
      },
      activeHours: {
        start: '09:00',
        end: '17:00'
      },
      createdAt: new Date()
    };
    setPrivacyZones(prev => [...prev, newZone]);
  };

  // Update privacy zone
  const updatePrivacyZone = (id: string, updates: Partial<LocationPrivacyZone>) => {
    setPrivacyZones(prev =>
      prev.map(zone =>
        zone.id === id ? { ...zone, ...updates } : zone
      )
    );
  };

  // Delete privacy zone
  const deletePrivacyZone = (id: string) => {
    setPrivacyZones(prev => prev.filter(zone => zone.id !== id));
  };

  // Save all settings
  const saveAllSettings = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, save to API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Settings Saved",
        description: "Your granular data controls have been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data controls",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get privacy level color
  const getPrivacyLevelColor = (level: LocationPrivacyZone['privacyLevel']) => {
    switch (level) {
      case 'public': return 'green';
      case 'private': return 'yellow';
      case 'restricted': return 'orange';
      case 'sanitized': return 'red';
      default: return 'gray';
    }
  };

  // Get encryption level color
  const getEncryptionLevelColor = (level: DataTypePermission['encryptionLevel']) => {
    switch (level) {
      case 'none': return 'red';
      case 'basic': return 'orange';
      case 'standard': return 'yellow';
      case 'enhanced': return 'blue';
      case 'maximum': return 'green';
      default: return 'gray';
    }
  };

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
        {(['permissions', 'zones', 'emergency', 'trust'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'permissions' ? 'Data Permissions' :
             tab === 'zones' ? 'Privacy Zones' :
             tab === 'emergency' ? 'Emergency Settings' :
             tab === 'trust' ? 'Trust Score Settings' : tab}
          </button>
        ))}
      </div>

      {/* Data Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Type Permissions</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Database className="h-4 w-4" />
                <span>Fine-grained control</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {dataPermissions.map((permission) => (
                <div key={permission.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={permission.enabled}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <div>
                        <h3 className="font-medium">{permission.name}</h3>
                        <p className="text-sm text-gray-600">{permission.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={permission.enabled ? 'green' : 'red'} 
                        text={permission.enabled ? 'Enabled' : 'Disabled'} 
                      />
                      <span className="text-sm text-gray-600">
                        Category: {permission.category}
                      </span>
                    </div>
                  </div>

                  {/* Purpose Limitations */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Purpose Limitations</h4>
                    <div className="space-y-1">
                      {permission.purposeLimitation.map((limitation, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sharing Settings */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Sharing Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(permission.sharingSettings).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={value}
                              onChange={() => updateSharingSettings(permission.id, key as any)}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Encryption Level */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Encryption Level</h4>
                    <div className="flex items-center space-x-4">
                      {(['none', 'basic', 'standard', 'enhanced', 'maximum'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateEncryptionLevel(permission.id, level as any)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            permission.encryptionLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {level.replace('_', ' ')}
                        </button>
                      ))}
                      <div className="flex items-center space-x-2">
                        <StatusIndicator status={getEncryptionLevelColor(permission.encryptionLevel)} text="" />
                        <span className="text-sm text-gray-600">
                          Current: {permission.encryptionLevel.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Retention Period */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Retention Period</h4>
                      <p className="text-sm text-gray-600">Data retention in days</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        min="1"
                        max="730"
                        value={permission.retentionDays}
                        onChange={(e) => {
                          const updated = dataPermissions.map(p =>
                            p.id === permission.id 
                              ? { ...p, retentionDays: parseInt(e.target.value) }
                              : p
                          );
                          setDataPermissions(updated);
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm text-gray-600">
                      Last modified: {permission.lastModified.toLocaleDateString()}
                    </span>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Advanced Settings
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Privacy Zones Tab */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Location Privacy Zones</h2>
              <Button onClick={addPrivacyZone} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>
            
            <div className="space-y-4">
              {privacyZones.map((zone) => (
                <div key={zone.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{zone.name}</h3>
                        <p className="text-sm text-gray-600">
                          {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radius}m radius
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getPrivacyLevelColor(zone.privacyLevel)} text={zone.privacyLevel} />
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePrivacyZone(zone.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Active Hours */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Active Hours</h4>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">From: {zone.activeHours.start}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">To: {zone.activeHours.end}</span>
                      </div>
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Exceptions</h4>
                    <div className="space-y-2">
                      {Object.entries(zone.exceptions).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <div className="flex items-center space-x-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={value}
                                onChange={() => updatePrivacyZone(zone.id, {
                                  exceptions: {
                                    ...zone.exceptions,
                                    [key]: !value
                                  }
                                })}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className="text-sm text-gray-600">
                              {value ? 'Allowed' : 'Blocked'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm text-gray-600">
                      Created: {zone.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Emergency Settings Tab */}
      {activeTab === 'emergency' && (
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
              {emergencyPreferences.map((preference) => (
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
                          onChange={() => {
                            const updated = emergencyPreferences.map(p =>
                              p.id === preference.id 
                                ? { ...p, autoShare: !p.autoShare }
                                : p
                            );
                            setEmergencyPreferences(updated);
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      </div>
                    </div>
                  </div>

                  {/* Data Types */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Data Types to Share</h4>
                    <div className="flex flex-wrap gap-2">
                      {preference.dataTypes.map((dataType) => (
                        <span key={dataType} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {dataType.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sharing Level */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Sharing Level</h4>
                    <div className="flex items-center space-x-4">
                      {(['minimal', 'standard', 'comprehensive'] as const).map((level) => (
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
                      <span className="text-sm text-gray-600">
                        Require geofence verification
                      </span>
                    </div>
                  </div>

                  {/* Trusted Recipients */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Trusted Recipients</h4>
                    <div className="space-y-2">
                      {preference.trustedRecipients.map((recipient) => (
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
      )}

      {/* Trust Score Settings Tab */}
      {activeTab === 'trust' && (
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
                {(['public', 'private', 'friends_only', 'emergency_only'] as const).map((visibility) => (
                  <button
                    key={visibility}
                    className={`p-3 border rounded-lg text-center ${
                      trustScoreSettings.visibility === visibility
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setTrustScoreSettings(prev => ({ ...prev, visibility }))}
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
                {(['minimal', 'basic', 'detailed', 'full'] as const).map((transparency) => (
                  <div key={transparency} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">{transparency}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="transparency"
                          checked={trustScoreSettings.calculationTransparency === transparency}
                          onChange={() => setTrustScoreSettings(prev => ({ ...prev, calculationTransparency: transparency }))}
                          className="sr-only peer"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          trustScoreSettings.calculationTransparency === transparency
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}></div>
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
                {Object.entries(trustScoreSettings.dataSources).map(([source, enabled]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {source.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={enabled}
                        onChange={() => setTrustScoreSettings(prev => ({
                          ...prev,
                          dataSources: {
                            ...prev.dataSources,
                            [source]: !enabled
                          }
                        }))}
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
                      checked={trustScoreSettings.appealProcess.enabled}
                      onChange={() => setTrustScoreSettings(prev => ({
                        ...prev,
                        appealProcess: {
                          ...prev.appealProcess,
                          enabled: !prev.appealProcess.enabled
                        }
                      }))}
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
                      value={trustScoreSettings.appealProcess.timeframe}
                      onChange={(e) => setTrustScoreSettings(prev => ({
                        ...prev,
                        appealProcess: {
                          ...prev.appealProcess,
                          timeframe: parseInt(e.target.value)
                        }
                      }))}
                      className="w-20 border rounded px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contact Method</span>
                  <div className="flex items-center space-x-2">
                    {(['email', 'phone', 'in_app', 'mail'] as const).map((method) => (
                      <button
                        key={method}
                        className={`px-3 py-1 rounded text-sm ${
                          trustScoreSettings.appealProcess.contactMethod === method
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => setTrustScoreSettings(prev => ({
                          ...prev,
                          appealProcess: {
                            ...prev.appealProcess,
                            contactMethod: method
                          }
                        }))}
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
      )}

      {/* Data Processing Purposes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Data Processing Purposes</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            <span>Legal basis tracking</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {dataProcessingPurposes.map((purpose) => (
            <div key={purpose.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{purpose.name}</h3>
                    <p className="text-sm text-gray-600">{purpose.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator 
                    status={purpose.required ? 'green' : 'yellow'} 
                    text={purpose.required ? 'Required' : 'Optional'} 
                  />
                  <span className="text-sm text-gray-600">
                    Category: {purpose.category}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Data Types:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {purpose.dataTypes.map((dataType) => (
                      <span key={dataType} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {dataType.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Retention:</span>
                  <div className="font-medium">{purpose.retentionDays} days</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Processing Location:</span>
                  <div className="font-medium capitalize">{purpose.processingLocation.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">User Consent:</span>
                  <div className="font-medium capitalize">{purpose.userConsent.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-gray-600">
                  Last reviewed: {purpose.lastReviewed.toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Review Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DataControls;