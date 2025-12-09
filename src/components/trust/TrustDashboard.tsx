'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Users,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTrustStore, useTrustScore, useTrustHistory, useTrustThresholds } from '@/store'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusIndicator } from '@/components/ui/StatusIndicator'

interface TrustDashboardProps {
  userId?: string
  compact?: boolean
  showDetails?: boolean
  className?: string
}

export function TrustDashboard({
  userId,
  compact = false,
  showDetails = true,
  className
}: TrustDashboardProps) {
  const trustScore = useTrustScore(userId)
  const trustHistory = useTrustHistory(userId)
  const thresholds = useTrustThresholds()
  const { getUserScore, loadHistory } = useTrustStore()

  const [expanded, setExpanded] = useState(false)
  const [showFactors, setShowFactors] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    if (userId) {
      loadHistory(userId)
    }
  }, [userId, loadHistory])

  const currentScore = trustScore?.score || 0
  const previousScore = trustScore?.previousScore || 0
  const scoreChange = currentScore - previousScore
  const scoreTrend = scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'stable'

  // Filter history based on time range
  const filteredHistory = trustHistory.filter(entry => {
    const entryDate = new Date(entry.timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)

    switch (timeRange) {
      case 'week': return daysDiff <= 7
      case 'month': return daysDiff <= 30
      case 'all': return true
      default: return true
    }
  })

  // Calculate statistics
  const recentActions = filteredHistory.slice(0, 10)
  const successfulReports = filteredHistory.filter(e => e.actionType === 'report' && e.change > 0).length
  const failedReports = filteredHistory.filter(e => e.actionType === 'report' && e.change < 0).length
  const confirmations = filteredHistory.filter(e => e.actionType === 'confirm').length
  const disputes = filteredHistory.filter(e => e.actionType === 'dispute').length

  const getTrustLevel = (score: number) => {
    if (score >= thresholds.highTrust) {
      return { level: 'High Trust', color: 'text-green-600', bg: 'bg-green-50' }
    }
    if (score >= thresholds.confirming) {
      return { level: 'Medium Trust', color: 'text-blue-600', bg: 'bg-blue-50' }
    }
    if (score >= thresholds.reporting) {
      return { level: 'Low Trust', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    }
    return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const trustLevel = getTrustLevel(currentScore)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <TrustBadge
          score={currentScore}
          showTrend
          trend={scoreTrend}
          size="sm"
        />
        <div className="flex-1">
          <div className="text-sm font-medium">{trustLevel.level}</div>
          <div className="text-xs text-muted-foreground">
            {currentScore.toFixed(2)} trust score
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Trust Score Dashboard
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Score */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="text-4xl font-bold text-primary">
                  {(currentScore * 100).toFixed(0)}%
                </div>
                <div className={cn('text-sm font-medium mt-1', trustLevel.color)}>
                  {trustLevel.level}
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {scoreTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {scoreTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                  <span className={cn(
                    'text-sm',
                    scoreChange > 0 ? 'text-green-600'
                      : scoreChange < 0 ? 'text-red-600' : 'text-gray-600'
                  )}>
                    {scoreChange > 0 ? '+' : ''}{(scoreChange * 100).toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Trust Factors */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Trust Factors</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFactors(!showFactors)}
                >
                  {showFactors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              <AnimatePresence>
                {showFactors && trustScore?.factors && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {Object.entries(trustScore.factors).map(([key, value]) => {
                      const factorLabels: Record<string, string> = {
                        reportingAccuracy: 'Reporting Accuracy',
                        confirmationAccuracy: 'Confirmation Accuracy',
                        disputeAccuracy: 'Dispute Accuracy',
                        responseTime: 'Response Time',
                        locationAccuracy: 'Location Accuracy',
                        contributionFrequency: 'Contribution Frequency',
                        communityEndorsement: 'Community Endorsement',
                        penaltyScore: 'Penalty Score'
                      }

                      const displayValue = key === 'responseTime'
                        ? `${value}min`
                        : key === 'contributionFrequency'
                          ? `${value}/week`
                          : `${(value * 100).toFixed(0)}%`

                      return (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{factorLabels[key]}</span>
                          <span className="font-medium">{displayValue}</span>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{successfulReports}</div>
                      <div className="text-xs text-muted-foreground">Successful Reports</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{failedReports}</div>
                      <div className="text-xs text-muted-foreground">Failed Reports</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{confirmations}</div>
                      <div className="text-xs text-muted-foreground">Confirmations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{disputes}</div>
                      <div className="text-xs text-muted-foreground">Disputes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trust History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Trust History
                  </CardTitle>
                  <div className="flex gap-2">
                    {(['week', 'month', 'all'] as const).map(range => (
                      <Button
                        key={range}
                        variant={timeRange === range ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange(range)}
                      >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No trust history available</p>
                    </div>
                  ) : (
                    recentActions.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            entry.change > 0 ? 'bg-green-500'
                              : entry.change < 0 ? 'bg-red-500' : 'bg-gray-500'
                          )} />
                          <div>
                            <div className="text-sm font-medium capitalize">
                              {entry.actionType}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleDateString()} • {entry.reason}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            'text-sm font-medium',
                            entry.change > 0 ? 'text-green-600'
                              : entry.change < 0 ? 'text-red-600' : 'text-gray-600'
                          )}>
                            {entry.change > 0 ? '+' : ''}{(entry.change * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(entry.newScore * 100).toFixed(0)}%
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trust Thresholds Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Trust Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Minimum to Report</span>
                      <span className="text-sm font-medium">{(thresholds.reporting * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Minimum to Confirm</span>
                      <span className="text-sm font-medium">{(thresholds.confirming * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Minimum to Dispute</span>
                      <span className="text-sm font-medium">{(thresholds.disputing * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">High Trust Level</span>
                      <span className="text-sm font-medium">{(thresholds.highTrust * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}