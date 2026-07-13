# Deployment Overview

> This consolidates the former `deployment/README.md` and
> `deployment/deployment-guide.md`, updated against the **actual** repo
> configuration (`vercel.json`, `src/edge/wrangler.production.toml`,
> `.github/workflows/ci.yml`, `package.json`).

OpenRelief deploys across three managed platforms plus a monitoring layer:

| Layer | Platform | Entry point |
| --- | --- | --- |
| Frontend (Next.js) | **Vercel** | `vercel.json` (root) |
| Database + Auth + Realtime | **Supabase** | `supabase/migrations/` |
| Edge dispatch Worker | **Cloudflare Workers** | `src/edge/wrangler.production.toml` |
| Rate limiting / cache | **Upstash Redis** | env vars |
| Error monitoring | **Sentry** | `src/instrumentation*.ts` |
| CI | **GitHub Actions** | `.github/workflows/ci.yml` |

## Prerequisites

**Accounts:** Vercel, Supabase, Cloudflare, Upstash (optional), Sentry
(optional), GitHub.

**Local tools (Node 20 — matches CI):**

- Node.js **20** (the CI pins `node-version: 20`; older docs saying "18+" are stale)
- Vercel CLI: `npm i -g vercel`
- Supabase CLI: `npm i -g supabase`
- Wrangler CLI: `npm i -g wrangler`
- Docker (for local Supabase via `supabase start`)

## Environment configuration

The authoritative list of variables is [`.env.example`](../../.env.example). Set
per-environment values in each platform's dashboard (Vercel Environment
selector, Supabase, `wrangler secret`) — **do not commit real secrets**.

### Required

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase public (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server-only) | Bypasses RLS — never expose to client |

### Optional but recommended

| Group | Variables | Purpose |
| --- | --- | --- |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or `REDIS_URL` for self-hosted) | Rate limiting + session cache. Without these, middleware falls back to in-memory limiting. |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Error monitoring + source-map upload |
| Web Push (VAPID) | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push delivery |
| FCM (Android push) | `FCM_PROJECT_ID`, `FCM_ACCESS_TOKEN` | Firebase HTTP v1 API |
| Maps | `NEXT_PUBLIC_MAPTILER_API_KEY` | Map tiles |
| Security | `AUTH_PEPPER`, `JWT_SECRET`, `INTERNAL_CRON_KEY`, `DISPATCH_SIGNING_KEY`, `PERFORMANCE_API_KEY` | Pepper, JWT signing, cron/signature protection |
| App | `NEXT_PUBLIC_APP_URL` | Canonical app URL |

> **Note:** Some older docs referenced `FCM_SERVER_KEY`, `OPENAI_API_KEY`,
> `DATABASE_URL`, `NEXT_PUBLIC_ENABLE_ANALYTICS`, `NEXTAUTH_*`, etc. These are
> not in `.env.example` and appear to be legacy/unused on the frontend. The
> Cloudflare Worker does retain a few older secret names (e.g.
> `FCM_SERVER_KEY`) in `wrangler.production.toml` — provision those via
> `wrangler secret put`, not via Vercel.

## Deploying the frontend (Vercel)

`vercel.json` (root) configures the deployment: framework `nextjs`,
`npm ci` install, `npm run build`, multi-region (`iad1, sfo1, hnd1, fra1, lhr1,
sin1, syd1`), with security headers, CSP, and cache rules. Git-integrated
deploys fire on push to `main` and `develop`.

```bash
vercel login
vercel link
vercel              # preview deploy
vercel --prod       # production deploy
```

Set each env var in the Vercel dashboard (Development / Preview / Production
scopes) — `vercel.json` maps them to `@secret-name` references.

**Rollback:** use `vercel rollback` or the Vercel dashboard's instant rollback
to a prior deployment. (No project-specific rollback automation exists today.)

## Deploying the database (Supabase)

```bash
supabase login
supabase link --project-ref <your-project-ref>
npm run db:migrate          # runs `supabase db push`
npm run db:generate         # regenerates src/types/database.ts
```

For local development: `npm run supabase:start`, then `npm run db:reset` /
`npm run db:seed`. See [`../../supabase/README.md`](../../supabase/README.md)
and the [Data Model](../architecture/data-model.md).

> **Production DB connections use Supavisor transaction pooling (port 6543),
> not direct Postgres (5432).** See
> [`DATABASE_POOLING.md`](DATABASE_POOLING.md) for required settings.

## Deploying the edge Worker (Cloudflare)

The Worker (`src/edge/emergency-dispatch.ts`) handles emergency alert dispatch.
Config is in `src/edge/wrangler.production.toml` (production + staging
environments).

```bash
cd src/edge
wrangler deploy --env production          # or --env staging

# Provision secrets (never commit these as [vars]):
wrangler secret put DISPATCH_SIGNING_KEY --env production
wrangler secret put SENTRY_DSN --env production
# ... plus DB/Push/API secrets per wrangler.production.toml
```

Worker details: name `openrelief-emergency-dispatch-prod` (staging:
`-staging`), KV bindings (`TARGETS_KV`, `ANALYTICS_KV`, `DISPATCH_METRICS`,
`EMERGENCY_CACHE`), D1 binding (`EMERGENCY_DB`), routes
`dispatch.openrelief.org/*` + `api.openrelief.org/dispatch/*`, and cron
triggers (5-min cleanup, hourly metrics, daily deep cleanup). CPU/memory/rate
limits are set in the wrangler config.

## CI/CD (GitHub Actions)

There is a **single workflow**: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
(`name: CI`). It runs on every push to `main` and every pull request, with
three Node 20 jobs:

| Job | Steps | Gate? |
| --- | --- | --- |
| **test** | `npm run lint`, `npm run type-check`, `npm run test:coverage` (+ Codecov upload) | lint + type-check are enforced; test has `continue-on-error` (pre-existing test debt) |
| **security** | `npm audit --omit=dev --audit-level=high`, `.env` leak check | `continue-on-error` |
| **build** | `npm run build` | enforced |

> **No deploy step runs in CI.** Production deploys happen via Vercel's git
> integration (on push to `main`) and manual `wrangler deploy` /
> `supabase db push`. Older docs describing `deploy.yml` / `staging.yml`
> workflows were aspiratory and those files don't exist.

## Operations

For runbooks, see:

- [`../operations/deployment-runbook.md`](../operations/deployment-runbook.md) —
  standard + emergency deploy procedures
- [`../operations/surge-runbook.md`](../operations/surge-runbook.md) —
  disaster-surge response (SEV classification, queue drain, rate-limit tuning)
- [`../monitoring/SENTRY_SETUP.md`](../monitoring/SENTRY_SETUP.md) — Sentry
  configuration
- [`../monitoring/lighthouse-ci.md`](../monitoring/lighthouse-ci.md) —
  performance budgets

## Community / self-hosting

For third-party community deployments (self-hosted, hybrid, branding, i18n,
GDPR/HIPAA), see [`community-deployment.md`](community-deployment.md).
