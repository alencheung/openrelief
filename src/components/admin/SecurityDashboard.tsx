/**
 * Security Dashboard for Administrators
 *
 * Provides real-time security monitoring, threat detection,
 * and administrative controls for the OpenRelief system.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  Lock,
  Unlock,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  UserCheck,
  UserX,
  Database,
  Globe,
  Cpu,
  Wifi
} from 'lucide-react'

// Security dashboard interfaces
interface SecurityMetrics {
  totalAlerts: number
  criticalAlerts: number
  highAlerts: number
  mediumAlerts: number
  lowAlerts: number
  blockedIPs: number
  suspiciousUsers: number
  trustScoreAverage: number
  systemHealth: number
  uptime: number
  responseTime: number
}

interface SecurityAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  timestamp: Date
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  userId?: string
  ipAddress?: string
  metadata?: any
}

interface TrustMetrics {
  totalUsers: number
  averageTrustScore: number
  trustDistribution: {
    very_low: number
    low: number
    medium: number
    high: number
    very_high: number
  }
  recentChanges: {
    userId: string
    previousScore: number
    newScore: number
    change: number
    reason: string
    timestamp: Date
  }[]
}

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical'
  services: {
    api: 'operational' | 'degraded' | 'down'
    database: 'operational' | 'degraded' | 'down'
    authentication: 'operational' | 'degraded' | 'down'
    monitoring: 'operational' | 'degraded' | 'down'
  }
  performance: {
    responseTime: number
    throughput: number
    errorRate: number
    cpuUsage: number
    memoryUsage: number
  }
}

interface SuspiciousActivity {
  id: string
  type: 'sybil_attack' | 'rate_limit' | 'suspicious_ip' | 'trust_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  userId?: string
  ipAddress?: string
  timestamp: Date
  status: 'active' | 'investigating' | 'mitigated'
  details: any
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [trustMetrics, setTrustMetrics] = useState<TrustMetrics | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [emergencyMode, setEmergencyMode] = useState(false)

  // Fetch security data
  useEffect(() => {
    fetchSecurityData()
    const interval = setInterval(fetchSecurityData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)

      // Fetch all security data in parallel
      const [
        metricsResponse,
        alertsResponse,
        trustResponse,
        statusResponse,
        activityResponse
      ] = await Promise.all([
        fetch('/api/admin/security/metrics').then(r => r.json()),
        fetch('/api/admin/security/alerts').then(r => r.json()),
        fetch('/api/admin/security/trust-metrics').then(r => r.json()),
        fetch('/api/admin/security/system-status').then(r => r.json()),
        fetch('/api/admin/security/suspicious-activity').then(r => r.json())
      ])

      setMetrics(metricsResponse.data)
      setAlerts(alertsResponse.data)
      setTrustMetrics(trustResponse.data)
      setSystemStatus(statusResponse.data)
      setSuspiciousActivity(activityResponse.data)
    } catch (error) {
      console.error('Error fetching security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmergencyModeToggle = async () => {
    try {
      const response = await fetch('/api/admin/security/emergency-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !emergencyMode })
      })

      if (response.ok) {
        setEmergencyMode(!emergencyMode)
      }
    } catch (error) {
      console.error('Error toggling emergency mode:', error)
    }
  }

  const handleAlertAction = async (alertId: string, action: string) => {
    try {
      await fetch(`/api/admin/security/alerts/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      // Refresh alerts
      fetchSecurityData()
    } catch (error) {
      console.error('Error handling alert action:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) {
      return 'text-green-600'
    }
    if (health >= 70) {
      return 'text-yellow-600'
    }
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600">Real-time security monitoring and threat detection</p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <Button
            onClick={handleEmergencyModeToggle}
            variant={emergencyMode ? 'destructive' : 'outline'}
            className="flex items-center space-x-2"
          >
            {emergencyMode ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            <span>{emergencyMode ? 'Emergency Mode ON' : 'Emergency Mode OFF'}</span>
          </Button>
        </div>
      </div>

      {/* Emergency Mode Alert */}
      {emergencyMode && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Emergency Mode Active</AlertTitle>
          <AlertDescription className="text-red-700">
            Enhanced security measures are in place. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAlerts || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Badge variant="destructive">{metrics?.criticalAlerts || 0} Critical</Badge>
              <Badge variant="secondary">{metrics?.highAlerts || 0} High</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.blockedIPs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Suspicious addresses blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.trustScoreAverage || 0).toFixed(2)}</div>
            <Progress value={(metrics?.trustScoreAverage || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics?.systemHealth || 0)}`}>
              {metrics?.systemHealth || 0}%
            </div>
            <Progress value={metrics?.systemHealth || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="trust">Trust System</TabsTrigger>
          <TabsTrigger value="activity">Suspicious Activity</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
              <CardDescription>
                Real-time security events and threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.type)}`}></div>
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{alert.category}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, 'investigate')}
                      >
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trust System Tab */}
        <TabsContent value="trust" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trust Score Distribution</CardTitle>
                <CardDescription>
                  User trust score ranges across the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Very Low (0.0-0.2)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(trustMetrics?.trustDistribution.very_low || 0) * 100} className="w-24" />
                      <span className="text-sm w-12 text-right">
                        {trustMetrics?.trustDistribution.very_low || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low (0.2-0.4)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(trustMetrics?.trustDistribution.low || 0) * 100} className="w-24" />
                      <span className="text-sm w-12 text-right">
                        {trustMetrics?.trustDistribution.low || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium (0.4-0.6)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(trustMetrics?.trustDistribution.medium || 0) * 100} className="w-24" />
                      <span className="text-sm w-12 text-right">
                        {trustMetrics?.trustDistribution.medium || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High (0.6-0.8)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(trustMetrics?.trustDistribution.high || 0) * 100} className="w-24" />
                      <span className="text-sm w-12 text-right">
                        {trustMetrics?.trustDistribution.high || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Very High (0.8-1.0)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(trustMetrics?.trustDistribution.very_high || 0) * 100} className="w-24" />
                      <span className="text-sm w-12 text-right">
                        {trustMetrics?.trustDistribution.very_high || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Trust Score Changes</CardTitle>
                <CardDescription>
                  Significant trust score updates in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trustMetrics?.recentChanges.slice(0, 5).map((change, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium text-sm">User {change.userId}</p>
                        <p className="text-xs text-gray-600">{change.reason}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          change.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {change.change > 0 ? '+' : ''}{change.change.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {change.previousScore.toFixed(2)} → {change.newScore.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Suspicious Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity Detection</CardTitle>
              <CardDescription>
                Automated detection of potential security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(activity.severity)}`}></div>
                      <div>
                        <h4 className="font-medium">{activity.type.replace('_', ' ').toUpperCase()}</h4>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{activity.severity}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                          {activity.userId && (
                            <Badge variant="secondary">User: {activity.userId}</Badge>
                          )}
                          {activity.ipAddress && (
                            <Badge variant="secondary">IP: {activity.ipAddress}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={activity.status === 'active' ? 'destructive' : 'secondary'}>
                        {activity.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(activity.id, 'mitigate')}
                      >
                        Mitigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>
                  Operational status of critical services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>API Service</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus?.services.api)}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        systemStatus?.services.api === 'operational' ? 'bg-green-500'
                          : systemStatus?.services.api === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {systemStatus?.services.api || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus?.services.database)}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        systemStatus?.services.database === 'operational' ? 'bg-green-500'
                          : systemStatus?.services.database === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {systemStatus?.services.database || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Authentication</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus?.services.authentication)}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        systemStatus?.services.authentication === 'operational' ? 'bg-green-500'
                          : systemStatus?.services.authentication === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {systemStatus?.services.authentication || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>Monitoring</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${getStatusColor(systemStatus?.services.monitoring)}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        systemStatus?.services.monitoring === 'operational' ? 'bg-green-500'
                          : systemStatus?.services.monitoring === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {systemStatus?.services.monitoring || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  System performance and resource utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-medium">
                        {systemStatus?.performance.responseTime || 0}ms
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (systemStatus?.performance.responseTime || 0) / 10)}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">CPU Usage</span>
                      <span className="text-sm font-medium">
                        {systemStatus?.performance.cpuUsage || 0}%
                      </span>
                    </div>
                    <Progress
                      value={systemStatus?.performance.cpuUsage || 0}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">
                        {systemStatus?.performance.memoryUsage || 0}%
                      </span>
                    </div>
                    <Progress
                      value={systemStatus?.performance.memoryUsage || 0}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Error Rate</span>
                      <span className="text-sm font-medium">
                        {systemStatus?.performance.errorRate || 0}%
                      </span>
                    </div>
                    <Progress
                      value={systemStatus?.performance.errorRate || 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}