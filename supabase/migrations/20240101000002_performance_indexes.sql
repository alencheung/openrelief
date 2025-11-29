-- Performance indexes for OpenRelief database
-- This migration creates all necessary indexes for optimal query performance

-- Spatial Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_location 
ON user_profiles USING GIST (last_known_location);

CREATE INDEX IF NOT EXISTS idx_emergency_events_location 
ON emergency_events USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_event_confirmations_location 
ON event_confirmations USING GIST (location);

-- Trust Score Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_score 
ON user_profiles (trust_score);

CREATE INDEX IF NOT EXISTS idx_trust_history_user 
ON user_trust_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_history_event 
ON user_trust_history(event_id);

-- Emergency Events Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_events_status 
ON emergency_events(status, created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_events_type 
ON emergency_events(type_id, created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_events_reporter 
ON emergency_events(reporter_id, created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_events_expires 
ON emergency_events(expires_at) WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_emergency_events_severity 
ON emergency_events(severity, status);

-- Event Confirmations Indexes
CREATE INDEX IF NOT EXISTS idx_confirmations_event 
ON event_confirmations(event_id, confirmation_type);

CREATE INDEX IF NOT EXISTS idx_confirmations_user 
ON event_confirmations(user_id, created_at DESC);

-- User Subscriptions Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user 
ON user_subscriptions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_subscriptions_topic 
ON user_subscriptions(topic_id, is_active);

-- Notification Queue Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_status 
ON notification_queue(status, scheduled_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notification_queue(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_event 
ON notification_queue(event_id);

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user 
ON audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
ON audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table 
ON audit_log(table_name, created_at DESC);

-- System Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_name_time 
ON system_metrics(metric_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_created 
ON system_metrics(created_at DESC);

-- Session Management Index
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_session 
ON user_profiles(active_session_start) WHERE active_session_start IS NOT NULL;

-- Composite Indexes for Common Query Patterns

-- For finding active events near a user
CREATE INDEX IF NOT EXISTS idx_emergency_events_active_location 
ON emergency_events(status, location) 
WHERE status IN ('pending', 'active');

-- For user trust score updates
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated 
ON user_profiles(updated_at DESC);

-- For emergency type lookups
CREATE INDEX IF NOT EXISTS idx_emergency_types_active 
ON emergency_types(is_active, slug);

-- For notification processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_processing 
ON notification_queue(status, scheduled_at, attempts) 
WHERE status IN ('pending', 'failed');

-- Partial indexes for better performance on large tables

-- Only index recent trust history (last 30 days)
CREATE INDEX IF NOT EXISTS idx_trust_history_recent 
ON user_trust_history(user_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Only index active emergency events
CREATE INDEX IF NOT EXISTS idx_emergency_events_active 
ON emergency_events(created_at DESC, location) 
WHERE status = 'active';

-- Only index pending notifications
CREATE INDEX IF NOT EXISTS idx_notifications_pending 
ON notification_queue(scheduled_at) 
WHERE status = 'pending' AND attempts < max_attempts;

-- Expression indexes for computed values

-- Index for distance calculations (precomputed)
CREATE INDEX IF NOT EXISTS idx_emergency_events_radius_check 
ON emergency_events(radius_meters) 
WHERE radius_meters > 0;

-- Index for trust score ranges
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_tiers 
ON user_profiles(trust_score) 
WHERE trust_score >= 0.1;