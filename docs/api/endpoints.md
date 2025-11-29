# API Documentation

## Overview

OpenRelief API is built on Supabase with PostgreSQL backend and Edge Functions for compute-intensive operations. The API follows RESTful principles and includes real-time subscriptions via WebSocket connections.

## Authentication

### Authentication Methods

OpenRelief uses Supabase Auth with multiple authentication methods:

```typescript
// Email/Password Authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// OAuth Providers
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // 'github', 'apple', etc.
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});

// Phone Authentication
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890'
});
```

### JWT Token Structure

```typescript
interface JWTPayload {
  aud: string;          // Audience
  exp: number;          // Expiration time
  sub: string;          // User ID
  email: string;        // User email
  role: string;         // User role
  user_metadata: object; // Additional user data
  app_metadata: object;  // Application metadata
}
```

## API Endpoints

### 1. User Management

#### 1.1 Get User Profile

```http
GET /rest/v1/user_profiles
Authorization: Bearer <jwt_token>
Accept: application/json
```

**Response:**
```json
{
  "user_id": "uuid",
  "trust_score": 0.85,
  "last_known_location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "active_session_start": "2024-01-15T10:30:00Z",
  "notification_preferences": {
    "push_enabled": true,
    "email_enabled": false,
    "quiet_hours": {
      "start": "22:00",
      "end": "07:00"
    }
  },
  "privacy_settings": {
    "location_sharing": true,
    "profile_visibility": "public"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 1.2 Update User Profile

```http
PATCH /rest/v1/user_profiles
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "notification_preferences": {
    "push_enabled": true,
    "email_enabled": true
  },
  "privacy_settings": {
    "location_sharing": true
  }
}
```

#### 1.3 Update User Location

```http
PATCH /rest/v1/user_profiles
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "last_known_location": "SRID=4326;POINT(-122.4194 37.7749)"
}
```

### 2. Emergency Events

#### 2.1 Create Emergency Event

```http
POST /rest/v1/emergency_events
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type_id": 1,
  "title": "Building Fire",
  "description": "Large fire in residential building",
  "location": "SRID=4326;POINT(-122.4194 37.7749)",
  "radius_meters": 500,
  "severity": 4,
  "metadata": {
    "building_type": "residential",
    "estimated_people": 50,
    "fire_department_notified": true
  }
}
```

**Response:**
```json
{
  "id": "event-uuid",
  "type_id": 1,
  "reporter_id": "user-uuid",
  "title": "Building Fire",
  "description": "Large fire in residential building",
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "radius_meters": 500,
  "severity": 4,
  "status": "pending",
  "trust_weight": 0.1,
  "confirmation_count": 0,
  "dispute_count": 0,
  "metadata": {
    "building_type": "residential",
    "estimated_people": 50
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

#### 2.2 Get Nearby Emergency Events

```http
GET /rest/v1/emergency_events?select=*&location=within.1000,SRID=4326;POINT(-122.4194 37.7749)&status=eq.active&order=created_at.desc
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "event-uuid",
    "type_id": 1,
    "title": "Building Fire",
    "severity": 4,
    "status": "active",
    "location": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    },
    "distance": 250.5,
    "relevance_score": 3.2,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### 2.3 Confirm Emergency Event

```http
POST /rest/v1/event_confirmations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "event_id": "event-uuid",
  "confirmation_type": "confirm",
  "location": "SRID=4326;POINT(-122.4195 37.7748)",
  "trust_weight": 0.85
}
```

#### 2.4 Get Event Details

```http
GET /rest/v1/emergency_events?id=eq.{event_id}&select=*,emergency_types(*),user_profiles!reporter_id(username,trust_score)
Authorization: Bearer <jwt_token>
```

### 3. Emergency Types

#### 3.1 Get All Emergency Types

```http
GET /rest/v1/emergency_types?is_active=eq.true&order=name
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "slug": "fire",
    "name": "Fire",
    "description": "Fire-related emergencies",
    "icon": "flame",
    "color": "#FF4444",
    "default_radius": 500,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "slug": "medical",
    "name": "Medical",
    "description": "Medical emergencies",
    "icon": "medical",
    "color": "#FF69B4",
    "default_radius": 300,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 4. User Subscriptions

#### 4.1 Get User Subscriptions

```http
GET /rest/v1/user_subscriptions?user_id=eq.{user_id}&select=*,emergency_types(*)
Authorization: Bearer <jwt_token>
```

#### 4.2 Subscribe to Emergency Type

```http
POST /rest/v1/user_subscriptions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "topic_id": 1,
  "notification_radius": 10000,
  "is_active": true
}
```

#### 4.3 Update Subscription

```http
PATCH /rest/v1/user_subscriptions?user_id=eq.{user_id}&topic_id=eq.{topic_id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "notification_radius": 5000,
  "is_active": false
}
```

### 5. Trust System

#### 5.1 Get Trust Score

```http
GET /rest/v1/user_profiles?user_id=eq.{user_id}&select=trust_score,updated_at
Authorization: Bearer <jwt_token>
```

#### 5.2 Get Trust History

```http
GET /rest/v1/user_trust_history?user_id=eq.{user_id}&order=created_at.desc&limit=50
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "history-uuid",
    "user_id": "user-uuid",
    "event_id": "event-uuid",
    "action_type": "confirm",
    "trust_change": 0.05,
    "previous_score": 0.80,
    "new_score": 0.85,
    "reason": "Confirmed accurate emergency report",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

## Edge Functions

### 1. Alert Dispatch

#### 1.1 Trigger Alert Dispatch

```http
POST /functions/v1/dispatch-alert
Authorization: Bearer <service_role_jwt>
Content-Type: application/json

{
  "event_id": "event-uuid",
  "max_distance": 10000,
  "min_relevance": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "users_notified": 127,
  "notifications_queued": 127,
  "processing_time_ms": 45
}
```

#### 1.2 Get Users for Alert

```http
POST /functions/v1/get-target-users
Authorization: Bearer <service_role_jwt>
Content-Type: application/json

{
  "event_id": "event-uuid",
  "max_distance": 10000,
  "filters": {
    "min_trust_score": 0.1,
    "active_subscriptions_only": true
  }
}
```

### 2. Trust Calculation

#### 2.1 Calculate Trust Score

```http
POST /functions/v1/calculate-trust
Authorization: Bearer <service_role_jwt>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "event_type": "fire",
  "include_history": true
}
```

**Response:**
```json
{
  "trust_score": 0.85,
  "components": {
    "base_score": 0.1,
    "accuracy_bonus": 0.15,
    "recency_multiplier": 1.2,
    "final_score": 0.85
  },
  "history_summary": {
    "total_reports": 12,
    "confirmed_reports": 10,
    "disputed_reports": 2,
    "accuracy_rate": 0.83
  }
}
```

### 3. Text Classification

#### 3.1 Classify Emergency Text

```http
POST /functions/v1/classify-text
Authorization: Bearer <service_role_jwt>
Content-Type: application/json

