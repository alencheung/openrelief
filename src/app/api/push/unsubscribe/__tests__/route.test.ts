/**
 * Tests for Push Unsubscribe API Endpoint.
 *
 * The route is wrapped in `withAPISecurity` and uses the SSR client
 * (`@/lib/supabase/server`). The handler scopes the deletion to the caller's
 * user id, and validates `endpoint` via a Zod schema. We mock both layers so
 * tests assert purely on HTTP behaviour: auth gating, body validation, and the
 * successful removal.
 */

import { NextRequest } from 'next/server'

// What the mocked delete chain resolves to. Set per-test.
let deleteResult: { error: unknown } = { error: null }

function chainable() {
  const self: Record<string, any> = {}
  ;[
    'select', 'insert', 'update', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'order', 'limit', 'range', 'not', 'is', 'or', 'filter'
  ].forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self)
  })
  self.delete = jest.fn().mockReturnValue(self)
  self.single = jest.fn().mockResolvedValue({ data: null, error: null })
  self.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  // Terminal resolution for the awaited delete chain.
  self.then = (resolve: any) => Promise.resolve(deleteResult).then(resolve)
  return self
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => chainable())
  }))
}))

// Pass-through wrapper mirroring withAPISecurity for a requireAuth config:
// unauthenticated requests are rejected with 401, authenticated ones fall
// through with the supplied context.
jest.mock('@/lib/security/api-security', () => ({
  withAPISecurity: () => (handler: any) => async (req: any, ctx: any) => {
    if (!ctx || ctx.authenticated === false) {
      const { NextResponse } = require('next/server')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return handler(req, ctx)
  },
  API_SECURITY_CONFIGS: { user: {} }
}))

jest.spyOn(console, 'error').mockImplementation(() => {})

const authedCtx = {
  authenticated: true,
  userId: 'test-user',
  permissions: [],
  deviceTrusted: true,
  mfaVerified: false,
  ipAddress: '127.0.0.1',
  userAgent: 'test'
}
const unauthedCtx = { authenticated: false, userId: null, permissions: [] }

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/push/unsubscribe Endpoint', () => {
  let POST: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    deleteResult = { error: null }
    const route = require('../route')
    POST = route.POST
  })

  it('returns 401 when not authenticated', async () => {
    const req = jsonRequest({ endpoint: 'https://push.example/abc' })
    const res = await POST(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('returns 400 when endpoint is missing', async () => {
    const req = jsonRequest({})
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it('returns 400 when endpoint is an empty string', async () => {
    const req = jsonRequest({ endpoint: '   ' })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('returns 200 and removes the subscription for an authenticated user', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc'
    const req = jsonRequest({ endpoint })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 500 when the database delete fails', async () => {
    deleteResult = { error: { message: 'delete failed' } }
    const req = jsonRequest({ endpoint: 'https://push.example/abc' })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(500)
  })
})
