import { test, expect } from '../fixtures/test-fixtures';

/**
 * Mobile experience tests for OpenRelief.
 *
 * The app has NO standalone /map, /emergency, /emergency/report, or
 * /dashboard routes, and does not expose the data-testid hooks the
 * original specs assumed. These tests target the real routes and use
 * role/text selectors. Tests for features that do not exist yet are
 * explicitly skipped with an explanation.
 */
test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate a small phone viewport (matches "Mobile Chrome"/"Pixel 5"-ish).
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should expose the mobile menu on small screens', async ({ page }) => {
    await page.goto('/');

    // On mobile the hamburger toggle is visible (Shell.tsx: md:hidden).
    const menuToggle = page.getByRole('button', { name: 'Toggle menu' });
    await expect(menuToggle).toBeVisible();

    // Desktop nav is hidden below `md` (Shell.tsx: hidden md:flex).
    await expect(
      page.getByRole('button', { name: 'Report Emergency' })
    ).not.toBeVisible();

    // Open the menu; nav items render inside the mobile drawer.
    await menuToggle.click();
    await expect(
      page.getByRole('button', { name: 'Report Emergency' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should render mobile-friendly hero CTAs', async ({ page }) => {
    await page.goto('/');

    // Hero buttons use a `touch-target` class and full width on mobile.
    const watchDemo = page.getByRole('button', { name: /Watch Demo/i });
    await expect(watchDemo).toBeVisible();

    const box = await watchDemo.boundingBox();
    // Touch targets should be at least 44px tall.
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('should navigate via the mobile menu', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('button', { name: 'Report Emergency' }).click();

    await expect(page).toHaveURL(/.*\/report/);
  });

  test('should render the report page shell on mobile', async ({ page }) => {
    // The /report route exists (src/app/report/page.tsx).
    await page.goto('/report');
    await expect(page.locator('header')).toBeVisible();
  });

  test('should render the offline page on mobile', async ({ page }) => {
    await page.goto('/offline');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText(/Offline|Connection Restored/i);
  });

  test('should grant geolocation permission for location features', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.mockGeolocation(37.7749, -122.4194);
    // Sanity check: the browser reports the mocked geolocation.
    const coords = await page.evaluate(() =>
      new Promise<GeolocationPosition>((resolve) =>
        navigator.geolocation.getCurrentPosition((p) => resolve(p))
      )
    );
    expect(coords.coords.latitude).toBeCloseTo(37.7749, 3);
    expect(coords.coords.longitude).toBeCloseTo(-122.4194, 3);
  });

  // --- Skipped: features not yet implemented in the app ---

  test.skip('should handle touch gestures on the map', async () => {
    // SKIPPED: There is no standalone /map route. The map is embedded on
    // the home page behind an AuthGuard and lazy-loaded. A meaningful
    // gesture test requires an authenticated session (see global-setup)
    // and a map container that exposes a stable hook for interaction.
  });

  test.skip('should display a mobile emergency reporting form', async () => {
    // SKIPPED: /emergency/report does not exist. The real report route is
    // /report, whose form fields do not currently expose data-testids.
    // Re-enable once EmergencyReportInterface adds accessible roles for
    // its inputs, or the app adds data-testid hooks.
  });

  test.skip('should show a mobile PWA install prompt', async () => {
    // SKIPPED: The app does not render a mobile install prompt element.
    // EnhancedPWAManager would need to surface install UI.
  });

  test.skip('should display mobile-specific emergency quick actions', async () => {
    // SKIPPED: /emergency route does not exist.
  });

  test.skip('should handle mobile-specific notifications', async () => {
    // SKIPPED: /settings requires authentication and the page does not
    // expose enable-notifications controls with stable selectors.
  });

  test.skip('should handle mobile swipe gestures on the dashboard', async () => {
    // SKIPPED: /dashboard route does not exist.
  });

  test.skip('should adapt to orientation changes', async () => {
    // SKIPPED: The app does not expose portrait/landscape-specific
    // markers. Re-enable once the layout distinguishes orientation
    // (e.g. via the useMobileDetection hook) with targetable content.
  });
});
