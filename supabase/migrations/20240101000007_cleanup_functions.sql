-- Data retention and cleanup functions for OpenRelief
-- This migration creates functions for automated data maintenance and cleanup

-- Main Cleanup Function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $$
DECLARE
    v_cleanup_count INTEGER := 0;
    v_start_time TIMESTAMPTZ := NOW();
BEGIN
    RAISE NOTICE 'Starting data cleanup at %', v_start_time;
    
    -- Update expired events
    UPDATE emergency_events 
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'active')
    AND expires_at < NOW();
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Updated % expired events', ROW_COUNT;
    
    -- Archive old resolved events (older than 90 days)
    DELETE FROM emergency_events 
    WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '90 days';
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Deleted % old resolved events', ROW_COUNT;
    
    -- Clean up old audit logs (older than 1 year)
    DELETE FROM audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Deleted % old audit log entries', ROW_COUNT;
    
    -- Clean up old notifications (older than 7 days for sent/failed)
    DELETE FROM notification_queue 
    WHERE status IN ('sent', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Deleted % old notification entries', ROW_COUNT;
    
    -- Clean up old system metrics (older than 30 days, keep aggregated data)
    DELETE FROM system_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND metric_name NOT IN ('active_users', 'total_events', 'system_health');
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Deleted % old system metric entries', ROW_COUNT;
    
    -- Clean up old trust history (older than 6 months)
    DELETE FROM user_trust_history 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Deleted % old trust history entries', ROW_COUNT;
    
    -- Update user location privacy (reduce precision for old locations)
    UPDATE user_profiles 
    SET last_known_location = ST_ReducePrecision(last_known_location, 3), -- ~100m precision
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '7 days'
    AND last_known_location IS NOT NULL;
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Reduced location precision for % user profiles', ROW_COUNT;
    
    -- Remove exact locations older than 30 days
    UPDATE user_profiles 
    SET last_known_location = NULL,
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '30 days';
    
    v_cleanup_count := v_cleanup_count + ROW_COUNT;
    RAISE NOTICE 'Removed locations for % user profiles', ROW_COUNT;
    
    -- Log cleanup completion
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        tags
    ) VALUES (
        'cleanup_operations_completed',
        v_cleanup_count,
        jsonb_build_object(
            'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
            'timestamp', v_start_time
        )
    );
    
    RAISE NOTICE 'Cleanup completed in % seconds. Total records processed: %', 
        EXTRACT(EPOCH FROM (NOW() - v_start_time)), v_cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Location Anonymization Function
