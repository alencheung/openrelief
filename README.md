# OpenRelief v2.0 - Open Source Emergency Coordination Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-v1.0-brightgreen.svg)](CODE_OF_CONDUCT.md)

OpenRelief is an open-source, offline-first Progressive Web App for decentralized emergency coordination. It connects victims with resources via a privacy-preserving interface, addressing scaling bottlenecks through database-native filtering and mitigating "alarm fatigue" through intelligent relevance algorithms.

## 🚀 Quick Start for Contributors

### Core Technologies
- **Frontend**: Next.js 15+ (App Router), TanStack Query, Zustand
- **Maps**: MapLibre GL JS with OpenMapTiles
- **Backend**: Supabase (PostgreSQL 15+ with PostGIS)
- **Infrastructure**: Cloudflare Workers, Edge Functions
- **PWA**: Service Workers with Background Sync

### Prerequisites
```bash
# Node.js 18+ required
node --version

# Supabase CLI for local development
npm install -g supabase

# Git for version control
git --version
```

### Local Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/your-username/openrelief.git
cd openrelief

# Install dependencies
npm install

# Start local Supabase
supabase start

# Run development server
npm run dev
```

## 📋 Project Structure

```
openrelief/
├── docs/                    # Documentation
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand state management
│   └── types/               # TypeScript definitions
├── supabase/                # Database schema and migrations
├── public/                  # Static assets
├── tests/                   # Test suites
└── .github/                 # GitHub workflows and templates
```

## 🎯 Critical Contribution Areas

### 1. Frontend Development (High Priority)
**Skills Needed**: React/Next.js, TypeScript, PWA, MapLibre GL JS

**Critical Tasks**:
- PWA service worker optimization
- MapLibre integration and performance
- Responsive design for mobile devices
- Offline functionality implementation

**Getting Started**:
```bash
# Frontend development server
npm run dev

# Run frontend tests
npm run test:frontend

# Type checking
npm run type-check
```

### 2. Database & Backend (Critical)
**Skills Needed**: PostgreSQL, PostGIS, Supabase, Database Optimization

**Critical Tasks**:
- PostGIS spatial query optimization
- Database schema implementation
- Row Level Security (RLS) policies
- Database triggers and functions

**Getting Started**:
```bash
# Database migrations
supabase db push

# Run database tests
npm run test:database

# Reset local database
supabase db reset
```

### 3. DevOps & Infrastructure (High Priority)
**Skills Needed**: Cloudflare Workers, CI/CD, Supabase Edge Functions

**Critical Tasks**:
- Edge function deployment
- CI/CD pipeline optimization
- Performance monitoring setup
- Security configuration

**Getting Started**:
```bash
# Deploy edge functions
supabase functions deploy

