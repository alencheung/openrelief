# Database Schema Documentation

## Overview

OpenRelief uses PostgreSQL 15+ with PostGIS 3.3+ for spatial data handling. The database is hosted on Supabase and includes Row Level Security (RLS) for data privacy and access control.

## Schema Architecture

### Core Design Principles

1. **Spatial Optimization**: All location-based queries use PostGIS spatial indexes
2. **Trust System**: Built-in trust scoring with weighted voting
3. **Privacy-First**: Row Level Security and data anonymization
4. **Scalability**: Optimized for 50K+ concurrent users
5. **Audit Trail**: Complete audit logging for all operations

## Database Schema

### 1. User Management

#### 1.1 User Profiles

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    trust_score FLOAT DEFAULT 0.1 CHECK (trust_score >= 0.0 AND trust_score <= 1.0),
    last_known_location GEOGRAPHY(POINT, 4326),
    active_session_start TIMESTAMPTZ,
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_trust_score CHECK (trust_score >= 0.0 AND trust_score <= 1.0)
);

-- Spatial Index for Location Queries
CREATE INDEX idx_user_profiles_location 
ON user_profiles USING GIST (last_known_location);

-- Index for Trust Score Queries
CREATE INDEX idx_user_profiles_trust_score 
ON user_profiles (trust_score);

-- Index for Session Management
CREATE INDEX idx_user_profiles_active_session 
ON user_profiles (active_session_start) WHERE active_session_start IS NOT NULL;
```

**Fields Description:**
- `user_id`: Primary key, references Supabase auth users
- `trust_score`: 0.0-1.0 scale, affects voting weight
- `last_known_location`: Spatial point for location-based queries
- `active_session_start`: Tracks active user sessions
- `notification_preferences`: JSON config for notification settings
- `privacy_settings`: JSON config for privacy preferences

#### 1.2 User Trust History

```sql
CREATE TABLE user_trust_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    event_id UUID REFERENCES emergency_events(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('report', 'confirm', 'dispute')),
    trust_change FLOAT NOT NULL,
    previous_score FLOAT NOT NULL,
    new_score FLOAT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Trust History Queries
CREATE INDEX idx_trust_history_user 
ON user_trust_history(user_id, created_at DESC);

CREATE INDEX idx_trust_history_event 
ON user_trust_history(event_id);
```

### 2. Emergency Management

#### 2.1 Emergency Types

```sql
CREATE TABLE emergency_types (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#FF0000',
    default_radius INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data for Emergency Types
INSERT INTO emergency_types (slug, name, description, icon, color, default_radius) VALUES
('fire', 'Fire', 'Fire-related emergencies', 'flame', '#FF4444', 500),
('medical', 'Medical', 'Medical emergencies', 'medical', '#FF69B4', 300),
('security', 'Security', 'Security threats', 'shield', '#FFD700', 1000),
('natural', 'Natural Disaster', 'Natural disasters', 'cloud', '#4169E1', 2000),
('infrastructure', 'Infrastructure', 'Infrastructure failures', 'alert', '#FF8C00', 1500);
```

#### 2.2 Emergency Events

```sql
CREATE TABLE emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id INTEGER REFERENCES emergency_types(id),
    reporter_id UUID REFERENCES user_profiles(user_id),
    title TEXT NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 1000,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'resolved', 'expired')),
    trust_weight FLOAT DEFAULT 0.0,
    confirmation_count INTEGER DEFAULT 0,
    dispute_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES user_profiles(user_id)
);

-- Spatial Index for Location Queries
CREATE INDEX idx_emergency_events_location 
ON emergency_events USING GIST (location);

-- Index for Status and Type Queries
CREATE INDEX idx_emergency_events_status 
ON emergency_events(status, created_at);

CREATE INDEX idx_emergency_events_type 
ON emergency_events(type_id, created_at);

-- Index for Reporter Tracking
CREATE INDEX idx_emergency_events_reporter 
ON emergency_events(reporter_id, created_at);

-- Index for Expiration
CREATE INDEX idx_emergency_events_expires 
ON emergency_events(expires_at) WHERE expires_at > NOW();
```

#### 2.3 Event Confirmations

```sql
CREATE TABLE event_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES emergency_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('confirm', 'dispute')),
    trust_weight FLOAT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    distance_from_event FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one confirmation per user per event
    UNIQUE(event_id, user_id)
);

