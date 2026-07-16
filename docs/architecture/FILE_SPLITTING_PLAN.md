# File Splitting Plan

> **Status**: ✅ **Phases 1–3 complete** (as of 2026-07). The original top-15
> files listed below have all been split and now sit at or under the 500-line
> target. This document is retained as a historical record of the refactor and
> as a template for any future oversized-file work.
> **Tracking**: [#16](https://github.com/openrelief/openrelief/issues/16)
> **Owner**: Platform / Architecture
> **Last updated**: 2026-07-16

This is a living document that plans how to incrementally split the largest
files in the codebase. Per [AGENTS.md](../../AGENTS.md), no file should exceed
**500 lines**.

> **What landed.** Every file in the original "Top 15 largest" table below was
> split behind its original import path (types → `*/types.ts`, pure helpers →
> sibling modules, singletons/hooks retained as facades). Re-verified line counts
> as of this update: the largest former offender,
> `performance-regression-testing.ts`, is now **360 lines**; the largest of the
> whole `src/` tree is now a *test* file (`emergencyWorkflowIntegration.test.ts`,
> 924 lines), and the largest non-test source file is
> `src/components/accessibility/MotorAccessibility.tsx` (893 lines). See the
> [Completed splits](#completed-splits) section.

The goal was **incremental, reviewable change** — not a big-bang refactor. Each
split shipped behind the original import path so callers did not break.

---

## How to read this plan

Each entry below contains:

- **Responsibility** — what the file does today, in 1–2 sentences.
- **Proposed split** — which functions/types/classes move to which new file.
  Unless noted, the new files live next to the original and the original path
  re-exports everything for backward compatibility.
- **Priority** — `HIGH` / `MEDIUM` / `LOW`, based on:
  - **Merge-conflict risk** — is this file touched by many PRs in flight?
  - **Testability impact** — does splitting unlock unit tests that are
    currently blocked by module-private state?
  - **Critical path** — runtime hot path (alerts, realtime, map render) vs.
    offline tooling (load testing, dashboards).
- **Effort** — `S` (< 1 day), `M` (1–3 days), `L` (> 3 days).

---

## Top 15 largest files (historical — pre-split)

> These were the largest files **before** the splitting work. All have since
> been split (see [Completed splits](#completed-splits)). The line counts below
> are kept for reference; current counts are far smaller.

Generated with:

```bash
git ls-files 'src/*.ts' 'src/*.tsx' | xargs wc -l | sort -rn | head -16
```

| #   | File                                                        | Lines (then) | Lines (now) |
| --- | ----------------------------------------------------------- | ------------ | ----------- |
| 1   | `src/lib/testing/performance-regression-testing.ts`        | 1671         | 360         |
| 2   | `src/lib/performance/performance-integration.ts`           | 1671         | 486         |
| 3   | `src/lib/pwa/service-worker-optimizer.ts`                  | 1643         | 418         |
| 4   | `src/lib/alerts/alert-dispatch-optimizer.ts`               | 1597         | 497         |
| 5   | `src/lib/performance/performance-dashboard.ts`             | 1582         | 489         |
| 6   | `src/lib/testing/load-testing-framework.ts`                | 1471         | 499         |
| 7   | `src/lib/security/incident-response.ts`                    | 1315         | 421         |
| 8   | `src/lib/edge/edge-optimizer.ts`                           | 1279         | 499         |
| 9   | `src/components/map/EmergencyMap.tsx`                      | 1191         | 456         |
| 10  | `src/lib/performance/frontend-optimizer.ts`                | 1175         | 475         |
| 11  | `src/components/privacy/DataControls.tsx`                  | 1148         | 244         |
| 12  | `src/lib/security/sybil-prevention.ts`                     | 1138         | 415         |
| 13  | `src/store/offlineStore.ts`                                | 1125         | 500         |
| 14  | `src/hooks/queries/useRealtimeSubscriptions.ts`            | 1089         | 297         |
| 15  | `src/hooks/usePrivacy.ts`                                   | 1058         | 467         |

> **Note**: `src/components/privacy/PrivacyDashboard.tsx` (999 lines) is just
> below the cutoff but is included in Phase 3 because it shares a feature area
> with `DataControls.tsx` and tends to be edited in the same PRs.

---

## Per-file plan

### 1. `src/lib/testing/performance-regression-testing.ts` — 1671 lines

- **Responsibility**: Baseline storage, threshold comparison, regression
  enforcement, and reporting for performance tests across response-time,
  database, frontend, alert-dispatch, and edge metric families. Also defines
  ~15 interfaces and the `EdgePerformanceMetrics` type (duplicate of the one in
  `src/lib/edge/edge-optimizer.ts`).
- **Proposed split**:
  - `src/lib/testing/regression/types.ts` — all 15 interfaces
    (`PerformanceRegressionConfig`, `PerformanceBaseline`,
    `ResponseTimeMetrics`, `DatabaseMetrics`, `FrontendMetrics`,
    `AlertDispatchMetrics`, `EdgePerformanceMetrics`,
    `PerformanceThresholds`, `PerformanceTestSuite`, `PerformanceTest`,
    `ReportingConfig`, `EnforcementConfig`, `PerformanceRegressionResults`,
    `MetricComparison`, `PerformanceViolation`).
  - `src/lib/testing/regression/baseline-store.ts` — load/save/compare
    baselines.
  - `src/lib/testing/regression/comparator.ts` — the `compare*` private
    methods (including `compareEdgePerformanceMetrics`), extracted as pure
    functions for unit testing.
  - `src/lib/testing/regression/reporter.ts` — reporting + result shaping.
  - Original module re-exports the singleton and `usePerformanceRegressionTesting`.
- **Priority**: **MEDIUM** — offline tooling, not on a runtime hot path, but
  the duplicated `EdgePerformanceMetrics` type is a bug source.
- **Effort**: **M**

### 2. `src/lib/performance/performance-integration.ts` — 1671 lines

- **Responsibility**: The integration layer that wires the four performance
  subsystem modules together (emergency mode, optimization, testing,
  alerting, reporting). Defines ~40 interfaces, most of which duplicate
  names already defined in the subsystem modules
  (`EmergencyModeConfig`, `TestingConfig`, `ReportingConfig`, etc.).
- **Proposed split**:
  - `src/lib/performance/types.ts` — **canonical** type source (see
    [Performance subsystem consolidation](#performance-subsystem-consolidation)).
  - `src/lib/performance/integration/emergency-mode.ts` — emergency-trigger
    logic.
  - `src/lib/performance/integration/optimization.ts` — strategy selection.
  - `src/lib/performance/integration/alerting.ts` — alert rule evaluation.
  - `src/lib/performance/integration/reporting.ts` — report assembly.
  - Original module keeps the `PerformanceIntegration` singleton facade.
- **Priority**: **HIGH** — top merge-conflict surface; duplicates types across
  the whole subsystem.
- **Effort**: **L**

### 3. `src/lib/pwa/service-worker-optimizer.ts` — 1643 lines

- **Responsibility**: Service-worker lifecycle, cache strategy config,
  background-sync / push / offline-fallback config, emergency-mode triggers,
  and metrics collection. Mixes config types, a `ServiceWorkerOptimizer`
  class, and a React hook.
- **Proposed split**:
  - `src/lib/pwa/types.ts` — `ServiceWorkerConfig`, `RuntimeCacheConfig`,
    `BackgroundSyncConfig`, `PushNotificationConfig`, `OfflineFallbackConfig`,
    `PerformanceConfig`, `EmergencyModeConfig`, `EmergencyTrigger`,
    `ServiceWorkerMetrics`, `CacheEntryMetadata`.
  - `src/lib/pwa/cache-strategies.ts` — cache-strategy helpers (pure).
  - `src/lib/pwa/service-worker-optimizer.ts` — the class (slimmed).
  - `src/lib/pwa/use-service-worker-optimizer.ts` — the hook.
- **Priority**: **MEDIUM** — PWA path, moderate churn.
- **Effort**: **M**

### 4. `src/lib/alerts/alert-dispatch-optimizer.ts` — 1597 lines

- **Responsibility**: FCM batch construction, priority/status enums, alert
  model, delivery-attempt tracking, batching/coalescing logic, and the
  `AlertDispatchOptimizer` singleton. On the **critical alert delivery path**.
- **Proposed split**:
  - `src/lib/alerts/types.ts` — `DeliveryChannel`, `AlertPriority`,
    `DeliveryStatus`, `FCMBatchResult`, `FCMSingleNotification`,
    `FCMBatchPayload`, `EmergencyAlert`, `DeliveryAttempt`.
  - `src/lib/alerts/fcm-payload.ts` — payload builders (pure, testable).
  - `src/lib/alerts/batching.ts` — coalescing/batching rules (pure).
  - `src/lib/alerts/alert-dispatch-optimizer.ts` — the singleton facade.
  - `src/lib/alerts/use-alert-dispatch-optimizer.ts` — the hook.
- **Priority**: **HIGH** — critical path, high churn, bug-prone.
- **Effort**: **M**

### 5. `src/lib/performance/performance-dashboard.ts` — 1582 lines

- **Responsibility**: Dashboard data shaping, ~25 metric interfaces
  (`SystemMetrics`, `APIMetrics`, `DatabaseMetrics`, `SlowQuery`,
  `AlertMetrics`, `EdgeMetrics`, `TrendMetrics`, …), widgets, and the
  `PerformanceDashboard` singleton.
- **Proposed split**:
  - Consume `src/lib/performance/types.ts` (canonical) instead of redefining.
  - `src/lib/performance/dashboard/data-shaping.ts` — pure aggregators.
  - `src/lib/performance/dashboard/widgets.ts` — widget config helpers.
  - `src/lib/performance/performance-dashboard.ts` — singleton facade.
- **Priority**: **MEDIUM** — read path only; large but stable.
- **Effort**: **M**

### 6. `src/lib/testing/load-testing-framework.ts` — 1471 lines

- **Responsibility**: Load-test configuration, scenarios, virtual-user
  simulation, performance targets, alerting, and metrics aggregation.
  Offline-only tooling.
- **Proposed split**:
  - `src/lib/testing/load/types.ts` — `LoadTestConfig`, `LoadTestScenario`,
    `TestEndpoint`, `GeographicDistribution`, `UserBehavior`,
    `PerformanceTargets`, `AlertingConfig`, `LoadTestMetrics`, `VirtualUser`.
  - `src/lib/testing/load/virtual-user.ts` — VU loop.
  - `src/lib/testing/load/metrics-aggregator.ts` — aggregation (pure).
  - Original module keeps the singleton + hook.
- **Priority**: **LOW** — offline tooling, low churn.
- **Effort**: **M**

### 7. `src/lib/security/incident-response.ts` — 1315 lines

- **Responsibility**: Incident-response plans, teams, procedures
  (containment/eradication/recovery), escalation ladders, timeline tracking,
  resource cataloging. ~25 interfaces + enums.
- **Proposed split**:
  - `src/lib/security/incident/types.ts` — all interfaces/enums.
  - `src/lib/security/incident/procedures.ts` — procedure templates (pure).
  - `src/lib/security/incident/escalation.ts` — escalation engine.
  - `src/lib/security/incident-response.ts` — public facade.
- **Priority**: **MEDIUM** — security path, but mostly data/config.
- **Effort**: **M**

### 8. `src/lib/edge/edge-optimizer.ts` — 1279 lines

- **Responsibility**: Edge geographic routing, cache config, invalidation,
  performance-metric collection. Owns `EdgePerformanceMetrics`, which is
  **duplicated** in `src/lib/testing/performance-regression-testing.ts`.
- **Proposed split**:
  - `src/lib/edge/types.ts` — `GeographicRegion`, `EdgeLocation`,
    `CacheConfig`, `CacheLevel`, `InvalidationStrategy`, `RoutingStrategy`,
    `EdgePerformanceMetrics` (re-exported from canonical perf types).
  - `src/lib/edge/routing.ts` — routing strategy selection (pure).
  - `src/lib/edge/cache.ts` — cache/invalidation helpers (pure).
  - `src/lib/edge/edge-optimizer.ts` — singleton facade.
  - `src/lib/edge/use-edge-optimizer.ts` — the hook.
- **Priority**: **HIGH** — runtime path + duplicated type.
- **Effort**: **M**

### 9. `src/components/map/EmergencyMap.tsx` — 1191 lines

- **Responsibility**: The main emergency map component — MapLibre GL
  rendering, marker clustering, layer config, popup rendering, event
  filtering, and viewport handling. Single default-exported component.
- **Proposed split**:
  - `src/components/map/layers/` — one file per layer (emergencies,
    confirmations, trust, zones).
  - `src/components/map/markers/` — marker factories + clustering.
  - `src/components/map/popups/` — popup components.
  - `src/components/map/use-emergency-map.ts` — viewport + selection hook.
  - `src/components/map/EmergencyMap.tsx` — thin composition root.
- **Priority**: **HIGH** — UI hot path, very high churn, every map bug lands
  here.
- **Effort**: **L**

### 10. `src/lib/performance/frontend-optimizer.ts` — 1175 lines

- **Responsibility**: Bundle optimization, image optimization, Core Web
  Vitals targets, performance budgets, resource-loading strategies, and the
  `FrontendOptimizer` singleton.
- **Proposed split**:
  - Consume `src/lib/performance/types.ts` (canonical).
  - `src/lib/performance/frontend/budget.ts` — budget enforcement (pure).
  - `src/lib/performance/frontend/resource-loading.ts` — strategy selection.
  - `src/lib/performance/frontend-optimizer.ts` — singleton facade.
- **Priority**: **MEDIUM** — perf path, moderate churn.
- **Effort**: **M**

### 11. `src/components/privacy/DataControls.tsx` — 1148 lines

- **Responsibility**: Privacy data-controls UI — consent toggles, data export,
  deletion requests, permission granular controls. Single default export.
- **Proposed split**:
  - `src/components/privacy/data-controls/ConsentToggles.tsx`
  - `src/components/privacy/data-controls/DataExportPanel.tsx`
  - `src/components/privacy/data-controls/DeletionRequests.tsx`
  - `src/components/privacy/data-controls/GranularPermissions.tsx`
  - `src/components/privacy/DataControls.tsx` — composition root.
- **Priority**: **HIGH** — high churn, frequently edited alongside
  `PrivacyDashboard.tsx`.
- **Effort**: **M**

### 12. `src/lib/security/sybil-prevention.ts` — 1138 lines

- **Responsibility**: Sybil-attack detection — user-behavior profiling,
  voting/reporting history, network-graph clustering, location proximity,
  timing patterns, and the `SybilPreventionEngine` class + singleton.
- **Proposed split**:
  - `src/lib/security/sybil/types.ts` — ~11 interfaces + `SybilFlagType` enum.
  - `src/lib/security/sybil/behavior-profile.ts` — behavior profiling (pure).
  - `src/lib/security/sybil/clustering.ts` — voting/report cluster detection.
  - `src/lib/security/sybil/proximity.ts` — location/timing analysis.
  - `src/lib/security/sybil-prevention.ts` — `SybilPreventionEngine` facade.
- **Priority**: **MEDIUM** — security path, but runs offline-ish (trust scoring).
- **Effort**: **M**

### 13. `src/store/offlineStore.ts` — 1125 lines

- **Responsibility**: Zustand store for offline actions, cache, sync queue,
  metrics, settings, and conflict resolution. Mixes ~7 interfaces, the store
  factory, selectors, and re-exported utilities (`generateId`, `compressData`,
  …).
- **Proposed split**:
  - `src/store/offline/types.ts` — `OfflineAction`, `OfflineCache`,
    `SyncQueue`, `OfflineMetrics`, `OfflineSettings`, `ConflictResolution`.
  - `src/store/offline/sync-queue.ts` — queue helpers (pure).
  - `src/store/offline/conflict-resolution.ts` — resolver (pure).
  - `src/store/offlineStore.ts` — store factory + selectors.
  - Keep the `generateId`/`compressData`/`decompressData` re-export on the
    original path (callers rely on it).
- **Priority**: **HIGH** — runtime path, every offline PR touches it.
- **Effort**: **M**

### 14. `src/hooks/queries/useRealtimeSubscriptions.ts` — 1089 lines

- **Responsibility**: ~12 Supabase Realtime subscription hooks
  (`useEmergencyEventsSubscription`, `usePresenceTracking`,
  `useEmergencyBroadcast`, …) plus the core `useRealtimeSubscription` and
  connection helpers.
- **Proposed split**:
  - `src/hooks/realtime/use-realtime-subscription.ts` — core hook.
  - `src/hooks/realtime/use-realtime-connection.ts` — connection manager.
  - `src/hooks/realtime/domain/` — one file per domain hook
    (emergency-events, event-confirmations, user-profiles, trust-history,
    notification-queue, system-metrics).
  - `src/hooks/realtime/presence.ts` — `usePresenceTracking`.
  - `src/hooks/realtime/broadcast.ts` — `useEmergencyBroadcast`.
  - Original path re-exports all hooks for backward compat.
- **Priority**: **HIGH** — realtime path, high churn.
- **Effort**: **M**

### 15. `src/hooks/usePrivacy.ts` — 1058 lines

- **Responsibility**: The `usePrivacy` hook plus ~12 privacy-related
  interfaces (`PrivacySettings`, `GranularDataPermissions`, `PrivacyZone`,
  `EmergencyDataPreference`, `TrustScoreSettings`, `DataProcessingPurpose`,
  `LegalRequest`, `PrivacyNotificationSettings`, `PrivacyAuditLog`,
  `PrivacyContext`, `LocationData`, `PrivacyProtectedData<T>`).
- **Proposed split**:
  - `src/types/privacy.ts` — all interfaces (callers across the app want
    these types without importing a hook).
  - `src/hooks/privacy/use-privacy-settings.ts` — settings read/write.
  - `src/hooks/privacy/use-privacy-zone.ts` — zone management.
  - `src/hooks/privacy/use-legal-requests.ts` — legal-request flow.
  - `src/hooks/usePrivacy.ts` — thin re-export of the composed hook.
- **Priority**: **MEDIUM** — privacy path, moderate churn.
- **Effort**: **M**

---

## Completed splits

All 15 entries above were executed across Phases 1–3. Each split followed the
rules below: code moved to sibling modules (`*/types.ts`, pure helper files, or
per-domain subfolders), and the original path re-exported its former public
surface so callers kept compiling. Representative splits:

- `alert-dispatch-optimizer.ts` → `dispatch-types.ts`, `dispatch-helpers.ts`,
  `dispatch-strategy.ts`, `dispatch-batching.ts` (documented in the file
  header). Now 497 lines.
- `offlineStore.ts` → `offline-types.ts`, `offline-helpers.ts`,
  `offline-selectors.ts`. Now exactly 500 lines.
- `usePrivacy.ts` → `usePrivacy-types.ts`, `usePrivacy-helpers.ts`,
  `usePrivacy-protection.ts`. Now 467 lines.
- `EmergencyMap.tsx` → layer/marker/popup helpers under
  `src/components/map/`. Now 456 lines.

The current largest non-test source files are unrelated to the original list
(e.g. `src/components/accessibility/MotorAccessibility.tsx` at 893 lines,
`src/app/api/performance/route.ts` at 878 lines). Those are candidates for a
future pass if/when they are next heavily edited; they are **not** blocking
today.

---

## Phased rollout (historical)

### Phase 1 — Quick wins

Extraction is straightforward: clean type/interface blocks at the top of the
file, low coupling, clear backward-compat via re-export.

| File                                            | Why it's easy                                            |
| ----------------------------------------------- | -------------------------------------------------------- |
| `incident-response.ts`                          | Mostly interfaces + enums; pure procedures               |
| `sybil-prevention.ts`                           | Clear type/class/hook separation already                 |
| `usePrivacy.ts`                                 | Types clearly separable from the hook                    |
| `load-testing-framework.ts`                     | Offline-only, low blast radius                           |

### Phase 2 — Core modules

The performance subsystem consolidation and the alert/edge/runtime hot paths.

| File                                            | Notes                                                   |
| ----------------------------------------------- | ------------------------------------------------------- |
| `performance-integration.ts`                    | Depends on the new `performance/types.ts` (see below)   |
| `performance-dashboard.ts`                      | Switch to canonical types; extract data-shaping         |
| `performance-monitor.ts` (subsystem)            | Switch to canonical types                               |
| `frontend-optimizer.ts`                         | Switch to canonical types; extract budget logic         |
| `alert-dispatch-optimizer.ts`                   | Critical path — extract pure batching/payload builders  |
| `edge-optimizer.ts`                             | Runtime path — drop duplicated `EdgePerformanceMetrics` |
| `offlineStore.ts`                               | Runtime path — split store from sync/conflict logic     |
| `useRealtimeSubscriptions.ts`                   | Realtime path — one file per domain hook                |

### Phase 3 — UI components

UI splits are higher-risk for visual regressions; do them last with screenshot
coverage in place.

| File                       | Notes                                                |
| -------------------------- | ---------------------------------------------------- |
| `EmergencyMap.tsx`         | Layers/markers/popups; needs visual regression tests |
| `DataControls.tsx`         | Split into panel components                          |
| `PrivacyDashboard.tsx` (999 lines) | Co-edited with DataControls; split together    |

---

## Rules for splitting

These rules apply to **every** split, regardless of phase:

1. **Never break existing imports.** Extract code to a new file, then
   re-export it from the original path. Callers must keep working untouched:

   ```ts
   // src/lib/alerts/alert-dispatch-optimizer.ts (after split)
   export type { EmergencyAlert, DeliveryAttempt } from './types'
   export { buildFCMBatchPayload } from './fcm-payload'
   export { alertDispatchOptimizer, useAlertDispatchOptimizer } from './optimizer'
   ```

2. **One PR per file split.** Reviewable diffs only. Do not bundle two splits
   in one PR, even if they look trivial.

3. **Run the full test suite before and after each split.** Required minimum:

   ```bash
   npm run type-check
   npm run test
   npm run lint
   ```

   For runtime/UI splits, also run `npm run test:e2e:playwright`.

4. **Target: no file > 500 lines** (per [AGENTS.md](../../AGENTS.md)). If a
   split lands a file at 510 lines, open a follow-up rather than leaving it.

5. **Preserve public exports.** Anything currently exported from the original
   path must remain exported after the split, even if the implementation
   moved. Barrel `index.ts` files count as public surface.

6. **Do not change behavior in a split PR.** Move code verbatim; rename or
   refactor in a separate follow-up. The diff should be moves + re-exports.

7. **Update this document** when a split lands: move the entry under a
   "Completed" section with the PR link.

---

## Performance subsystem consolidation

> **The triplication problem.** `PerformanceMetrics` (and several sibling
> types) are defined in multiple places, and the subsystem mixes root and
> nested modules. The line-count bloat has been fixed (all files now ≤ ~490
> lines), but the **type duplication** and the **root-vs-nested split**
> remain open.

### Current state (verified 2026-07-16)

- `src/lib/performance/` contains four files (all now well under 500 lines):
  - `frontend-optimizer.ts` (475 lines)
  - `performance-dashboard.ts` (489 lines)
  - `performance-integration.ts` (486 lines)
  - `performance-monitor.ts` (nested, ~460 lines)
- `src/lib/performance-monitor.ts` (**461 lines, root**) still exists and
  exports `PerformanceMetrics`, `usePerformanceMonitor`, and selectors. It has
  not yet been folded into the nested subsystem.
- `src/lib/performance/index.ts` (the intended barrel) **does not exist yet**.
- `PerformanceMetrics` is defined independently in:
  - `src/lib/performance-monitor.ts` (root, Zustand store shape)
  - `src/hooks/useMobilePerformance.ts` (mobile metrics shape)
  - `src/components/pwa/EnhancedPWAStatus.tsx` (PWA-local shape)
- `EdgePerformanceMetrics` is defined independently in:
  - `src/lib/edge/edge-optimizer.ts`
  - `src/lib/testing/performance-regression-testing.ts`
- Many sibling types (`EmergencyModeConfig`, `TestingConfig`,
  `ReportingConfig`, `AlertingConfig`, `PerformanceThresholds`) are
  redefined across `performance-integration.ts`, `performance-dashboard.ts`,
  and `performance-monitor.ts`.

### Target state

- **Create `src/lib/performance/types.ts`** as the single canonical type
  source for the subsystem. It owns:
  - `PerformanceMetrics` (and the mobile/PWA variants, or a unified shape)
  - `EdgePerformanceMetrics`
  - `PerformanceThresholds`, `EmergencyModeConfig`, `TestingConfig`,
    `ReportingConfig`, `AlertingConfig`, and all other shared interfaces.
- All four files in `src/lib/performance/` import from `./types`.
- `src/lib/edge/edge-optimizer.ts` imports `EdgePerformanceMetrics` from
  `@/lib/performance/types` (re-export via `src/lib/edge/types.ts`).
- `src/lib/testing/performance-regression-testing.ts` does the same.
- `src/lib/performance-monitor.ts` (root) is re-exported from
  `src/lib/performance/index.ts` for backward compatibility, then callers
  are migrated to the nested path and the root file is deleted.

### Migration steps

1. Create `src/lib/performance/types.ts` with the canonical definitions.
2. In each consumer, replace local definitions with imports from the
   canonical source. Keep a temporary `export type { ... }` re-export at the
   old location so downstream imports don't break.
3. Verify with `npm run type-check` after each file switches over.
4. Once all consumers migrate, remove the duplicate definitions.
5. Add a unit test that asserts the canonical types compile against every
   former definition site (compile-fence test) to catch drift.

### Tracking

- Canonical types file: `src/lib/performance/types.ts` (**new**)
- Delete after migration: `src/lib/performance-monitor.ts` (root)
- Barrel: `src/lib/performance/index.ts` re-exports everything
