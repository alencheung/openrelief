-- Migration for Privacy Features in OpenRelief
-- This migration adds tables and functions for privacy protection

-- Create privacy settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_sharing BOOLEAN DEFAULT true NOT NULL,
  location_precision INTEGER DEFAULT 3 NOT NULL CHECK (location_precision >= 1 AND location_precision <= 5),
  data_retention_days INTEGER DEFAULT 30 NOT NULL CHECK (data_retention_days >= 1),
  anonymize_data BOOLEAN DEFAULT true NOT NULL,
  differential_privacy BOOLEAN DEFAULT true NOT NULL,
  k_anonymity BOOLEAN DEFAULT true NOT NULL,
  end_to_end_encryption BOOLEAN DEFAULT true NOT NULL,
  emergency_data_sharing BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create privacy budget table
CREATE TABLE IF NOT EXISTS privacy_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL,
  remaining_budget DECIMAL(5,4) DEFAULT 1.0 NOT NULL CHECK (remaining_budget >= 0),
  last_reset TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, data_type)
);

-- Create data export requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_types TEXT[] NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  file_path TEXT
);

-- Create data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_types TEXT[] NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  confirmation_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Create privacy audit log table
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  data_type TEXT NOT NULL,
  privacy_budget_used DECIMAL(5,4) DEFAULT 0 NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create encrypted user data table
CREATE TABLE IF NOT EXISTS encrypted_user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  tag TEXT NOT NULL,
  key_id TEXT NOT NULL,
  algorithm TEXT DEFAULT 'aes-256-gcm' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ
);

-- Add privacy columns to existing tables
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'standard' CHECK (privacy_level IN ('basic', 'standard', 'enhanced', 'maximum')),
ADD COLUMN IF NOT EXISTS data_anonymized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_privacy_update TIMESTAMPTZ;

