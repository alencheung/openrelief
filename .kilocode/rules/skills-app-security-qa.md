# Application Security QA Skill Rules

These rules govern the execution of the Application Security QA skill to ensure
consistent, high-quality security validation and protect sensitive information
during security assessments.

## File Placement Conventions

### Security Report Organization

- Security scan reports MUST be placed in `reports/security/` directories
- SARIF format reports MUST use timestamp naming:
  `security-scan-YYYY-MM-DD-HH-mm-ss.sarif`
- HTML security reports MUST use timestamp naming:
  `security-report-YYYY-MM-DD-HH-mm-ss.html`
- Compliance assessment reports MUST be saved to `reports/security/compliance/`
- Remediation plans MUST be stored in `reports/security/remediation/`

### Security Configuration Files

- Security tool configurations MUST be placed in `config/security/` directories
- Semgrep rules MUST be stored in `config/security/semgrep-rules/`
- OWASP ZAP configurations MUST be stored in `config/security/zap/`
- Snyk configuration files MUST be stored in `config/security/snyk/`

## Pre-deployment Security Requirements

### Security Testing Execution

- MUST run security vulnerability scans with zero high-severity findings before
  deployment
- MUST achieve zero credential leaks in production code before deployment
- MUST complete dependency vulnerability analysis for all package managers
- MUST validate authentication and authorization mechanisms for all API
  endpoints

### Manual Security Review Triggers

- Applications handling sensitive data MUST undergo manual security review
- Custom authentication/authorization implementations MUST be manually verified
- Third-party integrations MUST be assessed for security risks
- Database schema changes MUST be reviewed for data exposure risks

## Security Quality Gates

### Vulnerability Compliance

- All applications MUST validate against OWASP Top 10 standards
- High-severity vulnerabilities MUST have zero tolerance for deployment
- Medium-severity vulnerabilities MUST have documented remediation plans
- Security test coverage MUST be calculated and reported for all critical paths

### Credential Protection

- Hardcoded credentials MUST be prohibited in source code
- API keys and secrets MUST use environment variables or secure vaults
- Database credentials MUST use encrypted storage mechanisms
- Temporary credentials MUST have expiration policies enforced

## Documentation Requirements

### Security Documentation

- All security assessments MUST include threat analysis documentation
- Security findings MUST be classified by severity and business impact
- Remediation steps MUST include specific code examples and implementation
  guidance
- Security test environment MUST be documented with tool versions and
  configurations

### Incident Reporting

- Security violations MUST be tracked with severity levels and remediation
  status
- Security incidents MUST follow established incident response procedures
- Post-incident reviews MUST document lessons learned and process improvements
- Security metrics MUST be tracked and reported to stakeholders regularly

## Integration Requirements

### CI/CD Security Integration

- Security tests MUST run automatically on all pull requests
- Deployment MUST be blocked for high-severity security violations
- Security test results MUST be published to build artifacts
- Security coverage trends MUST be monitored over time

### Tool Configuration

- Security scanning tools MUST be configured with appropriate severity
  thresholds
- Static analysis tools MUST include custom security rules for business logic
- Dynamic analysis tools MUST cover all authenticated and unauthenticated
  endpoints
- Container security scanning MUST be integrated for all Docker deployments

## Enforcement

### Validation Checks

- Pre-commit hooks MUST validate security test file placement
- Build processes MUST verify security coverage thresholds
- Deployment pipelines MUST enforce security quality gates
- Code reviews MUST include security considerations

### Compliance Monitoring

- Regular security audits MUST be scheduled and documented
- Compliance metrics MUST be tracked against security frameworks
- Security training MUST be documented and maintained for development teams
- External security assessments MUST be conducted periodically

## Data Protection Requirements

### Sensitive Information Handling

- Security reports MUST NOT contain actual credentials or secrets
- PII and sensitive data MUST be redacted from security findings
- Security test data MUST use anonymized or synthetic data
- Security tool configurations MUST NOT contain production credentials

### Access Control

- Security report access MUST be restricted to authorized personnel
- Security tool configurations MUST use principle of least privilege
- Security scan results MUST be stored in secure locations
- Audit logs MUST be maintained for all security assessment activities

## Exception Handling

### Security Waivers

- Security violations MAY be temporarily waived with documented business
  justification
- Waivers MUST include remediation timeline, risk acceptance, and owner approval
- Waivers MUST be reviewed by security team lead and documented in security
  tracking system
- Waiver status MUST be reviewed regularly and updated based on remediation
  progress

### Emergency Security Procedures

- Critical security fixes MAY be deployed with documented security debt
- Post-deployment security remediation MUST be scheduled within 24 hours for
  critical issues
- Emergency deployments MUST be reviewed by security team within 1 hour
- Security incident response MUST be initiated immediately for critical
  vulnerabilities

## Tool-Specific Rules

### Snyk Integration

- Snyk scans MUST be configured for all supported package managers
- Snyk severity thresholds MUST align with organizational risk tolerance
- Snyk monitoring MUST be enabled for all production dependencies
- Snyk license compliance MUST be validated for all third-party components

### OWASP ZAP Configuration

- ZAP scans MUST cover all application entry points and API endpoints
- ZAP authentication MUST be configured for authenticated application areas
- ZAP active scan rules MUST be appropriate for application stability
- ZAP reports MUST be reviewed and false positives documented

### Semgrep Rules

- Custom Semgrep rules MUST be validated for false positives before deployment
- Semgrep rule updates MUST be tested in non-production environments
- Semgrep findings MUST be triaged by security team members
- Semgrep rule performance MUST be monitored to avoid CI/CD bottlenecks
