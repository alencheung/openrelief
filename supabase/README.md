# OpenRelief Database Setup

This directory contains the complete Supabase database schema and configuration for the OpenRelief emergency response system.

## Overview

The OpenRelief database uses PostgreSQL 15+ with PostGIS 3.3+ for spatial data handling. It includes:

- **Trust System**: Weighted voting and reputation management
- **Spatial Queries**: Location-based emergency detection and alerts
- **Real-time Notifications**: Multi-channel notification system
- **Audit Trail**: Complete logging for compliance and security
- **Performance Optimization**: Comprehensive indexing strategy
- **Data Privacy**: Row Level Security and data anonymization

## File Structure

```
supabase/
├── config.toml                 # Supabase configuration
├── migrations/                  # Database migration files (24 total — see below)
├── seed.sql                     # Initial data seeding
└── README.md                    # This file
```

### Migrations (in order)

| Date | Migration | Purpose |
| --- | --- | --- |
| 2023-12-05 | `20231205_enhanced_audit_system.sql` | Enhanced audit logging |
| 2024-01-01 | `20240101000001_initial_schema.sql` | Core tables (`user_profiles`, `emergency_events`, etc.) |
| 2024-01-01 | `20240101000002_performance_indexes.sql` | Spatial + composite indexes |
| 2024-01-01 | `20240101000003_database_views.sql` | Database views |
| 2024-01-01 | `20240101000004_database_functions.sql` | Trust/consensus/dispatch functions |
| 2024-01-01 | `20240101000005_rls_policies.sql` | Row Level Security policies |
| 2024-01-01 | `20240101000006_database_triggers.sql` | Trust/consensus/audit triggers |
| 2024-01-01 | `20240101000007_cleanup_functions.sql` | Expired-event cleanup |
| 2024-01-01 | `20240101000008_privacy_features.sql` | Privacy tables (settings, budget, audit) |
| 2024-01-15 | `20240115000009_production_optimizations.sql` | Production tuning |
| 2024-01-15 | `20240115000010_spatial_functions.sql` | Spatial dispatch functions |
| 2024-01-15 | `20240115000011_spatial_indexes.sql` | Spatial index tuning |
| 2024-01-16 | `20240116000001_push_subscriptions.sql` | Web Push token storage |
| 2024-01-17 | `20240117000001_user_onboarding_and_trust.sql` | Onboarding + trust integration |
| 2024-06-20 | `20240620000001_batched_consensus.sql` | Queue-based consensus work |
| 2024-06-20 | `20240620000002_rls_no_geography.sql` | RLS without geography dep |
| 2024-06-20 | `20240620000003_pooling_partitioning.sql` | Pooling + notification partitioning |
| 2024-06-20 | `20240620000004_incremental_sybil.sql` | Incremental Sybil detection |
| 2024-06-22 | `20240622000002_privacy_settings_extended.sql` | Extended privacy settings |
| 2024-06-22 | `20240622000003_user_legal_requests.sql` | Legal data-request handling |
| 2024-06-22 | `20240622000004_notification_dispatch_schedule.sql` | Notification dispatch scheduling |
| 2024-06-22 | `20240622000005_user_roles.sql` | User roles |
| 2024-06-23 | `20240623000000_enable_rls_consensus_trust_work.sql` | RLS on consensus/trust work tables |
| 2024-06-24 | `20240624000000_enable_rls_audit_tables.sql` | RLS on audit tables |

## Database Schema

### Core Tables

#### User Management
- **user_profiles**: User accounts with trust scores and location data
- **user_trust_history**: Historical trust score changes
- **user_subscriptions**: Emergency type subscriptions
- **user_notification_settings**: Per-topic notification preferences

#### Emergency Management
- **emergency_types**: Configurable emergency categories
- **emergency_events**: Main emergency event records
- **event_confirmations**: User confirmations/disputes for events

#### Notification System
- **notification_queue**: Queued notifications for delivery
- **push_subscriptions**: Web Push subscriptions (`endpoint`, `p256dh`, `auth`)
- **user_notification_settings**: Per-topic severity/distance/quiet-hours prefs

#### System Management
- **audit_log**: Complete audit trail
- **system_metrics**: Performance and usage metrics

