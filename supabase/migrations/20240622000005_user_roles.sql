-- User roles for RBAC.
--
-- Previously api-security checked a `role`/`permissions` column that did not
-- exist on user_profiles, so the admin gate could never fire (allowedRoles was
-- matched against an always-empty permissions array). This adds the columns the
-- security layer expects and backfills existing users as 'citizen'.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
    CHECK (role IN ('citizen', 'responder', 'moderator', 'admin')),
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Index for admin/dashboard queries filtering by role.
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role)
  WHERE role IN ('moderator', 'admin');

-- RLS: a user's own role is readable by themselves (already covered by the
-- existing user_profiles SELECT policy). Roles are not secret (they govern
-- capabilities, not PII), so no extra policy is required.
