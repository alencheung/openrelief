'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Clock,
  Server,
  Database,
  Globe,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Cpu,
  HardDrive,
  Wifi,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  usePerformanceMonitor, 
  usePerformanceMetrics, 
  usePerformanceAlerts, 
  usePerformanceActions 
} from '@/lib/performance-monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'

interface PerformanceDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function PerformanceDashboard({ 
  className, 
  autoRefresh = true, 
  refreshInterval = 5000 
}: PerformanceDashboardProps) {
  const metrics = usePerformanceMetrics()
  const alerts = usePerformanceAlerts()
  const { 
    startMonitoring, 
    stopMonitoring, 
    triggerOptimization, 
    generateReport,
    exportMetrics 
  } = usePerformanceActions()

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('1h')
  const [report, setReport] = useState<any>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // This would trigger real-time metrics update
        console.log('Refreshing performance metrics...')
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Check monitoring status
  useEffect(() => {
    setIsMonitoring(true)
    startMonitoring()
    
    return () => {
      stopMonitoring()
    }
  }, [startMonitoring, stopMonitoring])

  // Generate performance report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const performanceReport = generateReport(timeRange)
      setReport(performanceReport)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Export metrics
  const handleExportMetrics = (format: 'json' | 'csv') => {
    const data = exportMetrics(format)
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get status color based on thresholds
  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    const ratio = value / threshold
    if (inverse) {
      if (ratio > 1.2) return 'text-red-600'
      if (ratio > 1.1) return 'text-orange-600'
      if (ratio > 1.0) return 'text-yellow-600'
      return 'text-green-600'
    } else {
      if (ratio > 0.8) return 'text-red-600'
      if (ratio > 0.6) return 'text-orange-600'
      if (ratio > 0.4) return 'text-yellow-600'
      return 'text-green-600'
    }
  }

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical')
  const unresolvedAlerts = alerts.filter(alert => !alert.resolved)

  // Prepare chart data
  const latencyData = [
    { name: 'Current', value: metrics.averageLatency, threshold: 100 },
    { name: 'P95', value: metrics.p95Latency, threshold: 100 },
    { name: 'P99', value: metrics.p99Latency, threshold: 100 },
  ]

  const throughputData = [
    { time: 'Now', rps: metrics.requestsPerSecond },
    { time: '-5m', rps: metrics.requestsPerSecond * 0.95 },
    { time: '-10m', rps: metrics.requestsPerSecond * 0.9 },
    { time: '-15m', rps: metrics.requestsPerSecond * 0.85 },
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitoring
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={isMonitoring ? 'active' : 'inactive'}
                size="sm"
                label={isMonitoring ? 'Monitoring' : 'Stopped'}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
              >
                {isMonitoring ? 'Stop' : 'Start'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Latency */}
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                getStatusColor(metrics.averageLatency, 100)
              )}>
                {metrics.averageLatency.toFixed(1)}ms
              </div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <div className="text-xs text-muted-foreground">
                Target: <100ms
              </div>
            </div>

            {/* Throughput */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.requestsPerSecond.toFixed(0)}
              </div>
              <p className="text-sm text-muted-foreground">Requests/sec</p>
              <div className="text-xs text-muted-foreground">
                {metrics.requestsPerMinute.toFixed(0)} req/min
              </div>
            </div>

            {/* Error Rate */}
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                getStatusColor(metrics.errorRate, 1.0, true)
              )}>
                {metrics.errorRate.toFixed(2)}%
              </div>
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <div className="text-xs text-muted-foreground">
                Target: <1%
              </div>
            </div>

            {/* Total Requests */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.totalRequests.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <div className="text-xs text-muted-foreground">
                All time
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({unresolvedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unresolvedAlerts.slice(0, 5).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'high' ? 'bg-orange-600' :
                      'bg-yellow-600'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {alert.message}
                      </p>
                      <p className="text-xs text-red-600">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-red-200 text-red-800">
                    {alert.severity.toUpperCase()}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Latency Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="threshold" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Throughput Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Throughput Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="rps"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    getStatusColor(metrics.cpuUsage, 80, true).replace('text-', 'bg-')
                  )}
                  style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.cpuUsage.toFixed(1)}% (max: 80%)
              </p>
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    getStatusColor(metrics.memoryUsage, 85, true).replace('text-', 'bg-')
                  )}
                  style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.memoryUsage.toFixed(1)}% (max: 85%)
              </p>
            </div>

            {/* Queue Size */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Queue Size</span>
              </div>
              <div className="text-lg font-semibold">
                {metrics.queueSize.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Max: 10,000
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(metrics.regionalPerformance).map(([region, perf]) => (
              <div key={region} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900">
                  {region.toUpperCase()}
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {perf.averageLatency.toFixed(1)}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  {perf.requestCount} requests
                </div>
                <div className={cn(
                  'text-xs',
                  getStatusColor(perf.errorRate, 1.0, true)
                )}>
                  {perf.errorRate.toFixed(2)}% errors
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Controls & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Report Time Range</label>
              <div className="flex gap-2">
                {(['1h', '24h', '7d', '30d'] as const).map(range => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <label className="text-sm font-medium mb-2 block">Actions</label>
              <div className="space-y-2">
                <Button
                  onClick={() => triggerOptimization('query_optimization')}
                  className="w-full"
                  disabled={!isMonitoring}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Queries
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleExportMetrics('json')}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Modal */}
      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Performance Report</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReport(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div>Total Requests: {report.summary.totalRequests.toLocaleString()}</div>
                      <div>Avg Latency: {report.summary.averageLatency.toFixed(1)}ms</div>
                      <div>Error Rate: {report.summary.errorRate.toFixed(2)}%</div>
                      <div>Uptime: {report.summary.uptime.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Latency Distribution</h4>
                    <div className="space-y-1 text-sm">
                      <div>P50: {report.latency.p50.toFixed(1)}ms</div>
                      <div>P95: {report.latency.p95.toFixed(1)}ms</div>
                      <div>P99: {report.latency.p99.toFixed(1)}ms</div>
                      <div>Max: {report.latency.max.toFixed(1)}ms</div>
                    </div>
                  </div>
                </div>
                
                {report.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm">
                      {report.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}