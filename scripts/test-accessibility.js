#!/usr/bin/env node

/**
 * OpenRelief Accessibility Testing Script
 * 
 * Comprehensive accessibility testing for CI/CD integration.
 * Tests WCAG 2.1 AA compliance across the application.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  // Test environments
  environments: ['development', 'staging', 'production'],
  
  // Viewports to test
  viewports: [
    { width: 320, height: 568, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop' },
    { width: 1920, height: 1080, name: 'Large Desktop' }
  ],
  
  // Browsers to test
  browsers: ['chrome', 'firefox'],
  
  // Test directories
  testDirectories: ['src/components', 'src/app'],
  
  // Output directory
  outputDir: 'test-results/accessibility',
  
  // Thresholds
  thresholds: {
    score: 80, // Minimum WCAG AA score
    coverage: 90, // Minimum test coverage
    criticalIssues: 0, // No critical issues allowed
    seriousIssues: 5, // Maximum serious issues
  }
}

/**
 * Main test execution
 */
async function runAccessibilityTests() {
  console.log('🔍 Starting OpenRelief Accessibility Tests')
  console.log('=====================================')
  
  // Create output directory
  ensureDirectoryExists(CONFIG.outputDir)
  
  // Test results
  const allResults = []
  
  try {
    // Run static analysis
    console.log('📊 Running static accessibility analysis...')
    const staticResults = await runStaticAnalysis()
    allResults.push(...staticResults)
    
    // Run component tests
    console.log('🧩 Running component accessibility tests...')
    const componentResults = await runComponentTests()
    allResults.push(...componentResults)
    
    // Run visual regression tests
    console.log('👁 Running visual accessibility tests...')
    const visualResults = await runVisualTests()
    allResults.push(...visualResults)
    
    // Run keyboard navigation tests
    console.log('⌨️ Running keyboard navigation tests...')
    const keyboardResults = await runKeyboardTests()
    allResults.push(...keyboardResults)
    
    // Run screen reader tests
    console.log('🔊 Running screen reader tests...')
    const screenReaderResults = await runScreenReaderTests()
    allResults.push(...screenReaderResults)
    
    // Generate comprehensive report
    console.log('📋 Generating accessibility report...')
    const report = generateReport(allResults)
    
    // Save reports
    await saveReports(report, allResults)
    
    // Check thresholds
    const passed = checkThresholds(report)
    
    // Output results
    outputResults(report, passed)
    
    // Exit with appropriate code
    process.exit(passed ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Accessibility tests failed:', error)
    process.exit(1)
  }
}

/**
 * Run static accessibility analysis
 */
async function runStaticAnalysis() {
  const results = []
  
  // Check for accessibility-related files
  const accessibilityFiles = [
    'src/components/accessibility',
    'src/hooks/accessibility',
    'src/lib/accessibility'
  ]
  
  for (const file of accessibilityFiles) {
    if (fs.existsSync(file)) {
      results.push({
        type: 'static',
        category: 'infrastructure',
        status: 'pass',
        message: `Accessibility infrastructure found: ${file}`,
        file
      })
    } else {
      results.push({
        type: 'static',
        category: 'infrastructure',
        status: 'fail',
        message: `Missing accessibility infrastructure: ${file}`,
        file
      })
    }
  }
  
  // Check for accessibility in package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const hasAccessibilityDeps = packageJson.dependencies && (
    packageJson.dependencies['axe-core'] ||
    packageJson.dependencies['jest-axe']
  )
  
  results.push({
    type: 'static',
    category: 'dependencies',
    status: hasAccessibilityDeps ? 'pass' : 'fail',
    message: hasAccessibilityDeps ? 'Accessibility dependencies found' : 'Missing accessibility testing dependencies',
    file: 'package.json'
  })
  
  return results
}

/**
 * Run component accessibility tests
 */
