# System Architecture

## Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Progressive Web App]
        B[Service Worker]
        C[Local Storage]
        D[Key Management]
    end
    
    subgraph "Edge Layer"
        E[Cloudflare Workers]
        F[Privacy Gateway]
        G[ZK Verification Service]
    end
    
    subgraph "Backend Layer"
        H[Supabase Edge Functions]
        I[PostgreSQL + PostGIS]
        J[Supabase Auth]
        K[Supabase Realtime]
    end
    
    subgraph "External Services"
        L[OpenAI API]
        M[FCM/APNS Push]
        N[OpenMapTiles]
    end
    
    A --> B
    A --> C
    B --> E
    A --> F
    E --> H
    H --> I
    H --> J
    H --> L
    H --> M
    A --> N
    I --> K
    K --> A
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as End User
    participant P as PWA
    participant E as Edge Function
    participant D as Database
    participant N as Notification Service
    
    U->>P: Report Emergency
    P->>E: Submit Event
    E->>E: Calculate Trust Score
    E->>D: Store in Staging
    D->>D: Trigger Consensus Check
    D->>E: Event Promoted
    E->>D: Spatial Query for Users
    D->>E: Return Target Users
    E->>N: Send Push Notifications
    N->>U: Silent Push
    U->>P: Wake Up
    P->>P: Verify Location
    P->>U: Show Alert
```

## Component Relationships

### Client Layer

```mermaid
classDiagram
    class PWA {
        +submitEvent()
        +subscribeToTopic()
        +requestLocation()
    }
    
    class ServiceWorker {
        +backgroundSync()
        +silentPushHandler()
        +locationVerification()
    }
    
    class LocalStorage {
        +cacheEvents()
        +offlineQueue()
        +syncWhenOnline()
    }
    
    PWA --> ServiceWorker
    PWA --> LocalStorage
```

### Backend Layer

```mermaid
classDiagram
    class EdgeFunction {
        +validateEvent()
        +calculateTrust()
        +dispatchAlert()
    }
    
    class Database {
        +storeEvent()
        +spatialQuery()
        +consensusCheck()
    }
    
    class AuthService {
        +authenticate()
        +authorize()
        +rlsEnforcement()
    }
    
    EdgeFunction --> Database
    EdgeFunction --> AuthService
    Database --> AuthService
```

## Data Flow Architecture

```mermaid
flowchart TD
    A[User Input] --> B{Data Classification}
    B -->|Emergency Data| C[Immediate Processing]
    B -->|Trust Data| D[Trust Commitment]
    B -->|Profile Data| E[Privacy Enhancement]
    
    C --> F[Differential Privacy]
    F --> G[ZK Proof Generation]
    G --> H[Distributed Storage]
    
    D --> I[Secret Sharing]
    I --> J[Multi-Jurisdictional Storage]
    J --> K[Blockchain Anchor]
    
    E --> L[K-Anonymity]
    L --> M[Temporal Decay]
    M --> N[Encrypted Storage]
    
    H --> O[Verification Layer]
    K --> O
    N --> O
    O --> P[Authorized Access]
    P --> Q{Access Type}
    Q -->|Emergency Response| R[Privacy-Preserving Disclosure]
    Q -->|System Operation| S[Zero-Knowledge Verification]
    Q -->|User Request| T[Direct Access with Keys]
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Local Development]
        B[Local Supabase]
        C[Jest Testing]
    end
    
    subgraph "Staging"
        D[Vercel Preview]
        E[Staging Supabase]
        F[E2E Tests]
    end
    
    subgraph "Production"
        G[Vercel Edge Network]
        H[Supabase Production]
        I[Cloudflare CDN]
        J[Monitoring Stack]
    end
    
    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
    G --> J
```

## Performance Optimization Architecture

```mermaid
graph TB
    subgraph "Frontend Optimization"
        A[PWA Caching]
        B[Service Worker Optimization]
        C[Lazy Loading]
        D[Bundle Splitting]
    end
    
    subgraph "Network Optimization"
        E[Edge Computing]
        F[CDN Distribution]
        G[Compression]
        H[Connection Pooling]
    end
    
    subgraph "Database Optimization"
        I[Spatial Indexing]
        J[Query Optimization]
        K[Caching Layers]
        L[Connection Management]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
```

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        A[Anonymous Authentication]
        B[ZK Identity Proofs]
        C[Multi-Factor Verification]
        D[Biometric Options]
    end
    
    subgraph "Authorization Layer"
        E[Role-Based Access Control]
        F[Just-In-Time Permissions]
        G[Time-Boxed Access]
        H[Multi-Signature Requirements]
    end
    
    subgraph "Audit Layer"
        I[Immutable Audit Trail]
        J[Tamper-Evidence]
        K[Cryptographic Proofs]
        L[Compliance Reporting]
    end
    
    subgraph "Key Management"
        M[Hardware Security Modules]
        N[Key Rotation]
        O[Threshold Cryptography]
        P[Emergency Recovery]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
    I --> M
    J --> N
    K --> O
    L --> P
```

## Threat Mitigation Architecture

```mermaid
graph TB
    subgraph "Threat Vectors"
        A[Legal Compulsion]
        B[Service Role Compromise]
        C[Trust Manipulation]
        D[User Identification]
        E[Behavioral Analysis]
    end
    
    subgraph "Mitigation Strategies"
        F[Jurisdictional Distribution]
        G[User-Controlled Encryption]
        H[Zero-Knowledge Verification]
        I[K-Anonymity & Differential Privacy]
        J[Algorithm Obfuscation]
    end
    
    subgraph "Implementation Controls"
        K[Multi-Jurisdictional Hosting]
        L[HSM Key Management]
        M[ZK-SNARK Implementation]
        N[Privacy-Enhancing Technologies]
        O[Adaptive Trust Algorithms]
    end
    
    A --> F
    B --> G
    C --> H
    D --> I
    E --> J
    F --> K
    G --> L
    H --> M
    I --> N
    J --> O
```

---

*See [technical-design.md](./technical-design.md) for specifications and [data-protection.md](./data-protection.md) for privacy architecture.*