{
  "text": "There's a big fire in the apartment building on Main Street",
  "context": {
    "location": "Main Street",
    "user_trust_score": 0.75
  }
}
```

**Response:**
```json
{
  "classification": {
    "emergency_type": "fire",
    "confidence": 0.92,
    "severity": 4,
    "extracted_entities": {
      "location": "Main Street",
      "building_type": "apartment",
      "urgency": "high"
    }
  },
  "suggestions": {
    "recommended_radius": 500,
    "additional_questions": [
      "How many people are affected?",
      "Is the fire department notified?"
    ]
  }
}
```

## Real-time Subscriptions

### WebSocket Connection

```typescript
import { RealtimeChannel } from '@supabase/supabase-js';

// Subscribe to emergency events in area
const emergencyChannel = supabase
  .channel('emergency-events')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'emergency_events',
      filter: 'location=within.10000,SRID=4326;POINT(-122.4194 37.7749)'
    },
    (payload) => {
      console.log('Emergency event change:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          handleNewEmergency(payload.new);
          break;
        case 'UPDATE':
          handleEmergencyUpdate(payload.new);
          break;
        case 'DELETE':
          handleEmergencyDelete(payload.old);
          break;
      }
    }
  )
  .subscribe();

// Subscribe to trust score changes
const trustChannel = supabase
  .channel('trust-scores')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_profiles',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Trust score updated:', payload.new.trust_score);
      updateTrustDisplay(payload.new.trust_score);
    }
  )
  .subscribe();