-- Indexes for Confirmation Queries
CREATE INDEX idx_confirmations_event 
ON event_confirmations(event_id, confirmation_type);

CREATE INDEX idx_confirmations_user 
ON event_confirmations(user_id, created_at DESC);
```

### 3. User Subscriptions

#### 3.1 Topic Subscriptions

```sql
CREATE TABLE user_subscriptions (
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES emergency_types(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    notification_radius INTEGER DEFAULT 10000, -- 10km default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, topic_id)
);

-- Index for Subscription Queries
CREATE INDEX idx_subscriptions_user 
ON user_subscriptions(user_id, is_active);

CREATE INDEX idx_subscriptions_topic 
ON user_subscriptions(topic_id, is_active);
```

### 4. Notification System

#### 4.1 Notification Queue

```sql
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    event_id UUID REFERENCES emergency_events(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('new_event', 'update', 'resolution')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Notification Processing
CREATE INDEX idx_notifications_status 
ON notification_queue(status, scheduled_at) WHERE status = 'pending';

CREATE INDEX idx_notifications_user 
ON notification_queue(user_id, created_at DESC);

CREATE INDEX idx_notifications_event 
ON notification_queue(event_id);
```

#### 4.2 User Notification Settings

```sql
CREATE TABLE user_notification_settings (
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES emergency_types(id) ON DELETE CASCADE,
    min_severity INTEGER DEFAULT 1 CHECK (min_severity BETWEEN 1 AND 5),
    max_distance INTEGER DEFAULT 10000, -- 10km default
    is_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, topic_id)
);
```

### 5. Audit and Logging

#### 5.1 Audit Log

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Audit Queries
CREATE INDEX idx_audit_log_user 
ON audit_log(user_id, created_at DESC);

CREATE INDEX idx_audit_log_action 
ON audit_log(action, created_at DESC);

CREATE INDEX idx_audit_log_table 
ON audit_log(table_name, created_at DESC);
```

#### 5.2 System Metrics

```sql
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Metrics Queries
CREATE INDEX idx_metrics_name_time 
ON system_metrics(metric_name, created_at DESC);

CREATE INDEX idx_metrics_created 
ON system_metrics(created_at DESC);
```

## Row Level Security (RLS)

### User Profiles RLS

```sql
-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Emergency Events RLS

```sql
-- Enable RLS on emergency_events
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

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

-- Users can insert events (they become reporters)
CREATE POLICY "Users can create emergency events" ON emergency_events
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can update their own events
CREATE POLICY "Users can update own events" ON emergency_events
    FOR UPDATE USING (auth.uid() = reporter_id);
