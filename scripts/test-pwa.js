#!/usr/bin/env node

/**
 * PWA Testing and Validation Script for OpenRelief
 * Tests PWA compliance, performance, and emergency-specific features
 */

const fs = require('fs')
const path = require('path')

class PWATester {
  constructor() {
    this.results = {
      manifest: {},
      serviceWorker: {},
      offline: {},
      performance: {},
      emergency: {},
      overall: { score: 0, issues: [], recommendations: [] }
    }
  }

  async runTests() {
    console.log('🧪 Starting OpenRelief PWA Testing...\n')

    await this.testManifest()
    await this.testServiceWorker()
    await this.testOfflineCapabilities()
    await this.testPerformance()
    await this.testEmergencyFeatures()
    
    this.calculateOverallScore()
    this.generateReport()
  }

  async testManifest() {
    console.log('📋 Testing PWA Manifest...')
    
    try {
      const manifestPath = path.join(__dirname, '../public/manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      
      const required = ['name', 'short_name', 'start_url', 'display', 'icons']
      const emergencyRequired = ['categories', 'shortcuts', 'share_target']
      
      let score = 0
      const issues = []
      
      // Basic PWA requirements
      required.forEach(field => {
        if (manifest[field]) {
          score += 10
        } else {
          issues.push(`Missing required field: ${field}`)
        }
      })
      
      // Emergency-specific requirements
      emergencyRequired.forEach(field => {
        if (manifest[field]) {
          score += 5
        }
      })
      
      // Check for emergency-specific features
      if (manifest.categories?.includes('emergency')) score += 10
      if (manifest.shortcuts?.length > 0) score += 10
      if (manifest.share_target) score += 10
      if (manifest.emergency_mode) score += 15
      
      // Icon requirements
      if (manifest.icons && manifest.icons.length >= 4) {
        score += 10
      } else {
        issues.push('Insufficient icon sizes (need at least 4 sizes)')
      }
      
      this.results.manifest = {
        score: Math.min(100, score),
        issues,
        details: {
          hasName: !!manifest.name,
          hasShortName: !!manifest.short_name,
          hasStartUrl: !!manifest.start_url,
          hasDisplay: !!manifest.display,
          hasIcons: manifest.icons?.length >= 4,
          hasEmergencyFeatures: !!(manifest.categories?.includes('emergency') || manifest.emergency_mode),
          iconCount: manifest.icons?.length || 0
        }
      }
      
      console.log(`✅ Manifest Score: ${this.results.manifest.score}/100`)
      if (issues.length > 0) {
        console.log('⚠️  Manifest Issues:', issues)
      }
    } catch (error) {
      console.log('❌ Manifest Test Failed:', error.message)
      this.results.manifest = { score: 0, issues: [error.message] }
    }
  }

  async testServiceWorker() {
    console.log('\n⚙️  Testing Service Worker...')
    
    try {
      const swPath = path.join(__dirname, '../public/sw.js')
      const swContent = fs.readFileSync(swPath, 'utf8')
      
      let score = 0
      const issues = []
      
      // Check for required service worker features
      const requiredFeatures = [
        'install',
        'activate',
        'fetch',
        'push',
        'sync'
      ]
      
      requiredFeatures.forEach(feature => {
        if (swContent.includes(`addEventListener('${feature}'`)) {
          score += 15
        } else {
          issues.push(`Missing event listener: ${feature}`)
        }
      })
      
      // Check for caching strategies
      if (swContent.includes('CacheFirst')) score += 10
      if (swContent.includes('NetworkFirst')) score += 10
      if (swContent.includes('StaleWhileRevalidate')) score += 10
      
      // Check for offline support
      if (swContent.includes('offline')) score += 15
      if (swContent.includes('background sync')) score += 10
      
      // Check for emergency-specific features
      if (swContent.includes('emergency')) score += 10
      if (swContent.includes('EMERGENCY_CACHE')) score += 10
      
      this.results.serviceWorker = {
        score: Math.min(100, score),
        issues,
        details: {
          hasInstall: swContent.includes('addEventListener(\'install\''),
          hasActivate: swContent.includes('addEventListener(\'activate\''),
          hasFetch: swContent.includes('addEventListener(\'fetch\''),
          hasPush: swContent.includes('addEventListener(\'push\''),
          hasSync: swContent.includes('addEventListener(\'sync\''),
          hasCacheStrategies: swContent.includes('CacheFirst') && swContent.includes('NetworkFirst'),
          hasOfflineSupport: swContent.includes('offline'),
          hasEmergencyFeatures: swContent.includes('emergency')
        }
      }
      
      console.log(`✅ Service Worker Score: ${this.results.serviceWorker.score}/100`)
      if (issues.length > 0) {
        console.log('⚠️  Service Worker Issues:', issues)
      }
    } catch (error) {
      console.log('❌ Service Worker Test Failed:', error.message)
      this.results.serviceWorker = { score: 0, issues: [error.message] }
    }
  }

  async testOfflineCapabilities() {
    console.log('\n📴 Testing Offline Capabilities...')
    
    let score = 0
    const issues = []
    
    try {
      const swPath = path.join(__dirname, '../public/sw.js')
      const swContent = fs.readFileSync(swPath, 'utf8')
      
      // Check for offline caching
      if (swContent.includes('caches.open')) score += 20
      if (swContent.includes('cache.addAll')) score += 15
      
      // Check for offline fallbacks
      if (swContent.includes('/offline')) score += 15
      if (swContent.includes('fallback')) score += 10
      
      // Check for background sync
      if (swContent.includes('sync')) score += 15
      if (swContent.includes('periodicsync')) score += 10
      
      // Check for 24+ hour capability indicators
      if (swContent.includes('24') || swContent.includes('86400000')) score += 15
      
      this.results.offline = {
        score: Math.min(100, score),
        issues,
        details: {
          hasCaching: swContent.includes('caches.open'),
          hasOfflineFallbacks: swContent.includes('/offline'),
          hasBackgroundSync: swContent.includes('sync'),
          hasPeriodicSync: swContent.includes('periodicsync'),
          hasLongTermOffline: swContent.includes('24') || swContent.includes('86400000')
        }
      }
      
      console.log(`✅ Offline Capabilities Score: ${this.results.offline.score}/100`)
      if (issues.length > 0) {
        console.log('⚠️  Offline Issues:', issues)
      }
    } catch (error) {
      console.log('❌ Offline Test Failed:', error.message)
      this.results.offline = { score: 0, issues: [error.message] }
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance Optimizations...')
    
    let score = 0
    const issues = []
    
    try {
      const nextConfigPath = path.join(__dirname, '../next.config.js')
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8')
      
      // Check for performance optimizations
      if (nextConfig.includes('compress: true')) score += 15
      if (nextConfig.includes('swcMinify: true')) score += 15
      if (nextConfig.includes('optimizePackageImports')) score += 15
      
      // Check for caching headers
      if (nextConfig.includes('Cache-Control')) score += 15
      if (nextConfig.includes('immutable')) score += 10
      
      // Check for bundle optimization
      if (nextConfig.includes('splitChunks')) score += 15
      if (nextConfig.includes('optimizeCss')) score += 15
      
      this.results.performance = {
        score: Math.min(100, score),
        issues,
        details: {
          hasCompression: nextConfig.includes('compress: true'),
          hasMinification: nextConfig.includes('swcMinify: true'),
          hasPackageOptimization: nextConfig.includes('optimizePackageImports'),
          hasCacheHeaders: nextConfig.includes('Cache-Control'),
          hasBundleOptimization: nextConfig.includes('splitChunks'),
          hasCssOptimization: nextConfig.includes('optimizeCss')
        }
      }
      
      console.log(`✅ Performance Score: ${this.results.performance.score}/100`)
      if (issues.length > 0) {
        console.log('⚠️  Performance Issues:', issues)
      }
    } catch (error) {
      console.log('❌ Performance Test Failed:', error.message)
      this.results.performance = { score: 0, issues: [error.message] }
    }
  }

  async testEmergencyFeatures() {
    console.log('\n🚨 Testing Emergency Features...')
    
    let score = 0
    const issues = []
    
    try {
      const manifestPath = path.join(__dirname, '../public/manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      
      const swPath = path.join(__dirname, '../public/sw.js')
      const swContent = fs.readFileSync(swPath, 'utf8')
      
      // Check emergency-specific manifest features
      if (manifest.categories?.includes('emergency')) score += 15
      if (manifest.emergency_mode) score += 20
      if (manifest.shortcuts?.some(s => s.name.includes('Emergency'))) score += 15
      
      // Check emergency service worker features
      if (swContent.includes('EMERGENCY_CACHE')) score += 15
      if (swContent.includes('emergency-report')) score += 15
      if (swContent.includes('push') && swContent.includes('emergency')) score += 10
      
      // Check for offline emergency reporting
      if (swContent.includes('handleOfflinePost')) score += 10
      
      this.results.emergency = {
        score: Math.min(100, score),
        issues,
        details: {
          hasEmergencyCategory: manifest.categories?.includes('emergency'),
          hasEmergencyMode: !!manifest.emergency_mode,
          hasEmergencyShortcuts: manifest.shortcuts?.some(s => s.name.includes('Emergency')),
          hasEmergencyCache: swContent.includes('EMERGENCY_CACHE'),
          hasEmergencySync: swContent.includes('emergency-report'),
          hasEmergencyPush: swContent.includes('push') && swContent.includes('emergency'),
          hasOfflineEmergencyReporting: swContent.includes('handleOfflinePost')
        }
      }
      
      console.log(`✅ Emergency Features Score: ${this.results.emergency.score}/100`)
      if (issues.length > 0) {
        console.log('⚠️  Emergency Feature Issues:', issues)
      }
    } catch (error) {
      console.log('❌ Emergency Features Test Failed:', error.message)
      this.results.emergency = { score: 0, issues: [error.message] }
    }
  }

  calculateOverallScore() {
    const weights = {
      manifest: 0.2,
      serviceWorker: 0.25,
      offline: 0.25,
      performance: 0.15,
      emergency: 0.15
    }
    
    const weightedScore = 
      (this.results.manifest.score * weights.manifest) +
      (this.results.serviceWorker.score * weights.serviceWorker) +
      (this.results.offline.score * weights.offline) +
      (this.results.performance.score * weights.performance) +
      (this.results.emergency.score * weights.emergency)
    
    this.results.overall.score = Math.round(weightedScore)
    
    // Collect all issues
    Object.values(this.results).forEach(result => {
      if (result.issues) {
        this.results.overall.issues.push(...result.issues)
      }
    })
    
    // Generate recommendations
    this.generateRecommendations()
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.manifest.score < 80) {
      recommendations.push('Improve PWA manifest with more icons and emergency-specific features')
    }
    
    if (this.results.serviceWorker.score < 80) {
      recommendations.push('Enhance service worker with more caching strategies and event listeners')
    }
    
    if (this.results.offline.score < 80) {
      recommendations.push('Strengthen offline capabilities with better fallbacks and sync strategies')
    }
    
    if (this.results.performance.score < 80) {
      recommendations.push('Optimize performance with better caching and bundle optimization')
    }
    
    if (this.results.emergency.score < 80) {
      recommendations.push('Add more emergency-specific features and offline reporting')
    }
    
    this.results.overall.recommendations = recommendations
  }

  generateReport() {
    console.log('\n📊 PWA TEST REPORT')
    console.log('=' .repeat(50))
    
    console.log(`\n🎯 OVERALL SCORE: ${this.results.overall.score}/100`)
    
    if (this.results.overall.score >= 90) {
      console.log('🏆 EXCELLENT - PWA is ready for production!')
    } else if (this.results.overall.score >= 80) {
      console.log('✅ GOOD - PWA meets most requirements')
    } else if (this.results.overall.score >= 70) {
      console.log('⚠️  FAIR - PWA needs some improvements')
    } else {
      console.log('❌ POOR - PWA requires significant improvements')
    }
    
    console.log('\n📈 DETAILED SCORES:')
    console.log(`  • Manifest: ${this.results.manifest.score}/100`)
    console.log(`  • Service Worker: ${this.results.serviceWorker.score}/100`)
    console.log(`  • Offline Capabilities: ${this.results.offline.score}/100`)
    console.log(`  • Performance: ${this.results.performance.score}/100`)
    console.log(`  • Emergency Features: ${this.results.emergency.score}/100`)
    
    if (this.results.overall.issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:')
      this.results.overall.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`)
      })
    }
    
    if (this.results.overall.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      this.results.overall.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`)
      })
    }
    
    console.log('\n' + '='.repeat(50))
    
    // Save report to file
    const reportPath = path.join(__dirname, '../pwa-test-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new PWATester()
  tester.runTests().catch(console.error)
}

module.exports = PWATester