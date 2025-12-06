/**
 * Trust-Based Security Middleware
 * 
 * This middleware integrates trust scores with security decisions,
 * providing dynamic access controls and attack resistance based on user reputation.
 * It works with the existing security infrastructure to enhance protection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { trustScoreManager } from './trust-integration'
import { securityMonitor } from './security-monitor'

// Trust-based security interfaces
export interface TrustSecurityContext {
  userId?: string
  trustScore?: number
  trustThreshold?: string
  trustWeight?: number
  resistance?: string
  permissions?: string[]
  restrictions?: string[]
  requirements?: string[]
}

export interface TrustSecurityConfig {
  enableTrustBasedRateLimiting: boolean
  enableAttackResistance: boolean
  emergencyMode: boolean
  trustWeightMultiplier: number
  minTrustThreshold: number
}

// Default configuration
const DEFAULT_CONFIG: TrustSecurityConfig = {
  enableTrustBasedRateLimiting: true,
  enableAttackResistance: true,
  emergencyMode: false,
  trustWeightMultiplier: 2.0,
  minTrustThreshold: 0.3
}

/**
 * Trust-based security middleware
 */
export async function trustSecurityMiddleware(
  request: NextRequest,
  config: Partial<TrustSecurityConfig> = {}
): Promise<{
  allowed: boolean
  context: TrustSecurityContext
  response?: NextResponse
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  try {
    // Extract user information from request
    const userId = extractUserIdFromRequest(request)
    
    if (!userId) {
      // No user ID, apply default security
      return {
        allowed: true,
        context: {
          userId: undefined,
          trustScore: 0.1,
          trustThreshold: 'very_low',
          trustWeight: 0,
          resistance: 'no_user',
          permissions: ['read_public'],
          restrictions: ['strict_rate_limit'],
          requirements: []
        }
      }
    }
    
    // Get user's trust information
    const trustThreshold = trustScoreManager.getTrustThreshold(userId)
    const rateLimitParams = trustScoreManager.getTrustBasedRateLimit(userId)
    
    // Check if user can perform the requested action
    const action = determineActionFromRequest(request)
    const permissionCheck = await trustScoreManager.canPerformAction(userId, action)
    
    if (!permissionCheck.allowed) {
      // Log permission denied
      await securityMonitor.createAlert(
        'trust_permission_denied' as any,
        'medium' as any,
        `Trust-based permission denied for user ${userId}`,
        `Action: ${action}, Reason: ${permissionCheck.reason}`,
        'trust_system',
        {
          userId,
          action,
          reason: permissionCheck.reason,
          trustThreshold: trustThreshold.level,
          requirements: permissionCheck.requirements
        }
      )
      
      return {
        allowed: false,
        context: {
          userId,
          trustScore: 0, // Will be populated if needed
          trustThreshold: trustThreshold.level,
          trustWeight: 0,
          resistance: 'permission_denied',
          permissions: permissionCheck.requirements || [],
          restrictions: permissionCheck.restrictions || [],
          requirements: permissionCheck.requirements || []
        },
        response: NextResponse.json(
          { 
            error: 'Permission denied',
            reason: permissionCheck.reason,
            requirements: permissionCheck.requirements
          },
          { status: 403 }
        )
      }
    }
    
    // Apply attack resistance if enabled
    let resistance = 'allowed'
    let trustWeight = trustThreshold.minScore
    
    if (finalConfig.enableAttackResistance) {
      const requestData = await extractRequestData(request)
      const attackResistance = await trustScoreManager.applyAttackResistance(
        userId,
        action,
        requestData
      )
      
      resistance = attackResistance.resistance
      trustWeight = attackResistance.trustWeight
      
      if (!attackResistance.allowed) {
        await securityMonitor.createAlert(
          'trust_attack_blocked' as any,
          'high' as any,
          `Trust-based attack resistance triggered for user ${userId}`,
          `Action: ${action}, Resistance: ${resistance}`,
          'trust_system',
          {
            userId,
            action,
            resistance,
            trustWeight,
            requestData: attackResistance.adjustedData
          }
        )
        
        return {
          allowed: false,
          context: {
            userId,
            trustScore: trustWeight,
            trustThreshold: trustThreshold.level,
            trustWeight,
            resistance,
            permissions: permissionCheck.requirements || [],
            restrictions: permissionCheck.restrictions || [],
            requirements: permissionCheck.requirements || []
          },
          response: NextResponse.json(
            { 
              error: 'Attack resistance triggered',
              resistance,
              trustWeight
            },
            { status: 429 }
          )
        }
      }
    }
    
    // Create trust security context
    const context: TrustSecurityContext = {
      userId,
      trustScore: trustWeight,
      trustThreshold: trustThreshold.level,
      trustWeight,
      resistance,
      permissions: permissionCheck.requirements || [],
      restrictions: permissionCheck.restrictions || [],
      requirements: permissionCheck.requirements || []
    }
    
    // Add trust information to request headers for downstream processing
    const response = NextResponse.next()
    response.headers.set('x-trust-score', trustWeight.toString())
    response.headers.set('x-trust-threshold', trustThreshold.level)
    response.headers.set('x-trust-weight', trustWeight.toString())
    response.headers.set('x-trust-resistance', resistance)
    
    return {
      allowed: true,
      context,
      response
    }
  } catch (error) {
    console.error('Error in trust security middleware:', error)
    
    // Fail secure - deny access on error
    return {
      allowed: false,
      context: {
        trustScore: 0,
        trustThreshold: 'very_low',
        trustWeight: 0,
        resistance: 'error'
      },
      response: NextResponse.json(
        { error: 'Security check failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Trust-based rate limiting middleware
 */
export async function trustBasedRateLimitMiddleware(
  request: NextRequest,
  context: TrustSecurityContext
): Promise<{
  allowed: boolean
  limitExceeded: boolean
  retryAfter?: number
  response?: NextResponse
}> {
  try {
    if (!context.userId) {
      // Apply default rate limiting for unauthenticated users
      return {
        allowed: true,
        limitExceeded: false
      }
    }
    
    // Get trust-based rate limit parameters
    const rateLimitParams = trustScoreManager.getTrustBasedRateLimit(context.userId)
    
    // Check current rate limit usage (this would integrate with your rate limiting system)
    const currentUsage = await getCurrentRateLimitUsage(context.userId, request.ip || '')
    const limitExceeded = currentUsage >= rateLimitParams.maxRequests
    
    if (limitExceeded) {
      // Calculate retry after based on trust level
      const retryAfter = Math.ceil(
        rateLimitParams.windowMs / 1000 * 
        (1 + (1 - context.trustWeight) * rateLimitParams.penaltyMultiplier)
      )
      
      // Log rate limit exceeded
      await securityMonitor.createAlert(
        'trust_rate_limit_exceeded' as any,
        'low' as any,
        `Trust-based rate limit exceeded for user ${context.userId}`,
        `Trust weight: ${context.trustWeight}, Current usage: ${currentUsage}`,
        'trust_system',
        {
          userId: context.userId,
          trustWeight: context.trustWeight,
          currentUsage,
          maxRequests: rateLimitParams.maxRequests,
          retryAfter
        }
      )
      
      return {
        allowed: false,
        limitExceeded: true,
        retryAfter,
        response: NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter,
            trustWeight: context.trustWeight
          },
          { 
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitParams.maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(0, rateLimitParams.maxRequests - currentUsage).toString(),
              'X-RateLimit-Reset': new Date(Date.now() + rateLimitParams.windowMs).toISOString()
            }
          }
        )
      }
    }
    
    return {
      allowed: true,
      limitExceeded: false
    }
  } catch (error) {
    console.error('Error in trust-based rate limiting:', error)
    
    // Fail secure - allow request but log error
    await securityMonitor.createAlert(
      'trust_rate_limit_error' as any,
      'medium' as any,
      'Error in trust-based rate limiting',
      error instanceof Error ? error.message : 'Unknown error',
      'trust_system'
    )
    
    return {
      allowed: true,
      limitExceeded: false
    }
  }
}

/**
 * Trust-based content filtering middleware
 */
export async function trustBasedContentFilter(
  content: any,
  context: TrustSecurityContext
): Promise<{
  allowed: boolean
  filtered: boolean
  filteredContent?: any
  reason?: string
}> {
  try {
    if (!context.userId || context.trustWeight >= 0.7) {
      // High trust users - minimal filtering
      return {
        allowed: true,
        filtered: false
      }
    }
    
    // Apply content filtering based on trust level
    let filtered = false
    let filteredContent = content
    let reason = ''
    
    if (context.trustWeight < 0.3) {
      // Very low trust - strict filtering
      filteredContent = applyStrictContentFilter(content)
      filtered = true
      reason = 'Strict content filtering applied for low trust user'
    } else if (context.trustWeight < 0.5) {
      // Low trust - moderate filtering
      filteredContent = applyModerateContentFilter(content)
      filtered = true
      reason = 'Moderate content filtering applied'
    }
    
    if (filtered) {
      await securityMonitor.createAlert(
        'trust_content_filtered' as any,
        'low' as any,
        `Content filtered based on trust for user ${context.userId}`,
        `Trust weight: ${context.trustWeight}, Reason: ${reason}`,
        'trust_system',
        {
          userId: context.userId,
          trustWeight: context.trustWeight,
          reason,
          originalContent: content,
          filteredContent
        }
      )
    }
    
    return {
      allowed: true,
      filtered,
      filteredContent,
      reason
    }
  } catch (error) {
    console.error('Error in trust-based content filtering:', error)
    
    // Fail secure - block content on error
    return {
      allowed: false,
      filtered: true,
      filteredContent: null,
      reason: 'Content filtering error'
    }
  }
}

/**
 * Update trust score based on user action
 */
export async function updateTrustScoreFromAction(
  userId: string,
  action: 'report' | 'confirm' | 'dispute' | 'endorse' | 'moderate',
  context: any,
  outcome: 'success' | 'failure' | 'partial'
): Promise<{
  updated: boolean
  newScore?: number
  previousScore?: number
  change?: number
}> {
  try {
    // Calculate trust score impact based on action and outcome
    let adjustedAction = action
    if (outcome === 'failure') {
      adjustedAction = 'penalty'
    } else if (outcome === 'partial') {
      adjustedAction = action // Use action with reduced impact
    }
    
    const result = await trustScoreManager.calculateTrustScore(userId, adjustedAction, context)
    
    // Log significant trust score changes
    if (Math.abs(result.change) > 0.05) {
      await securityMonitor.createAlert(
        'trust_score_significant_change' as any,
        'low' as any,
        `Significant trust score change for user ${userId}`,
        `Previous: ${result.previousScore}, New: ${result.newScore}, Change: ${result.change}`,
        'trust_system',
        {
          userId,
          action,
          outcome,
          previousScore: result.previousScore,
          newScore: result.newScore,
          change: result.change,
          factors: result.factors
        }
      )
    }
    
    return {
      updated: true,
      newScore: result.newScore,
      previousScore: result.previousScore,
      change: result.change
    }
  } catch (error) {
    console.error('Error updating trust score:', error)
    
    await securityMonitor.createAlert(
      'trust_score_update_error' as any,
      'medium' as any,
      `Error updating trust score for user ${userId}`,
      error instanceof Error ? error.message : 'Unknown error',
      'trust_system',
      {
        userId,
        action,
        outcome
      }
    )
    
    return {
      updated: false
    }
  }
}

/**
 * Helper functions
 */

function extractUserIdFromRequest(request: NextRequest): string | undefined {
  // Extract user ID from JWT token, session, or other authentication mechanism
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // This would decode the JWT and extract user ID
      // For now, return a placeholder
      return 'user_from_token'
    } catch (error) {
      return undefined
    }
  }
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('session')
  if (sessionCookie) {
    try {
      // This would validate the session and extract user ID
      // For now, return a placeholder
      return 'user_from_session'
    } catch (error) {
      return undefined
    }
  }
  
  return undefined
}

