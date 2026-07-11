/**
 * Data Export Download API Route
 *
 * Serves the stored payload of a completed export request. Auth required; the
 * requester must own the export (enforced via RLS on data_export_requests plus
 * a belt-and-suspenders user_id equality check).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Export id must be a non-empty UUID-like string. We accept the standard UUID
// shape but stay lenient about variant/case so the generated request ids from
// crypto.randomUUID() and any future id scheme keep working.
const exportIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Export id is required')
    .max(100, 'Export id is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Export id contains invalid characters')
})

// SSR client cast to untyped form: data_export_requests is not yet modelled in
// Database types. RLS scopes access to the caller.
type SSRClient = SupabaseClient

interface ExportPayload {
  content: string
  mimeType: string
  fileName: string
  format: string
}

// GET: download a completed export by id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const paramsResult = exportIdParamSchema.safeParse(resolvedParams)
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: paramsResult.error.flatten() },
        { status: 400 }
      )
    }
    const { id } = paramsResult.data
    if (!id) {
      return NextResponse.json({ error: 'Export id is required' }, { status: 400 })
    }

    const supabase = (await createClient()) as SSRClient
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('data_export_requests')
      .select('id, user_id, status, format, payload')
      .eq('id', id)
      .eq('user_id', user.id) // RLS also enforces; belt and suspenders
      .maybeSingle()

    if (error) {
      console.error('Error fetching export for download:', error)
      return NextResponse.json({ error: 'Failed to fetch export' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }
    if (data.status !== 'completed') {
      return NextResponse.json(
        { error: `Export is not ready (status: ${data.status})` },
        { status: 409 }
      )
    }

    const payload = data.payload as ExportPayload | null
    if (!payload || !payload.content) {
      return NextResponse.json({ error: 'Export payload is missing' }, { status: 500 })
    }

    return new NextResponse(payload.content, {
      status: 200,
      headers: {
        'Content-Type': payload.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${payload.fileName || `export-${id}`}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    console.error('Error downloading export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
