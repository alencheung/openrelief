'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EmergencyReportInterface from '@/components/map/EmergencyReportInterface'
import { useCreateEmergencyEvent } from '@/hooks/queries/useEmergencyQueries'
import { EmergencyEvent } from '@/types'
import { useAuth } from '@/store/authStore'

/**
 * Client wrapper for the emergency report page.
 *
 * Wires the EmergencyReportInterface wizard's `onReportSubmitted` payload into
 * the `useCreateEmergencyEvent` mutation so reports actually reach the API and
 * database. Previously the report payload was discarded by a `() => window.history.back()`
 * handler.
 */
export default function ReportPageClient() {
  const router = useRouter()
  const { user } = useAuth()
  const createEvent = useCreateEmergencyEvent()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleReportSubmitted = async (
    report: Omit<EmergencyEvent, 'id' | 'created_at' | 'updated_at'>
  ) => {
    setSubmitError(null)

    // Guard against unauthenticated submissions. The mutation hook will also
    // trust-gate, but we want a clear message before hitting the network.
    if (!user?.id) {
      setSubmitError('You must be signed in to report an emergency.')
      return
    }

    try {
      await createEvent.mutateAsync(report)
      // Success — return to the previous page (typically the map).
      router.back()
    } catch (error) {
      // The mutation already surfaces a notification; capture the message for
      // inline display as well.
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit emergency report'
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {submitError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}
      <EmergencyReportInterface
        isOpen={true}
        onClose={() => router.back()}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  )
}