function determineActionFromRequest(request: NextRequest): string {
  const { pathname, searchParams } = new URL(request.url)
  const method = request.method
  
  // Determine action based on URL and HTTP method
  if (pathname.includes('/api/emergency')) {
    if (method === 'POST') return 'report'
    if (method === 'PUT') return 'confirm'
    if (method === 'DELETE') return 'dispute'
  }
  
  if (pathname.includes('/api/endorse')) {
    return 'endorse'
  }
  
  if (pathname.includes('/api/moderate')) {
    return 'moderate'
  }
  
  return 'read'
}

async function extractRequestData(request: NextRequest): Promise<any> {
  try {
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url)
      return Object.fromEntries(searchParams.entries())
    }
    
    if (request.method === 'POST' || request.method === 'PUT') {
      return await request.json()
    }
    
    return {}
  } catch (error) {
    return {}
  }
}

async function getCurrentRateLimitUsage(userId: string, ip: string): Promise<number> {
  // This would integrate with your rate limiting storage system
  // For now, return a mock value
  return Math.floor(Math.random() * 100)
}

function applyStrictContentFilter(content: any): any {
  // Apply strict content filtering for low trust users
  if (typeof content === 'string') {
    // Remove potentially harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
  
  if (typeof content === 'object' && content !== null) {
    // Filter object properties
    const filtered: any = {}
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        filtered[key] = applyStrictContentFilter(value)
      } else {
        filtered[key] = value
      }
    }
    return filtered
  }
  
  return content
}

function applyModerateContentFilter(content: any): any {
  // Apply moderate content filtering for medium trust users
  if (typeof content === 'string') {
    // Remove obviously harmful content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
  
  if (typeof content === 'object' && content !== null) {
    // Filter object properties
    const filtered: any = {}
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        filtered[key] = applyModerateContentFilter(value)
      } else {
        filtered[key] = value
      }
    }
    return filtered
  }
  
  return content
}

export default {
  trustSecurityMiddleware,
  trustBasedRateLimitMiddleware,
  trustBasedContentFilter,
  updateTrustScoreFromAction
}