#!/bin/bash

# Production Deployment Test Script
# This script tests the complete production deployment pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="https://openrelief.org"
STAGING_URL="https://staging.openrelief.org"
DISPATCH_URL="https://dispatch.openrelief.org"
TEST_RESULTS_DIR="test-results/production-$(date +%Y%m%d_%H%M%S)"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$TEST_RESULTS_DIR/test.log"
}

# Test result function
test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "${GREEN}✅ PASS: $test_name${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "${RED}❌ FAIL: $test_name${NC}"
        [ -n "$details" ] && log "${RED}   Details: $details${NC}"
    fi
    
    echo "$result|$test_name|$details" >> "$TEST_RESULTS_DIR/results.csv"
}

# HTTP request function
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local headers="${4:-}"
    
    if [ -n "$data" ]; then
        curl -s -w "%{http_code}|%{time_total}|%{size_download}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" \
            "$url" 2>/dev/null
    else
        curl -s -w "%{http_code}|%{time_total}|%{size_download}" \
            -X "$method" \
            $headers \
            "$url" 2>/dev/null
    fi
}

# Test 1: Frontend Health Check
test_frontend_health() {
    log "${BLUE}Testing frontend health check...${NC}"
    
    local response=$(make_request "$PRODUCTION_URL/api/health")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_time=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$http_code" = "200" ] && [ "$(echo "$response_time < 1.0" | bc -l)" -eq 1 ]; then
        test_result "Frontend Health Check" "PASS" "Response time: ${response_time}s"
    else
        test_result "Frontend Health Check" "FAIL" "HTTP: $http_code, Response time: ${response_time}s"
    fi
}

# Test 2: SSL Certificate Validation
test_ssl_certificate() {
    log "${BLUE}Testing SSL certificate...${NC}"
    
    local cert_info=$(echo | openssl s_client -connect openrelief.org:443 -servername openrelief.org 2>/dev/null | openssl x509 -noout -dates)
    local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ "$days_until_expiry" -gt 30 ]; then
        test_result "SSL Certificate Validation" "PASS" "Expires in $days_until_expiry days"
    else
        test_result "SSL Certificate Validation" "FAIL" "Expires in $days_until_expiry days (less than 30)"
    fi
}

# Test 3: Security Headers
test_security_headers() {
    log "${BLUE}Testing security headers...${NC}"
    
    local headers=$(curl -s -I "$PRODUCTION_URL" 2>/dev/null)
    local security_headers_present=true
    
    # Check for required security headers
    local required_headers=(
        "strict-transport-security"
        "x-frame-options"
        "x-content-type-options"
        "referrer-policy"
        "content-security-policy"
    )
    
    for header in "${required_headers[@]}"; do
        if ! echo "$headers" | grep -qi "$header"; then
            security_headers_present=false
            break
        fi
    done
    
    if [ "$security_headers_present" = true ]; then
        test_result "Security Headers" "PASS" "All required security headers present"
    else
        test_result "Security Headers" "FAIL" "Missing security headers"
    fi
}

# Test 4: Database Connectivity
test_database_connectivity() {
    log "${BLUE}Testing database connectivity...${NC}"
    
    local response=$(make_request "$PRODUCTION_URL/api/health" "POST" '{"check": "database"}')
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_body=$(curl -s -X POST "$PRODUCTION_URL/api/health" -H "Content-Type: application/json" -d '{"check": "database"}' 2>/dev/null)
    
    if [ "$http_code" = "200" ] && echo "$response_body" | grep -q '"database": "healthy"'; then
        test_result "Database Connectivity" "PASS" "Database connection successful"
    else
        test_result "Database Connectivity" "FAIL" "Database connection failed"
    fi
}

