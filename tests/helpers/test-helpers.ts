import { Page, expect } from '@playwright/test';

/**
 * Test helpers for OpenRelief E2E tests
 * 
 * This file contains common utilities and helper functions
 * to reduce code duplication across test files.
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateToPage(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for the PWA to be fully loaded
   */
  async waitForPWALoad() {
    // Wait for service worker to be registered
    await this.page.waitForFunction(() => {
      return navigator.serviceWorker && navigator.serviceWorker.ready;
    });
    
    // Wait for app to be fully loaded
    await this.page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  }

  /**
   * Login with test credentials
   */
  async login(email: string = 'test@example.com', password: string = 'testpassword') {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await this.page.waitForURL('**/dashboard');
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  /**
   * Logout the current user
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for logout to complete
    await this.page.waitForURL('**/');
  }

  /**
   * Mock geolocation for testing location-based features
   */
  async mockGeolocation(latitude: number, longitude: number) {
    await this.page.context().grantPermissions(['geolocation']);
    await this.page.setGeolocation({ latitude, longitude });
  }

  /**
   * Mock notifications for testing PWA notification features
   */
  async mockNotifications() {
    await this.page.context().grantPermissions(['notifications']);
  }

  /**
   * Go offline for testing offline functionality
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Go online for testing online functionality
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }

  /**
   * Wait for map to be loaded and ready
   */
  async waitForMapLoad() {
    await this.page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
    await this.page.waitForFunction(() => {
      // Check if map library has loaded
      return (window as any).maplibregl || (window as any).L;
    });
  }

  /**
   * Create an emergency report for testing
   */
  async createEmergencyReport(options: {
    type?: string;
    description?: string;
    location?: { lat: number; lng: number };
  } = {}) {
    const {
      type = 'medical',
      description = 'Test emergency report',
      location = { lat: 37.7749, lng: -122.4194 }
    } = options;

    // Navigate to emergency reporting page
    await this.navigateToPage('/emergency/report');
    
    // Fill out the form
    await this.page.selectOption('[data-testid="emergency-type"]', type);
    await this.page.fill('[data-testid="emergency-description"]', description);
    
    // Set location if provided
    if (location) {
      await this.mockGeolocation(location.lat, location.lng);
      await this.page.click('[data-testid="use-current-location"]');
    }
    
    // Submit the form
    await this.page.click('[data-testid="submit-report"]');
    
    // Wait for confirmation
    await expect(this.page.locator('[data-testid="report-confirmation"]')).toBeVisible();
  }

  /**
   * Check if the app is installed as a PWA
   */
  async isPWAInstalled() {
    return await this.page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (navigator as any).standalone === true;
    });
  }

  /**
   * Take a screenshot with a custom name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for and verify toast notification
   */
  async verifyToastNotification(message: string) {
    const toast = this.page.locator('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(message);
  }

  /**
   * Check network status
   */
  async getNetworkStatus() {
    return await this.page.evaluate(() => {
      return navigator.onLine;
    });
  }

  /**
   * Trigger service worker sync for testing offline sync
   */
  async triggerServiceWorkerSync() {
    await this.page.evaluate(() => {
      return navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('test-sync');
      });
    });
  }
}

/**
 * Custom expect matchers for OpenRelief tests
 */
export const customExpect = {
  /**
   * Expect map to be loaded and visible
   */
  async toHaveMapLoaded(page: Page) {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
    
    // Additional checks for map initialization
    await expect(page.locator('[data-testid="map-loaded"]')).toBeVisible();
  },

  /**
   * Expect emergency marker to be visible on map
   */
  async toHaveEmergencyMarker(page: Page, count: number = 1) {
    const markers = page.locator('[data-testid="emergency-marker"]');
    await expect(markers).toHaveCount(count);
  },

  /**
   * Expect PWA to be installable
   */
  async toBeInstallable(page: Page) {
    const installButton = page.locator('[data-testid="pwa-install-button"]');
    await expect(installButton).toBeVisible();
  }
};