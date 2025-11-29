-- Database views for OpenRelief
-- This migration creates optimized views for common queries

-- Active Emergency Events View
-- Shows only currently active emergency events with enhanced information
CREATE OR REPLACE VIEW active_emergency_events AS
SELECT 
    ee.*,
    et.name as emergency_type_name,
    et.slug as emergency_type_slug,
    et.color as emergency_type_color,
    et.icon as emergency_type_icon,
    up.trust_score as reporter_trust_score,
    -- Calculate confirmation ratio
    CASE 
        WHEN ee.confirmation_count + ee.dispute_count > 0 THEN
            ROUND(ee.confirmation_count::NUMERIC / (ee.confirmation_count + ee.dispute_count)::NUMERIC, 2)
        ELSE 0
    END as confirmation_ratio,
    -- Time until expiration
    EXTRACT(EPOCH FROM (ee.expires_at - NOW())) as seconds_until_expiration,
    -- Event age in minutes
    EXTRACT(EPOCH FROM (NOW() - ee.created_at)) / 60 as age_minutes
FROM emergency_events ee
JOIN emergency_types et ON ee.type_id = et.id
LEFT JOIN user_profiles up ON ee.reporter_id = up.user_id
WHERE ee.status IN ('pending', 'active')
    AND ee.expires_at > NOW();

-- User Trust Scores View
-- Aggregates trust information for each user
CREATE OR REPLACE VIEW user_trust_scores AS
SELECT 
    up.user_id,
    up.trust_score,
    up.last_known_location,
    up.active_session_start,
    -- Count of reported events
    COUNT(DISTINCT ee.id) as total_events_reported,
    -- Count of confirmed events (resolved positively)
    COUNT(DISTINCT CASE WHEN ee.status = 'resolved' AND ee.resolved_by != up.user_id THEN ee.id END) as confirmed_events,
    -- Count of disputed events
    COUNT(DISTINCT CASE WHEN ee.dispute_count > ee.confirmation_count THEN ee.id END) as disputed_events,
    -- Confirmation rate
    CASE 
        WHEN COUNT(DISTINCT ee.id) > 0 THEN
            ROUND(COUNT(DISTINCT CASE WHEN ee.status = 'resolved' AND ee.resolved_by != up.user_id THEN ee.id END)::NUMERIC / COUNT(DISTINCT ee.id)::NUMERIC, 2)
        ELSE 0
    END as confirmation_rate,
    -- Last activity timestamp
    GREATEST(
        MAX(ee.created_at),
        MAX(ec.created_at),
        up.updated_at
    ) as last_activity,
    -- User tier based on trust score
    CASE 
        WHEN up.trust_score >= 0.8 THEN 'trusted'
        WHEN up.trust_score >= 0.5 THEN 'reliable'
        WHEN up.trust_score >= 0.3 THEN 'established'
        WHEN up.trust_score >= 0.1 THEN 'new'
        ELSE 'untrusted'
    END as user_tier
FROM user_profiles up
LEFT JOIN emergency_events ee ON up.user_id = ee.reporter_id
LEFT JOIN event_confirmations ec ON up.user_id = ec.user_id
GROUP BY up.user_id, up.trust_score, up.last_known_location, up.active_session_start, up.updated_at;

