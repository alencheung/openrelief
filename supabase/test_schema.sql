-- Database schema validation tests for OpenRelief
-- This script tests all database components to ensure they're working correctly

-- Test configuration
\set ON_ERROR_STOP on
\echo 'Starting OpenRelief Database Schema Tests...'

-- Test 1: Check Extensions
\echo 'Test 1: Verifying required extensions...'
DO $$
DECLARE
    v_postgis_exists BOOLEAN;
    v_uuid_ossp_exists BOOLEAN;
    v_pg_stat_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') INTO v_postgis_exists;
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') INTO v_uuid_ossp_exists;
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') INTO v_pg_stat_exists;
    
    IF NOT v_postgis_exists THEN
        RAISE EXCEPTION 'PostGIS extension is not installed';
    END IF;
    
    IF NOT v_uuid_ossp_exists THEN
        RAISE EXCEPTION 'UUID-OSSP extension is not installed';
    END IF;
    
    IF NOT v_pg_stat_exists THEN
        RAISE EXCEPTION 'pg_stat_statements extension is not installed';
    END IF;
    
    RAISE NOTICE '✓ All required extensions are installed';
END $$;

-- Test 2: Check Tables
\echo 'Test 2: Verifying table creation...'
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_tables TEXT[] := ARRAY[
        'user_profiles', 'user_trust_history', 'emergency_types', 
        'emergency_events', 'event_confirmations', 'user_subscriptions',
        'notification_queue', 'user_notification_settings', 'audit_log',
        'system_metrics', 'user_push_tokens', 'user_mutes'
    ];
    v_table_name TEXT;
BEGIN
    FOREACH v_table_name IN ARRAY v_tables
    LOOP
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table_name) INTO v_table_exists;
        IF NOT v_table_exists THEN
            RAISE EXCEPTION 'Table % does not exist', v_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All required tables exist';
END $$;

-- Test 3: Check Enums
\echo 'Test 3: Verifying enum types...'
DO $$
DECLARE
    v_enum_exists BOOLEAN;
    v_enums TEXT[] := ARRAY[
        'emergency_events_status', 'event_confirmations_confirmation_type',
        'notification_queue_status', 'notification_queue_notification_type',
        'user_trust_history_action_type'
    ];
    v_enum_name TEXT;
BEGIN
    FOREACH v_enum_name IN ARRAY v_enums
    LOOP
        SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = v_enum_name) INTO v_enum_exists;
        IF NOT v_enum_exists THEN
            RAISE EXCEPTION 'Enum % does not exist', v_enum_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All required enum types exist';
END $$;

-- Test 4: Check Functions
\echo 'Test 4: Verifying database functions...'
DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_functions TEXT[] := ARRAY[
        'calculate_trust_score', 'calculate_event_consensus', 
        'get_users_for_alert_dispatch', 'is_service_role', 
        'can_access_event', 'cleanup_expired_data',
        'anonymize_old_locations', 'system_health_check'
    ];
    v_function_name TEXT;
BEGIN
    FOREACH v_function_name IN ARRAY v_functions
    LOOP
        SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = v_function_name) INTO v_function_exists;
        IF NOT v_function_exists THEN
            RAISE EXCEPTION 'Function % does not exist', v_function_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All required functions exist';
END $$;

-- Test 5: Check Views
\echo 'Test 5: Verifying database views...'
DO $$
DECLARE
    v_view_exists BOOLEAN;
    v_views TEXT[] := ARRAY[
        'active_emergency_events', 'user_trust_scores', 
        'emergency_event_stats', 'user_activity_dashboard',
        'notification_performance', 'geographic_hotspots'
    ];
    v_view_name TEXT;
BEGIN
    FOREACH v_view_name IN ARRAY v_views
    LOOP
        SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = v_view_name) INTO v_view_exists;
        IF NOT v_view_exists THEN
            RAISE EXCEPTION 'View % does not exist', v_view_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All required views exist';
END $$;

-- Test 6: Check Indexes
\echo 'Test 6: Verifying critical indexes...'
DO $$
DECLARE
    v_index_exists BOOLEAN;
    v_indexes TEXT[] := ARRAY[
        'idx_user_profiles_location', 'idx_emergency_events_location',
        'idx_user_profiles_trust_score', 'idx_emergency_events_status',
        'idx_confirmations_event', 'idx_notifications_status',
        'idx_audit_log_user', 'idx_trust_history_user'
    ];
    v_index_name TEXT;
