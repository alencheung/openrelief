/**
 * Transparency Report Component for OpenRelief
 * 
 * This component provides detailed transparency reporting including data processing logs,
 * algorithmic decision explanations, audit trails, and system-wide transparency reports.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Eye,
  Download,
  Calendar,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  Info,
  Globe,
  Database,
  Users,
  TrendingUp,
  FileSearch,
  Lock,
  Unlock,
  Brain
} from 'lucide-react';

// Types for transparency reporting
interface DataProcessingLog {
  id: string;
  timestamp: Date;
  dataType: string;
  operation: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: number;
  automatedDecision: boolean;
  privacyImpact: 'low' | 'medium' | 'high';
  dataSubjects: number; // Number of affected users
}

interface AlgorithmicDecision {
  id: string;
  timestamp: Date;
  algorithm: string;
  decision: string;
  confidence: number;
  factors: {
    name: string;
    weight: number;
    value: string;
  }[];
  explanation: string;
  impact: string;
  userCanAppeal: boolean;
}

interface DataAccessEntry {
  id: string;
  timestamp: Date;
  accessor: string; // Who accessed the data
  purpose: string;
  dataType: string;
  dataVolume: string;
  legalBasis: string;
  location?: string;
  successful: boolean;
}

interface LegalRequestStatus {
  id: string;
  type: 'data_access' | 'deletion' | 'correction' | 'portability' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'appealed';
  createdAt: Date;
  updatedAt: Date;
  description: string;
  responseDeadline?: Date;
  estimatedCompletion?: Date;
  canUserContact: boolean;
}

interface SystemTransparencyMetric {
  metric: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  period: string;
  description: string;
}

const TransparencyReport: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'processing' | 'algorithms' | 'access' | 'legal' | 'metrics'>('processing');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  const [processingLogs, setProcessingLogs] = useState<DataProcessingLog[]>([
    {
      id: 'proc-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      dataType: 'Location Data',
      operation: 'Anonymization',
      purpose: 'Emergency response optimization',
      legalBasis: 'GDPR Article 6(1)(f) - Legitimate Interest',
      retentionPeriod: 30,
      automatedDecision: true,
      privacyImpact: 'medium',
      dataSubjects: 1247
    },
    {
      id: 'proc-002',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      dataType: 'User Profile',
      operation: 'Aggregation',
      purpose: 'Service improvement analytics',
      legalBasis: 'GDPR Article 6(1)(b) - Contractual Necessity',
      retentionPeriod: 90,
      automatedDecision: true,
      privacyImpact: 'low',
      dataSubjects: 3421
    },
    {
      id: 'proc-003',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      dataType: 'Emergency Reports',
      operation: 'Differential Privacy Application',
      purpose: 'Statistical analysis',
      legalBasis: 'GDPR Article 6(1)(e) - Public Interest',
      retentionPeriod: 365,
      automatedDecision: true,
      privacyImpact: 'high',
      dataSubjects: 892
    }
  ]);

  const [algorithmicDecisions, setAlgorithmicDecisions] = useState<AlgorithmicDecision[]>([
    {
      id: 'algo-001',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      algorithm: 'Trust Score Calculation v2.3',
      decision: 'Increased trust score by 0.15',
      confidence: 0.87,
      factors: [
        { name: 'Response Time', weight: 0.3, value: 'Excellent' },
        { name: 'Accuracy', weight: 0.25, value: '94%' },
        { name: 'Reliability', weight: 0.2, value: 'High' },
        { name: 'Community Feedback', weight: 0.15, value: 'Positive' },
        { name: 'Data Quality', weight: 0.1, value: 'Good' }
      ],
      explanation: 'Trust score increased due to consistent emergency response participation and positive community feedback',
      impact: 'User may access additional emergency response features',
      userCanAppeal: true
    },
    {
      id: 'algo-002',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      algorithm: 'Emergency Resource Allocation',
      decision: 'Prioritized medical resources for area',
      confidence: 0.92,
      factors: [
        { name: 'Severity', weight: 0.4, value: 'High' },
        { name: 'Population Density', weight: 0.25, value: 'Medium' },
        { name: 'Available Resources', weight: 0.2, value: 'Limited' },
        { name: 'Response Time', weight: 0.15, value: 'Critical' }
      ],
      explanation: 'High severity assessment and critical response time requirements led to medical resource prioritization',
      impact: 'Emergency response resources allocated to specified area',
      userCanAppeal: true
    }
  ]);

  const [accessLogs, setAccessLogs] = useState<DataAccessEntry[]>([
    {
      id: 'access-001',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      accessor: 'Emergency Response System',
      purpose: 'Emergency response coordination',
      dataType: 'Location Data',
      dataVolume: '247 records',
      legalBasis: 'GDPR Article 6(1)(c) - Vital Interests',
      location: 'San Francisco, CA',
      successful: true
    },
    {
      id: 'access-002',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      accessor: 'Research Analytics Team',
      purpose: 'Service improvement analysis',
      dataType: 'Anonymized Usage Patterns',
      dataVolume: '1.2MB aggregated data',
      legalBasis: 'GDPR Article 6(1)(b) - Contractual Necessity',
      successful: true
    },
    {
      id: 'access-003',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      accessor: 'Legal Compliance Team',
      purpose: 'GDPR data access request fulfillment',
      dataType: 'User Profile Data',
      dataVolume: 'Complete user profile',
      legalBasis: 'GDPR Article 15 - Rights of Access',
      location: 'Remote access',
      successful: true
    }
  ]);

  const [legalRequests, setLegalRequests] = useState<LegalRequestStatus[]>([
    {
      id: 'legal-001',
      type: 'data_access',
      status: 'completed',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'User requested complete data export',
      responseDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      canUserContact: true
    },
    {
      id: 'legal-002',
      type: 'deletion',
      status: 'processing',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      description: 'User requested account deletion',
      responseDeadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      canUserContact: true
    }
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemTransparencyMetric[]>([
    {
      metric: 'Data Processing Requests',
      value: 1247,
      trend: 'up',
      period: 'Last 30 days',
      description: 'Total number of data processing operations'
    },
    {
      metric: 'User Data Access',
      value: 89,
      trend: 'stable',
      period: 'Last 30 days',
      description: 'Number of authorized data access events'
    },
    {
      metric: 'Legal Requests',
      value: 12,
      trend: 'down',
      period: 'Last 30 days',
      description: 'GDPR and other legal data requests processed'
    },
    {
      metric: 'Algorithmic Decisions',
      value: 3421,
      trend: 'up',
      period: 'Last 30 days',
      description: 'Number of automated decisions made'
    },
    {
      metric: 'Data Subject Count',
      value: 15420,
      trend: 'up',
      period: 'Current',
      description: 'Total number of data subjects in system'
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

  // Get privacy impact color
  const getPrivacyImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'pending': return 'yellow';
      case 'rejected': case 'appealed': return 'red';
      default: return 'gray';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      case 'stable': return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
      default: return null;
    }
  };

  // Export transparency report
  const exportTransparencyReport = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, generate and download report
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Report Generated",
        description: "Your transparency report has been generated and downloaded."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate transparency report",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transparency Report</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Date Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search transparency logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportTransparencyReport}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['processing', 'algorithms', 'access', 'legal', 'metrics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'processing' ? 'Data Processing' :
             tab === 'algorithms' ? 'Algorithmic Decisions' :
             tab === 'access' ? 'Data Access Logs' :
             tab === 'legal' ? 'Legal Requests' :
             tab === 'metrics' ? 'System Metrics' : tab}
          </button>
        ))}
      </div>

      {/* Data Processing Tab */}
      {activeTab === 'processing' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Processing Logs</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Real-time processing</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {processingLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getPrivacyImpactColor(log.privacyImpact)} text="" />
                      <h3 className="font-medium">{log.operation}</h3>
                      <span className="text-sm text-gray-600">• {log.dataType}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Purpose:</span>
                      <div className="font-medium">{log.purpose}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Legal Basis:</span>
                      <div className="font-medium">{log.legalBasis}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Retention:</span>
                      <div className="font-medium">{log.retentionPeriod} days</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data Subjects:</span>
                      <div className="font-medium">{log.dataSubjects.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Decision Type:</span>
                      <div className="font-medium">
                        {log.automatedDecision ? 'Automated' : 'Manual'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Privacy Impact:</span>
                      <StatusIndicator status={getPrivacyImpactColor(log.privacyImpact)} text={log.privacyImpact} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Algorithmic Decisions Tab */}
      {activeTab === 'algorithms' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Algorithmic Decision Explanations</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4" />
                <span>Explainable AI</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {algorithmicDecisions.map((decision) => (
                <div key={decision.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium">{decision.algorithm}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={decision.confidence >= 0.8 ? 'green' : decision.confidence >= 0.6 ? 'yellow' : 'red'} 
                        text="" 
                      />
                      <span className="text-sm font-medium">
                        {Math.round(decision.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Decision:</h4>
                    <p className="text-gray-800">{decision.decision}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Explanation:</h4>
                    <p className="text-gray-600 text-sm">{decision.explanation}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Decision Factors:</h4>
                    <div className="space-y-2">
                      {decision.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{factor.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${factor.weight * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{factor.weight}</span>
                            <span className="text-sm font-medium">{factor.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-gray-600">
                      <span>Impact: {decision.impact}</span>
                      <span className="ml-4">Created: {formatTimeAgo(decision.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {decision.userCanAppeal ? (
                        <Button variant="outline" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Appeal Decision
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-600">
                          <Lock className="h-4 w-4 inline mr-1" />
                          Decision final
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Data Access Logs Tab */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Data Access History & Audit Trail</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>Complete audit log</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {accessLogs.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <FileSearch className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{entry.accessor}</h3>
                        <span className="text-sm text-gray-600">• {entry.dataType}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={entry.successful ? 'green' : 'red'} 
                        text="" 
                      />
                      <span className="text-sm font-medium">
                        {entry.successful ? 'Successful' : 'Failed'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Purpose:</span>
                      <div className="font-medium">{entry.purpose}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Legal Basis:</span>
                      <div className="font-medium">{entry.legalBasis}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data Volume:</span>
                      <div className="font-medium">{entry.dataVolume}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <div className="font-medium">{entry.location || 'Remote'}</div>
                    </div>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Legal Request Status Updates</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>GDPR compliance tracking</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {legalRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator status={getStatusColor(request.status)} text="" />
                      <div>
                        <h3 className="font-medium capitalize">
                          {request.type.replace('_', ' ')}
                        </h3>
                        <span className="text-sm text-gray-600">
                          • {request.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatTimeAgo(request.createdAt)}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-gray-800">{request.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <div className="font-medium">{request.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <div className="font-medium">{request.updatedAt.toLocaleDateString()}</div>
                    </div>
                    {request.responseDeadline && (
                      <div>
                        <span className="text-gray-600">Response Deadline:</span>
                        <div className="font-medium">{request.responseDeadline.toLocaleDateString()}</div>
                      </div>
                    )}
                    {request.estimatedCompletion && (
                      <div>
                        <span className="text-gray-600">Est. Completion:</span>
                        <div className="font-medium">{request.estimatedCompletion.toLocaleDateString()}</div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">User Contact:</span>
                      {request.canUserContact ? (
                        <div className="flex items-center space-x-1">
                          <Unlock className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">Allowed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Lock className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-600">Restricted</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* System Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">System-Wide Transparency Metrics</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4" />
                <span>Live statistics</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemMetrics.map((metric, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{metric.metric}</h3>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="text-2xl font-bold mb-2">{metric.value}</div>
                  <p className="text-sm text-gray-600 mb-2">{metric.description}</p>
                  <div className="text-xs text-gray-500">Period: {metric.period}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TransparencyReport;