'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Users, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { VictimList, VictimDetails, VictimCheckInForm } from '@/components/victims'
import { useVictims, useVictimActions, useVictimCheckIns } from '@/store/victimStore'
import type { Victim } from '@/types/victim'

export default function VictimsPage() {
  const { victims, loading } = useVictims()
  const { loadVictims } = useVictimActions()
  const { addCheckIn, getCheckInsForVictim } = useVictimCheckIns()
  const victimsEmpty = victims.length === 0

  // Modal hosts for details and check-in (F-012.3, F-012.4). The components
  // were previously unmounted; VictimCheckInForm now POSTs to /api/victims.
  const [detailsVictim, setDetailsVictim] = useState<Victim | null>(null)
  const [checkInVictim, setCheckInVictim] = useState<Victim | null>(null)

  // Pull victims from the API on mount so the list reflects persisted data
  // rather than only client-side additions. Safe to fire once; the action
  // guards its own loading/error state.
  useEffect(() => {
    loadVictims()
  }, [loadVictims])

  // If the selected victim is updated in the store (e.g. after a check-in),
  // refresh the modal's reference so it shows current data.
  const liveDetailsVictim = detailsVictim
    ? victims.find(v => v.id === detailsVictim.id) ?? detailsVictim
    : null

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
                Victim tracking requires database tables that may not be applied yet. The filters
                and cards below are fully functional. See FEATURES.md F-012 for details.
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
        <VictimList
          victims={victims}
          isLoading={loading}
          onSelectVictim={victim => setDetailsVictim(victim)}
          onCheckInVictim={victim => setCheckInVictim(victim)}
        />
      )}

      <AnimatePresence>
        {liveDetailsVictim && (
          <VictimDetails
            victim={liveDetailsVictim}
            checkIns={getCheckInsForVictim(liveDetailsVictim.id)}
            onClose={() => setDetailsVictim(null)}
          />
        )}

        {checkInVictim && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
            onClick={() => setCheckInVictim(null)}
          >
            <div
              className="min-h-screen flex items-start justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-lg mt-8">
                <VictimCheckInForm
                  victimId={checkInVictim.id}
                  onCancel={() => setCheckInVictim(null)}
                  onCheckIn={payload => {
                    // Mirror the API update into the local store so the list
                    // reflects the new status without a refetch.
                    const newCheckIn = {
                      id: `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      timestamp: new Date(),
                      reporterId: 'self',
                      ...payload
                    }
                    addCheckIn(newCheckIn)
                    setCheckInVictim(null)
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
