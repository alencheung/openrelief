'use client'

import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, subDays, isAfter } from 'date-fns'
import { useTrustHistory, useTrustScore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface TrustHistoryChartProps {
  userId?: string
  days?: number
  showArea?: boolean
  height?: number
  className?: string
}

interface ChartDataPoint {
  date: string
  score: number
  change: number
  actionType: string
  timestamp: Date
}

export function TrustHistoryChart({ 
  userId, 
  days = 30, 
  showArea = false,
  height = 300,
  className 
}: TrustHistoryChartProps) {
  const trustHistory = useTrustHistory(userId)
  const currentTrustScore = useTrustScore(userId)

  const chartData = useMemo(() => {
    const now = new Date()
    const cutoffDate = subDays(now, days)
    
    // Filter history within the specified range
    const relevantHistory = trustHistory.filter(entry => 
      isAfter(new Date(entry.timestamp), cutoffDate)
    )

    // Create data points for each day
    const dataPoints: ChartDataPoint[] = []
    const dailyScores = new Map<string, number>()
    
    // Group by date and get the latest score for each day
    relevantHistory.forEach(entry => {
      const dateKey = format(new Date(entry.timestamp), 'MMM dd')
      dailyScores.set(dateKey, entry.newScore)
    })

    // Generate continuous data points
    for (let i = days; i >= 0; i--) {
      const date = subDays(now, i)
      const dateKey = format(date, 'MMM dd')
      
      // Find the most recent score up to this date
      let score = currentTrustScore?.score || 0.5
      for (const [d, s] of dailyScores.entries()) {
        const dDate = new Date(d + ', ' + date.getFullYear())
        if (dDate <= date) {
          score = s
          break
        }
      }

      dataPoints.push({
        date: dateKey,
        score: score * 100, // Convert to percentage
        change: 0,
        actionType: '',
        timestamp: date
      })
    }

    // Add actual history points with annotations
    relevantHistory.forEach(entry => {
      const dateKey = format(new Date(entry.timestamp), 'MMM dd')
      const existingPoint = dataPoints.find(p => p.date === dateKey)
      if (existingPoint) {
        existingPoint.change = entry.change * 100
        existingPoint.actionType = entry.actionType
        existingPoint.score = entry.newScore * 100
      }
    })

    return dataPoints
  }, [trustHistory, currentTrustScore, days])

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'report': return '#10b981' // green
      case 'confirm': return '#3b82f6' // blue
      case 'dispute': return '#f59e0b' // orange
      default: return '#6b7280' // gray
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-blue-600">
            Score: {data.score.toFixed(1)}%
          </p>
          {data.change !== 0 && (
            <p className="text-sm">
              Change: <span className={data.change > 0 ? 'text-green-600' : 'text-red-600'}>
                {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
              </span>
            </p>
          )}
          {data.actionType && (
            <Badge variant="outline" className="mt-1">
              {data.actionType}
            </Badge>
          )}
        </div>
      )
    }
    return null
  }

  const ChartComponent = showArea ? AreaChart : LineChart

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trust Score Trend</span>
          <div className="flex gap-2">
            <Badge variant="outline">
              Last {days} days
            </Badge>
            {currentTrustScore && (
              <Badge variant={currentTrustScore.score >= 0.7 ? 'default' : 'secondary'}>
                {(currentTrustScore.score * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Trust Score (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {showArea ? (
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (payload.actionType) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={getActionTypeColor(payload.actionType)}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )
                  }
                  return null
                }}
                activeDot={{ r: 6 }}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Report</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Confirm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Dispute</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Trust Factors Radar Chart
interface TrustFactorsRadarProps {
  userId?: string
  className?: string
}

export function TrustFactorsRadar({ userId, className }: TrustFactorsRadarProps) {
  const trustScore = useTrustScore(userId)

  const radarData = useMemo(() => {
    if (!trustScore?.factors) return []

    const factorLabels: Record<string, string> = {
      reportingAccuracy: 'Reporting',
      confirmationAccuracy: 'Confirmation',
      disputeAccuracy: 'Dispute',
      responseTime: 'Response',
      locationAccuracy: 'Location',
      contributionFrequency: 'Contribution',
      communityEndorsement: 'Endorsement',
      penaltyScore: 'Penalty'
    }

    return Object.entries(trustScore.factors).map(([key, value]) => ({
      factor: factorLabels[key] || key,
      value: key === 'responseTime' 
        ? Math.max(0, 100 - (value * 100 / 60)) // Convert response time to 0-100 scale
        : key === 'penaltyScore'
        ? Math.max(0, 100 - (value * 100)) // Invert penalty score
        : value * 100,
      fullMark: 100
    }))
  }, [trustScore])

  if (!trustScore?.factors) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No trust factor data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Trust Factors Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {radarData.map((factor) => (
            <div key={factor.factor} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(factor.value / 100) * 176} 176`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{factor.value.toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{factor.factor}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}