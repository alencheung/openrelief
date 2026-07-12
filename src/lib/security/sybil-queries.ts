/**
 * Supabase data-access helpers for the Sybil Attack Prevention System.
 *
 * Extracted from sybil-prevention.ts. Each function fetches a slice of user
 * data and returns it already mapped into the domain types defined in
 * sybil-types.ts. Keeping these queries here lets the engine class focus on
 * orchestration and incident response.
 */

import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type {
  AuditLogRow,
  EmergencyEventRow,
  EventConfirmationRow,
  LocationHistory,
  NetworkConnection,
  ReportingHistory,
  UserProfileRow,
  VotingHistory
} from './sybil-types'
import {
  mapLocationHistory,
  mapNetworkConnections,
  summarizeReportingHistory,
  summarizeVotingHistory
} from './sybil-detection'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

/**
 * Fetch a single user profile row by ID.
 */
export async function fetchUserProfile(
  userId: string
): Promise<UserProfileRow> {
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (userError || !userData) {
    throw new Error(`User ${userId} not found`)
  }

  return userData as UserProfileRow
}

/**
 * Load recently-created user profiles (last 7 days).
 */
export async function fetchRecentUserProfiles(): Promise<UserProfileRow[]> {
  const { data: users, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .gte('created_at', new Date(Date.now() - WEEK_MS).toISOString()) // Last 7 days

  if (error) {
    throw error
  }

  return (users as UserProfileRow[] | null) || []
}

/**
 * Fetch a user's audit-log activity from the last 24 hours.
 */
export async function fetchUserActivityHistory(
  userId: string
): Promise<AuditLogRow[]> {
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', new Date(Date.now() - DAY_MS).toISOString()) // Last 24 hours
    .order('timestamp', { ascending: true })

  if (error) {
    throw error
  }
  return (data as AuditLogRow[] | null) || []
}

/**
 * Fetch and map a user's network connections from event confirmations.
 */
export async function fetchNetworkConnections(
  userId: string
): Promise<NetworkConnection[]> {
  const { data, error } = await supabaseAdmin
    .from('event_confirmations')
    .select(
      `
      *,
      user: user_profiles!inner(user_id, trust_score)
    `
    )
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - WEEK_MS).toISOString())

  if (error) {
    throw error
  }

  return mapNetworkConnections(data as EventConfirmationRow[] | null)
}

/**
 * Fetch and summarize a user's voting history from event confirmations.
 */
export async function fetchVotingHistory(userId: string): Promise<VotingHistory> {
  const { data, error } = await supabaseAdmin
    .from('event_confirmations')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - WEEK_MS).toISOString())

  if (error) {
    throw error
  }

  return summarizeVotingHistory((data as EventConfirmationRow[] | null) || [])
}

/**
 * Fetch and summarize a user's emergency-event reporting history.
 */
export async function fetchReportingHistory(
  userId: string
): Promise<ReportingHistory> {
  const { data, error } = await supabaseAdmin
    .from('emergency_events')
    .select('*')
    .eq('reported_by', userId)
    .gte('created_at', new Date(Date.now() - WEEK_MS).toISOString())

  if (error) {
    throw error
  }

  const reports = (data as EmergencyEventRow[] | null) || []
  return summarizeReportingHistory(reports)
}

/**
 * Fetch and map a user's location history from profile updates.
 */
export async function fetchLocationHistory(
  userId: string
): Promise<LocationHistory[]> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('last_known_location, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })

  if (error) {
    throw error
  }

  const locations =
    (data as Pick<UserProfileRow, 'last_known_location' | 'updated_at'>[] | null) ||
    []
  return mapLocationHistory(locations)
}

/**
 * Fetch user profiles created within the last hour (for burst detection).
 */
export async function fetchRecentAccountCreations(): Promise<UserProfileRow[]> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

  if (error) {
    throw error
  }

  return (data as UserProfileRow[] | null) || []
}

/**
 * Generate a pseudo device fingerprint for a user.
 *
 * This would collect various device characteristics; for now it returns a hash
 * of user ID and timestamp.
 */
export async function generateDeviceFingerprint(userId: string): Promise<string> {
  return createHash('sha256')
    .update(`${userId}:${Date.now()}`)
    .digest('hex')
    .substring(0, 16)
}

/**
 * Suspend a user account with the given reason.
 */
export async function suspendUser(
  userId: string,
  reason: string
): Promise<void> {
  await supabaseAdmin
    .from('user_profiles')
    .update({
      status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date().toISOString()
    })
    .eq('user_id', userId)
}
