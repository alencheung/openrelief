# UI/UX Accessibility Testing Skill Rules

These rules govern the execution of the UI/UX accessibility testing skill to
ensure consistent, high-quality accessibility validation.

## File Placement Conventions

### Test File Organization

- Accessibility tests MUST be placed in `__tests__/accessibility/` directories
  within component folders
- Visual regression tests MUST be placed in `__tests__/visual/` directories
- Usability test scenarios MUST be documented in `docs/testing/usability/`
- Test fixtures and baseline images MUST be stored in `__tests__/fixtures/`

### Report Structure

- Accessibility audit reports MUST be saved to `reports/accessibility/`
- Visual regression diffs MUST be saved to `reports/visual/`
- Usability assessment reports MUST be saved to `reports/usability/`
- All reports MUST include timestamp in filename:
  `report-YYYY-MM-DD-HH-mm-ss.json`

## Pre-deployment Requirements

### Testing Execution

- MUST run accessibility tests with 80% minimum coverage before deployment
- MUST achieve zero high-priority accessibility violations before deployment
- MUST complete visual regression tests for all UI components
- MUST validate keyboard navigation for all interactive elements

### Manual Review Triggers

- Complex interaction patterns MUST undergo manual accessibility review
- Custom components MUST be tested with screen readers
- Dynamic content changes MUST be validated for accessibility
- Multi-step workflows MUST be tested for usability

## Quality Gates

### Accessibility Compliance

- All tests MUST validate against WCAG 2.1 AA standards
- Color contrast MUST meet 4.5:1 ratio for normal text
- Focus indicators MUST be visible for all interactive elements
- Alternative text MUST be provided for all meaningful images

### Test Coverage

- Accessibility test coverage MUST be calculated and reported
- Components with < 80% coverage CANNOT be deployed
- Critical user paths MUST have 100% accessibility test coverage
- Coverage gaps MUST be documented with remediation plans

## Documentation Requirements

### Test Documentation

- All accessibility tests MUST include descriptions of tested scenarios
- Expected results MUST be clearly defined for each test
- Test data MUST include diverse user scenarios (disability types)
- Test environment MUST be documented (browser, assistive technology)

### Issue Tracking

- Accessibility violations MUST be tracked with severity levels
- Fix recommendations MUST be provided for each violation
- Violation fixes MUST be validated through re-testing
- Accessibility issues MUST be prioritized based on impact

## Integration Requirements

### CI/CD Integration

- Accessibility tests MUST run automatically on pull requests
- Deployment MUST be blocked for high-priority violations
- Test results MUST be published to build artifacts
- Coverage trends MUST be monitored over time

### Tool Configuration

- axe-core MUST be configured with appropriate rulesets
- Playwright/Cypress MUST include accessibility plugins
- Visual regression tools MUST be configured for consistent captures
- Screen reader testing MUST use standard configurations

## Enforcement

### Validation Checks

- Pre-commit hooks MUST validate accessibility test file placement
- Build processes MUST verify coverage thresholds
- Deployment pipelines MUST enforce quality gates
- Code reviews MUST include accessibility considerations

### Compliance Monitoring

- Regular accessibility audits MUST be scheduled
- Compliance metrics MUST be tracked and reported
- Team training MUST be documented and maintained
- External accessibility reviews MUST be conducted periodically

## Exception Handling

### Temporary Waivers

- Accessibility violations MAY be temporarily waived with documented
  justification
- Waivers MUST include remediation timeline and owner
- Waivers MUST be approved by accessibility team lead
- Waiver status MUST be reviewed regularly

### Emergency Deployments

- Critical fixes MAY be deployed with documented accessibility debt
- Post-deployment accessibility remediation MUST be scheduled within 5 business
  days
- Emergency deployments MUST be reviewed by accessibility team
- Lessons learned MUST be documented and incorporated into process
