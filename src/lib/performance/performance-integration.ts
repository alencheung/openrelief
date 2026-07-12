/**
 * Performance Integration Layer
 *
 * This module provides a unified interface for all performance optimization components,
 * enabling seamless coordination between monitoring, optimization, testing, and alerting systems.
 * It serves as the central hub for performance management in OpenRelief.
 *
 * Type definitions live in ./integration-types and default config in
 * ./integration-config. Alerting, reporting, optimization, and monitoring
 * helpers live in their own modules. Everything is re-exported here so
 * existing imports from @/lib/performance/performance-integration keep working.
 */

import { performanceMonitor } from './performance-monitor'
import { queryOptimizer } from '../database/query-optimizer'
import { alertDispatchOptimizer } from '../alerts/alert-dispatch-optimizer'
import { frontendOptimizer } from './frontend-optimizer'
import { edgeOptimizer } from '../edge/edge-optimizer'
import { loadTestingFramework } from '../testing/load-testing-framework'
import { performanceRegressionTesting } from '../testing/performance-regression-testing'
import { serviceWorkerOptimizer } from '../pwa/service-worker-optimizer'
import { performanceDashboard } from './performance-dashboard'

import { getDefaultConfig, initializeStatus } from './integration-config'
import { createIntegrationAlert, checkAlertConditions } from './integration-alerting'
import {
  applyOptimization as applyStrategyOptimization,
  checkOptimizationOpportunities,
  applyEmergencyOptimizations,
  revertEmergencyOptimizations,
  notifyEmergencyModeChange
} from './integration-optimization'
import {
  generateReport as generateTypedReport,
  shouldGenerateReport,
  generateScheduledReport
} from './integration-reporting'
import {
  collectMetrics,
  getMetricValue as getMetricValueFor,
  updateComponentStatus,
  updateStatus as refreshStatus
} from './integration-monitoring'

// Re-export everything so existing @/lib/performance/performance-integration
// imports continue to resolve unchanged.
export * from './integration-types'
export * from './integration-config'
export * from './integration-alerting'
export * from './integration-reporting'
export * from './integration-optimization'
export * from './integration-monitoring'

import type {
  PerformanceIntegrationConfig,
  PerformanceIntegrationStatus,
  OptimizationDetail,
  IntegrationAlert,
  IntegrationMetrics,
  IntegrationContext,
  EmergencyTrigger
} from './integration-types'

