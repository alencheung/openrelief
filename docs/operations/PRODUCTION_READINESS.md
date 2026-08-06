# Production Readiness — Definition & Daily Evaluation

> **What "production ready" means for OpenRelief, how we measure it, and how
> the daily evaluation runs.** This is the canonical rubric. The automated
> harness in `scripts/readiness/` implements it; this document explains it.

OpenRelief is an **offline-first emergency coordination platform** — a
life-safety tool. That single fact raises the production-readiness bar above a
typical web app: a fake offline-sync dialog or a mis-computed trust score is
not a UX nitpick, it is a harm vector. The rubric below reflects that.

---

## TL;DR — the one-paragraph definition

OpenRelief is production-ready when **every user-facing story in `FEATURES.md`
is verified 🟢 PASS** against a live backend (happy path *and*
offline / degraded-network / trust-edge cases); the **trust, consensus,
offline-sync, and notification pipelines are provably correct and
non-exploitable**; the app's build, type-check, full unit test suite, e2e
suite, and Lighthouse budgets pass **as gating checks** on `main`; the deploy
config matches the as-built code with zero aspirational references and all
required secrets provisioned; the app degrades gracefully when Redis, Supabase,
GPS, or push is unavailable; and `FEATURES.md` itself has been re-verified
accurate within the current cycle.

---

## Why this rubric is shaped the way it is

A generic "is the plumbing built?" checklist undersells this project, because
**the plumbing is largely already built** — real RLS on all ~42 tables, real
rate limiting with a Redis fallback, real PostGIS spatial dispatch, a real
consensus engine, real Web Push (RFC 8291/8292), real Supabase Realtime, a
real offline sync executor. Readiness here is primarily a **verification +
integrity** problem on top of working infrastructure, not a build-out problem.

Three forces shape the weighting:

1. **Life-safety context** → trust/consensus/offline integrity bugs and any UI
   that lies about dispatch state are ship-blockers (D3, D6), weighted highest.
2. **The tracker has been unreliable** → `FEATURES.md` carried a stale
   "corrupted node_modules" claim that left 27 stories stranded at ⚪ PENDING
   long after the build/type-check/lint baseline went green. Tracker integrity
   (D8) and story re-verification (D1) are first-class dimensions, not
   afterthoughts.
3. **Deploy config has drifted** → `vercel.json` references ~60 env vars for
   infrastructure the code doesn't use (APNS, Twilio, AWS S3, OpenAI, NextAuth,
   SMTP, PostHog, GA, Mapbox). Operational readiness (D7) explicitly measures
   this drift.

---

## The 8 dimensions

### Tier 0 — Foundational gates (must be green *every* cycle)

If any Tier 0 gate is red, the cycle is red. Nothing else is evaluated.

| Gate | Check | Today |
|------|-------|-------|
| Lint clean | `npm run lint` | — |
| TypeScript clean | `npm run type-check` | ✅ |
| Production build succeeds | `npm run build` | ✅ |
| No `.env` secrets tracked | `git ls-files` (CI hard-gates this) | ✅ |
| CI workflow gates build+tsc+lint | `.github/workflows/ci.yml` | ✅ |

### Tier 1 — Ship criteria

#### D1 · Feature functionality _(ship-blocker)_
**Criterion:** Zero 🔴 FAIL or ⚫ DEAD stories among the 117 in `FEATURES.md`.
Every story is 🟢 PASS, verified against a *running* backend this cycle — not a
static file read.
**Signal:** `FEATURES.md` dashboard counts; each 🟢 carries a verification note.
**Today:** 0 🟢, 41 🔴/⚫/🟡 unfixed, 27 ⚪ PENDING (stranded by the false
"corrupted node_modules" premise).

#### D2 · End-to-end verification
**Criterion:** Playwright suite (5 specs × chromium/firefox/webkit/mobile-safari/
tablet/PWA projects) green **in CI**, gating. Each FEATURES.md story maps to an
e2e test or a documented manual-verification record.
**Ship-blocker:** red e2e on the core flow
*report → validate → geo-dispatch → consensus → respond*.
**Today:** e2e suite exists but is **not in CI** and not gating.

