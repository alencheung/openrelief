/**
 * GDPR Rights Management Component for OpenRelief
 * 
 * This component provides users with interfaces to exercise their GDPR rights
 * including access, rectification, erasure, portability, and consent management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Shield,
  Lock,
  Unlock,
  Mail,
  Phone,
  MessageSquare,
  FileSearch,
  Copy,
  Upload,
  RefreshCw,
  Info,
  Zap,
  Users,
  Activity,
  BarChart3,
  Globe,
  Database,
  Settings,
  ChevronRight,
  ExternalLink,
  FileDown,
  Send,
  Archive,
  Filter,
  Search,
  List,
  CheckSquare,
  Square,
  MoreHorizontal
} from 'lucide-react';

// Types for GDPR rights management
interface DataRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected' | 'appealed';
  title: string;
  description: string;
  dataTypes: string[];
  createdAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  responseDeadline?: Date;
  attachments: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  referenceNumber?: string;
  legalBasis: string;
  deliveryMethod: 'download' | 'email' | 'api_access' | 'physical_copy';
}

interface ConsentRecord {
  id: string;
  purpose: string;
  description: string;
  dataTypes: string[];
  consentGiven: boolean;
  consentDate: Date;
  expiryDate?: Date;
  canWithdraw: boolean;
  withdrawnAt?: Date;
  legalBasis: string;
  processingLocation: 'local' | 'regional' | 'international';
  automatedDecision: boolean;
}

interface DataProcessingActivity {
  id: string;
  timestamp: Date;
  operation: string;
  dataType: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: number;
  dataSubjects: number;
  automatedDecision: boolean;
  privacyImpact: 'low' | 'medium' | 'high';
  location?: string;
}

interface DataSubjectRequest {
  id: string;
  type: 'confirmation' | 'objection' | 'restriction';
  category: 'marketing' | 'profiling' | 'automated_decision' | 'data_portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  title: string;
  description: string;
  createdAt: Date;
  responseDue: Date;
  respondedAt?: Date;
  outcome?: string;
  appealable: boolean;
  appealDeadline?: Date;
}

const RightsManagement: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'requests' | 'consent' | 'activity' | 'subjects'>('requests');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Mock data for demonstration
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([
    {
      id: 'req-001',
      type: 'access',
      status: 'completed',
      title: 'Complete Data Export Request',
      description: 'Request for all personal data including location history, emergency reports, trust score, and profile information',
      dataTypes: ['location_data', 'health_data', 'emergency_reports', 'trust_score', 'user_profile', 'communication_logs'],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      responseDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      attachments: ['data_export_2024.pdf', 'privacy_audit_log.csv'],
      priority: 'medium',
      referenceNumber: 'GDPR-2024-001',
      legalBasis: 'GDPR Article 15 - Right of Access',
      deliveryMethod: 'download'
    },
    {
      id: 'req-002',
      type: 'erasure',
      status: 'processing',
      title: 'Account Deletion Request',
      description: 'Request for permanent deletion of all personal data and account closure',
      dataTypes: ['all_personal_data'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      attachments: [],
      priority: 'high',
      referenceNumber: 'GDPR-2024-002',
      legalBasis: 'GDPR Article 17 - Right to Erasure',
      deliveryMethod: 'email'
    },
    {
      id: 'req-003',
      type: 'rectification',
      status: 'submitted',
      title: 'Health Data Correction Request',
      description: 'Request to correct inaccurate health information in emergency profile',
      dataTypes: ['health_data', 'emergency_profile'],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      attachments: ['correction_evidence.pdf'],
      priority: 'medium',
      referenceNumber: 'GDPR-2024-003',
      legalBasis: 'GDPR Article 16 - Right to Rectification',
      deliveryMethod: 'api_access'
    }
  ]);

  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([
    {
      id: 'consent-001',
      purpose: 'Emergency Response Services',
      description: 'Consent to share location and health data with emergency services during crisis situations',
      dataTypes: ['location_data', 'health_data', 'emergency_contacts'],
      consentGiven: true,
      consentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      canWithdraw: true,
      legalBasis: 'GDPR Article 6(1)(f) - Vital Interests',
      processingLocation: 'local',
      automatedDecision: false
    },
    {
      id: 'consent-002',
      purpose: 'Service Improvement Analytics',
      description: 'Consent to use anonymized usage data for service improvement and research',
      dataTypes: ['usage_analytics', 'interaction_patterns'],
      consentGiven: false,
      consentDate: new Date(),
      canWithdraw: true,
      legalBasis: 'GDPR Article 6(1)(a) - Consent',
      processingLocation: 'regional',
      automatedDecision: true
    },
    {
      id: 'consent-003',
      purpose: 'Emergency Contact Sharing',
      description: 'Consent to share emergency contact information with trusted response partners',
      dataTypes: ['emergency_contacts', 'trusted_network'],
      consentGiven: true,
      consentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      canWithdraw: true,
      legalBasis: 'GDPR Article 6(1)(c) - Contractual Necessity',
      processingLocation: 'international',
      automatedDecision: false
    }
  ]);

  const [processingActivities, setProcessingActivities] = useState<DataProcessingActivity[]>([
    {
      id: 'activity-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      operation: 'Data Processing',
      dataType: 'Location Data',
      purpose: 'Emergency response optimization',
      legalBasis: 'GDPR Article 6(1)(f) - Legitimate Interest',
      retentionPeriod: 30,
      dataSubjects: 1247,
      automatedDecision: true,
      privacyImpact: 'medium',
      location: 'San Francisco, CA'
    },
    {
      id: 'activity-002',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      operation: 'Data Aggregation',
      dataType: 'User Profile',
      purpose: 'Service improvement analytics',
      legalBasis: 'GDPR Article 6(1)(b) - Contractual Necessity',
      retentionPeriod: 90,
      dataSubjects: 3421,
      automatedDecision: true,
      privacyImpact: 'low',
      location: 'Regional Data Center'
    },
    {
      id: 'activity-003',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      operation: 'Differential Privacy Application',
      dataType: 'Emergency Reports',
      purpose: 'Statistical analysis',
      legalBasis: 'GDPR Article 6(1)(e) - Public Interest',
      retentionPeriod: 365,
      dataSubjects: 892,
      automatedDecision: true,
      privacyImpact: 'high',
      location: 'International Research Institute'
    }
  ]);

  const [subjectRequests, setSubjectRequests] = useState<DataSubjectRequest[]>([
    {
      id: 'subject-001',
      type: 'objection',
      category: 'profiling',
      status: 'completed',
      title: 'Objection to Automated Profiling',
      description: 'Objection to automated trust score calculation based on inferred characteristics',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      responseDue: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      respondedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      outcome: 'Profiling methodology reviewed and user opted out',
      appealable: true,
      appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'subject-002',
      type: 'restriction',
      category: 'automated_decision',
      status: 'pending',
      title: 'Restriction of Automated Decision Making',
      description: 'Request to restrict automated decisions affecting emergency response capabilities',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      responseDue: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      appealable: true,
      appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'submitted': return 'yellow';
      case 'rejected': case 'appealed': return 'red';
      case 'draft': return 'gray';
      default: return 'gray';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  // Submit new data request
  const submitDataRequest = async (type: DataRequest['type']) => {
    setIsLoading(true);
    try {
      // In a real implementation, submit to API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Request Submitted",
        description: `Your ${type} request has been submitted successfully.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit data request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw consent
  const withdrawConsent = async (id: string) => {
    setIsLoading(true);
    try {
      // In a real implementation, update consent status
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setConsentRecords(prev =>
        prev.map(consent =>
          consent.id === id 
            ? { ...consent, consentGiven: false, withdrawnAt: new Date() }
            : consent
        )
      );
      
      toast({
        title: "Consent Withdrawn",
        description: "Your consent has been successfully withdrawn."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to withdraw consent",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download request data
  const downloadRequestData = async (id: string) => {
    try {
      // In a real implementation, initiate download
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Download Started",
        description: "Your requested data is being prepared for download."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare data for download",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">GDPR Rights Management</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Your Rights</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['requests', 'consent', 'activity', 'subjects'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'requests' ? 'Data Requests' :
             tab === 'consent' ? 'Consent Management' :
             tab === 'activity' ? 'Processing Activity' :
             tab === 'subjects' ? 'Subject Rights' : tab}
          </button>
        ))}
      </div>

      {/* Data Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Subject Rights Requests</h2>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => submitDataRequest('access')} size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Access Request
                </Button>
                <Button onClick={() => submitDataRequest('rectification')} size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Rectification
                </Button>
                <Button onClick={() => submitDataRequest('erasure')} size="sm" variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Erasure
                </Button>
                <Button onClick={() => submitDataRequest('portability')} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Portability
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {dataRequests
                .filter(request => 
                  (filterStatus === 'all' || request.status === filterStatus) &&
                  (searchQuery === '' || 
                    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    request.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <StatusIndicator status={getStatusColor(request.status)} text="" />
                        <div>
                          <h3 className="font-medium">{request.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">
                              Type: {request.type}
                            </span>
                            <StatusIndicator status={getPriorityColor(request.priority)} text={request.priority} />
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTimeAgo(request.createdAt)}
                      </div>
                    </div>
                    
                    <p className="text-gray-800 mb-3">{request.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Reference:</span>
                        <div className="font-medium">{request.referenceNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Legal Basis:</span>
                        <div className="font-medium">{request.legalBasis}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Data Types:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {request.dataTypes.map((type) => (
                            <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Delivery Method:</span>
                        <div className="font-medium capitalize">{request.deliveryMethod.replace('_', ' ')}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Submitted:</span>
                        <div>{request.submittedAt?.toLocaleDateString() || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Deadline:</span>
                        <div>{request.responseDeadline?.toLocaleDateString() || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Est. Completion:</span>
                        <div>{request.estimatedCompletion?.toLocaleDateString() || 'N/A'}</div>
                      </div>
                    </div>
                    
                    {request.attachments.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium mb-2">Attachments</h4>
                        <div className="flex flex-wrap gap-2">
                          {request.attachments.map((attachment, index) => (
                            <button
                              key={index}
                              onClick={() => downloadRequestData(request.id)}
                              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                            >
                              <FileDown className="h-4 w-4" />
                              {attachment}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(request.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {request.status === 'completed' && (
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {['rejected', 'appealed'].includes(request.status) && (
                          <Button size="sm" variant="outline">
                            <Send className="h-4 w-4 mr-2" />
                            Appeal
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {request.completedAt && `Completed: ${formatTimeAgo(request.completedAt)}`}
                        {request.status === 'processing' && 'Currently processing...'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Consent Management Tab */}
      {activeTab === 'consent' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Consent Management</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Active consents: {consentRecords.filter(c => c.consentGiven).length}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {consentRecords.map((consent) => (
                <div key={consent.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={consent.consentGiven ? 'green' : 'red'} 
                        text="" 
                      />
                      <div>
                        <h3 className="font-medium">{consent.purpose}</h3>
                        <p className="text-sm text-gray-600 mt-1">{consent.description}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {consent.consentGiven ? `Given: ${formatTimeAgo(consent.consentDate)}` : 'Not given'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Data Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {consent.dataTypes.map((type) => (
                          <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {type.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Processing Location:</span>
                      <div className="font-medium capitalize">{consent.processingLocation.replace('_', ' ')}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Legal Basis:</span>
                      <div className="font-medium">{consent.legalBasis}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Automated Decision:</span>
                      <div className="font-medium">{consent.automatedDecision ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-gray-600">Expiry Date:</span>
                      <div className="font-medium">
                        {consent.expiryDate ? consent.expiryDate.toLocaleDateString() : 'No expiry'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {consent.withdrawnAt ? `Withdrawn: ${formatTimeAgo(consent.withdrawnAt)}` : 'Active'}
                      </span>
                      {consent.canWithdraw && consent.consentGiven && !consent.withdrawnAt && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => withdrawConsent(consent.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Processing...' : 'Withdraw Consent'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Processing Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Processing Activity</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Recent activities: {processingActivities.length}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {processingActivities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{activity.operation}</h3>
                        <span className="text-sm text-gray-600">• {activity.dataType}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getStatusColor('processing')} text="" />
                      <span className="text-sm text-gray-600">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Purpose:</span>
                      <div className="font-medium">{activity.purpose}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Legal Basis:</span>
                      <div className="font-medium">{activity.legalBasis}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data Subjects:</span>
                      <div className="font-medium">{activity.dataSubjects.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Retention Period:</span>
                      <div className="font-medium">{activity.retentionPeriod} days</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Processing Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Automated Decision:</span>
                        <div className="font-medium">{activity.automatedDecision ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Privacy Impact:</span>
                        <StatusIndicator status={
                          activity.privacyImpact === 'high' ? 'red' :
                          activity.privacyImpact === 'medium' ? 'yellow' : 'green'
                        } text={activity.privacyImpact} />
                      </div>
                    </div>
                  </div>
                  
                  {activity.location && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4" />
                      <span>Location: {activity.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Subject Rights Tab */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Subject Rights</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Active requests: {subjectRequests.length}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {subjectRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getStatusColor(request.status)} text="" />
                      <div>
                        <h3 className="font-medium">{request.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">
                            Type: {request.type}
                          </span>
                          <span className="text-sm text-gray-600">
                            Category: {request.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTimeAgo(request.createdAt)}
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{request.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Response Due:</span>
                      <div className="font-medium">{request.responseDue.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Appealable:</span>
                      <div className="font-medium">{request.appealable ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-gray-600">
                      {request.respondedAt && `Responded: ${formatTimeAgo(request.respondedAt)}`}
                      {request.status === 'pending' && 'Awaiting response...'}
                      {request.outcome && `Outcome: ${request.outcome}`}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {request.appealable && request.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <Send className="h-4 w-4 mr-2" />
                          Submit Appeal
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RightsManagement;