CREATE OR REPLACE FUNCTION anonymize_old_locations()
RETURNS VOID AS $$
BEGIN
    -- Reduce precision of locations older than 7 days
    UPDATE user_profiles 
    SET last_known_location = ST_ReducePrecision(last_known_location, 3), -- ~100m precision
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '7 days'
    AND last_known_location IS NOT NULL;
    
    -- Remove exact locations older than 30 days
    UPDATE user_profiles 
    SET last_known_location = NULL,
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '30 days';
    
    -- Log anonymization
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        tags
    ) VALUES (
        'location_anonymization_completed',
        ROW_COUNT,
        jsonb_build_object('timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification Cleanup Function
CREATE OR REPLACE FUNCTION cleanup_failed_notifications()
RETURNS VOID AS $$
DECLARE
    v_failed_count INTEGER;
BEGIN
    -- Delete notifications that have failed too many times
    DELETE FROM notification_queue 
    WHERE status = 'failed'
    AND attempts >= max_attempts
    AND created_at < NOW() - INTERVAL '24 hours';
    
    v_failed_count := ROW_COUNT;
    
    -- Reset stuck pending notifications
    UPDATE notification_queue 
    SET status = 'pending',
        attempts = 0,
        scheduled_at = NOW() + INTERVAL '1 hour'
    WHERE status = 'pending'
    AND attempts >= max_attempts
    AND created_at < NOW() - INTERVAL '6 hours';
    
    -- Log cleanup
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        tags
    ) VALUES (
        'failed_notifications_cleaned',
        v_failed_count,
        jsonb_build_object('timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Session Cleanup Function
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS VOID AS $$
DECLARE
    v_inactive_count INTEGER;
BEGIN
    -- Clear sessions inactive for more than 24 hours
    UPDATE user_profiles 
    SET active_session_start = NULL,
        updated_at = NOW()
    WHERE active_session_start < NOW() - INTERVAL '24 hours';
    
    v_inactive_count := ROW_COUNT;
    
    -- Log cleanup
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        tags
    ) VALUES (
        'inactive_sessions_cleaned',
        v_inactive_count,
        jsonb_build_object('timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database Optimization Function
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS VOID AS $$
BEGIN
    -- Update table statistics
    ANALYZE user_profiles;
    ANALYZE emergency_events;
    ANALYZE event_confirmations;
    ANALYZE user_subscriptions;
    ANALYZE notification_queue;
    ANALYZE audit_log;
    ANALYZE system_metrics;
    
    -- Reindex frequently used indexes
    REINDEX INDEX CONCURRENTLY idx_emergency_events_location;
    REINDEX INDEX CONCURRENTLY idx_user_profiles_location;
    REINDEX INDEX CONCURRENTLY idx_notifications_status;
    REINDEX INDEX CONCURRENTLY idx_confirmations_event;
    
    -- Vacuum analyze large tables
    VACUUM ANALYZE emergency_events;
    VACUUM ANALYZE audit_log;
    VACUUM ANALYZE notification_queue;
    
    -- Log optimization
    INSERT INTO system_metrics (
        metric_name,
        metric_value,
        tags
    ) VALUES (
        'database_optimization_completed',
        1,
        jsonb_build_object('timestamp', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Health Check Function
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details JSONB
) AS $$
DECLARE
    v_active_events INTEGER;
    v_pending_notifications INTEGER;
    v_failed_notifications INTEGER;
    v_old_events INTEGER;
    v_disk_usage_percentage FLOAT;
BEGIN
    -- Check active events count
    SELECT COUNT(*) INTO v_active_events
    FROM emergency_events
    WHERE status = 'active';
    
    RETURN QUERY SELECT 
        'active_events_count'::TEXT,
        CASE WHEN v_active_events < 1000 THEN 'healthy' ELSE 'warning' END::TEXT,
        jsonb_build_object('count', v_active_events, 'threshold', 1000);
    
    -- Check pending notifications
    SELECT COUNT(*) INTO v_pending_notifications
    FROM notification_queue
    WHERE status = 'pending';
    
    RETURN QUERY SELECT 
        'pending_notifications'::TEXT,
        CASE WHEN v_pending_notifications < 1000 THEN 'healthy' ELSE 'warning' END::TEXT,
        jsonb_build_object('count', v_pending_notifications, 'threshold', 1000);
    
    -- Check failed notifications
    SELECT COUNT(*) INTO v_failed_notifications
    FROM notification_queue
    WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour';
    
    RETURN QUERY SELECT 
        'failed_notifications'::TEXT,
        CASE WHEN v_failed_notifications < 100 THEN 'healthy' ELSE 'critical' END::TEXT,
        jsonb_build_object('count', v_failed_notifications, 'threshold', 100);
    
    -- Check for old events
    SELECT COUNT(*) INTO v_old_events
    FROM emergency_events
    WHERE status IN ('pending', 'active')
    AND created_at < NOW() - INTERVAL '7 days';
    
    RETURN QUERY SELECT 
        'old_events'::TEXT,
        CASE WHEN v_old_events < 10 THEN 'healthy' ELSE 'warning' END::TEXT,
        jsonb_build_object('count', v_old_events, 'threshold', 10);
    
    -- Check database size (simplified)
    RETURN QUERY SELECT 
        'database_size'::TEXT,
        'healthy'::TEXT,
        jsonb_build_object('status', 'monitoring_required');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO service_role;
GRANT EXECUTE ON FUNCTION anonymize_old_locations() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_failed_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_inactive_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION optimize_database() TO service_role;
GRANT EXECUTE ON FUNCTION system_health_check() TO service_role;

-- Create scheduled jobs using pg_cron (if available)
DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule daily cleanup at 2 AM
        PERFORM cron.schedule(
            'cleanup-expired-data',
            '0 2 * * *',
            'SELECT cleanup_expired_data();'
        );
        
        -- Schedule location anonymization every 6 hours
        PERFORM cron.schedule(
            'anonymize-locations',
            '0 */6 * * *',
            'SELECT anonymize_old_locations();'
        );
        
        -- Schedule notification cleanup every hour
        PERFORM cron.schedule(
            'cleanup-notifications',
            '0 * * * *',
            'SELECT cleanup_failed_notifications();'
        );
        
        -- Schedule session cleanup every 30 minutes
        PERFORM cron.schedule(
            'cleanup-sessions',
            '*/30 * * * *',
            'SELECT cleanup_inactive_sessions();'
        );
        
        -- Schedule database optimization weekly on Sunday at 3 AM
        PERFORM cron.schedule(
            'optimize-database',
            '0 3 * * 0',
            'SELECT optimize_database();'
        );
        
        -- Schedule health check every 5 minutes
        PERFORM cron.schedule(
            'health-check',
            '*/5 * * * *',
            'INSERT INTO system_metrics (metric_name, metric_value, tags) SELECT metric_name, 1, details FROM system_health_check();'
        );
    END IF;
END $$;