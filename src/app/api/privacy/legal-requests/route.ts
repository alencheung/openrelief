/**
 * Legal Requests API Endpoint (user self-service GDPR data-subject rights).
 *
 * Backed by the user_legal_requests table. All access is logged to
 * privacy_audit_log. Uses the RLS-bound SSR client so users can only
 * read/modify their own requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LegalRequest } from '@/hooks/usePrivacy'

// SSR client cast to untyped form: user_legal_requests / privacy_audit_log are
// not yet modelled in Database types. RLS scopes all access to the caller.
type SSRClient = SupabaseClient

const ALLOWED_TYPES = ['data_access', 'deletion', 'correction', 'portability', 'objection'] as const
type RequestType = (typeof ALLOWED_TYPES)[number]

// Service-level deadlines (calendar days) per request type, tighter than the
// 30-day GDPR statutory maximum.
const RESPONSE_DEADLINE_DAYS: Record<RequestType, number> = {
  data_access: 15,
  deletion: 10,
  correction: 10,
  portability: 20,
  objection: 14
}

function generateId(): string {
  return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function rowToRequest(row: Record<string, unknown>): LegalRequest {
  return {
    id: row.id as string,
    type: row.type as LegalRequest['type'],
    status: row.status as LegalRequest['status'],
    title: row.title as string,
    description: row.description as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    responseDeadline: row.response_deadline ? new Date(row.response_deadline as string) : undefined,
    estimatedCompletion: row.estimated_completion
      ? new Date(row.estimated_completion as string)
      : undefined,
    canUserContact: (row.can_user_contact ?? true) as boolean
  }
}

async function logLegalAccess(
  supabase: SSRClient,
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('privacy_audit_log').insert({
    user_id: userId,
    action,
    data_type: 'legal_request',
    privacy_budget_used: 0,
    metadata: metadata ?? null,
    user_agent: 'api_server'
  })
  if (error) {
    console.error('Failed to write privacy_audit_log:', error)
  }
}

async function notifyPrivacyTeam(userId: string, requestId: string, type: string): Promise<void> {
  // TODO: wire to PRIVACY_TEAM_WEBHOOK_URL / notification infra once available.
  if (process.env.PRIVACY_TEAM_WEBHOOK_URL) {
    console.warn(`[privacy-team] New legal request ${requestId} (type=${type}) from ${userId}`)
  } else {
    console.warn(
      `[privacy-team] PRIVACY_TEAM_WEBHOOK_URL not set; legal request ${requestId} queued without team notification`
    )
  }
}

// GET handler - list the user's legal requests
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status')
      const type = searchParams.get('type')
      const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)
      const offset = Number(searchParams.get('offset') ?? '0')

      const supabase = (await createClient()) as SSRClient
      let query = supabase
        .from('user_legal_requests')
        .select('*')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)
      if (type) query = query.eq('type', type)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching legal requests:', error)
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
      }

      await logLegalAccess(supabase, context.userId, 'request_list')

      return NextResponse.json({
        success: true,
        data: { requests: (data ?? []).map(rowToRequest) }
      })
    } catch (error) {
      console.error('Error retrieving legal requests:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// POST handler - create a new legal request
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const body = await request.json()
      const { type, title, description } = body as {
        type?: string
        title?: string
        description?: string
      }

      if (!type || !ALLOWED_TYPES.includes(type as RequestType)) {
        return NextResponse.json(
          { error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (!title || typeof title !== 'string' || title.trim().length < 3 || title.length > 200) {
        return NextResponse.json(
          { error: 'title must be between 3 and 200 characters' },
          { status: 400 }
        )
      }
      if (
        !description ||
        typeof description !== 'string' ||
        description.trim().length < 10 ||
        description.length > 2000
      ) {
        return NextResponse.json(
          { error: 'description must be between 10 and 2000 characters' },
          { status: 400 }
        )
      }

      const requestType = type as RequestType
      const now = new Date()
      const responseDeadline = new Date(
        now.getTime() + RESPONSE_DEADLINE_DAYS[requestType] * 24 * 60 * 60 * 1000
      )
      const estimatedCompletion = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const id = generateId()
      const supabase = (await createClient()) as SSRClient

      // De-duplicate: same type + pending status + same title.
      const { data: existing } = await supabase
        .from('user_legal_requests')
        .select('id')
        .eq('user_id', context.userId)
        .eq('type', requestType)
        .eq('status', 'pending')
        .ilike('title', title)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'A similar pending request already exists' },
          { status: 409 }
        )
      }

      const { data, error } = await supabase
        .from('user_legal_requests')
        .insert({
          id,
          user_id: context.userId,
          type: requestType,
          status: 'pending',
          title,
          description,
          response_deadline: responseDeadline.toISOString(),
          estimated_completion: estimatedCompletion.toISOString(),
          can_user_contact: true
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating legal request:', error)
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
      }

      await logLegalAccess(supabase, context.userId, 'request_creation', {
        requestId: id,
        type: requestType,
        title
      })
      await notifyPrivacyTeam(context.userId, id, requestType)

      return NextResponse.json(
        {
          success: true,
          data: { request: rowToRequest(data), message: 'Legal request submitted successfully' }
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Error creating legal request:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// PUT handler - update a legal request (e.g. appeal, add info)
export const PUT = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const body = await request.json()
      const { requestId, status, description } = body as {
        requestId?: string
        status?: string
        description?: string
      }

      if (!requestId) {
        return NextResponse.json({ error: 'Missing required field: requestId' }, { status: 400 })
      }

      // Users may only appeal (set status to 'appealed') or amend description.
      const patch: Record<string, unknown> = {}
      if (status === 'appealed') patch.status = 'appealed'
      if (typeof description === 'string' && description.trim().length > 0) {
        patch.description = description
      }

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
      }

      const supabase = (await createClient()) as SSRClient
      const { data, error } = await supabase
        .from('user_legal_requests')
        .update(patch)
        .eq('id', requestId)
        .eq('user_id', context.userId) // RLS also enforces this; belt and suspenders
        .select('*')
        .maybeSingle()

      if (error) {
        console.error('Error updating legal request:', error)
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
      }
      if (!data) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }

      await logLegalAccess(supabase, context.userId, 'request_update', {
        requestId,
        changes: patch
      })

      return NextResponse.json({
        success: true,
        data: { request: rowToRequest(data), message: 'Legal request updated successfully' }
      })
    } catch (error) {
      console.error('Error updating legal request:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
