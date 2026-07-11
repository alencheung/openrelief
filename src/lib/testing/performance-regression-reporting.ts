/**
 * Performance Regression Testing - Report Generation
 *
 * Extracted from performance-regression-testing.ts. Provides standalone
 * report generators (JUnit XML, HTML, Markdown) and a dispatcher that
 * writes the requested report formats onto a results object's artifacts,
 * plus a helper to send reports to configured destinations.
 */

import { PerformanceRegressionResults } from './performance-regression-types'

/**
 * Generate a JUnit XML report from the regression test results.
 */
export function generateJUnitReport(results: PerformanceRegressionResults): string {
  const testsuite = {
    name: `Performance Regression Test - ${results.config.name}`,
    tests: results.summary.totalTests,
    failures: results.summary.failedTests,
    errors: results.summary.criticalFailures,
    time: results.duration / 1000,
    testcase: results.comparisons.map(comparison => ({
      classname: comparison.category,
      name: comparison.metric,
      time: 0,
      failure: comparison.status === 'fail' ? {
        message: `Performance threshold exceeded: ${comparison.current} > ${comparison.threshold}`,
        _text: `Baseline: ${comparison.baseline}, Current: ${comparison.current}, Change: ${comparison.changePercent.toFixed(2)}%`
      } : undefined
    }))
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${testsuite.name}" tests="${testsuite.tests}" failures="${testsuite.failures}" errors="${testsuite.errors}" time="${testsuite.time}">
${testsuite.testcase.map(test => `  <testcase classname="${test.classname}" name="${test.name}" time="${test.time}">
${test.failure ? `    <failure message="${test.failure.message}">${test.failure._text}</failure>` : ''}
  </testcase>`).join('\n')}
</testsuite>`
}

/**
 * Generate an HTML report from the regression test results.
 */
export function generateHTMLReport(results: PerformanceRegressionResults): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
        .violations { margin: 20px 0; }
        .violation { background-color: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #f44336; }
        .violation.high { border-left-color: #ff9800; }
        .violation.critical { border-left-color: #f44336; }
        .recommendations { background-color: #e8f5e8; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .pass { color: green; }
        .warn { color: orange; }
        .fail { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Regression Test Report</h1>
        <p><strong>Test:</strong> ${results.config.name}</p>
        <p><strong>Date:</strong> ${results.timestamp.toISOString()}</p>
        <p><strong>Status:</strong> <span class="${results.status}">${results.status.toUpperCase()}</span></p>
        <p><strong>Duration:</strong> ${(results.duration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${results.summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="pass">${results.summary.passedTests}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="fail">${results.summary.failedTests}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3 class="fail">${results.summary.criticalFailures}</h3>
            <p>Critical</p>
        </div>
    </div>

    <h2>Performance Violations</h2>
    <div class="violations">
        ${results.violations.map(violation => `
            <div class="violation ${violation.severity}">
                <h4>${violation.category.toUpperCase()}: ${violation.metric}</h4>
                <p><strong>Severity:</strong> ${violation.severity.toUpperCase()}</p>
                <p><strong>Description:</strong> ${violation.description}</p>
                <p><strong>Impact:</strong> ${violation.impact}</p>
                <p><strong>Recommendation:</strong> ${violation.recommendation}</p>
            </div>
        `).join('')}
    </div>

    <h2>Performance Comparisons</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Current</th>
                <th>Change</th>
                <th>Threshold</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${results.comparisons.map(comparison => `
                <tr>
                    <td>${comparison.category}</td>
                    <td>${comparison.metric}</td>
                    <td>${comparison.baseline.toFixed(2)}</td>
                    <td>${comparison.current.toFixed(2)}</td>
                    <td>${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(2)}%</td>
                    <td>${comparison.threshold.toFixed(2)}</td>
                    <td class="${comparison.status}">${comparison.status.toUpperCase()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`
}

/**
 * Generate a Markdown report from the regression test results.
 */
export function generateMarkdownReport(results: PerformanceRegressionResults): string {
  return `
# Performance Regression Test Report

## Test Information
- **Test Name:** ${results.config.name}
- **Date:** ${results.timestamp.toISOString()}
- **Status:** ${results.status.toUpperCase()}
- **Duration:** ${(results.duration / 1000).toFixed(2)}s

## Summary
| Metric | Count |
|--------|-------|
| Total Tests | ${results.summary.totalTests} |
| Passed | ${results.summary.passedTests} |
| Failed | ${results.summary.failedTests} |
| Critical Failures | ${results.summary.criticalFailures} |

## Performance Violations
${results.violations.map(violation => `
### ${violation.category.toUpperCase()}: ${violation.metric}
- **Severity:** ${violation.severity.toUpperCase()}
- **Description:** ${violation.description}
- **Impact:** ${violation.impact}
- **Recommendation:** ${violation.recommendation}
`).join('')}

## Performance Comparisons
| Category | Metric | Baseline | Current | Change | Threshold | Status |
|----------|--------|----------|---------|--------|-----------|--------|
${results.comparisons.map(comparison =>
    `| ${comparison.category} | ${comparison.metric} | ${comparison.baseline.toFixed(2)} | ${comparison.current.toFixed(2)} | ${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(2)}% | ${comparison.threshold.toFixed(2)} | ${comparison.status.toUpperCase()} |`
  ).join('\n')}

## Recommendations
${results.recommendations.map(rec => `- ${rec}`).join('\n')}
`
}

/**
 * Generate all reports requested by the config and attach them to the
 * results artifacts, then dispatch each report to its destinations.
 */
export async function generateReports(results: PerformanceRegressionResults): Promise<void> {
  const config = results.config.reporting

  // Generate JSON report
  if (config.formats.includes('json')) {
    results.artifacts.jsonReport = JSON.stringify(results, null, 2)
  }

  // Generate JUnit report
  if (config.formats.includes('junit')) {
    results.artifacts.junitReport = generateJUnitReport(results)
  }

  // Generate HTML report
  if (config.formats.includes('html')) {
    results.artifacts.htmlReport = generateHTMLReport(results)
  }

  // Generate Markdown report
  if (config.formats.includes('markdown')) {
    results.artifacts.markdownReport = generateMarkdownReport(results)
  }

  // Send to destinations
  for (const destination of config.destinations) {
    await sendReportToDestination(results, destination)
  }
}

/**
 * Send a report to a single configured destination.
 */
export async function sendReportToDestination(
  results: PerformanceRegressionResults,
  destination: string
): Promise<void> {
  switch (destination) {
    case 'console':
      console.log(`[PerformanceRegression] Report for ${results.testId}:`, results)
      break
    case 'file':
      // Save report to file
      break
    case 'artifact':
      // Save as CI/CD artifact
      break
    case 'slack':
      // Send to Slack webhook
      break
    case 'email':
      // Send email report
      break
  }
}
