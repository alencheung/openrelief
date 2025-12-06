-- Production Seed Data
-- This file contains production-ready seed data for OpenRelief

-- Emergency Types for Production
INSERT INTO emergency_types (id, slug, name, description, icon, color, default_radius, is_active, created_at) VALUES
(1, 'medical-emergency', 'Medical Emergency', 'Medical emergencies requiring immediate attention', 'ambulance', '#FF0000', 500, true, NOW()),
(2, 'fire', 'Fire', 'Fire incidents and related emergencies', 'fire-truck', '#FF6600', 1000, true, NOW()),
(3, 'natural-disaster', 'Natural Disaster', 'Natural disasters including floods, earthquakes, hurricanes', 'cloud-rain', '#0066CC', 5000, true, NOW()),
(4, 'accident', 'Accident', 'Traffic accidents and other incidents', 'car-crash', '#FF9900', 300, true, NOW()),
(5, 'crime', 'Crime', 'Criminal activities and security threats', 'shield-alert', '#9900CC', 500, true, NOW()),
(6, 'missing-person', 'Missing Person', 'Report of missing individuals', 'user-search', '#0099CC', 1000, true, NOW()),
(7, 'infrastructure-failure', 'Infrastructure Failure', 'Power outages, water main breaks, bridge failures', 'alert-triangle', '#FFCC00', 2000, true, NOW()),
(8, 'chemical-spill', 'Chemical Spill', 'Hazardous material spills and chemical emergencies', 'biohazard', '#00CC66', 1000, true, NOW()),
(9, 'public-safety', 'Public Safety', 'General public safety concerns', 'shield', '#3366FF', 750, true, NOW()),
(10, 'evacuation', 'Evacuation', 'Mandatory or voluntary evacuation notices', 'route', '#CC0066', 3000, true, NOW()),
(11, 'weather-alert', 'Weather Alert', 'Severe weather warnings and alerts', 'cloud-lightning', '#6633CC', 10000, true, NOW()),
(12, 'utility-outage', 'Utility Outage', 'Power, water, gas, or internet outages', 'power-off', '#666666', 1500, true, NOW()),
(13, 'animal-control', 'Animal Control', 'Dangerous or injured animals', 'alert', '#996633', 500, true, NOW()),
(14, 'public-health', 'Public Health', 'Disease outbreaks, health emergencies', 'heart-pulse', '#FF3366', 2000, true, NOW()),
(15, 'transportation', 'Transportation', 'Public transportation disruptions and issues', 'train', '#009999', 2000, true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  default_radius = EXCLUDED.default_radius,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create default admin user profiles
INSERT INTO user_profiles (user_id, trust_score, notification_preferences, privacy_settings, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 1.0, '{
  "push": true,
  "email": true,
  "sms": true,
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "07:00"
  },
  "emergency_types": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "max_distance": 10000,
  "min_severity": 5
}', '{
  "location_sharing": true,
  "profile_visibility": "public",
  "data_retention": 365,
  "analytics_consent": true,
  "marketing_consent": false
}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 0.9, '{
  "push": true,
  "email": true,
  "sms": false,
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  },
  "emergency_types": [1, 2, 4, 5, 6, 8, 14],
  "max_distance": 5000,
  "min_severity": 6
}', '{
  "location_sharing": true,
  "profile_visibility": "trusted",
  "data_retention": 180,
  "analytics_consent": true,
  "marketing_consent": false
}', NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 0.8, '{
  "push": false,
  "email": true,
  "sms": true,
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "07:00"
  },
  "emergency_types": [3, 7, 10, 11, 12, 15],
  "max_distance": 15000,
  "min_severity": 4
}', '{
  "location_sharing": false,
  "profile_visibility": "private",
  "data_retention": 90,
  "analytics_consent": false,
  "marketing_consent": false
}', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  trust_score = EXCLUDED.trust_score,
  notification_preferences = EXCLUDED.notification_preferences,
  privacy_settings = EXCLUDED.privacy_settings,
  updated_at = NOW();

