import { Metadata } from 'next'
import ReportPageClient from './ReportPageClient'

export const metadata: Metadata = {
  title: 'Report Emergency - OpenRelief',
  description: 'Report an emergency in your area'
}

export default function ReportPage() {
  return <ReportPageClient />
}