# Run infrastructure tests
npm run test:infrastructure
```

### 4. Mobile & PWA Optimization (Medium Priority)
**Skills Needed**: PWA, iOS/Android development, Service Workers

**Critical Tasks**:
- iOS background processing
- Silent push notifications
- Offline sync mechanisms
- App store deployment

### 5. Security & Privacy (Critical)
**Skills Needed**: Security auditing, GDPR compliance, Authentication

**Critical Tasks**:
- Trust algorithm implementation
- Sybil attack prevention
- Privacy-preserving features
- Security testing

## 🔧 Development Workflow

### 1. Issue Triage
- **Critical**: Security vulnerabilities, blocking bugs
- **High**: Core functionality issues, performance problems
- **Medium**: Feature enhancements, documentation
- **Low**: Minor improvements, code cleanup

### 2. Branch Strategy
```bash
# Main branches
main          # Production-ready code
develop       # Integration branch
feature/*     # Feature development
hotfix/*      # Critical bug fixes
release/*     # Release preparation
```

### 3. Pull Request Process
1. Fork the repository
2. Create feature branch from `develop`
3. Implement changes with tests
4. Ensure all tests pass
5. Submit PR with detailed description
6. Code review and merge

### 4. Testing Requirements
```bash
# Run all tests
npm run test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

## 🚦 Project Phases & Current Focus

### Phase 1: Foundation (Weeks 1-6) - **ACTIVE**
- [x] Repository structure and CI/CD
- [ ] Database schema implementation
- [ ] Next.js PWA setup
- [ ] MapLibre integration

**Current Critical Needs**:
- PostgreSQL/PostGIS expertise for spatial queries
- Frontend developers for PWA implementation
- Security specialists for authentication

### Phase 2: Trust System (Weeks 7-12)
- [ ] Trust score algorithm implementation
- [ ] Consensus engine development
- [ ] Sybil attack prevention

**Upcoming Needs**:
- Data science expertise for trust algorithms
- Backend developers for consensus logic

### Phase 3: Alert Optimization (Weeks 13-18)
- [ ] PostGIS performance optimization
- [ ] Edge function deployment
- [ ] iOS background processing

### Phase 4: Resilience (Weeks 19-24)
- [ ] Offline mesh networking
- [ ] LoRaWAN integration
- [ ] Performance scaling

## 🛠️ Core Resource Requirements

### Essential Development Tools
- **IDE**: VS Code with recommended extensions
- **Database**: Supabase CLI for local development
- **Testing**: Jest, Cypress, Playwright
- **Version Control**: Git with GitHub
- **Communication**: Discord/Slack for team coordination

### Critical Expertise Areas

#### 1. Spatial Database Specialists (URGENT)
**Required Skills**:
- PostgreSQL 15+ with PostGIS 3.3+
- Spatial indexing and query optimization
- Database performance tuning
- Geographic data types and functions

**Contribution Focus**:
- Implementing spatial queries for alert dispatch
- Optimizing database performance for 50K+ users
- Database schema design and migrations

#### 2. Frontend/PWA Developers (HIGH PRIORITY)
**Required Skills**:
- Next.js 15+ with App Router
- Progressive Web App development
- MapLibre GL JS or similar mapping libraries
- TypeScript and modern JavaScript

**Contribution Focus**:
- PWA service worker implementation
- Map integration and performance
- Mobile-responsive design
- Offline functionality

#### 3. Security & Privacy Experts (CRITICAL)
**Required Skills**:
- Authentication and authorization systems
- GDPR compliance and data privacy
- Security auditing and penetration testing
- Cryptography and secure communication

**Contribution Focus**:
- Trust algorithm implementation
- Sybil attack prevention mechanisms
- Privacy-preserving features
- Security testing and validation

#### 4. DevOps/Infrastructure Engineers (HIGH PRIORITY)
**Required Skills**:
- Cloudflare Workers and Edge Functions
- Supabase configuration and optimization
- CI/CD pipeline development
- Performance monitoring and logging

**Contribution Focus**:
- Edge function deployment
- Infrastructure automation
- Performance monitoring setup
- Security configuration

### Nice-to-Have Expertise

#### 1. Mobile Development
- iOS background processing experience
- Android service worker knowledge
- App store deployment processes

#### 2. Data Science
- Trust algorithm design
- Machine learning for behavior analysis
- Statistical modeling for consensus

#### 3. GIS Specialists
- Geographic information systems
- Spatial data analysis
- Mapping and visualization expertise

## 📊 Contribution Guidelines

### Code Standards
```typescript
// Example component structure
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export const EmergencyMap = () => {
  // Component implementation
};
```

### Testing Requirements
- Unit tests for all functions
- Integration tests for critical paths
- E2E tests for user workflows
- Performance tests for database queries

### Documentation Standards
- README for all major components
- API documentation for backend services
- Inline comments for complex logic
- Architecture decision records (ADRs)

## 🤝 Community Guidelines

### Code of Conduct
- Respectful and inclusive communication
- Constructive feedback and collaboration
- Focus on technical merit and community benefit
- Zero tolerance for harassment or discrimination

### Contribution Recognition
- Contributor list in README
- Feature credits in release notes
- Community spotlight in blog posts
- Merit-based maintainer roles

## 📚 Learning Resources

### Technical Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)
- [PostGIS Documentation](https://postgis.net/docs/)

### Project-Specific Resources
- [Architecture Decision Records](docs/adr/)
- [Database Schema Documentation](docs/database/)
- [API Reference](docs/api/)
- [Deployment Guide](docs/deployment/)

## 🆘 Getting Help

### Community Channels
- **Discord**: Join our Discord server (link to be added)
- **GitHub Discussions**: [Ask questions](https://github.com/openrelief/openrelief/discussions)
- **Issues**: [Report bugs or request features](https://github.com/openrelief/openrelief/issues)

### Contributor Support
- **New Contributors**: Start with [good first issues](https://github.com/openrelief/openrelief/labels/good%20first%20issue)
- **Documentation**: [Contributing guide](CONTRIBUTING.md)
- **Technical Questions**: Use GitHub Discussions for general questions

## 🏆 Recognition Program

### Contributor Tiers
- **Contributor**: 1+ merged PRs
- **Active Contributor**: 5+ merged PRs
- **Core Contributor**: 10+ merged PRs + community involvement
- **Maintainer**: Core contributor + ongoing maintenance

### Special Recognition
- **Security Champion**: Critical security contributions
- **Performance Hero**: Significant performance improvements
- **Documentation Master**: Comprehensive documentation updates
- **Community Leader**: Outstanding community support

## 📈 Project Metrics

### Development Goals
- **Code Coverage**: >80% for critical components
- **Performance**: <100ms alert dispatch latency
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Zero critical vulnerabilities

### Community Goals
- **Contributors**: 50+ active contributors
- **Languages**: Multi-language support
- **Deployments**: Multiple regional instances
- **Impact**: Measurable emergency response improvements

## 🔮 Future Roadmap

### Short-term (3 months)
- Complete Phase 1 foundation
- Establish core contributor team
- Deploy initial MVP for testing
- Gather community feedback

### Medium-term (6 months)
- Complete Phase 2 trust system
- Expand contributor base
- Multi-language support
- Performance optimization

### Long-term (12 months)
- Complete all development phases
- Global deployment network
- Advanced offline capabilities
- Hardware integration

---

## 🚀 Ready to Contribute?

1. **Star the repository** to show your support
2. **Fork and clone** to start development
3. **Join our Discord** for community discussion
4. **Pick an issue** to work on
5. **Submit your first PR** and become a contributor!

**Every contribution matters - whether it's code, documentation, testing, or community support. Together, we can build a platform that saves lives during emergencies.**

---

*OpenRelief is licensed under both MIT and AGPLv3. Choose the license that best fits your use case. For commercial use, please consider supporting the project through sponsorship or partnership.*