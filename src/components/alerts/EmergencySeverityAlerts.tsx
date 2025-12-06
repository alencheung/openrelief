'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  Shield, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Zap, 
  Radio, 
  Activity, 
  Clock, 
  MapPin, 
  Users, 
  TrendingUp, 
  Info, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  Settings,
  Filter,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Download,
  Share2,
  MessageSquare,
  Navigation,
  Home,
  Phone,
  Ambulance,
  Flame,
  HeartPulse,
  CloudRain,
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore, useNotificationActions } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { EmergencyIndicator } from '@/components/ui/EmergencyIndicator'
import { Switch } from '@/components/ui/Switch'

interface EmergencySeverityAlertsProps {
  className?: string
}

interface SeverityAlert {
  id: string
  type: 'emergency' | 'severity_update' | 'system' | 'trust_alert'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: number
  location?: {
    latitude: number
    longitude: number
    radius: number
    address?: string
  }
  trustWeight?: number
  requiresAction: boolean
  actions?: AlertAction[]
  metadata?: {
    eventId?: string
    reporterId?: string
    deviceInfo?: string
    source?: string
  }
  acknowledged: boolean
  dismissed: boolean
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface AlertAction {
  id: string
  type: 'navigate' | 'confirm' | 'dispute' | 'call' | 'share' | 'dismiss'
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  url?: string
  data?: any
  primary?: boolean
}

interface SeverityThresholds {
  low: {
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
    sound: string
    vibration: boolean
  }
  medium: {
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
    sound: string
    vibration: boolean
  }
  high: {
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
    sound: string
    vibration: boolean
  }
  critical: {
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
    sound: string
    vibration: boolean
    flash: boolean
  }
}

export function EmergencySeverityAlerts({ className }: EmergencySeverityAlertsProps) {
  const [alerts, setAlerts] = useState<SeverityAlert[]>([])
  const [activeAlerts, setActiveAlerts] = useState<SeverityAlert[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isDoNotDisturb, setIsDoNotDisturb] = useState(false)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    severity: 'all',
    type: 'all',
    acknowledged: 'all',
  })
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    flashEnabled: true,
    autoDismiss: false,
    autoDismissTime: 30000, // 30 seconds
    maxAlerts: 50,
  })

  const { addNotification } = useNotificationActions()

  // Severity thresholds configuration
  const severityThresholds: SeverityThresholds = {
    low: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Info,
      sound: 'gentle',
      vibration: false,
    },
    medium: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: AlertCircle,
      sound: 'moderate',
      vibration: true,
    },
    high: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: AlertTriangle,
      sound: 'urgent',
      vibration: true,
    },
    critical: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: Shield,
      sound: 'critical',
      vibration: true,
      flash: true,
    },
  }

  // Mock alerts for demonstration
  const mockAlerts: SeverityAlert[] = [
    {
      id: 'alert-1',
      type: 'emergency',
      severity: 'critical',
      title: '🚨 CRITICAL EMERGENCY',
      message: 'Building fire reported in downtown area. Multiple casualties reported.',
      timestamp: Date.now() - 60000, // 1 minute ago
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 500,
        address: '123 Market St, San Francisco, CA',
      },
      trustWeight: 0.95,
      requiresAction: true,
      priority: 'urgent',
      acknowledged: false,
      dismissed: false,
      read: false,
      actions: [
        {
          id: 'navigate',
          type: 'navigate',
          label: 'View on Map',
          description: 'Navigate to emergency location',
          icon: MapPin,
          primary: true,
        },
        {
          id: 'call',
          type: 'call',
          label: 'Call Emergency',
          description: 'Call emergency services',
          icon: Phone,
        },
        {
          id: 'share',
          type: 'share',
          label: 'Share Alert',
          description: 'Share with nearby users',
          icon: Share2,
        },
      ],
      metadata: {
        eventId: 'emergency-123',
        reporterId: 'user-456',
      },
    },
    {
      id: 'alert-2',
      type: 'severity_update',
      severity: 'high',
      title: 'Emergency Severity Increased',
      message: 'Fire emergency severity upgraded from medium to high due to multiple confirmations.',
      timestamp: Date.now() - 120000, // 2 minutes ago
      priority: 'high',
      acknowledged: true,
      dismissed: false,
      read: true,
      actions: [
        {
          id: 'navigate',
          type: 'navigate',
          label: 'View Details',
          description: 'View emergency details',
          icon: Eye,
        },
      ],
      metadata: {
        eventId: 'emergency-123',
      },
    },
    {
      id: 'alert-3',
      type: 'system',
      severity: 'medium',
      title: 'Network Connectivity Issue',
      message: 'Experiencing high latency in emergency alert dispatch. Some alerts may be delayed.',
      timestamp: Date.now() - 300000, // 5 minutes ago
      priority: 'medium',
      acknowledged: false,
      dismissed: false,
      read: false,
      actions: [
        {
          id: 'dismiss',
          type: 'dismiss',
          label: 'Dismiss',
          description: 'Dismiss this alert',
          icon: X,
        },
      ],
    },
  ]

  useEffect(() => {
    setAlerts(mockAlerts)
    setActiveAlerts(mockAlerts.filter(alert => !alert.acknowledged && !alert.dismissed))
  }, [])

  // Get severity configuration
  const getSeverityConfig = (severity: SeverityAlert['severity']) => {
    return severityThresholds[severity]
  }

  // Handle alert action
  const handleAlertAction = (alert: SeverityAlert, action: AlertAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.url) {
          window.location.href = action.url
        }
        break
        
      case 'confirm':
        // Handle confirmation action
        console.log('Confirming alert:', alert.id)
        break
        
      case 'dispute':
        // Handle dispute action
        console.log('Disputing alert:', alert.id)
        break
        
      case 'call':
        // Handle emergency call
        window.location.href = 'tel:911'
        break
        
      case 'share':
        // Handle share action
        if (navigator.share) {
          navigator.share({
            title: alert.title,
            text: alert.message,
            url: window.location.href,
          })
        }
        break
        
      case 'dismiss':
        // Dismiss alert
        setAlerts(prev => prev.map(a => 
          a.id === alert.id ? { ...a, dismissed: true } : a
        ))
        setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))
        break
    }
  }

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true, read: true } : alert
    ))
  }

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filter.severity !== 'all' && alert.severity !== filter.severity) return false
    if (filter.type !== 'all' && alert.type !== filter.type) return false
    if (filter.acknowledged !== 'all') {
      if (filter.acknowledged === 'acknowledged' && !alert.acknowledged) return false
      if (filter.acknowledged === 'unacknowledged' && alert.acknowledged) return false
    }
    return true
  })

  // Get alert count by severity
  const getAlertCount = (severity: SeverityAlert['severity']) => {
    return activeAlerts.filter(alert => alert.severity === severity).length
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Emergency Severity Alerts
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={isMuted ? 'inactive' : 'active'}
                size="sm"
                label={isMuted ? 'Muted' : 'Active'}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Critical Alerts */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {getAlertCount('critical')}
              </div>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>

            {/* High Alerts */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getAlertCount('high')}
              </div>
              <p className="text-sm text-muted-foreground">High</p>
            </div>

            {/* Medium Alerts */}
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {getAlertCount('medium')}
              </div>
              <p className="text-sm text-muted-foreground">Medium</p>
            </div>

            {/* Low Alerts */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getAlertCount('low')}
              </div>
              <p className="text-sm text-muted-foreground">Low</p>
            </div>
          </div>

          {/* Active Alerts Summary */}
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800">
                {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Alert Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Do Not Disturb */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Do Not Disturb</h4>
                <p className="text-sm text-muted-foreground">
                  Silence all non-critical alerts
                </p>
              </div>
              <Switch
                checked={isDoNotDisturb}
                onCheckedChange={setIsDoNotDisturb}
              />
            </div>

            {/* Sound Settings */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Sound Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Play sound for new alerts
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
              />
            </div>

            {/* Vibration Settings */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Vibration</h4>
                <p className="text-sm text-muted-foreground">
                  Vibrate for critical alerts
                </p>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, vibrationEnabled: checked }))}
              />
            </div>

            {/* Flash Settings */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Flash Alert</h4>
                <p className="text-sm text-muted-foreground">
                  Flash screen for critical alerts
                </p>
              </div>
              <Switch
                checked={settings.flashEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, flashEnabled: checked }))}
              />
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <div className="flex items-center gap-2">
              {/* Filter Controls */}
              <select
                value={filter.severity}
                onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Only</option>
                <option value="medium">Medium Only</option>
                <option value="low">Low Only</option>
              </select>

              <select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="emergency">Emergency</option>
                <option value="severity_update">Severity Update</option>
                <option value="system">System</option>
                <option value="trust_alert">Trust Alert</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear all alerts
                  setAlerts([])
                  setActiveAlerts([])
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No alerts match your filters</p>
              </div>
            ) : (
              filteredAlerts.map((alert, index) => {
                const config = getSeverityConfig(alert.severity)
                const IconComponent = config.icon
                const isExpanded = expandedAlert === alert.id

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'border rounded-lg overflow-hidden',
                      config.borderColor,
                      alert.acknowledged ? 'opacity-60' : ''
                    )}
                  >
                    {/* Alert Header */}
                    <div
                      className={cn(
                        'p-4 cursor-pointer',
                        config.bgColor
                      )}
                      onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            config.bgColor
                          )}>
                            <IconComponent className={cn('h-4 w-4', config.color)} />
                          </div>
                          <div>
                            <h4 className="font-semibold">{alert.title}</h4>
                            <p className="text-sm opacity-75">{alert.message}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                acknowledgeAlert(alert.id)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAlertAction(alert, alert.actions?.find(a => a.type === 'dismiss') || {
                                id: 'dismiss',
                                type: 'dismiss',
                                label: 'Dismiss',
                                icon: X,
                              })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Alert Metadata */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                        
                        {alert.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{alert.location.address || `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}</span>
                          </div>
                        )}
                        
                        {alert.trustWeight && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>{(alert.trustWeight * 100).toFixed(0)}% trust</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    <AnimatePresence>
                      {isExpanded && alert.actions && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t p-4 bg-gray-50"
                        >
                          <div className="space-y-2">
                            {alert.actions.map((action, actionIndex) => (
                              <Button
                                key={action.id}
                                variant={action.primary ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAlertAction(alert, action)
                                }}
                              >
                                <action.icon className="h-4 w-4 mr-2" />
                                <div className="text-left">
                                  <div className="font-medium">{action.label}</div>
                                  {action.description && (
                                    <div className="text-sm opacity-75">{action.description}</div>
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}