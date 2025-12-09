/**
 * Advanced database testing utilities for OpenRelief emergency coordination system
 *
 * This file provides comprehensive testing utilities for database operations,
 * including transaction testing, rollback scenarios, and performance testing.
 */

import { createMockSupabaseClient } from '../mocks/supabase'
import {
  createEmergencyEvent,
  createUser,
  createTrustScore,
  emergencyScenarios,
  testUsers,
  trustScoreData
} from '../fixtures/emergencyScenarios'

// Enhanced database test utilities
export class DatabaseTestUtils {
  private mockClient: any
  private mockDatabase: any
  private transactions: any[] = []

  constructor() {
    this.mockClient = createMockSupabaseClient()
    this.mockDatabase = this.mockClient.__getDatabase()
  }

  // Initialize database with test data
  async initializeTestData() {
    this.resetDatabase()

    // Insert test users
    Object.values(testUsers).forEach(user => {
      this.mockDatabase.user_profiles = this.mockDatabase.user_profiles || []
      this.mockDatabase.user_profiles.push({
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        trust_score: user.trustScore,
        verified: user.verified,
        last_known_location: user.location
          ? `POINT(${user.location.longitude} ${user.location.latitude})` : null,
        skills: user.skills,
        availability: user.availability,
        certifications: user.certifications,
        experience: user.experience,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })

    // Insert emergency types
    this.mockDatabase.emergency_types = [
      { id: 1, name: 'Medical', icon: 'medical', color: 'red', is_active: true },
      { id: 2, name: 'Fire', icon: 'fire', color: 'orange', is_active: true },
      { id: 3, name: 'Natural Disaster', icon: 'disaster', color: 'blue', is_active: true },
      { id: 4, name: 'Accident', icon: 'accident', color: 'yellow', is_active: true },
      { id: 5, name: 'Security', icon: 'security', color: 'purple', is_active: true },
      { id: 6, name: 'Utility', icon: 'utility', color: 'gray', is_active: true },
      { id: 7, name: 'Other', icon: 'other', color: 'green', is_active: true }
    ]

    // Insert emergency events
    Object.values(emergencyScenarios).forEach(event => {
      this.mockDatabase.emergency_events = this.mockDatabase.emergency_events || []
      this.mockDatabase.emergency_events.push({
        id: event.id,
        type_id: this.getEmergencyTypeId(event.type),
        title: event.title,
        description: event.description,
        location: `POINT(${event.location.longitude} ${event.location.latitude})`,
        location_address: event.location.address,
        reported_by: event.reportedBy,
        status: event.status,
        severity: this.mapSeverityToNumber(event.severity),
        trust_weight: event.trustScore,
        created_at: event.reportedAt,
        updated_at: event.reportedAt,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
    })

    // Insert trust scores
    Object.values(trustScoreData).forEach(trustScore => {
      this.mockDatabase.trust_scores = this.mockDatabase.trust_scores || []
      this.mockDatabase.trust_scores.push({
        user_id: trustScore.userId,
        overall_score: trustScore.overall,
        reliability_score: trustScore.components.reliability,
        accuracy_score: trustScore.components.accuracy,
        response_time_score: trustScore.components.responseTime,
        community_feedback_score: trustScore.components.communityFeedback,
        skill_verification_score: trustScore.components.skillVerification,
        successful_reports: trustScore.factors.successfulReports,
        accurate_reports: trustScore.factors.accurateReports,
        avg_response_time: trustScore.factors.responseTime,
        community_endorsements: trustScore.factors.communityEndorsements,
        verified_skills: trustScore.factors.verifiedSkills,
        last_updated: trustScore.lastUpdated,
        created_at: trustScore.lastUpdated
      })
    })

    return this.mockClient
  }

  // Reset database to clean state
  resetDatabase() {
    this.mockClient.__resetDatabase()
    this.transactions = []
  }

  // Start a database transaction for testing
  beginTransaction() {
    const transaction = {
      id: `tx-${Date.now()}`,
      startTime: Date.now(),
      operations: [],
      rollbackData: JSON.parse(JSON.stringify(this.mockDatabase))
    }
    this.transactions.push(transaction)
    return transaction.id
  }

  // Rollback a transaction
  rollbackTransaction(transactionId: string) {
    const transaction = this.transactions.find(tx => tx.id === transactionId)
    if (transaction) {
      this.mockDatabase = transaction.rollbackData
      this.mockClient.__getDatabase = () => this.mockDatabase
      return true
    }
    return false
  }

  // Commit a transaction
  commitTransaction(transactionId: string) {
    const transactionIndex = this.transactions.findIndex(tx => tx.id === transactionId)
    if (transactionIndex !== -1) {
      this.transactions.splice(transactionIndex, 1)
      return true
    }
    return false
  }

  // Get all transactions
  getTransactions() {
    return this.transactions
  }

  // Helper methods
  private getEmergencyTypeId(type: string): number {
    const typeMap: Record<string, number> = {
      medical: 1,
      fire: 2,
      natural_disaster: 3,
      accident: 4,
      security: 5,
      utility: 6,
      other: 7
    }
    return typeMap[type] || 7
  }

  private mapSeverityToNumber(severity: string): number {
    const severityMap: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    }
    return severityMap[severity] || 2
  }

  // Performance testing utilities
  async measureQueryPerformance(queryFn: () => Promise<any>, iterations = 100) {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await queryFn()
      const end = performance.now()
      times.push(end - start)
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      p99: times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)]
    }
  }

