/**
 * Privacy Notifications System for OpenRelief
 *
 * This module provides a comprehensive notification system for privacy-related events,
 * including data processing alerts, privacy budget warnings, legal request updates,
 * and unusual access pattern detection.
 */

import { PrivacyNotificationSettings } from '@/hooks/usePrivacy'

// Privacy notification types
export type PrivacyNotificationType =
  | 'data_processing_alert'
  | 'privacy_budget_warning'
  | 'legal_request_update'
  | 'third_party_sharing_alert'
  | 'unusual_access_alert'
  | 'data_breach_notification'
  | 'system_status_change'
  | 'consent_required'
  | 'retention_policy_change'
  | 'new_feature_announcement';

// Privacy notification severity levels
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

// Privacy notification interface
export interface PrivacyNotification {
  id: string;
  type: PrivacyNotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: Date;
  read: boolean;
  requiresAction: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  category: 'privacy' | 'security' | 'legal' | 'system';
}

// Notification preferences
export interface NotificationPreferences {
  email: {
    enabled: boolean;
    address: string;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    types: PrivacyNotificationType[];
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    types: PrivacyNotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: PrivacyNotificationType[];
  };
}

// Notification template
interface NotificationTemplate {
  type: PrivacyNotificationType;
  defaultTitle: string;
  defaultMessage: string;
  defaultSeverity: NotificationSeverity;
  defaultCategory: 'privacy' | 'security' | 'legal' | 'system';
  requiresAction: boolean;
  actionLabel?: string;
  actionUrl?: string;
  expirationHours?: number;
}

// Notification templates
const notificationTemplates: NotificationTemplate[] = [
  {
    type: 'data_processing_alert',
    defaultTitle: 'Data Processing Activity',
    defaultMessage: 'Your data has been processed for {{purpose}}. You can view details in your privacy dashboard.',
    defaultSeverity: 'info',
    defaultCategory: 'privacy',
    requiresAction: false
  },
  {
    type: 'privacy_budget_warning',
    defaultTitle: 'Privacy Budget Warning',
    defaultMessage: 'Your privacy budget is running low ({{percentage}}% remaining). Consider adjusting your privacy settings.',
    defaultSeverity: 'warning',
    defaultCategory: 'privacy',
    requiresAction: true,
    actionLabel: 'Adjust Settings',
    actionUrl: '/privacy/settings',
    expirationHours: 72
  },
  {
    type: 'legal_request_update',
    defaultTitle: 'Legal Request Update',
    defaultMessage: 'Your {{requestType}} request has been updated to {{status}}. {{details}}',
    defaultSeverity: 'info',
    defaultCategory: 'legal',
    requiresAction: true,
    actionLabel: 'View Request',
    actionUrl: '/privacy/legal-requests'
  },
  {
    type: 'third_party_sharing_alert',
    defaultTitle: 'Third-Party Data Sharing',
    defaultMessage: 'Your {{dataType}} data has been shared with {{recipient}} for {{purpose}}.',
    defaultSeverity: 'warning',
    defaultCategory: 'privacy',
    requiresAction: true,
    actionLabel: 'Review Sharing',
    actionUrl: '/privacy/data-sharing',
    expirationHours: 168 // 1 week
  },
  {
    type: 'unusual_access_alert',
    defaultTitle: 'Unusual Access Detected',
    defaultMessage: 'Unusual access pattern detected for your {{dataType}} data from {{location}}. Please review your account activity.',
    defaultSeverity: 'warning',
    defaultCategory: 'security',
    requiresAction: true,
    actionLabel: 'Review Activity',
    actionUrl: '/privacy/activity-log',
    expirationHours: 48
  },
  {
    type: 'data_breach_notification',
    defaultTitle: 'Data Breach Notification',
    defaultMessage: 'We have detected a data breach that may have affected your {{dataType}} data. {{details}}',
    defaultSeverity: 'critical',
    defaultCategory: 'security',
    requiresAction: true,
    actionLabel: 'Learn More',
    actionUrl: '/privacy/breach-notification',
    expirationHours: 720 // 30 days
  },
  {
    type: 'system_status_change',
    defaultTitle: 'Privacy System Update',
    defaultMessage: 'Our privacy systems have been updated. {{changes}}',
    defaultSeverity: 'info',
    defaultCategory: 'system',
    requiresAction: false,
    expirationHours: 168 // 1 week
  },
  {
    type: 'consent_required',
    defaultTitle: 'Consent Required',
    defaultMessage: 'We need your consent for {{purpose}}. {{details}}',
    defaultSeverity: 'warning',
    defaultCategory: 'privacy',
    requiresAction: true,
    actionLabel: 'Provide Consent',
    actionUrl: '/privacy/consent'
  },
  {
    type: 'retention_policy_change',
    defaultTitle: 'Data Retention Policy Update',
    defaultMessage: 'Our data retention policy for {{dataType}} has changed. {{details}}',
    defaultSeverity: 'info',
    defaultCategory: 'privacy',
    requiresAction: true,
    actionLabel: 'Review Changes',
    actionUrl: '/privacy/retention-policy'
  },
  {
    type: 'new_feature_announcement',
    defaultTitle: 'New Privacy Feature',
    defaultMessage: 'We\'ve added a new privacy feature: {{featureName}}. {{description}}',
    defaultSeverity: 'info',
    defaultCategory: 'privacy',
    requiresAction: false,
    expirationHours: 168 // 1 week
  }
]

