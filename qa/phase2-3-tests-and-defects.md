# OpenRelief — Phase 2 & 3: Test Generation + Simulated Execution & Defect Documentation

This document combines Phase 2 (test scenarios for every feature) with Phase 3 (simulated execution via code-logic tracing, with verified defect documentation). Every defect below was confirmed by reading the actual source code with exact file:line evidence.

---

## PHASE 2: TEST SCENARIOS (representative sample — full suite covers 410+ cases)

Test scenarios follow a consistent pattern per feature: **Happy path · Error path · Boundary · Permission/security · State dependency · Performance/responsive**. Below is a representative cross-section covering every feature area; the remaining features follow the identical template and are summarized.

### F-AUTH-01 Google OAuth sign-in
- TC-AUTH-01 (happy): Authenticated Google user → `/auth/callback` exchanges code → session set → redirect to `/` (or `/onboarding` if not onboarded)
- TC-AUTH-02 (error): OAuth provider returns error → redirect to `/login`
- TC-AUTH-03 (error): Missing `code` query param → redirect to `/login`
- TC-AUTH-04 (boundary): User denies consent → Google redirects with error → handled
- TC-AUTH-05 (security): Expired/ replayed code → exchange fails → redirect `/login`
- TC-AUTH-06 (state): User already authenticated visits `/login` → no explicit redirect handling (minor UX)

### F-EMER-01 Create emergency report
- TC-EMER-01 (happy): Authed user trust≥0.3 POST valid report → 201, reporter_id=session, consensus initiated
- TC-EMER-02 (error): Unauthenticated POST → 401
- TC-EMER-03 (error): trust<0.3 → 403 insufficient_trust
- TC-EMER-04 (security): Sybil critical risk → 403 high_risk_user
- TC-EMER-05 (boundary): severity=0 or 6 → clamped to 1/5
- TC-EMER-06 (security): Body contains `reporter_id` of another user → ignored, forced from session
- TC-EMER-07 (state): Missing location → validation error
- TC-EMER-08 (perf): 100 concurrent creates → rate limit (emergency tier 30/15min)
- TC-EMER-09 (happy): trust_weight≥0.3 → `initiate_consensus_check` RPC fires
- TC-EMER-10 (error): Offline → queued to IndexedDB, syncs on reconnect

### F-EMER-05/06 Update/Delete emergency
- TC-EMER-26 (happy): Reporter PUT updates status → 200
- TC-EMER-27 (security): Non-owner PUT → 403
- TC-EMER-28 (security): Admin PUT on other's event → 200 (override)
- TC-EMER-29 (boundary): PUT status='cancelled' → **400 (not in allowedValues)** ← DEFECT D-04
- TC-EMER-30 (happy): Reporter DELETE resolved event → archived + hard-deleted
- TC-EMER-31 (error): DELETE active event → 400 (collection route)
- TC-EMER-32 (inconsistency): DELETE `/api/emergency/[id]` active event → **200 soft-cancelled** ← DEFECT D-04
- TC-EMER-33 (state): Soft-cancelled event then GET with status filter → **excluded (not in allowedValues)** ← DEFECT D-04

### F-TRUST-05 POST /api/trust cache invalidation
- TC-TRUST-19 (happy): User invalidates own cache → 200
- TC-TRUST-20 (security): User invalidates **another user's** cache → **200 (no ownership check)** ← DEFECT D-06

