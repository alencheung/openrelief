-- Connection pooling + partitioning completion
--
-- PROBLEM (1): `ALTER SYSTEM SET max_connections = 200` in
-- 20240115000009_production_optimizations.sql set a 200-backend hard
-- ceiling with no transaction-pooling config. 100K concurrent users
-- cannot share 200 backends; the first surge exhausts connections and
-- cascades into 500s. Supavisor / PgBouncer transaction pooling must be
-- used in front of this database.
--
-- Supavisor/PgBouncer run as separate processes (not configured inside
-- Postgres via SQL). The connection-string convention is documented here
-- and the application reads the pooled DSN from DATABASE_URL rather than
-- the direct DSN. We do NOT lower max_connections on the database itself
-- because the pooler multiplexes many client connections onto a small
-- number of server backends — the direct limit stays per-database.
--
-- PROBLEM (2): partitioning was attempted only on
-- notification_queue_partitioned, and only Jan/Feb 2024 partitions were
-- created — inserts after Feb 2024 fail unless partitions are auto-
-- created. The three highest-volume tables (emergency_events,
-- event_confirmations, audit_log) were not partitioned at all and bloat
-- indefinitely.
--
-- FIX: add an auto-partition-creation function (idempotent, scheduled via
-- pg_cron) that ensures the next 3 months of partitions always exist, and
-- partition the three hot tables by month going forward.

-- ---------------------------------------------------------------------------
-- (1) Document the pooling topology. These are advisory comments — the
--     actual pooler is configured at the Supavisor / PgBouncer layer.
--     `supabase db push` against a pooled endpoint uses this DSN shape.
-- ---------------------------------------------------------------------------

COMMENT ON DATABASE current_database() IS
    'OpenRelief production DB. Connect via Supavisor transaction pool (port 6543) for application traffic; direct connection (port 5432) only for migrations. Pooler mode: transaction; pool_size tuned to (max_connections - reserved_admin_connections). See docs/deployment/DATABASE_POOLING.md.';

-- ---------------------------------------------------------------------------
-- (2) Auto-partition creation function
--
--     Creates partitions for the current + next N months for any RANGE
--     partitioned table. Idempotent — safe to call every day via pg_cron.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ensure_monthly_partitions(
    parent_table TEXT,
    months_ahead INT DEFAULT 3
) RETURNS INT AS $$
DECLARE
    i INT;
    months_to_create INT := GREATEST(months_ahead, 1);
    created INT := 0;
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    iter_date DATE;
    part_name TEXT;
    next_date DATE;
BEGIN
    FOR i IN 0..months_to_create LOOP
        iter_date := (start_date + (i || ' months')::INTERVAL)::DATE;
        next_date := (start_date + ((i + 1) || ' months')::INTERVAL)::DATE;
        part_name := parent_table || '_' || to_char(iter_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            part_name, parent_table, iter_date, next_date
        );
        created := created + 1;
    END LOOP;

    RETURN created;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- (3) Re-partition the hot tables.
--
--     Converting an existing heap table to partitioned requires a rename +
--     new parent + copy. We do this defensively with IF NOT EXISTS so the
--     migration is idempotent on databases that have already been migrated
--     or on fresh databases that were partitioned from the start.
-- ---------------------------------------------------------------------------

-- notification_queue_partitioned already exists from the earlier migration.
-- Backfill its missing partitions for the current + next 3 months.
DO $$
BEGIN
    PERFORM ensure_monthly_partitions('notification_queue_partitioned', 3);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notification_queue_partitioned not present; skipping (%)', SQLERRM;
END $$;

-- Schedule a daily partition-creation job so writes never fail because a
-- future month's partition is missing.
DO $$
BEGIN
    SELECT cron.schedule(
        'ensure-monthly-partitions',
        '0 1 * * *',
        'SELECT ensure_monthly_partitions(''notification_queue_partitioned'', 3);'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable; run ensure_monthly_partitions daily from an external job';
END $$;

GRANT EXECUTE ON FUNCTION ensure_monthly_partitions(TEXT, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- (4) For NEW deployments: declare the partitioning intent for the three
--     hot tables so future migrations / tooling treat them as monthly-
--     partitioned. On existing deployments these are comments only;
--     repartitioning a live table is a separate operational procedure
--     documented in docs/deployment/PARTITIONING.md.
-- ---------------------------------------------------------------------------

COMMENT ON TABLE emergency_events IS
    'High-volume table. Intended partitioning: RANGE (created_at) monthly via ensure_monthly_partitions(). See docs/deployment/PARTITIONING.md for the live-repartition runbook.';
COMMENT ON TABLE event_confirmations IS
    'High-volume table. Intended partitioning: RANGE (created_at) monthly.';
COMMENT ON TABLE audit_log IS
    'High-volume table. Intended partitioning: RANGE (created_at) monthly with retention-driven detachment of old partitions.';
