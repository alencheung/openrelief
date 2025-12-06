# Emergency and Trust System Testing Guide

## Overview

This guide provides comprehensive documentation for the testing infrastructure implemented for OpenRelief's Emergency Event Management and Trust System. The testing suite ensures reliable emergency response and prevents misinformation during disasters where accuracy saves lives.

## Testing Architecture

### Test Categories

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Cross-component workflow testing
3. **API Tests** - Endpoint validation and error handling
4. **Performance Tests** - Load and stress testing
5. **Security Tests** - Attack prevention and data validation

### Coverage Requirements

- **Minimum 80% coverage** for all components
- **90% coverage** for critical components:
  - `src/store/emergencyStore.ts`
  - `src/store/trustStore.ts`
  - `src/hooks/useTrustSystem.ts`
  - `src/app/api/emergency/route.ts`

## Test Files Structure

```
src/
├── test-utils/
│   ├── database/
│   │   └── index.ts              # Database testing utilities
│   ├── consensus/
│   │   └── index.ts              # Consensus engine testing utilities
│   └── mocks/
│       └── supabase.ts           # Supabase client mocks
├── store/__tests__/
│   ├── emergencyLifecycle.test.ts     # Emergency event lifecycle tests
│   ├── trustScoreCalculations.test.ts # Trust score calculation tests
│   ├── consensusEngine.test.ts       # Consensus engine tests
│   ├── spatialQueries.test.ts         # Spatial query tests
│   ├── eventExpiration.test.ts        # Event expiration tests
│   ├── sybilAttackPrevention.test.ts  # Sybil attack prevention tests
│   └── emergencyWorkflowIntegration.test.ts # Integration tests
├── hooks/__tests__/
│   └── useTrustSystem.test.ts    # Trust system hook tests
└── app/api/emergency/__tests__/
    └── route.test.ts             # Emergency API tests
```

## Running Tests

### Quick Start

```bash
# Run all emergency and trust system tests
npm run test:emergency-trust

# Run specific test categories
npm run test:emergency      # Emergency system tests
npm run test:trust          # Trust system tests
npm run test:consensus      # Consensus engine tests
npm run test:integration    # Integration tests
npm run test:spatial        # Spatial query tests
npm run test:hooks         # Hook tests

# Generate coverage report
npm run test:coverage
```

### Detailed Test Execution

```bash
# Run comprehensive test suite with coverage
bash scripts/test-emergency-trust-coverage.sh

# Run individual test files
npm test -- src/store/__tests__/emergencyLifecycle.test.ts
npm test -- src/store/__tests__/trustScoreCalculations.test.ts
npm test -- src/hooks/__tests__/useTrustSystem.test.ts
npm test -- src/app/api/emergency/__tests__/route.test.ts
```

## Test Utilities

### Database Testing Utilities (`src/test-utils/database/index.ts`)

Provides advanced database testing capabilities:

```typescript
import { createTestDatabase, setupTestData, cleanupTestData } from '@/test-utils/database'

// Create isolated test database
const testDb = await createTestDatabase()

// Setup test data
const testData = await setupTestData(testDb, {
  users: 10,
  events: 5,
  confirmations: 20
})

// Cleanup after tests
await cleanupTestData(testDb)
```

### Consensus Testing Utilities (`src/test-utils/consensus/index.ts`)

Provides consensus engine testing capabilities:

```typescript
import { 
  createConsensusTestScenario, 
  simulateSybilAttack,
  validateConsensusResult 
} from '@/test-utils/consensus'

// Create test scenario
const scenario = createConsensusTestScenario({
  participants: 50,
  eventLocation: { lat: 40.7128, lng: -74.0060 },
  trustDistribution: 'normal'
})

// Simulate attack
const attackResult = simulateSybilAttack(scenario, {
  attackers: 10,
  strategy: 'coordinated'
})
```

## Test Scenarios

### Emergency Event Lifecycle Tests

**Coverage Areas:**
- Event creation and validation
- Status transitions (pending → active → resolved)
- Emergency type classification
- Severity level handling
- Event expiration and cleanup

**Key Test Cases:**
```typescript
// Event creation with valid data
it('should create emergency event with valid data')

// Status transitions
it('should transition from pending to active with confirmations')
it('should transition from active to resolved with resolution')

// Error handling
it('should reject invalid emergency type')
it('should handle missing required fields')
```

### Trust Score Calculation Tests

**Coverage Areas:**
- Score calculation algorithms
- Trust history tracking
- Expertise bonuses
- Response time impact
- Penalty systems

**Key Test Cases:**
```typescript
// Score calculation
it('should calculate trust score based on user actions')
it('should apply expertise bonus for specialized knowledge')

// Score evolution
it('should update trust score after successful confirmation')
it('should apply penalty for false reports')
```

### Consensus Engine Tests

**Coverage Areas:**
- Trust-weighted voting
- Location-based weighting
- Collusion detection
- Sybil attack prevention

**Key Test Cases:**
```typescript
// Consensus calculation
it('should calculate consensus with trust-weighted voting')
it('should apply location-based weighting for nearby users')

// Attack prevention
it('should detect and prevent coordinated attacks')
it('should identify suspicious voting patterns')
```

### Spatial Query Tests

**Coverage Areas:**
- Distance calculations
- Geographic bounds
- Location-based filtering
- Performance optimization

**Key Test Cases:**
```typescript
// Spatial queries
it('should find events within specified radius')
it('should filter events by geographic bounds')

// Performance
it('should handle large-scale spatial queries efficiently')
```

