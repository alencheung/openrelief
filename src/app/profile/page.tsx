'use client'

import { useAuth, useAuthActions } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { Shield, LogOut, Bell, MapPin } from 'lucide-react'

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const { signOut } = useAuthActions()
  const router = useRouter()

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-600">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-red-600 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user.email}</h1>
              <p className="text-red-100 text-sm">Member since joining OpenRelief</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {(user.trust_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Trust Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-500">Reports Filed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Bell className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-500">Alerts Received</div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Account Details
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Location Sharing</dt>
                <dd className="text-sm text-gray-900">
                  {user.privacy_settings.location_sharing ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Profile Visibility</dt>
                <dd className="text-sm text-gray-900 capitalize">
                  {user.privacy_settings.profile_visibility}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Edit Settings
            </button>
            <button
              onClick={async () => {
                await signOut()
                router.push('/login')
              }}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
