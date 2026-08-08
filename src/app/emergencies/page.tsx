import { Metadata } from 'next'
import EmergenciesListClient from './EmergenciesListClient'

export const metadata: Metadata = {
  title: 'Emergencies - OpenRelief',
  description: 'Browse, confirm, and dispute reported emergencies'
}

export default function EmergenciesPage() {
  return <EmergenciesListClient />
}
