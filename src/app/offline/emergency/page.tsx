import { Metadata } from 'next'
import { OfflineEmergencyPage } from '@/components/pwa/OfflineEmergencyPage'

export const metadata: Metadata = {
  title: 'Emergency Mode - OpenRelief',
  description: 'OpenRelief emergency mode - Report emergencies offline',
  robots: 'noindex, nofollow',
}

export default function Page() {
  return <OfflineEmergencyPage />
}