// Notification manager class
export class PrivacyNotificationManager {
  private notifications: PrivacyNotification[] = []
  private settings: PrivacyNotificationSettings
  private preferences: NotificationPreferences
  private subscribers: ((notification: PrivacyNotification) => void)[] = []

  constructor(
    settings: PrivacyNotificationSettings,
    preferences: NotificationPreferences
  ) {
    this.settings = settings
    this.preferences = preferences
  }

  // Subscribe to notifications
  subscribe(callback: (notification: PrivacyNotification) => void): () => void {
    this.subscribers.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  // Create a new notification
  createNotification(
    type: PrivacyNotificationType,
    customMessage?: string,
    customTitle?: string,
    metadata?: Record<string, any>
  ): PrivacyNotification {
    const template = notificationTemplates.find(t => t.type === type)

    if (!template) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    // Check if this notification type is enabled in settings
    if (!this.isNotificationTypeEnabled(type)) {
      throw new Error(`Notification type ${type} is disabled`)
    }

    // Generate notification ID
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Process message template with metadata
    const message = customMessage || this.processTemplate(template.defaultMessage, metadata)
    const title = customTitle || template.defaultTitle

    // Calculate expiration date
    let expiresAt: Date | undefined
    if (template.expirationHours) {
      expiresAt = new Date(Date.now() + template.expirationHours * 60 * 60 * 1000)
    }

    // Create notification object
    const notification: PrivacyNotification = {
      id,
      type,
      title,
      message,
      severity: template.defaultSeverity,
      timestamp: new Date(),
      read: false,
      requiresAction: template.requiresAction,
      actionUrl: template.actionUrl,
      actionLabel: template.actionLabel,
      metadata,
      expiresAt,
      category: template.defaultCategory
    }

    // Add to notifications list
    this.notifications.unshift(notification)

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100)
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(notification))

    // Send notifications based on preferences
    this.sendNotifications(notification)

    return notification
  }

  // Process template string with metadata
  private processTemplate(template: string, metadata?: Record<string, any>): string {
    if (!metadata) {
      return template
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return metadata[key] !== undefined ? String(metadata[key]) : match
    })
  }

  // Check if notification type is enabled in settings
  private isNotificationTypeEnabled(type: PrivacyNotificationType): boolean {
    const settingMap: Record<PrivacyNotificationType, keyof PrivacyNotificationSettings> = {
      data_processing_alert: 'dataProcessingAlerts',
      privacy_budget_warning: 'privacyBudgetWarnings',
      legal_request_update: 'legalRequestUpdates',
      third_party_sharing_alert: 'thirdPartySharingAlerts',
      unusual_access_alert: 'unusualAccessAlerts',
      data_breach_notification: 'dataBreachNotifications',
      system_status_change: 'systemStatusChanges',
      consent_required: 'dataProcessingAlerts', // Use data processing alerts setting
      retention_policy_change: 'dataProcessingAlerts', // Use data processing alerts setting
      new_feature_announcement: 'dataProcessingAlerts' // Use data processing alerts setting
    }

    const settingKey = settingMap[type]
    return this.settings[settingKey]
  }

  // Send notifications based on user preferences
  private sendNotifications(notification: PrivacyNotification): void {
    // In-app notification
    if (this.preferences.inApp.enabled
        && this.preferences.inApp.types.includes(notification.type)) {
      // In-app notifications are handled by the UI component
    }

    // Push notification
    if (this.preferences.push.enabled
        && this.preferences.push.types.includes(notification.type)
        && this.preferences.push.frequency === 'immediate') {
      this.sendPushNotification(notification)
    }

    // Email notification
    if (this.preferences.email.enabled
        && this.preferences.email.types.includes(notification.type)
        && this.preferences.email.frequency === 'immediate') {
      this.sendEmailNotification(notification)
    }
  }

  // Send push notification (mock implementation)
  private sendPushNotification(notification: PrivacyNotification): void {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      // In a real implementation, you would use the Web Push API
      console.log('Sending push notification:', notification)
    }
  }

  // Send email notification (mock implementation)
  private sendEmailNotification(notification: PrivacyNotification): void {
    // In a real implementation, you would call an API endpoint to send emails
    console.log('Sending email notification to', this.preferences.email.address, ':', notification)
  }

  // Get all notifications
  getNotifications(): PrivacyNotification[] {
    return [...this.notifications]
  }

  // Get unread notifications
  getUnreadNotifications(): PrivacyNotification[] {
    return this.notifications.filter(n => !n.read)
  }

  // Get notifications by type
  getNotificationsByType(type: PrivacyNotificationType): PrivacyNotification[] {
    return this.notifications.filter(n => n.type === type)
  }

  // Get notifications by category
  getNotificationsByCategory(category: 'privacy' | 'security' | 'legal' | 'system'): PrivacyNotification[] {
    return this.notifications.filter(n => n.category === category)
  }

  // Mark notification as read
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      return true
    }
    return false
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true)
  }

  // Delete notification
  deleteNotification(notificationId: string): boolean {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index > -1) {
      this.notifications.splice(index, 1)
      return true
    }
    return false
  }

  // Clear expired notifications
  clearExpiredNotifications(): number {
    const now = new Date()
    const initialLength = this.notifications.length

    this.notifications = this.notifications.filter(n =>
      !n.expiresAt || n.expiresAt > now
    )

    return initialLength - this.notifications.length
  }

  // Update settings
  updateSettings(settings: PrivacyNotificationSettings): void {
    this.settings = { ...settings }
  }

  // Update preferences
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences }
  }

  // Get notification statistics
  getStatistics(): {
    total: number;
    unread: number;
    byType: Record<PrivacyNotificationType, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<NotificationSeverity, number>;
    } {
    const byType = {} as Record<PrivacyNotificationType, number>
    const byCategory = {} as Record<string, number>
    const bySeverity = {} as Record<NotificationSeverity, number>

    this.notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1
      byCategory[n.category] = (byCategory[n.category] || 0) + 1
      bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1
    })

    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      byType,
      byCategory,
      bySeverity
    }
  }
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  email: {
    enabled: true,
    address: '',
    frequency: 'daily',
    types: [
      'privacy_budget_warning',
      'legal_request_update',
      'third_party_sharing_alert',
      'unusual_access_alert',
      'data_breach_notification'
    ]
  },
  push: {
    enabled: true,
    frequency: 'immediate',
    types: [
      'privacy_budget_warning',
      'legal_request_update',
      'unusual_access_alert',
      'data_breach_notification'
    ]
  },
  inApp: {
    enabled: true,
    types: [
      'data_processing_alert',
      'privacy_budget_warning',
      'legal_request_update',
      'third_party_sharing_alert',
      'unusual_access_alert',
      'data_breach_notification',
      'system_status_change',
      'consent_required',
      'retention_policy_change',
      'new_feature_announcement'
    ]
  }
}

