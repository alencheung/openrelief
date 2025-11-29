-- Initial schema for OpenRelief database
-- This migration sets up PostGIS extension and all core tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types and enums
DO $$ BEGIN
    CREATE TYPE emergency_events_status AS ENUM ('pending', 'active', 'resolved', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_confirmations_confirmation_type AS ENUM ('confirm', 'dispute');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_queue_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_queue_notification_type AS ENUM ('new_event', 'update', 'resolution');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_trust_history_action_type AS ENUM ('report', 'confirm', 'dispute');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- User Trust History Table
CREATE TABLE IF NOT EXISTS user_trust_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    event_id UUID,
    action_type user_trust_history_action_type NOT NULL,
    trust_change FLOAT NOT NULL,
    previous_score FLOAT NOT NULL,
    new_score FLOAT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Types Table
CREATE TABLE IF NOT EXISTS emergency_types (
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

-- Emergency Events Table
CREATE TABLE IF NOT EXISTS emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id INTEGER REFERENCES emergency_types(id),
    reporter_id UUID REFERENCES user_profiles(user_id),
    title TEXT NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 1000,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    status emergency_events_status DEFAULT 'pending',
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

-- Event Confirmations Table
CREATE TABLE IF NOT EXISTS event_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES emergency_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    confirmation_type event_confirmations_confirmation_type NOT NULL,
    trust_weight FLOAT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    distance_from_event FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one confirmation per user per event
    UNIQUE(event_id, user_id)
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES emergency_types(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    notification_radius INTEGER DEFAULT 10000, -- 10km default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, topic_id)
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    event_id UUID REFERENCES emergency_events(id) ON DELETE CASCADE,
    notification_type notification_queue_notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status notification_queue_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
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

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
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

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for emergency types
INSERT INTO emergency_types (slug, name, description, icon, color, default_radius) VALUES
('fire', 'Fire', 'Fire-related emergencies', 'flame', '#FF4444', 500),
('medical', 'Medical', 'Medical emergencies', 'medical', '#FF69B4', 300),
('security', 'Security', 'Security threats', 'shield', '#FFD700', 1000),
('natural', 'Natural Disaster', 'Natural disasters', 'cloud', '#4169E1', 2000),
('infrastructure', 'Infrastructure', 'Infrastructure failures', 'alert', '#FF8C00', 1500)
ON CONFLICT DO NOTHING;