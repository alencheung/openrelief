/**
 * Data Anonymization Utilities for OpenRelief
 *
 * This module implements various anonymization techniques including k-anonymity,
 * temporal data decay, and data aggregation to protect user privacy.
 */

import { addNoiseToLocation, DEFAULT_DP_CONFIGS } from './differential-privacy'

// Configuration for k-anonymity
export interface KAnonymityConfig {
  k: number; // Minimum group size for anonymity
  quasiIdentifiers: string[]; // Fields that could identify users
  sensitiveAttributes: string[]; // Fields that need protection
}

// Configuration for temporal data decay
export interface TemporalDecayConfig {
  halfLifeDays: number; // Days for data to lose half its value/precision
  minRetentionDays: number; // Minimum days to retain data
  maxRetentionDays: number; // Maximum days to retain data
  decayFunction: 'linear' | 'exponential' | 'logarithmic';
}

// Default configurations
export const DEFAULT_K_ANONYMITY_CONFIGS = {
  location: { k: 5, quasiIdentifiers: ['latitude', 'longitude'], sensitiveAttributes: ['userId'] },
  userProfile: { k: 10, quasiIdentifiers: ['age', 'location'], sensitiveAttributes: ['name', 'email'] },
  emergencyData: { k: 3, quasiIdentifiers: ['timestamp', 'location'], sensitiveAttributes: ['userId'] }
}

export const DEFAULT_TEMPORAL_DECAY_CONFIGS = {
  trustScore: { halfLifeDays: 30, minRetentionDays: 7, maxRetentionDays: 365, decayFunction: 'exponential' as const },
  location: { halfLifeDays: 7, minRetentionDays: 1, maxRetentionDays: 30, decayFunction: 'linear' as const },
  emergencyData: { halfLifeDays: 90, minRetentionDays: 30, maxRetentionDays: 730, decayFunction: 'logarithmic' as const }
}

/**
 * Reduce location precision by rounding coordinates
 * @param latitude Original latitude
 * @param longitude Original longitude
 * @param precisionDigits Number of digits to keep after decimal
 * @returns Reduced precision location
 */
export function reduceLocationPrecision(
  latitude: number,
  longitude: number,
  precisionDigits: number = 3
): { latitude: number; longitude: number } {
  const factor = Math.pow(10, precisionDigits)
  return {
    latitude: Math.round(latitude * factor) / factor,
    longitude: Math.round(longitude * factor) / factor
  }
}

/**
 * Create a privacy grid for location anonymization
 * @param latitude Latitude
 * @param longitude Longitude
 * @param gridSizeKm Grid size in kilometers
 * @returns Grid cell center coordinates
 */
export function createPrivacyGrid(
  latitude: number,
  longitude: number,
  gridSizeKm: number = 1
): { latitude: number; longitude: number } {
  // Convert grid size to degrees (approximate)
  const latGridSize = gridSizeKm / 111 // 1 degree ≈ 111 km
  const lngGridSize = gridSizeKm / (111 * Math.cos(latitude * Math.PI / 180))

  // Snap to grid
  const gridLat = Math.round(latitude / latGridSize) * latGridSize
  const gridLng = Math.round(longitude / lngGridSize) * lngGridSize

  return { latitude: gridLat, longitude: gridLng }
}

/**
 * Generalize age into age ranges for k-anonymity
 * @param age Exact age
 * @param rangeSize Size of age ranges (e.g., 5 for 0-4, 5-9, etc.)
 * @returns Age range string
 */
export function generalizeAge(age: number, rangeSize: number = 5): string {
  const rangeStart = Math.floor(age / rangeSize) * rangeSize
  const rangeEnd = rangeStart + rangeSize - 1
  return `${rangeStart}-${rangeEnd}`
}

/**
 * Generalize timestamp to broader time periods
 * @param timestamp Original timestamp
 * @param granularity Time granularity ('hour', 'day', 'week', 'month')
 * @returns Generalized timestamp
 */
export function generalizeTimestamp(
  timestamp: Date,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
): Date {
  const date = new Date(timestamp)

  switch (granularity) {
    case 'hour':
      date.setMinutes(0, 0, 0)
      break
    case 'day':
      date.setHours(0, 0, 0, 0)
      break
    case 'week':
      const dayOfWeek = date.getDay()
      date.setDate(date.getDate() - dayOfWeek)
      date.setHours(0, 0, 0, 0)
      break
    case 'month':
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      break
  }

  return date
}

/**
 * Check if a dataset satisfies k-anonymity
 * @param data Dataset to check
 * @param config K-anonymity configuration
 * @returns True if dataset satisfies k-anonymity
 */
