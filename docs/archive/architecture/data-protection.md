# Data Protection Architecture

## Executive Summary

This document presents a comprehensive data protection architecture for OpenRelief that addresses critical vulnerabilities while maintaining emergency response capabilities. The design prioritizes zero-knowledge trust systems and cryptographic protections within a 6-month implementation timeline.

## Critical Vulnerabilities Addressed

1. **Centralized trust database** vulnerable to legal compulsion
2. **Service role keys** that bypass all RLS protections
3. **Predictable trust algorithm** vulnerable to reverse engineering
4. **Insufficient anonymization** of user data
5. **Third-party dependencies** subject to U.S. CLOUD Act/PATRIOT Act

## Zero-Knowledge Trust System

### Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| Zero-Knowledge Proofs | Verify trust without revealing actual scores |
| Commitment Schemes | Cryptographic commitments to trust factors |
| Threshold Cryptography | Multi-party computation for trust calculations |
| Verifiable Randomness | Unpredictable trust score components |

### Trust Commitment Engine

**Specifications**:
- **Algorithm**: SHA-256 with salt for commitment hashing
- **Security Level**: 128-bit security minimum
- **Performance**: < 100ms commitment generation
- **Storage**: 64 bytes per commitment

```typescript
interface TrustCommitment {
  userId: string;
  commitmentHash: string; // Hash of trust factors
  salt: string; // Random salt for each commitment
  timestamp: number;
  signature: string; // User signature on commitment
}
```

### Zero-Knowledge Proof System

**Specifications**:
- **Circuit**: Trust threshold verification
- **Proof Size**: 200-300 bytes
- **Verification Time**: < 10ms
- **Setup Ceremony**: Trusted setup with MPC
- **Security Level**: 128-bit

**Circuit Definition**:
```circom
pragma circom 2.0.0;

template TrustThreshold() {
    signal input commitment[2];
    signal input trustScore;
    signal input threshold;
    signal input salt;
    signal input nullifier;
    signal output out;
    
    // Verify commitment to trust score
    component poseidon = Poseidon(5);
    poseidon.inputs[0] <== trustScore;
    poseidon.inputs[1] <== threshold;
    poseidon.inputs[2] <== salt;
    poseidon.inputs[3] <== nullifier;
    poseidon.inputs[4] <== 0;
    
    // Verify commitment matches
    component commitmentChecker = IsEqual();
    commitmentChecker.in[0] <== poseidon.out;
    commitmentChecker.in[1] <== commitment[0];
    
    // Verify trust score meets threshold
    component thresholdChecker = GreaterEqThan();
    thresholdChecker.in[0] <== trustScore;
    thresholdChecker.in[1] <== threshold;
    
    // Output is true if both conditions met
    out <== commitmentChecker.out * thresholdChecker.out;
}
```

### Distributed Trust Storage

**Specifications**:
- **Scheme**: Shamir's Secret Sharing
- **Threshold**: 3-of-5 reconstruction
- **Field**: GF(2^256) for 256-bit security
- **Share Size**: 32 bytes per share
- **Reconstruction**: Lagrange interpolation

## Cryptographic Protection Layers

### End-to-End Encryption

**Specifications**:
| Parameter | Value |
|-----------|-------|
| Algorithm | X25519 for key exchange |
| Encryption | AES-256-GCM for data |
| Key Derivation | HKDF-SHA256 |
| Forward Secrecy | Ephemeral keys with 1-hour TTL |
| Key Rotation | Every 30 days or after 1GB data |

### Homomorphic Encryption

**BFV Scheme Specifications**:
- **Scheme**: BFV (Brakerski-Fan-Vercauteren)
- **Security Level**: 128-bit
- **Plaintext Modulus**: 65537
- **Ciphertext Modulus**: 2^15 * 2^440
- **Multiplication Depth**: 10 levels
- **Performance**: 100ms for single multiplication

## Multi-Jurisdictional Data Distribution

### Jurisdictional Architecture

| Jurisdiction | Region | Legal Framework | Data Type |
|--------------|---------|----------------|-----------|
| EU | Frankfurt | GDPR | Full Data |
| Switzerland | Zurich | Swiss DPA | Full Data |
| Singapore | Singapore | PDPA | Full Data |
| US | Limited | CLOUD Act Mitigation | Metadata Only |

### Data Residency Controls

