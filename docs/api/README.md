# API Documentation

RESTful API built on Supabase with PostgreSQL backend and Edge Functions.

## Quick Links

- [Endpoints Reference](./endpoints.md) - Complete API documentation

## Authentication

Uses Supabase Auth with JWT tokens:

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

All requests require Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Base URLs

| Environment | Base URL                                          |
| ----------- | ------------------------------------------------- |
| Local       | `http://localhost:54321/rest/v1/`                 |
| Staging     | `https://staging.openrelief.supabase.co/rest/v1/` |
| Production  | `https://openrelief.supabase.co/rest/v1/`         |

## Core Endpoints

### Emergency Events

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| GET    | `/emergency_events`            | List events (with filters) |
| POST   | `/emergency_events`            | Create new event           |
| PATCH  | `/emergency_events?id=eq.{id}` | Update event               |
| GET    | `/emergency_events?id=eq.{id}` | Get single event           |

### User Management

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| GET    | `/user_profiles` | Get current user profile |
| PATCH  | `/user_profiles` | Update profile           |
| PATCH  | `/user_profiles` | Update location          |

### Confirmations

| Method | Endpoint                                | Description           |
| ------ | --------------------------------------- | --------------------- |
| POST   | `/event_confirmations`                  | Confirm/dispute event |
| GET    | `/event_confirmations?event_id=eq.{id}` | List confirmations    |

## Error Codes

| Code                   | Status | Description              |
| ---------------------- | ------ | ------------------------ |
| `VALIDATION_ERROR`     | 400    | Invalid request data     |
| `AUTHENTICATION_ERROR` | 401    | Invalid/expired token    |
| `AUTHORIZATION_ERROR`  | 403    | Insufficient permissions |
| `NOT_FOUND`            | 404    | Resource not found       |
| `CONFLICT`             | 409    | Duplicate resource       |
| `RATE_LIMIT_EXCEEDED`  | 429    | Too many requests        |

## Rate Limits

| Endpoint                  | Limit | Window |
| ------------------------- | ----- | ------ |
| POST /emergency_events    | 10    | 1 hour |
| POST /event_confirmations | 50    | 1 hour |
| GET /emergency_events     | 1000  | 1 hour |

## Real-time Subscriptions

```typescript
supabase
  .channel('emergency-events')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'emergency_events' },
    payload => console.log(payload)
  )
  .subscribe()
```

## Resources

- [Full Endpoints Documentation](./endpoints.md)
- [Supabase API Reference](https://supabase.com/docs/reference/javascript)
- [Database Schema](../database/README.md)