export function checkKAnonymity<T extends Record<string, any>>(
  data: T[],
  config: KAnonymityConfig
): boolean {
  // Group by quasi-identifiers
  const groups = new Map<string, T[]>()

  data.forEach(record => {
    const key = config.quasiIdentifiers
      .map(id => `${id}:${record[id]}`)
      .join('|')

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(record)
  })

  // Check if all groups have at least k members
  for (const group of groups.values()) {
    if (group.length < config.k) {
      return false
    }
  }

  return true
}

/**
 * Enforce k-anonymity by suppressing or generalizing records
 * @param data Original dataset
 * @param config K-anonymity configuration
 * @returns K-anonymous dataset
 */
export function enforceKAnonymity<T extends Record<string, any>>(
  data: T[],
  config: KAnonymityConfig
): T[] {
  // First, try generalization
  let generalizedData = [...data]

  // Generalize location if it's a quasi-identifier
  if (config.quasiIdentifiers.includes('latitude') || config.quasiIdentifiers.includes('longitude')) {
    generalizedData = generalizedData.map(record => ({
      ...record,
      latitude: record.latitude ? createPrivacyGrid(record.latitude, record.longitude, 2).latitude : record.latitude,
      longitude: record.longitude ? createPrivacyGrid(record.latitude, record.longitude, 2).longitude : record.longitude
    }))
  }

  // Generalize timestamp if it's a quasi-identifier
  if (config.quasiIdentifiers.includes('timestamp')) {
    generalizedData = generalizedData.map(record => ({
      ...record,
      timestamp: record.timestamp ? generalizeTimestamp(record.timestamp, 'day') : record.timestamp
    }))
  }

  // Check if k-anonymity is satisfied
  if (checkKAnonymity(generalizedData, config)) {
    return generalizedData
  }

  // If not, suppress records in small groups
  const groups = new Map<string, T[]>()

  generalizedData.forEach(record => {
    const key = config.quasiIdentifiers
      .map(id => `${id}:${record[id]}`)
      .join('|')

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(record)
  })

  // Only keep records from groups with at least k members
  const result: T[] = []
  for (const group of groups.values()) {
    if (group.length >= config.k) {
      result.push(...group)
    }
  }

  return result
}

/**
 * Apply temporal decay to a numeric value
 * @param value Original value
 * @param timestamp When the value was created
 * @param config Temporal decay configuration
 * @returns Decayed value
 */
export function applyTemporalDecay(
  value: number,
  timestamp: Date,
  config: TemporalDecayConfig
): number {
  const now = new Date()
  const ageDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)

  // Check retention limits
  if (ageDays > config.maxRetentionDays) {
    return 0 // Data has expired
  }

  if (ageDays < config.minRetentionDays) {
    return value // Data is too new to decay
  }

  const decayedAge = ageDays - config.minRetentionDays
  const decayPeriod = config.halfLifeDays

  let decayFactor: number

  switch (config.decayFunction) {
    case 'linear':
      decayFactor = Math.max(0, 1 - (decayedAge / decayPeriod))
      break
    case 'exponential':
      decayFactor = Math.pow(0.5, decayedAge / decayPeriod)
      break
    case 'logarithmic':
      decayFactor = Math.max(0, 1 - Math.log(1 + decayedAge / decayPeriod) / Math.log(2))
      break
    default:
      decayFactor = 1
  }

  return value * decayFactor
}

/**
 * Aggregate data for privacy protection
 * @param data Dataset to aggregate
 * @param groupBy Fields to group by
 * @param aggregations Aggregation functions for each field
 * @returns Aggregated dataset
 */
export function aggregateData<T extends Record<string, any>>(
  data: T[],
  groupBy: string[],
  aggregations: Record<string, 'sum' | 'avg' | 'count' | 'min' | 'max'>
): T[] {
  const groups = new Map<string, T[]>()

  // Group data
  data.forEach(record => {
    const key = groupBy
      .map(field => `${field}:${record[field]}`)
      .join('|')

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(record)
  })

  // Aggregate each group
  const result: T[] = []

  for (const [key, group] of groups) {
    const aggregatedRecord = {} as T

    // Copy group by fields
    groupBy.forEach(field => {
      aggregatedRecord[field] = group[0][field]
    })

    // Apply aggregations
    for (const [field, aggFunc] of Object.entries(aggregations)) {
      const values = group.map(record => record[field]).filter(val => val !== null && val !== undefined)

      switch (aggFunc) {
        case 'sum':
          aggregatedRecord[field] = values.reduce((sum, val) => sum + val, 0) as any
          break
        case 'avg':
          aggregatedRecord[field] = values.reduce((sum, val) => sum + val, 0) / values.length as any
          break
        case 'count':
          aggregatedRecord[field] = values.length as any
          break
        case 'min':
          aggregatedRecord[field] = Math.min(...values) as any
          break
        case 'max':
          aggregatedRecord[field] = Math.max(...values) as any
          break
      }
    }

    result.push(aggregatedRecord)
  }

  return result
}

