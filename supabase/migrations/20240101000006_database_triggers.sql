-- Database triggers for OpenRelief
-- This migration creates all necessary triggers for automated operations

-- Trust Score Update Trigger Function
CREATE OR REPLACE FUNCTION update_trust_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update trust score when confirmation is added
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_trust_score(NEW.user_id);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM calculate_trust_score(NEW.user_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM calculate_trust_score(OLD.user_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Consensus Calculation Trigger Function
CREATE OR REPLACE FUNCTION consensus_calculation_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate consensus when confirmation is added
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_event_consensus(NEW.event_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Recalculate if confirmation type changed
        IF OLD.confirmation_type != NEW.confirmation_type THEN
            PERFORM calculate_event_consensus(NEW.event_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM calculate_event_consensus(OLD.event_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action TEXT;
    v_user_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_new_data := to_jsonb(NEW);
        v_old_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_new_data := to_jsonb(NEW);
        v_old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_new_data := NULL;
        v_old_data := to_jsonb(OLD);
    END IF;
    
    -- Insert audit record (only if not service role)
    IF NOT is_service_role() THEN
        INSERT INTO audit_log (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            ip_address,
            user_agent
        ) VALUES (
            v_user_id,
            v_action,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            v_old_data,
            v_new_data,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Event Expiration Check Trigger Function
CREATE OR REPLACE FUNCTION check_event_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Update expired events
    IF NEW.expires_at < NOW() AND NEW.status IN ('pending', 'active') THEN
        NEW.status := 'expired';
        NEW.updated_at := NOW();
        
        -- Log expiration
        INSERT INTO audit_log (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            NULL,
            'EXPIRE',
            'emergency_events',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', 'expired'),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification Queue Trigger Function
CREATE OR REPLACE FUNCTION queue_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_notification_users RECORD;
BEGIN
    -- Only queue notifications for newly activated events
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
        -- Get users who should be notified
        FOR v_notification_users IN 
            SELECT * FROM get_users_for_alert_dispatch(NEW.id)
        LOOP
            INSERT INTO notification_queue (
                user_id,
                event_id,
                notification_type,
                title,
                message,
                data,
                scheduled_at
            ) VALUES (
                v_notification_users.user_id,
                NEW.id,
                'new_event',
                'Emergency Alert: ' || NEW.title,
                'A new emergency has been reported in your area. Type: ' || 
                (SELECT name FROM emergency_types WHERE id = NEW.type_id),
                jsonb_build_object(
                    'event_id', NEW.id,
                    'event_type', (SELECT slug FROM emergency_types WHERE id = NEW.type_id),
                    'severity', NEW.severity,
                    'distance', v_notification_users.distance,
                    'relevance_score', v_notification_users.relevance_score
                ),
                NOW()
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User Activity Update Trigger Function
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's last activity timestamp
    UPDATE user_profiles 
    SET updated_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trust History Recording Trigger Function
CREATE OR REPLACE FUNCTION record_trust_history()
RETURNS TRIGGER AS $$
DECLARE
    v_old_score FLOAT;
    v_new_score FLOAT;
    v_change FLOAT;
    v_reason TEXT;
BEGIN
    -- Get old and new trust scores
    IF TG_OP = 'INSERT' THEN
        v_old_score := 0.1; -- Default score for new users
        v_new_score := NEW.trust_score;
        v_reason := 'User profile created';
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_score := OLD.trust_score;
        v_new_score := NEW.trust_score;
        v_change := v_new_score - v_old_score;
        
        -- Determine reason based on context
        IF ABS(v_change) > 0.01 THEN
            v_reason := 'Trust score updated by system';
        ELSE
            v_reason := 'Minor trust score adjustment';
        END IF;
    END IF;
    
    -- Only record if score changed significantly
    IF ABS(v_new_score - v_old_score) > 0.01 THEN
        INSERT INTO user_trust_history (
            user_id,
            action_type,
            trust_change,
            previous_score,
            new_score,
            reason
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            'report',
            v_new_score - v_old_score,
            v_old_score,
            v_new_score,
            v_reason
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- System Metrics Collection Trigger Function
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_metric_name TEXT;
    v_metric_value FLOAT;
BEGIN
    -- Collect different metrics based on table and operation
    CASE TG_TABLE_NAME
        WHEN 'emergency_events' THEN
            IF TG_OP = 'INSERT' THEN
                v_metric_name := 'emergency_events_created';
                v_metric_value := 1;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status != NEW.status THEN
                    v_metric_name := 'emergency_events_status_change';
                    v_metric_value := 1;
                END IF;
            END IF;
        WHEN 'event_confirmations' THEN
            IF TG_OP = 'INSERT' THEN
                v_metric_name := 'event_confirmations_created';
                v_metric_value := 1;
            END IF;
        WHEN 'user_profiles' THEN
            IF TG_OP = 'INSERT' THEN
                v_metric_name := 'new_users_registered';
                v_metric_value := 1;
            END IF;
    END CASE;
    
    -- Insert metric if defined
    IF v_metric_name IS NOT NULL THEN
        INSERT INTO system_metrics (
            metric_name,
            metric_value,
            tags
        ) VALUES (
            v_metric_name,
            v_metric_value,
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'user_id', COALESCE(auth.uid(), 'system')
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables

-- Trust score triggers
CREATE TRIGGER trust_score_update
    AFTER INSERT OR UPDATE OR DELETE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_trust_score_trigger();

CREATE TRIGGER trust_history_recording
    AFTER INSERT OR UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION record_trust_history();

-- Consensus calculation triggers
CREATE TRIGGER consensus_calculation
    AFTER INSERT OR UPDATE OR DELETE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION consensus_calculation_trigger();

-- Audit triggers
CREATE TRIGGER audit_emergency_events
    AFTER INSERT OR UPDATE OR DELETE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_event_confirmations
    AFTER INSERT OR UPDATE OR DELETE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Event management triggers
CREATE TRIGGER check_event_expiration_trigger
    BEFORE UPDATE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION check_event_expiration();

CREATE TRIGGER queue_event_notifications_trigger
    AFTER INSERT OR UPDATE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION queue_event_notifications();

-- User activity triggers
CREATE TRIGGER update_user_activity_emergency_events
    AFTER INSERT OR UPDATE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER update_user_activity_confirmations
    AFTER INSERT OR UPDATE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_user_activity();

-- System metrics triggers
CREATE TRIGGER collect_emergency_events_metrics
    AFTER INSERT OR UPDATE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION collect_system_metrics();

CREATE TRIGGER collect_confirmations_metrics
    AFTER INSERT ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION collect_system_metrics();

CREATE TRIGGER collect_users_metrics
    AFTER INSERT ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION collect_system_metrics();

-- Additional trigger for confirmation distance calculation
CREATE TRIGGER calculate_confirmation_distance_trigger
    BEFORE INSERT OR UPDATE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION calculate_confirmation_distance();

-- Additional trigger for trust score on confirmation
CREATE TRIGGER update_trust_on_confirmation_trigger
    AFTER INSERT ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_trust_on_confirmation();