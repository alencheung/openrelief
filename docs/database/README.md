# Database Documentation

## Overview

OpenRelief uses **PostgreSQL 15+** with **PostGIS 3.3+** for spatial data
handling, hosted on Supabase. The database is optimized for emergency
coordination with location-based queries, trust scoring, and real-time
notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Platform                     │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 15+  │  PostGIS 3.3+  │  Row Level Security │
├─────────────────────────────────────────────────────────┤
│  Auth │ Realtime │ Storage │ Edge Functions │ REST API │
└─────────────────────────────────────────────────────────┘
```

## Core Tables

| Table                 | Purpose                     | Key Features                |
| --------------------- | --------------------------- | --------------------------- |
| `user_profiles`       | User data with trust scores | Spatial index on location   |
| `emergency_events`    | Emergency reports           | PostGIS geometry, consensus |
| `emergency_types`     | Event type definitions      | Categories and metadata     |
| `event_confirmations` | User confirmations          | Trust-weighted voting       |
| `user_subscriptions`  | Alert preferences           | Per-topic settings          |
| `notification_queue`  | Outbound notifications      | Retry logic                 |

## Schema Documentation

See [schema.md](./schema.md) for complete schema details including:

- All table definitions with constraints
- Index strategies
- Row Level Security policies
- Database functions and triggers
- Performance optimization

## Migration Workflow

### Local Development

```bash
# Start local Supabase
supabase start

# Create a new migration
supabase migration new <migration_name>

# Apply migrations
supabase db push

# Reset database (WARNING: destroys data)
supabase db reset
```

### Production Deployment

```bash
# Link to remote project
supabase link --project-ref <project-ref>

# Push migrations to production
supabase db push

# Generate TypeScript types
npm run db:generate
```

### Migration Best Practices

1. **Always create migration files** - Never modify schema directly
2. **Test locally first** - Use `supabase db reset` to verify
3. **Include rollback** - Write reversible migrations
4. **Add indexes separately** - Create indexes in dedicated migrations
5. **Update types** - Run `npm run db:generate` after schema changes

## Spatial Query Examples

### Find Events Within Radius

```sql
SELECT
  id,
  title,
  ST_Distance(location, ST_MakePoint(-122.4194, 37.7749)::geography) as distance
FROM emergency_events
WHERE status = 'active'
  AND ST_DWithin(
    location,
    ST_MakePoint(-122.4194, 37.7749)::geography,
    5000 -- 5km radius
  )
ORDER BY distance;
```

### Find Users for Alert Dispatch

```sql
SELECT
  up.user_id,
  ST_Distance(up.last_known_location, ee.location) as distance
FROM user_profiles up
JOIN user_subscriptions us ON us.user_id = up.user_id
CROSS JOIN emergency_events ee
WHERE ee.id = 'event-uuid'
  AND us.topic_id = ee.type_id
  AND us.is_active = true
  AND ST_DWithin(up.last_known_location, ee.location, ee.radius_meters);
```

### Calculate Relevance Score

```sql
-- Inverse-square relevance calculation
SELECT
  id,
  title,
  severity,
  (severity::float / (1 + POWER(
    ST_Distance(location, ST_MakePoint(-122.4194, 37.7749)::geography) / 500,
    2
  ))) as relevance_score
FROM emergency_events
WHERE status = 'active'
ORDER BY relevance_score DESC;
```

### Buffer Zone Queries

```sql
-- Find all emergencies within buffer zone
SELECT *
FROM emergency_events
WHERE ST_Contains(
  ST_Buffer(
    ST_MakePoint(-122.4194, 37.7749)::geography,
    2000 -- 2km buffer
  )::geometry,
  location::geometry
);
```

## Performance Tuning

### Index Strategy

```sql
-- Spatial index (required for location queries)
CREATE INDEX idx_emergency_events_location
ON emergency_events USING GIST (location);

-- Composite index for common filters
CREATE INDEX idx_emergency_events_status_created
ON emergency_events(status, created_at DESC);

-- Partial index for active events only
CREATE INDEX idx_emergency_events_active
ON emergency_events(created_at DESC)
WHERE status = 'active';
```

### Query Optimization Tips

1. **Use ST_DWithin** instead of ST_Distance for radius queries
2. **Add LIMIT** to prevent large result sets
3. **Use EXPLAIN ANALYZE** to identify bottlenecks
4. **Create covering indexes** for frequently accessed columns
5. **Use materialized views** for complex aggregations

### Monitoring Queries

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries (>100ms)
SELECT
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Connection Pooling

For production, use connection pooling via Supabase:

```typescript
// Use transaction pooler for serverless
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: { schema: 'public' },
    global: {
      headers: { 'x-supabase-db-connection': 'transaction' }
    }
  }
)
```

## Common Operations

### Create Emergency Event

```sql
INSERT INTO emergency_events (
  type_id,
  reporter_id,
  title,
  description,
  location,
  radius_meters,
  severity
) VALUES (
  1,
  'user-uuid',
  'Building Fire',
  'Large fire reported',
  ST_MakePoint(-122.4194, 37.7749)::geography,
  500,
  4
);
```

### Update User Location

```sql
UPDATE user_profiles
SET
  last_known_location = ST_MakePoint(-122.4194, 37.7749)::geography,
  updated_at = NOW()
WHERE user_id = 'user-uuid';
```

### Calculate Trust Score

```sql
SELECT calculate_trust_score('user-uuid');
```

## Backup and Recovery

```bash
# Create backup
supabase db dump --data-only > backup-$(date +%Y%m%d).sql

# Restore from backup
supabase db restore backup-20240115.sql

# Point-in-time recovery (Supabase Pro)
# Available through Supabase Dashboard
```

## Related Documentation

- [API Endpoints](../api/README.md) - REST API documentation
- [Deployment Guide](../deployment/README.md) - Database deployment
- [Sentry Setup](../monitoring/SENTRY_SETUP.md) - Error monitoring
