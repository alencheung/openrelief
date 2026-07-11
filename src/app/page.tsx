import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import AuthGuard from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'OpenRelief - Emergency Coordination Platform',
  description: 'Connect victims with resources through our decentralized emergency coordination platform'
}

// The home page renders AuthGuard and EmergencyMap, which depend on auth state
// and live data. Force dynamic rendering rather than static prerendering.
export const dynamic = 'force-dynamic'

// Lazy-load EmergencyMap so the large maplibre-gl dependency (~24 MB) is only
// fetched on the client when this section actually mounts, keeping it out of
// the server bundle and off the critical path for first paint. Imported as
// `nextDynamic` (not `dynamic`) to avoid clashing with the Next.js route
// segment config `export const dynamic` above.
const EmergencyMap = nextDynamic(
  () => import('@/components/map/EmergencyMap').then(m => m.default),
  {
    ssr: false,
    loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded-lg" />
  }
)

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main>
        <Hero />
        <Features />
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <AuthGuard>
              <EmergencyMap />
            </AuthGuard>
          </div>
        </section>
      </main>
    </div>
  )
}