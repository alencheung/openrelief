/**
 * Tests for Push Subscribe API Endpoint.
 *
 * The route uses the SSR client (`@/lib/supabase/server`) and is wrapped in
 * `withAPISecurity`. We mock both layers: `withAPISecurity` becomes a
 * pass-through that accepts an explicit security context per test, and the
 * SSR `createClient` returns a client whose `from('push_subscriptions')`
 * chain captures the upsert payload. Covers auth gating, subscription
 * validation, and the happy-path store.
 */

import { NextRequest } from 'next/server'

// Captured by the mocked SSR client so tests can assert on it.
let lastUpsert: Record<string, unknown> | null = null
let lastUpsertError: unknown = null

function chainable() {
  const self: Record<string, any> = {}
  self.select = () => self
  self.insert = () => self
  self.upsert = (row: Record<string, unknown>, _opts?: unknown) => {
    lastUpsert = row
    return Promise.resolve({ data: row, error: lastUpsertError })
  }
  self.update = () => self
  self.delete = () => self
  self.eq = () => self
  self.single = async () => ({ data: null, error: null })
  self.maybeSingle = async () => ({ data: null, error: null })
  return self
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () => chainable()
  }))
}))

// Pass-through wrapper that enforces the auth gate, mirroring the real
// withAPISecurity behaviour for a `requireAuth: true` config: unauthenticated
// requests are rejected with 401 before the handler runs, authenticated ones
// fall through with the supplied context. (The POST handler also has its own
// `if (!context.userId)` fallback check.)
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

jest.mock('@/lib/security/input-validation', () => ({
  inputValidator: {
    validateAndSanitizeObject: () => ({ isValid: true, sanitizedData: {}, errors: [], securityFlags: [] })
  },
  validateApiInput: () => ({ isValid: true, sanitizedData: {} }),
  VALIDATION_SCHEMAS: {}
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

function jsonRequest(
  method: string,
  body: unknown,
  url = 'http://localhost/api/push/subscribe'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const validSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh-base64', auth: 'auth-base64' },
  expirationTime: null
}

describe('/api/push/subscribe Endpoint', () => {
  let POST: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    lastUpsert = null
    lastUpsertError = null
    const route = require('../route')
    POST = route.POST
  })

  it('returns 401 when not authenticated', async () => {
    const req = jsonRequest('POST', { subscription: validSubscription })
    const res = await POST(req, unauthedCtx)
    expect(res.status).toBe(401)
  })

  it('returns 400 when subscription is missing', async () => {
    const req = jsonRequest('POST', {})
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('returns 400 when subscription.endpoint is missing', async () => {
    const req = jsonRequest('POST', { subscription: { keys: { p256dh: 'x', auth: 'y' } } })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed JSON body', async () => {
    // Route wraps request.json() in try/catch -> 400 on throw.
    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json'
    })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(400)
  })

  it('stores the subscription for an authenticated user', async () => {
    const req = jsonRequest('POST', { subscription: validSubscription })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(lastUpsert).toBeTruthy()
    expect((lastUpsert as Record<string, unknown>).user_id).toBe('test-user')
    expect((lastUpsert as Record<string, unknown>).endpoint).toBe(validSubscription.endpoint)
    expect((lastUpsert as Record<string, unknown>).is_active).toBe(true)
  })

  it('returns 500 when the database upsert fails', async () => {
    lastUpsertError = { message: 'DB write failed' }
    const req = jsonRequest('POST', { subscription: validSubscription })
    const res = await POST(req, authedCtx)
    expect(res.status).toBe(500)
  })
})
