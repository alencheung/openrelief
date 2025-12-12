# Application Security QA Workflow

This workflow executes comprehensive application security quality assurance for
modern web and mobile applications, integrating multiple security tools to
detect vulnerabilities, credential leaks, and dependency issues.

## Workflow Steps

### 1. Load Security Context

First, gather project context to understand the security requirements and scope.

<read_file> <args> <file> <path>skills/app-security-qa/SKILL.md</path> </file>
</args> </read_file>

### 2. Analyze Project Structure

Identify the target languages, frameworks, and security requirements for the
current project.

<search_files> <path>.</path>
<regex>(package\.json|requirements\.txt|pom\.xml|build\.gradle)</regex>
</search_files>

### 3. Execute Security Verification

Run the security verification script to validate inputs and perform initial
security checks.

<execute_command> <command>cd skills/app-security-qa/scripts && node verify.js
--repo-path ../../../ --verbose</command> </execute_command>

### 4. Perform Comprehensive Security Analysis

Based on the project structure, execute appropriate security tools:

#### For JavaScript/TypeScript Projects:

<execute_command> <command>npm audit --audit-level moderate</command>
</execute_command>

#### For Python Projects:

<execute_command> <command>pip-audit</command> </execute_command>

#### For Java Projects:

<execute_command> <command>mvn dependency-check:check</command>
</execute_command>

### 5. Generate Security Reports

Create comprehensive security reports in multiple formats:

<execute_command> <command>mkdir -p reports/security</command>
</execute_command>

### 6. Validate Compliance

Check against OWASP Top 10, CWE, and NIST standards:

<search_files> <path>.</path>
<regex>(password|secret|key|token)\s*=\s*['"][^'"]+['"]</regex>
<file_pattern>\*.js</file_pattern> </search_files>

### 7. Execute Retro Loop

After security analysis completion, gather feedback for continuous improvement:

<ask_followup_question> <question>Security QA analysis complete. Please provide
feedback for improvement:

1. What security issues were missed or difficult to detect?
2. What report format would be more useful for your security team?
3. Any new security constraints or tools discovered during this
   analysis?</question> <follow_up> <suggest>Need more detailed credential leak
   detection with context</suggest> <suggest>Prefer interactive HTML reports
   with remediation links</suggest> <suggest>Add container security scanning for
   Docker deployments</suggest> <suggest>Include API security testing for REST
   endpoints</suggest> </follow_up> </ask_followup_question>

## Security Quality Gates

The workflow enforces these quality gates before completion:

- **High Severity Vulnerabilities**: Must be zero for deployment approval
- **Credential Leaks**: Must be resolved or documented with risk acceptance
- **Dependency Vulnerabilities**: Must be patched or have mitigation plans
- **Compliance Coverage**: Minimum 90% against selected security standards

## Output Artifacts

- `reports/security/security-scan-{timestamp}.sarif` - SARIF format for CI/CD
- `reports/security/security-report-{timestamp}.html` - Interactive HTML report
- `reports/security/compliance-matrix-{timestamp}.json` - Compliance assessment
- `reports/security/remediation-plan-{timestamp}.md` - Prioritized remediation
  steps

## Integration Points

This workflow integrates with:

- CI/CD pipelines for automated security gates
- Code review processes for security validation
- Security incident response for critical findings
- Compliance reporting for audit requirements
