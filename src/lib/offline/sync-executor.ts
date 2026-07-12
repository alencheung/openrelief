/**
 * Offline Sync Executor
 *
 * Maps queued `OfflineAction` records to real network calls. This replaces
 * the previous `setTimeout` stub in `offlineStore.processQueue` that silently
 * marked actions "synced" without ever contacting the server — a behaviour
 * that lost reports during exactly the offline scenarios the app exists for.
 *
 * Design notes:
 *  - Each action is dispatched through the same secured API routes the live
 *    app uses (POST/PUT/DELETE /api/emergency, POST /api/emergency/confirm,
 *    etc.) so auth, trust checks, Sybil detection, and consensus triggers
 *    run server-side identically to online writes.
 *  - Network/429/5xx responses are retried with exponential backoff by the
 *    caller; non-retryable failures (400/401/403/404) are surfaced so the
 *    action is preserved for the user to review instead of silently dropped.
 *  - The executor never mutates the queue itself; it returns a result the
 *    store uses to mark the action synced, failed, or in-conflict.
 *  - For tables without a dedicated secured route (e.g. user location
 *    pings), we fall back to the Supabase client. This keeps the queue
 *    functional for every action type instead of dropping unknown ones.
 */

import { supabase } from '@/lib/supabase'

export type SyncOutcome =
  | { status: 'synced'; remoteId?: string }
  | { status: 'conflict'; remoteData: unknown; reason: string }
  | { status: 'failed_permanently'; reason: string }
  | { status: 'failed_transiently'; reason: string; retryAfterMs?: number }

export interface ExecutableAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'confirm' | 'dispute'
  table: string
  data: Record<string, unknown>
  retryCount: number
  maxRetries: number
  dependencies?: string[]
}

const NON_RETRYABLE = new Set([400, 401, 403, 404, 409, 422])

/**
 * Inspect an HTTP response and decide whether the failure is worth retrying.
 */
function classifyHttpFailure(status: number, body: unknown): SyncOutcome {
  const message =
    body && typeof body === 'object' && 'error' in body
      ? String((body as { error: unknown }).error)
      : `Request failed with status ${status}`

  if (status === 409) {
    return { status: 'conflict', remoteData: body, reason: message }
  }

  if (NON_RETRYABLE.has(status)) {
    return { status: 'failed_permanently', reason: message }
  }

  // 429 / 5xx — transient. Honour Retry-After when present.
  const retryAfterHeader =
    body && typeof body === 'object' && 'retryAfter' in body
      ? Number((body as { retryAfter: number | string }).retryAfter)
      : undefined
  return {
    status: 'failed_transiently',
    reason: message,
    retryAfterMs: Number.isFinite(retryAfterHeader) ? retryAfterHeader! * 1000 : undefined
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/**
 * Normalise a "lat lng" string or {lat,lng} object into the {latitude,
 * longitude} shape the API route expects, mirroring the live mutation path.
 */
function normaliseLocation(location: unknown): { latitude: number; longitude: number } | undefined {
  if (!location) return undefined
  if (typeof location === 'object' && location !== null) {
    const obj = location as { latitude?: number; lat?: number; longitude?: number; lng?: number }
    if (obj.latitude !== undefined && obj.latitude !== null && obj.longitude !== undefined && obj.longitude !== null) {
      return { latitude: Number(obj.latitude), longitude: Number(obj.longitude) }
    }
    if (obj.lat !== undefined && obj.lat !== null && obj.lng !== undefined && obj.lng !== null) {
      return { latitude: Number(obj.lat), longitude: Number(obj.lng) }
    }
  }
  if (typeof location === 'string') {
    const parts = location.trim().split(/\s+/)
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0] ?? '')
      const lng = parseFloat(parts[1] ?? '')
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng }
      }
    }
  }
  return undefined
}

/**
 * POST /api/emergency with the same payload shape the live mutation uses.
 */
