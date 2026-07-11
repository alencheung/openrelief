/**
 * Tests for Current User Profile API (/api/users/me).
 *
 * The route uses the RLS-bound SSR client (`@/lib/supabase/server`) with a
 * local `requireUser` helper. GET returns the caller's user_profiles row;
 * PATCH updates user-editable fields only (system fields like trust_score are
 * rejected). We mock the SSR client with a chainable builder and shape the
 * resolved query per test.
 */

import { NextRequest } from 'next/server'

// Result the SSR client resolves the terminal query to. Set per-test.
let resolvedData: unknown = null
let resolvedError: unknown = null
let authUser: { id: string } | null = { id: 'test-user' }

function chainable() {
  const self: Record<string, any> = {}
  ;[
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'order', 'limit', 'range', 'not', 'is', 'or', 'filter'
  ].forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self)
  })
  self.single = jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError })
  self.maybeSingle = jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError })
  self.then = (resolve: any) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).then(resolve)
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

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/users/me Endpoint', () => {
  let GET: any
  let PATCH: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    resolvedData = null
    resolvedError = null
    authUser = { id: 'test-user' }
    const route = require('../route')
    GET = route.GET
    PATCH = route.PATCH
  })

  it('GET returns 401 without auth', async () => {
    authUser = null
    const req = new NextRequest('http://localhost/api/users/me')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('GET returns the user profile for an authenticated user', async () => {
    resolvedData = {
      user_id: 'test-user',
      display_name: 'Test User',
      avatar_url: null,
      trust_score: 0.8,
      notification_preferences: {},
      privacy_settings: {},
      privacy_level: 'standard',
      data_anonymized: false,
      risk_score: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
    const req = new NextRequest('http://localhost/api/users/me')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.user_id).toBe('test-user')
  })

  it('PATCH returns 401 without auth', async () => {
    authUser = null
    const req = patchRequest({ display_name: 'New Name' })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('PATCH rejects non-editable fields with 400', async () => {
    // trust_score is system-controlled and must be rejected before Zod.
    const req = patchRequest({ trust_score: 0.99 })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/not user-editable/i)
  })

  it('PATCH returns 400 when no updatable fields are provided', async () => {
    const req = patchRequest({})
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('PATCH updates an editable field and returns the updated profile', async () => {
    resolvedData = {
      user_id: 'test-user',
      display_name: 'Updated Name',
      avatar_url: null,
      trust_score: 0.8,
      notification_preferences: {},
      privacy_settings: {},
      privacy_level: 'standard',
      updated_at: '2024-06-01T00:00:00Z'
    }
    const req = patchRequest({ display_name: 'Updated Name' })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.display_name).toBe('Updated Name')
  })
})
