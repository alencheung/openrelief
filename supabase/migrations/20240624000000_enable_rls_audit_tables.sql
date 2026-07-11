-- Enable Row Level Security on audit / compliance tables and the
-- partitioned notification queue
--
-- Background
-- ----------
-- The audit and compliance tables introduced in
-- 20231205_enhanced_audit_system.sql were created WITHOUT
-- `ENABLE ROW LEVEL SECURITY`, as was `notification_queue_partitioned`
-- introduced in 20240115000009_production_optimizations.sql (which only
-- inherits the base `notification_queue` columns via `LIKE ...`, not its
-- RLS state). With RLS off, any role granted table privileges — including
-- `anon` / `authenticated` — could read or modify the contents directly.
--
-- Security rationale
-- ------------------
-- These tables hold highly sensitive operational data:
--
--   * `audit_metadata`             — hash-chain integrity state for the
--                                    audit log; tampering breaks audit
--                                    provenance.
--   * `compliance_rules`           — policy definitions; altering them
--                                    could silently disable controls.
--   * `compliance_violations`      — contains `affected_users TEXT[]`,
--                                    i.e. identified user data subject
--                                    to GDPR / CCPA.
--   * `compliance_status`          — overall compliance posture.
--   * `security_evidence`          — forensic evidence including a
--                                    `collected_by TEXT` actor field.
--   * `threat_intelligence`        — indicators of compromise.
--   * `audit_report_configs`       — report query templates and
--                                    recipient lists.
--   * `audit_reports`              — generated audit report metadata.
--   * `notification_queue_partitioned` — partitioned copy of
--                                    `notification_queue`, which itself
--                                    is RLS-protected; the partitioned
--                                    variant must be locked down too.
--
-- This migration hardens all nine tables:
--
--   * RLS is turned on. With no permissive policy for `anon` /
--     `authenticated`, direct client access is denied by default.
--   * A single service-role policy is added to each table, mirroring the
--     established pattern in 20240101000005_rls_policies.sql (e.g. the
--     `audit_log` and `system_metrics` service-role policies) and the
--     follow-on in 20240623000000_enable_rls_consensus_trust_work.sql.
--     The `service_role` itself bypasses RLS in Supabase, but the
--     explicit policy documents intent and guards against future
--     client-side mistakes if bypass behaviour ever changes.
--
-- Idempotency
-- -----------
-- Postgres has no `CREATE POLICY IF NOT EXISTS`; each `CREATE POLICY` is
-- therefore preceded by a matching `DROP POLICY IF EXISTS` so the
-- migration is safe to re-run.

-- ---------------------------------------------------------------------------
-- Enable RLS on the audit / compliance tables
-- ---------------------------------------------------------------------------

ALTER TABLE audit_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_report_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Enable RLS on the partitioned notification queue
-- ---------------------------------------------------------------------------

ALTER TABLE notification_queue_partitioned ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Service-role-only policies (anon / authenticated are denied by default)
-- ---------------------------------------------------------------------------

-- audit_metadata
DROP POLICY IF EXISTS "Service role can manage audit_metadata" ON audit_metadata;
CREATE POLICY "Service role can manage audit_metadata" ON audit_metadata
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- compliance_rules
DROP POLICY IF EXISTS "Service role can manage compliance_rules" ON compliance_rules;
CREATE POLICY "Service role can manage compliance_rules" ON compliance_rules
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- compliance_violations (holds affected_users TEXT[] — user data)
DROP POLICY IF EXISTS "Service role can manage compliance_violations" ON compliance_violations;
CREATE POLICY "Service role can manage compliance_violations" ON compliance_violations
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- compliance_status
DROP POLICY IF EXISTS "Service role can manage compliance_status" ON compliance_status;
CREATE POLICY "Service role can manage compliance_status" ON compliance_status
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- security_evidence (holds collected_by TEXT)
DROP POLICY IF EXISTS "Service role can manage security_evidence" ON security_evidence;
CREATE POLICY "Service role can manage security_evidence" ON security_evidence
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- threat_intelligence
DROP POLICY IF EXISTS "Service role can manage threat_intelligence" ON threat_intelligence;
CREATE POLICY "Service role can manage threat_intelligence" ON threat_intelligence
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- audit_report_configs
DROP POLICY IF EXISTS "Service role can manage audit_report_configs" ON audit_report_configs;
CREATE POLICY "Service role can manage audit_report_configs" ON audit_report_configs
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- audit_reports
DROP POLICY IF EXISTS "Service role can manage audit_reports" ON audit_reports;
CREATE POLICY "Service role can manage audit_reports" ON audit_reports
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- notification_queue_partitioned
DROP POLICY IF EXISTS "Service role can manage notification_queue_partitioned" ON notification_queue_partitioned;
CREATE POLICY "Service role can manage notification_queue_partitioned" ON notification_queue_partitioned
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );
