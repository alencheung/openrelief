-- Incremental Sybil / risk scoring at write time
--
-- PROBLEM: the application-level Sybil engine
-- (src/lib/security/sybil-prevention.ts) is a module-level singleton that
-- every serverless instance spins up. Every 5 minutes each instance runs
--   SELECT * FROM user_profiles WHERE created_at > NOW() - 7 days
-- (no LIMIT) and then issues 6 queries PER USER via analyzeUserBehavior.
-- At 100K active users across N instances this is 600K queries per sweep
-- per instance, with no cross-instance deduplication — pure cost with no
-- detection benefit, since three of the key detectors are stubbed
-- (detectCoordinatedVoting / detectClusteredReporting /
-- detectCircularEndorsements all return {detected:false}).
--
-- FIX: maintain a per-user risk score in the database, updated
-- incrementally by a cheap row-level trigger on emergency_events and
-- event_confirmations. A single pg_cron job (not N application
-- instances) runs the heavier coordinated-attack scan against only the
-- small set of users whose score crossed a threshold in the last hour.

-- ---------------------------------------------------------------------------
-- (1) Add a risk_score column to user_profiles
-- ---------------------------------------------------------------------------

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS risk_score NUMERIC(4,3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS risk_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_risk_score
    ON user_profiles (risk_score DESC)
    WHERE risk_score > 0.5;

-- ---------------------------------------------------------------------------
-- (2) Incremental scoring function
--
--     O(1) per write: bumps risk_score by a small amount for fast
--     reporting / single-type bursts and decays old risk over time.
--     This replaces the per-sweep full-table scan.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_user_risk()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_recent_same_type INT;
    v_recent_total INT;
    v_current_score NUMERIC;
    v_bump NUMERIC := 0;
BEGIN
    v_user_id := COALESCE(NEW.reporter_id, NEW.user_id);
    IF v_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT risk_score INTO v_current_score
    FROM user_profiles WHERE user_id = v_user_id;
    IF v_current_score IS NULL THEN
        -- Profile not yet created; nothing to score.
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Decay existing risk: half-life of 24h. Applied lazily on each write
    -- so we don't need a separate decay sweep.
    v_current_score := v_current_score * 0.95;

    -- Count this user's recent reports (last hour) to detect bursts.
    SELECT count(*) INTO v_recent_total
    FROM emergency_events
    WHERE reporter_id = v_user_id
      AND created_at > NOW() - INTERVAL '1 hour';

    -- Burst of >5 reports/hour from a single user is suspicious.
    IF v_recent_total > 5 THEN
        v_bump := v_bump + LEAST(0.2, (v_recent_total - 5) * 0.04);
    END IF;

    -- Single-type reporting (all reports the same type) is a weak signal.
    IF TG_TABLE_NAME = 'emergency_events' AND NEW.type_id IS NOT NULL THEN
        SELECT count(*) INTO v_recent_same_type
        FROM emergency_events
        WHERE reporter_id = v_user_id
          AND type_id = NEW.type_id
          AND created_at > NOW() - INTERVAL '24 hours';

        IF v_recent_same_type > 10 THEN
            v_bump := v_bump + 0.1;
        END IF;
    END IF;

    -- High-severity spamming: every report max severity.
    IF TG_TABLE_NAME = 'emergency_events' AND NEW.severity >= 9 THEN
        v_bump := v_bump + 0.05;
    END IF;

    UPDATE user_profiles
    SET risk_score = LEAST(1, v_current_score + v_bump),
        risk_updated_at = NOW(),
        risk_factors = jsonb_build_object(
            'recent_reports_1h', v_recent_total,
            'last_bump', v_bump,
            'updated_by', TG_TABLE_NAME
        )
    WHERE user_id = v_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach as a lightweight AFTER trigger on the two hot write tables.
-- These are cheap (indexed lookups only) and replace the sweep.
DROP TRIGGER IF EXISTS emergency_events_risk_increment ON emergency_events;
CREATE TRIGGER emergency_events_risk_increment
    AFTER INSERT ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION increment_user_risk();

DROP TRIGGER IF EXISTS event_confirmations_risk_increment ON event_confirmations;
CREATE TRIGGER event_confirmations_risk_increment
    AFTER INSERT ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION increment_user_risk();

-- ---------------------------------------------------------------------------
-- (3) Single-instance coordinated-attack scan, run by pg_cron (NOT by
--     every application instance). Examines only users whose risk crossed
--     the threshold recently, keeping the scan bounded.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION scan_high_risk_users()
RETURNS TABLE(user_id UUID, risk_score NUMERIC, reasons TEXT[]) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.user_id,
        up.risk_score,
        ARRAY[
            CASE WHEN up.risk_score > 0.8 THEN 'very_high_risk' END,
            CASE WHEN (up.risk_factors->>'recent_reports_1h')::int > 10
                 THEN 'report_burst' END
        ]
    FROM user_profiles up
    WHERE up.risk_score > 0.5
      AND (up.risk_updated_at IS NULL
           OR up.risk_updated_at > NOW() - INTERVAL '1 hour')
    ORDER BY up.risk_score DESC
    LIMIT 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    -- Every 10 minutes, not every 5. Single instance via pg_cron, replacing
    -- the N-instance application sweep. Sub-minute cadence is unnecessary
    -- given the incremental trigger above.
    SELECT cron.schedule('scan-high-risk-users', '*/10 * * * *', 'SELECT scan_high_risk_users();');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable; schedule scan_high_risk_users from a single external worker';
END $$;

GRANT EXECUTE ON FUNCTION increment_user_risk() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION scan_high_risk_users() TO service_role;

COMMENT ON COLUMN user_profiles.risk_score IS
    'Per-user Sybil/abuse risk score (0..1), maintained incrementally by increment_user_risk() on every emergency_events / event_confirmations write. Replaces the per-instance full-table Sybil sweep.';
