/**
 * Data Export API Route
 * 
 * This API endpoint handles user data export requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Validation schema for export requests
const exportRequestSchema = z.object({
  dataTypes: z.array(z.string()).min(1),
  format: z.enum(['json', 'csv', 'pdf']).default('json')
})

// GET: Retrieve export requests
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user's export requests
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching export requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create new export request
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = exportRequestSchema.parse(body)

    // Generate unique request ID
    const requestId = randomUUID()

    // Log export request
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: user.id,
        action: 'export_request',
        data_type: validatedData.dataTypes.join(','),
        privacy_budget_used: 0,
        metadata: {
          requestId,
          format: validatedData.format,
          dataTypes: validatedData.dataTypes
        },
        ip_address: request.ip || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    // Create export request
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        id: requestId,
        user_id: user.id,
        data_types: validatedData.dataTypes,
        format: validatedData.format,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Process export asynchronously (in a real implementation, this would be a background job)
    processExportRequest(supabase, requestId, user.id, validatedData.dataTypes, validatedData.format)

    return NextResponse.json({
      success: true,
      requestId: data.id,
      status: data.status,
      message: 'Export request submitted successfully'
    })
  } catch (error) {
    console.error('Error creating export request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Async function to process export requests
async function processExportRequest(
  supabase: any,
  requestId: string,
  userId: string,
  dataTypes: string[],
  format: string
) {
  try {
    // Update status to processing
    await supabase
      .from('data_export_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    // Gather data based on requested types
    const exportData: any = {}

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'location':
          const { data: locationData } = await supabase
            .from('user_locations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.location = locationData
          break

        case 'emergency':
          const { data: emergencyData } = await supabase
            .from('emergency_events')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.emergency = emergencyData
          break

        case 'trust':
          const { data: trustData } = await supabase
            .from('user_trust_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.trust = trustData
          break

        case 'profile':
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          exportData.profile = profileData
          break
      }
    }

    // Format data based on requested format
    let formattedData: string
    let fileName: string
    let mimeType: string

    switch (format) {
      case 'json':
        formattedData = JSON.stringify(exportData, null, 2)
        fileName = `openrelief-export-${Date.now()}.json`
        mimeType = 'application/json'
        break

      case 'csv':
        // Simplified CSV conversion (in a real implementation, use a proper CSV library)
        formattedData = convertToCSV(exportData)
        fileName = `openrelief-export-${Date.now()}.csv`
        mimeType = 'text/csv'
        break

      case 'pdf':
        // In a real implementation, use a PDF library
        formattedData = JSON.stringify(exportData, null, 2)
        fileName = `openrelief-export-${Date.now()}.pdf`
        mimeType = 'application/pdf'
        break

      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    // Store file (in a real implementation, use a file storage service)
    const filePath = `/exports/${userId}/${fileName}`
    
    // Update request with completion info
    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        download_url: `/api/privacy/download/${requestId}`,
        file_path: filePath
      })
      .eq('id', requestId)

    // Log completion
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: userId,
        action: 'export_completed',
        data_type: dataTypes.join(','),
        privacy_budget_used: 0,
        metadata: {
          requestId,
          format,
          fileName,
          filePath
        }
      })

  } catch (error) {
    console.error('Error processing export request:', error)
    
    // Update request with error status
    await supabase
      .from('data_export_requests')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    // Log error
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: userId,
        action: 'export_failed',
        data_type: dataTypes.join(','),
        privacy_budget_used: 0,
        metadata: {
          requestId,
          error: error.message
        }
      })
  }
}

// Simple CSV conversion function (in a real implementation, use a proper CSV library)
function convertToCSV(data: any): string {
  const csvRows: string[] = []

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      csvRows.push(`\n${key.toUpperCase()}`)
      
      if (value.length > 0) {
        const headers = Object.keys(value[0])
        csvRows.push(headers.join(','))
        
        for (const row of value) {
          const values = headers.map(header => {
            const val = row[header]
            return typeof val === 'string' && val.includes(',') 
              ? `"${val.replace(/"/g, '""')}"` 
              : val
          })
          csvRows.push(values.join(','))
        }
      } else {
        csvRows.push('No data')
      }
    } else {
      csvRows.push(`\n${key.toUpperCase()}`)
      csvRows.push(JSON.stringify(value, null, 2))
    }
  }

  return csvRows.join('\n')
}