'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smartphone, 
  Bell, 
  MapPin, 
  Battery, 
  Shield, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  Zap,
  Activity,
  Clock,
  Radio
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useiOSBackground, useEmergencyNotifications, useiOSSpecificFeatures } from '@/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusIndicator } from '@/components/ui/StatusIndicator'
import { Switch } from '@/components/ui/Switch'

interface iOSBackgroundManagerProps {
  className?: string
}

export function iOSBackgroundManager({ className }: iOSBackgroundManagerProps) {
  const {
    config,
    isInitialized,
    isInitializing,
    queueStatus,
    initialize,
    updateConfig,
    sendTestEmergency,
    requestPermissions,
    triggerLocationCheck,
    triggerQueueProcessing,
  } = useiOSBackground()

  const { notifications, activeEmergency, dismissEmergency } = useEmergencyNotifications()
  const { 
    batteryLevel, 
    isCharging, 
    isLowPowerMode, 
    shouldThrottleBackgroundTasks 
  } = useiOSSpecificFeatures()

  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [testPayload, setTestPayload] = useState({
    title: 'Test Emergency',
    message: 'This is a test emergency notification',
    severity: 'high' as const,
    requiresAction: true,
  })

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      initialize()
    }
  }, [isInitialized, isInitializing, initialize])

  const handleInitialize = async () => {
    const success = await initialize()
    if (success) {
      console.log('iOS Background Manager initialized successfully')
    } else {
      console.error('Failed to initialize iOS Background Manager')
    }
  }

  const handlePermissionRequest = async () => {
    const success = await requestPermissions()
    if (success) {
      console.log('iOS permissions granted successfully')
    } else {
      console.error('Failed to get iOS permissions')
    }
  }

  const handleSendTest = () => {
    sendTestEmergency(testPayload)
  }

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-600' : 'text-red-600'
  }

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
  }

  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">iOS Only Feature</h3>
            <p className="text-sm">
              This component is only available on iOS devices for managing 
              background notifications and location services.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            iOS Background Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <StatusIndicator
                status={isInitialized ? 'active' : 'inactive'}
                size="lg"
                label={isInitialized ? 'Initialized' : 'Not Initialized'}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Background system status
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold">{queueStatus.queued}</div>
              <p className="text-sm text-muted-foreground">Queued Emergencies</p>
              {queueStatus.processing && (
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mt-1 text-blue-600" />
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Battery className="h-5 w-5" />
                <span className="text-lg font-semibold">
                  {batteryLevel !== null ? `${Math.round(batteryLevel)}%` : 'Unknown'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isLowPowerMode ? 'Low Power Mode' : isCharging ? 'Charging' : 'On Battery'}
              </p>
            </div>
          </div>

          {!isInitialized && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleInitialize}
                loading={isInitializing}
                className="w-full md:w-auto"
              >
                Initialize iOS Background
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Sections */}
      <div className="space-y-4">
        {/* Silent Push Notifications */}
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'push' ? null : 'push')}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Silent Push Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive emergency alerts even when app is closed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.silentPushEnabled}
                  onCheckedChange={(checked) => updateConfig({ silentPushEnabled: checked })}
                  disabled={!isInitialized}
                />
                <div className={cn('text-sm', getStatusColor(config.silentPushEnabled))}>
                  {getStatusIcon(config.silentPushEnabled)}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedSection === 'push' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Alerts</span>
                      <Switch
                        checked={config.criticalAlertsEnabled}
                        onCheckedChange={(checked) => updateConfig({ criticalAlertsEnabled: checked })}
                        disabled={!isInitialized}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Critical alerts bypass Do Not Disturb and use maximum volume
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Background Location */}
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'location' ? null : 'location')}
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium">Background Location</h3>
                  <p className="text-sm text-muted-foreground">
                    Verify proximity to emergencies in background
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.backgroundLocationEnabled}
                  onCheckedChange={(checked) => updateConfig({ backgroundLocationEnabled: checked })}
                  disabled={!isInitialized}
                />
                <div className={cn('text-sm', getStatusColor(config.backgroundLocationEnabled))}>
                  {getStatusIcon(config.backgroundLocationEnabled)}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedSection === 'location' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerLocationCheck}
                      disabled={!isInitialized || !config.backgroundLocationEnabled}
                      className="w-full"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Trigger Location Check
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Manually trigger a background location verification
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Battery Optimization */}
        <Card>
          <CardContent className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'battery' ? null : 'battery')}
            >
              <div className="flex items-center gap-3">
                <Battery className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-medium">Battery Optimization</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage background task throttling
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.batteryOptimizationHandled}
                  onCheckedChange={(checked) => updateConfig({ batteryOptimizationHandled: checked })}
                  disabled={!isInitialized}
                />
                <div className={cn('text-sm', getStatusColor(config.batteryOptimizationHandled))}>
                  {getStatusIcon(config.batteryOptimizationHandled)}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedSection === 'battery' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="space-y-3">
                    {isLowPowerMode && (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-800">Low Power Mode Active</p>
                            <p className="text-xs text-orange-700">
                              Background tasks are throttled to conserve battery
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {shouldThrottleBackgroundTasks && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Critical Battery Level</p>
                            <p className="text-xs text-red-700">
                              Background tasks are suspended until battery is charged
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Active Emergency */}
      <AnimatePresence>
        {activeEmergency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Radio className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-800">Active Critical Emergency</h3>
                    <p className="text-sm text-red-700 mt-1">{activeEmergency.message}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="border-red-200 text-red-800">
                        {activeEmergency.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-red-600">
                        {new Date(activeEmergency.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissEmergency(activeEmergency.eventId)}
                    className="text-red-600 border-red-200"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test Emergency Title</label>
              <input
                type="text"
                value={testPayload.title}
                onChange={(e) => setTestPayload(prev => ({ ...prev, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Enter test emergency title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Test Emergency Message</label>
              <textarea
                value={testPayload.message}
                onChange={(e) => setTestPayload(prev => ({ ...prev, message: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                rows={3}
                placeholder="Enter test emergency message"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Severity</label>
              <select
                value={testPayload.severity}
                onChange={(e) => setTestPayload(prev => ({ 
                  ...prev, 
                  severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' 
                }))}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendTest} disabled={!isInitialized}>
                <Zap className="h-4 w-4 mr-2" />
                Send Test Emergency
              </Button>
              
              <Button
                variant="outline"
                onClick={triggerQueueProcessing}
                disabled={!isInitialized}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Process Queue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Emergency Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.eventId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {notification.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}