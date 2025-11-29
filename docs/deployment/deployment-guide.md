# Deployment Guide

## Overview

This guide covers the complete deployment process for OpenRelief v2.0 across different environments. The platform uses a modern, serverless architecture with multiple components that need to be deployed and configured correctly.

## Architecture Overview

```mermaid
graph TB
    subgraph "Development"
        A[Local Development]
        B[Local Supabase]
        C[Local Edge Functions]
    end
    
    subgraph "Staging"
        D[Vercel Preview]
        E[Supabase Staging]
        F[Cloudflare Workers Staging]
    end
    
    subgraph "Production"
        G[Vercel Production]
        H[Supabase Production]
        I[Cloudflare Workers Production]
        J[Cloudflare CDN]
    end
    
    A --> D --> G
    B --> E --> H
    C --> F --> I
    G --> J
```

## Environments

### 1. Development Environment

**Purpose**: Local development and testing
**Access**: Local machine only
**Data**: Mock/sample data

### 2. Staging Environment

**Purpose**: Integration testing and QA
**Access**: Team members only
**Data**: Anonymized production-like data

### 3. Production Environment

**Purpose**: Live user traffic
**Access**: Public users
**Data**: Real user data

## Prerequisites

### Required Accounts

1. **Vercel**: For frontend hosting
   - Account: vercel.com
   - Plan: Pro (for custom domains and advanced features)

2. **Supabase**: For backend services
   - Account: supabase.com
   - Plan: Pro (for production)

3. **Cloudflare**: For CDN and edge functions
   - Account: cloudflare.com
   - Plan: Pro (for advanced features)

4. **GitHub**: For CI/CD and repository
   - Account: github.com
   - Organization: openrelief

### Required Tools

```bash
# Node.js 18+
node --version

# Supabase CLI
npm install -g supabase

# Vercel CLI
npm install -g vercel

# Cloudflare Wrangler
npm install -g wrangler

# Git
git --version
```

## Environment Configuration

### Environment Variables

#### Development (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Edge Functions
EDGE_FUNCTION_URL=http://localhost:54321/functions/v1

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=your-maptiler-key
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json

# Notifications (Development)
FCM_SERVER_KEY=your-fcm-key
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn

# AI/ML
OPENAI_API_KEY=your-openai-key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_OFFLINE_SYNC=true
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

#### Staging (.env.staging)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://staging.openrelief.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-key

# Edge Functions
EDGE_FUNCTION_URL=https://staging.openrelief.supabase.co/functions/v1

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=staging-maptiler-key
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json

# Notifications
FCM_SERVER_KEY=staging-fcm-key
APNS_KEY_ID=staging-apns-key-id
APNS_TEAM_ID=staging-apple-team-id

# Monitoring
SENTRY_DSN=staging-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=staging-public-sentry-dsn

# AI/ML
OPENAI_API_KEY=staging-openai-key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_OFFLINE_SYNC=true
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

#### Production (.env.production)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://openrelief.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-key

# Edge Functions
EDGE_FUNCTION_URL=https://openrelief.supabase.co/functions/v1

# Maps
NEXT_PUBLIC_MAPTILER_API_KEY=production-maptiler-key
NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json

# Notifications
FCM_SERVER_KEY=production-fcm-key
APNS_KEY_ID=production-apns-key-id
APNS_TEAM_ID=production-apple-team-id

# Monitoring
SENTRY_DSN=production-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=production-public-sentry-dsn

# AI/ML
OPENAI_API_KEY=production-openai-key

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_OFFLINE_SYNC=true
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

## Local Development Setup

### 1. Repository Setup

```bash
# Clone repository
git clone https://github.com/openrelief/openrelief.git
cd openrelief

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Supabase Local Setup

```bash
# Start local Supabase
supabase start

# This will start:
# - PostgreSQL database (port 54322)
# - Supabase API (port 54321)
# - Supabase Studio (port 54323)
# - Kong API Gateway (port 54324)
# - Inbucket (port 54325)

# Apply database migrations
supabase db push

# Seed database with sample data
supabase db seed
```

### 3. Frontend Development Server

```bash
# Start development server
npm run dev

# This will start Next.js on http://localhost:3000
# with hot reload and TypeScript checking
```

### 4. Edge Functions Development

```bash
# Start edge functions in development
supabase functions serve

# This will serve edge functions on:
# http://localhost:54321/functions/v1/
```

## Database Deployment

### 1. Supabase Project Setup

```bash
# Login to Supabase CLI
supabase login

# Link to existing project
supabase link --project-ref your-project-ref

# Create new project
supabase projects create
```

### 2. Database Migration

```bash
# Push local schema to remote
supabase db push

# Generate migration files
supabase db diff --use-migra

# Apply specific migration
supabase migration up 20240115000001_initial_schema.sql
```

### 3. Database Seeding

```bash
# Seed production with initial data
supabase db seed --remote

# Custom seeding script
supabase db seed --file scripts/seed-production.sql
```

### 4. Row Level Security Setup

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Apply RLS policies
-- (See docs/database/schema.md for complete policies)
```

## Frontend Deployment

### 1. Vercel Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to existing project
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 2. Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "name": "openrelief",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "build": {
    "env": {
      "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
    }
  },
  "functions": {
    "src": "supabase/functions/**/*.ts"
  },
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 3. Custom Domain Setup

