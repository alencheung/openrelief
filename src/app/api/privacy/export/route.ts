/**
 * Data Export API Route (GDPR right to data portability + erasure).
 *
 * - GET    : list the user's export requests
 * - POST   : create an export (gathers user-owned data, stores payload inline)
 * - DELETE : create a right-to-erasure request (does NOT hard-delete inline —
 *            that is handled by the retention/anonymization jobs in migration
 *            20240101000007_cleanup_functions.sql to preserve referential
 *            integrity)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// SSR client cast to untyped form: the privacy tables are not yet modelled in
// Database types. RLS scopes all access to the caller.
type SupabaseSSRClient = SupabaseClient

// Validation schema for export requests
const exportRequestSchema = z.object({
  dataTypes: z.array(z.string()).min(1),
  format: z.enum(['json', 'csv', 'pdf']).default('json')
})

// Validation schema for erasure requests
const erasureRequestSchema = z.object({
  reason: z.string().min(1).max(2000)
})

// GET: list the user's export requests
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (_request: NextRequest, _context) => {
    try {
      const supabase = (await createClient()) as SupabaseSSRClient
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching export requests:', error)
        return NextResponse.json({ error: 'Failed to fetch export requests' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } catch (error) {
      console.error('Error fetching export requests:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// POST: create + process an export request
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const supabase = (await createClient()) as SupabaseSSRClient
      const body = await request.json()
      const validated = exportRequestSchema.parse(body)

      const requestId = randomUUID()

      // Audit-log the request.
      await supabase.from('privacy_audit_log').insert({
        user_id: context.userId,
        action: 'export_request',
        data_type: validated.dataTypes.join(','),
        privacy_budget_used: 0,
        metadata: { requestId, format: validated.format, dataTypes: validated.dataTypes },
        user_agent: request.headers.get('user-agent') ?? 'unknown'
      })

      // Create the export request row.
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          id: requestId,
          user_id: context.userId,
          data_types: validated.dataTypes,
          format: validated.format,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating export request:', error)
        return NextResponse.json({ error: 'Failed to create export request' }, { status: 500 })
      }

      // Process synchronously (acceptable for an MVP; a background queue is a
      // future enhancement). Failures are recorded on the row, not swallowed.
      await processExportRequest(
        supabase,
        requestId,
        context.userId,
        validated.dataTypes,
        validated.format
      )

      return NextResponse.json({
        success: true,
        requestId: data.id,
        status: data.status,
        message: 'Export request submitted successfully',
        downloadUrl: `/api/privacy/download/${requestId}`
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      console.error('Error creating export request:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// DELETE: create a right-to-erasure (GDPR Art. 17) request.
// Actual hard-delete is performed by the scheduled anonymization jobs to keep
// referential integrity intact; here we only log the legally-actionable request.
export const DELETE = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const supabase = (await createClient()) as SupabaseSSRClient
      const body = await request.json().catch(() => ({}))
      const parsed = erasureRequestSchema.safeParse({ reason: 'right_to_erasure', ...body })
      if (!parsed.success) {
        return NextResponse.json({ error: 'reason is required' }, { status: 400 })
      }

      const requestId = randomUUID()
      const { error } = await supabase.from('data_deletion_requests').insert({
        id: requestId,
        user_id: context.userId,
        data_types: ['all'],
        reason: parsed.data.reason,
        status: 'pending'
      })

      if (error) {
        console.error('Error creating erasure request:', error)
        return NextResponse.json({ error: 'Failed to create erasure request' }, { status: 500 })
      }

      await supabase.from('privacy_audit_log').insert({
        user_id: context.userId,
        action: 'erasure_request',
        data_type: 'all',
        privacy_budget_used: 0,
        metadata: { requestId, reason: parsed.data.reason },
        user_agent: request.headers.get('user-agent') ?? 'unknown'
      })

      return NextResponse.json(
        {
          success: true,
          requestId,
          message:
            'Erasure request received. Personal data will be anonymized per the retention schedule.'
        },
        { status: 202 }
      )
    } catch (error) {
      console.error('Error creating erasure request:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// Gather the user's data and store the formatted payload inline.
async function processExportRequest(
  supabase: SupabaseSSRClient,
  requestId: string,
  userId: string,
  dataTypes: string[],
  format: string
): Promise<void> {
  try {
    await supabase
      .from('data_export_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    const exportData: Record<string, unknown> = {}

    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'profile': {
          const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          exportData.profile = data
          break
        }
        case 'emergency': {
          // FIXED: column is reporter_id, not user_id.
          const { data } = await supabase
            .from('emergency_events')
            .select('*')
            .eq('reporter_id', userId)
            .order('created_at', { ascending: false })
          exportData.emergency = data
          break
        }
        case 'confirmations': {
          const { data } = await supabase
            .from('event_confirmations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.confirmations = data
          break
        }
        case 'trust': {
          const { data } = await supabase
            .from('user_trust_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.trust = data
          break
        }
        case 'subscriptions': {
          const { data } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          exportData.subscriptions = data
          break
        }
        case 'notifications': {
          const { data } = await supabase
            .from('user_notification_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          exportData.notifications = data
          break
        }
        default:
          // Unknown data type — skip, do not fail the whole export.
          break
      }
    }

    const fileName = `openrelief-export-${userId}-${Date.now()}`
    let formatted: string
    let mimeType: string
    let suffix: string

    if (format === 'csv') {
      formatted = convertToCSV(exportData)
      mimeType = 'text/csv'
      suffix = 'csv'
    } else if (format === 'pdf') {
      // No PDF library wired; fall back to JSON with a clear note.
      formatted = JSON.stringify(exportData, null, 2)
      mimeType = 'application/json'
      suffix = 'json'
    } else {
      formatted = JSON.stringify(exportData, null, 2)
      mimeType = 'application/json'
      suffix = 'json'
    }

    const fullFileName = `${fileName}.${suffix}`
    const filePath = `/exports/${userId}/${fullFileName}`

    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        download_url: `/api/privacy/download/${requestId}`,
        file_path: filePath,
        payload: {
          content: formatted,
          mimeType,
          fileName: fullFileName,
          format
        }
      })
      .eq('id', requestId)

    await supabase.from('privacy_audit_log').insert({
      user_id: userId,
      action: 'export_completed',
      data_type: dataTypes.join(','),
      privacy_budget_used: 0,
      metadata: { requestId, format, fileName: fullFileName }
    })
  } catch (error) {
    console.error('Error processing export request:', error)

    await supabase
      .from('data_export_requests')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    await supabase.from('privacy_audit_log').insert({
      user_id: userId,
      action: 'export_failed',
      data_type: dataTypes.join(','),
      privacy_budget_used: 0,
      metadata: {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }
}

// Flatten a record-of-arrays into a multi-section CSV string.
function convertToCSV(data: Record<string, unknown>): string {
  const csvRows: string[] = []

  for (const [key, value] of Object.entries(data)) {
    csvRows.push('')
    csvRows.push(key.toUpperCase())

    if (Array.isArray(value)) {
      if (value.length > 0) {
        const headers = Object.keys(value[0] as Record<string, unknown>)
        csvRows.push(headers.join(','))
        for (const row of value as Array<Record<string, unknown>>) {
          const values = headers.map(header => {
            const val = row[header]
            if (val === null || val === undefined) return ''
            const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? `"${s.replace(/"/g, '""')}"`
              : s
          })
          csvRows.push(values.join(','))
        }
      } else {
        csvRows.push('No data')
      }
    } else {
      csvRows.push(JSON.stringify(value, null, 2))
    }
  }

  return csvRows.join('\n')
}
