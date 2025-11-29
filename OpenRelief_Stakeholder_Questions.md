# OpenRelief Stakeholder Clarification Questions

## Executive Summary

This document outlines critical questions and clarifications needed from stakeholders to ensure successful delivery of the OpenRelief v2.0 platform. The questions are organized by category and priority to facilitate efficient decision-making.

## Priority Classification

- **Critical**: Required before development can proceed
- **High**: Needed within first 2 weeks of development
- **Medium**: Needed within first 6 weeks
- **Low**: Can be addressed during development

## Critical Questions (Answer Required Before Development Start)

### 1. Trust Score Algorithm Specifications

#### 1.1 Trust Score Calculation Logic
**Question**: What specific user behaviors should increase trust scores, and by what magnitude?
**Options**:
- A) Accurate emergency reports (+0.1), verified events (+0.05), community endorsements (+0.02)
- B) Time-based reliability (accurate reports over 30 days), location consistency, report quality
- C) Custom algorithm based on historical data analysis

**Impact**: Affects Task 2.1.1 (Trust Score Algorithm) and entire consensus system

#### 1.2 Initial Trust Score for New Users
**Question**: Should new users start with the default 0.1 trust score, or should we implement a different strategy?
**Options**:
- A) Fixed 0.1 for all new users (as specified)
- B) Variable based on verification method (email: 0.1, phone: 0.2, ID verification: 0.3)
- C) Probationary period with gradual increase

**Impact**: Affects onboarding experience and Sybil attack prevention

#### 1.3 Trust Score Decay Rate
**Question**: What should be the time decay rate for trust scores, and over what period?
**Options**:
- A) Linear decay over 90 days of inactivity
- B) Exponential decay with half-life of 30 days
- C) No decay for verified users, linear for others

**Impact**: Affects user engagement strategies and long-term system health

### 2. Emergency Event Classification

#### 2.1 Severity Level Criteria
**Question**: What are the specific criteria for each severity level (1-5)?
**Details Needed**:
- Level 1: Minor incidents (what examples?)
- Level 2: Moderate local impact
- Level 3: Significant regional impact
- Level 4: Major emergency
- Level 5: Catastrophic event

**Impact**: Affects alert prioritization, fatigue guard algorithm, and user trust

#### 2.2 Event Radius Determination
**Question**: How should the alert radius be determined for different event types?
**Options**:
- A) Fixed radii by severity (Level 1: 100m, Level 2: 500m, Level 3: 1km, Level 4: 5km, Level 5: 10km)
- B) Dynamic based on event type and population density
- C) User-configurable with recommended defaults

**Impact**: Affects spatial query performance and alert relevance

#### 2.3 Event Resolution Criteria
**Question**: What constitutes event resolution vs. natural expiration?
**Options**:
- A) Manual resolution by trusted users only
- B) Automatic resolution after 24 hours without updates
- C) Hybrid: auto-resolve with manual override capability

**Impact**: Affects database cleanup, user experience, and system performance

### 3. Privacy and Data Retention

#### 3.1 Location Data Retention
**Question**: How long should user location data be retained, and what anonymization is required?
**Options**:
- A) 30 days with precision reduction to 100m after 7 days
- B) 7 days with complete deletion
- C) 90 days with differential privacy techniques

**Impact**: Affects GDPR compliance, database storage, and user privacy

#### 3.2 Emergency Data Anonymization
**Question**: What specific emergency data should be anonymized, and when?
**Details Needed**:
- Reporter identity protection timeline
- Location precision requirements
- Data sharing policies with authorities

**Impact**: Affects database design, legal compliance, and user trust

## High Priority Questions (Answer Within 2 Weeks)

### 4. User Interface and Experience

#### 4.1 Alert Prioritization Display
**Question**: How should multiple simultaneous alerts be displayed to users?
**Options**:
- A) Single most relevant alert with expansion option
- B) Chronological list with severity indicators
- C) Map-based visualization with alert clusters

**Impact**: Affects frontend design and user experience

#### 4.2 Maximum Alert Frequency
**Question**: What is the maximum alert frequency per user to prevent fatigue?
**Options**:
- A) Maximum 3 alerts per hour, 10 per day
- B) Relevance-based throttling (no hard limit)
- C) User-configurable with intelligent defaults

**Impact**: Affects fatigue guard algorithm implementation

#### 4.3 False Positive Handling
**Question**: How should false positives be handled in the trust system?
**Options**:
- A) Automatic trust score reduction for reporters
- B) Community voting system for dispute resolution
- C) Manual review by administrators

**Impact**: Affects trust algorithm and user community dynamics

### 5. Technical Implementation

#### 5.1 OpenAI API Integration
**Question**: What specific OpenAI API endpoints should be used for text classification?
**Details Needed**:
- Model selection (GPT-3.5, GPT-4, fine-tuned models)
- Classification categories and confidence thresholds
- Cost constraints and rate limiting requirements

**Impact**: Affects backend integration and operational costs

#### 5.2 Push Notification Providers
**Question**: Are there preferred providers for push notifications beyond FCM?
**Options**:
- A) FCM only (as specified)
- B) Multiple providers for redundancy (FCM + APNs + WebPush)
- C) Custom push notification service

**Impact**: Affects iOS background strategy and reliability

#### 5.3 HXL Data Sources
**Question**: What specific HXL data sources should be integrated initially?
**Details Needed**:
- Priority data sources (UN OCHA, Red Cross, government agencies)
- Update frequency requirements
- Data validation and cleaning processes

