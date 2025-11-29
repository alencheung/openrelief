import { Metadata } from 'next'
import { PWAStatus } from '@/components/pwa/PWAStatus'

export const metadata: Metadata = {
  title: 'PWA Status - OpenRelief',
  description: 'OpenRelief PWA status and diagnostics',
  robots: 'noindex, nofollow',
}

export default function PWAStatusPage() {
  return <PWAStatus />
}