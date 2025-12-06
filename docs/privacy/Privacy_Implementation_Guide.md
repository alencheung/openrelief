# Privacy Implementation Guide for OpenRelief

This guide provides comprehensive documentation for the privacy features implemented in the OpenRelief platform. It covers the technical architecture, implementation details, and usage guidelines for developers and system administrators.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Differential Privacy](#differential-privacy)
4. [Data Anonymization](#data-anonymization)
5. [Cryptographic Protection](#cryptographic-protection)
6. [Privacy Dashboard](#privacy-dashboard)
7. [Data Export & Deletion](#data-export--deletion)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

OpenRelief implements a multi-layered privacy protection system designed to safeguard user anonymity while maintaining the platform's emergency response capabilities. The system combines differential privacy, k-anonymity, cryptographic protection, and user-controlled privacy settings.

### Key Privacy Features

- **Differential Privacy**: Mathematical noise addition to protect individual records
- **K-Anonymity**: Group-based anonymization to prevent re-identification
- **End-to-End Encryption**: Cryptographic protection of sensitive data
- **Temporal Data Decay**: Automatic degradation of data over time
- **Privacy Budgeting**: User-controlled limits on data exposure
- **User-Controlled Settings**: Granular privacy preferences

## Architecture

The privacy system is implemented across multiple layers of the application:

```
┌─────────────────────────────────────────────────────────────┐
│                    Privacy Dashboard                        │
├─────────────────────────────────────────────────────────────┤
│                    Privacy Hook                             │
├─────────────────────────────────────────────────────────────┤
│  Differential Privacy  │  Anonymization  │  Cryptography   │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│                    Storage & APIs                          │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **Frontend Components**:
   - `PrivacyDashboard.tsx`: User interface for privacy settings
   - `DataExportTool.tsx`: Data export and deletion interface

2. **Privacy Utilities**:
   - `differential-privacy.ts`: Differential privacy functions
   - `anonymization.ts`: Data anonymization utilities
   - `cryptography.ts`: Cryptographic protection functions

3. **React Hook**:
   - `usePrivacy.ts`: Centralized privacy management

4. **Database Layer**:
   - Privacy settings tables
   - Audit logging
   - Encrypted data storage

## Differential Privacy

Differential privacy provides mathematical guarantees that individual records cannot be re-identified from query results.

### Implementation

The differential privacy implementation is located in `src/lib/privacy/differential-privacy.ts`:

```typescript
// Add Laplace noise to location data
export function addNoiseToLocation(
  latitude: number,
  longitude: number,
  config: DPConfig = DEFAULT_DP_CONFIGS.location
): { latitude: number; longitude: number }
```

### Configuration

Default privacy parameters for different data types:

```typescript
export const DEFAULT_DP_CONFIGS = {
  location: { epsilon: 0.1, delta: 1e-5, sensitivity: 1.0 },
  trustScore: { epsilon: 0.5, delta: 1e-5, sensitivity: 1.0 },
  userProfile: { epsilon: 1.0, delta: 1e-5, sensitivity: 1.0 },
  emergencyData: { epsilon: 0.05, delta: 1e-6, sensitivity: 1.0 }
};
```

### Privacy Budget

Each user has a daily privacy budget that limits the amount of information that can be exposed:

```typescript
// Check if user has sufficient privacy budget
export function checkPrivacyBudget(
  userId: string,
  dataType: string,
  epsilonRequired: number
): boolean

// Consume privacy budget for a query
export function consumePrivacyBudget(
  userId: string,
  dataType: string,
  epsilonUsed: number,
  queryType: string
): void
```

### Usage Example

```typescript
import { protectLocationData } from '@/hooks/usePrivacy';

// Protect location data with differential privacy
const protectedLocation = protectLocationData({
  latitude: 37.7749,
  longitude: -122.4194,
  userId: 'user-123'
}, {
  applyDifferentialPrivacy: true
});
```

## Data Anonymization

Data anonymization techniques protect user identity by transforming or removing identifying information.

### K-Anonymity

K-anonymity ensures that each user cannot be distinguished from at least k-1 other users:

```typescript
// Check if dataset satisfies k-anonymity
export function checkKAnonymity<T extends Record<string, any>>(
  data: T[],
  config: KAnonymityConfig
): boolean

// Enforce k-anonymity by suppressing or generalizing records
export function enforceKAnonymity<T extends Record<string, any>>(
  data: T[],
  config: KAnonymityConfig
): T[]
```

### Location Precision Reduction

Location data is generalized to reduce precision:

```typescript
// Reduce location precision by rounding coordinates
export function reduceLocationPrecision(
  latitude: number,
  longitude: number,
  precisionDigits: number = 3
): { latitude: number; longitude: number }

// Create a privacy grid for location anonymization
export function createPrivacyGrid(
  latitude: number,
  longitude: number,
  gridSizeKm: number = 1
): { latitude: number; longitude: number }
```

### Temporal Data Decay

Data automatically degrades over time to reduce long-term privacy risks:

```typescript
// Apply temporal decay to a numeric value
export function applyTemporalDecay(
  value: number,
  timestamp: Date,
  config: TemporalDecayConfig
): number
```

## Cryptographic Protection

Cryptographic functions protect sensitive data through encryption and secure hashing.

### End-to-End Encryption

Sensitive user data is encrypted before storage:

```typescript
// Encrypt sensitive user data for storage
export async function encryptUserData(
  userId: string,
  data: Record<string, any>,
  masterKey: Buffer
): Promise<EncryptedData>

// Decrypt sensitive user data from storage
export async function decryptUserData(
  userId: string,
  encryptedData: EncryptedData,
  masterKey: Buffer
): Promise<Record<string, any> | null>
```

### Secure Hashing

Cryptographic hashes protect passwords and verify data integrity:

```typescript
// Create a cryptographic hash of data
export function createHashDigest(
  data: string,
  algorithm: string = 'sha256'
): string

// Create a cryptographic hash with salt
export function createSaltedHash(
  data: string,
  salt: string,
  algorithm: string = 'sha256'
): string
```

### Zero-Knowledge Proofs

Identity verification without revealing sensitive information:

```typescript
// Create a zero-knowledge proof of identity
export function createIdentityProof(
  identityData: Record<string, any>,
  secret: string
): {
  commitment: string;
  challenge: string;
  response: string;
  publicData: Record<string, any>;
}
```

## Privacy Dashboard

The privacy dashboard provides users with control over their privacy settings and visibility into data usage.

### Features

- Privacy settings management
- Data usage statistics
- Privacy budget monitoring
- Data retention controls
- Privacy level indicators

### Usage

```typescript
import PrivacyDashboard from '@/components/privacy/PrivacyDashboard';

// In your component
<PrivacyDashboard />
```

### Settings

Users can control:

- Location sharing and precision
- Data anonymization preferences
- Differential privacy settings
- End-to-end encryption
- Data retention periods
- Emergency data sharing

## Data Export & Deletion

The data export and deletion tool enables users to exercise their data rights under regulations like GDPR.

### Export Features

- Multiple export formats (JSON, CSV, PDF)
- Selective data type export
- Request tracking and status updates
- Secure download links

### Deletion Features

- Selective data deletion
- Confirmation codes for verification
- Deletion reason tracking
- Audit logging

### Usage

```typescript
import DataExportTool from '@/components/privacy/DataExportTool';

// In your component
<DataExportTool />
```

## Database Schema

The privacy implementation adds several tables to the OpenRelief database:

### Privacy Settings

```sql
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_sharing BOOLEAN DEFAULT true NOT NULL,
  location_precision INTEGER DEFAULT 3 NOT NULL,
  data_retention_days INTEGER DEFAULT 30 NOT NULL,
  anonymize_data BOOLEAN DEFAULT true NOT NULL,
  differential_privacy BOOLEAN DEFAULT true NOT NULL,
  k_anonymity BOOLEAN DEFAULT true NOT NULL,
  end_to_end_encryption BOOLEAN DEFAULT true NOT NULL,
  emergency_data_sharing BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);
```

### Privacy Budget

```sql
CREATE TABLE privacy_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL,
  remaining_budget DECIMAL(5,4) DEFAULT 1.0 NOT NULL,
  last_reset TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, data_type)
);
```

### Audit Logging

```sql
CREATE TABLE privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  data_type TEXT NOT NULL,
  privacy_budget_used DECIMAL(5,4) DEFAULT 0 NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

## API Endpoints

The privacy system exposes several API endpoints for managing privacy settings and data:

### Privacy Settings

```
GET    /api/privacy/settings     # Get user privacy settings
POST   /api/privacy/settings     # Update privacy settings
```

### Data Export

```
POST   /api/privacy/export       # Request data export
GET    /api/privacy/export/:id   # Get export status
GET    /api/privacy/download/:id # Download exported data
```

### Data Deletion

```
POST   /api/privacy/delete       # Request data deletion
GET    /api/privacy/delete/:id   # Get deletion status
```

### Privacy Budget

```
GET    /api/privacy/budget       # Get privacy budget status
POST   /api/privacy/budget/reset # Reset privacy budget (admin)
```

## Best Practices

### Development

1. **Always use the privacy hook**: Access privacy features through the `usePrivacy` hook to ensure consistent behavior.

2. **Check privacy budget**: Before processing data, verify that users have sufficient privacy budget.

3. **Apply appropriate protection**: Use the right level of privacy protection for different data types.

4. **Log privacy actions**: Maintain audit trails for all privacy-related operations.

### Configuration

1. **Choose appropriate epsilon values**: Lower epsilon values provide stronger privacy but reduce data utility.

2. **Set reasonable k-values**: Higher k-values provide stronger anonymity but may reduce data availability.

3. **Configure data retention**: Balance data utility with privacy by setting appropriate retention periods.

4. **Monitor privacy budgets**: Regularly check that users have sufficient privacy budget for their needs.

### Performance

1. **Batch operations**: Process multiple records together to reduce privacy budget consumption.

2. **Cache results**: Cache privacy-protected results to avoid repeated privacy budget consumption.

3. **Optimize queries**: Use database indexes and query optimization for privacy-related operations.

4. **Monitor performance**: Track the performance impact of privacy measures and optimize as needed.

## Troubleshooting

### Common Issues

1. **Privacy budget exceeded**:
   - Increase daily budget limits
   - Implement budget reset mechanisms
   - Optimize query patterns to reduce consumption

2. **Performance degradation**:
   - Optimize database queries with proper indexing
   - Implement caching for frequently accessed data
   - Consider asynchronous processing for privacy operations

3. **Data utility loss**:
   - Adjust epsilon values for better balance
   - Implement adaptive privacy parameters
   - Use privacy-preserving machine learning techniques

4. **Encryption failures**:
   - Verify key management processes
   - Check for proper key rotation
   - Ensure secure key storage

### Debugging

1. **Enable privacy logging**: Set `enableLogging: true` in the privacy hook options.

2. **Monitor privacy budget**: Use the privacy dashboard to track budget consumption.

3. **Check audit logs**: Review privacy audit logs for unusual patterns.

4. **Test with different configurations**: Experiment with different privacy parameters to find optimal settings.

### Security Considerations

1. **Secure key management**: Use proper key management systems for encryption keys.

2. **Protect privacy budgets**: Implement rate limiting to prevent privacy budget exhaustion attacks.

3. **Validate inputs**: Sanitize all inputs to privacy functions to prevent injection attacks.

4. **Regular security audits**: Conduct regular security reviews of privacy implementations.

## Conclusion

The OpenRelief privacy implementation provides comprehensive protection for user data while maintaining the platform's emergency response capabilities. By following this guide and implementing the best practices outlined above, developers can ensure that user privacy is protected throughout the application.

For more information or to report issues, please refer to the project documentation or contact the development team.