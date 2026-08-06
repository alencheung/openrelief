# OpenRelief Documentation

Welcome. This index is the **single entry point** for all OpenRelief
documentation. Everything below reflects the **current, as-built** system.

> **Looking for an old doc?** Several obsolete/planning docs were moved to
> [`archive/`](archive/). See the
> [archive redirect map](archive/README.md) for where each one's content now
> lives.

---

## Start here

| If you... | Go to |
| --- | --- |
| Want to run the app locally for the first time | [Getting Started](getting-started/) |
| Need the npm scripts / commands reference | [`AGENTS.md`](../AGENTS.md) (root) or [Getting Started](getting-started/) |
| Want the 5-minute "how it works" overview | [Root README](../README.md#-how-it-works) |
| Are a contributor setting up your environment | [Development: Contribution Guide](development/contribution-guide.md) |

---

## By audience

### 👤 End users

| Document | What it covers |
| --- | --- |
| [User Onboarding](user-onboarding/USER_ONBOARDING_GUIDE.md) | Account setup, reporting, trust, mobile, offline, privacy |
| [Emergency Quick Reference](quick-reference/EMERGENCY_QUICK_REFERENCE.md) | Printable quick-action cards by emergency type |
| [Accessibility — User Guide](accessibility/user-guide.md) | Screen reader, keyboard, visual/hearing/motor/cognitive features |
| [Emergency Response Guide](emergency-procedures/EMERGENCY_RESPONSE_GUIDE.md) | Severity classification, per-type protocols, escalation |

### 💻 Developers

| Document | What it covers |
| --- | --- |
| [Getting Started](getting-started/) | Local setup, Supabase, env, scripts |
| [Contribution Guide](development/contribution-guide.md) | Standards, workflow, PR process, testing |
| [Debugging Notes](development/debugging-notes.md) | Resolved PWA case studies (hydration, caching, headers) |
| [Architecture Overview](architecture/overview.md) | The as-built three-tier architecture + tech stack |
| [System Diagrams](architecture/system-diagrams.md) | Stack, data-flow, deployment, security diagrams |
| [Data Model](architecture/data-model.md) | Tables, RLS, functions (full DDL in [database/schema](database/schema.md)) |
| [Trust & Consensus](architecture/trust-and-consensus.md) | The trust algorithm + consensus threshold (5.0) |
| [Security Architecture](architecture/security-architecture.md) | What's actually built in `src/lib/security/` + `src/lib/privacy/` |
| [Future Vision](architecture/future-vision.md) | Proposed (not built) ZK/homomorphic architecture |
| [ADR-001: Technical Stack](architecture/decisions/ADR-001-technical-stack.md) | Architecture decision record |
| [File Splitting Plan](architecture/FILE_SPLITTING_PLAN.md) | Living refactor plan for oversized files |
| [State Management](state-management.md) | Zustand stores + TanStack Query + realtime |
| [Mobile Optimization](mobile.md) | Mobile hooks, gestures, performance, CSS |
| [API Reference](api/) | Endpoints, auth, realtime, error formats |
| [Database Schema](database/schema.md) | Full DDL, indexes, RLS, functions, triggers |

### 🚀 DevOps / SRE

| Document | What it covers |
| --- | --- |
| [Deployment Overview](deployment/overview.md) | Vercel + Supabase + Cloudflare + CI/CD (verified) |
| [Database Pooling](deployment/DATABASE_POOLING.md) | Supavisor transaction pooling config |
| [Community Deployment](deployment/community-deployment.md) | Self-hosted / hybrid / branding for third parties |
| [Deployment Runbook](operations/DEPLOYMENT_RUNBOOK.md) | Standard + emergency deploy procedures |
| [Production Readiness](operations/PRODUCTION_READINESS.md) | Readiness definition, 8-dimension rubric, daily evaluation harness |
| [Surge Runbook](operations/SURGE_RUNBOOK.md) | Disaster-surge response (SEV, queue drain, rate limits) |
| [Sentry Setup](monitoring/SENTRY_SETUP.md) | Error monitoring configuration |
| [Lighthouse CI](monitoring/lighthouse-ci.md) | Performance budgets and audits |
| [Performance Optimization](performance/PERFORMANCE_OPTIMIZATION_GUIDE.md) | The performance subsystem |
| [Supabase README](../supabase/README.md) | Migrations, setup, functions, monitoring |

### 🔐 Security & Privacy teams

| Document | What it covers |
| --- | --- |
| [Security Policy](../SECURITY.md) | Vulnerability reporting + disclosure (root) |
| [Security Architecture](architecture/security-architecture.md) | As-built defense-in-depth layers |
| [Security Implementation Guide](security/SECURITY_IMPLEMENTATION_GUIDE.md) | Component-by-component walkthrough |
| [Privacy Implementation Guide](privacy/Privacy_Implementation_Guide.md) | Differential privacy, k-anonymity, E2E encryption |
| [Legal Framework Analysis](legal/OpenRelief_Legal_Framework_Analysis.md) | GDPR, CLOUD Act, PATRIOT Act, jurisdictional matrix |
| [Legal Executive Summary](legal/OpenRelief_Legal_Executive_Summary.md) | Vulnerabilities + prioritized action checklists |
| [Legal Response Protocols](legal/response-protocols/README.md) | SOPs for government data requests |
| [Future Vision](architecture/future-vision.md) | Proposed zero-knowledge / multi-jurisdictional design |

### 🧪 QA / Testing

| Document | What it covers |
| --- | --- |
| [Emergency & Trust Testing Guide](testing/EMERGENCY_TRUST_TESTING_GUIDE.md) | Test architecture, scenarios, coverage thresholds |
| [E2E Tests (Playwright)](../tests/README.md) | Test categories, running, CI |

---

## By topic

### Architecture & design
- [Overview](architecture/overview.md) · [Diagrams](architecture/system-diagrams.md) ·
  [Data Model](architecture/data-model.md) ·
  [Trust & Consensus](architecture/trust-and-consensus.md) ·
  [Security](architecture/security-architecture.md) ·
  [Future Vision](architecture/future-vision.md) ·
  [ADR-001](architecture/decisions/ADR-001-technical-stack.md) ·
  [File Splitting Plan](architecture/FILE_SPLITTING_PLAN.md)

### API & database
- [API Reference](api/) · [Endpoints](api/endpoints.md) ·
  [Database README](database/README.md) · [Schema (full DDL)](database/schema.md) ·
  [Supabase README](../supabase/README.md)

### Development
- [Getting Started](getting-started/) ·
  [Contribution Guide](development/contribution-guide.md) ·
  [Debugging Notes](development/debugging-notes.md) ·
  [State Management](state-management.md) · [Mobile](mobile.md)

### Deployment & operations
- [Overview](deployment/overview.md) ·
  [DB Pooling](deployment/DATABASE_POOLING.md) ·
  [Community Deploy](deployment/community-deployment.md) ·
  [Deploy Runbook](operations/DEPLOYMENT_RUNBOOK.md) ·
  [Surge Runbook](operations/SURGE_RUNBOOK.md)

### Security & privacy
- [Policy](../SECURITY.md) · [Architecture](architecture/security-architecture.md) ·
  [Security Guide](security/SECURITY_IMPLEMENTATION_GUIDE.md) ·
  [Privacy Guide](privacy/Privacy_Implementation_Guide.md) ·
  [Legal](legal/)

### Monitoring & performance
- [Sentry](monitoring/SENTRY_SETUP.md) · [Lighthouse CI](monitoring/lighthouse-ci.md) ·
  [Performance Guide](performance/PERFORMANCE_OPTIMIZATION_GUIDE.md)

### User-facing
- [Onboarding](user-onboarding/USER_ONBOARDING_GUIDE.md) ·
  [Quick Reference](quick-reference/EMERGENCY_QUICK_REFERENCE.md) ·
  [Emergency Procedures](emergency-procedures/EMERGENCY_RESPONSE_GUIDE.md) ·
  [Accessibility (user)](accessibility/user-guide.md) ·
  [Accessibility (dev)](accessibility/developer-guide.md)

---

## Root-level documents

| Document | Purpose |
| --- | --- |
| [`README.md`](../README.md) | Project overview, quick start, features |
| [`AGENTS.md`](../AGENTS.md) | Build/lint/test commands + code-style guidelines (the authoritative dev reference) |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | How to contribute |
| [`SECURITY.md`](../SECURITY.md) | Security policy + vulnerability reporting |
| [`CHANGELOG.md`](../CHANGELOG.md) | Version history + roadmap (source of truth for what's shipped) |
| [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) | Community standards |
| [`LICENSE`](../LICENSE) | MIT license |

---

## Where did the old doc go?

If a link or search brought you to a doc that no longer exists, it was likely
reorganized. Common redirects:

| Old path | New location |
| --- | --- |
| `docs/architecture/index.md` | [`architecture/overview.md`](architecture/overview.md) |
| `docs/architecture/technical-design.md` | [`architecture/overview.md`](architecture/overview.md) + [`architecture/data-model.md`](architecture/data-model.md) |
| `docs/architecture/system-architecture.md` | [`architecture/system-diagrams.md`](architecture/system-diagrams.md) |
| `docs/architecture/data-protection.md` | [`architecture/security-architecture.md`](architecture/security-architecture.md) (built) + [`architecture/future-vision.md`](architecture/future-vision.md) (proposed) |
| `docs/architecture/ADR-001-technical-architecture.md` | [`architecture/decisions/ADR-001-technical-stack.md`](architecture/decisions/ADR-001-technical-stack.md) |
| `docs/development/README_DEVELOPMENT.md` | [`getting-started/`](getting-started/) |
| `docs/development/DEVELOPER_CONTRIBUTION_GUIDE.md` | [`development/contribution-guide.md`](development/contribution-guide.md) |
| `docs/development/DEBUGGING_GUIDE.md` | [`development/debugging-notes.md`](development/debugging-notes.md) |
| `docs/deployment/README.md` + `deployment-guide.md` | [`deployment/overview.md`](deployment/overview.md) |
| `docs/deployment/COMMUNITY_DEPLOYMENT_GUIDE.md` | [`deployment/community-deployment.md`](deployment/community-deployment.md) |
| `docs/operations/PRODUCTION_DEPLOYMENT_SUMMARY.md` | folded into [`operations/DEPLOYMENT_RUNBOOK.md`](operations/DEPLOYMENT_RUNBOOK.md) |
| `docs/accessibility/OPENRELIEF_ACCESSIBILITY_GUIDE.md` | split into [`accessibility/developer-guide.md`](accessibility/developer-guide.md) + [`accessibility/user-guide.md`](accessibility/user-guide.md) |
| `docs/accessibility/guide.md` | [`accessibility/developer-guide.md`](accessibility/developer-guide.md) |
| `docs/accessibility/USER_ACCESSIBILITY_GUIDE.md` | [`accessibility/user-guide.md`](accessibility/user-guide.md) |
| `src/state-management/README.md` | [`state-management.md`](state-management.md) |
| `src/mobile/README.md` | [`mobile.md`](mobile.md) |
| `docs/lighthouse-ci.md` | [`monitoring/lighthouse-ci.md`](monitoring/lighthouse-ci.md) |
| `analysis/*` (entire folder) | [`archive/analysis/`](archive/analysis/) |
| `docs/help-system/*`, `docs/tutorials/*` | [`archive/`](archive/) (aspirational, unbuilt) |

Full details in the [archive README](archive/README.md).

---

## Getting help

- **Issues:** [github.com/openrelief/openrelief/issues](https://github.com/openrelief/openrelief/issues)
- **Discussions:** [github.com/openrelief/openrelief/discussions](https://github.com/openrelief/openrelief/discussions)
- **Security:** security@openrelief.org (see [SECURITY.md](../SECURITY.md))

---

_Good documentation saves lives. In emergencies, clear information makes the
difference._