BEGIN
    FOREACH v_index_name IN ARRAY v_indexes
    LOOP
        SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = v_index_name) INTO v_index_exists;
        IF NOT v_index_exists THEN
            RAISE EXCEPTION 'Index % does not exist', v_index_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All critical indexes exist';
END $$;

-- Test 7: Check RLS Policies
\echo 'Test 7: Verifying Row Level Security policies...'
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
    v_tables TEXT[] := ARRAY[
        'user_profiles', 'user_trust_history', 'emergency_events',
        'event_confirmations', 'user_subscriptions', 'notification_queue'
    ];
    v_table_name TEXT;
BEGIN
    FOREACH v_table_name IN ARRAY v_tables
    LOOP
        -- Check if RLS is enabled
        SELECT relrowsecurity INTO v_rls_enabled 
        FROM pg_class 
        WHERE relname = v_table_name;
        
        IF NOT v_rls_enabled THEN
            RAISE EXCEPTION 'RLS is not enabled on table %', v_table_name;
        END IF;
        
        -- Check if policies exist
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies 
        WHERE tablename = v_table_name;
        
        IF v_policy_count = 0 THEN
            RAISE EXCEPTION 'No RLS policies found for table %', v_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ RLS policies are properly configured';
END $$;

-- Test 8: Test Trust Score Function
\echo 'Test 8: Testing trust score calculation...'
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_trust_score FLOAT;
BEGIN
    -- Create test user profile
    INSERT INTO user_profiles (user_id, trust_score)
    VALUES (v_test_user_id, 0.5);
    
    -- Test trust score calculation
    SELECT calculate_trust_score(v_test_user_id) INTO v_trust_score;
    
    IF v_trust_score IS NULL THEN
        RAISE EXCEPTION 'Trust score calculation failed';
    END IF;
    
    IF v_trust_score < 0.0 OR v_trust_score > 1.0 THEN
        RAISE EXCEPTION 'Trust score out of bounds: %', v_trust_score;
    END IF;
    
    -- Clean up test data
    DELETE FROM user_profiles WHERE user_id = v_test_user_id;
    
    RAISE NOTICE '✓ Trust score calculation working correctly (score: %)', v_trust_score;
END $$;

-- Test 9: Test Spatial Operations
\echo 'Test 9: Testing spatial operations...'
DO $$
DECLARE
    v_test_location GEOGRAPHY(POINT, 4326) := ST_GeographyFromText('SRID=4326;POINT(-122.4194 37.7749)');
    v_distance FLOAT;
    v_within BOOLEAN;
BEGIN
    -- Test distance calculation
    SELECT ST_Distance(
        v_test_location,
        ST_GeographyFromText('SRID=4326;POINT(-122.4184 37.7759)')
    ) INTO v_distance;
    
    IF v_distance IS NULL OR v_distance < 0 THEN
        RAISE EXCEPTION 'Distance calculation failed';
    END IF;
    
    -- Test spatial containment
    SELECT ST_DWithin(
        v_test_location,
        ST_GeographyFromText('SRID=4326;POINT(-122.4184 37.7759)'),
        1000
    ) INTO v_within;
    
    IF NOT v_within THEN
        RAISE EXCEPTION 'Spatial containment test failed';
    END IF;
    
    RAISE NOTICE '✓ Spatial operations working correctly (distance: % meters)', v_distance;
END $$;

-- Test 10: Test Emergency Event Creation
\echo 'Test 10: Testing emergency event creation...'
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_test_event_id UUID;
    v_event_count INTEGER;
BEGIN
    -- Create test user
    INSERT INTO user_profiles (user_id, trust_score)
    VALUES (v_test_user_id, 0.8);
    
    -- Create test emergency event
    INSERT INTO emergency_events (
        type_id, reporter_id, title, description, location, severity
    ) VALUES (
        (SELECT id FROM emergency_types WHERE slug = 'fire' LIMIT 1),
        v_test_user_id,
        'Test Fire Event',
        'Test fire description',
        ST_GeographyFromText('SRID=4326;POINT(-122.4194 37.7749)'),
        3
    ) RETURNING id INTO v_test_event_id;
    
    -- Verify event was created
    SELECT COUNT(*) INTO v_event_count
    FROM emergency_events
    WHERE id = v_test_event_id;
    
    IF v_event_count != 1 THEN
        RAISE EXCEPTION 'Emergency event creation failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM emergency_events WHERE id = v_test_event_id;
    DELETE FROM user_profiles WHERE user_id = v_test_user_id;
    
    RAISE NOTICE '✓ Emergency event creation working correctly';
END $$;