# Test 5: Edge Function Health
test_edge_function_health() {
    log "${BLUE}Testing edge function health...${NC}"
    
    local response=$(make_request "$DISPATCH_URL/health")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_time=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$http_code" = "200" ] && [ "$(echo "$response_time < 0.5" | bc -l)" -eq 1 ]; then
        test_result "Edge Function Health" "PASS" "Response time: ${response_time}s"
    else
        test_result "Edge Function Health" "FAIL" "HTTP: $http_code, Response time: ${response_time}s"
    fi
}

# Test 6: Emergency Reporting
test_emergency_reporting() {
    log "${BLUE}Testing emergency reporting...${NC}"
    
    local emergency_data='{
        "type_id": 1,
        "title": "Test Emergency",
        "description": "This is a test emergency for deployment verification",
        "location": "POINT(-122.4194 37.7749)",
        "radius_meters": 500,
        "severity": 5
    }'
    
    local response=$(make_request "$PRODUCTION_URL/api/emergency" "POST" "$emergency_data")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        test_result "Emergency Reporting" "PASS" "Emergency report submitted successfully"
    else
        test_result "Emergency Reporting" "FAIL" "HTTP: $http_code"
    fi
}

# Test 7: User Authentication
test_user_authentication() {
    log "${BLUE}Testing user authentication...${NC}"
    
    local auth_data='{
        "email": "test@example.com",
        "password": "testpassword123"
    }'
    
    local response=$(make_request "$PRODUCTION_URL/api/auth/login" "POST" "$auth_data")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    
    # This test expects authentication to fail with test credentials
    if [ "$http_code" = "401" ]; then
        test_result "User Authentication" "PASS" "Authentication endpoint responding correctly"
    else
        test_result "User Authentication" "FAIL" "Unexpected HTTP code: $http_code"
    fi
}

# Test 8: Map Functionality
test_map_functionality() {
    log "${BLUE}Testing map functionality...${NC}"
    
    local response=$(make_request "$PRODUCTION_URL/api/map/tiles/12/2048/2048.png")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_size=$(echo "$response" | cut -d'|' -f3)
    
    if [ "$http_code" = "200" ] && [ "$response_size" -gt 1000 ]; then
        test_result "Map Functionality" "PASS" "Map tiles loading correctly"
    else
        test_result "Map Functionality" "FAIL" "HTTP: $http_code, Size: $response_size bytes"
    fi
}

# Test 9: Performance Benchmarks
test_performance_benchmarks() {
    log "${BLUE}Testing performance benchmarks...${NC}"
    
    # Test multiple endpoints for performance
    local endpoints=(
        "$PRODUCTION_URL/api/health"
        "$PRODUCTION_URL/"
        "$PRODUCTION_URL/api/emergency/types"
    )
    
    local performance_passed=true
    local total_response_time=0
    local endpoint_count=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(make_request "$endpoint")
        local response_time=$(echo "$response" | cut -d'|' -f2)
        local http_code=$(echo "$response" | cut -d'|' -f1)
        
        total_response_time=$(echo "$total_response_time + $response_time" | bc -l)
        
        if [ "$http_code" != "200" ] || [ "$(echo "$response_time > 2.0" | bc -l)" -eq 1 ]; then
            performance_passed=false
            break
        fi
    done
    
    local avg_response_time=$(echo "scale=3; $total_response_time / $endpoint_count" | bc -l)
    
    if [ "$performance_passed" = true ] && [ "$(echo "$avg_response_time < 1.0" | bc -l)" -eq 1 ]; then
        test_result "Performance Benchmarks" "PASS" "Avg response time: ${avg_response_time}s"
    else
        test_result "Performance Benchmarks" "FAIL" "Avg response time: ${avg_response_time}s (exceeds 1.0s)"
    fi
}

# Test 10: Error Handling
test_error_handling() {
    log "${BLUE}Testing error handling...${NC}"
    
    # Test 404 handling
    local response=$(make_request "$PRODUCTION_URL/api/nonexistent")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_body=$(curl -s "$PRODUCTION_URL/api/nonexistent" 2>/dev/null)
    
    if [ "$http_code" = "404" ] && echo "$response_body" | grep -q "Not Found"; then
        test_result "Error Handling" "PASS" "404 errors handled correctly"
    else
        test_result "Error Handling" "FAIL" "404 handling incorrect"
    fi
}

