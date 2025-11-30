import { test, expect } from '../fixtures/test-fixtures';

test.describe('PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up permissions for PWA features
    await page.context().grantPermissions(['notifications']);
  });

  test('should register service worker', async ({ page, helpers }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for service worker to register
    await helpers.waitForPWALoad();
    
    // Check that service worker is registered
    const isRegistered = await page.evaluate(() => {
      return navigator.serviceWorker && navigator.serviceWorker.ready;
    });
    
    expect(isRegistered).toBeTruthy();
  });

  test('should cache static assets for offline use', async ({ page, helpers }) => {
    // Load the app online
    await page.goto('/');
    await helpers.waitForPWALoad();
    
    // Go offline
    await helpers.goOffline();
    
    // Try to navigate to a cached page
    await page.goto('/');
    
    // Check that offline page is not shown (indicating cache hit)
    await expect(page.locator('[data-testid="offline-page"]')).not.toBeVisible();
    
    // Go back online
    await helpers.goOnline();
  });

  test('should show offline page when network is unavailable', async ({ page, helpers }) => {
    // Go offline before loading the app
    await helpers.goOffline();
    
    // Try to load the app
    await page.goto('/');
    
    // Check that offline page is shown
    await expect(page.locator('[data-testid="offline-page"]')).toBeVisible();
    
    // Check that offline emergency page is accessible
    await page.goto('/offline/emergency');
    await expect(page.locator('[data-testid="offline-emergency-page"]')).toBeVisible();
    
    // Go back online
    await helpers.goOnline();
  });

  test('should display install prompt for eligible users', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Simulate user interaction to meet install criteria
    await page.evaluate(() => {
      // Simulate multiple visits and user interaction
      localStorage.setItem('pwa-visit-count', '5');
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    
    // Check that install prompt is shown
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();
    
    // Test install button
    await page.click('[data-testid="pwa-install-button"]');
    
    // Check that install dialog is triggered (mocked)
    await expect(page.locator('[data-testid="pwa-install-dialog"]')).toBeVisible();
  });

  test('should work in standalone mode when installed', async ({ page }) => {
    // Simulate standalone mode
    await page.addStyleTag({
      content: `
        @media all {
          body {
            display: none;
          }
          body.standalone {
            display: block;
          }
        }
      `
    });
    
    await page.evaluate(() => {
      document.body.classList.add('standalone');
      // Mock display-mode media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });
    
    // Check that standalone-specific UI elements are visible
    await expect(page.locator('[data-testid="standalone-ui"]')).toBeVisible();
  });

  test('should handle push notifications', async ({ page, helpers }) => {
    // Grant notification permissions
    await helpers.mockNotifications();
    
    // Navigate to settings page
    await page.goto('/settings');
    
    // Enable push notifications
    await page.click('[data-testid="enable-notifications"]');
    
    // Check that notification permission is requested
    await expect(page.locator('[data-testid="notification-permission-dialog"]')).toBeVisible();
    
    // Grant permission
    await page.click('[data-testid="grant-permission"]');
    
    // Check that notifications are enabled
    await expect(page.locator('[data-testid="notification-status"]')).toContainText('Enabled');
    
    // Test notification trigger
    await page.evaluate(() => {
      // Simulate receiving a push notification
      new Notification('Test Notification', {
        body: 'This is a test notification from OpenRelief',
        icon: '/icons/icon-192x192.png',
      });
    });
  });

  test('should sync data when coming back online', async ({ page, helpers }) => {
    // Go offline
    await helpers.goOffline();
    
    // Navigate to emergency reporting
    await page.goto('/emergency/report');
    
    // Fill out emergency form (should be stored locally)
    await page.selectOption('[data-testid="emergency-type"]', 'medical');
    await page.fill('[data-testid="emergency-description"]', 'Test emergency report');
    await page.click('[data-testid="submit-report"]');
    
    // Check that offline confirmation is shown
    await expect(page.locator('[data-testid="offline-confirmation"]')).toBeVisible();
    
    // Go back online
    await helpers.goOnline();
    
    // Trigger sync
    await helpers.triggerServiceWorkerSync();
    
    // Check that sync confirmation is shown
    await expect(page.locator('[data-testid="sync-confirmation"]')).toBeVisible();
  });

  test('should display app status information', async ({ page }) => {
    // Navigate to PWA status page
    await page.goto('/pwa-status');
    
    // Check that status information is displayed
    await expect(page.locator('[data-testid="app-version"]')).toBeVisible();
    await expect(page.locator('[data-testid="cache-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-worker-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-status"]')).toBeVisible();
  });

  test('should handle background sync for critical data', async ({ page, helpers }) => {
    // Navigate to app
    await page.goto('/');
    
    // Create an emergency report
    await helpers.createEmergencyReport({
      type: 'fire',
      description: 'Test fire emergency',
      location: { lat: 37.7749, lng: -122.4194 }
    });
    
    // Go offline before submission completes
    await helpers.goOffline();
    
    // Try to submit another report
    await page.goto('/emergency/report');
    await helpers.createEmergencyReport({
      type: 'medical',
      description: 'Test medical emergency',
      location: { lat: 37.7849, lng: -122.4094 }
    });
    
    // Check that offline queue is updated
    await expect(page.locator('[data-testid="offline-queue-count"]')).toContainText('1');
    
    // Go back online
    await helpers.goOnline();
    
    // Trigger background sync
    await helpers.triggerServiceWorkerSync();
    
    // Check that queue is empty after sync
    await expect(page.locator('[data-testid="offline-queue-count"]')).toContainText('0');
  });
});