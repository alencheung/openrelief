import { test, expect } from '../fixtures/test-fixtures';

test.describe('OpenRelief Application', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common test state
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // Check that the homepage loads correctly
    await expect(page).toHaveTitle(/OpenRelief/);
    await expect(page.locator('h1')).toContainText('OpenRelief');
  });

  test('should display navigation menu', async ({ page }) => {
    // Check that navigation elements are present
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-emergency"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
  });

  test('should navigate to emergency reporting page', async ({ page, helpers }) => {
    // Navigate to emergency reporting
    await page.click('[data-testid="nav-emergency"]');
    await expect(page).toHaveURL(/.*emergency/);
    
    // Check that emergency reporting form is visible
    await expect(page.locator('[data-testid="emergency-form"]')).toBeVisible();
  });

  test('should display map component', async ({ page, helpers }) => {
    // Navigate to a page with a map
    await page.goto('/map');
    
    // Wait for map to load
    await helpers.waitForMapLoad();
    
    // Check that map container is visible
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('should allow user to login', async ({ page, helpers }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill out login form
    await helpers.login();
    
    // Check that user is logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should allow user to logout', async ({ page, helpers }) => {
    // Login first
    await helpers.login();
    
    // Logout
    await helpers.logout();
    
    // Check that user is logged out
    await expect(page).toHaveURL('/');
  });
});

test.describe('PWA Features', () => {
  test('should show install prompt when criteria are met', async ({ page }) => {
    // Mock user interaction to trigger install prompt
    await page.evaluate(() => {
      // Simulate user interaction to meet PWA install criteria
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    
    // Check that install prompt is shown
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();
  });

  test('should work offline', async ({ page, helpers }) => {
    // First, load the page online
    await page.goto('/offline');
    
    // Go offline
    await helpers.goOffline();
    
    // Navigate to offline page
    await page.reload();
    
    // Check that offline page is displayed
    await expect(page.locator('[data-testid="offline-page"]')).toBeVisible();
    
    // Go back online
    await helpers.goOnline();
  });

  test('should display network status', async ({ page }) => {
    // Check initial network status
    const isOnline = await page.evaluate(() => navigator.onLine);
    
    if (isOnline) {
      await expect(page.locator('[data-testid="network-status-online"]')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="network-status-offline"]')).toBeVisible();
    }
    
    // Toggle network status
    await page.context().setOffline(true);
    await expect(page.locator('[data-testid="network-status-offline"]')).toBeVisible();
    
    await page.context().setOffline(false);
    await expect(page.locator('[data-testid="network-status-online"]')).toBeVisible();
  });
});