'use strict'

/**
 * fix-session.js — Guided repair session driver
 *
 * Runs AFTER evaluate.js. Reads reports/readiness/latest.json, produces a
 * prioritized work list for the current cycle, and emits a checklist the
 * agent (or human) works through. It does NOT auto-apply code changes —
 * every fix is a deliberate, reviewable step.
 *
 * Priority order (life-safety weighted):
 *   P0  D3 integrity bugs + D6 fake-sync          ← can cause real-world harm
 *   P1  Tier 0 gate regressions                    ← blocks everything
 *   P2  D4 security red flags                      ← exploit risk
 *   P3  D1 🔴 FAIL stories in core areas           ← feature correctness
 *   P4  D7 config drift, D8 test gating            ← operational hygiene
 *   P5  D2 e2e coverage, D5 perf budgets           ← hardening
 *
 * Usage:
 *   node scripts/readiness/fix-session.js
 *   node scripts/readiness/fix-session.js --apply   # emits patch commands
 *
 * Output: reports/readiness/fix-session.md (also stdout)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const REPORT_DIR = path.join(ROOT, 'reports', 'readiness')
const LATEST = path.join(REPORT_DIR, 'latest.json')
const APPLY = process.argv.includes('--apply')

function read(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' })
  } catch {
    return null
  }
}

const r = read(LATEST)
if (!r) {
  process.stderr.write('No evaluation found. Run `node scripts/readiness/evaluate.js` first.\n')
  process.exit(2)
}

// --- priority builder -------------------------------------------------------
const tasks = []

// P0: D3 integrity + D6 fake-sync (ship blockers, harm potential)
// D3's offline-fake-sync finding is owned by D6 below (richer steps); skip it here to avoid dupes.
for (const f of r.dimensions.D3.findings.filter((x) => x.present && x.id !== 'offline-fake-sync')) {
  tasks.push({
    priority: 'P0',
    dimension: 'D3',
    title: `Fix: ${f.label}`,
    why: 'Core differentiator integrity bug. In a life-safety tool this can misroute, duplicate, or drop emergencies, or silently mis-score reporters.',
    evidence: f.evidence,
    steps: integrityFixSteps(f.id),
    verify: `node scripts/readiness/evaluate.js --quick (D3 should improve) && npm test -- --testPathPattern="(trust|consensus|sybil|sync)"`,
  })
}
if (r.dimensions.D6.fakeSyncPresent) {
  tasks.push({
    priority: 'P0',
    dimension: 'D6',
    title: 'Fix: OfflineEmergencyReporting fake-sync UI',
    why: 'Tells a user their emergency was dispatched when it was not. Direct harm vector during a disaster.',
    evidence: 'src/components/offline/OfflineEmergencyReporting.tsx setTimeout→synced',
    steps: [
      'Remove the setTimeout(…→"synced") block (~line 253).',
      'Drive the visible "Sync Status"/queue UI from the real offlineStore queue state (subscribe to store).',
      'Wire the "Sync Now" button to offlineStore.processQueue() (currently a console.log no-op).',
      'Keep the real sync-executor.ts path — it already does actual fetch() to /api/emergency.',
    ],
    verify: 'npm test -- --testPathPattern="sync" && node scripts/readiness/evaluate.js --quick (D6.fakeSyncPresent → false)',
  })
}

// P1: Tier 0 regressions
for (const c of r.tier0.filter((x) => x.status === 'red')) {
  tasks.push({
    priority: 'P1',
    dimension: 'D0',
    title: `Fix Tier 0 gate: ${c.label}`,
    why: 'Tier 0 red blocks all further evaluation. Nothing else matters until green.',
    evidence: c.detail,
    steps: ['Read the failing output above.', 'Apply the minimal fix.', `Re-run: the command that failed.`],
    verify: c.id === 'lint' ? 'npm run lint' : c.id === 'typecheck' ? 'npm run type-check' : c.id === 'build' ? 'npm run build' : 'git status',
  })
}

// P2: D4 security flags
for (const f of r.dimensions.D4.findings.filter((x) => x.present)) {
  tasks.push({
    priority: 'P2',
    dimension: 'D4',
    title: `Fix security flag: ${f.label}`,
    why: 'Exploit or integrity risk.',
    evidence: f.evidence,
    steps: securityFixSteps(f.id),
    verify: 'npm run test:security && node scripts/readiness/evaluate.js --quick (D4 flag cleared)',
  })
}

// P3: D1 core-area FAIL/DEAD
const coreAreas = ['F-003', 'F-004', 'F-006', 'F-007', 'F-008', 'F-010']
if (r.dimensions.D1.failing > 0) {
  tasks.push({
    priority: 'P3',
    dimension: 'D1',
    title: `Triage ${r.dimensions.D1.failing} FAIL/DEAD/PARTIAL stories (prioritize ${coreAreas.join(', ')})`,
    why: 'Core flows must be verified PASS against a live backend. Dead components are either reachable-wireable or removable.',
    evidence: `FEATURES.md: ${JSON.stringify(r.dimensions.D1.counts)}`,
    steps: [
      'Open FEATURES.md. For each 🔴/⚫ in a core area, read the F-id root-cause note.',
      'For ⚫ DEAD: decide wire-to-route vs remove. Wire one per cycle; do not bulk-delete.',
      'For 🔴 FAIL: apply the documented fix or write a test that reproduces it first.',
      `Re-verify the 27 ⚪ PENDING stories — the "corrupted node_modules" premise is FALSE (build/tsc/lint are green). Flip them to 🟢 or 🔴 based on real runtime behavior.`,
    ],
    verify: 'node scripts/readiness/evaluate.js --quick (D1 failing count should drop)',
  })
}

// P4: D7 config drift
if (r.dimensions.D7.driftCount > 0) {
  tasks.push({
    priority: 'P4',
    dimension: 'D7',
    title: `Remove ${r.dimensions.D7.driftCount} aspirational env vars from vercel.json`,
    why: 'Drift between deploy config and code misleads operators and auditors. Several reference unused infra (APNS, Twilio, AWS S3, OpenAI, NextAuth, SMTP, PostHog, GA, Mapbox).',
    evidence: r.dimensions.D7.drift.slice(0, 15).join(', ') + (r.dimensions.D7.driftCount > 15 ? ' …' : ''),
    steps: [
      'For each drifted var: grep the codebase. If genuinely unused, delete its entry from vercel.json build.env.',
      'If it IS used but missing from scripts/readiness/config.js ENV_USED_BY_CODE, add it there instead.',
      'Keep .env.example authoritative for what developers must set locally.',
    ],
    verify: 'node scripts/readiness/evaluate.js --quick (D7.driftCount → lower)',
  })
}

// P4: D8 — make tests gating
if (r.dimensions.D8.testAdvisory) {
  tasks.push({
    priority: 'P4',
    dimension: 'D8',
    title: 'Make Jest gating in CI (remove continue-on-error)',
    why: 'Advisory tests let regressions land on main silently.',
    evidence: '.github/workflows/ci.yml line ~38',
    steps: [
      'First: get `npm test` fully green locally (fix the known form/map test debt the comment references).',
      'Then: remove `continue-on-error: true` from the test step in ci.yml.',
      'Optionally: add the Playwright e2e step to CI at the same time (lifts D2).',
    ],
    verify: 'npm test && git diff .github/workflows/ci.yml',
  })
}

// P5: D2 e2e coverage
if (!r.dimensions.D2.e2eInCI) {
  tasks.push({
    priority: 'P5',
    dimension: 'D2',
    title: 'Add Playwright e2e as a CI gating step',
    why: 'e2e suite exists (5 specs × 8 projects) but is not enforced.',
    evidence: '.github/workflows/ci.yml has no playwright step',
    steps: [
      'Add a CI job: npm run test:e2e:playwright:install && npm run test:e2e:playwright.',
      'Use `npx playwright show-trace` artifacts on failure.',
      'Map each FEATURES.md core story to an e2e test (add specs where gaps exist).',
    ],
    verify: 'open PR; CI e2e job runs and passes',
  })
}

// P5: D5 perf budgets gating
if (r.dimensions.D5.budgetsDefined && !r.dimensions.D5.lighthouseInCI) {
  tasks.push({
    priority: 'P5',
    dimension: 'D5',
    title: 'Enforce Lighthouse budgets in CI',
    why: 'Budgets are defined in lighthouserc.json but not enforced; perf can regress silently.',
    evidence: 'lighthouserc.json present; no lhci step in ci.yml',
    steps: ['Add an lhci autorun step to CI against a built preview.', 'Start with warn-level, promote to error once green.'],
    verify: 'CI lighthouse step present and passing',
  })
}

// --- step templates ---------------------------------------------------------
function integrityFixSteps(id) {
  switch (id) {
    case 'trust-coercion':
      return [
        'Replace every `trust_score || 0.5` with `?? 0.5` (nullish coalescing) OR explicit null handling.',
        'A legitimate trust_score of 0 must NOT be coerced to 0.5.',
        'Files: src/app/api/consensus/route.ts:218, emergency/route.ts:368, trust/route.ts:213, trust/[userId]/route.ts:184.',
        'Add a unit test: a user with trust_score === 0 is reported as 0, not 0.5.',
      ]
    case 'consensus-non-idempotent':
      return [
        'Change the raw .insert() at consensus/route.ts:220 to .upsert() with onConflict(\'(event_id,user_id)\').',
        'Stop bumping contributionFrequency on re-vote (trustStore.ts:574 path) — only bump on first confirmation.',
        'Add a test: voting twice on the same event does not double-count.',
      ]
    case 'threshold-divergence':
      return [
        'Pick ONE threshold (recommend 0.6, matching the server/consensus-processor).',
        'Update src/store/trustStore.ts:166 `disputing: 0.5` → 0.6 (or make both read from a shared constant).',
        'Extract the threshold to a single shared constant imported by both client and server.',
        'Update the trustStore.test.ts:677,683 fixtures accordingly.',
      ]
    default:
      return ['See FEATURES.md root-cause note for this F-id; apply the documented fix.']
  }
}
function securityFixSteps(id) {
  switch (id) {
    case 'csp-unsafe-inline-eval':
      return [
        "Highest value: implement per-request nonces for script-src and drop 'unsafe-inline'.",
        "At minimum: drop 'unsafe-eval' (rarely needed in prod) and audit what breaks.",
        'Files: src/middleware.ts:514, vercel.json:262.',
      ]
    case 'crypto-authtag-asymmetry':
      return [
        'In cryptography.ts retrieveUserKey (~line 222): store the auth tag alongside the encrypted key and call decipher.setAuthTag() before .final().',
        'If nothing in the app actually consumes retrieveUserKey/encryptUserData, prefer DELETING the dead crypto code over shipping a broken primitive.',
      ]
    case 'admin-no-server-only':
      return [
        'Split src/lib/supabase.ts: keep the browser anon client there; move supabaseAdmin to a new src/lib/supabase/admin.ts that begins with `import "server-only"`.',
        'Update all server-side imports of supabaseAdmin to the new path.',
      ]
    default:
      return ['Apply the documented fix; add a regression test.']
  }
}

// --- render -----------------------------------------------------------------
const lines = []
lines.push(`# Production Readiness Fix Session — ${new Date().toISOString()}`)
lines.push('')
lines.push(`Based on: reports/readiness/latest.json (git \`${r.gitSha}\`, readiness ${r.readiness}%)`)
lines.push('')
lines.push('Work top-to-bottom. **P0 is non-negotiable for a life-safety tool** — a wrong trust score or a fake offline-sync dialog can cause harm. Do not start P3+ while P0/P1 are open.')
lines.push('')
if (tasks.length === 0) {
  lines.push('🎉 No automated findings. Spend this cycle on the human-verification backlog (D1 stories → 🟢) and manual resilience testing (D6 degradation matrix).')
} else {
  const order = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']
  for (const p of order) {
    const group = tasks.filter((t) => t.priority === p)
    if (!group.length) continue
    lines.push(`## ${p}`)
    lines.push('')
    for (const t of group) {
      lines.push(`### [${t.priority}] ${t.dimension} — ${t.title}`)
      lines.push(`**Why:** ${t.why}`)
      lines.push(`**Evidence:** ${t.evidence}`)
      lines.push('**Steps:**')
      for (const s of t.steps) lines.push(`- ${s}`)
      lines.push(`**Verify:** \`${t.verify}\``)
      lines.push('')
    }
  }
}
lines.push('---')
lines.push('_After applying fixes: re-run `node scripts/readiness/evaluate.js`, then commit with a conventional message (`fix(trust): …`, `fix(offline): …`). Do not commit a red Tier 0._')

const out = lines.join('\n')
fs.writeFileSync(path.join(REPORT_DIR, 'fix-session.md'), out)
process.stdout.write(out + '\n')
