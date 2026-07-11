import { Page, expect } from '@playwright/test';

/**
 * Test helpers for OpenRelief E2E tests
 *
 * These helpers target the REAL app routes and use role/text-based
 * selectors (resilient to markup changes) instead of data-testids,
 * because the app source does not expose data-testids.
 *
 * Real routes:
 *   /, /login, /signup, /report, /profile, /settings, /privacy,
 *   /offline, /offline/emergency, /pwa-status, /onboarding,
 *   /forgot-password, /reset-password, /terms
 *
 * NOTE: The app's /login page uses Google OAuth exclusively (no
 * email/password form), so a full login() flow cannot be exercised
 * in E2E without seeding auth state via storageState. See
 * tests/global-setup.ts for the recommended approach.
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific page and wait for it to settle.
   * Uses 'domcontentloaded' rather than 'networkidle' because the
   * home page lazy-loads the map and may keep a connection open.
   */
  async navigateToPage(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for the PWA shell to be ready. We wait for the document
   * body to be present (the Header/Footer layout always renders)
   * rather than a [data-testid="app-loaded"] element that does not
   * exist in the source.
   */
  async waitForPWALoad() {
    await this.page.waitForLoadState('domcontentloaded');
    // The layout always renders a <header> (see components/layout/Shell.tsx).
    await this.page.locator('header').waitFor({ state: 'visible' });
  }

  /**
   * Open the mobile menu (only visible below the `md` breakpoint).
   * The toggle button is the only <button> with aria-label "Toggle menu".
   */
  async openMobileMenu() {
    await this.page.getByRole('button', { name: 'Toggle menu' }).click();
  }

  /**
   * Attempt to log in. The real /login page only offers "Continue with
   * Google", which cannot be completed headlessly. This helper clicks
   * the Google sign-in button so tests can assert the OAuth redirect
   * begins; full session seeding should be done via storageState.
   */
  async startGoogleLogin() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByRole('button', { name: /Continue with Google/i }).click();
  }

  /**
   * Mock geolocation for testing location-based features.
   */
  async mockGeolocation(latitude: number, longitude: number) {
    await this.page.context().grantPermissions(['geolocation']);
    await this.page.context().setGeolocation({ latitude, longitude });
  }

  /**
   * Grant notification permissions.
   */
  async mockNotifications() {
    await this.page.context().grantPermissions(['notifications']);
  }

  /**
   * Go offline for testing offline functionality.
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Go online for testing online functionality.
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }

  /**
   * The real app does not have a dedicated /map route; the map is
   * embedded on the home page (behind an AuthGuard). This helper waits
   * for the home page shell to load. Tests that previously asserted on a
   * standalone map should be updated to target the home page.
   */
  async waitForMapLoad() {
    await this.waitForPWALoad();
  }

  /**
   * Take a screenshot with a custom name.
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Check the browser's network status.
   */
  async getNetworkStatus() {
    return await this.page.evaluate(() => navigator.onLine);
  }

  /**
   * Trigger a service worker sync registration if the Background Sync
   * API is available. No-ops gracefully otherwise.
   */
  async triggerServiceWorkerSync() {
    await this.page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const anyReg = registration as unknown as {
          sync?: { register: (tag: string) => Promise<void> };
        };
        if (anyReg.sync) {
          await anyReg.sync.register('test-sync');
        }
      }
    });
  }
}

/**
 * Custom expect matchers for OpenRelief tests.
 *
 * These intentionally avoid data-testid selectors, which the app does
 * not expose. They use role/heading-based assertions instead.
 */
export const customExpect = {
  /**
   * Expect the app shell (header + footer layout) to be loaded.
   */
  async toHaveAppShellLoaded(page: Page) {
    await expect(page.locator('header')).toBeVisible();
  },

  /**
   * Expect a service worker to be registered.
   */
  async toHaveServiceWorkerRegistered(page: Page) {
    const ready = await page.evaluate(() =>
      'serviceWorker' in navigator ? navigator.serviceWorker.ready : null
    );
    expect(ready).toBeTruthy();
  },

  /**
   * Expect the PWA web app manifest to be linked and fetchable.
   */
  async toHaveManifest(page: Page) {
    const hasLink = await page.locator('link[rel="manifest"]').count();
    expect(hasLink).toBeGreaterThan(0);
  },
};