ALTER TABLE emergency_events 
ADD COLUMN IF NOT EXISTS privacy_impact_level TEXT DEFAULT 'medium' CHECK (privacy_impact_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS anonymized_location BOOLEAN DEFAULT false;

-- Create indexes for privacy tables
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_budget_user_id ON privacy_budget(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_budget_data_type ON privacy_budget(data_type);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id ON privacy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_action ON privacy_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_created_at ON privacy_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_encrypted_user_data_user_id ON encrypted_user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_user_data_data_type ON encrypted_user_data(data_type);

-- Create functions for privacy management

-- Function to initialize privacy settings for a new user
CREATE OR REPLACE FUNCTION initialize_privacy_settings(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO privacy_settings (user_id) VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO privacy_budget (user_id, data_type, remaining_budget)
  VALUES 
    (user_uuid, 'location', 1.0),
    (user_uuid, 'trustScore', 2.0),
    (user_uuid, 'userProfile', 3.0),
    (user_uuid, 'emergencyData', 0.5)
  ON CONFLICT (user_id, data_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and consume privacy budget
CREATE OR REPLACE FUNCTION consume_privacy_budget(
  user_uuid UUID,
  data_type_param TEXT,
  epsilon_required DECIMAL(5,4)
) RETURNS BOOLEAN AS $$
DECLARE
  current_budget DECIMAL(5,4);
BEGIN
  -- Get current budget
  SELECT remaining_budget INTO current_budget
  FROM privacy_budget
  WHERE user_id = user_uuid AND data_type = data_type_param
  FOR UPDATE;
  
  -- Check if sufficient budget exists
  IF current_budget < epsilon_required THEN
    RETURN FALSE;
  END IF;
  
  -- Consume budget
  UPDATE privacy_budget
  SET remaining_budget = remaining_budget - epsilon_required,
      updated_at = now()
  WHERE user_id = user_uuid AND data_type = data_type_param;
  
  -- Log the consumption
  INSERT INTO privacy_audit_log (user_id, action, data_type, privacy_budget_used)
  VALUES (user_uuid, 'consume_budget', data_type_param, epsilon_required);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset privacy budgets (should be called daily)
CREATE OR REPLACE FUNCTION reset_privacy_budgets()
RETURNS VOID AS $$
BEGIN
  UPDATE privacy_budget
  SET remaining_budget = CASE data_type
    WHEN 'location' THEN 1.0
    WHEN 'trustScore' THEN 2.0
    WHEN 'userProfile' THEN 3.0
    WHEN 'emergencyData' THEN 0.5
    ELSE 1.0
  END,
  last_reset = now(),
  updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply differential privacy to location data
CREATE OR REPLACE FUNCTION apply_differential_privacy_to_location(
  lat DECIMAL,
  lng DECIMAL,
  epsilon DECIMAL DEFAULT 0.1
) RETURNS TABLE(
  latitude DECIMAL,
  longitude DECIMAL
) AS $$
DECLARE
  scale DECIMAL;
  lat_noise DECIMAL;
  lng_noise DECIMAL;
BEGIN
  -- Calculate scale parameter (sensitivity/epsilon)
  scale := 1.0 / epsilon;
  
  -- Generate Laplace noise (simplified implementation)
  -- In a real implementation, use proper cryptographic random number generation
  lat_noise := scale * LN(1 - 2 * RANDOM()) * (CASE WHEN RANDOM() > 0.5 THEN 1 ELSE -1 END);
  lng_noise := scale * LN(1 - 2 * RANDOM()) * (CASE WHEN RANDOM() > 0.5 THEN 1 ELSE -1 END);
  
  -- Convert meter noise to degrees (approximate)
  lat_noise := lat_noise / 111132;
  lng_noise := lng_noise / (111320 * COS(RADIANS(lat)));
  
  RETURN QUERY
  SELECT lat + lat_noise, lng + lng_noise;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create privacy grid cells
CREATE OR REPLACE FUNCTION create_privacy_grid(
  lat DECIMAL,
  lng DECIMAL,
  grid_size_km DECIMAL DEFAULT 1.0
) RETURNS TABLE(
  latitude DECIMAL,
  longitude DECIMAL
) AS $$
DECLARE
  lat_grid_size DECIMAL;
  lng_grid_size DECIMAL;
BEGIN
  -- Convert grid size to degrees (approximate)
  lat_grid_size := grid_size_km / 111;
  lng_grid_size := grid_size_km / (111 * COS(RADIANS(lat)));
  
  -- Snap to grid
  RETURN QUERY
  SELECT ROUND(lat / lat_grid_size) * lat_grid_size,
         ROUND(lng / lng_grid_size) * lng_grid_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log privacy actions
CREATE OR REPLACE FUNCTION log_privacy_action(
  user_uuid UUID,
  action_param TEXT,
  data_type_param TEXT,
  epsilon_used DECIMAL DEFAULT 0,
  metadata_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO privacy_audit_log (
    user_id, action, data_type, privacy_budget_used, metadata, ip_address, user_agent
  ) VALUES (
    user_uuid, action_param, data_type_param, epsilon_used, metadata_param, 
    inet_client_addr(), current_setting('request.headers')::json->>'user-agent'
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply temporal decay to trust scores
CREATE OR REPLACE FUNCTION apply_temporal_decay_trust_score(
  current_score DECIMAL,
  last_updated TIMESTAMPTZ,
  half_life_days INTEGER DEFAULT 30
) RETURNS DECIMAL AS $$
DECLARE
  age_days DECIMAL;
  decay_factor DECIMAL;
BEGIN
  age_days := EXTRACT(EPOCH FROM (now() - last_updated)) / (24 * 60 * 60);
  
  -- Apply exponential decay
  decay_factor := POWER(0.5, age_days / half_life_days);
  
  RETURN current_score * decay_factor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize user data for queries
CREATE OR REPLACE FUNCTION anonymize_user_data(
  user_data JSONB,
  privacy_level TEXT DEFAULT 'standard'
) RETURNS JSONB AS $$
BEGIN
  CASE privacy_level
    WHEN 'basic' THEN
      -- Only remove direct identifiers
      user_data := user_data - 'email' - 'phone' - 'ssn';
    WHEN 'standard' THEN
      -- Remove identifiers and generalize age/location
      user_data := user_data - 'email' - 'phone' - 'ssn' - 'name';
      IF user_data ? 'age' THEN
        user_data := jsonb_set(user_data, '{age}', 
          to_jsonb((user_data->>'age')::integer / 10 * 10 || '-' || ((user_data->>'age')::integer / 10 * 10 + 9)));
      END IF;
    WHEN 'enhanced' THEN
      -- More aggressive anonymization
      user_data := user_data - 'email' - 'phone' - 'ssn' - 'name' - 'age' - 'address';
      IF user_data ? 'latitude' AND user_data ? 'longitude' THEN
        -- Apply privacy grid
        user_data := jsonb_set(
          jsonb_set(user_data, '{latitude}', 
            (SELECT apply_privacy_grid((user_data->>'latitude')::decimal, (user_data->>'longitude')::decimal, 2.0).latitude)),
          '{longitude}',
          (SELECT apply_privacy_grid((user_data->>'latitude')::decimal, (user_data->>'longitude')::decimal, 2.0).longitude)
        );
      END IF;
    WHEN 'maximum' THEN
      -- Maximum privacy - only aggregate data
      user_data := jsonb_build_object('id', user_data->>'id');
  END CASE;
  
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for privacy features

-- Trigger to initialize privacy settings for new users
CREATE OR REPLACE FUNCTION on_new_user_create_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_privacy_settings(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER new_user_privacy_settings
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION on_new_user_create_privacy_settings();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON privacy_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_budget_updated_at
BEFORE UPDATE ON privacy_budget
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at
BEFORE UPDATE ON data_export_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_deletion_requests_updated_at
BEFORE UPDATE ON data_deletion_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for privacy tables

-- Enable RLS on privacy tables
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_user_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for privacy_settings
CREATE POLICY "Users can view own privacy settings" ON privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings" ON privacy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings" ON privacy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for privacy_budget
CREATE POLICY "Users can view own privacy budget" ON privacy_budget
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for data_export_requests
CREATE POLICY "Users can view own export requests" ON data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export requests" ON data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for data_deletion_requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deletion requests" ON data_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for privacy_audit_log
CREATE POLICY "Users can view own audit log" ON privacy_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for encrypted_user_data
CREATE POLICY "Users can view own encrypted data" ON encrypted_user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encrypted data" ON encrypted_user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create views for privacy analytics (aggregated, anonymized data)
CREATE OR REPLACE VIEW privacy_analytics_location AS
SELECT 
  create_privacy_grid(latitude, longitude, 5.0).latitude as grid_lat,
  create_privacy_grid(latitude, longitude, 5.0).longitude as grid_lng,
  COUNT(*) as user_count,
  AVG(trust_score) as avg_trust_score
FROM user_profiles
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
GROUP BY grid_lat, grid_lng
HAVING COUNT(*) >= 5; -- k-anonymity threshold

CREATE OR REPLACE VIEW privacy_analytics_trust AS
SELECT 
  DATE_TRUNC('week', created_at) as week,
  AVG(trust_score) as avg_trust_score,
  COUNT(*) as user_count,
  STDDEV(trust_score) as trust_stddev
FROM user_profiles
WHERE trust_score IS NOT NULL
GROUP BY week
HAVING COUNT(*) >= 10; -- k-anonymity threshold

-- Create scheduled job to reset privacy budgets (requires pg_cron extension)
-- SELECT cron.schedule('reset-privacy-budgets', '0 0 * * *', 'SELECT reset_privacy_budgets();');

-- Create scheduled job to clean up expired encrypted data
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'DELETE FROM encrypted_user_data WHERE expires_at < now();');