```bash
# Add custom domain in Vercel
vercel domains add openrelief.org

# Configure DNS records
# A record: @ -> 76.76.19.61
# CNAME record: www -> cname.vercel-dns.com
```

## Edge Functions Deployment

### 1. Cloudflare Workers Setup

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create worker
wrangler deploy --name openrelief-edge

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### 2. Edge Function Configuration

```toml
# wrangler.toml
name = "openrelief-edge"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[env.staging]
name = "openrelief-edge-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "openrelief-edge-production"
vars = { ENVIRONMENT = "production" }

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

### 3. Edge Function Code

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Route handling
    if (url.pathname.startsWith('/api/alerts')) {
      return handleAlertDispatch(request, env);
    }
    
    if (url.pathname.startsWith('/api/trust')) {
      return handleTrustCalculation(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleAlertDispatch(request: Request, env: Env): Promise<Response> {
  // Alert dispatch logic
  const data = await request.json();
  
  // Process alert dispatch
  const result = await dispatchAlert(data, env);
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Staging)
        run: vercel --token ${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Edge Functions (Staging)
        run: wrangler deploy --env staging

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Production)
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Edge Functions (Production)
        run: wrangler deploy --env production
      
      - name: Deploy Database Changes
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push
```

### 2. Environment-Specific Workflows

```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  workflow_dispatch:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_STAGING_REF }}
          supabase db push
      
      - name: Deploy to Vercel
        run: vercel --token ${{ secrets.VERCEL_TOKEN }}
```

## Monitoring and Logging

### 1. Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Performance monitoring
export const reportWebVitals = (metric: any) => {
  Sentry.addBreadcrumb({
    message: `Web Vital: ${metric.name}`,
    level: 'info',
    data: {
      value: metric.value,
      id: metric.id,
    },
  });
};
```

### 2. Database Monitoring

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Monitor slow queries
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

### 3. Edge Function Monitoring

```typescript
// src/monitoring.ts
export function withMonitoring(handler: Function): Function {
  return async (request: Request, env: Env, ctx: ExecutionContext) => {
    const start = Date.now();
    
    try {
      const response = await handler(request, env, ctx);
      
      // Log success metrics
      console.log({
        event: 'function_success',
        duration: Date.now() - start,
        status: response.status,
        path: new URL(request.url).pathname,
      });
      
      return response;
    } catch (error) {
      // Log error metrics
      console.log({
        event: 'function_error',
        duration: Date.now() - start,
        error: error.message,
        path: new URL(request.url).pathname,
      });
      
      throw error;
    }
  };
}
```

## Security Configuration

### 1. Environment Security

```bash
# Secure environment variables
# Use GitHub Secrets for sensitive data
# Never commit .env files to repository
# Rotate keys regularly

# Database security
# Enable SSL/TLS
# Use connection pooling
# Implement IP whitelisting
```

### 2. API Security

```typescript
// lib/security.ts
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
};
```

### 3. Database Security

```sql
-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(auth.uid(), NULL),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Backup and Recovery

### 1. Database Backups

```bash
# Automated daily backups
supabase db dump --data-only > backup-$(date +%Y%m%d).sql

# Point-in-time recovery
supabase db restore --timestamp "2024-01-15 10:30:00"

# Backup verification
supabase db restore --dry-run backup-20240115.sql
```

### 2. Asset Backups

```bash
# Backup static assets
aws s3 sync s3://openrelief-assets/ ./backups/assets/

# Backup user uploads
aws s3 sync s3://openrelief-uploads/ ./backups/uploads/
```

### 3. Configuration Backups

```bash
# Backup environment configurations
vercel env pull .env.backup
wrangler secret list > wrangler-secrets.txt
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
supabase status

# Reset local database
supabase db reset

# Check connection string
echo $DATABASE_URL
```

#### 2. Edge Function Issues

```bash
# Check function logs
wrangler tail

# Test function locally
wrangler dev

# Clear cache
wrangler cache purge
```

#### 3. Frontend Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Performance Issues

#### 1. Slow Database Queries

```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements 
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes;
```

#### 2. Slow Edge Functions

```typescript
// Add performance monitoring
export function withPerformanceMonitoring(handler: Function): Function {
  return async (request: Request, env: Env, ctx: ExecutionContext) => {
    const start = performance.now();
    
    const response = await handler(request, env, ctx);
    
    const duration = performance.now() - start;
    
    if (duration > 100) {
      console.warn(`Slow function: ${duration}ms`);
    }
    
    return response;
  };
}
```

## Rollback Procedures

### 1. Frontend Rollback

```bash
# Rollback to previous deployment
vercel rollback

# Rollback to specific deployment
vercel rollback --to <deployment-url>
```

### 2. Database Rollback

```bash
# Rollback migration
supabase migration down 20240115000001_initial_schema.sql

# Restore from backup
supabase db restore backup-20240115.sql
```

### 3. Edge Function Rollback

```bash
# Rollback to previous version
wrangler rollback

# Deploy previous version
wrangler deploy --compatibility-date 2024-01-01
```

---

*This deployment guide will be updated as the platform evolves and new deployment requirements emerge.*