# OpenRelief Database Deployment Guide

This guide provides step-by-step instructions for deploying the OpenRelief database to Supabase.

## Prerequisites

1. **Supabase CLI** installed and configured
2. **PostgreSQL** client tools (psql)
3. **Node.js** and npm for type generation
4. **Git** for version control

## Environment Setup

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to Project
```bash
# For existing project
supabase link --project-ref your-project-ref

# For new project
supabase projects create
```

## Deployment Steps

### 1. Initialize Local Development
```bash
# Start local Supabase stack
supabase start

# Verify all services are running
supabase status
```

### 2. Apply Database Migrations
```bash
# Apply all migrations in order
supabase db push

# Verify migration status
supabase migration list
```

### 3. Seed Initial Data
```bash
# Seed with test data for development
supabase db seed

# For production, use production seed
supabase db seed --file supabase/seed_production.sql
```

### 4. Generate TypeScript Types
```bash
# Generate database types
npm run db:generate

# Verify types are updated
ls -la src/types/database.ts
```

### 5. Test Database Schema
```bash
# Run comprehensive schema tests
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/test_schema.sql
```

## Environment Configuration

### Development Environment
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

### Staging Environment
```bash
# .env.staging
NEXT_PUBLIC_SUPABASE_URL=https://staging.openrelief.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-role-key
```

### Production Environment
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://openrelief.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-role-key
```

## Production Deployment

### 1. Backup Existing Database (if applicable)
```bash
# Create backup before deployment
supabase db dump --data-only > backup-$(date +%Y%m%d).sql

# Store backup securely
aws s3 cp backup-$(date +%Y%m%d).sql s3://backups/database/
```

### 2. Deploy to Production
```bash
# Link to production project
supabase link --project-ref your-production-project-ref

# Deploy migrations
supabase db push

# Seed production data (if needed)
supabase db seed --remote
```

### 3. Verify Deployment
```bash
# Check database status
supabase db remote changes

# Test production connection
curl -X POST "https://your-project.supabase.co/rest/v1/user_profiles" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

## Post-Deployment Configuration

### 1. Configure Database Extensions
```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configure timezone
SET timezone = 'UTC';
```

### 2. Set Up Monitoring
```sql
-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'secure-password';

-- Grant read permissions for monitoring
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO monitoring;
```

### 3. Configure Connection Pooling
```bash
# Enable PgBouncer in Supabase dashboard
# Settings > Database > Connection Pooling
```

## Performance Optimization

### 1. Index Analysis
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find missing indexes
SELECT * FROM pg_stat_user_tables
WHERE seq_scan > 1000;
```

### 2. Query Optimization
```sql
-- Analyze slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. Database Statistics
```sql
-- Update table statistics
ANALYZE;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Security Configuration

### 1. Row Level Security Verification
```sql
-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public';
```

### 2. User Permissions
```sql
-- Check user roles
SELECT 
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin
FROM pg_roles
ORDER BY rolname;
```

### 3. Audit Configuration
```sql
-- Verify audit logging
SELECT COUNT(*) as audit_entries_today
FROM audit_log
WHERE created_at >= CURRENT_DATE;
```

## Monitoring and Alerting

### 1. Health Checks
```sql
-- Run system health check
SELECT * FROM system_health_check();

-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

### 2. Performance Metrics
```sql
-- Check database metrics
SELECT 
    metric_name,
    metric_value,
    tags,
    created_at
FROM system_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### 3. Error Monitoring
```sql
-- Check recent errors
SELECT 
    action,
    table_name,
    COUNT(*) as error_count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action, table_name
HAVING COUNT(*) > 10;
```

## Backup and Recovery

### 1. Automated Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_FILE="openrelief-backup-$DATE.sql"

supabase db dump --data-only > $BACKUP_FILE

# Upload to secure storage
aws s3 cp $BACKUP_FILE s3://backups/database/

# Clean up local files
rm $BACKUP_FILE
```

### 2. Point-in-Time Recovery
```bash
# Restore to specific timestamp
supabase db restore --timestamp "2024-01-15 10:30:00"

# Verify restore
supabase db remote changes
```

## Troubleshooting

### Common Issues

1. **Migration Conflicts**
   ```bash
   # Reset and reapply
   supabase db reset
   supabase db push
   ```

2. **Permission Errors**
   ```sql
   -- Check current user
   SELECT current_user;
   
   -- Check RLS status
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'table_name';
   ```

3. **Performance Issues**
   ```sql
   -- Check slow queries
   SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
   
   -- Rebuild indexes
   REINDEX DATABASE postgres;
   ```

### Debug Commands
```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Test database connection
supabase db remote commit --dry-run
```

## Maintenance Schedule

### Daily Tasks
- Run health checks
- Monitor performance metrics
- Check error rates
- Verify backup completion

### Weekly Tasks
- Analyze slow queries
- Update table statistics
- Review security logs
- Optimize indexes

### Monthly Tasks
- Review and cleanup old data
- Update emergency types
- Audit user permissions
- Performance tuning

## Rollback Procedures

### 1. Migration Rollback
```bash
# Identify migration to rollback
supabase migration list

# Rollback specific migration
supabase migration down 20240101000001_initial_schema.sql
```

### 2. Full Database Rollback
```bash
# Stop application
npm run stop

# Restore from backup
supabase db restore backup-20240115.sql

# Verify data integrity
supabase db test

# Restart application
npm run start
```

## Support and Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/docs/)

### Community Support
- [Supabase Discord](https://discord.gg/supabase)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/supabase)

### Emergency Contacts
- Database Administrator: dba@openrelief.org
- DevOps Team: devops@openrelief.org
- Security Team: security@openrelief.org

---

**Note**: This deployment guide should be followed in conjunction with the main OpenRelief deployment documentation. Always test in a staging environment before deploying to production.