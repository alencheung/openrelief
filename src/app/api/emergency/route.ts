/**
 * API Route for Emergency Management
 *
 * This route handles emergency event operations including
 * creation, updates, confirmation, and consensus building.
 * Enhanced with comprehensive security protections.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import { inputValidator, VALIDATION_SCHEMAS } from '@/lib/security/input-validation'
import { sybilPreventionEngine } from '@/lib/security/sybil-prevention'
import { securityMonitor } from '@/lib/audit/security-monitor'
import { trustScoreManager, updateTrustScoreFromAction } from '@/lib/security/trust-integration'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const {
      status,
      type_id,
      limit = '50',
      offset = '0',
      radius,
      center_lat,
      center_lng,
    } = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const validationResult = inputValidator.validateAndSanitizeObject(
      { status, type_id, limit, offset, radius, center_lat, center_lng },
      {
        status: [
          { name: 'status', type: 'string', allowedValues: ['pending', 'active', 'resolved', 'closed'] }
        ],
        type_id: [
          { name: 'type_id', type: 'number', min: 1 }
        ],
        limit: [
          { name: 'limit', type: 'number', min: 1, max: 100 }
        ],
        offset: [
          { name: 'offset', type: 'number', min: 0 }
        ],
        radius: [
          { name: 'radius', type: 'number', min: 100, max: 50000 }
        ],
        center_lat: [
          { name: 'center_lat', type: 'number', min: -90, max: 90 }
        ],
        center_lng: [
          { name: 'center_lng', type: 'number', min: -180, max: 180 }
        ]
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

    const sanitizedData = validationResult.sanitizedData

    let query = supabase
      .from('emergency_events')
      .select(`
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (sanitizedData.status) {
      query = query.in('status', sanitizedData.status.split(','))
    }

    if (sanitizedData.type_id) {
      query = query.eq('type_id', parseInt(sanitizedData.type_id))
    }

    // Apply spatial filtering
    if (sanitizedData.radius && sanitizedData.center_lat && sanitizedData.center_lng) {
      const radiusMeters = parseFloat(sanitizedData.radius)
      const centerLat = parseFloat(sanitizedData.center_lat)
      const centerLng = parseFloat(sanitizedData.center_lng)
      
      query = query.rpc('nearby_emergency_events', {
        center_lat: centerLat,
        center_lng: centerLng,
        radius_meters: radiusMeters,
      })
    }

    // Apply pagination
    if (sanitizedData.limit) {
      query = query.limit(parseInt(sanitizedData.limit))
    }

    if (sanitizedData.offset) {
      query = query.range(parseInt(sanitizedData.offset), parseInt(sanitizedData.offset) + parseInt(sanitizedData.limit) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching emergency events:', error)
      await securityMonitor.createAlert(
        'database_error' as any,
        'medium' as any,
        'Database error in emergency events fetch',
        `Error: ${error.message}`,
        'api_security'
      )
      
      return NextResponse.json(
        { error: 'Failed to fetch emergency events', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        limit: parseInt(sanitizedData.limit),
        offset: parseInt(sanitizedData.offset),
        hasMore: (count || 0) > parseInt(sanitizedData.offset) + parseInt(sanitizedData.limit),
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/emergency:', error)
    await securityMonitor.createAlert(
      'system_error' as any,
      'high' as any,
      'Unexpected error in emergency events fetch',
      `Error: ${error.message}`,
      'api_security'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const POST = withAPISecurity(API_SECURITY_CONFIGS.emergency)(async (request: NextRequest, context) => {
  try {
    const body = await request.json()
    
    // Validate and sanitize input
    const validationResult = inputValidator.validateAndSanitizeObject(
      body,
      VALIDATION_SCHEMAS.emergencyReport
    )

    if (!validationResult.isValid) {
      await securityMonitor.createAlert(
        'malicious_activity' as any,
        'medium' as any,
        'Invalid input in emergency event creation',
        `Security flags: ${validationResult.securityFlags.map(f => f.type).join(', ')}`,
        'api_security',
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          errors: validationResult.errors,
          securityFlags: validationResult.securityFlags
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

    const sanitizedData = validationResult.sanitizedData

    // Get reporter's trust score
    const { data: reporter, error: reporterError } = await supabase
      .from('user_profiles')
      .select('trust_score')
      .eq('user_id', sanitizedData.reporter_id)
      .single()

    if (reporterError || !reporter) {
      return NextResponse.json(
        { error: 'Reporter not found' },
        { status: 404 }
      )
    }

    // Check for Sybil attack patterns
    if (context.userId) {
      const userRisk = sybilPreventionEngine.getUserRiskAssessment(context.userId)
      if (userRisk.riskLevel === 'high' || userRisk.riskLevel === 'critical') {
        await securityMonitor.createAlert(
          'malicious_activity' as any,
          'high' as any,
          `High-risk user ${context.userId} attempted emergency event creation`,
          `Risk score: ${userRisk.riskScore}, Flags: ${userRisk.flags.length}`,
          'sybil_prevention'
        )
        
        return NextResponse.json(
          { error: 'Additional verification required' },
          { status: 401 }
        )
      }
    }

    // Calculate trust weight if not provided
    const calculatedTrustWeight = sanitizedData.trust_weight || reporter.trust_score || 0.5

    // Create emergency event
    const { data, error } = await supabase
      .from('emergency_events')
      .insert({
        type_id: parseInt(sanitizedData.type_id),
        title: sanitizedData.title.trim(),
        description: sanitizedData.description.trim(),
        location: `POINT(${sanitizedData.location.longitude} ${sanitizedData.location.latitude})`,
        location_address: sanitizedData.location.address,
        severity: sanitizedData.severity || 'medium',
        reported_by: sanitizedData.reporter_id,
        status: 'pending',
        trust_weight: calculatedTrustWeight,
        metadata: sanitizedData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select(`
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `)
      .single()

    if (error) {
      console.error('Error creating emergency event:', error)
      await securityMonitor.createAlert(
        'database_error' as any,
        'medium' as any,
        'Database error in emergency event creation',
        `Error: ${error.message}`,
        'api_security',
        {
          userId: context.userId,
          reporterId: sanitizedData.reporter_id
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
      await supabase.rpc('initiate_consensus_check', {
        event_id: data.id,
      })
    }

    // Update trust score for successful emergency report
    if (context.userId) {
      try {
        await updateTrustScoreFromAction(
          context.userId,
          'report',
          {
            eventId: data.id,
            severity: sanitizedData.severity,
            trustWeight: calculatedTrustWeight,
            timestamp: new Date().toISOString()
          },
          'success'
        )
      } catch (trustError) {
        console.error('Error updating trust score:', trustError)
        // Don't fail the request if trust score update fails
      }
    }

    return NextResponse.json({
      data,
      message: 'Emergency event created successfully',
      trustWeight: calculatedTrustWeight,
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/emergency:', error)
    await securityMonitor.createAlert(
      'system_error' as any,
      'high' as any,
      'Unexpected error in emergency event creation',
      `Error: ${error.message}`,
      'api_security'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PUT = withAPISecurity(API_SECURITY_CONFIGS.user)(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      status,
      severity,
      metadata,
      final_report,
      resolved_at,
    } = body

    // Validate input
    const validationResult = inputValidator.validateAndSanitizeObject(
      { status, severity, metadata, final_report, resolved_at },
      {
        status: [
          { name: 'status', type: 'string', allowedValues: ['pending', 'active', 'resolved', 'closed'] }
        ],
        severity: [
          { name: 'severity', type: 'string', allowedValues: ['low', 'medium', 'high', 'critical'] }
        ],
        metadata: [
          { name: 'metadata', type: 'object' }
        ],
        final_report: [
          { name: 'final_report', type: 'string', maxLength: 5000 }
        ],
        resolved_at: [
          { name: 'resolved_at', type: 'string' }
        ]
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

    const sanitizedData = validationResult.sanitizedData

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (sanitizedData.status) updates.status = sanitizedData.status
    if (sanitizedData.severity) updates.severity = sanitizedData.severity
    if (sanitizedData.metadata) updates.metadata = sanitizedData.metadata
    if (sanitizedData.final_report) updates.final_report = sanitizedData.final_report
    if (sanitizedData.resolved_at) updates.resolved_at = sanitizedData.resolved_at

    // Add expiration for resolved events
    if (sanitizedData.status === 'resolved') {
      updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }

    const { data, error } = await supabase
      .from('emergency_events')
      .update(updates)
      .eq('id', eventId)
      .select(`
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `)
      .single()

    if (error) {
      console.error('Error updating emergency event:', error)
      await securityMonitor.createAlert(
        'database_error' as any,
        'medium' as any,
        'Database error in emergency event update',
        `Error: ${error.message}`,
        'api_security',
        {
          userId: context.userId,
          eventId
        }
      )
      
      return NextResponse.json(
        { error: 'Failed to update emergency event', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Emergency event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data,
      message: 'Emergency event updated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/emergency:', error)
    await securityMonitor.createAlert(
      'system_error' as any,
      'high' as any,
      'Unexpected error in emergency event update',
      `Error: ${error.message}`,
      'api_security'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const DELETE = withAPISecurity(API_SECURITY_CONFIGS.user)(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Check if event can be deleted (only resolved/closed events)
    const { data: event, error: fetchError } = await supabase
      .from('emergency_events')
      .select('status')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return NextResponse.json(
        { error: 'Emergency event not found' },
        { status: 404 }
      )
    }

    if (!['resolved', 'closed'].includes(event.status)) {
      return NextResponse.json(
        { error: 'Only resolved or closed events can be deleted' },
        { status: 400 }
      )
    }

    // Archive event before deletion
    const { error: archiveError } = await supabase
      .from('emergency_events_archive')
      .insert({
        ...event,
        archived_at: new Date().toISOString(),
        deleted_by: context.userId,
      })

    if (archiveError) {
      console.error('Error archiving emergency event:', archiveError)
      await securityMonitor.createAlert(
        'database_error' as any,
        'medium' as any,
        'Database error in emergency event archival',
        `Error: ${archiveError.message}`,
        'api_security',
        {
          userId: context.userId,
          eventId
        }
      )
      
      return NextResponse.json(
        { error: 'Failed to archive emergency event' },
        { status: 500 }
      )
    }

    // Delete event
    const { error: deleteError } = await supabase
      .from('emergency_events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting emergency event:', deleteError)
      await securityMonitor.createAlert(
        'database_error' as any,
        'medium' as any,
        'Database error in emergency event deletion',
        `Error: ${deleteError.message}`,
        'api_security',
        {
          userId: context.userId,
          eventId
        }
      )
      
      return NextResponse.json(
        { error: 'Failed to delete emergency event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Emergency event deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/emergency:', error)
    await securityMonitor.createAlert(
      'system_error' as any,
      'high' as any,
      'Unexpected error in emergency event deletion',
      `Error: ${error.message}`,
      'api_security'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})