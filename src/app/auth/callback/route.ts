import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Reuse the cookie-bound SSR client (createServerClient under the hood).
  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If the just-authenticated user hasn't completed onboarding, send them
  // there instead of straight to the app.
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()

    const onboardingCompleted = (profile as { onboarding_completed?: boolean } | null)
      ?.onboarding_completed
    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
