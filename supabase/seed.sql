-- Seed data for OpenRelief database
-- This script populates the database with initial test data for development

-- Enable necessary extensions (in case they're not enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Seed additional emergency types if they don't exist
INSERT INTO emergency_types (slug, name, description, icon, color, default_radius) VALUES
('fire', 'Fire', 'Fire-related emergencies', 'flame', '#FF4444', 500),
('medical', 'Medical', 'Medical emergencies', 'medical', '#FF69B4', 300),
('security', 'Security', 'Security threats', 'shield', '#FFD700', 1000),
('natural', 'Natural Disaster', 'Natural disasters', 'cloud', '#4169E1', 2000),
('infrastructure', 'Infrastructure', 'Infrastructure failures', 'alert', '#FF8C00', 1500),
('traffic', 'Traffic Accident', 'Traffic accidents and road incidents', 'car', '#9370DB', 800),
('environmental', 'Environmental', 'Environmental hazards', 'leaf', '#32CD32', 1200),
('utility', 'Utility Outage', 'Power, water, or gas outages', 'bolt', '#FF6347', 2000)
ON CONFLICT (slug) DO NOTHING;

-- Create sample users (these would normally come from auth.users)
-- Note: In a real scenario, these would be created through the auth system
DO $$
DECLARE
    v_user_id UUID;
    v_profile_count INTEGER;
BEGIN
    -- Check if we have any user profiles
    SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
    
    -- Only seed if we don't have users
    IF v_profile_count = 0 THEN
        -- Create sample user profiles for testing
        INSERT INTO user_profiles (user_id, trust_score, last_known_location, notification_preferences, privacy_settings) VALUES
        (
            gen_random_uuid(),
            0.8,
            ST_GeographyFromText('SRID=4326;POINT(-122.4194 37.7749)'), -- San Francisco
            '{"push": true, "email": true, "sms": false}',
            '{"location_sharing": true, "profile_visibility": "public"}'
        ),
        (
            gen_random_uuid(),
            0.6,
            ST_GeographyFromText('SRID=4326;POINT(-74.0060 40.7128)'), -- New York
            '{"push": true, "email": false, "sms": true}',
            '{"location_sharing": true, "profile_visibility": "friends"}'
        ),
        (
            gen_random_uuid(),
            0.4,
            ST_GeographyFromText('SRID=4326;POINT(-87.6298 41.8781)'), -- Chicago
            '{"push": false, "email": true, "sms": false}',
            '{"location_sharing": false, "profile_visibility": "private"}'
        ),
        (
            gen_random_uuid(),
            0.9,
            ST_GeographyFromText('SRID=4326;POINT(-118.2437 34.0522)'), -- Los Angeles
            '{"push": true, "email": true, "sms": true}',
            '{"location_sharing": true, "profile_visibility": "public"}'
        ),
        (
            gen_random_uuid(),
            0.2,
            ST_GeographyFromText('SRID=4326;POINT(-95.7129 37.0902)'), -- Central US
            '{"push": true, "email": false, "sms": false}',
            '{"location_sharing": false, "profile_visibility": "private"}'
        );
    END IF;
END $$;

-- Create sample emergency events
DO $$
DECLARE
    v_event_count INTEGER;
    v_user_id UUID;
    v_type_id INTEGER;
BEGIN
    -- Check if we have any emergency events
    SELECT COUNT(*) INTO v_event_count FROM emergency_events;
    
    -- Only seed if we don't have events
    IF v_event_count = 0 THEN
        -- Get a sample user and type for events
        SELECT user_id INTO v_user_id FROM user_profiles LIMIT 1;
        SELECT id INTO v_type_id FROM emergency_types WHERE slug = 'fire' LIMIT 1;
        
        IF v_user_id IS NOT NULL AND v_type_id IS NOT NULL THEN
            INSERT INTO emergency_events (
                type_id, 
                reporter_id, 
                title, 
                description, 
                location, 
                radius_meters, 
                severity, 
                status,
                metadata
            ) VALUES
            (
                v_type_id,
                v_user_id,
                'Building Fire Reported',
                'Smoke visible from 3-story building on Main Street',
                ST_GeographyFromText('SRID=4326;POINT(-122.4194 37.7749)'),
                500,
                4,
                'active',
                '{"reported_by": "anonymous", "confirmed_by": "multiple_sources"}'
            ),
            (
                (SELECT id FROM emergency_types WHERE slug = 'medical' LIMIT 1),
                v_user_id,
                'Medical Emergency',
                'Person collapsed at downtown intersection',
                ST_GeographyFromText('SRID=4326;POINT(-122.4184 37.7759)'),
                300,
                5,
                'active',
                '{"requires_immediate_attention": true, "reported_by": "bystander"}'
            ),
            (
                (SELECT id FROM emergency_types WHERE slug = 'traffic' LIMIT 1),
                v_user_id,
                'Multi-car Accident',
                'Highway accident blocking 2 lanes',
                ST_GeographyFromText('SRID=4326;POINT(-122.4204 37.7739)'),
                800,
                3,
                'pending',
                '{"vehicles_involved": 3, "injuries_reported": "unknown"}'
            ),
            (
                (SELECT id FROM emergency_types WHERE slug = 'infrastructure' LIMIT 1),
                v_user_id,
                'Power Outage',
                'Widespread power outage in downtown area',
                ST_GeographyFromText('SRID=4326;POINT(-122.4214 37.7759)'),
                2000,
                2,
                'resolved',
                '{"affected_customers": 5000, "estimated_restoration": "2 hours"}'
            ),
            (
                (SELECT id FROM emergency_types WHERE slug = 'natural' LIMIT 1),
                v_user_id,
                'Severe Weather Warning',
                'Heavy rain and flooding expected',
                ST_GeographyFromText('SRID=4326;POINT(-122.4174 37.7739)'),
                2000,
                3,
                'active',
                '{"weather_type": "heavy_rain", "flood_risk": "high"}'
            );
        END IF;
    END IF;
END $$;

-- Create sample event confirmations
DO $$
DECLARE
    v_confirmation_count INTEGER;
    v_user_id UUID;
    v_event_id UUID;
BEGIN
    -- Check if we have any confirmations
    SELECT COUNT(*) INTO v_confirmation_count FROM event_confirmations;
    
    -- Only seed if we don't have confirmations
    IF v_confirmation_count = 0 THEN
        -- Get sample user and event
        SELECT user_id INTO v_user_id FROM user_profiles LIMIT 1;
        SELECT id INTO v_event_id FROM emergency_events WHERE status = 'active' LIMIT 1;
        
        IF v_user_id IS NOT NULL AND v_event_id IS NOT NULL THEN
            INSERT INTO event_confirmations (
                event_id,
                user_id,
                confirmation_type,
                trust_weight,
                location,
                distance_from_event
            ) VALUES
            (
                v_event_id,
                v_user_id,
                'confirm',
                0.8,
                ST_GeographyFromText('SRID=4326;POINT(-122.4190 37.7750)'),
                50.5
            ),
            (
                v_event_id,
                (SELECT user_id FROM user_profiles OFFSET 1 LIMIT 1),
                'confirm',
                0.6,
                ST_GeographyFromText('SRID=4326;POINT(-122.4198 37.7745)'),
                120.3
            ),
            (
                v_event_id,
                (SELECT user_id FROM user_profiles OFFSET 2 LIMIT 1),
                'dispute',
                0.4,
                ST_GeographyFromText('SRID=4326;POINT(-122.4200 37.7755)'),
                200.1
            );
        END IF;
    END IF;
END $$;

-- Create sample user subscriptions
DO $$
DECLARE
    v_subscription_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Check if we have any subscriptions
    SELECT COUNT(*) INTO v_subscription_count FROM user_subscriptions;
    
    -- Only seed if we don't have subscriptions
    IF v_subscription_count = 0 THEN
        -- Subscribe users to different emergency types
        FOR v_user_id IN SELECT user_id FROM user_profiles LIMIT 3
        LOOP
            INSERT INTO user_subscriptions (user_id, topic_id, is_active, notification_radius)
            SELECT 
                v_user_id,
                id,
                true,
                CASE 
                    WHEN slug IN ('fire', 'medical', 'security') THEN 5000
                    WHEN slug IN ('traffic', 'infrastructure') THEN 10000
                    ELSE 15000
                END
            FROM emergency_types 
            WHERE is_active = true
            AND slug != 'utility'; -- Skip utility for demo
        END LOOP;
    END IF;
END $$;

-- Create sample user notification settings
DO $$
DECLARE
    v_settings_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Check if we have any notification settings
    SELECT COUNT(*) INTO v_settings_count FROM user_notification_settings;
    
    -- Only seed if we don't have settings
    IF v_settings_count = 0 THEN
        -- Create notification settings for users
        FOR v_user_id IN SELECT user_id FROM user_profiles LIMIT 3
        LOOP
            INSERT INTO user_notification_settings (
                user_id, 
                topic_id, 
                min_severity, 
                max_distance, 
                is_enabled,
                quiet_hours_start,
                quiet_hours_end
            )
            SELECT 
                v_user_id,
                id,
                CASE 
                    WHEN slug IN ('fire', 'medical') THEN 2
                    WHEN slug IN ('security') THEN 3
                    ELSE 1
                END,
                CASE 
                    WHEN slug IN ('fire', 'medical') THEN 8000
                    WHEN slug IN ('security') THEN 12000
                    ELSE 10000
                END,
                true,
                CASE 
                    WHEN slug IN ('traffic', 'infrastructure') THEN '22:00'
                    ELSE NULL
                END,
                CASE 
                    WHEN slug IN ('traffic', 'infrastructure') THEN '07:00'
                    ELSE NULL
                END
            FROM emergency_types 
            WHERE is_active = true
            AND slug != 'utility';
        END LOOP;
    END IF;
END $$;

-- Create sample system metrics
INSERT INTO system_metrics (metric_name, metric_value, tags)
VALUES
    ('active_users', 156, jsonb_build_object('timestamp', NOW(), 'source', 'seed')),
    ('total_events', 25, jsonb_build_object('timestamp', NOW(), 'source', 'seed')),
    ('system_health', 0.95, jsonb_build_object('timestamp', NOW(), 'source', 'seed')),
    ('database_connections', 45, jsonb_build_object('timestamp', NOW(), 'source', 'seed')),
    ('notification_success_rate', 0.92, jsonb_build_object('timestamp', NOW(), 'source', 'seed'))
ON CONFLICT DO NOTHING;

-- Create sample audit log entries (for testing)
DO $$
DECLARE
    v_audit_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Check if we have any audit entries
    SELECT COUNT(*) INTO v_audit_count FROM audit_log;
    
    -- Only seed if we don't have audit entries
    IF v_audit_count = 0 THEN
        SELECT user_id INTO v_user_id FROM user_profiles LIMIT 1;
        
        IF v_user_id IS NOT NULL THEN
            INSERT INTO audit_log (
                user_id,
                action,
                table_name,
                record_id,
                old_values,
                new_values,
                ip_address,
                user_agent
            )
            SELECT 
                v_user_id,
                'INSERT',
                'user_profiles',
                user_id,
                NULL,
                jsonb_build_object(
                    'user_id', user_id,
                    'trust_score', trust_score,
                    'created_at', created_at
                ),
                '127.0.0.1',
                'OpenRelief-Seed-Script/1.0'
            FROM user_profiles 
            WHERE user_id = v_user_id
            LIMIT 1;
        END IF;
    END IF;
END $$;

-- Create a missing table that was referenced in triggers
-- This table is needed for the notification system
CREATE TABLE IF NOT EXISTS user_push_tokens (
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_id TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, token)
);

