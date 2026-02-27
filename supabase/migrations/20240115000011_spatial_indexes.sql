-- Spatial and Performance Indexes for OpenRelief
-- This migration adds indexes for spatial queries and performance optimization

-- =============================================================================
-- SPATIAL INDEXES
-- Using GIST (Generalized Search Tree) for geographic/geometry data
-- =============================================================================

-- Spatial index for emergency events location
-- Enables efficient ST_DWithin and distance queries
-- Note: A similar index may exist from production optimizations, use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_emergency_events_location 
ON emergency_events USING GIST (location);

-- Composite index for common status + time queries
-- Useful for filtering active/pending events sorted by recency
CREATE INDEX IF NOT EXISTS idx_emergency_events_status_created 
ON emergency_events(status, created_at DESC);

-- Spatial index for user profiles last known location
-- Enables efficient nearby user queries for alert dispatch
CREATE INDEX IF NOT EXISTS idx_user_profiles_location 
ON user_profiles USING GIST (last_known_location);

-- Index for event confirmations lookups
-- Speeds up checking if user already confirmed an event
-- Note: A similar index may exist from production optimizations, use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_event_confirmations_event_user 
ON event_confirmations(event_id, user_id);

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Index for trust-based queries on user profiles
-- Useful for filtering users by trust score threshold
CREATE INDEX IF NOT EXISTS idx_user_profiles_trust_score_active
ON user_profiles(trust_score DESC) 
WHERE trust_score > 0.1;

-- Index for notification queue processing
-- Speeds up fetching pending notifications for dispatch
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending 
ON notification_queue(status, scheduled_at) 
WHERE status = 'pending';

-- Index for event confirmations by type
-- Useful for analyzing confirmation patterns
CREATE INDEX IF NOT EXISTS idx_event_confirmations_type_created
ON event_confirmations(confirmation_type, created_at DESC);

-- Index for emergency events by type
-- Useful for filtering by emergency category
CREATE INDEX IF NOT EXISTS idx_emergency_events_type_status
ON emergency_events(type_id, status) 
WHERE status IN ('active', 'pending');

-- =============================================================================
-- PARTIAL INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Index for active events within expiry window
-- Optimizes queries for currently relevant emergencies
CREATE INDEX IF NOT EXISTS idx_emergency_events_active_not_expired
ON emergency_events(created_at DESC, severity DESC)
WHERE status IN ('active', 'pending') 
  AND (expires_at IS NULL OR expires_at > NOW());

-- Index for unresolved high-severity events
-- Critical for prioritizing response efforts
CREATE INDEX IF NOT EXISTS idx_emergency_events_critical_unresolved
ON emergency_events(severity DESC, created_at DESC)
WHERE status IN ('active', 'pending') 
  AND severity >= 4;

-- Add comments for documentation
COMMENT ON INDEX idx_emergency_events_location IS 
'GIST index for spatial queries on emergency event locations';

COMMENT ON INDEX idx_emergency_events_status_created IS 
'Composite index for filtering by status and sorting by creation time';

COMMENT ON INDEX idx_user_profiles_location IS 
'GIST index for spatial queries on user last known locations';

COMMENT ON INDEX idx_event_confirmations_event_user IS 
'Index for quickly checking if a user has confirmed an event';

COMMENT ON INDEX idx_emergency_events_active_not_expired IS 
'Partial index for currently active events that have not expired';

COMMENT ON INDEX idx_emergency_events_critical_unresolved IS 
'Partial index for high-severity unresolved events requiring attention';
