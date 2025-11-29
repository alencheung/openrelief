-- Database functions for OpenRelief
-- This migration creates all core database functions for trust scoring, consensus, and spatial operations

-- Trust Score Calculation Function
CREATE OR REPLACE FUNCTION calculate_trust_score(
    p_user_id UUID,
    p_event_type TEXT DEFAULT NULL
) RETURNS FLOAT AS $$
DECLARE
    v_base_score FLOAT := 0.1;
    v_accuracy_bonus FLOAT := 0.0;
    v_recency_multiplier FLOAT := 1.0;
    v_final_score FLOAT;
    v_days_since_last_activity INTEGER;
    v_total_reports INTEGER;
    v_confirmed_reports INTEGER;
BEGIN
    -- Calculate accuracy bonus from confirmed reports
    SELECT 
        COUNT(*) INTO v_total_reports
    FROM emergency_events ee
    WHERE ee.reporter_id = p_user_id
    AND ee.created_at > NOW() - INTERVAL '30 days';
    
    SELECT 
        COUNT(*) INTO v_confirmed_reports
    FROM emergency_events ee
    WHERE ee.reporter_id = p_user_id
    AND ee.status = 'resolved'
    AND ee.created_at > NOW() - INTERVAL '30 days'
    AND ee.resolved_by != p_user_id;
    
    -- Calculate accuracy bonus
    IF v_total_reports > 0 THEN
        v_accuracy_bonus := (v_confirmed_reports::FLOAT / v_total_reports::FLOAT) * 0.3;
    END IF;
    
    -- Apply penalty for disputed reports
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN ee.dispute_count > ee.confirmation_count THEN -0.1
                WHEN ee.status = 'expired' THEN -0.05
                ELSE 0.0
            END
        ), 0.0
    ) INTO v_accuracy_bonus
    FROM emergency_events ee
    WHERE ee.reporter_id = p_user_id
    AND ee.created_at > NOW() - INTERVAL '30 days';
    
    -- Calculate recency multiplier
    SELECT EXTRACT(DAYS FROM NOW() - MAX(created_at)) INTO v_days_since_last_activity
    FROM emergency_events
    WHERE reporter_id = p_user_id;
    
    IF v_days_since_last_activity IS NULL THEN
        v_recency_multiplier := 0.5; -- New user penalty
    ELSIF v_days_since_last_activity > 30 THEN
        v_recency_multiplier := 0.3; -- Inactive user penalty
    ELSIF v_days_since_last_activity < 7 THEN
        v_recency_multiplier := 1.2; -- Active user bonus
    END IF;
    
    -- Calculate final score with bounds checking
    v_final_score := GREATEST(0.0, LEAST(1.0, 
        v_base_score + (v_accuracy_bonus * v_recency_multiplier)
    ));
    
    -- Update user's trust score if it has changed significantly
    UPDATE user_profiles 
    SET trust_score = v_final_score, updated_at = NOW()
    WHERE user_id = p_user_id AND ABS(trust_score - v_final_score) > 0.01;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Event Consensus Calculation Function
CREATE OR REPLACE FUNCTION calculate_event_consensus(
    p_event_id UUID
) RETURNS VOID AS $$
DECLARE
    v_total_weight FLOAT := 0.0;
    v_dispute_weight FLOAT := 0.0;
    v_threshold FLOAT := 5.0;
    v_current_status TEXT;
    v_event_type_id INTEGER;
BEGIN
    -- Get event details
    SELECT status, type_id INTO v_current_status, v_event_type_id
    FROM emergency_events
    WHERE id = p_event_id;
    
    -- Calculate total confirmation weight with time decay and distance
    SELECT COALESCE(SUM(
        up.trust_score * 
        CASE 
            WHEN ec.created_at > NOW() - INTERVAL '30 minutes' THEN 1.0
            WHEN ec.created_at > NOW() - INTERVAL '1 hour' THEN 0.8
            WHEN ec.created_at > NOW() - INTERVAL '2 hours' THEN 0.6
            ELSE 0.4
        END *
        CASE 
            WHEN ec.distance_from_event IS NULL THEN 1.0
            WHEN ec.distance_from_event < 500 THEN 1.0
            WHEN ec.distance_from_event < 1000 THEN 0.8
            WHEN ec.distance_from_event < 2000 THEN 0.6
            ELSE 0.4
        END
    ), 0.0) INTO v_total_weight
    FROM event_confirmations ec
    JOIN user_profiles up ON ec.user_id = up.user_id
    WHERE ec.event_id = p_event_id
    AND ec.confirmation_type = 'confirm';
    
    -- Calculate dispute weight
    SELECT COALESCE(SUM(
        up.trust_score * 
        CASE 
            WHEN ec.created_at > NOW() - INTERVAL '30 minutes' THEN 1.0
            WHEN ec.created_at > NOW() - INTERVAL '1 hour' THEN 0.8
            WHEN ec.created_at > NOW() - INTERVAL '2 hours' THEN 0.6
            ELSE 0.4
        END
    ), 0.0) INTO v_dispute_weight
    FROM event_confirmations ec
    JOIN user_profiles up ON ec.user_id = up.user_id
    WHERE ec.event_id = p_event_id
    AND ec.confirmation_type = 'dispute';
    
    -- Update event status based on consensus
    IF v_total_weight >= v_threshold AND v_current_status = 'pending' THEN
        UPDATE emergency_events 
        SET 
            status = 'active',
            trust_weight = v_total_weight,
            confirmation_count = (SELECT COUNT(*) FROM event_confirmations WHERE event_id = p_event_id AND confirmation_type = 'confirm'),
            dispute_count = (SELECT COUNT(*) FROM event_confirmations WHERE event_id = p_event_id AND confirmation_type = 'dispute'),
            updated_at = NOW()
        WHERE id = p_event_id;
        
        -- Trigger notification dispatch
        PERFORM pg_notify('event_activated', p_event_id::text);
        
    ELSIF v_dispute_weight >= v_threshold AND v_current_status = 'active' THEN
        UPDATE emergency_events 
        SET 
            status = 'pending',
            trust_weight = v_total_weight - v_dispute_weight,
            confirmation_count = (SELECT COUNT(*) FROM event_confirmations WHERE event_id = p_event_id AND confirmation_type = 'confirm'),
            dispute_count = (SELECT COUNT(*) FROM event_confirmations WHERE event_id = p_event_id AND confirmation_type = 'dispute'),
            updated_at = NOW()
        WHERE id = p_event_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Spatial Alert Dispatch Function
