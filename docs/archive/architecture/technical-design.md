# Technical Design & Specifications

## Executive Summary

OpenRelief v2.0 is an open-source, offline-first Progressive Web App (PWA) for decentralized emergency coordination. The platform connects victims with resources via a privacy-preserving interface, addressing scaling bottlenecks through database-native filtering (PostGIS), mitigating alarm fatigue via inverse-square relevance logic, and replacing simple reporting counts with a Trust-Weighted Consensus algorithm to prevent Sybil attacks.

**License**: MIT / AGPLv3

## System Architecture

### Overview

The system utilizes a **Serverless, Edge-First Architecture**. Critical alert dispatch moves from application-level iteration to database-level spatial queries to ensure O(1) scalability relative to user count.

### Tech Stack

#### Frontend

| Component | Technology | Purpose |
|-----------|-------------|----------|
| Framework | Next.js 15+ (App Router) | React framework with SSR/SSG |
| State Management | TanStack Query + Zustand | Server state + local preferences |
| Maps | MapLibre GL JS + OpenMapTiles | Cost-effective mapping solution |
| PWA | Service Workers + Background Sync | Offline functionality |
| Styling | Tailwind CSS + CSS Modules | Utility-first styling |

#### Backend & Infrastructure

| Component | Technology | Purpose |
|-----------|-------------|----------|
| Database | Supabase (PostgreSQL 15+) | Data storage with RLS |
| Spatial | PostGIS Extension | Geospatial queries |
| Queuing | pg_cron + Supabase Realtime | Cleanup and UI updates |
| ML/AI | OpenAI API | Text classification |

## Database Schema

### Core Tables

#### User Profiles & Trust

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    trust_score FLOAT DEFAULT 0.1 CHECK (trust_score >= 0.0 AND trust_score <= 1.0),
    last_known_location GEOGRAPHY(POINT, 4326),
    active_session_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_location 
ON user_profiles USING GIST (last_known_location);
```

#### Normalized Subscriptions

```sql
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE, -- e.g., 'fire', 'medical', 'security'
    name TEXT NOT NULL
);

CREATE TABLE user_subscriptions (
    user_id UUID REFERENCES user_profiles(user_id),
    topic_id INTEGER REFERENCES topics(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);
```

#### Emergency Events

```sql
CREATE TABLE emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_slug TEXT REFERENCES topics(slug),
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    location GEOGRAPHY(POINT, 4326),
    radius_meters INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'resolved')),
    trust_weight FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_emergency_events_location 
ON emergency_events USING GIST (location);
```

## Feature Modules

### Trust-Weighted Consensus Engine

**Purpose**: Prevent Sybil attacks/spam. A simple vote count is insufficient.

**Logic**: An event promotes from `pending` to `active` only when the weighted vote sum exceeds the Threshold.

**Algorithm**:
$$V_{total} = \sum_{i=1}^{n} (T_{user} \times w_{decay})$$

- $T_{user}$: User Trust Score (0.0–1.0)
- $w_{decay}$: Time decay factor (votes older than 30 mins lose weight)
- **Trigger**: If $V_{total} > 5.0$, invoke `dispatch_alert`

### Intelligent Fatigue Guard (Relevance Engine)

**Purpose**: Prevent alarm fatigue using physics-based relevance.

**Logic**: Replaces linear distance division with Inverse-Square Law to prevent singularities at d=0 and provide natural attenuation.

**Formula**:
$$R = \frac{S_{event}}{1 + (\frac{d}{500})^2}$$

- $R$: Relevance (cutoff < 0.5 = Silent)
- $S_{event}$: Event Severity (1–5)
- $d$: Distance in meters
- 500: Half-value distance constant

### High-Performance Dispatcher

**Implementation**: Database-side filtering.

| Approach | Complexity | Latency |
|-----------|-------------|----------|
| Old Method | O(N) | Application iteration |
| New Method | O(log N) | PostGIS Intersection |

```sql
-- Conceptual Query for Edge Function
SELECT u.fcm_token 
FROM user_profiles u
JOIN user_subscriptions s ON u.user_id = s.user_id
JOIN topics t ON s.topic_id = t.id
WHERE 
  t.slug = $1 -- Event Type
  AND ST_DWithin(u.last_known_location, $2, $3) -- Location, Radius
  AND u.trust_score > 0.1 -- Filter bad actors
  AND NOT EXISTS (
      SELECT 1 FROM user_mutes m 
      WHERE m.user_id = u.user_id AND m.mute_until > NOW()
  );
```

## Client-Side Implementation

### iOS/PWA Background Strategy

**Challenge**: iOS limits background Geofencing for PWAs.

**Solution**: Silent Push Wake-up.

1. **Server**: Detects user is in Danger Zone (using last known server-side location)
2. **Action**: Sends "Silent Push" (content-available: 1)
3. **Client**: Service Worker wakes up (background)
4. **Verification**: SW requests high-accuracy GPS locally
5. **Notification**: If local GPS confirms zone intersection, SW generates visible system notification

### Offline Mesh (Future)

**Architecture**:
- **Local Storage**: RxDB or PouchDB
- **Sync**: Replicates to Supabase when online
- **Peer Discovery**: Web Bluetooth API (Android only) or QR Code "Handshake"

## Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| Phase 1 | Core | MapLibre integration, PostGIS schema setup, basic HXL resource tagging |
| Phase 2 | Trust | Implement Trust Score calculation and Weighted Consensus triggers |
| Phase 3 | Optimization | Migrate Dispatcher to Postgres functions; implement "Silent Push" for iOS |
| Phase 4 | Resilience | LoRaWAN hardware integration for zero-connectivity scenarios |

## Design Decisions

### Why Serverless, Edge-First?

**Rationale**:
- **Performance**: Sub-100ms response times worldwide
- **Scalability**: Auto-scales based on demand
- **Reliability**: Built-in redundancy and failover
- **Cost-Effectiveness**: Pay-per-use model

### Why MapLibre over Mapbox?

- **Cost**: MapLibre uses OpenMapTiles (no API fees)
- **Performance**: Comparable rendering speed
- **Open Source**: Community-maintained and extensible

### Why PostGIS for Filtering?

- **O(log N) spatial queries** vs O(N) application iteration
- **Native database integration** reduces data transfer
- **Battle-tested** in production at scale

---

*See [system-architecture.md](./system-architecture.md) for detailed diagrams and [data-protection.md](./data-protection.md) for privacy architecture.*
