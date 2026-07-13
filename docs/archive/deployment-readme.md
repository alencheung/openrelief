# Deployment Documentation

Serverless architecture on Vercel + Supabase + Cloudflare.

## Quick Links

- [Deployment Guide](./deployment-guide.md) - Complete deployment reference
- [Community Deployment Guide](./COMMUNITY_DEPLOYMENT_GUIDE.md) - Community
  setup

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Supabase   │────▶│  PostgreSQL │
│  (Frontend) │     │   (Backend)  │     │  + PostGIS  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│  Cloudflare │     │    Edge      │
│     CDN     │     │  Functions   │
└─────────────┘     └──────────────┘
```

## Environments

| Environment | Branch  | URL                      |
| ----------- | ------- | ------------------------ |
| Development | local   | `localhost:3000`         |
| Staging     | develop | `staging.openrelief.org` |
| Production  | main    | `openrelief.org`         |

## Deployment Checklist

### Pre-deployment

- [ ] All tests pass (`npm run test`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Lint check passes (`npm run lint`)
- [ ] Environment variables configured
- [ ] Database migrations ready

### Deploy Frontend (Vercel)

```bash
vercel --prod
```

### Deploy Database (Supabase)

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Deploy Edge Functions

```bash
wrangler deploy --env production
```

## Required Environment Variables

| Variable                        | Required | Description          |
| ------------------------------- | -------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Public anon key      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Service role key     |
| `NEXT_PUBLIC_MAPTILER_API_KEY`  | Yes      | MapTiler API key     |
| `SENTRY_DSN`                    | No       | Error monitoring     |
| `FCM_SERVER_KEY`                | No       | Push notifications   |

## CI/CD Pipeline

GitHub Actions workflow runs on push to main/develop:

1. **Test** - Unit tests, E2E tests, type check
2. **Deploy Staging** - On develop branch
3. **Deploy Production** - On main branch

### Required GitHub Secrets

- `VERCEL_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`

## Monitoring

### Application Monitoring

Sentry integration for error tracking:

```typescript
import { captureEmergencyError } from '@/lib/monitoring'
captureEmergencyError(error, { eventId: '123' })
```

### Database Monitoring

```sql
-- Check slow queries
SELECT query, mean_time FROM pg_stat_statements
WHERE mean_time > 100 ORDER BY mean_time DESC;
```

## Rollback

### Frontend

```bash
vercel rollback --to <deployment-url>
```

### Database

```bash
supabase db restore backup-<date>.sql
```

## Resources

- [Full Deployment Guide](./deployment-guide.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
