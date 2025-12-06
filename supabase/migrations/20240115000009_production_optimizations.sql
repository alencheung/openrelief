-- Production Database Optimizations
-- This migration contains production-specific optimizations and settings

-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Configure logging for production monitoring
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Create production indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_events_location_gist 
ON emergency_events USING GIST (ST_Point(location::geometry));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_events_severity_status 
ON emergency_events (severity DESC, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_events_expires_at 
ON emergency_events (expires_at) WHERE status IN ('active', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_confirmations_event_user 
ON event_confirmations (event_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_trust_score 
ON user_profiles (trust_score DESC, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_queue_status_scheduled 
ON notification_queue (status, scheduled_at) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at 
ON audit_log (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_name_created 
ON system_metrics (metric_name, created_at DESC);

-- Create partitioned table for high-volume data
CREATE TABLE IF NOT EXISTS notification_queue_partitioned (
  LIKE notification_queue INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for notification queue
CREATE TABLE IF NOT EXISTS notification_queue_2024_01 
PARTITION OF notification_queue_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS notification_queue_2024_02 
PARTITION OF notification_queue_partitioned 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create materialized views for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS emergency_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_emergencies,
  COUNT(CASE WHEN severity >= 8 THEN 1 END) as critical_emergencies,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_emergencies,
  AVG(severity) as avg_severity,
  AVG(trust_weight) as avg_trust_weight
FROM emergency_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_stats_date 
ON emergency_stats (date);

-- Create materialized view for user activity
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_stats AS
SELECT 
  DATE_TRUNC('day', updated_at) as date,
  COUNT(*) as active_users,
  AVG(trust_score) as avg_trust_score,
  COUNT(CASE WHEN trust_score >= 0.8 THEN 1 END) as trusted_users
FROM user_profiles 
WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', updated_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_stats_date 
ON user_activity_stats (date);

-- Create functions for automated maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_emergencies()
RETURNS void AS $$
BEGIN
  UPDATE emergency_events 
  SET status = 'expired', 
      updated_at = NOW()
  WHERE status IN ('active', 'pending') 
    AND expires_at < NOW();
    
  -- Log cleanup action
  INSERT INTO audit_log (action, table_name, created_at)
  VALUES ('cleanup_expired_emergencies', 'emergency_events', NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_queue 
  WHERE status IN ('sent', 'failed', 'cancelled') 
    AND created_at < NOW() - INTERVAL '7 days';
    
  -- Log cleanup action
  INSERT INTO audit_log (action, table_name, created_at)
  VALUES ('cleanup_old_notifications', 'notification_queue', NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY emergency_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_stats;
  
  -- Log refresh action
  INSERT INTO audit_log (action, table_name, created_at)
  VALUES ('refresh_analytics_views', 'materialized_views', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create scheduled jobs using pg_cron (if available)
DO $$
BEGIN
  -- Clean up expired emergencies every 5 minutes
  SELECT cron.schedule('cleanup-expired-emergencies', '*/5 * * * *', 'SELECT cleanup_expired_emergencies();');
  
  -- Clean up old notifications daily at 3 AM
  SELECT cron.schedule('cleanup-old-notifications', '0 3 * * *', 'SELECT cleanup_old_notifications();');
  
  -- Refresh analytics views hourly
  SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_analytics_views();');
EXCEPTION
  WHEN others THEN
    -- pg_cron not available, skip scheduling
    NULL;
END $$;

-- Create production monitoring functions
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'total_connections', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    'cache_hit_ratio', ROUND(
      (SELECT sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 
       FROM pg_stat_database WHERE datname = current_database()), 2
    ),
    'slow_queries', (SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000),
    'last_vacuum', (SELECT GREATEST(last_vacuum, last_autovacuum) FROM pg_stat_user_tables LIMIT 1),
    'uptime', (SELECT age(now(), pg_postmaster_start_time()) as uptime)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function for emergency alert optimization
CREATE OR REPLACE FUNCTION optimize_emergency_alerts()
RETURNS void AS $$
BEGIN
  -- Update trust scores based on recent activity
  UPDATE user_profiles 
  SET trust_score = GREATEST(0, LEAST(1, 
    trust_score + (
      SELECT COALESCE(SUM(
        CASE 
          WHEN ec.confirmation_type = 'confirm' THEN 0.01 * ec.trust_weight
          WHEN ec.confirmation_type = 'dispute' THEN -0.02 * ec.trust_weight
          ELSE 0
        END), 0)
      FROM event_confirmations ec
      JOIN emergency_events ee ON ec.event_id = ee.id
      WHERE ec.user_id = user_profiles.user_id 
        AND ec.created_at > NOW() - INTERVAL '24 hours'
    )
  ))
  WHERE user_id IN (
    SELECT DISTINCT user_id 
    FROM event_confirmations 
    WHERE created_at > NOW() - INTERVAL '24 hours'
  );
  
  -- Log optimization
  INSERT INTO audit_log (action, table_name, created_at)
  VALUES ('optimize_emergency_alerts', 'user_profiles', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create production security functions
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TABLE(user_id TEXT, risk_score NUMERIC, reasons TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    (COUNT(*) * 0.1 + 
     COALESCE(AVG(ee.severity), 0) * 0.05 +
     CASE WHEN COUNT(*) > 10 THEN 0.3 ELSE 0 END) as risk_score,
    ARRAY[
      CASE WHEN COUNT(*) > 10 THEN 'High frequency reporting' END,
      CASE WHEN AVG(ee.severity) > 8 THEN 'Consistently high severity' END,
      CASE WHEN COUNT(DISTINCT ee.type_id) = 1 THEN 'Single type reporting' END
    ] FILTER (WHERE elements IS NOT NULL) as reasons
  FROM user_profiles up
  JOIN emergency_events ee ON up.user_id = ee.reporter_id
  WHERE ee.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY up.user_id
  HAVING COUNT(*) > 5 OR AVG(ee.severity) > 8
  ORDER BY risk_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions for production
GRANT EXECUTE ON FUNCTION get_database_health() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity() TO authenticated;

-- Create production triggers
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    COALESCE(current_setting('app.current_user_id', true), NULL),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable audit triggers on critical tables
CREATE TRIGGER audit_emergency_events
  AFTER INSERT OR UPDATE OR DELETE ON emergency_events
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_notification_queue
  AFTER INSERT OR UPDATE OR DELETE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- Add production constraints
ALTER TABLE emergency_events 
ADD CONSTRAINT chk_severity_range CHECK (severity >= 1 AND severity <= 10),
ADD CONSTRAINT chk_trust_weight_range CHECK (trust_weight >= 0 AND trust_weight <= 1),
ADD CONSTRAINT chk_radius_positive CHECK (radius_meters > 0);

ALTER TABLE user_profiles 
ADD CONSTRAINT chk_trust_score_range CHECK (trust_score >= 0 AND trust_score <= 1);

-- Add production comments for documentation
COMMENT ON TABLE emergency_events IS 'Core table for emergency reports with production optimizations';
COMMENT ON TABLE user_profiles IS 'User profiles with trust scoring system for production';
COMMENT ON TABLE notification_queue IS 'Queue for push notifications with partitioning for production scale';
COMMENT ON MATERIALIZED VIEW emergency_stats IS 'Daily emergency statistics for production analytics';
COMMENT ON MATERIALIZED VIEW user_activity_stats IS 'Daily user activity metrics for production monitoring';