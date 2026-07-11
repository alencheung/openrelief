/**
 * Tests for the rate limiter's emergency-mode behaviour.
 *
 * These pin down the P0 fix: emergency mode must RAISE the limit for
 * victim-facing tiers (emergency, auth), not lower it. The original logic
 * multiplied the limit by 0.3 during emergencies, throttling legitimate
 * victims during the exact events the platform exists to serve.
 */

/**
 * @jest-environment node
 */

// Mock the Upstash dependencies BEFORE importing the rate limiter. Their ESM
// (`export`) build isn't transformed by Jest (node_modules is excluded from
// transform), so importing them directly fails to parse. We only need the
// in-memory code path for these tests.
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 0 })
  }))
}))
jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }))
jest.mock('../client', () => ({
  getRedisClient: jest.fn(() => null),
  checkRedisAvailability: jest.fn().mockResolvedValue(false)
}))

import { getRateLimiter, RATE_LIMIT_TIERS } from '../rate-limiter'

describe('emergency-mode rate limiting', () => {
  it('raises the emergency tier limit when emergencyMode is on', async () => {
    const limiter = getRateLimiter()

    // Baseline: emergency tier default is 30/15min.
    expect(RATE_LIMIT_TIERS.emergency.maxRequests).toBe(30)
    expect(RATE_LIMIT_TIERS.emergency.emergencyModeMultiplier).toBeGreaterThanOrEqual(5)

    // Use a neutral trustWeight (0.5) so the trust multiplier (applied when
    // trustWeight > 0.7 or < 0.3) does not obscure the emergency-mode bump.
    const base = await limiter.checkLimit(`emg-base-${Date.now()}`, 'emergency', {
      emergencyMode: false,
      trustWeight: 0.5
    })
    const surged = await limiter.checkLimit(`emg-surge-${Date.now()}`, 'emergency', {
      emergencyMode: true,
      trustWeight: 0.5
    })

    // The effective limit during a surge must be strictly higher than the
    // peacetime limit. This is the inversion of the old *0.3 behaviour.
    expect(surged.limit).toBeGreaterThan(base.limit)
    // 30 * 5 = 150 expected (no trust multiplier at trustWeight 0.5).
    expect(surged.limit).toBe(RATE_LIMIT_TIERS.emergency.maxRequests * 5)
  })

  it('raises the auth tier limit during emergency mode (victims must be able to sign up)', async () => {
    const limiter = getRateLimiter()

    expect(RATE_LIMIT_TIERS.auth.emergencyOverride).toBe(true)

    const base = await limiter.checkLimit(`auth-base-${Date.now()}`, 'auth', {
      emergencyMode: false
    })
    const surged = await limiter.checkLimit(`auth-surge-${Date.now()}`, 'auth', {
      emergencyMode: true
    })

    expect(surged.limit).toBeGreaterThan(base.limit)
  })

  it('does NOT widen limits for non-victim tiers (api/upload)', async () => {
    expect(RATE_LIMIT_TIERS.api.emergencyOverride).toBeFalsy()
    expect(RATE_LIMIT_TIERS.upload.emergencyOverride).toBeFalsy()

    const limiter = getRateLimiter()
    const base = await limiter.checkLimit(`api-base-${Date.now()}`, 'api', {
      emergencyMode: false
    })
    const surged = await limiter.checkLimit(`api-surge-${Date.now()}`, 'api', {
      emergencyMode: true
    })

    // No override → limit unchanged regardless of emergencyMode.
    expect(surged.limit).toBe(base.limit)
  })

  it('keeps a floor of 1 on the effective limit', async () => {
    const limiter = getRateLimiter()
    // trustWeight 0 with a tier that has no override still yields >= 1.
    const result = await limiter.checkLimit(`floor-${Date.now()}`, 'api', {
      trustWeight: 0,
      emergencyMode: false
    })
    expect(result.limit).toBeGreaterThanOrEqual(1)
  })
})
