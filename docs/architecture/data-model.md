# Data Model

> This is a **summary** of the OpenRelief data model. For the complete DDL
> (every `CREATE TABLE`, index, RLS policy, and function), see the
> authoritative [`../database/schema.md`](../database/schema.md) and the
> migrations in [`../../supabase/migrations/`](../../supabase/migrations/).

OpenRelief stores data in **PostgreSQL 15 with PostGIS 3.3+** on Supabase.
Every table has **Row Level Security (RLS)** enabled, so users can only access
rows they own or are authorized to see.

## Core Tables

These are the central tables, fully documented in
[`../database/schema.md`](../database/schema.md):

### User profiles

```sql
user_profiles (
    user_id              UUID PRIMARY KEY REFERENCES auth.users(id),
    trust_score          FLOAT DEFAULT 0.1 CHECK (>= 0.0 AND <= 1.0),
    last_known_location  GEOGRAPHY(POINT, 4326),   -- GIST indexed
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings     JSONB DEFAULT '{}',
    ...
)
```

- `trust_score` is bounded **0.0–1.0** by a CHECK constraint. Base score is
  `0.1`. See [Trust & Consensus](trust-and-consensus.md).
- `last_known_location` is a **PostGIS geography point** used for spatial
  dispatch queries. Anonymized after 7 days, nulled after 30 days (see
  `anonymize_old_locations()`).

### Emergency types

```sql
emergency_types (
    id             SERIAL PRIMARY KEY,
    slug           TEXT UNIQUE NOT NULL,   -- 'fire', 'medical', 'security', ...
    name           TEXT NOT NULL,
    default_radius INTEGER DEFAULT 1000,
    color          TEXT DEFAULT '#FF0000',
    ...
)
```

> **Note:** Some older documentation refers to a `topics` table. That name is
> obsolete — the actual table is **`emergency_types`**, keyed by `id` with a
> unique `slug`. The `emergency_events.type_id` column references
> `emergency_types(id)`.

Seeded types: `fire`, `medical`, `security`, `natural`, `infrastructure`.

### Emergency events

```sql
emergency_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id           INTEGER REFERENCES emergency_types(id),
    reporter_id       UUID REFERENCES user_profiles(user_id),
    location          GEOGRAPHY(POINT, 4326) NOT NULL,   -- GIST indexed
    severity          INTEGER CHECK (BETWEEN 1 AND 5),
    status            emergency_events_status,  -- enum: pending, active, resolved, expired
    trust_weight      FLOAT DEFAULT 0.0,
    confirmation_count INTEGER DEFAULT 0,
    expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    ...
)
```

- `reporter_id` links back to the reporting user (references `user_profiles`).
- `status` is a native Postgres enum `emergency_events_status` with values
  `pending`, `active`, `resolved`, `expired` (defined in the initial schema
  migration). A new event starts as `pending`; consensus promotes it to `active`.
  Note: the **API layer** (`src/app/api/emergency/route.ts`) also accepts
  `closed` and `cancelled` as transition targets — `cancelled` is produced by an
  owner's soft-cancel, and `closed` marks a resolved-then-archived event. These
  two are API-recognized states rather than enum values in the DB type.
- Events auto-expire after 24 hours (`expires_at`) unless resolved.
- Severity is an integer **1–5**.

### Event confirmations

```sql
event_confirmations (
    event_id  UUID REFERENCES emergency_events(id),
    user_id   UUID REFERENCES user_profiles(user_id),
    confirmation_type event_confirmations_confirmation_type,  -- enum: confirm, dispute
    trust_weight FLOAT NOT NULL,
    location            GEOGRAPHY(POINT, 4326),    -- where the confirmer was
    distance_from_event FLOAT,                     -- meters from the event
    UNIQUE(event_id, user_id)   -- one vote per user per event
)
```

### Supporting tables (documented in schema.md)

| Table | Purpose |
| --- | --- |
| `user_trust_history` | Audit trail of trust-score changes per action |
| `user_subscriptions` | User ↔ emergency-type subscriptions with radius |
| `notification_queue` | Outbox of pending/sent/failed notifications |
| `user_notification_settings` | Per-topic severity/distance/quiet-hours prefs |
| `audit_log` | Tamper-evident audit of sensitive table mutations |
| `system_metrics` | Operational metrics |

