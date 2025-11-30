import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        set({ isLoading: true, error: null })

        try {
          // This is a placeholder - will be implemented with Supabase auth
          await new Promise(resolve => setTimeout(resolve, 1000))

          const mockUser: User = {
            id: 'mock-user-id',
            email,
            trust_score: 0.5,
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

          const mockSession = {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Date.now() + 3600000, // 1 hour
          }

          set({
            user: mockUser,
            isAuthenticated: true,
            session: mockSession,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign in failed',
            isLoading: false,
          })
        }
      },

      signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          // Placeholder implementation
          await new Promise(resolve => setTimeout(resolve, 1000))

          // After successful signup, automatically sign in
          get().signIn(email, password)
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign up failed',
            isLoading: false,
          })
        }
      },

      signOut: () => {
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