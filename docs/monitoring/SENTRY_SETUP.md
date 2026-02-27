# Sentry Integration Guide

## Overview

This project has Sentry monitoring integrated for production error tracking and
performance monitoring.

## Installation

Install the required package:

```bash
npm install @sentry/nextjs
```

## Environment Variables

Add these variables to your `.env.local` file:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_ENVIRONMENT=production
```

### Getting Sentry Credentials

1. **Create a Sentry account** at https://sentry.io
2. **Create a new Next.js project** in Sentry
3. **Copy the DSN** from Project Settings → Client Keys
4. **Generate an auth token** from Account Settings → Auth Tokens
5. **Find your org and project slugs** in the URL when viewing your project

## Files Created

### Core Files

- `src/lib/monitoring/sentry.ts` - Main Sentry utilities and initialization
- `src/lib/monitoring/index.ts` - Export barrel file
- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration

### Modified Files

- `src/app/layout.tsx` - Initializes Sentry on app startup
- `next.config.js` - Added Sentry webpack plugin for source maps
- `.env.example` - Updated with Sentry environment variables

## Usage Examples

### Capturing Errors

```typescript
import { captureEmergencyError, captureSyncError } from '@/lib/monitoring'

try {
  await syncEmergencyData()
} catch (error) {
  captureSyncError(error as Error, {
    emergencyId: emergency.id,
    syncType: 'full',
    lastSync: lastSyncTime
  })
}
```

### Setting User Context

```typescript
import { setUserContext, clearUserContext } from '@/lib/monitoring'

// On login
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role
})

// On logout
clearUserContext()
```

### Adding Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/monitoring'

addBreadcrumb('Emergency created', 'emergency', {
  emergencyId: newEmergency.id,
  type: newEmergency.type
})
```

### Available Error Capture Functions

- `captureEmergencyError(error, context)` - Emergency-related errors
- `captureTrustError(error, context)` - Trust system errors
- `captureConsensusError(error, context)` - Consensus engine errors
- `captureSyncError(error, context)` - Data synchronization errors
- `captureMapError(error, context)` - Map rendering/interaction errors
- `captureOfflineError(error, context)` - Offline functionality errors

## Features Configured

### Performance Monitoring

- **Traces Sample Rate**: 10% (0.1)
- **Replays Session Sample Rate**: 10% (0.1)
- **Replays on Error**: 100% (1.0) - All errors include session replay

### Source Maps

Sentry webpack plugin is configured to:

- Upload source maps automatically during builds
- Hide source maps in production (they're only in Sentry)
- Enable Vercel monitors integration

### Security Headers

CSP headers have been updated to allow:

- `https://browser.sentry-cdn.com` for scripts
- `https://o*.ingest.sentry.io` for connections

## Graceful Degradation

The integration handles missing DSN gracefully:

- If `NEXT_PUBLIC_SENTRY_DSN` is not set, Sentry won't initialize
- All helper functions check for initialization before capturing
- No errors will be thrown if Sentry is disabled

## Testing Locally

1. Add your Sentry DSN to `.env.local`
2. Run `npm run build && npm run start`
3. Trigger an error to verify it appears in Sentry

## Production Deployment

The integration is production-ready. Ensure these secrets are set in your
deployment platform:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_ENVIRONMENT` (e.g., "production", "staging")
