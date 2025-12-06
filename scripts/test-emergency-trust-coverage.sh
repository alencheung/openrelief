#!/bin/bash

# Test Coverage Script for Emergency and Trust System
# This script runs comprehensive tests and generates coverage reports

set -e

echo "🚀 Starting Emergency and Trust System Test Coverage"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required directories exist
check_directories() {
    print_status "Checking required directories..."
    
    if [ ! -d "src/store" ]; then
        print_error "src/store directory not found"
        exit 1
    fi
    
    if [ ! -d "src/hooks" ]; then
        print_error "src/hooks directory not found"
        exit 1
    fi
    
    if [ ! -d "src/app/api/emergency" ]; then
        print_error "src/app/api/emergency directory not found"
        exit 1
    fi
    
    if [ ! -d "src/test-utils" ]; then
        print_error "src/test-utils directory not found"
        exit 1
    fi
    
    print_success "All required directories found"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Check if jest is installed
    if ! npm list jest > /dev/null 2>&1; then
        print_status "Installing testing dependencies..."
        npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest
    fi
    
    print_success "Dependencies checked"
}

# Run linting before tests
run_linting() {
    print_status "Running ESLint..."
    
    if npm run lint --silent 2>/dev/null; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found, but continuing with tests"
    fi
}

# Run type checking
run_type_check() {
    print_status "Running TypeScript type check..."
    
    if npm run type-check --silent 2>/dev/null; then
        print_success "Type checking passed"
    else
        print_warning "Type checking issues found, but continuing with tests"
    fi
}

# Run unit tests for emergency system
run_emergency_tests() {
    print_status "Running Emergency System Tests..."
    
    # Emergency Store Tests
    if npm test -- --testPathPattern=emergencyStore --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Emergency Store tests passed"
    else
        print_error "Emergency Store tests failed"
        return 1
    fi
    
    # Emergency Lifecycle Tests
    if npm test -- --testPathPattern=emergencyLifecycle --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Emergency Lifecycle tests passed"
    else
        print_error "Emergency Lifecycle tests failed"
        return 1
    fi
    
    # Emergency API Tests
    if npm test -- --testPathPattern=route.test --testPathPattern=emergency --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Emergency API tests passed"
    else
        print_error "Emergency API tests failed"
        return 1
    fi
}

# Run unit tests for trust system
run_trust_tests() {
    print_status "Running Trust System Tests..."
    
    # Trust Store Tests
    if npm test -- --testPathPattern=trustStore --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Trust Store tests passed"
    else
        print_error "Trust Store tests failed"
        return 1
    fi
    
    # Trust Score Calculation Tests
    if npm test -- --testPathPattern=trustScoreCalculations --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Trust Score Calculation tests passed"
    else
        print_error "Trust Score Calculation tests failed"
        return 1
    fi
    
    # Consensus Engine Tests
    if npm test -- --testPathPattern=consensusEngine --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Consensus Engine tests passed"
    else
        print_error "Consensus Engine tests failed"
        return 1
    fi
    
    # Sybil Attack Prevention Tests
    if npm test -- --testPathPattern=sybilAttackPrevention --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Sybil Attack Prevention tests passed"
    else
        print_error "Sybil Attack Prevention tests failed"
        return 1
    fi
}

# Run hook tests
run_hook_tests() {
    print_status "Running Hook Tests..."
    
    # useTrustSystem Hook Tests
    if npm test -- --testPathPattern=useTrustSystem --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "useTrustSystem Hook tests passed"
    else
        print_error "useTrustSystem Hook tests failed"
        return 1
    fi
}

# Run spatial query tests
run_spatial_tests() {
    print_status "Running Spatial Query Tests..."
    
    if npm test -- --testPathPattern=spatialQueries --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Spatial Query tests passed"
    else
        print_error "Spatial Query tests failed"
        return 1
    fi
}

