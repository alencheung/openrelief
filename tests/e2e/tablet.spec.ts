import { test, expect } from '../fixtures/test-fixtures';

test.describe('Tablet Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test('should display tablet navigation correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Check that tablet navigation is visible
    await expect(page.locator('[data-testid="tablet-navigation"]')).toBeVisible();
    
    // Check that mobile menu button is not visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible();
    
    // Check that desktop navigation is adapted for tablet
    await expect(page.locator('[data-testid="tablet-menu-items"]')).toBeVisible();
  });

  test('should display map with tablet-specific features', async ({ page, helpers }) => {
    // Navigate to map page
    await page.goto('/map');
    await helpers.waitForMapLoad();
    
    // Check that map container is properly sized for tablet
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
    
    // Check that tablet-specific map controls are visible
    await expect(page.locator('[data-testid="tablet-map-controls"]')).toBeVisible();
    
    // Check that map sidebar is visible on tablet
    await expect(page.locator('[data-testid="map-sidebar"]')).toBeVisible();
  });

  test('should display emergency reporting form correctly on tablet', async ({ page }) => {
    // Navigate to emergency reporting
    await page.goto('/emergency/report');
    
    // Check that form is properly sized for tablet
    await expect(page.locator('[data-testid="emergency-form"]')).toBeVisible();
    
    // Check that form layout is optimized for tablet
    await expect(page.locator('[data-testid="tablet-form-layout"]')).toBeVisible();
    
    // Check that form fields are properly sized
    await expect(page.locator('[data-testid="emergency-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-input"]')).toBeVisible();
    
    // Check that map preview is visible alongside form
    await expect(page.locator('[data-testid="location-map-preview"]')).toBeVisible();
  });

  test('should handle tablet-specific gestures', async ({ page }) => {
    // Navigate to a page with swipeable content
    await page.goto('/dashboard');
    
    // Test swipe gesture on tablet
    const dashboard = page.locator('[data-testid="dashboard"]');
    
    // Swipe left
    await dashboard.hover();
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.move(300, 400);
    await page.mouse.up();
    
    // Check that swipe action is triggered
    await expect(page.locator('[data-testid="swipe-left-action"]')).toBeVisible();
    
    // Test two-finger pinch to zoom
    await page.touchscreen.tap(400, 300);
    await page.touchscreen.tap(500, 300);
    
    // Check that zoom action is triggered
    await expect(page.locator('[data-testid="zoom-action"]')).toBeVisible();
  });

  test('should display tablet-specific emergency features', async ({ page }) => {
    // Navigate to emergency page
    await page.goto('/emergency');
    
    // Check that tablet emergency layout is visible
    await expect(page.locator('[data-testid="tablet-emergency-layout"]')).toBeVisible();
    
    // Check that emergency actions are displayed in a grid
    await expect(page.locator('[data-testid="emergency-actions-grid"]')).toBeVisible();
    
    // Check that emergency map is visible alongside actions
    await expect(page.locator('[data-testid="emergency-map-preview"]')).toBeVisible();
  });

  test('should handle tablet-specific PWA features', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Check that tablet install prompt is shown
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    
    // Check that tablet install prompt is visible
    await expect(page.locator('[data-testid="tablet-install-prompt"]')).toBeVisible();
    
    // Check that install button is properly sized for tablet
    const installButton = page.locator('[data-testid="tablet-install-button"]');
    await expect(installButton).toBeVisible();
    
    const boundingBox = await installButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
  });

  test('should handle tablet-specific offline features', async ({ page, helpers }) => {
    // Go offline
    await helpers.goOffline();
    
    // Navigate to offline emergency page
    await page.goto('/offline/emergency');
    
    // Check that tablet offline emergency page is displayed
    await expect(page.locator('[data-testid="tablet-offline-emergency"]')).toBeVisible();
    
    // Check that emergency contacts are displayed in a grid
    await expect(page.locator('[data-testid="emergency-contacts-grid"]')).toBeVisible();
    
    // Check that emergency procedures are visible
    await expect(page.locator('[data-testid="emergency-procedures"]')).toBeVisible();
    
    // Go back online
    await helpers.goOnline();
  });

  test('should handle tablet-specific notifications', async ({ page, helpers }) => {
    // Grant notification permissions
    await helpers.mockNotifications();
    
    // Navigate to settings
    await page.goto('/settings');
    
    // Check that tablet notification settings are visible
    await expect(page.locator('[data-testid="tablet-notification-settings"]')).toBeVisible();
    
    // Enable notifications
    await page.click('[data-testid="enable-notifications"]');
    
    // Check that permission dialog is tablet-friendly
    await expect(page.locator('[data-testid="tablet-permission-dialog"]')).toBeVisible();
    
    // Grant permission
    await page.click('[data-testid="grant-permission"]');
    
    // Test notification display
    await page.evaluate(() => {
      new Notification('Test Tablet Notification', {
        body: 'This is a tablet-specific test notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      });
    });
  });

  test('should handle tablet-specific orientation changes', async ({ page }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check portrait layout
    await expect(page.locator('[data-testid="tablet-portrait-layout"]')).toBeVisible();
    
    // Switch to landscape mode
    await page.setViewportSize({ width: 1024, height: 768 });
    
    // Check landscape layout
    await expect(page.locator('[data-testid="tablet-landscape-layout"]')).toBeVisible();
    
    // Check that navigation adapts to landscape
    await expect(page.locator('[data-testid="tablet-landscape-navigation"]')).toBeVisible();
    
    // Switch back to portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check portrait layout is restored
    await expect(page.locator('[data-testid="tablet-portrait-layout"]')).toBeVisible();
  });

  test('should display tablet-specific dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check that tablet dashboard layout is visible
    await expect(page.locator('[data-testid="tablet-dashboard-layout"]')).toBeVisible();
    
    // Check that dashboard widgets are displayed in a grid
    await expect(page.locator('[data-testid="dashboard-widgets-grid"]')).toBeVisible();
    
    // Check that map widget is visible alongside other widgets
    await expect(page.locator('[data-testid="dashboard-map-widget"]')).toBeVisible();
    
    // Check that emergency feed widget is visible
    await expect(page.locator('[data-testid="dashboard-feed-widget"]')).toBeVisible();
  });

  test('should handle tablet-specific split view', async ({ page }) => {
    // Navigate to a page that supports split view
    await page.goto('/emergency');
    
    // Check that split view is available on tablet
    await expect(page.locator('[data-testid="tablet-split-view"]')).toBeVisible();
    
    // Check that left panel is visible
    await expect(page.locator('[data-testid="split-view-left-panel"]')).toBeVisible();
    
    // Check that right panel is visible
    await expect(page.locator('[data-testid="split-view-right-panel"]')).toBeVisible();
    
    // Test split view resizing
    const resizeHandle = page.locator('[data-testid="split-view-resize-handle"]');
    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    
    // Check that panels have been resized
    await expect(page.locator('[data-testid="split-view-resized"]')).toBeVisible();
  });
});