-- Spatial and Consensus Functions for OpenRelief
-- This migration adds missing functions referenced by the API

-- =============================================================================
-- NEARBY EMERGENCY EVENTS FUNCTION
-- Returns emergency events within a specified radius from a center point
-- Uses PostGIS ST_DWithin for efficient spatial query with geography type
-- =============================================================================
CREATE OR REPLACE FUNCTION nearby_emergency_events(
    p_center_lat FLOAT,
    p_center_lng FLOAT,
    p_radius_meters FLOAT
)
RETURNS TABLE (
    id UUID,
    type_id INTEGER,
    reporter_id UUID,
    title TEXT,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    radius_meters INTEGER,
    severity INTEGER,
    status emergency_events_status,
    trust_weight FLOAT,
    confirmation_count INTEGER,
    dispute_count INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    distance_meters FLOAT
) AS $$
DECLARE
    v_center_point GEOGRAPHY(POINT, 4326);
BEGIN
    -- Validate inputs
    IF p_center_lat IS NULL OR p_center_lng IS NULL OR p_radius_meters IS NULL THEN
        RAISE EXCEPTION 'center_lat, center_lng, and radius_meters are required parameters';
    END IF;
    
    IF p_center_lat < -90 OR p_center_lat > 90 THEN
        RAISE EXCEPTION 'center_lat must be between -90 and 90 degrees';
    END IF;
    
    IF p_center_lng < -180 OR p_center_lng > 180 THEN
        RAISE EXCEPTION 'center_lng must be between -180 and 180 degrees';
    END IF;
    
    IF p_radius_meters <= 0 THEN
        RAISE EXCEPTION 'radius_meters must be a positive value';
    END IF;
    
    -- Create center point geography
    v_center_point := ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::GEOGRAPHY;
    
    -- Return events within radius using ST_DWithin for efficient spatial query
    -- Only return non-expired, active events ordered by distance and severity
    RETURN QUERY
    SELECT 
        ee.id,
        ee.type_id,
        ee.reporter_id,
        ee.title,
        ee.description,
        ee.location,
        ee.radius_meters,
        ee.severity,
        ee.status,
        ee.trust_weight,
        ee.confirmation_count,
        ee.dispute_count,
        ee.metadata,
        ee.created_at,
        ee.updated_at,
        ee.expires_at,
        ee.resolved_at,
        ee.resolved_by,
        ST_Distance(ee.location, v_center_point) as distance_meters
    FROM emergency_events ee
    WHERE 
        ST_DWithin(ee.location, v_center_point, p_radius_meters)
        AND ee.status IN ('active', 'pending')
        AND (ee.expires_at IS NULL OR ee.expires_at > NOW())
    ORDER BY 
        distance_meters ASC,
        ee.severity DESC,
        ee.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION nearby_emergency_events(FLOAT, FLOAT, FLOAT) IS 
'Returns emergency events within specified radius from center point. 
Uses PostGIS ST_DWithin for efficient spatial query. 
Only returns active and pending events that have not expired.
Results ordered by distance, then severity, then recency.';

-- =============================================================================
-- INITIATE CONSENSUS CHECK FUNCTION
-- Triggers consensus calculation for an emergency event
-- Acts as a wrapper around calculate_event_consensus for async handling
-- =============================================================================
CREATE OR REPLACE FUNCTION initiate_consensus_check(
    p_event_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_event_exists BOOLEAN;
    v_current_status TEXT;
BEGIN
    -- Validate input
    IF p_event_id IS NULL THEN
        RAISE EXCEPTION 'event_id is required';
    END IF;
    
    -- Check if event exists and get current status
    SELECT EXISTS(SELECT 1 FROM emergency_events WHERE id = p_event_id), status
    INTO v_event_exists, v_current_status
    FROM emergency_events
    WHERE id = p_event_id;
    
    IF NOT v_event_exists THEN
        RAISE EXCEPTION 'Event with id % does not exist', p_event_id;
    END IF;
    
    -- Only trigger consensus for pending or active events
    IF v_current_status NOT IN ('pending', 'active') THEN
        -- Event is resolved or expired, no need for consensus check
        RETURN;
    END IF;
    
    -- Call the main consensus calculation function
    -- This is synchronous but could be made async via pg_notify
    PERFORM calculate_event_consensus(p_event_id);
    
    -- Notify any listeners that consensus check was initiated
    -- This enables async processing by external services if needed
    PERFORM pg_notify(
        'consensus_check_initiated',
        json_build_object(
            'event_id', p_event_id,
            'timestamp', NOW(),
            'status', v_current_status
        )::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION initiate_consensus_check(UUID) IS 
'Triggers consensus calculation for an emergency event.
Wrapper around calculate_event_consensus that adds validation,
notifications, and enables future async processing.
Only processes pending or active events.';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION nearby_emergency_events(FLOAT, FLOAT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION initiate_consensus_check(UUID) TO authenticated;
