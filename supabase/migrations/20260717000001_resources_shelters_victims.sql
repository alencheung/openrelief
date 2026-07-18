-- Resources, Shelters, Victim Tracking, and Status Check-ins.
--
-- These four domains exist fully in the client (stores, hooks, components) but
-- have NO backing tables, so every feature in components/resources and
-- components/victims is unreachable/empty. This migration creates the tables
-- with columns that match the existing TypeScript types
-- (src/types/resource.ts, src/types/victim.ts, src/types/checkin.ts) so the
-- stores can read/write them without a types regeneration. RLS is enabled on
-- all tables; policies follow the same "owner can CRUD, others can read"
-- pattern used by emergency_events.

-- ===========================================================================
-- RESOURCES
-- ===========================================================================
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('water','food','medical','shelter','transport','communication','power','clothing','other')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','limited','depleted','requested')),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  urgency TEXT NOT NULL DEFAULT 'low' CHECK (urgency IN ('low','medium','high','critical')),
  location JSONB,                     -- { lat, lng, address? }
  address TEXT,
  distance DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  contact_info JSONB,                 -- { name?, phone?, email? }
  managed_by TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resource_needs (
  id TEXT PRIMARY KEY,
  resource_id TEXT REFERENCES resources(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  needed_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
  requested_by TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  requested_by_organization TEXT,
  location JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','fulfilled','cancelled')),
  fulfilled_by TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_read_all" ON resources;
CREATE POLICY "resources_read_all" ON resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "resources_owner_modify" ON resources;
CREATE POLICY "resources_owner_modify" ON resources
  FOR ALL USING (auth.uid() = managed_by) WITH CHECK (auth.uid() = managed_by);

DROP POLICY IF EXISTS "resource_needs_owner_modify" ON resource_needs;
CREATE POLICY "resource_needs_owner_modify" ON resource_needs
  FOR ALL USING (auth.uid() = requested_by) WITH CHECK (auth.uid() = requested_by);
DROP POLICY IF EXISTS "resource_needs_read_all" ON resource_needs;
CREATE POLICY "resource_needs_read_all" ON resource_needs FOR SELECT USING (true);

-- ===========================================================================
-- SHELTERS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS shelters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('emergency','evacuation','temporary','long_term','medical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','closed','evacuating')),
  capacity INTEGER NOT NULL DEFAULT 0,
  current_occupancy INTEGER NOT NULL DEFAULT 0,
  available_beds INTEGER NOT NULL DEFAULT 0,
  address TEXT NOT NULL,
  location JSONB NOT NULL,            -- { lat, lng }
  amenities TEXT[],
  accessibility_features TEXT[],
  contact_info JSONB,
  hours JSONB,                        -- { is24_7, open?, close? }
  pets_allowed BOOLEAN NOT NULL DEFAULT false,
  managed_by TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_volunteers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shelter_check_ins (
  id TEXT PRIMARY KEY,
  shelter_id TEXT NOT NULL REFERENCES shelters(id) ON DELETE CASCADE,
  number_of_people INTEGER NOT NULL,
  special_needs JSONB,                -- { medical, accessibility, other? }
  contact_info JSONB NOT NULL,
  estimated_stay_duration INTEGER,
  vehicle_info JSONB,
  pet_info JSONB,
  checked_in_by TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelter_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shelters_read_all" ON shelters;
CREATE POLICY "shelters_read_all" ON shelters FOR SELECT USING (true);
DROP POLICY IF EXISTS "shelters_owner_modify" ON shelters;
CREATE POLICY "shelters_owner_modify" ON shelters
  FOR ALL USING (auth.uid() = managed_by) WITH CHECK (auth.uid() = managed_by);

DROP POLICY IF EXISTS "shelter_check_ins_self" ON shelter_check_ins;
CREATE POLICY "shelter_check_ins_self" ON shelter_check_ins
  FOR ALL USING (auth.uid() = checked_in_by) WITH CHECK (auth.uid() = checked_in_by);
DROP POLICY IF EXISTS "shelter_check_ins_read_all" ON shelter_check_ins;
CREATE POLICY "shelter_check_ins_read_all" ON shelter_check_ins FOR SELECT USING (true);

-- ===========================================================================
-- VICTIMS / STATUS CHECK-INS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS victims (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('safe','injured','trapped','missing','deceased','unknown')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  location JSONB NOT NULL,            -- { lat, lng, address? }
  phone TEXT,
  email TEXT,
  emergency_contact JSONB,            -- { name?, phone?, relationship? }
  notes TEXT,
  injuries JSONB,                     -- array of { type, severity, description }
  reporter_id TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS victim_check_ins (
  id TEXT PRIMARY KEY,
  victim_id TEXT NOT NULL REFERENCES victims(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location JSONB,
  notes TEXT,
  reporter_id TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE victims ENABLE ROW LEVEL SECURITY;
ALTER TABLE victim_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "victims_read_all" ON victims;
CREATE POLICY "victims_read_all" ON victims FOR SELECT USING (true);
DROP POLICY IF EXISTS "victims_reporter_modify" ON victims;
CREATE POLICY "victims_reporter_modify" ON victims
  FOR ALL USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "victim_check_ins_self" ON victim_check_ins;
CREATE POLICY "victim_check_ins_self" ON victim_check_ins
  FOR ALL USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "victim_check_ins_read_all" ON victim_check_ins;
CREATE POLICY "victim_check_ins_read_all" ON victim_check_ins FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS status_check_ins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('safe','need_help','not_in_area','unknown')),
  location JSONB,
  message TEXT,
  needs_help_type TEXT[],
  contact_number TEXT,
  emergency_contacts JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  visible_to_contacts BOOLEAN NOT NULL DEFAULT true,
  event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE status_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_check_ins_owner_modify" ON status_check_ins;
CREATE POLICY "status_check_ins_owner_modify" ON status_check_ins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Public check-ins are readable by everyone; private ones only by the owner.
DROP POLICY IF EXISTS "status_check_ins_read" ON status_check_ins;
CREATE POLICY "status_check_ins_read" ON status_check_ins
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- updated_at maintenance triggers (idempotent).
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resources_touch ON resources;
CREATE TRIGGER resources_touch BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS shelters_touch ON shelters;
CREATE TRIGGER shelters_touch BEFORE UPDATE ON shelters
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS victims_touch ON victims;
CREATE TRIGGER victims_touch BEFORE UPDATE ON victims
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS resource_needs_touch ON resource_needs;
CREATE TRIGGER resource_needs_touch BEFORE UPDATE ON resource_needs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
