'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  AlertTriangle, 
  Zap, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  UserCheck,
  Timer,
  Radio,
  MapPin,
  Filter,
  Settings,
  Info,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Play,
  Pause,
  SkipForward,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTrustStore, useTrustScore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Progress } from '@/components/ui/Progress'

interface ConsensusEngineUIProps {
  className?: string
  emergencyId?: string
}

interface ConsensusParticipant {
  id: string
  userId: string
  name: string
  trustScore: number
  vote?: 'confirm' | 'dispute' | 'pending'
  location: {
    latitude: number
    longitude: number
    accuracy: number
    distance: number
  }
  responseTime: number
  weight: number
  expertise: string[]
  isOnline: boolean
  lastActive: number
}

interface ConsensusMetrics {
  totalParticipants: number
  confirmVotes: number
  disputeVotes: number
  pendingVotes: number
  confidence: number
  requiredVotes: number
  timeRemaining: number
  averageResponseTime: number
  trustWeightedScore: number
  geographicDistribution: {
    withinRadius: number
    outsideRadius: number
  averageDistance: number
  }
  expertiseDistribution: Record<string, number>
}

interface ConsensusEvent {
  id: string
  title: string
  description: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: {
    latitude: number
    longitude: number
    radius: number
  }
  reporter: {
    id: string
    name: string
    trustScore: number
  }
  status: 'gathering' | 'building' | 'reached' | 'failed' | 'expired'
  createdAt: string
  expiresAt: string
  metrics: ConsensusMetrics
  participants: ConsensusParticipant[]
  history: ConsensusAction[]
}

interface ConsensusAction {
  id: string
  type: 'confirm' | 'dispute' | 'join' | 'leave' | 'timeout'
  participantId: string
  timestamp: string
  metadata?: any
}

