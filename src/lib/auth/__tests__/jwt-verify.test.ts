// Smoke tests for JWT signature verification (src/lib/auth/jwt-verify.ts).
//
// These exercise the verification state machine — parse -> decode -> JWKS
// fetch -> signature check — without depending on a live Supabase project.
// A throwaway RSA keypair is generated and served via a mocked JWKS endpoint
// so the "invalid signature" rejection is a genuine crypto failure rather
// than an incidental one (e.g. unreachable JWKS).

import { verifySupabaseJwt, clearJwtVerificationCache } from '@/lib/auth/jwt-verify'

// jsdom's crypto may expose getRandomValues without subtle; ensure WebCrypto
// (with subtle.sign/verify/importKey) is present for these tests.
const nodeWebcrypto = require('crypto').webcrypto
if (!globalThis.crypto || !(globalThis.crypto as unknown as { subtle?: unknown }).subtle) {
  ;(globalThis as { crypto: Crypto }).crypto = nodeWebcrypto as Crypto
}

const SUPABASE_URL = 'https://test-project.supabase.co'

function b64urlJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlBytes(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(bytes as Uint8Array)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

interface TestKeys {
  publicKeyJwk: Record<string, unknown>
  privateKey: CryptoKey
  kid: string
}

let testKeys: TestKeys

beforeAll(async () => {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  )
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', publicKey)
  testKeys = {
    publicKeyJwk: publicKeyJwk as Record<string, unknown>,
    privateKey,
    kid: 'test-kid'
  }
})

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  clearJwtVerificationCache()
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ keys: [{ ...testKeys.publicKeyJwk, kid: testKeys.kid }] })
  })
})

async function makeToken(payload: object, signed: boolean): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT', kid: testKeys.kid }
  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`
  let signature: ArrayBuffer
  if (signed) {
    signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      testKeys.privateKey,
      new TextEncoder().encode(signingInput)
    )
  } else {
    // Intentionally invalid signature bytes.
    signature = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer
  }
  return `${signingInput}.${b64urlBytes(signature)}`
}

describe('verifySupabaseJwt', () => {
  it('rejects an empty/missing token', async () => {
    expect(await verifySupabaseJwt('')).toBeNull()
  })

  it('rejects a malformed token (wrong number of segments)', async () => {
    expect(await verifySupabaseJwt('not-a-real-token')).toBeNull()
    expect(await verifySupabaseJwt('a.b.c.d')).toBeNull()
  })

  it('rejects a token with an invalid signature', async () => {
    const payload = {
      sub: 'user-123',
      iss: `${SUPABASE_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) + 3600
    }
    const token = await makeToken(payload, false)
    expect(await verifySupabaseJwt(token)).toBeNull()
  })

  it('accepts a correctly-signed, unexpired token (sanity check)', async () => {
    // Guards against the "invalid signature" test passing for the wrong
    // reason: if a valid token also returned null, the suite would be
    // verifying nothing.
    const payload = {
      sub: 'user-123',
      iss: `${SUPABASE_URL}/auth/v1`,
      exp: Math.floor(Date.now() / 1000) + 3600
    }
    const token = await makeToken(payload, true)
    const result = await verifySupabaseJwt(token)
    expect(result).not.toBeNull()
    expect(result?.sub).toBe('user-123')
  })
})
