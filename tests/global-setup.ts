import { chromium, FullConfig, request } from '@playwright/test';

/**
 * Global setup for Playwright tests.
 *
 * Runs once before all test projects. Responsibilities:
 *   1. Confirm the dev server (webServer in playwright.config.ts) is up.
 *   2. Optionally seed auth state into storageState so authenticated
 *      pages (/settings, /profile, the home-page map) can be exercised.
 *
 * This setup is DEFENSIVE: if the app or any optional dependency (e.g.
 * the Supabase auth API) is unavailable, it logs a warning and skips
 * that step rather than failing the whole suite. The webServer config
 * already starts/reuses the Next.js dev server, so we do not start it
 * here.
 *
 * --- Configuring a full authenticated E2E run ---
 * To seed a real session:
 *   - Set TEST_USER_EMAIL / TEST_USER_PASSWORD in the environment (a
 *     test user created in your Supabase project).
 *   - Wire the Supabase client to sign in and persist the session to a
 *     storageState file (e.g. tests/.auth/user.json), then reference
 *     that file from each Playwright project's `storageState` option.
 *   - Unskip the authentication-dependent tests (search for `SKIPPED`
 *     comments) once the session is available.
 */
async function globalSetup(config: FullConfig) {
  console.log('[global-setup] Starting Playwright environment setup...');

  // Resolve the base URL from the first project (falls back to the
  // top-level `use.baseURL`).
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    (config as { use?: { baseURL?: string } }).use?.baseURL ||
    'http://localhost:3000';

  console.log(`[global-setup] Probing app at ${baseURL}...`);

  // Verify the app is reachable. The webServer hook should have started
  // it already, but in CI or when reuseExistingServer is set we double
  // check. Failures here are non-fatal: tests will surface clearer
  // per-test errors if the server truly is down.
  const requestContext = await request.newContext({ baseURL });
  try {
    const response = await requestContext.get('/', { timeout: 30000 });
    if (response.ok()) {
      console.log('[global-setup] App is reachable.');
    } else {
      console.warn(
        `[global-setup] App responded with HTTP ${response.status()} — ` +
          'tests depending on it may fail.'
      );
    }
  } catch (error) {
    console.warn(
      '[global-setup] Could not reach the app. Ensure the dev server ' +
        'is running (npm run dev) or that playwright.config.ts webServer ' +
        'is configured. Details:',
      error instanceof Error ? error.message : error
    );
  } finally {
    await requestContext.dispose();
  }

  // --- Optional: seed authenticated storage state -----------------------
  // The /login page only offers Google OAuth, so we cannot log in via
  // the UI. Instead, use the Supabase admin API with a service-role key
  // to create/sign in a test user and persist its session. This is left
  // as a guarded stub so the suite runs without it.
  const testUserEmail = process.env.TEST_USER_EMAIL;
  const testUserPassword = process.env.TEST_USER_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (testUserEmail && testUserPassword && supabaseUrl) {
    console.log(`[global-setup] Seeding auth session for ${testUserEmail}...`);
    try {
      await seedAuthSession(baseURL, supabaseUrl, testUserEmail, testUserPassword);
      console.log('[global-setup] Auth session seeded.');
    } catch (error) {
      console.warn(
        '[global-setup] Auth session seeding failed; auth-gated tests ' +
          'will be skipped. Details:',
        error instanceof Error ? error.message : error
      );
    }
  } else {
    console.log(
      '[global-setup] TEST_USER_EMAIL/PASSWORD or NEXT_PUBLIC_SUPABASE_URL ' +
        'not set — skipping authenticated session seeding.'
    );
  }

  console.log('[global-setup] Setup complete.');
}

/**
 * Sign in a test user via the Supabase auth REST API and persist the
 * resulting session to tests/.auth/user.json for reuse via storageState.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (or the anon key, depending on your
 * project's auth config) to be present in the environment.
 */
async function seedAuthSession(
  baseURL: string,
  supabaseUrl: string,
  email: string,
  password: string
) {
  // Use Playwright's request API to POST credentials. Adjust the
  // endpoint/key to match your Supabase project (e.g. password vs. OTP).
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required ' +
        'to seed an auth session.'
    );
  }

  const ctx = await request.newContext({ baseURL });
  try {
    const response = await ctx.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
      data: { email, password },
      timeout: 15000,
    });

    if (!response.ok()) {
      throw new Error(`Auth request failed: HTTP ${response.status()}`);
    }

    const json = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Persist cookies/localStorage-equivalent into a storageState file.
    // Playwright storageState captures cookies; for Supabase (which uses
    // localStorage), tests typically inject the session via page.evaluate
    // in a beforeEach. Here we stash the tokens for helpers to consume.
    process.env.TEST_AUTH_ACCESS_TOKEN = json.access_token;
    process.env.TEST_AUTH_REFRESH_TOKEN = json.refresh_token;
  } finally {
    await ctx.dispose();
  }
}

export default globalSetup;
