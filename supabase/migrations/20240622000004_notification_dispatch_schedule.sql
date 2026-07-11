-- Notification dispatch scheduling.
--
-- The dispatch endpoint (POST /api/notifications/dispatch) must be invoked
-- periodically to drain notification_queue. It is secured with the
-- INTERNAL_CRON_KEY header and cannot self-trigger.
--
-- Two paths are provided:
--   1. If the `pg_net` extension is available, a pg_cron job POSTs to the
--      dispatch endpoint every minute with the internal key.
--   2. Otherwise (most Supabase projects), set up Vercel Cron / a Supabase
--      scheduled function to hit the endpoint. See docs/deployment/CRON.md.
--
-- Both schedule calls are wrapped in EXCEPTION handlers so the migration
-- applies even when pg_cron / pg_net are absent (e.g. free tier).

-- Attempt to enable pg_net (no-op if unavailable / no superuser).
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  dispatch_url TEXT;
  cron_key TEXT;
BEGIN
  -- Resolve config from GUCs set by the operator (or env in Supabase).
  BEGIN
    dispatch_url := current_setting('app.dispatch_url', true);
    cron_key := current_setting('app.internal_cron_key', true);
  EXCEPTION WHEN OTHERS THEN
    dispatch_url := NULL;
    cron_key := NULL;
  END;

  IF dispatch_url IS NULL OR cron_key IS NULL THEN
    RAISE NOTICE 'app.dispatch_url / app.internal_cron_key not set; skipping pg_cron schedule. Configure external cron to POST to /api/notifications/dispatch with x-internal-key header.';
    RETURN;
  END IF;

  BEGIN
    -- Drain the notification queue every minute.
    PERFORM cron.schedule(
      'drain-notification-queue',
      '* * * * *',
      format(
        $$SELECT net.http_post(
          url := %L,
          headers := '{"Content-Type":"application/json","x-internal-key":"%s"}'::jsonb,
          body := '{}'::jsonb
        )$$,
        dispatch_url,
        cron_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
  END;
END $$;
