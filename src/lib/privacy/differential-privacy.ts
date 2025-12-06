/**
 * Differential Privacy Utilities for OpenRelief
 * 
 * This module implements differential privacy mechanisms to protect user location data
 * while maintaining useful functionality for emergency response operations.
 */

// Configuration for differential privacy
export interface DPConfig {
  epsilon: number; // Privacy budget parameter (lower = more private)
  delta: number; // Failure probability
  sensitivity: number; // Maximum impact of changing one individual's data
}

// Default privacy configurations for different data types
export const DEFAULT_DP_CONFIGS = {
  location: { epsilon: 0.1, delta: 1e-5, sensitivity: 1.0 },
  trustScore: { epsilon: 0.5, delta: 1e-5, sensitivity: 1.0 },
  userProfile: { epsilon: 1.0, delta: 1e-5, sensitivity: 1.0 },
  emergencyData: { epsilon: 0.05, delta: 1e-6, sensitivity: 1.0 } // Higher privacy for emergencies
};

// Privacy budget tracking for each user
export interface PrivacyBudget {
  userId: string;
  remainingBudget: Map<string, number>; // dataType -> remaining epsilon
  lastReset: Date;
  queryHistory: Array<{
    timestamp: Date;
    dataType: string;
    epsilonUsed: number;
    queryType: string;
  }>;
}

// In-memory storage for privacy budgets (in production, use secure storage)
const privacyBudgetStore = new Map<string, PrivacyBudget>();

/**
 * Generate Laplace-distributed noise for differential privacy
 * @param scale The scale parameter (sensitivity/epsilon)
 * @returns Random noise value
 */
export function generateLaplaceNoise(scale: number): number {
  // Generate uniform random number in (0,1)
  const u = Math.random() - 0.5;
  // Apply Laplace distribution formula
  return scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Add Laplace noise to a numeric value for differential privacy
 * @param value The original value
 * @param config Differential privacy configuration
 * @returns Value with added noise
 */
export function addLaplaceNoise(value: number, config: DPConfig): number {
  const scale = config.sensitivity / config.epsilon;
  const noise = generateLaplaceNoise(scale);
  return value + noise;
}

/**
 * Add noise to location coordinates (latitude, longitude)
 * @param latitude Original latitude
 * @param longitude Original longitude
 * @param config Differential privacy configuration
 * @returns Location with added noise
 */
export function addNoiseToLocation(
  latitude: number,
  longitude: number,
  config: DPConfig = DEFAULT_DP_CONFIGS.location
): { latitude: number; longitude: number } {
  // Add noise in meters, then convert back to degrees
  // Approximate conversion: 1 degree latitude ≈ 111,132 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  
  const latNoiseMeters = addLaplaceNoise(0, config);
  const lngNoiseMeters = addLaplaceNoise(0, config);
  
  // Convert meter noise to degrees
  const latNoiseDegrees = latNoiseMeters / 111132;
  const lngNoiseDegrees = lngNoiseMeters / (111320 * Math.cos(latitude * Math.PI / 180));
  
  return {
    latitude: latitude + latNoiseDegrees,
    longitude: longitude + lngNoiseDegrees
  };
}

/**
 * Check if user has sufficient privacy budget for a query
 * @param userId User ID
 * @param dataType Type of data being queried
 * @param epsilonRequired Epsilon value required for this query
 * @returns True if query is allowed
 */
export function checkPrivacyBudget(
  userId: string,
  dataType: string,
  epsilonRequired: number
): boolean {
  const budget = privacyBudgetStore.get(userId);
  if (!budget) {
    // Initialize new user budget
    initializePrivacyBudget(userId);
    return checkPrivacyBudget(userId, dataType, epsilonRequired);
  }
  
  const remaining = budget.remainingBudget.get(dataType) || 0;
  return remaining >= epsilonRequired;
}

/**
 * Consume privacy budget for a query
 * @param userId User ID
 * @param dataType Type of data being queried
 * @param epsilonUsed Epsilon value consumed
 * @param queryType Type of query being performed
 */
export function consumePrivacyBudget(
  userId: string,
  dataType: string,
  epsilonUsed: number,
  queryType: string
): void {
  const budget = privacyBudgetStore.get(userId);
  if (!budget) return;
  
  const remaining = budget.remainingBudget.get(dataType) || 0;
  budget.remainingBudget.set(dataType, remaining - epsilonUsed);
  
  budget.queryHistory.push({
    timestamp: new Date(),
    dataType,
    epsilonUsed,
    queryType
  });
}

/**
 * Initialize privacy budget for a new user
 * @param userId User ID
 */
export function initializePrivacyBudget(userId: string): void {
  const budget: PrivacyBudget = {
    userId,
    remainingBudget: new Map([
      ['location', 1.0], // Daily budget of 1.0 epsilon for location queries
      ['trustScore', 2.0], // Higher budget for trust scores
      ['userProfile', 3.0], // Higher budget for profile data
      ['emergencyData', 0.5] // Limited budget for emergency data
    ]),
    lastReset: new Date(),
    queryHistory: []
  };
  
  privacyBudgetStore.set(userId, budget);
}

/**
 * Reset privacy budgets (should be called daily)
 */
export function resetPrivacyBudgets(): void {
  privacyBudgetStore.forEach(budget => {
    budget.remainingBudget = new Map([
      ['location', 1.0],
      ['trustScore', 2.0],
      ['userProfile', 3.0],
      ['emergencyData', 0.5]
    ]);
    budget.lastReset = new Date();
  });
}

/**
 * Get privacy budget information for a user
 * @param userId User ID
 * @returns Privacy budget information
 */
export function getPrivacyBudget(userId: string): PrivacyBudget | undefined {
  return privacyBudgetStore.get(userId);
}

/**
 * Apply differential privacy to a spatial query result
 * @param results Original query results
 * @param config Differential privacy configuration
 * @returns Privacy-protected results
 */
export function applyDPToSpatialResults<T extends { latitude: number; longitude: number }>(
  results: T[],
  config: DPConfig = DEFAULT_DP_CONFIGS.location
): T[] {
  return results.map(result => ({
    ...result,
    latitude: addLaplaceNoise(result.latitude, config),
    longitude: addLaplaceNoise(result.longitude, config)
  }));
}

/**
 * Create a privacy-preserving bounding box for spatial queries
 * @param centerLat Center latitude
 * @param centerLng Center longitude
 * @param radiusKm Radius in kilometers
 * @param config Differential privacy configuration
 * @returns Privacy-protected bounding box
 */
export function createPrivateBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  config: DPConfig = DEFAULT_DP_CONFIGS.location
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  // Add noise to center point
  const noisyCenter = addNoiseToLocation(centerLat, centerLng, config);
  
  // Add noise to radius
  const noisyRadius = addLaplaceNoise(radiusKm, config);
  
  // Convert radius to degrees (approximate)
  const latDelta = noisyRadius / 111; // 1 degree ≈ 111 km
  const lngDelta = noisyRadius / (111 * Math.cos(noisyCenter.latitude * Math.PI / 180));
  
  return {
    north: noisyCenter.latitude + latDelta,
    south: noisyCenter.latitude - latDelta,
    east: noisyCenter.longitude + lngDelta,
    west: noisyCenter.longitude - lngDelta
  };
}

// Auto-reset budgets daily
setInterval(resetPrivacyBudgets, 24 * 60 * 60 * 1000);