#### D3 · Data pipeline correctness & integrity _(ship-blocker, highest weight)_
The project's core differentiator. Must be correct *and* non-exploitable:
- No `|| 0.5`-style trust coercion (`trust_score ?? 0.5`, not `||`).
- Consensus voting idempotent (no vote-spam inflation, no re-vote errors).
- Client/server thresholds agree (one shared constant).
- Sybil resistance verified by the `sybilAttackPrevention` test.
- Offline queue: no phantom duplicates, no silent drops, real auto-sync — and
  **no fake-sync UI anywhere**.
- Notification dispatch cron actually fires and drains the queue.
- The "<100 ms spatial dispatch" claim is **benchmarked**, not assumed.

**Today:** at least four confirmed integrity bugs — trust coercion in 4 files,
non-idempotent consensus vote, threshold divergence (0.5 vs 0.6), and a
fake-sync component.

#### D4 · Security, privacy & compliance _(ship-blocker)_
Privacy is a stated core value, not a feature. Must have:
- RLS on **100% of tables**, verified by querying the *live* DB.
- `script-src` without `unsafe-inline`/`unsafe-eval` (or a time-boxed exception).
- The GCM auth-tag bypass in `cryptography.ts` fixed **or** the dead crypto
  code removed.
- Real key management (not in-memory `Map`s) for anything production-bound.
- Every GDPR surface (export, download, deletion, legal requests, transparency)
  wired to its real API — no `setTimeout` mocks, no commented-out fetches.
- `supabaseAdmin` guarded by `import "server-only"`.

**Today:** security infra (RLS, rate limiting, JWT, CSP, secrets hygiene) is
genuinely strong and recently hardened. But CSP allows `unsafe-inline`/`eval`,
the crypto primitive has an auth-tag flaw, privacy budgets are in-memory only,
and 5+ privacy UI components are mock. The privacy **backend** works; the
privacy **frontend** doesn't call it.

#### D5 · Code efficiency & performance
**Criterion:** Lighthouse budgets in `lighthouserc.json` met **as gating
checks** (perf ≥0.8 desktop / ≥0.7 mobile, a11y ≥0.9, PWA ≥0.8). First-load JS
has an explicit cap and no silent regression >5%. No source file over 500 lines
(see `architecture/FILE_SPLITTING_PLAN.md`).
**Today:** budgets *defined* but **not gating**; ~654 kB shared first-load JS.

#### D6 · Offline-first & resilience _(ship-blocker, domain-critical)_
This is a disaster tool. Must have:
- Full app shell cached by the service worker; `/offline` fallback works.
- Offline report queue integrity verified.
- An explicit **"what happens when X is down" matrix**, all green:
  Redis down · Supabase down · GPS unavailable · push unavailable · total offline.

**Today:** real SW + real queue executor exist, but `OfflineEmergencyReporting`
tells users their emergency was sent when it wasn't — a direct harm vector.

#### D7 · Operational & deployment readiness
**Criterion:** `vercel.json` and `.env.example` match the as-built code —
**zero aspirational references**. All required secrets documented and
provisioned. Migrations idempotent and applied; types regenerated. Sentry +
CSP violation reporting live. Surge/deploy runbooks exercised.
**Today:** `vercel.json` lists ~60 env vars; ~50 are not consumed by code.

#### D8 · Test-suite & tracker integrity
**Criterion:** Jest is **gating in CI** (no `continue-on-error`), full suite
green, coverage at the project's own thresholds (70% global / 85% map / 90%
supabase client). `FEATURES.md` re-verified accurate this cycle.
**Today:** tests are advisory in CI; `FEATURES.md` carried a stale claim about
the environment that stranded 27 stories.

---

## Weighting

Tier 1 dimensions are weighted (sum = 1.0). Ship-blockers weighted heaviest:

| ID | Dimension | Weight | Ship-blocker |
|----|-----------|-------|--------------|
| D1 | Feature functionality | 0.20 | ✅ |
| D2 | End-to-end verification | 0.10 | |
| D3 | Data pipeline integrity | **0.25** | ✅ |
| D4 | Security, privacy & compliance | 0.15 | ✅ |
| D5 | Code efficiency & performance | 0.05 | |
| D6 | Offline-first & resilience | 0.15 | ✅ |
| D7 | Operational & deployment readiness | 0.05 | |
| D8 | Test-suite & tracker integrity | 0.05 | |

