-- User-facing legal/GDPR requests (self-service data subject rights).
-- Distinct from the law-enforcement/legal_requests table (migration
-- 20231205_enhanced_audit_system.sql) which models inbound third-party legal
-- demands with a much richer schema. This table maps 1:1 to the LegalRequest
-- TS interface used by the privacy UI and /api/privacy/legal-requests.

CREATE TABLE IF NOT EXISTS user_legal_requests (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'data_access', 'deletion', 'correction', 'portability', 'objection'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'processing', 'completed', 'rejected', 'appealed'
  )) DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  response_deadline TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  can_user_contact BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_legal_requests_user_id
  ON user_legal_requests(user_id, created_at DESC);

ALTER TABLE user_legal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own legal requests"
  ON user_legal_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own legal requests"
  ON user_legal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own legal requests"
  ON user_legal_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
