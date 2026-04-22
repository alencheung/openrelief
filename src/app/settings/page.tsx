'use client'

import { useState } from 'react'
import { useAuth, useAuthActions } from '@/store/authStore'
import { Bell, Eye, Save } from 'lucide-react'

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const { updateUser } = useAuthActions()
  const [saved, setSaved] = useState(false)

  const [locationSharing, setLocationSharing] = useState(
    user?.privacy_settings.location_sharing ?? true
  )
  const [profileVisibility, setProfileVisibility] = useState(
    user?.privacy_settings.profile_visibility ?? 'public'
  )
  const [pushNotifications, setPushNotifications] = useState(
    user?.notification_preferences.push ?? true
  )
  const [emailNotifications, setEmailNotifications] = useState(
    user?.notification_preferences.email ?? true
  )

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-600">Please sign in to view settings.</p>
      </div>
    )
  }

  const handleSave = () => {
    updateUser({
      privacy_settings: {
        ...user.privacy_settings,
        location_sharing: locationSharing,
        profile_visibility: profileVisibility
      },
      notification_preferences: {
        ...user.notification_preferences,
        push: pushNotifications,
        email: emailNotifications
      }
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-gray-500" />
            Privacy
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Location Sharing</p>
                <p className="text-xs text-gray-500">
                  Share your location for nearby emergency alerts
                </p>
              </div>
              <button
                onClick={() => setLocationSharing(!locationSharing)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  locationSharing ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    locationSharing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Profile Visibility</p>
                <p className="text-xs text-gray-500">Who can see your profile</p>
              </div>
              <select
                value={profileVisibility}
                onChange={e =>
                  setProfileVisibility(e.target.value as 'public' | 'friends' | 'private')
                }
                className="rounded-md border border-gray-300 text-sm px-3 py-1.5"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-gray-500" />
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                <p className="text-xs text-gray-500">Receive alerts for nearby emergencies</p>
              </div>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushNotifications ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive emergency summaries via email</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
