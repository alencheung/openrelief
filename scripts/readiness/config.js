'use strict'

/**
 * config.js — Production readiness harness configuration
 *
 * Single source of truth for:
 *   - the canonical FEATURES.md status emoji set
 *   - the as-built anti-patterns the integrity checks (D3) grep for
 *   - the config-drift allowlist for vercel.json / .env.example (D7)
 *   - the per-dimension weighting and ship-blocker flags
 *
 * Keep this file declarative. It is consumed by every checker in this dir.
 * Update it ONLY when a previously-documented gap is fixed in code, so the
 * checkers regress correctly. Each entry records file:line evidence at the
 * time of authorship so a future reader can re-verify.
 */

// --- Status emojis (must match FEATURES.md legend) -------------------------
const STATUS = {
  PASS: '🟢',
  PARTIAL: '🟡',
  FAIL: '🔴',
  DEAD: '⚫',
  PENDING: '⚪',
  FIXED: '🔧',
}
const ALL_STATUS = Object.values(STATUS)

// --- Dimension weights (sum = 1.0). Tunable. --------------------------------
// Ship-blockers (D1/D3/D6) weighted heaviest because this is a life-safety
// tool: a wrong trust score or a fake offline-sync dialog causes real harm.
const DIMENSIONS = [
  { id: 'D0', name: 'Foundational gates', tier: 0, weight: 0.0, shipBlocker: true },
  { id: 'D1', name: 'Feature functionality', tier: 1, weight: 0.2, shipBlocker: true },
  { id: 'D2', name: 'End-to-end verification', tier: 1, weight: 0.1, shipBlocker: false },
  { id: 'D3', name: 'Data pipeline integrity', tier: 1, weight: 0.25, shipBlocker: true },
  { id: 'D4', name: 'Security, privacy & compliance', tier: 1, weight: 0.15, shipBlocker: true },
  { id: 'D5', name: 'Code efficiency & performance', tier: 1, weight: 0.05, shipBlocker: false },
  { id: 'D6', name: 'Offline-first & resilience', tier: 1, weight: 0.15, shipBlocker: true },
  { id: 'D7', name: 'Operational & deployment readiness', tier: 1, weight: 0.05, shipBlocker: false },
  { id: 'D8', name: 'Test-suite & tracker integrity', tier: 1, weight: 0.05, shipBlocker: false },
]

// --- D3: confirmed integrity anti-patterns ----------------------------------
// Each entry: a human label, a grep regex, and the file:line evidence at the
// time this harness was authored. A match => the bug is still present.
const D3_ANTI_PATTERNS = [
  {
    id: 'trust-coercion',
    label: 'trust_score || 0.5 coerces a real 0 into 0.5',
    regex: /trust_score\s*\|\|\s*0\.5/,
    files: [
      'src/app/api/consensus/route.ts:218',
      'src/app/api/emergency/route.ts:368',
      'src/app/api/trust/route.ts:213',
      'src/app/api/trust/[userId]/route.ts:184',
    ],
  },
  {
    id: 'consensus-non-idempotent',
    label: 'consensus vote uses raw insert (not upsert/onConflict) → re-vote errors + inflates frequency',
    regex: /\.from\(['"]event_confirmations['"]\)\.insert\(/,
    files: ['src/app/api/consensus/route.ts:220'],
  },
  {
    id: 'threshold-divergence',
    label: 'dispute threshold diverges client (0.5) vs server (0.6)',
    // matches the divergent pair; checker reports divergence, not a single hit
    files: [
      'src/lib/security/trust-integration-helpers.ts:92 (server 0.6)',
      'src/store/trustStore.ts:166 (client 0.5)',
    ],
  },
  {
    id: 'offline-fake-sync',
    label: 'OfflineEmergencyReporting simulated-sync setTimeout (lies to user about dispatch)',
    regex: /setTimeout\(/,
    files: ['src/components/offline/OfflineEmergencyReporting.tsx:253'],
  },
]

// --- D4: security red flags --------------------------------------------------
const D4_FLAGS = [
  {
    id: 'csp-unsafe-eval',
    label: "CSP script-src allows 'unsafe-eval' (XSS escalation vector; not needed by Next.js prod builds)",
    // 'unsafe-inline' is a separately-tracked, documented time-boxed exception
    // (Next.js inline scripts require per-request nonces to remove it). We flag
    // 'unsafe-eval' specifically because it is removable now.
    regex: /script-src[^;]*'unsafe-eval'/,
    files: ['src/middleware.ts:517', 'vercel.json:262'],
  },
  {
    id: 'crypto-authtag-asymmetry',
    label: 'retrieveUserKey decrypts without setAuthTag (GCM integrity bypass)',
    // Look for decipher.final without a preceding setAuthTag in retrieveUserKey
    files: ['src/lib/privacy/cryptography.ts:222-223 (no setAuthTag before final)'],
  },
  {
    id: 'admin-no-server-only',
    label: 'supabaseAdmin client not guarded by import "server-only"',
    files: ['src/lib/supabase.ts:46 (TODO acknowledged)'],
  },
]

// --- D7: config-drift allowlist ---------------------------------------------
// Env vars in vercel.json build.env that the as-built code ACTUALLY consumes.
// Anything in vercel.json NOT in this list is aspirational drift.
const ENV_USED_BY_CODE = new Set([
  // Supabase (real)
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  // Redis / rate limiting (real)
  'REDIS_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  // Auth secrets (real)
  'JWT_SECRET',
  'AUTH_PEPPER',
  // Sentry (real)
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  // Web Push / VAPID (real)
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  // FCM (real, alert-dispatch worker)
  'FCM_PROJECT_ID',
  'FCM_ACCESS_TOKEN',
  // Edge dispatch signing (real)
  'DISPATCH_SIGNING_KEY',
  // Internal cron (real)
  'INTERNAL_CRON_KEY',
  'CRON_SECRET', // alias used in some places
  // Performance endpoint (real)
  'PERFORMANCE_API_KEY',
  // Maps (real)
  'NEXT_PUBLIC_MAPTILER_API_KEY',
  // App (real)
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_ENVIRONMENT', // 3 refs in src/
  // Runtime tuning (real — read by config/lib)
  'LOG_LEVEL', // 3 refs
  'DB_POOL_MIN', // 2 refs
  'DB_POOL_MAX', // 2 refs
  'EMERGENCY_ALERT_COOLDOWN_SECONDS',
  'EMERGENCY_MAX_ALERTS_PER_USER_PER_HOUR',
  'EMERGENCY_TRUST_THRESHOLD',
  'EMERGENCY_AUTO_EXPIRE_HOURS',
])

module.exports = {
  STATUS,
  ALL_STATUS,
  DIMENSIONS,
  D3_ANTI_PATTERNS,
  D4_FLAGS,
  ENV_USED_BY_CODE,
}
