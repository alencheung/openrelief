import { Metadata } from 'next'
import { OfflineFallback } from '@/components/pwa/OfflineFallback'

export const metadata: Metadata = {
  title: 'Offline - OpenRelief',
  description: 'OpenRelief emergency coordination platform - Offline mode',
  robots: 'noindex, nofollow'
}

export default function OfflinePage() {
  return <OfflineFallback />
}