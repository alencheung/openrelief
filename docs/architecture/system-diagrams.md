# System Diagrams

> These diagrams reflect the **current, as-built** OpenRelief architecture.
> For proposed future directions, see [Future Vision](future-vision.md).

## Overall Stack

```mermaid
graph TB
    subgraph Client["Client — PWA"]
        A[Next.js App Router + React 18]
        B[Service Worker]
        C[Zustand + TanStack Query]
    end

    subgraph Edge["Edge"]
        D[Next.js Middleware — security/rate-limit/validation]
        E[Cloudflare Worker — emergency dispatch]
    end

    subgraph Backend["Backend — Supabase"]
        F[PostgreSQL 15 + PostGIS]
        G[Supabase Auth + RLS]
        H[Supabase Realtime]
    end

    subgraph External["External Services"]
        M[Web Push — VAPID/FCM]
        N[Map tiles — OpenMapTiles]
        O[Sentry monitoring]
        P[Upstash Redis — rate limiting]
    end

    A --> B
    A --> C
    B --> D
    D --> E
    D --> F
    D --> P
    E --> F
    G --> F
    F --> H
    H --> C
    D --> M
    A --> N
    A --> O
    D --> O
```

## Emergency Report → Dispatch Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as PWA (Client)
    participant SW as Service Worker
    participant MW as Next.js Middleware
    participant DB as Postgres + PostGIS
    participant RT as Supabase Realtime
    participant W as Cloudflare Worker
    participant Push as Web Push

    U->>P: Tap "Report" (type, location)
    P->>SW: Queue if offline
    SW->>MW: Submit when online
    MW->>MW: Rate limit + Sybil check + validate
    MW->>DB: INSERT emergency_events (status=pending)
    DB->>DB: calculate_event_consensus (trigger)
    DB->>DB: get_users_for_alert_dispatch (spatial)
    Note over DB: Promotes to active when<br/>weighted confirmations ≥ 5.0
    DB->>RT: pg_notify('event_activated')
    RT->>P: Stream update → map marker
    MW->>W: Dispatch alert
    W->>Push: Send notification
    Push->>U: Silent push / notification
    U->>P: Open alert
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Dev["Development"]
        A[Local dev — npm run dev]
        B[Local Supabase via Docker]
        C[Jest unit/integration tests]
    end

    subgraph CI["CI — GitHub Actions"]
        D[Lint + typecheck]
        E[Build verification]
        F[Playwright E2E]
        G[Lighthouse CI]
    end

    subgraph Prod["Production"]
        H[Vercel — Next.js hosting]
        I[Supabase Cloud — Postgres]
        J[Cloudflare — Worker + CDN]
        K[Upstash — Redis]
        L[Sentry — monitoring]
    end

    A --> D
    B --> I
    C --> F
    D --> E
    E --> F
    E --> G
    F --> H
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
```

## Client State Architecture

```mermaid
graph LR
    subgraph Client["Client State"]
        Z[Zustand stores]
        TQ[TanStack Query]
        RT[Realtime subscriptions]
    end

    subgraph Stores["Zustand stores (src/store/)"]
        Z1[authStore]
        Z2[emergencyStore]
        Z3[trustStore]
        Z4[locationStore]
        Z5[notificationStore]
        Z6[offlineStore]
        Z7[checkInStore]
    end

    subgraph Queries["Server state (src/hooks/queries/)"]
        Q1[useEmergencyQueries]
        Q2[useUserQueries]
        Q3[useRealtimeSubscriptions]
    end

    Z --> Stores
    TQ --> Queries
    RT --> TQ
    RT -.->|invalidates| TQ
    Q3 -.->|pushes| Z
```

## Security Request Flow

```mermaid
flowchart TD
    Req[Incoming request] -> MW{Next.js Middleware}
    MW ->|security headers| Headers[Apply CSP/HSTS/COOP/COEP]
    MW ->|rate limit| RL[Upstash Redis — tiered by trust]
    MW ->|Sybil check| Sybil[Sybil detection — behavioral/geo/network]
    MW ->|validate| Val[Input validation + sanitize]
    MW ->|auth| Auth[Supabase session verify]
    RL ->|blocked| Block[429 / 403]
    Sybil ->|flagged| Block
    Val ->|invalid| Err[400]
    Auth ->|no session| Unauth[401]
    MW ->|pass| Route[API route handler]
    Route ->|withAPISecurity| RLS[RLS-enforced Supabase client]
    RLS -> DB[(Postgres)]
```

## Performance Layer

```mermaid
graph TB
    subgraph Frontend["Frontend optimization"]
        A[PWA caching — Service Worker]
        B[Lazy loading + code splitting]
        C[React virtualization — tanstack/virtual]
    end

    subgraph Network["Network"]
        D[Edge — Vercel + Cloudflare]
        E[Connection pooling — Supavisor]
        F[Redis — rate limit + session cache]
    end

    subgraph Database["Database optimization"]
        G[GIST spatial indexes]
        H[Partial/expression indexes]
        I[Partitioned notification_queue]
        J[Materialized views]
    end

    A --> D
    B --> D
    C --> E
    D --> G
    E --> H
    F --> I
```

---

*For the algorithms behind trust and consensus, see
[Trust & Consensus](trust-and-consensus.md). For the data layer, see
[Data Model](data-model.md).*