```typescript
class DataResidencyManager {
  private userPreferences: Map<string, ResidencyPreferences>;
  private jurisdictionMappings: Map<string, JurisdictionalNode>;

  async storeUserData(
    userId: string,
    data: UserData,
    preferences: ResidencyPreferences
  ): Promise<void> {
    const jurisdictions = this.selectJurisdictions(preferences);
    const dataShares = await this.splitData(data, jurisdictions.length);
    
    await Promise.all(
      jurisdictions.map(async (jurisdiction, index) => {
        const encryptedShare = await this.encryptForJurisdiction(
          dataShares[index],
          jurisdiction
        );
        await this.storeInJurisdiction(jurisdiction, userId, encryptedShare);
      })
    );
  }
}
```

## Privacy-Preserving Emergency Response

### Differential Privacy Implementation

**Privacy Budget Specifications**:
- **Epsilon (ε)**: 1.0 for standard queries
- **Delta (δ)**: 10^-5 for negligible probability
- **Mechanism**: Laplace mechanism for numeric data
- **Budget Tracking**: Per-user budget management
- **Reset Period**: Monthly budget reset

```typescript
class DifferentialPrivacyManager {
  privatizeLocationQuery(
    userId: string,
    query: LocationQuery,
    sensitivity: number = 1000 // 1km in meters
  ): Promise<LocationResult> {
    // Check privacy budget
    const budgetCheck = await this.budgetTracker.checkBudget(userId, this.spec.epsilon);
    
    // Execute original query
    const originalResult = await this.executeLocationQuery(query);

    // Add Laplace noise
    const privatizedResult = this.addLaplaceNoise(
      originalResult,
      sensitivity,
      this.spec.epsilon
    );

    return privatizedResult;
  }
}
```

### K-Anonymity Processor

**Anonymity Specifications**:
- **K-Value**: 5 minimum anonymity set size
- **Generalization Hierarchy**: Location → District → City → Region → Country
- **Attribute Suppression**: Suppress rare combinations
- **Diversity Check**: Ensure diversity in sensitive attributes
- **Metrics**: t-closeness and l-diversity

```typescript
class KAnonymityProcessor {
  async generalizeUserProfile(
    profile: UserProfile,
    dataset: UserProfile[]
  ): Promise<GeneralizedProfile> {
    const anonymitySet = await this.findAnonymitySet(profile, dataset);
    
    if (anonymitySet.length < this.spec.kValue) {
      throw new Error(`Insufficient anonymity set`);
    }

    // Generalize each attribute
    const generalizedLocation = await this.generalizer.generalizeLocation(
      profile.location,
      anonymitySet.map(p => p.location)
    );
    
    return {
      userId: profile.userId,
      generalizedLocation,
      anonymitySetSize: anonymitySet.length
    };
  }
}
```

## Access Control & Audit Framework

### Hardware Security Module Integration

**HSM Specifications**:
- **Provider**: AWS CloudHSM or Azure Dedicated HSM
- **Security Level**: FIPS 140-2 Level 3
- **Key Storage**: Hardware-backed key storage
- **Operations**: Sign, encrypt, decrypt, key management
- **Performance**: 1000 operations/second

### Immutable Audit Trail

**Audit Specifications**:
- **Immutability**: WORM (Write Once Read Many) storage
- **Integrity**: Cryptographic hash chaining
- **Retention**: 7 years for audit logs
- **Compression**: LZ4 compression for storage efficiency
- **Indexing**: Efficient query capabilities

## Implementation Roadmap

### Phase 1: Zero-Knowledge Trust Foundation (Months 1-2)
- **Month 1**: Core Cryptographic Infrastructure
- **Month 2**: Distributed Trust Storage

### Phase 2: Cryptographic Protection Layers (Months 3-4)
- **Month 3**: Advanced Encryption
- **Month 4**: Privacy-Preserving Identity

### Phase 3: Emergency Response Optimization (Months 5-6)
- **Month 5**: Privacy-Preserving Emergency System
- **Month 6**: Integration & Testing

## Compliance Mapping

### GDPR Compliance
| Principle | Implementation |
|-----------|----------------|
| Data Minimization | Collect only essential emergency data |
| Purpose Limitation | Use data solely for emergency response |
| Storage Limitation | Automatic data expiration and deletion |
| Privacy by Design | Built-in privacy protections from ground up |
| User Rights | Access, correction, and deletion capabilities |

### Cross-Border Compliance
- **Adequacy Decisions**: Use EU-approved jurisdictions
- **Standard Contractual Clauses**: Legal frameworks for data transfers
- **Binding Corporate Rules**: Internal data governance policies
- **Emergency Exceptions**: Limited transfers for vital interests

---

*See [technical-design.md](./technical-design.md) for system specifications and [system-architecture.md](./system-architecture.md) for diagrams.*
