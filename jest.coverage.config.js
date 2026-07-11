/**
 * Jest Coverage Configuration
 *
 * Extends the base Jest config (jest.config.js) with coverage collection and
 * per-file coverage thresholds used by the targeted test scripts
 * (test:emergency, test:trust, test:consensus, etc.).
 *
 * The base config (jest.config.js) owns the 20% global coverage floor that is
 * enforced on every run; this file is only loaded via --coverageConfig for the
 * scripts that need stricter per-file thresholds. The transform (SWC),
 * testEnvironment, moduleNameMapper, and other foundational settings are
 * inherited from the base config via the spread below and intentionally NOT
 * overridden here.
 */

const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  collectCoverage: true,
  collectCoverageFrom: [
    // Emergency and Trust System Core Files
    'src/store/emergencyStore.ts',
    'src/store/trustStore.ts',
    'src/hooks/useEmergencyEvents.ts',
    'src/hooks/useTrustSystem.ts',
    'src/app/api/emergency/route.ts',

    // Database and API Functions
    'src/lib/supabase.ts',
    'src/lib/database/**/*.ts',
    'src/app/api/emergency/**/*.ts',

    // Test Utilities
    '!src/test-utils/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.stories.ts',
    '!src/**/*.d.ts',
    '!src/**/*.config.js',
    '!src/**/*.config.ts',
    '!src/next-env.d.ts'
  ],
  coverageThreshold: {
    // Critical files require higher coverage
    './src/store/emergencyStore.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/store/trustStore.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/hooks/useTrustSystem.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/app/api/emergency/route.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  // Generate coverage reports for all files, even those not tested
  coverageReportAllFiles: true
}
