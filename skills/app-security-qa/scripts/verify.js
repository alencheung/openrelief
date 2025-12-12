#!/usr/bin/env node

/**
 * Application Security QA Verification Script
 *
 * This script validates inputs, runs security checks, and provides actionable errors
 * for the Application Security QA skill.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class SecurityQAVerifier {
  constructor(options = {}) {
    this.repoPath = options.repoPath || process.cwd()
    this.languages = options.languages || ['javascript', 'typescript', 'python', 'java']
    this.outputDir = options.outputDir || './reports/security'
    this.verbose = options.verbose || false
    this.errors = []
    this.warnings = []
  }

  /**
   * Validate required inputs for security scanning
   */
  validateInputs() {
    console.log('🔍 Validating security QA inputs...')

    // Check if repository path exists
    if (!fs.existsSync(this.repoPath)) {
      this.errors.push(`Repository path does not exist: ${this.repoPath}`)
      return false
    }

    // Check for package.json or equivalent files
    const hasPackageJson = fs.existsSync(path.join(this.repoPath, 'package.json'))
    const hasRequirements = fs.existsSync(path.join(this.repoPath, 'requirements.txt'))
    const hasPomXml = fs.existsSync(path.join(this.repoPath, 'pom.xml'))

    if (!hasPackageJson && !hasRequirements && !hasPomXml) {
      this.warnings.push('No package manager files found (package.json, requirements.txt, pom.xml)')
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      try {
        fs.mkdirSync(this.outputDir, { recursive: true })
        console.log(`✅ Created output directory: ${this.outputDir}`)
      } catch (error) {
        this.errors.push(`Failed to create output directory: ${error.message}`)
        return false
      }
    }

    return this.errors.length === 0
  }

  /**
   * Check if required security tools are available
   */
  checkSecurityTools() {
    console.log('🛠️  Checking security tools availability...')

    const tools = [
      { name: 'snyk', command: 'snyk --version' },
      { name: 'semgrep', command: 'semgrep --version' },
      { name: 'zap', command: 'zap-cli --version' }
    ]

    const availableTools = []
    const missingTools = []

    tools.forEach(tool => {
      try {
        execSync(tool.command, { stdio: 'pipe' })
        availableTools.push(tool.name)
        if (this.verbose) {
          console.log(`✅ ${tool.name} is available`)
        }
      } catch (error) {
        missingTools.push(tool.name)
        if (this.verbose) {
          console.log(`❌ ${tool.name} is not available`)
        }
      }
    })

    if (missingTools.length > 0) {
      this.warnings.push(`Missing security tools: ${missingTools.join(', ')}`)
      console.log(`⚠️  Install missing tools: npm install -g ${missingTools.join(' ')}`)
    }

    return availableTools
  }

  /**
   * Run minimal security smoke check
   */
  runSmokeCheck() {
    console.log('💨 Running security smoke check...')

    const results = {
      credentialLeaks: this.checkCredentialLeaks(),
      basicVulnerabilities: this.checkBasicVulnerabilities(),
      dependencyIssues: this.checkDependencyIssues()
    }

    return results
  }

  /**
   * Check for obvious credential leaks
   */
  checkCredentialLeaks() {
    const patterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi
    ]

    const suspiciousFiles = []
    const filesToCheck = this.getSourceFiles()

    filesToCheck.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8')
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            suspiciousFiles.push(file)
          }
        })
      } catch (error) {
        // Skip files that can't be read
      }
    })

    return {
      suspiciousFiles,
      total: suspiciousFiles.length
    }
  }

  /**
   * Check for basic security vulnerabilities
   */
  checkBasicVulnerabilities() {
    const vulnerablePatterns = [
      /eval\s*\(/gi,
      /innerHTML\s*=/gi,
      /document\.write\s*\(/gi,
      /exec\s*\(/gi
    ]

    const vulnerableFiles = []
    const filesToCheck = this.getSourceFiles(['.js', '.ts', '.jsx', '.tsx'])

    filesToCheck.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8')
        vulnerablePatterns.forEach(pattern => {
          if (pattern.test(content)) {
            vulnerableFiles.push(file)
          }
        })
      } catch (error) {
        // Skip files that can't be read
      }
    })

    return {
      vulnerableFiles,
      total: vulnerableFiles.length
    }
  }

  /**
   * Check for basic dependency issues
   */
  checkDependencyIssues() {
    const issues = []

    // Check package.json if it exists
    const packageJsonPath = path.join(this.repoPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        // Check for known vulnerable packages (simplified check)
        const vulnerablePackages = ['lodash@<4.17.21', 'request@<2.88.2']

        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            vulnerablePackages.forEach(vuln => {
              const [vulnName, vulnVersion] = vuln.split('@')
              if (name === vulnName && version.includes(vulnVersion)) {
                issues.push(`Vulnerable dependency: ${name}@${version}`)
              }
            })
          })
        }
      } catch (error) {
        this.warnings.push('Could not parse package.json')
      }
    }

    return {
      issues,
      total: issues.length
    }
  }

  /**
   * Get source files to scan
   */
  getSourceFiles(extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java']) {
    const sourceFiles = []

    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir)
        items.forEach(item => {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(fullPath)
          } else if (stat.isFile()) {
            const ext = path.extname(item)
            if (extensions.includes(ext)) {
              sourceFiles.push(fullPath)
            }
          }
        })
      } catch (error) {
        // Skip directories that can't be read
      }
    }

    scanDirectory(this.repoPath)
    return sourceFiles
  }

  /**
   * Print actionable errors and warnings
   */
  printResults() {
    console.log('\n📊 Security QA Verification Results:')
    console.log('=====================================')

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`)
      })
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All checks passed!')
    }

    return this.errors.length === 0
  }

  /**
   * Main verification method
   */
  async verify() {
    console.log('🚀 Starting Application Security QA Verification...\n')

    const inputsValid = this.validateInputs()
    if (!inputsValid) {
      return this.printResults()
    }

    const availableTools = this.checkSecurityTools()
    const smokeCheckResults = this.runSmokeCheck()

    console.log('\n📋 Smoke Check Results:')
    console.log(`- Credential leaks: ${smokeCheckResults.credentialLeaks.total} files`)
    console.log(`- Basic vulnerabilities: ${smokeCheckResults.basicVulnerabilities.total} files`)
    console.log(`- Dependency issues: ${smokeCheckResults.dependencyIssues.total} issues`)

    if (smokeCheckResults.credentialLeaks.total > 0) {
      this.warnings.push(
        `Found ${smokeCheckResults.credentialLeaks.total} files with potential credential leaks`
      )
    }

    if (smokeCheckResults.basicVulnerabilities.total > 0) {
      this.warnings.push(
        `Found ${smokeCheckResults.basicVulnerabilities.total} files with potential security vulnerabilities`
      )
    }

    if (smokeCheckResults.dependencyIssues.total > 0) {
      this.warnings.push(
        `Found ${smokeCheckResults.dependencyIssues.total} potential dependency issues`
      )
    }

    return this.printResults()
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo-path' && args[i + 1]) {
      options.repoPath = args[i + 1]
      i++
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      options.outputDir = args[i + 1]
      i++
    } else if (args[i] === '--verbose') {
      options.verbose = true
    } else if (args[i] === '--help') {
      console.log(`
Application Security QA Verification Script

Usage: node verify.js [options]

Options:
  --repo-path <path>     Repository path to scan (default: current directory)
  --output-dir <path>    Output directory for reports (default: ./reports/security)
  --verbose              Enable verbose output
  --help                 Show this help message

Examples:
  node verify.js
  node verify.js --repo-path ./my-app --verbose
  node verify.js --output-dir ./security-reports
      `)
      process.exit(0)
    }
  }

  const verifier = new SecurityQAVerifier(options)
  verifier
    .verify()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Verification failed:', error.message)
      process.exit(1)
    })
}

module.exports = SecurityQAVerifier
