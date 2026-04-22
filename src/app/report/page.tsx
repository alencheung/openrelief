import { Metadata } from 'next'
import EmergencyReportInterface from '@/components/map/EmergencyReportInterface'

export const metadata: Metadata = {
  title: 'Report Emergency - OpenRelief',
  description: 'Report an emergency in your area'
}

export default function ReportPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EmergencyReportInterface
        isOpen={true}
        onClose={() => window.history.back()}
        onReportSubmitted={() => window.history.back()}
      />
    </div>
  )
}