**Impact**: Affects resource tagging system implementation

## Medium Priority Questions (Answer Within 6 Weeks)

### 6. Offline Functionality

#### 6.1 Offline Data Cache Scope
**Question**: What specific data should be cached for offline use?
**Options**:
- A) User profile, recent alerts, map tiles for current location
- B) All user data plus regional resource information
- C) Configurable based on device storage

**Impact**: Affects local storage implementation and sync strategy

#### 6.2 Offline Data Retention
**Question**: How long should offline data persist before cleanup?
**Options**:
- A) 7 days for alerts, 30 days for user data
- B) Until next successful sync
- C) User-configurable with intelligent defaults

**Impact**: Affects storage management and user experience

#### 6.3 Sync Conflict Resolution
**Question**: What is the priority order for offline sync conflicts?
**Options**:
- A) Server data always wins
- B) Most recent timestamp wins
- C) User-mediated resolution for critical conflicts

**Impact**: Affects conflict resolution algorithm design

### 7. Performance and Scalability

#### 7.1 Geographic Coverage
**Question**: What is the target geographic coverage for initial deployment?
**Options**:
- A) Single country/region for pilot
- B) Multiple countries with different languages
- C) Global deployment from day one

**Impact**: Affects infrastructure design and testing strategy

#### 7.2 Expected User Scale
**Question**: What are the realistic user growth expectations for the first year?
**Details Needed**:
- Month 1: 1,000 users
- Month 6: 10,000 users
- Month 12: 50,000 users
- Peak concurrent users during emergencies

**Impact**: Affects database sizing and infrastructure planning

#### 7.3 Emergency Response Integration
**Question**: How should the system integrate with official emergency response services?
**Options**:
- A) Read-only integration with official feeds
- B) Two-way communication with emergency services
- C) Standalone system with optional data sharing

**Impact**: Affects API design and data flow architecture

## Low Priority Questions (Can Be Addressed During Development)

### 8. Future Features and Roadmap

#### 8.1 LoRaWAN Hardware Specifications
**Question**: What specific LoRaWAN hardware standards should be supported?
**Details Needed**:
- Frequency bands (868MHz, 915MHz, etc.)
- Data rate requirements
- Power constraints
- Cost targets

**Impact**: Affects hardware integration strategy

#### 8.2 Mesh Network Topology
**Question**: What is the target mesh network topology for device-to-device communication?
**Options**:
- A) Star topology with central coordinator
- B) Full mesh with multi-hop routing
- C) Hybrid approach based on device capabilities

**Impact**: Affects peer discovery algorithm design

#### 8.3 Integration with Existing Systems
**Question**: Are there existing emergency management systems that require integration?
**Details Needed**:
- Government emergency systems
- NGO coordination platforms
- Commercial alert services

**Impact**: Affects API design and data exchange protocols

## Decision Matrix

### Immediate Decisions Required (Week 1)

| Question | Decision Maker | Deadline | Impact |
|----------|----------------|----------|--------|
| Trust score calculation logic | Technical Lead + Product Owner | Day 3 | Critical path |
| Initial trust score strategy | Product Owner | Day 3 | User onboarding |
| Severity level criteria | Emergency Management Expert | Day 5 | Alert system |
| Location data retention policy | Legal + Compliance | Day 5 | GDPR compliance |

### Short-term Decisions (Week 2-3)

| Question | Decision Maker | Deadline | Impact |
|----------|----------------|----------|--------|
| Event radius determination | Technical Lead + UX Designer | Week 2 | Spatial queries |
| Alert prioritization display | UX Designer + Product Owner | Week 2 | Frontend design |
| OpenAI API configuration | Technical Lead | Week 3 | Backend integration |
| Push notification strategy | DevOps Lead | Week 3 | iOS background |

### Medium-term Decisions (Week 4-6)

| Question | Decision Maker | Deadline | Impact |
|----------|----------------|----------|--------|
| Offline cache scope | Technical Lead + UX Designer | Week 4 | Local storage |
| Geographic coverage | Product Owner + Stakeholders | Week 5 | Infrastructure |
| Emergency response integration | Product Owner + External Partners | Week 6 | API design |

## Recommendation Summary

### Recommended Approaches

1. **Trust Score**: Implement Option B (time-based reliability with location consistency)
2. **Initial Trust**: Use Option A (fixed 0.1) with verification bonuses
3. **Severity Criteria**: Adopt international emergency classification standards
4. **Event Radius**: Use Option A (fixed by severity) with future dynamic capability
5. **Location Retention**: Option A (30 days with precision reduction) for GDPR compliance

### Rationale

These recommendations balance:
- **Security**: Robust Sybil attack prevention
- **Privacy**: GDPR compliance and user trust
- **Performance**: Efficient database operations
- **Usability**: Intuitive user experience
- **Scalability**: Support for growth and expansion

### Next Steps

1. Schedule stakeholder meeting to review critical questions
2. Document decisions in project requirements
3. Update technical specifications based on decisions
4. Begin development with clarified requirements
5. Establish regular review cadence for remaining questions

## Review Schedule

- **Weekly**: Technical team standup (question status updates)
- **Bi-weekly**: Stakeholder review (decision validation)
- **Monthly**: Full project review (requirement adjustments)

This document will be updated regularly as questions are answered and new clarifications are needed throughout the project lifecycle.