# ADR-001: Technical Stack

- **Status:** Accepted
- **Date:** 2024 (initial), reviewed 2026-07

## Context

OpenRelief is an open-source, offline-first Progressive Web App for
decentralized emergency coordination. The system must handle:

- Real-time emergency event reporting and validation
- Trust-weighted consensus for event verification (resist Sybil attacks)
- High-performance spatial alert dispatch (< 100ms for 50K+ users)
- Offline functionality (24+ hours) with background sync
- Privacy-preserving user experience (RLS, differential privacy, k-anonymity)
- Scalability under surge load during disasters

## Decision

Adopt a **serverless, edge-first architecture** built on a small set of
battle-tested technologies.

### Chosen stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) + **React 18** | SSR + edge + API routes in one; App Router for RSC and streaming |
| Language | **TypeScript** (strict) | Safety across a large codebase; `noUncheckedIndexedAccess` on |
| Backend / Auth / Realtime | **Supabase** (PostgreSQL 15, PostGIS, Auth, RLS, Realtime) | Integrated Postgres + auth + subscriptions; PostGIS for spatial |
| Client state | **Zustand** (`persist` + `subscribeWithSelector`) | Lightweight, no boilerplate, selective persistence for offline |
| Server state | **TanStack Query v5** | Caching, optimistic updates, invalidation — ideal for realtime sync |
| Maps | **MapLibre GL JS** | Open-source, performant vector tiles; no per-load pricing (rejected Mapbox on cost) |
| Spatial | **Turf.js** + **geolib** | Bbox/buffer/distance helpers for client-side geo |
| Edge compute | **Cloudflare Workers** | Sub-100ms dispatch close to users; KV/D1 bindings |
| Rate limiting | **Upstash Redis** | Serverless Redis with `@upstash/ratelimit`; in-memory fallback |
| Styling | **Tailwind CSS** + CVA + Radix UI | Utility-first + accessible primitives |
| Monitoring | **Sentry** (`@sentry/nextjs`) | Client + server + edge instrumentation |
| Validation | **Zod** + custom validators | Runtime shape validation for all user input |
| PWA | **next-pwa** + Workbox | Service worker, background sync, installability |
| Hosting | **Vercel** (frontend) + **Supabase** (backend) | Preview deploys; global edge network |

### Rejected alternatives

- **Monolith / traditional hosting** — rejected: scaling and operational
  overhead too high for a surge-prone emergency app.
- **Microservices** — rejected: complexity unjustified at current team size.
- **Mapbox** — rejected: per-load pricing; MapLibre is the open-source fork
  with no such constraint.
- **Proprietary backend (Firebase)** — rejected: Supabase gives a real
  Postgres with PostGIS and RLS, which Firebase lacks.

## Consequences

### Positive

- **Global performance** via Vercel edge + Cloudflare Workers.
- **Strong data safety** via Postgres RLS as the primary access-control
  boundary (every table is RLS-enabled).
- **Spatial dispatch at scale** — PostGIS GIST indexes give O(log N) dispatch
  queries.
- **Offline-first UX** — Zustand persistence + Workbox background sync keep
  the app useful without a network.
- **Single language** (TypeScript) across client, server, and edge reduces
  context-switching.

### Negative

- **Vendor concentration** on Supabase (database + auth + realtime). Mitigated
  by Postgres being open-source and portable.
- **Distributed-system debugging** is harder than a monolith — Sentry + the
  audit log are essential.
- **Next.js 15 / React 18 / App Router** evolve quickly; upgrades need care
  (see commit history for the 15.0.3 → 15.5.20 security upgrade).

## Key architectural consequences (verified)

These are the load-bearing design decisions that flow from this ADR, all
confirmed against the current codebase:

1. **RLS is the access-control spine.** Every user-facing table enforces it.
   See [`../data-model.md`](../data-model.md) and the full policies in
   [`../../database/schema.md`](../../database/schema.md).
2. **Trust + consensus run as database functions** (`calculate_trust_score`,
   `calculate_event_consensus`), not application code. The threshold is **5.0**
   and trust is bounded **0.0–1.0**. See
   [`../trust-and-consensus.md`](../trust-and-consensus.md).
3. **Dispatch is a PostGIS spatial query** (`get_users_for_alert_dispatch`)
   with a stepped distance-bucket relevance formula
   (`severity × trust_score × f(distance)`), not application iteration.
4. **Security is layered** at the edge (`src/middleware.ts`: rate limit, Sybil
   detection, validation, headers) and in the app
   (`src/lib/security/api-security.ts`). See
   [`../security-architecture.md`](../security-architecture.md).
5. **Offline is first-class** — `src/store/offlineStore.ts` +
   `src/lib/offline/` + `src/components/offline/` + the Service Worker.

## Implementation status

This stack is **implemented and in production use** at v2.0.0. See the
[`../../overview.md`](../overview.md) for the as-built architecture detail and
the current `package.json` for exact versions.

## Related

- [Architecture Overview](../overview.md)
- [System Diagrams](../system-diagrams.md)
- [CHANGELOG](../../../CHANGELOG.md) — version history
