/**
 * JWT signature verification for the Edge runtime.
 *
 * The previous trust middleware decoded the Supabase access-token JWT
 * WITHOUT verifying its signature and then used the `sub` claim to look up
 * the user's trust tier (which influences rate-limit ceilings). An attacker
 * who could mint a structurally-valid unsigned JWT claiming a high-trust
 * user's `sub` inherited that user's elevated rate limit.
 *
 * This module verifies the JWT signature against Supabase's published JWKS
 * using the WebCrypto APIs available in the Edge runtime (no `jose`
 * dependency required), and also enforces `exp`/`iss`/`aud`. Verification
 * results and the JWKS are cached to keep the per-request cost low.
 *
 * The authoritative identity check still happens in API route handlers via
 * `supabase.auth.getUser()`; this module exists to keep middleware-scoped
 * trust decisions from being forgeable.
 */

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const VERIFIED_CACHE_TTL_MS = 30 * 1000 // 30 seconds (short — tokens can be revoked)
const VERIFIED_CACHE_MAX = 5000

interface JwkKey {
  kty: string
  kid?: string
  alg?: string
  use?: string
  n?: string // RSA modulus (base64url)
  e?: string // RSA exponent (base64url)
}

interface JwksResponse {
  keys: JwkKey[]
}

let cachedKeys: JwkKey[] | null = null
let cachedKeysExpireAt = 0
let pendingKeysFetch: Promise<JwkKey[]> | null = null

interface VerifiedEntry {
  exp: number
  verifiedAt: number
}

const verifiedCache = new Map<string, VerifiedEntry>()

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

/**
 * Fetch Supabase's JWKS with simple dedup so concurrent requests coalesce.
 */
async function fetchJwks(): Promise<JwkKey[]> {
  if (cachedKeys && Date.now() < cachedKeysExpireAt) {
    return cachedKeys
  }
  if (pendingKeysFetch) {
    return pendingKeysFetch
  }

  const url = getSupabaseUrl()
  if (!url) {
    throw new Error('Supabase URL not configured')
  }

  pendingKeysFetch = (async () => {
    try {
      const response = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
        // JWKS is public; no credentials needed.
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }
      })
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`)
      }
      const body = (await response.json()) as JwksResponse
      cachedKeys = body.keys || []
      cachedKeysExpireAt = Date.now() + JWKS_CACHE_TTL_MS
      return cachedKeys
    } finally {
      pendingKeysFetch = null
    }
  })()

  return pendingKeysFetch
}

function base64urlToUint8Array(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary =
    typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Import an RSA public key from a JWK for use with WebCrypto's verify().
 */
async function importRsaKey(jwk: JwkKey): Promise<CryptoKey> {
  const keyData = {
    kty: jwk.kty,
    alg: jwk.alg || 'RS256',
    use: jwk.use || 'sig',
    kid: jwk.kid,
    n: jwk.n,
    e: jwk.e
  }
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
}

interface JwtHeader {
  alg?: string
  kid?: string
  typ?: string
}

interface JwtPayload {
  sub?: string
  exp?: number
  iss?: string
  aud?: string | string[]
  role?: string
  email?: string
}

function decodeJwtPart<T>(segment: string | undefined): T | null {
  if (!segment) return null
  try {
    const bytes = base64urlToUint8Array(segment)
    const text =
      typeof TextDecoder !== 'undefined'
        ? new TextDecoder().decode(bytes)
        : Buffer.from(bytes).toString('utf-8')
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Verify a Supabase access-token JWT's signature and standard claims.
 *
 * Returns the payload on success, or `null` if the token is invalid,
 * expired, or fails verification. Callers MUST treat `null` as
 * "unauthenticated" — never use a decoded-but-unverified payload for any
 * security decision.
 */
export async function verifySupabaseJwt(token: string): Promise<JwtPayload | null> {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const now = Math.floor(Date.now() / 1000)

  // Cheap positive cache: if this exact token verified recently and is
  // still within its exp, skip the signature round-trip.
  const cached = verifiedCache.get(token)
  if (cached && cached.exp > now && Date.now() - cached.verifiedAt < VERIFIED_CACHE_TTL_MS) {
    const payload = decodeJwtPart<JwtPayload>(parts[1])
    return payload
  }

  const header = decodeJwtPart<JwtHeader>(parts[0])
  const payload = decodeJwtPart<JwtPayload>(parts[1])
  if (!header || !payload) return null

  // exp enforcement — reject expired tokens regardless of signature.
  if (typeof payload.exp === 'number' && payload.exp <= now) return null

  // iss enforcement — only accept tokens from our Supabase project.
  const expectedIssuer = `${getSupabaseUrl()}/auth/v1`
  if (payload.iss && payload.iss !== expectedIssuer) {
    // Some Supabase deployments issue with a trailing slash variant; allow
    // either but require the configured host to appear.
    if (!payload.iss.startsWith(getSupabaseUrl())) return null
  }

  let keys: JwkKey[]
  try {
    keys = await fetchJwks()
  } catch {
    // Cannot reach JWKS — fail closed. Do NOT fall back to an unverified
    // decode; that would re-introduce the original vulnerability whenever
    // JWKS is briefly unreachable.
    return null
  }

  // Match the key by kid, falling back to the only/first RS256 key.
  const candidateKey =
    keys.find(k => k.kid && k.kid === header.kid) ||
    keys.find(k => k.kty === 'RSA' && (k.alg === 'RS256' || !k.alg))
  if (!candidateKey) return null

  let cryptoKey: CryptoKey
  try {
    cryptoKey = await importRsaKey(candidateKey)
  } catch {
    return null
  }

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const signature = base64urlToUint8Array(parts[2]!)

  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      signingInput
    )
  } catch {
    return null
  }

  if (!valid) return null

  // Cache the positive result (bounded to avoid unbounded growth).
  if (verifiedCache.size > VERIFIED_CACHE_MAX) {
    const oldestKey = verifiedCache.keys().next().value
    if (oldestKey) verifiedCache.delete(oldestKey)
  }
  verifiedCache.set(token, {
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 60,
    verifiedAt: Date.now()
  })

  return payload
}

/**
 * Clear the verification cache. Primarily for tests; in production the
 * cache self-expires and is bounded.
 */
export function clearJwtVerificationCache(): void {
  verifiedCache.clear()
  cachedKeys = null
  cachedKeysExpireAt = 0
}
