/**
 * Tests for Privacy Settings API Endpoint.
 *
 * The route uses the RLS-bound SSR client + withAPISecurity. These tests mock
 * both layers and verify the real-persistence contract: GET returns stored
 * settings (or defaults), POST validates and upserts, and both write to
 * privacy_audit_log.
 */

import { NextRequest } from 'next/server'

let mockStored: Record<string, unknown> | null = null
let lastInsert: Record<string, unknown> | null = null
let lastUpsert: Record<string, unknown> | null = null

function chainable(result: { data: unknown; error: unknown }) {
  const self: Record<string, any> = {}
  const passthrough = () => self
  self.select = passthrough
  self.insert = (row: Record<string, unknown>) => {
    lastInsert = row
    return self
  }
  self.upsert = (row: Record<string, unknown>) => {
    lastUpsert = row
    return self
  }
  self.update = passthrough
  self.delete = passthrough
  self.eq = passthrough
  self.maybeSingle = async () => result
  self.single = async () => result
  return self
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () =>
      chainable({
        data: mockStored,
        error: null
      })
  }))
}))

jest.mock('@/lib/security/api-security', () => ({
  withAPISecurity: () => (handler: any) => async (req: any, ctx: any) => handler(req, ctx),
  API_SECURITY_CONFIGS: { user: {} }
}))

jest.spyOn(console, 'error').mockImplementation(() => {})

function jsonRequest(
  method: string,
  body: unknown,
  url = 'http://localhost/api/privacy/settings'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const authedCtx = {
  authenticated: true,
  userId: 'test-user',
  permissions: [],
  deviceTrusted: true,
  mfaVerified: false,
  ipAddress: '127.0.0.1',
  userAgent: 'test'
}
const unauthedCtx = {
  authenticated: false,
  userId: null,
  permissions: []
}

describe('/api/privacy/settings Endpoint', () => {
  let GET: any, POST: any

  beforeEach(async () => {
    jest.clearAllMocks()
    mockStored = null
    lastInsert = null
    lastUpsert = null
    jest.resetModules()
    const route = require('../settings/route')
    GET = route.GET
    POST = route.POST
  })

  describe('GET Method', () => {
    it('returns 401 when not authenticated', async () => {
      const request = jsonRequest('GET', {})
      const response = await GET(request, unauthedCtx)
      expect(response.status).toBe(401)
    })

    it('returns default settings for a new user', async () => {
      const request = jsonRequest('GET', {})
      const response = await GET(request, authedCtx)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.settings.locationSharing).toBe(true)
      expect(json.data.settings.anonymizeData).toBe(true)
      expect(json.data.settings.locationPrecision).toBe(3)
    })

    it('returns stored settings for a returning user', async () => {
      mockStored = {
        location_sharing: false,
        location_precision: 2,
        data_retention_days: 60,
        anonymize_data: true,
        differential_privacy: false,
        k_anonymity: true,
        end_to_end_encryption: true,
        emergency_data_sharing: false,
        research_participation: true,
        third_party_analytics: false,
        automated_data_cleanup: false,
        privacy_budget_alerts: true,
        legal_notifications: false,
        data_processing_purposes: ['service_delivery'],
        consent_management: true,
        real_time_monitoring: false,
        updated_at: '2024-01-01T00:00:00.000Z'
      }
      const request = jsonRequest('GET', {})
      const response = await GET(request, authedCtx)
      const json = await response.json()
      expect(json.data.settings.locationSharing).toBe(false)
      expect(json.data.settings.locationPrecision).toBe(2)
      expect(json.data.settings.dataRetentionDays).toBe(60)
    })

    it('writes an audit log entry on read', async () => {
      const request = jsonRequest('GET', {})
      await GET(request, authedCtx)
      expect(lastInsert).toBeTruthy()
      expect((lastInsert as Record<string, unknown>).action).toBe('settings_retrieval')
    })
  })

  describe('POST Method', () => {
    it('returns 401 when not authenticated', async () => {
      const request = jsonRequest('POST', { settings: {} })
      const response = await POST(request, unauthedCtx)
      expect(response.status).toBe(401)
    })

    it('returns 400 when settings are missing', async () => {
      const request = jsonRequest('POST', {})
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(400)
    })

    it('rejects locationPrecision out of range', async () => {
      const request = jsonRequest('POST', { settings: { locationPrecision: 99 } })
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toMatch(/locationPrecision/)
    })

    it('rejects dataRetentionDays out of range', async () => {
      const request = jsonRequest('POST', { settings: { dataRetentionDays: 1 } })
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(400)
    })

    it('rejects dataProcessingPurposes that is not an array', async () => {
      const request = jsonRequest('POST', { settings: { dataProcessingPurposes: 'no' } })
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toMatch(/dataProcessingPurposes/)
    })

    it('rejects a non-boolean toggle', async () => {
      const request = jsonRequest('POST', { settings: { anonymizeData: 'yes' } })
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(400)
    })

    it('upserts valid settings and logs the update', async () => {
      // The upsert path reads current row (.maybeSingle) then selects the saved row (.single).
      mockStored = {
        location_sharing: true, location_precision: 3, data_retention_days: 30,
        anonymize_data: true, differential_privacy: true, k_anonymity: true,
        end_to_end_encryption: true, emergency_data_sharing: true,
        research_participation: false, third_party_analytics: false,
        automated_data_cleanup: true, privacy_budget_alerts: true,
        legal_notifications: true, data_processing_purposes: ['service_delivery'],
        consent_management: true, real_time_monitoring: true,
        updated_at: '2024-01-01T00:00:00.000Z'
      }
      const request = jsonRequest('POST', {
        settings: {
          locationSharing: false,
          locationPrecision: 4,
          dataRetentionDays: 60,
          anonymizeData: true,
          differentialPrivacy: true,
          kAnonymity: true,
          endToEndEncryption: true,
          emergencyDataSharing: true,
          researchParticipation: false,
          thirdPartyAnalytics: false,
          automatedDataCleanup: true,
          privacyBudgetAlerts: true,
          legalNotifications: true,
          dataProcessingPurposes: ['service_delivery'],
          consentManagement: true,
          realTimeMonitoring: true
        }
      })
      const response = await POST(request, authedCtx)
      expect(response.status).toBe(200)
      expect(lastUpsert).toBeTruthy()
      expect(lastInsert).toBeTruthy()
      expect((lastInsert as Record<string, unknown>).action).toBe('settings_update')
    })
  })
})
