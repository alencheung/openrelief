# Archive

This directory holds **obsolete, historical, or superseded** documentation.
These files are kept for historical context and are **not maintained** — they
may contain inaccurate, outdated, or never-implemented information.

For current, accurate documentation, start at the
[main documentation index](../index.md).

---

## Why these were archived

Each archived file falls into one of these categories:

| Category | Meaning |
| --- | --- |
| **Unbuilt proposal** | Describes an architecture/feature that was designed but never implemented in code. |
| **Planning artifact** | A one-time project-management document (roadmaps, WBS, budgets) tied to an elapsed schedule. |
| **Historical snapshot** | A point-in-time status report that is now stale. |
| **Superseded** | Replaced by a current doc — the redirect is listed below. |

---

## Redirect map

If you came looking for one of these old paths, here is where the current
information now lives.

### `analysis/` (entire folder — unbuilt ZK/homomorphic proposal + planning docs)

The `analysis/` folder (~9,000 lines across 18 files) was primarily a proposal
for a zero-knowledge, homomorphic-encryption, multi-jurisdictional "data
protection architecture." A codebase audit confirmed **none of the ZK-SNARK,
Groth16, circom, BFV/SEAL, or multi-jurisdictional Shamir storage was ever
implemented** — there is zero matching source code in `src/`. The proposal's
2025-01-01 Gantt charts have fully elapsed.

| Archived file | Category | Where to look instead |
| --- | --- | --- |
| `analysis/data-protection-architecture.md` | Unbuilt proposal | [`../architecture/future-vision.md`](../architecture/future-vision.md) (aspirational) + [`../architecture/security-architecture.md`](../architecture/security-architecture.md) (what's actually built) |
| `analysis/technical-specifications.md` | Unbuilt proposal | [`../architecture/future-vision.md`](../architecture/future-vision.md) |
| `analysis/compliance-mapping.md` | Unbuilt proposal | [`../legal/`](../legal/) (current legal framework) |
| `analysis/cost-analysis.md` | Unbuilt proposal | No current equivalent (speculative figures) |
| `analysis/implementation-roadmap.md` | Planning artifact (elapsed) | [`../../CHANGELOG.md`](../../CHANGELOG.md) (actual roadmap) |
| `analysis/migration-strategy.md` | Unbuilt proposal | No current equivalent |
| `analysis/performance-analysis.md` | Unbuilt proposal | [`../performance/`](../performance/) (actual performance work) |
| `analysis/security-analysis.md` | Unbuilt proposal | [`../architecture/security-architecture.md`](../architecture/security-architecture.md) |
| `analysis/system-diagrams.md` | Superseded | [`../architecture/system-diagrams.md`](../architecture/system-diagrams.md) |
| `analysis/technical-design.md` | Superseded | [`../architecture/overview.md`](../architecture/overview.md) + [`../architecture/data-model.md`](../architecture/data-model.md) |
| `analysis/executive-summary.md` | Planning artifact | [`../../CHANGELOG.md`](../../CHANGELOG.md) |
| `analysis/project-management-plan.md` | Planning artifact | [`../../CHANGELOG.md`](../../CHANGELOG.md) |
| `analysis/task-breakdown-structure.md` | Planning artifact | [`../../CHANGELOG.md`](../../CHANGELOG.md) |
| `analysis/project-evaluation-report.md` | Historical snapshot (Nov 2025) | [`../../CHANGELOG.md`](../../CHANGELOG.md) |
| `analysis/stakeholder-questions.md` | Historical snapshot | No current equivalent |
| `analysis/resource-management-summary.md` | Superseded (real content folded forward) | [`../architecture/data-model.md`](../architecture/data-model.md) |
| `analysis/trust-system-security-analysis.md` | Superseded (real content folded forward) | [`../architecture/security-architecture.md`](../architecture/security-architecture.md) |
| `analysis/README.md` | Index for archived folder | This file |

### Individual files

| Archived file | Category | Where to look instead |
| --- | --- | --- |
| `help-system/IN_APP_HELP_SYSTEM.md` | Unbuilt proposal | No current equivalent (the `help_topics` tables/endpoints were never created) |
| `tutorials/VIDEO_TUTORIALS_SCREENSHOTS.md` | Unbuilt proposal | No current equivalent (no tutorial assets were produced) |
| `production-deployment-summary.md` | Historical snapshot | [`../operations/deployment-runbook.md`](../operations/deployment-runbook.md) |

---

## How to read these files

Each archived file retains its original content for reference. Treat any
technical claim in this directory as **unverified against the current
codebase** — verify against `src/` or the active docs before relying on it.

To recover an archived file's history: `git log --follow docs/archive/<path>`.
