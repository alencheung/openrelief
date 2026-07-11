import { request } from '@playwright/test';

/**
 * Global teardown for Playwright tests.
 *
 * Runs once after all test projects. Intended for cleaning up any test
 * data, sessions, or storage created during global-setup. This teardown
 * is DEFENSIVE: every cleanup step is wrapped so a missing resource or
 * environment variable logs a warning rather than failing the suite.
 */
async function globalTeardown() {
  console.log('[global-teardown] Starting cleanup...');

  // --- Clean up seeded auth artifacts -----------------------------------
  const accessToken = process.env.TEST_AUTH_ACCESS_TOKEN;
  const refreshToken = process.env.TEST_AUTH_REFRESH_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (accessToken && supabaseUrl && key) {
    console.log('[global-teardown] Signing out seeded test user...');
    const ctx = await request.newContext();
    try {
      const response = await ctx.post(`${supabaseUrl}/auth/v1/logout`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {},
        timeout: 10000,
      });
      if (response.ok()) {
        console.log('[global-teardown] Test user signed out.');
      } else {
        console.warn(
          `[global-teardown] Logout returned HTTP ${response.status()} — ignoring.`
        );
      }
    } catch (error) {
      console.warn(
        '[global-teardown] Logout request failed (non-fatal):',
        error instanceof Error ? error.message : error
      );
    } finally {
      await ctx.dispose();
    }
  } else {
    console.log('[global-teardown] No seeded auth session to clean up.');
  }

  // Clear ephemeral tokens from the process environment so they don't
  // leak between CI runs.
  delete process.env.TEST_AUTH_ACCESS_TOKEN;
  delete process.env.TEST_AUTH_REFRESH_TOKEN;

  console.log('[global-teardown] Cleanup complete.');
}

export default globalTeardown;
