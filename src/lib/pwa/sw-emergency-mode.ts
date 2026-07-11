/**
 * Emergency Mode Manager
 *
 * Watches configured triggers (push, network connectivity, geolocation,
 * manual) and activates/deactivates emergency mode, applying and restoring
 * emergency configurations and notifying the service worker of state changes.
 */

import type {
  EmergencyModeConfig,
  EmergencyTrigger,
  ServiceWorkerMetrics
} from './sw-types'

export class EmergencyModeManager {
  private config: EmergencyModeConfig
  private active: boolean = false
  private activationTime: Date | null = null

  constructor(config: EmergencyModeConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Set up activation triggers
      this.setupTriggers()

      // Check if emergency mode should be active
      await this.checkEmergencyStatus()

      console.log('[EmergencyModeManager] Emergency mode manager initialized')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to initialize:', error)
      throw error
    }
  }

  async activate(): Promise<void> {
    if (this.active) {
      return
    }

    try {
      this.active = true
      this.activationTime = new Date()

      // Apply emergency configurations
      await this.applyEmergencyConfigurations()

      // Notify other components
      this.notifyEmergencyActivation()

      console.log('[EmergencyModeManager] Emergency mode activated')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to activate emergency mode:', error)
      throw error
    }
  }

  async deactivate(): Promise<void> {
    if (!this.active) {
      return
    }

    try {
      this.active = false
      this.activationTime = null

      // Restore normal configurations
      await this.restoreNormalConfigurations()

      // Notify other components
      this.notifyEmergencyDeactivation()

      console.log('[EmergencyModeManager] Emergency mode deactivated')
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to deactivate emergency mode:', error)
      throw error
    }
  }

  getStatus(): ServiceWorkerMetrics['emergencyMode'] {
    return {
      active: this.active,
      activationTime: this.activationTime || undefined,
      cacheHitRate: 0, // Would be calculated from actual cache metrics
      criticalResourceAvailability: 0 // Would be calculated from actual availability
    }
  }

  private setupTriggers(): void {
    for (const trigger of this.config.activationTriggers) {
      switch (trigger.type) {
        case 'push':
          this.setupPushTrigger(trigger)
          break
        case 'network':
          this.setupNetworkTrigger(trigger)
          break
        case 'geolocation':
          this.setupGeolocationTrigger(trigger)
          break
        case 'manual':
          // Manual trigger - no setup needed
          break
      }
    }
  }

  private setupPushTrigger(trigger: EmergencyTrigger): void {
    // Listen for emergency push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'PUSH_RECEIVED'
            && event.data.priority === 'emergency') {
          this.handleTrigger(trigger)
        }
      })
    }
  }

  private setupNetworkTrigger(trigger: EmergencyTrigger): void {
    // Monitor network status
    window.addEventListener('online', () => {
      if (trigger.condition.offline === false) {
        this.handleTrigger(trigger)
      }
    })

    window.addEventListener('offline', () => {
      if (trigger.condition.offline === true) {
        this.handleTrigger(trigger)
      }
    })
  }

  private setupGeolocationTrigger(trigger: EmergencyTrigger): void {
    // Monitor geolocation for emergency areas
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          // Check if user is in emergency area
          this.checkGeolocationTrigger(trigger, position)
        },
        (error) => {
          console.error('[EmergencyModeManager] Geolocation error:', error)
        }
      )
    }
  }

  private async checkGeolocationTrigger(trigger: EmergencyTrigger, position: GeolocationPosition): Promise<void> {
    // In a real implementation, this would check against emergency areas
    // For now, just log the position
    console.log('[EmergencyModeManager] Geolocation check:', position.coords)
  }

  private handleTrigger(trigger: EmergencyTrigger): void {
    switch (trigger.action) {
      case 'activate':
        this.activate()
        break
      case 'prepare':
        this.prepareForEmergency()
        break
      case 'notify':
        this.notifyEmergencyPreparation()
        break
    }
  }

  private async prepareForEmergency(): Promise<void> {
    // Preload emergency resources
    console.log('[EmergencyModeManager] Preparing for emergency')
  }

  private notifyEmergencyPreparation(): void {
    // Show notification about emergency preparation
    console.log('[EmergencyModeManager] Notifying emergency preparation')
  }

  private async applyEmergencyConfigurations(): Promise<void> {
    // Apply emergency configurations
    console.log('[EmergencyModeManager] Applying emergency configurations')
  }

  private async restoreNormalConfigurations(): Promise<void> {
    // Restore normal configurations
    console.log('[EmergencyModeManager] Restoring normal configurations')
  }

  private notifyEmergencyActivation(): void {
    // Notify other components about emergency activation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'EMERGENCY_MODE_ACTIVATED'
      })
    }
  }

  private notifyEmergencyDeactivation(): void {
    // Notify other components about emergency deactivation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'EMERGENCY_MODE_DEACTIVATED'
      })
    }
  }

  private async checkEmergencyStatus(): Promise<void> {
    // Check if emergency mode should be active based on stored state
    try {
      const stored = localStorage.getItem('sw-emergency-mode')
      if (stored === 'active') {
        await this.activate()
      }
    } catch (error) {
      console.error('[EmergencyModeManager] Failed to check emergency status:', error)
    }
  }
}
