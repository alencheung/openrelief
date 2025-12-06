'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  MapPin, 
  MessageSquare,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  Archive,
  Flag,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  ChevronRight,
  Bell,
  BellOff,
  UserCheck,
  UserX,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  FileText,
  Download,
  Share2,
  Edit,
  Trash2,
  Plus,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEmergencyStore, useEmergencyActions } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'
import { TrustBadge } from '@/components/ui/TrustBadge'

interface EmergencyWorkflowManagerProps {
  className?: string
}

interface WorkflowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  timestamp?: number
  assignee?: string
  actions?: WorkflowAction[]
}

interface WorkflowAction {
  id: string
  type: 'confirm' | 'dispute' | 'escalate' | 'resolve' | 'archive'
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
  requiresAuth?: boolean
  requiresTrust?: number
}

interface EmergencyEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location: {
    latitude: number
    longitude: number
    radius: number
    address?: string
  }
  reporter: {
    id: string
    name: string
    trustScore: number
  }
  status: 'pending' | 'active' | 'confirmed' | 'disputed' | 'resolved' | 'archived'
  trustWeight: number
  confirmationCount: number
  disputeCount: number
  createdAt: string
  updatedAt: string
  expiresAt: string
  metadata: {
    images?: string[]
    videos?: string[]
    audio?: string
    tags?: string[]
    source?: string
    deviceInfo?: string
  }
  consensus?: {
    status: 'gathering' | 'reached' | 'failed'
    confidence: number
    requiredConfirmations: number
    currentConfirmations: number
    timeRemaining?: number
  }
}

