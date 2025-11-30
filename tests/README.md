# OpenRelief Playwright Tests

This directory contains the end-to-end (E2E) tests for the OpenRelief emergency coordination platform using Playwright.

## Test Structure

```
tests/
├── e2e/                    # E2E test files
│   ├── app.spec.ts         # General application tests
│   ├── mobile.spec.ts       # Mobile-specific tests
│   ├── tablet.spec.ts       # Tablet-specific tests
│   ├── pwa.spec.ts          # PWA-specific tests
│   └── performance.spec.ts  # Performance tests
├── fixtures/               # Test fixtures
│   └── test-fixtures.ts    # Custom Playwright fixtures
├── helpers/                # Test helpers
│   └── test-helpers.ts     # Common test utilities
├── global-setup.ts         # Global test setup
├── global-teardown.ts      # Global test teardown
└── README.md              # This file
```

## Test Categories

### General Application Tests (`app.spec.ts`)
- Homepage loading
- Navigation functionality
- Authentication flow
- Responsive design

### PWA Tests (`pwa.spec.ts`)
- Service worker registration
- Offline functionality
- Install prompts
- Push notifications
- Background sync

### Mobile Tests (`mobile.spec.ts`)
- Mobile navigation
- Touch gestures
- Geolocation
- Mobile-specific PWA features
- Mobile notifications

### Tablet Tests (`tablet.spec.ts`)
- Tablet navigation
- Tablet-specific layouts
- Split view functionality
- Tablet gestures

### Performance Tests (`performance.spec.ts`)
- Load time measurements
- Core Web Vitals
- Map rendering performance
- Real-time updates performance

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Running All Tests

```bash
npm run test:performance
```

### Running Specific Test Files

```bash
# Run only PWA tests
npx playwright test --config=playwright.config.ts tests/e2e/pwa.spec.ts

# Run only mobile tests
npx playwright test --config=playwright.config.ts tests/e2e/mobile.spec.ts

# Run only performance tests
npx playwright test --config=playwright.config.ts tests/e2e/performance.spec.ts
```

### Running Tests on Specific Browsers

```bash
# Run only on Chromium
npx playwright test --config=playwright.config.ts --project=chromium

# Run only on Firefox
npx playwright test --config=playwright.config.ts --project=firefox

# Run only on WebKit
npx playwright test --config=playwright.config.ts --project=webkit
```

### Running Tests in Debug Mode

```bash
# Run with UI mode for debugging
npx playwright test --config=playwright.config.ts --ui

# Run with trace viewer for debugging
npx playwright test --config=playwright.config.ts --trace on
```

### Viewing Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## Configuration

The Playwright configuration is defined in `playwright.config.ts` and includes:

- Multiple browser configurations (Chromium, Firefox, WebKit)
- Mobile and tablet device configurations
- PWA-specific test configuration
- Performance testing configuration
- CI/CD integration settings

## Test Helpers

The `test-helpers.ts` file provides common utilities for tests:

- Navigation helpers
- Authentication helpers
- Geolocation mocking
- PWA-specific helpers
- Screenshot utilities

## Fixtures

Custom fixtures in `test-fixtures.ts` extend Playwright's default fixtures:

- `helpers`: Access to test helper utilities

## Writing New Tests

When writing new tests:

1. Use the custom test fixture instead of the default Playwright test:
   ```typescript
   import { test, expect } from '../fixtures/test-fixtures';
   ```

2. Use the helpers for common operations:
   ```typescript
   test('my test', async ({ page, helpers }) => {
     await helpers.navigateToPage('/my-page');
     // ... test code
   });
   ```

3. Follow the naming convention:
   - Test files: `*.spec.ts`
   - Use descriptive test names
   - Group related tests with `test.describe()`

4. Add appropriate test IDs to your components:
   ```html
   <button data-testid="submit-button">Submit</button>
   ```

## CI/CD Integration

The tests are integrated into the GitHub Actions workflow (`.github/workflows/ci.yml`):

- Tests run on every push and pull request
- Results are uploaded as artifacts
- Test failures block deployment

## Environment Variables

The tests can be configured with the following environment variables:

- `BASE_URL`: Base URL for the application (default: http://localhost:3000)
- `CI`: Set to true when running in CI (automatically set by GitHub Actions)

## Debugging Tips

1. Use the Playwright Inspector for debugging:
   ```bash
   PWDEBUG=1 npx playwright test
   ```

2. Take screenshots for debugging:
   ```typescript
   await page.screenshot({ path: 'debug.png', fullPage: true });
   ```

3. Use the trace viewer for detailed debugging:
   ```bash
   npx playwright show-trace trace.zip
   ```

## Best Practices

1. Keep tests focused and independent
2. Use data-testid attributes for test selectors
3. Wait for elements to be visible before interacting
4. Use helpers for common operations
5. Add proper assertions
6. Test both positive and negative scenarios
7. Include accessibility testing where relevant
8. Test error handling and edge cases

## Troubleshooting

### Tests Fail with "Target Closed"
- Check if the application is running on the expected port
- Verify the webServer configuration in playwright.config.ts

### Tests Fail with Timeout
- Increase timeout values in the configuration
- Check if the application is taking longer to load than expected

### Tests Fail on CI but Pass Locally
- Check if all dependencies are installed in CI
- Verify that the application builds correctly
- Check if environment variables are properly set

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Testing Best Practices](https://playwright.dev/docs/best-practices)
- [OpenRelief Documentation](../../docs/)