```

## Database Functions

### Trust Score Calculation

```sql
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
BEGIN
    -- Calculate accuracy bonus from confirmed reports
    SELECT COALESCE(
        AVG(
            CASE 
                WHEN ee.status = 'resolved' AND ee.resolved_by != p_user_id THEN 0.1
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
    
    -- Update user's trust score if it has changed
    UPDATE user_profiles 
    SET trust_score = v_final_score, updated_at = NOW()
    WHERE user_id = p_user_id AND trust_score != v_final_score;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Event Consensus Calculation

```sql
CREATE OR REPLACE FUNCTION calculate_event_consensus(
    p_event_id UUID
) RETURNS VOID AS $$
DECLARE
    v_total_weight FLOAT := 0.0;
    v_threshold FLOAT := 5.0;
    v_current_status TEXT;
BEGIN
    -- Calculate total confirmation weight with time decay
    SELECT SUM(
        up.trust_score * 
        CASE 
            WHEN ec.created_at > NOW() - INTERVAL '30 minutes' THEN 1.0
            WHEN ec.created_at > NOW() - INTERVAL '1 hour' THEN 0.8
            WHEN ec.created_at > NOW() - INTERVAL '2 hours' THEN 0.6
            ELSE 0.4
        END
    ) INTO v_total_weight
    FROM event_confirmations ec
    JOIN user_profiles up ON ec.user_id = up.user_id
    WHERE ec.event_id = p_event_id
    AND ec.confirmation_type = 'confirm';
    
    -- Get current status
    SELECT status INTO v_current_status
    FROM emergency_events
    WHERE id = p_event_id;
    
    -- Update event status based on consensus
    IF v_total_weight >= v_threshold AND v_current_status = 'pending' THEN
        UPDATE emergency_events 
        SET 
            status = 'active',
            trust_weight = v_total_weight,
            updated_at = NOW()
        WHERE id = p_event_id;
        
        -- Trigger notification dispatch
        PERFORM pg_notify('event_activated', p_event_id::text);
        
    ELSIF v_total_weight < -v_threshold AND v_current_status = 'active' THEN
        UPDATE emergency_events 
        SET 
            status = 'pending',
            trust_weight = v_total_weight,
            updated_at = NOW()
        WHERE id = p_event_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Spatial Alert Dispatch

```sql
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
        -- Inverse-square relevance calculation
        (v_event_severity::FLOAT / (1 + POWER(ST_Distance(up.last_known_location, v_event_location) / 500, 2))) as relevance_score
    FROM user_profiles up
    JOIN auth.users ON auth.users.id = up.user_id
    LEFT JOIN user_push_tokens upf ON upf.user_id = up.user_id
    JOIN user_subscriptions us ON us.user_id = up.user_id
    WHERE 
        ST_DWithin(up.last_known_location, v_event_location, p_max_distance)
        AND us.topic_id = v_event_type_id
        AND us.is_active = true
        AND up.trust_score > 0.1
        AND NOT EXISTS (
            SELECT 1 FROM user_mutes um 
            WHERE um.user_id = up.user_id 
            AND um.mute_until > NOW()
        )
    ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Database Triggers

### Trust Score Update Trigger

```sql
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

CREATE TRIGGER trust_score_update
    AFTER INSERT OR UPDATE OR DELETE ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_trust_score_trigger();
```

### Consensus Calculation Trigger

```sql
CREATE OR REPLACE FUNCTION consensus_calculation_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate consensus when confirmation is added
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_event_consensus(NEW.event_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consensus_calculation
    AFTER INSERT ON event_confirmations
    FOR EACH ROW EXECUTE FUNCTION consensus_calculation_trigger();
```

### Audit Logging Trigger

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action TEXT;
BEGIN
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
    
    -- Insert audit record
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
        COALESCE(auth.uid(), NULL),
        v_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data,
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_emergency_events
    AFTER INSERT OR UPDATE OR DELETE ON emergency_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Optimization

### Indexing Strategy

1. **Spatial Indexes**: GIST indexes on all location columns
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **Partial Indexes**: Indexes on filtered subsets for better performance
4. **Expression Indexes**: Indexes on computed columns

### Query Optimization

1. **Spatial Queries**: Use ST_DWithin for radius-based filtering
2. **Pagination**: LIMIT/OFFSET with indexed ordering
3. **Connection Pooling**: PgBouncer for connection management
4. **Materialized Views**: For complex aggregations

### Monitoring

```sql
-- Slow Query Monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 10;
```

## Data Retention and Cleanup

### Automatic Cleanup Functions

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS VOID AS $$
BEGIN
    -- Update expired events
    UPDATE emergency_events 
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'active')
    AND expires_at < NOW();
    
    -- Archive old resolved events (older than 90 days)
    DELETE FROM emergency_events 
    WHERE status = 'resolved'
    AND resolved_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old audit logs (older than 1 year)
    DELETE FROM audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Clean up old notifications (older than 7 days)
    DELETE FROM notification_queue 
    WHERE status IN ('sent', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job (requires pg_cron extension)
SELECT cron.schedule(
    'cleanup-expired-events',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT cleanup_expired_events();'
);
```

## Security Considerations

### Data Anonymization

```sql
CREATE OR REPLACE FUNCTION anonymize_old_locations()
RETURNS VOID AS $$
BEGIN
    -- Reduce precision of locations older than 7 days
    UPDATE user_profiles 
    SET last_known_location = ST_ReducePrecision(last_known_location, 3) -- ~100m precision
    WHERE updated_at < NOW() - INTERVAL '7 days';
    
    -- Remove exact locations older than 30 days
    UPDATE user_profiles 
    SET last_known_location = NULL
    WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### Access Control

1. **Row Level Security**: Implemented on all user data tables
2. **Function Security**: SECURITY DEFINER for privileged operations
3. **API Keys**: Rotating API keys for external services
4. **Network Security**: VPC peering and firewall rules

---

*This schema documentation will be updated as the database evolves and new requirements emerge.*