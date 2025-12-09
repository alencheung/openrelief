/**
 * Privacy Components Index
 *
 * This file exports all privacy-related components for easy importing
 */

export { default as PrivacyDashboard } from './PrivacyDashboard'
export { default as DataExportTool } from './DataExportTool'

// Re-export types if needed
export type {
  PrivacySettings as PrivacySettingsType,
  DataUsage as DataUsageType,
  DataRetention as DataRetentionType
} from './PrivacyDashboard'

export type {
  DataExportRequest,
  DataDeletionRequest,
  DataSummary
} from './DataExportTool'