---
name: app-security-qa
description:
  Comprehensive application security quality assurance framework for
  vulnerability scanning, credential detection, and dependency analysis
---

# Overview

The Application Security QA skill provides a comprehensive framework for
automating security quality assurance in modern web and mobile applications. It
integrates multiple security tools to detect vulnerabilities, credential leaks,
and dependency issues across the development lifecycle.

## When to use

- When implementing security validation in CI/CD pipelines
- When conducting security audits of code repositories
- When setting up pre-commit security hooks
- When performing vulnerability assessments for web/mobile applications
- When ensuring compliance with security standards (OWASP Top 10, CWE, NIST)

## Inputs

- Code repository path or URL
- Target languages (JavaScript/TypeScript, Python, Java, React Native)
- Security tools configuration (Snyk, OWASP ZAP, Semgrep)
- Compliance standards to validate against
- Report output format (SARIF, HTML)
- Scan scope (full repository, specific directories, or files)

## Outputs

- Security vulnerability reports in SARIF and HTML formats
- Credential leak detection results
- Dependency vulnerability analysis
- Compliance assessment reports
- Security recommendations and remediation guidance
- Risk scoring and prioritization

## Procedure

1. **Environment Setup**
   - Validate required security tools are installed (Snyk, OWASP ZAP, Semgrep)
   - Configure authentication for security scanning services
   - Set up reporting directories and formats

2. **Static Analysis**
   - Run Semgrep for custom security rule validation
   - Execute Snyk for dependency vulnerability scanning
   - Perform credential leak detection using pattern matching

3. **Dynamic Analysis**
   - Configure and run OWASP ZAP for web application security testing
   - Perform API endpoint security validation
   - Test authentication and authorization mechanisms

4. **Compliance Validation**
   - Map findings to OWASP Top 10 categories
   - Validate against CWE and NIST standards
   - Generate compliance gap analysis

5. **Report Generation**
   - Aggregate findings from all security tools
   - Generate SARIF reports for CI/CD integration
   - Create HTML reports for human review
   - Prioritize vulnerabilities by risk score

6. **Remediation Guidance**
   - Provide specific fix recommendations
   - Generate security best practices documentation
   - Create remediation task lists

## Guardrails

- Do not scan production environments without proper authorization
- Respect rate limits for external security APIs
- Ensure sensitive data is not included in security reports
- Validate scan scope to avoid unintended system access
- Follow responsible disclosure practices for discovered vulnerabilities

## Examples

### Example 1: CI/CD Pipeline Integration

```
Trigger: "Run security QA for main branch"
Input: Repository path, target languages, compliance standards
Output: SARIF report, HTML dashboard, compliance status
```

### Example 2: Pre-commit Security Check

```
Trigger: "Security pre-commit hook"
Input: Changed files, language detection
Output: Fast security validation, blocking high-severity issues
```

### Example 3: Comprehensive Security Audit

```
Trigger: "Quarterly security assessment"
Input: Full repository, all supported languages, full tool suite
Output: Complete security report, remediation roadmap, compliance matrix
```

## Failure modes

### Common Issues

- **False Positives**: Security tools may flag legitimate code as
  vulnerabilities
  - Mitigation: Regular rule tuning and custom rule development
- **Performance Bottlenecks**: Large codebases may cause slow scan times
  - Mitigation: Implement incremental scanning and parallel processing
- **Tool Integration Failures**: Security tools may fail to authenticate or
  connect
  - Mitigation: Validate tool configurations before full scans
- **Report Generation Errors**: Memory issues with large security reports
  - Mitigation: Implement report chunking and streaming

### Edge Cases

- **Legacy Code**: Older codebases may not conform to modern security standards
- **Third-party Dependencies**: Unmaintained packages with known vulnerabilities
- **Custom Authentication**: Non-standard authentication mechanisms may evade
  detection
- **Encrypted Code**: Obfuscated or encrypted code may hide vulnerabilities

## Evaluation checklist

### Pre-Execution Validation

- [ ] Security tools are properly installed and authenticated
- [ ] Target repository is accessible and contains supported file types
- [ ] Output directories exist with proper permissions
- [ ] Security tool configurations are appropriate for target environment
- [ ] Scan scope is properly defined to avoid unintended access

### During Execution Monitoring

- [ ] Security scans complete without critical errors
- [ ] Memory and CPU usage remain within acceptable limits
- [ ] All supported file types are being analyzed
- [ ] Network connectivity for external security services is maintained
- [ ] Scan progress is properly logged and tracked

### Post-Execution Validation

- [ ] Security reports are generated in required formats (SARIF, HTML)
- [ ] High-severity vulnerabilities are properly identified and prioritized
- [ ] Credential leaks are detected with context information
- [ ] Dependency analysis includes all package managers
- [ ] Compliance assessment covers selected standards (OWASP, CWE, NIST)
- [ ] Remediation guidance is actionable and specific
- [ ] Report artifacts are stored in correct directory structure
- [ ] Sensitive information is properly redacted from reports

### Quality Assurance

- [ ] False positive rate is within acceptable thresholds (<20%)
- [ ] Scan completion time is reasonable for codebase size
- [ ] Reports are readable and actionable for security teams
- [ ] Integration with CI/CD pipelines functions correctly
- [ ] Security quality gates are enforced appropriately

## Changelog

### Version 1.0.0 (2025-12-12)

- Initial implementation of Application Security QA skill
- Core security scanning capabilities for JavaScript/TypeScript, Python, Java,
  React Native
- Integration with Snyk, OWASP ZAP, and Semgrep security tools
- SARIF and HTML report generation
- OWASP Top 10, CWE, and NIST compliance validation
- CI/CD pipeline integration support
- Pre-commit and deployment security gates
- Comprehensive guardrails and enforcement rules
- Retro loop mechanism for continuous improvement