export function ConsensusEngineUI({ className, emergencyId }: ConsensusEngineUIProps) {
  const [consensusEvent, setConsensusEvent] = useState<ConsensusEvent | null>(null)
  const [isRealtime, setIsRealtime] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'participants' | 'metrics' | 'timeline' | 'map'>('participants')
  const [filter, setFilter] = useState({
    vote: 'all',
    distance: 'all',
    expertise: 'all',
  })
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds

  const currentUserTrustScore = useTrustScore()
  const animationRef = useRef<HTMLDivElement>(null)

  // Mock consensus event for demonstration
  const mockConsensusEvent: ConsensusEvent = {
    id: emergencyId || 'consensus-123',
    title: 'Building Fire Emergency',
    description: 'Multiple reports of fire in downtown commercial building',
    type: 'fire',
    severity: 'high',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 500,
    },
    reporter: {
      id: 'user-456',
      name: 'Jane Smith',
      trustScore: 0.85,
    },
    status: 'building',
    createdAt: '2024-01-15T10:30:00Z',
    expiresAt: '2024-01-15T12:30:00Z',
    metrics: {
      totalParticipants: 24,
      confirmVotes: 18,
      disputeVotes: 2,
      pendingVotes: 4,
      confidence: 0.75,
      requiredVotes: 5,
      timeRemaining: 1800, // 30 minutes
      averageResponseTime: 45000, // 45 seconds
      trustWeightedScore: 0.72,
      geographicDistribution: {
        withinRadius: 18,
        outsideRadius: 6,
        averageDistance: 850,
      },
      expertiseDistribution: {
        'fire': 8,
        'medical': 3,
        'security': 4,
        'infrastructure': 2,
        'natural': 7,
      },
    },
    participants: [
      {
        id: 'user-1',
        userId: 'user-1',
        name: 'Alice Johnson',
        trustScore: 0.92,
        vote: 'confirm',
        location: {
          latitude: 37.7751,
          longitude: -122.4188,
          accuracy: 10,
          distance: 120,
        },
        responseTime: 15000,
        weight: 1.0,
        expertise: ['fire', 'medical'],
        isOnline: true,
        lastActive: Date.now() - 300000,
      },
      {
        id: 'user-2',
        userId: 'user-2',
        name: 'Bob Wilson',
        trustScore: 0.78,
        vote: 'confirm',
        location: {
          latitude: 37.7745,
          longitude: -122.4192,
          accuracy: 15,
          distance: 200,
        },
        responseTime: 35000,
        weight: 0.85,
        expertise: ['security'],
        isOnline: true,
        lastActive: Date.now() - 120000,
      },
      {
        id: 'user-3',
        userId: 'user-3',
        name: 'Carol Davis',
        trustScore: 0.65,
        vote: 'pending',
        location: {
          latitude: 37.7752,
          longitude: -122.4190,
          accuracy: 20,
          distance: 350,
        },
        responseTime: 60000,
        weight: 0.7,
        expertise: ['medical'],
        isOnline: true,
        lastActive: Date.now() - 600000,
      },
    ],
    history: [
      {
        id: 'action-1',
        type: 'confirm',
        participantId: 'user-1',
        timestamp: '2024-01-15T10:35:00Z',
      },
      {
        id: 'action-2',
        type: 'dispute',
        participantId: 'user-4',
        timestamp: '2024-01-15T10:40:00Z',
      },
    ],
  }

  useEffect(() => {
    setConsensusEvent(mockConsensusEvent)
  }, [emergencyId])

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      // This would fetch real-time consensus data
      console.log('Refreshing consensus data...')
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isAutoRefresh, refreshInterval])

  // Get vote color
  const getVoteColor = (vote?: string) => {
    switch (vote) {
      case 'confirm': return 'text-green-600 bg-green-50'
      case 'dispute': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const event = consensusEvent || mockConsensusEvent
  const canParticipate = currentUserTrustScore && currentUserTrustScore.score >= 0.4

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Consensus Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={isRealtime ? 'active' : 'inactive'}
                size="sm"
                label={isRealtime ? 'Real-time' : 'Offline'}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRealtime(!isRealtime)}
              >
                {isRealtime ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {event.metrics.confidence.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Confidence</p>
            </div>

            {/* Participants */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {event.metrics.confirmVotes}
              </div>
              <p className="text-sm text-muted-foreground">Confirmations</p>
            </div>

            {/* Disputes */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {event.metrics.disputeVotes}
              </div>
              <p className="text-sm text-muted-foreground">Disputes</p>
            </div>

            {/* Time Remaining */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor(event.metrics.timeRemaining / 60)}:{(event.metrics.timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-sm text-muted-foreground">Time Remaining</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Consensus Progress</span>
              <span className="text-sm text-muted-foreground">
                {event.metrics.confirmVotes} / {event.metrics.requiredVotes} required
              </span>
            </div>
            <Progress
              value={(event.metrics.confirmVotes / event.metrics.requiredVotes) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {event.title}
          </CardTitle>
          <Badge variant="outline" className={getConfidenceColor(event.metrics.confidence)}>
            {event.status.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Emergency Details</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Type:</span> {event.type}</div>
                <div><span className="font-medium">Severity:</span> 
                  <Badge variant="outline">{event.severity.toUpperCase()}</Badge>
                </div>
                <div><span className="font-medium">Reporter:</span> {event.reporter.name}</div>
                <div><span className="font-medium">Trust Score:</span> 
                  <span className={getConfidenceColor(event.reporter.trustScore)}>
                    {(event.reporter.trustScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Consensus Metrics</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Required Votes:</span> {event.metrics.requiredVotes}</div>
                <div><span className="font-medium">Average Response:</span> {Math.round(event.metrics.averageResponseTime / 1000)}s</div>
                <div><span className="font-medium">Weighted Score:</span> {event.metrics.trustWeightedScore.toFixed(2)}</div>
                <div><span className="font-medium">Total Participants:</span> {event.metrics.totalParticipants}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Consensus Details</CardTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Selector */}
              <div className="flex gap-1">
                {(['participants', 'metrics', 'timeline', 'map'] as const).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                >
                  {isAutoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This would refresh consensus data
                    console.log('Manual refresh triggered')
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Participants View */}
          {viewMode === 'participants' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <select
                  value={filter.vote}
                  onChange={(e) => setFilter(prev => ({ ...prev, vote: e.target.value }))}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Votes</option>
                  <option value="confirm">Confirm Only</option>
                  <option value="dispute">Dispute Only</option>
                  <option value="pending">Pending Only</option>
                </select>

                <select
                  value={filter.distance}
                  onChange={(e) => setFilter(prev => ({ ...prev, distance: e.target.value }))}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">All Distances</option>
                  <option value="nearby">Nearby (<500m)</option>
                  <option value="far">Far (>500m)</option>
                </select>
              </div>

              {/* Participants List */}
              <div className="space-y-2">
                {event.participants
                  .filter(participant => {
                    if (filter.vote !== 'all' && participant.vote !== filter.vote) return false
                    if (filter.distance === 'nearby' && participant.location.distance > 500) return false
                    if (filter.distance === 'far' && participant.location.distance <= 500) return false
                    return true
                  })
                  .map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        <div>
                          <div className="font-medium">{participant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Trust: {(participant.trustScore * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          getVoteColor(participant.vote)
                        )}>
                          {participant.vote?.toUpperCase() || 'PENDING'}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <div>{Math.round(participant.responseTime / 1000)}s</div>
                          <div>{participant.location.distance}m</div>
                        </div>

                        <div className="flex gap-1">
                          {participant.expertise.map(exp => (
                            <Badge key={exp} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Metrics View */}
          {viewMode === 'metrics' && (
            <div className="space-y-6">
              {/* Geographic Distribution */}
              <div>
                <h4 className="font-medium mb-4">Geographic Distribution</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {event.metrics.geographicDistribution.withinRadius}
                    </div>
                    <p className="text-sm text-muted-foreground">Within Radius</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {event.metrics.geographicDistribution.outsideRadius}
                    </div>
                    <p className="text-sm text-muted-foreground">Outside Radius</p>
                  </div>
                </div>
              </div>

              {/* Expertise Distribution */}
              <div>
                <h4 className="font-medium mb-4">Expertise Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(event.metrics.expertiseDistribution).map(([expertise, count]) => (
                    <div key={expertise} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{expertise}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(count / event.metrics.totalParticipants) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-4">
              <h4 className="font-medium mb-4">Consensus Timeline</h4>
              <div className="space-y-2">
                {event.history.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      action.type === 'confirm' ? 'bg-green-100' :
                      action.type === 'dispute' ? 'bg-red-100' :
                      'bg-gray-100'
                    )}>
                      {action.type === 'confirm' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {action.type === 'dispute' && <XCircle className="h-4 w-4 text-red-600" />}
                      {action.type === 'join' && <Plus className="h-4 w-4 text-blue-600" />}
                      {action.type === 'leave' && <Minus className="h-4 w-4 text-orange-600" />}
                      {action.type === 'timeout' && <Clock className="h-4 w-4 text-gray-600" />}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">
                        {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(action.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="space-y-4">
              <h4 className="font-medium mb-4">Geographic Distribution</h4>
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p>Interactive map view would be rendered here</p>
                  <p className="text-sm">Showing {event.participants.length} participants</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Participation */}
      {canParticipate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Your Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your Trust Score</span>
                <Badge variant="outline">
                  {(currentUserTrustScore!.score * 100).toFixed(0)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Can Participate</span>
                <Badge variant={canParticipate ? 'default' : 'secondary'}>
                  {canParticipate ? 'Yes' : 'No'}
                </Badge>
              </div>

              {canParticipate && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      // This would submit a confirmation vote
                      console.log('Submitting confirmation vote...')
                    }}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Confirm Emergency
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // This would submit a dispute vote
                      console.log('Submitting dispute vote...')
                    }}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Dispute Report
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}