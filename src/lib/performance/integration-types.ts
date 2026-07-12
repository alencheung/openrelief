/**
 * Performance Integration Types
 *
 * Type definitions for the performance integration layer. Extracted from
 * performance-integration.ts so that the main module can focus on runtime
 * behavior while config, alerting, reporting, and optimization helpers live
 * in their own focused modules.
 */

// Performance integration configuration
export interface PerformanceIntegrationConfig {
  enabled: boolean
  emergencyMode: EmergencyModeConfig
  monitoring: MonitoringConfig
  optimization: OptimizationConfig
  testing: TestingConfig
  alerting: AlertingConfig
  reporting: ReportingConfig
}

// Emergency mode configuration
export interface EmergencyModeConfig {
  autoActivate: boolean
  activationTriggers: EmergencyTrigger[]
  deactivationTriggers: EmergencyTrigger[]
  priorityLevels: PriorityLevel[]
  resourceLimits: ResourceLimits
}

// Emergency trigger
export interface EmergencyTrigger {
  type: 'performance' | 'load' | 'error_rate' | 'manual' | 'external'
  condition: TriggerCondition
  action: 'activate' | 'prepare' | 'escalate'
  delay: number // milliseconds
}

// Trigger condition
export interface TriggerCondition {
  metric: string
  operator: '>' | '<' | '=' | '>=' | '<='
  threshold: number
  duration: number // milliseconds
}

// Priority thresholds (warning/critical pairs per metric category)
export interface PriorityThresholds {
  apiResponseTime: { warning: number; critical: number }
  databaseQueryTime: { warning: number; critical: number }
  alertDispatchLatency: { warning: number; critical: number }
  errorRate: { warning: number; critical: number }
  throughput: { warning: number; critical: number }
  availability: { warning: number; critical: number }
  resourceUtilization: {
    cpu: { warning: number; critical: number }
    memory: { warning: number; critical: number }
    disk: { warning: number; critical: number }
    network: { warning: number; critical: number }
  }
}

// Priority level
export interface PriorityLevel {
  level: number
  name: string
  thresholds: PriorityThresholds
  optimizations: string[]
  alerting: {
    enabled: boolean
    channels: string[]
    escalation: boolean
  }
}

// Resource limits
export interface ResourceLimits {
  maxCPU: number // percentage
  maxMemory: number // percentage
  maxConnections: number
  maxAlertsPerMinute: number
  maxLoadTestConcurrency: number
}

// Monitoring configuration
export interface MonitoringConfig {
  enabled: boolean
  interval: number // milliseconds
  metrics: string[]
  retention: number // days
  realTime: boolean
  sampling: SamplingConfig
}

// Sampling configuration
export interface SamplingConfig {
  enabled: boolean
  rate: number // percentage
  adaptive: boolean
  highLoadThreshold: number
}

// Optimization configuration
export interface OptimizationConfig {
  enabled: boolean
  autoOptimize: boolean
  strategies: OptimizationStrategy[]
  limits: OptimizationLimits
}

// Optimization strategy
export interface OptimizationStrategy {
  name: string
  type: 'database' | 'cache' | 'cdn' | 'frontend' | 'alert' | 'edge'
  enabled: boolean
  priority: number
  conditions: StrategyCondition[]
  actions: OptimizationAction[]
}

// Strategy condition
export interface StrategyCondition {
  metric: string
  operator: string
  threshold: number
}

// Optimization action
export interface OptimizationAction {
  type: 'scale' | 'cache' | 'compress' | 'prioritize' | 'throttle' | 'redirect'
  target: string
  parameters: Record<string, unknown>
}

// Optimization limits
export interface OptimizationLimits {
  maxCacheSize: number // bytes
  maxCompressionLevel: number
  maxScaleInstances: number
  maxRedirects: number
}

// Testing configuration
export interface TestingConfig {
  enabled: boolean
  schedule: TestingSchedule
  scenarios: TestScenario[]
  loadTesting: LoadTestingConfig
  regressionTesting: RegressionTestingConfig
}

// Testing schedule
export interface TestingSchedule {
  enabled: boolean
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  time: string // HH:MM
  timezone: string
  excludeWeekends: boolean
}

// Test scenario
export interface TestScenario {
  name: string
  type: 'load' | 'stress' | 'spike' | 'volume' | 'endurance'
  config: Record<string, unknown>
  enabled: boolean
  priority: number
}

// Load testing configuration
export interface LoadTestingConfig {
  enabled: boolean
  maxConcurrency: number
  rampUpTime: number // seconds
  duration: number // seconds
  scenarios: string[]
}

