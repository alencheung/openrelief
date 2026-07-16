# Security Policy

## Supported Versions

| Version | Supported                         |
| ------- | --------------------------------- |
| 2.x     | :white_check_mark: Active support |
| < 2.0   | :x: End of life                   |

## Reporting a Vulnerability

**Do NOT report security vulnerabilities through public GitHub issues.**

### Reporting Process

1. **Email**: Send details to security@openrelief.org
2. **Encrypt**: Use PGP for sensitive information
3. **Response**: We aim to respond within 48 hours

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)
- Your contact information

### Response Timeline

| Stage                   | Timeline                        |
| ----------------------- | ------------------------------- |
| Initial response        | 48 hours                        |
| Triage & confirmation   | 5 business days                 |
| Fix development         | 14-30 days (severity dependent) |
| Disclosure coordination | After fix deployed              |

### Disclosure Policy

We follow **coordinated disclosure**:

1. Report received and confirmed
2. Fix developed and tested
3. Patch released to production
4. CVE assigned (if applicable)
5. Public disclosure after 30 days

### Security Measures

OpenRelief implements defense-in-depth security:

- **Authentication**: Supabase Auth with MFA support
- **Authorization**: Row Level Security (RLS) policies
- **Rate Limiting**: Tiered limits with trust-based adjustments
- **Input Validation**: Comprehensive sanitization
- **Encryption**: AES-256-GCM for data, TLS 1.3 in transit
- **Monitoring**: Real-time threat detection via Sentry

For detailed implementation, see
[Security Implementation Guide](docs/security/SECURITY_IMPLEMENTATION_GUIDE.md).

## Security Features

### Trust-Based Access Control

Users have trust scores (0.0-1.0) affecting:

- Rate limiting thresholds
- Feature access
- Voting weight

### Sybil Attack Prevention

- Behavioral analysis
- Network clustering detection
- Geographic anomaly detection

### Privacy Protection

- Differential privacy with Laplace noise
- K-anonymity for user data
- End-to-end encryption
- Automatic temporal data decay

## Security Best Practices

### Code Security

```bash
npm audit
npm run test:security
```

### Secrets Management

- Never commit API keys or tokens
- Use environment variables
- Rotate credentials regularly

## Contact

- **Security Team**: security@openrelief.org
- **Emergency**: emergency@openrelief.org
