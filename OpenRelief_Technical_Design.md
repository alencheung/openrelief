# OpenRelief Platform

**Repo License:** MIT / AGPLv3

## 1\. Executive Summary

OpenRelief is an open-source, offline-first Progressive Web App (PWA) for decentralized emergency coordination. It connects victims with resources via a privacy-preserving interface. The v2.0 architecture addresses scaling bottlenecks through database-native filtering (PostGIS), mitigates "alarm fatigue" via inverse-square relevance logic, and replaces simple reporting counts with a Trust-Weighted Consensus algorithm to prevent Sybil attacks.

## 2\. System Architecture

The system utilizes a Serverless, Edge-First Architecture. Critical alert dispatch moves from application-level iteration to database-level spatial queries to ensure $O(1)$ scalability relative to user count.

### Data Flow

1.  **Ingest:** End User $\rightarrow$ Cloudflare $\rightarrow$ Supabase Edge Function.
2.  **Validation:** Edge Function calculates Trust Score $\rightarrow$ Writes to `emergency_staging`.
3.  **Consensus:** Database Trigger sums weighted votes. If Threshold met $\rightarrow$ Promotes to `active_events`.
4.  **Dispatch:** `pg_net` triggers Edge Function $\rightarrow$ PostGIS Spatial Filter $\rightarrow$ FCM/WebPush.

## 3\. Tech Stack

### Frontend

  * **Framework:** Next.js 15+ (App Router).
  * **State:** TanStack Query (Server State) + Zustand (Local Preferences).
  * **Maps:** MapLibre GL JS (OpenMapTiles). *Replaces Mapbox to reduce cost.*
  * **PWA:** Service Workers with Background Sync & Periodic Sync API.

### Backend & Infrastructure

  * **Database:** Supabase (PostgreSQL 15+).
  * **Spatial:** PostGIS Extension (Required).
  * **Queuing:** `pg_cron` for cleanup; Supabase Realtime for UI updates.
  * **ML/AI:** OpenAI API (Text Classification) + Database-native Math (Relevance Scoring).

## 4\. Database Schema

### 4.1 User Profiles & Trust

Enhances security by tracking reporter reliability.

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    trust_score FLOAT DEFAULT 0.1, -- Range 0.0 to 1.0
    last_known_location GEOGRAPHY(POINT),
    active_session_start TIMESTAMPTZ,
    -- Composite index for rapid spatial filtering
    CONSTRAINT idx_geo_trust UNIQUE (user_id) 
);
CREATE INDEX idx_user_loc ON user_profiles USING GIST (last_known_location);
```

### 4.2 Normalized Subscriptions

Replaces JSONB to allow SQL `JOIN` efficiency.

```sql
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE -- e.g., 'fire', 'medical', 'security'
);

CREATE TABLE user_subscriptions (
    user_id UUID REFERENCES user_profiles(user_id),
    topic_id INT REFERENCES topics(id),
    PRIMARY KEY (user_id, topic_id)
);
```

### 4.3 Emergency Events

```sql
CREATE TABLE emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_slug TEXT REFERENCES topics(slug),
    severity INT CHECK (severity BETWEEN 1 AND 5),
    location GEOGRAPHY(POINT),
    radius_meters INT,
    status TEXT DEFAULT 'pending', -- pending, active, resolved
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

## 5\. Feature Modules

### 5.1 Trust-Weighted Consensus Engine

**Purpose:** Prevent Sybil attacks/spam. A simple vote count is insufficient.
**Logic:** An event promotes from `pending` to `active` only when the weighted vote sum exceeds the Threshold.

**Algorithm:**
$$V_{total} = \sum_{i=1}^{n} (T_{user} \times w_{decay})$$

  * $T_{user}$: User Trust Score (0.0–1.0).
  * $w_{decay}$: Time decay factor (votes older than 30 mins lose weight).
  * **Trigger:** If $V_{total} > 5.0$, invoke `dispatch_alert`.

### 5.2 Intelligent Fatigue Guard (Relevance Engine)

**Purpose:** Prevent alarm fatigue using physics-based relevance.
**Logic:** Replaces linear distance division with Inverse-Square Law to prevent singularities at $d=0$ and provide natural attenuation.

**Formula:**
$$R = \frac{S_{event}}{1 + (\frac{d}{500})^2}$$

  * $R$: Relevance (cutoff \< 0.5 = Silent).
  * $S_{event}$: Event Severity (1–5).
  * $d$: Distance in meters.
  * $500$: Half-value distance constant.

### 5.3 High-Performance Dispatcher

**Implementation:** Database-side filtering.
**Old Method:** Fetch all users, filter in loop (Latency $O(N)$).
**New Method:** PostGIS Intersection (Latency $O(log N)$).

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

## 6\. Client-Side Implementation

### 6.1 iOS/PWA Background Strategy

**Challenge:** iOS limits background Geofencing for PWAs.
**Solution:** Silent Push Wake-up.

1.  **Server:** Detects user is in Danger Zone (using last known server-side location).
2.  **Action:** Sends "Silent Push" (content-available: 1).
3.  **Client:** Service Worker wakes up (background).
4.  **Verification:** SW requests high-accuracy GPS locally.
5.  **Notification:** If local GPS confirms zone intersection, SW generates visible system notification.

### 6.2 Offline Mesh (Future Proofing)

**Architecture:**

  * **Local Storage:** RxDB or PouchDB.
  * **Sync:** Replicates to Supabase when online.
  * **Peer Discovery:** Web Bluetooth API (Android only currently) or QR Code "Handshake" for exchanging cached resource maps between devices.

## 7\. Roadmap

  * **Phase 1 (Core):** MapLibre integration, PostGIS schema setup, basic HXL resource tagging.
  * **Phase 2 (Trust):** Implement Trust Score calculation and Weighted Consensus triggers.
  * **Phase 3 (Optimization):** Migrate Dispatcher to Postgres functions; implement "Silent Push" logic for iOS.
  * **Phase 4 (Resilience):** LoRaWAN hardware integration for zero-connectivity scenarios.

