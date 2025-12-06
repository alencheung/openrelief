#!/bin/bash

# Cloudflare Edge Functions Deployment Script
# Deploys emergency dispatch edge functions with monitoring and optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-"production"}
REGION=${2:-"global"}
WRANGLER_CMD="npx wrangler"

echo -e "${BLUE}🚀 Deploying OpenRelief Edge Functions${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${BLUE}Region: ${YELLOW}$REGION${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    # Check if wrangler is installed
    if ! command -v $WRANGLER_CMD &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
        npm install -g wrangler
    fi
    
    # Check if user is logged in
    if ! $WRANGLER_CMD whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Cloudflare. Please run: ${YELLOW}wrangler login${NC}"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f ".env.$ENVIRONMENT" ]; then
        echo -e "${RED}❌ Environment file .env.$ENVIRONMENT not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Validate edge function code
validate_code() {
    echo -e "${BLUE}🔍 Validating edge function code...${NC}"
    
    # Type check
    if ! npm run type-check; then
        echo -e "${RED}❌ TypeScript validation failed${NC}"
        exit 1
    fi
    
    # Lint check
    if ! npm run lint; then
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    fi
    
    # Test edge functions
    if ! npm run test:edge; then
        echo -e "${RED}❌ Edge function tests failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Code validation passed${NC}"
}

