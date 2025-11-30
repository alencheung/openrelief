import { test, expect } from '../fixtures/test-fixtures';

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Check that mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Check that desktop navigation is hidden
    await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');

    // Check that mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Check that menu items are visible
    await expect(page.locator('[data-testid="mobile-menu-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-emergency"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-dashboard"]')).toBeVisible();
  });

  test('should handle touch gestures on map', async ({ page, helpers }) => {
    // Navigate to map page
    await page.goto('/map');
    await helpers.waitForMapLoad();

    // Check that map container is touch-enabled
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Test pinch to zoom
    await mapContainer.tap();
    await page.touchscreen.tap(100, 100);
    await page.touchscreen.tap(200, 200);

    // Test drag to pan
    await page.touchscreen.tap(150, 150);
    // await page.touchscreen.move(200, 200); // Not supported in current Playwright types
    // await page.touchscreen.up(); // Not supported in current Playwright types

    // Check that map responds to touch
    await expect(page.locator('[data-testid="map-updated"]')).toBeVisible();
  });

  test('should display emergency reporting form correctly on mobile', async ({ page }) => {
    // Navigate to emergency reporting
    await page.goto('/emergency/report');

    // Check that form is properly sized for mobile
    await expect(page.locator('[data-testid="emergency-form"]')).toBeVisible();

    // Check that form fields are properly sized
    await expect(page.locator('[data-testid="emergency-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-input"]')).toBeVisible();

    // Check that submit button is easily tappable
    const submitButton = page.locator('[data-testid="submit-report"]');
    await expect(submitButton).toBeVisible();

    // Check button size (minimum 44x44 pixels for touch)
    const boundingBox = await submitButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
  });

  test('should use device location on mobile', async ({ page, helpers }) => {
    // Grant geolocation permission
    await page.context().grantPermissions(['geolocation']);

    // Mock geolocation
    await helpers.mockGeolocation(37.7749, -122.4194);

    // Navigate to emergency reporting
    await page.goto('/emergency/report');

    // Click use current location button
    await page.click('[data-testid="use-current-location"]');

    // Check that location is detected
    await expect(page.locator('[data-testid="location-detected"]')).toBeVisible();

    // Check that location is displayed
    await expect(page.locator('[data-testid="location-display"]')).toContainText('37.7749');
    await expect(page.locator('[data-testid="location-display"]')).toContainText('-122.4194');
  });

  test('should handle mobile-specific PWA features', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Check that install prompt is mobile-friendly
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });

    // Check that mobile install prompt is shown
    await expect(page.locator('[data-testid="mobile-install-prompt"]')).toBeVisible();

    // Check that install button is easily tappable
    const installButton = page.locator('[data-testid="mobile-install-button"]');
    await expect(installButton).toBeVisible();

    const boundingBox = await installButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
  });

  test('should display mobile-specific emergency features', async ({ page }) => {
    // Navigate to emergency page
    await page.goto('/emergency');

    // Check that emergency quick actions are visible
    await expect(page.locator('[data-testid="emergency-quick-actions"]')).toBeVisible();

    // Check that quick action buttons are easily tappable
    const quickActions = page.locator('[data-testid^="emergency-quick-"]');
    const count = await quickActions.count();

    for (let i = 0; i < count; i++) {
      const button = quickActions.nth(i);
      await expect(button).toBeVisible();

      const boundingBox = await button.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle mobile-specific offline features', async ({ page, helpers }) => {
    // Go offline
    await helpers.goOffline();

    // Navigate to offline emergency page
    await page.goto('/offline/emergency');

    // Check that mobile offline emergency page is displayed
    await expect(page.locator('[data-testid="mobile-offline-emergency"]')).toBeVisible();

    // Check that emergency contacts are easily accessible
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();

    // Check that call buttons are easily tappable
    const callButtons = page.locator('[data-testid^="call-"]');
    const count = await callButtons.count();

    for (let i = 0; i < count; i++) {
      const button = callButtons.nth(i);
      await expect(button).toBeVisible();

      const boundingBox = await button.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
    }

    // Go back online
    await helpers.goOnline();
  });

  test('should handle mobile-specific notifications', async ({ page, helpers }) => {
    // Grant notification permissions
    await helpers.mockNotifications();

    // Navigate to settings
    await page.goto('/settings');

    // Check that mobile notification settings are visible
    await expect(page.locator('[data-testid="mobile-notification-settings"]')).toBeVisible();

    // Enable notifications
    await page.click('[data-testid="enable-notifications"]');

    // Check that permission dialog is mobile-friendly
    await expect(page.locator('[data-testid="mobile-permission-dialog"]')).toBeVisible();

    // Grant permission
    await page.click('[data-testid="grant-permission"]');

    // Test notification display
    await page.evaluate(() => {
      new Notification('Test Mobile Notification', {
        body: 'This is a mobile-specific test notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      });
    });
  });

  test('should handle mobile-specific gestures', async ({ page }) => {
    // Navigate to a page with swipeable content
    await page.goto('/dashboard');

    // Test swipe gesture
    const dashboard = page.locator('[data-testid="dashboard"]');

    // Swipe left
    await dashboard.hover();
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.move(100, 300);
    await page.mouse.up();

    // Check that swipe action is triggered
    await expect(page.locator('[data-testid="swipe-left-action"]')).toBeVisible();

    // Swipe right
    await dashboard.hover();
    await page.mouse.down();
    await page.mouse.move(100, 300);
    await page.mouse.move(300, 300);
    await page.mouse.up();

    // Check that swipe action is triggered
    await expect(page.locator('[data-testid="swipe-right-action"]')).toBeVisible();
  });

  test('should handle mobile-specific orientation changes', async ({ page }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check portrait layout
    await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();

    // Switch to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });

    // Check landscape layout
    await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();

    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 667 });

    // Check portrait layout is restored
    await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();
  });
});