### Event Expiration Tests

**Coverage Areas:**
- Expiration rules
- Automatic cleanup
- Data retention policies
- Archive management

**Key Test Cases:**
```typescript
// Expiration logic
it('should expire events after specified duration')
it('should archive expired events according to policy')

// Cleanup scheduling
it('should schedule cleanup for expired events')
```

### Sybil Attack Prevention Tests

**Coverage Areas:**
- Account behavior analysis
- Trust manipulation detection
- Network analysis
- Prevention effectiveness

**Key Test Cases:**
```typescript
// Attack detection
it('should detect suspicious account creation patterns')
it('should identify coordinated trust manipulation')

// Prevention mechanisms
it('should limit voting power of suspicious accounts')
it('should apply additional verification for high-risk actions')
```

## API Testing

### Emergency API Tests (`src/app/api/emergency/__tests__/route.test.ts`)

**Coverage Areas:**
- CRUD operations
- Input validation
- Error handling
- Rate limiting
- Security measures

**Test Endpoints:**
```typescript
// GET /api/emergency
it('should fetch emergency events with pagination')
it('should apply spatial filtering correctly')
it('should handle invalid query parameters')

// POST /api/emergency
it('should create emergency event with valid data')
it('should validate required fields')
it('should sanitize input data')

// PUT /api/emergency
it('should update existing emergency event')
it('should prevent updates to resolved events')

// DELETE /api/emergency
it('should delete pending emergency event')
it('should prevent deletion of active events')
```

## Integration Testing

### Emergency Workflow Integration Tests

**Coverage Areas:**
- End-to-end workflows
- Multi-event scenarios
- Real-time updates
- Error recovery

**Test Scenarios:**
```typescript
// Complete workflow
it('should handle complete emergency response workflow')
it('should manage multiple concurrent emergencies')

// Error handling
it('should recover from database failures')
it('should handle network interruptions gracefully')
```

## Performance Testing

### Load Testing Scenarios

- **High Volume Events**: 1000+ concurrent emergency reports
- **Consensus Calculations**: 500+ participants in consensus
- **Spatial Queries**: Large-scale geographic filtering
- **Trust Score Updates**: Real-time score calculations

### Performance Benchmarks

- **API Response Time**: < 200ms for 95% of requests
- **Database Queries**: < 100ms for indexed queries
- **Consensus Calculation**: < 500ms for 100 participants
- **Spatial Queries**: < 300ms for 10km radius queries

## Security Testing

### Attack Prevention

- **SQL Injection**: Parameterized query validation
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: Token validation
- **Rate Limiting**: Request throttling
- **Data Validation**: Type checking and bounds validation

### Trust System Security

- **Sybil Attack Detection**: Behavioral analysis
- **Trust Manipulation**: Pattern recognition
- **Collusion Detection**: Network analysis
- **Privilege Escalation**: Permission validation

## Coverage Reports

### Generating Coverage

```bash
# Generate comprehensive coverage report
npm run test:coverage

# Generate coverage with custom configuration
npm test -- --coverage --coverageConfig=jest.coverage.config.js

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Analysis

The coverage report includes:
- **Line Coverage**: Percentage of executed lines
- **Branch Coverage**: Percentage of executed branches
- **Function Coverage**: Percentage of called functions
- **Statement Coverage**: Percentage of executed statements

### Coverage Thresholds

- **Global Minimum**: 80% across all metrics
- **Critical Components**: 90% across all metrics
- **New Code**: 85% coverage requirement

## Best Practices

### Test Writing Guidelines

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with AAA pattern
3. **Test Isolation**: Ensure tests don't depend on each other
4. **Mock External Dependencies**: Use mocks for external services
5. **Edge Cases**: Test boundary conditions and error scenarios

### Data Management

1. **Test Data Factories**: Use factories for consistent test data
2. **Database Cleanup**: Clean up test data after each test
3. **Isolated Environments**: Use separate test databases
4. **Data Privacy**: Never use real user data in tests

### Performance Considerations

1. **Test Parallelization**: Run tests in parallel when possible
2. **Efficient Mocks**: Use lightweight mock implementations
3. **Database Optimization**: Use in-memory databases for tests
4. **Cleanup Optimization**: Efficient cleanup strategies

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout for slow tests
2. **Memory Leaks**: Ensure proper cleanup in tests
3. **Race Conditions**: Use proper async/await patterns
4. **Mock Failures**: Verify mock implementations

### Debugging Tips

1. **Verbose Output**: Use `--verbose` flag for detailed output
2. **Debug Breakpoints**: Use `debugger` statements in tests
3. **Test Isolation**: Run tests individually to isolate issues
4. **Log Analysis**: Check console logs for debugging information

## Continuous Integration

### CI/CD Integration

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Emergency/Trust Tests
  run: |
    npm run test:emergency-trust
    npm run test:coverage
    
- name: Upload Coverage Reports
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Quality Gates

- **Coverage Threshold**: Must meet minimum coverage requirements
- **Test Success Rate**: All tests must pass
- **Performance Benchmarks**: Must meet performance criteria
- **Security Checks**: Must pass security validations

## Conclusion

This comprehensive testing infrastructure ensures the reliability and security of OpenRelief's Emergency Event Management and Trust System. The test suite provides confidence in the system's ability to handle real-world emergency scenarios while preventing misinformation and maintaining data integrity.

Regular execution of these tests, combined with continuous monitoring and updates, ensures the system remains robust and reliable as it evolves to meet the changing needs of emergency response coordination.