// Regression testing configuration
export interface RegressionTestingConfig {
  enabled: boolean
  baseline: string
  thresholds: RegressionThresholds
  autoBlockMerge: boolean
}

// Regression thresholds
export interface RegressionThresholds {
  responseTime: number // percentage increase
  errorRate: number // percentage increase
  throughput: number // percentage decrease
  availability: number // percentage decrease
}

// Alerting configuration
export interface AlertingConfig {
  enabled: boolean
  channels: AlertChannelConfig[]
  rules: AlertRule[]
  suppression: AlertSuppressionConfig
}

// Alert channel configuration
export interface AlertChannelConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push'
  enabled: boolean
  config: Record<string, unknown>
  filters: AlertFilter[]
}

// Alert filter
export interface AlertFilter {
  field: string
  operator: string
  value: unknown
}

// Alert rule
export interface AlertRule {
  name: string
  enabled: boolean
  condition: AlertCondition
  severity: 'low' | 'medium' | 'high' | 'critical'
  channels: string[]
  cooldown: number // milliseconds
  escalation: AlertEscalationConfig
}

// Alert condition
export interface AlertCondition {
  metric: string
  operator: string
  threshold: number
  duration: number // milliseconds
}

// Alert escalation configuration
export interface AlertEscalationConfig {
  enabled: boolean
  levels: EscalationLevel[]
  autoEscalate: boolean
}

// Escalation level
export interface EscalationLevel {
  level: number
  delay: number // milliseconds
  channels: string[]
  conditions: string[]
}

// Alert suppression configuration
export interface AlertSuppressionConfig {
  enabled: boolean
  rules: SuppressionRule[]
  globalCooldown: number // milliseconds
}

// Suppression rule
export interface SuppressionRule {
  name: string
  condition: AlertCondition
  duration: number // milliseconds
  reason: string
}

// Reporting configuration
export interface ReportingConfig {
  enabled: boolean
  schedule: ReportingSchedule
  formats: ('json' | 'csv' | 'pdf' | 'html')[]
  recipients: string[]
  templates: ReportTemplate[]
}

// Reporting schedule
export interface ReportingSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:MM
  timezone: string
}

// Report template
export interface ReportTemplate {
  name: string
  type: 'performance' | 'testing' | 'compliance' | 'trend'
  sections: ReportSection[]
  format: string
}

// Report section
export interface ReportSection {
  name: string
  type: 'chart' | 'table' | 'metric' | 'text'
  config: Record<string, unknown>
}

// Performance integration status
export interface PerformanceIntegrationStatus {
  enabled: boolean
  emergencyMode: boolean
  components: ComponentStatus[]
  metrics: IntegrationMetrics
  alerts: IntegrationAlerts
  optimizations: ActiveOptimizations
}

// Component status
export interface ComponentStatus {
  name: string
  enabled: boolean
  healthy: boolean
  lastUpdate: Date
  metrics: Record<string, unknown>
  errors: string[]
}

// Integration metrics
export interface IntegrationMetrics {
  uptime: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  optimizationsApplied: number
  alertsGenerated: number
  testsRun: number
}

// Integration alerts
export interface IntegrationAlerts {
  active: number
  critical: number
  recent: IntegrationAlert[]
}

// Integration alert
export interface IntegrationAlert {
  id: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
  message: string
  metrics: Record<string, unknown>
}

// Active optimizations
export interface ActiveOptimizations {
  total: number
  byType: { [type: string]: number }
  details: OptimizationDetail[]
}

// Optimization detail
export interface OptimizationDetail {
  id: string
  type: string
  name: string
  appliedAt: Date
  effectiveness: number
  status: 'active' | 'expired' | 'reverted'
}

/**
 * Shared runtime context passed to the alerting, reporting, and optimization
 * helper modules. Extracted so that the split modules can read/write the same
 * integration state without duplicating logic or being forced to depend on the
 * full PerformanceIntegration singleton.
 */
export interface IntegrationContext {
  config: PerformanceIntegrationConfig
  status: PerformanceIntegrationStatus
  emergencyMode: boolean
  components: Map<string, unknown>
  optimizationHistory: OptimizationDetail[]
  alertHistory: IntegrationAlert[]
}

/** Callback that resolves a metric name to its current value, or null. */
export type MetricValueProvider = (metric: string) => Promise<number | null>

/** Callback that mints a unique id for a newly created alert or optimization. */
export type IdGenerator = () => string

/** Callback that applies a named optimization strategy. */
export type StrategyApplier = (strategyName: string) => Promise<void>
