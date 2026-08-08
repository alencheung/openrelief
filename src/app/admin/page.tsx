'use client'

import dynamic from 'next/dynamic'

const SecurityDashboard = dynamic(
  () => import('@/components/admin/SecurityDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <p className="text-gray-500">Loading security dashboard...</p>
      </div>
    )
  }
)

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <SecurityDashboard />
    </div>
  )
}