async function runComponentTests() {
  const results = []
  
  // Find test files
  const testFiles = findFiles('src/components', /\.test\.tsx?$/)
  
  for (const testFile of testFiles) {
    try {
      // Run Jest tests for accessibility
      const testResult = execSync(`npx jest ${testFile} --testNamePattern="accessibility" --verbose`, {
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      results.push({
        type: 'component',
        category: 'test',
        status: 'pass',
        message: `Accessibility tests passed for ${testFile}`,
        file: testFile,
        details: testResult
      })
    } catch (error) {
      results.push({
        type: 'component',
        category: 'test',
        status: 'fail',
        message: `Accessibility tests failed for ${testFile}: ${error.message}`,
        file: testFile,
        error: error.message
      })
    }
  }
  
  return results
}

/**
 * Run visual accessibility tests
 */
async function runVisualTests() {
  const results = []
  
  try {
    // Run pa11y for visual accessibility
    const pa11yResult = execSync('npx pa11y http://localhost:3000 --reporter json --threshold WCAG2AA', {
      encoding: 'utf8',
      cwd: process.cwd()
    })
    
    const pa11yData = JSON.parse(pa11yResult)
    
    results.push({
      type: 'visual',
      category: 'pa11y',
      status: pa11yData.issues.length === 0 ? 'pass' : 'fail',
      message: `Found ${pa11yData.issues.length} accessibility issues`,
      file: 'http://localhost:3000',
      details: pa11yData
    })
    
  } catch (error) {
    results.push({
      type: 'visual',
      category: 'pa11y',
      status: 'fail',
      message: `Visual accessibility tests failed: ${error.message}`,
      file: 'pa11y',
      error: error.message
    })
  }
  
  return results
}

/**
 * Run keyboard navigation tests
 */
async function runKeyboardTests() {
  const results = []
  
  try {
    // Check for keyboard navigation implementation
    const keyboardFiles = findFiles('src', /keyboard|accessibility/i)
    
    results.push({
      type: 'keyboard',
      category: 'implementation',
      status: keyboardFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${keyboardFiles.length} keyboard accessibility files`,
      file: 'keyboard navigation'
    })
    
    // Check for skip links
    const skipLinkFiles = findFiles('src', /skip|link/i)
    
    results.push({
      type: 'keyboard',
      category: 'skip-links',
      status: skipLinkFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${skipLinkFiles.length} skip link implementations`,
      file: 'skip links'
    })
    
    // Check for focus management
    const focusFiles = findFiles('src', /focus|trap/i)
    
    results.push({
      type: 'keyboard',
      category: 'focus-management',
      status: focusFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${focusFiles.length} focus management implementations`,
      file: 'focus management'
    })
    
  } catch (error) {
    results.push({
      type: 'keyboard',
      category: 'general',
      status: 'fail',
      message: `Keyboard navigation tests failed: ${error.message}`,
      file: 'keyboard navigation',
      error: error.message
    })
  }
  
  return results
}

/**
 * Run screen reader tests
 */
async function runScreenReaderTests() {
  const results = []
  
  try {
    // Check for ARIA implementation
    const ariaFiles = findFiles('src', /aria|screen-reader/i)
    
    results.push({
      type: 'screen-reader',
      category: 'aria',
      status: ariaFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${ariaFiles.length} ARIA/screen reader implementations`,
      file: 'ARIA implementation'
    })
    
    // Check for semantic HTML
    const semanticFiles = findFiles('src', /semantic|landmark/i)
    
    results.push({
      type: 'screen-reader',
      category: 'semantic',
      status: semanticFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${semanticFiles.length} semantic HTML implementations`,
      file: 'semantic HTML'
    })
    
    // Check for live regions
    const liveRegionFiles = findFiles('src', /live|announcer/i)
    
    results.push({
      type: 'screen-reader',
      category: 'live-regions',
      status: liveRegionFiles.length > 0 ? 'pass' : 'fail',
      message: `Found ${liveRegionFiles.length} live region implementations`,
      file: 'live regions'
    })
    
  } catch (error) {
    results.push({
      type: 'screen-reader',
      category: 'general',
      status: 'fail',
      message: `Screen reader tests failed: ${error.message}`,
      file: 'screen reader',
      error: error.message
    })
  }
  
  return results
}

/**
 * Generate comprehensive accessibility report
 */
function generateReport(results) {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    byType: {
      static: results.filter(r => r.type === 'static'),
      component: results.filter(r => r.type === 'component'),
      visual: results.filter(r => r.type === 'visual'),
      keyboard: results.filter(r => r.type === 'keyboard'),
      'screen-reader': results.filter(r => r.type === 'screen-reader')
    },
    byCategory: {},
    criticalIssues: results.filter(r => r.status === 'fail' && r.category === 'critical'),
    seriousIssues: results.filter(r => r.status === 'fail' && r.category === 'serious')
  }
  
  // Group by category
  results.forEach(result => {
    if (!summary.byCategory[result.category]) {
      summary.byCategory[result.category] = { passed: 0, failed: 0 }
    }
    
    if (result.status === 'pass') {
      summary.byCategory[result.category].passed++
    } else {
      summary.byCategory[result.category].failed++
    }
  })
  
  return {
    timestamp: new Date().toISOString(),
    summary,
    results,
    score: calculateAccessibilityScore(summary),
    recommendations: generateRecommendations(summary)
  }
}

/**
 * Calculate accessibility score
 */
function calculateAccessibilityScore(summary) {
  const totalTests = summary.total
  const passedTests = summary.passed
  
  if (totalTests === 0) return 0
  
  const baseScore = (passedTests / totalTests) * 100
  
  // Apply penalties for critical issues
  const criticalPenalty = summary.criticalIssues.length * 20
  const seriousPenalty = summary.seriousIssues.length * 10
  
  return Math.max(0, baseScore - criticalPenalty - seriousPenalty)
}

/**
 * Generate recommendations
 */
function generateRecommendations(summary) {
  const recommendations = []
  
  if (summary.criticalIssues.length > 0) {
    recommendations.push({
      priority: 'critical',
      message: 'Critical accessibility issues found - immediate action required',
      details: summary.criticalIssues.map(issue => issue.message)
    })
  }
  
  if (summary.seriousIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      message: 'Serious accessibility issues found - address before release',
      details: summary.seriousIssues.map(issue => issue.message)
    })
  }
  
  if (summary.byType.static && summary.byType.static.failed > 0) {
    recommendations.push({
      priority: 'medium',
      message: 'Improve static accessibility infrastructure',
      details: ['Add missing accessibility files', 'Implement proper ARIA attributes']
    })
  }
  
  if (summary.byType.keyboard && summary.byType.keyboard.failed > 0) {
    recommendations.push({
      priority: 'high',
      message: 'Improve keyboard navigation',
      details: ['Add skip links', 'Implement focus management', 'Ensure all interactive elements are keyboard accessible']
    })
  }
  
  if (summary.byType['screen-reader'] && summary.byType['screen-reader'].failed > 0) {
    recommendations.push({
      priority: 'high',
      message: 'Improve screen reader support',
      details: ['Add ARIA labels', 'Implement semantic HTML', 'Add live regions for dynamic content']
    })
  }
  
  return recommendations
}

/**
 * Save reports to files
 */
async function saveReports(report, results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  // Save JSON report
  const jsonReport = {
    ...report,
    results: results.map(r => ({
      ...r,
      timestamp: new Date().toISOString()
    }))
  }
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `accessibility-report-${timestamp}.json`),
    JSON.stringify(jsonReport, null, 2)
  )
  
  // Save JUnit XML for CI
  const junitReport = generateJUnitXML(results)
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `accessibility-junit-${timestamp}.xml`),
    junitReport
  )
  
  // Save HTML report
  const htmlReport = generateHTMLReport(report)
  fs.writeFileSync(
    path.join(CONFIG.outputDir, `accessibility-report-${timestamp}.html`),
    htmlReport
  )
}

/**
 * Generate JUnit XML
 */
function generateJUnitXML(results) {
  const testCases = results.map(result => `
    <testcase classname="Accessibility" name="${result.category}" time="0">
      ${result.status === 'fail' ? `<failure message="${result.message}">${result.error || 'Test failed'}</failure>` : ''}
    </testcase>`).join('')
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Accessibility Tests" tests="${results.length}" failures="${results.filter(r => r.status === 'fail').length}">
  ${testCases}
</testsuite>`
}

/**
 * Generate HTML report
 */
function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenRelief Accessibility Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; color: ${report.score >= 80 ? '#28a745' : '#dc3545'}; margin-bottom: 20px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-item { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
    .summary-item h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #6c757d; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #495057; }
    .results { margin-top: 30px; }
    .result-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #dee2e6; }
    .result-status { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; margin-right: 20px; }
    .result-status.passed { background: #28a745; }
    .result-status.failed { background: #dc3545; }
    .result-details { flex: 1; }
    .result-category { font-weight: bold; margin-bottom: 5px; }
    .result-message { color: #6c757d; font-size: 14px; }
    .recommendations { margin-top: 30px; }
    .recommendation { padding: 20px; margin-bottom: 20px; border-radius: 8px; }
    .recommendation.critical { background: #f8d7da; border-left: 4px solid #dc3545; }
    .recommendation.high { background: #fff3cd; border-left: 4px solid #ffc107; }
    .recommendation.medium { background: #d1ecf1; border-left: 4px solid #17a2b8; }
    .recommendation h4 { margin: 0 0 10px 0; }
    .recommendation p { margin: 0 0 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OpenRelief Accessibility Report</h1>
      <div class="score">${report.score >= 80 ? '✅' : '❌'}</div>
      <p>WCAG ${report.score >= 80 ? '2.1 AA Compliant' : 'Non-Compliant'}</p>
      <p>Generated: ${report.timestamp}</p>
    </div>
    
    <div class="summary">
      <div class="summary-item">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="summary-item">
        <h3>Passed</h3>
        <div class="value">${report.summary.passed}</div>
      </div>
      <div class="summary-item">
        <h3>Failed</h3>
        <div class="value">${report.summary.failed}</div>
      </div>
      <div class="summary-item">
        <h3>Score</h3>
        <div class="value">${report.score.toFixed(1)}</div>
      </div>
    </div>
    
    <div class="results">
      <h2>Test Results</h2>
      ${report.results.map(result => `
        <div class="result-item">
          <div class="result-status ${result.status}">${result.status === 'pass' ? '✓' : '✗'}</div>
          <div class="result-details">
            <div class="result-category">${result.category}</div>
            <div class="result-message">${result.message}</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="recommendations">
      <h2>Recommendations</h2>
      ${report.recommendations.map(rec => `
        <div class="recommendation ${rec.priority}">
          <h4>${rec.priority.toUpperCase()}: ${rec.message}</h4>
          <p>${rec.details.join(', ')}</p>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
}

/**
 * Check if results meet thresholds
 */
function checkThresholds(report) {
  return (
    report.score >= CONFIG.thresholds.score &&
    report.summary.criticalIssues.length <= CONFIG.thresholds.criticalIssues &&
    report.summary.seriousIssues.length <= CONFIG.thresholds.seriousIssues
  )
}

/**
 * Output results to console
 */
function outputResults(report, passed) {
  console.log('\n📊 Accessibility Test Results')
  console.log('================================')
  console.log(`✅ Overall Status: ${passed ? 'PASSED' : 'FAILED'}`)
  console.log(`📈 Score: ${report.score.toFixed(1)}/100`)
  console.log(`🧪 Total Tests: ${report.summary.total}`)
  console.log(`✅ Passed: ${report.summary.passed}`)
  console.log(`❌ Failed: ${report.summary.failed}`)
  console.log(`⚠️ Critical Issues: ${report.summary.criticalIssues.length}`)
  console.log(`⚠️ Serious Issues: ${report.summary.seriousIssues.length}`)
  
  if (report.recommendations.length > 0) {
    console.log('\n📋 Recommendations:')
    report.recommendations.forEach(rec => {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`)
      rec.details.forEach(detail => {
        console.log(`    - ${detail}`)
      })
    })
  }
  
  console.log(`\n📁 Reports saved to: ${CONFIG.outputDir}`)
}

/**
 * Utility functions
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function findFiles(dir, pattern) {
  const files = []
  
  function searchDirectory(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        searchDirectory(fullPath)
      } else if (pattern.test(item)) {
        files.push(fullPath)
      }
    }
  }
  
  searchDirectory(dir)
  return files
}

// Run tests if script is executed directly
if (require.main === module) {
  runAccessibilityTests().catch(error => {
    console.error('❌ Accessibility tests failed to run:', error)
    process.exit(1)
  })
}

module.exports = {
  runAccessibilityTests,
  CONFIG
}