## Additional Tables (in migrations, beyond schema.md)

The migrations introduce further tables that support features added after the
initial `schema.md` was written. The full DDL lives in
[`../../supabase/migrations/`](../../supabase/migrations/). Key groups:

| Group | Tables | Purpose |
| --- | --- | --- |
| **Privacy** | `privacy_settings`, `privacy_budget`, `privacy_audit_log`, `data_export_requests`, `data_deletion_requests`, `user_consents`, `encrypted_user_data` | GDPR data export/delete, consent, differential-privacy budget tracking |
| **Legal** | `legal_requests`, `user_legal_requests` | Government data-request handling |
| **Push** | `push_subscriptions` | Web Push (VAPID) token registration |
| **Security** | `security_incidents`, `security_alerts`, `security_evidence`, `threat_intelligence` | Incident response pipeline (`src/lib/security/incident-response.ts`) |
| **Audit (enhanced)** | `enhanced_audit_log`, `audit_metadata`, `audit_reports`, `audit_report_configs` | Extended audit with report generation |
| **Compliance** | `compliance_rules`, `compliance_status`, `compliance_violations` | Compliance monitoring (`src/lib/audit/compliance-monitor.ts`) |
| **Trust cache / work** | `trust_score_cache`, `trust_recompute_work`, `consensus_work` | Batched trust recompute + consensus (queue-based) |
| **Notifications (partitioned)** | `notification_queue_partitioned`, `notification_queue_2024_01`, `notification_queue_2024_02` | Time-partitioned notification queue |

> **Doc gap:** `schema.md` does not yet include DDL for these later tables.
> When you need exact columns, check the migrations directly. Contributions to
> expand `schema.md` are welcome.

## Key Database Functions

Defined in `supabase/migrations/20240101000004_database_functions.sql` and
later migrations; documented with full DDL in
[`../database/schema.md`](../database/schema.md):

| Function | Purpose |
| --- | --- |
| `calculate_trust_score(user_id)` | Computes a user's trust from report accuracy + recency; writes back to `user_profiles` |
| `calculate_event_consensus(event_id)` | Sums trust-weighted confirmations; promotes event to `active` at threshold **5.0** |
| `get_users_for_alert_dispatch(event_id, max_distance)` | **PostGIS spatial query** returning nearby subscribed users with stepped distance-bucket relevance scoring (`severity × trust × f(distance)`) |
| `cleanup_expired_events()` | Daily `pg_cron` job: expire old events, prune audit/notifications |
| `anonymize_old_locations()` | Reduces location precision after 7 days, nulls after 30 |

## Spatial Indexing

All geography columns have **GIST indexes** — this is what makes the dispatch
query O(log N) rather than O(N):

```sql
CREATE INDEX idx_emergency_events_location ON emergency_events USING GIST (location);
CREATE INDEX idx_user_profiles_location ON user_profiles USING GIST (last_known_location);
```

Spatial filtering uses `ST_DWithin` (radius containment) and `ST_Distance`
(relevance scoring). See the spatial functions in
`20240115000010_spatial_functions.sql`.

## Row Level Security

RLS is **enabled on every user-facing table**. Typical patterns:

- **Self-access**: `USING (auth.uid() = user_id)` — users see/edit only their
  own rows.
- **Proximity-based**: emergency events are visible only when `active` **and**
  within the user's area (`ST_DWithin` against the user's
  `last_known_location`).
- **SECURITY DEFINER** functions (like `calculate_trust_score`) run with
  elevated privileges for cross-row computation, but are tightly scoped.

Full RLS policy DDL is in `20240101000005_rls_policies.sql` and subsequent
`*_rls_*` migrations.

## Connection Pooling

Production uses **Supavisor transaction pooling** (port 6543), not direct
Postgres (5432). See [`../deployment/DATABASE_POOLING.md`](../deployment/DATABASE_POOLING.md)
for required settings. The app uses `src/lib/database/query-optimizer.ts` with
`executeWithTimeout` for resilient pooled queries.
