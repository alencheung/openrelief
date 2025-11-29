-- Row Level Security (RLS) policies for OpenRelief
-- This migration sets up comprehensive security policies for all tables

-- Enable RLS on all user-related tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trust_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on emergency-related tables
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_confirmations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notification tables
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can access all profiles (for admin functions)
CREATE POLICY "Service role can access all profiles" ON user_profiles
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- User Trust History RLS Policies

-- Users can view their own trust history
CREATE POLICY "Users can view own trust history" ON user_trust_history
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can access all trust history
CREATE POLICY "Service role can access all trust history" ON user_trust_history
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Emergency Events RLS Policies

-- Users can view active events within their area
CREATE POLICY "Users can view nearby active events" ON emergency_events
    FOR SELECT USING (
        status = 'active' AND 
        ST_DWithin(
            location,
            (SELECT last_known_location FROM user_profiles WHERE user_id = auth.uid()),
            10000 -- 10km radius
        )
    );

-- Users can view events they reported
CREATE POLICY "Users can view own reported events" ON emergency_events
    FOR SELECT USING (reporter_id = auth.uid());

-- Users can insert events (they become reporters)
CREATE POLICY "Users can create emergency events" ON emergency_events
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can update their own events
CREATE POLICY "Users can update own events" ON emergency_events
    FOR UPDATE USING (auth.uid() = reporter_id);

-- Service role can manage all events
CREATE POLICY "Service role can manage all events" ON emergency_events
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Event Confirmations RLS Policies

-- Users can view confirmations for events they can access
CREATE POLICY "Users can view accessible event confirmations" ON event_confirmations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM emergency_events ee
            WHERE ee.id = event_confirmations.event_id
            AND (
                ee.reporter_id = auth.uid() OR
                (ee.status = 'active' AND ST_DWithin(
                    ee.location,
                    (SELECT last_known_location FROM user_profiles WHERE user_id = auth.uid()),
                    10000
                ))
            )
        )
    );

-- Users can view their own confirmations
CREATE POLICY "Users can view own confirmations" ON event_confirmations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert confirmations for accessible events
CREATE POLICY "Users can create confirmations" ON event_confirmations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM emergency_events ee
            WHERE ee.id = event_confirmations.event_id
            AND (
                ee.reporter_id = auth.uid() OR
                (ee.status = 'active' AND ST_DWithin(
                    ee.location,
                    (SELECT last_known_location FROM user_profiles WHERE user_id = auth.uid()),
                    10000
                ))
            )
        )
    );

-- Users can update their own confirmations (within time window)
CREATE POLICY "Users can update own confirmations" ON event_confirmations
    FOR UPDATE USING (
        auth.uid() = user_id AND
        created_at > NOW() - INTERVAL '5 minutes' -- Allow updates within 5 minutes
    );

-- Service role can manage all confirmations
CREATE POLICY "Service role can manage all confirmations" ON event_confirmations
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- User Subscriptions RLS Policies

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON user_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Service role can access all subscriptions
CREATE POLICY "Service role can access all subscriptions" ON user_subscriptions
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- User Notification Settings RLS Policies

-- Users can view their own notification settings
CREATE POLICY "Users can view own notification settings" ON user_notification_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own notification settings
CREATE POLICY "Users can manage own notification settings" ON user_notification_settings
    FOR ALL USING (auth.uid() = user_id);

-- Service role can access all notification settings
CREATE POLICY "Service role can access all notification settings" ON user_notification_settings
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Notification Queue RLS Policies

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read/cancelled)
CREATE POLICY "Users can update own notifications" ON notification_queue
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage all notifications" ON notification_queue
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Emergency Types RLS Policies (read-only for authenticated users)

-- All authenticated users can view active emergency types
CREATE POLICY "Authenticated users can view active emergency types" ON emergency_types
    FOR SELECT USING (is_active = true);

-- Anonymous users can view basic emergency types
CREATE POLICY "Anonymous users can view basic emergency types" ON emergency_types
    FOR SELECT USING (
        is_active = true AND
        slug IN ('fire', 'medical', 'security', 'natural', 'infrastructure')
    );

-- Service role can manage emergency types
CREATE POLICY "Service role can manage emergency types" ON emergency_types
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Audit Log RLS Policies (service role only)

-- Only service role can access audit logs
CREATE POLICY "Service role can access audit logs" ON audit_log
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- System Metrics RLS Policies

-- Authenticated users can view aggregated metrics (not individual entries)
CREATE POLICY "Authenticated users can view system metrics" ON system_metrics
    FOR SELECT USING (
        metric_name IN ('active_users', 'total_events', 'system_health')
    );

-- Service role can manage all metrics
CREATE POLICY "Service role can manage system metrics" ON system_metrics
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Create security helper functions

-- Function to check if user is service role
CREATE OR REPLACE FUNCTION is_service_role() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access event
CREATE OR REPLACE FUNCTION can_access_event(p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_event_exists BOOLEAN;
    v_reporter_id UUID;
    v_event_status TEXT;
    v_event_location GEOGRAPHY(POINT, 4326);
    v_user_location GEOGRAPHY(POINT, 4326);
BEGIN
    -- Check if event exists and get details
    SELECT reporter_id, status, location 
    INTO v_reporter_id, v_event_status, v_event_location
    FROM emergency_events
    WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- User can access if they reported it
    IF v_reporter_id = auth.uid() THEN
        RETURN TRUE;
    END IF;
    
    -- User can access if it's active and within their radius
    IF v_event_status = 'active' THEN
        SELECT last_known_location INTO v_user_location
        FROM user_profiles
        WHERE user_id = auth.uid();
        
        IF v_user_location IS NOT NULL THEN
            RETURN ST_DWithin(v_event_location, v_user_location, 10000);
        END IF;
    END IF;
    
    -- Service role can access everything
    RETURN is_service_role();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for security functions
GRANT EXECUTE ON FUNCTION is_service_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_event(UUID) TO authenticated;