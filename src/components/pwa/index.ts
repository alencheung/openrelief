// Enhanced PWA Components for OpenRelief
// Provides comprehensive visual cues for offline/online status transitions

// Core Components
export { EnhancedNetworkStatusIndicator } from './EnhancedNetworkStatusIndicator'
export { OfflineActionQueueVisualization } from './OfflineActionQueueVisualization'
export { SyncProgressNotification } from './SyncProgressNotification'
export { EnhancedOfflineFallback } from './EnhancedOfflineFallback'
export { EnhancedPWAStatus } from './EnhancedPWAStatus'
export { EnhancedPWAManager } from './EnhancedPWAManager'

// Specialized Indicators
export { EmergencyOfflineIndicator } from './EmergencyOfflineIndicator'
export { FormOfflineStatusIndicator } from './FormOfflineStatusIndicator'
export { RealtimeOfflineIndicator } from './RealtimeOfflineIndicator'

// Legacy Components (for backward compatibility)
export { NetworkStatusIndicator } from './NetworkStatusIndicator'
export { OfflineFallback } from './OfflineFallback'
export { PWAManager } from './PWAManager'
export { PWAStatus } from './PWAStatus'
export { PWAInstallPrompt } from './PWAInstallPrompt'

// Re-export commonly used utilities
export { useNetworkStatus } from '@/hooks/useNetworkStatus'
export { useOfflineStore } from '@/store/offlineStore'
export { useAriaAnnouncer } from '@/hooks/accessibility/useAriaAnnouncer'
export { useReducedMotion } from '@/hooks/accessibility/useReducedMotion'