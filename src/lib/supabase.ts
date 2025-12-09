import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

console.log('🔍 DEBUG: Initializing Supabase client')
console.log('🔍 DEBUG: NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
console.log('🔍 DEBUG: NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

// Check if Supabase environment variables are configured
const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

if (!isSupabaseConfigured) {
  console.warn('⚠️ WARNING: Supabase environment variables not configured. Using mock client.')
  console.warn('📝 To fix this, create a .env.local file with:')
  console.warn('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
  : createMockSupabaseClient()

// Service role client for server-side operations
export const supabaseAdmin = isSupabaseConfigured ? createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : createMockSupabaseClient()

// Mock Supabase client for development
function createMockSupabaseClient() {
  console.log('🔧 DEBUG: Creating mock Supabase client')

  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log('🔧 DEBUG: Mock signInWithPassword', { email })
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
        console.log('🔧 DEBUG: Mock signUp', { email })
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
        console.log('🔧 DEBUG: Mock signOut')
        await new Promise(resolve => setTimeout(resolve, 500))
        return { error: null }
      }
    },

    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({
            data: table === 'user_profiles' ? {
              user_id: 'mock-user-id',
              trust_score: 0.5,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : null,
            error: null
          }),
          then: (resolve: any) => resolve({
            data: [],
            error: null
          })
        }),
        order: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        }),
        then: (resolve: any) => resolve({
          data: [],
          error: null
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data, error: null })
        }),
        then: (resolve: any) => resolve({ data, error: null })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => Promise.resolve({ data, error: null })
          })
        })
      }),
      upsert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data, error: null })
        })
      })
    }),

    rpc: (fnName: string, params: any) => {
      console.log('🔧 DEBUG: Mock RPC call', { fnName, params })
      return Promise.resolve({ data: null, error: null })
    },

    channel: (channelName: string) => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => { } })
      })
    })
  }
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

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async createUserProfile(profile: any) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
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
      .select(`
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `)
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

  async createEmergencyEvent(event: any) {
    const { data, error } = await supabase
      .from('emergency_events')
      .insert(event)
      .select(`
        *,
        emergency_types (*),
        reporter: user_profiles (
          user_id,
          trust_score
        )
      `)
      .single()

    if (error) {
      throw error
    }
    return data
  },

  async updateEmergencyEvent(
    eventId: string,
    updates: any
  ) {
    const { data, error } = await supabase
      .from('emergency_events')
      .update(updates)
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
      })
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
      .select(`
        *,
        user: user_profiles (
          user_id,
          trust_score
        )
      `)
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
      .select(`
        *,
        emergency_types (*)
      `)
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
      })
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
      .update({ is_active: false })
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
  subscribeToEmergencyEvents(callback: (payload: any) => void) {
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

  subscribeToUserLocation(callback: (payload: any) => void) {
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