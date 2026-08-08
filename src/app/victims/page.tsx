'use client'

import { Users, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { VictimList } from '@/components/victims'
import { useVictims } from '@/store/victimStore'

export default function VictimsPage() {
  const { victims, filteredVictims, loading } = useVictims()
  const victimsEmpty = victims.length === 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-red-600" />
          People Tracking
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track the status of people affected by an emergency — safe, injured, trapped, missing.
        </p>
      </div>

      {victimsEmpty && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Backend not yet connected</p>
              <p className="mt-1">
                Victim tracking requires database tables and API routes that are still being
                wired up. The filters and cards below are fully functional, but no records have
                been entered yet. See FEATURES.md F-012 for the remaining work.
              </p>
              <p className="mt-1.5 text-xs">
                Note: this surface handles sensitive personal data — privacy and consent controls
                must be completed before real records are stored.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {victimsEmpty ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No one tracked yet</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              When check-ins are recorded during an emergency, affected people will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <VictimList victims={filteredVictims.length > 0 ? filteredVictims : victims} isLoading={loading} />
      )}
    </div>
  )
}
