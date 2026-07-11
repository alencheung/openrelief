/**
 * Tests for Data Export API Endpoint (/api/privacy/export).
 *
 * The route is wrapped in `withAPISecurity` and uses the SSR client
 * (`@/lib/supabase/server`). GET authenticates via `supabase.auth.getUser()`;
 * POST authenticates via the security context. POST validates the body
 * (dataTypes array + format) with Zod and then processes the export inline.
 * We mock both layers and the chainable query builder so every chained query
 * resolves cleanly, letting us assert on auth gating, validation, and creation.
 */

import { NextRequest } from 'next/server'

// Per-test knobs.
let insertResult: { data: unknown; error: unknown } = { data: null, error: null }
let listResult: { data: unknown; error: unknown } = { data: [], error: null }
let authUser: { id: string } | null = { id: 'test-user' }

function chainable() {
  const self: Record<string, any> = {}
  ;[
    'select', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'order', 'limit', 'range', 'not', 'is', 'or', 'filter'
  ].forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self)
  })
  self.insert = jest.fn().mockReturnValue(self)
  self.single = jest.fn().mockResolvedValue(insertResult)
  self.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  // Non-terminal await: resolve to the list result (used by GET and the
  // export gather step). All writes (insert/update) also await this, which is
  // fine — they only need to not throw.
  self.then = (resolve: any) => Promise.resolve(listResult).then(resolve)
  return self
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => chainable()),
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: authUser },
        error: authUser ? null : { message: 'no session' }
      }))
    }
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
  return new NextRequest('http://localhost/api/privacy/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/privacy/export Endpoint', () => {
  let GET: any
  let POST: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    insertResult = { data: null, error: null }
    listResult = { data: [], error: null }
    authUser = { id: 'test-user' }
    const route = require('../route')
    GET = route.GET
    POST = route.POST
  })

  it('GET returns 401 without auth', async () => {
    authUser = null
    const req = new NextRequest('http://localhost/api/privacy/export')
    const res = await GET(req, authedCtx)
    expect(res.status).toBe(401)
  })

  it('GET returns 401 when context is unauthenticated', async () => {
    const req = new NextRequest('http://localhost/api/privacy/export')
    const res = await GET(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('POST returns 401 without auth', async () => {
    const req = jsonRequest({ dataTypes: ['profile'], format: 'json' })
    const res = await POST(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when dataTypes is missing', async () => {
    const req = jsonRequest({ format: 'json' })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('POST creates an export request for an authenticated user', async () => {
    insertResult = {
      data: { id: 'export-1', status: 'pending' },
      error: null
    }
    const req = jsonRequest({ dataTypes: ['profile'], format: 'json' })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.requestId).toBe('export-1')
  })
})