-- Create index for push tokens
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user 
ON user_push_tokens(user_id, is_active);

-- Create index for device tokens
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_device 
ON user_push_tokens(device_id, is_active);

-- Enable RLS for push tokens
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for push tokens
CREATE POLICY "Users can view own push tokens" ON user_push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own push tokens" ON user_push_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push tokens" ON user_push_tokens
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Create a missing table that was referenced in functions
-- This table is needed for user muting functionality
CREATE TABLE IF NOT EXISTS user_mutes (
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    mute_until TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(user_id),
    PRIMARY KEY (user_id)
);

-- Create index for mutes
CREATE INDEX IF NOT EXISTS idx_user_mutes_user 
ON user_mutes(user_id, mute_until);

-- Enable RLS for user mutes
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;

-- RLS policies for user mutes
CREATE POLICY "Users can view own mutes" ON user_mutes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all mutes" ON user_mutes
    FOR ALL USING (
        current_setting('app.current_role', true) = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Output summary
DO $$
DECLARE
    v_user_count INTEGER;
    v_event_count INTEGER;
    v_type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM user_profiles;
    SELECT COUNT(*) INTO v_event_count FROM emergency_events;
    SELECT COUNT(*) INTO v_type_count FROM emergency_types;
    
    RAISE NOTICE 'Database seeding completed:';
    RAISE NOTICE '- Users: %', v_user_count;
    RAISE NOTICE '- Emergency Events: %', v_event_count;
    RAISE NOTICE '- Emergency Types: %', v_type_count;
    RAISE NOTICE 'Seed data is ready for testing!';
END $$;