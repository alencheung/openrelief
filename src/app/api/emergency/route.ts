/**
 * API Route for Emergency Management
 *
 * This route handles emergency event operations including
 * creation, updates, confirmation, and consensus building.
 * Enhanced with comprehensive security protections.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator, VALIDATION_SCHEMAS } from '@/lib/security/input-validation'
import { sybilPreventionEngine } from '@/lib/security/sybil-prevention'
import {
  securityMonitor,
  SecurityIncidentType,
  IncidentSeverity
} from '@/lib/audit/security-monitor'
import { updateTrustScoreFromAction } from '@/lib/security/trust-integration'
import {
  cacheResponse,
  generateCacheKey,
  getCacheHeaders,
  invalidateEmergencyCache,
  checkETagMatch,
  CACHE_CONFIGS
} from '@/lib/cache/api-cache'

// Build-safe Supabase client: returns a real client when env vars are present,
// otherwise a minimal stub so module-load during the Next.js build page-data
// collection doesn't throw "supabaseUrl is required".
function safeCreateClient(url?: string, key?: string, opts?: any): import('@supabase/supabase-js').SupabaseClient {
  // In test mode, use the mock client from @/lib/supabase (which tests
  // override via jest.mock). This lets test mocks control query results.
  if (process.env.NODE_ENV === 'test') {
    try {
      const { supabase } = require('@/lib/supabase')
      return supabase as any
    } catch {
      // fall through to stub
    }
  }
  if (url && key) {
    return createClient(url, key, opts)
  }
  const noop = () => chain
    const chain = {
      select: noop, insert: noop, update: noop, upsert: noop, delete: noop,
      eq: noop, neq: noop, in: noop, gte: noop, lte: noop, gt: noop, lt: noop,
      like: noop, ilike: noop, contains: noop, not: noop, is: noop, or: noop,
      filter: noop, order: noop, limit: noop, range: noop, single: noop,
      maybeSingle: noop, then: (resolve: any) => resolve({ data: [], error: null })
    }
  return { from: () => chain, auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as any
}


// Lazy Supabase client — re-evaluated on each access so test mocks that
// reset between tests always get the current mock instance.
let _supabase: any = null
function getSupabase() {
  if (process.env.NODE_ENV === 'test') {
    try { return require('@/lib/supabase').supabase } catch {}
  }
  if (!_supabase) {
    _supabase = safeCreateClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return _supabase
}

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  _context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const {
      status,
      type_id,
      limit = '50',
      offset = '0',
      radius,
      center_lat,
      center_lng
    } = Object.fromEntries(searchParams.entries())

    const validationResult = inputValidator.validateAndSanitizeObject(
      { status, type_id, limit, offset, radius, center_lat, center_lng },
      {
        status: [
          {
            name: 'status',
            type: 'string',
            allowedValues: ['pending', 'active', 'resolved', 'closed']
          }
        ],
        type_id: [{ name: 'type_id', type: 'number', min: 1 }],
        limit: [{ name: 'limit', type: 'number', min: 1, max: 100 }],
        offset: [{ name: 'offset', type: 'number', min: 0 }],
        radius: [{ name: 'radius', type: 'number', min: 100, max: 50000 }],
        center_lat: [{ name: 'center_lat', type: 'number', min: -90, max: 90 }],
        center_lng: [{ name: 'center_lng', type: 'number', min: -180, max: 180 }]
      }
    )

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.errors,
          securityFlags: validationResult.securityFlags.map(f => f.type)
        },
        { status: 400 }
      )
    }

    const sanitizedData = validationResult.sanitizedData as {
      status?: string
      type_id?: string
      limit?: string
      offset?: string
      radius?: string
      center_lat?: string
      center_lng?: string
      title?: string
      description?: string
      severity?: string
      type?: string
      latitude?: string
      longitude?: string
      location_accuracy?: string
      [key: string]: string | undefined
    }

    const cacheKey = generateCacheKey('emergency', {
      status: sanitizedData.status,
      type_id: sanitizedData.type_id,
      limit: sanitizedData.limit,
      offset: sanitizedData.offset,
      radius: sanitizedData.radius,
      center_lat: sanitizedData.center_lat,
      center_lng: sanitizedData.center_lng
    })

    const ifNoneMatch = request.headers.get('If-None-Match')

    const { data, cached, etag } = await cacheResponse(
      cacheKey,
      async () => {
        let query = getSupabase()
          .from('emergency_events')
          .select(
            `
            *,
            emergency_types (*),
            reporter: user_profiles (
              user_id,
              trust_score
            )
          `
          )
          .order('created_at', { ascending: false })

        if (sanitizedData.status) {
          query = query.in('status', sanitizedData.status.split(','))
        }

        if (sanitizedData.type_id) {
          query = query.eq('type_id', parseInt(sanitizedData.type_id, 10))
        }

        let nearbyEventIds: string[] | null = null

        if (sanitizedData.radius && sanitizedData.center_lat && sanitizedData.center_lng) {
          const radiusMeters = parseFloat(sanitizedData.radius)
          const centerLat = parseFloat(sanitizedData.center_lat)
          const centerLng = parseFloat(sanitizedData.center_lng)

          // Call RPC separately to get nearby event IDs
          const { data: nearbyEvents, error: rpcError } = await getSupabase().rpc(
            'nearby_emergency_events',
            {
              center_lat: centerLat,
              center_lng: centerLng,
              radius_meters: radiusMeters
            }
          )

          if (rpcError) {
            throw rpcError
          }

          if (nearbyEvents && Array.isArray(nearbyEvents)) {
            nearbyEventIds = nearbyEvents.map((e: { id: string }) => e.id)
            if (nearbyEventIds.length === 0) {
              // No nearby events found, return empty result early
              return {
                data: [],
                pagination: {
                  total: 0,
                  limit: parseInt(sanitizedData.limit, 10),
                  offset: parseInt(sanitizedData.offset, 10),
                  hasMore: false
                }
              }
            }
            query = query.in('id', nearbyEventIds)
          }
        }

        if (sanitizedData.limit) {
          query = query.limit(parseInt(sanitizedData.limit, 10))
        }

        if (sanitizedData.offset) {
          query = query.range(
            parseInt(sanitizedData.offset, 10),
            parseInt(sanitizedData.offset, 10) + parseInt(sanitizedData.limit, 10) - 1
          )
        }

        const { data, error, count } = await query

        if (error) {
          throw error
        }

        return {
          data,
          pagination: {
            total: count || 0,
            limit: parseInt(sanitizedData.limit, 10),
            offset: parseInt(sanitizedData.offset, 10),
            hasMore:
              (count || 0) > parseInt(sanitizedData.offset, 10) + parseInt(sanitizedData.limit, 10)
          }
        }
      },
      CACHE_CONFIGS.emergency
    )

    if (checkETagMatch(ifNoneMatch, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: getCacheHeaders(CACHE_CONFIGS.emergency, etag)
      })
    }

    return NextResponse.json(data, {
      headers: {
        ...getCacheHeaders(CACHE_CONFIGS.emergency, etag),
        'X-Cache-Status': cached ? 'HIT' : 'MISS'
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching emergency events:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await securityMonitor.createAlert(
      SecurityIncidentType.DATABASE_ERROR,
      IncidentSeverity.MEDIUM,
      'Database error in emergency events fetch',
      `Error: ${errorMessage}`,
      'api_security'
    )

    return NextResponse.json(
      { error: 'Failed to fetch emergency events', details: errorMessage },
      { status: 500 }
    )
  }
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.emergency)(async (
  request: NextRequest,
  context
) => {
  try {
    const body = await request.json()

    // Validate and sanitize input
    const validationResult = inputValidator.validateAndSanitizeObject(
      body,
      VALIDATION_SCHEMAS.emergencyReport
    )

    if (!validationResult.isValid) {
      await securityMonitor.createAlert(
        SecurityIncidentType.MALICIOUS_ACTIVITY,
        IncidentSeverity.MEDIUM,
        'Invalid input in emergency event creation',
        `Security flags: ${validationResult.securityFlags.map(f => f.type).join(', ')}`,
        'api_security',
        {
          ...(context.userId ? { userId: context.userId } : {}),
          ipAddress: context.ipAddress,
          metadata: {
            errors: validationResult.errors,
            securityFlags: validationResult.securityFlags
          }
        }
      )

      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validationResult.errors,
          securityFlags: validationResult.securityFlags.map(f => f.type)
        },
        { status: 400 }
      )
    }

    const sanitizedData = validationResult.sanitizedData as {
      type_id?: string
      title?: string
      description?: string
      severity?: string
      trust_weight?: number
      location?: { latitude: number; longitude: number; address?: string }
      metadata?: Record<string, unknown>
      [key: string]: unknown
    }

    // Use the authenticated caller as the reporter ??never trust a reporter_id
    // supplied in the request body (that allowed impersonation). The emergency
    // security config requires auth, so context.userId is guaranteed present.
    const reporterId = context.userId
    if (!reporterId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get reporter's trust score
    const { data: reporter, error: reporterError } = await getSupabase()
      .from('user_profiles')
      .select('trust_score')
      .eq('user_id', reporterId)
      .maybeSingle()

    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    // Check for Sybil attack patterns
    if (context.userId) {
      const userRisk = sybilPreventionEngine.getUserRiskAssessment(context.userId)
      if (userRisk.riskLevel === 'high' || userRisk.riskLevel === 'critical') {
        await securityMonitor.createAlert(
          SecurityIncidentType.MALICIOUS_ACTIVITY,
          IncidentSeverity.HIGH,
          `High-risk user ${context.userId} attempted emergency event creation`,
          `Risk score: ${userRisk.riskScore}, Flags: ${userRisk.flags.length}`,
          'sybil_prevention'
        )

        return NextResponse.json({ error: 'Additional verification required' }, { status: 401 })
      }
    }

    // Calculate trust weight if not provided
    const calculatedTrustWeight = sanitizedData.trust_weight || reporter.trust_score || 0.5

    // Create emergency event. reporter_id comes from the authenticated
    // session (context.userId), not the request body, to prevent impersonation.
    // The schema column is `reporter_id`; the earlier code wrote a non-existent
    // `reported_by` column. severity is clamped to the schema's 1-5 range.
    const { data, error } = await getSupabase()
      .from('emergency_events')
      .insert({
        type_id: parseInt(sanitizedData.type_id, 10),
        title: sanitizedData.title.trim(),
        description: sanitizedData.description.trim(),
        location: `POINT(${sanitizedData.location.longitude} ${sanitizedData.location.latitude})`,
        location_address: sanitizedData.location.address,
        severity: Math.min(Math.max(Number(sanitizedData.severity) || 3, 1), 5),
        reporter_id: reporterId,
        status: 'pending',
        trust_weight: calculatedTrustWeight,
        metadata: sanitizedData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select(
        `
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .single()

    if (error) {
      console.error('Error creating emergency event:', error)
      await securityMonitor.createAlert(
        SecurityIncidentType.DATABASE_ERROR,
        IncidentSeverity.MEDIUM,
        'Database error in emergency event creation',
        `Error: ${error.message}`,
        'api_security',
        {
          userId: context.userId ?? 'unknown'
        }
      )

      return NextResponse.json(
        { error: 'Failed to create emergency event', details: error.message },
        { status: 500 }
      )
    }

    // Trigger consensus building if trust weight is sufficient
    if (calculatedTrustWeight >= 0.3) {
      // This would typically be handled by a background job
      // For now, we'll initiate immediate consensus check
      await getSupabase().rpc('initiate_consensus_check', {
        event_id: data.id
      })
    }

    // Update trust score for successful emergency report
    if (context.userId) {
      try {
        await updateTrustScoreFromAction(context.userId, 'report', {
          eventId: data.id,
          severity: sanitizedData.severity,
          trustWeight: calculatedTrustWeight,
          timestamp: new Date().toISOString()
        })
      } catch (trustError) {
        console.error('Error updating trust score:', trustError)
        // Don't fail the request if trust score update fails
      }
    }

    return NextResponse.json(
      {
        data,
        message: 'Emergency event created successfully',
        trustWeight: calculatedTrustWeight
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/emergency:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await securityMonitor.createAlert(
      SecurityIncidentType.SYSTEM_ERROR,
      IncidentSeverity.HIGH,
      'Unexpected error in emergency event creation',
      `Error: ${errorMessage}`,
      'api_security'
    )

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await invalidateEmergencyCache().catch(() => {})
  }
})

export const PUT = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, severity, metadata, final_report, resolved_at } = body

    // Validate input
    const validationResult = inputValidator.validateAndSanitizeObject(
      { status, severity, metadata, final_report, resolved_at },
      {
        status: [
          {
            name: 'status',
            type: 'string',
            allowedValues: ['pending', 'active', 'resolved', 'closed']
          }
        ],
        severity: [
          { name: 'severity', type: 'string', allowedValues: ['low', 'medium', 'high', 'critical'] }
        ],
        metadata: [{ name: 'metadata', type: 'object' }],
        final_report: [{ name: 'final_report', type: 'string', maxLength: 5000 }],
        resolved_at: [{ name: 'resolved_at', type: 'string' }]
      }
    )

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validationResult.errors,
          securityFlags: validationResult.securityFlags.map(f => f.type)
        },
        { status: 400 }
      )
    }

    const sanitizedData = validationResult.sanitizedData as Record<string, unknown>

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (sanitizedData.status) {
      updates.status = sanitizedData.status
    }
    if (sanitizedData.severity) {
      updates.severity = sanitizedData.severity
    }
    if (sanitizedData.metadata) {
      updates.metadata = sanitizedData.metadata
    }
    if (sanitizedData.final_report) {
      updates.final_report = sanitizedData.final_report
    }
    if (sanitizedData.resolved_at) {
      updates.resolved_at = sanitizedData.resolved_at
    }

    // Add expiration for resolved events
    if (sanitizedData.status === 'resolved') {
      updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Ownership check: only the reporter (or an admin/moderator) may update.
    // The route uses the service-role client (RLS is bypassed), so this
    // in-handler check is the actual authorization boundary.
    const { data: existingEvent } = await getSupabase()
      .from('emergency_events')
      .select('reporter_id')
      .eq('id', eventId)
      .maybeSingle()

    const reporterId = (existingEvent as { reporter_id?: string } | null)?.reporter_id
    const isAdmin =
      context.role === 'admin' ||
      context.role === 'moderator' ||
      (context.permissions ?? []).some(p => p === 'admin' || p === 'moderator')
    if (reporterId && reporterId !== context.userId && !isAdmin) {
      await securityMonitor.createAlert(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        IncidentSeverity.MEDIUM,
        'Non-owner attempted to update emergency event',
        `User ${context.userId} attempted to update event ${eventId} owned by ${reporterId}`,
        'api_security'
      )
      return NextResponse.json(
        { error: 'Only the reporter or a moderator may update this event' },
        { status: 403 }
      )
    }

    const { data, error } = await getSupabase()
      .from('emergency_events')
      .update(updates)
      .eq('id', eventId)
      .select(
        `
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .single()

    if (error) {
      console.error('Error updating emergency event:', error)
      await securityMonitor.createAlert(
        SecurityIncidentType.DATABASE_ERROR,
        IncidentSeverity.MEDIUM,
        'Database error in emergency event update',
        `Error: ${error.message}`,
        'api_security',
        {
          userId: context.userId ?? 'unknown',
          eventId
        } as any
      )

      return NextResponse.json(
        { error: 'Failed to update emergency event', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Emergency event not found' }, { status: 404 })
    }

    return NextResponse.json({
      data,
      message: 'Emergency event updated successfully'
    })
  } catch (error: unknown) {
    console.error('Unexpected error in PUT /api/emergency:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await securityMonitor.createAlert(
      SecurityIncidentType.SYSTEM_ERROR,
      IncidentSeverity.HIGH,
      'Unexpected error in emergency event update',
      `Error: ${errorMessage}`,
      'api_security'
    )

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await invalidateEmergencyCache().catch(() => {})
  }
})

export const DELETE = withAPISecurity(API_SECURITY_CONFIGS.user)(async (
  request: NextRequest,
  context
) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Check if event can be deleted (only resolved/closed events) and load
    // the reporter for the ownership check.
    const { data: event, error: fetchError } = await getSupabase()
      .from('emergency_events')
      .select('status, reporter_id')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Emergency event not found' }, { status: 404 })
    }

    // Ownership check: only the reporter (or an admin/moderator) may delete.
    const reporterId = (event as { reporter_id?: string }).reporter_id
    const isAdmin =
      context.role === 'admin' ||
      context.role === 'moderator' ||
      (context.permissions ?? []).some(p => p === 'admin' || p === 'moderator')
    if (reporterId && reporterId !== context.userId && !isAdmin) {
      await securityMonitor.createAlert(
        SecurityIncidentType.UNAUTHORIZED_ACCESS,
        IncidentSeverity.MEDIUM,
        'Non-owner attempted to delete emergency event',
        `User ${context.userId} attempted to delete event ${eventId} owned by ${reporterId}`,
        'api_security'
      )
      return NextResponse.json(
        { error: 'Only the reporter or a moderator may delete this event' },
        { status: 403 }
      )
    }

    if (!['resolved', 'closed'].includes(event.status)) {
      return NextResponse.json(
        { error: 'Only resolved or closed events can be deleted' },
        { status: 400 }
      )
    }

    // Archive event before deletion
    const { error: archiveError } = await getSupabase().from('emergency_events_archive').insert({
      ...event,
      archived_at: new Date().toISOString(),
      deleted_by: context.userId
    })

    if (archiveError) {
      console.error('Error archiving emergency event:', archiveError)
      await securityMonitor.createAlert(
        SecurityIncidentType.DATABASE_ERROR,
        IncidentSeverity.MEDIUM,
        'Database error in emergency event archival',
        `Error: ${archiveError.message}`,
        'api_security',
        {
          userId: context.userId ?? 'unknown',
          eventId
        } as any
      )

      return NextResponse.json({ error: 'Failed to archive emergency event' }, { status: 500 })
    }

    // Delete event
    const { error: deleteError } = await getSupabase()
      .from('emergency_events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting emergency event:', deleteError)
      await securityMonitor.createAlert(
        SecurityIncidentType.DATABASE_ERROR,
        IncidentSeverity.MEDIUM,
        'Database error in emergency event deletion',
        `Error: ${deleteError.message}`,
        'api_security',
        {
          userId: context.userId ?? 'unknown',
          eventId
        } as any
      )

      return NextResponse.json({ error: 'Failed to delete emergency event' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Emergency event deleted successfully'
    })
  } catch (error: unknown) {
    console.error('Unexpected error in DELETE /api/emergency:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await securityMonitor.createAlert(
      SecurityIncidentType.SYSTEM_ERROR,
      IncidentSeverity.HIGH,
      'Unexpected error in emergency event deletion',
      `Error: ${errorMessage}`,
      'api_security'
    )

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await invalidateEmergencyCache().catch(() => {})
  }
})
