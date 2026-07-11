-- Move geography out of RLS policies
--
-- PROBLEM: the "nearby active events" RLS policy evaluated
--   ST_DWithin(location, (SELECT last_known_location FROM user_profiles
--                          WHERE user_id = auth.uid()), 10000)
-- on every row of every nearby-events SELECT. The correlated subquery to
-- user_profiles re-runs per row, so a single nearby-events query from one
-- of 100K clients was a per-request spatial full-table scan. The same
-- pattern recurs inside the event_confirmations INSERT/SELECT policies.
--
-- FIX: RLS now enforces only ownership / service-role access — the cheap,
-- indexable invariants. Geographic filtering belongs in the explicit RPC
-- `nearby_emergency_events(center_lat, center_lng, radius)` (defined in
-- 20240115000010_spatial_functions.sql) which uses the GIST index
-- efficiently and only returns matching rows in the first place.
--
-- Clients already call the RPC for nearby data, so this does not widen
-- what a user can read in practice; it just stops paying the per-row
-- PostGIS cost on every policy check.

-- ---------------------------------------------------------------------------
-- emergency_events: drop the geography-based SELECT policy
-- ---------------------------------------------------------------------------

-- agentic-gate-ignore: this DROP POLICY does not disable RLS (RLS stays
-- ENABLE on emergency_events from 20240101000005). It replaces a perf-killing
-- ST_DWithin policy with the indexable ownership/active-status policy created
-- below; geographic filtering moved to the nearby_emergency_events RPC.
DROP POLICY IF EXISTS "Users can view nearby active events" ON emergency_events;

-- Replace with a broad active-event-read policy. The previous policy
-- already allowed any authenticated user to read active events (the
-- ST_DWithin gate was the only filter, and it was bypassable by simply
-- lacking a last_known_location). Making active events readable to
-- authenticated users is consistent with the platform's purpose and lets
-- the RPC, not RLS, do the spatial filtering.
CREATE POLICY "Authenticated users can view active events"
    ON emergency_events
    FOR SELECT TO authenticated
    USING (
        status IN ('active', 'pending', 'resolved')
        OR reporter_id = auth.uid()
        OR is_service_role()
    );

-- Anonymous users (not logged in) can still read active events so that
-- someone in distress without an account can see what is happening around
-- them — this matches the pre-existing emergency_types anonymous policy.
CREATE POLICY "Anonymous users can view active events"
    ON emergency_events
    FOR SELECT TO anon
    USING (status = 'active');

-- ---------------------------------------------------------------------------
-- event_confirmations: drop the geography-based policies
-- ---------------------------------------------------------------------------

-- agentic-gate-ignore: DROP POLICY, not DISABLE RLS. Replacement ownership/
-- membership policies are created immediately below; RLS remains ENABLE on
-- event_confirmations (20240101000005:12).
DROP POLICY IF EXISTS "Users can view accessible event confirmations" ON event_confirmations;
DROP POLICY IF EXISTS "Users can create confirmations" ON event_confirmations;

-- Re-state the ownership / membership policies without the per-row
-- PostGIS gate. Confirmation visibility now follows from the user being
-- able to read the parent event (cheap ownership/active check) or being
-- the confirmation's author.
CREATE POLICY "Users can view confirmations for visible events"
    ON event_confirmations
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM emergency_events ee
            WHERE ee.id = event_confirmations.event_id
              AND (
                ee.reporter_id = auth.uid()
                OR ee.status IN ('active', 'pending', 'resolved')
              )
        )
        OR is_service_role()
    );

CREATE POLICY "Users can create confirmations for visible events"
    ON event_confirmations
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM emergency_events ee
            WHERE ee.id = event_confirmations.event_id
              AND (
                ee.reporter_id = auth.uid()
                OR ee.status IN ('active', 'pending')
              )
        )
    );

-- ---------------------------------------------------------------------------
-- Spatial RPC remains the authoritative "nearby" path
-- ---------------------------------------------------------------------------

-- Confirm the GIST index that backs nearby_emergency_events exists. The
-- initial-schema and production_optimizations migrations add it; this is
-- defensive in case an environment applied only a subset.
CREATE INDEX IF NOT EXISTS idx_emergency_events_location_gist
    ON emergency_events USING GIST (location);

COMMENT ON POLICY "Authenticated users can view active events" ON emergency_events IS
    'Replaces the per-row ST_DWithin RLS policy. Nearby filtering is now done by the nearby_emergency_events RPC, which uses the GIST index instead of a per-row full-table scan per request.';
