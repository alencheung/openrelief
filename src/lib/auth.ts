/**
 * Authentication Utilities
 *
 * Provides a compatibility layer for getting server-side sessions.
 * Uses Supabase auth as the primary authentication provider.
 */

import { createClient } from '@/lib/supabase/server'

export interface ServerSession {
  user: {
    id: string
    email?: string
    name?: string
  } | null
}

/**
 * Get the current server-side session
 *
 * This function provides compatibility with the legacy next-auth getServerSession API
 * while using Supabase auth under the hood.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0]
      }
    }
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}
