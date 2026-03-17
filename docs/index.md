# OpenRelief Documentation

Welcome to the OpenRelief documentation. This guide helps you find the
information you need quickly.

---

## Quick Links

| I want to...                | Go to                              |
| --------------------------- | ---------------------------------- |
| Get started quickly         | [Quick Start](#quick-start)        |
| Understand the architecture | [Architecture](architecture/)      |
| Use the API                 | [API Reference](api/)              |
| Deploy the platform         | [Deployment Guide](deployment/)    |
| Contribute code             | [Contributing](../CONTRIBUTING.md) |
| Report a security issue     | [Security Policy](../SECURITY.md)  |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/openrelief/openrelief.git
cd openrelief

# Install dependencies
npm install

# Start local Supabase
supabase start

# Run development server
npm run dev
```

See [Getting Started](getting-started/) for detailed setup instructions.

---

## Documentation by Audience

### For End Users

| Document                                                                  | Description                 |
| ------------------------------------------------------------------------- | --------------------------- |
| [User Guide](user-onboarding/USER_ONBOARDING_GUIDE.md)                    | Complete user documentation |
| [Emergency Quick Reference](quick-reference/EMERGENCY_QUICK_REFERENCE.md) | Emergency procedures        |
| [Accessibility Guide](accessibility/USER_ACCESSIBILITY_GUIDE.md)          | Accessibility features      |

### For Developers

| Document                                                         | Description            |
| ---------------------------------------------------------------- | ---------------------- |
| [Contributing Guide](../CONTRIBUTING.md)                         | How to contribute      |
| [Architecture](architecture/)                                    | System design          |
| [API Reference](api/)                                            | API documentation      |
| [Database Schema](database/)                                     | Database documentation |
| [Development Guide](development/DEVELOPER_CONTRIBUTION_GUIDE.md) | Development setup      |

### For DevOps

| Document                                               | Description             |
| ------------------------------------------------------ | ----------------------- |
| [Deployment Guide](deployment/)                        | Deployment instructions |
| [Operations Runbook](operations/DEPLOYMENT_RUNBOOK.md) | Operational procedures  |
| [Monitoring](monitoring/)                              | Monitoring setup        |

### For Security Teams

| Document                    | Description              |
| --------------------------- | ------------------------ |
| [Security Guide](security/) | Security implementation  |
| [Privacy Guide](privacy/)   | Privacy features         |
| [Legal Framework](legal/)   | Compliance documentation |

---

## Documentation by Topic

### Architecture & Design

- [Technical Design](architecture/technical-design.md)
- [System Architecture](architecture/system-architecture.md)
- [Data Protection](architecture/data-protection.md)
- [ADR-001: Technical Architecture](architecture/ADR-001-technical-architecture.md)

### API & Database

- [API Endpoints](api/endpoints.md)
- [Database Schema](database/schema.md)
- [Spatial Queries](database/README.md#spatial-query-examples)

### Deployment & Operations

- [Deployment Guide](deployment/deployment-guide.md)
- [Community Deployment](deployment/COMMUNITY_DEPLOYMENT_GUIDE.md)
- [Production Runbook](operations/DEPLOYMENT_RUNBOOK.md)

### Security & Privacy

- [Security Implementation](security/SECURITY_IMPLEMENTATION_GUIDE.md)
- [Privacy Implementation](privacy/Privacy_Implementation_Guide.md)
- [Legal Framework](legal/OpenRelief_Legal_Framework_Analysis.md)

---

## Project Structure

```
openrelief/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
├── supabase/             # Database migrations
├── docs/                 # Documentation
├── tests/                # Test suites
└── .github/              # GitHub workflows
```

---

## Getting Help

- **Documentation Issues**:
  [Open an issue](https://github.com/openrelief/openrelief/issues)
- **Questions**:
  [GitHub Discussions](https://github.com/openrelief/openrelief/discussions)
- **Security**: security@openrelief.org

---

_Good documentation saves lives. In emergencies, clear information makes the
difference._
