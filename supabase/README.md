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
├── migrations/                  # Database migration files
│   ├── 20240101000001_initial_schema.sql
│   ├── 20240101000002_performance_indexes.sql
│   ├── 20240101000003_database_views.sql
│   ├── 20240101000004_database_functions.sql
│   ├── 20240101000005_rls_policies.sql
│   ├── 20240101000006_database_triggers.sql
│   └── 20240101000007_cleanup_functions.sql
├── seed.sql                     # Initial data seeding
└── README.md                    # This file
```

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
- **user_push_tokens**: Push notification device tokens

#### System Management
- **audit_log**: Complete audit trail
- **system_metrics**: Performance and usage metrics
- **user_mutes**: User muting functionality

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