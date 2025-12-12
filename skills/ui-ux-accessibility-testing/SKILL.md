---
name: ui-ux-accessibility-testing
description:
  Comprehensive accessibility, usability, and visual regression testing for
  deploy-ready features and components
---

# Overview

This skill provides comprehensive UI/UX testing focusing on accessibility,
usability, and visual regression to ensure features and components are
deploy-ready with inclusive design principles.

## When to use

Use this skill when:

- Testing new features or components before deployment
- Validating accessibility compliance for user workflows
- Conducting visual regression tests for UI changes
- Ensuring inclusive design practices are followed
- Preparing for deployment with quality gates

## Inputs

- Feature descriptions and user workflows
- Component paths and selectors (optional)
- Test configuration parameters (optional)
- Accessibility compliance level (WCAG 2.1 AA by default)

## Outputs

- Comprehensive accessibility audit report
- Specific violation details with actionable fixes
- Visual regression test results
- Usability assessment recommendations
- Coverage metrics and compliance scores

## Procedure

1. **Input Validation**
   - Validate feature descriptions and user workflows
   - Check required test parameters and configuration
   - Verify component paths and selectors if provided

2. **Accessibility Testing**
   - Run automated accessibility tests using axe-core integration
   - Validate WCAG 2.1 AA compliance
   - Check keyboard navigation and screen reader compatibility
   - Test color contrast and focus management

3. **Visual Regression Testing**
   - Capture baseline screenshots for components
   - Compare against reference images
   - Identify visual differences and layout shifts
   - Generate diff reports for review

4. **Usability Assessment**
   - Evaluate user workflow completion paths
   - Check interaction patterns and feedback mechanisms
   - Assess error handling and recovery flows
   - Validate responsive design behavior

5. **Report Generation**
   - Compile accessibility violation details
   - Provide specific fix recommendations
   - Generate visual regression diff reports
   - Calculate coverage metrics and compliance scores

6. **Quality Gate Validation**
   - Verify 80% accessibility test coverage requirement
   - Check for zero high-priority violations
   - Flag items requiring manual review
   - Provide deployment readiness assessment

## Guardrails

- Do not proceed without valid feature descriptions
- Never skip accessibility compliance checks
- Always require manual review for complex interaction patterns
- Do not override high-priority violation requirements
- Ensure all tests run in appropriate test environment

## Examples

### Example 1: New Feature Testing

```
Input: User registration workflow with email verification
Output: Accessibility audit with 2 medium-priority violations, visual regression passed, 85% coverage
```

### Example 2: Component Update

```
Input: Updated navigation component with new menu structure
Output: 3 accessibility violations (focus management), visual differences identified, 78% coverage
```

### Example 3: Responsive Design Validation

```
Input: Mobile-first dashboard component
Output: Accessibility compliant, visual regression passed on all breakpoints, 92% coverage
```

## Failure modes

## Evaluation checklist

## Changelog
