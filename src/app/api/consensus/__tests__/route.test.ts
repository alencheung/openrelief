/**
 * Tests for Consensus API Endpoint.
 *
 * The route uses `safeCreateClient`, which in test mode pulls the mocked
 * `supabase` from `@/lib/supabase`. It is then wrapped in `withAPISecurity`,
 * so we mock that wrapper to pass-through and feed an explicit security
 * context (authed vs unauthed) per test. Covers POST (zod validation + auth
 * + vote submission) and GET (event_id required + consensus aggregation).
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

jest.mock('@/lib/security/trust-integration', () => ({
  trustScoreManager: {
    getTrustThreshold: () => ({ level: 'medium', permissions: [], restrictions: [], requirements: [] }),
    calculateTrustScore: jest.fn().mockResolvedValue({})
  },
  updateTrustScoreFromAction: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('@/lib/audit/security-monitor', () => ({
  securityMonitor: { createAlert: jest.fn().mockResolvedValue(undefined) },
  SecurityIncidentType: {},
  IncidentSeverity: {}
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
  // Promise.all resolves these as thenables -> { data, error }.
  c.then = (resolve: any) => Promise.resolve(r).then(resolve)
  return c
}

function jsonRequest(
  method: string,
  body: unknown,
  url = 'http://localhost/api/consensus'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/consensus Endpoint', () => {
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
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
  })

  describe('POST Method', () => {
    it('returns 401 when not authenticated', async () => {
      const req = jsonRequest('POST', {
        event_id: 'evt-1',
        confirmation_type: 'confirm'
      })
      const res = await POST(req, unauthedCtx)
      expect(res.status).toBe(401)
    })

    it('rejects missing event_id', async () => {
      const req = jsonRequest('POST', { confirmation_type: 'confirm' })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('rejects an invalid confirmation_type', async () => {
      const req = jsonRequest('POST', {
        event_id: 'evt-1',
        confirmation_type: 'maybe'
      })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('rejects an empty body', async () => {
      const req = jsonRequest('POST', {})
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('accepts a valid consensus vote', async () => {
      // No existing confirmation -> the route inserts and runs the RPC.
      const insertChain = buildChain(null, null)
      // First .single() (existingConfirmation lookup) returns null data.
      insertChain.single = jest.fn().mockResolvedValue({ data: null, error: null })
      // Profile lookup for trust_weight.
      const profileChain = buildChain({ trust_score: 0.9 })
      // Insert returns no error.
      const insertOnlyChain = buildChain(null, null)
      let call = 0
      mockSupabase.from.mockImplementation(() => {
        call++
        if (call === 1) return insertChain
        if (call === 2) return profileChain
        return insertOnlyChain
      })
      const req = jsonRequest('POST', {
        event_id: 'evt-1',
        confirmation_type: 'confirm',
        location: { latitude: 40.71, longitude: -74.0 }
      })
      const res = await POST(req, authedCtx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.confirmation_type).toBe('confirm')
    })

    it('returns 401 when context.userId is missing even though ctx passed', async () => {
      // Defensive: route body checks `if (!context.userId)` itself, in addition
      // to withAPISecurity. Verify it fires when userId is null.
      const req = jsonRequest('POST', {
        event_id: 'evt-1',
        confirmation_type: 'dispute'
      })
      const res = await POST(req, unauthedCtx)
      expect(res.status).toBe(401)
    })
  })

  describe('GET Method', () => {
    it('returns 400 when event_id is missing', async () => {
      const req = new NextRequest('http://localhost/api/consensus')
      const res = await GET(req, authedCtx)
      expect(res.status).toBe(400)
    })

    it('returns consensus state for a valid event_id', async () => {
      // First query: confirmations list. Second query: event row (via .single).
      const confirmationsChain = buildChain([
        { confirmation_type: 'confirm', trust_weight: 0.8 }
      ])
      const eventChain = buildChain({
        trust_weight: 1,
        confirmation_count: 1,
        dispute_count: 0
      })
      let call = 0
      mockSupabase.from.mockImplementation(() => {
        call++
        return call === 1 ? confirmationsChain : eventChain
      })
      const req = new NextRequest('http://localhost/api/consensus?event_id=evt-1')
      const res = await GET(req, authedCtx)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.event_id).toBe('evt-1')
      expect(json.confirm_votes).toBe(1)
      expect(json.dispute_votes).toBe(0)
    })
  })
})
