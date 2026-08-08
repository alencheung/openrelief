'use client'

import { useRouter } from 'next/navigation'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TrustHistoryChart, TrustEducation } from '@/components/trust'
import { TrustDashboard } from '@/components/trust/TrustDashboard'
import { useAuth } from '@/store/authStore'

export default function TrustPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-10 w-10 text-gray-400" />
        <p className="text-gray-600">Sign in to view your trust profile.</p>
        <Button onClick={() => router.push('/login')}>Sign in</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Profile
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-600" />
          Trust & Reputation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Your trust score reflects how reliably the community can count on your reports and
          confirmations. It grows over time as your contributions are corroborated by others.
        </p>
      </div>

      <div className="space-y-6">
        <TrustDashboard userId={user.id} />

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Score history</h2>
          <TrustHistoryChart userId={user.id} days={30} height={280} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How trust works</h2>
          <TrustEducation />
        </section>
      </div>
    </div>
  )
}