export function EmergencyWorkflowManager({ className }: EmergencyWorkflowManagerProps) {
  const { selectedEvent, events } = useEmergencyStore()
  const { updateEvent, setSelectedEvent } = useEmergencyActions()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'consensus' | 'actions'>('overview')
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [availableActions, setAvailableActions] = useState<WorkflowAction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [filter, setFilter] = useState({
    status: 'all',
    severity: 'all',
    type: 'all',
  })

  // Mock emergency event for demonstration
  const mockEmergency: EmergencyEvent = {
    id: 'emergency-123',
    type: 'fire',
    severity: 'high',
    title: 'Building Fire Reported',
    description: 'Multiple reports of fire in downtown commercial building. Smoke visible from several blocks away.',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 500,
      address: '123 Market St, San Francisco, CA',
    },
    reporter: {
      id: 'user-456',
      name: 'John Doe',
      trustScore: 0.85,
    },
    status: 'active',
    trustWeight: 0.75,
    confirmationCount: 12,
    disputeCount: 2,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T11:45:00Z',
    expiresAt: '2024-01-16T10:30:00Z',
    metadata: {
      images: ['image1.jpg', 'image2.jpg'],
      videos: ['video1.mp4'],
      audio: 'audio1.mp3',
      tags: ['fire', 'building', 'downtown'],
      source: 'mobile_app',
      deviceInfo: 'iPhone 14 Pro',
    },
    consensus: {
      status: 'gathering',
      confidence: 0.65,
      requiredConfirmations: 5,
      currentConfirmations: 3,
      timeRemaining: 1800, // 30 minutes
    },
  }

  // Initialize workflow steps
  useEffect(() => {
    const emergency = selectedEvent || mockEmergency
    const steps: WorkflowStep[] = [
      {
        id: 'report_received',
        title: 'Report Received',
        description: 'Emergency report has been received and validated',
        status: 'completed',
        timestamp: new Date(emergency.createdAt).getTime(),
      },
      {
        id: 'location_verification',
        title: 'Location Verification',
        description: 'Verifying report location and accuracy',
        status: emergency.status === 'pending' ? 'in_progress' : 'completed',
        timestamp: new Date(emergency.createdAt).getTime() + 300000, // 5 minutes later
      },
      {
        id: 'trust_assessment',
        title: 'Trust Assessment',
        description: 'Evaluating reporter trust score and history',
        status: 'completed',
        timestamp: new Date(emergency.createdAt).getTime() + 600000, // 10 minutes later
        assignee: 'Trust System',
      },
      {
        id: 'consensus_building',
        title: 'Consensus Building',
        description: 'Gathering confirmations from trusted users in area',
        status: emergency.consensus?.status === 'gathering' ? 'in_progress' : 
                emergency.consensus?.status === 'reached' ? 'completed' : 'pending',
        timestamp: emergency.consensus ? Date.now() - emergency.consensus.timeRemaining! * 1000 : undefined,
      },
      {
        id: 'alert_dispatch',
        title: 'Alert Dispatch',
        description: 'Dispatching alerts to nearby users',
        status: emergency.status === 'active' ? 'completed' : 'pending',
        timestamp: emergency.status === 'active' ? Date.now() - 900000 : undefined, // 15 minutes ago
      },
    ]

    setWorkflowSteps(steps)
  }, [selectedEvent, mockEmergency])

  // Initialize available actions
  useEffect(() => {
    const emergency = selectedEvent || mockEmergency
    const actions: WorkflowAction[] = [
      {
        id: 'confirm',
        type: 'confirm',
        label: 'Confirm Emergency',
        description: 'Verify this emergency is real and accurate',
        icon: CheckCircle,
        available: emergency.status === 'active' || emergency.status === 'pending',
        requiresTrust: 0.4,
      },
      {
        id: 'dispute',
        type: 'dispute',
        label: 'Dispute Report',
        description: 'Mark this report as false or inaccurate',
        icon: XCircle,
        available: emergency.status === 'active' || emergency.status === 'pending',
        requiresTrust: 0.5,
      },
      {
        id: 'escalate',
        type: 'escalate',
        label: 'Escalate Priority',
        description: 'Escalate to emergency services',
        icon: AlertTriangle,
        available: emergency.severity === 'critical',
        requiresAuth: true,
      },
      {
        id: 'resolve',
        type: 'resolve',
        label: 'Mark Resolved',
        description: 'Mark this emergency as resolved',
        icon: Archive,
        available: emergency.status === 'active' || emergency.status === 'confirmed',
        requiresAuth: true,
      },
      {
        id: 'archive',
        type: 'archive',
        label: 'Archive Event',
        description: 'Archive this emergency event',
        icon: Archive,
        available: emergency.status === 'resolved',
      },
    ]

    setAvailableActions(actions)
  }, [selectedEvent, mockEmergency])

  // Handle workflow action
  const handleWorkflowAction = async (action: WorkflowAction) => {
    if (!action.available || isProcessing) return

    setIsProcessing(true)
    
    try {
      const emergency = selectedEvent || mockEmergency
      
      switch (action.type) {
        case 'confirm':
          await updateEvent(emergency.id, {
            status: 'confirmed',
            confirmationCount: emergency.confirmationCount + 1,
          })
          break
          
        case 'dispute':
          await updateEvent(emergency.id, {
            status: 'disputed',
            disputeCount: emergency.disputeCount + 1,
          })
          break
          
        case 'escalate':
          // Implement escalation logic
          console.log('Escalating emergency:', emergency.id)
          break
          
        case 'resolve':
          await updateEvent(emergency.id, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
          })
          break
          
        case 'archive':
          await updateEvent(emergency.id, {
            status: 'archived',
          })
          break
      }
      
      console.log(`Action ${action.type} completed for emergency ${emergency.id}`)
    } catch (error) {
      console.error('Failed to execute workflow action:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Get status color
  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'in_progress': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  // Get status icon
  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'in_progress': return RefreshCw
      case 'failed': return XCircle
      default: return Clock
    }
  }

  const emergency = selectedEvent || mockEmergency

  return (
    <div className={cn('space-y-6', className)}>
      {/* Emergency Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency Workflow Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={emergency.status === 'active' ? 'active' : 'inactive'}
                size="sm"
                label={emergency.status.toUpperCase()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(emergency)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emergency Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{emergency.title}</h3>
                <p className="text-muted-foreground">{emergency.description}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <EmergencyIndicator
                  type={emergency.type}
                  label={emergency.type}
                  severity={emergency.severity}
                  showSeverity
                />
                
                <TrustBadge
                  score={emergency.trustWeight * 100}
                  showTrend
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{emergency.location.address || `${emergency.location.latitude.toFixed(4)}, ${emergency.location.longitude.toFixed(4)}`}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Reported by {emergency.reporter.name}</span>
                <TrustBadge
                  score={emergency.reporter.trustScore * 100}
                  size="sm"
                  variant="subtle"
                />
              </div>
            </div>
            
            {/* Consensus Status */}
            <div className="space-y-4">
              <h4 className="font-medium">Consensus Status</h4>
              {emergency.consensus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Progress</span>
                    <Badge variant="outline">
                      {emergency.consensus.status}
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(emergency.consensus.currentConfirmations / emergency.consensus.requiredConfirmations) * 100}%` 
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>{emergency.consensus.currentConfirmations} / {emergency.consensus.requiredConfirmations} confirmations</span>
                    <span>{emergency.consensus.confidence.toFixed(1)}% confidence</span>
                  </div>
                  
                  {emergency.consensus.timeRemaining && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Clock className="h-4 w-4" />
                      <span>{Math.floor(emergency.consensus.timeRemaining / 60)}m {emergency.consensus.timeRemaining % 60}s remaining</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {(['overview', 'workflow', 'consensus', 'actions'] as const).map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {emergency.confirmationCount}
                  </div>
                  <p className="text-sm text-muted-foreground">Confirmations</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {emergency.disputeCount}
                  </div>
                  <p className="text-sm text-muted-foreground">Disputes</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(emergency.confirmationCount / Math.max(1, emergency.confirmationCount + emergency.disputeCount) * 100).toFixed(0)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(emergency.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Expires</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(emergency.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Workflow Tab */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {workflowSteps.map((step, index) => {
                const IconComponent = getStatusIcon(step.status)
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className={cn('p-2 rounded-full', getStatusColor(step.status))}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{step.title}</h4>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Badge variant="outline">
                          {step.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {step.assignee && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {step.assignee}
                        </p>
                      )}
                      
                      {step.timestamp && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(step.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    {index < workflowSteps.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
          
          {/* Consensus Tab */}
          {activeTab === 'consensus' && emergency.consensus && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {emergency.consensus.confidence.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Consensus Confidence</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant="outline">
                        {emergency.consensus.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Confirmations</span>
                      <span className="font-medium">
                        {emergency.consensus.currentConfirmations} / {emergency.consensus.requiredConfirmations}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Time Remaining</h4>
                  {emergency.consensus.timeRemaining && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {Math.floor(emergency.consensus.timeRemaining / 60)}:{(emergency.consensus.timeRemaining % 60).toString().padStart(2, '0')}
                      </div>
                      <p className="text-sm text-muted-foreground">Until consensus timeout</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableActions.map((action) => {
                  const IconComponent = action.icon
                  return (
                    <motion.div
                      key={action.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className="w-full h-auto p-4 flex flex-col items-start gap-3"
                        variant={action.available ? 'default' : 'outline'}
                        disabled={!action.available || isProcessing}
                        onClick={() => handleWorkflowAction(action)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <IconComponent className="h-5 w-5 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs opacity-75">{action.description}</div>
                          </div>
                        </div>
                        
                        {action.requiresTrust && (
                          <div className="text-xs opacity-75">
                            Requires {(action.requiresTrust! * 100).toFixed(0)}% trust
                          </div>
                        )}
                        
                        {action.requiresAuth && (
                          <div className="text-xs opacity-75">
                            Requires authentication
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}