# Test 11: Rate Limiting
test_rate_limiting() {
    log "${BLUE}Testing rate limiting...${NC}"
    
    local rate_limit_triggered=false
    local request_count=0
    
    # Make rapid requests to trigger rate limiting
    for i in {1..20}; do
        local response=$(make_request "$PRODUCTION_URL/api/health")
        local http_code=$(echo "$response" | cut -d'|' -f1)
        
        if [ "$http_code" = "429" ]; then
            rate_limit_triggered=true
            break
        fi
        
        request_count=$((request_count + 1))
    done
    
    if [ "$rate_limit_triggered" = true ]; then
        test_result "Rate Limiting" "PASS" "Rate limiting triggered after $request_count requests"
    else
        test_result "Rate Limiting" "FAIL" "Rate limiting not triggered"
    fi
}

# Test 12: CORS Configuration
test_cors_configuration() {
    log "${BLUE}Testing CORS configuration...${NC}"
    
    local response=$(make_request "$PRODUCTION_URL/api/health" "OPTIONS" "" "-H \"Origin: https://openrelief.org\"")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local headers=$(curl -s -I -X OPTIONS "$PRODUCTION_URL/api/health" -H "Origin: https://openrelief.org" 2>/dev/null)
    
    if [ "$http_code" = "200" ] && echo "$headers" | grep -qi "access-control-allow-origin"; then
        test_result "CORS Configuration" "PASS" "CORS headers present"
    else
        test_result "CORS Configuration" "FAIL" "CORS configuration incorrect"
    fi
}

# Test 13: Content Delivery Network
test_cdn_performance() {
    log "${BLUE}Testing CDN performance...${NC}"
    
    # Test static asset delivery
    local response=$(make_request "$PRODUCTION_URL/_next/static/css/app.css")
    local http_code=$(echo "$response" | cut -d'|' -f1)
    local response_time=$(echo "$response" | cut -d'|' -f2)
    local headers=$(curl -s -I "$PRODUCTION_URL/_next/static/css/app.css" 2>/dev/null)
    
    # Check for cache headers
    local cache_hit=false
    if echo "$headers" | grep -qi "cache-control"; then
        cache_hit=true
    fi
    
    if [ "$http_code" = "200" ] && [ "$cache_hit" = true ] && [ "$(echo "$response_time < 0.5" | bc -l)" -eq 1 ]; then
        test_result "CDN Performance" "PASS" "Static assets delivered via CDN"
    else
        test_result "CDN Performance" "FAIL" "CDN not working optimally"
    fi
}

# Test 14: Monitoring Integration
test_monitoring_integration() {
    log "${BLUE}Testing monitoring integration...${NC}"
    
    # Check if monitoring endpoints are accessible
    local monitoring_endpoints=(
        "$PRODUCTION_URL/api/health"
        "$DISPATCH_URL/health"
    )
    
    local monitoring_working=true
    
    for endpoint in "${monitoring_endpoints[@]}"; do
        local response=$(make_request "$endpoint")
        local http_code=$(echo "$response" | cut -d'|' -f1)
        
        if [ "$http_code" != "200" ]; then
            monitoring_working=false
            break
        fi
    done
    
    if [ "$monitoring_working" = true ]; then
        test_result "Monitoring Integration" "PASS" "All monitoring endpoints accessible"
    else
        test_result "Monitoring Integration" "FAIL" "Some monitoring endpoints not accessible"
    fi
}