  // Concurrency testing utilities
  async testConcurrentOperations(
    operationFn: () => Promise<any>,
    concurrency = 10,
    operations = 100
  ) {
    const promises: Promise<any>[] = []
    const results: any[] = []
    const errors: Error[] = []

    for (let i = 0; i < operations; i++) {
      if (promises.length < concurrency) {
        promises.push(
          operationFn()
            .then(result => {
              results.push(result)
              return result
            })
            .catch(error => {
              errors.push(error)
              throw error
            })
            .finally(() => {
              const index = promises.indexOf(promises[promises.length - 1])
              if (index > -1) {
                promises.splice(index, 1)
              }
            })
        )
      }

      if (promises.length >= concurrency) {
        await Promise.race(promises)
      }
    }

    await Promise.allSettled(promises)

    return {
      totalOperations: operations,
      successful: results.length,
      failed: errors.length,
      errors,
      successRate: (results.length / operations) * 100
    }
  }

  // Data integrity testing utilities
  async validateDataIntegrity() {
    const issues: string[] = []

    // Check for orphaned records
    const events = this.mockDatabase.emergency_events || []
    const users = this.mockDatabase.user_profiles || []
    const confirmations = this.mockDatabase.event_confirmations || []

    // Check events with non-existent reporters
    events.forEach((event: any) => {
      const reporterExists = users.some((user: any) => user.user_id === event.reported_by)
      if (!reporterExists) {
        issues.push(`Event ${event.id} has non-existent reporter: ${event.reported_by}`)
      }
    })

    // Check confirmations with non-existent events or users
    confirmations.forEach((confirmation: any) => {
      const eventExists = events.some((event: any) => event.id === confirmation.event_id)
      const userExists = users.some((user: any) => user.user_id === confirmation.user_id)

      if (!eventExists) {
        issues.push(`Confirmation ${confirmation.id} has non-existent event: ${confirmation.event_id}`)
      }
      if (!userExists) {
        issues.push(`Confirmation ${confirmation.id} has non-existent user: ${confirmation.user_id}`)
      }
    })

    // Check for data consistency
    events.forEach((event: any) => {
      if (event.severity < 1 || event.severity > 4) {
        issues.push(`Event ${event.id} has invalid severity: ${event.severity}`)
      }

      if (!['pending', 'active', 'resolved', 'closed'].includes(event.status)) {
        issues.push(`Event ${event.id} has invalid status: ${event.status}`)
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  // Get mock client for testing
  getMockClient() {
    return this.mockClient
  }

  // Get current database state
  getDatabaseState() {
    return JSON.parse(JSON.stringify(this.mockDatabase))
  }

  // Create test data with specific scenarios
  createTestScenario(scenario: 'high-volume' | 'concurrent-access' | 'data-corruption' | 'network-partition') {
    switch (scenario) {
      case 'high-volume':
        return this.createHighVolumeScenario()
      case 'concurrent-access':
        return this.createConcurrentAccessScenario()
      case 'data-corruption':
        return this.createDataCorruptionScenario()
      case 'network-partition':
        return this.createNetworkPartitionScenario()
      default:
        throw new Error(`Unknown scenario: ${scenario}`)
    }
  }

  private createHighVolumeScenario() {
    const events = []
    for (let i = 0; i < 1000; i++) {
      events.push(createEmergencyEvent({
        id: `bulk-event-${i}`,
        title: `Bulk Event ${i}`,
        description: `Description for bulk event ${i}`
      }))
    }

    this.mockDatabase.emergency_events = this.mockDatabase.emergency_events || []
    this.mockDatabase.emergency_events.push(...events.map(event => ({
      id: event.id,
      type_id: this.getEmergencyTypeId(event.type),
      title: event.title,
      description: event.description,
      location: `POINT(${event.location.longitude} ${event.location.latitude})`,
      reported_by: event.reportedBy,
      status: event.status,
      severity: this.mapSeverityToNumber(event.severity),
      trust_weight: event.trustScore,
      created_at: event.reportedAt,
      updated_at: event.reportedAt,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })))

    return events
  }

  private createConcurrentAccessScenario() {
    // Create events that will be accessed concurrently
    const concurrentEvents = []
    for (let i = 0; i < 10; i++) {
      concurrentEvents.push(createEmergencyEvent({
        id: `concurrent-event-${i}`,
        title: `Concurrent Event ${i}`
      }))
    }

    return concurrentEvents
  }

  private createDataCorruptionScenario() {
    // Intentionally create some corrupted data for testing
    this.mockDatabase.emergency_events = this.mockDatabase.emergency_events || []
    this.mockDatabase.emergency_events.push({
      id: 'corrupted-event-1',
      type_id: 999, // Invalid type
      title: '', // Empty title
      description: null, // Null description
      location: 'INVALID_COORDINATES',
      reported_by: 'non-existent-user',
      status: 'invalid-status',
      severity: 10, // Invalid severity
      trust_weight: -1, // Invalid trust weight
      created_at: 'invalid-date',
      updated_at: null
    })

    return ['corrupted-event-1']
  }

  private createNetworkPartitionScenario() {
    // Simulate network partition by creating delayed operations
    return {
      delayedOperations: [
        { type: 'insert', table: 'emergency_events', delay: 5000 },
        { type: 'update', table: 'emergency_events', delay: 3000 },
        { type: 'delete', table: 'emergency_events', delay: 1000 }
      ]
    }
  }
}

// Singleton instance for global use
export const dbTestUtils = new DatabaseTestUtils()

// Export convenience functions
export const initializeTestDatabase = () => dbTestUtils.initializeTestData()
export const resetTestDatabase = () => dbTestUtils.resetDatabase()
export const getMockDatabase = () => dbTestUtils.getMockClient()
export const validateDatabaseIntegrity = () => dbTestUtils.validateDataIntegrity()

// Performance testing exports
export const measureQueryPerformance = (queryFn: () => Promise<any>, iterations?: number) =>
  dbTestUtils.measureQueryPerformance(queryFn, iterations)

export const testConcurrentOperations = (
  operationFn: () => Promise<any>,
  concurrency?: number,
  operations?: number
) => dbTestUtils.testConcurrentOperations(operationFn, concurrency, operations)

// Transaction testing exports
export const beginTransaction = () => dbTestUtils.beginTransaction()
export const rollbackTransaction = (id: string) => dbTestUtils.rollbackTransaction(id)
export const commitTransaction = (id: string) => dbTestUtils.commitTransaction(id)

export default dbTestUtils