/**
 * Create privacy-preserving user clusters
 * @param users User data
 * @param k Minimum cluster size
 * @returns Clustered user data
 */
export function createUserClusters<T extends Record<string, any>>(
  users: T[],
  k: number = 5
): Array<{ cluster: T[]; representative: T }> {
  // Simple clustering based on location (in production, use more sophisticated algorithms)
  const clusters: Array<{ cluster: T[]; representative: T }> = []
  const unclustered = [...users]

  while (unclustered.length >= k) {
    const seed = unclustered[0]
    const cluster = [seed]
    unclustered.shift()

    // Find nearby users
    for (let i = unclustered.length - 1; i >= 0; i--) {
      const user = unclustered[i]
      if (user.latitude && user.longitude && seed.latitude && seed.longitude) {
        const distance = calculateDistance(
          seed.latitude, seed.longitude,
          user.latitude, user.longitude
        )

        if (distance < 10) { // 10km radius
          cluster.push(user)
          unclustered.splice(i, 1)

          if (cluster.length >= k * 2) {
            break // Limit cluster size
          }
        }
      }
    }

    if (cluster.length >= k) {
      // Calculate representative (center point)
      const representative = { ...seed } as T
      if (cluster.every(u => u.latitude && u.longitude)) {
        const avgLat = cluster.reduce((sum, u) => sum + u.latitude, 0) / cluster.length
        const avgLng = cluster.reduce((sum, u) => sum + u.longitude, 0) / cluster.length
        representative.latitude = avgLat
        representative.longitude = avgLng
      }

      clusters.push({ cluster, representative })
    }
  }

  return clusters
}

/**
 * Calculate distance between two coordinates in kilometers
 * @param lat1 Latitude 1
 * @param lng1 Longitude 1
 * @param lat2 Latitude 2
 * @param lng2 Longitude 2
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Apply comprehensive anonymization to user data
 * @param userData User data to anonymize
 * @param options Anonymization options
 * @returns Anonymized user data
 */
export function anonymizeUserData<T extends Record<string, any>>(
  userData: T[],
  options: {
    locationPrecision?: number;
    generalizeAge?: boolean;
    ageRangeSize?: number;
    generalizeTimestamp?: boolean;
    timestampGranularity?: 'hour' | 'day' | 'week' | 'month';
    applyKAnonymity?: boolean;
    kAnonymityConfig?: KAnonymityConfig;
    applyDifferentialPrivacy?: boolean;
    clusterUsers?: boolean;
    minClusterSize?: number;
  } = {}
): T[] {
  let anonymized = [...userData]

  // Reduce location precision
  if (options.locationPrecision !== undefined) {
    anonymized = anonymized.map(record => {
      if (record.latitude && record.longitude) {
        const reduced = reduceLocationPrecision(
          record.latitude,
          record.longitude,
          options.locationPrecision
        )
        return { ...record, ...reduced }
      }
      return record
    })
  }

  // Generalize age
  if (options.generalizeAge && record.age) {
    anonymized = anonymized.map(record => {
      if (record.age) {
        return { ...record, age: generalizeAge(record.age, options.ageRangeSize) }
      }
      return record
    })
  }

  // Generalize timestamp
  if (options.generalizeTimestamp) {
    anonymized = anonymized.map(record => {
      if (record.timestamp) {
        return { ...record, timestamp: generalizeTimestamp(record.timestamp, options.timestampGranularity) }
      }
      return record
    })
  }

  // Apply k-anonymity
  if (options.applyKAnonymity && options.kAnonymityConfig) {
    anonymized = enforceKAnonymity(anonymized, options.kAnonymityConfig)
  }

  // Apply differential privacy to locations
  if (options.applyDifferentialPrivacy) {
    anonymized = anonymized.map(record => {
      if (record.latitude && record.longitude) {
        const noisy = addNoiseToLocation(record.latitude, record.longitude)
        return { ...record, ...noisy }
      }
      return record
    })
  }

  // Cluster users
  if (options.clusterUsers) {
    const clusters = createUserClusters(anonymized, options.minClusterSize)
    anonymized = clusters.map(c => c.representative)
  }

  return anonymized
}