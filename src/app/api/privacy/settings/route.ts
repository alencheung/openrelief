/**
 * Privacy Settings API Endpoint
 *
 * Reads and updates the requesting user's privacy_settings row. All access is
 * logged to privacy_audit_log for GDPR transparency. Uses the RLS-bound SSR
 * client so users can only read/write their own row.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAPISecurity, API_SECURITY_CONFIGS } from '@/lib/security/api-security'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrivacySettings } from '@/hooks/usePrivacy'

// The SSR client is typed against the (partial) Database types; several
// privacy tables are not yet modelled there, so cast to the untyped client
// for these handlers. Safe because RLS scopes all access to the caller.
type SSRClient = SupabaseClient

// Default privacy settings (returned when no row exists yet).
const defaultPrivacySettings: PrivacySettings = {
  locationSharing: true,
  locationPrecision: 3,
  dataRetentionDays: 30,
  anonymizeData: true,
  differentialPrivacy: true,
  kAnonymity: true,
  endToEndEncryption: true,
  emergencyDataSharing: true,
  researchParticipation: false,
  thirdPartyAnalytics: false,
  automatedDataCleanup: true,
  privacyBudgetAlerts: true,
  legalNotifications: true,
  dataProcessingPurposes: ['service_delivery', 'safety_monitoring'],
  consentManagement: true,
  realTimeMonitoring: true
}

// Maps the snake_case DB row to the camelCase PrivacySettings interface.
function rowToSettings(row: Record<string, unknown>): PrivacySettings {
  return {
    locationSharing: row.location_sharing as boolean,
    locationPrecision: row.location_precision as number,
    dataRetentionDays: row.data_retention_days as number,
    anonymizeData: row.anonymize_data as boolean,
    differentialPrivacy: row.differential_privacy as boolean,
    kAnonymity: row.k_anonymity as boolean,
    endToEndEncryption: row.end_to_end_encryption as boolean,
    emergencyDataSharing: row.emergency_data_sharing as boolean,
    researchParticipation: row.research_participation as boolean,
    thirdPartyAnalytics: row.third_party_analytics as boolean,
    automatedDataCleanup: row.automated_data_cleanup as boolean,
    privacyBudgetAlerts: row.privacy_budget_alerts as boolean,
    legalNotifications: row.legal_notifications as boolean,
    dataProcessingPurposes: row.data_processing_purposes as string[],
    consentManagement: row.consent_management as boolean,
    realTimeMonitoring: row.real_time_monitoring as boolean
  }
}

// Maps the camelCase PrivacySettings to the DB row (partial updates allowed).
function settingsToRow(settings: Partial<PrivacySettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (settings.locationSharing !== undefined) row.location_sharing = settings.locationSharing
  if (settings.locationPrecision !== undefined) row.location_precision = settings.locationPrecision
  if (settings.dataRetentionDays !== undefined) row.data_retention_days = settings.dataRetentionDays
  if (settings.anonymizeData !== undefined) row.anonymize_data = settings.anonymizeData
  if (settings.differentialPrivacy !== undefined) {
    row.differential_privacy = settings.differentialPrivacy
  }
  if (settings.kAnonymity !== undefined) row.k_anonymity = settings.kAnonymity
  if (settings.endToEndEncryption !== undefined) {
    row.end_to_end_encryption = settings.endToEndEncryption
  }
  if (settings.emergencyDataSharing !== undefined) {
    row.emergency_data_sharing = settings.emergencyDataSharing
  }
  if (settings.researchParticipation !== undefined) {
    row.research_participation = settings.researchParticipation
  }
  if (settings.thirdPartyAnalytics !== undefined) {
    row.third_party_analytics = settings.thirdPartyAnalytics
  }
  if (settings.automatedDataCleanup !== undefined) {
    row.automated_data_cleanup = settings.automatedDataCleanup
  }
  if (settings.privacyBudgetAlerts !== undefined) {
    row.privacy_budget_alerts = settings.privacyBudgetAlerts
  }
  if (settings.legalNotifications !== undefined) {
    row.legal_notifications = settings.legalNotifications
  }
  if (settings.dataProcessingPurposes !== undefined) {
    row.data_processing_purposes = settings.dataProcessingPurposes
  }
  if (settings.consentManagement !== undefined) {
    row.consent_management = settings.consentManagement
  }
  if (settings.realTimeMonitoring !== undefined) {
    row.real_time_monitoring = settings.realTimeMonitoring
  }
  return row
}

// GET handler - retrieve privacy settings
export const GET = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (_request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const supabase = (await createClient()) as SSRClient

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', context.userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching privacy settings:', error)
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
      }

      const settings = data ? rowToSettings(data) : defaultPrivacySettings
      const lastUpdated = data ? (data.updated_at as string) : new Date().toISOString()

      await logPrivacyAccess(supabase, context.userId, 'settings_retrieval', 'privacy_settings')

      return NextResponse.json({
        success: true,
        data: { settings, lastUpdated, version: '1.0' }
      })
    } catch (error) {
      console.error('Error retrieving privacy settings:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// POST handler - update privacy settings
export const POST = withAPISecurity(API_SECURITY_CONFIGS.user)(
  async (request: NextRequest, context) => {
    try {
      if (!context.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const body = await request.json()
      const { settings } = body as { settings?: Partial<PrivacySettings> }

      if (!settings || typeof settings !== 'object') {
        return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 })
      }

      const validationError = validatePrivacySettings(settings)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const supabase = (await createClient()) as SSRClient

      // Fetch current settings for comparison + merge.
      const { data: currentRow } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', context.userId)
        .maybeSingle()

      const currentSettings = currentRow ? rowToSettings(currentRow) : defaultPrivacySettings
      const merged: PrivacySettings = { ...currentSettings, ...settings }
      const rowPatch = { ...settingsToRow(defaultPrivacySettings), ...settingsToRow(merged) }

      // Upsert the merged settings.
      const { data: saved, error: saveError } = await supabase
        .from('privacy_settings')
        .upsert({ user_id: context.userId, ...rowPatch }, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (saveError) {
        console.error('Error saving privacy settings:', saveError)
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
      }

      await logPrivacyAccess(supabase, context.userId, 'settings_update', 'privacy_settings', {
        changedFields: Object.keys(settings),
        previousSettings: currentSettings,
        updatedSettings: merged
      })

      return NextResponse.json({
        success: true,
        data: {
          settings: rowToSettings(saved),
          lastUpdated: saved.updated_at,
          message: 'Privacy settings updated successfully'
        }
      })
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// Validate privacy settings (partial updates allowed)
function validatePrivacySettings(settings: Partial<PrivacySettings>): string | null {
  if (settings.locationSharing !== undefined && typeof settings.locationSharing !== 'boolean') {
    return 'locationSharing must be a boolean'
  }
  if (
    settings.locationPrecision !== undefined &&
    (typeof settings.locationPrecision !== 'number' ||
      settings.locationPrecision < 1 ||
      settings.locationPrecision > 5)
  ) {
    return 'locationPrecision must be a number between 1 and 5'
  }
  if (
    settings.dataRetentionDays !== undefined &&
    (typeof settings.dataRetentionDays !== 'number' ||
      settings.dataRetentionDays < 7 ||
      settings.dataRetentionDays > 365)
  ) {
    return 'dataRetentionDays must be a number between 7 and 365'
  }
  for (const field of [
    'anonymizeData',
    'differentialPrivacy',
    'kAnonymity',
    'endToEndEncryption',
    'emergencyDataSharing',
    'researchParticipation',
    'thirdPartyAnalytics',
    'automatedDataCleanup',
    'privacyBudgetAlerts',
    'legalNotifications',
    'consentManagement',
    'realTimeMonitoring'
  ] as (keyof PrivacySettings)[]) {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      return `${field} must be a boolean`
    }
  }
  if (
    settings.dataProcessingPurposes !== undefined &&
    (!Array.isArray(settings.dataProcessingPurposes) ||
      !settings.dataProcessingPurposes.every(p => typeof p === 'string'))
  ) {
    return 'dataProcessingPurposes must be an array of strings'
  }
  return null
}

// Log privacy access to the privacy_audit_log table for transparency/compliance.
async function logPrivacyAccess(
  supabase: SSRClient,
  userId: string,
  action: string,
  dataType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('privacy_audit_log').insert({
    user_id: userId,
    action,
    data_type: dataType,
    privacy_budget_used: 0,
    metadata: metadata ?? null,
    user_agent: 'api_server'
  })
  if (error) {
    // Logging is best-effort; never fail the request because of it.
    console.error('Failed to write privacy_audit_log:', error)
  }
}
