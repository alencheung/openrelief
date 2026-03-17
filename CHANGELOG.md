# Changelog

All notable changes to OpenRelief will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-03-18

### Added

#### Core Platform

- Offline-first Progressive Web App (PWA) architecture
- MapLibre GL JS integration with OpenMapTiles
- Supabase backend with PostgreSQL 15+ and PostGIS 3.3+
- Real-time emergency event subscriptions
- Trust-weighted consensus engine

#### Emergency Features

- Emergency event reporting and classification
- Location-based alert dispatch with PostGIS spatial queries
- Multi-type emergency support (fire, medical, natural disaster, security)
- Event confirmation and dispute system
- Severity classification (1-5 scale)

#### Trust System

- Trust score calculation (0.0-1.0 range)
- Sybil attack prevention mechanisms
- Trust-weighted voting for consensus
- Behavioral analysis for risk assessment

#### Privacy & Security

- Differential privacy with Laplace noise
- K-anonymity for user data protection
- End-to-end encryption for sensitive data
- Row Level Security (RLS) policies
- Rate limiting with trust-based adjustments

#### PWA Features

- Service worker with background sync
- Offline functionality (24+ hours)
- Silent push notifications
- Installable on desktop and mobile

### Documentation

- Architecture documentation with ADRs
- API reference documentation
- Database schema documentation
- Deployment guides
- Security implementation guide
- Privacy implementation guide

### Infrastructure

- Vercel frontend deployment
- Supabase cloud database
- Cloudflare Workers for edge functions
- GitHub Actions CI/CD pipeline

## [1.0.0] - 2024-06-01

### Added

- Initial MVP release
- Basic emergency reporting
- Simple map interface
- User authentication

---

## Upcoming Features

### [2.1.0] - Planned

- Multi-language support (i18n)
- Offline mesh networking
- Enhanced mobile notifications
- Community organization tools

### [2.2.0] - Planned

- LoRaWAN integration
- Hardware emergency beacons
- Advanced trust algorithms
