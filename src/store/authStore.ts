import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export interface User {
  id: string
  email: string
  trust_score: number
  last_known_location?: {
    lat: number
    lng: number
  }
  notification_preferences: {
    email: boolean
    push: boolean
    sms: boolean
    quiet_hours: {
      start: string
      end: string
    }
  }
  privacy_settings: {
    location_sharing: boolean
    profile_visibility: 'public' | 'friends' | 'private'
    data_retention: number
  }
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  } | null
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => void
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      session: null,

      // Actions
      signIn: async (email: string, password: string) => {
        console.log('🔍 DEBUG: signIn called', { email })
        set({ isLoading: true, error: null })

        try {
          console.log('🔍 DEBUG: Attempting Supabase signIn')
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            console.error('❌ DEBUG: Supabase signIn error', error)
            throw error
          }

          console.log('✅ DEBUG: Supabase signIn successful', { user: data.user?.id })

          if (data.user && data.session) {
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              trust_score: 0.5, // Default trust score
              notification_preferences: {
                email: true,
                push: true,
                sms: false,
                quiet_hours: {
                  start: '22:00',
                  end: '07:00',
                },
              },
              privacy_settings: {
                location_sharing: true,
                profile_visibility: 'public',
                data_retention: 30,
              },
            }

            const session = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token!,
              expires_at: data.session.expires_at!,
            }

            set({
              user,
              isAuthenticated: true,
              session,
              isLoading: false,
            })
          }
        } catch (error) {
          console.error('❌ DEBUG: signIn failed', error)
          set({
            error: error instanceof Error ? error.message : 'Sign in failed',
            isLoading: false,
          })
        }
      },

      signUp: async (email: string, password: string) => {
        console.log('🔍 DEBUG: signUp called in authStore', { email, passwordLength: password.length })
        set({ isLoading: true, error: null })

        try {
          console.log('🔍 DEBUG: Attempting Supabase signUp')
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          })

          if (error) {
            console.error('❌ DEBUG: Supabase signUp error', error)
            throw error
          }

          console.log('✅ DEBUG: Supabase signUp successful', { user: data.user?.id })

          if (data.user && data.session) {
            // User is automatically signed in
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              trust_score: 0.5, // Default trust score
              notification_preferences: {
                email: true,
                push: true,
                sms: false,
                quiet_hours: {
                  start: '22:00',
                  end: '07:00',
                },
              },
              privacy_settings: {
                location_sharing: true,
                profile_visibility: 'public',
                data_retention: 30,
              },
            }

            const session = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token!,
              expires_at: data.session.expires_at!,
            }

            set({
              user,
              isAuthenticated: true,
              session,
              isLoading: false,
            })
          } else {
            // Email confirmation required
            console.log('🔍 DEBUG: Email confirmation required')
            set({
              error: 'Please check your email to confirm your account',
              isLoading: false,
            })
          }
        } catch (error) {
          console.error('❌ DEBUG: signUp failed', error)
          set({
            error: error instanceof Error ? error.message : 'Sign up failed',
            isLoading: false,
          })
        }
      },

      signOut: async () => {
        console.log('🔍 DEBUG: signOut called')
        try {
          await supabase.auth.signOut()
          console.log('✅ DEBUG: Supabase signOut successful')
        } catch (error) {
          console.error('❌ DEBUG: Supabase signOut error', error)
        }

        set({
          user: null,
          isAuthenticated: false,
          session: null,
          error: null,
        })
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        session: state.session,
      }),
    }
  )
)

// Selectors for common use cases
export const useAuth = () => useAuthStore(state => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
}))

export const useAuthActions = () => useAuthStore(state => ({
  signIn: state.signIn,
  signUp: state.signUp,
  signOut: state.signOut,
  updateUser: state.updateUser,
  clearError: state.clearError,
  setLoading: state.setLoading,
}))