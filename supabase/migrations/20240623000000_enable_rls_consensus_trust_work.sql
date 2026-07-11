-- Enable Row Level Security on the consensus / trust work-queue tables
--
-- Background
-- ----------
-- The work-queue tables `consensus_work` and `trust_recompute_work` were
-- introduced in 20240620000001_batched_consensus.sql to replace heavy
-- per-row triggers on `event_confirmations`. They are written to by a
-- statement-level trigger and drained exclusively by service-role code
-- paths (the pg_cron-scheduled `drain_consensus_work()` /
-- `drain_trust_recompute_work()` functions, or an equivalent external
-- worker / edge function).
--
-- Security rationale
-- ------------------
-- Both tables were created WITHOUT `ENABLE ROW LEVEL SECURITY`, so any
-- role with table privileges (including `anon` / `authenticated`) could
-- read or tamper with pending work items, observable queue state, and
-- processing timing. This migration hardens them:
--
--   * RLS is turned on for both tables. With no permissive policy for
--     `anon` / `authenticated`, direct client access is denied by
--     default.
--   * A single service-role policy is added to each table, mirroring the
--     established pattern in 20240101000005_rls_policies.sql (e.g. the
--     `audit_log` and `system_metrics` service-role policies). The
--     `service_role` itself bypasses RLS in Supabase, but the explicit
--     policy documents intent and guards against future client-side
--     mistakes if bypass behaviour ever changes.

-- ---------------------------------------------------------------------------
-- Enable RLS on the work-queue tables
-- ---------------------------------------------------------------------------

ALTER TABLE consensus_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_recompute_work ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Service-role-only policies (anon / authenticated are denied by default)
-- ---------------------------------------------------------------------------

-- Only service role can manage consensus work items
-- DROP first for idempotency: Postgres has no CREATE POLICY IF NOT EXISTS.
DROP POLICY IF EXISTS "Service role can manage consensus work" ON consensus_work;
CREATE POLICY "Service role can manage consensus work" ON consensus_work
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Only service role can manage trust recompute work items
-- DROP first for idempotency: Postgres has no CREATE POLICY IF NOT EXISTS.
DROP POLICY IF EXISTS "Service role can manage trust recompute work" ON trust_recompute_work;
CREATE POLICY "Service role can manage trust recompute work" ON trust_recompute_work
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );
