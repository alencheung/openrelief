import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for OpenRelief project
 * 
 * This configuration is optimized for:
 * - Next.js PWA application testing
 * - Emergency response features testing
 * - Map and location-based functionality testing
 * - Offline capability testing
 * - Performance testing
 * - CI/CD integration with GitHub Actions
 */
export default defineConfig({
  // Global test configuration
  testDir: './tests/e2e',
  testMatch: '**/*.spec.{ts,js}',
  testIgnore: '**/node_modules/**',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 4,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Test timeout
  timeout: 30 * 1000,
  expect: {
    // Timeout for expect() assertions
    timeout: 5 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Custom viewport for responsive testing
        viewport: { width: 1280, height: 720 },
        // Ignore HTTPS errors for local development
        ignoreHTTPSErrors: true,
        // Capture screenshot after each test failure
        screenshot: 'only-on-failure',
        // Record video on failure
        video: 'retain-on-failure',
        // Trace on first retry
        trace: 'on-first-retry',
      },
      testIgnore: '**/mobile.spec.{ts,js}',
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testIgnore: '**/mobile.spec.{ts,js}',
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testIgnore: '**/mobile.spec.{ts,js}',
    },

    // Mobile configurations
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testMatch: '**/mobile.spec.{ts,js}',
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testMatch: '**/mobile.spec.{ts,js}',
    },

    // Tablet configurations
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testMatch: '**/tablet.spec.{ts,js}',
    },

    // Dedicated project for PWA testing
    {
      name: 'pwa-testing',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        // Additional permissions for PWA testing
        permissions: ['geolocation', 'notifications'],
        // Emulate offline conditions for offline testing
        offline: false, // Will be controlled in tests
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testMatch: '**/pwa.spec.{ts,js}',
    },

    // Performance testing project
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
      testMatch: '**/performance.spec.{ts,js}',
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Environment variables for tests
  use: {
    // Base URL for tests - can be overridden by environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video only when retrying a test for the first time
    video: 'retain-on-failure',

    // Screenshot configuration
    screenshot: 'only-on-failure',

    // Global timeout for navigation and actions
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Metadata for test organization
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Test Suite': 'OpenRelief E2E Tests',
    'Application': 'OpenRelief Emergency Coordination Platform',
  },
});