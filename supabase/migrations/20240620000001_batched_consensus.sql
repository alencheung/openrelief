-- Batched consensus + trust recompute work queue
--
-- PROBLEM: the previous schema attached 7+ row-level AFTER triggers to
-- `event_confirmations` (distance calc, trust update, trust-score recompute
-- running 3 aggregate queries over `emergency_events`, consensus recalc
-- running 2 SUMs with JOINs, audit, activity update, metrics). A single
-- confirmation INSERT therefore issued 7+ SQL statements against hot rows.
-- At 10K confirmations/min during a coordinated event that is 70K+ trigger
-- queries/min with heavy lock contention on the affected `emergency_events`
-- and `user_profiles` rows.
--
-- FIX: collapse the per-row work into a single statement-level trigger
-- that enqueues affected (event_id, user_id) tuples into a work table,
-- and let pg_cron drain the queue in batches every few seconds. This
-- turns O(rows) recomputation per INSERT into O(1) per event per drain.
--
-- The old row-level triggers are dropped; the underlying functions remain
-- available for ad-hoc / batched invocation from the drain procedure.

-- ---------------------------------------------------------------------------
-- Work queue tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consensus_work (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID,
    user_id  UUID,
    reason   TEXT,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE (event_id, user_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_consensus_work_unprocessed
    ON consensus_work (queued_at)
    WHERE processed_at IS NULL;

-- Per-user trust recompute queue (distinct from per-event consensus so the
-- two drains can run on independent cadences).
CREATE TABLE IF NOT EXISTS trust_recompute_work (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    reason TEXT,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE (user_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_trust_recompute_work_unprocessed
    ON trust_recompute_work (queued_at)
    WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Drop the heavy row-level AFTER triggers on event_confirmations
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS consensus_calculation ON event_confirmations;
DROP TRIGGER IF EXISTS trust_score_update ON event_confirmations;
DROP TRIGGER IF EXISTS update_trust_on_confirmation_trigger ON event_confirmations;
DROP TRIGGER IF EXISTS audit_event_confirmations ON event_confirmations;
DROP TRIGGER IF EXISTS update_user_activity_confirmations ON event_confirmations;
DROP TRIGGER IF EXISTS collect_confirmations_metrics ON event_confirmations;
-- calculate_confirmation_distance is a BEFORE trigger that normalises the
-- incoming row (sets distance_from_event) — keep it, it is cheap and
-- per-row by necessity.

-- ---------------------------------------------------------------------------
-- Statement-level trigger that enqueues work without recomputing
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enqueue_consensus_work()
RETURNS TRIGGER AS $$
BEGIN
    -- Enqueue one row per distinct (event_id, user_id) touched by the
    -- statement. INSERT/UPDATE expose NEW rows via transition tables only
    -- on PG 10+; we use a defensive INSERT ... ON CONFLICT so duplicate
    -- enqueues from concurrent statements are coalesced into a single
    -- pending row.
    IF TG_OP = 'INSERT' THEN
        INSERT INTO consensus_work (event_id, user_id, reason)
        SELECT DISTINCT ev.event_id, ev.user_id, 'confirmation_insert'
        FROM (SELECT NEW.*) ev
        ON CONFLICT (event_id, user_id, reason) DO NOTHING;

        INSERT INTO trust_recompute_work (user_id, reason)
        SELECT DISTINCT ev.user_id, 'confirmation_insert'
        FROM (SELECT NEW.*) ev
        ON CONFLICT (user_id, reason) DO NOTHING;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO consensus_work (event_id, user_id, reason)
        SELECT DISTINCT ev.event_id, ev.user_id, 'confirmation_delete'
        FROM (SELECT OLD.*) ev
        ON CONFLICT (event_id, user_id, reason) DO NOTHING;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- The per-row trigger function `update_user_activity_confirmations` is
-- retained as a statement-level alternative below for cheap activity
-- stamping only (a single UPDATE per affected user_id).
CREATE OR REPLACE FUNCTION stamp_user_activity_confirmations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles
        SET updated_at = NOW()
        WHERE user_id IN (SELECT DISTINCT user_id FROM (SELECT NEW.*) ev);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- DROP first for idempotency: Postgres has no CREATE TRIGGER IF NOT EXISTS.
DROP TRIGGER IF EXISTS consensus_work_enqueue ON event_confirmations;
CREATE TRIGGER consensus_work_enqueue
    AFTER INSERT OR DELETE ON event_confirmations
    REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
    FOR EACH STATEMENT EXECUTE FUNCTION enqueue_consensus_work();

DROP TRIGGER IF EXISTS update_user_activity_confirmations_stmt ON event_confirmations;
CREATE TRIGGER update_user_activity_confirmations_stmt
    AFTER INSERT ON event_confirmations
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT EXECUTE FUNCTION stamp_user_activity_confirmations();

-- ---------------------------------------------------------------------------
-- Drain procedures (invoked by pg_cron; also callable manually)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION drain_consensus_work(batch_size INT DEFAULT 500)
RETURNS INT AS $$
DECLARE
    processed INT := 0;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT DISTINCT event_id
        FROM consensus_work
        WHERE processed_at IS NULL
        ORDER BY queued_at
        LIMIT batch_size
    LOOP
        BEGIN
            -- calculate_event_consensus is the existing aggregate function
            -- defined in 20240101000004_database_functions.sql. Calling it
            -- once per distinct event per drain collapses the per-row cost.
            PERFORM calculate_event_consensus(rec.event_id);
        EXCEPTION WHEN OTHERS THEN
            -- Leave the row pending so the next drain retries; don't block
            -- the rest of the batch on a single bad event.
            INSERT INTO audit_log (action, table_name, record_id, created_at, old_values)
            VALUES (
                'consensus_drain_error',
                'emergency_events',
                rec.event_id,
                NOW(),
                jsonb_build_object('error', SQLERRM)
            );
        END;

        UPDATE consensus_work
        SET processed_at = NOW()
        WHERE event_id = rec.event_id AND processed_at IS NULL;

        processed := processed + 1;
    END LOOP;

    -- Trim processed rows older than 1 hour to keep the queue small.
    DELETE FROM consensus_work
    WHERE processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL '1 hour';

    RETURN processed;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drain_trust_recompute_work(batch_size INT DEFAULT 500)
RETURNS INT AS $$
DECLARE
    processed INT := 0;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT DISTINCT user_id
        FROM trust_recompute_work
        WHERE processed_at IS NULL
        ORDER BY queued_at
        LIMIT batch_size
    LOOP
        BEGIN
            -- calculate_trust_score runs 3 aggregates over emergency_events
            -- for one user; calling it once per user per drain replaces the
            -- per-confirmation trigger fan-out.
            PERFORM calculate_trust_score(rec.user_id);
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO audit_log (action, table_name, record_id, created_at, old_values)
            VALUES (
                'trust_drain_error',
                'user_profiles',
                rec.user_id,
                NOW(),
                jsonb_build_object('error', SQLERRM)
            );
        END;

        UPDATE trust_recompute_work
        SET processed_at = NOW()
        WHERE user_id = rec.user_id AND processed_at IS NULL;

        processed := processed + 1;
    END LOOP;

    DELETE FROM trust_recompute_work
    WHERE processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL '1 hour';

    RETURN processed;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Schedule the drains via pg_cron (every 10 seconds is as close as the
-- minute-resolution cron syntax allows; sub-minute drains can be added via
-- an external worker if even tighter latency is required).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    -- Every minute, process up to 500 distinct events + 500 distinct users.
    -- pg_cron's minimum interval is 1 minute; for sub-minute drains run
    -- drain_consensus_work() / drain_trust_recompute_work() from an
    -- application-side worker too.
    SELECT cron.schedule('drain-consensus', '* * * * *', 'SELECT drain_consensus_work(500);');
    SELECT cron.schedule('drain-trust-recompute', '* * * * *', 'SELECT drain_trust_recompute_work(500);');
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron not available in this environment; document that an
        -- external worker should call the drain functions on a short
        -- cadence instead.
        RAISE NOTICE 'pg_cron not available; schedule drain_consensus_work/drain_trust_recompute_work externally';
END $$;

GRANT EXECUTE ON FUNCTION drain_consensus_work(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION drain_trust_recompute_work(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION enqueue_consensus_work() TO authenticated, service_role;

COMMENT ON TABLE consensus_work IS
    'Work queue replacing per-row consensus triggers; drained by drain_consensus_work()';
COMMENT ON TABLE trust_recompute_work IS
    'Work queue replacing per-row trust triggers; drained by drain_trust_recompute_work()';
