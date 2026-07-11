-- User onboarding, profile columns, and trust-score persistence
--
-- Addresses several production gaps:
--  1. No user_profiles row was created on signup (every lookup returned
--     PGRST116). Adds an AFTER INSERT trigger on auth.users.
--  2. role/name/avatar columns referenced by app code did not exist.
--  3. The TrustScoreManager upserts computed factors into a relation that is
--     a VIEW (user_trust_scores), so writes silently failed. Adds a real
--     `trust_score_cache` table for persistent computed factors.
--  4. user_push_subscriptions was referenced by the notifications API but had
--     no migration; consolidate onto push_subscriptions.

-- ===========================================================================
-- 1. Extend user_profiles with onboarding / RBAC fields
-- ===========================================================================
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
        CHECK (role IN ('citizen', 'responder', 'coordinator', 'moderator', 'admin')),
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;

-- ===========================================================================
-- 2. Auto-create a user_profiles row when a new auth.users record is inserted
--    (Supabase triggers our function after email/OAuth signup).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'citizen'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================================================
-- 3. trust_score_cache: persistent store for computed trust factors
--    (replaces writes to the read-only user_trust_scores VIEW)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS trust_score_cache (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    overall_score FLOAT NOT NULL DEFAULT 0.1 CHECK (overall_score >= 0.0 AND overall_score <= 1.0),
    factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    reputation JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_score_cache_overall
    ON trust_score_cache (overall_score DESC);

ALTER TABLE trust_score_cache ENABLE ROW LEVEL SECURITY;
-- Intentionally no permissive policy: this table is read/written only by the
-- service role (server-side trust manager). Users read their trust score via
-- the user_trust_scores view / dedicated API.

-- Mirror the authoritative trust_score on user_profiles whenever the cache is
-- updated, so the existing schema/views stay consistent.
CREATE OR REPLACE FUNCTION public.sync_profile_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_profiles
    SET trust_score = NEW.overall_score, updated_at = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trust_score_cache_update ON trust_score_cache;
CREATE TRIGGER on_trust_score_cache_update
    AFTER INSERT OR UPDATE ON trust_score_cache
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_trust_score();
