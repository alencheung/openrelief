/**
 * Jest Coverage Configuration
 * 
 * This configuration extends the base Jest config with specific
 * coverage requirements for the emergency and trust system components.
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
    '!src/next-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical files require higher coverage
    './src/store/emergencyStore.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/store/trustStore.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/hooks/useTrustSystem.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/app/api/emergency/route.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
  ],
  coverageDirectory: 'coverage',
  // Generate coverage reports for all files, even those not tested
  coverageReportAllFiles: true,
  // Only collect coverage for files that have tests
  collectCoverageOnlyFrom: {
    // Emergency System
    './src/store/emergencyStore.ts': true,
    './src/hooks/useEmergencyEvents.ts': true,
    './src/app/api/emergency/route.ts': true,
    
    // Trust System
    './src/store/trustStore.ts': true,
    './src/hooks/useTrustSystem.ts': true,
    
    // Database Operations
    './src/lib/supabase.ts': true,
  },
  // Setup files for coverage
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Test environment
  testEnvironment: 'jsdom',
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
  ],
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
}