async function syncEmergencyCreate(action: ExecutableAction): Promise<SyncOutcome> {
  const event = action.data || {}
  const payload: Record<string, unknown> = {
    type_id: event.type_id,
    title: event.title,
    description: event.description,
    severity: event.severity,
    metadata: event.metadata,
    location: normaliseLocation(event.location)
  }

  let response: Response
  try {
    response = await fetch('/api/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    return { status: 'failed_transiently', reason: err instanceof Error ? err.message : 'Network error' }
  }

  const body = await parseBody(response)
  if (!response.ok) {
    return classifyHttpFailure(response.status, body)
  }

  const remoteId = (body && (body.data?.id || body.id)) as string | undefined
  return { status: 'synced', remoteId }
}

/**
 * PUT /api/emergency?id=... — only mutable fields the reporter is allowed
 * to change are sent.
 */
async function syncEmergencyUpdate(action: ExecutableAction): Promise<SyncOutcome> {
  const { id, updates } = action.data || {}
  if (!id) {
    return { status: 'failed_permanently', reason: 'Missing event id for update' }
  }

  let response: Response
  try {
    response = await fetch(`/api/emergency?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates || {})
    })
  } catch (err) {
    return { status: 'failed_transiently', reason: err instanceof Error ? err.message : 'Network error' }
  }

  const body = await parseBody(response)
  if (!response.ok) {
    return classifyHttpFailure(response.status, body)
  }
  return { status: 'synced', remoteId: id }
}

async function syncEmergencyDelete(action: ExecutableAction): Promise<SyncOutcome> {
  const id = action.data?.id
  if (!id) {
    return { status: 'failed_permanently', reason: 'Missing event id for delete' }
  }

  let response: Response
  try {
    // agentic-gate-ignore: not SQL — this is an HTTP fetch URL and `id` is
    // already passed through encodeURIComponent(). All DB access in this file
    // goes through the Supabase query builder (parameterized), so there is no
    // string-concatenated SQL here.
    response = await fetch(`/api/emergency?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (err) {
    return { status: 'failed_transiently', reason: err instanceof Error ? err.message : 'Network error' }
  }

  const body = await parseBody(response)
  if (!response.ok) {
    return classifyHttpFailure(response.status, body)
  }
  return { status: 'synced', remoteId: id }
}

/**
 * Upsert a confirmation/dispute. Mirrors `supabaseHelpers.confirmEvent`.
 * Uses the Supabase client (RLS-enforced) since no dedicated secured route
 * exists — this matches the online mutation behaviour.
 */
async function syncConfirmation(
  action: ExecutableAction,
  confirmationType: 'confirm' | 'dispute'
): Promise<SyncOutcome> {
  const { eventId, userId, location } = action.data || {}
  if (!eventId || !userId) {
    return {
      status: 'failed_permanently',
      reason: 'Missing eventId/userId for confirmation'
    }
  }

  try {
    const { data, error } = await supabase
      .from('event_confirmations')
      .upsert({
        event_id: eventId,
        user_id: userId,
        confirmation_type: confirmationType,
        location: location ? `POINT(${location.lng} ${location.lat})` : null,
        trust_weight: 0.1 // server-side trigger recomputes
      })
      .select()
      .single()

    if (error) {
      const code = String(error.code || '')
      // PGRST116 / 23505 — conflict; surface as conflict for resolution.
      if (code === '23505' || code === 'PGRST116') {
        return { status: 'conflict', remoteData: data, reason: error.message }
      }
      return { status: 'failed_transiently', reason: error.message }
    }

    return { status: 'synced', remoteId: data?.id }
  } catch (err) {
    return {
      status: 'failed_transiently',
      reason: err instanceof Error ? err.message : 'Confirmation sync failed'
    }
  }
}

/**
 * Generic fallback for tables without a dedicated secured route. Performs
 * the underlying Supabase write so the action is not silently dropped.
 */
async function syncGeneric(action: ExecutableAction): Promise<SyncOutcome> {
  try {
    let result: { data: { id?: string } | null; error: { message?: string } | null }
    if (action.type === 'create') {
      const { data, error } = await supabase.from(action.table).insert(action.data).select().single()
      result = { data, error }
    } else if (action.type === 'update') {
      const { id, updates } = action.data || {}
      const { data, error } = await supabase
        .from(action.table)
        .update(updates || {})
        .eq('id', id)
        .select()
        .single()
      result = { data, error }
    } else if (action.type === 'delete') {
      const { error } = await supabase
        .from(action.table)
        .delete()
        .eq('id', action.data?.id)
      result = { data: null, error }
    } else {
      return {
        status: 'failed_permanently',
        reason: `Unsupported action ${action.type} on ${action.table}`
      }
    }

    if (result.error) {
      return { status: 'failed_transiently', reason: String(result.error.message || result.error) }
    }
    return { status: 'synced', remoteId: result.data?.id }
  } catch (err) {
    return {
      status: 'failed_transiently',
      reason: err instanceof Error ? err.message : 'Generic sync failed'
    }
  }
}

/**
 * Execute a single queued action against the backend. Never throws — every
 * failure path returns a `SyncOutcome` so the queue can decide how to
 * update the action's state.
 */
export async function executeOfflineAction(action: ExecutableAction): Promise<SyncOutcome> {
  switch (action.table) {
    case 'emergency_events':
      if (action.type === 'create') return syncEmergencyCreate(action)
      if (action.type === 'update') return syncEmergencyUpdate(action)
      if (action.type === 'delete') return syncEmergencyDelete(action)
      return { status: 'failed_permanently', reason: `Unsupported ${action.type} on emergency_events` }

    case 'event_confirmations':
      if (action.type === 'confirm') return syncConfirmation(action, 'confirm')
      if (action.type === 'dispute') return syncConfirmation(action, 'dispute')
      return { status: 'failed_permanently', reason: `Unsupported ${action.type} on event_confirmations` }

    default:
      return syncGeneric(action)
  }
}
