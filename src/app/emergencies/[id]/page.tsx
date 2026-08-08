import { Metadata } from 'next'
import EmergencyDetailClient from './EmergencyDetailClient'

export const metadata: Metadata = {
  title: 'Emergency Detail - OpenRelief',
  description: 'Emergency details and live consensus status'
}

export default function EmergencyDetailPage() {
  return <EmergencyDetailClient />
}
