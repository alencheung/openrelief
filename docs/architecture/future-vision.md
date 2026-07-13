# Future Vision (Proposed, Not Implemented)

> ⚠️ **STATUS: PROPOSED.** Everything on this page is a **design proposal**
> that has **not been implemented**. A codebase audit found zero source code
> for any of the cryptographic systems below. This page exists to preserve the
> design thinking in case it's taken up in the future.
>
> For what is actually built today, see
> [Security Architecture](security-architecture.md) and
> [Trust & Consensus](trust-and-consensus.md).

## Background

A series of design analyses (now in [`../archive/analysis/`](../archive/analysis/))
proposed an ambitious "data protection architecture" to address vulnerabilities
in the as-built trust system — chiefly that trust scores are stored
**centrally** and are therefore readable/modifiable by the service role. The
proposed redesign used advanced cryptography to make trust verifiable without
being centrally observable.

The proposal's January–June 2025 implementation timeline elapsed without the
work being done. The detailed designs (data-protection-architecture,
technical-specifications, performance-analysis, migration-strategy,
security-analysis, compliance-mapping, cost-analysis) are preserved in the
archive for reference.

## What was proposed

The vision centered on five cryptographic building blocks:

### 1. Zero-knowledge trust proofs

Instead of storing trust scores centrally, users would commit to their score
with a salted hash and generate **zk-SNARK proofs** (proposed: Poseidon
circuit / Groth16) that their score exceeds a threshold — without revealing
the score itself. The server verifies the proof (target: < 10ms) but never
learns the raw value.

### 2. Distributed trust storage (Shamir secret sharing)

Trust data would be split across **multiple jurisdictions** (proposed:
Frankfurt, Zürich, Singapore, US-limited) using **Shamir 3-of-5 secret
sharing**. No single node could reconstruct a user's full trust record,
providing resistance to legal compulsion (CLOUD Act / PATRIOT Act).

### 3. End-to-end encryption with forward secrecy

User-controlled keys (X25519 / AES-256-GCM / HKDF) with **ephemeral session
keys** (1-hour TTL) would ensure that even a compromised server can't
retroactively decrypt historical data.

### 4. Homomorphic trust computation

A **BFV homomorphic-encryption scheme** (proposed: via SEAL) would let the
server compute aggregate trust statistics over encrypted values — never
decrypting individual scores.

### 5. Differential privacy + k-anonymity at rest

Beyond the differential privacy and k-anonymity already implemented in
[`src/lib/privacy/`](../../src/lib/privacy/), the proposal specified
stricter parameters (ε = 1.0, δ = 10⁻⁵, k = 5) and HSM-backed key management
(FIPS 140-2 Level 3).

## Why it isn't built

Per the archived `project-evaluation-report.md` snapshot (Nov 2025), the
foundational phases of this work were not completed. The cryptography stack
is genuinely hard — ZK circuits, homomorphic schemes, and multi-party
threshold systems each carry significant implementation and operational
complexity, and the team prioritized shipping the working centralized-trust
system instead.

## Considerations if revisited

If a future contributor wants to revive any of this:

1. **Start small** — a single zk-SNARK proof of "score ≥ threshold" is the
   highest-value, lowest-complexity piece and could be added without the
   multi-jurisdictional storage.
2. **The as-built defenses are real** — the implemented differential-privacy,
   k-anonymity, E2E encryption, RLS, and audit layers
   ([Security Architecture](security-architecture.md)) already provide
   substantial protection; the ZK work is additive, not a replacement.
3. **Verify against current code** — the archived specs reference a `topics`
   table and structures that don't match the current `emergency_types`
   schema. Re-align before relying on any DDL in the archive.
4. **Read the archived analyses critically** — they include speculative cost
   figures and ROI projections that should be re-derived from current
   realities.

## Source material (archived)

| Archived source | What it covers |
| --- | --- |
| [`../archive/analysis/data-protection-architecture.md`](../archive/analysis/data-protection-architecture.md) | The flagship proposal (full) |
| [`../archive/analysis/technical-specifications.md`](../archive/analysis/technical-specifications.md) | Expanded pseudo-implementation (TypeScript/Circom stubs) |
| [`../archive/analysis/system-diagrams.md`](../archive/analysis/system-diagrams.md) | 12 Mermaid diagrams of the proposed architecture |
| [`../archive/analysis/performance-analysis.md`](../archive/analysis/performance-analysis.md) | Performance-impact analysis of the crypto operations |
| [`../archive/analysis/migration-strategy.md`](../archive/analysis/migration-strategy.md) | Phased migration from the current system |
| [`../archive/analysis/security-analysis.md`](../archive/analysis/security-analysis.md) | Threat models for the proposed system |
| [`../archive/analysis/compliance-mapping.md`](../archive/analysis/compliance-mapping.md) | GDPR/CCPA/PDPA/PIPEDA mapping |
| [`../archive/analysis/cost-analysis.md`](../archive/analysis/cost-analysis.md) | Cost projections (speculative) |
| [`../archive/architecture/data-protection.md`](../archive/architecture/data-protection.md) | Earlier condensed version in the old docs tree |