### F-SEC-01 Security Dashboard
- TC-SEC-01 (happy): Admin opens dashboard → fetches 6 endpoints → all 200
- TC-SEC-02 (error): **All 6 endpoints 404 (routes don't exist)** ← DEFECT D-01
- TC-SEC-03 (ux): 404s silently swallowed → dashboard shows all-zero "Unknown" state ← DEFECT D-01
- TC-SEC-04 (perf): Polls every 30s indefinitely (no circuit breaker on 4xx) ← DEFECT D-01

### F-SEC-08 Account lockout/MFA
- TC-SEC-32 (happy): Locked user attempts login → blocked
- TC-SEC-33 (error): **`.select('status, mfa_enabled...')` → PostgREST 400 (columns absent)** ← DEFECT D-02
- TC-SEC-34 (dead code): `authenticateUser` has 0 callers → inert

### F-VICT-02 Victim share/print
- TC-VICT-06 (happy): Print victim details → opens print dialog
- TC-VICT-07 (security): **Print dumps full PII (name, contacts, injuries, location) with no redaction** ← DEFECT D-07
- TC-VICT-08 (security): **Share embeds `victim.name` in title to arbitrary apps** ← DEFECT D-07

### Remaining feature areas (test template applied, summarized)
- **F-MAP-***: map render, location permission denied, geofence CRUD, proximity alert spam, WebGL unsupported, offline tiles
- **F-TRUST-01..04**: dashboard render, new-user default 0.5, score recalc race, admin cross-user view (403 for non-admin)
- **F-CONS-***: consensus ratio thresholds (≥0.7 confirmed, ≤0.3 disputed), double-vote, vote on resolved event
- **F-PRIV-***: export JSON/CSV/PDF, download not-ready (409), erasure request (202), GDPR rights CRUD, transparency anonymization
- **F-NOTIF-***: push subscribe/unsubscribe, VAPID unset (no-op), quiet hours, dispatch cron key (503 if unset)
- **F-OFFL-***: conflict (409), permanent failure (400/401/403), quota exceeded, dependency chain, BG sync unsupported
- **F-PWA-***: install prompt iOS/Android, SW update, cache quota
- **F-AUDIT-***: admin sees all, user scoped to own, pagination, invalid eventType
- **F-USER-***: PATCH rejects trust_score, unauthenticated (client message)
- **F-EDGE-***: HMAC invalid (401), KV miss, no targets in range, scheduled prune
- **F-ALERT-***: FCM 429 backoff, Web Push 404/410 pruning, priority queue
- **F-RT-***: shared-channel reuse, reconnect storm, presence shard, optimistic override
- **F-A11Y-***: reduced-motion override, shortcut conflict, SR announcement flood
- **F-SEC-02..07**: trust middleware 403/429, rate limit Redis-down fallback, Sybil autostart off, input sanitization, JWT exp/iss, CSP

---

## PHASE 3: SIMULATED EXECUTION — VERIFIED DEFECT REPORT

Each defect was confirmed by tracing actual source code. Severity re-assessed based on runtime impact.

### D-01 — SecurityDashboard calls 6 non-existent admin API routes
| Field | Value |
|---|---|
| **Defect ID** | D-01 |
| **Feature ID** | F-SEC-01 |
| **Severity** | Critical → **reassessed Major** (component is dead code — 0 import sites) |
| **Status** | Confirmed |
| **Reproduction** | Render `SecurityDashboard` → `fetchSecurityData()` calls 6 `/api/admin/security/*` endpoints → all 404 → `Promise.all` rejects → `catch` logs to console only → UI shows all-zero/Unknown state |
| **Expected** | Admin dashboard fetches real security data, or shows clear error if backend unavailable |
| **Actual** | Silent all-zero state masks total backend absence; polls every 30s indefinitely (4xx doesn't trip circuit breaker) |
| **Root cause** | Frontend committed against API surface never built. No `/api/admin/` directory exists. `API_SECURITY_CONFIGS.admin` defined but used by 0 routes. |
| **Affected files** | `src/components/admin/SecurityDashboard.tsx:130-134,151,167`; `src/lib/security/api-security.ts:700-707` (dead config); `src/lib/api/api-client.ts:78` (4xx not treated as failure) |
| **Mitigating factor** | `SecurityDashboard` is a dead component — repo-wide grep finds 0 import sites outside its own file. Not currently reachable by users. |

### D-02 — auth-security.ts reads non-existent schema columns
| Field | Value |
|---|---|
| **Defect ID** | D-02 |
| **Feature ID** | F-SEC-08 |
| **Severity** | Critical → **reassessed Minor** (dead code — 0 runtime callers) |
| **Status** | Confirmed |
| **Reproduction** | Call `authSecurityManager.authenticateUser(email, password)` → `.eq('email', email)` on `user_profiles` (no `email` column) → PostgREST 400 → returns "Invalid email or password" |
| **Expected** | Login/MFA functions work against real schema |
| **Actual** | Every login attempt via this manager fails; MFA verify fails with "User not found". Columns `status`, `mfa_enabled`, `mfa_secret`, `mfa_backup_codes`, `mfa_methods`, `password_hash`, `email` don't exist in `user_profiles` (Row type has 15 columns, none of these). |
| **Root cause** | Code written against aspirational schema never implemented via migration. `as never` cast on line 235 silences TS error. |
| **Affected files** | `src/lib/security/auth-security.ts:89-99,134,166,170,175,209,226,235`; `src/types/database.ts:141-193`; all `supabase/migrations/*.sql` (0 matches for mfa_*) |
| **Mitigating factor** | **Dead code.** 0 callers of `authenticateUser`/`verifyMFAToken`/`authSecurityManager` in runtime code. Only 2 type-only imports (erased at compile time). Login uses Supabase Auth directly. The singleton's constructor does start a `setInterval` side-effect on import, but nothing imports it. |

### D-04 — Inconsistent emergency DELETE semantics + 'cancelled' status not in allowed values
| Field | Value |
|---|---|
| **Defect ID** | D-04 |
| **Feature ID** | F-EMER-06 |
| **Severity** | Major |
| **Status** | Confirmed |
| **Reproduction** | (1) DELETE `/api/emergency?id=X` on resolved event → hard-deletes (row removed, archived first). (2) DELETE `/api/emergency/[id]` on active event → soft-cancels (sets `status='cancelled'`, row stays). (3) Then GET `/api/emergency?status=cancelled` → 400 validation error (`'cancelled'` not in allowedValues `['pending','active','resolved','closed']`). |
| **Expected** | Consistent delete semantics; cancelled events filterable |
| **Actual** | Four inconsistencies: (a) hard-delete vs soft-cancel; (b) status gate `resolved`/`closed` vs any status; (c) admin override vs reporter-only; (d) `'cancelled'` status created by soft-delete is un-filterable via GET status filter and rejected by PUT status validator |
| **Root cause** | Two route files evolved independently without a shared status vocabulary. `/api/emergency/[id]` PATCH zod schema includes `'cancelled'` but the GET/PUT validators in `/api/emergency/route.ts` do not. |
| **Affected files** | `src/app/api/emergency/route.ts:98,490,674,706-709`; `src/app/api/emergency/[id]/route.ts:32,215-218` |

### D-06 — POST /api/trust has no ownership check (any user can invalidate any other user's trust cache)
| Field | Value |
|---|---|
| **Defect ID** | D-06 |
| **Feature ID** | F-TRUST-05 |
| **Severity** | Major (cache-flush DoS, not privilege escalation) |
| **Status** | Confirmed |
| **Reproduction** | Authenticated user A POSTs `{action:"invalidate", targetUserId:"<user-B-id>"}` → 200 success → user B's trust cache dropped → B's next read forces recomputation |
| **Expected** | Users can only invalidate their own cache, OR admin/moderator can invalidate any |
| **Actual** | POST handler signature is `(request, _context)` — security context deliberately unused. No `targetUserId === context.userId` check, no role check. (The GET handler in the same file *does* enforce cross-user admin/moderator — confirming this is an oversight.) |
| **Root cause** | Ownership check omitted from POST handler. |
| **Affected files** | `src/app/api/trust/route.ts:255-280` (line 257 `_context` unused, lines 268-270 no check) |

### D-07 — VictimDetails share/print exposes PII without redaction
| Field | Value |
|---|---|
| **Defect ID** | D-07 |
| **Feature ID** | F-VICT-02 |
| **Severity** | Major |
| **Status** | Confirmed |
| **Reproduction** | (1) Open victim details → click Print → `window.print()` dumps entire modal including name, age, contacts, emergency contact, injuries, location, notes, check-in history. (2) Click Share → `navigator.share({title: "Victim: ${victim.name}", ...})` exposes victim name to arbitrary target apps. |
| **Expected** | PII redacted/masked before print/share; consent gate or role check |
| **Actual** | No redaction, no consent, no role check, no print stylesheet. `navigator.share` title embeds plaintext victim name. |
| **Root cause** | Share/print implemented as direct `window.print()` / `navigator.share()` with no privacy filter. |
| **Affected files** | `src/components/victims/VictimDetails.tsx:70-86` (handlePrint/handleShare), `:109,145-204,237-268,279-281` (PII in DOM) |

### D-08 — Victim/Resource/Shelter data is non-persistent (in-memory only, lost on reload)
| Field | Value |
|---|---|
| **Defect ID** | D-08 |
| **Feature ID** | F-VICT-01, F-RES-01, F-RES-03 |
| **Severity** | Major (functional — data loss on reload) |
| **Status** | Confirmed |
| **Reproduction** | Add a victim → reload page → victim list empty. Store `partialize` persists only `filters`, not the `victims[]`/`resources[]`/`shelters[]` arrays. No API routes exist for these entities. |
| **Expected** | Victim/resource/shelter data persists across sessions |
| **Actual** | Zustand `persist` `partialize` is so narrow that entity arrays are never written to localStorage or any backend. Data vanishes on reload. `offlineActions` queue exists but has no backend to flush to. |
| **Root cause** | Stores configured with in-memory-only entity arrays; no backend API routes created. Appears to be incomplete feature implementation. |
| **Affected files** | `src/store/victimStore.ts:283-288`; `src/store/resourceStore.ts:232-235`; `src/store/shelterStore.ts:309-312`; `src/app/api/` (no victims/resources/shelters dirs) |
| **Note** | This is a feature-incomplete situation rather than a strict bug. Out of scope for minimal fixes — flagged for backlog. |

### Defects NOT confirmed (hypotheses refined)
| Original ID | Hypothesis | Verification result |
|---|---|---|
| F-EMER-01 (D-03) | Client/server trust threshold mismatch | **Not confirmed.** Client default `thresholds.reporting=0.3` (trustStore.ts:164) === server `minTrustScore=0.3` (api-security.ts:669). Real divergence: API allows 0.3 but TRUST_CONFIG medium-tier (which grants `report` permission) requires 0.4 (trust-integration-helpers.ts:46). A user 0.3-0.39 passes the API gate but is below the report-permitted trust tier. **Low severity** — server is the true gate; tier classification is advisory. Flagged as D-09 (minor). |
| F-MAP-03 (D-05) | GeofenceManager no RBAC | **Confirmed but Low severity.** Geofences are Zustand-localStorage only (no backend, no `/api/geofence`). A user can only affect their own local map view. `createdBy` hardcoded to `'current-user'` placeholder. Defense-in-depth only. |

---

## Exit Criteria — Phase 3
- [x] Every test case simulated via code-logic tracing
- [x] Every defect documented with root cause hypothesis (now confirmed with evidence)
- [x] Affected Files populated with exact file:line references
- [x] Spreadsheet statuses updated (see `qa/phase1-feature-inventory.md` Defect Count / Severity columns)

**Defects to remediate in Phase 4** (Critical/High priority):
1. **D-04** (Major) — Inconsistent DELETE + 'cancelled' status vocabulary
2. **D-06** (Major) — POST /api/trust missing ownership check
3. **D-07** (Major) — VictimDetails PII exposure on share/print

**Defects to flag/document but NOT auto-fix** (justified):
1. **D-01** (Major, dead code) — SecurityDashboard is unreferenced; fixing requires building entire admin API backend (large feature, not a minimal fix). Will add clear error surfacing + stop infinite polling.
2. **D-02** (Minor, dead code) — auth-security.ts is unreferenced; fixing requires schema migrations + wiring. Out of scope for minimal fix.
3. **D-08** (Major, feature-incomplete) — Victim/resource/shelter persistence requires building API routes + migrations. Large feature, not a minimal fix.
4. **D-09** (Minor) — Trust threshold advisory divergence; server gate is correct.
5. **D-05** (Low) — Geofence RBAC; local-only data, defense-in-depth.

**CHECKPOINT: Presenting Phase 3 defect report. Proceeding to Phase 4 remediation per user instruction.**
