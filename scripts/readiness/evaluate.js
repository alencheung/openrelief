'use strict'

/**
 * evaluate.js — Production readiness evaluation engine
 *
 * Runs every automated dimension (Tier 0 + D2/D3/D5/D7/D8 automated parts)
 * and emits a structured report + a rendered dashboard table.
 *
 * Usage:
 *   node scripts/readiness/evaluate.js            # full run (slow: runs build/tests)
 *   node scripts/readiness/evaluate.js --quick    # skip build & jest & e2e & lighthouse
 *   node scripts/readiness/evaluate.js --no-build
 *   node scripts/readiness/evaluate.js --json     # machine output
 *
 * Exit code: 0 if all Tier-0 gates green, 1 otherwise. Dimension failures
 * never change the exit code (they're diagnostic) EXCEPT Tier 0.
 *
 * Output artifacts:
 *   reports/readiness/latest.json   — full structured result
 *   reports/readiness/dashboard.md  — rendered table (this run)
 *   reports/readiness/history/<timestamp>.json — archived snapshot
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const {
  STATUS,
  ALL_STATUS,
  DIMENSIONS,
  D3_ANTI_PATTERNS,
  D4_FLAGS,
  ENV_USED_BY_CODE,
} = require('./config')

const ROOT = path.resolve(__dirname, '..', '..')
const REPORT_DIR = path.join(ROOT, 'reports', 'readiness')
const HISTORY_DIR = path.join(REPORT_DIR, 'history')

// --- CLI flags --------------------------------------------------------------
const argv = process.argv.slice(2)
const flag = (f) => argv.includes(f)
const QUICK = flag('--quick')
const SKIP_BUILD = QUICK || flag('--no-build')
const SKIP_TESTS = QUICK || flag('--no-tests')
const SKIP_E2E = QUICK || flag('--no-e2e')
const SKIP_LIGHTHOUSE = QUICK || flag('--no-lighthouse')
const JSON_OUT = flag('--json')

// --- helpers ----------------------------------------------------------------
function read(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

function run(cmd, opts = {}) {
  try {
    return {
      ok: true,
      stdout: execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }),
    }
  } catch (e) {
    return { ok: false, stdout: (e.stdout || '') + (e.stderr || ''), code: e.status }
  }
}

function grepCount(regex, files) {
  let hits = []
  for (const f of files) {
    const content = read(path.join(ROOT, f))
    if (content === null) {
      hits.push({ file: f, missing: true })
      continue
    }
    const m = content.match(regex)
    if (m) hits.push({ file: f, matches: m.length })
  }
  return hits
}

function ensureDirs() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.mkdirSync(HISTORY_DIR, { recursive: true })
}

// --- individual checks ------------------------------------------------------

// D0.1 lint, D0.2 typecheck, D0.3 build, D0.4 secrets, D0.5 CI config
function checkTier0() {
  const checks = []

  // lint
  if (!SKIP_BUILD) {
    const lint = run('npm run lint')
    checks.push({
      id: 'lint',
      label: 'ESLint clean',
      status: lint.ok ? 'green' : 'red',
      detail: lint.ok ? 'ok' : `exit ${lint.code}`,
    })
  } else {
    checks.push({ id: 'lint', label: 'ESLint clean', status: 'skipped', detail: '--quick/--no-build' })
  }

  // type-check
  const tsc = run('npm run type-check')
  checks.push({
    id: 'typecheck',
    label: 'TypeScript clean',
    status: tsc.ok ? 'green' : 'red',
    detail: tsc.ok ? 'ok' : `exit ${tsc.code}`,
  })

  // build
  if (!SKIP_BUILD) {
    const build = run('npm run build', { maxBuffer: 20 * 1024 * 1024 })
    checks.push({
      id: 'build',
      label: 'Production build succeeds',
      status: build.ok ? 'green' : 'red',
      detail: build.ok ? 'ok' : `exit ${build.code}`,
    })
  } else {
    checks.push({ id: 'build', label: 'Production build succeeds', status: 'skipped', detail: '--quick' })
  }

  // secrets: .env.local etc must be untracked
  const tracked = run('git ls-files').stdout
  const leakedEnvs = tracked
    .split('\n')
    .filter((l) => /^\.env(\.|$)/.test(l) && !/^\.env\.example$/.test(l))
  checks.push({
    id: 'secrets',
    label: 'No .env secrets tracked',
    status: leakedEnvs.length === 0 ? 'green' : 'red',
    detail: leakedEnvs.length ? `LEAKED: ${leakedEnvs.join(', ')}` : 'ok',
  })

  // CI workflow exists & gates build+tsc+lint
  const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml'))
  const ciGatesBuild = ci && /npm run build/.test(ci)
  checks.push({
    id: 'ci-config',
    label: 'CI workflow present & gates build',
    status: ciGatesBuild ? 'green' : 'red',
    detail: ciGatesBuild ? 'ok' : 'missing or no build step',
  })

  return checks
}

// D1 — parse FEATURES.md dashboard
function checkD1() {
  const features = read(path.join(ROOT, 'FEATURES.md')) || ''
  // Count status emojis in the body (each story has one Status line)
  const counts = {}
  for (const s of ALL_STATUS) counts[s] = 0
  const statusLines = features.match(/- \*\*Status:\*\*\s*[🟢🟡🔴⚫⚪🔧]/g) || []
  for (const line of statusLines) {
    for (const s of ALL_STATUS) if (line.includes(s)) counts[s]++
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const passing = counts[STATUS.PASS]
  const failing = counts[STATUS.FAIL] + counts[STATUS.DEAD] + counts[STATUS.PARTIAL]
  const pending = counts[STATUS.PENDING]

  // green only when no FAIL/DEAD/PARTIAL and no PENDING (all verified)
  let status = 'green'
  if (failing > 0) status = 'red'
  else if (pending > 0) status = 'yellow'

  return {
    status,
    counts,
    total,
    passing,
    failing,
    pending,
    detail: `${passing}/${total} PASS · ${failing} FAIL/DEAD/PARTIAL · ${pending} PENDING`,
    evidence:
      'Counts parsed from FEATURES.md. NOTE: human verification required to flip stories to 🟢 — the parse cannot verify runtime behavior.',
  }
}

// D2 — e2e in CI & green. Automated part: is Playwright wired into CI?
function checkD2() {
  const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml')) || ''
  const playwrightConfig = read(path.join(ROOT, 'playwright.config.ts')) || ''
  const e2eInCI = /playwright/.test(ci) && /test:e2e/.test(ci)
  const e2eSpecs = (playwrightConfig.match(/\.spec\.\{ts,js\}/) ? 1 : 0) && fs.existsSync(path.join(ROOT, 'tests', 'e2e'))

  let result = {
    status: 'yellow',
    detail: '',
    e2eInCI,
    e2eSpecsExist: !!e2eSpecs,
    evidence: 'e2e suite exists but is not a gating CI step today.',
  }

  if (e2eInCI && !SKIP_E2E) {
    // actually run e2e if it's wired
    const e2e = run('npm run test:e2e:playwright', { maxBuffer: 20 * 1024 * 1024 })
    result.status = e2e.ok ? 'green' : 'red'
    result.detail = e2e.ok ? 'e2e green' : `e2e failed (exit ${e2e.code})`
  } else if (!e2eInCI) {
    result.status = 'red'
    result.detail = 'Playwright NOT in CI gating workflow'
  }
  return result
}

// D3 — integrity anti-patterns
function checkD3() {
  const findings = []
  for (const ap of D3_ANTI_PATTERNS) {
    if (ap.id === 'threshold-divergence') {
      const server = read(path.join(ROOT, 'src/lib/security/trust-integration-helpers.ts')) || ''
      const client = read(path.join(ROOT, 'src/store/trustStore.ts')) || ''
      const serverHas = /consensusThreshold:\s*0\.6/.test(server)
      const clientHas = /disputing:\s*0\.5/.test(client)
      const divergent = serverHas && clientHas
      findings.push({
        id: ap.id,
        label: ap.label,
        present: divergent,
        evidence: divergent ? ap.files.join(' · ') : 'reconciled',
      })
    } else if (ap.id === 'consensus-non-idempotent') {
      // The vote path is idempotent if it checks for an existing confirmation
      // BEFORE inserting (update-on-exist). A raw insert without that guard
      // is the real bug; an insert preceded by a select+update pre-check is safe.
      const consensus = read(path.join(ROOT, 'src/app/api/consensus/route.ts')) || ''
      const hasInsert = ap.regex.test(consensus)
      const hasPrecheck = /existingConfirmation|\.select\(['"]id[^)]+\)\.eq\(['"]event_id/.test(consensus)
      const present = hasInsert && !hasPrecheck
      findings.push({
        id: ap.id,
        label: ap.label,
        present,
        evidence: present
          ? 'raw insert with no existing-confirmation pre-check'
          : 'insert guarded by existing-confirmation pre-check (update-on-exist)',
      })
    } else {
      const hits = grepCount(ap.regex, ap.files.map((f) => f.split(':')[0]))
      const present = hits.some((h) => h.matches || h.missing === false)
      findings.push({
        id: ap.id,
        label: ap.label,
        present,
        evidence: hits
          .map((h) => (h.missing ? `${h.file} (file missing)` : h.matches ? `${h.file} (${h.matches} match)` : `${h.file} (clean)`))
          .join(' · '),
      })
    }
  }
  const presentCount = findings.filter((f) => f.present).length
  return {
    status: presentCount === 0 ? 'green' : 'red', // any present = red (ship blocker)
    findings,
    detail: `${findings.length - presentCount}/${findings.length} integrity bugs fixed · ${presentCount} still present`,
    evidence: 'Static grep of as-built anti-patterns. Some need runtime confirmation.',
  }
}

// D4 — security flags (automated subset; RLS DB query is manual)
function checkD4() {
  const findings = []
  for (const fl of D4_FLAGS) {
    if (fl.id === 'crypto-authtag-asymmetry') {
      const crypto = read(path.join(ROOT, 'src/lib/privacy/cryptography.ts')) || ''
      // retrieveUserKey function body — look for decipher without setAuthTag
      const fnMatch = crypto.match(/function retrieveUserKey[\s\S]*?^}/m)
      const fnBody = fnMatch ? fnMatch[0] : ''
      const hasFinal = /\.final\(/.test(fnBody)
      const hasAuthTag = /setAuthTag/.test(fnBody)
      const present = hasFinal && !hasAuthTag
      findings.push({ id: fl.id, label: fl.label, present, evidence: fl.files.join(' · ') })
    } else if (fl.id === 'admin-no-server-only') {
      // Guard is satisfied by EITHER a real `import 'server-only'` OR a runtime
      // throw-on-browser-bundle check in a dedicated admin module. The
      // dedicated module (src/lib/supabase/admin.ts) is preferred because it
      // isolates the service-role client from the browser-safe anon client.
      const adminModule = read(path.join(ROOT, 'src/lib/supabase/admin.ts')) || ''
      const hasServerOnlyImport = /^import\s+['"]server-only['"]/m.test(adminModule)
      const hasRuntimeGuard = /typeof window\s*!==\s*['"]undefined['"]/.test(adminModule) && /throw/.test(adminModule)
      const guarded = adminModule && (hasServerOnlyImport || hasRuntimeGuard)
      findings.push({
        id: fl.id,
        label: fl.label,
        present: !guarded,
        evidence: guarded
          ? 'guarded by src/lib/supabase/admin.ts'
          : 'no server-only guard found in a dedicated admin module',
      })
    } else if (fl.regex) {
      const files = fl.files.map((f) => f.split(':')[0])
      const hits = grepCount(fl.regex, files)
      const present = hits.some((h) => h.matches)
      findings.push({
        id: fl.id,
        label: fl.label,
        present,
        evidence: hits.map((h) => `${h.file} (${h.matches || 0})`).join(' · '),
      })
    }
  }
  const presentCount = findings.filter((f) => f.present).length
  // D4 is yellow until the manual RLS DB audit is also run; red if any flag present
  return {
    status: presentCount > 0 ? 'red' : 'yellow',
    findings,
    detail: `${findings.length - presentCount}/${findings.length} flags cleared · RLS DB audit pending (manual)`,
    evidence: 'Static checks only. RLS-on-live-DB + key-management review must be run manually.',
  }
}

// D5 — performance budgets. Lighthouse not run by default (needs dev server).
function checkD5() {
  const lighthouserc = read(path.join(ROOT, 'lighthouserc.json')) || ''
  const budgetsDefined = /categories:performance/.test(lighthouserc)
  const inCI = false // not wired into ci.yml

  // file-size watchdog: files over 500 lines
  const overFiles = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const lines = read(full)
        if (lines && lines.split('\n').length > 500) {
          overFiles.push(`${path.relative(ROOT, full)} (${lines.split('\n').length})`)
        }
      }
    }
  }
  walk(path.join(ROOT, 'src'))

  let status = 'green'
  if (!budgetsDefined) status = 'red'
  else if (!inCI) status = 'yellow'
  if (overFiles.length > 5) status = 'yellow'

  return {
    status,
    budgetsDefined,
    lighthouseInCI: inCI,
    overFiles,
    detail: `budgets ${budgetsDefined ? 'defined' : 'MISSING'} · Lighthouse ${inCI ? 'gating' : 'not in CI'} · ${overFiles.length} files >500 lines`,
    evidence: overFiles.slice(0, 5),
  }
}

// D6 — offline/resilience. Automated: SW + offline route exist; no fake-sync.
function checkD6() {
  const sw = fs.existsSync(path.join(ROOT, 'public', 'sw.js'))
  const offlineRoute = fs.existsSync(path.join(ROOT, 'src/app/offline/page.tsx'))
  const offlineEmergency = fs.existsSync(path.join(ROOT, 'src/app/offline/emergency/page.tsx'))
  // fake-sync regression check: detect a setTimeout that flips a report
  // status to 'synced' WITHOUT a fetch/server call. The real sync-executor
  // path uses fetch(); this component historically simulated it locally.
  const offlineComp = read(path.join(ROOT, 'src/components/offline/OfflineEmergencyReporting.tsx')) || ''
  // A setTimeout block whose body references 'synced' but not 'fetch' is a fake sync.
  const fakeSync = /setTimeout\([\s\S]*?status:\s*'synced'[\s\S]*?\)/.test(offlineComp)
    && !/setTimeout\([\s\S]*?fetch\([\s\S]*?synced/.test(offlineComp)

  let status = 'green'
  const missing = []
  if (!sw) missing.push('public/sw.js')
  if (!offlineRoute) missing.push('/offline route')
  if (!offlineEmergency) missing.push('/offline/emergency route')
  if (missing.length) status = 'red'
  if (fakeSync) status = 'red'

  return {
    status,
    sw,
    offlineRoute,
    offlineEmergency,
    fakeSyncPresent: fakeSync,
    detail: `${missing.length ? 'MISSING: ' + missing.join(', ') : 'offline routes present'} · fake-sync UI ${fakeSync ? 'PRESENT (blocker)' : 'absent'}`,
    evidence: 'Full degradation matrix (Redis/Supabase/GPS/push down) needs manual or e2e verification.',
  }
}

// D7 — config drift
function checkD7() {
  const vercel = read(path.join(ROOT, 'vercel.json')) || ''
  const envBlock = vercel.match(/"env":\s*\{([\s\S]*?)\}/)
  const buildEnvBlock = vercel.match(/"build":\s*\{[\s\S]*?"env":\s*\{([\s\S]*?)\}/)
  const blocks = [envBlock, buildEnvBlock].filter(Boolean)
  const declared = new Set()
  for (const b of blocks) {
    const matches = b[1].matchAll(/"([A-Z_][A-Z0-9_]*)"/g)
    for (const m of matches) declared.add(m[1])
  }
  const drift = [...declared].filter((v) => !ENV_USED_BY_CODE.has(v)).sort()

  let status = 'green'
  if (drift.length > 20) status = 'red'
  else if (drift.length > 0) status = 'yellow'

  return {
    status,
    declaredCount: declared.size,
    driftCount: drift.length,
    drift,
    detail: `${declared.size - drift.length}/${declared.size} vercel.json env vars match as-built code · ${drift.length} aspirational`,
    evidence: drift.slice(0, 10),
  }
}

// D8 — tests gating & FEATURES.md freshness
function checkD8() {
  const ci = read(path.join(ROOT, '.github', 'workflows', 'ci.yml')) || ''
  // Jest step with continue-on-error → advisory
  const testAdvisory = /continue-on-error:\s*true[\s\S]{0,400}npm run test/.test(ci) || /npm run test(?:coverage)?[\s\S]{0,50}continue-on-error/.test(ci)

  let result = {
    status: 'yellow',
    testAdvisory,
    detail: '',
    evidence: '',
  }

  if (!SKIP_TESTS) {
    const tests = run('npm test', { maxBuffer: 30 * 1024 * 1024 })
    result.testsGreen = tests.ok
    if (testAdvisory) {
      result.status = tests.ok ? 'yellow' : 'red'
      result.detail = `Jest ${tests.ok ? 'green' : 'RED'} but ADVISORY in CI (continue-on-error) — not gating`
    } else {
      result.status = tests.ok ? 'green' : 'red'
      result.detail = `Jest ${tests.ok ? 'green' : 'RED'} and gating`
    }
  } else {
    result.status = testAdvisory ? 'red' : 'yellow'
    result.detail = `skipped (--quick). Jest is ${testAdvisory ? 'ADVISORY' : 'gating'} per CI config`
  }
  return result
}

// --- orchestration ----------------------------------------------------------
function evaluate() {
  ensureDirs()
  const startedAt = new Date().toISOString()

  const tier0 = checkTier0()
  const tier0Green = tier0.every((c) => c.status === 'green' || c.status === 'skipped')

  const d1 = checkD1()
  const d2 = checkD2()
  const d3 = checkD3()
  const d4 = checkD4()
  const d5 = checkD5()
  const d6 = checkD6()
  const d7 = checkD7()
  const d8 = checkD8()

  const dimensionResults = { D1: d1, D2: d2, D3: d3, D4: d4, D5: d5, D6: d6, D7: d7, D8: d8 }

  // weighted readiness score (only T1 dimensions)
  let score = 0
  let weightedTotal = 0
  for (const d of DIMENSIONS.filter((x) => x.tier === 1)) {
    const r = dimensionResults[d.id]
    const val = r.status === 'green' ? 1 : r.status === 'yellow' ? 0.5 : 0
    score += val * d.weight
    weightedTotal += d.weight
  }
  const readiness = Math.round((score / weightedTotal) * 100)

  const result = {
    schema: 'openrelief.readiness.v1',
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: QUICK ? 'quick' : 'full',
    tier0Green,
    readiness,
    tier0,
    dimensions: dimensionResults,
    gitSha: run('git rev-parse --short HEAD').stdout.trim(),
    gitDirty: run('git status --porcelain').stdout.trim().length > 0,
  }

  return result
}

// --- rendering --------------------------------------------------------------
const SYMBOL = { green: '🟢', yellow: '🟡', red: '🔴', skipped: '⚪' }

function renderDashboard(r) {
  const lines = []
  lines.push(`# OpenRelief Production Readiness — ${r.startedAt}`)
  lines.push('')
  lines.push(`**Readiness score: ${r.readiness}%** · Git: \`${r.gitSha}\`${r.gitDirty ? ' (dirty)' : ''} · Mode: \`${r.mode}\``)
  lines.push('')
  lines.push('> Tier 0 gates must be green before any dimension is meaningful. D1/D3/D6/D4 are ship-blockers for a life-safety tool.')
  lines.push('')
  lines.push('## Tier 0 — Foundational gates')
  lines.push('')
  lines.push('| Gate | Status | Detail |')
  lines.push('|------|--------|--------|')
  for (const c of r.tier0) {
    lines.push(`| ${c.label} | ${SYMBOL[c.status] || c.status} | ${c.detail} |`)
  }
  lines.push(`| **Tier 0 overall** | ${r.tier0Green ? '🟢 green' : '🔴 RED'} | ${r.tier0Green ? 'proceed to dimensions' : 'fix gates first'} |`)
  lines.push('')
  lines.push('## Tier 1 — Dimensions')
  lines.push('')
  lines.push('| ID | Dimension | Status | Detail |')
  lines.push('|----|-----------|--------|--------|')
  for (const d of DIMENSIONS.filter((x) => x.tier === 1)) {
    const res = r.dimensions[d.id]
    lines.push(`| ${d.id} | ${d.name} | ${SYMBOL[res.status] || res.status} | ${res.detail} |`)
  }
  lines.push('')
  lines.push('## Detail')
  lines.push('')
  lines.push('### D1 — Feature functionality (FEATURES.md)')
  lines.push('```')
  lines.push(JSON.stringify(r.dimensions.D1.counts, null, 0))
  lines.push('```')
  lines.push(`_Human verification required to flip stories to ${STATUS.PASS}._`)
  lines.push('')
  lines.push('### D3 — Data pipeline integrity')
  for (const f of r.dimensions.D3.findings) {
    lines.push(`- [${f.present ? 'x' : ' '}] ${f.present ? '🔴' : '🟢'} **${f.label}** — ${f.evidence}`)
  }
  lines.push('')
  lines.push('### D4 — Security flags')
  for (const f of r.dimensions.D4.findings) {
    lines.push(`- [${f.present ? 'x' : ' ' }] ${f.present ? '🔴' : '🟢'} **${f.label}** — ${f.evidence}`)
  }
  lines.push('')
  lines.push('### D6 — Offline & resilience')
  lines.push(`- fake-sync UI present: ${r.dimensions.D6.fakeSyncPresent ? '🔴 YES (ship blocker)' : '🟢 no'}`)
  lines.push('')
  lines.push('### D7 — Config drift (vercel.json env vars not consumed by code)')
  if (r.dimensions.D7.drift.length) {
    lines.push('```\n' + r.dimensions.D7.drift.join('\n') + '\n```')
  } else {
    lines.push('_none_')
  }
  lines.push('')
  return lines.join('\n')
}

// --- main -------------------------------------------------------------------
const result = evaluate()
fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), JSON.stringify(result, null, 2))
fs.writeFileSync(path.join(HISTORY_DIR, `${result.startedAt.replace(/[:.]/g, '-')}.json`), JSON.stringify(result, null, 2))
fs.writeFileSync(path.join(REPORT_DIR, 'dashboard.md'), renderDashboard(result))

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(result))
} else {
  process.stdout.write(renderDashboard(result) + '\n')
}

process.exit(result.tier0Green ? 0 : 1)
