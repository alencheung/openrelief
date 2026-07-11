-- Extend privacy_settings to match the PrivacySettings TS interface.
-- The original table (migration 20240101000008) only covered the core toggles;
-- the API surface exposes additional user-controllable preferences that must
-- persist (previously lost because the route used an in-memory Map).

ALTER TABLE privacy_settings
  ADD COLUMN IF NOT EXISTS research_participation BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS third_party_analytics BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS automated_data_cleanup BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS privacy_budget_alerts BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS legal_notifications BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS data_processing_purposes TEXT[] DEFAULT ARRAY['service_delivery', 'safety_monitoring']::TEXT[] NOT NULL,
  ADD COLUMN IF NOT EXISTS consent_management BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS real_time_monitoring BOOLEAN DEFAULT true NOT NULL;

-- data_export_requests: store the generated payload so /api/privacy/download
-- can serve it. file_path/download_url alone are insufficient without object
-- storage wired up; storing the payload inline lets the feature work today.
ALTER TABLE data_export_requests
  ADD COLUMN IF NOT EXISTS payload JSONB;
