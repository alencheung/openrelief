/**
 * Enhanced Supabase mocks for OpenRelief emergency coordination system
 * 
 * This file provides comprehensive mocking for Supabase client, auth,
 * database operations, and real-time subscriptions.
 */

import { jest } from '@jest/globals'

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockDatabase: Record<string, any[]> = {}
  const mockAuth = {
    currentUser: null,
    session: null,
  }

  const mockClient = {
    auth: {
      signIn: jest.fn().mockImplementation(async ({ email, password }) => {
        if (email === 'test@example.com' && password === 'password') {
          const user = {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' },
            app_metadata: { role: 'citizen' },
          }
          mockAuth.currentUser = user
          mockAuth.session = { user, access_token: 'mock-token', refresh_token: 'mock-refresh' }
          return { data: { user, session: mockAuth.session }, error: null }
        }
        return { data: null, error: { message: 'Invalid credentials' } }
      }),
      signOut: jest.fn().mockImplementation(async () => {
        mockAuth.currentUser = null
        mockAuth.session = null
        return { error: null }
      }),
      signUp: jest.fn().mockImplementation(async ({ email, password, options }) => {
        const user = {
          id: 'new-user-id',
          email,
          user_metadata: options?.data || {},
          app_metadata: { role: 'citizen' },
        }
        mockAuth.currentUser = user
        mockAuth.session = { user, access_token: 'mock-token', refresh_token: 'mock-refresh' }
        return { data: { user, session: mockAuth.session }, error: null }
      }),
      onAuthStateChange: jest.fn().mockImplementation((callback) => {
        // Immediately call with current state
        callback('INITIAL_SESSION', mockAuth.session)
        
        // Return unsubscribe function
        return jest.fn()
      }),
      getCurrentUser: jest.fn().mockResolvedValue({ data: mockAuth.currentUser, error: null }),
      updateUser: jest.fn().mockImplementation(async (attributes) => {
        if (mockAuth.currentUser) {
          mockAuth.currentUser = { ...mockAuth.currentUser, ...attributes }
          return { data: mockAuth.currentUser, error: null }
        }
        return { data: null, error: { message: 'No user logged in' } }
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: mockAuth.session, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: mockAuth.session, error: null }),
    },

    from: jest.fn().mockImplementation((table: string) => {
      if (!mockDatabase[table]) {
        mockDatabase[table] = []
      }

      let queryBuilder = {
        data: null,
        error: null,
        
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockImplementation((data) => {
          if (Array.isArray(data)) {
            mockDatabase[table].push(...data)
          } else {
            const newItem = { id: Math.random().toString(36), ...data }
            mockDatabase[table].push(newItem)
            queryBuilder.data = Array.isArray(data) ? data : [newItem]
          }
          return Promise.resolve(queryBuilder)
        }),
        update: jest.fn().mockImplementation((data) => {
          queryBuilder.updateData = data
          return queryBuilder
        }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((column, value) => {
          queryBuilder.eqColumn = column
          queryBuilder.eqValue = value
          return queryBuilder
        }),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        containedBy: jest.fn().mockReturnThis(),
        range: jest.fn().mockImplementation((from, to) => {
          queryBuilder.rangeFrom = from
          queryBuilder.rangeTo = to
          return queryBuilder
        }),
        order: jest.fn().mockImplementation((column, options = {}) => {
          queryBuilder.orderColumn = column
          queryBuilder.orderAscending = options.ascending !== false
          return queryBuilder
        }),
        limit: jest.fn().mockImplementation((count) => {
          queryBuilder.limitCount = count
          return queryBuilder
        }),
        single: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnThis(),
        
        // Execute query
        then: jest.fn().mockImplementation((callback) => {
          let results = [...mockDatabase[table]]
          
          // Apply filters
          if (queryBuilder.eqColumn && queryBuilder.eqValue !== undefined) {
            results = results.filter(item => item[queryBuilder.eqColumn] === queryBuilder.eqValue)
          }
          
          // Apply updates
          if (queryBuilder.updateData) {
            results = results.map(item => {
              if (item[queryBuilder.eqColumn] === queryBuilder.eqValue) {
                return { ...item, ...queryBuilder.updateData }
              }
              return item
            })
            // Update mock database
            mockDatabase[table] = mockDatabase[table].map(item => {
              if (item[queryBuilder.eqColumn] === queryBuilder.eqValue) {
                return { ...item, ...queryBuilder.updateData }
              }
              return item
            })
          }
          
          // Apply deletions
          if (queryBuilder.deleteCalled) {
            mockDatabase[table] = mockDatabase[table].filter(
              item => item[queryBuilder.eqColumn] !== queryBuilder.eqValue
            )
            results = []
          }
          
          // Apply ordering
          if (queryBuilder.orderColumn) {
            results.sort((a, b) => {
              const aVal = a[queryBuilder.orderColumn]
              const bVal = b[queryBuilder.orderColumn]
              if (queryBuilder.orderAscending) {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
              } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
              }
            })
          }
          
          // Apply limit
          if (queryBuilder.limitCount) {
            results = results.slice(0, queryBuilder.limitCount)
          }
          
          // Apply range
          if (queryBuilder.rangeFrom !== undefined && queryBuilder.rangeTo !== undefined) {
            results = results.slice(queryBuilder.rangeFrom, queryBuilder.rangeTo + 1)
          }
          
          // Handle single/maybeSingle
          if (queryBuilder.singleCalled) {
            if (results.length === 0) {
              queryBuilder.error = { message: 'No rows returned' }
              queryBuilder.data = null
            } else if (results.length > 1) {
              queryBuilder.error = { message: 'Multiple rows returned' }
              queryBuilder.data = null
            } else {
              queryBuilder.data = results[0]
            }
          } else if (queryBuilder.maybeSingleCalled) {
            queryBuilder.data = results.length > 0 ? results[0] : null
          } else {
            queryBuilder.data = results
    storage: {
      from: jest.fn().mockImplementation((bucket: string) => ({
        upload: jest.fn().mockImplementation(async (path, file, options) => {
          const mockUpload = {
            data: {
              path,
              id: Math.random().toString(36),
              fullPath: `${bucket}/${path}`,
              bucket,
              region: 'us-east-1',
              size: file.size || 1024,
              contentType: file.type || 'application/octet-stream',
              createdAt: new Date().toISOString(),
            },
            error: null,
          }
          return mockUpload
        }),
        download: jest.fn().mockImplementation(async (path) => {
          return {
            data: new Blob(['mock file content'], { type: 'text/plain' }),
            error: null,
          }
        }),
        remove: jest.fn().mockImplementation(async (paths) => {
          return {
            data: { paths: Array.isArray(paths) ? paths : [paths] },
            error: null,
          }
        }),
        getPublicUrl: jest.fn().mockImplementation((path) => ({
          data: {
            publicUrl: `https://mock-supabase-url.com/storage/v1/object/public/${bucket}/${path}`,
          },
          error: null,
        })),
        list: jest.fn().mockImplementation(async (options) => {
          return {
            data: [
              {
                name: 'test-file.txt',
                id: Math.random().toString(36),
                size: 1024,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            ],
            error: null,
          }
        }),
      }))
    },

    functions: {
      invoke: jest.fn().mockImplementation(async (functionName, options) => {
        return {
          data: { result: `Mock function ${functionName} executed` },
          error: null,
        }
      }),
    },

    // Real-time subscriptions
    channel: jest.fn().mockImplementation((channelName) => ({
      on: jest.fn().mockImplementation((event, callback) => {
        // Mock subscription events
        if (event === 'postgres_changes') {
          // Simulate database change events
          setTimeout(() => {
            callback({
              eventType: 'INSERT',
              new: { id: 'test-id', data: 'test-data' },
              old: null,
              table: 'test_table',
              schema: 'public',
            })
          }, 100)
        }
        return {
          subscribe: jest.fn().mockReturnValue({ subscriptionId: Math.random().toString(36) }),
          unsubscribe: jest.fn(),
        }
      }),
      send: jest.fn(),
    })),
  }

  // Helper methods for testing
  mockClient.__resetDatabase = () => {
    Object.keys(mockDatabase).forEach(key => {
      mockDatabase[key] = []
    })
  }

  mockClient.__setAuth = (user: any, session: any) => {
    mockAuth.currentUser = user
    mockAuth.session = session
  }

  mockClient.__getDatabase = () => mockDatabase
  mockClient.__getAuth = () => mockAuth

  return mockClient
}

// Mock createClient function
export const mockCreateClient = jest.fn().mockImplementation(() => createMockSupabaseClient())

// Export common test data
export const mockEmergencyData = {
  events: [
    {
      id: 'emergency-1',
      type: 'medical',
      severity: 'high',
      title: 'Medical Emergency',
      description: 'Person experiencing chest pain',
      location: { latitude: 40.7128, longitude: -74.0060 },
      reported_by: 'user-1',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: 'emergency-2',
      type: 'fire',
      severity: 'critical',
      title: 'Building Fire',
      description: 'Fire reported in apartment building',
      location: { latitude: 40.7589, longitude: -73.9851 },
      reported_by: 'user-2',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'citizen',
      trust_score: 0.85,
      verified: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      role: 'responder',
      trust_score: 0.92,
      verified: true,
      created_at: new Date().toISOString(),
    },
  ],
  trust_scores: [
    {
      user_id: 'user-1',
      overall: 0.85,
      reliability: 0.9,
      accuracy: 0.8,
      response_time: 0.85,
      community_feedback: 0.8,
      skill_verification: 0.9,
      updated_at: new Date().toISOString(),
    },
  ],
}

// Helper function to set up mock database with test data
export const setupMockDatabase = (client: any, data: any = mockEmergencyData) => {
  const mockDB = client.__getDatabase()
  
  Object.keys(data).forEach(table => {
    mockDB[table] = data[table]
  })
}

// Helper function to simulate real-time events
export const simulateRealtimeEvent = (client: any, event: any) => {
  const channels = client.channel.mock.calls
  channels.forEach(([channelName]) => {
    const channel = client.channel(channelName)
    const onCalls = channel.on.mock.calls
    onCalls.forEach(([eventType, callback]) => {
      if (eventType === 'postgres_changes' || eventType === event.eventType) {
        callback(event)
      }
    })
  })
}

export default createMockSupabaseClient
          }
          
          return Promise.resolve(callback(queryBuilder))
        }),
        catch: jest.fn().mockReturnThis(),
      }
      
      // Add delete method to query builder
      queryBuilder.delete = jest.fn().mockImplementation(() => {
        queryBuilder.deleteCalled = true
        return queryBuilder
      })
      
      // Add single method
      queryBuilder.single = jest.fn().mockImplementation(() => {
        queryBuilder.singleCalled = true
        return queryBuilder
      })
      
      // Add maybeSingle method
      queryBuilder.maybeSingle = jest.fn().mockImplementation(() => {
        queryBuilder.maybeSingleCalled = true
        return queryBuilder
      })
      
      return queryBuilder
    }),
  }