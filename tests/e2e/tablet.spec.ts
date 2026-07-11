import { test, expect } from '../fixtures/test-fixtures';

/**
 * Tablet experience tests for OpenRelief.
 *
 * Targets real routes (no /map, /emergency, /dashboard, /emergency/report).
 * Uses role/text selectors. Tests for features not yet present in the app
 * are explicitly skipped with an explanation.
 */
test.describe('Tablet Experience', () => {
  test.beforeEach(async ({ page }) => {
    // iPad Pro-class portrait width is 1024px; use 768 to land on the
    // `md` breakpoint where the desktop nav is visible.
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test('should show desktop navigation at tablet width', async ({ page }) => {
    await page.goto('/');

    // At md+ the desktop nav renders (Shell.tsx: hidden md:flex).
    await expect(
      page.getByRole('button', { name: 'Report Emergency' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Privacy' })).toBeVisible();

    // The mobile hamburger is hidden at md+ (Shell.tsx: md:hidden).
    await expect(
      page.getByRole('button', { name: 'Toggle menu' })
    ).not.toBeVisible();
  });

  test('should render the homepage hero and features on tablet', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1 })
    ).toContainText('Emergency Coordination');

    await expect(page.locator('#features')).toBeVisible();
  });

  test('should navigate to the report page on tablet', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Report Emergency' }).click();
    await expect(page).toHaveURL(/.*\/report/);
    await expect(page.locator('header')).toBeVisible();
  });

  test('should render the PWA status page on tablet', async ({ page }) => {
    await page.goto('/pwa-status');

    // PWAStatus component renders an h1 "PWA Status".
    await expect(
      page.getByRole('heading', { name: 'PWA Status' })
    ).toBeVisible();

    // It exposes Network/Storage/Cache/Performance sections.
    await expect(
      page.getByRole('heading', { name: 'Network Status' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Storage Status' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cache Status' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Performance' })
    ).toBeVisible();
  });

  test('should render the offline emergency page on tablet', async ({ page }) => {
    await page.goto('/offline/emergency');
    await expect(page.locator('header')).toBeVisible();
  });

  test('should adapt header layout between portrait and landscape', async ({ page }) => {
    // Both orientations stay at/above the md breakpoint (768/1024),
    // so the desktop nav should remain visible throughout.
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Report Emergency' })
    ).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(
      page.getByRole('button', { name: 'Report Emergency' })
    ).toBeVisible();
  });

  // --- Skipped: features not yet implemented in the app ---

  test.skip('should display tablet-specific map controls', async () => {
    // SKIPPED: No standalone /map route exists.
  });

  test.skip('should display a tablet-optimized emergency reporting form', async () => {
    // SKIPPED: /emergency/report does not exist; form fields lack stable
    // accessible selectors.
  });

  test.skip('should handle tablet-specific gestures', async () => {
    // SKIPPED: /dashboard route does not exist.
  });

  test.skip('should display tablet-specific emergency features', async () => {
    // SKIPPED: /emergency route does not exist.
  });

  test.skip('should show a tablet PWA install prompt', async () => {
    // SKIPPED: The app does not render an install prompt element.
  });

  test.skip('should handle tablet-specific notifications', async () => {
    // SKIPPED: /settings requires authentication and lacks stable
    // notification-control selectors.
  });

  test.skip('should display a tablet-specific dashboard', async () => {
    // SKIPPED: /dashboard route does not exist.
  });

  test.skip('should handle tablet split view', async () => {
    // SKIPPED: No split-view UI exists in the app.
  });
});
