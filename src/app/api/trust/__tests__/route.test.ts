/**
 * Tests for Trust API Endpoint.
 *
 * The route uses `safeCreateClient`, which in test mode pulls the mocked
 * `supabase` from `@/lib/supabase`. It is then wrapped in `withAPISecurity`,
 * so we mock that wrapper to pass-through and feed an explicit security
 * context (authed vs unauthed) per test. Covers GET (trust data + permissions
 * gating) and POST (input validation + cache invalidation).
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = require('@/test-utils/mocks/supabase')
  return {
    supabase: createMockSupabaseClient(),
    supabaseAdmin: createMockSupabaseClient()
  }
})

// Pass-through wrapper that enforces the auth gate, mirroring the real
// withAPISecurity behaviour for a `requireAuth: true` config: unauthenticated
// requests are rejected with 401 before the handler runs, authenticated ones
// fall through with the supplied context.
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

jest.mock('@/lib/security/trust-integration', () => ({
  trustScoreManager: {
    getTrustThreshold: () => ({
      level: 'medium',
      permissions: [],
      restrictions: [],
      requirements: []
    }),
    calculateTrustScore: jest.fn().mockResolvedValue({})
  },
  updateTrustScoreFromAction: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('@/lib/cache/api-cache', () => ({
  cacheResponse: (_k: any, fn: any) => fn(),
  generateCacheKey: () => 'trust-key',
  getCacheHeaders: () => ({ 'Cache-Control': 'no-store' }),
  invalidateTrustCache: jest.fn().mockResolvedValue(1),
  checkETagMatch: () => false,
  CACHE_CONFIGS: { trust: {}, trustProfile: {} }
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

function buildChain(d: any = null, err: any = null) {
  const r = { data: d, error: err }
  const c: any = {}
  ;[
    'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in',
    'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'order', 'limit', 'range',
    'not', 'is', 'or', 'filter'
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c)
  })
  c.single = jest.fn().mockResolvedValue(r)
  c.maybeSingle = jest.fn().mockResolvedValue(r)
  // The route fans out queries via Promise.all, so `.then` must behave like
  // a thenable that resolves to { data, error }.
  c.then = (resolve: any) => Promise.resolve(r).then(resolve)
  return c
}

function jsonRequest(
  method: string,
  body: unknown,
  url = 'http://localhost/api/trust'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/trust Endpoint', () => {
  let GET: any, POST: any
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    const route = require('../route')
    GET = route.GET
    POST = route.POST
    const { supabase } = require('@/lib/supabase')
    mockSupabase = supabase
    mockSupabase.from.mockImplementation(() => buildChain())
  })

  describe('GET Method', () => {
    it('returns 401 when not authenticated', async () => {
      const req = new NextRequest('http://localhost/api/trust')
      const res = await GET(req, unauthedCtx)
      expect(res.status).toBe(401)
    })

    it('returns trust data for the authenticated user', async () => {
      // Call order inside cacheResponse: 1) profile (.single), 2) stats
      // (thenable, expects array), 3) reports (thenable, expects array).
      const profileRow = { user_id: 'test-user', trust_score: 0.8, created_at: 'x', updated_at: 'y' }
      const profileChain = buildChain(profileRow)
      profileChain.single = jest.fn().mockResolvedValue({ data: profileRow, error: null })
      const statsChain = buildChain([]) // event_confirmations -> array
      const reportsChain = buildChain([]) // emergency_events -> array
      let call = 0
      mockSupabase.from.mockImplementation(() => {
        call++
        if (call === 1) return profileChain
        if (call === 2) return statsChain
        return reportsChain
      })
      const req = new NextRequest('http://localhost/api/trust')
      const res = await GET(req, authedCtx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.user_id).toBe('test-user')
      expect(json.trust_score).toBe(0.8)
    })

    it('returns 404 when the user profile does not exist (PGRST116)', async () => {
      // Profile query surfaces PGRST116 (no rows) -> route throws "User not found".
      const notFoundChain = buildChain(null, { code: 'PGRST116', message: 'no rows' })
      notFoundChain.single = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
      mockSupabase.from.mockImplementation(() => notFoundChain)
      const req = new NextRequest('http://localhost/api/trust')
      const res = await GET(req, authedCtx)
      expect(res.status).toBe(404)
    })

    it('forbids reading another user without elevated role', async () => {
      // Looking up a different user_id hits the permission check: currentUser
      // query returns a non-admin role -> 403.
      const permChain = buildChain({ role: 'citizen' })
      mockSupabase.from.mockImplementation(() => permChain)
      const req = new NextRequest('http://localhost/api/trust?user_id=other-user')
      const res = await GET(req, authedCtx)
      expect(res.status).toBe(403)
    })
  })

  describe('POST Method', () => {
    it('returns 401 when not authenticated', async () => {
      const req = jsonRequest('POST', { action: 'invalidate', targetUserId: 'u1' })
      const res = await POST(req, unauthedCtx)
      expect(res.status).toBe(401)
    })

    it('rejects missing action', async () => {
      const req = jsonRequest('POST', { targetUserId: 'u1' })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('rejects missing targetUserId', async () => {
      const req = jsonRequest('POST', { action: 'invalidate' })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('rejects an empty body', async () => {
      const req = jsonRequest('POST', {})
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('invalidates the trust cache on a valid request', async () => {
      const { invalidateTrustCache } = require('@/lib/cache/api-cache')
      const req = jsonRequest('POST', { action: 'invalidate', targetUserId: 'target-user' })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(invalidateTrustCache).toHaveBeenCalledWith('target-user')
    })
  })
})