The harness computes a 0–100 readiness score from these weights (green = 1,
yellow = 0.5, red = 0). **A high score with an open ship-blocker is still
not shippable** — the score is a trend indicator, the blocker flags are the
gate.

---

## How to run the evaluation

### Daily quick check (seconds)
```bash
npm run readiness:quick
```
Runs Tier 0 (lint+tsc+build skipped for speed — they ran in CI), the static
integrity/security/drift checks, and the `FEATURES.md` parse. Emits
`reports/readiness/dashboard.md` + `latest.json`.

### Full evaluation (minutes — runs build, tests, e2e)
```bash
npm run readiness
```
Adds: real `npm run build`, `npm test`, and (if wired) Playwright + Lighthouse.
This is what the daily automation runs.

### Guided fix session
```bash
npm run readiness:fix
```
Reads `reports/readiness/latest.json` and emits a prioritized P0–P5 work list
(`reports/readiness/fix-session.md`) with concrete file:line evidence and
verification commands for each task.

### Programmatic output
```bash
node scripts/readiness/evaluate.js --json   # machine-readable
```

---

## What gets checked automatically vs. what needs a human

The harness is deliberately split:

| Dimension | Automated | Human / manual |
|-----------|-----------|----------------|
| D0 Tier 0 | ✅ all five gates | — |
| D1 | parse `FEATURES.md` counts | ⚠️ **flipping stories to 🟢 requires runtime verification** |
| D2 | detect CI wiring; run e2e if wired | mapping stories → e2e tests |
| D3 | ✅ static grep of known anti-patterns | runtime confirmation of fix behavior |
| D4 | ✅ static flags (CSP, crypto, server-only) | ⚠️ **RLS-on-live-DB query, key-mgmt review** |
| D5 | file-size watchdog; budgets presence | Lighthouse run against a live preview |
| D6 | ✅ fake-sync regression; route/SW presence | ⚠️ **full degradation matrix (Redis/Supabase/GPS/push down)** |
| D7 | ✅ vercel.json ↔ code drift | secret provisioning in the target env |
| D8 | ✅ CI gating config; run Jest | — |

The ⚠️ rows are the agent's daily homework: the harness will tell you *what* to
verify, but the verification itself (running flows against a live backend,
querying the deployed DB for RLS, exercising the offline matrix) is a
deliberate act, not a grep.

---

## Output artifacts

All under `reports/readiness/` (gitignored — regenerated each run):

- `latest.json` — full structured result, consumed by `fix-session.js`.
- `dashboard.md` — rendered table for this run (human-readable).
- `history/<timestamp>.json` — archived snapshot for trend analysis.
- `fix-session.md` — prioritized work list for the current cycle.

---

## Baseline snapshot (2026-08-06)

| Dimension | Status | Headline |
|-----------|--------|----------|
| Tier 0 gates | 🟢 | build / tsc / lint baseline holds |
| D1 Feature functionality | 🔴 | 0/117 verified PASS |
| D2 E2E | 🔴 | not in CI, not gating |
| D3 Data pipeline integrity | 🔴 | 4+ confirmed integrity bugs |
| D4 Security & privacy | 🟡 | infra solid; crypto flaw + mock privacy UI |
| D5 Performance | 🟡 | budgets defined, not enforced |
| D6 Offline/resilience | 🔴 | fake-sync UI is a harm vector |
| D7 Deploy readiness | 🔴 | vercel.json config drift (~50 unused vars) |
| D8 Tests & tracker | 🔴 | advisory tests; stale FEATURES.md |

**Verdict:** not production-ready today, but closer than `FEATURES.md`'s
self-pessimism suggests. The gaps are concentrated and fixable — verification
and tightening, not a rebuild.

---

## Maintenance

- **When a D3/D4 anti-pattern is fixed in code**, update
  `scripts/readiness/config.js` so the checker stops flagging it (and will
  catch a regression). Each entry carries file:line evidence for re-verification.
- **When a new env var is genuinely consumed by code**, add it to
  `ENV_USED_BY_CODE` in `config.js` so D7 doesn't false-positive.
- **When a new integrity anti-pattern is discovered**, add it to
  `D3_ANTI_PATTERNS` so the harness catches it thereafter.
- The dimension weights in `config.js` are tunable — adjust if the team's risk
  tolerance changes, but keep ship-blocker dimensions above non-blockers.
