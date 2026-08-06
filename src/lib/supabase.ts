import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Use mock client in test, in dev when env vars aren't configured, or during
// the Next.js build (no env vars are present then). Falling back to the mock
// avoids a "supabaseUrl is required" throw at module-load time that aborts the
// production build.
const shouldUseMockClient =
  process.env.NODE_ENV === 'test' ||
  !supabaseUrl ||
  !supabaseAnonKey ||
  process.env.NEXT_PHASE === 'phase-production-build'

export const supabase = shouldUseMockClient
  ? createMockSupabaseClient()
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })

// ---------------------------------------------------------------------------
// SERVER-ONLY: supabaseAdmin (service-role client)
// ---------------------------------------------------------------------------
// This client uses SUPABASE_SERVICE_ROLE_KEY and BYPASSES Row-Level Security.
// It MUST NEVER be imported into a Client Component ('use client') or any code
// that ships to the browser. Leaking the service-role key would grant full
// admin access to the database.
//
// The implementation now lives in '@/lib/supabase/admin', which enforces a
// server-only guard (throws if evaluated in a browser bundle). Re-exported
// here for backward compatibility with the server-side files that import
// `supabaseAdmin` from '@/lib/supabase'. Browser code should use the `supabase`
// (anon) client exported above.
export { supabaseAdmin } from './supabase/admin'

// Mock Supabase client for test environment only
function createMockSupabaseClient(): SupabaseClient<Database> {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    console.warn('Warning: Mock Supabase client should not be used in production')
  }

  // A self-referential query-builder chain that mimics Supabase's fluent
  // builder API enough for tests/builds to load without a real backend. Typed
  // loosely and cast to the real client type at the end.
  type MockChain = Record<string, (...args: unknown[]) => unknown> & {
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
  }

  const mockClient = {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (email === 'test@example.com' && password === 'password') {
          return {
            data: {
              user: {
                id: 'mock-user-id',
                email,
                email_confirmed_at: new Date().toISOString()
              },
              session: {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                expires_at: Date.now() + 3600000
              }
            },
            error: null
          }
        }

        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        }
      },

      signUp: async ({ email, password }: { email: string; password: string }) => {
        await new Promise(resolve => setTimeout(resolve, 1000))

        return {
          data: {
            user: {
              id: `mock-user-${Date.now()}`,
              email,
              email_confirmed_at: new Date().toISOString()
            },
            session: {
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
              expires_at: Date.now() + 3600000
            }
          },
          error: null
        }
      },

      signOut: async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { error: null }
      },

      getSession: async () => {
        return {
          data: { session: null },
          error: null
        }
      },

      onAuthStateChange: () => {
        return { data: { subscription: { unsubscribe: () => {} } } }
      },

      signInWithOAuth: async () => {
        return { data: { provider: 'google', url: 'https://accounts.google.com' }, error: null }
      }
    },

    from: (_table: string) => {
      const makeChain = (): MockChain => {
        const chain = {} as MockChain
        chain.select = (..._args: unknown[]) => chain
        chain.insert = (..._args: unknown[]) => chain
        chain.update = (..._args: unknown[]) => chain
        chain.upsert = (..._args: unknown[]) => chain
        chain.delete = () => chain
        chain.eq = (..._args: unknown[]) => chain
        chain.neq = (..._args: unknown[]) => chain
        chain.in = (..._args: unknown[]) => chain
        chain.gte = (..._args: unknown[]) => chain
        chain.lte = (..._args: unknown[]) => chain
        chain.gt = (..._args: unknown[]) => chain
        chain.lt = (..._args: unknown[]) => chain
        chain.like = (..._args: unknown[]) => chain
        chain.ilike = (..._args: unknown[]) => chain
        chain.contains = (..._args: unknown[]) => chain
        chain.containedBy = (..._args: unknown[]) => chain
        chain.not = (..._args: unknown[]) => chain
        chain.is = (..._args: unknown[]) => chain
        chain.or = (..._args: unknown[]) => chain
        chain.filter = (..._args: unknown[]) => chain
        chain.order = (..._args: unknown[]) => chain
        chain.limit = (..._args: unknown[]) => chain
        chain.range = (..._args: unknown[]) => chain
        chain.single = () => Promise.resolve({ data: null, error: null })
        chain.maybeSingle = () => Promise.resolve({ data: null, error: null })
        chain.then = (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null })
        return chain
      }
      return makeChain()
    },

    rpc: (_fnName: string, _params: Record<string, unknown>) => {
      return Promise.resolve({ data: null, error: null })
    },

    channel: (_channelName: string) => {
      const mockChannel: Record<string, (...args: unknown[]) => unknown> = {
        on: (..._args: unknown[]) => mockChannel,
        subscribe: (..._args: unknown[]) => mockChannel,
        unsubscribe: () => {},
        track: (_state: unknown) => Promise.resolve({}),
        untrack: () => Promise.resolve({}),
        presenceState: () => ({}),
        send: (_message: unknown) => Promise.resolve({})
      }
      return mockChannel
    },

    removeChannel: (_channel: unknown) => Promise.resolve({ data: null, error: null })
  }

  return mockClient as unknown as SupabaseClient<Database>
}

// Helper functions for common operations
export const supabaseHelpers = {
  // User profile operations
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async updateUserProfile(userId: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates as never)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async createUserProfile(profile: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile as never)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  // Emergency event operations
  async getEmergencyEvents(options?: {
    limit?: number
    status?: Database['public']['Enums']['emergency_events_status']
    type_id?: number
  }) {
    let query = supabase
      .from('emergency_events')
      .select(
        `
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.type_id) {
      query = query.eq('type_id', options.type_id)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }
    return data
  },

  async createEmergencyEvent(event: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('emergency_events')
      .insert(event as never)
      .select(
        `
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async updateEmergencyEvent(eventId: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('emergency_events')
      .update(updates as never)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  // Event confirmation operations
  async confirmEvent(
    eventId: string,
    userId: string,
    confirmationType: 'confirm' | 'dispute',
    location?: { lat: number; lng: number }
  ) {
    const { data, error } = await supabase
      .from('event_confirmations')
      .upsert({
        event_id: eventId,
        user_id: userId,
        confirmation_type: confirmationType,
        location: location ? `POINT(${location.lng} ${location.lat})` : null,
        trust_weight: 0.1 // Will be updated by trigger
      } as never)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async getEventConfirmations(eventId: string) {
    const { data, error } = await supabase
      .from('event_confirmations')
      .select(
        `
        *,
        user: user_profiles (
          user_id,
          trust_score
        )
      `
      )
      .eq('event_id', eventId)

    if (error) {
      throw error
    }
    return data
  },

  // Subscription operations
  async getUserSubscriptions(userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(
        `
        *,
        emergency_types (*)
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      throw error
    }
    return data
  },

  async subscribeToTopic(userId: string, topicId: number) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        topic_id: topicId,
        is_active: true
      } as never)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async unsubscribeFromTopic(userId: string, topicId: number) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false } as never)
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  // Emergency types
  async getEmergencyTypes() {
    const { data, error } = await supabase
      .from('emergency_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw error
    }
    return data
  },

  // Real-time subscriptions
  subscribeToEmergencyEvents(callback: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel('emergency_events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_events'
        },
        callback
      )
      .subscribe()
  },

  subscribeToUserLocation(callback: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel('user_profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: 'last_known_location=not.null'
        },
        callback
      )
      .subscribe()
  }
}

export default supabase
