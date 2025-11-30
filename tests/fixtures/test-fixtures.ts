import { test as base, Page } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

/**
 * Custom test fixtures for OpenRelief tests
 * 
 * This file extends the default Playwright test fixtures
 * with our custom helpers and utilities.
 */

// Define custom types for our test fixtures
type TestFixtures = {
  helpers: TestHelpers;
};

// Extend the base test with our custom fixtures
export const test = base.extend<TestFixtures>({
  // Create a new page fixture with our helpers
  helpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';

// Re-export test types
export type { TestFixtures };