class PerformanceIntegration {
  private static instance: PerformanceIntegration
  private config: PerformanceIntegrationConfig
  private status: PerformanceIntegrationStatus
  private emergencyMode: boolean = false
  private components: Map<string, any> = new Map()
  private optimizationHistory: OptimizationDetail[] = []
  private alertHistory: IntegrationAlert[] = []
  private monitoringTimer: NodeJS.Timeout | null = null
  private optimizationTimer: NodeJS.Timeout | null = null
  private testingTimer: NodeJS.Timeout | null = null
  private reportingTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.config = getDefaultConfig()
    this.status = initializeStatus(this.config)
    // Defer component initialization and integration startup when running
    // outside the browser (e.g. during the Next.js build's page-data
    // collection). The frontend optimizer and monitor touch browser-only
    // globals (document/window) and require Supabase env vars, which are
    // absent at build time. They initialize lazily on first request instead.
    if (typeof window !== 'undefined') {
      this.initializeComponents()
      this.startIntegration()
    }
  }

  static getInstance(): PerformanceIntegration {
    if (!PerformanceIntegration.instance) {
      PerformanceIntegration.instance = new PerformanceIntegration()
    }
    return PerformanceIntegration.instance
  }

  /** Snapshot of shared runtime state for the split helper modules. */
  private getContext(): IntegrationContext {
    return {
      config: this.config,
      status: this.status,
      emergencyMode: this.emergencyMode,
      components: this.components,
      optimizationHistory: this.optimizationHistory,
      alertHistory: this.alertHistory
    }
  }

  /**
   * Initialize performance integration
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeComponents()
      this.startMonitoring()
      this.startOptimization()
      this.startTesting()
      this.startReporting()
      this.setupEmergencyTriggers()
      console.log('[PerformanceIntegration] Performance integration initialized successfully')
    } catch (error) {
      console.error('[PerformanceIntegration] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Get integration status
   */
  getStatus(): PerformanceIntegrationStatus {
    refreshStatus(this.getContext())
    return { ...this.status }
  }

  /**
   * Activate emergency mode
   */
  async activateEmergencyMode(reason?: string): Promise<void> {
    if (this.emergencyMode) {
      return
    }

    try {
      this.emergencyMode = true
      this.status.emergencyMode = true

      // Apply emergency optimizations (notifies components internally)
      await applyEmergencyOptimizations(this.getContext(), this.applyOptimization.bind(this))

      // Notify all components (second pass, with reason)
      await notifyEmergencyModeChange(this.getContext(), true, reason)

      // Create emergency alert
      await createIntegrationAlert(this.getContext(), {
        severity: 'critical',
        component: 'integration',
        message: `Emergency mode activated${reason ? `: ${reason}` : ''}`,
        metrics: { emergencyMode: true, timestamp: new Date() }
      }, this.generateId.bind(this))

      console.log('[PerformanceIntegration] Emergency mode activated')
    } catch (error) {
      console.error('[PerformanceIntegration] Failed to activate emergency mode:', error)
      throw error
    }
  }

  /**
   * Deactivate emergency mode
   */
  async deactivateEmergencyMode(reason?: string): Promise<void> {
    if (!this.emergencyMode) {
      return
    }

    try {
      this.emergencyMode = false
      this.status.emergencyMode = false

      // Revert emergency optimizations (notifies components internally)
      await revertEmergencyOptimizations(this.getContext())

      // Notify all components (second pass, with reason)
      await notifyEmergencyModeChange(this.getContext(), false, reason)

      // Create notification alert
      await createIntegrationAlert(this.getContext(), {
        severity: 'low',
        component: 'integration',
        message: `Emergency mode deactivated${reason ? `: ${reason}` : ''}`,
        metrics: { emergencyMode: false, timestamp: new Date() }
      }, this.generateId.bind(this))

      console.log('[PerformanceIntegration] Emergency mode deactivated')
    } catch (error) {
      console.error('[PerformanceIntegration] Failed to deactivate emergency mode:', error)
      throw error
    }
  }

  /**
   * Run comprehensive performance test
   */
  async runPerformanceTest(scenario?: string): Promise<string> {
    try {
      const testScenario = scenario || this.config.testing.scenarios.find(s => s.enabled)?.name

      if (!testScenario) {
        throw new Error('No test scenario available')
      }

      const loadTest = await loadTestingFramework.execute50KConcurrencyTest()
      await performanceRegressionTesting.executeCIDPerformanceTest()

      this.status.metrics.testsRun++

      console.log(`[PerformanceIntegration] Performance test completed: ${testScenario}`)

      return loadTest.testId
    } catch (error) {
      console.error('[PerformanceIntegration] Performance test failed:', error)
      throw error
    }
  }

  /**
   * Apply optimization strategy
   */
  async applyOptimization(strategyName: string): Promise<void> {
    try {
      const strategy = this.config.optimization.strategies.find(s => s.name === strategyName)
      if (!strategy) {
        throw new Error(`Optimization strategy not found: ${strategyName}`)
      }
      await applyStrategyOptimization(
        this.getContext(),
        strategy,
        this.getMetricValue.bind(this),
        this.generateId.bind(this)
      )
    } catch (error) {
      console.error(`[PerformanceIntegration] Failed to apply optimization ${strategyName}:`, error)
      throw error
    }
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit: number = 50): OptimizationDetail[] {
    return this.optimizationHistory.slice(-limit)
  }

  /**
   * Get integration metrics
   */
  getMetrics(): IntegrationMetrics {
    return { ...this.status.metrics }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): IntegrationAlert[] {
    return this.alertHistory.filter(alert =>
      alert.timestamp.getTime() > (Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    )
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceIntegrationConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.monitoring) {
      this.restartMonitoring()
    }

    if (config.optimization) {
      this.restartOptimization()
    }

    if (config.testing) {
      this.restartTesting()
    }
  }

  /**
   * Generate performance report
   */
  async generateReport(type: 'performance' | 'testing' | 'compliance' | 'trend'): Promise<Record<string, unknown> | unknown[] | null> {
    return generateTypedReport(type, this.getContext())
  }

  /**
   * Private helper methods
   */

  private async initializeComponents(): Promise<void> {
    try {
      this.components.set('performanceMonitor', performanceMonitor)
      this.components.set('queryOptimizer', queryOptimizer)
      this.components.set('alertDispatchOptimizer', alertDispatchOptimizer)
      this.components.set('frontendOptimizer', frontendOptimizer)
      this.components.set('edgeOptimizer', edgeOptimizer)
      this.components.set('loadTestingFramework', loadTestingFramework)
      this.components.set('performanceRegressionTesting', performanceRegressionTesting)
      this.components.set('serviceWorkerOptimizer', serviceWorkerOptimizer)
      this.components.set('performanceDashboard', performanceDashboard)
      console.log('[PerformanceIntegration] Components initialized')
    } catch (error) {
      console.error('[PerformanceIntegration] Failed to initialize components:', error)
      throw error
    }
  }

  private startIntegration(): void {
    if (!this.config.enabled) {
      return
    }

    this.startMonitoring()
    this.startOptimization()
    this.startTesting()
    this.startReporting()
    this.setupEmergencyTriggers()
  }

  private startMonitoring(): void {
    if (!this.config.monitoring.enabled) {
      return
    }

    this.monitoringTimer = setInterval(async () => {
      await collectMetrics(this.getContext())
      await checkAlertConditions(this.getContext(), this.getMetricValue.bind(this))
      await updateComponentStatus(this.getContext())
    }, this.config.monitoring.interval)

    console.log('[PerformanceIntegration] Monitoring started')
  }

  private startOptimization(): void {
    if (!this.config.optimization.enabled) {
      return
    }

    this.optimizationTimer = setInterval(async () => {
      if (this.config.optimization.autoOptimize) {
        await checkOptimizationOpportunities(
          this.getContext(),
          this.getMetricValue.bind(this),
          this.applyOptimization.bind(this)
        )
      }
    }, 60000) // Check every minute

    console.log('[PerformanceIntegration] Optimization started')
  }

  private startTesting(): void {
    if (!this.config.testing.enabled) {
      return
    }

    this.testingTimer = setInterval(async () => {
      if (this.shouldRunScheduledTest()) {
        await this.runScheduledTest()
      }
    }, 3600000) // Check every hour

    console.log('[PerformanceIntegration] Testing started')
  }

  private startReporting(): void {
    if (!this.config.reporting.enabled) {
      return
    }

    this.reportingTimer = setInterval(async () => {
      if (shouldGenerateReport(this.getContext())) {
        await generateScheduledReport(this.getContext(), this.generateReport.bind(this))
      }
    }, 3600000) // Check every hour

    console.log('[PerformanceIntegration] Reporting started')
  }

  private setupEmergencyTriggers(): void {
    for (const trigger of this.config.emergencyMode.activationTriggers) {
      this.setupTrigger(trigger, 'activate')
    }

    for (const trigger of this.config.emergencyMode.deactivationTriggers) {
      this.setupTrigger(trigger, 'deactivate')
    }
  }

  private setupTrigger(trigger: EmergencyTrigger, action: 'activate' | 'deactivate'): void {
    // In a real implementation, this would set up actual monitoring
    // For now, just log the trigger setup
    console.log(`[PerformanceIntegration] Trigger setup: ${trigger.type} -> ${action}`)
  }

  private async getMetricValue(metric: string): Promise<number | null> {
    return getMetricValueFor(this.getContext(), metric)
  }

  private shouldRunScheduledTest(): boolean {
    if (!this.config.testing.schedule.enabled) {
      return false
    }

    const now = new Date()
    const scheduleTime = this.config.testing.schedule.time
    const [hoursStr, minutesStr] = scheduleTime.split(':')
    const hours = Number(hoursStr ?? 0)
    const minutes = Number(minutesStr ?? 0)

    const scheduledTime = new Date(now)
    scheduledTime.setHours(hours, minutes, 0, 0)

    const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime())
    return timeDiff < 3600000 // 1 hour
  }

  private async runScheduledTest(): Promise<void> {
    try {
      const scenario = this.config.testing.scenarios.find(s => s.enabled)
      if (scenario) {
        await this.runPerformanceTest(scenario.name)
      }
    } catch (error) {
      console.error('[PerformanceIntegration] Failed to run scheduled test:', error)
    }
  }

  private restartMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
    }
    this.startMonitoring()
  }

  private restartOptimization(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer)
    }
    this.startOptimization()
  }

  private restartTesting(): void {
    if (this.testingTimer) {
      clearInterval(this.testingTimer)
    }
    this.startTesting()
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const performanceIntegration = PerformanceIntegration.getInstance()

// Export hooks for easy integration
export function usePerformanceIntegration() {
  return {
    initialize: performanceIntegration.initialize.bind(performanceIntegration),
    getStatus: performanceIntegration.getStatus.bind(performanceIntegration),
    activateEmergencyMode: performanceIntegration.activateEmergencyMode.bind(performanceIntegration),
    deactivateEmergencyMode: performanceIntegration.deactivateEmergencyMode.bind(performanceIntegration),
    runPerformanceTest: performanceIntegration.runPerformanceTest.bind(performanceIntegration),
    applyOptimization: performanceIntegration.applyOptimization.bind(performanceIntegration),
    getOptimizationHistory: performanceIntegration.getOptimizationHistory.bind(performanceIntegration),
    getMetrics: performanceIntegration.getMetrics.bind(performanceIntegration),
    getActiveAlerts: performanceIntegration.getActiveAlerts.bind(performanceIntegration),
    updateConfig: performanceIntegration.updateConfig.bind(performanceIntegration),
    generateReport: performanceIntegration.generateReport.bind(performanceIntegration)
  }
}

export default performanceIntegration