> **Note:** There is no `user_push_tokens` or `user_mutes` table. Push tokens
> live in `push_subscriptions` (Web Push / VAPID, not FCM), and muting is
> expressed through `user_notification_settings.is_enabled` plus quiet-hours
> windows. (The legacy `get_users_for_alert_dispatch` SQL still references
> `user_push_tokens` — see [database/schema.md](../docs/database/schema.md) for
> that known debt.)

### Key Features

#### Trust Scoring System
- Dynamic trust score calculation based on user accuracy
- Time-decay factors for recent activity
- Weighted voting for event consensus
- Historical tracking of trust changes

#### Spatial Operations
- PostGIS integration for location-based queries
- Efficient radius searches with GIST indexes
- Distance-based relevance scoring
- Geographic hotspot detection

#### Security & Privacy
- Row Level Security (RLS) on all user data
- Location data anonymization over time
- Audit logging for all operations
- Service role separation for admin functions

## Setup Instructions

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local development:
```bash
supabase start
```

### Database Migration

1. Apply all migrations:
```bash
supabase db push
```

2. Seed initial data:
```bash
supabase db seed
```

### Development Workflow

1. Create new migration:
```bash
supabase migration new new_feature_name
```

2. Apply changes:
```bash
supabase db push
```

3. Generate TypeScript types:
```bash
npm run db:generate
```

## Key Functions

### Trust Score Calculation
```sql
SELECT calculate_trust_score('user-uuid');
```

### Event Consensus
```sql
SELECT calculate_event_consensus('event-uuid');
```

### Spatial Alert Dispatch
```sql
SELECT * FROM get_users_for_alert_dispatch('event-uuid', 10000);
```

## Views

### Active Emergency Events
```sql
SELECT * FROM active_emergency_events;
```

### User Trust Scores
```sql
SELECT * FROM user_trust_scores;
```

### System Health
```sql
SELECT * FROM system_health_check();
```

## Performance Optimization

### Indexes
- Spatial GIST indexes on all location columns
- Composite indexes for common query patterns
- Partial indexes for filtered subsets
- Expression indexes for computed values

### Query Optimization
- Use `ST_DWithin` for radius-based filtering
- Implement pagination with indexed ordering
- Materialized views for complex aggregations

## Security Policies

### Row Level Security
- Users can only access their own data
- Location-based access for emergency events
- Service role privileges for admin operations
- Anonymous access to public emergency types

### Data Privacy
- Automatic location precision reduction over time
- Complete location removal after 30 days
- Audit logging for all data access
- Configurable privacy settings

## Monitoring & Maintenance

### Automated Cleanup
- Daily cleanup of expired events
- Location anonymization every 6 hours
- Failed notification cleanup hourly
- Database optimization weekly

### Health Monitoring
- System health checks every 5 minutes
- Performance metrics collection
- Error tracking and alerting
- Resource usage monitoring

## Testing

### Local Testing
```bash
# Reset database
supabase db reset

# Apply migrations
supabase db push

# Seed test data
supabase db seed

# Start development server
npm run dev
```

### Performance Testing
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Analyze table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public';
```

## Deployment

### Production Setup
1. Link to production project:
```bash
supabase link --project-ref your-project-ref
```

2. Deploy migrations:
```bash
supabase db push
```

3. Seed production data:
```bash
supabase db seed --remote
```

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

### Common Issues

1. **Migration Conflicts**
   - Use `supabase db reset` to clean state
   - Check migration order and dependencies

2. **Performance Issues**
   - Verify spatial indexes are created
   - Check query execution plans
   - Monitor connection pooling

3. **Permission Errors**
   - Verify RLS policies are correctly configured
   - Check service role permissions
   - Validate user authentication

### Debug Commands
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Verify indexes
SELECT * FROM pg_indexes WHERE tablename = 'table_name';

-- Check function permissions
SELECT proname, proacl FROM pg_proc WHERE proname = 'function_name';
```

## Contributing

When modifying the database schema:

1. Create descriptive migration files
2. Update TypeScript types with `npm run db:generate`
3. Test with sample data
4. Document security implications
5. Update this README if needed

## Support

For database-related issues:
- Check Supabase documentation: https://supabase.com/docs
- Review PostgreSQL docs: https://www.postgresql.org/docs/
- PostGIS reference: https://postgis.net/docs/

## License

This database schema is part of the OpenRelief project and follows the project's license terms.