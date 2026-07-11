# Database Connection Pooling

## Why

The production database sets `max_connections = 200`. At 100K+ concurrent
users the application cannot hold a backend per request — connection
exhaustion would cascade into 500s during the exact surges the platform
exists to serve. **All application traffic must go through a transaction
pool** (Supavisor or PgBouncer) that multiplexes many client connections
onto a small number of Postgres backends.

## Topology

```
Application  ──►  Supavisor / PgBouncer (port 6543, transaction mode)
                        │
                        └─►  Postgres (port 5432, max_connections = 200)
```

- **Port 6543** — pooled DSN. All `process.env.DATABASE_URL` reads in the
  app MUST resolve to this. `@supabase/ssr` and `@supabase/supabase-js`
  clients use the Supabase project URL (which already routes through
  Supavisor on Supabase-hosted deployments).
- **Port 5432** — direct DSN. Use only for migrations (`supabase db push`)
  and admin sessions.

## Required settings on the pooler

- **Pool mode:** `transaction` (not `session`). Required because the app
  is stateless across requests and uses prepared-statement-free queries
  via PostgREST.
- **Default pool size:** tuned so that `pool_size × pooler_processes`
  comfortably stays below `max_connections - reserved_admin_connections`
  (we reserve ~20 backends for admin/migration/monitoring).
- **Statement timeout:** 30s on the pooler; per-query timeouts are also
  enforced client-side via `executeWithTimeout` in
  `src/lib/database/query-optimizer.ts`.
- **Connection idle timeout:** 60s. Prevents stale backends from
  accumulating during lulls before a surge.

## Verifying it's in place

```sql
-- On the application DSN (port 6543), the pooler reports a non-Postgres
-- server signature. On the direct DSN you'll see the real version.
SHOW server_version;
SELECT count(*) FROM pg_stat_activity;
```

If `pg_stat_activity` on the direct DSN shows every backend saturated
during a load test while the pooled DSN keeps serving, pooling is working.

## What this does NOT do

Pooling protects the backend count; it does not reduce per-query cost.
The other scale fixes (RLS without per-row PostGIS, batched consensus
drain, shared realtime channels) address the per-request work that would
otherwise saturate the pooled backends anyway.