-- Create default notification settings for emergency types
INSERT INTO user_notification_settings (user_id, topic_id, min_severity, max_distance, is_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES
-- Admin user 1 - all emergency types
('00000000-0000-0000-0000-000000000001', 1, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 2, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 3, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 4, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 5, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 6, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 7, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 8, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 9, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 10, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 11, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 12, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 13, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 14, 5, 10000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 15, 5, 10000, true, NULL, NULL, NOW(), NOW()),
-- Admin user 2 - selected emergency types
('00000000-0000-0000-0000-000000000002', 1, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 2, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 4, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 5, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 6, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 8, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 14, 6, 5000, true, '22:00', '07:00', NOW(), NOW()),
-- Admin user 3 - infrastructure and weather focused
('00000000-0000-0000-0000-000000000003', 3, 4, 15000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 7, 4, 15000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 10, 4, 15000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 11, 4, 15000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 12, 4, 15000, true, NULL, NULL, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 15, 4, 15000, true, NULL, NULL, NOW(), NOW())
ON CONFLICT (user_id, topic_id) DO UPDATE SET
  min_severity = EXCLUDED.min_severity,
  max_distance = EXCLUDED.max_distance,
  is_enabled = EXCLUDED.is_enabled,
  quiet_hours_start = EXCLUDED.quiet_hours_start,
  quiet_hours_end = EXCLUDED.quiet_hours_end,
  updated_at = NOW();

-- Create default subscriptions for emergency types
INSERT INTO user_subscriptions (user_id, topic_id, is_active, notification_radius, created_at, updated_at) VALUES
-- Admin user 1 - all emergency types
('00000000-0000-0000-0000-000000000001', 1, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 2, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 3, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 4, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 5, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 6, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 7, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 8, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 9, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 10, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 11, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 12, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 13, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 14, true, 10000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 15, true, 10000, NOW(), NOW()),
-- Admin user 2 - selected emergency types
('00000000-0000-0000-0000-000000000002', 1, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 2, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 4, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 5, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 6, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 8, true, 5000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 14, true, 5000, NOW(), NOW()),
-- Admin user 3 - infrastructure and weather focused
('00000000-0000-0000-0000-000000000003', 3, true, 15000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 7, true, 15000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 10, true, 15000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 11, true, 15000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 12, true, 15000, NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 15, true, 15000, NOW(), NOW())
ON CONFLICT (user_id, topic_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  notification_radius = EXCLUDED.notification_radius,
  updated_at = NOW();

-- Insert initial system metrics
INSERT INTO system_metrics (id, metric_name, metric_value, tags, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'database_connections', 5, '{"environment": "production", "type": "active"}', NOW()),
('00000000-0000-0000-0000-000000000002', 'emergency_events_total', 0, '{"environment": "production", "status": "active"}', NOW()),
('00000000-0000-0000-0000-000000000003', 'user_registrations', 3, '{"environment": "production", "type": "admin"}', NOW()),
('00000000-0000-0000-0000-000000000004', 'notification_queue_size', 0, '{"environment": "production", "status": "pending"}', NOW()),
('00000000-0000-0000-0000-000000000005', 'trust_system_active', 1, '{"environment": "production", "enabled": true}', NOW())
ON CONFLICT (id) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  tags = EXCLUDED.tags,
  created_at = NOW();

-- Create initial audit log entries
INSERT INTO audit_log (id, user_id, action, table_name, record_id, old_values, new_values, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'system', 'seed_data', 'emergency_types', NULL, NULL, '{"count": 15}', NOW()),
('00000000-0000-0000-0000-000000000002', 'system', 'seed_data', 'user_profiles', NULL, NULL, '{"count": 3}', NOW()),
('00000000-0000-0000-0000-000000000003', 'system', 'seed_data', 'user_notification_settings', NULL, NULL, '{"count": 18}', NOW()),
('00000000-0000-0000-0000-000000000004', 'system', 'seed_data', 'user_subscriptions', NULL, NULL, '{"count": 18}', NOW()),
('00000000-0000-0000-0000-000000000005', 'system', 'seed_data', 'system_metrics', NULL, NULL, '{"count": 5}', NOW())
ON CONFLICT (id) DO UPDATE SET
  action = EXCLUDED.action,
  table_name = EXCLUDED.table_name,
  new_values = EXCLUDED.new_values,
  created_at = NOW();

-- Create production configuration settings
INSERT INTO system_metrics (id, metric_name, metric_value, tags, created_at) VALUES
('00000000-0000-0000-0000-000000000006', 'emergency_alert_cooldown', 60, '{"environment": "production", "unit": "seconds"}', NOW()),
('00000000-0000-0000-0000-000000000007', 'max_alerts_per_user_per_hour', 10, '{"environment": "production", "limit": true}', NOW()),
('00000000-0000-0000-0000-000000000008', 'emergency_trust_threshold', 0.7, '{"environment": "production", "threshold": true}', NOW()),
('00000000-0000-0000-0000-000000000009', 'emergency_auto_expire_hours', 24, '{"environment": "production", "auto_cleanup": true}', NOW()),
('00000000-0000-0000-0000-000000000010', 'data_retention_days', 365, '{"environment": "production", "compliance": "GDPR"}', NOW()),
('00000000-0000-0000-0000-000000000011', 'audit_log_retention_days', 1095, '{"environment": "production", "compliance": "SOX"}', NOW()),
('00000000-0000-0000-0000-000000000012', 'backup_retention_days', 30, '{"environment": "production", "backup_policy": true}', NOW()),
('00000000-0000-0000-0000-000000000013', 'max_database_connections', 200, '{"environment": "production", "performance": true}', NOW()),
('00000000-0000-0000-0000-000000000014', 'cache_ttl_seconds', 300, '{"environment": "production", "performance": true}', NOW()),
('00000000-0000-0000-0000-000000000015', 'rate_limit_window_ms', 900000, '{"environment": "production", "security": true}', NOW())
ON CONFLICT (id) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  tags = EXCLUDED.tags,
  created_at = NOW();

-- Create production health check data
INSERT INTO system_metrics (id, metric_name, metric_value, tags, created_at) VALUES
('00000000-0000-0000-0000-000000000016', 'health_check_interval', 30000, '{"environment": "production", "monitoring": true}', NOW()),
('00000000-0000-0000-0000-000000000017', 'health_check_timeout', 5000, '{"environment": "production", "monitoring": true}', NOW()),
('00000000-0000-0000-0000-000000000018', 'autoscaling_enabled', 1, '{"environment": "production", "scaling": true}', NOW()),
('00000000-0000-0000-0000-000000000019', 'min_instances', 2, '{"environment": "production", "scaling": true}', NOW()),
('00000000-0000-0000-0000-000000000020', 'max_instances', 20, '{"environment": "production", "scaling": true}', NOW())
ON CONFLICT (id) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  tags = EXCLUDED.tags,
  created_at = NOW();

-- Commit the seed data
COMMIT;

-- Log successful seeding
DO $$
BEGIN
  INSERT INTO audit_log (id, user_id, action, table_name, record_id, new_values, created_at)
  VALUES (
    gen_random_uuid(),
    'system',
    'production_seeding_complete',
    'system',
    NULL,
    json_build_object('seeded_tables', json_build_array(
      'emergency_types', 'user_profiles', 'user_notification_settings', 
      'user_subscriptions', 'system_metrics', 'audit_log'
    )),
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not log seeding completion: %', SQLERRM;
END $$;