/**
 * Tests for Notification Dispatch API Endpoint.
 *
 * This route is NOT wrapped in `withAPISecurity`. It is protected by a shared
 * internal key (the `x-api-key` header vs `process.env.INTERNAL_CRON_KEY`)
 * and additionally fails closed when Web Push / VAPID keys are not configured.
 * It drains `notification_queue` via `supabaseAdmin` and sends pushes via
 * `broadcastWebPush`.
 *
 * We mock `@/lib/supabase` (supabaseAdmin), the web-push module, and drive
 * `INTERNAL_CRON_KEY` per test through delete/restore on process.env.
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = require('@/test-utils/mocks/supabase')
  return {
    supabase: createMockSupabaseClient(),
    supabaseAdmin: createMockSupabaseClient()
  }
})

jest.mock('@/lib/notifications/web-push', () => ({
  isWebPushConfigured: jest.fn(() => true),
  broadcastWebPush: jest.fn(async () => ({ sent: 1, failed: 0, expired: [] }))
}))

jest.spyOn(console, 'error').mockImplementation(() => {})

const VALID_CRON_KEY = 'test-internal-cron-key'

function buildChain(d: any = null, err: any = null) {
  const r = { data: d, error: err }
  const c: any = {}
  const chainableMethods = [
    'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in',
    'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'order', 'limit', 'range',
    'not', 'is', 'or', 'filter'
  ]
  chainableMethods.forEach(m => {
    c[m] = jest.fn().mockReturnValue(c)
  })
  c.single = jest.fn().mockResolvedValue(r)
  c.maybeSingle = jest.fn().mockResolvedValue(r)
  c.then = (resolve: any) => Promise.resolve(r).then(resolve)
  return c
}

function authedRequest(extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/notifications/dispatch', {
    method: 'POST',
    headers: { 'x-api-key': VALID_CRON_KEY, ...extraHeaders }
  })
}

describe('/api/notifications/dispatch Endpoint', () => {
  let POST: any
  let mockSupabaseAdmin: any
  const originalKey = process.env.INTERNAL_CRON_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.INTERNAL_CRON_KEY = VALID_CRON_KEY
    const route = require('../route')
    POST = route.POST
    const { supabaseAdmin } = require('@/lib/supabase')
    mockSupabaseAdmin = supabaseAdmin
    mockSupabaseAdmin.from.mockImplementation(() => buildChain())
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.INTERNAL_CRON_KEY
    } else {
      process.env.INTERNAL_CRON_KEY = originalKey
    }
  })

  it('returns 503 when INTERNAL_CRON_KEY is not configured', async () => {
    delete process.env.INTERNAL_CRON_KEY
    const req = new NextRequest('http://localhost/api/notifications/dispatch', {
      method: 'POST'
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it('returns 401 when x-api-key header is missing', async () => {
    const req = new NextRequest('http://localhost/api/notifications/dispatch', {
      method: 'POST'
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when x-api-key header is wrong', async () => {
    const req = new NextRequest('http://localhost/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'x-api-key': 'definitely-wrong' }
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 503 when Web Push is not configured', async () => {
    const { isWebPushConfigured } = require('@/lib/notifications/web-push')
    ;(isWebPushConfigured as jest.Mock).mockReturnValueOnce(false)
    const req = authedRequest()
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it('accepts a valid dispatch request and reports counts', async () => {
    // Queue has one pending notification; user has one active subscription.
    const pendingRow = {
      id: 'n1',
      user_id: 'u1',
      title: 'T',
      message: 'M',
      data: {},
      attempts: 0,
      max_attempts: 3
    }
    const subRow = { endpoint: 'https://fcm/x', p256dh: 'p', auth: 'a' }
    let call = 0
    mockSupabaseAdmin.from.mockImplementation(() => {
      call++
      // Call sequence per item: subs lookup -> queue update. The first call
      // is the pending queue fetch.
      if (call === 1) {
        return buildChain([pendingRow])
      }
      if (call === 2) {
        return buildChain([subRow])
      }
      // subsequent calls (queue.update) just need to be chainable
      return buildChain(null, null)
    })

    const req = authedRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(json.failed).toBe(0)
    expect(json.noSubscribers).toBe(0)
  })

  it('returns 500 when the pending-queue query errors', async () => {
    mockSupabaseAdmin.from.mockImplementation(() => {
      const c = buildChain(null, { message: 'DB down' })
      return c
    })
    const req = authedRequest()
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
