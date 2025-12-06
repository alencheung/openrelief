# OpenRelief Production Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying OpenRelief to production environments. It covers emergency deployments, rollback procedures, and troubleshooting common issues.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Standard Deployment Procedure](#standard-deployment-procedure)
3. [Emergency Deployment Procedure](#emergency-deployment-procedure)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Communication Procedures](#communication-procedures)

## Pre-Deployment Checklist

### Environment Validation

- [ ] Verify all environment variables are set correctly
- [ ] Confirm database backups are current (within last 24 hours)
- [ ] Check monitoring systems are operational
- [ ] Verify SSL certificates are valid
- [ ] Confirm CDN cache purge permissions
- [ ] Check rate limiting configurations
- [ ] Verify third-party service integrations (Maps, Notifications, AI)

### Code Validation

- [ ] All tests passing in CI/CD pipeline
- [ ] Code review completed and approved
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Accessibility tests passed
- [ ] Documentation updated

### Team Coordination

- [ ] Deployment window scheduled with stakeholders
- [ ] On-call engineer notified
- [ ] Communication channels prepared
- [ ] Rollback plan documented
- [ ] Emergency contacts verified

## Standard Deployment Procedure

### 1. Preparation Phase

```bash
# Set environment
export DEPLOYMENT_ENV=production
export DEPLOYMENT_ID=$(date +%Y%m%d_%H%M%S)

# Create deployment branch
git checkout -b deploy/production_${DEPLOYMENT_ID}

# Pull latest changes
git pull origin main

# Verify current production status
curl -f https://openrelief.org/api/health
```

### 2. Database Preparation

```bash
# Connect to production database
psql $DATABASE_URL

# Check database status
SELECT get_database_health();

# Create pre-deployment backup
./scripts/backup-production.sh

# Verify backup integrity
aws s3 ls s3://openrelief-backups/production/ | grep $BACKUP_DATE
```

### 3. Application Deployment

```bash
# Deploy frontend to Vercel
vercel --prod --confirm

# Deploy edge functions
./scripts/deploy-edge-functions.sh production

# Run database migrations
supabase db push --db-url $DATABASE_URL
```

### 4. Verification Phase

```bash
# Health checks
curl -f https://openrelief.org/api/health
curl -f https://dispatch.openrelief.org/health

# Database connectivity
curl -X POST https://openrelief.org/api/health \
  -H "Content-Type: application/json" \
  -d '{"check": "database"}'

# Edge function connectivity
curl -X POST https://dispatch.openrelief.org/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "emergency_dispatch"}'
```

## Emergency Deployment Procedure

### When to Use Emergency Deployment

- Critical security vulnerability identified
- Data corruption or loss
- Service outage affecting >50% of users
- Legal compliance requirement
- Critical bug preventing emergency reporting

### Emergency Deployment Steps

1. **Immediate Response (0-5 minutes)**
   ```bash
   # Notify team
   ./scripts/notify-emergency.sh "Emergency deployment initiated"
   
   # Create emergency branch
   git checkout -b emergency/fix_$(date +%s)
   
   # Apply hotfix
   # [Apply specific fix]
   ```

2. **Rapid Deployment (5-15 minutes)**
   ```bash
   # Skip non-essential tests
   npm run build
   
   # Deploy with emergency flag
   vercel --prod --force --message "EMERGENCY DEPLOYMENT"
   
   # Deploy edge functions
   ./scripts/deploy-edge-functions.sh production --force
   ```

3. **Verification (15-30 minutes)**
   ```bash
   # Critical path testing
   curl -f https://openrelief.org/api/health
   ./scripts/test-critical-paths.sh
   
   # Monitor for issues
   ./scripts/monitor-deployment.sh $DEPLOYMENT_ID
   ```

## Rollback Procedures

### Automatic Rollback Triggers

- Health check failures >3 consecutive checks
- Error rate >10% for >5 minutes
- Database connection failures
- Critical user functionality broken

### Manual Rollback Steps

1. **Frontend Rollback**
   ```bash
   # Get previous deployment
   vercel rollback --to <previous-deployment-url>
   
   # Verify rollback
   curl -f https://openrelief.org/api/health
   ```

2. **Database Rollback**
   ```bash
   # Identify last good migration
   supabase migration list
   
   # Rollback to previous version
   supabase migration down <migration-id>
   
   # Restore from backup if needed
   ./scripts/restore-database.sh <backup-id>
   ```

3. **Edge Functions Rollback**
   ```bash
   # Deploy previous version
   wrangler rollback --compatibility-date <previous-date>
   
   # Clear cache
   wrangler cache purge
   ```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

**Symptoms:**
- Database connection timeouts
- Health check failures
- Slow query performance

**Diagnostics:**
```bash
# Check database status
supabase status

# Check connection pool
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

**Solutions:**
```bash
# Increase connection pool size
ALTER SYSTEM SET max_connections = 250;

# Restart connection pool
supabase restart;

# Clear query cache
DISCARD ALL;
```

#### 2. Frontend Build Issues

**Symptoms:**
- Build failures
- Runtime errors
- Performance degradation

**Diagnostics:**
```bash
# Check build logs
vercel logs <deployment-url>

# Check bundle size
npm run analyze

# Check runtime errors
curl https://openrelief.org/api/health
```

**Solutions:**
```bash
# Clear build cache
rm -rf .next
npm run build

# Rollback to previous version
vercel rollback

# Check for memory leaks
npm run test:memory
```

#### 3. Edge Function Issues

**Symptoms:**
- High latency
- Function failures
- Cache issues

**Diagnostics:**
```bash
# Check function logs
wrangler tail

# Check KV store
wrangler kv:key list --namespace=TARGETS_KV

# Test function locally
wrangler dev
```

**Solutions:**
```bash
# Clear edge cache
wrangler cache purge

# Redeploy functions
wrangler deploy

# Check for memory limits
wrangler tail --format=json
```

#### 4. SSL/TLS Issues

**Symptoms:**
- Certificate errors
- Mixed content warnings
- Security header issues

**Diagnostics:**
```bash
# Check SSL certificate
openssl s_client -connect openrelief.org:443 -servername openrelief.org

# Check security headers
curl -I https://openrelief.org

# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 openrelief.org
```

**Solutions:**
```bash
# Renew SSL certificate
certbot renew --force-renewal

# Update security headers
./scripts/update-security-headers.sh

# Clear CDN cache
vercel purge --all
```

## Post-Deployment Verification

### Health Checks

```bash
# API Health Check
curl -f https://openrelief.org/api/health

# Database Health Check
curl -X POST https://openrelief.org/api/health \
  -H "Content-Type: application/json" \
  -d '{"check": "database"}'

# Edge Function Health Check
curl -f https://dispatch.openrelief.org/health

# SSL Certificate Check
openssl s_client -connect openrelief.org:443 -servername openrelief.org < /dev/null
```

### Functional Tests

```bash
# Test emergency reporting
./scripts/test-emergency-reporting.sh

# Test user authentication
./scripts/test-authentication.sh

# Test push notifications
./scripts/test-notifications.sh

# Test map functionality
./scripts/test-maps.sh
```

### Performance Tests

```bash
# Run Lighthouse tests
npm run test:lighthouse:production

# Load testing
./scripts/load-test.sh https://openrelief.org

# Database performance test
./scripts/test-database-performance.sh
```

## Communication Procedures

### Pre-Deployment Communication

1. **Internal Team Notification**
   - Slack: #deployments channel
   - Email: dev-team@openrelief.org
   - Timeline: 24 hours before deployment

2. **Stakeholder Notification**
   - Email: stakeholders@openrelief.org
   - Timeline: 12 hours before deployment
   - Include: deployment window, impact, rollback plan

3. **User Notification**
   - In-app banner (if downtime expected)
   - Social media update (if major release)
   - Timeline: 2 hours before deployment

### During Deployment

1. **Status Updates**
   - Every 15 minutes during deployment
   - Slack: #deployments channel
   - Include: current step, ETA, any issues

2. **Issue Reporting**
   - Immediate notification for any issues
   - Include: issue description, impact, ETA for fix
   - Escalate to management if critical

### Post-Deployment Communication

1. **Success Notification**
   - Slack: #deployments channel
   - Email: dev-team@openrelief.org
   - Include: deployment summary, performance metrics

2. **Issue Resolution**
   - Document all issues and resolutions
   - Share with team for learning
   - Update runbook if new issues discovered

## Emergency Contacts

| Role | Name | Email | Phone |
|-------|------|-------|-------|
| DevOps Lead | DevOps Lead | devops@openrelief.org | +1-555-0101 |
| Database Admin | DB Admin | dba@openrelief.org | +1-555-0102 |
| Security Lead | Security Lead | security@openrelief.org | +1-555-0103 |
| Product Manager | Product Manager | pm@openrelief.org | +1-555-0104 |

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**
   - Response time <200ms
   - Error rate <1%
   - Throughput >1000 req/min
   - CPU usage <70%
   - Memory usage <80%

2. **Database Metrics**
   - Connection pool usage <80%
   - Query time <100ms
   - Disk usage <85%
   - Backup completion <30min

3. **Infrastructure Metrics**
   - SSL certificate validity >30 days
   - CDN cache hit rate >90%
   - Edge function success rate >99%
   - Uptime >99.9%

### Alert Thresholds

| Metric | Warning | Critical |
|---------|----------|----------|
| Response Time | >500ms | >1000ms |
| Error Rate | >5% | >10% |
| CPU Usage | >70% | >90% |
| Memory Usage | >80% | >95% |
| Disk Usage | >85% | >95% |
| Database Connections | >150 | >190 |

## Documentation Updates

After each deployment, update:

1. **Deployment Log**
   - Date and time
   - Deployment ID
   - Changes deployed
   - Issues encountered
   - Rollback actions (if any)

2. **Runbook Updates**
   - New procedures discovered
   - Updated troubleshooting steps
   - Modified contact information

3. **System Documentation**
   - Configuration changes
   - New features added
   - Deprecated features removed

## Security Considerations

### Pre-Deployment Security Checks

- [ ] Security scan passed
- [ ] No hardcoded secrets
- [ ] SSL certificates valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation active

### Post-Deployment Security Verification

- [ ] No new vulnerabilities introduced
- [ ] Authentication working correctly
- [ ] Authorization controls active
- [ ] Audit logging functional
- [ ] Data encryption active

## Compliance Requirements

### GDPR Compliance

- [ ] Data protection measures active
- [ ] User consent mechanisms working
- [ ] Data retention policies enforced
- [ ] Right to deletion functional
- [ ] Data portability available

### HIPAA Compliance (if applicable)

- [ ] Access controls implemented
- [ ] Audit logging comprehensive
- [ ] Data encryption at rest and in transit
- [ ] Business continuity plan tested
- [ ] Incident response procedures ready

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Next Review**: 2024-02-15  
**Approved By**: DevOps Team Lead