-- Emergency Event Statistics View
-- Provides aggregated statistics for emergency events
CREATE OR REPLACE VIEW emergency_event_stats AS
SELECT 
    et.id as type_id,
    et.name as type_name,
    et.slug as type_slug,
    COUNT(ee.id) as total_events,
    COUNT(CASE WHEN ee.status = 'active' THEN 1 END) as active_events,
    COUNT(CASE WHEN ee.status = 'pending' THEN 1 END) as pending_events,
    COUNT(CASE WHEN ee.status = 'resolved' THEN 1 END) as resolved_events,
    COUNT(CASE WHEN ee.status = 'expired' THEN 1 END) as expired_events,
    AVG(ee.severity) as avg_severity,
    AVG(ee.confirmation_count) as avg_confirmations,
    AVG(ee.trust_weight) as avg_trust_weight,
    -- Events in last 24 hours
    COUNT(CASE WHEN ee.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as events_last_24h,
    -- Events in last 7 days
    COUNT(CASE WHEN ee.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as events_last_7d,
    -- Average resolution time (in hours)
    AVG(EXTRACT(EPOCH FROM (ee.resolved_at - ee.created_at)) / 3600) as avg_resolution_hours
FROM emergency_types et
LEFT JOIN emergency_events ee ON et.id = ee.type_id
GROUP BY et.id, et.name, et.slug;

-- User Activity Dashboard View
-- Shows comprehensive user activity metrics
CREATE OR REPLACE VIEW user_activity_dashboard AS
SELECT 
    up.user_id,
    up.trust_score,
    -- Event reporting activity
    COUNT(DISTINCT ee.id) as events_reported,
    COUNT(DISTINCT CASE WHEN ee.created_at > NOW() - INTERVAL '7 days' THEN ee.id END) as events_reported_7d,
    COUNT(DISTINCT CASE WHEN ee.created_at > NOW() - INTERVAL '30 days' THEN ee.id END) as events_reported_30d,
    -- Confirmation activity
    COUNT(DISTINCT ec.id) as confirmations_made,
    COUNT(DISTINCT CASE WHEN ec.confirmation_type = 'confirm' AND ec.created_at > NOW() - INTERVAL '7 days' THEN ec.id END) as confirmations_7d,
    COUNT(DISTINCT CASE WHEN ec.confirmation_type = 'dispute' AND ec.created_at > NOW() - INTERVAL '7 days' THEN ec.id END) as disputes_7d,
    -- Subscription activity
    COUNT(DISTINCT us.topic_id) as subscribed_topics,
    -- Last activity timestamps
    MAX(ee.created_at) as last_event_reported,
    MAX(ec.created_at) as last_confirmation,
    up.updated_at as last_profile_update,
    -- Activity score (for ranking)
    (
        COUNT(DISTINCT ee.id) * 10 +
        COUNT(DISTINCT ec.id) * 5 +
        CASE WHEN up.active_session_start IS NOT NULL THEN 20 ELSE 0 END
    ) as activity_score
FROM user_profiles up
LEFT JOIN emergency_events ee ON up.user_id = ee.reporter_id
LEFT JOIN event_confirmations ec ON up.user_id = ec.user_id
LEFT JOIN user_subscriptions us ON up.user_id = us.user_id AND us.is_active = true
GROUP BY up.user_id, up.trust_score, up.updated_at, up.active_session_start;

-- Notification Performance View
-- Tracks notification delivery performance
CREATE OR REPLACE VIEW notification_performance AS
SELECT 
    DATE_TRUNC('hour', nq.created_at) as hour,
    nq.notification_type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN nq.status = 'sent' THEN 1 END) as sent_notifications,
    COUNT(CASE WHEN nq.status = 'failed' THEN 1 END) as failed_notifications,
    COUNT(CASE WHEN nq.status = 'pending' THEN 1 END) as pending_notifications,
    -- Success rate
    ROUND(COUNT(CASE WHEN nq.status = 'sent' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as success_rate,
    -- Average delivery time (for sent notifications)
    AVG(EXTRACT(EPOCH FROM (nq.sent_at - nq.created_at))) as avg_delivery_seconds,
    -- Average attempts
    AVG(nq.attempts) as avg_attempts
FROM notification_queue nq
GROUP BY DATE_TRUNC('hour', nq.created_at), nq.notification_type
ORDER BY hour DESC;

-- Geographic Hotspots View
-- Identifies areas with high emergency event concentration
CREATE OR REPLACE VIEW geographic_hotspots AS
SELECT 
    et.name as emergency_type,
    COUNT(*) as event_count,
    -- Create a grid cell (approximately 1km x 1km)
    ST SnapToGrid(ee.location::geometry, 0.01) as hotspot_center,
    -- Calculate radius of affected area
    AVG(ee.radius_meters) as avg_radius,
    -- Average severity
    AVG(ee.severity) as avg_severity,
    -- Most recent event in this hotspot
    MAX(ee.created_at) as last_event_time
FROM emergency_events ee
JOIN emergency_types et ON ee.type_id = et.id
WHERE ee.status IN ('pending', 'active')
    AND ee.created_at > NOW() - INTERVAL '7 days'
GROUP BY et.name, ST_SnapToGrid(ee.location::geometry, 0.01)
HAVING COUNT(*) >= 2 -- Only show areas with 2+ events
ORDER BY event_count DESC, last_event_time DESC;

-- Set appropriate permissions for views
GRANT SELECT ON active_emergency_events TO authenticated, anon;
GRANT SELECT ON user_trust_scores TO authenticated;
GRANT SELECT ON emergency_event_stats TO authenticated, anon;
GRANT SELECT ON user_activity_dashboard TO authenticated;
GRANT SELECT ON notification_performance TO authenticated;
GRANT SELECT ON geographic_hotspots TO authenticated, anon;