# Run event expiration tests
run_expiration_tests() {
    print_status "Running Event Expiration Tests..."
    
    if npm test -- --testPathPattern=eventExpiration --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Event Expiration tests passed"
    else
        print_error "Event Expiration tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "Running Integration Tests..."
    
    if npm test -- --testPathPattern=emergencyWorkflowIntegration --coverage --coverageConfig=jest.coverage.config.js; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Generate comprehensive coverage report
generate_coverage_report() {
    print_status "Generating comprehensive coverage report..."
    
    # Run all tests with coverage
    if npm test -- --coverage --coverageConfig=jest.coverage.config.js --coverageReporters=text --coverageReporters=text-summary --coverageReporters=html --coverageReporters=lcov; then
        print_success "Coverage report generated successfully"
    else
        print_error "Coverage report generation failed"
        return 1
    fi
    
    # Check if coverage meets requirements
    print_status "Checking coverage thresholds..."
    
    # Extract coverage percentages from summary
    COVERAGE_FILE="coverage/coverage-summary.json"
    
    if [ -f "$COVERAGE_FILE" ]; then
        LINES_COVERAGE=$(node -p "JSON.parse(require('fs').readFileSync('$COVERAGE_FILE', 'utf8')).total.lines.pct")
        FUNCTIONS_COVERAGE=$(node -p "JSON.parse(require('fs').readFileSync('$COVERAGE_FILE', 'utf8')).total.functions.pct")
        BRANCHES_COVERAGE=$(node -p "JSON.parse(require('fs').readFileSync('$COVERAGE_FILE', 'utf8')).total.branches.pct")
        STATEMENTS_COVERAGE=$(node -p "JSON.parse(require('fs').readFileSync('$COVERAGE_FILE', 'utf8')).total.statements.pct")
        
        echo "Coverage Summary:"
        echo "  Lines: ${LINES_COVERAGE}%"
        echo "  Functions: ${FUNCTIONS_COVERAGE}%"
        echo "  Branches: ${BRANCHES_COVERAGE}%"
        echo "  Statements: ${STATEMENTS_COVERAGE}%"
        
        # Check if coverage meets 80% threshold
        COVERAGE_THRESHOLD=80
        
        if (( $(echo "$LINES_COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
            print_success "Lines coverage meets requirement (${LINES_COVERAGE}% >= ${COVERAGE_THRESHOLD}%)"
        else
            print_error "Lines coverage below requirement (${LINES_COVERAGE}% < ${COVERAGE_THRESHOLD}%)"
        fi
        
        if (( $(echo "$FUNCTIONS_COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
            print_success "Functions coverage meets requirement (${FUNCTIONS_COVERAGE}% >= ${COVERAGE_THRESHOLD}%)"
        else
            print_error "Functions coverage below requirement (${FUNCTIONS_COVERAGE}% < ${COVERAGE_THRESHOLD}%)"
        fi
        
        if (( $(echo "$BRANCHES_COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
            print_success "Branches coverage meets requirement (${BRANCHES_COVERAGE}% >= ${COVERAGE_THRESHOLD}%)"
        else
            print_error "Branches coverage below requirement (${BRANCHES_COVERAGE}% < ${COVERAGE_THRESHOLD}%)"
        fi
        
        if (( $(echo "$STATEMENTS_COVERAGE >= $COVERAGE_THRESHOLD" | bc -l) )); then
            print_success "Statements coverage meets requirement (${STATEMENTS_COVERAGE}% >= ${COVERAGE_THRESHOLD}%)"
        else
            print_error "Statements coverage below requirement (${STATEMENTS_COVERAGE}% < ${COVERAGE_THRESHOLD}%)"
        fi
    else
        print_warning "Coverage summary file not found"
    fi
}

# Generate test documentation
generate_test_documentation() {
    print_status "Generating test documentation..."
    
    # Create test documentation
    cat > TEST_COVERAGE_REPORT.md << EOF
# Emergency and Trust System Test Coverage Report

## Overview
This report summarizes the test coverage for the Emergency Event Management and Trust System components.

## Test Categories

### 1. Emergency Event Management
- Emergency Store Tests
- Emergency Lifecycle Tests
- Emergency API Tests
- Spatial Query Tests
- Event Expiration Tests

### 2. Trust System
- Trust Store Tests
- Trust Score Calculation Tests
- Consensus Engine Tests
- Sybil Attack Prevention Tests
- Trust System Hook Tests

### 3. Integration Tests
- Emergency Workflow Integration Tests

## Coverage Requirements
- Minimum 80% coverage for all components
- 90% coverage for critical components (emergencyStore, trustStore)
- Comprehensive edge case testing
- Performance testing for high-volume scenarios

## Generated Files
- \`coverage/\` - HTML coverage reports
- \`coverage/lcov.info\` - LCOV format coverage data
- \`coverage/coverage-summary.json\` - JSON coverage summary

## Running Tests
\`\`\`bash
# Run all tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:emergency
npm run test:trust
npm run test:integration
\`\`\`

## Coverage Report Generated
$(date)
EOF

    print_success "Test documentation generated"
}

# Main execution
main() {
    echo "Starting comprehensive test suite for Emergency and Trust System..."
    echo ""
    
    check_directories
    install_dependencies
    run_linting
    run_type_check
    
    echo ""
    print_status "Running test suites..."
    echo ""
    
    # Run all test categories
    run_emergency_tests || exit 1
    run_trust_tests || exit 1
    run_hook_tests || exit 1
    run_spatial_tests || exit 1
    run_expiration_tests || exit 1
    run_integration_tests || exit 1
    
    echo ""
    generate_coverage_report
    generate_test_documentation
    
    echo ""
    print_success "All tests completed successfully!"
    print_status "Coverage reports generated in ./coverage/"
    print_status "HTML report available at ./coverage/lcov-report/index.html"
    echo ""
    echo "=================================================="
    echo "✅ Emergency and Trust System Test Coverage Complete"
}

# Check if bc is installed for floating point comparison
if ! command -v bc &> /dev/null; then
    print_warning "bc not found, installing for coverage calculations..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install bc
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install bc
    fi
fi

# Run main function
main "$@"