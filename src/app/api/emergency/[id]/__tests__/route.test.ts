/**
 * Tests for the single Emergency Event API (dynamic route).
 *
 * The route uses the RLS-bound SSR client (`@/lib/supabase/server`) and a
 * local `requireUser` helper that calls `supabase.auth.getUser()` for auth.
 * We mock the SSR client with a chainable builder so each test can shape the
 * query result (single/maybeSingle/throw). Covers auth gating, 404/400
 * branches, and the happy-path fetch.
 */

import { NextRequest } from 'next/server'

// Result the SSR client should resolve the terminal query to. Set per-test.
let maybeSingleData: unknown = null
let maybeSingleError: unknown = null
let authUser: { id: string } | null = { id: 'test-user' }

function chainable(table = 'emergency_events') {
  const self: Record<string, any> = {}
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'order', 'limit', 'range', 'not', 'is', 'or', 'filter'
  ]
  methods.forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self)
  })
  self.single = jest.fn().mockResolvedValue({ data: maybeSingleData, error: maybeSingleError })
  self.maybeSingle = jest.fn().mockResolvedValue({ data: maybeSingleData, error: maybeSingleError })
  // Allow awaiting the chain directly for non-terminal usages.
  self.then = (resolve: any) => Promise.resolve({ data: maybeSingleData, error: maybeSingleError }).then(resolve)
  self.__table = table
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

jest.spyOn(console, 'error').mockImplementation(() => {})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/emergency/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/emergency/[id] Endpoint', () => {
  let GET: any
  let PATCH: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    maybeSingleData = null
    maybeSingleError = null
    authUser = { id: 'test-user' }
    const route = require('../route')
    GET = route.GET
    PATCH = route.PATCH
  })

  it('GET returns 401 without auth', async () => {
    authUser = null
    const req = new NextRequest('http://localhost/api/emergency/evt-1')
    const res = await GET(req, params('evt-1'))
    expect(res.status).toBe(401)
  })

  it('GET returns 404 for a non-existent event', async () => {
    maybeSingleData = null
    maybeSingleError = null
    const req = new NextRequest('http://localhost/api/emergency/evt-missing')
    const res = await GET(req, params('evt-missing'))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/i)
  })

  it('GET returns event data for a valid id', async () => {
    maybeSingleData = {
      id: 'evt-1',
      reporter_id: 'test-user',
      type_id: 1,
      severity: 3,
      status: 'active',
      description: 'Test emergency',
      radius_meters: 500,
      created_at: '2024-01-01T00:00:00Z',
      expires_at: null,
      confirmation_count: 0,
      dispute_count: 0
    }
    const req = new NextRequest('http://localhost/api/emergency/evt-1')
    const res = await GET(req, params('evt-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('evt-1')
  })

  it('PATCH returns 400 for an invalid update body', async () => {
    // Ownership check passes (reporter === caller), then Zod rejects unknown field.
    maybeSingleData = { id: 'evt-1', reporter_id: 'test-user', status: 'active' }
    const req = patchRequest('evt-1', { not_a_field: true })
    const res = await PATCH(req, params('evt-1'))
    expect(res.status).toBe(400)
  })

  it('PATCH returns 400 when no updatable fields are provided', async () => {
    maybeSingleData = { id: 'evt-1', reporter_id: 'test-user', status: 'active' }
    const req = patchRequest('evt-1', {})
    const res = await PATCH(req, params('evt-1'))
    expect(res.status).toBe(400)
  })

  it('PATCH returns 401 without auth', async () => {
    authUser = null
    const req = patchRequest('evt-1', { status: 'resolved' })
    const res = await PATCH(req, params('evt-1'))
    expect(res.status).toBe(401)
  })
})
