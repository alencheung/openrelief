/**
 * Tests for Legal Requests API Endpoint (/api/privacy/legal-requests).
 *
 * The route is wrapped in `withAPISecurity` and uses the SSR client
 * (`@/lib/supabase/server`). GET lists the user's requests; POST validates the
 * body (type/title/description), de-duplicates against pending requests, then
 * inserts. We mock both layers and the chainable query builder, shaping the
 * resolved result per test to exercise auth gating, validation, and creation.
 */

import { NextRequest } from 'next/server'

// Per-test knobs for the mocked query results.
let insertResult: { data: unknown; error: unknown } = { data: null, error: null }
let dedupResult: { data: unknown; error: unknown } = { data: null, error: null }
let listResult: { data: unknown; error: unknown } = { data: [], error: null }

function chainable(table: string) {
  const self: Record<string, any> = { __table: table }
  ;[
    'select', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'order', 'limit', 'range', 'not', 'is', 'or', 'filter'
  ].forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self)
  })
  // insert returns the chain so .select().single() can follow it.
  self.insert = jest.fn().mockReturnValue(self)
  self.single = jest.fn().mockResolvedValue(insertResult)
  self.maybeSingle = jest.fn().mockResolvedValue(dedupResult)
  // Non-terminal await (list query without single/maybeSingle).
  self.then = (resolve: any) =>
    Promise.resolve(table === 'user_legal_requests' && self.__listed ? listResult : dedupResult).then(resolve)
  return self
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn((table: string) => chainable(table))
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
jest.spyOn(console, 'warn').mockImplementation(() => {})

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

function jsonRequest(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/privacy/legal-requests', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/privacy/legal-requests Endpoint', () => {
  let GET: any
  let POST: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    insertResult = { data: null, error: null }
    dedupResult = { data: null, error: null }
    listResult = { data: [], error: null }
    const route = require('../route')
    GET = route.GET
    POST = route.POST
  })

  it('GET returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/privacy/legal-requests')
    const res = await GET(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('POST returns 401 without auth', async () => {
    const req = jsonRequest('POST', {
      type: 'data_access',
      title: 'Access request',
      description: 'Please send my data.'
    })
    const res = await POST(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when type is missing', async () => {
    const req = jsonRequest('POST', {
      title: 'Access request',
      description: 'Please send my data.'
    })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 when title is missing', async () => {
    const req = jsonRequest('POST', {
      type: 'data_access',
      description: 'Please send my data.'
    })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('POST returns 400 for an invalid request type', async () => {
    const req = jsonRequest('POST', {
      type: 'not_a_real_type',
      title: 'Access request',
      description: 'Please send my data.'
    })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('POST creates a legal request for an authenticated user', async () => {
    dedupResult = { data: null, error: null }
    insertResult = {
      data: {
        id: 'request_1',
        type: 'data_access',
        status: 'pending',
        title: 'Access request',
        description: 'Please send my data.',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        response_deadline: '2024-01-16T00:00:00Z',
        estimated_completion: '2024-01-08T00:00:00Z',
        can_user_contact: true
      },
      error: null
    }
    const req = jsonRequest('POST', {
      type: 'data_access',
      title: 'Access request',
      description: 'Please send my data.'
    })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.request).toBeTruthy()
  })
})