# Test 15: Backup Systems
test_backup_systems() {
    log "${BLUE}Testing backup systems...${NC}"
    
    # Check if recent backups exist
    local backup_count=$(aws s3 ls s3://openrelief-backups/production/ --recursive | wc -l)
    local latest_backup=$(aws s3 ls s3://openrelief-backups/production/ --recursive | sort | tail -n 1)
    
    if [ "$backup_count" -gt 0 ] && [ -n "$latest_backup" ]; then
        test_result "Backup Systems" "PASS" "$backup_count backups found, latest: $latest_backup"
    else
        test_result "Backup Systems" "FAIL" "No recent backups found"
    fi
}

# Generate test report
generate_report() {
    log "${BLUE}Generating test report...${NC}"
    
    local report_file="$TEST_RESULTS_DIR/deployment-test-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>OpenRelief Production Deployment Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .test-item { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .pass { border-left-color: #28a745; background-color: #d4edda; }
        .fail { border-left-color: #dc3545; background-color: #f8d7da; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-box { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpenRelief Production Deployment Test Report</h1>
        <p class="timestamp">Generated on $(date)</p>
    </div>
    
    <div class="stats">
        <div class="stat-box">
            <h3>$TOTAL_TESTS</h3>
            <p>Total Tests</p>
        </div>
        <div class="stat-box">
            <h3>$PASSED_TESTS</h3>
            <p>Passed</p>
        </div>
        <div class="stat-box">
            <h3>$FAILED_TESTS</h3>
            <p>Failed</p>
        </div>
        <div class="stat-box">
            <h3>$(( PASSED_TESTS * 100 / TOTAL_TESTS ))%</h3>
            <p>Success Rate</p>
        </div>
    </div>
    
    <div class="summary">
        <h2>Test Results</h2>
EOF
    
    # Add test results to report
    while IFS='|' read -r result test_name details; do
        local css_class="pass"
        if [ "$result" = "FAIL" ]; then
            css_class="fail"
        fi
        
        cat >> "$report_file" << EOF
        <div class="test-item $css_class">
            <h4>$test_name</h4>
            <p>Status: $result</p>
            <p>Details: $details</p>
        </div>
EOF
    done < "$TEST_RESULTS_DIR/results.csv"
    
    cat >> "$report_file" << EOF
    </div>
    
    <div class="summary">
        <h2>Recommendations</h2>
EOF
    
    if [ "$FAILED_TESTS" -eq 0 ]; then
        cat >> "$report_file" << EOF
        <p>All tests passed! The deployment is ready for production use.</p>
EOF
    else
        cat >> "$report_file" << EOF
        <p>$FAILED_TESTS test(s) failed. Please review and fix the issues before proceeding with the deployment.</p>
        <p>Refer to the deployment runbook for troubleshooting steps.</p>
EOF
    fi
    
    cat >> "$report_file" << EOF
    </div>
</body>
</html>
EOF
    
    log "Test report generated: $report_file"
}

# Main execution
main() {
    log "${BLUE}Starting production deployment tests...${NC}"
    log "Test results directory: $TEST_RESULTS_DIR"
    
    # Initialize results file
    echo "Result|Test Name|Details" > "$TEST_RESULTS_DIR/results.csv"
    
    # Run all tests
    test_frontend_health
    test_ssl_certificate
    test_security_headers
    test_database_connectivity
    test_edge_function_health
    test_emergency_reporting
    test_user_authentication
    test_map_functionality
    test_performance_benchmarks
    test_error_handling
    test_rate_limiting
    test_cors_configuration
    test_cdn_performance
    test_monitoring_integration
    test_backup_systems
    
    # Generate report
    generate_report
    
    # Print summary
    log "${BLUE}Test Summary:${NC}"
    log "Total Tests: $TOTAL_TESTS"
    log "Passed: $PASSED_TESTS"
    log "Failed: $FAILED_TESTS"
    log "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    
    # Exit with appropriate code
    if [ "$FAILED_TESTS" -eq 0 ]; then
        log "${GREEN}All tests passed! Deployment is ready for production.${NC}"
        exit 0
    else
        log "${RED}Some tests failed. Please review and fix issues before deployment.${NC}"
        exit 1
    fi
}

# Trap for cleanup
trap 'log "Test interrupted"; exit 1' INT TERM

# Run main function
main "$@"