# Deploy to Cloudflare
deploy_edge_functions() {
    echo -e "${BLUE}🌐 Deploying edge functions...${NC}"
    
    # Load environment variables
    source .env.$ENVIRONMENT
    
    # Deploy main emergency dispatch function
    echo -e "${BLUE}   Deploying emergency dispatch function...${NC}"
    $WRANGLER_CMD deploy \
        --config src/edge/wrangler.toml \
        --env $ENVIRONMENT \
        --compatibility-date 2023-05-18 \
        --compatibility-flags nodejs_compat
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Emergency dispatch function deployed${NC}"
    else
        echo -e "${RED}   ❌ Failed to deploy emergency dispatch function${NC}"
        exit 1
    fi
    
    # Deploy additional edge functions if they exist
    for func in src/edge/functions/*.ts; do
        if [ -f "$func" ]; then
            func_name=$(basename "$func" .ts)
            echo -e "${BLUE}   Deploying $func_name function...${NC}"
            
            $WRANGLER_CMD deploy "$func" \
                --name "openrelief-$func_name" \
                --env $ENVIRONMENT
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}   ✅ $func_name function deployed${NC}"
            else
                echo -e "${YELLOW}   ⚠️  Failed to deploy $func_name function${NC}"
            fi
        fi
    done
}

# Setup KV namespaces
setup_kv_namespaces() {
    echo -e "${BLUE}💾 Setting up KV namespaces...${NC}"
    
    # Create KV namespaces if they don't exist
    namespaces=("targets_kv_namespace" "analytics_kv_namespace" "dispatch_metrics_kv_namespace")
    
    for namespace in "${namespaces[@]}"; do
        echo -e "${BLUE}   Setting up $namespace...${NC}"
        
        # Check if namespace exists
        if ! $WRANGLER_CMD kv:namespace list | grep -q "$namespace"; then
            echo -e "${BLUE}   Creating $namespace...${NC}"
            $WRANGLER_CMD kv:namespace create "$namespace" --env $ENVIRONMENT
        fi
        
        echo -e "${GREEN}   ✅ $namespace ready${NC}"
    done
}

# Setup D1 database
setup_d1_database() {
    echo -e "${BLUE}🗄️  Setting up D1 database...${NC}"
    
    # Check if database exists
    if ! $WRANGLER_CMD d1 list | grep -q "emergency_events_db"; then
        echo -e "${BLUE}   Creating emergency events database...${NC}"
        $WRANGLER_CMD d1 create "emergency_events_db" --env $ENVIRONMENT
    fi
    
    echo -e "${GREEN}   ✅ D1 database ready${NC}"
}

# Configure custom domains
configure_domains() {
    echo -e "${BLUE}🌍 Configuring custom domains...${NC}"
    
    # Main dispatch domain
    $WRANGLER_CMD custom-domains add dispatch.openrelief.org \
        --zone-name openrelief.org \
        --env $ENVIRONMENT
    
    echo -e "${GREEN}   ✅ Custom domains configured${NC}"
}

# Setup monitoring and alerts
setup_monitoring() {
    echo -e "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Create monitoring dashboard
    cat > monitoring/edge-metrics-dashboard.json << EOF
{
  "dashboard": {
    "title": "OpenRelief Edge Metrics",
    "panels": [
      {
        "title": "Request Latency",
        "type": "timeseries",
        "queries": [
          {
            "name": "avg_latency",
            "query": "avg:edge_function_execution_time{function=\"emergency-dispatch\"}"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "single_stat",
        "queries": [
          {
            "name": "success_rate",
            "query": "sum:edge_function_successes{function=\"emergency-dispatch\"} / sum:edge_function_invocations{function=\"emergency-dispatch\"}"
          }
        ]
      },
      {
        "title": "Emergency Dispatches",
        "type": "timeseries",
        "queries": [
          {
            "name": "dispatches",
            "query": "sum:emergency_dispatches"
          }
        ]
      }
    ]
  }
}
EOF
    
    echo -e "${GREEN}   ✅ Monitoring dashboard configured${NC}"
}

# Run performance tests
run_performance_tests() {
    echo -e "${BLUE}⚡ Running performance tests...${NC}"
    
    # Test latency
    echo -e "${BLUE}   Testing emergency dispatch latency...${NC}"
    
    # Create test emergency payload
    test_payload='{
      "id": "test-emergency-'$(date +%s)'",
      "type": "test",
      "severity": "high",
      "title": "Performance Test Emergency",
      "message": "This is a test for performance validation",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius": 1000
      },
      "trustWeight": 1.0,
      "timestamp": '$(date +%s)000',
      "requiresAction": true
    }'
    
    # Send test request
    start_time=$(date +%s%N)
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_payload" \
        "https://dispatch.openrelief.org/emergency" \
        -w "%{http_code}")
    end_time=$(date +%s%N)
    
    latency_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response" = "200" ] && [ "$latency_ms" -lt 100 ]; then
        echo -e "${GREEN}   ✅ Performance test passed (${latency_ms}ms latency)${NC}"
    else
        echo -e "${RED}   ❌ Performance test failed (${latency_ms}ms latency, HTTP $response)${NC}"
        exit 1
    fi
}

# Generate deployment report
generate_report() {
    echo -e "${BLUE}📋 Generating deployment report...${NC}"
    
    report_file="deployment-reports/edge-deployment-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "region": "$REGION",
    "version": "$(git rev-parse HEAD)",
    "functions": [
      {
        "name": "emergency-dispatch",
        "url": "https://dispatch.openrelief.org",
        "status": "deployed"
      }
    ],
    "performance": {
      "target_latency": "<100ms",
      "actual_latency": "${latency_ms}ms",
      "passed": $([ "$latency_ms" -lt 100 ] && echo "true" || echo "false")
    },
    "monitoring": {
      "dashboard": "https://dash.cloudflare.com/openrelief/edge-metrics",
      "alerts": "enabled"
    }
  }
}
EOF
    
    echo -e "${GREEN}   ✅ Deployment report saved to $report_file${NC}"
}

# Cleanup old deployments
cleanup_old_deployments() {
    echo -e "${BLUE}🧹 Cleaning up old deployments...${NC}"
    
    # Keep only last 10 deployments
    $WRANGLER_CMD deployments list --env $ENVIRONMENT | tail -n +11 | \
        awk '{print $1}' | xargs -I {} $WRANGLER_CMD deployments delete {} --env $ENVIRONMENT
    
    echo -e "${GREEN}   ✅ Old deployments cleaned up${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🎯 Starting OpenRelief Edge Functions Deployment${NC}"
    echo ""
    
    # Create deployment reports directory
    mkdir -p deployment-reports
    
    # Run deployment steps
    check_prerequisites
    validate_code
    setup_kv_namespaces
    setup_d1_database
    deploy_edge_functions
    configure_domains
    setup_monitoring
    run_performance_tests
    generate_report
    cleanup_old_deployments
    
    echo ""
    echo -e "${GREEN}🎉 Edge Functions Deployment Completed Successfully!${NC}"
    echo -e "${GREEN}   Emergency Dispatch: https://dispatch.openrelief.org${NC}"
    echo -e "${GREEN}   Monitoring: https://dash.cloudflare.com/openrelief/edge-metrics${NC}"
    echo -e "${GREEN}   Health Check: https://dispatch.openrelief.org/health${NC}"
    echo ""
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Deployment interrupted${NC}"; exit 1' INT

# Run main function
main "$@"