CREATE OR REPLACE FUNCTION get_users_for_alert_dispatch(
    p_event_id UUID,
    p_max_distance INTEGER DEFAULT 10000
) RETURNS TABLE (
    user_id UUID,
    fcm_token TEXT,
    email TEXT,
    distance FLOAT,
    relevance_score FLOAT
) AS $$
DECLARE
    v_event_location GEOGRAPHY(POINT, 4326);
    v_event_severity INTEGER;
    v_event_type_id INTEGER;
BEGIN
    -- Get event details
    SELECT location, severity, type_id
    INTO v_event_location, v_event_severity, v_event_type_id
    FROM emergency_events
    WHERE id = p_event_id;
    
    -- Return users within radius with relevance scoring
    RETURN QUERY
    SELECT 
        up.user_id,
        upf.fcm_token,
        auth.users.email,
        ST_Distance(up.last_known_location, v_event_location) as distance,
        -- Relevance calculation based on distance, severity, and trust
        (v_event_severity::FLOAT * up.trust_score * 
         CASE 
             WHEN ST_Distance(up.last_known_location, v_event_location) < 1000 THEN 1.0
             WHEN ST_Distance(up.last_known_location, v_event_location) < 5000 THEN 0.7
             ELSE 0.4
         END) as relevance_score
    FROM user_profiles up
    JOIN auth.users ON auth.users.id = up.user_id
    LEFT JOIN user_push_tokens upf ON upf.user_id = up.user_id
    JOIN user_subscriptions us ON us.user_id = up.user_id
    JOIN user_notification_settings uns ON uns.user_id = up.user_id AND uns.topic_id = v_event_type_id
    WHERE 
        ST_DWithin(up.last_known_location, v_event_location, p_max_distance)
        AND us.topic_id = v_event_type_id
        AND us.is_active = true
        AND uns.is_enabled = true
        AND v_event_severity >= uns.min_severity
        AND ST_Distance(up.last_known_location, v_event_location) <= uns.max_distance
        AND up.trust_score > 0.1
        AND (
            -- Check quiet hours
            uns.quiet_hours_start IS NULL OR 
            uns.quiet_hours_end IS NULL OR
            CURRENT_TIME NOT BETWEEN uns.quiet_hours_start AND uns.quiet_hours_end
        )
        AND NOT EXISTS (
            SELECT 1 FROM notification_queue nq 
            WHERE nq.user_id = up.user_id 
            AND nq.event_id = p_event_id
            AND nq.status IN ('pending', 'sent')
        )
    ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Trust Score on Confirmation Function
CREATE OR REPLACE FUNCTION update_trust_on_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    v_previous_score FLOAT;
    v_new_score FLOAT;
    v_trust_change FLOAT;
BEGIN
    -- Get previous trust score
    SELECT trust_score INTO v_previous_score
    FROM user_profiles
    WHERE user_id = NEW.user_id;
    
    -- Calculate trust change based on confirmation type and event outcome
    IF NEW.confirmation_type = 'confirm' THEN
        v_trust_change := 0.01; -- Small positive for confirming
    ELSIF NEW.confirmation_type = 'dispute' THEN
        v_trust_change := -0.005; -- Small negative for disputing
    END IF;
    
    -- Apply time decay factor
    v_trust_change := v_trust_change * 
        CASE 
            WHEN NEW.created_at > NOW() - INTERVAL '30 minutes' THEN 1.0
            WHEN NEW.created_at > NOW() - INTERVAL '1 hour' THEN 0.8
            WHEN NEW.created_at > NOW() - INTERVAL '2 hours' THEN 0.6
            ELSE 0.4
        END;
    
    -- Calculate new trust score
    v_new_score := GREATEST(0.0, LEAST(1.0, v_previous_score + v_trust_change));
    
    -- Update user trust score
    UPDATE user_profiles 
    SET trust_score = v_new_score, updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Record trust history
    INSERT INTO user_trust_history (
        user_id, 
        event_id, 
        action_type, 
        trust_change, 
        previous_score, 
        new_score, 
        reason
    ) VALUES (
        NEW.user_id,
        NEW.event_id,
        NEW.confirmation_type,
        v_trust_change,
        v_previous_score,
        v_new_score,
        'Event ' || NEW.confirmation_type
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate Distance Function for Event Confirmations
CREATE OR REPLACE FUNCTION calculate_confirmation_distance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate distance from event if location is provided
    IF NEW.location IS NOT NULL THEN
        SELECT ST_Distance(NEW.location, ee.location) INTO NEW.distance_from_event
        FROM emergency_events ee
        WHERE ee.id = NEW.event_id;
    END IF;
    
    -- Set trust weight based on user's current trust score
    SELECT up.trust_score INTO NEW.trust_weight
    FROM user_profiles up
    WHERE up.user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_trust_score(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_event_consensus(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_alert_dispatch(UUID, INTEGER) TO authenticated;