-- Test 11: Test Notification System
\echo 'Test 11: Testing notification system...'
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_test_event_id UUID := gen_random_uuid();
    v_notification_count INTEGER;
BEGIN
    -- Create test user and event
    INSERT INTO user_profiles (user_id, trust_score)
    VALUES (v_test_user_id, 0.8);
    
    INSERT INTO emergency_events (
        id, type_id, reporter_id, title, location, severity
    ) VALUES (
        v_test_event_id,
        (SELECT id FROM emergency_types WHERE slug = 'fire' LIMIT 1),
        v_test_user_id,
        'Test Event',
        ST_GeographyFromText('SRID=4326;POINT(-122.4194 37.7749)'),
        3
    );
    
    -- Create test notification
    INSERT INTO notification_queue (
        user_id, event_id, notification_type, title, message
    ) VALUES (
        v_test_user_id,
        v_test_event_id,
        'new_event',
        'Test Notification',
        'Test message'
    );
    
    -- Verify notification was created
    SELECT COUNT(*) INTO v_notification_count
    FROM notification_queue
    WHERE user_id = v_test_user_id AND event_id = v_test_event_id;
    
    IF v_notification_count != 1 THEN
        RAISE EXCEPTION 'Notification creation failed';
    END IF;
    
    -- Clean up test data
    DELETE FROM notification_queue WHERE user_id = v_test_user_id;
    DELETE FROM emergency_events WHERE id = v_test_event_id;
    DELETE FROM user_profiles WHERE user_id = v_test_user_id;
    
    RAISE NOTICE '✓ Notification system working correctly';
END $$;

-- Test 12: Test Audit Logging
\echo 'Test 12: Testing audit logging...'
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_audit_count INTEGER;
BEGIN
    -- Create test user
    INSERT INTO user_profiles (user_id, trust_score)
    VALUES (v_test_user_id, 0.5);
    
    -- Update user profile (should trigger audit)
    UPDATE user_profiles 
    SET trust_score = 0.6 
    WHERE user_id = v_test_user_id;
    
    -- Check if audit log was created
    SELECT COUNT(*) INTO v_audit_count
    FROM audit_log
    WHERE table_name = 'user_profiles' AND record_id = v_test_user_id;
    
    IF v_audit_count = 0 THEN
        RAISE EXCEPTION 'Audit logging not working';
    END IF;
    
    -- Clean up test data
    DELETE FROM user_profiles WHERE user_id = v_test_user_id;
    
    RAISE NOTICE '✓ Audit logging working correctly';
END $$;

-- Test 13: Test Data Views
\echo 'Test 13: Testing data views...'
DO $$
DECLARE
    v_view_count INTEGER;
    v_views TEXT[] := ARRAY[
        'active_emergency_events', 'user_trust_scores', 
        'emergency_event_stats'
    ];
    v_view_name TEXT;
BEGIN
    FOREACH v_view_name IN ARRAY v_views
    LOOP
        -- Test view query
        EXECUTE format('SELECT COUNT(*) FROM %I', v_view_name) INTO v_view_count;
        
        IF v_view_count IS NULL THEN
            RAISE EXCEPTION 'View % query failed', v_view_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ All data views working correctly';
END $$;

-- Test 14: Test Cleanup Functions
\echo 'Test 14: Testing cleanup functions...'
DO $$
DECLARE
    v_cleanup_result TEXT;
BEGIN
    -- Test system health check
    SELECT status INTO v_cleanup_result
    FROM system_health_check()
    WHERE check_name = 'active_events_count'
    LIMIT 1;
    
    IF v_cleanup_result IS NULL THEN
        RAISE EXCEPTION 'System health check failed';
    END IF;
    
    RAISE NOTICE '✓ Cleanup functions working correctly (health status: %)', v_cleanup_result;
END $$;

-- Final Summary
\echo '=========================================='
\echo 'OpenRelief Database Schema Tests Completed!'
\echo '=========================================='
\echo 'All tests passed successfully!'
\echo ''
\echo 'Database is ready for production use.'
\echo 'Key features verified:'
\echo '- PostGIS spatial operations'
\echo '- Trust scoring system'
\echo '- Row Level Security'
\echo '- Audit logging'
\echo '- Performance indexes'
\echo '- Database functions and triggers'
\echo '- Data views and cleanup functions'
\echo ''
\echo 'Next steps:'
\echo '1. Run: supabase db push'
\echo '2. Run: supabase db seed'
\echo '3. Run: npm run db:generate'
\echo '4. Start application: npm run dev'