// Convenience functions for creating specific notifications
export const createDataProcessingAlert = (
  manager: PrivacyNotificationManager,
  purpose: string,
  dataType: string
): PrivacyNotification => {
  return manager.createNotification(
    'data_processing_alert',
    undefined,
    undefined,
    { purpose, dataType }
  )
}

export const createPrivacyBudgetWarning = (
  manager: PrivacyNotificationManager,
  percentage: number
): PrivacyNotification => {
  return manager.createNotification(
    'privacy_budget_warning',
    undefined,
    undefined,
    { percentage: percentage.toFixed(1) }
  )
}

export const createLegalRequestUpdate = (
  manager: PrivacyNotificationManager,
  requestType: string,
  status: string,
  details?: string
): PrivacyNotification => {
  return manager.createNotification(
    'legal_request_update',
    undefined,
    undefined,
    { requestType, status, details: details || '' }
  )
}

export const createThirdPartySharingAlert = (
  manager: PrivacyNotificationManager,
  dataType: string,
  recipient: string,
  purpose: string
): PrivacyNotification => {
  return manager.createNotification(
    'third_party_sharing_alert',
    undefined,
    undefined,
    { dataType, recipient, purpose }
  )
}

export const createUnusualAccessAlert = (
  manager: PrivacyNotificationManager,
  dataType: string,
  location: string
): PrivacyNotification => {
  return manager.createNotification(
    'unusual_access_alert',
    undefined,
    undefined,
    { dataType, location }
  )
}

export const createDataBreachNotification = (
  manager: PrivacyNotificationManager,
  dataType: string,
  details: string
): PrivacyNotification => {
  return manager.createNotification(
    'data_breach_notification',
    undefined,
    undefined,
    { dataType, details }
  )
}

export const createSystemStatusChange = (
  manager: PrivacyNotificationManager,
  changes: string
): PrivacyNotification => {
  return manager.createNotification(
    'system_status_change',
    undefined,
    undefined,
    { changes }
  )
}

export const createConsentRequired = (
  manager: PrivacyNotificationManager,
  purpose: string,
  details: string
): PrivacyNotification => {
  return manager.createNotification(
    'consent_required',
    undefined,
    undefined,
    { purpose, details }
  )
}

export const createRetentionPolicyChange = (
  manager: PrivacyNotificationManager,
  dataType: string,
  details: string
): PrivacyNotification => {
  return manager.createNotification(
    'retention_policy_change',
    undefined,
    undefined,
    { dataType, details }
  )
}

export const createNewFeatureAnnouncement = (
  manager: PrivacyNotificationManager,
  featureName: string,
  description: string
): PrivacyNotification => {
  return manager.createNotification(
    'new_feature_announcement',
    undefined,
    undefined,
    { featureName, description }
  )
}