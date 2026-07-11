/**
 * Performance Integration Optimization
 *
 * Strategy evaluation, optimization execution, and emergency-mode optimization
 * helpers extracted from performance-integration.ts. Each helper operates on a
 * shared IntegrationContext so the integration class can stay thin.
 */

import {
  OptimizationAction,
  OptimizationDetail,
  OptimizationStrategy,
  StrategyCondition,
  IntegrationContext,
  MetricValueProvider,
  IdGenerator,
  StrategyApplier
} from './integration-types'

/**
 * Scan enabled optimization strategies and apply any whose conditions are met.
 */
export async function checkOptimizationOpportunities(
  ctx: IntegrationContext,
  getMetricValue: MetricValueProvider,
  applyStrategy: StrategyApplier
): Promise<void> {
  try {
    for (const strategy of ctx.config.optimization.strategies) {
      if (!strategy.enabled) {
        continue
      }

      const shouldApply = await checkOptimizationConditions(strategy.conditions, getMetricValue)
      if (shouldApply) {
        await applyStrategy(strategy.name)
      }
    }
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to check optimization opportunities:', error)
  }
}

/**
 * Verify that all of a strategy's conditions are met against current metrics.
 */
export async function checkOptimizationConditions(
  conditions: StrategyCondition[],
  getMetricValue: MetricValueProvider
): Promise<boolean> {
  for (const condition of conditions) {
    const currentValue = await getMetricValue(condition.metric)
    if (currentValue === null) {
      return false
    }

    switch (condition.operator) {
      case '>':
        if (currentValue <= condition.threshold) {
          return false
        }
        break
      case '<':
        if (currentValue >= condition.threshold) {
          return false
        }
        break
      default:
        return false
    }
  }

  return true
}

/**
 * Apply a single optimization strategy: verify conditions, run every action,
 * and record the resulting optimization detail.
 */
export async function applyOptimization(
  ctx: IntegrationContext,
  strategy: OptimizationStrategy,
  getMetricValue: MetricValueProvider,
  generateId: IdGenerator
): Promise<void> {
  try {
    if (!(await checkOptimizationConditions(strategy.conditions, getMetricValue))) {
      throw new Error(`Optimization conditions not met for: ${strategy.name}`)
    }

    for (const action of strategy.actions) {
      await executeOptimizationAction(action)
    }

    const optimization: OptimizationDetail = {
      id: generateId(),
      type: strategy.type,
      name: strategy.name,
      appliedAt: new Date(),
      effectiveness: 0,
      status: 'active'
    }

    ctx.optimizationHistory.push(optimization)
    ctx.status.metrics.optimizationsApplied++

    console.log(`[PerformanceIntegration] Optimization applied: ${strategy.name}`)
  } catch (error) {
    console.error(`[PerformanceIntegration] Failed to apply optimization ${strategy.name}:`, error)
    throw error
  }
}

/**
 * Dispatch an optimization action to its concrete implementation.
 */
export async function executeOptimizationAction(action: OptimizationAction): Promise<void> {
  try {
    switch (action.type) {
      case 'scale':
        await executeScaleAction(action)
        break
      case 'cache':
        await executeCacheAction(action)
        break
      case 'compress':
        await executeCompressAction(action)
        break
      case 'prioritize':
        await executePrioritizeAction(action)
        break
      case 'throttle':
        await executeThrottleAction(action)
        break
      case 'redirect':
        await executeRedirectAction(action)
        break
    }
  } catch (error) {
    console.error(`[PerformanceIntegration] Failed to execute optimization action ${action.type}:`, error)
  }
}

export async function executeScaleAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Scale action executed: ${action.target}`)
}

export async function executeCacheAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Cache action executed: ${action.target}`)
}

export async function executeCompressAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Compress action executed: ${action.target}`)
}

export async function executePrioritizeAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Prioritize action executed: ${action.target}`)
}

export async function executeThrottleAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Throttle action executed: ${action.target}`)
}

export async function executeRedirectAction(action: OptimizationAction): Promise<void> {
  console.log(`[PerformanceIntegration] Redirect action executed: ${action.target}`)
}

/**
 * Apply every optimization listed under the emergency priority level and
 * notify components that emergency mode is active.
 */
export async function applyEmergencyOptimizations(
  ctx: IntegrationContext,
  applyStrategy: StrategyApplier
): Promise<void> {
  try {
    const emergencyLevel = ctx.config.emergencyMode.priorityLevels.find(l => l.name === 'emergency')
    if (emergencyLevel) {
      for (const optimization of emergencyLevel.optimizations) {
        await applyStrategy(optimization)
      }
    }

    await notifyEmergencyModeChange(ctx, true)
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to apply emergency optimizations:', error)
  }
}

/**
 * Revert active emergency optimizations and notify components that emergency
 * mode is no longer active.
 */
export async function revertEmergencyOptimizations(ctx: IntegrationContext): Promise<void> {
  try {
    const emergencyOptimizations = ctx.optimizationHistory.filter(o =>
      o.status === 'active' && isEmergencyOptimization(ctx, o.type)
    )

    for (const optimization of emergencyOptimizations) {
      optimization.status = 'expired'
    }

    await notifyEmergencyModeChange(ctx, false)
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to revert emergency optimizations:', error)
  }
}

/**
 * Whether the given optimization type belongs to the emergency priority level.
 */
export function isEmergencyOptimization(ctx: IntegrationContext, type: string): boolean {
  const emergencyLevel = ctx.config.emergencyMode.priorityLevels.find(l => l.name === 'emergency')
  if (!emergencyLevel) {
    return false
  }

  return emergencyLevel.optimizations.includes(type)
}

/**
 * Notify all components (and the dashboard) about an emergency mode change.
 */
export async function notifyEmergencyModeChange(
  ctx: IntegrationContext,
  active: boolean,
  reason?: string
): Promise<void> {
  try {
    for (const [name, component] of ctx.components.entries()) {
      try {
        if (active && typeof component.optimizeForEmergency === 'function') {
          await component.optimizeForEmergency()
        }
      } catch (error) {
        console.error(`[PerformanceIntegration] Failed to notify ${name} about emergency mode:`, error)
      }
    }

    const dashboard = ctx.components.get('performanceDashboard')
    if (dashboard && typeof dashboard.activateEmergencyMode === 'function' && active) {
      await dashboard.activateEmergencyMode()
    } else if (dashboard && typeof dashboard.deactivateEmergencyMode === 'function' && !active) {
      await dashboard.deactivateEmergencyMode()
    }
  } catch (error) {
    console.error('[PerformanceIntegration] Failed to notify emergency mode change:', error)
  }
}