```

### Channel Events

#### Emergency Events Channel

```typescript
interface EmergencyEventPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: EmergencyEvent;
  old?: EmergencyEvent;
  errors?: any[];
}

interface EmergencyEvent {
  id: string;
  type_id: number;
  title: string;
  description: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  severity: number;
  status: 'pending' | 'active' | 'resolved' | 'expired';
  trust_weight: number;
  confirmation_count: number;
  dispute_count: number;
  created_at: string;
  updated_at: string;
}
```

#### Trust Score Channel

```typescript
interface TrustScorePayload {
  eventType: 'UPDATE';
  new: {
    user_id: string;
    trust_score: number;
    updated_at: string;
  };
  old: {
    user_id: string;
    trust_score: number;
    updated_at: string;
  };
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid location format",
    "details": {
      "field": "location",
      "expected_format": "SRID=4326;POINT(longitude latitude)",
      "received": "invalid-format"
    },
    "request_id": "req-uuid"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|-------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|--------|--------|
| POST /emergency_events | 10/hour | 1 hour |
| POST /event_confirmations | 50/hour | 1 hour |
| PATCH /user_profiles | 100/hour | 1 hour |
| GET /emergency_events | 1000/hour | 1 hour |
| Edge Functions | 1000/hour | 1 hour |

## Caching

### Cache Headers

```http
Cache-Control: public, max-age=300
ETag: "event-uuid-v1"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

### Cache Strategies

- **Emergency Events**: 5 minutes cache for active events
- **Emergency Types**: 24 hours cache (rarely changes)
- **User Profiles**: 1 minute cache for public data
- **Static Assets**: 1 year cache with versioning

## SDK Examples

### JavaScript/TypeScript

```typescript
import { OpenReliefClient } from '@openrelief/client';

const client = new OpenReliefClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY,
});

// Report emergency
const event = await client.emergencies.create({
  type_id: 1,
  title: "Fire reported",
  description: "Building on fire",
  location: { lat: 37.7749, lng: -122.4194 },
  severity: 4,
});

// Get nearby events
const nearbyEvents = await client.emergencies.getNearby({
  location: { lat: 37.7749, lng: -122.4194 },
  radius: 5000,
});

// Subscribe to real-time updates
client.emergencies.subscribe(
  { location: { lat: 37.7749, lng: -122.4194 }, radius: 10000 },
  (event) => console.log('New emergency:', event)
);
```

### Python

```python
from openrelief import OpenReliefClient

client = OpenReliefClient(
    supabase_url=os.getenv('SUPABASE_URL'),
    supabase_key=os.getenv('SUPABASE_ANON_KEY')
)

# Report emergency
event = client.emergencies.create({
    'type_id': 1,
    'title': 'Fire reported',
    'description': 'Building on fire',
    'location': {'lat': 37.7749, 'lng': -122.4194},
    'severity': 4,
})

# Get nearby events
nearby_events = client.emergencies.get_nearby(
    location={'lat': 37.7749, 'lng': -122.4194},
    radius=5000,
)
```

## Testing

### Test Environment

```http
# Test API endpoint
https://api-test.openrelief.org/rest/v1/

# Test Edge Functions
https://api-test.openrelief.org/functions/v1/

# Test WebSocket
wss://api-test.openrelief.org/realtime
```

### Mock Data

```typescript
// Mock emergency event
const mockEvent = {
  id: 'test-event-uuid',
  type_id: 1,
  title: 'Test Fire Event',
  description: 'This is a test emergency',
  location: 'SRID=4326;POINT(-122.4194 37.7749)',
  severity: 3,
  status: 'active',
  created_at: new Date().toISOString(),
};

// Mock user profile
const mockUser = {
  user_id: 'test-user-uuid',
  trust_score: 0.75,
  last_known_location: 'SRID=4326;POINT(-122.4194 37.7749)',
  notification_preferences: {
    push_enabled: true,
    email_enabled: false,
  },
};
```

---

*This API documentation will be updated as the platform evolves and new features are added.*