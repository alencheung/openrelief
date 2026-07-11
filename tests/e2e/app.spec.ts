import { test, expect } from '../fixtures/test-fixtures';

/**
 * Core application smoke tests for OpenRelief.
 *
 * These target the REAL routes (see src/app/page.tsx and the App Router
 * directory layout). The app does NOT expose data-testid attributes, so
 * assertions use role/heading/link/text locators which are more
 * resilient to markup changes.
 *
 * Real routes: /, /login, /signup, /report, /profile, /settings,
 * /privacy, /offline, /offline/emergency, /pwa-status, /onboarding,
 * /forgot-password, /reset-password, /terms
 */
test.describe('OpenRelief Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // The root layout sets the document title via metadata.
    await expect(page).toHaveTitle(/OpenRelief/);

    // The Hero section renders an h1 with this heading text.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Emergency Coordination');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Made Simple');
  });

  test('should render the app shell (header + footer)', async ({ page }) => {
    // Header brand label (components/layout/Shell.tsx).
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('OpenRelief', { exact: true }).first()).toBeVisible();

    // Footer is always present in the layout.
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should expose primary navigation in the header', async ({ page }) => {
    // Desktop nav buttons: Map, Report Emergency, Privacy (Shell.tsx navItems).
    await expect(page.getByRole('button', { name: /^Map$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Report Emergency' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();

    // Sign In CTA is visible when unauthenticated.
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should navigate to the emergency reporting page', async ({ page }) => {
    // Use the real header nav button.
    await page.getByRole('button', { name: 'Report Emergency' }).click();

    // The /report route renders ReportPageClient.
    await expect(page).toHaveURL(/.*\/report/);

    // Report page title is set via metadata; the client wrapper renders
    // the EmergencyReportInterface wizard. Just assert we landed on the
    // route and the shell is still present.
    await expect(page.locator('header')).toBeVisible();
  });

  test('should navigate to the privacy page', async ({ page }) => {
    await page.getByRole('button', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/.*\/privacy/);
  });

  test('should navigate to the login page from the header', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*\/login/);
    await expect(
      page.getByRole('heading', { name: /Sign in to OpenRelief/i })
    ).toBeVisible();
  });

  test('should show marketing CTAs on the homepage', async ({ page }) => {
    // Hero buttons (components/sections/Hero.tsx).
    await expect(page.getByRole('button', { name: /Watch Demo/i })).toBeVisible();

    // "Get Started" links to /signup; "Learn More" anchors to #features.
    await expect(page.getByRole('link', { name: /Learn More/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
  });

  test('should render the features section', async ({ page }) => {
    // Features.tsx renders an element with id="features" plus this heading.
    await expect(page.locator('#features')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Everything You Need for Emergency Response/i })
    ).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('should adapt navigation across viewport sizes', async ({ page }) => {
    // Mobile: the hamburger toggle is visible, desktop nav is not.
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const menuToggle = page.getByRole('button', { name: 'Toggle menu' });
    await expect(menuToggle).toBeVisible();

    // Desktop nav buttons are hidden on mobile (Shell.tsx uses hidden md:flex).
    const reportBtn = page.getByRole('button', { name: 'Report Emergency' });
    await expect(reportBtn).not.toBeVisible();

    // Opening the mobile menu reveals the nav items.
    await menuToggle.click();
    // After toggling, a second "Report Emergency" button appears in the menu.
    await expect(page.getByRole('button', { name: 'Report Emergency' })).toBeVisible();

    // Tablet: at 768px (md) the desktop nav shows and the toggle hides.
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('button', { name: 'Report Emergency' })).toBeVisible();
    await expect(menuToggle).not.toBeVisible();

    // Desktop.
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole('button', { name: 'Report Emergency' })).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should render the Google sign-in page', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: /Sign in to OpenRelief/i })
    ).toBeVisible();
    // The only auth method is Google OAuth.
    await expect(
      page.getByRole('button', { name: /Continue with Google/i })
    ).toBeVisible();

    // Footer links to terms/privacy/signup exist.
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
  });

  test.skip('full login + logout flow', async () => {
    // SKIPPED: The /login page only offers Google OAuth, which cannot be
    // completed headlessly. To exercise a real session, seed
    // storageState with a valid Supabase session in tests/global-setup.ts
    // and reuse it via the project's storageState option.
  });
});

test.describe('PWA Features', () => {
  test('should link the web app manifest', async ({ page }) => {
    await page.goto('/');
    // The layout metadata sets manifest: '/manifest.json'.
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test.skip('should show a PWA install prompt', async () => {
    // SKIPPED: The app does not currently render a
    // [data-testid="pwa-install-prompt"] element. The EnhancedPWAManager
    // component would need to expose an install-prompt UI for this test
    // to target (e.g. a getByRole('button', { name: /Install/i })).
  });

  test('should render the offline fallback page', async ({ page }) => {
    await page.goto('/offline');

    // OfflineFallback renders an h1 that toggles based on network state.
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText(/Offline|Connection Restored/i);

    // The offline page offers emergency actions.
    await expect(
      page.getByRole('heading', { name: /Emergency Actions Available Offline/i })
    ).toBeVisible();
  });

  test('should reflect browser network status via the offline page', async ({ page, helpers }) => {
    await page.goto('/offline');
    const heading = page.getByRole('heading', { level: 1 });

    // While online the page reports "Connection Restored".
    await helpers.goOnline();
    await page.reload();
    await expect(heading).toContainText(/Connection Restored/i);

    // Going offline flips the messaging.
    await helpers.goOffline();
    await page.reload();
    await expect(heading).toContainText(/You're Offline/i);

    await helpers.goOnline();
  });
});
